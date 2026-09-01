# Craftum Blocks · MVP расширения

> **Обновлённая документация:** [craftum-blocks/README.md](./craftum-blocks/README.md)  
> Этот файл — историческое ТЗ v0.1. Часть устарела (REST POST, UI-only insert).

Отдельный продукт (не Craft-мигратор): браузерное расширение + каталог блоков на сайте проекта.

Цель MVP: рядом с штатным «+» в редакторе Craftum — кнопка **«Мои блоки»** → один кастомный блок → вставка на страницу → текст/кнопки правятся **штатными** средствами Craftum.

---

## 1. Что делаем / что не делаем

### MVP (v0.1)

- Расширение Chrome / Edge / Яндекс (Manifest V3).
- Content-script только на URL редактора Craftum (уточнить после разведки).
- Кнопка **«Мои блоки»** рядом с нативным «+» добавления секции.
- Модальное окно: 1 блок (превью + название).
- Вставка шаблона на текущую страницу в позицию «после выбранной секции» или «в конец».
- Шаблон = **дизайн-блок** с элементами `data-type` (text, button, image…), не голый `cli-html`.
- Опционально: подключение CSS пресета (инструкция или автозапись в HTML сайта — позже).

### Не в MVP

- Пункт в библиотеке Craftum «170 блоков».
- Полная копия панели «Контент / Дизайн» для произвольного HTML.
- Подписка / оплата (заглушка «все блоки бесплатно»).
- Firefox, Safari.
- Мигратор Craft, публикация на свой хостинг.

---

## 2. Архитектура

```
┌─────────────────────────────────────────────────────────┐
│  craftum.com (редактор страницы)                        │
│  ┌──────────────┐  ┌──────────────┐                     │
│  │  [+] Craftum │  │ Мои блоки    │  ← content-script   │
│  └──────────────┘  └──────┬───────┘                     │
└──────────────────────────┼──────────────────────────────┘
                           │ open modal / fetch
                           ▼
┌─────────────────────────────────────────────────────────┐
│  blocks.example.ru (каталог)                            │
│  GET /api/v1/blocks          → список                   │
│  GET /api/v1/blocks/:id      → BlockTemplate JSON       │
│  GET /api/v1/blocks/:id.css  → стили пресета            │
│  POST /api/v1/auth/extension → token (позже)            │
└─────────────────────────────────────────────────────────┘

Расширение (локально):
  manifest.json
  background/service-worker.js   — токен, кэш шаблонов
  content/editor.js              — UI + вставка
  content/editor.css
  lib/insert.js                  — стратегии вставки
```

---

## 3. Разведка в редакторе (чеклист перед кодом)

Выполнить в своём аккаунте Craftum, DevTools → Network (Fetch/XHR):

| # | Действие | Что записать |
|---|----------|--------------|
| 1 | URL редактора страницы | полный origin + path pattern |
| 2 | Клик «+» → добавить **дизайн-блок** | запросы API: method, URL, body, response |
| 3 | Внутри дизайн-блока: «+» → **Текст** | тот же формат создания элемента |
| 4 | То же для **Кнопка**, **Изображение** | body с `data-type`, координаты, rootId |
| 5 | Опубликовать страницу | HTML секции (эталон) |
| 6 | «Дублировать блок» если есть | отдельный API или только UI |
| 7 | Селектор DOM кнопки «+» на странице | для привязки нашей кнопки |

Сохранить в `research/editor-api-notes.md` (отдельный репо расширения) — **без cookies и токенов**.

---

## 4. Формат шаблона блока (BlockTemplate)

Файл на сервере: `blocks/bento-cta-v1.json`

```json
{
  "id": "bento-cta-v1",
  "version": 1,
  "name": "Bento CTA",
  "description": "Заголовок, подзаголовок, кнопка",
  "previewUrl": "https://blocks.example.ru/previews/bento-cta.png",
  "craftum": {
    "sectionType": "design-block",
    "insertMode": "api | clipboard | dom-fallback"
  },
  "styles": {
    "siteHeadCss": ".bento-cta { ... }",
    "dependsOn": []
  },
  "tree": {
    "section": {
      "className": "cli-block ...",
      "customClass": "bento-cta",
      "children": []
    },
    "elements": [
      {
        "role": "title",
        "dataType": "text",
        "defaultValue": "Заголовок",
        "layout": { "x": 0, "y": 0, "w": 600, "h": 80 },
        "cssClass": "bento-cta__title"
      },
      {
        "role": "subtitle",
        "dataType": "text",
        "defaultValue": "Подзаголовок",
        "layout": { "x": 0, "y": 100, "w": 600, "h": 48 },
        "cssClass": "bento-cta__subtitle"
      },
      {
        "role": "button",
        "dataType": "button",
        "defaultValue": "Оставить заявку",
        "href": "#",
        "layout": { "x": 0, "y": 180, "w": 220, "h": 52 },
        "cssClass": "bento-cta__btn"
      }
    ]
  },
  "apiPayload": null
}
```

### Поле `apiPayload` (предпочтительно)

После разведки: сюда кладём **готовый JSON**, который редактор Craftum отправляет при создании блока/элементов (скопировать из Network → Copy as fetch). Расширение тогда просто повторяет запросы с подставленными `rootId` / `pageId`.

### Поле `tree` (запасной путь)

Если API закрыт: ручная сборка через симуляцию UI или вставка из буфера (если Craftum поддерживает paste блоков).

---

## 5. Что прислать из пустого дизайн-блока

Минимум для первого шаблона:

1. **HTML опубликованной страницы** — только одна секция дизайн-блока (View Source или DevTools → copy outerHTML `section.cli-block`).
2. **Пустой дизайн-блок** — HTML сразу после добавления (без элементов).
3. **Дизайн-блок + один Текст** — HTML после добавления текста.
4. **Дизайн-блок + Текст + Кнопка** — HTML.
5. Скрин или список: где в UI кнопка «+» на странице (между секциями).

Желательно:

- Network dump при добавлении дизайн-блока (HAR без auth headers в публичный чат).
- `website_id`, `page_id` из meta страницы (не секрет, есть в HTML).
- Есть ли у блока `data-custom-class` в настройках CSS.

---

## 6. Стратегии вставки (по приоритету)

### A. API replay (целевой)

1. Получить `pageId`, `websiteId` из страницы редактора или meta.
2. `POST` создать секцию (как при «+» → дизайн-блок).
3. Для каждого элемента из `tree.elements` — `POST` создать узел с `data-type`.
4. Применить `customClass` на секцию/элементы.
5. Показать toast «Блок добавлен».

Плюсы: штатные настройки сразу. Минусы: нужна разведка API, хрупкость при обновлениях.

### B. Clipboard / duplicate

1. Пользователь один раз сохраняет «эталонный» блок в шаблоне Craftum.
2. Расширение вызывает «Дублировать» через programmatic click или API duplicate.
3. Патчит тексты через API или оставляет плейсхолдеры.

### C. DOM fallback (только для теста)

Вставка HTML в `cli-html` — **не цель MVP**, но можно для проверки CSS. Настройки не будут штатными.

---

## 7. UI расширения

### Кнопка «Мои блоки»

- Рядом с нативным «+» (flex, та же высота, другой цвет).
- Если «+» не найден — плавающая кнопка справа снизу + warning в консоль.

### Модалка

```
┌─────────────────────────────────────┐
│  Мои блоки                    [×]   │
├─────────────────────────────────────┤
│  ┌─────────┐                        │
│  │ preview │  Bento CTA             │
│  │  img    │  Заголовок + кнопка    │
│  └─────────┘  [ Добавить на страницу ]│
└─────────────────────────────────────┘
```

После вставки: «Готово. Кликните текст или кнопку для правки.»

### Панель пресетов (v0.2)

Боковая панель только для: цветовая схема, вкл/выкл анимации. Меняет `custom-class` или CSS variables — не заменяет панель Craftum.

---

## 8. API каталога (минимум)

### `GET /api/v1/blocks`

```json
{
  "blocks": [
    {
      "id": "bento-cta-v1",
      "name": "Bento CTA",
      "previewUrl": "https://...",
      "tags": ["cta", "hero"]
    }
  ]
}
```

### `GET /api/v1/blocks/bento-cta-v1`

Полный `BlockTemplate` (см. §4).

### CORS

Разрешить `chrome-extension://<extension-id>` или грузить через background service worker (без CORS).

---

## 9. Структура репозитория расширения

```
craftum-blocks-extension/
  manifest.json
  package.json
  src/
    background/service-worker.ts
    content/
      editor.ts          # точка входа на craftum editor
      editor.css
      mount-button.ts
      modal.ts
    lib/
      craftum-context.ts # pageId, websiteId, auth cookies scope
      insert-api.ts
      insert-fallback.ts
      template.ts
  blocks/                # локальные JSON для dev без сервера
    bento-cta-v1.json
  docs/
    editor-api-notes.md
```

`manifest.json` (черновик):

```json
{
  "manifest_version": 3,
  "name": "Craftum Blocks",
  "version": "0.1.0",
  "permissions": ["storage"],
  "host_permissions": [
    "https://craftum.com/*",
    "https://*.craftum.com/*",
    "https://blocks.example.ru/*"
  ],
  "content_scripts": [{
    "matches": ["https://craftum.com/app/site/*/page/*"],
    "js": ["content/editor.js"],
    "css": ["content/editor.css"],
    "run_at": "document_idle"
  }],
  "background": {
    "service_worker": "background/service-worker.js"
  }
}
```

`matches` уточнить после разведки URL редактора.

---

## 10. Критерии приёмки MVP

- [ ] В редакторе Craftum видна кнопка «Мои блоки».
- [ ] По клику открывается каталог с 1 блоком.
- [ ] «Добавить» вставляет секцию на страницу без ручного «+».
- [ ] Клик по **тексту** в вставленном блоке открывает **штатную** панель Craftum.
- [ ] Клик по **кнопке** — штатные настройки ссылки/стиля.
- [ ] После «Опубликовать» блок виден на сайте, адаптив не ломается (ручная проверка mobile в Craftum).
- [ ] Обновление страницы редактора не ломает расширение (повторный mount).

---

## 11. Риски

| Риск | Митигация |
|------|-----------|
| Craftum меняет API | версионировать шаблоны, fallback на инструкцию |
| Нет публичного API вставки | duplicate + clipboard |
| CORS / auth | background fetch, позже OAuth на сайте блоков |
| ToS Craftum | продукт как «помощник дизайнера», не скрейпинг чужих сайтов |

---

## 12. Следующий шаг после вашего HTML

1. Разобрать присланный HTML пустого и заполненного дизайн-блока → заполнить `tree` и/или `apiPayload`.
2. Написать `blocks/bento-cta-v1.json` локально в расширении.
3. Content-script: только кнопка + модалка + заглушка «вставка в разработке».
4. После Network dump — реализовать `insert-api.ts`.

---

Связь с Craft (мигратор): шаблоны с `data-type` и `n-…` после публикации нормально снимаются Page Model. Это плюс, но не цель MVP расширения.
