# Установка Craftum Blocks

## Страница установки

https://craft.nordic-builder.ru/craftum-blocks

## Файл для установки

После сборки (`npm run build:extension`):

```
public/downloads/craftum-blocks-setup.zip
craftum-blocks-extension/dist/craftum-blocks-setup-0.5.4.zip
```

**Windows:** распакуйте → `INSTALL.bat` → режим разработчика → вставить путь из буфера.

**macOS/Linux:** распакуйте → `./install.sh` → загрузить папку из `~/.local/share/craftum-blocks`.

---

## Chrome

1. Откройте `chrome://extensions`
2. Включите **Режим разработчика** (справа вверху)
3. **Загрузить распакованное расширение**
4. Выберите **распакованную папку** (внутри должны быть `manifest.json`, `content/`, `icons/`)

> Chrome не ставит ZIP напрямую — сначала **распакуйте** архив.

---

## Яндекс Браузер

1. `browser://extensions`
2. **Режим разработчика** → **Загрузить распакованное расширение**
3. Укажите распакованную папку

---

## Edge

1. `edge://extensions`
2. **Режим разработчика** → **Загрузить распакованное**
3. Укажите распакованную папку

---

## Проверка

1. Войдите в Craftum
2. Откройте редактор страницы, например тест-сайт:  
   `https://craftum.com/app/site/954965/page/...`
3. Справа внизу появится кнопка **«Мои блоки»**
4. **Добавить** → блок должен появиться на канве

---

## Сборка на сервере

```bash
npm run build:extension
```

или

```bash
bash craftum-blocks-extension/build.sh
```
