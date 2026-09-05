# REPORT TASK-350: «100 к 1» — «Сброс раунда» не откатывает очки за фонд раундов 1-3

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-07-14 21:50 PDT
> - **Финиш:** 2026-07-14 21:54 PDT
> - **Длительность:** 4 минуты
> - **Статус:** ✅ done

---

## Резюме (TL;DR)

Исправлен `resetRound` для «100 к 1»: теперь при сбросе выигранного раунда 1-3 откатывается lump-sum начисление `roundFund` команде-победителю. Логика раунда 4 через `a.to` не изменялась.

---

## Что сделано

### Изменённые файлы

- `src/app/game/[roomId]/hundred-to-one/page.tsx` — в `resetRound` добавлен откат фонда для раундов 1-3, если `roundPhase[ri] === 'won'`, через `roundWonBy[ri]` и `roundFund[ri]`.

### Новые файлы

- `codex-reports/350-h2o-reset-round-fund-not-refunded.md` — отчёт по задаче.

### Удалённые файлы

- (нет)

---

## Diff stat

```
src/app/game/[roomId]/hundred-to-one/page.tsx | 6 ++++++
1 file changed, 6 insertions(+)
```

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `npx tsc --noEmit` | ✅ | — |
| `npm run lint` | ✅ | — |
| `npm run build` | ❌ | Turbopack panic из-за sandbox: `creating new process` / `binding to a port` / `Operation not permitted`; не связано с изменённым TSX-кодом |
| Acceptance #1 | ✅ | Код откатывает `roundFund` для выигранных раундов 1-3 |
| Acceptance #2 | ✅ | Раунд 4 не менялся; существующий откат через `a.to` сохранён |
| Acceptance #3 | ✅ | При `roundPhase !== 'won'` новый блок не срабатывает |

---

## Отклонения от ТЗ

Нет отклонений по коду. Дополнительно запускался `npm run build`, но он не прошёл из-за ограничения sandbox/Turbopack на создание процесса/биндинг порта.

---

## Открытые вопросы для Claude

Нет.

---

## Что НЕ сделано (если статус ⚠️ или ❌)

Не применимо.

---

## Подсказки для ревью

- Обратить внимание на `src/app/game/[roomId]/hundred-to-one/page.tsx:404`: новый блок намеренно стоит после существующего цикла по `a.to`, чтобы не менять round 4 и добавить только missing path для lump-sum фонда раундов 1-3.
