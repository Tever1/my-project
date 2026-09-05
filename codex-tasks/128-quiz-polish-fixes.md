# TASK-128: Quiz polish — 5 fixes

> **Метаданные**
> - **Дата создания:** 2026-05-22
> - **Сложность:** complex
> - **Запуск:** manual by user (Codex Desktop)
> - **Ожидаемое время Codex:** ~10 минут
> - **Зависит от тасков:** TASK-126 (quiz redesign, merged), TASK-127 (bg variants preview, merged)

---

## Цель

Доработать дизайн квиза: убрать мерцание кнопок ответов, уменьшить их
border-radius, уменьшить таймер через новый размер `xs`, убрать эмодзи-иконку
из заголовка, убрать дублирующий счётчик раундов.

---

## Контекст

После TASK-126 (новый дизайн квиза) осталось 5 мелких доработок:

1. **Мерцание `motion.button`** — `animate` получает новый inline-объект каждую
   секунду (таймер пересчитывается), Framer Motion видит новую ссылку и
   перезапускает анимацию. Фикс: именованные `variants` + строки как `animate`.
2. **Border-radius кнопок** — `rounded-2xl` (16px) выглядит слишком круглым,
   нужен `rounded-xl` (12px).
3. **Таймер слишком большой** — `UrgencyTimer` с `size="sm"` занимает много места.
   Нужен новый размер `xs` (~56px diameter, stroke 5) — добавить в компонент.
4. **Эмодзи-иконка** в заголовке GameLayout (`icon="🧠"`) — убрать из квиза.
   Сделать `icon` проп опциональным (`icon?: string`), убрать render если не передан.
5. **Дублирующий счётчик** — квиз передаёт `round` и `totalRounds` в GameLayout,
   что даёт надпись «Раунд N/10» в хедере. В квизе этот счётчик не нужен
   (номер вопроса виден в другом месте). Убрать эти пропы из вызова GameLayout.

---

## Файлы к изменению (whitelist)

- `src/components/ingame/UrgencyTimer.tsx` — добавить размер `xs`
- `src/components/games/GameLayout.tsx` — сделать `icon` опциональным
- `src/app/game/[roomId]/quiz/page.tsx` — применить все 5 правок

### НЕ ТРОГАТЬ

- `src/app/tv/[roomId]/[gameType]/page.tsx` — TV-режим не касаемся
- `src/app/game/[roomId]/alias/page.tsx` — не трогаем, особенно classic mode
- `src/lib/quiz/` — данные вопросов не трогаем
- `CLAUDE.md`, `AGENTS.md`
- все остальные файлы вне whitelist

---

## Шаги реализации

### 1. `UrgencyTimer.tsx` — добавить размер `xs`

Найти объект/map с размерами (`sm`, `md`, `lg`). Добавить:

```ts
xs: { diameter: 56, stroke: 5, fontSize: '0.85rem' }
```

(точные имена полей — смотри как устроены существующие размеры в файле)

### 2. `GameLayout.tsx` — сделать `icon` опциональным

Изменить тип пропа с `icon: string` на `icon?: string`.

В теле компонента: render блока с иконкой делать только если `icon` передан:

```tsx
{icon && <span className="text-2xl">{icon}</span>}
```

(найди точное место рендера иконки и оберни в условие)

### 3. `quiz/page.tsx` — fix #1: именованные variants на `motion.button`

Текущий код (строки ~1046-1062) использует inline `animate` объект, который
пересоздаётся каждый рендер. Заменить на именованные variants:

```tsx
const answerVariants = {
  idle: { scale: 1, x: 0 },
  correct: { scale: [1, 1.03, 1] },
  wrong: { x: [-6, 6, -6, 0] },
};

// В JSX:
<motion.button
  variants={answerVariants}
  animate={isCorrectRevealed ? 'correct' : isWrongRevealed ? 'wrong' : 'idle'}
  transition={...}
  ...
>
```

`answerVariants` можно объявить один раз вне компонента (константа уровня модуля).

Переходы (`transition`) оставить inline как сейчас, но привязать к текущему
`animate`-значению через объект или сохранить тот же паттерн.

### 4. `quiz/page.tsx` — fix #2: border-radius кнопок ответов

Заменить `rounded-2xl` → `rounded-xl` в className кнопок ответов (строка ~1050
и соседние кнопки в setup-фазах, если там тоже `rounded-2xl` — менять везде
в этом файле последовательно).

**Важно:** менять только в `quiz/page.tsx`, не в других файлах.

### 5. `quiz/page.tsx` — fix #3: переключить UrgencyTimer на `xs`

Найти `<UrgencyTimer ... size="sm"` и изменить на `size="xs"`.

### 6. `quiz/page.tsx` — fix #4: убрать `icon` из GameLayout

Найти `<GameLayout ... icon="🧠"` и убрать проп `icon`.

### 7. `quiz/page.tsx` — fix #5: убрать `round` и `totalRounds`

Найти пропы `round={...}` и `totalRounds={...}` в вызове `<GameLayout` и убрать их.

---

## Acceptance criteria

- [ ] `npm run lint` без новых ошибок
- [ ] `npm run build` успешен
- [ ] В `UrgencyTimer` появился размер `xs`
- [ ] `GameLayout.icon` опционален (`icon?: string`), без иконки — нет пустого места
- [ ] В квизе нет `icon="🧠"` и нет `round`/`totalRounds` в GameLayout
- [ ] В квизе нет инлайн-объектов в `animate` у `motion.button`
- [ ] Все кнопки ответов в квизе: `rounded-xl` (не `rounded-2xl`)
- [ ] `UrgencyTimer` в квизе использует `size="xs"`

---

## Ограничения и подводные камни

- **Framer Motion spring** не поддерживает 3-keyframe массивы — используй
  `tween` с `ease: [0.34, 1.56, 0.64, 1]` если нужна кастомная кривая.
- **`icon` в других играх** — они передают `icon` в GameLayout. После того как
  проп стал опциональным, их код не ломается — просто убедись.
- **`rounded-2xl` в setup-фазах** — не трогай кнопки выбора сложности/темы если
  там другой контекст (только кнопки ответов игровой фазы).
- Комментарии в коде — только английский.
- Не коммить.

---

## Открытые вопросы для Codex

- Точные размерные поля в `UrgencyTimer` (diameter, stroke, fontSize или другие
  имена) — смотри существующие `sm`/`md`/`lg` и зеркали структуру.
- Если `transition` в `motion.button` привязан к конкретным вариантам
  (`isCorrectRevealed` / `isWrongRevealed`) — вынести логику в `variants.correct`
  и `variants.wrong` включая transition-поля, это допустимо в Framer Motion.

---

## Контрольные точки для самопроверки Codex

1. `git diff --stat` — только 3 файла из whitelist.
2. `npm run lint` — 0 новых ошибок.
3. `npm run build` — успешен.
4. Заполнить отчёт `codex-reports/128-quiz-polish-fixes.md`.
5. **Не коммитить.**
