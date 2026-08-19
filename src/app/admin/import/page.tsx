import { ImportForm } from "@/components/admin/ImportForm";

export default function AdminImportPage() {
  return (
    <div className="max-w-xl space-y-4">
      <h1 className="text-2xl font-semibold">Импорт сайта</h1>
      <p className="text-sm text-[#50575e]">
        1 страница — демо. Снимите «Только главная», чтобы обойти sitemap и внутренние ссылки.
      </p>
      <div className="rounded border border-[#c3c4c7] bg-white p-6">
        <ImportForm />
      </div>
    </div>
  );
}
