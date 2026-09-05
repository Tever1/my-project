# TASK-164 — Удалить ghost-страницу truth-or-dare

## Контекст

`src/app/game/[roomId]/truth-or-dare/page.tsx` — артефакт раннего
прототипирования. Игра `truth-or-dare` **не входит в `GameType`** (`src/types/game.ts`),
нет server-side handler'а, нет маршрута из лобби. Файл висит мёртвым грузом
и появляется в acceptance-grep'ах (TASK-159, TASK-162), что создаёт ложную
тревогу.

## Whitelist файлов

**Удалить:**
- `src/app/game/[roomId]/truth-or-dare/page.tsx`
- директорию `src/app/game/[roomId]/truth-or-dare/` (если пустая после удаления файла)

**Создать:**
- `codex-reports/164-delete-truth-or-dare.md`

**НЕЛЬЗЯ трогать:** всё остальное.

---

## Что сделать

1. Удалить файл `src/app/game/[roomId]/truth-or-dare/page.tsx`.
2. Если директория `src/app/game/[roomId]/truth-or-dare/` после этого пуста —
   удалить и её.

## Acceptance

```bash
# Файл и директория исчезли
ls src/app/game/\[roomId\]/truth-or-dare/ 2>/dev/null || echo "✅ deleted"

# Никаких импортов truth-or-dare в остальном коде
grep -rn "truth-or-dare" src/
# → допустимо только если есть ссылки вне game-роутера (маловероятно),
#   но если есть — сообщить в отчёте (не трогать эти файлы, это вне whitelist)

npm run lint     # ✅
npx tsc --noEmit # ✅
```

## Отчёт

В `codex-reports/164-delete-truth-or-dare.md`:
- Подтверждение удаления
- Результат grep на truth-or-dare
- Результаты lint/tsc

Не коммить, не пушить.
