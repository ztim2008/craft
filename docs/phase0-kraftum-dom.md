# Phase 0 · DOM Крафтума · 19.08.2026

Источник: публичный HTML трёх сайтов (без Playwright). Контент чужих сайтов не публикуем — только структура.

## Сайты

| URL | generator | website_id | страниц sitemap | node UUID | блоки cli-* |
|---|---|---|---|---|---|
| https://ma-maniere-ballet.ru/ | Craftum CMS | 563036 | 18 | 587 (`id="n-…"`) | header, about, services, team, media, map, form-block, text, html, footer |
| https://kc3748.craftum.io/ | Craftum CMS | 565220 | пустой/нестандартный | есть, но `id='n-…'` в одинарных кавычках | header, cover, team, media, map, form-block, html, footer |
| https://madlenmartynova.ru/ | Craftum CMS | 345270 | 5 | 149 | header, title, text, services, form-block, footer |

Все три отвечают с IP `92.255.111.71` (хостинг Крафтума/Timeweb).

## Что всегда есть

- `meta name="generator" content="Craftum CMS"`
- `website_id`, `page_id`
- обёртка `div[data-blocks-wrapper]`
- секции `section.cli-block.cli-{тип}`
- `data-root-id`, `data-type`, `data-design-type`
- `sitemap.xml` (на части сайтов)

## Два поколения разметки

1. **Классика** (`ma-maniere`, `madlenmartynova`): CSS/JS из `/static/`, `common.js` + `menu.js`, двойные кавычки у атрибутов.
2. **Новее** (`kc3748`): CSS из `/css/`, бандл `/js/main.js`, атрибуты часто в одинарных кавычках, картинки через `static.craftum.com/.../filters:no_upscale()/https://274418.selcdn.ru/...`.

Парсер обязан принимать оба варианта кавычек.

## Assets, которые нельзя игнорировать

- `https://274418.selcdn.ru/...` — пользовательские загрузки
- `https://static.craftum.com/` — ресайз/CDN поверх Selectel
- `https://cdn2.craftum.com/` и `craftum-cdn-dev.craftum.net` — сток
- `/static/*.css`, `/css/*.css`, `/static/common.js`, `/js/main.js`
- Google Fonts
- сторонние виджеты: Fitbase, Elfsight, Daily Grow, YouTube, RuTube, Яндекс.Метрика

Страницы обходим same-origin. Эти хосты — assets, не страницы сайта.

## Формы

На всех трёх есть `form-block`. Бэкенд форм Крафтума в Phase 1 не переносим: только обнаружение.

## Вывод для Section Detector

Детерминированная карта:

- секция = `section.cli-block` + `data-root-id`
- тип = класс `cli-header` / `cli-cover` / `cli-services` / …
- поле = потомок с `data-type="text|image|button|input"`
- ключ узла = `id` вида `n-{uuid}`

AI не нужен, чтобы начать Page Model.
