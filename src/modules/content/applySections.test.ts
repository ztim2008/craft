import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { applySections, moveSectionInsert } from "./applySections";

describe("applySections", () => {
  const html = `<body>
<section id="n-a" class="cli-block cli-cover"><p>A</p></section>
<section id="n-b" class="cli-block cli-text"><p>B</p></section>
</body>`;

  it("reorders, hides, removes and inserts HTML", () => {
    const out = applySections(html, {
      order: ["n-b", "n-a"],
      hidden: ["n-b"],
      removed: [],
      inserts: [{ id: "extra", afterId: "n-b", html: "<div>NEW</div>" }],
    });
    assert.match(out, /data-craft-hidden="true"/);
    assert.ok(out.indexOf("n-b") < out.indexOf("n-a"));
    assert.match(out, /craft-section:extra/);
    assert.match(out, />NEW</);
    const gone = applySections(html, { removed: ["n-a"] });
    assert.doesNotMatch(gone, /id="n-a"/);
    assert.match(gone, /id="n-b"/);
  });

  it("moves HTML inserts past a section", () => {
    const inserts = [{ id: "extra", afterId: "n-a", html: "<div>NEW</div>" }];
    const up = moveSectionInsert(inserts, "extra", "up", ["n-a", "n-b"]);
    assert.equal(up[0].afterId, undefined);
    const down = moveSectionInsert(up, "extra", "down", ["n-a", "n-b"]);
    assert.equal(down[0].afterId, "n-a");
    const further = moveSectionInsert(down, "extra", "down", ["n-a", "n-b"]);
    assert.equal(further[0].afterId, "n-b");
    const html = `<body>
<section id="n-a" class="cli-block cli-cover"><p>A</p></section>
<section id="n-b" class="cli-block cli-text"><p>B</p></section>
</body>`;
    const leading = applySections(html, {
      inserts: [
        { id: "i1", html: "<div>ONE</div>" },
        { id: "i2", html: "<div>TWO</div>" },
      ],
    });
    assert.ok(leading.indexOf("ONE") < leading.indexOf("TWO"));
    assert.ok(leading.indexOf("ONE") < leading.indexOf("n-a"));
  });
});
