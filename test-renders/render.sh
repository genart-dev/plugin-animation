#!/usr/bin/env bash
# Render animation plugin test images using the genart CLI.
# Usage: bash test-renders/render.sh

set -euo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)"

GENART="${GENART_CLI:-genart}"

echo "Rendering easing-curves..."
"$GENART" render "$DIR/easing-curves.genart" -o "$DIR/easing-curves.png"

echo "Rendering color-interpolation..."
"$GENART" render "$DIR/color-interpolation.genart" -o "$DIR/color-interpolation.png"

echo "Done. Output in $DIR/"
