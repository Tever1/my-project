# TASK-015: FriendsOnlinePill → button + проверить focus ring на RoomButton

> **Сложность:** simple
> **Запуск:** auto by Claude

## Проблемы

1. **FriendsOnlinePill** — это `<div>`, не focusable. Keyboard order
   `['play', 'friends', 'history', 'room']` включает `friends`, но
   querySelector(`[data-topbar="friends"]`) возвращает null → focus
   просто пропускается → пользователь жмёт → и фокус «прыгает» через
   friends.
2. **RoomButton focus ring** — пользователь говорит, что не видно
   контура при стрелочной навигации. У RoomButton уже есть `focused`
   state + boxShadow, но возможно `outline: none` без явного ring или
   ring слишком тонкий.

## Решение

1. Перевести `FriendsOnlinePill` на `motion.button` (вместо `div`),
   добавить `data-topbar="friends"`, focus state + ring, onClick
   placeholder (`console.log("friends panel — TODO")`).
2. На RoomButton — увеличить focus ring до 3px и проверить visibility
   (если ring уже есть — сделать визуально заметнее, добавив белое
   полупрозрачное кольцо в случае без roomCode).

## Файлы

- `src/app/lobby-preview/page.tsx` — только.

## Шаги

### A. FriendsOnlinePill → button

1. Заменить `<div>` корнем на `motion.button` с motion props
   (`whileHover`, `whileTap`).
2. Принять prop `topbarId?: string`. Прокинуть `data-topbar={topbarId}`.
3. На корне:
   - `[focused, setFocused]` state.
   - `onFocus`/`onBlur` обновляют focused.
   - `outline: 'none'`.
   - `boxShadow: focused ? '0 0 0 3px rgba(255,255,255,0.6)' : 'none'`.
4. Стилистика **визуально остаётся прежней** — pill как был. Только
   корневой тег button + cursor: pointer + focus ring.
5. `border: none` (если был) — убрать в пользу существующего `1px solid
   rgba(255,255,255,0.08)`.
6. `onClick`: пока заглушка `console.log("friends panel — TODO")`.

### B. RoomButton focus ring — увеличить

В `function RoomButton`:
- Изменить `focusRing` с `0 0 0 2px ...` → `0 0 0 3px ...`.
- Если `roomCode` нет, ring должен быть `0 0 0 3px rgba(255,255,255,0.7)`
  (более яркий чем 0.6 для visibility).

### C. Передать topbarId="friends"

В `TopBar` (там где рендерится FriendsOnlinePill, ~строка 378):
```tsx
{!isMobile && <FriendsOnlinePill count={4} isNarrowDesktop={compact} topbarId="friends" />}
```

### Иные нюансы

- На mobile `FriendsOnlinePill` не рендерится — keyboard nav на mobile
  без клавы, не страшно.
- Order `['play', 'friends', 'history', 'room']` уже корректный — после
  фикса querySelector найдёт `friends` и focus будет работать.

## Acceptance criteria

- [ ] `npm run build` ОК.
- [ ] От `history` → → focus переходит на `friends` (видим ring).
- [ ] От `friends` → → focus на `history`. → → → на `room`.
- [ ] От `room` ← → `history`. → не идёт (right edge без wrap).
- [ ] При focus на FriendsOnlinePill виден белый focus ring (3px).
- [ ] При focus на RoomButton виден focus ring (3px белый или accent).

## QA через preview MCP

Claude проверит сам:
1. От play → → → → последовательно фокусирует play/friends/history/room.
2. Focus ring визуально присутствует на каждом (через preview_inspect
   или преобразование boxShadow).

## Контрольные точки

1. Diff в FriendsOnlinePill (значительный — div→button) и RoomButton
   (минорный — 2px→3px).
2. `npm run build`.
3. Заполнить `codex-reports/015-friends-pill-button-focus.md`.
4. Не коммитить.
