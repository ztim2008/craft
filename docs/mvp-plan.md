# MVP plan

Обновлено: 2026-08-19. Статусы: ✅ готово · 🔄 в работе · 📋 запланировано

Журнал: [devlog.md](./devlog.md) · Канвас/полигон: [live-editor.md](./live-editor.md) · **После 21.08:** [plan-2026-08-22.md](./plan-2026-08-22.md) · Продукт: [product-plan.md](./product-plan.md) · Админка: [admin-spec.md](./admin-spec.md)

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
- zip: public + source HTML + content.json + page-model + server.mjs + **редактор /admin**

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
- Basic / Pro — суммы в `/admin/settings`, заявка
- Выдача ZIP после ручной отметки «Оплачено» (ЮKassa — позже)

---

## Phase 12 — Regression ✅

- `npm run e2e`: воронка, патч оператора, ZIP-редактор клиента, форма, ZIP после оплаты
- Живой импорт новых URL — по мере заявок

---

## Phase 13 — Замкнуть контур на демо-домене ✅

Полигон `demo.nordic-builder.ru` (не конструктор nordic-builder.ru).

- ua9043 (много страниц, меню) → затем **sx7238** (формы → CRM)
- Node :3041, HTTPS, стили/анимация/попапы, заявка в `/admin` без почты Craftum

ЮKassa — после Phase 15. AI и Agent API — не раньше.

Live-editor на полигоне (вечер 2026-08-19): меню-клон, scope site/page, вкладки шапка/подвал/html/**виджеты .pic**, изоляция канвы как в Тильде, rewrite донора, отладка скрыта. 21.08: попапы Крафтума (`cli-popup` + `show`, ADR-0034) на канвасе и в инспекторе кнопок. Шпаргалка: [live-editor.md](./live-editor.md).

«Добавить страницу» (ADR-0030 слой 3) **отложено**: без модуля статей это пустая кнопка. Конструктор в Craft не вшиваем. Дальше — живые миграции: [plan-2026-08-22.md](./plan-2026-08-22.md).

---

## Phase 15 — Фундамент воронки и поставки 📋

Продуктовое решение: [product-plan.md](./product-plan.md#рекомендованный-контур-фундамент), ADR-0025, ADR-0026.

Сделать в коде (после прохода полигона глазами клиента):

1. Главная: после успеха **сразу открыть** `/preview/{jobId}/`. ✅
2. Демо `homepageOnly`: неснятые страницы → живой Craftum. ✅
3. Сущность **клиент** в `/admin/clients`: имя, домен, тариф; с карточки — ZIP + инструкция. ✅
4. Лид с главной → «В клиенты»; **убрать авто-crawl с «Оплачено»**. ✅ (публичный ZIP с `/demo` снят)
5. В карточке: URL источника + съём сайта (crawl) + выбор существующего job. ✅
6. Валидатор до ZIP: нет `/preview/…` после rewrite, HTML страниц из модели на диске. Красный — архив не отдаём. ✅
7. `INSTRUKTSIYA.txt` в ZIP и с карточки: static без форм / Node + admin / глава под хостинг. ✅
8. Админка в ZIP: список страниц+путей, живой HTML, клик по блоку, меню/заявки. Не WP как главный экран. ✅

Не делать: автосдача всего сайта одной кнопкой, ЮKassa, Agent API на хостинге клиента, бесплатный полный сайт с главной.

---

## Phase 14 — Agent API на хостинге клиента 📋

Только после Phase 13.

- API на сайте клиента (их `server.mjs`), не SaaS у нас
- Слоты: HTML-блоки + content.json + publish
- Ключ у владельца сайта (ваш агент или агент клиента)
- Без безлимитного произвольного кода на прод без явного ок
- Доработки человеком «по запросу» — тот же контур, другой исполнитель

---
