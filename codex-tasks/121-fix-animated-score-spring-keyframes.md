# TASK-121: Fix AnimatedScore — spring не поддерживает 3 кадра

> **Метаданные**
> - **Дата создания:** 2026-05-21
> - **Сложность:** simple
> - **Запуск:** manual by user (Codex Desktop)
> - **Ожидаемое время Codex:** ~5 минут
> - **Зависит от тасков:** TASK-120

---

## Цель

Убрать runtime-ошибку в `AnimatedScore.tsx`:
> Only two keyframes currently supported with spring and inertia animations.
> Trying to animate 1,1.25,1

---

## Контекст

Framer Motion не поддерживает массив из 3 значений (`[1, 1.25, 1]`)
совместно с `type: "spring"`. В `AnimatedScore` для `pop` / `countup-pop`
вариантов `animate={{ scale: [1, 1.25, 1] }}` использует `transition={spring.snappy}` —
это и вызывает ошибку.

---

## Файлы к изменению (whitelist)

- `src/components/ingame/AnimatedScore.tsx` — исправить transition для keyframe-анимации

### НЕ ТРОГАТЬ

- все остальные файлы
- `CLAUDE.md`, `AGENTS.md`

---

## Шаги реализации

В `AnimatedScore.tsx` найти строку:

```tsx
transition={spring.snappy}
```

Заменить на условный transition — spring только для `countup` (где scale: 1, один кадр),
tween для `pop` / `countup-pop` (где scale: [1, 1.25, 1], три кадра):

```tsx
transition={
  variant === "countup"
    ? spring.snappy
    : { duration: 0.3, ease: [0.34, 1.56, 0.64, 1] }
}
```

Easing `[0.34, 1.56, 0.64, 1]` — кубическая кривая с небольшим overshoot,
визуально близкая к spring.snappy, но совместимая с keyframe-массивами.

---

## Acceptance criteria

- [ ] Страница `/ingame-preview` открывается без ошибки в консоли
- [ ] Pop-анимация на AnimatedScore работает при нажатии кнопок +1 / +10 / -5
- [ ] `npm run lint` без ошибок

---

## Контрольные точки для самопроверки Codex

1. `git diff src/components/ingame/AnimatedScore.tsx` — только transition строка изменилась.
2. `npm run lint` — чисто.
3. Отчёт в `codex-reports/121-fix-animated-score-spring-keyframes.md`.
4. **Не коммитить.**
