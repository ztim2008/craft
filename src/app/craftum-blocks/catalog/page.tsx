import { CraftumBlocksPublicCatalog } from "@/components/craftum-blocks/CraftumBlocksPublicCatalog";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Craftum Blocks — каталог готовых блоков",
  description:
    "Библиотека блоков для конструктора Craftum: обложки, формы, секции. Скачайте расширение и вставляйте блоки в один клик.",
  openGraph: {
    title: "Craftum Blocks — каталог блоков",
    description: "Готовые блоки для конструктора Craftum. Бесплатное расширение Chrome.",
  },
};

export default function CraftumBlocksCatalogPage() {
  return (
    <main>
      <CraftumBlocksPublicCatalog />
      <footer className="border-t border-white/10 px-4 py-8 text-center text-xs text-white/35 md:px-6">
        <p>
          API каталога:{" "}
          <a className="underline hover:text-white/60" href="https://craft.nordic-builder.ru/api/craftum-blocks">
            /api/craftum-blocks
          </a>
        </p>
      </footer>
    </main>
  );
}
