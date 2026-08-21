// Delivered by Originkit · stack: nextjs · styling: tailwind
"use client";

const CHIPS = [
  "Сайт как был",
  "Свой хостинг",
  "Домен ваш",
  "Отвязка от Крафтума",
  "Без подписки",
  "Редактор на месте",
];

const EDGE_MASK =
  "linear-gradient(to right, transparent 0, #000 10%, #000 90%, transparent 100%)";

export const LogoMarquee = () => (
  <div
    className="relative h-[62px] w-[min(92vw,572px)] overflow-hidden desktop-sm:h-[74px] desktop-sm:w-[683px]"
    style={{ maskImage: EDGE_MASK, WebkitMaskImage: EDGE_MASK }}
  >
    <div className="flex w-max animate-logo-marquee items-center will-change-transform">
      {[0, 1].map((copy) => (
        <ul key={copy} className="flex shrink-0 items-center gap-3 pr-3" aria-hidden={copy === 1}>
          {CHIPS.map((chip) => (
            <li
              key={`${copy}-${chip}`}
              className="rounded-full border border-white/15 bg-white/[0.04] px-4 py-2 font-tight text-[14px] tracking-[-0.2px] whitespace-nowrap text-white/75"
            >
              {chip}
            </li>
          ))}
        </ul>
      ))}
    </div>
  </div>
);
