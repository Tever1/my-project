# TASK-042 — Иконка QR в кнопке «КОМНАТА · CODE»

**Статус:** active
**Автор:** Claude (orchestrator)
**Назначено:** Codex

---

## Контекст

В `RoomButton` (строка 1028 `Lobby.tsx`) когда `roomCode` есть — кнопка
показывает просто текст `Комната · {roomCode}`. Нужно добавить маленькую
схематичную иконку QR-кода справа от кода, чтобы игрок интуитивно понимал:
«нажму — увижу QR».

---

## Whitelist файлов

- `src/components/lobby/Lobby.tsx` — одно место

**Не трогать никакие другие файлы.**

---

## Что сделать

В функции `RoomButton` (строки 1027–1029) заменить содержимое `<motion.button>`:

**Было:**
```tsx
{roomCode ? `Комната · ${roomCode}` : isCreating ? "Создаём..." : "Создать комнату"}
```

**Стало:**
```tsx
{roomCode ? (
  <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
    <span>{`Комната · ${roomCode}`}</span>
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      aria-hidden="true"
      style={{ opacity: 0.75, flexShrink: 0 }}
    >
      {/* Top-left finder square */}
      <rect x="0" y="0" width="5" height="5" rx="1" fill="currentColor" />
      <rect x="1.5" y="1.5" width="2" height="2" fill="black" fillOpacity="0.5" />
      {/* Top-right finder square */}
      <rect x="9" y="0" width="5" height="5" rx="1" fill="currentColor" />
      <rect x="10.5" y="1.5" width="2" height="2" fill="black" fillOpacity="0.5" />
      {/* Bottom-left finder square */}
      <rect x="0" y="9" width="5" height="5" rx="1" fill="currentColor" />
      <rect x="1.5" y="10.5" width="2" height="2" fill="black" fillOpacity="0.5" />
      {/* Data dots */}
      <rect x="9" y="9" width="2" height="2" rx="0.5" fill="currentColor" />
      <rect x="12" y="9" width="2" height="2" rx="0.5" fill="currentColor" />
      <rect x="9" y="12" width="2" height="2" rx="0.5" fill="currentColor" />
      <rect x="12" y="12" width="2" height="2" rx="0.5" fill="currentColor" />
    </svg>
  </span>
) : isCreating ? "Создаём..." : "Создать комнату"}
```

---

## Acceptance criteria

- `npm run lint` — 0 problems.
- `npx tsc --noEmit` — 0 errors.
- Когда комната создана — в кнопке справа от кода видна маленькая (14×14px)
  схематичная иконка QR.
- Когда комнаты нет — кнопка «Создать комнату» выглядит как раньше.
- На десктопе и мобайле одинаково.

---

## Не делать

- Не менять размеры, padding, цвета и стили самой кнопки.
- Не добавлять tooltip или title.
- Не коммитить.

---

## Отчёт

Создать `codex-reports/042-room-button-qr-hint.md`.
