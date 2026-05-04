# TASK-016: AvatarPill → button + focus ring + keyboard order

> **Сложность:** simple
> **Запуск:** auto by Claude

## Цель

`AvatarPill` (показывает аватар + имя игрока) сейчас `<div>` — не focusable.
В будущем здесь будет popup с функционалом аккаунта. Нужно перевести на
`motion.button`, добавить focus ring и включить в keyboard order TopBar.

## Файлы

- `src/app/lobby-preview/page.tsx` — только.

## Шаги

### A. AvatarPill: div → motion.button

В `function AvatarPill`:

1. Заменить корневой `<div>` на `<motion.button>`.
2. Принимать новый prop `topbarId?: string`. Прокинуть `data-topbar={topbarId}`.
3. Добавить:
   - `[focused, setFocused] = useState(false)`.
   - `onFocus={() => setFocused(true)}`, `onBlur={() => setFocused(false)}`.
   - `onClick={() => console.log("account panel — TODO")}` (заглушка).
   - `whileHover={{ scale: 1.03 }}`, `whileTap={{ scale: 0.97 }}`,
     `transition={spring.snappy}`.
4. Стиль: визуально оставить как был, добавить:
   - `outline: 'none'`
   - `cursor: 'pointer'`
   - `boxShadow: focused ? '0 0 0 3px rgba(255,255,255,0.6)' : 'none'`
   - `fontFamily: 'inherit', color: 'inherit'` (чтобы button-дефолты не
     перебивали наследование).
   - `border: ` оставить как был (`1px solid rgba(255,255,255,0.08)`).

### B. Прокинуть topbarId

В `TopBar` (~строка 388):
```tsx
<AvatarPill name="Аня" isMobile={isMobile} isNarrowDesktop={compact} topbarId="avatar" />
```

### C. Order array

В keyboard handler (~строка 170):
```ts
const order = ["play", "friends-nav", "history", "friends-online", "room", "avatar"];
```

## Acceptance

- [ ] `npm run build` ОК.
- [ ] От `room` стрелка → → focus переходит на avatar.
- [ ] От `avatar` ← → возврат на room.
- [ ] От `avatar` → стопит (правый край).
- [ ] AvatarPill при focus показывает 3px белый ring.
- [ ] Hover/tap effects работают.
- [ ] Mobile (≤1024px) — Avatar как был (без надписи), no regression.

## QA через preview MCP

Claude проверит:
1. Pass через всю цепь play → ... → avatar.
2. boxShadow на avatar при focus = 3px white 60%.

## Контрольные точки

1. Diff в `function AvatarPill`, в TopBar (1 строка с topbarId), в order
   array (+1 элемент).
2. `npm run build`.
3. Заполнить `codex-reports/016-avatar-pill-button.md`.
4. Не коммитить.
