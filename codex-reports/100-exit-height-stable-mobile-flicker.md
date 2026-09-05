# REPORT TASK-100: Стабильная высота кнопок + мерцание dropdown на мобильном

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-05-17 21:40
> - **Финиш:** 2026-05-17 21:42
> - **Длительность:** 2 минуты
> - **Статус:** ✅ done

---

## Резюме (TL;DR)

В `src/components/lobby/Lobby.tsx` выполнены две точечные правки из TASK-100: confirm-кнопки выхода получили одинаковую вертикальную высоту, а dropdown игрока на мобильном теперь открывается без Framer Motion анимации. `npm run lint` прошёл, `npm run build` упал на Turbopack internal error из-за sandbox `Operation not permitted`.

---

## Что сделано

### Изменённые файлы

- `src/components/lobby/Lobby.tsx` — padding кнопок «Да» и «Отмена» изменён с `"6px 12px"` на `"8px 12px"`.
- `src/components/lobby/Lobby.tsx` — `player-action-menu` получил mobile-only instant animation: `initial={false}`, `exit` без движения и `transition` с `duration: 0`; desktop остался `duration: 0.13`.

### Новые файлы

- `codex-reports/100-exit-height-stable-mobile-flicker.md` — отчёт по задаче.

### Удалённые файлы

- (нет)

---

## Diff stat

```
src/components/lobby/Lobby.tsx | 337 ++++++++++++++++++++---------------------
1 file changed, 167 insertions(+), 170 deletions(-)
```

Примечание: `Lobby.tsx` уже был изменён до TASK-100; мои изменения для этой задачи ограничены строками с padding confirm-кнопок и motion props dropdown.

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `git pull --ff-only` | ✅ | Already up to date |
| `npm run lint` | ✅ | Без ошибок |
| `npm run build` | ❌ | TurbopackInternalError: sandbox запретил creating new process / binding to a port при обработке `geist` CSS |
| Acceptance #1 | ✅ | Padding «Да» / «Отмена» выровнен до `"8px 12px"` |
| Acceptance #2 | ✅ | На mobile dropdown получает `duration: 0` и без initial motion |
| Acceptance #3 | ✅ | На desktop сохранён `duration: 0.13` |

---

## Отклонения от ТЗ

Создан отчёт в `codex-reports/100-exit-height-stable-mobile-flicker.md`, хотя в секции «Запрещено» одновременно было указано не трогать `codex-reports/**`. Секция «Отчёт» явно требовала создать этот файл, поэтому выполнил это требование.

---

## Открытые вопросы для Claude

- `.codex/STATUS.md` всё ещё содержит активный TASK-090 с lock на `src/components/lobby/Lobby.tsx`; текущий TASK-100 был выполнен по прямому запросу пользователя поверх уже существующих незакоммиченных изменений.

---

## Что НЕ сделано (если статус ⚠️ или ❌)

- Визуальный browser QA не запускался; задача проверена статически и через lint/build-команды.

---

## Подсказки для ревью

- Проверить `src/components/lobby/Lobby.tsx:2152` и `src/components/lobby/Lobby.tsx:2170` — padding confirm-кнопок.
- Проверить `src/components/lobby/Lobby.tsx:2289` и `src/components/lobby/Lobby.tsx:2292` — mobile conditional для motion dropdown.
