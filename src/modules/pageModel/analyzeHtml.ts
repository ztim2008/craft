import { attr, looksLikePhone, stripTags } from "./html";
import { sectionLabel, sectionTypeFromClass } from "./labels";
import type {
  PageModelField,
  PageModelForm,
  PageModelFormField,
  PageModelSection,
} from "./types";

const SECTION_RE = /<section\b([^>]*)>([\s\S]*?)<\/section>/gi;
const NODE_RE =
  /<(div|p|h1|h2|h3|h4|h5|span|a|button|img|li)\b([^>]*\bid=(["'])n-[0-9a-f-]+\3[^>]*)(?:\/>|>([\s\S]*?)<\/\1>)/gi;
const INPUT_RE = /<input\b([^>]*)\/?>/gi;
const FORM_RE = /<form\b([^>]*)>([\s\S]*?)<\/form>/gi;
const IMG_RE = /<img\b([^>]*)\/?>/i;

function fieldLabel(type: string, value: string, placeholder: string, name: string): string {
  if (placeholder) return placeholder;
  if (name && !/^n-/i.test(name)) return name;
  if (type === "phone") return "Телефон";
  if (type === "link") return "Ссылка";
  if (type === "button") return "Кнопка";
  if (type === "image") return "Изображение";
  const short = value.slice(0, 42);
  return short || "Текст";
}

function extractFields(sectionHtml: string): PageModelField[] {
  const fields: PageModelField[] = [];
  const seen = new Set<string>();
  for (const match of sectionHtml.matchAll(NODE_RE)) {
    const attrs = match[2] || "";
    const inner = match[4] || "";
    const dataType = attr(attrs, "data-type");
    const nodeId = attr(attrs, "id");
    if (!nodeId || seen.has(nodeId)) continue;
    if (!["text", "button", "link", "image", "logo"].includes(dataType)) continue;
    seen.add(nodeId);

    const text = stripTags(inner);
    const href = attr(attrs, "href");
    let imgSrc = "";
    if (dataType === "image" || dataType === "logo") {
      const img = inner.match(IMG_RE);
      imgSrc = img ? attr(img[1] || "", "src") : attr(attrs, "src");
    }
    if (dataType === "text" && !text) continue;
    if (dataType === "button" && !text && !href) continue;

    let type: PageModelField["type"] = "text";
    if (dataType === "image" || dataType === "logo") type = "image";
    else if (dataType === "link") type = "link";
    else if (dataType === "button") type = "button";
    else if (looksLikePhone(text)) type = "phone";
    else if (text.length > 140) type = "textarea";

    fields.push({
      nodeId,
      type,
      label: fieldLabel(type, text, "", attr(attrs, "data-title")),
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
  for (const match of html.matchAll(SECTION_RE)) {
    const attrs = match[1] || "";
    const inner = match[2] || "";
    const className = attr(attrs, "class");
    if (!/\bcli-block\b/.test(className)) continue;
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
  }
  return sections;
}
