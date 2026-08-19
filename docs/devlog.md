# Devlog · Craft / Kraftum Migration Engine

Хронология разработки. Обновляется при закрытии дня или завершении этапа.

---

## 2026-08-19 · закрытие дня (вечер)

### Итог

Рабочий live-editor на полигоне `demo.nordic-builder.ru`: Patch Model поверх Craftum HTML, изоляция канвы как в Тильде, меню-клон, сквозные шапка/подвал/HTML, виджет `.pic` по fingerprint. Прод Craft не путать с конструктором nordic-builder.ru.

### Сделано за вечер (поверх утреннего движка)

| # | Задача | Статус |
|---|--------|--------|
| 1 | Полигон practic-hub (~40 стр.), PM2 `craft-demo-polygon` | ✅ |
| 2 | Меню: клон DOM, `menuInserts[]` | ✅ |
| 3 | scope site/page, вкладки Шапка / Подвал / HTML-код | ✅ |
| 4 | Изоляция канвы (ADR-0032), debug скрыт | ✅ |
| 5 | Rewrite донора practic-hub.ru | ✅ |
| 6 | Виджет `.pic`: attr(class) vs custom-class, similar groups, вкладка «Виджеты» | ✅ |
| 7 | Документы: live-editor, ADR-0031/0032 | ✅ |
| 8 | GitHub deploy key craft-vps, push `ea91678` | ✅ |

### План на 2026-08-20 · утверждён

См. [plan-2026-08-20.md](./plan-2026-08-20.md): **приёмка полигона**, затем **добавить страницу**. GitHub с VPS уже работает. Промпт: [prompt-2026-08-20.md](./prompt-2026-08-20.md).

### GitHub (19.08 ночь)

Deploy key `craft-vps` (write). `origin` = `git@github.com-craft:ztim2008/craft.git`. `ea91678` на `origin/main`.

### Не коммитить

`.env`, `storage/`, `www.zip` (558 МБ дамп). Приватный SSH-ключ и `~/.ssh/config` не в репозитории.

---

## 2026-08-19 · Полигон practic-hub + live-editor

### Итог

На `demo.nordic-builder.ru` лежит снятый **practic-hub.ru** (~40 страниц). Редактор `/admin` правит Patch Model по Craftum HTML. Канвас больше не сваливает шапку, подвал и html-виджеты в одну простыню: вкладки как в Тильде показывают только нужный chrome.

Шпаргалка для следующих агентов: [live-editor.md](./live-editor.md).

### Сделано

| # | Задача | Статус |
|---|--------|--------|
| 1 | Лимит crawl на большой сайт, импорт practic-hub (не перезаписывать живой practic-hub.ru) | ✅ |
| 2 | Полигон: пакет на demo.nordic-builder.ru, PM2 `craft-demo-polygon` :3041 | ✅ |
| 3 | Меню слой 2: клон `cli-menu__link`, `menuInserts[]`, десктоп+мобилка (ADR-0030) | ✅ |
| 4 | `scope` site/page, вкладки Шапка / Подвал / HTML-код, аутлайн без сквозного (ADR-0031) | ✅ |
| 5 | HTML-код = `cli-html` / `data-type=code`; quiet на канвасе страницы; SEO head/body отдельно | ✅ |
| 6 | `rewriteDonorOrigin`: ссылки на practic-hub.ru → относительные в пакете | ✅ |
| 7 | Изоляция канвы: focus header/footer/html (ADR-0032) | ✅ |
| 8 | `#craft-dbg` скрыт (мешал кликам) | ✅ |

### Ключевые файлы

- `src/modules/content/menuInserts.ts` (+ test)
- `src/modules/pageModel/sectionScope.ts` (+ test)
- `src/modules/export/rewriteForExport.ts` (`sourceUrl`)
- `src/modules/export/portable/{admin.html,canvas.js,server.mjs,patch.cjs}`

После правок portable копировать на demo и `pm2 restart craft-demo-polygon`.

### Не путать

- Вкладка **HTML-код** ≠ SEO HTML в head/body ≠ виджет `.pic` с разными `n-…` на каждой странице
- Puck не renderer
- Конструктор nordic-builder.ru не этот проект

### Открыто / следующий заход

1. Виджет `pic` (`n-48c73e33` и клоны): fingerprint / apply-to-similar — **сделано** (вкладка «Виджеты», `similarWidgets.ts`)
2. Не включать debug-полосу без запроса
3. ЮKassa / AI / Agent API — не сейчас
4. Git commit — только если попросят. Push с VPS: ключ craft-vps, см. GitHub setup.

### Документы

- [live-editor.md](./live-editor.md) — новый
- [decisions.md](./decisions.md) — ADR-0031 уточнён, ADR-0032
- [architecture.md](./architecture.md) — portable + ритуал полигона
- [admin-spec.md](./admin-spec.md) — вкладки и изоляция канвы
- [AGENTS.md](../AGENTS.md) — ссылка на live-editor

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
| 11 | Demo funnel + оплата + CTA | ✅ готово | заявка, ZIP по токену; ЮKassa позже |
| 12 | Regression e2e | ✅ готово | `npm run e2e` |
| 13 | Замкнуть контур: демо-домен на своём хостинге | ✅ полигон | demo.nordic-builder.ru, live-editor 2026-08-19 |
| 14 | Agent API на хостинге клиента | 📋 после 13 | ключ у владельца, HTML-слоты |

**Легенда:** ✅ готово · 🔄 в работе · 📋 запланировано · ⏸ отложено

---

## 2026-08-19 · Export bundle

Кнопка «Скачать пакет» в `/admin/jobs/{id}`. Zip: `public/` без `/preview/{id}/`, `data/content.json`, `page-model.json`, `server.mjs` (`POST /api/form`), README Beget/Timeweb/VPS.

Следующее: Phase 13 — живая миграция + ZIP на демо-домен + проход как клиент. Phase 14 Agent API — после.

---

## GitHub setup

Репозиторий: **https://github.com/ztim2008/craft**

С VPS (с 19.08): `origin` → `git@github.com-craft:ztim2008/craft.git`  
SSH Host `github.com-craft` → `~/.ssh/id_ed25519_github_craft` (deploy key **craft-vps**, write).  
Обычный `github.com` в ssh config — ключ proektmap, для craft не использовать.

```bash
git push origin main
```

Без `--force`. Не коммитить `.env*`, `storage/`, `www.zip`, приватные ключи.

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
