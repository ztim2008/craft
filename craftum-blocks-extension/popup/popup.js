const EDITOR_RE = /^https:\/\/craftum\.com\/app\/site\/\d+\/page\/\d+/;

const keyInput = document.getElementById("publishKey");
const savedEl = document.getElementById("saved");
const saveBtn = document.getElementById("saveKey");

chrome.storage.local.get(["publishKey"], (data) => {
  if (keyInput && data.publishKey) keyInput.value = data.publishKey;
});

async function savePublishKey() {
  const v = keyInput?.value?.trim() || "";
  await chrome.storage.local.set({ publishKey: v });
  if (savedEl) {
    savedEl.textContent = v
      ? "✓ Ключ сохранён. Обновите Craftum (F5) — появится «↑ В каталог»."
      : "Ключ удалён.";
  }

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id && tab.url && /craftum\.com/.test(tab.url)) {
      chrome.tabs.sendMessage(tab.id, { type: "CRAFTUM_BLOCKS_REFRESH_ADMIN" }).catch(() => {});
    }
  } catch {
    /* вкладка без content script */
  }
}

saveBtn?.addEventListener("click", () => void savePublishKey());
keyInput?.addEventListener("keydown", (e) => {
  if (e.key === "Enter") void savePublishKey();
});

chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  const tab = tabs[0];
  const status = document.getElementById("status");
  if (!tab?.url || !status) return;

  if (EDITOR_RE.test(tab.url)) {
    status.className = "ok";
    status.innerHTML = "Редактор Craftum: «+» → иконка справа → ваши блоки.";
  } else if (/craftum\.com/.test(tab.url)) {
    status.className = "warn";
    status.innerHTML = "Откройте редактор страницы (<code>…/page/…</code>).";
  } else {
    status.className = "warn";
    status.innerHTML = "Сначала craftum.com → редактор страницы.";
  }
});
