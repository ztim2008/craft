"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, type FormEvent } from "react";

function LoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const [email, setEmail] = useState("bilariuss@yandex.ru");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error || "Ошибка входа");
      router.push(search.get("next") || "/admin");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
      setPending(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="w-full max-w-sm space-y-4 rounded border border-[#c3c4c7] bg-white p-6 shadow-sm"
    >
      <h1 className="text-xl font-semibold text-[#1d2327]">Craft Admin</h1>
      <p className="text-sm text-[#50575e]">Вход владельца миграционного сервиса</p>
      <p className="text-sm text-[#50575e]">
        <Link href="/" className="text-[#2271b1] hover:underline">
          На сайт
        </Link>
      </p>
      <label className="block space-y-1 text-sm">
        <span>Email</span>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded border border-[#8c8f94] px-3 py-2"
        />
      </label>
      <label className="block space-y-1 text-sm">
        <span>Пароль</span>
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded border border-[#8c8f94] px-3 py-2"
        />
      </label>
      {error ? <p className="text-sm text-[#d63638]">{error}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded bg-[#2271b1] px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
      >
        {pending ? "Вход…" : "Войти"}
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f0f0f1] p-6">
      <Suspense>
        <LoginForm />
      </Suspense>
    </main>
  );
}
