# REPORT TASK-227: Spy — вернуть draw mode поверх TASK-226

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-06-09 21:15
> - **Финиш:** 2026-06-09 21:26
> - **Длительность:** 11 минут
> - **Статус:** ✅ done

---

## Резюме (TL;DR)

Draw mode возвращён поверх текущего TASK-226 Spy flow: host видит две кнопки режима, draw стартует сразу в `playing`, использует `SPY_WORDS`, показывает canvas на телефоне и TV, а `spy:stroke` / `spy:clear` синхронизируются через существующий `game:action`.

Guess mode не переписывался: dealing/voting/roundResult остались отдельным path.

---

## Что сделано

### Изменённые файлы

- `src/app/game/[roomId]/spy/page.tsx` — добавлены `DrawStroke`, `DrawCanvas`, `SpyMode = 'guess' | 'draw'`, `drawerId`, `usedWordIndices`, `pickWord`, draw start/pass/next word flow, `spy:stroke`/`spy:clear` handling и UI кнопки/playing controls.
- `src/app/tv/[roomId]/[gameType]/page.tsx` — добавлены refs/init для Spy canvas, обработка `spy:stroke`/`spy:clear`, отдельный TV render для `sp.mode === 'draw'`.

### Новые файлы

- `codex-reports/227-spy-restore-draw-mode.md` — отчёт по задаче.

### Удалённые файлы

- (нет)

---

## Diff stat

```text
 .codex/STATUS.md                        |    7 +-
 CLAUDE.md                               |    4 +
 src/app/game/[roomId]/spy/page.tsx      | 1122 ++++++++++++++++++++++---------
 src/app/tv/[roomId]/[gameType]/page.tsx |  399 ++++++++---
 src/lib/game-data.ts                    |   47 ++
 5 files changed, 1169 insertions(+), 410 deletions(-)
```

Примечание: `.codex/STATUS.md`, `CLAUDE.md`, `src/lib/game-data.ts` и часть большого diff в Spy/TV уже были изменены до старта TASK-227 как baseline TASK-226. Я их не откатывал и не правил вне whitelist.

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `git pull --ff-only` | ⚠️ | Sandbox: `cannot open '.git/FETCH_HEAD': Operation not permitted` |
| `npm run lint` | ✅ | Чисто |
| `npx tsc --noEmit` | ✅ | Чисто |
| `npm run build` | ⚠️ | Turbopack sandbox failure: PostCSS/evaluate loader tried `creating new process` / `binding to a port`, `Operation not permitted` |
| `git diff --check -- <whitelist>` | ✅ | Чисто |
| Acceptance #1 `npm run lint` | ✅ | Чисто |
| Acceptance #2 `tsc --noEmit` | ✅ | Чисто |
| Acceptance #3 две кнопки modeSelect | ✅ | `Угадай слово` и `Нарисуй` |
| Acceptance #4 Draw стартует в playing + TV canvas | ✅ | `startGame('draw')` ставит `phase: 'playing'`, TV render по `sp.mode === 'draw'` |
| Acceptance #5 Guess стартует в dealing | ✅ | `startGame('guess')` сохраняет TASK-226 dealing path |
| Acceptance #6 stroke/clear sync | ✅ | Phone и TV слушают `spy:stroke` / `spy:clear` |

---

## Отклонения от ТЗ

Нет функциональных отклонений. Build не подтверждён из-за sandbox/Turbopack ограничения окружения, не из-за TypeScript/lint ошибки.

---

## Открытые вопросы для Claude

Нет.

---

## Что НЕ сделано (если статус ⚠️ или ❌)

Не применимо.

---

## Подсказки для ревью

- Проверь разделение `startGame('guess')` vs `startGame('draw')` в `src/app/game/[roomId]/spy/page.tsx`: guess path должен остаться TASK-226 flow с `dealing`.
- Проверь TV `playing` render: старый spotlight ограничен `sp.mode !== 'draw'`, draw mode использует отдельный canvas.
