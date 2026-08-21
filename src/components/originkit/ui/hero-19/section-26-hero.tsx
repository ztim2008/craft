// Delivered by Originkit · stack: nextjs · styling: tailwind
"use client";

import { useState } from "react";
import { Backdrop } from "@/components/originkit/ui/hero-19/backdrop";
import { LogoMarquee } from "@/components/originkit/ui/hero-19/logo-marquee";
import { Orb } from "@/components/originkit/ui/hero-19/orb";
import { RecommendationCard } from "@/components/originkit/ui/hero-19/recommendation-card";
import { ContactLinks } from "@/components/landing/ContactLinks";
import { TELEGRAM_URL, VK_URL } from "@/components/landing/contacts";

/** Public asset under /originkit/hero-19 */
function asset(file: string) {
  return `/originkit/hero-19/${file}`;
}

const NAV_LINKS = [
  { href: "#benefits", label: "Преимущества" },
  { href: "#offer", label: "Оферта" },
  { href: "#faq", label: "Вопросы" },
  { href: "#lead", label: "Заявка" },
];

const HAND_MASK =
  "linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.35) 7%, #000 20%, #000 86%, rgba(0,0,0,0.5) 95%, transparent 100%)";

const PILL_SHEEN =
  "radial-gradient(120% 100% at 0% 50%, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0) 100%), linear-gradient(90deg, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.1) 100%)";

export const Section26Hero = () => {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <section id="top" className="relative min-h-dvh w-full overflow-hidden bg-black">
      <Backdrop />

      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-[38%] bg-linear-to-b from-transparent via-black/25 to-black/60 mix-blend-overlay"
      />

      <div className="relative h-[874px] overflow-hidden ipad:h-[1133px] desktop-sm:h-dvh desktop-sm:min-h-[840px] ultrawide:mx-auto ultrawide:h-[1080px] ultrawide:max-w-[1920px]">
        <nav className="absolute top-0 left-0 z-30 flex w-full items-center justify-between p-4 ipad:px-12 ipad:py-8 desktop-sm:px-25 desktop-sm:py-[52px]">
          <a href="#top" className="flex items-center gap-2">
            <span
              className="block size-[22px] shrink-0 overflow-hidden"
              style={{
                maskImage: `url(${asset("logo-mask.svg")})`,
                WebkitMaskImage: `url(${asset("logo-mask.svg")})`,
                maskSize: "22px 22px",
                WebkitMaskSize: "22px 22px",
                maskRepeat: "no-repeat",
                WebkitMaskRepeat: "no-repeat",
              }}
            >
              <img
                src={asset("logo-mark.svg")}
                alt=""
                className="block size-full max-w-none"
              />
            </span>
            <span className="font-sans text-[20px] leading-[25.5px] font-semibold tracking-[-0.4px] whitespace-nowrap text-white">
              Craft
            </span>
          </a>

          <ul
            className="absolute left-1/2 hidden -translate-x-1/2 items-center rounded-[12px] border border-solid border-white/10 p-2 desktop-sm:flex"
            style={{ backgroundImage: PILL_SHEEN }}
          >
            {NAV_LINKS.map((link, index) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  className={`flex items-center justify-center rounded-lg px-4 py-2 font-tight text-[12px] whitespace-nowrap text-white transition-colors duration-200 ease-out ${
                    index === 0 ? "bg-black/30" : ""
                  } [@media(hover:hover)]:hover:bg-black/20`}
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>

          <div className="hidden desktop-sm:block">
            <ContactLinks tone="hero" />
          </div>

          <button
            type="button"
            aria-label={menuOpen ? "Закрыть меню" : "Открыть меню"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
            className="size-6 ipad:size-8 desktop-sm:hidden"
          >
            <img
              src={asset("menu.svg")}
              alt=""
              className="block size-6 max-w-none ipad:size-8"
            />
          </button>
        </nav>

        {menuOpen ? (
          <div className="absolute inset-x-4 top-[72px] z-40 rounded-2xl border border-white/10 bg-black/85 p-5 backdrop-blur-md desktop-sm:hidden">
            <ul className="space-y-3">
              {NAV_LINKS.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    onClick={() => setMenuOpen(false)}
                    className="block font-tight text-[16px] text-white"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
            <div className="mt-5 flex gap-3">
              <a
                href={TELEGRAM_URL}
                target="_blank"
                rel="noreferrer"
                className="rounded-full bg-white px-4 py-2 font-tight text-[14px] text-black"
              >
                Telegram
              </a>
              <a
                href={VK_URL}
                target="_blank"
                rel="noreferrer"
                className="rounded-full border border-white/20 px-4 py-2 font-tight text-[14px] text-white"
              >
                VK
              </a>
            </div>
          </div>
        ) : null}

        <div className="absolute top-[155px] left-[calc(50%+0.5px)] z-20 flex -translate-x-1/2 flex-col items-center gap-8 ipad:top-[245px] desktop-sm:top-auto desktop-sm:bottom-33.5 desktop-sm:left-25 desktop-sm:translate-x-0 desktop-sm:items-start desktop-sm:gap-[52px]">
          <div className="flex flex-col items-center gap-3 text-center text-white desktop-sm:w-[540px] desktop-sm:items-start desktop-sm:text-left">
            <h1 className="font-instrument-serif text-[48px] leading-[1.08] tracking-[-1.2px] ipad:text-[66px] ipad:tracking-[-1.98px] desktop-sm:text-[80px] desktop-sm:leading-[0.98] desktop-sm:tracking-[-1.6px]">
              Свой хостинг.
              <br />
              Свой домен.
            </h1>
            <p className="w-[399px] max-w-[350px] font-sans text-[16px] leading-[1.4] tracking-[-0.32px] opacity-60 ipad:max-w-none ipad:w-[617px] ipad:text-[18px] ipad:tracking-[-0.36px] desktop-sm:w-[540px] desktop-sm:font-tight desktop-sm:leading-normal desktop-sm:opacity-70">
              Уходите с Крафтума на личный хостинг. Сайт остаётся как был.
              Домен ваш — его только отвязать от конструктора.
            </p>
            <div className="mt-2 flex flex-wrap items-center justify-center gap-3 desktop-sm:justify-start">
              <a
                href="#demo"
                className="rounded-full bg-white px-6 py-3 font-tight text-[16px] font-medium tracking-[-0.32px] text-[#121212]"
              >
                Бесплатное демо
              </a>
              <a
                href="#lead"
                className="rounded-full border border-white/20 px-6 py-3 font-tight text-[16px] tracking-[-0.32px] text-white"
              >
                Оставить заявку
              </a>
            </div>
          </div>

          <LogoMarquee />
        </div>

        <img
          aria-hidden
          src={asset("arcs-texture.png")}
          alt=""
          className="pointer-events-none absolute inset-0 z-0 block size-full max-w-none object-cover mix-blend-screen ipad:opacity-80 desktop-sm:hidden"
        />

        <div className="pointer-events-none absolute inset-0 z-10">
          <Orb />
        </div>

        <img
          aria-hidden
          src={asset("hand.png")}
          alt=""
          className="pointer-events-none absolute top-[calc(50%+255px)] left-[calc(50%-4px)] z-10 h-[410px] w-[738px] max-w-none -translate-x-1/2 -translate-y-1/2 object-cover ipad:top-[894px] ipad:left-1/2 ipad:h-[502px] ipad:w-[902px] desktop-sm:top-auto desktop-sm:bottom-0 desktop-sm:h-auto desktop-sm:w-[86vw] desktop-sm:min-w-[1239px] desktop-sm:origin-bottom desktop-sm:scale-115 desktop-sm:translate-y-0 ultrawide:top-[384px] ultrawide:bottom-auto ultrawide:w-[1180px] ultrawide:min-w-0 ultrawide:scale-100"
          style={{
            maskImage: HAND_MASK,
            WebkitMaskImage: HAND_MASK,
          }}
        />

        <RecommendationCard />

        <div
          aria-hidden
          className="pointer-events-none absolute bottom-[-35.15px] left-[68.62px] z-0 h-[51.15px] w-[342.55px] blur-[18.083px] ipad:bottom-[-20.15px] ipad:left-[188.62px] desktop-sm:bottom-[-29px] desktop-sm:left-[calc(50%-81.5px)] desktop-sm:h-[99px] desktop-sm:w-[663px] desktop-sm:-translate-x-1/2 desktop-sm:blur-[35px]"
        >
          <div className="absolute inset-0 bg-[rgba(180,52,26,0.1)] backdrop-blur-[25.833px] desktop-sm:backdrop-blur-[50px]" />
        </div>

        <div
          aria-hidden
          className="pointer-events-none absolute bottom-[-29px] left-[calc(50%-51.5px)] z-20 hidden h-[99px] w-[663px] -translate-x-1/2 blur-[35px] desktop-sm:block"
        >
          <div
            className="absolute inset-0 backdrop-blur-[53.5px]"
            style={{
              backgroundImage:
                "linear-gradient(178.552deg, rgba(39,7,1,0.2) 28.846%, rgba(141,27,4,0.2) 92.813%)",
            }}
          />
        </div>
      </div>
    </section>
  );
};
