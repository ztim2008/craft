import Link from "next/link";
import { CraftumBlocksInstall } from "@/components/craftum-blocks/CraftumBlocksInstall";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Craftum Blocks — установка расширения",
  description:
    "Скачайте Craftum Blocks: свои блоки в редакторе Craftum. Chrome, Яндекс Браузер, Edge.",
};

export default function CraftumBlocksPage() {
  return (
    <main className="min-h-screen bg-black text-white">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
        <Link href="/" className="text-sm text-white/50 transition hover:text-white">
          ← Craft · миграция с Крафтума
        </Link>
        <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/45">MVP</span>
      </header>

      <div className="px-6 pb-24 pt-4">
        <CraftumBlocksInstall />
      </div>
    </main>
  );
}
