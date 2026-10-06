/**
 * Синхронизация changelog расширения:
 * - manifest.json → текущая версия
 * - docs/devlog.md → summary + date для новых версий
 * - data/craftum-blocks/extension-releases.json → источник правды (added/fixed сохраняются)
 */
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

const ROOT = join(__dirname, "..");
const MANIFEST_PATH = join(ROOT, "craftum-blocks-extension/manifest.json");
const DEVLOG_PATH = join(ROOT, "docs/devlog.md");
const OUT_PATH = join(ROOT, "data/craftum-blocks/extension-releases.json");

export type ExtensionRelease = {
  version: string;
  date: string;
  summary: string;
  added: string[];
  fixed: string[];
  known?: string[];
};

type ReleasesFile = {
  updatedAt: string;
  releases: ExtensionRelease[];
};

function parseSemver(v: string): number[] {
  return v.split(".").map((n) => parseInt(n, 10) || 0);
}

function compareSemver(a: string, b: string): number {
  const aa = parseSemver(a);
  const bb = parseSemver(b);
  for (let i = 0; i < 3; i += 1) {
    const d = (bb[i] ?? 0) - (aa[i] ?? 0);
    if (d !== 0) return d;
  }
  return 0;
}

function cleanSummary(text: string): string {
  return text
    .replace(/`/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Парсит devlog: секции ## DATE и bullets `- **vX.Y.Z** — …` */
export function parseDevlogVersions(devlog: string): Map<string, { date: string; summary: string }> {
  const map = new Map<string, { date: string; summary: string }>();
  const sections = devlog.split(/^## /m).slice(1);

  for (const section of sections) {
    const headerLine = section.split("\n")[0] || "";
    const dateMatch = headerLine.match(/^(\d{4}-\d{2}-\d{2})/);
    if (!dateMatch) continue;
    const date = dateMatch[1];
    if (!/craftum blocks/i.test(headerLine) && !/расширение/i.test(section.slice(0, 800))) {
      continue;
    }

    const bulletRe = /^-\s+\*\*v(\d+\.\d+\.\d+)\*\*\s+[—–-]\s+(.+)$/gm;
    let m: RegExpExecArray | null;
    while ((m = bulletRe.exec(section)) !== null) {
      const version = m[1];
      const summary = cleanSummary(m[2]);
      if (!map.has(version) || summary.length > (map.get(version)?.summary.length ?? 0)) {
        map.set(version, { date, summary });
      }
    }

    const inlineRe = /Craftum Blocks v(\d+\.\d+\.\d+)/gi;
    let im: RegExpExecArray | null;
    while ((im = inlineRe.exec(section)) !== null) {
      const version = im[1];
      if (!map.has(version)) {
        const summaryMatch = section.match(/### Итог\s*\n+\s*\*\*(.+?)\*\*/);
        const summary = summaryMatch ? cleanSummary(summaryMatch[1]) : `Craftum Blocks v${version}`;
        map.set(version, { date, summary });
      }
    }
  }

  return map;
}

function loadExisting(): ReleasesFile {
  try {
    const raw = JSON.parse(readFileSync(OUT_PATH, "utf8")) as ReleasesFile;
    if (Array.isArray(raw.releases)) return raw;
  } catch {
    /* first run */
  }
  return { updatedAt: new Date(0).toISOString(), releases: [] };
}

function mergeRelease(
  existing: ExtensionRelease | undefined,
  devlog: { date: string; summary: string } | undefined,
  version: string,
): ExtensionRelease {
  return {
    version,
    date: existing?.date || devlog?.date || new Date().toISOString().slice(0, 10),
    summary: existing?.summary || devlog?.summary || `Craftum Blocks v${version}`,
    added: existing?.added ?? [],
    fixed: existing?.fixed ?? [],
    ...(existing?.known?.length ? { known: existing.known } : {}),
  };
}

export function syncExtensionReleases(options?: { dryRun?: boolean }): ReleasesFile {
  const manifest = JSON.parse(readFileSync(MANIFEST_PATH, "utf8")) as { version: string };
  const devlog = readFileSync(DEVLOG_PATH, "utf8");
  const fromDevlog = parseDevlogVersions(devlog);
  const existing = loadExisting();
  const byVersion = new Map(existing.releases.map((r) => [r.version, r]));

  const allVersions = new Set<string>([
    ...byVersion.keys(),
    ...fromDevlog.keys(),
    manifest.version,
  ]);

  const releases = [...allVersions]
    .sort(compareSemver)
    .map((version) => mergeRelease(byVersion.get(version), fromDevlog.get(version), version));

  const out: ReleasesFile = {
    updatedAt: new Date().toISOString(),
    releases,
  };

  if (!options?.dryRun) {
    writeFileSync(OUT_PATH, `${JSON.stringify(out, null, 2)}\n`, "utf8");
  }

  return out;
}

if (process.argv[1]?.includes("sync-extension-releases")) {
  const dryRun = process.argv.includes("--dry-run");
  const result = syncExtensionReleases({ dryRun });
  console.log(
    `[sync-extension-releases] ${result.releases.length} versions → ${dryRun ? "(dry-run)" : OUT_PATH}`,
  );
}
