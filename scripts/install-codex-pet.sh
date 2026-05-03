#!/usr/bin/env sh
set -eu

BASE_URL="${AI_PET_BASE_URL:-https://lencx.me/pet}"
CODEX_HOME_DIR="${CODEX_HOME:-$HOME/.codex}"
FORCE=0
LIST=0
ALL=0
PETS=""

usage() {
  cat <<'EOF'
Install ready-made Codex pets.

Usage:
  sh install-codex-pet.sh [pet-id ...] [options]
  curl -fsSL https://lencx.me/pet/install.sh | sh -s -- [pet-id ...] [options]

Options:
  --all                 Install all pets from the generated remote index.
  --codex-home <path>   Override the Codex home directory. Defaults to CODEX_HOME or ~/.codex.
  --force               Replace an existing installed pet.
  --list                List pets from the generated remote index.
  --base-url <url>      Override the remote base URL.
  -h, --help            Show this help.

Examples:
  curl -fsSL https://lencx.me/pet/install.sh | sh -s -- kerno
  curl -fsSL https://lencx.me/pet/install.sh | sh -s -- --list
  curl -fsSL https://lencx.me/pet/install.sh | sh -s -- kerno --force
EOF
}

fetch() {
  url="$1"
  if command -v curl >/dev/null 2>&1; then
    curl -fsSL "$url"
  elif command -v wget >/dev/null 2>&1; then
    wget -qO- "$url"
  else
    echo "Error: curl or wget is required." >&2
    exit 1
  fi
}

fetch_file() {
  url="$1"
  output="$2"
  if command -v curl >/dev/null 2>&1; then
    curl -fsSL "$url" -o "$output"
  elif command -v wget >/dev/null 2>&1; then
    wget -qO "$output" "$url"
  else
    echo "Error: curl or wget is required." >&2
    exit 1
  fi
}

append_pet() {
  if [ -z "$PETS" ]; then
    PETS="$1"
  else
    PETS="$PETS
$1"
  fi
}

list_available_pets() {
  fetch "$BASE_URL/codex/pets.json" |
    sed -n 's/.*"id"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p'
}

while [ "$#" -gt 0 ]; do
  case "$1" in
    --all)
      ALL=1
      shift
      ;;
    --codex-home)
      if [ "$#" -lt 2 ]; then
        echo "Error: --codex-home requires a path." >&2
        exit 1
      fi
      CODEX_HOME_DIR="$2"
      shift 2
      ;;
    --force)
      FORCE=1
      shift
      ;;
    --list)
      LIST=1
      shift
      ;;
    --base-url)
      if [ "$#" -lt 2 ]; then
        echo "Error: --base-url requires a URL." >&2
        exit 1
      fi
      BASE_URL="${2%/}"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    -*)
      echo "Error: unknown option: $1" >&2
      exit 1
      ;;
    *)
      append_pet "$1"
      shift
      ;;
  esac
done

BASE_URL="${BASE_URL%/}"

if [ "$LIST" -eq 1 ]; then
  list_available_pets
  exit 0
fi

if [ "$ALL" -eq 1 ]; then
  PETS="$(list_available_pets)"
fi

if [ -z "$PETS" ]; then
  echo "Error: please provide at least one pet id, for example: kerno" >&2
  echo "Run with --list to see available pets." >&2
  echo "" >&2
  usage >&2
  exit 1
fi

spritesheet_path_from_manifest() {
  manifest="$1"
  sed -n 's/.*"spritesheetPath"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' "$manifest" | head -n 1
}

mkdir -p "$CODEX_HOME_DIR/pets"
echo "Source: $BASE_URL"
echo "Codex home: $CODEX_HOME_DIR"

printf '%s\n' "$PETS" | while IFS= read -r pet_id; do
  [ -n "$pet_id" ] || continue

  manifest_tmp="$(mktemp)"
  fetch_file "$BASE_URL/codex/$pet_id/pet.json" "$manifest_tmp"
  spritesheet_path="$(spritesheet_path_from_manifest "$manifest_tmp")"
  if [ -z "$spritesheet_path" ]; then
    rm -f "$manifest_tmp"
    echo "Error: pet.json for $pet_id is missing spritesheetPath." >&2
    exit 1
  fi

  target="$CODEX_HOME_DIR/pets/$pet_id"
  if [ -e "$target" ]; then
    if [ "$FORCE" -ne 1 ]; then
      rm -f "$manifest_tmp"
      echo "- $pet_id: already installed at $target (use --force to replace)"
      continue
    fi
    rm -rf "$target"
  fi

  spritesheet_tmp="$(mktemp)"
  fetch_file "$BASE_URL/codex/$pet_id/$spritesheet_path" "$spritesheet_tmp"
  mkdir -p "$target"
  mv "$manifest_tmp" "$target/pet.json"
  mv "$spritesheet_tmp" "$target/$spritesheet_path"
  echo "+ $pet_id: installed to $target"
done

echo "Done. Restart Codex or refresh the pet list if needed."
