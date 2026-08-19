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

## Phase 4 — Export bundle 📋

- zip после оплаты: site + data + admin skeleton + api + README
- Deploy guide: Beget / Timeweb / VPS (Node)

---

## Phase 5 — Admin MVP (WP-style) 📋

Экраны: см. [admin-spec.md](./admin-spec.md)

- Login (1 owner)
- Обзор, Контент, Формы, Опубликовать

---

## Phase 6 — DOM Patcher + Publish 📋

- Apply `content.json` → patch HTML
- HTML block slots (after/before section)

---

## Phase 7 — Forms 📋

- Submit → `/api/form-submit`
- Email (MVP)
- Model for Telegram + Google Sheets (later)

---

## Phase 8 — HTML blocks 📋

- Custom HTML + style + script in slots
- Agent blocks / extensions

---

## Phase 9 — Multi-page import ✅

- sitemap.xml + BFS same-origin. Проверено на madlenmartynova.ru (5 страниц).

---

## Phase 10 — AI sections 📋

- OpenAI, HTML + style tag
- API key in server settings

---

## Phase 11 — Demo funnel + payments 📋

- CTA after preview
- Basic / Pro pricing
- Manual or automated payment flow

---

## Phase 12 — Regression 📋

- Прогон боевых URL из Phase 0 + sx7238
