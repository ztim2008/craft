/**
 * Craftum Blocks — content script
 * Каталог блоков с craft.nordic-builder.ru, панель при открытии «+».
 */
(function () {
  const EXT_VERSION = "0.5.4";
  const LAUNCHER_SVG = `<svg class="cb-launcher-svg" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <rect width="48" height="48" rx="13" fill="url(#cb-launcher-grad)"/>
    <defs>
      <linearGradient id="cb-launcher-grad" x1="10" y1="6" x2="38" y2="42" gradientUnits="userSpaceOnUse">
        <stop stop-color="#9d8cff"/>
        <stop offset="1" stop-color="#5a4ae6"/>
      </linearGradient>
    </defs>
    <rect x="11" y="13" width="26" height="7" rx="2.5" fill="#fff" fill-opacity="0.95"/>
    <rect x="11" y="22" width="19" height="7" rx="2.5" fill="#fff" fill-opacity="0.78"/>
    <rect x="11" y="31" width="22" height="7" rx="2.5" fill="#fff" fill-opacity="0.62"/>
  </svg>`;
  const EDITOR_PATH = /^\/app\/site\/\d+\/page\/\d+/;
  const CATALOG_URL = "https://craft.nordic-builder.ru/api/craftum-blocks";
  const ADMIN_PUBLISH_KEY_URL = "https://craft.nordic-builder.ru/admin/craftum-blocks";

  let extensionReloadNotified = false;

  function isExtensionAlive() {
    try {
      return !!chrome?.runtime?.id;
    } catch {
      return false;
    }
  }

  function notifyExtensionReload() {
    if (extensionReloadNotified) return;
    extensionReloadNotified = true;
    toast("Расширение Craftum Blocks обновилось — обновите страницу (F5)", "error");
    let banner = document.getElementById("craftum-blocks-reload-banner");
    if (!banner) {
      banner = document.createElement("div");
      banner.id = "craftum-blocks-reload-banner";
      banner.className = "craftum-blocks-reload-banner";
      banner.textContent = "Craftum Blocks обновилось — нажмите F5 на этой странице";
      document.body.appendChild(banner);
    }
  }

  function safeRuntimeUrl(path) {
    if (!isExtensionAlive()) {
      notifyExtensionReload();
      return null;
    }
    try {
      return chrome.runtime.getURL(path);
    } catch {
      notifyExtensionReload();
      return null;
    }
  }

  const FALLBACK_BLOCKS = [
    {
      id: "hero-cover-03",
      name: "Hero Cover-03",
      description: "Другой layout — штатный cover-03",
      mode: "cover",
      templateTitle: "cover-03",
      featured: true,
    },
    {
      id: "hero-nordic-v1",
      name: "Hero Nordic",
      description: "Cover-hero + кастомные тексты",
      mode: "hero",
      heroTexts: {
        title: "Создавайте сайты быстрее",
        subtitle: "Кастомный hero Nordic Builder",
        button: "Узнать больше",
      },
    },
    {
      id: "cover-01",
      name: "Cover 01",
      description: "Штатная обложка cover-01",
      mode: "cover",
      templateTitle: "cover-01",
    },
    {
      id: "design-empty-01",
      name: "Дизайн-блок empty-01",
      description: "Пустой дизайн-блок Craftum",
      mode: "design",
    },
  ];

  const DEFAULT_CATEGORIES = [
    { id: "hero", name: "Обложки", emoji: "🎯" },
    { id: "text", name: "Текст", emoji: "📰" },
    { id: "design-blocks", name: "Дизайн-блоки", emoji: "🧱" },
    { id: "code", name: "Код", emoji: "🧩" },
    { id: "custom", name: "Дизайн", emoji: "🎨" },
  ];

  let BLOCKS = [...FALLBACK_BLOCKS];
  let CATEGORIES = DEFAULT_CATEGORIES;
  let catalogSource = "fallback";
  let catalogUpdatedAt = null;
  let selectedCategory = null;
  let gallerySearch = "";
  let catalogSeenAt = null;

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  const CYRILLIC_TO_LATIN = {
    а: "a",
    б: "b",
    в: "v",
    г: "g",
    д: "d",
    е: "e",
    ё: "e",
    ж: "zh",
    з: "z",
    и: "i",
    й: "y",
    к: "k",
    л: "l",
    м: "m",
    н: "n",
    о: "o",
    п: "p",
    р: "r",
    с: "s",
    т: "t",
    у: "u",
    ф: "f",
    х: "h",
    ц: "ts",
    ч: "ch",
    ш: "sh",
    щ: "sch",
    ъ: "",
    ы: "y",
    ь: "",
    э: "e",
    ю: "yu",
    я: "ya",
  };

  function translitRu(text) {
    return String(text)
      .toLowerCase()
      .split("")
      .map((ch) => CYRILLIC_TO_LATIN[ch] ?? ch)
      .join("");
  }

  function generateCatalogId(name) {
    const slug =
      translitRu(name || "block")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 32) || "block";
    let id = `${slug}-${Date.now().toString(36).slice(-5)}`;
    let n = 0;
    while (BLOCKS.some((b) => b.id === id)) {
      id = `${slug}-${Math.random().toString(36).slice(2, 7)}`;
      n += 1;
      if (n > 20) break;
    }
    return id.slice(0, 50);
  }

  function snapshotPreviewText(blockOrSnapshot) {
    const content = blockOrSnapshot?.content ?? blockOrSnapshot?.craftumBlock?.content;
    if (!content) return "";
    const texts = [];
    function walk(n) {
      if (!n) return;
      const html = n.inner_html;
      if (html && typeof html === "string") {
        const t = html.replace(/<[^>]+>/g, "").trim();
        if (t && t.length < 120 && !t.startsWith("<svg")) texts.push(t);
      }
      (n.children || []).forEach(walk);
    }
    walk(content);
    return texts.slice(0, 2).join(" · ") || blockOrSnapshot?.title || "";
  }

  function blockOptionLabel(b, index) {
    const preview = snapshotPreviewText(b);
    const title = b.title || "block";
    const shortId = b.id?.slice(0, 8) || "?";
    const pos = typeof index === "number" ? `#${index + 1} ` : "";
    const pri = b.priority ? ` [${b.priority}]` : "";
    if (preview) {
      const snippet = preview.length > 48 ? `${preview.slice(0, 48)}…` : preview;
      return `${pos}${title}${pri} · «${snippet}» (${shortId}…)`;
    }
    return `${pos}${title}${pri} (${shortId}…)`;
  }

  function snapshotContentKey(craftumBlock) {
    if (!craftumBlock?.content) return "";
    try {
      const clone = JSON.parse(JSON.stringify(craftumBlock.content));
      function stripIds(n) {
        delete n.id;
        if (n.attrs) {
          delete n.attrs.id;
          delete n.attrs["data-root-id"];
        }
        (n.children || []).forEach(stripIds);
      }
      stripIds(clone);
      return JSON.stringify(clone);
    } catch {
      return "";
    }
  }

  function getCategoryMeta(id) {
    const cid = id || "custom";
    return CATEGORIES.find((c) => c.id === cid) || { id: "custom", name: "Дизайн", emoji: "🎨" };
  }

  function absPreviewUrl(url) {
    if (!url) return "";
    if (url.startsWith("http")) return url;
    return "https://craft.nordic-builder.ru" + url;
  }

  function normalizeBlock(raw) {
    const ins = raw.insert || raw;
    return {
      id: raw.id,
      name: raw.name,
      description: raw.description,
      category: raw.category || "custom",
      featured: !!raw.featured,
      previewUrl: raw.previewUrl,
      publishedAt: raw.publishedAt || null,
      mode: ins.mode,
      templateTitle: ins.templateTitle,
      heroTexts: ins.heroTexts,
      craftumBlock: ins.craftumBlock
        ? JSON.parse(JSON.stringify(ins.craftumBlock))
        : undefined,
    };
  }

  async function fetchCatalogDirect() {
    const res = await fetch(CATALOG_URL, { cache: "no-store" });
    if (!res.ok) throw new Error(`catalog HTTP ${res.status}`);
    const catalog = await res.json();
    if (!Array.isArray(catalog.blocks)) throw new Error("invalid catalog");
    return catalog;
  }

  function applyCatalog(catalog, source) {
    if (!Array.isArray(catalog?.blocks) || !catalog.blocks.length) return false;
    BLOCKS = catalog.blocks.map(normalizeBlock);
    if (Array.isArray(catalog.categories) && catalog.categories.length) {
      CATEGORIES = catalog.categories;
    }
    catalogSource = source;
    catalogUpdatedAt = catalog.updatedAt || null;
    console.info(`[Craftum Blocks] catalog loaded (${source}),`, BLOCKS.length, "blocks");
    updateLauncherBadge();
    refreshGallery();
    updateLauncherBadge();
    return true;
  }

  async function loadBlocksFromServer(force = false) {
    if (!isExtensionAlive()) {
      notifyExtensionReload();
      return;
    }
    if (chrome.runtime?.sendMessage) {
      try {
        const res = await chrome.runtime.sendMessage({ type: "FETCH_CATALOG", force: !!force });
        if (res?.ok && applyCatalog(res.catalog, res.source || "server")) return;
        if (!res?.ok) console.warn("[Craftum Blocks] background catalog:", res?.error);
      } catch (e) {
        if (String(e?.message || e).includes("Extension context invalidated")) {
          notifyExtensionReload();
          return;
        }
        console.warn("[Craftum Blocks] background fetch failed", e);
      }
    }

    try {
      const catalog = await fetchCatalogDirect();
      applyCatalog(catalog, "direct");
      if (chrome.storage?.local) {
        chrome.storage.local.set({
          craftumBlocksCatalog: catalog,
          craftumBlocksCatalogTs: Date.now(),
        });
      }
    } catch (e) {
      console.warn("[Craftum Blocks] direct catalog fetch failed, fallback", e);
      if (catalogSource === "fallback") {
        toast("Каталог с сервера недоступен — показаны встроенные блоки", "error");
      }
    }
  }

  function isEditorPage() {
    return EDITOR_PATH.test(location.pathname);
  }

  function toast(message, type = "ok") {
    const el = document.createElement("div");
    el.className = `craftum-blocks-toast ${type}`;
    el.textContent = message;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 5000);
  }

  function isLibraryOpen() {
    const lib = document.querySelector(".page__select-block, .select-block");
    if (!lib) return false;
    const r = lib.getBoundingClientRect();
    return r.width > 80 && r.height > 80;
  }

  function isPlusTrigger(el) {
    if (!el) return false;
    const btn = el.closest("button");
    if (!btn) return false;
    const t = btn.textContent.trim();
    return t === "+" || t === "＋" || t === "Выбрать блок";
  }

  async function openBlockLibrary() {
    if (isLibraryOpen()) return true;

    const btn = Array.from(document.querySelectorAll("button")).find(
      (b) => b.textContent.trim() === "Выбрать блок",
    );
    if (btn) {
      btn.click();
      await sleep(1500);
      if (isLibraryOpen()) return true;
    }

    const plus = Array.from(document.querySelectorAll("button")).find((b) => {
      const t = b.textContent.trim();
      return t === "+" || t === "＋";
    });
    if (plus) {
      plus.click();
      await sleep(1500);
    }

    return isLibraryOpen();
  }

  function findDesignBlockButton() {
    const lib = document.querySelector(".page__select-block, .select-block");
    const roots = [lib, document.body].filter(Boolean);

    for (const root of roots) {
      const byClass = root.querySelector("button.btn.gradient.db");
      if (byClass && byClass.offsetParent !== null) return byClass;

      const byText = Array.from(root.querySelectorAll("button")).find(
        (b) => b.textContent.replace(/\s+/g, " ").trim() === "Дизайн-блок",
      );
      if (byText && byText.offsetParent !== null) return byText;
    }

    return null;
  }

  async function exitDesignEditorIfOpen() {
    const back = Array.from(document.querySelectorAll("button")).find((b) =>
      b.textContent.includes("Вернуться к редактированию страницы"),
    );
    if (back) {
      back.click();
      await sleep(2000);
    }
  }

  function patchTextNode(el, text) {
    if (!el || !text) return;
    const target =
      el.querySelector('[contenteditable="true"]') ||
      el.querySelector(".cli-button") ||
      el;

    target.dispatchEvent(new MouseEvent("dblclick", { bubbles: true }));
    target.focus?.();

    if (target.isContentEditable) {
      target.textContent = text;
    } else {
      let replaced = false;
      for (const node of target.childNodes) {
        if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) {
          node.textContent = text;
          replaced = true;
          break;
        }
      }
      if (!replaced) target.textContent = text;
    }

    target.dispatchEvent(new InputEvent("input", { bubbles: true }));
    target.dispatchEvent(new Event("change", { bubbles: true }));
    target.blur?.();
  }

  async function patchHeroTexts(texts) {
    await sleep(800);
    const root = document.querySelector("section.cli-block.cli-cover, section.cli-block");
    if (!root) return false;

    patchTextNode(
      root.querySelector('.cli-block-title, [data-type="text"][data-content-order="1"]'),
      texts.title,
    );
    patchTextNode(
      root.querySelector('.cli-block-subtitle, [data-type="text"][data-content-order="2"]'),
      texts.subtitle,
    );
    patchTextNode(
      root.querySelector('.cli-button, [data-type="button"]'),
      texts.button,
    );
    return true;
  }

  function clickElement(el) {
    if (!el) return false;
    el.scrollIntoView({ block: "center", inline: "nearest" });
    if (typeof el.click === "function") {
      el.click();
    } else {
      el.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window }));
    }
    return true;
  }

  async function insertDesignBlock() {
    if (!isLibraryOpen()) {
      const ok = await openBlockLibrary();
      if (!ok) throw new Error("Сначала нажмите «+» на странице");
    }

    await sleep(400);

    let designBtn = findDesignBlockButton();
    if (!designBtn) {
      await sleep(1200);
      designBtn = findDesignBlockButton();
    }
    if (!designBtn) {
      throw new Error("Кнопка «Дизайн-блок» не найдена — откройте каталог через «+»");
    }

    clickElement(designBtn);

    await sleep(2500);
    await exitDesignEditorIfOpen();

    const onCanvas = document.querySelector("section.cli-block, .cli-block");
    if (onCanvas) return { ok: true };
    throw new Error("Блок не появился на канве");
  }

  async function insertHeroBlock(block) {
    await insertDesignBlock();
    await patchHeroTexts(block.heroTexts);
    return { ok: true, hint: "hero-nordic" };
  }

  async function insertCoverBlock(templateTitle) {
    if (!isLibraryOpen()) {
      const ok = await openBlockLibrary();
      if (!ok) throw new Error("Сначала нажмите «+» на странице");
    }

    await sleep(400);

    const card = Array.from(document.querySelectorAll(".select-block-card")).find((c) =>
      c.textContent.includes(templateTitle),
    );
    if (!card) throw new Error(`Шаблон ${templateTitle} не найден`);

    card.click();
    await sleep(3000);

    if (!document.querySelector("section.cli-block, .cli-block")) {
      throw new Error("Cover не появился на канве");
    }
    return { ok: true };
  }

  let pendingInsertOrderFrom = null;

  async function captureInsertOrderFrom() {
    const api = window.CraftumBlocksApi;
    if (!api?.getInsertContext) return;
    try {
      const ctx = await api.getInsertContext();
      if (ctx?.newBlockOrderFrom) {
        pendingInsertOrderFrom = ctx.newBlockOrderFrom;
      }
    } catch {
      /* page bridge not ready */
    }
  }

  async function insertSnapshotBlock(block) {
    const api = window.CraftumBlocksApi;
    if (!api) throw new Error("Craftum API module missing");
    const pageId = api.parseEditorPageId();
    if (!pageId) throw new Error("Откройте редактор страницы Craftum");
    if (!block.craftumBlock) throw new Error("Нет snapshot блока");

    const insertOrderFrom = pendingInsertOrderFrom;
    pendingInsertOrderFrom = null;

    const snap = JSON.parse(JSON.stringify(block.craftumBlock));
    delete snap.priority;
    delete snap.page_id;
    delete snap.id;
    if (Array.isArray(snap.fonts)) {
      snap.fonts = snap.fonts.filter((f) => f && typeof f === "object" && !Array.isArray(f));
    } else {
      snap.fonts = [];
    }

    const result = await api.insertBlockSnapshot(snap, pageId, insertOrderFrom || undefined);
    toast(`Блок вставлен: ${block.name}`, "ok");
    return { ok: true, ...result };
  }

  async function insertBlock(block) {
    if (block.mode === "snapshot") return insertSnapshotBlock(block);
    if (block.mode === "hero") return insertHeroBlock(block);
    if (block.mode === "design") return insertDesignBlock();
    if (block.mode === "cover") return insertCoverBlock(block.templateTitle);
    throw new Error("Неизвестный режим");
  }

  function insertSummary(block) {
    if (block.mode === "snapshot") return `snapshot · ${block.craftumBlock?.title || block.name}`;
    return block.mode;
  }

  let isCatalogAdmin = false;

  async function refreshCatalogAdmin() {
    try {
      const { publishKey } = await chrome.storage.local.get(["publishKey"]);
      const key = String(publishKey || "").trim();
      if (!key) {
        isCatalogAdmin = false;
        removePublishFab();
        return;
      }

      let admin = false;
      if (chrome.runtime?.sendMessage) {
        try {
          const bg = await chrome.runtime.sendMessage({ type: "CHECK_ADMIN", key });
          admin = !!bg?.admin;
        } catch {
          /* fallback to fetch */
        }
      }
      if (!admin) {
        const res = await fetch("https://craft.nordic-builder.ru/api/craftum-blocks/admin-check", {
          headers: { "X-Craftum-Blocks-Key": key },
        });
        const data = res.ok ? await res.json() : { admin: false };
        admin = !!data.admin;
      }

      isCatalogAdmin = admin;
    } catch {
      isCatalogAdmin = false;
    }

    if (isCatalogAdmin && isEditorPage()) ensurePublishFab();
    else removePublishFab();
  }

  async function openPublishModal() {
    const { publishKey: storedKeyRaw } = await chrome.storage.local.get(["publishKey"]);
    const storedKey = String(storedKeyRaw || "").trim();

    if (!isCatalogAdmin) {
      if (!storedKey) {
        toast(
          "Ключ не настроен: скопируйте в админке Craft → popup расширения → «Сохранить ключ»",
          "error",
        );
      } else {
        toast("Публикация доступна только администратору каталога", "error");
      }
      return;
    }
    const api = window.CraftumBlocksApi;
    if (!api) {
      toast("Craftum API module missing", "error");
      return;
    }

    const pageId = api.parseEditorPageId();
    if (!pageId) {
      toast("Откройте редактор страницы Craftum", "error");
      return;
    }

    const stored = { publishKey: storedKey };
    let blocksOnPage = [];
    try {
      blocksOnPage = await api.fetchPageBlocksForPublish(pageId);
    } catch (e) {
      toast(e.message || String(e), "error");
      return;
    }

    const existing = document.getElementById("craftum-blocks-publish-overlay");
    if (existing) return;

    const overlay = document.createElement("div");
    overlay.id = "craftum-blocks-publish-overlay";
    overlay.className = "craftum-blocks-overlay";

    const modal = document.createElement("div");
    modal.className = "craftum-blocks-modal craftum-blocks-modal--wide";
    modal.innerHTML = `
      <div class="cb-modal-header">
        <h2>Опубликовать блок в каталог</h2>
        <button type="button" class="cb-modal-close" title="Закрыть" aria-label="Закрыть">✕</button>
      </div>
      <p class="cb-modal-lead">Снимок с Craftum → craft.nordic-builder.ru. Ключ настраивается один раз в popup расширения.</p>`;
    modal.addEventListener("mousedown", (e) => e.stopPropagation());
    modal.addEventListener("click", (e) => e.stopPropagation());

    const closeModal = () => overlay.remove();
    modal.querySelector(".cb-modal-close")?.addEventListener("click", closeModal);

    const form = document.createElement("div");
    form.className = "craftum-blocks-form";

    function buildBlockOptions(blocks) {
      if (!blocks.length) {
        return `<option value="">— добавьте блок на страницу —</option>`;
      }
      return blocks
        .map((b, i) => `<option value="${b.id}">${escapeHtml(blockOptionLabel(b, i))}</option>`)
        .join("");
    }

    function buildCategoryOptions() {
      return CATEGORIES.map(
        (c) => `<option value="${c.id}">${escapeHtml(c.emoji)} ${escapeHtml(c.name)}</option>`,
      ).join("");
    }

    function buildCatalogBlockOptions() {
      const catalogBlocks = sortBlocksForPanel(BLOCKS.filter((b) => b.craftumBlock));
      if (!catalogBlocks.length) {
        return `<option value="">— каталог пуст —</option>`;
      }
      return catalogBlocks
        .map((b) => `<option value="${escapeHtml(b.id)}">${escapeHtml(b.name)} (${escapeHtml(b.id)})</option>`)
        .join("");
    }

    form.innerHTML = `
      <div id="cb-publish-key-banner" class="cb-publish-key-banner" hidden>
        Ключ не сохранён. Скопируйте в
        <a href="${ADMIN_PUBLISH_KEY_URL}" target="_blank" rel="noopener">админке Craft</a>
        → popup расширения → «Сохранить ключ» → обновите Craftum (F5).
      </div>
      <fieldset class="cb-publish-mode">
        <legend>Режим публикации</legend>
        <label><input type="radio" name="cb-publish-mode" value="new" checked /> Новый блок</label>
        <label><input type="radio" name="cb-publish-mode" value="update" /> Обновить по id</label>
      </fieldset>
      <div id="cb-publish-update-fields" class="cb-publish-update-fields" hidden>
        <label>Блок в каталоге
          <select id="cb-publish-catalog-id">${buildCatalogBlockOptions()}</select>
        </label>
        <p class="cb-form-hint">Snapshot и метаданные перезапишутся. Превью в админке сохранится.</p>
      </div>
      <label>Блок на странице
        <select id="cb-publish-block-id" ${blocksOnPage.length ? "" : "disabled"}>${buildBlockOptions(blocksOnPage)}</select>
      </label>
      <button type="button" class="craftum-blocks-refresh cb-refresh-blocks">↻ Обновить список блоков</button>
      <p class="cb-form-hint cb-form-hint--warn">Сначала <strong>сохраните страницу</strong> Craftum (Ctrl+S), затем «Обновить».</p>
      <div id="cb-publish-preview" class="cb-publish-preview">— выберите секцию —</div>
      <p class="cb-form-hint">#1 сверху. Перед публикацией проверьте текст ниже — он попадёт в каталог.</p>
      <label>Категория<select id="cb-publish-category">${buildCategoryOptions()}</select></label>
      <label>Название<input id="cb-publish-name" placeholder="Мой hero" /></label>
      <label>Описание<input id="cb-publish-desc" placeholder="Кратко для панели" /></label>
      <p id="cb-publish-id-hint" class="cb-form-hint cb-publish-id-hint">ID в каталоге будет создан автоматически</p>
      <label class="cb-check"><input type="checkbox" id="cb-publish-featured" /> Рекомендуем (показывать выше в панели)</label>
    `;

    const blockSelect = () => document.getElementById("cb-publish-block-id");
    const nameInput = () => document.getElementById("cb-publish-name");
    const catalogSelect = () => document.getElementById("cb-publish-catalog-id");

    function getPublishMode() {
      return document.querySelector('input[name="cb-publish-mode"]:checked')?.value || "new";
    }

    function fillFromCatalogBlock(block) {
      if (!block) return;
      const nameEl = nameInput();
      if (nameEl) nameEl.value = block.name || "";
      const descEl = document.getElementById("cb-publish-desc");
      if (descEl) descEl.value = block.description || "";
      const catEl = document.getElementById("cb-publish-category");
      if (catEl) catEl.value = block.category || "custom";
      const featuredEl = document.getElementById("cb-publish-featured");
      if (featuredEl) featuredEl.checked = !!block.featured;
    }

    function syncPublishModeUI() {
      const mode = getPublishMode();
      const updateFields = document.getElementById("cb-publish-update-fields");
      if (updateFields) updateFields.hidden = mode !== "update";
      if (mode === "update") {
        const catalogId = catalogSelect()?.value;
        const block = BLOCKS.find((b) => b.id === catalogId);
        if (block) fillFromCatalogBlock(block);
      }
      updateIdHint();
      if (submit) {
        submit.textContent = mode === "update" ? "Обновить snapshot" : "Опубликовать";
      }
    }

    function updateIdHint() {
      const hint = document.getElementById("cb-publish-id-hint");
      if (!hint) return;
      if (getPublishMode() === "update") {
        const id = catalogSelect()?.value;
        hint.textContent = id
          ? `Обновится блок в каталоге: ${id}`
          : "Выберите блок в каталоге для обновления snapshot";
        return;
      }
      const name = nameInput()?.value?.trim();
      hint.textContent = name
        ? `Новый ID: ${generateCatalogId(name)}`
        : "ID в каталоге будет создан автоматически из названия";
    }

    function renderPublishPreview() {
      const el = document.getElementById("cb-publish-preview");
      if (!el) return;
      const blockId = blockSelect()?.value;
      const b = blocksOnPage.find((x) => x.id === blockId);
      if (!b) {
        el.textContent = "— выберите секцию —";
        return;
      }
      const preview = snapshotPreviewText(b) || "(нет текста на секции — сохраните страницу и обновите список)";
      el.innerHTML = `<strong>UUID секции:</strong> ${escapeHtml(b.id)}<br><strong>Попадёт в каталог:</strong> ${escapeHtml(preview)}`;
    }

    async function refreshBlocksInModal() {
      const btn = form.querySelector(".cb-refresh-blocks");
      if (btn) {
        btn.disabled = true;
        btn.textContent = "Загрузка…";
      }
      try {
        blocksOnPage = await api.fetchPageBlocksForPublish(pageId);
        const sel = blockSelect();
        const prev = sel?.value;
        if (sel) {
          sel.innerHTML = buildBlockOptions(blocksOnPage);
          sel.disabled = blocksOnPage.length === 0;
          if (prev && blocksOnPage.some((b) => b.id === prev)) sel.value = prev;
          else if (blocksOnPage.length) sel.value = blocksOnPage[blocksOnPage.length - 1].id;
        }
        submit.disabled = blocksOnPage.length === 0;
        renderPublishPreview();
      } catch (e) {
        toast(e.message || String(e), "error");
      } finally {
        if (btn) {
          btn.disabled = false;
          btn.textContent = "↻ Обновить список блоков";
        }
      }
    }

    form.querySelector(".cb-refresh-blocks")?.addEventListener("click", () => {
      void refreshBlocksInModal();
    });
    blockSelect()?.addEventListener("change", () => {
      const b = blocksOnPage.find((x) => x.id === blockSelect()?.value);
      if (b?.title) {
        const nameEl = nameInput();
        if (nameEl && !nameEl.value.trim()) nameEl.value = b.title;
        updateIdHint();
      }
      renderPublishPreview();
    });
    nameInput()?.addEventListener("input", () => {
      if (getPublishMode() === "new") updateIdHint();
    });
    form.querySelectorAll('input[name="cb-publish-mode"]').forEach((el) => {
      el.addEventListener("change", syncPublishModeUI);
    });
    catalogSelect()?.addEventListener("change", syncPublishModeUI);

    const actions = document.createElement("div");
    actions.className = "craftum-blocks-actions";
    const cancel = document.createElement("button");
    cancel.className = "secondary";
    cancel.textContent = "Отмена";
    cancel.onclick = closeModal;

    const submit = document.createElement("button");
    submit.className = "primary";
    submit.textContent = "Опубликовать";
    submit.disabled = blocksOnPage.length === 0 || !stored.publishKey;
    submit.onclick = async () => {
      const { publishKey } = await chrome.storage.local.get(["publishKey"]);
      const publishKeyTrimmed = String(publishKey || "").trim();
      if (!publishKeyTrimmed) {
        toast("Настройте ключ в popup расширения (скопируйте из админки Craft)", "error");
        const banner = document.getElementById("cb-publish-key-banner");
        if (banner) banner.hidden = false;
        return;
      }

      const blockId = blockSelect()?.value;
      const name = nameInput()?.value?.trim();
      const description = document.getElementById("cb-publish-desc")?.value?.trim();
      const featured = !!document.getElementById("cb-publish-featured")?.checked;
      const category = document.getElementById("cb-publish-category")?.value || "custom";
      const mode = getPublishMode();
      let id;
      if (mode === "update") {
        id = catalogSelect()?.value?.trim().toLowerCase();
        if (!id) {
          toast("Выберите блок в каталоге для обновления", "error");
          return;
        }
        if (!BLOCKS.some((b) => b.id === id)) {
          toast("Блок не найден в каталоге — обновите список «Мои блоки»", "error");
          return;
        }
      } else {
        id = generateCatalogId(name);
      }
      if (!blockId) {
        toast("Выберите блок на странице", "error");
        return;
      }
      if (!name || !description) {
        toast("Заполните название и описание", "error");
        return;
      }
      submit.disabled = true;
      submit.textContent = "Публикуем…";
      try {
        blocksOnPage = await api.fetchPageBlocksForPublish(pageId);
        const craftumBlock = blocksOnPage.find((b) => b.id === blockId);
        if (!craftumBlock) {
          throw new Error("Блок не найден на канве. Нажмите «Обновить список блоков».");
        }
        const contentKey = snapshotContentKey(craftumBlock);
        const duplicate = BLOCKS.find(
          (b) => b.id !== id && b.craftumBlock && snapshotContentKey(b.craftumBlock) === contentKey,
        );
        if (duplicate) {
          const ok = confirm(
            `Содержимое совпадает с блоком «${duplicate.name}» (${duplicate.id}).\n` +
              "Превью в админке можно менять отдельно — snapshot будет тот же.\n\nОпубликовать всё равно?",
          );
          if (!ok) {
            submit.disabled = false;
            submit.textContent = "Опубликовать";
            return;
          }
        }
        const res = await chrome.runtime.sendMessage({
          type: "PUBLISH_BLOCK",
          key: publishKeyTrimmed,
          body: { id, name, description, featured, category, craftumBlock },
        });
        if (!res?.ok) throw new Error(res?.error || "Ошибка публикации");
        const updated = !!res?.data?.updated;
        toast(
          updated ? `Обновлено: ${name} (${id})` : `Опубликовано: ${name} (${id})`,
          "ok",
        );
        overlay.remove();
        await loadBlocksFromServer(true);
      } catch (e) {
        toast(e.message || String(e), "error");
        submit.disabled = false;
        submit.textContent = getPublishMode() === "update" ? "Обновить snapshot" : "Опубликовать";
      }
    };

    actions.appendChild(cancel);
    actions.appendChild(submit);
    modal.appendChild(form);
    modal.appendChild(actions);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    const keyBanner = document.getElementById("cb-publish-key-banner");
    if (keyBanner && !stored.publishKey) keyBanner.hidden = false;

    if (blocksOnPage.length) {
      const sel = blockSelect();
      if (sel) sel.value = blocksOnPage[blocksOnPage.length - 1].id;
      const defaultBlock = blocksOnPage[blocksOnPage.length - 1];
      const defaultName = defaultBlock?.title || "my-block";
      const nameEl = nameInput();
      if (nameEl) nameEl.value = defaultName;
      updateIdHint();
      syncPublishModeUI();
      renderPublishPreview();
    }
  }

  function ensurePublishFab() {
    if (!isCatalogAdmin || !isEditorPage()) return;

    let fab = document.getElementById("craftum-blocks-publish-fab");
    if (!fab) {
      fab = document.createElement("button");
      fab.id = "craftum-blocks-publish-fab";
      fab.className = "craftum-blocks-publish-fab craftum-blocks-publish-fab--standalone";
      fab.type = "button";
      fab.textContent = "↑ В каталог";
      fab.title = "Опубликовать блок в каталог Nordic Builder";
      fab.addEventListener("click", (e) => {
        e.stopPropagation();
        void openPublishModal();
      });
      document.body.appendChild(fab);
    }
  }

  function removePublishFab() {
    document.getElementById("craftum-blocks-publish-fab")?.remove();
  }

  let dockEl = null;
  let launcherEl = null;
  let galleryEl = null;
  let galleryExpanded = false;
  let lastLibraryOpen = false;
  let syncing = false;
  let syncTimer = null;

  function countNewBlocks() {
    if (!catalogSeenAt) return 0;
    return BLOCKS.filter((b) => b.publishedAt && b.publishedAt > catalogSeenAt).length;
  }

  function updateLauncherBadge() {
    const badge = launcherEl?.querySelector(".cb-launcher-badge");
    if (!badge) return;
    const newCount = countNewBlocks();
    if (newCount > 0) {
      badge.textContent = String(newCount);
      badge.classList.add("is-new");
      badge.title = `${newCount} новых блоков`;
      return;
    }
    badge.classList.remove("is-new");
    badge.title = `${BLOCKS.length} блоков`;
    badge.textContent = BLOCKS.length > 1 ? String(BLOCKS.length) : "";
    badge.style.display = BLOCKS.length > 1 ? "" : "none";
  }

  async function loadCatalogSeenAt() {
    if (!chrome.storage?.local) return;
    try {
      const { catalogSeenAt: seen } = await chrome.storage.local.get(["catalogSeenAt"]);
      catalogSeenAt = typeof seen === "string" ? seen : null;
    } catch {
      catalogSeenAt = null;
    }
  }

  async function markCatalogSeen() {
    catalogSeenAt = new Date().toISOString();
    try {
      await chrome.storage.local.set({ catalogSeenAt });
    } catch {
      /* ignore */
    }
    updateLauncherBadge();
  }

  function showDock() {
    if (!isExtensionAlive()) {
      notifyExtensionReload();
      return;
    }
    try {
      if (!dockEl) buildDock();
      if (!dockEl) return;
      dockEl.classList.add("is-visible");
      updateLauncherBadge();
    } catch (e) {
      console.warn("[Craftum Blocks] showDock", e);
      notifyExtensionReload();
    }
  }

  function hideDock() {
    dockEl?.classList.remove("is-visible");
    collapseGallery();
  }

  function expandGallery() {
    galleryExpanded = true;
    if (!galleryEl) buildGallery();
    galleryEl.classList.add("is-open");
    launcherEl?.classList.add("is-active");
    if (catalogSource === "fallback") void loadBlocksFromServer(true);
    refreshGallery();
    void markCatalogSeen();
  }

  function collapseGallery() {
    galleryExpanded = false;
    galleryEl?.classList.remove("is-open");
    launcherEl?.classList.remove("is-active");
  }

  function toggleGallery() {
    if (galleryExpanded) collapseGallery();
    else expandGallery();
  }

  function buildDock() {
    if (dockEl) return;
    if (!isExtensionAlive()) {
      notifyExtensionReload();
      return;
    }

    dockEl = document.createElement("div");
    dockEl.id = "craftum-blocks-dock";
    dockEl.className = "craftum-blocks-dock";

    launcherEl = document.createElement("button");
    launcherEl.type = "button";
    launcherEl.className = "craftum-blocks-launcher";
    launcherEl.title = "Nordic Builder — мои блоки";
    launcherEl.innerHTML = `${LAUNCHER_SVG}<span class="cb-launcher-badge"></span>`;
    launcherEl.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleGallery();
    });

    dockEl.appendChild(launcherEl);
    document.body.appendChild(dockEl);
    buildGallery();
  }

  function scheduleSync() {
    clearTimeout(syncTimer);
    syncTimer = setTimeout(syncPanelWithLibrary, 200);
  }

  function syncPanelWithLibrary() {
    try {
      if (!isEditorPage()) {
        hideDock();
        lastLibraryOpen = false;
        if (!isCatalogAdmin) removePublishFab();
        return;
      }

      if (!isExtensionAlive()) {
        notifyExtensionReload();
        return;
      }

      if (isCatalogAdmin) ensurePublishFab();

      const libOpen = isLibraryOpen();

      if (!libOpen) {
        if (lastLibraryOpen) {
          galleryExpanded = false;
          collapseGallery();
        }
        lastLibraryOpen = false;
        hideDock();
        return;
      }

      lastLibraryOpen = true;
      showDock();
      void captureInsertOrderFrom();
      if (!galleryExpanded) {
        galleryEl?.classList.remove("is-open");
      }
      if (isCatalogAdmin) ensurePublishFab();
    } catch (e) {
      console.warn("[Craftum Blocks] syncPanelWithLibrary", e);
      if (String(e?.message || e).includes("Extension context invalidated")) {
        notifyExtensionReload();
      }
    }
  }

  function filteredBlocks() {
    const q = gallerySearch.trim().toLowerCase();
    return sortBlocksForPanel(BLOCKS).filter((b) => {
      if (selectedCategory && (b.category || "custom") !== selectedCategory) return false;
      if (!q) return true;
      return (
        b.id.includes(q) ||
        b.name.toLowerCase().includes(q) ||
        b.description.toLowerCase().includes(q)
      );
    });
  }

  function categoryCounts() {
    const map = {};
    for (const b of BLOCKS) {
      const c = b.category || "custom";
      map[c] = (map[c] || 0) + 1;
    }
    return map;
  }

  async function onBlockCardClick(blockId, card) {
    const block = BLOCKS.find((b) => b.id === blockId);
    if (!block) {
      toast("Блок не найден — нажмите «Обновить каталог»", "error");
      return;
    }
    if (syncing) return;
    syncing = true;
    card.classList.add("is-busy");

    if (!pendingInsertOrderFrom) {
      await captureInsertOrderFrom();
    }

    collapseGallery();
    await sleep(300);

    try {
      await insertBlock(block);
      toast(`Готово: ${block.name}. Сохранит Craftum.`, "ok");
      if (chrome.runtime?.sendMessage) {
        chrome.runtime.sendMessage({ type: "RECORD_INSERT", blockId: block.id }).catch(() => {});
      }
    } catch (e) {
      toast(e.message || String(e), "error");
      scheduleSync();
    } finally {
      card.classList.remove("is-busy");
      syncing = false;
    }
  }

  function catalogHintText() {
    const count = `${BLOCKS.length} блок(ов)`;
    if (catalogSource === "server" || catalogSource === "cache" || catalogSource === "direct") {
      const when = catalogUpdatedAt ? ` · ${catalogUpdatedAt.slice(0, 10)}` : "";
      return `${count} с craft.nordic-builder.ru${when}`;
    }
    return `${count} офлайн — обновите расширение`;
  }

  function sortBlocksForPanel(blocks) {
    return [...blocks].sort((a, b) => {
      if (a.featured !== b.featured) return a.featured ? -1 : 1;
      return a.name.localeCompare(b.name, "ru");
    });
  }

  function renderGalleryGrid(listEl) {
    listEl.innerHTML = "";
    const blocks = filteredBlocks();
    if (!blocks.length) {
      listEl.innerHTML = '<p class="cb-gallery-empty">Блоки не найдены</p>';
      return;
    }
    for (const block of blocks) {
      const cat = getCategoryMeta(block.category);
      const thumb = absPreviewUrl(block.previewUrl);
      const preview =
        block.mode === "snapshot" ? snapshotPreviewText({ craftumBlock: block.craftumBlock }) : "";
      const card = document.createElement("button");
      card.type = "button";
      card.className = "craftum-blocks-card" + (block.featured ? " featured" : "");
      card.dataset.blockId = block.id;
      card.innerHTML = `
        <div class="cb-card-thumb">
          ${thumb ? `<img src="${escapeHtml(thumb)}" alt="" loading="lazy" />` : `<span class="cb-card-emoji">${cat.emoji}</span><span class="cb-card-fallback">${escapeHtml(preview || block.name)}</span>`}
          ${block.featured ? '<span class="cb-card-badge">Рекомендуем</span>' : ""}
        </div>
        <div class="cb-card-body">
          <strong>${escapeHtml(block.name)}</strong>
          <span>${escapeHtml(block.description)}</span>
          <em class="cb-tag">${cat.emoji} ${escapeHtml(cat.name)}</em>
        </div>`;
      card.addEventListener("click", () => onBlockCardClick(block.id, card));
      listEl.appendChild(card);
    }
  }

  function renderGalleryCategories(sidebarEl) {
    const counts = categoryCounts();
    const nav = sidebarEl.querySelector(".cb-cat-list");
    if (!nav) return;
    nav.innerHTML = "";
    const allBtn = document.createElement("button");
    allBtn.type = "button";
    allBtn.className = "cb-cat-item" + (selectedCategory === null ? " is-active" : "");
    allBtn.innerHTML = `<span>Все блоки</span><span class="cb-cat-count">${BLOCKS.length}</span>`;
    allBtn.onclick = () => {
      selectedCategory = null;
      renderGalleryCategories(sidebarEl);
      renderGalleryGrid(galleryEl.querySelector(".craftum-blocks-list"));
    };
    nav.appendChild(allBtn);
    for (const cat of CATEGORIES) {
      const n = counts[cat.id] || 0;
      if (!n) continue;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "cb-cat-item" + (selectedCategory === cat.id ? " is-active" : "");
      btn.innerHTML = `<span>${cat.emoji} ${escapeHtml(cat.name)}</span><span class="cb-cat-count">${n}</span>`;
      btn.onclick = () => {
        selectedCategory = cat.id;
        renderGalleryCategories(sidebarEl);
        renderGalleryGrid(galleryEl.querySelector(".craftum-blocks-list"));
      };
      nav.appendChild(btn);
    }
  }

  function refreshGallery() {
    if (!galleryEl) return;
    const hint = galleryEl.querySelector(".craftum-blocks-hint");
    const list = galleryEl.querySelector(".craftum-blocks-list");
    const sidebar = galleryEl.querySelector(".cb-gallery-sidebar");
    if (hint) hint.textContent = catalogHintText();
    if (sidebar) renderGalleryCategories(sidebar);
    if (list) renderGalleryGrid(list);
  }

  function buildGallery() {
    if (galleryEl) {
      refreshGallery();
      return;
    }

    galleryEl = document.createElement("div");
    galleryEl.id = "craftum-blocks-gallery";
    galleryEl.className = "craftum-blocks-gallery";
    galleryEl.innerHTML = `
      <div class="cb-gallery-shell">
        <header class="cb-gallery-header">
          <div>
            <h3>Мои блоки</h3>
            <p class="hint craftum-blocks-hint"></p>
          </div>
          <div class="cb-gallery-header-actions">
            <button type="button" class="craftum-blocks-refresh">↻ Обновить</button>
            <button type="button" class="cb-gallery-close" title="Закрыть">✕</button>
          </div>
        </header>
        <div class="cb-gallery-body">
          <aside class="cb-gallery-sidebar">
            <input type="search" class="cb-gallery-search" placeholder="Поиск блоков…" />
            <div class="cb-cat-list"></div>
          </aside>
          <main class="craftum-blocks-list"></main>
        </div>
      </div>`;

    const hint = galleryEl.querySelector(".craftum-blocks-hint");
    if (hint) hint.textContent = catalogHintText();

    galleryEl.querySelector(".cb-gallery-close")?.addEventListener("click", (e) => {
      e.stopPropagation();
      collapseGallery();
    });
    galleryEl.querySelector(".craftum-blocks-refresh")?.addEventListener("click", () => {
      void loadBlocksFromServer(true);
    });
    galleryEl.querySelector(".cb-gallery-search")?.addEventListener("input", (e) => {
      gallerySearch = e.target.value || "";
      renderGalleryGrid(galleryEl.querySelector(".craftum-blocks-list"));
    });

    renderGalleryCategories(galleryEl.querySelector(".cb-gallery-sidebar"));
    renderGalleryGrid(galleryEl.querySelector(".craftum-blocks-list"));

    document.body.appendChild(galleryEl);
    console.info(`[Craftum Blocks] v${EXT_VERSION} gallery ready on`, location.pathname);
  }

  function unmount() {
    hideDock();
    galleryEl?.remove();
    galleryEl = null;
    dockEl?.remove();
    dockEl = null;
    launcherEl = null;
    removePublishFab();
  }

  function ensurePanel() {
    if (!isEditorPage() || !document.body) return;
    if (isCatalogAdmin) ensurePublishFab();
    scheduleSync();
  }

  let lastRoute = "";
  function onRouteChange() {
    const route = location.pathname + location.search;
    if (route === lastRoute) return;
    lastRoute = route;

    if (isEditorPage()) {
      ensurePanel();
      setTimeout(scheduleSync, 500);
    } else {
      unmount();
    }
  }

  function patchHistory() {
    for (const method of ["pushState", "replaceState"]) {
      const original = history[method];
      history[method] = function (...args) {
        const result = original.apply(this, args);
        onRouteChange();
        return result;
      };
    }
    window.addEventListener("popstate", onRouteChange);
  }

  function watchPlusClicks() {
    document.addEventListener(
      "click",
      (e) => {
        if (!isEditorPage()) return;
        if (!isPlusTrigger(e.target)) return;
        setTimeout(() => void captureInsertOrderFrom(), 80);
        setTimeout(() => void captureInsertOrderFrom(), 400);
        setTimeout(scheduleSync, 300);
        setTimeout(scheduleSync, 900);
      },
      true,
    );
  }

  const domObserver = new MutationObserver(() => {
    if (isEditorPage()) scheduleSync();
  });

  function watchDom() {
    const attach = () => {
      if (!document.body) return;
      domObserver.disconnect();
      domObserver.observe(document.body, { childList: true, subtree: true });
      ensurePanel();
    };
    attach();
    const rootObserver = new MutationObserver(attach);
    rootObserver.observe(document.documentElement, { childList: true, subtree: true });
  }

  async function boot() {
    lastRoute = location.pathname + location.search;
    await loadCatalogSeenAt();
    await refreshCatalogAdmin();
    if (chrome.storage?.onChanged) {
      chrome.storage.onChanged.addListener((changes, area) => {
        if (area === "local" && changes.publishKey) {
          void refreshCatalogAdmin().then(() => scheduleSync());
        }
      });
    }

    chrome.runtime.onMessage.addListener((msg) => {
      if (msg?.type === "CRAFTUM_BLOCKS_REFRESH_ADMIN") {
        void refreshCatalogAdmin().then(() => scheduleSync());
      }
    });

    patchHistory();
    watchPlusClicks();
    watchDom();
    onRouteChange();
    await loadBlocksFromServer(true);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => void boot());
  } else {
    void boot();
  }
})();
