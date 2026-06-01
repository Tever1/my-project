# TASK-173: Quiz — Layout TV, UX мобилки, хост-бейдж, таймер

## Whitelist файлов
- `src/app/tv/[roomId]/[gameType]/page.tsx`
- `src/app/game/[roomId]/quiz/page.tsx`
- `src/components/lobby/Lobby.tsx`

---

## Bug 1: Бейдж ХОСТА не показывается в меню комнаты

### Где: `src/components/lobby/Lobby.tsx`, компонент `RoomMenu`

### Проблема
В RoomMenu (~строка 2658) используется:
```js
const isHost = player.isHost || player.id === roomState?.hostId;
```
Обе проверки могут не срабатывать если `roomState` устарел. Нужно явно логировать значения и добавить fallback через `hostId`.

### Фикс
Заменить строку ~2658:
```js
// Было:
const isHost = player.isHost || player.id === roomState?.hostId;
// Стало:
const isHost = Boolean(player.isHost) || (player.id !== '' && player.id === roomState?.hostId);
```

Дополнительно: в `connectedPlayers` (строка ~2435-2437) убедиться что фильтр не отсекает нужных игроков. Текущий фильтр `p => p.nickname` корректен.

---

## Bugs 2 + 3: TV — переместить квиз в низ, очки игроков в верх

### Где: `src/app/tv/[roomId]/[gameType]/page.tsx`, блок `{/* QUESTION */}`

### Текущая структура внутри `{/* Main content */}` для фазы 'question':
```
flex flex-col justify-center
  ↳ timer bar
  ↳ question card
  ↳ options grid 2×2
  ↳ answer status
```

### Нужная структура
1. Убрать `justify-center` → заменить на `justify-between` на main content div (строка ~534)
2. В блоке question (`quizState.phase === 'question'`) изменить layout:
```
flex flex-col h-full
  ↳ [TOP] Scoreboard row — список игроков с очками (вверху)
  ↳ flex-1 (пустое пространство — фон виден)
  ↳ [BOTTOM] timer bar + options grid + result message
```

#### Конкретный план:
Внутри `{/* QUESTION */}` (~строка 603), заменить:
```tsx
<div className="flex flex-col h-full justify-center">
```
на:
```tsx
<div className="flex flex-col h-full justify-between">
```

Добавить в начало (перед timer bar) секцию с очками игроков:
```tsx
{/* TOP: Player scores */}
{scoreboard.length > 0 && (
  <div className="flex items-center justify-center gap-4 flex-wrap flex-shrink-0 pb-4">
    {scoreboard.map((entry, i) => (
      <div key={entry.id} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 backdrop-blur-sm border border-white/15">
        <span className="text-sm text-white/50">{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i+1}.`}</span>
        <span className="font-semibold text-white">{entry.name}</span>
        <span className="font-black text-purple-400">{entry.score}</span>
      </div>
    ))}
  </div>
)}

{/* BOTTOM: Timer + options + result */}
<div className="flex flex-col gap-3 flex-shrink-0">
  {/* Timer bar */}
  ... (существующий timer bar)
  {/* Options grid */}
  ... (существующий grid)
  {/* Answer status / result */}
  ... (существующий блок)
</div>
```

Вопрос убрать из TV-отображения во время фазы question — он только в середине занимает место, и его уже убрали с мобилки, на TV он по-прежнему показывается в отдельном блоке но ВЫШЕ опций. Оставь `{/* Question */}` glass-card между scoreboard и options.

Итоговый порядок в BOTTOM div:
1. Question glass-card
2. Timer bar
3. Options grid 2×2
4. Result message

---

## Bug 4: TV — "Ответили X/Y" поднять к счётчику вопроса

### Где: `src/app/tv/[roomId]/[gameType]/page.tsx`, top bar блок (строка ~521-530)

### Текущий top bar (правая часть):
```tsx
{quizState.phase === 'question' && (
  <div className="flex items-center gap-6">
    <span className="text-xl text-white/60">{questionIndex + 1} / {totalQuestions}</span>
    <span className="text-4xl font-black tabular-nums">{timeLeft}</span>
  </div>
)}
```

### Фикс
Добавить `answeredCount / totalPlayers` рядом с счётчиком вопроса:
```tsx
{quizState.phase === 'question' && (
  <div className="flex items-center gap-6">
    <span className="text-lg text-white/50">
      {locale === 'ru' ? 'Ответили' : 'Answered'}: {answeredCount}/{totalPlayers}
    </span>
    <span className="text-xl text-white/60">{quizState.questionIndex + 1} / {quizState.totalQuestions}</span>
    <span className={`text-4xl font-black tabular-nums ${quizState.timeLeft <= 5 ? 'text-red-400' : 'text-white'}`}>
      {quizState.timeLeft}
    </span>
  </div>
)}
```

Убрать блок `{/* Answer status */}` (~строки 662-683) из main content — он больше не нужен там (он переезжает в top bar, а result message — в отдельный бокс ниже).

---

## Bug 5: Сообщение о результате — убрать с мобилки, оформить в бокс на TV

### Мобилка: `src/app/game/[roomId]/quiz/page.tsx`
Удалить блок ~строки 1190-1214:
```tsx
// Удалить всё это:
{gameState.showCorrect && (
  <div className="mt-6 animate-fade-in">
    <div className={`p-5 rounded-2xl border backdrop-blur-2xl ${...}`}>
      {/* Правильно ответили / Никто не ответил правильно */}
    </div>
    ...
  </div>
)}
```
ВАЖНО: кнопку "Следующий вопрос" (`isGameHost && <GlassButton>`) которая сейчас внутри этого блока (~строка 1215) — ОСТАВИТЬ, переместить на уровень выше (просто рядом с кнопкой "Завершить" или отдельно).

### TV: `src/app/tv/[roomId]/[gameType]/page.tsx`
Добавить ПОСЛЕ grid options в BOTTOM секции (вместо удалённого Answer status):
```tsx
{/* Result message box */}
{quizState.showCorrect && (
  <div className={`relative overflow-hidden rounded-md border p-5 backdrop-blur-xl transition-colors duration-300 text-center ${
    quizState.correctPlayers.length > 0
      ? 'bg-green-500/10 border-green-400/30'
      : 'bg-red-500/10 border-red-400/30'
  }`}>
    {quizState.correctPlayers.length > 0 ? (
      <p className="text-xl font-semibold text-green-300">
        {locale === 'ru' ? '✓ Правильно: ' : '✓ Correct: '}
        {quizState.correctPlayers.map((id) => getPlayerName(id)).join(', ')}
      </p>
    ) : (
      <p className="text-xl font-semibold text-red-300">
        {locale === 'ru' ? 'Никто не угадал!' : 'Nobody got it right!'}
      </p>
    )}
  </div>
)}
```

---

## Bug 6: Фон карточек промежуточных результатов как у вариантов ответа

### Где: `src/app/tv/[roomId]/[gameType]/page.tsx`, блок `{/* MID-LEADERBOARD */}` (~строки 698-715)

### Текущий стиль карточек:
```tsx
className={`flex items-center justify-between py-4 px-8 rounded-2xl border-2 transition-all ${
  i === 0 ? 'bg-yellow-500/20 border-yellow-400/40 scale-105' : ...
}`}
```

### Нужный стиль (как у вариантов ответа — добавить `backdrop-blur-xl`):
```tsx
className={`relative overflow-hidden flex items-center justify-between py-4 px-8 rounded-md border backdrop-blur-xl transition-all ${
  i === 0 ? 'bg-yellow-500/20 border-yellow-400/40 scale-105' : 
  i === 1 ? 'bg-white/8 border-white/15' :
  i === 2 ? 'bg-amber-700/10 border-amber-700/20' : 
  'bg-white/5 border-white/10'
}`}
```

---

## Bug 7: Отставание таймера у второго игрока — информационная заметка

Это НЕ критический баг в данной задаче. Предположительная причина: `quiz:timer` события приходят раз в секунду, но если игрок 2 пропустил `quiz:start-question` (сетевой сбой), его `timeLeft` не ресетится. Решение требует `quiz:request-state` для игроков (отдельная задача). Ничего не трогать.

---

## Acceptance criteria
- [ ] Бейдж "хост" показывается в меню комнаты
- [ ] TV quiz question phase: очки игроков сверху, вопрос + варианты снизу
- [ ] TV "Ответили X/Y" перенесён в top bar рядом с "Вопрос N/M"
- [ ] Мобилка: результат (кто ответил / никто не ответил) убран, кнопка "Следующий вопрос" оставлена
- [ ] TV: результат показывается в стеклянном боксе как варианты ответа
- [ ] Mid-leaderboard карточки: backdrop-blur-xl

## Не трогать
- Другие игры
- Classic Alias
- CLAUDE.md, AGENTS.md, .codex/STATUS.md

## Отчёт
`codex-reports/173-quiz-layout-and-bugs.md`
