# Архитектура · Kraftum Migration Engine

Прод: `https://craft.nordic-builder.ru`  
Код: `/var/www/www-root/data/www/craft.nordic-builder.ru`  
Это **новый репозиторий**, не часть конструктора НОРДИК.

## Зачем

Крафтум перестаёт развиваться. Нужно снять сайты пользователей на свою инфраструктуру, сохранив внешний вид, и дать точечное редактирование контента.

## Главный принцип

```
Крафтум → Playwright → Original DOM → Site Analyzer → Page Model
                                              │
                                   ┌──────────┴──────────┐
                                   ▼                     ▼
                             DOM mappings              Puck
                                   │                     │
                                   └──────────┬──────────┘
                                              ▼
                                         DOM Patcher
                                              ▼
                                        Legacy HTML
                                              ▼
                                      original CSS/JS
                                              ▼
                                           сайт 1:1
```

- **Puck** — UI для правки полей, не движок страницы.
- **Legacy HTML** — единственный renderer в MVP.
- **Page Model** — контракт между DOM и редактором. Не зависит от Puck.

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

## Чего нет в этом репо

Конструктор `nordic-builder.ru`, leads, Payload, AI-классификатор.
