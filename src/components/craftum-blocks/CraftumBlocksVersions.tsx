import Link from "next/link";
import {
  EXTENSION_CURRENT_VERSION,
  EXTENSION_DOWNLOAD,
  EXTENSION_RELEASES,
  EXTENSION_RELEASES_UPDATED_AT,
  type ExtensionRelease,
} from "@/modules/craftum-blocks/extension-releases";

function ReleaseCard({ release, current }: { release: ExtensionRelease; current: boolean }) {
  return (
    <article
      id={`v${release.version}`}
      className={`rounded-[24px] border p-6 md:p-8 scroll-mt-24 ${
        current
          ? "border-violet-400/40 bg-gradient-to-b from-violet-500/15 to-transparent"
          : "border-white/10 bg-white/[0.03]"
      }`}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="font-tight text-2xl font-medium">
          v{release.version}
          {current && (
            <span className="ml-3 rounded-full bg-violet-500/25 px-2.5 py-0.5 text-xs font-semibold text-violet-200">
              текущая
            </span>
          )}
        </h2>
        <time className="text-sm text-white/45" dateTime={release.date}>
          {release.date}
        </time>
      </div>
      <p className="mt-3 text-[15px] leading-relaxed text-white/70">{release.summary}</p>

      {release.added.length > 0 && (
        <div className="mt-5">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-emerald-300/90">Добавлено</h3>
          <ul className="mt-2 space-y-1.5 text-sm text-white/75">
            {release.added.map((item) => (
              <li key={item} className="flex gap-2">
                <span className="text-emerald-400">+</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {release.fixed.length > 0 && (
        <div className="mt-5">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-sky-300/90">Исправлено</h3>
          <ul className="mt-2 space-y-1.5 text-sm text-white/75">
            {release.fixed.map((item) => (
              <li key={item} className="flex gap-2">
                <span className="text-sky-400">✓</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {release.known && release.known.length > 0 && (
        <div className="mt-5">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-amber-300/90">Известно</h3>
          <ul className="mt-2 space-y-1.5 text-sm text-white/60">
            {release.known.map((item) => (
              <li key={item} className="flex gap-2">
                <span className="text-amber-400">!</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {current && (
        <div className="mt-6 flex flex-wrap gap-3">
          <a
            href={EXTENSION_DOWNLOAD.setupVersioned}
            className="inline-flex rounded-xl bg-violet-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-400"
          >
            Скачать установщик
          </a>
          <a
            href={EXTENSION_DOWNLOAD.portableVersioned}
            className="inline-flex rounded-xl border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            Только расширение (ZIP)
          </a>
        </div>
      )}
    </article>
  );
}

export function CraftumBlocksVersions() {
  return (
    <div className="mx-auto w-full max-w-3xl">
      <p className="text-sm font-medium tracking-wide text-violet-300">
        Craftum Blocks · расширение Chrome
      </p>
      <h1 className="mt-3 font-instrument-serif text-4xl leading-tight tracking-[-0.03em] md:text-5xl">
        Версии и изменения
      </h1>
      <p className="mt-4 max-w-xl text-[17px] leading-relaxed text-white/70">
        История установочных пакетов. После обновления расширения обновите страницу Craftum (F5).
        Установка — на{" "}
        <Link href="/craftum-blocks" className="text-violet-300 underline hover:text-white">
          странице загрузки
        </Link>
        .{" "}
        <a
          href="/craftum-blocks/versions/feed.xml"
          className="text-violet-300 underline hover:text-white"
          type="application/rss+xml"
        >
          RSS
        </a>
        .
      </p>
      <p className="mt-2 text-xs text-white/35">
        Changelog синхронизируется из devlog при сборке · обновлено{" "}
        {EXTENSION_RELEASES_UPDATED_AT.slice(0, 10)}
      </p>

      <section className="mt-10 space-y-6">
        {EXTENSION_RELEASES.map((release) => (
          <ReleaseCard
            key={release.version}
            release={release}
            current={release.version === EXTENSION_CURRENT_VERSION}
          />
        ))}
      </section>

      <section className="mt-10 rounded-[28px] border border-white/10 bg-white/[0.03] p-8">
        <h2 className="font-tight text-xl font-medium">Кратко: как установить</h2>
        <ol className="mt-6 space-y-4 text-[15px] leading-relaxed text-white/75">
          <li className="flex gap-4">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-500/20 text-sm font-semibold text-violet-200">
              1
            </span>
            <span>
              Скачайте <strong>craftum-blocks-setup.zip</strong> (Windows) или portable ZIP — ссылки у
              текущей версии выше.
            </span>
          </li>
          <li className="flex gap-4">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-500/20 text-sm font-semibold text-violet-200">
              2
            </span>
            <span>
              Windows: распакуйте → запустите <strong>Установить Craftum Blocks.bat</strong>. macOS/Linux:
              <strong> install.sh</strong>.
            </span>
          </li>
          <li className="flex gap-4">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-500/20 text-sm font-semibold text-violet-200">
              3
            </span>
            <span>
              В браузере: режим разработчика → «Загрузить распакованное» → папка <code className="text-violet-200">extension</code>
              .
            </span>
          </li>
          <li className="flex gap-4">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-500/20 text-sm font-semibold text-violet-200">
              4
            </span>
            <span>
              Ключ публикации — в popup расширения (только админ). Редактор Craftum → F5 → «Мои блоки» справа.
            </span>
          </li>
        </ol>
      </section>
    </div>
  );
}
