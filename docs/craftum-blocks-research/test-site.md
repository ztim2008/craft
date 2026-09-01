# Тестовый сайт Craftum (разведка расширения)

| Поле | Значение |
|------|----------|
| Название | `blocks-ext-test-2026-09-01` |
| **site_id** | **954965** |
| Опубликованный | `iw6587.craftum.io` |
| Редактор | https://craftum.com/app/site/954965 |
| Тестовые страницы | `1496882` … `1496888` (пустые, для разведки) |
| Создан | 2026-09-01, скрипт `scripts/craftum-create-test-site.ts` |

## Не трогать

| site_id | Сайт |
|---------|------|
| 954959 | fy4299.craftum.io (ваш рабочий) |

## API (из перехвата)

- `POST https://api-v2.craftum.com/websites/` — создание сайта
- `GET https://api-v2.craftum.com/websites/` — список сайтов
- `GET https://api-v2.craftum.com/pages/?website_id=954965` — страницы

Добавьте в `.env` для разведки редактора:

```
CRAFTUM_EDITOR_URL=https://craftum.com/app/site/954965/page/<page_id>
```

`page_id` появится после выбора шаблона / создания главной страницы.

Скрины: `captured/01-login.png` … `06-editor-or-sites.png`  
Полный дамп: `captured/test-site-created.json` (без cookies; не коммитить если там лишнее)
