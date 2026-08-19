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
| 3 | Page Model v1 | 📋 запланировано | — |
| 4 | Export bundle (zip + README deploy) | 📋 запланировано | — |
| 5 | Admin MVP (WP-style) | 📋 запланировано | [admin-spec.md](./admin-spec.md) |
| 6 | DOM Patcher + Publish | 📋 запланировано | — |
| 7 | Forms (email + модель Sheets/TG) | 📋 запланировано | — |
| 8 | HTML-блоки + slots | 📋 запланировано | — |
| 9 | Multi-page import (sitemap) | 📋 запланировано | — |
| 10 | AI-секции (OpenAI) | 📋 запланировано | — |
| 11 | Demo funnel + оплата + CTA | 📋 запланировано | [product-plan.md](./product-plan.md) |

**Легенда:** ✅ готово · 🔄 в работе · 📋 запланировано · ⏸ отложено

---

## GitHub setup

Репозиторий инициализирован локально. Remote пока нет.

### На сервере (уже сделано)

```bash
cd /var/www/www-root/data/www/craft.nordic-builder.ru
git add -A && git commit -m "..."
```

### С вашего ПК или после установки gh

```bash
# 1. Создать репозиторий на GitHub (private)
#    https://github.com/new → craft-kraftum-migration (private)

# 2. На сервере
cd /var/www/www-root/data/www/craft.nordic-builder.ru
git remote add origin git@github.com:YOUR_USER/craft-kraftum-migration.git
git branch -M main
git push -u origin main
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
