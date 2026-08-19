import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { rewriteForExport, htmlPathToLoc, sitemapXml, hasPreviewPathLeak } from "./rewriteForExport";

describe("rewriteForExport", () => {
  it("strips preview prefixes and sets base href", () => {
    const id = "41f73bdd-8e06-43e4-9916-8ec85ce468e0";
    const html = `<base href="/preview/${id}/"><link href="/preview/${id}/assets/a.css"><a href="/preview/${id}/about-me/">x</a>`;
    const out = rewriteForExport(html, id, "https://YOUR-DOMAIN.RU");
    assert.match(out, /<base href="\/">/);
    assert.match(out, /href="\/assets\/a.css"/);
    assert.match(out, /href="\/about-me\/"/);
    assert.doesNotMatch(out, /preview/);
    assert.equal(hasPreviewPathLeak(html), true);
    assert.equal(hasPreviewPathLeak(out), false);
  });

  it("strips preview prefixes even if jobId argument mismatches HTML", () => {
    const html = `<link href="/preview/6e4ac91c-b0a5-4664-82ac-fd7d1ffed95d/assets/a.css">`;
    const out = rewriteForExport(html, "00000000-0000-0000-0000-000000000000", "https://demo.example");
    assert.match(out, /href="\/assets\/a.css"/);
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
