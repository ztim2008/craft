#!/usr/bin/env bash
# Craftum Blocks — установщик (macOS / Linux)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
DEST="${HOME}/.local/share/craftum-blocks"
SRC="${ROOT}/extension"

if [[ ! -d "$SRC" ]]; then
  echo "Ошибка: папка extension не найдена. Распакуйте архив полностью."
  exit 1
fi

echo ""
echo "  Craftum Blocks — установка"
echo "  ========================="
echo ""

mkdir -p "$DEST"
cp -R "$SRC/"* "$DEST/"
echo "$DEST" > "$DEST/install-path.txt"

echo "  Файлы скопированы в:"
echo "  $DEST"
echo ""

if [[ "$OSTYPE" == "darwin"* ]]; then
  open -a "Google Chrome" "chrome://extensions" 2>/dev/null || open "chrome://extensions" 2>/dev/null || true
else
  xdg-open "chrome://extensions" 2>/dev/null || true
fi

echo "  1. Включите «Режим разработчика»"
echo "  2. «Загрузить распакованное» → укажите:"
echo "     $DEST"
echo ""
echo "  Готово."
