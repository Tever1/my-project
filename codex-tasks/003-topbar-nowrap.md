# TASK-003: TopBar polish — nowrap для FriendsOnlinePill и RoomButton

> **Метаданные**
> - **Дата создания:** 2026-05-03
> - **Сложность:** simple
> - **Запуск:** auto by Claude
> - **Ожидаемое время Codex:** ~2 минуты
> - **Зависит от тасков:** TASK-002, TASK-002.1

---

## Цель

На viewport 901-1100px (узкий desktop) тексты в TopBar переносятся на 2 строки:
- `4 друзей онлайн` → "4 / друзей / онлайн"
- `Создать комнату` → "Создать / комнату"

Добавить `whiteSpace: nowrap` обоим элементам, чтобы они оставались на одной строке.

Mobile (<901px) и широкий desktop (>1100) не должны измениться.

---

## Файлы к изменению (whitelist)

- `src/app/lobby-preview/page.tsx`

### НЕ ТРОГАТЬ

- Никакие другие файлы.
- НЕ менять текст ("4 друзей онлайн" остаётся как есть).
- НЕ менять размер шрифта или padding.
- НЕ трогать TiltedPreview или другие компоненты — только FriendsOnlinePill
  и RoomButton.

---

## Шаги реализации

### 1. FriendsOnlinePill (около строки 323)

В `style`-объекте корневого `<div>` добавить `whiteSpace: "nowrap"`:

```tsx
<div
  style={{
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "8px 16px",
    borderRadius: radius.full,
    background: "rgba(255, 255, 255, 0.04)",
    border: "1px solid rgba(255, 255, 255, 0.08)",
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.85)",
    fontWeight: 500,
    whiteSpace: "nowrap",   // ← добавить
  }}
>
```

### 2. RoomButton (около строки 353)

В `style`-объекте `motion.button` добавить `whiteSpace: "nowrap"`:

```tsx
<motion.button
  ...
  style={{
    padding: "8px 18px",
    borderRadius: radius.full,
    ...
    textTransform: roomCode ? "uppercase" : undefined,
    whiteSpace: "nowrap",   // ← добавить
  }}
>
```

---

## Acceptance criteria

- [ ] В `FriendsOnlinePill` стиль содержит `whiteSpace: "nowrap"`.
- [ ] В `RoomButton` стиль содержит `whiteSpace: "nowrap"`.
- [ ] `git diff --stat` показывает только `src/app/lobby-preview/page.tsx`.
- [ ] `git diff` показывает ровно 2 добавленные строки (или один объединённый
      hunk c 2 добавлениями).
- [ ] Никаких других правок.

---

## Ограничения

- Никаких новых пропсов в компонентах.
- Никаких условий типа `isMobile ? "nowrap" : ...` — `nowrap` безопасен
  всегда, не нужно условить.
- Build не запускай. Только `npm run lint`.

---

## Контрольные точки для самопроверки Codex

1. `git diff src/app/lobby-preview/page.tsx` — 2 hunks или 1 объединённый.
2. `npm run lint` — 73 problems как до.
3. Отчёт в `codex-reports/003-topbar-nowrap.md` по шаблону.
4. Не коммитить.
