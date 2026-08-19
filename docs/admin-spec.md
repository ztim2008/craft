# Admin spec · WP-style

Стиль: как WordPress admin — тёмный sidebar, светлый content, синие кнопки «Сохранить».

## Каркас

- Top bar: логотип, «Посмотреть сайт ↗», logout
- Left menu (dark `#1d2327`):
  - Обзор
  - Страницы (Basic: 1 строка)
  - Секции
  - Контент
  - Формы
  - HTML-блоки
  - AI-секции
  - Настройки
  - ───
  - Опубликовать

## Экраны

| # | Экран | Назначение |
|---|-------|------------|
| 0 | Login | 1 владелец, login/password |
| 1 | Обзор | счётчики, быстрые действия, last publish |
| 2 | Страницы | список (Pro: много) |
| 3 | Секции | cli-block список, переход в контент |
| 4 | Контент | поля: text, phone, link, textarea |
| 5 | Формы | поля из HTML, email (Sheets/TG — «скоро») |
| 6 | HTML-блоки | редактор кода, position after/before section |
| 7 | AI-секции | OpenAI key, prompt, preview, insert |
| 8 | Настройки | site title, admin email, смена пароля |
| 9 | Опубликовать | DOM patch → public/ |

## Operator export

В админке сервиса на задаче: кнопка «Скачать пакет» → `GET /api/admin/jobs/{id}/export` (нужна сессия). Zip для хостинга клиента, не SaaS.

Публичная воронка: заявка на `/` → `/admin/orders` → «Оплачено» → клиент качает ZIP по токену с `/demo/{id}`.

## Publish flow

1. Редактирование → `content.json` (черновик)
2. «Опубликовать» → DOM patch + запись в `site/`
3. Формы: action → `/api/form-submit`, delivery из admin

## content.json

См. пример в devlog / product-plan. Ключевые сущности:

- `pages[].sections[].fields[]` — nodeId, type, label, value
- `pages[].forms[]` — fields from HTML, delivery.email/telegram/sheets
- `pages[].htmlBlocks[]` — position, html, order

## Basic vs Pro в UI

- Basic: один пункт «Страницы», AI лимит или скрыт, Sheets/TG disabled
- Pro: multi-page, полные интеграции
