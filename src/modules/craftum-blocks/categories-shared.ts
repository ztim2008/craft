export type CraftumBlockCategory = {
  id: string;
  name: string;
  emoji: string;
  order?: number;
};

export function getCategoryMetaFromList(
  categoryId: string | null | undefined,
  categories: CraftumBlockCategory[],
): CraftumBlockCategory {
  const id = String(categoryId || "").trim() || "custom";
  const found = categories.find((c) => c.id === id);
  if (found) return found;
  return (
    categories.find((c) => c.id === "custom") ??
    categories[0] ?? { id: "custom", name: "Дизайн", emoji: "🎨" }
  );
}
