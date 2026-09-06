import { errorResponse, HttpError, runtimeEnv } from "@/lib/server-security";

export async function GET(
  request: Request,
  context: { params: Promise<{ key: string[] }> },
) {
  try {
    const { key: parts } = await context.params;
    const key = parts.join("/");
    if (!/^agaves\/[0-9a-f-]{36}\/[A-Za-z0-9_-]{20,40}\.webp$/.test(key)) {
      throw new HttpError(404, "写真が見つかりません。");
    }

    const object = await runtimeEnv().BUCKET?.get(key);
    if (!object) throw new HttpError(404, "写真が見つかりません。");

    if (request.headers.get("if-none-match") === object.httpEtag) {
      return new Response(null, { status: 304 });
    }

    return new Response(object.body, {
      headers: {
        "Content-Type": "image/webp",
        "Content-Length": String(object.size),
        ETag: object.httpEtag,
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'; sandbox",
        "Cross-Origin-Resource-Policy": "same-origin",
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
