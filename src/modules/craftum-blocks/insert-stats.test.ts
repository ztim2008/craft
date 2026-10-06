import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, unlinkSync, writeFileSync } from "fs";
import { join } from "path";

const STATS_PATH = join(process.cwd(), "data/craftum-blocks/insert-stats.json");
const BACKUP = `${STATS_PATH}.bak-test`;

describe("insert-stats", () => {
  it("increments block counter", async () => {
    if (existsSync(STATS_PATH)) {
      writeFileSync(BACKUP, readFileSync(STATS_PATH));
    }
    writeFileSync(
      STATS_PATH,
      `${JSON.stringify({ updatedAt: new Date().toISOString(), blocks: {} }, null, 2)}\n`,
    );

    const { incrementBlockInsertCount, getBlockInsertStats } = await import("./insert-stats");
    assert.equal(getBlockInsertStats("hero-01").insertCount, 0);
    const a = incrementBlockInsertCount("hero-01");
    assert.equal(a.insertCount, 1);
    const b = incrementBlockInsertCount("hero-01");
    assert.equal(b.insertCount, 2);
    assert.ok(b.lastInsertedAt);

    if (existsSync(BACKUP)) {
      writeFileSync(STATS_PATH, readFileSync(BACKUP));
      unlinkSync(BACKUP);
    }
  });
});
