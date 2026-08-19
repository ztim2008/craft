# Decisions

## ADR-0001 · Legacy HTML is the renderer

Puck не заменяет страницу React-компонентами. Он редактирует поля Page Model. Патчер меняет text/src в исходном DOM. CSS/JS/классы Крафтума остаются.

## ADR-0002 · Отдельный сайт, не НОРДИК

Проект живёт на `craft.nordic-builder.ru`. Конструктор nordic-builder.ru не трогаем.

## ADR-0003 · Jobs на файлах в Phase 1

Без Prisma/Postgres до доказательства crawler. JSON в `storage/jobs`. Postgres — отдельный контейнер, не `leads-pg`.

## ADR-0004 · AI не в MVP

Тип секции берём из `cli-block cli-*` и `data-type`. Не распознали → LegacySection.

## ADR-0005 · Playwright только здесь

На хабе запрещён Playwright для Profi. Этот Chromium — только миграция сайтов, headless, с SSRF-guard.

## ADR-0006 · Страницы same-origin, assets — нет

Страницы обходим только same-origin. Картинки и CSS Крафтума с Selectel/CDN скачиваем в Phase 2, иначе копия слепая.

## ADR-0007 · id узлов Крафтума

Парсер обязан понимать `id="n-…"` и `id='n-…'`. На kc3748.craftum.io атрибуты в одинарных кавычках.

## ADR-0008 · Puck позже патчера

Сначала crawler → копия → mappings → patch. Puck — интерфейс, не критичный путь MVP.

## ADR-0009 · Продукт: migration + deployable admin

Не SaaS-конструктор. Free demo (1 page preview) → paid export.zip + admin на хостинге клиента. Техподдержка не в базовой цене.

## ADR-0010 · Формы: сохранить Craftum-верстку

Перехватываем submit, поля извлекаем динамически из HTML. Не заменяем форму универсальным шаблоном в MVP.

## ADR-0011 · Delivery форм

MVP: email only. В модели заранее: Telegram + Google Sheets webhook. API key / tokens — в настройках admin на сервере клиента.

## ADR-0012 · Preview asset paths

Inline CSS vars резолвятся от URL stylesheet → relative `./assets/` ломается. В HTML: absolute `/preview/{jobId}/assets/{file}`. `<base href>` для link/script.

## ADR-0013 · Admin UI

WordPress-style: sidebar, overview, content, forms, HTML blocks, publish. Один владелец, без ролей.

## ADR-0014 · HTML blocks

Разрешены style и script (owner-only). AI: OpenAI, output HTML + style tag.
