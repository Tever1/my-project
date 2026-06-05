# TASK-199: Альтернативные фоны для спец-квизов (#1 → *1.webp)

> **Метаданные**
> - **Дата создания:** 2026-06-02
> - **Сложность:** simple
> - **Запуск:** auto by Claude
> - **Зависит от тасков:** 196

---

## Цель

Использовать уже сгенерированные `harry-potter1.webp` / `marvel1.webp` —
на них сейчас никто не ссылается. Сделать их фонами самих спец-квизов #1,
оставив базовые `.webp` для экрана выбора темы (визуальное различие между
выбором темы и квизом).

---

## Контекст

`public/backgrounds/harry-potter1.webp` и `marvel1.webp` сгенерированы (TASK-196),
но `src/lib/quiz/index.ts` на них не ссылается. `SPECIAL_QUIZ_THEMES` (выбор темы)
и `SPECIAL_QUIZZES` (квиз #1) оба используют базовые `harry-potter.webp`/`marvel.webp`.

---

## Файлы к изменению (whitelist)

- `src/lib/quiz/index.ts` — в массиве `SPECIAL_QUIZZES` поменять `backgroundUrl`:
  - `harry-potter-1` → `/backgrounds/harry-potter1.webp`
  - `marvel-1` → `/backgrounds/marvel1.webp`
  - `SPECIAL_QUIZ_THEMES` НЕ трогать (остаются базовые `.webp`).

### НЕ ТРОГАТЬ

- `SPECIAL_QUIZ_THEMES`, `QUIZ_TOPICS` — без изменений.
- никакие файлы вне whitelist
- `CLAUDE.md`, `AGENTS.md`, `codex-tasks/**`, `.codex/**`

---

## Шаги реализации

1. В `SPECIAL_QUIZZES` заменить два `backgroundUrl` на `1`-варианты.

---

## Acceptance criteria

- [ ] `npm run lint` без новых ошибок
- [ ] `npx tsc --noEmit` зелёный
- [ ] `harry-potter-1` и `marvel-1` ссылаются на `*1.webp`
- [ ] `SPECIAL_QUIZ_THEMES` по-прежнему на базовых `.webp`

---

## Ограничения и подводные камни

- Файлы `*1.webp` уже существуют — не генерировать заново.
- Комментарии — английский.

---

## Контрольные точки для самопроверки Codex

1. `git diff src/lib/quiz/index.ts`.
2. `npm run lint` + `npx tsc --noEmit`.
3. Заполнить `codex-reports/199-special-quiz-alt-backgrounds.md`.
4. **Не коммитить.**
