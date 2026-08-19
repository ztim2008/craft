import { priceFor } from "./pricingStore";
import type { Plan, PlanId } from "./types";

export type { Plan, PlanId } from "./types";
export { formatRub } from "./types";

const COPY: Record<PlanId, Omit<Plan, "amountRub">> = {
  basic: {
    id: "basic",
    name: "Basic",
    pages: "1 страница",
    summary: "Демо, которое вы уже видели, плюс пакет на свой хостинг.",
    features: [
      "ZIP: HTML, стили, картинки",
      "Админка контента в пакете: тексты, ссылки, формы → email",
      "HTML-блоки",
      "Инструкция Beget / Timeweb / VPS",
    ],
  },
  pro: {
    id: "pro",
    name: "Pro",
    pages: "весь сайт",
    summary: "Все страницы сайта + тот же пакет на хостинг.",
    features: [
      "Обход sitemap и внутренних ссылок",
      "ZIP со всеми страницами",
      "То же редактирование контента и форм",
      "Установка под ключ — отдельно, не в цене",
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
