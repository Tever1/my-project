#!/bin/bash
# Post-commit hook — запускается после каждого git commit через Claude Code
# Собирает инфо о коммите и создаёт маркер для document-release

set -euo pipefail

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(pwd)}"
MARKER="$PROJECT_DIR/.claude/pending-doc-update.md"

# Читаем данные о коммите из stdin (JSON от Claude Code)
INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // ""' 2>/dev/null || echo "")

# Проверяем что это действительно git commit (не amend, не revert)
if ! echo "$COMMAND" | grep -q "git commit"; then
  exit 0
fi

cd "$PROJECT_DIR"

# Собираем инфо о коммите
HASH=$(git log --oneline -1 2>/dev/null | cut -d' ' -f1 || echo "unknown")
MSG=$(git log --oneline -1 2>/dev/null | cut -d' ' -f2- || echo "unknown")
CHANGED=$(git diff --stat HEAD~1 HEAD 2>/dev/null | tail -1 || echo "unknown")
FILES=$(git diff --name-only HEAD~1 HEAD 2>/dev/null | head -10 | tr '\n' ', ' | sed 's/,$//' || echo "unknown")
DATE=$(date '+%Y-%m-%d %H:%M')

# Создаём маркер — Claude увидит его в начале следующей сессии
cat > "$MARKER" << EOF
# ⚠️ CLAUDE.md может требовать обновления

**Последний коммит:** \`$HASH\` — $MSG
**Когда:** $DATE
**Изменено:** $CHANGED
**Файлы:** $FILES

Claude: при старте следующей сессии предложи запустить /document-release
чтобы синхронизировать CLAUDE.md с этим коммитом.
EOF

echo "📝 Создан маркер для document-release: .claude/pending-doc-update.md"
exit 0
