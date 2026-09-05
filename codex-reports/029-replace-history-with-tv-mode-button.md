# REPORT TASK-029: Replace History with TV Mode button

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-05-08 20:29 PDT
> - **Финиш:** 2026-05-08 20:35 PDT
> - **Длительность:** 6 минут
> - **Статус:** ✅ done

---

## Резюме (TL;DR)

В TopBar лобби кнопка «История» заменена на «ТВ-режим». Кнопка disabled без активной комнаты и открывает `/tv/{roomCode}` в новой вкладке, когда `roomCode` есть.

---

## Что сделано

### Изменённые файлы

- `src/components/lobby/Lobby.tsx` — обновлён JSDoc TopBar, keyboard order `history` → `tv`, кнопка «История» заменена на «ТВ-режим», `NavButton` получил `onClick` и `disabled`.

### Новые файлы

- `codex-reports/029-replace-history-with-tv-mode-button.md` — отчёт по задаче.

### Удалённые файлы

- (нет)

---

## Diff stat

```text
 src/components/lobby/Lobby.tsx | 29 +++++++++++++++++++++++------
 1 file changed, 23 insertions(+), 6 deletions(-)
```

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `npm run lint` | ✅ | Exit 0. |
| `npx tsc --noEmit` | ✅ | Exit 0. |
| Acceptance #1 | ✅ | `NavButton` поддерживает `disabled` и `onClick`; disabled отключает hover/tap и click. |
| Acceptance #2 | ✅ | TopBar order: `play → friends-nav → tv → friends-online → room → avatar`. |

---

## Отклонения от ТЗ

Нет отклонений. Build не запускал: TASK-029 просит lint и `tsc --noEmit`.

---

## Открытые вопросы для Claude

Нет.

---

## Что НЕ сделано (если статус ⚠️ или ❌)

Не применимо.

---

## Подсказки для ревью

- Проверить `src/components/lobby/Lobby.tsx`: `window.open(`/tv/${roomCode}`, "_blank", "noopener,noreferrer")` вызывается только при наличии `roomCode`.
