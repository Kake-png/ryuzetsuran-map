import { z } from "zod";

import { enforceRateLimit, errorResponse, HttpError } from "@/lib/server-security";

const coordinatesSchema = z.object({
  lat: z.coerce.number().min(20).max(46),
  lon: z.coerce.number().min(122).max(154),
});

export async function GET(request: Request) {
  try {
    const fetchSite = request.headers.get("sec-fetch-site");
    if (fetchSite && !["same-origin", "none"].includes(fetchSite)) throw new HttpError(403, "この送信元からは利用できません。");
    await enforceRateLimit(request, "municipality-lookup", 60);
    const url = new URL(request.url);
    const parsed = coordinatesSchema.safeParse({ lat: url.searchParams.get("lat"), lon: url.searchParams.get("lon") });
    if (!parsed.success) throw new HttpError(400, "日本国内の地点を選んでください。");

    const reverseUrl = new URL("https://mreversegeocoder.gsi.go.jp/reverse-geocoder/LonLatToAddress");
    reverseUrl.searchParams.set("lat", String(parsed.data.lat));
    reverseUrl.searchParams.set("lon", String(parsed.data.lon));
    const reverse = await fetch(reverseUrl, { signal: AbortSignal.timeout(4_000) });
    if (!reverse.ok) throw new HttpError(502, "市区町村を自動取得できませんでした。");
    const reverseData = await reverse.json() as { results?: { muniCd?: string } };
    const code = reverseData.results?.muniCd;
    if (!code || !/^\d{4,5}$/.test(code)) throw new HttpError(404, "市区町村を判定できませんでした。手入力してください。");

    const municipalities = await fetch("https://maps.gsi.go.jp/js/muni.js", { signal: AbortSignal.timeout(4_000) });
    if (!municipalities.ok) throw new HttpError(502, "市区町村を自動取得できませんでした。");
    const source = await municipalities.text();
    const lookupCode = String(Number(code));
    const match = source.match(new RegExp(`GSI\\.MUNI_ARRAY\\[\\"(?:${code}|${lookupCode})\\"\\]\\s*=\\s*'([^']+)'`));
    const parts = match?.[1]?.split(",");
    if (!parts || parts.length < 4) throw new HttpError(404, "市区町村を判定できませんでした。手入力してください。");
    const municipality = `${parts[1]}${parts[3]}`.replace(/[\s　]+/g, "");
    return Response.json({ municipality }, { headers: { "Cache-Control": "public, max-age=86400" } });
  } catch (error) {
    return errorResponse(error);
  }
}
