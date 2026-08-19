const SKIP_HOSTS = new Set([
  "craftum.com",
  "www.craftum.com",
  "youtube.com",
  "www.youtube.com",
  "youtu.be",
  "m.youtube.com",
]);

const SKIP_HOST_SUFFIXES = [
  "googlevideo.com",
  "ytimg.com",
  "doubleclick.net",
  "googletagmanager.com",
  "google-analytics.com",
  "facebook.net",
  "facebook.com",
  "mc.yandex.ru",
  "mc.yandex.com",
  "api-maps.yandex.ru",
  "api-maps.yandex.com",
  "elfsight.com",
  "daily-grow.com",
];

const SKIP_PATH_HINTS = [
  "/metrika/",
  "google-analytics",
  "gtag/js",
  "watchtime",
  "playback?ns=yt",
];

const DOWNLOAD_HOST_SUFFIXES = [
  "craftum.com",
  "craftum.net",
  "craftum.io",
  "selcdn.ru",
  "timeweb.com",
  "timeweb.ru",
  "googleapis.com",
  "gstatic.com",
  "cloudflare.com",
];

export function shouldSkipAsset(url: URL): boolean {
  const host = url.hostname.toLowerCase();
  if (SKIP_HOSTS.has(host)) return true;
  if (SKIP_HOST_SUFFIXES.some((suffix) => host === suffix || host.endsWith(`.${suffix}`))) {
    return true;
  }
  const href = url.href.toLowerCase();
  return SKIP_PATH_HINTS.some((hint) => href.includes(hint));
}

const ASSET_PATH_PREFIXES = ["/static/", "/css/", "/js/", "/fonts/", "/uploads/", "/images/"];
const ASSET_EXT_RE =
  /\.(css|js|mjs|cjs|map|png|jpe?g|webp|gif|svg|ico|woff2?|ttf|otf|eot|mp4|webm|mp3|wav|json|xml|txt|pdf)$/i;

/** Same-origin HTML pages must stay links, not hashed .bin downloads. */
export function isSameOriginHtmlPage(url: URL, pageOriginHost: string): boolean {
  if (url.hostname.toLowerCase() !== pageOriginHost.toLowerCase()) return false;
  const pathname = url.pathname || "/";
  if (ASSET_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return false;
  if (ASSET_EXT_RE.test(pathname)) return false;
  return true;
}

export function shouldDownloadAsset(url: URL, pageOriginHost: string): boolean {
  if (shouldSkipAsset(url)) return false;
  if (isSameOriginHtmlPage(url, pageOriginHost)) return false;
  const host = url.hostname.toLowerCase();
  if (host === pageOriginHost.toLowerCase()) return true;
  return DOWNLOAD_HOST_SUFFIXES.some(
    (suffix) => host === suffix || host.endsWith(`.${suffix}`),
  );
}

export function isCssUrl(url: string, contentType?: string | null): boolean {
  if (contentType?.includes("text/css")) return true;
  const path = new URL(url).pathname.toLowerCase();
  return path.endsWith(".css");
}

export function isJsUrl(url: string): boolean {
  return new URL(url).pathname.toLowerCase().endsWith(".js");
}
