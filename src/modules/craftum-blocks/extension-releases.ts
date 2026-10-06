import manifest from "../../../craftum-blocks-extension/manifest.json";
import releasesFile from "../../../data/craftum-blocks/extension-releases.json";

export type ExtensionRelease = {
  version: string;
  date: string;
  summary: string;
  added: string[];
  fixed: string[];
  known?: string[];
};

/** Текущая версия — из manifest расширения (источник правды для сборки). */
export const EXTENSION_CURRENT_VERSION = manifest.version;

export const EXTENSION_SITE_ORIGIN = "https://craft.nordic-builder.ru";

export const EXTENSION_DOWNLOAD = {
  /** Полный установщик: INSTALL.bat / install.sh + extension/ */
  setup: "/downloads/craftum-blocks-setup.zip",
  setupVersioned: `/downloads/craftum-blocks-setup-${EXTENSION_CURRENT_VERSION}.zip`,
  /** Только файлы расширения, без bat — для ручной загрузки в chrome://extensions */
  portable: "/downloads/craftum-blocks-mvp.zip",
  portableVersioned: `/downloads/craftum-blocks-mvp-${EXTENSION_CURRENT_VERSION}.zip`,
  crx: "/downloads/craftum-blocks.crx",
} as const;

export const EXTENSION_RELEASES: ExtensionRelease[] = releasesFile.releases;

export const EXTENSION_RELEASES_UPDATED_AT: string = releasesFile.updatedAt;

export function getLatestRelease(): ExtensionRelease {
  return EXTENSION_RELEASES[0] ?? {
    version: EXTENSION_CURRENT_VERSION,
    date: new Date().toISOString().slice(0, 10),
    summary: "Craftum Blocks",
    added: [],
    fixed: [],
  };
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function releaseBody(release: ExtensionRelease): string {
  const parts: string[] = [`<p>${escapeXml(release.summary)}</p>`];
  if (release.added.length) {
    parts.push("<p><strong>Добавлено</strong></p><ul>");
    for (const item of release.added) parts.push(`<li>${escapeXml(item)}</li>`);
    parts.push("</ul>");
  }
  if (release.fixed.length) {
    parts.push("<p><strong>Исправлено</strong></p><ul>");
    for (const item of release.fixed) parts.push(`<li>${escapeXml(item)}</li>`);
    parts.push("</ul>");
  }
  if (release.known?.length) {
    parts.push("<p><strong>Известно</strong></p><ul>");
    for (const item of release.known) parts.push(`<li>${escapeXml(item)}</li>`);
    parts.push("</ul>");
  }
  parts.push(
    `<p><a href="${EXTENSION_SITE_ORIGIN}${EXTENSION_DOWNLOAD.setup}">Скачать установщик</a></p>`,
  );
  return parts.join("");
}

export function buildExtensionReleasesRss(origin = EXTENSION_SITE_ORIGIN): string {
  const channelLink = `${origin}/craftum-blocks/versions`;
  const items = EXTENSION_RELEASES.map((release) => {
    const link = `${channelLink}#v${release.version}`;
    const pubDate = new Date(`${release.date}T12:00:00Z`).toUTCString();
    return `
    <item>
      <title>Craftum Blocks v${escapeXml(release.version)}</title>
      <link>${link}</link>
      <guid isPermaLink="true">${link}</guid>
      <pubDate>${pubDate}</pubDate>
      <description><![CDATA[${releaseBody(release)}]]></description>
    </item>`;
  }).join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Craftum Blocks — changelog</title>
    <link>${channelLink}</link>
    <description>Версии расширения Craftum Blocks для Chrome: установка, изменения, исправления.</description>
    <language>ru</language>
    <lastBuildDate>${new Date(EXTENSION_RELEASES_UPDATED_AT).toUTCString()}</lastBuildDate>
    <atom:link href="${channelLink}/feed.xml" rel="self" type="application/rss+xml"/>
    ${items}
  </channel>
</rss>`;
}
