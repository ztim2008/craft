# Devlog · Craft / Kraftum Migration Engine

Хронология разработки. Обновляется при закрытии дня или завершении этапа.

---

## 2026-08-19 · День 1 — закрытие

### Итог дня

Запущен рабочий **движок миграции** на проде `https://craft.nordic-builder.ru`.  
Демо-импорт 1 страницы с Craftum работает, preview отображает сайт **1:1** (стили + фоновые фото).

### Сделано сегодня

| # | Задача | Статус |
|---|--------|--------|
| 1 | Phase 0 — разведка DOM Craftum | ✅ готово |
| 2 | Phase 1 — crawler (Playwright, jobs, UI) | ✅ готово |
| 3 | Phase 2 — asset collector (111 assets на sx7238) | ✅ готово |
| 4 | Preview route `/preview/{jobId}/` | ✅ готово |
| 5 | Fix: `<base href>` для CSS без trailing slash | ✅ готово |
| 6 | Fix: абсолютные пути preview для фонов (`/assets/assets/` → 404) | ✅ готово |
| 7 | Продуктовая модель: demo → оплата → export + admin | 📋 зафиксировано |
| 8 | Спецификация админки (WP-style, 9 экранов) | 📋 зафиксировано |
| 9 | Первый git commit, `.gitignore`, devlog | ✅ готово |

### Тестовый job

- URL: `https://sx7238.craftum.io/`
- Job ID: `41f73bdd-8e06-43e4-9916-8ec85ce468e0`
- Preview: https://craft.nordic-builder.ru/preview/41f73bdd-8e06-43e4-9916-8ec85ce468e0
- Assets: 111 скачано, 0 failed

### Технические решения дня

1. **Preview paths** — inline CSS vars (`--bg-1920`) резолвятся от stylesheet URL → relative `./assets/` давал `/assets/assets/`. Решение: в HTML абсолютные `/preview/{jobId}/assets/{hash}.ext`.
2. **`<base href>`** — inject при отдаче HTML для link/script relative paths.
3. **Формы** — сохраняем Craftum-верстку, перехватываем submit (ADR-0010).
4. **Монетизация** — free demo 1 page, paid export + admin на хостинге клиента.

### Документы обновлены

- [mvp-plan.md](./mvp-plan.md) — roadmap с статусами
- [decisions.md](./decisions.md) — ADR-0009 … ADR-0014
- [product-plan.md](./product-plan.md) — воронка, тарифы, админка
- [admin-spec.md](./admin-spec.md) — экраны WP-style

### Блокеры / открытые вопросы

- GitHub remote не настроен (нет `gh` CLI на сервере) — см. [GitHub setup](#github-setup) ниже
- Тариф Pro — цены и лимиты TBD
- AI-секции — после стабильного Page Model + publish

### Следующий рабочий день (приоритет)

1. **Phase 3** — Page Model v1 (секции, поля, формы из HTML)
2. **Phase 4** — Export bundle (zip для клиента после оплаты)
3. **Phase 5** — Admin MVP (Обзор, Контент, Формы, Опубликовать)
4. **Phase 6** — Form submit API (email)
5. Демо-CTA на главной («получить на свой хостинг — Basic X ₽»)

---

## Roadmap · статусы этапов

| Phase | Название | Статус | Отчёт |
|-------|----------|--------|-------|
| 0 | DOM-разведка Craftum | ✅ готово | [phase0-kraftum-dom.md](./phase0-kraftum-dom.md) |
| 1 | Crawler (1 page) | ✅ готово | devlog 2026-08-19 |
| 2 | Asset collector + preview | ✅ готово | devlog 2026-08-19 |
| 2.1 | Fix preview paths (base + absolute assets) | ✅ готово | devlog 2026-08-19 |
| 3 | Page Model v1 | ✅ готово | — |
| 4 | Export bundle (zip + README deploy) | ✅ готово | admin «Скачать пакет» |
| 5 | Admin MVP (WP-style) | ✅ готово | [admin-spec.md](./admin-spec.md) |
| 6 | DOM Patcher + Publish | ✅ готово | — |
| 7 | Forms (email; TG/Sheets позже) | ✅ готово | — |
| 8 | HTML-блоки + slots | ✅ готово | — |
| 9 | Multi-page import (sitemap) | ✅ готово | — |
| 10 | AI-секции (OpenAI) | 📋 запланировано | — |
| 11 | Demo funnel + оплата + CTA | 📋 запланировано | [product-plan.md](./product-plan.md) |

**Легенда:** ✅ готово · 🔄 в работе · 📋 запланировано · ⏸ отложено

---

## 2026-08-19 · Export bundle

Кнопка «Скачать пакет» в `/admin/jobs/{id}`. Zip: `public/` без `/preview/{id}/`, `data/content.json`, `page-model.json`, `server.mjs` (`POST /api/form`), README Beget/Timeweb/VPS.

Следующее: demo funnel + оплата. Telegram/Sheets — позже.

---

## GitHub setup

Репозиторий: **https://github.com/ztim2008/craft**

Локально: branch `main`, commit `5a69e21`, remote `origin` → `git@github.com:ztim2008/craft.git`

### Push с сервера (нужен доступ ztim2008)

На сервере SSH-ключ привязан к аккаунту `bilarius1-tech` — push в `ztim2008/craft` отклонён. Варианты:

**A) С вашего ПК** (если залогинены в ztim2008):

```bash
git clone git@github.com:ztim2008/craft.git
# или добавить remote к копии с сервера через scp/rsync
git push -u origin main
```

**B) Deploy key на сервере** для `ztim2008/craft`:

1. GitHub → repo → Settings → Deploy keys → Add
2. Публичный ключ с сервера (сгенерировать отдельный для craft)
3. `git push -u origin main`

**C) Personal Access Token (HTTPS)**:

```bash
git remote set-url origin https://github.com/ztim2008/craft.git
git push -u origin main
# username: ztim2008, password: ghp_...
```

**Не коммитить:** `.env*`, `storage/` (уже в `.gitignore`).

---

## Шаблон записи (копировать при закрытии дня)

```markdown
## YYYY-MM-DD · День N

### Итог
...

### Сделано
| # | Задача | Статус |
...

### Блокеры
...

### Следующий день
1. ...
```
