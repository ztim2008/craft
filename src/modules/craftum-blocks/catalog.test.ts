import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "fs";
import { join } from "path";
import { parseCraftumBlockInput, getCraftumBlockCatalog } from "./catalog";
import { parseCraftumBlockSnapshot } from "./snapshot";

describe("parseCraftumBlockInput", () => {
  it("parses cover block", () => {
    const block = parseCraftumBlockInput({
      id: "hero-cover-07",
      name: "Hero 07",
      description: "Test",
      insert: { mode: "cover", templateTitle: "cover-07" },
    });
    assert.equal(block.insert.mode, "cover");
    if (block.insert.mode === "cover") {
      assert.equal(block.insert.templateTitle, "cover-07");
    }
  });

  it("rejects bad id", () => {
    assert.throws(() =>
      parseCraftumBlockInput({
        id: "Bad ID!",
        name: "X",
        description: "Y",
        insert: { mode: "design" },
      }),
    );
  });
});

describe("catalog.json snapshot blocks", () => {
  it("text-012222 has valid snapshot insert", () => {
    const catalog = getCraftumBlockCatalog();
    const block = catalog.blocks.find((b) => b.id === "text-012222");
    assert.ok(block, "text-012222 in catalog");
    assert.equal(block?.insert.mode, "snapshot");
    if (block?.insert.mode !== "snapshot") return;
    const snap = parseCraftumBlockSnapshot(block.insert.craftumBlock);
    assert.ok(snap.content);
    const content = snap.content as { attrs?: { class?: string } };
    assert.match(content.attrs?.class ?? "", /cli-block/);
  });

  it("catalog file matches loader", () => {
    const fromDisk = JSON.parse(
      readFileSync(join(process.cwd(), "data/craftum-blocks/catalog.json"), "utf8"),
    ) as { blocks: unknown[] };
    const fromLoader = getCraftumBlockCatalog();
    assert.equal(fromLoader.blocks.length, fromDisk.blocks.length);
    assert.ok(fromLoader.blocks.length >= 7);
  });
});
