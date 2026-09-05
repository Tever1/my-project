# REPORT TASK-312: Alias team name empty input

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-06-30 01:47
> - **Финиш:** 2026-06-30 01:50
> - **Длительность:** 3 минуты
> - **Статус:** ✅ done

---

## Резюме (TL;DR)

В фазе `teamName` поле `TeamNameInput` теперь открывается пустым и показывает placeholder. Фолбэк в `setTeamName` не трогал.

---

## Что сделано

### Изменённые файлы

- `src/app/game/[roomId]/alias/page.tsx` — в рендере `TeamNameInput` заменил `defaultValue={gameState.teams[myTeamIndex].name}` на `defaultValue=""`.

### Новые файлы

- `codex-reports/312-alias-teamname-empty-input.md` — отчёт по TASK-312.

### Удалённые файлы

- (нет)

---

## Diff stat

```
src/app/game/[roomId]/alias/page.tsx | 1 +-
codex-reports/312-alias-teamname-empty-input.md | new report
```

Примечание: до старта TASK-312 рабочее дерево уже содержало незакоммиченные изменения в `src/app/game/[roomId]/alias/page.tsx` от предыдущих задач, поэтому общий `git diff --stat` по файлу шире этой правки.

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `npx tsc --noEmit` | ✅ | чисто |
| `npm run lint` | ✅ | без ошибок |
| `npm run build` | не запускал | по ТЗ не запускать |
| Поле ввода пустое | ✅ | `defaultValue=""`, placeholder остаётся в `TeamNameInput` |
| Diff в рамках whitelist | ✅ | изменён только whitelisted production-файл + отчёт |

---

## Отклонения от ТЗ

нет отклонений.

---

## Открытые вопросы для Claude

нет.

---

## Что НЕ сделано (если статус ⚠️ или ❌)

не применимо.

---

## Подсказки для ревью

- Проверь `src/app/game/[roomId]/alias/page.tsx` в блоке `gameState?.phase === 'teamName'`: у `TeamNameInput` должен быть `defaultValue=""`.
