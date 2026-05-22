# TASK-126: Quiz — применить выбранный дизайн

> **Метаданные**
> - **Дата создания:** 2026-05-21
> - **Сложность:** complex
> - **Запуск:** manual by user (Codex Desktop)
> - **Ожидаемое время Codex:** ~25 минут
> - **Зависит от тасков:** TASK-122

---

## Цель

Применить выбранные дизайн-варианты в `src/app/game/[roomId]/quiz/page.tsx`:
- **Кнопки ответов** → Вариант C (numbered, левая цветная полоска, без градиентов)
- **Отсчёт 3-2-1** → Вариант B (Framer Motion scale+glow, AnimatePresence)
- **Reveal правильного/неправильного** → Вариант B (анимированные checkmark/✕)
- **Счётчик ответивших** → Вариант A (оставить как есть: `{answeredCount}/{totalPlayers}`)

---

## Контекст

Пользователь просмотрел варианты на `/design-tokens` и выбрал финальный дизайн.
Сейчас квиз использует старые градиентные кнопки и `animate-bounce` на отсчёте.

---

## Файлы к изменению (whitelist)

- `src/app/game/[roomId]/quiz/page.tsx`

### НЕ ТРОГАТЬ

- все остальные файлы
- `src/components/ingame/**`
- `CLAUDE.md`, `AGENTS.md`

---

## Шаги реализации

### Шаг 1: Добавить импорт Framer Motion

**Найти** строку:
```tsx
'use client';
```

После неё добавить импорт (в начало списка импортов):
```tsx
import { motion, AnimatePresence } from 'framer-motion';
```

---

### Шаг 2: Удалить неиспользуемые константы

**Найти и удалить** оба блока:
```tsx
const OPTION_COLORS = [
  'from-blue-600/60 to-blue-500/40 border-blue-400/60',
  'from-emerald-600/60 to-emerald-500/40 border-emerald-400/60',
  'from-amber-600/60 to-amber-500/40 border-amber-400/60',
  'from-pink-600/60 to-pink-500/40 border-pink-400/60',
];

const OPTION_LABELS = ['A', 'B', 'C', 'D'];
```

---

### Шаг 3: Заменить отсчёт 3-2-1

**Найти** блок phase `countdown`:
```tsx
{gameState.phase === 'countdown' && (
  <div className="flex items-center justify-center py-24 animate-fade-in">
    <div className="text-center">
      <p className="text-white/80 text-lg mb-4">
        {locale === 'ru' ? 'Вопрос' : 'Question'} {gameState.questionIndex + 1}
      </p>
      <div key={gameState.countdownValue} className="text-8xl font-black text-white animate-bounce">
        {gameState.countdownValue}
      </div>
    </div>
  </div>
)}
```

**Заменить** на:
```tsx
{gameState.phase === 'countdown' && (
  <div className="flex items-center justify-center py-24 animate-fade-in">
    <div className="text-center">
      <p className="text-white/80 text-lg mb-4">
        {locale === 'ru' ? 'Вопрос' : 'Question'} {gameState.questionIndex + 1}
      </p>
      <AnimatePresence mode="wait">
        <motion.div
          key={gameState.countdownValue}
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: [0.5, 1.2, 1], opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0, y: -20 }}
          transition={{ duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
          style={{
            fontSize: 120,
            fontWeight: 900,
            color: '#facc15',
            textShadow: '0 0 40px rgba(250, 204, 21, 0.6), 0 0 80px rgba(250, 204, 21, 0.3)',
            lineHeight: 1,
          }}
        >
          {gameState.countdownValue}
        </motion.div>
      </AnimatePresence>
    </div>
  </div>
)}
```

---

### Шаг 4: Заменить кнопки ответов + reveal анимации (Вариант C + Вариант B)

**Найти** весь блок `{/* Answer options */}` от `<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">` до закрывающего `</div>` (после последнего `</button>`):

```tsx
{/* Answer options */}
<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
  {currentQuestion.options.map((option, index) => {
    const isMyAnswer = myAnswer === index;
    const isCorrectAnswer = index === currentQuestion.correctIndex;
    const isCorrectRevealed = gameState.showCorrect && isCorrectAnswer;
    const isWrongRevealed = gameState.showCorrect && isMyAnswer && !isCorrectAnswer;
    const isDisabled = myAnswer !== undefined || gameState.showCorrect;

    return (
      <button
        key={index}
        onClick={() => submitAnswer(index)}
        disabled={isDisabled}
        className={`
          relative overflow-hidden rounded-2xl border p-5 md:p-6 text-left transition-all duration-300
          ${isCorrectRevealed
            ? 'border-green-400 bg-green-500/40 ring-2 ring-green-400/50 backdrop-blur-2xl'
            : isWrongRevealed
              ? 'border-red-400 bg-red-500/40 ring-2 ring-red-400/50 backdrop-blur-2xl'
              : isMyAnswer
                ? 'border-purple-400 bg-purple-500/40 ring-2 ring-purple-400/50 backdrop-blur-2xl'
                : isDisabled
                  ? 'border-white/15 bg-white/10 backdrop-blur-2xl opacity-70'
                  : `bg-gradient-to-br ${OPTION_COLORS[index]} backdrop-blur-xl hover:scale-[1.02] active:scale-[0.98] cursor-pointer`
          }
        `}
      >
        <div className="flex items-center gap-4">
          <span className={`
            flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center text-base font-bold
            ${isCorrectRevealed
              ? 'bg-green-500/30 text-green-300'
              : isWrongRevealed
                ? 'bg-red-500/30 text-red-300'
                : 'bg-white/10 text-white/60'
            }
          `}>
            {isCorrectRevealed ? '✓' : isWrongRevealed ? '✕' : OPTION_LABELS[index]}
          </span>
          <span className="text-white font-medium text-lg md:text-xl">
            {locale === 'ru' ? option.ru : option.en}
          </span>
        </div>
      </button>
    );
  })}
</div>
```

**Заменить** на (Вариант C для кнопок + Вариант B для reveal анимации):

```tsx
{/* Answer options */}
<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
  {currentQuestion.options.map((option, index) => {
    const isMyAnswer = myAnswer === index;
    const isCorrectAnswer = index === currentQuestion.correctIndex;
    const isCorrectRevealed = gameState.showCorrect && isCorrectAnswer;
    const isWrongRevealed = gameState.showCorrect && isMyAnswer && !isCorrectAnswer;
    const isDisabled = myAnswer !== undefined || gameState.showCorrect;

    // Accent strip color (left border)
    const stripColor = isCorrectRevealed
      ? '#4ade80'
      : isWrongRevealed
        ? '#f87171'
        : isMyAnswer
          ? '#facc15'
          : 'transparent';

    // Button background
    const bgClass = isCorrectRevealed
      ? 'bg-green-500/10 border-green-400/30'
      : isWrongRevealed
        ? 'bg-red-500/10 border-red-400/30'
        : isMyAnswer
          ? 'bg-yellow-500/10 border-yellow-400/40'
          : isDisabled
            ? 'bg-white/5 border-white/10 opacity-60'
            : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20 cursor-pointer';

    return (
      <motion.button
        key={index}
        onClick={() => submitAnswer(index)}
        disabled={isDisabled}
        className={`relative overflow-hidden rounded-2xl border p-5 md:p-6 text-left backdrop-blur-xl transition-colors duration-200 ${bgClass}`}
        animate={
          isCorrectRevealed
            ? { scale: [1, 1.03, 1] }
            : isWrongRevealed
              ? { x: [-6, 6, -6, 0] }
              : { scale: 1, x: 0 }
        }
        transition={
          isCorrectRevealed
            ? { duration: 0.3, ease: [0.34, 1.56, 0.64, 1] }
            : isWrongRevealed
              ? { duration: 0.35, ease: 'easeInOut' }
              : { duration: 0.2 }
        }
        whileHover={!isDisabled ? { scale: 1.01 } : {}}
        whileTap={!isDisabled ? { scale: 0.98 } : {}}
      >
        {/* Left accent strip */}
        <div
          className="absolute left-0 top-3 bottom-3 w-1 rounded-full transition-colors duration-200"
          style={{ backgroundColor: stripColor }}
        />

        <div className="flex items-center gap-4 pl-3">
          {/* Number badge */}
          <span className={`
            flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center text-sm font-black
            ${isCorrectRevealed
              ? 'bg-green-500/20 text-green-300'
              : isWrongRevealed
                ? 'bg-red-500/20 text-red-300'
                : isMyAnswer
                  ? 'bg-yellow-500/20 text-yellow-300'
                  : 'bg-white/8 text-white/50'
            }
          `}>
            {index + 1}
          </span>

          {/* Answer text */}
          <span className={`font-medium text-lg md:text-xl ${
            isCorrectRevealed ? 'text-green-100' : isWrongRevealed ? 'text-red-100' : 'text-white'
          }`}>
            {locale === 'ru' ? option.ru : option.en}
          </span>

          {/* Reveal icon — checkmark or X (Variant B) */}
          <AnimatePresence>
            {(isCorrectRevealed || isWrongRevealed) && (
              <motion.span
                className="ml-auto flex-shrink-0"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.2, ease: [0.34, 1.56, 0.64, 1] }}
              >
                {isCorrectRevealed ? (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                )}
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      </motion.button>
    );
  })}
</div>
```

---

## Acceptance criteria

- [ ] `npm run lint` без ошибок (в т.ч. no unused variables — `OPTION_COLORS`, `OPTION_LABELS` удалены)
- [ ] `npm run build` успешен
- [ ] В phase `countdown` цифра жёлтая с glow, scale-анимация при смене
- [ ] В phase `question` кнопки — белые с левой полоской, без градиентов
- [ ] При выборе ответа — жёлтая полоска + жёлтый бейдж на выбранной кнопке
- [ ] При `showCorrect` — правильная кнопка scale-up + зелёная полоска + checkmark, неправильная shake + красная полоска + ✕

---

## Ограничения и подводные камни

- **`motion.button`** с `whileHover`/`whileTap` и `disabled` — передавай `disabled` через стандартный HTML-атрибут, не через motion props.
- **`AnimatePresence`** вокруг countdown number — нужен `mode="wait"` чтобы exit завершился до enter.
- **`bg-white/8`** — Tailwind v4 поддерживает произвольные opacity значения. Если линтер жалуется — заменить на `bg-white/10`.
- **Не трогать** логику `submitAnswer`, `revealResults`, `timerRef`, socket events — только JSX.
- **Счётчик ответивших** (`{answeredCount}/{totalPlayers}`) — не трогать, оставить как есть.
- **Комментарии в коде** — английский.

---

## Контрольные точки для самопроверки Codex

1. `git diff --stat` — только `src/app/game/[roomId]/quiz/page.tsx`.
2. Убедиться что `OPTION_COLORS` и `OPTION_LABELS` нигде не используются.
3. `npm run lint` — чисто.
4. Отчёт в `codex-reports/126-quiz-new-design.md`.
5. **Не коммитить.**
