import { Suspense } from "react";
import { DemoStatus } from "@/components/funnel/DemoStatus";

export default function DemoPage() {
  return (
    <Suspense fallback={<main className="p-8 text-sm text-zinc-500">Загрузка демо…</main>}>
      <DemoStatus />
    </Suspense>
  );
}
