# TASK-172: Quiz — 5 UX багов (TV + мобилка)

## Whitelist файлов
- `src/app/tv/[roomId]/[gameType]/page.tsx`
- `src/app/game/[roomId]/quiz/page.tsx`

---

## Bug A1 (TV): Промежуточная таблица не показывается

### Проблема
Мобилка отправляет `quiz:sync({ phase: 'mid-leaderboard' })` — TV получает, устанавливает `quizState.phase = 'mid-leaderboard'`, но TV-страница не рендерит ничего для этой фазы. Экран пустой.

### Фикс
В `src/app/tv/[roomId]/[gameType]/page.tsx` добавить блок рендера для `mid-leaderboard` — вставить ПОСЛЕ блока `{/* QUESTION */}` (после закрывающего тега блока `quizState.phase === 'question'`) и ПЕРЕД блоком `{/* FINAL */}`:

```tsx
{/* MID-LEADERBOARD */}
{quizState.phase === 'mid-leaderboard' && (
  <div className="text-center animate-fade-in">
    <h2 className="text-5xl font-bold mb-2">
      {locale === 'ru' ? 'Промежуточные результаты' : 'Halftime Results'}
    </h2>
    <p className="text-white/60 mb-8 text-xl">
      {locale === 'ru'
        ? `После ${quizState.questionIndex + 1} из ${quizState.totalQuestions} вопросов`
        : `After ${quizState.questionIndex + 1} of ${quizState.totalQuestions} questions`}
    </p>
    <div className="w-full max-w-3xl mx-auto space-y-3">
      {scoreboard.map((entry, i) => (
        <div
          key={entry.id}
          className={`flex items-center justify-between py-4 px-8 rounded-2xl border-2 transition-all ${
            i === 0
              ? 'bg-yellow-500/20 border-yellow-400/40 scale-105'
              : i === 1
                ? 'bg-gray-300/10 border-gray-300/20'
                : i === 2
                  ? 'bg-amber-700/10 border-amber-700/20'
                  : 'bg-white/5 border-white/10'
          }`}
        >
          <div className="flex items-center gap-4">
            <span className="text-3xl w-10 text-center flex-shrink-0">
              {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`}
            </span>
            <span className="text-2xl font-bold">{entry.name}</span>
          </div>
          <span className="text-3xl font-black text-purple-400">{entry.score}</span>
        </div>
      ))}
    </div>
  </div>
)}
```

Для `scoreboard` уже есть: `const scoreboard = players.map((p) => ({ id: p.id, name: p.nickname, score: quizState.scores[p.id] || 0 }))` — найди эту переменную (или аналогичную) в блоке TV-квиза и используй её. Если scoreboard уже определён выше для bottom bar — использовать ту же переменную.

---

## Bug A2 (Mobile): После ЗАВЕРШИТЬ игрок уходит на экран ввода имени

### Проблема
В `src/app/game/[roomId]/quiz/page.tsx`:
1. `confirmEndGame()` (~строка 653): `router.push('/join/${roomId}')` — уходит на страницу ввода никнейма
2. `useNavigateOnGameEnd(roomId)` (~строка 97): default target `'phone'` → `/join/${roomId}`

Пользователь должен возвращаться в лобби (`/lobby/${roomId}`), а не на страницу первичного присоединения.

### Фикс
1. Строка `router.push('/join/${roomId}')` в `confirmEndGame` → `router.push('/lobby/${roomId}')`
2. Строка `useNavigateOnGameEnd(roomId)` → `useNavigateOnGameEnd(roomId, 'lobby')`

Только в `quiz/page.tsx`, другие игры не трогать.

---

## Bug B1 (Mobile): Убрать ring-таймер из правого верхнего угла

### Проблема
На экране вопроса есть `<UrgencyTimer variant="ring" size="xs" />` (~строки 1058-1064). Он показывает маленькое кольцо с обратным отсчётом рядом с "Вопрос X/10". Не нужен — таймер будет вынесен в полосу (Bug B3).

### Фикс
Удалить блок `<UrgencyTimer>` (~строки 1058-1064):
```tsx
// Удалить:
<UrgencyTimer
  total={timePerQuestion}
  current={gameState.timeLeft}
  variant="ring"
  color="var(--color-game-quiz)"
  size="xs"
/>
```

Оставить `<span>Вопрос X/10</span>` в той же строке.

---

## Bug B2 (Mobile): Убрать текст вопроса с телефона

### Проблема
`<GlassCard className="p-8 mb-8">` содержит `<h3>` с текстом вопроса (~строки 1067-1072). Вопрос читается с TV, на телефоне он лишний — занимает место, где нужны только варианты ответа.

### Фикс
Удалить весь блок `{/* Question card */}` (~строки 1067-1072):
```tsx
// Удалить полностью:
{/* Question card */}
<GlassCard className="p-8 mb-8">
  <h3 className="text-2xl md:text-3xl lg:text-4xl font-semibold text-white leading-snug">
    {locale === 'ru' ? currentQuestion.questionRu : currentQuestion.questionEn}
  </h3>
</GlassCard>
```

---

## Bug B3 (Mobile): Таймер должен быть полосой (как на TV)

### Проблема
Ring-таймер убран (Bug B1). Нужно добавить полосу обратного отсчёта — как на TV (`h-3 rounded-full bg-white/10` + заполнение по ширине). Полоса должна располагаться вверху экрана вопроса, на всю ширину.

### Фикс
В блоке `{/* ==================== QUESTION ====================*/}` (~строки 1050+), после открывающего `<div className="max-w-5xl mx-auto w-full relative">`, ПЕРЕД блоком таймера/заголовка (`{/* Timer */}`), добавить:

```tsx
{/* Timer bar — full width, matches TV style */}
<div className="w-full h-2 rounded-full bg-white/10 overflow-hidden mb-4">
  <motion.div
    className={`h-full rounded-full ${
      gameState.timeLeft <= 5 ? 'bg-red-500' : 'bg-purple-500'
    }`}
    style={{ width: `${(gameState.timeLeft / timePerQuestion) * 100}%` }}
    transition={{ duration: 1, ease: 'linear' }}
  />
</div>
```

`motion` уже импортирован в файле.

---

## Acceptance criteria
- [ ] TV показывает промежуточную таблицу при фазе `mid-leaderboard`
- [ ] После ЗАВЕРШИТЬ в квизе игрок переходит в `/lobby/[roomId]`, не в `/join/[roomId]`
- [ ] Ring-таймер убран с мобильного экрана вопроса
- [ ] Текст вопроса убран с мобильного экрана
- [ ] На мобильном вверху экрана вопроса — горизонтальная полоса (убывает слева направо)

## Не трогать
- Другие игры (не quiz)
- TV-страница квиза: вопрос на TV оставить
- Classic mode Alias
- CLAUDE.md, AGENTS.md, .codex/STATUS.md

## Отчёт
`codex-reports/172-quiz-ux-5-bugs.md`
