# TASK-122: Quiz — интеграция in-game polish компонентов

> **Метаданные**
> - **Дата создания:** 2026-05-21
> - **Сложность:** complex
> - **Запуск:** manual by user (Codex Desktop)
> - **Ожидаемое время Codex:** ~20 минут
> - **Зависит от тасков:** TASK-120, TASK-121

---

## Цель

Интегрировать 4 компонента Phase G в `src/app/game/[roomId]/quiz/page.tsx`:
- `UrgencyTimer` (variant="ring") — вместо текущего прогресс-бара таймера
- `CelebrationBurst` (variant="flash") — при правильном ответе
- `AnimatedScore` (variant="pop") — в таблицах очков
- `BreathingPlaceholder` (variant="breathing-text") — во всех состояниях ожидания

---

## Контекст

Phase G in-game polish. Компоненты созданы в TASK-120 и живут в
`src/components/ingame/`. Сейчас квиз использует статичные HTML-элементы
для таймера, очков и состояний ожидания.

---

## Файлы к изменению (whitelist)

- `src/app/game/[roomId]/quiz/page.tsx` — только этот файл

### НЕ ТРОГАТЬ

- `src/components/ingame/**` — компоненты уже готовы, не трогать
- `src/app/tv/**` — TV-режим — отдельный таск
- все остальные файлы
- `CLAUDE.md`, `AGENTS.md`

---

## Шаги реализации

### Шаг 1: Добавить импорт

В начало файла (после существующих импортов) добавить:
```tsx
import { UrgencyTimer, AnimatedScore, CelebrationBurst, BreathingPlaceholder } from '@/components/ingame';
```

---

### Шаг 2: Заменить таймер-бар на UrgencyTimer

**Найти** блок (phase `question`, начинается с `{/* Timer bar */}`):
```tsx
{/* Timer bar */}
<div className="mb-6">
  <div className="flex items-center justify-between mb-2">
    <span className="text-sm text-white/40">
      {locale === 'ru' ? 'Вопрос' : 'Question'} {gameState.questionIndex + 1}/{gameState.totalQuestions}
    </span>
    <span className={`text-lg font-bold ${gameState.timeLeft <= 5 ? 'text-red-400' : 'text-white/70'}`}>
      {gameState.timeLeft}s
    </span>
  </div>
  <div className="w-full h-3 rounded-full bg-white/10 overflow-hidden">
    <div
      className={`h-full rounded-full transition-all duration-1000 ease-linear ${
        gameState.timeLeft <= 5 ? 'bg-red-500' : 'bg-purple-500'
      }`}
      style={{ width: `${(gameState.timeLeft / timePerQuestion) * 100}%` }}
    />
  </div>
</div>
```

**Заменить** на:
```tsx
{/* Timer */}
<div className="mb-6 flex items-center justify-between">
  <span className="text-sm text-white/40">
    {locale === 'ru' ? 'Вопрос' : 'Question'} {gameState.questionIndex + 1}/{gameState.totalQuestions}
  </span>
  <UrgencyTimer
    total={timePerQuestion}
    current={gameState.timeLeft}
    variant="ring"
    color="var(--color-game-quiz)"
    size="sm"
  />
</div>
```

---

### Шаг 3: Добавить CelebrationBurst в question phase

**Найти** открывающий div фазы question:
```tsx
{gameState.phase === 'question' && currentQuestion && (
  <div className="max-w-5xl mx-auto w-full">
```

**Заменить** на (добавить `relative` и `CelebrationBurst` первым дочерним элементом):
```tsx
{gameState.phase === 'question' && currentQuestion && (
  <div className="max-w-5xl mx-auto w-full relative">
    <CelebrationBurst
      trigger={gameState.showCorrect && gameState.correctPlayers.length > 0}
      variant="flash"
      color="var(--color-game-quiz)"
    />
```

Остальное содержимое блока остаётся без изменений — просто добавляем `relative`
к div и вставляем `<CelebrationBurst>` как первый дочерний элемент.

---

### Шаг 4: AnimatedScore в mid-leaderboard

**Найти** в блоке `gameState.phase === 'mid-leaderboard'` строку:
```tsx
<span className="text-purple-400 font-bold text-xl">{entry.score}</span>
```

**Заменить** на:
```tsx
<AnimatedScore value={entry.score} variant="pop" size="sm" color="#a855f7" />
```

---

### Шаг 5: AnimatedScore в final leaderboard

**Найти** в блоке `gameState.phase === 'final'` строку (та же что в шаге 4, но в другом блоке):
```tsx
<span className="text-purple-400 font-bold text-xl">{entry.score}</span>
```

**Заменить** на:
```tsx
<AnimatedScore value={entry.score} variant="pop" size="sm" color="#a855f7" />
```

---

### Шаг 6: BreathingPlaceholder для состояний ожидания

Заменить все 7 мест где не-хост видит статичный текст ожидания:

**Место 1** — фаза `setup-mode`, блок `!isHost`:
```tsx
<p className="text-white/40 italic">
  {locale === 'ru' ? 'Ведущий выбирает тип квиза...' : 'Host is choosing quiz type...'}
</p>
```
→
```tsx
<BreathingPlaceholder
  text={locale === 'ru' ? 'Ведущий выбирает тип квиза...' : 'Host is choosing quiz type...'}
  variant="breathing-text"
/>
```

**Место 2** — фаза `setup-difficulty`, блок `!isHost`:
```tsx
<p className="text-white/40 italic">
  {locale === 'ru' ? 'Ведущий выбирает сложность...' : 'Host is choosing difficulty...'}
</p>
```
→
```tsx
<BreathingPlaceholder
  text={locale === 'ru' ? 'Ведущий выбирает сложность...' : 'Host is choosing difficulty...'}
  variant="breathing-text"
/>
```

**Место 3** — фаза `setup-special-theme`, блок `!isHost`:
```tsx
<p className="text-white/70 italic">
  {locale === 'ru' ? 'Ведущий выбирает тему...' : 'Host is choosing a theme...'}
</p>
```
→
```tsx
<BreathingPlaceholder
  text={locale === 'ru' ? 'Ведущий выбирает тему...' : 'Host is choosing a theme...'}
  variant="breathing-text"
/>
```

**Место 4** — фаза `setup-special-quiz`, блок `!isHost`:
```tsx
<p className="text-white/70 italic">
  {locale === 'ru' ? 'Ведущий выбирает квиз...' : 'Host is choosing a quiz...'}
</p>
```
→
```tsx
<BreathingPlaceholder
  text={locale === 'ru' ? 'Ведущий выбирает квиз...' : 'Host is choosing a quiz...'}
  variant="breathing-text"
/>
```

**Место 5** — фаза `setup-topic`, блок `!isHost`:
```tsx
<div className="text-white/40 italic">
  <p>{locale === 'ru' ? 'Ведущий выбирает тему...' : 'Host is choosing topic...'}</p>
</div>
```
→
```tsx
<BreathingPlaceholder
  text={locale === 'ru' ? 'Ведущий выбирает тему...' : 'Host is choosing topic...'}
  variant="breathing-text"
/>
```

**Место 6** — фаза `waiting`, блок `!isHost`:
```tsx
<p className="text-white/40 italic text-xl">
  {locale === 'ru' ? 'Ожидание ведущего...' : 'Waiting for the host...'}
</p>
```
→
```tsx
<BreathingPlaceholder
  text={locale === 'ru' ? 'Ожидание ведущего...' : 'Waiting for the host...'}
  variant="breathing-text"
/>
```

**Место 7** — фаза `mid-leaderboard`, блок `!isHost`:
```tsx
<p className="text-white/40 italic">
  {locale === 'ru' ? 'Ожидание ведущего...' : 'Waiting for the host...'}
</p>
```
→
```tsx
<BreathingPlaceholder
  text={locale === 'ru' ? 'Ожидание ведущего...' : 'Waiting for the host...'}
  variant="breathing-text"
/>
```

---

## Acceptance criteria

- [ ] `npm run lint` без новых ошибок
- [ ] `npm run build` успешен
- [ ] В phase `question` таймер отображается как ring (SVG-кольцо) а не прогресс-бар
- [ ] В phase `question` при `showCorrect=true` и наличии правильных ответов — flash-вспышка
- [ ] В таблицах очков (mid-leaderboard, final) числа используют pop-анимацию
- [ ] Во всех 7 местах ожидания не-хост видит `BreathingPlaceholder` вместо статичного текста

---

## Ограничения и подводные камни

- **`var(--color-game-quiz)`** задан в `src/app/globals.css` как `#facc15` —
  использовать именно CSS-переменную, не хардкодить hex.
- **`CelebrationBurst` требует `position: relative` на родителе** — не забыть
  добавить `relative` к `<div className="max-w-5xl mx-auto w-full">`.
- **Не менять логику таймера** — только визуальное отображение. `timePerQuestion`,
  `gameState.timeLeft`, `timerRef` — не трогать.
- **Не менять `scoreboard`** — только UI отображения `entry.score`.
- **Два места с `entry.score`** — и в `mid-leaderboard`, и в `final`. Оба заменить.
- **Комментарии в коде** — английский.

---

## Контрольные точки для самопроверки Codex

1. `git diff --stat` — только `src/app/game/[roomId]/quiz/page.tsx`.
2. `npm run lint` — чисто.
3. `npm run build` — успешен.
4. Отчёт в `codex-reports/122-quiz-ingame-polish.md`.
5. **Не коммитить.**

---

## Открытые вопросы для Codex

- Если TypeScript ругается на `color="var(--color-game-quiz)"` (строка с CSS var) —
  это нормально, `color` prop типизирован как `string`, CSS var — валидная строка.
- Если `CelebrationBurst` видит `trigger` уже `true` при маунте — это нормально,
  компонент проверяет `useEffect` на изменение `trigger`.
