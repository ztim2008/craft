# Разбор заполненного дизайн-блока (fy4299.craftum.io)

Источник: опубликованная страница, 2026-09-01.

## Мета страницы

| Поле | Значение |
|------|----------|
| Editor URL | https://craftum.com/app/site/954959/page/1496862 |
| Published URL | https://fy4299.craftum.io |
| `website_id` | 954959 |
| `page_id` | 1496862 |
| CSS пресета | `/static/ab8a097d-8b5f-4420-ac29-790617b9c742.css` |
| **`data-root-id` (preset)** | `ab8a097d-8b5f-4420-ac29-790617b9c742` |

`data-root-id` одинаковый у всех узлов дерева — это **ID шаблона дизайн-блока** в Craftum (cover / hero с декоративными blob-иконками).

## Дерево секции

```
section#n-70774af9…  [block-wrapper]
  class: cli-block cli-cover cli-block--inverse
  │
  ├─ div.cli-block__content.cli-grid  [grid]
  │    ├─ icon ×3  (cli-empty-img--first|second|third → cli-svg)
  │    ├─ title    [text]  data-content-order="1"
  │    ├─ subtitle [text]  data-content-order="2"
  │    ├─ button   [button]
  │    └─ image    [image-wrapper → img.cli-image]
  │
  └─ div.cli-background  [background]
       --background-image: empty01_bg.webp
       --background-color: #000000
```

## Редактируемые элементы (цель MVP)

| role | data-type | data-design-type | cssClass (ключевые) | defaultValue |
|------|-----------|------------------|---------------------|--------------|
| title | text | text | `cli-block-title cli-block-title--gigantic cli-text-center cli-text-bold` | Все инструменты для уникального дизайна |
| subtitle | text | text | `cli-block-subtitle cli-block-subtitle--big cli-text-center cli-text-regular` | Не упусти возможность… |
| button | button | button | `cli-button cli-button--big cli-button--primary` | Просто бесподобно! |
| image | image | image | `cli-default cli-default-link` + `cli-image` | jpg на selcdn |

Декоративные SVG-blob и фон — часть пресета, не трогаем в MVP.

## Паттерн атрибутов Craftum

- `id="n-{uuid}"` — уникальный узел на странице (при вставке генерируются новые).
- `data-root-id` — preset/layout ID (константа для шаблона).
- `data-type` / `data-design-type` — тип в модели редактора.
- `data-design-order` — порядок в grid (1=grid, 2=title, 3=subtitle…).
- `data-content-order` — порядок контентных элементов (1, 2).
- `data-draggable="true"` — перетаскивание в редакторе.
- `data-converted="true"` — флаг миграции в новую модель.
- `data-system-sizes` — адаптивные размеры (breakpoint,w,h,fit).

## Что это значит для вставки

### Гипотеза A (вероятная)

Редактор при «+ → Дизайн-блок» создаёт секцию с `data-root-id = ab8a097d-…` и пустым grid.  
Расширение может:

1. Вызвать тот же API, что Craftum, с `presetId: "ab8a097d-8b5f-4420-ac29-790617b9c742"`.
2. Либо duplicate существующей секции-эталона на странице.

### Гипотеза B (без API)

Пользователь держит на странице скрытый «эталонный» блок → расширение дублирует → подменяет тексты через UI/API.

### Не подходит для MVP

Вставка outerHTML с теми же `n-…` id — сломает редактор (коллизии id).

## Снимок «пустого» блока (2026-09-01)

Пользователь очистил блок в редакторе, но опубликованный HTML **совпадает** с заполненным:

- тот же `section id="n-70774af9-17c8-4d1a-9b7b-b4638ea390b9"`;
- те же title / subtitle / button / image в разметке.

Вывод: либо не было **Опубликовать** + жёсткого обновления сайта, либо cover-пресет держит демо-узлы в модели до явного удаления. Для MVP **пустой HTML не блокер** — есть `presetId` и полное дерево.

Инструкция для новичка: `how-to-capture.md`.

## Ещё нужно от вас

1. ~~Пустой дизайн-блок~~ — опционально (см. выше).
2. **Network** при: «+» → **новый** дизайн-блок (см. `how-to-capture.md`).
3. URL **редактора** в адресной строки (не `fy4299.craftum.io`).

## Связанные файлы

- Шаблон JSON: `blocks/cover-hero-v1.json`
- MVP ТЗ: `../craftum-blocks-extension-mvp.md`
