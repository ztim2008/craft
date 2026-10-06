export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Ключ публикации — только для залогиненного админа (middleware). */
export async function GET() {
  const publishKey = (process.env.CRAFTUM_BLOCKS_PUBLISH_KEY || "").trim();
  if (!publishKey) {
    return Response.json({
      configured: false,
      publishKey: null,
      hint: "Задайте CRAFTUM_BLOCKS_PUBLISH_KEY в .env на сервере",
    });
  }
  return Response.json({ configured: true, publishKey });
}
