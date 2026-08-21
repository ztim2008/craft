import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Craft — сайт с Крафтума на свой хостинг",
  description:
    "Уходите с Крафтума на личный хостинг. Сайт как был, домен остаётся вашим — его только отвязать. Telegram: t.me/bilarius",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className="h-full antialiased">
      <body className="min-h-full bg-zinc-50 text-zinc-900">{children}</body>
    </html>
  );
}
