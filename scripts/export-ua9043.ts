import { buildExportZip } from "@/modules/export/buildExport";
import { getContent, saveContent } from "@/modules/content/store";
import { applyContent } from "@/modules/content/applyContent";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { projectDir } from "@/lib/storage";

const JOB = "edc13b6b-ac8a-4c81-85c7-88660d20f6fe";

async function smokePatch() {
  const model = JSON.parse(await readFile(path.join(projectDir(JOB), "page-model.json"), "utf8"));
  const field = (model.pages?.[0]?.fields || model.fields || []).find(
    (f: { type?: string; id?: string }) => f.type === "text" || f.kind === "text",
  ) || model.pages?.[0]?.fields?.[0];
  console.log("sample field", field ? { id: field.id, type: field.type || field.kind, path: field.path } : null);

  // Prefer known hero title if present in first page html
  const overlay = await getContent(JOB);
  const nodeId =
    field?.id ||
    field?.nodeId ||
    Object.keys(overlay.fields || {})[0];
  if (!nodeId) {
    // find n- id from page-model fields array shapes
    const pages = model.pages || [];
    for (const p of pages) {
      for (const f of p.fields || []) {
        if (f.id && (f.type === "text" || f.dataType === "text")) {
          console.log("using", f.id, f.type || f.dataType);
          overlay.fields = overlay.fields || {};
          overlay.fields[f.id] = { value: "PILOT PATCH OK" };
          await saveContent(JOB, overlay);
          const htmlPath = path.join(projectDir(JOB), "site", "index.html");
          let html = await readFile(htmlPath, "utf8");
          html = applyContent(html, overlay, "/");
          const ok = html.includes("PILOT PATCH OK");
          console.log("patch_apply", ok);
          return ok;
        }
      }
    }
    console.log("no field found");
    return false;
  }
  overlay.fields = overlay.fields || {};
  overlay.fields[nodeId] = { value: "PILOT PATCH OK" };
  await saveContent(JOB, overlay);
  const htmlPath = path.join(projectDir(JOB), "site", "index.html");
  let html = await readFile(htmlPath, "utf8");
  html = applyContent(html, overlay, "/");
  console.log("patch_apply", html.includes("PILOT PATCH OK"));
  return html.includes("PILOT PATCH OK");
}

async function main() {
  const patched = await smokePatch();
  const zip = await buildExportZip(
    JOB,
    "https://ua9043.craftum.io/",
    "https://soap-flower.example.ru",
    {
      clientName: "Pilot Soap flower",
      domain: "soap-flower.example.ru",
      includeEditor: true,
      adminPassword: "pilot-change-me",
    },
  );
  console.log(JSON.stringify({ patched, zip }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
