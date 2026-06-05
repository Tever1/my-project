#!/usr/bin/env bash
# Regenerate codex-tasks/_DONE.md from task H1 headers. Run from repo root or anywhere.
# Дата «последней синхронизации» в шапке обновляется ТОЛЬКО когда реально
# изменился список тасков — иначе файл оставался бы вечно грязным после каждого
# прогона (и ломал бы проверку git diff --quiet в post-commit хуке).
cd "$(dirname "$0")"

OUT="_DONE.md"

# 1) Собираем тело таблицы (то, что меняется при добавлении/правке тасков)
build_table() {
  echo "| TASK | Файл | Заголовок |"
  echo "|------|------|-----------|"
  for f in $(ls *.md | grep -v '^_' | sort -V); do
    id=$(echo "$f" | grep -oE '^[0-9]+(\.[0-9]+)?')
    title=$(head -1 "$f" | sed -E 's/^# *//; s/^TASK-[0-9]+(\.[0-9]+)? *(:|—|-) *//')
    echo "| $id | \`$f\` | $title |"
  done
}
TABLE=$(build_table)

# 2) Решаем, какую дату ставить: если тело таблицы не изменилось — сохраняем
# прежнюю дату из существующего файла; иначе ставим сегодняшнюю.
TODAY=$(date '+%Y-%m-%d')
SYNC_DATE="$TODAY"
if [ -f "$OUT" ]; then
  OLD_TABLE=$(grep -E '^\| ' "$OUT")
  OLD_DATE=$(grep -oE '[0-9]{4}-[0-9]{2}-[0-9]{2}' "$OUT" | head -1)
  if [ "$OLD_TABLE" = "$TABLE" ] && [ -n "$OLD_DATE" ]; then
    SYNC_DATE="$OLD_DATE"
  fi
fi

# 3) Пишем файл
{
  echo "# Codex Tasks — индекс закрытых задач"
  echo ""
  echo "_Последняя синхронизация: ${SYNC_DATE}_"
  echo ""
  echo "Одна строка на каждый TASK. Источник правды — файлы \`codex-tasks/NNN-*.md\`"
  echo "(ТЗ) и \`codex-reports/NNN-*.md\` (отчёты). Этот индекс — быстрый обзор, чтобы"
  echo "не дублировать историю работ в CLAUDE.md."
  echo ""
  echo "**Регенерация** (из заголовков H1 всех тасков):"
  echo ""
  echo '```bash'
  echo "bash codex-tasks/_regen-done.sh"
  echo '```'
  echo ""
  echo "Дата выше обновляется автоматически только при изменении списка тасков."
  echo ""
  echo "$TABLE"
} > "$OUT"

echo "Regenerated $OUT ($(grep -c '^| [0-9]' "$OUT") tasks, sync=$SYNC_DATE)"
