import Link from "next/link";
import { CraftumBlocksCatalog } from "@/components/craftum-blocks/CraftumBlocksCatalog";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Craftum Blocks — каталог блоков",
  description: "Каталог блоков для расширения Craftum Blocks. API и тестовое добавление.",
};

export default function CraftumBlocksCatalogPage() {
  return (
    <main className="min-h-screen bg-black text-white">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
        <Link href="/craftum-blocks" className="text-sm text-white/50 transition hover:text-white">
          ← Установка расширения
        </Link>
        <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/45">
          каталог
        </span>
      </header>

      <div className="px-6 pb-24 pt-4">
        <CraftumBlocksCatalog />
      </div>
    </main>
  );
}
