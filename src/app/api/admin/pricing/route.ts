import { getPricing, parseAmountRub, savePricing } from "@/modules/billing/pricingStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json(await getPricing());
}

export async function PUT(request: Request) {
  let body: { basic?: unknown; pro?: unknown };
  try {
    body = (await request.json()) as { basic?: unknown; pro?: unknown };
  } catch {
    return Response.json({ error: "Ожидался JSON" }, { status: 400 });
  }
  const basic = parseAmountRub(body.basic);
  const pro = parseAmountRub(body.pro);
  if (basic == null || pro == null) {
    return Response.json({ error: "Укажите целые суммы Basic и Pro в рублях" }, { status: 400 });
  }
  const saved = await savePricing({ basic, pro });
  return Response.json(saved);
}
