# Devlog · Craft / Kraftum Migration Engine

Хронология разработки. Обновляется при закрытии дня или завершении этапа.

---

## 2026-09-02 · Craftum Blocks · scope и авторский workflow

### Итог

Подтверждён рабочий путь ускорения: **блок → каталог → клон под новым id** — пользователь уже делает, работает отлично. Зафиксирован **scope продукта**: секции страницы, не Tilda-like site-kit. Расширение **v0.5.4**: ключ публикации в админке + popup, не в форме publish.

### Продуктово

| Решение | Статус |
|---------|--------|
| Клон блока в каталоге → новый id | ✅ подтверждено пользователем |
| Republish «Обновить по id» | ✅ v0.5.2 |
| Ключ publish — админка → popup расширения | ✅ v0.5.4 |
| CSS/HTML в секции + штатная пошаговая анимация | 🔄 эксперименты автора сегодня |
| Fixed / site-wide / Zero-block / bottom nav | ⏸ не делаем (ADR-0038) |

### Технично за утро

- v0.5.1 → **v0.5.2**: «Рекомендуем», auto-id, «Обновить по id», тень панели
- `/craftum-blocks/versions` + `feed.xml`, autogen из devlog → `extension-releases.json`
- **v0.5.4**: `GET /api/admin/craftum-blocks/publish-key`, панель в админке, ключ убран из publish modal
- `pm2 restart craft-nordic` после deploy

### Не трогать

954959. Тесты 954965.

---

## 2026-09-01 · закрытие дня · Craftum Blocks v0.5.0

### Итог

**Craftum Blocks** доведён до рабочего контура на test site: publish → каталог → вставка на другую страницу. Вечером подтверждено пользователем после очистки каталога и чистого цикла. Расширение **v0.5.0**, админка с превью, ZIP на `/downloads/`.

### Что сделано за день

| Область | Результат |
|---------|-----------|
| Расширение | v0.3.4 → **v0.5.0**: панель «Мои блоки», publish, insert snapshot, priority, F5-guard |
| Админка | `/admin/craftum-blocks`: каталог, категории, превью Ctrl+V, WebP |
| API | `/api/craftum-blocks`, publish, admin-check |
| Документация | `docs/craftum-blocks/*`, `admin-workflow.md`, agent-guide |
| Разведка | `newBlockOrderFrom`, priority midpoint, scripts в `scripts/` |

### Ключевые уроки (обязательно помнить)

1. **Превью в админке ≠ snapshot.** Карточка — картинка; вставка — JSON `craftumBlock` при «↑ В каталог».
2. **Перед publish: Ctrl+S** в Craftum → «Обновить список» → проверить серую плашку (UUID + текст секции).
3. **Workshop:** одна страница, много секций; категории вручную; страницы Craftum ≠ категории каталога.
4. **После обновления расширения — F5** (Extension context invalidated).
5. **401 api-v2.craftum.com** — перелогин Craftum, не баг расширения.
6. **`fonts` в snapshot** — только объекты; строки `var(--sans-serif)` ломают рендер → sanitize при publish/insert.
7. **Duplicate priority** — при повторной вставке на страницу; fix: unique priority + retry (v0.4.9+).
8. **Редактирование дизайна** — в Craftum после вставки (Контент/Дизайн), не в нашей админке.

### Версии расширения (хронология дня)

- **v0.4.5** — `newBlockOrderFrom`, позиция вставки
- **v0.4.6** — guard `chrome.runtime.id`, баннер F5
- **v0.4.7** — SVG launcher, бейдж «новых»
- **v0.4.8** — sanitize fonts
- **v0.4.9** — unique priority, предупреждение дубликата snapshot
- **v0.5.0** — publish preview (плашка секции), `listPageBlocksForPublish`, каталог очищен

### Не трогать

Craftum site **954959**. Тесты **954965** (и другие test sites по согласованию).

### Завтра

Утреннее тестирование пользователем → фидбек. Возможные задачи: стабильность insert, информер новых блоков, иконка, monetization stub. См. `docs/prompt-2026-09-02.md`.

---

## 2026-09-01 · Craftum Blocks — админка, превью, позиция вставки

### Итог

Расширение **Craftum Blocks v0.4.5**: полный контур publish → каталог → вставка на канву. Админка с медиагалереей превью. Исправлена позиция вставки блоков (не всегда наверх). Кнопка «↑ В каталог» снова на месте.

### Ключевые находки (позиция вставки)

Craftum при клике «+» между секциями пишет в Pinia (`page` store) поле **`newBlockOrderFrom`** — это `priority` блока, **после которого** вставлять.

Пример (test site 954965, page 1496963):

| Блок | priority |
|------|----------|
| empty-01 (верх) | `1\|c82379:` |
| cover-03 (низ) | `1\|hzzzzz:` |

Клик «+» между ними → `newBlockOrderFrom = "1|c82379:"` → нативный `create_block` → `priority = "1|f411lm:"` (midpoint в base-36).

**Проблема:** к моменту клика по блоку в нашей панели Craftum уже сбрасывает `newBlockOrderFrom` → мы читали `null` → блок уезжал наверх.

**Решение (v0.4.4 → v0.4.5):**

1. Запоминать `newBlockOrderFrom` при клике «+» и при открытии библиотеки (`captureInsertOrderFrom`)
2. Передавать в `insertBlockSnapshot` и восстанавливать в Pinia перед `createBlock`
3. Считать `priority` midpoint-алгоритмом Craftum (base-36, совпадает с нативным `f411lm`)
4. Удалять `priority` / `id` из snapshot каталога перед вставкой
5. Версионировать `page-world.js` — старый код мог оставаться в page context без F5

Разведка: `scripts/craftum-insert-position-research.ts`, дополнено `docs/craftum-blocks-research/api-findings.md`.

### Админка · превью блоков

- Компонент `BlockPreviewGallery`: Ctrl+V, drag-drop, «Сохранить превью», статус ✓
- Оптимизация sharp: WebP 1200×900, 4:3, `object-contain`
- Route handler `/craftum-blocks/previews/[filename]` — App Router перехватывал `public/`, отдавал 404
- Сетка карточек и расширение: aspect 4:3 + `object-contain`

### Расширение v0.4.5

| Что | Детали |
|-----|--------|
| Позиция вставки | `pendingInsertOrderFrom` + patch Pinia |
| «↑ В каталог» | В шапке панели «Мои блоки» + FAB внизу справа (не перекрывается иконкой) |
| page-world | Версия `0.4.5`, hot-reload при обновлении расширения |
| ZIP | `public/downloads/craftum-blocks-setup.zip` |

### Как пользоваться (вставка)

1. «+» **между** нужными секциями (не только иконка расширения)
2. Выбрать блок в панели «Мои блоки»
3. После обновления расширения — **F5** на странице Craftum

### Документация

- `docs/craftum-blocks-research/api-findings.md` — `newBlockOrderFrom`, priority
- `docs/craftum-blocks/monetization.md`, `admin-plan.md`

### Не трогать

Craftum site **954959**. Тесты только **954965**.

### v0.4.6 · Extension context invalidated

После обновления расширения без F5 Chrome убивает старый content script → `chrome.runtime.getURL` падает → панель «Мои блоки» не появляется. Fix: проверка `chrome.runtime.id`, try/catch, баннер «нажмите F5». Ошибки `401` на `api-v2.craftum.com` — сессия Craftum (перелогин), не расширение.

---

## 2026-09-01 · Craftum Blocks — контур закрыт (утро)

### Итог

Расширение **Craftum Blocks v0.3.4**: publish snapshot → каталог на сервере → «Мои блоки» → вставка на канву Craftum. Работает на test site 954965.

### Ключевые находки

- Snapshot **не через REST POST** — только WebSocket `create_block` (ADR-0036).
- Content script **не видит** webpack Craftum — `page-world.js` в page context (ADR-0035).
- Каталог: `data/craftum-blocks/catalog.json`, API `/api/craftum-blocks`.

### Документация

- `docs/craftum-blocks/` — philosophy, architecture, agent-guide, roadmap.

---

## 2026-08-21 · закрытие дня

### Итог

Craft готов собирать живых пользователей на миграцию. Публичная главная продаёт услугу, заявка падает в `/admin/orders`. На полигоне попап-формы Крафтума открываются в редакторе и на сайте — тот же `cli-popup`, не новая вкладка и не клон конструктора.

Продуктово зафиксировано: **не** вшивать nordic-builder / Puck в Craft; **не** клонировать админку Craftum. Модуль «Статьи» и дизайн-блок + агент — подумать после реальных миграций. «Добавить страницу» как пустую кнопку — не делать.

### Сделано

| # | Задача | Статус |
|---|--------|--------|
| 1 | Главная: Originkit Hero 19, оффер, FAQ, контакты TG/VK | ✅ |
| 2 | ADR-0033: домен остаётся у клиента, не `*.craftum.io` | ✅ |
| 3 | Лид с главной `POST /api/leads` → `/admin/orders` (канал landing) | ✅ |
| 4 | ADR-0034: попапы `cli-popup` + `show` + `href="#n-…"` в инспекторе и на канвасе | ✅ |
| 5 | formBridge: открыть/закрыть попап, заявка, скрыть после отправки | ✅ |
| 6 | Полигон: portable скопирован, `pm2 restart craft-demo-polygon` | ✅ |
| 7 | Решение: конструктор внутрь Craft — нет; статьи / дизайн-блок — позже | ✅ |

### Полигон / прод

- Прод: https://craft.nordic-builder.ru
- Редактор полигона: https://demo.nordic-builder.ru/admin (practic-hub, не перезаписывать живой сайт)
- Попапы проверены глазами: открываются с кнопки и из аутлайна

### Дальше (не код «на всякий случай»)

См. [plan-2026-08-22.md](./plan-2026-08-22.md): набор пользователей, дыры мигратора с живых сайтов, точечные правки. Статьи и дизайн-блок — отдельно, когда будет спрос.

### Не делать

- Puck / nordic-builder как renderer в Craft
- Клон админки Craftum (виртуальный браузер, парсинг конструктора)
- ЮKassa, AI-секции, Agent API
- «Добавить страницу» без модуля статей
- Коммитить `.env`, `storage/`, `.originkit/`

### Не коммитить

`.env`, `storage/`, `www.zip`, `.originkit/` (ключ Originkit).

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
