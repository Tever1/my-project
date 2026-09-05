# REPORT TASK-316: Alias finished team name overflow + medal removal

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-07-01 00:00
> - **Финиш:** 2026-07-01 00:02
> - **Длительность:** 2 минуты
> - **Статус:** ✅ done

---

## Резюме (TL;DR)

На экране Alias `finished` убрана иконка медали перед названием команды. Название команды теперь меньше по размеру, сжимается внутри flex-строки и обрезается через ellipsis вместо наложения на счёт.

---

## Что сделано

### Изменённые файлы

- `src/app/game/[roomId]/alias/page.tsx` — в блоке `FINISHED` добавлен `gap-3` между именем и счётом; имя команды переведено на `text-base min-w-0 truncate`; удалено использование `AliasIcon name="medal"` в строках результатов.

### Новые файлы

- `codex-reports/316-alias-finished-team-name-overflow-medal.md` — отчёт по TASK-316.

### Удалённые файлы

- (нет)

---

## Diff stat

```
 src/app/game/[roomId]/alias/page.tsx | 13 ++++++-------
 1 file changed, 6 insertions(+), 7 deletions(-)
```

Примечание: в этом stat учитывается ранее существовавшее незакоммиченное изменение в `turnResult` того же файла. Изменение TASK-316 ограничено блоком `FINISHED`.

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `npx tsc --noEmit` | ✅ | — |
| `npm run lint` | ✅ | — |
| Acceptance: медаль убрана | ✅ | `AliasIcon name="medal"` удалён из блока `finished` |
| Acceptance: имя не наезжает на счёт | ✅ | `gap-3`, `min-w-0`, `truncate`, `text-base` |

---

## Отклонения от ТЗ

Нет отклонений.

---

## Открытые вопросы для Claude

Нет.

---

## Что НЕ сделано (если статус ⚠️ или ❌)

Не применимо.

---

## Подсказки для ревью

- Проверь блок `FINISHED` в `src/app/game/[roomId]/alias/page.tsx`: имя команды теперь занимает сжимаемый flex-слот, счёт оставлен с исходным `text-2xl`.
