#!/usr/bin/env bash

set -u

usage() {
  echo "Usage: npm run phones -- <ROOMCODE> [N]"
}

if [ $# -lt 1 ]; then
  usage
  exit 1
fi

BASE_URL="${PHONES_BASE_URL:-http://localhost:3000}"
CODE="$(printf '%s' "$1" | tr '[:lower:]' '[:upper:]')"
COUNT="${2:-2}"
MAX_COUNT=6
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
PROFILE_ROOT="$(mktemp -d "${TMPDIR:-/tmp}/party-phones.XXXXXX")"

if [ ! -x "$CHROME" ]; then
  echo "Google Chrome not found: $CHROME" >&2
  exit 1
fi

if ! [[ "$COUNT" =~ ^[0-9]+$ ]] || [ "$COUNT" -lt 1 ]; then
  echo "Invalid phone count: $COUNT" >&2
  usage
  exit 1
fi

if [ "$COUNT" -gt "$MAX_COUNT" ]; then
  echo "Warning: requested $COUNT phones, clamping to $MAX_COUNT." >&2
  COUNT="$MAX_COUNT"
fi

URL="$BASE_URL/join/$CODE"

for ((i = 1; i <= COUNT; i++)); do
  PROFILE_DIR="$PROFILE_ROOT/phone-$i"
  X=$((20 + ((i - 1) % 4) * 410))
  Y=$((40 + ((i - 1) / 4) * 880))

  mkdir -p "$PROFILE_DIR"

  open -na "Google Chrome" --args \
    --user-data-dir="$PROFILE_DIR" \
    --no-first-run --no-default-browser-check \
    --window-size=390,844 \
    --window-position="$X,$Y" \
    --app="$URL"
done

echo "Opened $COUNT phone window(s)."
echo "URL: $URL"
echo "Profiles: $PROFILE_ROOT"
echo "Close all: pkill -f '$PROFILE_ROOT'"
