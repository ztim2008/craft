# Архитектура · Craftum Blocks

## Общая схема

```
┌─────────────────────────────────────────────────────────────────┐
│  craftum.com — редактор страницы                                │
│  ┌─────────────┐   ┌──────────────────┐   ┌─────────────────┐  │
│  │ [+] Craftum │   │ Мои блоки (наш)  │   │ ↑ В каталог     │  │
│  └─────────────┘   └────────┬─────────┘   └────────┬────────┘  │
│                             │                       │           │
│  content/editor.js          │                       │           │
│  content/craftum-api.js     │                       │           │
│         │ postMessage       │                       │           │
│         ▼                   │                       │           │
│  content/page-world.js  ◄───┘ (PAGE context)        │           │
│         │ WebSocket create_block                      │           │
│         ▼                                           │           │
│  Craftum webpack (4163) + Pinia page store          │           │
└─────────────────────────┬───────────────────────────┼───────────┘
                          │                           │
                          │ GET catalog               │ POST publish
                          ▼                           ▼
┌─────────────────────────────────────────────────────────────────┐
│  craft.nordic-builder.ru                                        │
│  GET  /api/craftum-blocks          → catalog.json               │
│  POST /api/craftum-blocks/publish  → +блок (X-Craftum-Blocks-Key)│
│  UI   /craftum-blocks/catalog      → админка каталога           │
│  data/craftum-blocks/catalog.json  → источник правды            │
└─────────────────────────────────────────────────────────────────┘
```

## Расширение (MV3)

| Файл | Мир | Роль |
|------|-----|------|
| `manifest.json` | — | MV3, host_permissions craftum + api-v2 + наш сервер |
| `background.js` | service worker | fetch каталога, publish, кэш 5 мин |
| `content/editor.js` | **isolated** | UI панели, клики, cover/hero/design |
| `content/craftum-api.js` | **isolated** | мост → page-world, fetch REST Craftum |
| `content/page-world.js` | **page** | webpack, Pinia, WebSocket create_block |

### Критично: два мира JavaScript (ADR-0035)

Content script **не видит** `window.webpackChunkeditor`, `__vue_app__`, Pinia.

Поэтому snapshot-вставка **обязана** идти через `page-world.js`, инжектируемый в DOM:

```javascript
// craftum-api.js (isolated)
window.postMessage({ type: "CRAFTUM_BLOCKS_PAGE_CALL", method: "insertBlockSnapshot", ... });

// page-world.js (page context)
BlocksApi.createBlock(payload);  // WebSocket, не REST POST
pageStore.$patch({ pageNodes: [...], showSelectBlockModal: false });
```

`web_accessible_resources` в manifest — без этого `chrome.runtime.getURL('content/page-world.js')` не загрузится.

## Craftum API

### Чтение (REST, credentials: include)

```
GET https://api-v2.craftum.com/blocks/blocks/?page_id={id}
POST https://api-v2.craftum.com/pages/  {"website_id": 954965}
```

### Запись блоков (WebSocket, не REST)

`POST /blocks/blocks/` возвращает `200 null` и **не создаёт** блок — ложный успех.

Реальный путь (модуль webpack **4163**):

```json
{
  "service": "blocks",
  "action": "create_block",
  "payload": { "page_id", "id", "priority", "title", "content", "slug_id", "slug", "fonts", "bind" },
  "request_id": "uuid"
}
```

Socket: `wss://api-v2.craftum.com/socket.io/`

Обновление: `update_block`. PUT/PATCH на `/blocks/blocks/{id}/` → **405**.

### UUID при вставке

При клонировании snapshot все `id` и `n-*` в дереве **перегенерируются**, `data-root-id` указывает на новый block id.

## Формат каталога

`data/craftum-blocks/catalog.json`:

```json
{
  "version": 1,
  "apiVersion": "v1",
  "updatedAt": "ISO",
  "blocks": [
    {
      "id": "text-012222",
      "name": "text-012222",
      "description": "...",
      "featured": true,
      "insert": {
        "mode": "snapshot",
        "craftumBlock": { "id", "priority", "title", "content", "slug_id", "slug", "fonts", "bind" }
      }
    }
  ]
}
```

Режимы `insert.mode`:

| mode | Механизм |
|------|----------|
| `snapshot` | page-world → WebSocket create_block |
| `cover` | клик `.select-block-card` по templateTitle |
| `hero` | design-блок + подстановка текстов |
| `design` | клик «Дизайн-блок» |

## Сервер (Next.js)

- `src/modules/craftum-blocks/catalog.ts` — CRUD catalog.json
- `src/modules/craftum-blocks/snapshot.ts` — валидация craftumBlock
- `src/app/api/craftum-blocks/route.ts` — публичный GET + CORS
- `src/app/api/craftum-blocks/publish/route.ts` — POST, ключ из `.env`

Секрет: `CRAFTUM_BLOCKS_PUBLISH_KEY` (не коммитить).

## Страница `?blank=true`

Пустая страница открывает библиотеку блоков поверх канвы. После snapshot-вставки:

1. `showSelectBlockModal: false` (Pinia)
2. Убрать `?blank=true` из URL (`history.replaceState`)

Иначе блок создан, но пользователь не видит канву.

## Тестирование

- Только site **954965**
- Playwright: `scripts/craftum-editor-block-research.ts`, `scripts/craftum-publish-research.ts`
- Артефакты: `docs/craftum-blocks-research/captured/` (не коммитить сессии)
