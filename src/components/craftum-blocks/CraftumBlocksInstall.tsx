"use client";

import { useEffect, useMemo, useState } from "react";

const VERSION = "0.2.0";
const SETUP_URL = "/downloads/craftum-blocks-setup.zip";
const PORTABLE_URL = "/downloads/craftum-blocks-mvp.zip";
const CRX_URL = "/downloads/craftum-blocks.crx";

type BrowserKind = "chrome" | "yandex" | "edge" | "firefox" | "other";
type OsKind = "windows" | "mac" | "linux" | "other";

function detectBrowser(): BrowserKind {
  if (typeof navigator === "undefined") return "other";
  const ua = navigator.userAgent;
  if (/YaBrowser/i.test(ua)) return "yandex";
  if (/Edg\//i.test(ua)) return "edge";
  if (/Firefox/i.test(ua)) return "firefox";
  if (/Chrome|Chromium/i.test(ua)) return "chrome";
  return "other";
}

function detectOs(): OsKind {
  if (typeof navigator === "undefined") return "other";
  const ua = navigator.userAgent;
  const platform = navigator.platform || "";
  if (/Win/i.test(platform) || /Windows/i.test(ua)) return "windows";
  if (/Mac/i.test(platform) || /Macintosh/i.test(ua)) return "mac";
  if (/Linux/i.test(platform) || /Linux/i.test(ua)) return "linux";
  return "other";
}

const BROWSER_LABEL: Record<BrowserKind, string> = {
  chrome: "Google Chrome",
  yandex: "Яндекс Браузер",
  edge: "Microsoft Edge",
  firefox: "Firefox",
  other: "браузер",
};

export function CraftumBlocksInstall() {
  const [browser, setBrowser] = useState<BrowserKind>("other");
  const [os, setOs] = useState<OsKind>("other");
  const [downloaded, setDownloaded] = useState(false);

  useEffect(() => {
    setBrowser(detectBrowser());
    setOs(detectOs());
  }, []);

  const isWindows = os === "windows";
  const primaryUrl = isWindows ? SETUP_URL : PORTABLE_URL;
  const primaryName = isWindows ? "craftum-blocks-setup.zip" : "craftum-blocks-mvp.zip";

  const steps = useMemo(() => {
    if (isWindows) {
      return [
        "Скачайте установщик и распакуйте ZIP в любую папку.",
        "Запустите «Установить Craftum Blocks.bat» (двойной клик).",
        "Установщик скопирует файлы и откроет страницу расширений в браузере.",
        "Включите «Режим разработчика» → «Загрузить распакованное».",
        "Вставьте путь из буфера (Ctrl+V) — он уже скопирован установщиком.",
        "Откройте редактор Craftum — кнопка «Мои блоки» справа внизу.",
      ];
    }
    return [
      "Скачайте архив и распакуйте.",
      "macOS/Linux: запустите install.sh из архива.",
      "Или вручную: chrome://extensions / browser://extensions.",
      "Режим разработчика → загрузить папку extension.",
      "Откройте редактор Craftum.",
    ];
  }, [isWindows]);

  function download(url: string, filename: string) {
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    setDownloaded(true);
  }

  const extensionsUrl =
    browser === "yandex"
      ? "browser://extensions"
      : browser === "edge"
        ? "edge://extensions"
        : "chrome://extensions";

  return (
    <div className="mx-auto w-full max-w-3xl">
      <div className="rounded-[32px] border border-white/10 bg-gradient-to-b from-violet-500/10 to-transparent p-8 md:p-10">
        <p className="text-sm font-medium tracking-wide text-violet-300">
          Версия {VERSION} · тест · бесплатно
        </p>
        <h1 className="mt-3 font-instrument-serif text-4xl leading-tight tracking-[-0.03em] md:text-5xl">
          Craftum Blocks
        </h1>
        <p className="mt-4 max-w-xl text-[17px] leading-relaxed text-white/70">
          Установщик для теста: копирует расширение, открывает браузер, кладёт путь в буфер. Остаётся один
          клик — «Загрузить распакованное».
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <button
            type="button"
            onClick={() =>
              download(primaryUrl, isWindows ? `craftum-blocks-setup-${VERSION}.zip` : `craftum-blocks-${VERSION}.zip`)
            }
            className="inline-flex items-center justify-center rounded-2xl bg-violet-500 px-8 py-4 text-base font-semibold text-white shadow-lg shadow-violet-500/30 transition hover:bg-violet-400"
          >
            {isWindows ? "Скачать установщик Windows" : "Скачать архив"}
          </button>
          {isWindows && (
            <button
              type="button"
              onClick={() => download(PORTABLE_URL, `craftum-blocks-mvp-${VERSION}.zip`)}
              className="inline-flex items-center justify-center rounded-2xl border border-white/15 bg-white/5 px-8 py-4 text-base font-semibold text-white transition hover:bg-white/10"
            >
              Только расширение (ZIP)
            </button>
          )}
          {browser !== "firefox" && (
            <button
              type="button"
              onClick={() => {
                window.location.href = extensionsUrl;
              }}
              className="inline-flex items-center justify-center rounded-2xl border border-white/15 bg-white/5 px-8 py-4 text-base font-semibold text-white transition hover:bg-white/10"
            >
              Страница расширений
            </button>
          )}
        </div>

        {downloaded && (
          <p className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
            {isWindows ? (
              <>
                Скачано. Распакуйте ZIP → запустите <strong>Установить Craftum Blocks.bat</strong>.
              </>
            ) : (
              <>Скачано. Распакуйте и запустите install.sh или загрузите папку extension вручную.</>
            )}
          </p>
        )}

        <p className="mt-6 text-sm text-white/45">
          {BROWSER_LABEL[browser]}
          {os !== "other" && ` · ${os === "windows" ? "Windows" : os === "mac" ? "macOS" : "Linux"}`} ·{" "}
          <a className="underline hover:text-white" href={primaryUrl}>
            {primaryName}
          </a>
          {" · "}
          <a className="underline hover:text-white" href="/craftum-blocks/catalog">
            каталог блоков
          </a>
          {" · "}
          <a className="underline hover:text-white" href={CRX_URL}>
            .crx
          </a>{" "}
          (опционально)
        </p>
      </div>

      <section className="mt-10 rounded-[28px] border border-white/10 bg-white/[0.03] p-8">
        <h2 className="font-tight text-xl font-medium">Как установить</h2>
        <ol className="mt-6 space-y-4">
          {steps.map((step, i) => (
            <li key={step} className="flex gap-4 text-[15px] leading-relaxed text-white/75">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-500/20 text-sm font-semibold text-violet-200">
                {i + 1}
              </span>
              <span className="pt-1">{step}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-8 rounded-[28px] border border-amber-500/20 bg-amber-500/5 p-6 text-sm text-amber-100/90">
        <strong className="text-amber-50">Тестовая версия.</strong> Полная установка в один клик без режима
        разработчика — только через Chrome Web Store после модерации. Сейчас установщик делает максимум
        автоматически: файлы, браузер, путь в буфер.
      </section>
    </div>
  );
}
