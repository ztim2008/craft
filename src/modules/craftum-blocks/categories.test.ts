import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, existsSync, copyFileSync } from "fs";
import { join } from "path";
import {
  addCraftumBlockCategory,
  getCraftumBlockCategories,
  removeCraftumBlockCategory,
  updateCraftumBlockCategory,
} from "./categories";

const CATEGORIES_PATH = join(process.cwd(), "data/craftum-blocks/categories.json");
const BACKUP = join(process.cwd(), "data/craftum-blocks/categories.json.bak-test");

describe("craftum block categories", () => {
  before(() => {
    if (existsSync(CATEGORIES_PATH)) copyFileSync(CATEGORIES_PATH, BACKUP);
  });

  after(() => {
    if (existsSync(BACKUP)) {
      writeFileSync(CATEGORIES_PATH, readFileSync(BACKUP));
    }
  });

  it("loads categories from json file", () => {
    const list = getCraftumBlockCategories();
    assert.ok(list.length >= 2);
    assert.ok(list.some((c) => c.id === "hero"));
  });

  it("add update remove category", () => {
    addCraftumBlockCategory({
      id: "test-cat",
      name: "Test",
      emoji: "🧪",
      order: 999,
    });
    assert.ok(getCraftumBlockCategories().some((c) => c.id === "test-cat"));

    updateCraftumBlockCategory("test-cat", {
      id: "test-cat",
      name: "Test Updated",
      emoji: "🧪",
      order: 999,
    });
    assert.equal(
      getCraftumBlockCategories().find((c) => c.id === "test-cat")?.name,
      "Test Updated",
    );

    removeCraftumBlockCategory("test-cat", "custom");
    assert.ok(!getCraftumBlockCategories().some((c) => c.id === "test-cat"));
  });
});
