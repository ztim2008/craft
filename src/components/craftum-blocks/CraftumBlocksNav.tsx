"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const LINKS = [
  { href: "/craftum-blocks/catalog", label: "Каталог блоков" },
  { href: "/craftum-blocks", label: "Скачать расширение" },
  { href: "/craftum-blocks/versions", label: "Версии" },
  { href: "/admin/craftum-blocks", label: "Админка" },
  { href: "/", label: "Craft · миграция" },
] as const;

function isActive(pathname: string, href: string): boolean {
  if (href === "/craftum-blocks/catalog") return pathname.startsWith("/craftum-blocks/catalog");
  if (href === "/craftum-blocks") return pathname === "/craftum-blocks";
  if (href === "/craftum-blocks/versions") return pathname.startsWith("/craftum-blocks/versions");
  return pathname === href;
}

export function CraftumBlocksNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-black/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 md:px-6 md:py-4">
        <Link href="/craftum-blocks/catalog" className="flex min-w-0 items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-400 to-violet-700 text-sm font-bold text-white">
            CB
          </span>
          <span className="min-w-0 truncate font-instrument-serif text-lg tracking-tight text-white md:text-xl">
            Craftum Blocks
          </span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Craftum Blocks">
          {LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={`rounded-lg px-3 py-2 text-sm transition ${
                isActive(pathname, href)
                  ? "bg-violet-500/20 font-medium text-violet-200"
                  : "text-white/65 hover:bg-white/5 hover:text-white"
              }`}
            >
              {label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2 lg:hidden">
          <Link
            href="/craftum-blocks"
            className="rounded-lg bg-violet-500 px-3 py-2 text-xs font-semibold text-white"
          >
            Скачать
          </Link>
          <button
            type="button"
            aria-expanded={open}
            aria-label={open ? "Закрыть меню" : "Открыть меню"}
            onClick={() => setOpen((v) => !v)}
            className="flex h-10 w-10 flex-col items-center justify-center gap-1.5 rounded-lg border border-white/15 bg-white/5"
          >
            <span
              className={`block h-0.5 w-5 bg-white transition ${open ? "translate-y-2 rotate-45" : ""}`}
            />
            <span className={`block h-0.5 w-5 bg-white transition ${open ? "opacity-0" : ""}`} />
            <span
              className={`block h-0.5 w-5 bg-white transition ${open ? "-translate-y-2 -rotate-45" : ""}`}
            />
          </button>
        </div>
      </div>

      {open && (
        <>
          <button
            type="button"
            aria-label="Закрыть"
            className="fixed inset-0 top-[57px] z-40 bg-black/60 lg:hidden"
            onClick={() => setOpen(false)}
          />
          <nav
            className="relative z-50 border-t border-white/10 bg-[#0a0a0a] px-4 py-3 lg:hidden"
            aria-label="Мобильное меню"
          >
            <ul className="space-y-1">
              {LINKS.map(({ href, label }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className={`block rounded-xl px-4 py-3 text-[15px] ${
                      isActive(pathname, href)
                        ? "bg-violet-500/15 font-medium text-violet-200"
                        : "text-white/80 hover:bg-white/5"
                    }`}
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </>
      )}
    </header>
  );
}
