/**
 * Service worker — загрузка каталога блоков с craft.nordic-builder.ru
 */
const CATALOG_URL = "https://craft.nordic-builder.ru/api/craftum-blocks";
const PUBLISH_URL = "https://craft.nordic-builder.ru/api/craftum-blocks/publish";
const ADMIN_CHECK_URL = "https://craft.nordic-builder.ru/api/craftum-blocks/admin-check";
const CACHE_KEY = "craftumBlocksCatalog";
const CACHE_TS_KEY = "craftumBlocksCatalogTs";
const CACHE_TTL_MS = 5 * 60 * 1000;

async function readCache() {
  const data = await chrome.storage.local.get([CACHE_KEY, CACHE_TS_KEY]);
  const ts = data[CACHE_TS_KEY] ?? 0;
  if (!data[CACHE_KEY] || Date.now() - ts > CACHE_TTL_MS) return null;
  return data[CACHE_KEY];
}

async function writeCache(catalog) {
  await chrome.storage.local.set({
    [CACHE_KEY]: catalog,
    [CACHE_TS_KEY]: Date.now(),
  });
}

async function fetchCatalog(force) {
  if (!force) {
    const cached = await readCache();
    if (cached) return { ok: true, catalog: cached, source: "cache" };
  }

  const res = await fetch(CATALOG_URL, { cache: "no-store" });
  if (!res.ok) throw new Error(`catalog HTTP ${res.status}`);
  const catalog = await res.json();
  if (!Array.isArray(catalog.blocks)) throw new Error("invalid catalog");
  await writeCache(catalog);
  return { ok: true, catalog, source: "server" };
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === "FETCH_CATALOG") {
    fetchCatalog(!!msg.force)
      .then((result) => sendResponse(result))
      .catch((e) => sendResponse({ ok: false, error: String(e.message || e) }));
    return true;
  }

  if (msg?.type === "CHECK_ADMIN") {
    fetch(ADMIN_CHECK_URL, {
      headers: { "X-Craftum-Blocks-Key": msg.key || "" },
    })
      .then(async (res) => {
        const data = res.ok ? await res.json().catch(() => ({})) : { admin: false };
        sendResponse({ ok: true, admin: !!data.admin });
      })
      .catch((e) => sendResponse({ ok: false, admin: false, error: String(e.message || e) }));
    return true;
  }

  if (msg?.type === "PUBLISH_BLOCK") {
    fetch(PUBLISH_URL, {
      method: "POST",
      cache: "no-store",
      headers: {
        "content-type": "application/json",
        "X-Craftum-Blocks-Key": msg.key || "",
      },
      body: JSON.stringify(msg.body),
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          sendResponse({ ok: false, error: data.error || `HTTP ${res.status}` });
          return;
        }
        await chrome.storage.local.remove([CACHE_KEY, CACHE_TS_KEY]);
        sendResponse({ ok: true, data });
      })
      .catch((e) => sendResponse({ ok: false, error: String(e.message || e) }));
    return true;
  }

  return undefined;
});
