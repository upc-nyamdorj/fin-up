import type { APIRoute } from "astro";

// one-page site; add paths here as pages are added
const paths = ["/", "/terms", "/privacy"];

export const GET: APIRoute = ({ site }) =>
  new Response(
    `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${paths.map((p) => `  <url><loc>${new URL(p, site)}</loc></url>`).join("\n")}
</urlset>
`,
    { headers: { "Content-Type": "application/xml" } },
  );
