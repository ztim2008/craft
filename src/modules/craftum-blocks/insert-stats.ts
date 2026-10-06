import { existsSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";

export type BlockInsertStats = {
  insertCount: number;
  lastInsertedAt?: string;
};

export type InsertStatsFile = {
  updatedAt: string;
  blocks: Record<string, BlockInsertStats>;
};

const STATS_PATH = join(process.cwd(), "data/craftum-blocks/insert-stats.json");

function readStatsFile(): InsertStatsFile {
  if (!existsSync(STATS_PATH)) {
    return { updatedAt: new Date(0).toISOString(), blocks: {} };
  }
  const raw = JSON.parse(readFileSync(STATS_PATH, "utf8")) as InsertStatsFile;
  if (!raw.blocks || typeof raw.blocks !== "object") {
    return { updatedAt: new Date().toISOString(), blocks: {} };
  }
  return raw;
}

function writeStatsFile(file: InsertStatsFile): InsertStatsFile {
  const next: InsertStatsFile = {
    updatedAt: new Date().toISOString(),
    blocks: file.blocks,
  };
  writeFileSync(STATS_PATH, `${JSON.stringify(next, null, 2)}\n`, "utf8");
  return next;
}

export function getInsertStatsMap(): Record<string, BlockInsertStats> {
  return readStatsFile().blocks;
}

export function getBlockInsertStats(blockId: string): BlockInsertStats {
  const stats = readStatsFile().blocks[blockId];
  return stats ?? { insertCount: 0 };
}

export function incrementBlockInsertCount(blockId: string): BlockInsertStats {
  const id = String(blockId || "").trim().toLowerCase();
  if (!id) throw new Error("blockId обязателен");

  const file = readStatsFile();
  const prev = file.blocks[id] ?? { insertCount: 0 };
  const next: BlockInsertStats = {
    insertCount: prev.insertCount + 1,
    lastInsertedAt: new Date().toISOString(),
  };
  file.blocks[id] = next;
  writeStatsFile(file);
  return next;
}
