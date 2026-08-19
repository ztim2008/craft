import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { rewriteForExport, htmlPathToLoc, sitemapXml } from "./rewriteForExport";

describe("rewriteForExport", () => {
  it("strips preview prefixes and sets base href", () => {
    const id = "41f73bdd-8e06-43e4-9916-8ec85ce468e0";
    const html = `<base href="/preview/${id}/"><link href="/preview/${id}/assets/a.css"><a href="/preview/${id}/about-me/">x</a>`;
    const out = rewriteForExport(html, id, "https://YOUR-DOMAIN.RU");
    assert.match(out, /<base href="\/">/);
    assert.match(out, /href="\/assets\/a.css"/);
    assert.match(out, /href="\/about-me\/"/);
    assert.doesNotMatch(out, /preview/);
  });
});

describe("sitemapXml", () => {
  it("maps index.html to origin root", () => {
    assert.equal(htmlPathToLoc("/pub", "/pub/index.html"), "/");
    assert.equal(htmlPathToLoc("/pub", "/pub/about-me/index.html"), "/about-me/");
    assert.match(sitemapXml("https://YOUR-DOMAIN.RU", ["/"]), /https:\/\/YOUR-DOMAIN.RU\//);
  });
});
