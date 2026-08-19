export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json(
    {
      error:
        "Архив выдаётся с карточки клиента в админке Craft, не из публичного демо.",
    },
    { status: 410 },
  );
}
