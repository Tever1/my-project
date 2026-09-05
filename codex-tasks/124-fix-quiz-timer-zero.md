# TASK-124: Fix quiz timer — десктоп застревает на 1

> **Метаданные**
> - **Дата создания:** 2026-05-21
> - **Сложность:** simple
> - **Запуск:** manual by user (Codex Desktop)
> - **Ожидаемое время Codex:** ~5 минут
> - **Зависит от тасков:** —

---

## Цель

Хост (мобильный) не рассылает `quiz:timer` с `timeLeft: 0` гостям.
Гости (десктоп) получают последнее значение `1` и таймер застревает.
Добавить emit `timeLeft: 0` перед остановкой интервала.

---

## Файлы к изменению (whitelist)

- `src/app/game/[roomId]/quiz/page.tsx`

### НЕ ТРОГАТЬ

- все остальные файлы
- `CLAUDE.md`, `AGENTS.md`

---

## Шаги реализации

**Найти** в host timer logic (функция внутри `useEffect`, примерно строка 233):

```tsx
if (next <= 0) {
  if (timerRef.current) clearInterval(timerRef.current);
  return { ...prev, timeLeft: 0 };
}
emit('game:action', {
  code: roomId,
  action: 'quiz:timer',
  payload: { timeLeft: next },
});
return { ...prev, timeLeft: next };
```

**Заменить** на (добавить emit перед очисткой интервала):

```tsx
if (next <= 0) {
  if (timerRef.current) clearInterval(timerRef.current);
  emit('game:action', {
    code: roomId,
    action: 'quiz:timer',
    payload: { timeLeft: 0 },
  });
  return { ...prev, timeLeft: 0 };
}
emit('game:action', {
  code: roomId,
  action: 'quiz:timer',
  payload: { timeLeft: next },
});
return { ...prev, timeLeft: next };
```

---

## Acceptance criteria

- [ ] `npm run lint` без ошибок
- [ ] В коде нет других изменений кроме добавления emit в `next <= 0` ветку

---

## Контрольные точки для самопроверки Codex

1. `git diff` — только добавление emit в одном месте.
2. `npm run lint` — чисто.
3. Отчёт в `codex-reports/124-fix-quiz-timer-zero.md`.
4. **Не коммитить.**
