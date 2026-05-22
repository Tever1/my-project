# TASK-123: Убрать CelebrationBurst из квиза

> **Метаданные**
> - **Дата создания:** 2026-05-21
> - **Сложность:** simple
> - **Запуск:** manual by user (Codex Desktop)
> - **Ожидаемое время Codex:** ~5 минут
> - **Зависит от тасков:** TASK-122

---

## Цель

Удалить `CelebrationBurst` из `src/app/game/[roomId]/quiz/page.tsx`.
Вспышка при правильном ответе выглядит странно — пользователь отказался от неё.

---

## Файлы к изменению (whitelist)

- `src/app/game/[roomId]/quiz/page.tsx`

### НЕ ТРОГАТЬ

- `src/components/ingame/CelebrationBurst.tsx` — компонент остаётся, просто не используется
- все остальные файлы
- `CLAUDE.md`, `AGENTS.md`

---

## Шаги реализации

### Шаг 1: Убрать `CelebrationBurst` из импорта

**Найти:**
```tsx
import { UrgencyTimer, AnimatedScore, CelebrationBurst, BreathingPlaceholder } from '@/components/ingame';
```

**Заменить на:**
```tsx
import { UrgencyTimer, AnimatedScore, BreathingPlaceholder } from '@/components/ingame';
```

### Шаг 2: Убрать JSX-тег `<CelebrationBurst>`

**Найти и удалить** эти строки из phase `question`:
```tsx
<CelebrationBurst
  trigger={gameState.showCorrect && gameState.correctPlayers.length > 0}
  variant="flash"
  color="var(--color-game-quiz)"
/>
```

Класс `relative` на родительском div оставить — он не мешает.

---

## Acceptance criteria

- [ ] `npm run lint` без ошибок (в т.ч. no unused imports)
- [ ] Страница квиза компилируется без ошибок

---

## Контрольные точки для самопроверки Codex

1. `git diff` — только удаление импорта и JSX-тега.
2. `npm run lint` — чисто.
3. Отчёт в `codex-reports/123-remove-celebration-burst-quiz.md`.
4. **Не коммитить.**
