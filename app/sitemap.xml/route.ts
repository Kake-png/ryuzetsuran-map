import { runtimeEnv } from "@/lib/server-security";

const publicPaths = ["/", "/guide", "/grow", "/support", "/policy", "/privacy"];

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export async function GET(request: Request) {
  const origin = new URL(request.url).origin;
  const entries = publicPaths.map((path) => ({
    url: new URL(path, origin).toString(),
    lastmod: null as string | null,
  }));

  const db = runtimeEnv().DB;
  if (db) {
    try {
      const result = await db
        .prepare(
          `SELECT public_id, observed_at
           FROM agaves
           WHERE visibility = 'approved'
           ORDER BY observed_at DESC, created_at DESC
           LIMIT 5000`,
        )
        .all<{ public_id: string; observed_at: string }>();

      for (const row of result.results) {
        entries.push({
          url: new URL(`/spots/${encodeURIComponent(row.public_id)}`, origin).toString(),
          lastmod: row.observed_at,
        });
      }
    } catch (error) {
      console.error("Sitemap location query failed", error);
    }
  }

  const body = entries
    .map(({ url, lastmod }) => `  <url><loc>${escapeXml(url)}</loc>${lastmod ? `<lastmod>${escapeXml(lastmod)}</lastmod>` : ""}</url>`)
    .join("\n");
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=300, s-maxage=300",
    },
  });
}
