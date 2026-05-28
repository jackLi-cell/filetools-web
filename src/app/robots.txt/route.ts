import { getSiteUrlFromRequest } from "@/lib/seo"

export function GET(request: Request) {
  const baseUrl = getSiteUrlFromRequest(request)
  const body = [
    "User-agent: *",
    "Allow: /",
    "Disallow: /api/",
    "Disallow: /admin/",
    "Disallow: /account/",
    "",
    `Sitemap: ${baseUrl}/sitemap.xml`,
    "",
  ].join("\n")

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  })
}
