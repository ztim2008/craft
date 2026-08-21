import type { PlanId } from "@/modules/billing/types";

export type HostingKind = "local" | "beget" | "timeweb" | "vps";

export type ClientRecord = {
  id: string;
  name: string;
  domain: string;
  plan: PlanId;
  sourceUrl: string;
  jobId?: string;
  email?: string;
  phone?: string;
  notes?: string;
  orderId?: string;
  adminPassword?: string;
  nodePort?: number;
  hosting?: HostingKind;
  includeEditor?: boolean;
  createdAt: string;
  updatedAt: string;
};

export function originFromDomain(raw: string): string {
  const host = normalizeDomain(raw);
  return `https://${host}`;
}

export function isConstructorHost(host: string): boolean {
  const h = host.toLowerCase().replace(/^www\./, "");
  return h === "craftum.io" || h.endsWith(".craftum.io") || h === "craftum.ru" || h.endsWith(".craftum.ru");
}

export function suggestDomainFromSourceUrl(url: string): string {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    if (!host || isConstructorHost(host)) return "";
    return host;
  } catch {
    return "";
  }
}

export function normalizeDomain(raw: string): string {
  let value = raw.trim().toLowerCase();
  value = value.replace(/^https?:\/\//, "");
  value = value.replace(/\/.*$/, "");
  if (!value || value.includes(" ") || value.includes("..") || value.startsWith(".")) {
    throw new Error("Укажите домен вида example.ru");
  }
  if (!/^[a-z0-9.-]+$/.test(value) || !value.includes(".")) {
    throw new Error("Укажите домен вида example.ru");
  }
  return value;
}

/** Домен клиента — его собственный, не адрес на Крафтуме. */
export function normalizeOwnDomain(raw: string): string {
  const host = normalizeDomain(raw);
  if (isConstructorHost(host)) {
    throw new Error(
      "Укажите ваш домен (example.ru), не адрес на Крафтуме. Домен остаётся вашим — его только отвязать.",
    );
  }
  return host;
}

export function parseOptionalOwnDomain(raw: string): string | undefined {
  const value = raw.trim();
  if (!value) return undefined;
  return normalizeOwnDomain(value);
}

export function normalizePort(raw: unknown): number {
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1 || n > 65535) return 3000;
  return n;
}

export function normalizeHosting(raw: unknown): HostingKind {
  if (raw === "beget" || raw === "timeweb" || raw === "vps" || raw === "local") return raw;
  return "vps";
}
