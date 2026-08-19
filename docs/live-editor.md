# Live-editor · шпаргалка для агентов

Читать вместе с ADR-0027, 0029, 0030, 0031, 0032. Puck сайт не рендерит.

## Полигон

| | |
|---|---|
| Сайт | https://demo.nordic-builder.ru |
| Редактор | https://demo.nordic-builder.ru/admin |
| PM2 | `craft-demo-polygon`, порт **3041** |
| Каталог | `/var/www/www-root/data/www/demo.nordic-builder.ru/` |
| Источник | practic-hub.ru (**не перезаписывать** живой сайт) |
| Job | `e56926cc-f939-4358-a0dc-a0bcedc8b9a1` |

После правок portable **обязательно** скопировать на полигон и рестарт, иначе `/admin` на демо останется старым:

```bash
SRC=/var/www/www-root/data/www/craft.nordic-builder.ru/src/modules/export/portable
DST=/var/www/www-root/data/www/demo.nordic-builder.ru
cp "$SRC/admin.html" "$SRC/canvas.js" "$SRC/server.mjs" "$SRC/patch.cjs" "$DST/"
pm2 restart craft-demo-polygon
```

Клиенту в ZIP уезжает тот же набор из `src/modules/export/portable/`.

## Что на канвасе

| Вкладка | `state.view` | На канвасе |
|---|---|---|
| Страница | `edit` | весь HTML страницы |
| Секции | `sections` | вся страница + панели секций |
| Шапка | `siteheader` | только `cli-header` / `cli-sticky` |
| Меню | `menu` | то же, что шапка (пункты внутри) |
| Подвал | `sitefooter` | только `cli-footer` |
| HTML-код | `sitehtml` | только `cli-html` / quiet ids |
| Виджеты | `sitewidgets` | только `.pic` / `data-custom-class` |

Реализация: `canvas.js` → `applyFocus`; `admin.html` → `canvasFocus()` + `revealCanvas()`. CSS `.craft-focus-out { display:none }`.

## Overlay (Patch Model)

- Поля `n-…`, секции (порядок/скрыть/удалить), HTML-вставки `<!--craft-block:…-->`
- Меню слой 2: `content.menuInserts[]`, клон `a.cli-menu__link[data-type=menu-item]`, маркеры `<!--craft-menu:id:i-->`, вставка **в каждую группу** (десктоп + мобилка). Код: `src/modules/content/menuInserts.ts`
- Действие клика у кнопок и пунктов меню: страница / якорь / внешняя / tel / mailto / файл
- SEO + HTML head/body — вкладка SEO, не канвас

## Три HTML, не путать

1. `cli-html` → вкладка **HTML-код**
2. Head/body сниппеты → **SEO / сайт**
3. `.pic` с уникальными id → вкладка **Виджеты**, группа по fingerprint, патч слота на все копии

`cli-html` на обычной странице без панелей (`.craft-html-quiet`), чтобы не засорять канвас.

## Донорские URL

`rewriteDonorOrigin` в `src/modules/export/rewriteForExport.ts` (4-й аргумент `sourceUrl` у `rewriteForExport`).  
`https://practic-hub.ru/...` → относительный путь пакета. Почта `info@practic-hub.ru` в тексте — не URL. Чужой домен (`practic-simply.ru`) не переписывать.

На полигоне rewrite также в `server.mjs` при `page-html` и publish, источник — `page-model.sourceUrl`.

## Не делать

- Не делать Puck renderer
- Не запускать Playwright «потыкать редактор» (только импорт)
- Не включать `#craft-dbg` без запроса
- Не коммитить `.env`, `storage/`, снапшоты
- Не трогать nordic-builder.ru и leads.konversus.ru
- ЮKassa / AI / Agent API — не этот этап
- Pic-group: `src/modules/pageModel/similarWidgets.ts`. Не путать с вкладкой HTML-код.

## Файлы

| Файл | Зачем |
|---|---|
| `src/modules/pageModel/similarWidgets.ts` | виджеты с разными n-… |
| `src/modules/pageModel/sectionScope.ts` | `scope` site/page |
| `src/modules/content/menuInserts.ts` | клон пунктов меню |
| `src/modules/content/applyContent.ts` | цепочка патча |
| `src/modules/export/rewriteForExport.ts` | preview-пути + донор |
| `src/modules/export/portable/*` | редактор клиента |
