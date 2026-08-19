import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { applySectionScope, uniqueSiteSections } from "./sectionScope";
import type { PageModelPage } from "./types";

function page(path: string, ids: { id: string; type: string }[]): PageModelPage {
  return {
    path,
    url: path,
    title: path,
    sections: ids.map((item) => ({
      id: item.id,
      rootId: item.id,
      type: item.type,
      label: item.type,
      fields: [],
      forms: [],
    })),
  };
}

describe("applySectionScope", () => {
  it("marks shared ids and header/footer as site", () => {
    const pages = applySectionScope([
      page("/", [
        { id: "n-head", type: "header" },
        { id: "n-html", type: "html" },
        { id: "n-hero", type: "cover" },
      ]),
      page("/inner", [
        { id: "n-head", type: "header" },
        { id: "n-html", type: "html" },
        { id: "n-hero", type: "cover" },
        { id: "n-local", type: "text" },
      ]),
    ]);
    const home = pages[0].sections;
    assert.equal(home.find((s) => s.id === "n-head")?.scope, "site");
    assert.equal(home.find((s) => s.id === "n-html")?.scope, "site");
    assert.equal(home.find((s) => s.id === "n-hero")?.scope, "page");
    assert.equal(pages[1].sections.find((s) => s.id === "n-local")?.scope, "page");
    assert.equal(uniqueSiteSections(pages, "html").length, 1);
    assert.equal(uniqueSiteSections(pages, "header")[0].id, "n-head");
  });

  it("marks static HTML as site even on one page", () => {
    const pages = [
      page("/", [{ id: "n-html-once", type: "html" }]),
    ];
    pages[0].sections[0].static = true;
    applySectionScope(pages);
    assert.equal(pages[0].sections[0].scope, "site");
  });
});
