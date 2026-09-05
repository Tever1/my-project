# REPORT TASK-075: Flicker deep fix

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-05-13 20:33 PDT
> - **Финиш:** 2026-05-13 20:36 PDT
> - **Длительность:** 3 минуты
> - **Статус:** ✅ done

---

## Резюме (TL;DR)

В `src/components/lobby/Lobby.tsx` заменил remounting navigation в create-room и leave-room flow на `window.history.pushState`. Также добавил `isMobile` в `RoomMenu`, чтобы на мобильном отключать вложенный `backdrop-filter` и использовать плотный фон без blur.

---

## Что сделано

### Изменённые файлы

- `src/components/lobby/Lobby.tsx` — в create-room callback вместо `router.push('/lobby/...')` теперь `setRoomMenuOpen(true)` и `window.history.pushState`; в `handleLeaveRoom` вместо `router.push('/')` теперь очистка state и `window.history.pushState`.
- `src/components/lobby/Lobby.tsx` — `RoomMenu` получил `isMobile?: boolean`; mobile mount передаёт `isMobile={true}`; на mobile `GlassPanel` использует `rgba(20, 18, 32, 0.92)` и не задаёт `backdropFilter` / `WebkitBackdropFilter`.

### Новые файлы

- `codex-reports/075-flicker-deep-fix.md` — отчёт по TASK-075.

### Удалённые файлы

- (нет)

---

## Diff stat

```
 src/components/lobby/Lobby.tsx | 77 ++++++++++++++++++++++++------------------
 1 file changed, 44 insertions(+), 33 deletions(-)
```

Примечание: общий diff `Lobby.tsx` также включает незакоммиченные TASK-073 и TASK-074. Собственно TASK-075 — это замена двух navigation spots и mobile `RoomMenu` blur handling.

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `npm run lint` | ✅ | без ошибок |
| createRoom без `router.push` | ✅ | используется `window.history.pushState({}, "", /lobby/CODE)` |
| `handleLeaveRoom` без `router.push` | ✅ | очищает state и обновляет URL через `window.history.pushState` |
| RoomMenu mobile prop | ✅ | `isMobile?: boolean`, mobile mount передаёт `isMobile={true}` |
| Mobile RoomMenu без nested blur | ✅ | `backdropFilter` и `WebkitBackdropFilter` становятся `undefined` при `isMobile` |
| Animation values unchanged | ✅ | `initial` / `animate` / `exit` / `transition` не менялись |

---

## Отклонения от ТЗ

нет отклонений.

---

## Открытые вопросы для Claude

нет.

---

## Что НЕ сделано (если статус ⚠️ или ❌)

—

---

## Подсказки для ревью

- Проверить create-room на desktop: URL должен стать `/lobby/CODE`, меню комнаты открывается без remount.
- Проверить leave-room: URL возвращается на `/`, `roomCode` и `roomState` очищаются без full navigation.
- Проверить mobile RoomMenu: внешний backdrop blur остаётся, внутренний `GlassPanel` blur отключён.
