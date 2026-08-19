# Архитектура · Kraftum Migration Engine

Прод: `https://craft.nordic-builder.ru`  
Код: `/var/www/www-root/data/www/craft.nordic-builder.ru`  
Это **новый репозиторий**, не часть конструктора НОРДИК.

## Зачем

Крафтум перестаёт развиваться. Нужно снять сайты пользователей на свою инфраструктуру, сохранив внешний вид, и дать точечное редактирование контента.

## Главный принцип

Craft не редактирует страницу. Craft редактирует **Patch Model** поверх существующего HTML (ADR-0029).

```
Крафтум → Playwright → Original DOM → Analyzer → Page Model
                                              │
                                    DOM mappings (n-…, cli-block)
                                              │
                                         Patch Model
                                    (поля, секции, SEO, HTML-слоты)
                                              │
                                         DOM Patcher
                                              ▼
                                        Legacy HTML + CSS/JS
                                              ▼
                                           сайт 1:1
```

- **Live editor** — iframe своего HTML, клик по узлу модели, не React canvas.
- **Puck / GrapesJS** — не renderer. Не конструктор «собрать страницу из компонентов».
- **Секции** — порядок / скрыть / удалить / вставка HTML, не библиотека блоков.
- **Page Model** — контракт DOM ↔ редактор.

## Слои

| Слой | Статус |
|---|---|
| Web Application (Next.js) | Phase 1 |
| Import Manager + job JSON | Phase 1 |
| Crawl Worker (Playwright) | Phase 1 |
| Asset Collector | Phase 2 |
| Site Analyzer / Section Detector | Phase 4 |
| Page Model + DOM mappings | Phase 5 |
| Puck как data editor | после работающего патчера |
| Legacy Renderer / DOM Patcher | Phase 6 |
| Preview / Publish | Phase 8 |

## DOM mappings (Крафтум)

Опубликованный HTML уже содержит стабильные якоря:

- `meta name="generator" content="Craftum CMS"`
- `website_id`, `page_id`
- `section.cli-block.cli-{header|cover|services|...}`
- `id="n-{uuid}"` (бывает в одинарных кавычках)
- `data-root-id`, `data-type="text|image|button|form"`

Поиск узла, по убыванию надёжности:

1. `nodeId` (`#n-uuid`)
2. `sectionId` + `data-type` + порядок
3. CSS / XPath
4. Text fingerprint только как проверка, не как адрес после правки

После импорта ставим свой якорь `data-kme-field`.

## Хостинг

- Next.js 16 слушает `127.0.0.1:3040`
- Nginx ISPmanager проксирует `craft.nordic-builder.ru`
- Снапшоты: `storage/projects/{jobId}/`
- Jobs: `storage/jobs/{id}.json`
- Playwright только в этом проекте, не связан с Profi/leads

## Два контура

- **Посетитель** на `craft.nordic-builder.ru`: 1 страница → preview. Не полный сайт.
- **Оператор** в `/admin`: миграция по тарифу, домен, ZIP. Полигон выкладки — `demo.nordic-builder.ru`, не конструктор nordic-builder.ru.

## Portable live-editor (пакет клиента)

Редактор в ZIP и на полигоне — не Next.js. Исходники:

- `src/modules/export/portable/admin.html` — chrome (страницы, вкладки, инспектор)
- `src/modules/export/portable/canvas.js` — скрипт внутри iframe HTML
- `src/modules/export/portable/server.mjs` — Node на хостинге клиента, inject canvas
- `src/modules/export/portable/patch.cjs` — тот же DOM patch, что на Craft

Полигон: `https://demo.nordic-builder.ru` · `/admin` · PM2 `craft-demo-polygon` · порт 3041.  
После правок portable — **скопировать** эти файлы в `/var/www/www-root/data/www/demo.nordic-builder.ru/` и `pm2 restart craft-demo-polygon`. Источник practic-hub.ru не перезаписывать.

Канвас: вкладки Шапка / Меню / Подвал / HTML-код показывают **только** этот chrome (как Тильда), не всю страницу. Подробности: [live-editor.md](./live-editor.md), ADR-0030…0032.
