# План · Админка Craftum Blocks

## Цель

Полноценная админка каталога блоков для администратора (`/admin/craftum-blocks`): CRUD, категории, превью — по образцу галереи блоков nordic-builder.ru (`BlockGalleryModal`).

## Фазы

### Фаза A — Backend (✅ старт сентябрь 2026)

| # | Задача | Статус |
|---|--------|--------|
| A1 | Поле `category` в блоке + реестр категорий | ✅ |
| A2 | `duplicateCraftumBlock()` + `POST …/duplicate` | ✅ |
| A3 | Загрузка превью `POST …/preview` → `public/craftum-blocks/previews/` | ✅ |
| A4 | Публичный API: каталог + `categories[]` | ✅ |
| A5 | Страница превью snapshot `/craftum-blocks/preview/[id]` | ✅ |
| A6 | Админ: `ADMIN_EMAIL` + hash пароля в `.env` | ✅ |

### Фаза B — Admin UI

| # | Задача | Статус |
|---|--------|--------|
| B1 | `/admin/craftum-blocks` в AdminShell | ✅ |
| B2 | Sidebar категорий + поиск + сетка карточек | ✅ |
| B3 | Редактирование метаданных (name, desc, category, featured, preview) | ✅ |
| B4 | Удаление, дублирование | ✅ |
| B5 | Fullscreen modal превью (картинка / iframe snapshot) | ✅ |
| B6 | Загрузка PNG/JPG превью из админки | ✅ |

### Фаза C — Craftum Extension (v0.4.0)

| # | Задача | Статус |
|---|--------|--------|
| C1 | Fullscreen галерея вместо узкой панели | ✅ |
| C2 | Категории слева, карточки 16:10 с превью | ✅ |
| C3 | `previewUrl` + текстовый fallback | ✅ |
| C4 | Publish modal: выбор категории | ✅ 0.4.1 |
| C5 | «↑ В каталог» только для админа (ключ) | ✅ 0.4.1 |
| D1 | CRUD категорий в UI + categories.json | ✅ |
- Фильтр «Мои блоки» vs «Каталог сообщества»

## Auth

- Логин: `/login` → cookie `craft_admin` (HMAC, 14 дней)
- Админские API: `/api/admin/*` — только с сессией
- Publish из расширения: отдельный ключ `CRAFTUM_BLOCKS_PUBLISH_KEY`

## UX-референс (nordic-builder.ru)

```
BlockGalleryModal
├─ Header: заголовок · счётчик · закрыть
├─ Sidebar 256px: поиск · «Все» · категории с count
└─ Grid: карточки aspect 16/10 · название · описание · клик = вставка
```

## URL

| URL | Назначение |
|-----|------------|
| `/admin/craftum-blocks` | Админка каталога |
| `/login?next=/admin/craftum-blocks` | Вход |
| `/api/craftum-blocks` | Публичный JSON (расширение) |
| `/craftum-blocks/preview/[id]` | HTML-превью snapshot |
| `/craftum-blocks/previews/*.jpg` | Загруженные скриншоты |
