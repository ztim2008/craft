# API Craftum · разведка (тест site 954965)

Сайт **954959 не трогали**. Все эксперименты на `954965` (`iw6587.craftum.io`).

> **Актуальная архитектура расширения:** [../craftum-blocks/architecture.md](../craftum-blocks/architecture.md)

## Создание страницы

```
POST https://api-v2.craftum.com/pages/
Content-Type: application/json

{"website_id": 954965}
```

Ответ содержит `id` страницы (например `1496886`). Редактор:  
`https://craftum.com/app/site/954965/page/{pageId}?blank=true`

## Каталог блоков (библиотека «+»)

```
GET https://api-v2.craftum.com/blocks/blocks/templates/?category_id=35&type=block&locale=ru-ru
GET https://api-v2.craftum.com/blocks/blocks/templates/?category_id=75&type=block&locale=ru-ru
```

Элемент шаблона (пример `cover-03`):

```json
{
  "id": "21ab357a-a056-446e-907f-e6f43aac2200",
  "name": {
    "id": 79,
    "name": "cover03",
    "title": "cover-03",
    "category_id": 35
  }
}
```

## Чтение блоков страницы

```
GET https://api-v2.craftum.com/blocks/blocks/?page_id={pageId}
```

## Создание блока (snapshot) — WebSocket, не REST

**Не работает для вставки:**

```
POST https://api-v2.craftum.com/blocks/blocks/
→ 200 null, блок не появляется в GET
```

**Работает** (модуль webpack 4163, socket.io):

```json
{
  "service": "blocks",
  "action": "create_block",
  "request_id": "uuid",
  "payload": {
    "page_id": 1496885,
    "id": "uuid-block",
    "priority": "1|abc123:",
    "title": "text-01",
    "slug_id": 29,
    "slug": { "title": "text-01", ... },
    "content": { "tag": "section", "attrs": { "class": "cli-block ..." }, "children": [...] },
    "fonts": [],
    "bind": null
  }
}
```

Ответ по socket: `{ "code": 200, "payload": { ...created block... } }`.

Обновление: `action: "update_block"`.  
`PUT/PATCH /blocks/blocks/{id}/` → **405 Method Not Allowed**.

`newBlockOrderFrom` в Pinia (`page` store) — priority блока, **после которого** вставлять. Пример: между `empty-01` (`1|c82379:`) и `cover-03` (`1|hzzzzz:`) → `newBlockOrderFrom = "1|c82379:"`, create_block priority = `1|f411lm:` (midpoint).

Расширение читает это поле перед snapshot-вставкой и считает priority тем же midpoint-алгоритмом (base-36).

## Дизайн-блок

Клик **«Дизайн-блок»** открывает редактор пресета **empty-01** (черновик на клиенте).

## Страница ?blank=true

Библиотека блоков открыта поверх канвы. После snapshot-вставки закрыть модалку (`showSelectBlockModal: false`) и убрать `blank` из URL.

## Скрипты

```bash
npx tsx scripts/craftum-create-test-site.ts
npx tsx scripts/craftum-editor-block-research.ts
CRAFTUM_BLOCK_MODE=cover npx tsx scripts/craftum-editor-block-research.ts
npx tsx scripts/craftum-publish-research.ts
```

Артефакты: `captured/*.png`, `captured/*.json` (без cookies).

## Расширение

Вставка snapshot: `craftum-blocks-extension/content/page-world.js` (page context).  
Content script только мостит `postMessage` — см. ADR-0035.
