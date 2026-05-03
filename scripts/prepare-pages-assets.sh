#!/usr/bin/env sh
set -eu

ROOT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
DIST_DIR="$ROOT_DIR/dist"

if [ ! -d "$DIST_DIR" ]; then
  echo "Error: dist directory not found. Run vite build first." >&2
  exit 1
fi

rm -rf "$DIST_DIR/codex" "$DIST_DIR/scripts"
mkdir -p "$DIST_DIR/scripts"

cp -R "$ROOT_DIR/codex" "$DIST_DIR/codex"
cp "$ROOT_DIR/scripts/install-codex-pet.sh" "$DIST_DIR/scripts/install-codex-pet.sh"
cp "$ROOT_DIR/scripts/install-codex-pet.ps1" "$DIST_DIR/scripts/install-codex-pet.ps1"
cp "$ROOT_DIR/scripts/install-codex-pet.sh" "$DIST_DIR/install.sh"
cp "$ROOT_DIR/scripts/install-codex-pet.ps1" "$DIST_DIR/install.ps1"

echo "Copied Codex pet install assets into $DIST_DIR"
