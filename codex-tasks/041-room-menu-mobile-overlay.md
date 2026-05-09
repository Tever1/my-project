# TASK-041 — Room menu как overlay на мобайле

**Статус:** active
**Автор:** Claude (orchestrator)
**Назначено:** Codex

---

## Проблема

На мобайле `RoomMenu` не рендерится совсем — весь правый блок скрыт через
`{!isMobile && ...}` (строка 624). Кнопка «КОМНАТА · ...» в TopBar переключает
`roomMenuOpen`, но ничего не показывается.

---

## Whitelist файлов

- `src/components/lobby/Lobby.tsx` — одно место

**Не трогать никакие другие файлы.**

---

## Что сделать

В компоненте `Lobby` (файл `src/components/lobby/Lobby.tsx`) после строки
с `</section>` (около строки 646, после закрытия секции с `HeroLeft`) и до
`{/* Bottom tile strip */}` добавить мобильный overlay для RoomMenu:

```tsx
{/* Mobile room menu overlay */}
{isMobile && (
  <AnimatePresence>
    {roomMenuOpen && roomCode && (
      <>
        {/* Dim backdrop */}
        <motion.div
          key="room-menu-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={() => setRoomMenuOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.6)",
            backdropFilter: "blur(4px)",
            WebkitBackdropFilter: "blur(4px)",
            zIndex: 40,
          }}
        />
        {/* Scrollable panel */}
        <motion.div
          key="room-menu-mobile"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 40 }}
          transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
          style={{
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 41,
            maxHeight: "88dvh",
            overflowY: "auto",
            padding: "0 12px 24px",
          }}
        >
          <RoomMenu
            ref={roomMenuRef}
            roomCode={roomCode}
            roomState={roomState}
            accent={accent}
            deep={deep}
            currentUserId={user?.id ?? ""}
            onKick={handleKick}
            onTransferHost={handleTransferHost}
            onLeaveRoom={handleLeaveRoom}
          />
        </motion.div>
      </>
    )}
  </AnimatePresence>
)}
```

Панель выезжает снизу (bottom sheet). Dim-backdrop закрывает меню по клику.

**Не менять** существующий `{!isMobile && ...}` блок с десктопной версией.

---

## Acceptance criteria

- `npm run lint` — 0 problems.
- `npx tsc --noEmit` — 0 errors.
- На мобайле клик по «КОМНАТА · CODE» открывает RoomMenu как bottom sheet
  поверх страницы, с dim-backdrop.
- Клик по backdrop закрывает меню.
- Кнопка «Выйти», список игроков, QR-код — всё работает как на десктопе.
- На десктопе поведение не изменилось.

---

## Не делать

- Не трогать десктопную логику рендера RoomMenu.
- Не коммитить.

---

## Отчёт

Создать `codex-reports/041-room-menu-mobile-overlay.md`.
