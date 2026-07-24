# REPORT TASK-351: «100 к 1» — БАНК на мобильном экране игроков переместить наверх

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-07-14 22:00
> - **Финиш:** 2026-07-14 22:04
> - **Длительность:** 4 минуты
> - **Статус:** ✅ done

---

## Резюме (TL;DR)

Блок БАНК в mobile player-view (`team1`/`team2`) перенесён сразу под тип раунда и перед страйками, как на экране ведущего. Логика `roundFund`, host-view, TV-view и round 4 не менялись.

---

## Что сделано

### Изменённые файлы

- `src/app/game/[roomId]/hundred-to-one/page.tsx` — в блоке `PLAYING: PLAYER VIEW` блок Fund перенесён из-под списка ответов под тип раунда; добавлен `mb-2` для консистентного отступа перед страйками, как у host-view.

### Новые файлы

- `codex-reports/351-h2o-mobile-fund-position-match-host.md` — отчёт по задаче.

### Удалённые файлы

- (нет)

---

## Diff stat

```
src/app/design-tokens/page.tsx                | 125 ++++++++++++++++++++++++++
src/app/game/[roomId]/hundred-to-one/page.tsx |  20 +++--
src/app/tv/[roomId]/[gameType]/page.tsx       | 101 +++++++++++++--------
3 files changed, 201 insertions(+), 45 deletions(-)
```

Примечание: в рабочем дереве до начала TASK-351 уже были незакоммиченные изменения в `design-tokens`, `tv/[gameType]/page.tsx` и логический фикс в `hundred-to-one/page.tsx` около `resetRound`. Изменение TASK-351 находится в `hundred-to-one/page.tsx` в player-view около блока Fund.

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `npx tsc --noEmit` | ✅ | без вывода |
| `npm run lint` | ✅ | `eslint` чисто |
| Acceptance #1 | ✅ | БАНК теперь сразу под типом раунда и над страйками для `team1`/`team2` |
| Acceptance #2 | ✅ | Список ответов и round-4 timer остались на прежних местах |

---

## Отклонения от ТЗ

нет отклонений. Добавлен только `mb-2` на перенесённый блок Fund для соответствия host-view.

---

## Открытые вопросы для Claude

нет.

---

## Что НЕ сделано (если статус ⚠️ или ❌)

не применимо.

---

## Подсказки для ревью

- Смотри `src/app/game/[roomId]/hundred-to-one/page.tsx` в блоке `PLAYING: PLAYER VIEW`: Fund теперь расположен между round type и strikes.
- В этом же файле есть предсуществующий diff около `resetRound`, он не относится к TASK-351.
