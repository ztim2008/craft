import { getPricing } from "@/modules/billing/pricingStore";
import { PricingForm } from "@/components/admin/PricingForm";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const pricing = await getPricing();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Настройки</h1>
        <p className="mt-1 text-sm text-[#50575e]">Тарифы на публичной воронке. Меняете сами, без правки кода.</p>
      </div>
      <PricingForm basic={pricing.basic} pro={pricing.pro} />
    </div>
  );
}
