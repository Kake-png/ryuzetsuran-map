import { z } from "zod";

import {
  enforceGlobalRateLimit,
  enforceRateLimit,
  errorResponse,
  HttpError,
} from "@/lib/server-security";

const querySchema = z.string().trim().min(2).max(100);

type NominatimResult = {
  display_name?: string;
  lat?: string;
  lon?: string;
  type?: string;
};

export async function GET(request: Request) {
  try {
    const fetchSite = request.headers.get("sec-fetch-site");
    if (fetchSite && !["same-origin", "none"].includes(fetchSite)) {
      throw new HttpError(403, "この送信元からは利用できません。");
    }
    await enforceRateLimit(request, "location-search", 30);
    await enforceGlobalRateLimit("location-search-upstream", 1, 1_000);

    const requestUrl = new URL(request.url);
    const parsed = querySchema.safeParse(requestUrl.searchParams.get("q"));
    if (!parsed.success) throw new HttpError(400, "地名や住所を2文字以上で入力してください。");

    const searchUrl = new URL("https://nominatim.openstreetmap.org/search");
    searchUrl.searchParams.set("q", parsed.data);
    searchUrl.searchParams.set("format", "jsonv2");
    searchUrl.searchParams.set("countrycodes", "jp");
    searchUrl.searchParams.set("accept-language", "ja");
    searchUrl.searchParams.set("limit", "5");

    const upstream = await fetch(searchUrl, {
      headers: {
        Accept: "application/json",
        Referer: `${requestUrl.origin}/`,
        "User-Agent": `RyuzetsuranMap/1.0 (+${requestUrl.origin}/policy)`,
      },
      signal: AbortSignal.timeout(5_000),
    });
    if (!upstream.ok) throw new HttpError(502, "場所を検索できませんでした。少し時間をおいてお試しください。");

    const data = await upstream.json() as NominatimResult[];
    const results = data.flatMap((item) => {
      const latitude = Number(item.lat);
      const longitude = Number(item.lon);
      if (
        !item.display_name
        || !Number.isFinite(latitude)
        || !Number.isFinite(longitude)
        || latitude < 20
        || latitude > 46
        || longitude < 122
        || longitude > 154
      ) return [];
      return [{
        name: item.display_name.slice(0, 180),
        latitude,
        longitude,
        type: item.type?.slice(0, 40) ?? "place",
      }];
    });

    return Response.json({ results }, {
      headers: { "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400" },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
