import { CraftumBlocksInstall } from "@/components/craftum-blocks/CraftumBlocksInstall";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Craftum Blocks — установка расширения",
  description:
    "Скачайте Craftum Blocks: свои блоки в редакторе Craftum. Chrome, Яндекс Браузер, Edge.",
};

export default function CraftumBlocksPage() {
  return (
    <main className="px-6 pb-24 pt-8">
      <CraftumBlocksInstall />
    </main>
  );
}
