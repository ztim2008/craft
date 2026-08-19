"use strict";

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
    if (patch.href != null && patch.href !== "") {
      next = next.replace(openClose, (_full, open, _tag, _q, inner, close) => {
        return `${setAttr(open, "href", patch.href || "")}${inner}${close}`;
      });
    }
    if (patch.value != null) {
      const img = next.match(selfClose);
      if (img) {
        next = next.replace(selfClose, (_full, tag, attrs, _q, end) => {
          return `<${tag}${setAttr(" " + attrs, "src", patch.value).replace(/^\s/, " ")}${end.startsWith("/") ? "/>" : ">"}`;
        });
      } else {
        next = next.replace(openClose, (_full, open, _tag, _q, inner, close) => {
          const hasChild = /<[a-z][\s\S]*?>/i.test(inner);
          if (hasChild) {
            const replaced = inner.replace(/>([^<]*)</, `>${escapeHtml(patch.value)}<`);
            if (replaced !== inner) return `${open}${replaced}${close}`;
          }
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
    const wrapped = `<!--craft-block:${block.id}-->${block.html}<!--/craft-block:${block.id}-->`;
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
  const double = source.match(new RegExp(name + '\\s*=\\s*"([^"]*)"', "i"));
  if (double && double[1] != null) return double[1];
  const single = source.match(new RegExp(name + "\\s*=\\s*'([^']*)'", "i"));
  return (single && single[1]) || "";
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
  for (const extra of inserts.filter((item) => !item.afterId && String(item.html || "").trim())) {
    chunks.unshift(`<!--craft-section:${extra.id}-->${extra.html}<!--/craft-section:${extra.id}-->`);
  }
  return prefix + chunks.join("") + suffix;
}

function applyContent(html, overlay, pagePath) {
  return applySeo(
    applyHtmlBlocks(
      patchHtml(applySections(html, overlay && overlay.sections), (overlay && overlay.fields) || {}),
      (overlay && overlay.htmlBlocks) || [],
    ),
    overlay || {},
    pagePath || "/",
  );
}

module.exports = { applyContent, patchHtml, applyHtmlBlocks, applySeo, applySections };
