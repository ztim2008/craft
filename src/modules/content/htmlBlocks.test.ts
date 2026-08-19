import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { applyHtmlBlocks, moveHtmlBlock } from "./htmlBlocks";

describe("applyHtmlBlocks", () => {
  it("inserts before and after a section without duplicating", () => {
    const html = `<body><div id="n-sec" class="cli-block"><p>x</p></div></body>`;
    const once = applyHtmlBlocks(html, [
      { id: "hb-1", sectionId: "n-sec", position: "before", html: "<style>.x{color:red}</style>" },
      { id: "hb-2", sectionId: "n-sec", position: "after", html: "<script>window.__craft=1</script>" },
    ]);
    assert.match(once, /data-craft-html-block="hb-1"/);
    assert.match(once, /data-craft-html-block="hb-2"/);
    assert.match(once, /<!--craft-block:hb-2-->/);
    const twice = applyHtmlBlocks(once, [
      { id: "hb-1", sectionId: "n-sec", position: "before", html: "<style>.x{color:red}</style>" },
    ]);
    assert.equal((twice.match(/<!--craft-block:hb-1-->/g) || []).length, 1);
    assert.doesNotMatch(twice, /craft-block:hb-2/);
  });

  it("inserts head and bodyEnd widgets without a section", () => {
    const html = `<html><head><title>t</title></head><body><p>x</p></body></html>`;
    const out = applyHtmlBlocks(html, [
      { id: "h1", sectionId: "", position: "head", html: "<meta name='widget' content='1'>" },
      { id: "b1", sectionId: "", position: "bodyEnd", html: "<div id='map'>map</div>" },
    ]);
    assert.match(out, /<!--craft-block:h1-->/);
    assert.match(out, /<\/head>/);
    assert.match(out, /id='map'>map/);
  });

  it("hides flow blocks and skips hidden head slots", () => {
    const html = `<html><head></head><body><div id="n-sec">x</div></body></html>`;
    const out = applyHtmlBlocks(html, [
      { id: "hb-h", sectionId: "n-sec", position: "after", html: "<p>w</p>", hidden: true },
      { id: "hb-head", sectionId: "", position: "head", html: "<meta name='x'>", hidden: true },
    ]);
    assert.match(out, /data-craft-hidden="true"/);
    assert.doesNotMatch(out, /craft-block:hb-head/);
  });

  it("moves a block above then below its section", () => {
    const blocks = [{ id: "hb-1", sectionId: "s1", position: "after" as const, html: "<p>a</p>" }];
    const up = moveHtmlBlock(blocks, "hb-1", "up", ["s0", "s1", "s2"]);
    assert.equal(up[0].position, "before");
    assert.equal(up[0].sectionId, "s1");
    const down = moveHtmlBlock(up, "hb-1", "down", ["s0", "s1", "s2"]);
    assert.equal(down[0].position, "after");
  });
});
