import Hero19 from "@/components/originkit/hero-19";
import { LandingBody } from "@/components/landing/LandingBody";
import { listPlans } from "@/modules/billing/plans";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const plans = await listPlans();

  return (
    <main className="bg-black">
      <Hero19 />
      <LandingBody plans={plans} />
    </main>
  );
}
