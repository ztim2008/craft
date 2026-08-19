import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { shouldDownloadAsset, shouldSkipAsset } from "./classify";
import {
  extractCraftumProxyUrls,
  extractHtmlAssetCandidates,
  resolveAssetUrl,
} from "./collectUrls";
import { pageOutputPath, relativeFromCss, relativeFromPage, rewriteUrls } from "./rewrite";
import { injectPreviewBase, previewAssetHref, previewBaseHref } from "./previewBase";

describe("classify", () => {
  it("downloads Craftum CDN and skips YouTube/marketing", () => {
    const host = "sx7238.craftum.io";
    assert.equal(
      shouldDownloadAsset(new URL("https://cdn2.craftum.com/images/a.jpg"), host),
      true,
    );
    assert.equal(
      shouldDownloadAsset(new URL("https://sx7238.craftum.io/static/a.css"), host),
      true,
    );
    assert.equal(shouldSkipAsset(new URL("https://www.youtube.com/embed/x")), true);
    assert.equal(shouldSkipAsset(new URL("https://craftum.com/")), true);
  });
});

describe("collectUrls", () => {
  it("extracts Craftum proxy image URLs", () => {
    const css =
      "background:url('https://static.craftum.com/uXGD8nuzb9e_TpTtRl5dDbq-ZqU=/1155x0/filters:no_upscale()/https://cdn2.craftum.com/images/advcard/001.jpg')";
    const urls = extractCraftumProxyUrls(css);
    assert.equal(urls.length, 1);
    assert.match(urls[0], /cdn2\.craftum\.com\/images\/advcard\/001\.jpg$/);
  });

  it("picks srcset and relative css from HTML", () => {
    const html = `<link href="/static/a.css"><img srcset="https://static.craftum.com/aaa=/700x0/filters:no_upscale()/https://cdn2.craftum.com/x.jpg 350w">`;
    const found = extractHtmlAssetCandidates(html);
    assert.ok(found.includes("/static/a.css"));
    assert.ok(found.some((item) => item.includes("cdn2.craftum.com/x.jpg")));
  });

  it("resolves relative assets against page origin", () => {
    assert.equal(
      resolveAssetUrl("/static/a.css", "https://sx7238.craftum.io/"),
      "https://sx7238.craftum.io/static/a.css",
    );
  });
});

describe("rewrite", () => {
  it("makes portable relative asset paths", () => {
    assert.equal(pageOutputPath("/"), "index.html");
    assert.equal(pageOutputPath("/about-me"), "about-me/index.html");
    assert.equal(relativeFromPage("/", "assets/a.css"), "./assets/a.css");
    assert.equal(relativeFromPage("/about-me", "assets/a.css"), "../assets/a.css");
  });

  it("replaces longest URLs first", () => {
    const html = "https://cdn.example/a.jpg https://cdn.example/a.jpg.webp";
    const out = rewriteUrls(html, [
      { from: "https://cdn.example/a.jpg", to: "short" },
      { from: "https://cdn.example/a.jpg.webp", to: "long" },
    ]);
    assert.equal(out, "short long");
  });

  it("keeps css url() in same assets folder without double assets/", () => {
    assert.equal(relativeFromCss("assets/a.css", "assets/b.webp"), "./b.webp");
    assert.equal(relativeFromCss("assets/a.css", "assets/nested/b.webp"), "./nested/b.webp");
  });
});

describe("previewBase", () => {
  it("injects base href into head", () => {
    const id = "41f73bdd-8e06-43e4-9916-8ec85ce468e0";
    assert.equal(previewBaseHref(id), `/preview/${id}/`);
    const html = "<html><head><title>x</title></head><body></body></html>";
    const out = injectPreviewBase(html, id);
    assert.match(out, /<base href="\/preview\/41f73bdd-8e06-43e4-9916-8ec85ce468e0\/">/);
  });

  it("builds absolute preview asset href", () => {
    const id = "41f73bdd-8e06-43e4-9916-8ec85ce468e0";
    assert.equal(
      previewAssetHref(id, "assets/77f3fc96457748c8.webp"),
      `/preview/${id}/assets/77f3fc96457748c8.webp`,
    );
  });
});
