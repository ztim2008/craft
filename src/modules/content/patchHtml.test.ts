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
});
