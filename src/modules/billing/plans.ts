import { priceFor } from "./pricingStore";
import type { Plan, PlanId } from "./types";

export type { Plan, PlanId } from "./types";
export { formatRub } from "./types";

const COPY: Record<PlanId, Omit<Plan, "amountRub">> = {
  basic: {
    id: "basic",
    name: "Basic",
    pages: "главная страница",
    summary: "Главная на вашем хостинге. Домен остаётся вашим.",
    features: [
      "Сайт выглядит как на Крафтуме",
      "Выкладка на ваш хостинг",
      "Домен отвязываем от Крафтума, не покупаем заново",
      "Редактор текстов и заявок с форм",
    ],
  },
  pro: {
    id: "pro",
    name: "Pro",
    pages: "весь сайт",
    summary: "Все страницы на вашем хостинге. Один раз, без подписки.",
    features: [
      "Весь сайт, как был",
      "Тот же домен — ваш, только отвязка от Крафтума",
      "Редактор всех страниц",
      "Установка под ключ — по договорённости",
    ],
  },
};

export function planCopy(id: string): Omit<Plan, "amountRub"> | null {
  if (id !== "basic" && id !== "pro") return null;
  return COPY[id];
}

export async function getLivePlan(id: string): Promise<Plan | null> {
  const copy = planCopy(id);
  if (!copy) return null;
  return { ...copy, amountRub: await priceFor(copy.id) };
}

export async function listPlans(): Promise<Plan[]> {
  const plans = await Promise.all([getLivePlan("basic"), getLivePlan("pro")]);
  return plans.filter((plan): plan is Plan => Boolean(plan));
}

export function getPlan(id: string): Plan | null {
  const copy = planCopy(id);
  if (!copy) return null;
  return { ...copy, amountRub: copy.id === "pro" ? 19900 : 9900 };
}
