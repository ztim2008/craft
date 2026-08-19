"use strict";

const crypto = require("crypto");

const TAGS = "div|p|h1|h2|h3|h4|h5|h6|span|a|button|li|label|nav|header|ul";

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function removeAttr(openTag, name) {
  return openTag.replace(new RegExp(`\\s${name}(\\s*=\\s*(["'])[\\s\\S]*?\\2)?`, "i"), "");
}

function inferLinkKind(href, download) {
  const h = String(href || "").trim();
  if (download) return "file";
  if (/^tel:/i.test(h)) return "tel";
  if (/^mailto:/i.test(h)) return "mailto";
  if (h.includes("#") && h !== "#") return "anchor";
  if (!h || h === "#" || h.startsWith("/") || h.startsWith(".")) return "page";
  return "external";
}

function resolveLinkAction(patch) {
  if (!patch.linkKind && (patch.href == null || patch.href === "")) return { apply: false };
  const kind = patch.linkKind || inferLinkKind(patch.href, Boolean(patch.linkDownload));
  let href = "";
  if (kind === "page") {
    href = patch.linkPage || patch.href || "/";
    if (href === "#") href = "/";
  } else if (kind === "anchor") {
    const page = patch.linkPage && patch.linkPage !== "/" ? String(patch.linkPage).replace(/\/?$/, "/") : "";
    const hash = String(patch.linkSection || "").replace(/^#/, "");
    href = hash ? `${page}#${hash}` : page || "/";
  } else if (kind === "tel") {
    const raw = String(patch.linkUrl || patch.href || "").replace(/^tel:/i, "");
    href = `tel:${raw.replace(/[^\d+]/g, "")}`;
  } else if (kind === "mailto") {
    const raw = String(patch.linkUrl || patch.href || "").replace(/^mailto:/i, "");
    href = `mailto:${raw.trim()}`;
  } else {
    href = patch.linkUrl || patch.href || "";
  }
  const blank = Boolean(patch.linkBlank) && (kind === "external" || kind === "file");
  const rel = [blank ? "noopener noreferrer" : "", patch.linkNofollow ? "nofollow" : ""].filter(Boolean).join(" ").trim();
  return {
    apply: true,
    href,
    target: blank ? "_blank" : undefined,
    rel: rel || undefined,
    download: kind === "file" || Boolean(patch.linkDownload),
  };
}

function applyLinkOpen(open, tag, close, patch) {
  const action = resolveLinkAction(patch);
  if (!action.apply) return { open, close };
  let nextOpen = open;
  let nextClose = close;
  if (action.href && String(tag).toLowerCase() === "button") {
    nextOpen = nextOpen.replace(/^<button\b/i, "<a");
    nextClose = nextClose.replace(/^<\/button>/i, "</a>");
  }
  if (action.href) nextOpen = setAttr(nextOpen, "href", action.href);
  if (action.target) nextOpen = setAttr(nextOpen, "target", action.target);
  else nextOpen = removeAttr(nextOpen, "target");
  if (action.rel) nextOpen = setAttr(nextOpen, "rel", action.rel);
  else nextOpen = removeAttr(nextOpen, "rel");
  if (action.download) nextOpen = setAttr(nextOpen, "download", "");
  else nextOpen = removeAttr(nextOpen, "download");
  return { open: nextOpen, close: nextClose };
}

function setAttr(openTag, name, value) {
  const quoted = `${name}="${escapeHtml(value)}"`;
  const re = new RegExp(`(\\s${name}\\s*=\\s*)(["'])[\\s\\S]*?\\2`, "i");
  if (re.test(openTag)) return openTag.replace(re, `$1"${escapeHtml(value)}"`);
  return openTag.replace(/(\s*\/?>)$/, ` ${quoted}$1`);
}

function patchHtml(html, patches) {
  let next = html;
  for (const [nodeId, patch] of Object.entries(patches || {})) {
    if (!nodeId.startsWith("n-")) continue;
    const id = escapeRegex(nodeId);
    const openClose = new RegExp(
      `(<(${TAGS})\\b[^>]*\\bid=(["'])${id}\\3[^>]*>)([\\s\\S]*?)(</\\2>)`,
      "i",
    );
    const selfClose = new RegExp(`<(img)\\b([^>]*\\bid=(["'])${id}\\3[^>]*)(/?>)`, "i");
    next = next.replace(openClose, (_full, open, tag, _q, inner, close) => {
      const linked = applyLinkOpen(open, tag, close, patch);
      return `${linked.open}${inner}${linked.close}`;
    });
    if (patch.value != null) {
      const img = next.match(selfClose);
      if (img) {
        next = next.replace(selfClose, (_full, tag, attrs, _q, end) => {
          return `<${tag}${setAttr(" " + attrs, "src", patch.value).replace(/^\s/, " ")}${end.startsWith("/") ? "/>" : ">"}`;
        });
      } else {
        next = next.replace(openClose, (_full, open, _tag, _q, inner, close) => {
          if (patch.innerHtml) return `${open}${patch.value}${close}`;
          const hasChild = /<[a-z][\s\S]*?>/i.test(inner);
          if (hasChild) return `${open}${inner}${close}`;
          return `${open}${escapeHtml(patch.value)}${close}`;
        });
      }
    }
  }
  return next;
}

function stripHtmlBlocks(html) {
  return html.replace(/<!--craft-block:[a-zA-Z0-9_-]+-->[\s\S]*?<!--\/craft-block:[a-zA-Z0-9_-]+-->/g, "");
}

function findElementRange(html, nodeId) {
  const id = escapeRegex(nodeId);
  const openRe = new RegExp(`<([a-zA-Z][a-zA-Z0-9]*)\\b[^>]*\\bid=(["'])${id}\\2[^>]*>`, "i");
  const match = openRe.exec(html);
  if (!match) return null;
  const tag = match[1];
  const start = match.index;
  const afterOpen = start + match[0].length;
  if (/\/>$/.test(match[0])) return { start, end: afterOpen };
  let depth = 1;
  let cursor = afterOpen;
  const lower = html.toLowerCase();
  const tagLower = tag.toLowerCase();
  while (cursor < html.length && depth > 0) {
    const from = lower.slice(cursor);
    const openAt = from.search(new RegExp(`<${tagLower}\\b`, "i"));
    const closeAt = from.search(new RegExp(`</${tagLower}\\s*>`, "i"));
    if (closeAt < 0) return null;
    if (openAt >= 0 && openAt < closeAt) {
      const abs = cursor + openAt;
      const opened = html.slice(abs).match(new RegExp(`^<${tag}\\b[^>]*>`, "i"));
      cursor = abs + (opened ? opened[0].length : tag.length + 1);
      depth += 1;
    } else {
      const abs = cursor + closeAt;
      const closed = html.slice(abs).match(new RegExp(`^</${tag}\\s*>`, "i"));
      cursor = abs + (closed ? closed[0].length : tag.length + 3);
      depth -= 1;
      if (depth === 0) return { start, end: cursor };
    }
  }
  return null;
}

function insertSlot(html, position, chunk) {
  if (position === "head") {
    if (/<\/head>/i.test(html)) return html.replace(/<\/head>/i, `${chunk}\n</head>`);
    return chunk + html;
  }
  if (position === "bodyStart") {
    if (/<body\b[^>]*>/i.test(html)) return html.replace(/<body\b[^>]*>/i, (m) => `${m}\n${chunk}`);
    return chunk + html;
  }
  if (position === "bodyEnd") {
    if (/<\/body>/i.test(html)) return html.replace(/<\/body>/i, `${chunk}\n</body>`);
    return html + chunk;
  }
  return html;
}

function applyHtmlBlocks(html, blocks) {
  let next = stripHtmlBlocks(html);
  for (const block of blocks || []) {
    if (!String(block.html || "").trim()) continue;
    const wrapped = block.position === "before" || block.position === "after"
      ? `<!--craft-block:${block.id}--><div data-craft-html-block="${String(block.id).replace(/[^a-zA-Z0-9_-]/g, "")}"${block.hidden ? " hidden data-craft-hidden=\"true\"" : ""}>${block.html}</div><!--/craft-block:${block.id}-->`
      : block.hidden
        ? ""
        : `<!--craft-block:${block.id}-->${block.html}<!--/craft-block:${block.id}-->`;
    if (!wrapped) continue;
    if (block.position === "head" || block.position === "bodyStart" || block.position === "bodyEnd") {
      next = insertSlot(next, block.position, wrapped);
      continue;
    }
    if (!block.sectionId) continue;
    const range = findElementRange(next, block.sectionId);
    if (!range) continue;
    next =
      block.position === "before"
        ? `${next.slice(0, range.start)}${wrapped}${next.slice(range.start)}`
        : `${next.slice(0, range.end)}${wrapped}${next.slice(range.end)}`;
  }
  return next;
}

function esc(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function wrapSeo(slot, inner) {
  if (!String(inner || "").trim()) return "";
  return `<!--craft-seo:${slot}-->${inner}<!--/craft-seo:${slot}-->`;
}

function lookupPageSeo(overlay, pagePath) {
  const pages = (overlay && overlay.pages) || {};
  const raw = pagePath || "/";
  const trimmed = raw === "/" ? "/" : raw.replace(/\/+$/, "") || "/";
  const slashed = trimmed === "/" ? "/" : `${trimmed}/`;
  return pages[raw] || pages[trimmed] || pages[slashed] || {};
}

function token(value, re) {
  const t = String(value || "").trim();
  return re.test(t) ? t : "";
}

function isHttpUrl(value) {
  return /^https?:\/\//i.test(value) || String(value).startsWith("/");
}

function applySeo(html, overlay, pagePath) {
  const site = (overlay && overlay.site) || {};
  const page = lookupPageSeo(overlay || {}, pagePath || "/");
  let next = html.replace(/<!--craft-seo:(head|body-start|body-end)-->[\s\S]*?<!--\/craft-seo:\1-->/g, "");
  const title = String(page.title || site.defaultTitle || "").trim();
  const description = String(page.description || site.defaultDescription || "").trim();
  const ogTitle = String(page.ogTitle || title).trim();
  const ogDescription = String(page.ogDescription || description).trim();
  const ogImage = String(page.ogImage || site.ogImage || "").trim();
  const canonical = String(page.canonical || "").trim();
  const robots = String(page.robots || "").trim();
  const favicon = String(site.faviconUrl || "").trim();
  const yaId = token(site.yandexMetrikaId || "", /^\d{5,15}$/);
  const gaId = token(site.googleAnalyticsId || "", /^(G|GTM|UA)-[A-Z0-9-]+$/i);
  const yaV = token(site.yandexVerification || "", /^[A-Za-z0-9_-]+$/);
  const goV = token(site.googleVerification || "", /^[A-Za-z0-9_-]+$/);
  const hasOg = Boolean(ogTitle || ogDescription || ogImage);
  if (title) next = next.replace(/<title\b[^>]*>[\s\S]*?<\/title>/i, "");
  if (description) next = next.replace(/<meta\b[^>]*\bname=["']description["'][^>]*>\s*/gi, "");
  if (hasOg) {
    next = next.replace(/<meta\b[^>]*\bproperty=["']og:[^"']+["'][^>]*>\s*/gi, "");
    next = next.replace(/<meta\b[^>]*\bname=["']twitter:[^"']+["'][^>]*>\s*/gi, "");
  }
  if (favicon && isHttpUrl(favicon)) {
    next = next.replace(/<link\b[^>]*\brel=["'](?:shortcut )?icon["'][^>]*>\s*/gi, "");
    next = next.replace(/<link\b[^>]*\brel=["']apple-touch-icon["'][^>]*>\s*/gi, "");
  }
  if (canonical && isHttpUrl(canonical)) next = next.replace(/<link\b[^>]*\brel=["']canonical["'][^>]*>\s*/gi, "");
  if (robots) next = next.replace(/<meta\b[^>]*\bname=["']robots["'][^>]*>\s*/gi, "");

  const head = [];
  if (title) head.push(`<title>${esc(title)}</title>`);
  if (description) head.push(`<meta name="description" content="${esc(description)}">`);
  if (robots) head.push(`<meta name="robots" content="${esc(robots)}">`);
  if (canonical && isHttpUrl(canonical)) head.push(`<link rel="canonical" href="${esc(canonical)}">`);
  if (favicon && isHttpUrl(favicon)) {
    head.push(`<link rel="icon" href="${esc(favicon)}">`);
    head.push(`<link rel="apple-touch-icon" href="${esc(favicon)}">`);
  }
  if (hasOg) {
    if (ogTitle) {
      head.push(`<meta property="og:title" content="${esc(ogTitle)}">`);
      head.push(`<meta name="twitter:title" content="${esc(ogTitle)}">`);
    }
    if (ogDescription) {
      head.push(`<meta property="og:description" content="${esc(ogDescription)}">`);
      head.push(`<meta name="twitter:description" content="${esc(ogDescription)}">`);
    }
    if (ogImage && isHttpUrl(ogImage)) {
      head.push(`<meta property="og:image" content="${esc(ogImage)}">`);
      head.push(`<meta name="twitter:image" content="${esc(ogImage)}">`);
      head.push(`<meta name="twitter:card" content="summary_large_image">`);
    } else head.push(`<meta name="twitter:card" content="summary">`);
    head.push(`<meta property="og:type" content="website">`);
    if (canonical && isHttpUrl(canonical)) head.push(`<meta property="og:url" content="${esc(canonical)}">`);
  }
  if (yaV) head.push(`<meta name="yandex-verification" content="${esc(yaV)}">`);
  if (goV) head.push(`<meta name="google-site-verification" content="${esc(goV)}">`);
  if (gaId) {
    if (/^GTM-/i.test(gaId)) {
      head.push(`<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${gaId}');</script>`);
    } else {
      head.push(`<script async src="https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(gaId)}"></script><script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${gaId}');</script>`);
    }
  }
  if (site.jsonLd && String(site.jsonLd).trim()) head.push(`<script type="application/ld+json">${String(site.jsonLd).trim()}</script>`);
  if (site.headHtml && String(site.headHtml).trim()) head.push(String(site.headHtml).trim());
  if (page.headHtml && String(page.headHtml).trim()) head.push(String(page.headHtml).trim());

  const bodyStart = [];
  if (gaId && /^GTM-/i.test(gaId)) {
    bodyStart.push(`<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=${gaId}" height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>`);
  }
  if (yaId) {
    bodyStart.push(`<script>(function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};m[i].l=1*new Date();k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})(window,document,'script','https://mc.yandex.ru/metrika/tag.js','ym');ym(${yaId},'init',{clickmap:true,accurateTrackBounce:true,webvisor:true});</script><noscript><div><img src="https://mc.yandex.ru/watch/${yaId}" style="position:absolute;left:-9999px" alt=""></div></noscript>`);
  }
  if (site.bodyStartHtml && String(site.bodyStartHtml).trim()) bodyStart.push(String(site.bodyStartHtml).trim());

  const bodyEnd = [];
  if (page.bodyEndHtml && String(page.bodyEndHtml).trim()) bodyEnd.push(String(page.bodyEndHtml).trim());
  if (site.bodyEndHtml && String(site.bodyEndHtml).trim()) bodyEnd.push(String(site.bodyEndHtml).trim());

  const headChunk = wrapSeo("head", head.join("\n"));
  const startChunk = wrapSeo("body-start", bodyStart.join("\n"));
  const endChunk = wrapSeo("body-end", bodyEnd.join("\n"));
  if (headChunk) next = /<\/head>/i.test(next) ? next.replace(/<\/head>/i, `${headChunk}\n</head>`) : next + headChunk;
  if (startChunk) next = /<body\b[^>]*>/i.test(next) ? next.replace(/<body\b[^>]*>/i, (m) => `${m}\n${startChunk}`) : startChunk + next;
  if (endChunk) next = /<\/body>/i.test(next) ? next.replace(/<\/body>/i, `${endChunk}\n</body>`) : next + endChunk;
  return next;
}

function attrC(source, name) {
  const safe = String(name).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const quoted = source.match(new RegExp("(?:^|[\\s/])" + safe + '\\s*=\\s*(["\'])([\\s\\S]*?)\\1', "i"));
  return (quoted && quoted[2]) || "";
}

function elementRangeC(html, tag, openStart, openTag) {
  const afterOpen = openStart + openTag.length;
  if (/\/>$/.test(openTag.trim()) || /^<img\b/i.test(openTag) || /^<input\b/i.test(openTag)) {
    return { start: openStart, end: afterOpen };
  }
  let depth = 1;
  let cursor = afterOpen;
  const lower = html.toLowerCase();
  const tagLower = tag.toLowerCase();
  while (cursor < html.length && depth > 0) {
    const from = lower.slice(cursor);
    const openAt = from.search(new RegExp(`<${tagLower}\\b`, "i"));
    const closeAt = from.search(new RegExp(`</${tagLower}\\s*>`, "i"));
    if (closeAt < 0) return null;
    if (openAt >= 0 && openAt < closeAt) {
      const abs = cursor + openAt;
      const opened = html.slice(abs).match(new RegExp(`^<${tag}\\b[^>]*>`, "i"));
      cursor = abs + (opened ? opened[0].length : tag.length + 1);
      depth += 1;
    } else {
      const abs = cursor + closeAt;
      const closed = html.slice(abs).match(new RegExp(`^</${tag}\\s*>`, "i"));
      cursor = abs + (closed ? closed[0].length : tag.length + 3);
      depth -= 1;
      if (depth === 0) return { start: openStart, end: cursor };
    }
  }
  return null;
}

function applySections(html, layout) {
  let next = html.replace(/<!--craft-section:[a-zA-Z0-9_-]+-->[\s\S]*?<!--\/craft-section:[a-zA-Z0-9_-]+-->/g, "");
  const found = [];
  const re = /<section\b([^>]*)>/gi;
  let match;
  while ((match = re.exec(next))) {
    const attrs = match[1] || "";
    if (!/\bcli-block\b/.test(attrC(attrs, "class"))) continue;
    const id = attrC(attrs, "id");
    if (!id) continue;
    const range = elementRangeC(next, "section", match.index, match[0]);
    if (!range) continue;
    found.push({ id, start: range.start, end: range.end });
    re.lastIndex = range.end;
  }
  if (!found.length) return next;
  const removed = new Set((layout && layout.removed) || []);
  const hidden = new Set((layout && layout.hidden) || []);
  const pieces = found.map((item, index) => {
    let block = next.slice(item.start, item.end).replace(/\sdata-craft-hidden="true"/i, "").replace(/\shidden(?=[\s>])/i, "");
    if (hidden.has(item.id)) block = block.replace(/<section\b/i, '<section hidden data-craft-hidden="true"');
    return {
      id: item.id,
      html: block,
      gapAfter: next.slice(item.end, found[index + 1] ? found[index + 1].start : item.end),
    };
  });
  const prefix = next.slice(0, found[0].start);
  const suffix = next.slice(found[found.length - 1].end);
  const byId = new Map(pieces.map((piece) => [piece.id, piece]));
  const order = ((layout && layout.order) || []).filter((id) => byId.has(id) && !removed.has(id));
  for (const piece of pieces) {
    if (!removed.has(piece.id) && !order.includes(piece.id)) order.push(piece.id);
  }
  const inserts = (layout && layout.inserts) || [];
  const chunks = [];
  for (const id of order) {
    const piece = byId.get(id);
    if (!piece) continue;
    chunks.push(piece.html + piece.gapAfter);
    for (const extra of inserts.filter((item) => item.afterId === id && String(item.html || "").trim())) {
      chunks.push(`<!--craft-section:${extra.id}-->${extra.html}<!--/craft-section:${extra.id}-->`);
    }
  }
  const leading = inserts.filter((item) => !item.afterId && String(item.html || "").trim());
  if (leading.length) {
    chunks.unshift(...leading.map((extra) => `<!--craft-section:${extra.id}-->${extra.html}<!--/craft-section:${extra.id}-->`));
  }
  return prefix + chunks.join("") + suffix;
}

const MENU_RE = /<!--craft-menu:[^>]+-->[\s\S]*?<!--\/craft-menu:[^>]+-->/g;
const MENU_OPEN_RE = /<([a-zA-Z][a-zA-Z0-9]*)\b([^>]*\bdata-type=(["'])menu-item\3[^>]*)>/gi;
const MENU_CLUSTER_GAP = 2000;

function hashedNidC(key) {
  const h = crypto.createHash("sha1").update(key).digest("hex");
  return `n-${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`;
}

function findByIdC(html, nodeId) {
  const id = escapeRegex(nodeId);
  const openRe = new RegExp(`<([a-zA-Z][a-zA-Z0-9]*)\\b[^>]*\\bid=(["'])${id}\\2[^>]*>`, "i");
  const match = openRe.exec(html);
  if (!match) return null;
  return elementRangeC(html, match[1], match.index, match[0]);
}

function collectMenuItemsC(html) {
  const out = [];
  const re = new RegExp(MENU_OPEN_RE.source, "gi");
  let match;
  while ((match = re.exec(html))) {
    const tag = match[1];
    const range = elementRangeC(html, tag, match.index, match[0]);
    if (!range) continue;
    const id = attrC(match[2] || "", "id");
    if (!id) continue;
    out.push({ id, tag, start: range.start, end: range.end, html: html.slice(range.start, range.end) });
    re.lastIndex = range.end;
  }
  return out;
}

function clusterMenuC(items) {
  const groups = [];
  let current = [];
  for (const item of items) {
    const prev = current[current.length - 1];
    if (prev && item.start - prev.end > MENU_CLUSTER_GAP) {
      groups.push(current);
      current = [];
    }
    current.push(item);
  }
  if (current.length) groups.push(current);
  return groups;
}

function rewriteMenuIdsC(html, insert, groupIndex) {
  const ids = [...html.matchAll(/\bid=(["'])(n-[^"']+)\1/gi)].map((m) => m[2]);
  const unique = [...new Set(ids)];
  const textTag = html.match(/<[^>]*\bdata-type=(["'])text\1[^>]*>/i);
  const textOrig = textTag && textTag[0].match(/\bid=(["'])(n-[^"']+)\1/i) ? textTag[0].match(/\bid=(["'])(n-[^"']+)\1/i)[2] : "";
  const itemOrig = unique[0] || "";
  const extras = insert.extraNodeIds || [];
  let extraI = 0;
  const map = new Map();
  const itemId = (insert.itemNodeIds && insert.itemNodeIds[groupIndex]) || hashedNidC(`${insert.id}:item:${groupIndex}`);
  const textId = (insert.textNodeIds && insert.textNodeIds[groupIndex]) || hashedNidC(`${insert.id}:text:${groupIndex}`);
  if (itemOrig) map.set(itemOrig, itemId);
  if (textOrig) map.set(textOrig, textId);
  for (const id of unique) {
    if (map.has(id)) continue;
    map.set(id, extras[extraI++] || hashedNidC(`${insert.id}:extra:${groupIndex}:${id}`));
  }
  return html.replace(/\bid=(["'])(n-[^"']+)\1/gi, (_full, q, id) => `id=${q}${map.get(id) || id}${q}`);
}

function applyMenuHrefC(html, insert) {
  const action = resolveLinkAction({
    value: insert.label,
    href: insert.href || "/",
    linkKind: insert.linkKind || "page",
    linkPage: insert.linkPage,
    linkSection: insert.linkSection,
    linkUrl: insert.linkUrl,
    linkBlank: insert.linkBlank,
    linkNofollow: insert.linkNofollow,
    linkDownload: insert.linkDownload,
  });
  if (!action.apply || !action.href) return html;
  const open = html.match(/^<([a-zA-Z][a-zA-Z0-9]*)\b[^>]*>/);
  if (!open) return html;
  let tag = open[1];
  let openTag = open[0];
  let close = html.slice(open[0].length);
  if (String(tag).toLowerCase() === "button") {
    openTag = openTag.replace(/^<button\b/i, "<a");
    close = close.replace(/<\/button>\s*$/i, "</a>");
  }
  if (action.href) openTag = setAttr(openTag, "href", action.href);
  if (action.target) openTag = setAttr(openTag, "target", action.target);
  else openTag = removeAttr(openTag, "target");
  if (action.rel) openTag = setAttr(openTag, "rel", action.rel);
  else openTag = removeAttr(openTag, "rel");
  if (action.download) openTag = setAttr(openTag, "download", "");
  else openTag = removeAttr(openTag, "download");
  return openTag + close;
}

function applyMenuLabelC(html, label) {
  return html.replace(
    /(<([a-zA-Z][a-zA-Z0-9]*)\b[^>]*\bdata-type=(["'])text\3[^>]*>)([\s\S]*?)(<\/\2>)/i,
    (full, open, _tag, _q, inner, close) => {
      if (/<[a-z][\s\S]*?>/i.test(inner)) return full;
      return `${open}${escapeHtml(label)}${close}`;
    },
  );
}

function copyRootIdC(html, fromHtml) {
  const root = fromHtml.match(/\bdata-root-id=(["'])([^"']+)\1/i);
  if (!root) return html;
  const open = html.match(/^<[a-zA-Z][a-zA-Z0-9]*\b[^>]*>/);
  if (!open) return html;
  return setAttr(open[0], "data-root-id", root[2]) + html.slice(open[0].length);
}

function menuAnchorIndexC(groups, afterNodeId, html) {
  if (!afterNodeId) return null;
  const needle = findByIdC(html, afterNodeId);
  for (const group of groups) {
    const direct = group.findIndex((item) => item.id === afterNodeId);
    if (direct >= 0) return direct;
    if (needle) {
      const inside = group.findIndex((item) => item.start <= needle.start && item.end >= needle.end);
      if (inside >= 0) return inside;
    }
  }
  return null;
}

function applyMenuInserts(html, inserts) {
  const list = (inserts || []).filter((item) => item && item.id);
  let next = html.replace(MENU_RE, "");
  if (!list.length) return next;
  const items = collectMenuItemsC(next);
  if (!items.length) return next;
  const groups = clusterMenuC(items);
  const template = (groups.flat().find((item) => String(item.tag).toLowerCase() === "a") || items.find((item) => String(item.tag).toLowerCase() === "a") || {}).html;
  if (!template) return next;
  const byEnd = new Map();
  groups.forEach((group, groupIndex) => {
    for (const insert of list) {
      const hint = menuAnchorIndexC(groups, insert.afterNodeId, next);
      const at = hint != null ? Math.min(Math.max(hint, 0), group.length - 1) : group.length - 1;
      const host = group[at];
      if (!host) continue;
      let cloned = rewriteMenuIdsC(template, insert, groupIndex);
      cloned = copyRootIdC(cloned, host.html);
      cloned = applyMenuLabelC(cloned, String(insert.label || "Новая ссылка").trim() || "Новая ссылка");
      cloned = applyMenuHrefC(cloned, insert);
      const safe = String(insert.id).replace(/[^a-zA-Z0-9_-]/g, "");
      const wrapped = `<!--craft-menu:${safe}:${groupIndex}-->${cloned}<!--/craft-menu:${safe}:${groupIndex}-->`;
      const bag = byEnd.get(host.end) || [];
      bag.push(wrapped);
      byEnd.set(host.end, bag);
    }
  });
  const slots = [...byEnd.entries()].sort((a, b) => b[0] - a[0]);
  for (const [end, chunks] of slots) {
    next = `${next.slice(0, end)}${chunks.join("")}${next.slice(end)}`;
  }
  return next;
}

function expandSimilarFieldsC(fields, groups) {
  const source = fields || {};
  if (!groups || !groups.length) return source;
  const out = Object.assign({}, source);
  groups.forEach(function (group) {
    (group.slots || []).forEach(function (slot) {
      const fromId = (slot || []).find(function (id) { return source[id]; });
      if (!fromId) return;
      const patch = source[fromId];
      (slot || []).forEach(function (id) {
        if (!out[id]) out[id] = patch;
      });
    });
  });
  return out;
}

function applyContent(html, overlay, pagePath) {
  const fields = expandSimilarFieldsC((overlay && overlay.fields) || {}, overlay && overlay.similar);
  return applySeo(
    applyHtmlBlocks(
      patchHtml(
        applyMenuInserts(applySections(html, overlay && overlay.sections), overlay && overlay.menuInserts),
        fields,
      ),
      (overlay && overlay.htmlBlocks) || [],
    ),
    overlay || {},
    pagePath || "/",
  );
}

module.exports = { applyContent, patchHtml, applyHtmlBlocks, applySeo, applySections, applyMenuInserts };
