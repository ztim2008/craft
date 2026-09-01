# Разведка редактора Craftum

## Защищённые сайты (не трогать автоматикой)

| site_id | URL | Причина |
|---------|-----|---------|
| 954959 | fy4299.craftum.io | рабочий сайт пользователя |

Разведка только на **новом** тестовом сайте — см. `test-site.md`, скрипт `scripts/craftum-create-test-site.ts`.

## Учётные данные для скриптов

В `.env` (не коммитить):

```
CRAFTUM_EMAIL=...
CRAFTUM_PASSWORD=...
CRAFTUM_EDITOR_URL=...   # после создания тест-сайта
```

Запуск:

```bash
npx tsx scripts/craftum-create-test-site.ts
npx tsx scripts/craftum-editor-research.ts
```

```
https://craftum.com/app/site/{websiteId}/page/{pageId}
```

Пример **защищённого** сайта пользователя (не использовать для скриптов):

| Поле | Значение |
|------|----------|
| Editor URL | https://craftum.com/app/site/954959/page/1496862 |
| Published | https://fy4299.craftum.io |

## Manifest V3 — content_scripts.matches

```json
"matches": [
  "https://craftum.com/app/site/*/page/*"
]
```

## Извлечение контекста в расширении

```js
const m = location.pathname.match(/\/app\/site\/(\d+)\/page\/(\d+)/);
const websiteId = m?.[1];
const pageId = m?.[2];
```

## Network — первый снимок (скрин 34234)

Фильтр **Fetch/XHR**, редактор `craftum.com/app/site/954959/page/1496862`.

Видимые запросы (все **200**):

| Name | Размер | Назначение (гипотеза) |
|------|--------|------------------------|
| `templates/?category_id=35&type=block&locale=ru-ru` | 91.6 kB | каталог блоков (основная библиотека) |
| `templates/?category_id=75&type=block&locale=ru-ru` | 6.0 kB | ещё одна категория блоков |
| `color_schemes/` | 1.2 kB | цветовые схемы сайта |
| `version.json` | 0.3 kB | версия редактора (поллинг) |
| `83230486?page-url=…` | 0.1 kB | метрика/аналитика (не API вставки) |

Initiator: `chunk-vendors.74e703b6.js` — SPA-редактор на Vue/React.

В левой панели выбран блок **empty-01** (настройки / слои).

**Вывод:** это снимок **каталога шаблонов**, а не момента «добавить блок на страницу». Для `apiPayload` нужен запрос **после** клика «Добавить» / вставки секции (часто POST, не GET `templates/`).

Скрин: `screenshots/craftum-network-34234.jpg`

### Следующий шаг в Network

1. Кнопка **очистить** (🚫) в Network.
2. Нажать **«+»** на странице → выбрать блок → **добавить на страницу**.
3. Найти новый **POST** (или PUT/PATCH).
4. Кликнуть `templates/…` → вкладка **Response** — там может быть список блоков с id пресетов.

### Полезно для расширения

- Базовый API каталога: `GET …/templates/?category_id={n}&type=block&locale=ru-ru`
- Наш каталог на `blocks.example.ru` может отдавать тот же смысл: id, name, preview, `presetId`
