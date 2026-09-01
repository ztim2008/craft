import type { CraftumBlockNode } from "@/modules/craftum-blocks/snapshot";

function stylesToCss(styles: Record<string, unknown>): string {
  return Object.entries(styles)
    .map(([k, v]) => {
      const prop = k.replace(/([A-Z])/g, "-$1").toLowerCase();
      return `${prop}:${String(v)}`;
    })
    .join(";");
}

function renderNode(node: CraftumBlockNode): string {
  const tag = node.tag || "div";
  const attrs = Object.entries(node.attrs || {})
    .map(([k, v]) => `${k}="${String(v).replace(/"/g, "&quot;")}"`)
    .join(" ");
  const style = node.styles ? ` style="${stylesToCss(node.styles as Record<string, unknown>)}"` : "";
  const inner =
    node.inner_html ?? (node.children || []).map((ch) => renderNode(ch)).join("");
  const open = attrs ? `<${tag} ${attrs}${style}>` : `<${tag}${style}>`;
  return `${open}${inner}</${tag}>`;
}

/** Минимальный HTML для iframe-превью snapshot-блока. */
export function snapshotToPreviewDocument(content: CraftumBlockNode, title = "Preview"): string {
  const body = renderNode(content);
  return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title.replace(/</g, "")}</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; font-family: system-ui, sans-serif; background: #f8fafc; }
    .cb-preview-root { min-height: 100vh; }
  </style>
</head>
<body><div class="cb-preview-root">${body}</div></body>
</html>`;
}

export function snapshotPreviewText(content: CraftumBlockNode | undefined): string {
  if (!content) return "";
  const texts: string[] = [];
  function walk(n: CraftumBlockNode) {
    const html = n.inner_html;
    if (html && typeof html === "string") {
      const t = html.replace(/<[^>]+>/g, "").trim();
      if (t && t.length < 120 && !t.startsWith("<svg")) texts.push(t);
    }
    (n.children || []).forEach(walk);
  }
  walk(content);
  return texts.slice(0, 2).join(" · ");
}
