#!/usr/bin/env bash
# Ambil screenshot layar Android (emulator atau HP via USB debugging) untuk dicek Claude Code.
# Pakai: bash .claude/skills/bekas-ui-craft/scripts/screenshot.sh beranda
set -euo pipefail

name="${1:-screen}"
outdir="design/shots"
mkdir -p "$outdir"

if ! command -v adb >/dev/null 2>&1; then
  echo "adb tidak ditemukan. Install Android platform-tools atau jalankan emulator dari Android Studio." >&2
  exit 1
fi

if [ "$(adb devices | grep -cw device)" -lt 1 ]; then
  echo "Tidak ada device/emulator terhubung. Cek 'adb devices'." >&2
  exit 1
fi

file="$outdir/${name}-$(date +%H%M%S).png"
adb exec-out screencap -p > "$file"
echo "$file"
