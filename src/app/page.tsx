import { ImportForm } from "@/components/admin/ImportForm";

export default function HomePage() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-8 px-6 py-16">
      <div className="space-y-3">
        <p className="text-xs font-medium tracking-wide text-zinc-500 uppercase">
          Kraftum Migration Engine · MVP Phase 1
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">
          Импортировать сайт
        </h1>
        <p className="text-sm leading-6 text-zinc-600">
          Playwright открывает URL, сохраняет rendered HTML, ссылки, network
          log и скриншот. Редактор и Puck подключаются позже: сейчас нужна
          точная независимая копия.
        </p>
      </div>
      <ImportForm />
    </main>
  );
}
