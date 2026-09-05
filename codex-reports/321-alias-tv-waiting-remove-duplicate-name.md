# REPORT TASK-321: Alias TV waiting-экран — убрать дубль имени игрока

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-07-01 22:10
> - **Финиш:** 2026-07-01 22:14
> - **Длительность:** 4 минуты
> - **Статус:** ✅ done

---

## Резюме (TL;DR)

В TV waiting-карточке Alias добавлен условный рендер `team.name`: название команды показывается только не в letter mode. В letter mode остаётся только нижняя пилюля с именем игрока и микрофоном, classic mode сохраняет прежний вывод реального названия команды.

---

## Что сделано

### Изменённые файлы

- `src/app/tv/[roomId]/[gameType]/page.tsx` — в Alias waiting team card строка `{team.name}` обёрнута в `aliasState.mode !== 'letter'`.

### Новые файлы

- `codex-reports/321-alias-tv-waiting-remove-duplicate-name.md` — отчёт по задаче.

### Удалённые файлы

- (нет)

---

## Diff stat

Полный `git diff --stat` на момент проверки:

```
 src/app/game/[roomId]/alias/page.tsx    | 79 ++++++++++++---------------------
 src/app/tv/[roomId]/[gameType]/page.tsx | 16 +++----
 2 files changed, 36 insertions(+), 59 deletions(-)
```

Diff stat по whitelist-файлу:

```
 src/app/tv/[roomId]/[gameType]/page.tsx | 16 +++++++---------
 1 file changed, 7 insertions(+), 9 deletions(-)
```

Примечание: изменения в `src/app/game/[roomId]/alias/page.tsx` и часть diff в TV page уже были в рабочем дереве до TASK-321. В рамках этой задачи добавлен только условный JSX-блок вокруг `team.name`.

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `npx tsc --noEmit` | ✅ | чисто |
| `npm run lint` | ✅ | чисто |
| Acceptance: `git diff --stat` только whitelist | ⚠️ | full stat показывает pre-existing изменения в `src/app/game/[roomId]/alias/page.tsx`; TASK-321 кодовый diff сделан только в TV page |
| Acceptance: letter mode без дубля имени | ✅ | `team.name` скрыт при `aliasState.mode === 'letter'` |
| Acceptance: classic mode сохраняет `team.name` | ✅ | условие `aliasState.mode !== 'letter'` оставляет прежний рендер для classic |

---

## Отклонения от ТЗ

Нет отклонений в кодовом изменении. Ограничение по full `git diff --stat` не выполняется из-за уже существующих незакоммиченных изменений в рабочем дереве, которые я не откатывал.

---

## Открытые вопросы для Claude

Нет.

---

## Что НЕ сделано (если статус ⚠️ или ❌)

Не применимо.

---

## Подсказки для ревью

- Проверь `src/app/tv/[roomId]/[gameType]/page.tsx` в Alias waiting-блоке: единственная логика TASK-321 — `aliasState.mode !== 'letter'` вокруг `<p>{team.name}</p>`.
