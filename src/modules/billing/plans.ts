export type PlanId = "basic" | "pro";

export type Plan = {
  id: PlanId;
  name: string;
  amountRub: number;
  pages: string;
  summary: string;
  features: string[];
};

export const PLANS: Record<PlanId, Plan> = {
  basic: {
    id: "basic",
    name: "Basic",
    amountRub: Number(process.env.PRICE_BASIC_RUB || 9900),
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
    amountRub: Number(process.env.PRICE_PRO_RUB || 19900),
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

export function getPlan(id: string): Plan | null {
  if (id === "basic" || id === "pro") return PLANS[id];
  return null;
}

export function formatRub(amount: number): string {
  return new Intl.NumberFormat("ru-RU").format(amount) + " ₽";
}
