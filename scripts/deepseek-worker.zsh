#!/bin/zsh

# Keep worker reasoning and tool output out of the supervising model's context.
WORKTREE="${DEEPSEEK_WORKTREE:-/Users/anastasiaivanova/my-project-deepseek}"
STATE_DIR="${DEEPSEEK_STATE_DIR:-$HOME/.local/state/deepseek-worker}"
LOG_DIR="$STATE_DIR/logs"
MODE_FILE="$STATE_DIR/mode"

DEEPSEEK_MODE=on
[[ -f "$MODE_FILE" ]] && DEEPSEEK_MODE="$(< "$MODE_FILE")"
if [[ "$DEEPSEEK_MODE" != on ]]; then
  print 'DeepSeek collaboration is OFF.'
  exit 20
fi
if [[ $# -eq 0 ]]; then
  print 'Usage: deepseek-worker "task text"'
  exit 2
fi
[[ -d "$WORKTREE" ]] || { print 'ERROR: DeepSeek worktree not found.'; exit 3; }
cd "$WORKTREE" || exit 4
CURRENT_BRANCH="$(git branch --show-current)" || exit 5
[[ "$CURRENT_BRANCH" == deepseek/* ]] || { print 'ERROR: Expected a deepseek/* task branch.'; exit 5; }
command -v node >/dev/null || { print 'ERROR: Node is required for bounded summaries.'; exit 6; }
mkdir -p "$LOG_DIR" || exit 7
RUN_DIR="$(mktemp -d "$LOG_DIR/$(date '+%Y%m%d-%H%M%S').XXXXXX")" || exit 7
TASK_ID="${RUN_DIR:t}"
LOG_FILE="$RUN_DIR/worker.log"
export DEEPSEEK_SUMMARY_FILE="$WORKTREE/.deepseek-result-$TASK_ID.txt"
SUMMARY_FILE="$RUN_DIR/result.txt"
TASK_START_EPOCH="$(date +%s)"

finish_worker() {
  local result=$?
  trap - EXIT INT TERM
  if [[ -f "$DEEPSEEK_SUMMARY_FILE" && ! -L "$DEEPSEEK_SUMMARY_FILE" ]]; then
    mv -- "$DEEPSEEK_SUMMARY_FILE" "$SUMMARY_FILE" || result=65
  fi
  print "DeepSeek exit: $result"
  if [[ -s "$SUMMARY_FILE" ]]; then
    node -e '
      const fs = require("node:fs");
      const fd = fs.openSync(process.argv[1], "r");
      const buffer = Buffer.alloc(16384);
      const count = fs.readSync(fd, buffer, 0, buffer.length, 0);
      fs.closeSync(fd);
      const clean = buffer.subarray(0, count).toString("utf8")
        .replace(/\x1b\[[0-?]*[ -\/]*[@-~]/g, "")
        .replace(/[\x00-\x08\x0b-\x1f\x7f]/g, "");
      const chars = Array.from(clean);
      process.stdout.write(chars.slice(0, 1960).join("") +
        (chars.length > 1960 || count === buffer.length ? "\n[Summary truncated]" : "") + "\n");
    ' "$SUMMARY_FILE" || result=65
  else
    print 'No final report. Completion is unverified; do not accept or automatically retry.'
    [[ "$result" -eq 0 ]] && result=65
  fi
  print "Final report: $SUMMARY_FILE"
  print "Private log: $LOG_FILE"
  # Preserve existing usage records without streaming accounting or diagnostics.
  deepseek-usage "$TASK_START_EPOCH" >> "$LOG_FILE" 2>&1
  deepseek-record-usage "$TASK_START_EPOCH" "$TASK_ID" >> "$LOG_FILE" 2>&1
  exit "$result"
}
trap finish_worker EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

TASK="$*"
REPORT_RULES="At completion, write a plain UTF-8 final report to $DEEPSEEK_SUMMARY_FILE (at most 2000 characters). Include changed files, implemented result, exact checks with PASS/FAIL, remaining issues and architectural decisions. Report only checks actually run. Never include reasoning or raw logs. Write this report even if blocked or checks fail. This is a temporary supervisor report: do not stage or commit it. The launcher will move it outside the worktree. Also give a brief final response."
print -r -- "Task: $TASK" >> "$LOG_FILE"
print "DeepSeek started: $TASK_ID ($CURRENT_BRANCH). Output is private; waiting for final report."
npx @deepseek-ai/dsh --profile headless "$TASK

$REPORT_RULES" >> "$LOG_FILE" 2>&1
exit $?
