import { attr, looksLikePhone, stripTags } from "./html";
import { sectionLabel, sectionTypeFromClass } from "./labels";
import { elementRange } from "@/modules/dom/tagRange";
import type {
  PageModelField,
  PageModelForm,
  PageModelFormField,
  PageModelSection,
} from "./types";

const OPEN_RE =
  /<([a-zA-Z][a-zA-Z0-9]*)\b([^>]*\bid=(["'])(n-[0-9a-f-]+)\3[^>]*)(\/?)>/gi;
const SECTION_OPEN_RE = /<section\b([^>]*)>/gi;
const INPUT_RE = /<input\b([^>]*)\/?>/gi;
const FORM_RE = /<form\b([^>]*)>([\s\S]*?)<\/form>/gi;
const IMG_RE = /<img\b([^>]*)\/?>/i;

const SKIP_TYPES = new Set([
  "block-wrapper",
  "grid",
  "grid-col",
  "background",
  "bg-fade",
  "shape",
  "list",
  "list-item",
  "form",
  "menu",
  "toggle-list",
  "input",
  "icon",
  "video",
]);

const FIELD_TYPES = new Set([
  "text",
  "button",
  "link",
  "image",
  "logo",
  "menu-item",
  "social",
  "header-menu",
  "timer",
]);

function fieldLabel(type: string, value: string, title: string): string {
  if (title && !title.startsWith("CDN_")) return title;
  if (type === "phone") return "Телефон";
  if (type === "link" || type === "menu-item") return "Ссылка";
  if (type === "button") return "Кнопка";
  if (type === "image") return "Изображение";
  const short = value.slice(0, 42);
  return short || "Текст";
}

function mapType(dataType: string, text: string): PageModelField["type"] {
  if (dataType === "image" || dataType === "logo") return "image";
  if (dataType === "link" || dataType === "menu-item" || dataType === "social") return "link";
  if (dataType === "button") return "button";
  if (looksLikePhone(text)) return "phone";
  if (text.length > 140) return "textarea";
  return "text";
}

export function extractFields(html: string): PageModelField[] {
  const fields: PageModelField[] = [];
  const seen = new Set<string>();
  const re = new RegExp(OPEN_RE.source, "gi");
  let match: RegExpExecArray | null;
  while ((match = re.exec(html))) {
    const tag = match[1];
    const attrs = match[2] || "";
    const nodeId = match[4] || attr(attrs, "id");
    const selfClose = Boolean(match[5]);
    if (!nodeId || seen.has(nodeId)) continue;
    const dataType = attr(attrs, "data-type");
    if (!dataType || SKIP_TYPES.has(dataType)) continue;
    if (!FIELD_TYPES.has(dataType)) continue;

    const openTag = match[0];
    let inner = "";
    if (!selfClose && !/^img$/i.test(tag) && !/^input$/i.test(tag)) {
      const range = elementRange(html, tag, match.index, openTag);
      if (!range) continue;
      inner = html.slice(match.index + openTag.length, range.end).replace(new RegExp(`</${tag}\\s*>$`, "i"), "");
    }

    const text = stripTags(inner);
    const href = attr(attrs, "href");
    let imgSrc = "";
    if (dataType === "image" || dataType === "logo") {
      const img = inner.match(IMG_RE);
      imgSrc = img ? attr(img[1] || "", "src") : attr(attrs, "src");
    }
    if ((dataType === "text" || dataType === "timer" || dataType === "header-menu") && !text) continue;
    if (dataType === "button" && !text && !href) continue;
    if ((dataType === "menu-item" || dataType === "link" || dataType === "social") && !text && !href) continue;

    seen.add(nodeId);
    const type = mapType(dataType, text);
    fields.push({
      nodeId,
      type,
      label: fieldLabel(type, type === "image" ? imgSrc : text, attr(attrs, "data-title")),
      value: type === "image" ? imgSrc : text,
      href: href || undefined,
    });
  }
  return fields;
}

function extractForms(sectionHtml: string): PageModelForm[] {
  const forms: PageModelForm[] = [];
  let formIndex = 0;
  for (const match of sectionHtml.matchAll(FORM_RE)) {
    formIndex += 1;
    const attrs = match[1] || "";
    const inner = match[2] || "";
    const formId = attr(attrs, "id") || `form-${formIndex}`;
    const fields: PageModelFormField[] = [];
    for (const input of inner.matchAll(INPUT_RE)) {
      const iattrs = input[1] || "";
      const nodeId = attr(iattrs, "id");
      const name = attr(iattrs, "name") || attr(iattrs, "placeholder") || nodeId;
      if (!name) continue;
      const placeholder = attr(iattrs, "placeholder");
      const inputType = attr(iattrs, "type") || "text";
      fields.push({
        nodeId: nodeId || name,
        name,
        label: placeholder || name,
        inputType,
        placeholder,
      });
    }
    if (!fields.length) continue;
    forms.push({
      id: formId,
      label: attr(attrs, "data-title") || `Форма ${formIndex}`,
      fields,
    });
  }
  return forms;
}

export function analyzeHtml(html: string): PageModelSection[] {
  const sections: PageModelSection[] = [];
  const re = new RegExp(SECTION_OPEN_RE.source, "gi");
  let match: RegExpExecArray | null;
  while ((match = re.exec(html))) {
    const attrs = match[1] || "";
    const className = attr(attrs, "class");
    if (!/\bcli-block\b/.test(className)) continue;
    const range = elementRange(html, "section", match.index, match[0]);
    if (!range) continue;
    const inner = html.slice(match.index + match[0].length, range.end).replace(/<\/section\s*>$/i, "");
    const id = attr(attrs, "id") || attr(attrs, "data-root-id");
    if (!id) continue;
    const type = sectionTypeFromClass(className);
    sections.push({
      id,
      rootId: attr(attrs, "data-root-id") || id.replace(/^n-/, ""),
      type,
      label: sectionLabel(type),
      fields: extractFields(inner),
      forms: extractForms(inner),
    });
    re.lastIndex = range.end;
  }
  return sections;
}
