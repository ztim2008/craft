import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { describe, it } from "node:test";
import path from "node:path";
import { applyContent } from "@/modules/content/applyContent";

const require = createRequire(import.meta.url);
const portable = require(path.join(process.cwd(), "src/modules/export/portable/patch.cjs")) as {
  applyContent: typeof applyContent;
};

describe("portable patch.cjs", () => {
  it("matches TypeScript applyContent", () => {
    const html = `<div id="n-sec"><p>x</p></div><div id="n-bbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb">Старый</div>`;
    const overlay = {
      version: 1 as const,
      updatedAt: "t",
      fields: { "n-bbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb": { value: "Новый" } },
      forms: {},
      htmlBlocks: [
        { id: "hb-1", sectionId: "n-sec", position: "after" as const, html: "<style>.x{color:red}</style>" },
      ],
      menuInserts: [],
    };
    assert.equal(portable.applyContent(html, overlay), applyContent(html, overlay));
  });
});
