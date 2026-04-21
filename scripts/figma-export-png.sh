#!/usr/bin/env bash
# Figma REST API? ??? PNG? ?? ?????. (MCP export? ????? ?? ??? ?? ? ??? ???.)
#
# ??:
# 1) Figma ? Settings ? Personal access tokens ?? ?? ??
# 2) ???? ???? ?? URL?? file key ??
#    ?: https://www.figma.com/design/AbCdEfGh123456/MyFile ? AbCdEfGh123456
#
# ??:
#   export FIGMA_TOKEN="figd_xxxxxxxx"
#   ./scripts/figma-export-png.sh AbCdEfGh123456 "53:75" ./images/mann.png
#
# node id? ??? ???? ?? ? URL? node-id= ?? MCP get_document_info? id ?(?: 53:75)

set -euo pipefail

if [[ $# -lt 3 ]]; then
  echo "Usage: FIGMA_TOKEN=... $0 <file_key> <node_id> <output.png>" >&2
  exit 1
fi

FILE_KEY="$1"
NODE_ID="$2"
OUT="$3"

if [[ -z "${FIGMA_TOKEN:-}" ]]; then
  echo "Set FIGMA_TOKEN (Figma personal access token)." >&2
  exit 1
fi

# API? id? URL ???? ??? ?? (?: 53%3A75)
ENC_ID=$(python3 -c "import urllib.parse,sys; print(urllib.parse.quote(sys.argv[1], safe=''))" "$NODE_ID")

TMP=$(mktemp)
trap 'rm -f "$TMP"' EXIT

curl -fsS -H "X-Figma-Token: ${FIGMA_TOKEN}" \
  "https://api.figma.com/v1/images/${FILE_KEY}?ids=${ENC_ID}&format=png&scale=2" \
  -o "$TMP"

URL=$(python3 -c "
import json, sys
with open(sys.argv[1]) as f:
    d = json.load(f)
imgs = d.get('images') or {}
url = ''
for v in imgs.values():
    if v:
        url = v
        break
print(url, end='')
" "$TMP")

if [[ -z "$URL" || "$URL" == "None" ]]; then
  echo "No image URL in API response. Check file_key, node_id, and token scope." >&2
  cat "$TMP" >&2
  exit 1
fi

mkdir -p "$(dirname "$OUT")"
curl -fsSL "$URL" -o "$OUT"
echo "Wrote $OUT"
