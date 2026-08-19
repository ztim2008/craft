# Kraftum Migration Engine

**Craft** — сервис миграции сайтов с Craftum на свой хостинг с админкой.

- Прод: https://craft.nordic-builder.ru
- Путь: `/var/www/www-root/data/www/craft.nordic-builder.ru`
- PM2: `craft-nordic` · порт `3040`

## Принцип

Legacy HTML = renderer. Page Model = ядро. DOM patch — не React-пересборка.  
Puck / admin — редактор данных поверх модели.

## Статус (2026-08-19)

| Phase | Статус |
|-------|--------|
| 0 DOM-разведка | ✅ |
| 1 Crawler | ✅ |
| 2 Assets + Preview | ✅ |
| 3–11 Product (admin, export, forms…) | 📋 |

Подробнее: [docs/devlog.md](./docs/devlog.md) · [docs/mvp-plan.md](./docs/mvp-plan.md)

## Demo

1. Открыть `/`
2. Вставить URL Craftum (например `https://sx7238.craftum.io/`)
3. Preview: `/preview/{jobId}/`

## Команды

```bash
npm test
npm run build
npm run start:prod
pm2 restart craft-nordic
```

## Документация

- [architecture.md](./docs/architecture.md)
- [decisions.md](./docs/decisions.md)
- [product-plan.md](./docs/product-plan.md)
- [admin-spec.md](./docs/admin-spec.md)

## Git

`storage/` и `.env*` не коммитятся. Первый commit — devlog 2026-08-19.  
GitHub remote: см. [devlog → GitHub setup](./docs/devlog.md#github-setup).
