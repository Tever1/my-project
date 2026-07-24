# REPORT TASK-355: «100 к 1» — вторая волна live QA

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-07-15 22:17
> - **Финиш:** 2026-07-15 22:36
> - **Длительность:** 19 минут
> - **Статус:** ✅ done

---

## Резюме (TL;DR)

Исправлены все 6 пунктов TASK-355 в whitelisted production-файлах. `npm run lint` и `npx tsc --noEmit` проходят чисто; `npm run build` упал на Turbopack sandbox-ошибке `Operation not permitted` при попытке создать процесс/биндить порт, не на ошибке кода.

---

## Что сделано

### Изменённые файлы

- `src/app/game/[roomId]/hundred-to-one/page.tsx` — добавлен деселект роли повторным кликом, ограничение начислений в раунде 4, защита `assignPts`, отдельный `playAgain` с полным reset через `mkInitial()` и сохранением `players`.
- `src/app/tv/[roomId]/[gameType]/page.tsx` — в блоке `gameType === 'hundred-to-one'` добавлен отдельный экран ожидания выбора темы, убран фоллбэк игрового ведущего на room-host, добавлена подпись выбранной темы на preparation-экранах, стабилизированы числовые поля `tabular-nums` + `min-w-[220px]`.

### Новые файлы

- `codex-reports/355-h2o-live-qa-fixes-2.md` — отчёт по задаче.

### Удалённые файлы

- (нет)

---

## По пунктам TASK-355

1. TV `topicSelect`: отдельный render без строки `Тема: ...` и без VS-карточек команд — `src/app/tv/[roomId]/[gameType]/page.tsx:1216`. Для `roleSelect/captainSelect/teamNames` добавлена компактная подпись темы под steps — `:1295`.
2. `h2oHost` теперь ищется только по игровой роли `roles[p.id] === 'host'`, без `p.isHost` fallback — `src/app/tv/[roomId]/[gameType]/page.tsx:1201`. Все места использования показывают `—`, если ведущий не выбран — `:1273`, `:1332`, `:1334`.
3. Повторный клик по своей роли удаляет `effectivePlayerId` из `s.roles` через `delete`, без `undefined`-значения — `src/app/game/[roomId]/hundred-to-one/page.tsx:287`.
4. В TV playing-блоке очки команд и банк/таймер получили `tabular-nums tracking-[0]`; центральная карточка получила `min-w-[220px]` — `src/app/tv/[roomId]/[gameType]/page.tsx:1444`, `:1448`, `:1451`.
5. Раунд 4 проверяет, начислялись ли очки командам, через `s.qState[s.curQ].some(a => a.to === 1/2)` — `src/app/game/[roomId]/hundred-to-one/page.tsx:493`. Если обе команды уже получили очки, модалка не открывается. В модалке кнопка уже начисленной команды disabled — `:1372`, `:1381`; `assignPts` повторно защищает это условие — `:525`. Кнопка «Никому» вызывает `assignPts(0)`, пишет `to: 0`, не занимает слот команды и остаётся доступной — `:1384`.
6. Добавлен `playAgain`, который делает полный reset через `mkInitial()` и сохраняет только `players` — `src/app/game/[roomId]/hundred-to-one/page.tsx:398`. Кнопка «Сыграть ещё раз» теперь вызывает `playAgain` — `:1639`. `startGame` не менялся по смыслу: flow `title → buzzer` по-прежнему сохраняет topic/roles/captains/team names и уходит в `phase: 'buzzer'` — `:382`.

---

## Diff stat

```
src/app/game/[roomId]/hundred-to-one/page.tsx | 870 +++++++++++++++-----------
src/app/tv/[roomId]/[gameType]/page.tsx       | 606 ++++++++++++------
2 files changed, 939 insertions(+), 537 deletions(-)
```

В stat попадает уже существующий незакоммиченный хвост предыдущих задач в этих файлах; фактические правки TASK-355 перечислены выше по строкам.

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `npm run lint` | ✅ | чисто |
| `npx tsc --noEmit` | ✅ | чисто |
| `npm run build` | ❌ | Turbopack internal error: `creating new process` / `binding to a port` / `Operation not permitted`; panic log в `/var/folders/5p/w32pjj_x28gb1gcshz4411900000gn/T/next-panic-825dfd0e5f7c32b001783352de7f9899.log` |
| Acceptance: 6 пунктов | ✅ | выполнено |

---

## Отклонения от ТЗ

Нет отклонений по TASK-355. Дополнительно запускал `npm run build` по project workflow, но сборка заблокирована sandbox/Turbopack, не изменениями задачи.

---

## Открытые вопросы для Claude

Нет.

---

## Что НЕ сделано (если статус ⚠️ или ❌)

Не применимо.

---

## Подсказки для ревью

- В `src/app/game/[roomId]/hundred-to-one/page.tsx:493` проверь логику слотов раунда 4: `to === 0` от «Никому» не считается начислением.
- В `src/app/game/[roomId]/hundred-to-one/page.tsx:398` проверь, что `playAgain` намеренно сбрасывает roles/captains/team names/topic/score, но сохраняет `players`.
- Перед стартом worktree уже был dirty, включая `.codex/STATUS.md`, `codex-tasks/**` и предыдущие `codex-reports/**`; я их не редактировал.
