import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { patchHtml } from "./patchHtml";

describe("patchHtml", () => {
  it("replaces text and href on n-uuid nodes", () => {
    const html =
      `<a id="n-aaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa" href="tel:+74951234567">+7 495 123-45-67</a>` +
      `<div id="n-bbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb">Старый заголовок</div>`;
    const out = patchHtml(html, {
      "n-aaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa": {
        value: "+7 900 000-00-00",
        href: "tel:+79000000000",
      },
      "n-bbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb": { value: "Новый заголовок" },
    });
    assert.match(out, /href="tel:\+79000000000"/);
    assert.match(out, />\+7 900 000-00-00</);
    assert.match(out, />Новый заголовок</);
  });

  it("sets internal/anchor attrs and turns button into a link", () => {
    const html = `<button id="n-cccc-cccc-cccc-cccc-cccccccccccc" class="cli-button">Заказать</button>`;
    const out = patchHtml(html, {
      "n-cccc-cccc-cccc-cccc-cccccccccccc": {
        value: "Заказать",
        linkKind: "anchor",
        linkPage: "/",
        linkSection: "n-sec",
      },
    });
    assert.match(out, /<a\b[^>]*href="#n-sec"/);
    assert.match(out, /<\/a>/);
    const ext = patchHtml(`<a id="n-dddd-dddd-dddd-dddd-dddddddddddd" href="#">X</a>`, {
      "n-dddd-dddd-dddd-dddd-dddddddddddd": {
        value: "X",
        linkKind: "external",
        linkUrl: "https://example.com",
        linkBlank: true,
      },
    });
    assert.match(ext, /target="_blank"/);
    assert.match(ext, /rel="noopener noreferrer"/);
  });

  it("writes popup hash href without leaving the page", () => {
    const html = `<a id="n-cccc-cccc-cccc-cccc-cccccccccccc" class="cli-button" href="/about/">Заказать</a>`;
    const out = patchHtml(html, {
      "n-cccc-cccc-cccc-cccc-cccccccccccc": {
        value: "Заказать",
        linkKind: "popup",
        linkSection: "n-4ccbc67d-b99d-447a-9ad4-e78c5c3db929",
      },
    });
    assert.match(out, /href="#n-4ccbc67d-b99d-447a-9ad4-e78c5c3db929"/);
  });

  it("does not dump wrapper text into nested highlight spans", () => {
    const html =
      `<h1 id="n-eeee-eeee-eeee-eeee-eeeeeeeeeeee">КУПИТЬ <span id="n-ffff-ffff-ffff-ffff-ffffffffffff">ПЕЧАТЬЮ</span></h1>`;
    const out = patchHtml(html, {
      "n-eeee-eeee-eeee-eeee-eeeeeeeeeeee": { value: "КУПИТЬ КУПИТЬ ПЕЧАТЬЮ!" },
      "n-ffff-ffff-ffff-ffff-ffffffffffff": { value: "ПЕЧАТЬЮ!" },
    });
    assert.match(out, />КУПИТЬ <span/);
    assert.match(out, />ПЕЧАТЬЮ!</);
    assert.doesNotMatch(out, /КУПИТЬ КУПИТЬ/);
  });

  it("replaces inner HTML of code widgets", () => {
    const html = `<div id="n-eeee-eeee-eeee-eeee-eeeeeeeeeeee" data-type="code"><style>.x{color:red}</style></div>`;
    const out = patchHtml(html, {
      "n-eeee-eeee-eeee-eeee-eeeeeeeeeeee": { value: "<style>.x{color:blue}</style>", innerHtml: true },
    });
    assert.match(out, /color:blue/);
    assert.doesNotMatch(out, /color:red/);
  });
});
