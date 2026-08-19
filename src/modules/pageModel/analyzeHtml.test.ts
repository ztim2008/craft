import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { analyzeHtml } from "./analyzeHtml";
import { looksLikePhone } from "./html";

describe("analyzeHtml", () => {
  it("extracts cli-block sections, text fields and form inputs", () => {
    const html = `
      <section id="n-aaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa" data-root-id="aaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa" class="cli-block cli-header">
        <a id="n-bbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb" data-type="text" href="/">Юридическое обслуживание</a>
        <a id="n-cccc-cccc-cccc-cccc-cccccccccccc" data-type="link" href="tel:+74951234567">+7 495 123-45-67</a>
        <form id="n-form-1"><input id="n-in-1" name="Имя" placeholder="Ваше имя" type="text"></form>
      </section>
      <section id="n-dddd-dddd-dddd-dddd-dddddddddddd" class="cli-block cli-cover">
        <div id="n-eeee-eeee-eeee-eeee-eeeeeeeeeeee" data-type="text"><h1>Заголовок hero</h1></div>
      </section>
    `;
    const sections = analyzeHtml(html);
    assert.equal(sections.length, 2);
    assert.equal(sections[0].type, "header");
    assert.equal(sections[0].label, "Шапка");
    assert.ok(sections[0].fields.some((field) => field.value.includes("Юридическое")));
    assert.equal(sections[0].forms.length, 1);
    assert.equal(sections[0].forms[0].fields[0].name, "Имя");
    assert.equal(sections[1].type, "cover");
  });
});

describe("looksLikePhone", () => {
  it("accepts RU phone and rejects short numbers", () => {
    assert.equal(looksLikePhone("+7 495 123-45-67"), true);
    assert.equal(looksLikePhone("12"), false);
  });
});
