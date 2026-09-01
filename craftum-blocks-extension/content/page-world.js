/**
 * Выполняется в контексте страницы Craftum (не content script).
 * Доступ к webpackChunkeditor, Pinia, WebSocket create_block.
 */
(function () {
  const PAGE_WORLD_VERSION = "0.5.0";
  if (window.__craftumBlocksPageWorld?.version === PAGE_WORLD_VERSION) return;
  if (window.__craftumBlocksPageWorld?.cleanup) {
    window.__craftumBlocksPageWorld.cleanup();
  }
  window.__craftumBlocksPageWorld = { version: PAGE_WORLD_VERSION };

  const API = "https://api-v2.craftum.com";
  const BLOCKS_API_MODULE_ID = 4163;
  const PRIORITY_BASE = "0123456789abcdefghijklmnopqrstuvwxyz";
  const DEFAULT_FIRST_PRIORITY_KEY = "hzzzzz";

  function parsePriorityKey(priority) {
    const m = /^1\|([^:]+):$/.exec(String(priority || ""));
    return m ? m[1] : null;
  }

  function makePriority(key) {
    return `1|${key}:`;
  }

  function comparePriority(a, b) {
    return String(a || "").localeCompare(String(b || ""));
  }

  function sortBlocksByPriority(blocks) {
    return [...blocks].sort((a, b) => comparePriority(a.priority, b.priority));
  }

  function charIndex(ch) {
    const i = PRIORITY_BASE.indexOf(ch);
    return i >= 0 ? i : 0;
  }

  function keyToBigInt(key) {
    let n = 0n;
    for (const ch of key) {
      n = n * BigInt(PRIORITY_BASE.length) + BigInt(charIndex(ch));
    }
    return n;
  }

  function bigIntToKey(n, length) {
    let s = "";
    let value = n;
    for (let i = 0; i < length; i++) {
      const rem = value % BigInt(PRIORITY_BASE.length);
      s = PRIORITY_BASE[Number(rem)] + s;
      value /= BigInt(PRIORITY_BASE.length);
    }
    return s;
  }

  function midpointBetweenKeys(low, high) {
    const lo = keyToBigInt(low);
    const hi = keyToBigInt(high);
    const mid = (lo + hi) / 2n;
    return bigIntToKey(mid, Math.max(low.length, high.length));
  }

  function incrementPriorityKey(key) {
    return bigIntToKey(keyToBigInt(key) + 1n, key.length);
  }

  function randomPriorityKey(length = 6) {
    let key = "";
    for (let i = 0; i < length; i++) {
      key += PRIORITY_BASE[Math.floor(Math.random() * PRIORITY_BASE.length)];
    }
    return key;
  }

  function getInsertOrderFrom() {
    const pageStore = getPageStore();
    if (!pageStore) return null;
    const raw = pageStore.$state?.newBlockOrderFrom ?? pageStore.newBlockOrderFrom ?? null;
    return raw || null;
  }

  /** Craftum хранит в Pinia priority блока, после которого вставлять. */
  function computeInsertPriority(existingBlocks, orderFrom) {
    const sorted = sortBlocksByPriority(existingBlocks || []);
    const keys = sorted.map((b) => parsePriorityKey(b.priority)).filter(Boolean);

    if (!orderFrom) {
      if (keys.length === 0) return makePriority(DEFAULT_FIRST_PRIORITY_KEY);
      return makePriority(midpointBetweenKeys("000000", keys[0]));
    }

    let anchorIdx = sorted.findIndex((b) => b.priority === orderFrom);
    if (anchorIdx < 0) {
      const orderKey = parsePriorityKey(orderFrom);
      if (orderKey) {
        anchorIdx = sorted.findIndex((b) => parsePriorityKey(b.priority) === orderKey);
      } else {
        anchorIdx = sorted.findIndex((b) => b.id === orderFrom);
      }
    }

    if (anchorIdx >= 0) {
      const anchorKey = parsePriorityKey(sorted[anchorIdx].priority);
      const next = sorted[anchorIdx + 1];
      if (next) {
        const nextKey = parsePriorityKey(next.priority);
        if (anchorKey && nextKey) return makePriority(midpointBetweenKeys(anchorKey, nextKey));
      }
      if (anchorKey) return makePriority(incrementPriorityKey(anchorKey));
    }

    if (keys.length === 0) return makePriority(DEFAULT_FIRST_PRIORITY_KEY);
    return makePriority(incrementPriorityKey(keys[keys.length - 1]));
  }

  function collectPriorities(blocks) {
    return new Set((blocks || []).map((b) => b.priority).filter(Boolean));
  }

  /** Craftum: unique (priority, page_id) — при повторной вставке не дублировать priority. */
  function ensureUniquePriority(existingBlocks, priority) {
    const used = collectPriorities(existingBlocks);
    if (!used.has(priority)) return priority;
    let key = parsePriorityKey(priority) || DEFAULT_FIRST_PRIORITY_KEY;
    for (let i = 0; i < 64; i++) {
      key = incrementPriorityKey(key);
      const next = makePriority(key);
      if (!used.has(next)) return next;
    }
    return makePriority(randomPriorityKey());
  }

  function mergePageBlocks(...lists) {
    const map = new Map();
    for (const list of lists) {
      for (const b of list || []) {
        if (b?.id) map.set(b.id, b);
      }
    }
    return sortBlocksByPriority([...map.values()]);
  }

  function extractErrorMessage(err) {
    if (!err) return "";
    if (typeof err === "string") return err;
    if (err.error) return String(err.error);
    if (err.message) return String(err.message);
    try {
      return JSON.stringify(err);
    } catch {
      return String(err);
    }
  }

  function isDuplicatePriorityError(err) {
    const msg = extractErrorMessage(err);
    return /duplicate key/i.test(msg) && /priority/i.test(msg);
  }

  async function getExistingBlocks(pageId) {
    let apiBlocks = [];
    try {
      apiBlocks = await fetchPageBlocks(pageId);
    } catch {
      apiBlocks = [];
    }
    const storeBlocks = getExistingBlocksSync(pageId) || [];
    return mergePageBlocks(apiBlocks, storeBlocks);
  }

  function sanitizeFonts(fonts) {
    if (!Array.isArray(fonts)) return [];
    return fonts.filter((f) => f && typeof f === "object" && !Array.isArray(f));
  }

  function craftumHttpError(status, context) {
    if (status === 401 || status === 403) {
      return new Error(
        "Сессия Craftum истекла — выйдите и войдите на craftum.com, затем F5 в редакторе.",
      );
    }
    return new Error(context || `Craftum API HTTP ${status}`);
  }

  function randomUuid() {
    if (crypto.randomUUID) return crypto.randomUUID();
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  function remapNode(node, rootId) {
    const newId = randomUuid();
    const attrs = { ...(node.attrs || {}) };
    if (attrs.id && String(attrs.id).startsWith("n-")) attrs.id = "n-" + newId;
    if (attrs["data-root-id"]) attrs["data-root-id"] = rootId;
    return {
      ...node,
      id: newId,
      attrs,
      children: (node.children || []).map((ch) => remapNode(ch, rootId)),
    };
  }

  function cloneBlockForPage(src, pageId, priority) {
    const blockId = randomUuid();
    const content = remapNode(JSON.parse(JSON.stringify(src.content)), blockId);
    content.attrs = {
      ...(content.attrs || {}),
      "data-root-id": blockId,
      id: "n-" + content.id,
    };
    return {
      page_id: pageId,
      id: blockId,
      priority: priority || makePriority(randomPriorityKey()),
      title: src.title,
      slug_id: src.slug_id ?? null,
      slug: src.slug ?? null,
      content,
      fonts: sanitizeFonts(src.fonts),
      bind: src.bind ?? null,
    };
  }

  function getWebpackModule(moduleId) {
    const chunk = window.webpackChunkeditor;
    if (!chunk) {
      throw new Error("Редактор Craftum ещё не загружен. Обновите страницу.");
    }
    let mod = null;
    chunk.push([[`craftum-blocks-${Date.now()}`], {}, (req) => {
      mod = req(moduleId);
    }]);
    if (!mod) {
      throw new Error("Не удалось подключиться к API Craftum.");
    }
    return mod;
  }

  function getBlocksApi() {
    const mod = getWebpackModule(BLOCKS_API_MODULE_ID);
    if (!mod?.c?.createBlock) {
      throw new Error("Craftum Blocks API недоступен.");
    }
    return mod.c;
  }

  function getPageStore() {
    const pinia = document.querySelector("#app")?.__vue_app__?.config?.globalProperties?.$pinia;
    return pinia?._s?.get("page") ?? null;
  }

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async function waitForEditorReady(timeoutMs = 30000) {
    const started = Date.now();
    while (Date.now() - started < timeoutMs) {
      if (window.webpackChunkeditor && document.querySelector("#app")?.__vue_app__) {
        return true;
      }
      await sleep(200);
    }
    throw new Error("Редактор Craftum ещё загружается. Подождите и повторите.");
  }

  function closeCraftumLibrary() {
    const pageStore = getPageStore();
    if (pageStore) {
      pageStore.$patch({ showSelectBlockModal: false });
    }
  }

  function exitBlankLibraryMode() {
    closeCraftumLibrary();
    if (!location.search.includes("blank=true")) return;
    const url = new URL(location.href);
    url.searchParams.delete("blank");
    history.replaceState(history.state, "", url.pathname + url.search);
  }

  function mountBlockOnCanvas(created) {
    const pageStore = getPageStore();
    if (!pageStore || !created) return;
    const nodes = Array.isArray(pageStore.pageNodes) ? [...pageStore.pageNodes] : [];
    if (!nodes.some((n) => n.id === created.id)) {
      nodes.push(created);
    }
    const sorted = sortBlocksByPriority(nodes);
    pageStore.$patch({
      pageNodes: sorted,
      showSelectBlockModal: false,
      activeBlockId: created.id,
    });
    exitBlankLibraryMode();
  }

  function getExistingBlocksSync(pageId) {
    const pageStore = getPageStore();
    const fromStore = (pageStore?.pageNodes || []).map(blockNodeToPlain).filter(Boolean);
    if (fromStore.length > 0) return fromStore;
    return null;
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
      throw craftumHttpError(r.status, "Не удалось загрузить блоки страницы.");
    }
    return r.json;
  }

  function blockNodeToPlain(node) {
    if (!node) return null;
    try {
      if (typeof node.schema === "object" && node.schema !== null) {
        return JSON.parse(JSON.stringify(node.schema));
      }
      const plain = {
        id: node.id,
        priority: node.priority,
        title: node.title,
        slug_id: node.slug_id,
        slug: node.slug,
        content: node.content,
        fonts: node.fonts,
        bind: node.bind,
      };
      if (plain.content && typeof plain.content === "object" && plain.content.schema) {
        plain.content = plain.content.schema;
      }
      return JSON.parse(JSON.stringify(plain));
    } catch {
      return null;
    }
  }

  /** Актуальные блоки с канвы (Pinia), иначе REST после сохранения. */
  async function listPageBlocks(pageId) {
    await waitForEditorReady();
    const pageStore = getPageStore();
    const fromStore = (pageStore?.pageNodes || []).map(blockNodeToPlain).filter(Boolean);
    if (fromStore.length > 0) return fromStore;
    return fetchPageBlocks(pageId);
  }

  /** Для публикации: REST (после Save) + канва, чтобы не снять не ту секцию. */
  async function listPageBlocksForPublish(pageId) {
    await waitForEditorReady();
    let fromApi = [];
    try {
      fromApi = await fetchPageBlocks(pageId);
    } catch {
      fromApi = [];
    }
    const pageStore = getPageStore();
    const fromStore = (pageStore?.pageNodes || []).map(blockNodeToPlain).filter(Boolean);
    return mergePageBlocks(fromApi, fromStore);
  }

  async function createBlockWithRetry(BlocksApi, payload, pageId, orderFrom, attempts = 5) {
    let current = { ...payload };
    let lastErr = null;
    for (let i = 0; i < attempts; i++) {
      try {
        return await BlocksApi.createBlock(current);
      } catch (e) {
        lastErr = e;
        if (isDuplicatePriorityError(e)) {
          const existing = await getExistingBlocks(pageId);
          const nextPriority = ensureUniquePriority(
            existing,
            computeInsertPriority(existing, orderFrom),
          );
          current = { ...current, priority: nextPriority };
          continue;
        }
        if (i < attempts - 1) {
          await sleep(400 * (i + 1));
        }
      }
    }
    const msg = extractErrorMessage(lastErr);
    if (/socket|timeout|did not arrive/i.test(msg)) {
      throw new Error("Craftum не ответил вовремя. Обновите страницу и повторите.");
    }
    if (isDuplicatePriorityError(lastErr)) {
      throw new Error("Конфликт позиции блока на странице. Обновите страницу (F5) и повторите.");
    }
    throw new Error(msg || "Craftum не принял блок. Проверьте сессию.");
  }

  async function insertBlockSnapshot(craftumBlock, pageId, insertOrderFrom) {
    await waitForEditorReady();

    const pageStore = getPageStore();
    const orderFrom = insertOrderFrom || getInsertOrderFrom();
    if (pageStore && orderFrom) {
      pageStore.$patch({ newBlockOrderFrom: orderFrom });
    }

    const existing = await getExistingBlocks(pageId);
    let priority = computeInsertPriority(existing, orderFrom);
    priority = ensureUniquePriority(existing, priority);

    closeCraftumLibrary();

    const payload = cloneBlockForPage(craftumBlock, pageId, priority);
    const before = existing;
    const beforeIds = new Set(before.map((b) => b.id));

    const BlocksApi = getBlocksApi();
    const created = await createBlockWithRetry(BlocksApi, payload, pageId, orderFrom);

    if (!created?.id) {
      throw new Error("Craftum не вернул id созданного блока.");
    }

    const createdNode = { ...created, priority: created.priority || payload.priority };
    mountBlockOnCanvas(createdNode);

    let after = await fetchPageBlocks(pageId);
    if (!after.some((b) => b.id === created.id)) {
      await sleep(800);
      after = await fetchPageBlocks(pageId);
    }
    if (!after.some((b) => b.id === created.id)) {
      throw new Error("Блок не появился на странице. Перезагрузите редактор.");
    }
    if (after.length <= beforeIds.size && !beforeIds.has(created.id)) {
      throw new Error("Блок не сохранился в Craftum.");
    }

    const pageStoreAfter = getPageStore();
    if (pageStoreAfter && (!pageStoreAfter.pageNodes || !pageStoreAfter.pageNodes.some((n) => n.id === created.id))) {
      mountBlockOnCanvas(createdNode);
    }

    exitBlankLibraryMode();
    return {
      id: created.id,
      title: created.title || payload.title,
      priority: createdNode.priority,
      insertAfter: orderFrom || null,
    };
  }

  function getInsertContext() {
    const pageStore = getPageStore();
    return {
      newBlockOrderFrom: getInsertOrderFrom(),
      showSelectBlockModal: !!pageStore?.$state?.showSelectBlockModal,
    };
  }

  async function ping() {
    await waitForEditorReady(5000);
    return {
      webpack: !!window.webpackChunkeditor,
      vue: !!document.querySelector("#app")?.__vue_app__,
    };
  }

  const handlers = {
    ping,
    insertBlockSnapshot,
    fetchPageBlocks,
    listPageBlocks,
    listPageBlocksForPublish,
    getInsertContext,
  };

  function onPageMessage(ev) {
    if (ev.source !== window || ev.data?.type !== "CRAFTUM_BLOCKS_PAGE_CALL") return;
    const { id, method, args } = ev.data;
    void (async () => {
      try {
        const fn = handlers[method];
        if (!fn) throw new Error(`Unknown method: ${method}`);
        let result;
        if (method === "insertBlockSnapshot") {
          result = await fn(args.craftumBlock, args.pageId, args.insertOrderFrom);
        } else if (method === "fetchPageBlocks" || method === "listPageBlocks") {
          result = await fn(args);
        } else if (method === "listPageBlocksForPublish") {
          result = await fn(args);
        } else {
          result = await fn(args);
        }
        window.postMessage({ type: "CRAFTUM_BLOCKS_PAGE_RESULT", id, result }, "*");
      } catch (e) {
        window.postMessage(
          { type: "CRAFTUM_BLOCKS_PAGE_RESULT", id, error: String(e?.message || e) },
          "*",
        );
      }
    })();
  }

  window.addEventListener("message", onPageMessage);
  window.__craftumBlocksPageWorld.cleanup = () => {
    window.removeEventListener("message", onPageMessage);
  };

  window.postMessage({ type: "CRAFTUM_BLOCKS_PAGE_READY" }, "*");
})();
