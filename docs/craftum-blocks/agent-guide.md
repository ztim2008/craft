# Agent guide · Craftum Blocks

Краткая инструкция для новых агентов Cursor. Читать **до** правок в `craftum-blocks-extension/` или API каталога.

## Продукт в одном абзаце

Расширение Chrome добавляет «Мои блоки» в редактор Craftum. Каталог блоков на `craft.nordic-builder.ru`. Кастомные блоки = JSON snapshot (`craftumBlock`), вставка через WebSocket Craftum.

## Жёсткие правила

1. **Не трогать Craftum site 954959** — прод пользователя. Тесты только **954965**.
2. **Не путать** с Craft-мигратором и nordic-builder.ru.
3. **Playwright** — только разведка/импорт, не Profi.
4. **Секреты** — `.env`, ключ publish, не в git.
5. **`data/craftum-blocks/catalog.json`** — можно коммитить (нет секретов); снапшоты в `storage/` — нет.
6. После правок расширения: `npm run build:extension` → ZIP на `/downloads/`.
7. **Превью в админке ≠ snapshot** — содержимое блока только из publish («↑ В каталог»).
8. **Перед publish:** Ctrl+S в Craftum → «Обновить список» → плашка UUID+текст должна совпадать с секцией.
9. **После обновления расширения — F5** (иначе Extension context invalidated).
10. **Workshop:** одна страница Craftum, много секций; категории каталога вручную — см. [admin-workflow.md](./admin-workflow.md).
11. **sanitize fonts** при publish/insert — в `fonts` только объекты, не CSS-строки.
12. **Priority уникален** на странице — `ensureUniquePriority` + retry при duplicate key.

## Где что лежит

```
craftum-blocks-extension/
  manifest.json
  background.js              # каталог + publish
  content/editor.js          # UI панели (isolated world)
  content/craftum-api.js     # мост (isolated)
  content/page-world.js      # Craftum API (PAGE world) ← snapshot только здесь

data/craftum-blocks/catalog.json
src/app/api/craftum-blocks/
src/modules/craftum-blocks/
```

## ADR-0035 · Page world для snapshot

**Симптом:** «Редактор Craftum ещё загружается» при клике, хотя редактор открыт.

**Причина:** content script изолирован от `webpackChunkeditor` / Pinia.

**Решение:** вся логика `createBlock` — в `page-world.js`, вызов через `postMessage`.

**Не делать:** вызывать `webpackChunkeditor` из `editor.js` или `craftum-api.js` напрямую.

## ADR-0036 · REST POST blocks — не использовать

`POST https://api-v2.craftum.com/blocks/blocks/` → `200 null`, блок не появляется.

Писать только через WebSocket `create_block` (см. `page-world.js`).

## Типовые задачи

| Задача | Файлы |
|--------|-------|
| Новый UI в панели | `editor.js`, `editor.css` |
| Логика вставки snapshot | `page-world.js` |
| Мост / fetch | `craftum-api.js` |
| Каталог API | `src/modules/craftum-blocks/catalog.ts`, `route.ts` |
| Новый блок в каталог | publish через UI или POST publish |
| Версия расширения | `manifest.json`, `editor.js` EXT_VERSION, build |

## Отладка у пользователя

1. Консоль: `[Craftum Blocks] v0.5.0` и `catalog loaded (server), N blocks`.
2. Если 4 блока — нет связи с сервером → «↻ Обновить каталог».
3. Красный toast при клике — текст ошибки из `page-world.js`.
4. 401 `users/me` — сессия Craftum, часто не блокирует вставку.

## Чеклист перед «готово»

- [ ] `npm run test:craftum-blocks:e2e` проходит
- [ ] Версия bumped, `npm run build:extension`
- [ ] Snapshot вставляется на 954965 (не 954959)
- [ ] Каталог API отдаёт блок
- [ ] Не сломан cover/hero/design режимы
- [ ] Документация обновлена при смене API Craftum

## Промпт для новой сессии

```
Craftum Blocks extension. Read docs/craftum-blocks/agent-guide.md and architecture.md.
Test site 954965 only. Snapshot insert via page-world.js + WebSocket create_block.
Current extension version: see manifest.json.
```
