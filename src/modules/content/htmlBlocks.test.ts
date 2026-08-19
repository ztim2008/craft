import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { applyHtmlBlocks } from "./htmlBlocks";

describe("applyHtmlBlocks", () => {
  it("inserts before and after a section without duplicating", () => {
    const html = `<body><div id="n-sec" class="cli-block"><p>x</p></div></body>`;
    const once = applyHtmlBlocks(html, [
      { id: "hb-1", sectionId: "n-sec", position: "before", html: "<style>.x{color:red}</style>" },
      { id: "hb-2", sectionId: "n-sec", position: "after", html: "<script>window.__craft=1</script>" },
    ]);
    assert.match(once, /<!--craft-block:hb-1--><style>\.x\{color:red\}<\/style><!--\/craft-block:hb-1--><div id="n-sec"/);
    assert.match(once, /<\/div><!--craft-block:hb-2--><script>window\.__craft=1<\/script><!--\/craft-block:hb-2-->/);
    const twice = applyHtmlBlocks(once, [
      { id: "hb-1", sectionId: "n-sec", position: "before", html: "<style>.x{color:red}</style>" },
    ]);
    assert.equal((twice.match(/<!--craft-block:hb-1-->/g) || []).length, 1);
    assert.doesNotMatch(twice, /craft-block:hb-2/);
  });
});
