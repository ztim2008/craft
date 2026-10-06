import { buildExtensionReleasesRss } from "@/modules/craftum-blocks/extension-releases";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const xml = buildExtensionReleasesRss();
  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=300",
    },
  });
}
