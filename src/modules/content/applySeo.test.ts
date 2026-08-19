import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { applySeo } from "./applySeo";
import { emptyContent } from "./types";

describe("applySeo", () => {
  it("sets title, description, favicon and open graph", () => {
    const html = `<html><head><title>Old</title><meta name="description" content="x"><link rel="icon" href="/old.ico"></head><body>ok</body></html>`;
    const overlay = emptyContent();
    overlay.site = {
      faviconUrl: "https://cdn.example/icon.png",
      ogImage: "https://cdn.example/share.jpg",
    };
    overlay.pages = {
      "/": {
        title: "Главная — Студия",
        description: "Перенос сайта",
        ogTitle: "OG Title",
        canonical: "https://studio.ru/",
      },
    };
    const out = applySeo(html, overlay, "/");
    assert.match(out, /<title>Главная — Студия<\/title>/);
    assert.match(out, /meta name="description" content="Перенос сайта"/);
    assert.match(out, /rel="icon" href="https:\/\/cdn.example\/icon.png"/);
    assert.match(out, /rel="apple-touch-icon"/);
    assert.match(out, /property="og:title" content="OG Title"/);
    assert.match(out, /property="og:image" content="https:\/\/cdn.example\/share.jpg"/);
    assert.match(out, /name="twitter:card" content="summary_large_image"/);
    assert.match(out, /property="og:url" content="https:\/\/studio.ru\/"/);
    assert.doesNotMatch(out, />Old</);
    const twice = applySeo(out, overlay, "/");
    assert.equal((twice.match(/og:title/g) || []).length, 1);
    assert.equal((twice.match(/rel="icon"/g) || []).length, 1);
  });

  it("injects webmaster and metrika", () => {
    const html = `<html><head></head><body></body></html>`;
    const overlay = emptyContent();
    overlay.site = {
      yandexMetrikaId: "12345678",
      yandexVerification: "abcDEF",
      googleVerification: "xyz",
      googleAnalyticsId: "G-ABC12",
    };
    const out = applySeo(html, overlay, "/");
    assert.match(out, /yandex-verification" content="abcDEF"/);
    assert.match(out, /google-site-verification" content="xyz"/);
    assert.match(out, /ym\(12345678,/);
    assert.match(out, /gtag\/js\?id=G-ABC12/);
  });
});
