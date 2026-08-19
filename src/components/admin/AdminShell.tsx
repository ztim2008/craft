"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const NAV = [
  { href: "/admin", label: "Обзор" },
  { href: "/admin/import", label: "Импорт" },
  { href: "/admin/orders", label: "Заявки" },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen bg-[#f0f0f1] text-[#1d2327]">
      <aside className="flex w-56 shrink-0 flex-col bg-[#1d2327] text-[#f0f0f1]">
        <div className="border-b border-[#2c3338] px-4 py-4 text-sm font-semibold">
          Craft Admin
        </div>
        <nav className="flex-1 p-2 text-sm">
          {NAV.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`mb-1 block rounded px-3 py-2 ${
                  active ? "bg-[#2271b1] text-white" : "hover:bg-[#2c3338]"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <button
          type="button"
          onClick={logout}
          className="border-t border-[#2c3338] px-4 py-3 text-left text-xs text-[#a7aaad] hover:text-white"
        >
          Выйти
        </button>
      </aside>
      <div className="min-w-0 flex-1">
        <header className="flex items-center justify-between border-b border-[#c3c4c7] bg-white px-6 py-3 text-sm">
          <span>Kraftum Migration Engine</span>
          <Link href="/" className="text-[#2271b1] hover:underline">
            На сайт
          </Link>
        </header>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}
