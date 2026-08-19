import { randomBytes } from "node:crypto";
import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { saveClient } from "@/modules/clients/store";
import { getClient } from "@/modules/clients/store";
import { buildExportZip } from "@/modules/export/buildExport";
import { validateJobPackage } from "@/modules/export/validatePackage";

const JOB_ID = "e56926cc-f939-4358-a0dc-a0bcedc8b9a1";
const CLIENT_ID = "b3882c36-b50a-4f9c-80e2-6dc5dddf9c2d";
const ORIGIN = "https://demo.nordic-builder.ru";
const DEST = "/var/www/www-root/data/www/demo.nordic-builder.ru";
const STAGING = "/tmp/craft-demo-practic-hub";

async function main() {
  let password = randomBytes(12).toString("base64url");
  try {
    const env = await readFile(path.join(DEST, ".env"), "utf8");
    const match = env.match(/^ADMIN_PASSWORD=(.*)$/m);
    if (match && match[1].trim()) password = match[1].trim();
  } catch {
    // first deploy
  }
  const report = await validateJobPackage(JOB_ID, ORIGIN);
  if (!report.ok) {
    console.error(JSON.stringify(report, null, 2));
    process.exit(1);
  }
  console.log("VALIDATOR_OK", report.warnings);
  const zipPath = await buildExportZip(JOB_ID, "https://practic-hub.ru/", ORIGIN, {
    clientName: "Practic Hub",
    domain: "demo.nordic-builder.ru",
    plan: "pro",
    adminPassword: password,
    nodePort: 3041,
    hosting: "vps",
    includeEditor: true,
  });
  console.log("ZIP", zipPath);
  await rm(STAGING, { recursive: true, force: true });
  await mkdir(STAGING, { recursive: true });
  const { spawnSync } = await import("node:child_process");
  const unzip = spawnSync("unzip", ["-qo", zipPath, "-d", STAGING], { encoding: "utf8" });
  if (unzip.status !== 0) {
    console.error(unzip.stderr);
    process.exit(1);
  }
  for (const name of ["public", "data", "admin.html", "canvas.js", "server.mjs", "patch.cjs", "INSTRUKTSIYA.txt", ".env.example"]) {
    await rm(path.join(DEST, name), { recursive: true, force: true });
    await cp(path.join(STAGING, name), path.join(DEST, name), { recursive: true });
  }
  await writeFile(
    path.join(DEST, ".env"),
    `PORT=3041\nSITE_ORIGIN=${ORIGIN}\nADMIN_PASSWORD=${password}\nADMIN_SESSION_SECRET=${password}\n# Source: https://practic-hub.ru/\n`,
    "utf8",
  );
  const client = await getClient(CLIENT_ID);
  if (client) {
    await saveClient({
      ...client,
      adminPassword: password,
      nodePort: 3041,
      notes: "Полигон demo.nordic-builder.ru · источник practic-hub.ru, боевой домен не трогаем.",
    });
  }
  console.log(JSON.stringify({ password, origin: ORIGIN, admin: `${ORIGIN}/admin` }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
