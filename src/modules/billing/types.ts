export type PlanId = "basic" | "pro";

export type Plan = {
  id: PlanId;
  name: string;
  amountRub: number;
  pages: string;
  summary: string;
  features: string[];
};

export function formatRub(amount: number): string {
  return new Intl.NumberFormat("ru-RU").format(amount) + " ₽";
}
