import { readFile } from "node:fs/promises";
import path from "node:path";
import { projectDir } from "@/lib/storage";
import { getContent, saveContent } from "@/modules/content/store";
import { applyContent } from "@/modules/content/applyContent";
import { buildExportZip } from "@/modules/export/buildExport";

const JOB = "edc13b6b-ac8a-4c81-85c7-88660d20f6fe";
const NODE = "n-6bb326b5-e609-46c2-adc1-905446751ef1";

async function main() {
  const overlay = await getContent(JOB);
  overlay.fields = { ...(overlay.fields || {}), [NODE]: { value: "PILOT · мыло для всех" } };
  await saveContent(JOB, overlay);

  const htmlPath = path.join(projectDir(JOB), "site", "index.html");
  const html = await readFile(htmlPath, "utf8");
  const patched = applyContent(html, overlay, "/");
  const ok = patched.includes("PILOT · мыло для всех") && !patched.includes("Universal soap for everyone");
  console.log("patch_ok", ok);

  // live preview uses applyContent on the fly from content.json — verify getContent
  const again = await getContent(JOB);
  console.log("saved_value", again.fields?.[NODE]?.value);

  const zip = await buildExportZip(JOB, "https://ua9043.craftum.io/", "https://soap-flower.example.ru", {
    clientName: "Pilot Soap flower",
    domain: "soap-flower.example.ru",
    includeEditor: true,
    adminPassword: "pilot-change-me",
  });
  console.log("zip", zip);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
