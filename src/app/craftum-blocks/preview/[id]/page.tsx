import { getCraftumBlockById } from "@/modules/craftum-blocks/catalog";
import { snapshotToPreviewDocument } from "@/modules/craftum-blocks/preview";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function CraftumBlockPreviewPage({ params }: Props) {
  const { id } = await params;
  const block = getCraftumBlockById(id);
  if (!block) notFound();

  if (block.insert.mode !== "snapshot") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 p-8">
        <p className="text-slate-600">Превью доступно только для snapshot-блоков.</p>
      </main>
    );
  }

  const html = snapshotToPreviewDocument(block.insert.craftumBlock.content, block.name);

  return (
    <iframe
      title={`Preview ${block.name}`}
      srcDoc={html}
      className="h-screen w-full border-0"
      sandbox="allow-same-origin"
    />
  );
}
