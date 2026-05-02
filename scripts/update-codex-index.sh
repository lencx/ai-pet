#!/usr/bin/env sh
set -eu

ROOT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
CODEX_DIR="$ROOT_DIR/codex"
INDEX_FILE="$CODEX_DIR/pets.json"

json_value() {
  key="$1"
  file="$2"
  sed -n "s/.*\"$key\"[[:space:]]*:[[:space:]]*\"\\([^\"]*\\)\".*/\\1/p" "$file" | head -n 1
}

json_escape() {
  printf '%s' "$1" | sed 's/\\/\\\\/g; s/"/\\"/g'
}

tmp_file="$(mktemp)"
{
  printf '{\n'
  printf '  "pets": [\n'

  first=1
  for pet_dir in "$CODEX_DIR"/*; do
    [ -d "$pet_dir" ] || continue
    [ -f "$pet_dir/pet.json" ] || continue

    pet_id="$(basename "$pet_dir")"
    display_name="$(json_value displayName "$pet_dir/pet.json")"
    description="$(json_value description "$pet_dir/pet.json")"
    manifest_id="$(json_value id "$pet_dir/pet.json")"

    if [ -n "$manifest_id" ] && [ "$manifest_id" != "$pet_id" ]; then
      echo "Error: $pet_dir/pet.json id '$manifest_id' does not match folder '$pet_id'." >&2
      rm -f "$tmp_file"
      exit 1
    fi

    if [ "$first" -eq 0 ]; then
      printf ',\n'
    fi
    first=0

    printf '    {\n'
    printf '      "id": "%s",\n' "$(json_escape "$pet_id")"
    printf '      "displayName": "%s",\n' "$(json_escape "$display_name")"
    printf '      "description": "%s",\n' "$(json_escape "$description")"
    printf '      "path": "%s"\n' "$(json_escape "$pet_id")"
    printf '    }'
  done

  printf '\n'
  printf '  ]\n'
  printf '}\n'
} > "$tmp_file"

mv "$tmp_file" "$INDEX_FILE"
echo "Updated $INDEX_FILE"
