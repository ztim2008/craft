import type { ContentOverlay, PageSeo, SiteSettings } from "./types";

const SEO_RE = /<!--craft-seo:(head|body-start|body-end)-->[\s\S]*?<!--\/craft-seo:\1-->/g;

export function pagePathFromRel(rel: string): string {
  const n = rel.replaceAll("\\", "/");
  if (!n || n === "index.html") return "/";
  if (n.endsWith("/index.html")) return `/${n.slice(0, -"index.html".length)}`;
  if (n.endsWith(".html")) return `/${n}`;
  return `/${n}`;
}

export function lookupPageSeo(overlay: ContentOverlay, pagePath: string): PageSeo {
  const pages = overlay.pages || {};
  const raw = pagePath || "/";
  const trimmed = raw === "/" ? "/" : raw.replace(/\/+$/, "") || "/";
  const slashed = trimmed === "/" ? "/" : `${trimmed}/`;
  return pages[raw] || pages[trimmed] || pages[slashed] || {};
}

function escapeHtml(value: string): string {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function wrap(slot: "head" | "body-start" | "body-end", inner: string): string {
  if (!inner.trim()) return "";
  return `<!--craft-seo:${slot}-->${inner}<!--/craft-seo:${slot}-->`;
}

function insertBefore(html: string, needle: RegExp, chunk: string): string {
  if (!chunk) return html;
  if (needle.test(html)) return html.replace(needle, `${chunk}\n$&`);
  return html + chunk;
}

function insertAfterOpen(html: string, openRe: RegExp, chunk: string): string {
  if (!chunk) return html;
  if (openRe.test(html)) return html.replace(openRe, (m) => `${m}\n${chunk}`);
  return chunk + html;
}

function isHttpUrl(value: string): boolean {
  return /^https?:\/\//i.test(value) || value.startsWith("/");
}

function token(value: string, re: RegExp): string {
  const t = String(value || "").trim();
  return re.test(t) ? t : "";
}

function metaAttr(attr: "name" | "property", key: string, content: string): string {
  return `<meta ${attr}="${key}" content="${escapeHtml(content)}">`;
}

function gtagSnippet(id: string): string {
  if (/^GTM-/i.test(id)) {
    return `<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${id}');</script>`;
  }
  return `<script async src="https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}"></script>
<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${id}');</script>`;
}

function metrikaSnippet(id: string): string {
  return `<script>(function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};m[i].l=1*new Date();k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})(window,document,'script','https://mc.yandex.ru/metrika/tag.js','ym');ym(${id},'init',{clickmap:true,accurateTrackBounce:true,webvisor:true});</script>
<noscript><div><img src="https://mc.yandex.ru/watch/${id}" style="position:absolute;left:-9999px" alt=""></div></noscript>`;
}

function stripManaged(html: string, flags: { title?: boolean; description?: boolean; og?: boolean; icon?: boolean; canonical?: boolean; robots?: boolean }): string {
  let next = html;
  if (flags.title) next = next.replace(/<title\b[^>]*>[\s\S]*?<\/title>/i, "");
  if (flags.description) {
    next = next.replace(/<meta\b[^>]*\bname=["']description["'][^>]*>\s*/gi, "");
  }
  if (flags.og) {
    next = next.replace(/<meta\b[^>]*\bproperty=["']og:[^"']+["'][^>]*>\s*/gi, "");
    next = next.replace(/<meta\b[^>]*\bname=["']twitter:[^"']+["'][^>]*>\s*/gi, "");
  }
  if (flags.icon) {
    next = next.replace(/<link\b[^>]*\brel=["'](?:shortcut )?icon["'][^>]*>\s*/gi, "");
    next = next.replace(/<link\b[^>]*\brel=["']apple-touch-icon["'][^>]*>\s*/gi, "");
  }
  if (flags.canonical) next = next.replace(/<link\b[^>]*\brel=["']canonical["'][^>]*>\s*/gi, "");
  if (flags.robots) next = next.replace(/<meta\b[^>]*\bname=["']robots["'][^>]*>\s*/gi, "");
  return next;
}

export function applySeo(html: string, overlay: ContentOverlay, pagePath = "/"): string {
  const site: SiteSettings = overlay.site || {};
  const page = lookupPageSeo(overlay, pagePath);
  let next = html.replace(SEO_RE, "");

  const title = (page.title || site.defaultTitle || "").trim();
  const description = (page.description || site.defaultDescription || "").trim();
  const ogTitle = (page.ogTitle || title).trim();
  const ogDescription = (page.ogDescription || description).trim();
  const ogImage = (page.ogImage || site.ogImage || "").trim();
  const canonical = (page.canonical || "").trim();
  const robots = (page.robots || "").trim();
  const favicon = (site.faviconUrl || "").trim();
  const yaId = token(site.yandexMetrikaId || "", /^\d{5,15}$/);
  const gaId = token(site.googleAnalyticsId || "", /^(G|GTM|UA)-[A-Z0-9-]+$/i);
  const yaV = token(site.yandexVerification || "", /^[A-Za-z0-9_-]+$/);
  const goV = token(site.googleVerification || "", /^[A-Za-z0-9_-]+$/);

  const hasOg = Boolean(ogTitle || ogDescription || ogImage);
  next = stripManaged(next, {
    title: Boolean(title),
    description: Boolean(description),
    og: hasOg,
    icon: Boolean(favicon) && isHttpUrl(favicon),
    canonical: Boolean(canonical) && isHttpUrl(canonical),
    robots: Boolean(robots),
  });

  const headParts: string[] = [];
  if (title) headParts.push(`<title>${escapeHtml(title)}</title>`);
  if (description) headParts.push(metaAttr("name", "description", description));
  if (robots) headParts.push(metaAttr("name", "robots", robots));
  if (canonical && isHttpUrl(canonical)) {
    headParts.push(`<link rel="canonical" href="${escapeHtml(canonical)}">`);
  }
  if (favicon && isHttpUrl(favicon)) {
    headParts.push(`<link rel="icon" href="${escapeHtml(favicon)}">`);
    headParts.push(`<link rel="apple-touch-icon" href="${escapeHtml(favicon)}">`);
  }
  if (hasOg) {
    if (ogTitle) {
      headParts.push(metaAttr("property", "og:title", ogTitle));
      headParts.push(metaAttr("name", "twitter:title", ogTitle));
    }
    if (ogDescription) {
      headParts.push(metaAttr("property", "og:description", ogDescription));
      headParts.push(metaAttr("name", "twitter:description", ogDescription));
    }
    if (ogImage && isHttpUrl(ogImage)) {
      headParts.push(metaAttr("property", "og:image", ogImage));
      headParts.push(metaAttr("name", "twitter:image", ogImage));
      headParts.push(metaAttr("name", "twitter:card", "summary_large_image"));
    } else {
      headParts.push(metaAttr("name", "twitter:card", "summary"));
    }
    headParts.push(metaAttr("property", "og:type", "website"));
    if (canonical && isHttpUrl(canonical)) headParts.push(metaAttr("property", "og:url", canonical));
  }
  if (yaV) headParts.push(metaAttr("name", "yandex-verification", yaV));
  if (goV) headParts.push(metaAttr("name", "google-site-verification", goV));
  if (gaId) headParts.push(gtagSnippet(gaId));
  if (site.jsonLd?.trim()) {
    headParts.push(`<script type="application/ld+json">${site.jsonLd.trim()}</script>`);
  }
  if (site.headHtml?.trim()) headParts.push(site.headHtml.trim());
  if (page.headHtml?.trim()) headParts.push(page.headHtml.trim());

  const bodyStart: string[] = [];
  if (gaId && /^GTM-/i.test(gaId)) {
    bodyStart.push(
      `<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=${gaId}" height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>`,
    );
  }
  if (yaId) bodyStart.push(metrikaSnippet(yaId));
  if (site.bodyStartHtml?.trim()) bodyStart.push(site.bodyStartHtml.trim());

  const bodyEnd: string[] = [];
  if (page.bodyEndHtml?.trim()) bodyEnd.push(page.bodyEndHtml.trim());
  if (site.bodyEndHtml?.trim()) bodyEnd.push(site.bodyEndHtml.trim());

  const headChunk = wrap("head", headParts.join("\n"));
  const startChunk = wrap("body-start", bodyStart.join("\n"));
  const endChunk = wrap("body-end", bodyEnd.join("\n"));

  next = insertBefore(next, /<\/head>/i, headChunk);
  next = insertAfterOpen(next, /<body\b[^>]*>/i, startChunk);
  next = insertBefore(next, /<\/body>/i, endChunk);
  return next;
}
