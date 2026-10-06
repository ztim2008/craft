#!/usr/bin/env bash
# Сборка: ZIP-установщик + portable ZIP + (опционально) CRX
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
EXT_DIR="$ROOT/craftum-blocks-extension"
INSTALLER_DIR="$EXT_DIR/installer"
DIST="$EXT_DIR/dist"
EXT_STAGE="$DIST/extension-stage"
SETUP_STAGE="$DIST/setup-stage"
NAME="craftum-blocks-mvp"
VERSION="$(node -pe "require('$EXT_DIR/manifest.json').version")"
PORTABLE_ZIP="$DIST/${NAME}-${VERSION}.zip"
SETUP_ZIP="$DIST/craftum-blocks-setup-${VERSION}.zip"

rm -rf "$EXT_STAGE" "$SETUP_STAGE" "$DIST"/*.zip "$DIST"/*.crx 2>/dev/null || true
mkdir -p "$EXT_STAGE" "$SETUP_STAGE" "$DIST" "$ROOT/public/downloads"

# Иконки
if [[ ! -f "$EXT_DIR/icons/icon128.png" ]]; then
  python3 - "$EXT_DIR" <<'PY'
import sys
from pathlib import Path
from PIL import Image
ext = Path(sys.argv[1])
icons = ext / "icons"
icons.mkdir(parents=True, exist_ok=True)
for s in (16, 48, 128):
    Image.new("RGB", (s, s), (109, 94, 252)).save(icons / f"icon{s}.png")
PY
fi

cp "$EXT_DIR/manifest.json" "$EXT_DIR/background.js" "$EXT_STAGE/"
cp -r "$EXT_DIR/content" "$EXT_DIR/icons" "$EXT_DIR/popup" "$EXT_STAGE/"

# Portable ZIP (только расширение)
( cd "$EXT_STAGE" && zip -r "$PORTABLE_ZIP" . -x "*.DS_Store" )

# Setup ZIP (установщик + extension/)
mkdir -p "$SETUP_STAGE/extension"
cp -r "$EXT_STAGE/"* "$SETUP_STAGE/extension/"
cp "$INSTALLER_DIR/INSTALL.bat" "$SETUP_STAGE/"
cp "$INSTALLER_DIR/Установить Craftum Blocks.bat" "$SETUP_STAGE/"
cp "$INSTALLER_DIR/install.ps1" "$SETUP_STAGE/"
cp "$INSTALLER_DIR/install.sh" "$SETUP_STAGE/"
cp "$INSTALLER_DIR/ПРОЧТИ-МЕНЯ.txt" "$SETUP_STAGE/"
echo "Craftum Blocks v${VERSION}" > "$SETUP_STAGE/VERSION.txt"
chmod +x "$SETUP_STAGE/install.sh"

( cd "$SETUP_STAGE" && zip -r "$SETUP_ZIP" . -x "*.DS_Store" )

# CRX (стабильный id при наличии .pem)
CHROME="$(find /root/.cache/ms-playwright -name chrome -path '*/chrome-linux64/chrome' 2>/dev/null | head -1)"
KEY="$EXT_DIR/craftum-blocks.pem"
CRX_OUT="$DIST/${NAME}-${VERSION}.crx"
if [[ -n "$CHROME" && -x "$CHROME" ]]; then
  PACK_ARGS=(--pack-extension="$EXT_STAGE" --no-message)
  [[ -f "$KEY" ]] && PACK_ARGS+=(--pack-extension-key="$KEY")
  if "$CHROME" "${PACK_ARGS[@]}" 2>/dev/null; then
    [[ -f "${EXT_STAGE}.crx" ]] && mv "${EXT_STAGE}.crx" "$CRX_OUT"
    [[ -f "${EXT_STAGE}.pem" && ! -f "$KEY" ]] && mv "${EXT_STAGE}.pem" "$KEY"
  fi
fi

# Публикация на сайт
cp "$SETUP_ZIP" "$ROOT/public/downloads/craftum-blocks-setup.zip"
cp "$SETUP_ZIP" "$ROOT/public/downloads/craftum-blocks-setup-${VERSION}.zip"
cp "$PORTABLE_ZIP" "$ROOT/public/downloads/craftum-blocks-mvp.zip"
cp "$PORTABLE_ZIP" "$ROOT/public/downloads/craftum-blocks-mvp-${VERSION}.zip"
[[ -f "$CRX_OUT" ]] && cp "$CRX_OUT" "$ROOT/public/downloads/craftum-blocks.crx"

rm -rf "$EXT_STAGE" "$SETUP_STAGE"

echo "SETUP: $SETUP_ZIP ($(du -h "$SETUP_ZIP" | cut -f1))"
echo "PORTABLE: $PORTABLE_ZIP"
[[ -f "$CRX_OUT" ]] && echo "CRX: $CRX_OUT" || echo "CRX: не собран (не критично)"
echo "WEB setup: public/downloads/craftum-blocks-setup.zip"
echo "Готово."
