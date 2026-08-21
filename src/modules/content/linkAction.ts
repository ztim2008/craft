import type { FieldPatch, LinkKind } from "./types";

export type ResolvedLink = {
  apply: boolean;
  href?: string;
  target?: string;
  rel?: string;
  download?: boolean;
};

const NODE_HASH_RE = /#(n-[0-9a-f-]{36})\b/i;

export function popupIdFromHref(href = ""): string | null {
  const match = String(href).trim().match(NODE_HASH_RE);
  return match ? match[1].toLowerCase() : null;
}

export function inferLinkKind(
  href = "",
  download = false,
  popupIds?: Iterable<string> | null,
): LinkKind {
  const h = href.trim();
  if (download) return "file";
  if (/^tel:/i.test(h)) return "tel";
  if (/^mailto:/i.test(h)) return "mailto";
  const popupId = popupIdFromHref(h);
  if (popupId && popupIds) {
    const set = new Set(Array.from(popupIds, (id) => String(id).toLowerCase()));
    if (set.has(popupId)) return "popup";
  }
  if (h.includes("#") && h !== "#") return "anchor";
  if (!h || h === "#" || h.startsWith("/") || h.startsWith(".")) return "page";
  return "external";
}

export function resolveLinkAction(patch: FieldPatch): ResolvedLink {
  if (!patch.linkKind && (patch.href == null || patch.href === "")) {
    return { apply: false };
  }
  const kind = patch.linkKind || inferLinkKind(patch.href || "", Boolean(patch.linkDownload));
  let href = "";
  if (kind === "page") {
    href = patch.linkPage || patch.href || "/";
    if (href === "#") href = "/";
  } else if (kind === "popup") {
    const hash = (patch.linkSection || popupIdFromHref(patch.href || "") || "").replace(/^#/, "");
    href = hash ? `#${hash}` : "#";
  } else if (kind === "anchor") {
    const page = patch.linkPage && patch.linkPage !== "/" ? patch.linkPage.replace(/\/?$/, "/") : "";
    const hash = (patch.linkSection || "").replace(/^#/, "");
    href = hash ? `${page}#${hash}` : page || "/";
  } else if (kind === "tel") {
    const raw = (patch.linkUrl || patch.href || "").replace(/^tel:/i, "");
    href = `tel:${raw.replace(/[^\d+]/g, "")}`;
  } else if (kind === "mailto") {
    const raw = (patch.linkUrl || patch.href || "").replace(/^mailto:/i, "");
    href = `mailto:${raw.trim()}`;
  } else {
    href = patch.linkUrl || patch.href || "";
  }
  const blank = Boolean(patch.linkBlank) && (kind === "external" || kind === "file");
  const rel = [blank ? "noopener noreferrer" : "", patch.linkNofollow ? "nofollow" : ""]
    .filter(Boolean)
    .join(" ")
    .trim();
  return {
    apply: true,
    href,
    target: blank ? "_blank" : undefined,
    rel: rel || undefined,
    download: kind === "file" || Boolean(patch.linkDownload),
  };
}
