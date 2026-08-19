import { getPricing } from "@/modules/billing/pricingStore";
import { listPlans } from "@/modules/billing/plans";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const plans = await listPlans();
  const pricing = await getPricing();
  return Response.json({ plans, updatedAt: pricing.updatedAt });
}
