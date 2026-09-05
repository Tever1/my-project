# REPORT TASK-317: Alias mobile "Игра окончена" — ссылка к выбору режима

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-07-01 00:09
> - **Финиш:** 2026-07-01 00:11
> - **Длительность:** 2 минуты
> - **Статус:** ✅ done

---

## Резюме (TL;DR)

Добавил для host'а на finished-экране Alias текстовую ссылку `← К выбору режима` / `← Back to mode select` под кнопкой "Играть снова". Клик переводит Alias в `modeSelect` через полный объект `AliasGameState`, без partial payload.

---

## Что сделано

### Изменённые файлы

- `src/app/game/[roomId]/alias/page.tsx` — добавлен host-only callback `backToModeSelect`, который делает `{ ...gameState, phase: 'modeSelect' }`, сохраняет state локально и broadcast'ит полный `alias:state`; на finished-экране добавлена host-only текстовая кнопка под primary-кнопкой.

### Новые файлы

- `codex-reports/317-alias-finished-back-to-modeselect.md` — отчёт по задаче.

### Удалённые файлы

- (нет)

---

## Diff stat

```
 src/app/game/[roomId]/alias/page.tsx    | 35 +++++++++++++++++++++++----------
 src/app/tv/[roomId]/[gameType]/page.tsx |  3 +--
 2 files changed, 26 insertions(+), 12 deletions(-)
```

Примечание: в рабочем дереве до старта уже были изменения в `alias/page.tsx`, `tv/[gameType]/page.tsx`, отчёты/таски 314-317. В рамках TASK-317 я редактировал только `src/app/game/[roomId]/alias/page.tsx` и этот отчёт.

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `npx tsc --noEmit` | ✅ | чисто |
| `npm run lint` | ✅ | чисто |
| `npm run build` | ❌ | Turbopack internal error: `creating new process` / `binding to a port` / `Operation not permitted` при обработке `node_modules/geist/dist/geistmono_157ca88a.module.css`; похоже на ограничение sandbox, не на ошибку TypeScript |
| Acceptance: host видит ссылку | ✅ | кнопка рендерится только внутри `{isHost && (...)}` на finished-экране |
| Acceptance: non-host не видит ссылку | ✅ | тот же host-only guard |
| Acceptance: полный state при клике | ✅ | `const next: AliasGameState = { ...gameState, phase: 'modeSelect' }`; `broadcast('alias:state', next)` |

---

## Отклонения от ТЗ

Нет отклонений по реализации. Browser QA не запускал: изменение локальное, покрыто `tsc`/`lint`, а build заблокирован Turbopack/sandbox ошибкой.

---

## Открытые вопросы для Claude

нет

---

## Что НЕ сделано (если статус ⚠️ или ❌)

Ничего по задаче.

---

## Подсказки для ревью

- Проверь `src/app/game/[roomId]/alias/page.tsx:524` — callback отправляет полный `AliasGameState`, а не partial.
- Проверь `src/app/game/[roomId]/alias/page.tsx:1248` — ссылка находится только в finished-блоке и только под `isHost`.
