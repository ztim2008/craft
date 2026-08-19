import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { discoverLinks } from "./discoverLinks";

describe("discoverLinks", () => {
  it("keeps same-origin and marks external separately", () => {
    const links = discoverLinks("https://site.ru/about", [
      "/contacts",
      "https://site.ru/services",
      "https://youtube.com/watch?v=1",
      "mailto:a@b.c",
      "#top",
    ]);
    const same = links.filter((l) => l.kind === "same-origin").map((l) => l.url);
    const external = links.filter((l) => l.kind === "external").map((l) => l.url);
    assert.ok(same.includes("https://site.ru/contacts"));
    assert.ok(same.includes("https://site.ru/services"));
    assert.ok(external.includes("https://youtube.com/watch?v=1"));
    assert.equal(
      links.some((l) => l.url.startsWith("mailto:")),
      false,
    );
  });
});
