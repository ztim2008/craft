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

## Operator · клиенты (не пакет клиента)

Отдельный раздел `/admin/clients`:

- Создать: имя, домен, тариф, URL Craftum
- Карточка: preview, **ZIP**, **инструкция .txt**
- Поставка: хостинг (Beget/Timeweb/VPS/локально), порт Node, пароль `/admin` клиента (генерируется при скачивании, если пустой)
- Привязка job; лид с главной → «создать клиента»

Миграция: в карточке URL + можно выбрать существующего клиента. Тяжёлая работа — скилл оператора в этого клиента. «Оплачено» у заявки деньги не трогает импорт.

Публичная воронка архив не отдаёт.

В **пакете** на хостинге клиента UI не как этот WP-sidebar.

Целевой каркас клиента (привычка Craftum / Тильда):

- Слева: **страницы** с путями + аутлайн **секций этой страницы** (без сквозной шапки/подвала/html)
- Центр: живой HTML в iframe
- Вкладки сверху: Страница · Секции · **Шапка** · **Подвал** · **HTML-код** · **Меню** · SEO · Формы · …
- Шапка / Меню / Подвал / HTML-код: на канвасе **только этот chrome**, остальное скрыто (ADR-0032)
- Клик по тексту / фото / пункту меню → панель поля справа
- Действие клика у кнопки и пункта меню — в инспекторе

Нынешний `admin.html` в ZIP и на полигоне: см. [live-editor.md](./live-editor.md). «SEO / сайт»: title, description, favicon, OG, Метрика, вебмастер, HTML в `head`/`body` (это не вкладка HTML-код). Вставка своего HTML в секцию — модалка «+ HTML» на канвасе секций.

Цены Basic/Pro: `/admin/settings`.

## Publish flow

1. Редактирование → `content.json` (черновик)
2. «Опубликовать» → DOM patch + запись в `site/`
3. Формы: перехват → CRM в админке (`leads.jsonl`), email не обязателен

## content.json

См. пример в devlog / product-plan. Ключевые сущности:

- `pages[].sections[].fields[]` — nodeId, type, label, value
- `pages[].forms[]` — fields from HTML, delivery.email/telegram/sheets
- `pages[].htmlBlocks[]` — position, html, order

## Basic vs Pro в UI

- Basic: один пункт «Страницы», AI лимит или скрыт, Sheets/TG disabled
- Pro: multi-page, полные интеграции
