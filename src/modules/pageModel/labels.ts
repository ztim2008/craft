const SECTION_LABELS: Record<string, string> = {
  header: "Шапка",
  cover: "Обложка",
  footer: "Подвал",
  about: "О компании",
  advantages: "Преимущества",
  services: "Услуги",
  team: "Команда",
  stages: "Этапы",
  timer: "Таймер",
  "block-partner": "Партнёры",
  "form-block": "Форма",
  title: "Заголовок",
  text: "Текст",
  media: "Медиа",
  map: "Карта",
  html: "HTML",
};

export function sectionLabel(type: string, customClass = ""): string {
  if (customClass) return `Виджет .${customClass}`;
  return SECTION_LABELS[type] || type;
}

export function sectionTypeFromClass(className: string): string {
  const parts = className.split(/\s+/).filter(Boolean);
  const typed = parts.find(
    (part) =>
      part.startsWith("cli-") &&
      part !== "cli-block" &&
      !part.startsWith("cli-block--"),
  );
  return typed ? typed.replace(/^cli-/, "") : "block";
}
