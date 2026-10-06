import { CraftumBlocksVersions } from "@/components/craftum-blocks/CraftumBlocksVersions";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Craftum Blocks — версии и changelog",
  description: "История версий расширения Craftum Blocks, установка и список изменений.",
  alternates: {
    types: {
      "application/rss+xml": [{ url: "/craftum-blocks/versions/feed.xml", title: "Craftum Blocks RSS" }],
    },
  },
};

export default function CraftumBlocksVersionsPage() {
  return (
    <main className="px-6 pb-24 pt-8">
      <CraftumBlocksVersions />
    </main>
  );
}
