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

## Phase 3 — Page Model v1 📋

- Секции по `cli-block` + `data-type`
- Поля: text, phone, link из `n-{uuid}` nodes
- Формы: dynamic fields from `<form>`
- Output: `content.json` schema

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

## Phase 9 — Multi-page import 📋

- sitemap.xml, same-origin crawl
- Pro tier

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
