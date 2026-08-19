import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { attr } from "./html";
import { analyzeHtml } from "./analyzeHtml";
import { applySimilarWidgets, expandSimilarFields } from "./similarWidgets";
import { applyContent } from "@/modules/content/applyContent";
import { emptyContent } from "@/modules/content/types";

describe("attr", () => {
  it("does not confuse data-custom-class with class", () => {
    const attrs = ` id="n-1" data-custom-class="pic" class="cli-block cli-text pic"`;
    assert.equal(attr(attrs, "class"), "cli-block cli-text pic");
    assert.equal(attr(attrs, "data-custom-class"), "pic");
  });
});

describe("pic widget", () => {
  const pic = (sid: string, aid: string, iid: string, vk: string, img: string) => `
    <section id="${sid}" data-custom-class="pic" class="cli-block cli-text pic">
      <a id="${aid}" href="${vk}" data-title="Изображение"><img id="${iid}" data-type="image" src="${img}"></a>
    </section>`;

  it("extracts pic section and untyped social links", () => {
    const sections = analyzeHtml(pic(
      "n-aaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
      "n-bbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
      "n-cccc-cccc-cccc-cccc-cccccccccccc",
      "https://vk.com/x",
      "/a.png",
    ));
    assert.equal(sections.length, 1);
    assert.equal(sections[0].customClass, "pic");
    assert.equal(sections[0].label, "Виджет .pic");
    assert.ok(sections[0].fields.some((field) => field.type === "link" && field.href?.includes("vk.com")));
    assert.ok(sections[0].fields.some((field) => field.type === "image" && field.value === "/a.png"));
  });

  it("patches all similar copies from one field", () => {
    const home = pic(
      "n-aaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
      "n-bbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
      "n-cccc-cccc-cccc-cccc-cccccccccccc",
      "https://vk.com/old",
      "/old.png",
    );
    const inner = pic(
      "n-dddd-dddd-dddd-dddd-dddddddddddd",
      "n-eeee-eeee-eeee-eeee-eeeeeeeeeeee",
      "n-ffff-ffff-ffff-ffff-ffffffffffff",
      "https://vk.com/old",
      "/old.png",
    );
    const pages = [
      { path: "/", url: "/", title: "/", sections: analyzeHtml(home) },
      { path: "/p", url: "/p", title: "/p", sections: analyzeHtml(inner) },
    ];
    const similar = applySimilarWidgets(pages);
    assert.equal(similar.length, 1);
    assert.equal(pages[0].sections[0].scope, "site");
    const homeLink = pages[0].sections[0].fields.find((field) => field.type === "link")!.nodeId;
    const otherLink = pages[1].sections[0].fields.find((field) => field.type === "link")!.nodeId;
    const overlay = emptyContent();
    overlay.fields[homeLink] = { value: "", href: "https://vk.com/new", linkKind: "external", linkUrl: "https://vk.com/new" };
    const out = applyContent(inner, overlay, "/p", similar);
    assert.match(out, /https:\/\/vk.com\/new/);
    const expanded = expandSimilarFields(overlay.fields, similar);
    assert.equal(expanded[otherLink].href, "https://vk.com/new");
  });
});
