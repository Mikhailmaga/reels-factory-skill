#!/bin/bash
set -euo pipefail

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "Этот установщик предназначен только для macOS." >&2
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILL_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
CODEX_ROOT="${CODEX_HOME:-$HOME/.codex}"
PROJECT_ROOT="$HOME/Documents/ReelsFactory"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --codex-root)
      CODEX_ROOT="$2"
      shift 2
      ;;
    --project)
      PROJECT_ROOT="$2"
      shift 2
      ;;
    *)
      echo "Неизвестный параметр: $1" >&2
      exit 1
      ;;
  esac
done

echo "=== Reels Factory 2.0: полная установка для macOS ==="

if ! command -v brew >/dev/null 2>&1; then
  echo "Устанавливаю Homebrew официальным установщиком…"
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
fi

if [[ -x /opt/homebrew/bin/brew ]]; then
  BREW_BIN=/opt/homebrew/bin/brew
elif [[ -x /usr/local/bin/brew ]]; then
  BREW_BIN=/usr/local/bin/brew
else
  BREW_BIN="$(command -v brew || true)"
fi
if [[ -z "$BREW_BIN" ]]; then
  echo "Homebrew установлен, но команда brew не найдена." >&2
  exit 1
fi

eval "$("$BREW_BIN" shellenv)"
echo "Устанавливаю Node.js 22 и FFmpeg…"
"$BREW_BIN" install node@22 ffmpeg
NODE_BIN="$($BREW_BIN --prefix node@22)/bin"
export PATH="$NODE_BIN:$PATH"

PROFILE_FILE="$HOME/.zprofile"
touch "$PROFILE_FILE"
if ! grep -Fq '# Reels Factory dependencies' "$PROFILE_FILE"; then
  {
    echo ''
    echo '# Reels Factory dependencies'
    echo "eval \"\$($BREW_BIN shellenv)\""
    echo "export PATH=\"$NODE_BIN:\$PATH\""
  } >> "$PROFILE_FILE"
fi

command -v node >/dev/null 2>&1 || { echo "Node.js не найден после установки." >&2; exit 1; }
command -v ffmpeg >/dev/null 2>&1 || { echo "FFmpeg не найден после установки." >&2; exit 1; }
command -v ffprobe >/dev/null 2>&1 || { echo "FFprobe не найден после установки." >&2; exit 1; }

SKILLS_ROOT="$CODEX_ROOT/skills"
TARGET="$SKILLS_ROOT/reels-factory"
mkdir -p "$SKILLS_ROOT"

if [[ "$SKILL_ROOT" != "$TARGET" ]]; then
  if [[ -e "$TARGET" ]]; then
    BACKUP="$SKILLS_ROOT/reels-factory.backup-$(date +%Y%m%d-%H%M%S)"
    mv "$TARGET" "$BACKUP"
    echo "Предыдущая версия сохранена: $BACKUP"
  fi
  cp -R "$SKILL_ROOT" "$TARGET"
fi

echo "Устанавливаю Remotion, браузер рендера и локальный Whisper…"
node "$TARGET/scripts/bootstrap.mjs" --project "$PROJECT_ROOT"

echo
echo "Готово. Скилл: $TARGET"
echo "Рабочая папка: $PROJECT_ROOT"
echo 'Перезапусти Codex и напиши: Используй $reels-factory и настрой мою личную фабрику Reels.'
