export function previewBaseHref(jobId: string): string {
  return `/preview/${jobId}/`;
}

/** Absolute preview URL for a downloaded asset (safe inside CSS var() from external stylesheets). */
export function previewAssetHref(jobId: string, assetLocalPath: string): string {
  const name = assetLocalPath.replace(/^assets\//, "");
  return `/preview/${jobId}/assets/${name}`;
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
