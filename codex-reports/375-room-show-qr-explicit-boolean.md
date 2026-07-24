# REPORT TASK-375: room:show-qr explicit boolean

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-07-20 23:00
> - **Финиш:** 2026-07-20 23:06
> - **Длительность:** 6 минут
> - **Статус:** ✅ done

---

## Резюме (TL;DR)

`room:show-qr` переведён с неявного toggle/always-true на явный payload `{ show: boolean }` по всей цепочке server → Lobby/TV/join. Старые вызовы без `show` сохраняют обратную совместимость и трактуются как `show: true`.

---

## Что сделано

### Изменённые файлы

- `src/server/socket-handlers.mts` — handler теперь принимает `show?: boolean` и ретранслирует `{ show: data.show !== false }`.
- `src/components/lobby/Lobby.tsx` — listener выставляет `isWaitingForPlayers` по payload; `handleAddPlayer` шлёт `show: true`; `handleCancelWaiting` дополнительно шлёт `show: false`.
- `src/app/tv/[roomId]/[gameType]/page.tsx` — listener больше не toggle-ит overlay, а выставляет `showQrOverlay` по payload.
- `src/app/join/[code]/page.tsx` — оба emit-а шлют явный `show`; добавлен listener `room:show-qr`, чтобы `qrShown` синхронизировался с TV/Lobby cancel.

### Новые файлы

- `codex-reports/375-room-show-qr-explicit-boolean.md` — отчёт по задаче.

### Удалённые файлы

- (нет)

---

## Diff stat

Текущий workspace уже содержал незакоммиченные изменения в части whitelist-файлов до TASK-375, поэтому общий stat включает не только мои строки:

```
 src/app/join/[code]/page.tsx            |  75 +++-
 src/app/tv/[roomId]/[gameType]/page.tsx | 680 ++++++++++++++++++++++++--------
 src/components/lobby/Lobby.tsx          |   8 +-
 src/server/socket-handlers.mts          |   4 +-
 4 files changed, 569 insertions(+), 198 deletions(-)
```

Фактические строки TASK-375:

- `src/server/socket-handlers.mts:495-498`
- `src/components/lobby/Lobby.tsx:547-549`, `src/components/lobby/Lobby.tsx:700-713`
- `src/app/tv/[roomId]/[gameType]/page.tsx:460-462`
- `src/app/join/[code]/page.tsx:120-122`, `src/app/join/[code]/page.tsx:218-224`

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `npx tsc --noEmit` | ✅ | без вывода |
| `npm run lint` | ✅ | без warnings/errors |
| Acceptance A | ⚠️ | live browser-сценарий не запускался; кодовая цепочка Lobby использует явный `show` |
| Acceptance B | ⚠️ | live browser-сценарий не запускался; TV overlay использует явный `show` вместо toggle |

---

## Отклонения от ТЗ

Нет по коду. Дополнительно добавлен listener `room:show-qr` в `/join/[code]`, потому что acceptance явно просит синхронизировать `qrShown` на других телефонах при `show:false`.

---

## Открытые вопросы для Claude

`.codex/STATUS.md` содержит старые active-записи и уже был изменён до старта этой задачи; я его не трогал.

---

## Что НЕ сделано (если статус ⚠️ или ❌)

Live QA сценарии A/B в браузере не выполнялись.

---

## Подсказки для ревью

- Проверь, что fallback `show !== false` устраивает для старых клиентов без payload.
- В рабочем дереве есть pre-existing изменения в `src/app/join/[code]/page.tsx` и `src/app/tv/[roomId]/[gameType]/page.tsx`; мои изменения в этих файлах ограничены обработчиками `room:show-qr`.
