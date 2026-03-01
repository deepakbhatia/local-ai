#!/usr/bin/env bash
# Downloads the correct Ollama binary for local development.
# Run once before `npm run tauri dev`.
# Usage: ./scripts/download-ollama.sh

set -e

OLLAMA_VERSION="v0.6.5"
BINARIES_DIR="$(dirname "$0")/../desktop-app/src-tauri/binaries"
mkdir -p "$BINARIES_DIR"

ARCH=$(uname -m)
OS=$(uname -s)

if [[ "$OS" == "Darwin" ]]; then
  if [[ "$ARCH" == "arm64" ]]; then
    SUFFIX="aarch64-apple-darwin"
  else
    SUFFIX="x86_64-apple-darwin"
  fi
  ASSET_URL="https://github.com/ollama/ollama/releases/download/${OLLAMA_VERSION}/ollama-darwin"
  OUTPUT="$BINARIES_DIR/ollama-${SUFFIX}"
  echo "Downloading Ollama ${OLLAMA_VERSION} for macOS (${ARCH})..."
  curl -L "$ASSET_URL" -o "$OUTPUT"
  chmod +x "$OUTPUT"
elif [[ "$OS" == "Linux" ]]; then
  if [[ "$ARCH" == "aarch64" ]]; then
    SUFFIX="aarch64-unknown-linux-gnu"
    ASSET_URL="https://github.com/ollama/ollama/releases/download/${OLLAMA_VERSION}/ollama-linux-arm64"
  else
    SUFFIX="x86_64-unknown-linux-gnu"
    ASSET_URL="https://github.com/ollama/ollama/releases/download/${OLLAMA_VERSION}/ollama-linux-amd64"
  fi
  OUTPUT="$BINARIES_DIR/ollama-${SUFFIX}"
  echo "Downloading Ollama ${OLLAMA_VERSION} for Linux (${ARCH})..."
  curl -L "$ASSET_URL" -o "$OUTPUT"
  chmod +x "$OUTPUT"
else
  echo "Unsupported OS: $OS"
  echo "Download Ollama manually from https://github.com/ollama/ollama/releases/tag/${OLLAMA_VERSION}"
  exit 1
fi

echo "✅ Ollama binary saved to: $OUTPUT"
echo ""
echo "Now run: npm run tauri dev (from desktop-app/)"
