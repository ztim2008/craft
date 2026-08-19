export function previewBaseHref(jobId: string): string {
  return `/preview/${jobId}/`;
}

/** Absolute preview URL for a downloaded asset (safe inside CSS var() from external stylesheets). */
export function previewAssetHref(jobId: string, assetLocalPath: string): string {
  const name = assetLocalPath.replace(/^assets\//, "");
  return `/preview/${jobId}/assets/${name}`;
}

export function injectDemoLeadBar(html: string, jobId: string): string {
  if (html.includes("id=\"craft-demo-bar\"")) return html;
  const bar =
    `<div id="craft-demo-bar" style="position:sticky;top:0;z-index:2147483646;display:flex;gap:12px;flex-wrap:wrap;align-items:center;justify-content:space-between;padding:10px 16px;background:#111;color:#fff;font:14px/1.4 system-ui,sans-serif">` +
    `<span>Демо одной страницы. Другие пункты меню открывают живой Craftum.</span>` +
    `<a href="/demo/${jobId}?order=1" style="color:#fff;background:#2271b1;padding:8px 12px;border-radius:8px;text-decoration:none;font-weight:600">Оставить заявку</a>` +
    `</div>`;
  if (/<body[^>]*>/i.test(html)) {
    return html.replace(/<body[^>]*>/i, (match) => `${match}\n${bar}`);
  }
  return bar + html;
}

export function injectPreviewBase(html: string, jobId: string): string {
  const baseHref = previewBaseHref(jobId);
  if (/<base\s/i.test(html)) {
    return html.replace(/<base\s[^>]*>/i, `<base href="${baseHref}">`);
  }
  if (/<head[^>]*>/i.test(html)) {
    return html.replace(/<head[^>]*>/i, (match) => `${match}\n<base href="${baseHref}">`);
  }
  return `<base href="${baseHref}">\n${html}`;
}
