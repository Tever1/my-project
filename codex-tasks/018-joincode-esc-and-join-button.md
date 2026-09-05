# TASK-018: Join-code — Esc для выхода + «Присоединиться» при 6 символах

> **Сложность:** simple-medium
> **Запуск:** auto by Claude

## Цели

### A. Two-stage focus на join-code input
- Сейчас: стрелка → с «Правила» фокусирует input → пользователь может
  печатать. Но не может стрелкой ← вернуться на «Правила» (стрелки в
  input двигают курсор).
- Нужно: после input в режиме editing, **Esc** — переходит в «selected»
  режим: input теряет focus (нет курсора), но вокруг wrapper появляется
  visible focus ring. Из этого режима стрелка ← → focus на «Правила»,
  стрелка → или Enter → возврат в editing mode.

### B. «Присоединиться» button при 6 символах
- Когда `joinCode.length === 6`, **справа от input** появляется кнопка
  «Присоединиться» (motion.button с per-game accent или green).
- Добавить её в CTA keyboard order: `[start, rules, join-code, join-submit]`.
- onClick: пока `console.log("join room", joinCode)`.

## Файлы

- `src/app/lobby-preview/page.tsx` — только.

## Шаги

### Шаг 1: Структура wrapper для join-code

Сейчас структура (упрощённо):
```tsx
<div /* wrapper, dashed border */>
  <div /* column */>
    <span>Код комнаты</span>
    <input data-lobby-cta="join-code" ... />
  </div>
</div>
```

Изменить:
- Внешний `<div>` (dashed border wrapper) → `<button type="button">` с
  `tabIndex={-1}`, `data-lobby-cta="join-code"` (перенести с input!),
  ref `joinWrapperRef`. Это будет точка входа со стрелок.
- Input получает `data-lobby-cta="join-code-input"` (новый id, не в
  главном CTA order).
- На wrapper-button добавить state `[wrapperFocused, setWrapperFocused]`.
- На wrapper:
  - `onFocus={() => { setWrapperFocused(true); inputRef.current?.focus(); }}`
    — при попадании focus на wrapper, сразу forwarded на input
    (auto-enter editing mode).
  - `onBlur={() => setWrapperFocused(false)}`.
  - boxShadow: `wrapperFocused || inputFocused ? '0 0 0 3px ${...}' : 'none'`
    — ring всегда виден когда либо wrapper, либо input в фокусе.
  - cursor: 'text'.

Hmm, проблема: если wrapper.onFocus всегда forwarded → input.focus(), то
при Esc мы хотим перейти на wrapper БЕЗ forward'а обратно. Решение:
сделать forward условным через флаг.

### Финальная схема

```tsx
const [editing, setEditing] = useState(false);
const inputRef = useRef<HTMLInputElement>(null);
const wrapperRef = useRef<HTMLButtonElement>(null);

// onFocus wrapper: forward to input ONLY if not in "selected" mode
const handleWrapperFocus = () => {
  // If we're transitioning to wrapper after Esc, don't re-forward
  if (!editing && wrapperRef.current === document.activeElement) {
    // We're "selected" mode — do nothing
    return;
  }
  // First-time entry from arrow nav
  setEditing(true);
  inputRef.current?.focus();
};
```

Это сложно. Простой подход:
- Wrapper получает focus → проверяем флаг `viaEsc`. Если viaEsc=true, не
  forward'им (selected mode). Иначе forward'им.
- При Esc: setViaEsc(true), wrapper.focus(). После focus сбрасываем флаг
  через setTimeout(setViaEsc(false), 0), чтобы следующий focus снова
  forward'ил.

```tsx
const viaEscRef = useRef(false);
const inputRef = useRef<HTMLInputElement>(null);
const wrapperRef = useRef<HTMLButtonElement>(null);

const handleWrapperFocus = () => {
  if (viaEscRef.current) {
    viaEscRef.current = false;
    return; // Stay on wrapper (selected mode)
  }
  inputRef.current?.focus(); // Forward to input
};

const handleInputKeyDown = (e: React.KeyboardEvent) => {
  if (e.key === "Escape") {
    e.preventDefault();
    viaEscRef.current = true;
    wrapperRef.current?.focus();
  }
};

const handleWrapperKeyDown = (e: React.KeyboardEvent) => {
  if (e.key === "ArrowLeft") {
    e.preventDefault();
    document.querySelector<HTMLElement>('[data-lobby-cta="rules"]')?.focus();
  } else if (e.key === "ArrowRight" || e.key === "Enter") {
    e.preventDefault();
    inputRef.current?.focus();
  }
};
```

### Шаг 2: «Присоединиться» button

После wrapper-button добавить условный motion.button:
```tsx
{joinCode.length === 6 && (
  <motion.button
    data-lobby-cta="join-submit"
    onClick={() => console.log("join room", joinCode)}
    whileHover={{ scale: 1.03, y: -2 }}
    whileTap={{ scale: 0.97 }}
    transition={spring.snappy}
    onFocus={() => setSubmitFocused(true)}
    onBlur={() => setSubmitFocused(false)}
    style={{
      height: isMobile ? 54 : 60,
      padding: isMobile ? "0 22px" : "0 28px",
      fontSize: isMobile ? 16 : 17,
      fontWeight: 700,
      borderRadius: radius.md,
      background: `linear-gradient(180deg, ${accent}, ${deep})`,
      color: "white",
      border: `1px solid color-mix(in srgb, ${accent} 60%, white)`,
      boxShadow: submitFocused
        ? `0 0 0 3px rgba(255,255,255,0.7), 0 12px 32px -8px ${accent}99`
        : `0 12px 32px -8px ${accent}99, inset 0 1px 0 rgba(255,255,255,0.35)`,
      cursor: "pointer",
      letterSpacing: "-0.01em",
      fontFamily: "inherit",
      outline: "none",
    }}
  >
    Присоединиться
  </motion.button>
)}
```

### Шаг 3: Расширить CTA order в keyboard handler

В keyboard handler, найти ветку с CTA-order (после TASK-017):
```ts
const ctaOrder = ["start", "rules", "join-code"];
```
Заменить на:
```ts
const ctaOrder = joinCode.length === 6
  ? ["start", "rules", "join-code", "join-submit"]
  : ["start", "rules", "join-code"];
```

`joinCode` доступен в scope hook'а через `[joinCode, setJoinCode]` —
добавить в deps array `useEffect` (`[..., joinCode]`).

## Acceptance criteria

- [ ] `npm run build` ОК.
- [ ] От «Правила» → → input editing mode (cursor виден, можно печатать).
- [ ] В input печатаем 6 символов → справа появляется кнопка
      «Присоединиться».
- [ ] Esc в input → input теряет focus, на wrapper виден focus ring.
- [ ] ← на selected wrapper → focus на «Правила».
- [ ] → на selected wrapper → возврат в editing mode (input focused,
      cursor).
- [ ] При 6 символах → → → с input → join-submit (если из selected
      wrapper). Из editing input стрелки нативные — Esc сначала.
- [ ] join-submit click → console.log "join room ABXY7K".

## QA через preview MCP

1. Type "ABXY7K" via dispatching input events → проверить появление
   join-submit button.
2. Esc → wrapper focused, ring visible.
3. ← from wrapper → rules.
4. Tab to wrapper → forward to input → editing mode.

## Контрольные точки

1. Diff в JoinCode wrapper, добавление JoinSubmit button, расширение
   CTA order.
2. `npm run build`.
3. Заполнить `codex-reports/018-joincode-esc-and-join-button.md`.
4. Не коммитить.
