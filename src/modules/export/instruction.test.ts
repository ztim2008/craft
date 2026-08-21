import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { deployInstructionTxt } from "./deployReadme";

describe("deploy instruction txt", () => {
  it("is plain text with domain, port, beget chapter and password", () => {
    const text = deployInstructionTxt({
      siteOrigin: "https://demo.nordic-builder.ru",
      clientName: "Полигон",
      domain: "demo.nordic-builder.ru",
      plan: "basic",
      adminPassword: "test-pass-9",
      nodePort: 3041,
      hosting: "beget",
      includeEditor: true,
      sourceUrl: "https://sx7238.craftum.io/",
    });
    assert.match(text, /INSTRUKTSIYA\.txt/);
    assert.match(text, /https:\/\/demo\.nordic-builder\.ru/);
    assert.match(text, /PORT=3041/);
    assert.match(text, /test-pass-9/);
    assert.match(text, /BEGET/);
    assert.match(text, /file:\/\//);
    assert.doesNotMatch(text, /^# /m);
    assert.match(text, /клик по блоку/);
    assert.match(text, /отвяз/i);
    assert.match(text, /уже ваш/i);
  });

  it("shortens editor chapter when includeEditor is false", () => {
    const text = deployInstructionTxt({
      siteOrigin: "https://example.ru",
      includeEditor: false,
      hosting: "local",
    });
    assert.match(text, /ОПЦИОНАЛЬНО/);
    assert.doesNotMatch(text, /Опубликовать/);
  });
});
