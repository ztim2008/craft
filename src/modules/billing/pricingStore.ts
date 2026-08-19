import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { STORAGE_ROOT } from "@/lib/storage";

export type PricingFile = {
  basic: number;
  pro: number;
  updatedAt: string;
};

export const DEFAULT_PRICES: Pick<PricingFile, "basic" | "pro"> = {
  basic: Number(process.env.PRICE_BASIC_RUB || 9900),
  pro: Number(process.env.PRICE_PRO_RUB || 19900),
};

export function pricingPath(): string {
  return path.join(STORAGE_ROOT, "settings", "pricing.json");
}

export function parseAmountRub(value: unknown): number | null {
  const n = typeof value === "string" ? Number(value.replace(/\s/g, "").replace(",", ".")) : Number(value);
  if (!Number.isFinite(n) || n < 1 || n > 10_000_000) return null;
  return Math.round(n);
}

export async function getPricing(): Promise<PricingFile> {
  try {
    const raw = JSON.parse(await readFile(pricingPath(), "utf8")) as Partial<PricingFile>;
    const basic = parseAmountRub(raw.basic) ?? DEFAULT_PRICES.basic;
    const pro = parseAmountRub(raw.pro) ?? DEFAULT_PRICES.pro;
    return { basic, pro, updatedAt: raw.updatedAt || new Date().toISOString() };
  } catch {
    return { ...DEFAULT_PRICES, updatedAt: new Date().toISOString() };
  }
}

export async function savePricing(input: { basic: number; pro: number }): Promise<PricingFile> {
  const basic = parseAmountRub(input.basic);
  const pro = parseAmountRub(input.pro);
  if (basic == null || pro == null) throw new Error("Цена должна быть числом от 1 до 10 000 000 ₽");
  const next: PricingFile = { basic, pro, updatedAt: new Date().toISOString() };
  await mkdir(path.dirname(pricingPath()), { recursive: true });
  await writeFile(pricingPath(), JSON.stringify(next, null, 2), "utf8");
  return next;
}

export async function priceFor(plan: "basic" | "pro"): Promise<number> {
  const pricing = await getPricing();
  return pricing[plan];
}
