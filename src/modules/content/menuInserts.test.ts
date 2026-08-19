import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { applyMenuInserts } from "./menuInserts";
import { applyContent } from "./applyContent";
import { emptyContent } from "./types";

const itemA = `<a id="n-11111111-1111-4111-a111-111111111111" class="cli-menu__link" data-type="menu-item" data-root-id="root-a" href="/old"><p id="n-22222222-2222-4222-a222-222222222222" data-type="text">Главная</p><div id="n-33333333-3333-4333-a333-333333333333" class="cli-menu__arrow"></div></a>`;
const itemB = `<button id="n-44444444-4444-4444-a444-444444444444" class="cli-menu__link" data-type="menu-item" data-root-id="root-a"><p id="n-55555555-5555-4555-a555-555555555555" data-type="text">Услуги</p></button>`;
const itemMobile = `<a id="n-66666666-6666-4666-a666-666666666666" class="cli-menu__link" data-type="menu-item" data-root-id="root-b" href="/old"><p id="n-77777777-7777-4777-a777-777777777777" data-type="text">Главная</p></a>`;
const html = `<nav>${itemA}${itemB}</nav>${"x".repeat(2500)}<nav>${itemMobile}</nav>`;

describe("applyMenuInserts", () => {
  it("clones an <a> menu-item into every menu group with unique ids", () => {
    const out = applyMenuInserts(html, [
      {
        id: "mi-1",
        label: "Новая",
        linkKind: "page",
        linkPage: "/privacy",
        itemNodeIds: ["n-aaaaaaa1-1111-4111-a111-111111111111", "n-aaaaaaa2-2222-4222-a222-222222222222"],
        textNodeIds: ["n-bbbbbbb1-1111-4111-a111-111111111111", "n-bbbbbbb2-2222-4222-a222-222222222222"],
      },
    ]);
    assert.equal((out.match(/<!--craft-menu:mi-1:/g) || []).length, 2);
    assert.match(out, /id="n-aaaaaaa1-1111-4111-a111-111111111111"[^>]*href="\/privacy"/);
    assert.match(out, /id="n-aaaaaaa2-2222-4222-a222-222222222222"[^>]*href="\/privacy"/);
    assert.match(out, />Новая</);
    assert.doesNotMatch(out, /id="n-11111111-1111-4111-a111-111111111111"[^>]*id="n-aaaaaaa1/);
    const twice = applyMenuInserts(out, [
      {
        id: "mi-1",
        label: "Новая",
        linkKind: "page",
        linkPage: "/privacy",
        itemNodeIds: ["n-aaaaaaa1-1111-4111-a111-111111111111", "n-aaaaaaa2-2222-4222-a222-222222222222"],
        textNodeIds: ["n-bbbbbbb1-1111-4111-a111-111111111111", "n-bbbbbbb2-2222-4222-a222-222222222222"],
      },
    ]);
    assert.equal((twice.match(/<!--craft-menu:mi-1:/g) || []).length, 2);
  });

  it("runs inside applyContent before field patches", () => {
    const overlay = emptyContent();
    overlay.menuInserts = [
      {
        id: "mi-1",
        label: "Тел",
        linkKind: "tel",
        linkUrl: "+79001234567",
        itemNodeIds: ["n-ccccccc1-1111-4111-a111-111111111111"],
        textNodeIds: ["n-ddddddd1-1111-4111-a111-111111111111"],
      },
    ];
    overlay.fields["n-ccccccc1-1111-4111-a111-111111111111"] = {
      value: "Тел",
      linkKind: "tel",
      linkUrl: "+79001234567",
    };
    const out = applyContent(html, overlay);
    assert.match(out, /href="tel:\+79001234567"/);
  });
});
