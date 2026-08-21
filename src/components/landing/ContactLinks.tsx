"use client";

import { TELEGRAM_URL, VK_URL } from "./contacts";

type Tone = "hero" | "block" | "light";

const ITEMS = [
  { href: TELEGRAM_URL, label: "Telegram", hint: "@bilarius" },
  { href: VK_URL, label: "ВКонтакте", hint: "vk.ru/bilarius" },
] as const;

export function ContactLinks({ tone = "block" }: { tone?: Tone }) {
  if (tone === "hero") {
    return (
      <div className="flex items-center justify-end gap-3">
        <a
          href={VK_URL}
          target="_blank"
          rel="noreferrer"
          className="flex cursor-pointer items-center justify-center rounded-full border border-solid border-[#2f2f2f] bg-white/[0.02] px-5 py-3 font-tight text-[15px] tracking-[-0.3px] whitespace-nowrap text-white transition-colors duration-200 ease-out [@media(hover:hover)]:hover:bg-white/10"
        >
          VK
        </a>
        <a
          href={TELEGRAM_URL}
          target="_blank"
          rel="noreferrer"
          className="flex cursor-pointer items-center justify-center rounded-full bg-white px-5 py-3 font-tight text-[15px] font-medium tracking-[-0.3px] whitespace-nowrap text-[#121212] transition-opacity duration-200 ease-out [@media(hover:hover)]:hover:opacity-90"
        >
          Telegram
        </a>
      </div>
    );
  }

  if (tone === "light") {
    return (
      <div className="flex flex-wrap gap-3">
        {ITEMS.map((item) => (
          <a
            key={item.href}
            href={item.href}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-full border border-emerald-800/20 bg-white px-4 py-2 text-sm text-emerald-950"
          >
            <span className="font-medium">{item.label}</span>
            <span className="text-emerald-900/60">{item.hint}</span>
          </a>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-3">
      {ITEMS.map((item) => (
        <a
          key={item.href}
          href={item.href}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-3 rounded-full border border-white/15 bg-white/[0.04] px-5 py-3 text-white transition-colors [@media(hover:hover)]:hover:bg-white/10"
        >
          <span className="font-tight text-[15px] font-medium">{item.label}</span>
          <span className="font-tight text-[13px] text-white/55">{item.hint}</span>
        </a>
      ))}
    </div>
  );
}
