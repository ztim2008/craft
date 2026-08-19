# MVP plan

Обновлено: 2026-08-19. Статусы: ✅ готово · 🔄 в работе · 📋 запланировано

Журнал: [devlog.md](./devlog.md) · Продукт: [product-plan.md](./product-plan.md) · Админка: [admin-spec.md](./admin-spec.md)

---

## Phase 0 — разведка DOM Крафтума ✅

Отчёт: [phase0-kraftum-dom.md](./phase0-kraftum-dom.md)

URL: ma-maniere-ballet.ru, kc3748.craftum.io, madlenmartynova.ru, sx7238.craftum.io

---

## Phase 1 — Crawler ✅

- POST `/api/import`, Playwright, job JSON, UI `/` и `/jobs/[id]`
- SSRF guard, screenshot, network capture

---

## Phase 2 — Asset Collector + Preview ✅

- Скачивание CSS/JS/images/fonts с Craftum CDN
- Rewrite URL, preview `/preview/{jobId}/`
- Fix: `<base href>`, absolute asset paths для inline CSS vars

Тест: job `41f73bdd-8e06-43e4-9916-8ec85ce468e0`, 111 assets

---

## Phase 3 — Sitemap + internal links + SEO files ✅

- `/sitemap.xml` как источник URL
- rewrite внутренних ссылок в preview
- `sitemap.xml`, `robots.txt`, `canonical`

---

## Phase 3b — Page Model v1 ✅ (read-only)

- Секции `cli-block`, поля text/phone/link/button/image, формы из HTML
- `storage/projects/{id}/page-model.json`
- Админка сервиса: `/login`, `/admin` (WP-style, 1 владелец)

---

## Phase 4 — Export bundle ✅

- Кнопка «Скачать пакет» в админке
- zip: public site + content.json + page-model + server.mjs + README (Beget/Timeweb/VPS)

---

## Phase 5 — Admin MVP (WP-style) ✅

- Login (1 owner), `/admin`, контент, формы, опубликовать
- HTML-блоки — Phase 8

---

## Phase 6 — DOM Patcher + Publish ✅

- Apply `content.json` → patch HTML в preview и Publish
- HTML block slots — Phase 8

---

## Phase 7 — Forms ✅ (email)

- Preview: intercept → `POST /api/preview/{id}/form`
- Email через SMTP, иначе leads.jsonl
- Telegram + Google Sheets — после HTML-блоков / funnel

---

## Phase 8 — HTML blocks ✅

- Custom HTML + style + script before/after `cli-block`
- Сохраняется в `content.json`, патч в preview / publish / export

---

## Phase 9 — Multi-page import ✅

- sitemap.xml + BFS same-origin. Проверено на madlenmartynova.ru (5 страниц).

---

## Phase 10 — AI sections 📋

- OpenAI, HTML + style tag
- API key in server settings

---

## Phase 11 — Demo funnel + payments ✅

- Публичная главная: URL → демо 1 страницы → preview
- Basic 9 900 ₽ / Pro 19 900 ₽, заявка
- Выдача ZIP после ручной отметки «Оплачено» (ЮKassa — позже)

---

## Phase 12 — Regression 📋

- Прогон боевых URL из Phase 0 + sx7238
