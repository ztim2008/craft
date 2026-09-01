/**
 * Мост content script ↔ page context Craftum.
 * Webpack/Pinia доступны только в page-world.js.
 */
window.CraftumBlocksApi = (function () {
  const API = "https://api-v2.craftum.com";
  let bridgeReadyPromise = null;

  function parseEditorPageId() {
    const m = location.pathname.match(/\/app\/site\/\d+\/page\/(\d+)/);
    return m ? Number(m[1]) : null;
  }

  function resetPageBridge() {
    bridgeReadyPromise = null;
  }

  function injectPageBridge() {
    if (!chrome?.runtime?.id) {
      bridgeReadyPromise = Promise.reject(
        new Error("Расширение обновилось — обновите страницу Craftum (F5)."),
      );
      return bridgeReadyPromise;
    }
    if (bridgeReadyPromise) return bridgeReadyPromise;

    bridgeReadyPromise = new Promise((resolve, reject) => {
      let settled = false;
      const finish = (fn) => {
        if (settled) return;
        settled = true;
        fn();
      };

      const timeout = setTimeout(() => {
        finish(() => reject(new Error("Не удалось подключиться к редактору Craftum.")));
      }, 20000);

      const onReady = (ev) => {
        if (ev.source !== window || ev.data?.type !== "CRAFTUM_BLOCKS_PAGE_READY") return;
        clearTimeout(timeout);
        window.removeEventListener("message", onReady);
        finish(() => resolve());
      };
      window.addEventListener("message", onReady);

      const script = document.createElement("script");
      const version = chrome.runtime.getManifest().version;
      script.src = `${chrome.runtime.getURL("content/page-world.js")}?v=${version}`;
      script.onload = () => script.remove();
      script.onerror = () => {
        clearTimeout(timeout);
        window.removeEventListener("message", onReady);
        finish(() => reject(new Error("Не удалось загрузить мост Craftum Blocks.")));
      };
      (document.head || document.documentElement).appendChild(script);
    });

    return bridgeReadyPromise;
  }

  function callPage(method, args, timeoutMs = 90000) {
    return new Promise((resolve, reject) => {
      injectPageBridge()
        .then(() => {
          const id = crypto.randomUUID();
          const timer = setTimeout(() => {
            window.removeEventListener("message", handler);
            reject(new Error("Таймаут вставки блока. Повторите."));
          }, timeoutMs);

          function handler(ev) {
            if (
              ev.source !== window ||
              ev.data?.type !== "CRAFTUM_BLOCKS_PAGE_RESULT" ||
              ev.data.id !== id
            ) {
              return;
            }
            clearTimeout(timer);
            window.removeEventListener("message", handler);
            if (ev.data.error) reject(new Error(ev.data.error));
            else resolve(ev.data.result);
          }

          window.addEventListener("message", handler);
          window.postMessage({ type: "CRAFTUM_BLOCKS_PAGE_CALL", id, method, args }, "*");
        })
        .catch(reject);
    });
  }

  function isRetryableBridgeError(err) {
    const msg = String(err?.message || err);
    return /мост|подключ|timeout|таймаут|did not arrive|webpack|загружается/i.test(msg);
  }

  async function callPageWithRetry(method, args, timeoutMs = 90000) {
    let lastErr = null;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        return await callPage(method, args, timeoutMs);
      } catch (e) {
        lastErr = e;
        if (attempt === 0 && isRetryableBridgeError(e)) {
          resetPageBridge();
          await new Promise((r) => setTimeout(r, 600));
          continue;
        }
        throw e;
      }
    }
    throw lastErr;
  }

  async function craftumFetch(path, options) {
    const res = await fetch(API + path, {
      credentials: "include",
      ...options,
      headers: {
        "content-type": "application/json",
        ...(options?.headers || {}),
      },
    });
    const text = await res.text();
    let json = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = text;
    }
    return { ok: res.ok, status: res.status, json, text };
  }

  async function fetchPageBlocks(pageId) {
    const r = await craftumFetch(`/blocks/blocks/?page_id=${pageId}`);
    if (!r.ok || !Array.isArray(r.json)) {
      if (r.status === 401 || r.status === 403) {
        throw new Error(
          "Сессия Craftum истекла — выйдите и войдите на craftum.com, затем F5 в редакторе.",
        );
      }
      throw new Error("Не удалось загрузить блоки страницы. Сохраните страницу в Craftum.");
    }
    return r.json;
  }

  /** Блоки с канвы (Pinia), без задержки REST после правок. */
  async function fetchPageBlocksLive(pageId) {
    return callPageWithRetry("listPageBlocks", pageId, 30000);
  }

  async function fetchPageBlocksForPublish(pageId) {
    return callPageWithRetry("listPageBlocksForPublish", pageId, 30000);
  }

  async function getInsertContext() {
    return callPageWithRetry("getInsertContext", {}, 8000);
  }

  async function insertBlockSnapshot(craftumBlock, pageId, insertOrderFrom) {
    return callPageWithRetry("insertBlockSnapshot", { craftumBlock, pageId, insertOrderFrom });
  }

  async function waitForEditorReady() {
    return callPageWithRetry("ping", {}, 15000);
  }

  return {
    parseEditorPageId,
    fetchPageBlocks,
    fetchPageBlocksLive,
    fetchPageBlocksForPublish,
    insertBlockSnapshot,
    getInsertContext,
    waitForEditorReady,
    injectPageBridge,
  };
})();

// Подгружаем мост заранее на странице редактора
if (/^\/app\/site\/\d+\/page\/\d+/.test(location.pathname)) {
  window.CraftumBlocksApi.injectPageBridge().catch(() => {});
}
