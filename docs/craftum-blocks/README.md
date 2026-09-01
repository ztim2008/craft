# Craftum Blocks

Отдельный продукт внутри репозитория Craft: **браузерное расширение + облачный каталог** кастомных блоков для редактора [Craftum](https://craftum.com).

Не путать с Craft-мигратором (снятие сайтов с Kraftum) и не с конструктором nordic-builder.ru.

## Статус (2026-09-01, закрытие дня)

| Компонент | Версия | Статус |
|-----------|--------|--------|
| Расширение Chrome MV3 | **0.5.0** | ✅ publish + insert подтверждены |
| API каталога | `/api/craftum-blocks` | ✅ |
| Публикация блоков | `/api/craftum-blocks/publish` | ✅ |
| Админ UI | `/admin/craftum-blocks` | ✅ превью, категории |
| Монетизация | [monetization.md](./monetization.md) | 📋 план |

**Закрытый контур:** workshop → Ctrl+S → «↑ В каталог» (плашка UUID+текст) → «+» → «Мои блоки» → вставка на другую страницу.

## Главные правила

1. **Превью в админке ≠ snapshot** — вставка из JSON при publish.
2. **Перед publish:** сохранить Craftum → обновить список → проверить плашку в форме.
3. **Одна workshop-страница, много секций** — [admin-workflow.md](./admin-workflow.md).
4. **После обновления расширения — F5** на craftum.com.
5. **Test site 954965**, не трогать **954959**.
6. Snapshot только через `page-world.js` (ADR-0035, ADR-0036).
7. `npm run build:extension` после правок → ZIP на `/downloads/`.

## Документы

| Файл | Для кого | Содержание |
|------|----------|------------|
| [philosophy.md](./philosophy.md) | продукт, инвестор | зачем, границы, не-цели |
| [architecture.md](./architecture.md) | разработчик | расширение, сервер, Craftum API |
| [agent-guide.md](./agent-guide.md) | **новые агенты** | что трогать, что нельзя, типовые ошибки |
| [admin-workflow.md](./admin-workflow.md) | **админ** | workshop-страница, много блоков, republish |
| [roadmap.md](./roadmap.md) | план | фазы до продакшена и монетизации |
| [monetization.md](./monetization.md) | продукт, бизнес | тарифы, GTM, billing, KPI |
| [../craftum-blocks-research/api-findings.md](../craftum-blocks-research/api-findings.md) | разведка | REST + WebSocket Craftum |
| [../craftum-blocks-extension-mvp.md](../craftum-blocks-extension-mvp.md) | история | ТЗ v0.1 (частично устарело) |

## Быстрые ссылки

- Прод: https://craft.nordic-builder.ru
- Админ (UI): https://craft.nordic-builder.ru/admin/craftum-blocks
- API: https://craft.nordic-builder.ru/api/craftum-blocks
- Установщик: https://craft.nordic-builder.ru/downloads/craftum-blocks-setup.zip
- Код расширения: `craftum-blocks-extension/`
- Данные каталога: `data/craftum-blocks/catalog.json`
- Тест-сайт Craftum: **954965** (не трогать **954959**)

## Сборка

```bash
npm run build:extension   # ZIP → public/downloads/craftum-blocks-setup.zip
npm run test:craftum-blocks:e2e              # headless snapshot (page-world)
npm run test:craftum-blocks:e2e:extension    # с загруженным расширением (headed)
```
