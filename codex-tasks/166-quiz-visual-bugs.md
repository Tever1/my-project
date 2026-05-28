# TASK-166 — Квиз: фон / отсчёт / дизайн ответов

## Контекст

Три визуальных бага в квизе (обнаружены пользователем):

1. **Фон прогружается рывками** — CSS `backgroundImage` на root div не имеет
   приоритетной загрузки. Браузер рендерит PNG по 1/3 экрана по мере прихода байтов.
2. **Мерцание отсчёта на телефоне** — `AnimatePresence mode="wait"` создаёт
   пустой gap между exit и enter цифры (3→2→1). Мерцание.
3. **TV и телефон: разная анимация и дизайн ответов** — TV использует CSS
   `animate-bounce` + цветные градиентные плитки. Телефон — Framer Motion
   spring + glass-кнопки с левой полоской. Нужно унифицировать оба места.

## Whitelist файлов

**Изменить:**
- `src/components/games/GameLayout.tsx`
- `src/app/game/[roomId]/quiz/page.tsx`
- `src/app/tv/[roomId]/[gameType]/page.tsx`

**Создать:**
- `codex-reports/166-quiz-visual-bugs.md`

**НЕЛЬЗЯ трогать:** всё остальное.

---

## Баг 1: Фон прогружается рывками

### Где
`src/components/games/GameLayout.tsx` (~строка 44-46) и
`src/app/tv/[roomId]/[gameType]/page.tsx` (~строка 488-490) — оба
устанавливают `backgroundImage` через inline style на root div.

### Исправление — оба файла одинаково

Вместо CSS `backgroundImage` на root div, добавить `<img>` с
`position:absolute, inset:0, objectFit:cover, fetchPriority="high"`
позади контента:

**В GameLayout.tsx** заменить:
```tsx
<div
  className={`bg-gradient-main min-h-[100dvh] text-white flex flex-col relative ${backgroundUrl ? '[text-shadow:_0_2px_8px_rgb(0_0_0_/_80%)]' : ''}`}
  style={backgroundUrl ? { backgroundImage: `url(${backgroundUrl})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' } : undefined}
>
```

На:
```tsx
<div
  className={`bg-gradient-main min-h-[100dvh] text-white flex flex-col relative ${backgroundUrl ? '[text-shadow:_0_2px_8px_rgb(0_0_0_/_80%)]' : ''}`}
>
  {backgroundUrl && (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={backgroundUrl}
      alt=""
      fetchPriority="high"
      className="absolute inset-0 w-full h-full object-cover -z-10"
      aria-hidden="true"
    />
  )}
```

**В TV-странице** найти аналогичный root div с `backgroundImage` inline style
(~строка 488) и применить точно такой же паттерн: убрать `backgroundImage` из
`style`, добавить `<img fetchPriority="high" className="absolute inset-0 ...">`.

**Важно:** root div должен оставаться `relative` (он уже такой), чтобы `absolute`
img позиционировался внутри него. Класс `-z-10` на img гарантирует что
контент поверх.

---

## Баг 2: Мерцание отсчёта на телефоне

### Где
`src/app/game/[roomId]/quiz/page.tsx` — секция countdown (~строки 1006-1023):

```tsx
<AnimatePresence mode="wait">
  <motion.div
    key={gameState.countdownValue}
    initial={{ scale: 0.5, opacity: 0 }}
    animate={{ scale: [0.5, 1.2, 1], opacity: 1 }}
    exit={{ scale: 0.8, opacity: 0, y: -20 }}
    transition={{ duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
    ...
  >
    {gameState.countdownValue}
  </motion.div>
</AnimatePresence>
```

### Исправление

Заменить `mode="wait"` на `mode="popLayout"` чтобы убрать gap:

```tsx
<AnimatePresence mode="popLayout">
  <motion.div
    key={gameState.countdownValue}
    initial={{ scale: 0.5, opacity: 0 }}
    animate={{ scale: [0.5, 1.2, 1], opacity: 1 }}
    exit={{ scale: 0.8, opacity: 0 }}
    transition={{ duration: 0.3, ease: [0.34, 1.56, 0.64, 1] }}
    ...
  >
    {gameState.countdownValue}
  </motion.div>
</AnimatePresence>
```

Изменения: `mode="popLayout"`, убран `y: -20` из exit (лишнее при popLayout),
duration сокращён до 0.3.

---

## Баг 3: TV — привести анимацию отсчёта и дизайн ответов к телефону

### 3a. Анимация отсчёта на TV

**Где:** `src/app/tv/[roomId]/[gameType]/page.tsx` ~строка 573-582:

```tsx
{quizState.phase === 'countdown' && (
  <div className="text-center animate-fade-in">
    ...
    <div key={quizState.countdownValue} className="... animate-bounce">
      {quizState.countdownValue}
    </div>
  </div>
)}
```

**Исправление** — использовать Framer Motion как на телефоне:

```tsx
{quizState.phase === 'countdown' && (
  <div className="text-center animate-fade-in">
    <p className="text-2xl text-white/50 mb-4">
      {locale === 'ru' ? 'Вопрос' : 'Question'} {quizState.questionIndex + 1}
    </p>
    <AnimatePresence mode="popLayout">
      <motion.div
        key={quizState.countdownValue}
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: [0.5, 1.2, 1], opacity: 1 }}
        exit={{ scale: 0.8, opacity: 0 }}
        transition={{ duration: 0.3, ease: [0.34, 1.56, 0.64, 1] }}
        className="text-[clamp(5rem,18vh,12rem)] font-black leading-none"
        style={{
          color: '#facc15',
          textShadow: '0 0 40px rgba(250, 204, 21, 0.6), 0 0 80px rgba(250, 204, 21, 0.3)',
        }}
      >
        {quizState.countdownValue}
      </motion.div>
    </AnimatePresence>
  </div>
)}
```

TV страница уже импортирует `motion, AnimatePresence` из framer-motion — проверь
импорт и при необходимости добавь `AnimatePresence` к импорту.

### 3b. Дизайн ответов на TV

TV ответы (~строки 604-638) сейчас используют разные цветовые классы через
`OPTION_COLORS_TV`. Это нормально для TV (не интерактивные). Но нужно унифицировать
**типографику и структуру**: на TV text-размер и отступы должны быть сопоставимы
с телефоном.

Конкретно в TV ответах:
- Буква (A/B/C/D) в левом квадрате: `w-10 h-10` → оставить, но поменять
  `text-lg font-black` → `text-xl font-black`
- Текст ответа: `text-xl font-semibold` → оставить (уже крупный для TV)
- Padding: `p-4` → оставить (для TV нормально)

Это минимальная правка: **только буква чуть крупнее** (`text-lg` → `text-xl`).
Цвета и структура ответов на TV остаются как есть — они оправданы для
большого экрана.

Для телефона: ответы в `src/app/game/[roomId]/quiz/page.tsx` (~строки 1081-1130)
уже используют glass-кнопки с буквенными метками. Их трогать не нужно.

---

## Acceptance

```bash
# GameLayout: нет backgroundImage inline style на root div
grep -n "backgroundImage" src/components/games/GameLayout.tsx
# → только в img src, не в style prop div'а

# TV: нет backgroundImage inline style на root div
grep -n "backgroundImage" src/app/tv/\[roomId\]/\[gameType\]/page.tsx
# → только в img src (если backgroundUrl есть там)

# Телефон: режим popLayout
grep -n "mode.*popLayout\|popLayout" src/app/game/\[roomId\]/quiz/page.tsx
# → 1 строка в countdown секции

# TV: motion в countdown
grep -n "motion\.div\|AnimatePresence" src/app/tv/\[roomId\]/\[gameType\]/page.tsx
# → должны быть строки в countdown секции

npm run lint     # ✅
npx tsc --noEmit # ✅
```

## Отчёт

В `codex-reports/166-quiz-visual-bugs.md`:
- По каждому из 3 багов: было/стало (кратко)
- Результаты grep + lint/tsc

Не коммить, не пушить.
