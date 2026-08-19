import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Craft · Kraftum Migration Engine",
  description: "Перенос сайтов Крафтума на независимую инфраструктуру",
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
