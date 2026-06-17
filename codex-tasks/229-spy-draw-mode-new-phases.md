# TASK-229 — Spy draw mode: добавить dealing / voting / roundResult фазы

## Контекст

Игра "Шпион" имеет два режима: `guess` (угадай слово) и `draw` (нарисуй).
После редизайна в TASK-226 режим `guess` получил полный flow с фазами:
`dealing → playing → voting → roundResult → (следующий раунд или gameOver)`.

Режим `draw` сейчас работает по-старому: `startGame('draw')` сразу ставит
`phase: 'playing'` без dealing-экрана. Нужно дать ему те же фазы.

## Whitelist файлов

```
src/app/game/[roomId]/spy/page.tsx
```

## Текущее состояние draw mode

В `startGame()` есть ветка `if (mode === 'draw')` которая сразу ставит `phase: 'playing'`.
Для draw mode также есть:
- `drawerId: string` в стейте — кто сейчас рисует
- `nextWord()` — хост меняет слово (слова из `SPY_WORDS`, не локации)
- `DrawCanvas` компонент — рисование для активного игрока, только чтение для остальных
- `passTurn()` — смена `drawerId` на следующего в `playerOrder`

## Что нужно изменить

### 1. `startGame('draw')` → теперь идёт в `dealing`

Заменить `phase: 'playing'` на `phase: 'dealing'` в ветке draw.
Слово выбирается из `SPY_WORDS` как раньше (не из SPY_LOCATIONS).
`drawerId` пока не ставим — он будет установлен когда перейдём в `playing`.
`spyId` выбирается случайно как в guess режиме.

### 2. Dealing экран для draw mode

В секции рендера `s.phase === 'dealing'` уже есть отображение для guess mode
(карточки "Ты шпион" / "Твоё секретное слово" + кнопка "Понятно").

Нужно добавить отдельный контент для draw mode (`s.mode === 'draw'`):
- **Шпион:** большая карточка с `border-red-400/30 bg-red-500/10`:
  - заголовок: "🎭 Ты — ШПИОН" / "🎭 You are the SPY"
  - подзаголовок: "Слова у тебя нет — рисуй что угодно похожее" / "You have no word — draw anything that fits"
  - список подсказок:
    1. "Смотри как рисуют другие и подражай" / "Watch others draw and mimic"
    2. "Рисуй что-то похожее на тему" / "Draw something related to the theme"
    3. "Не дай себя раскрыть на голосовании" / "Avoid being exposed in the vote"
- **Мирный:** большая карточка с `border-purple-400/30 bg-purple-500/10`:
  - метка сверху: "слово для рисования" / "word to draw"
  - само слово большим шрифтом: `s.word`
  - подсказка: "Рисуй это слово по очереди. Среди вас шпион — он слова не знает." / "Take turns drawing this word. The spy among you doesn't know it."
- Кнопка "Понятно" / "Got it" — тот же `acknowledgeWord()` что в guess mode
- Счётчик "N / M посмотрели слово" как в guess mode
- Кнопка хоста "▶ Начать рисование" / "▶ Start drawing" — тот же `startPlaying()`

**ВАЖНО:** в `startPlaying()` (хост жмёт "начать") — когда `s.mode === 'draw'`,
нужно установить `drawerId: s.playerOrder[0] ?? ''`. Измени `startPlaying`:

```typescript
const startPlaying = () => {
  if (!isGameHost) return;
  const patch: Partial<SpyGameState> = { phase: 'playing', timerRunning: false };
  if (s.mode === 'draw') patch.drawerId = s.playerOrder[0] ?? '';
  update(patch);
};
```

### 3. Voting после draw mode

В draw mode голосование работает точно так же как в guess mode:
- `startVoting()` уже существует и запускает voting фазу
- Экран voting уже показывает игроков для голосования
- Нужно только добавить кнопку хоста "🗳 Начать голосование" в draw mode playing экран

Добавить в блок `{s.mode === 'draw' && isGameHost && ...}` рядом с существующими кнопками:

```tsx
{s.mode === 'draw' && isGameHost && (
  <GlassButton
    className="w-full border-amber-400/30 bg-amber-500/15 text-amber-200"
    onClick={startVoting}
  >
    {l('🗳 Начать голосование', '🗳 Start voting')}
  </GlassButton>
)}
```

### 4. nextRound() для draw mode

Сейчас `nextRound()` всегда берёт новую локацию из `SPY_LOCATIONS`.
Для draw mode нужно взять новое слово из `SPY_WORDS`:

```typescript
const nextRound = () => {
  if (!isGameHost) return;
  if (s.currentRound >= s.totalRounds) {
    update({ gameOver: true });
    return;
  }

  if (s.mode === 'draw') {
    const { word, idx } = pickWord(s.usedWordIndices);
    const newUsed = s.usedWordIndices.length >= SPY_WORDS.length - 1 ? [idx] : [...s.usedWordIndices, idx];
    const playerOrder = shufflePlayers(s.players);
    update({
      phase: 'dealing',
      word,
      category: '',
      categoryIcon: '',
      locationIdx: -1,
      usedWordIndices: newUsed,
      spyId: pickRandomSpy(s.players),
      drawerId: '',
      playerOrder,
      playerOrderIdx: 0,
      timerLeft: TIMER_TOTAL,
      timerRunning: false,
      readyPlayers: [],
      votes: {},
      voteTimerLeft: VOTE_TIMER_TOTAL,
      voteTimerRunning: false,
      roundResult: null,
      lastRoundDelta: {},
      currentRound: s.currentRound + 1,
    });
    return;
  }

  // guess mode — existing logic
  const { loc, idx } = pickLocation(s.usedLocationIndices);
  // ... (оставить как есть)
};
```

## Acceptance

- `npm run lint` → 0 ошибок
- `npx tsc --noEmit` → 0 ошибок
- Нет правок вне whitelist файлов
- Режим guess работает точно как раньше (не тронут)
- Режим draw: `startGame('draw')` → `phase: 'dealing'`
- Dealing draw: шпион видит "слова нет", мирный видит `s.word`
- "Понятно" → ready, хост "▶ Начать рисование" → `playing`
- Playing draw: кнопки "Следующее слово", "Передать ход", "Начать голосование" у хоста
- Voting → roundResult → следующий раунд берёт новое слово из SPY_WORDS

## Не делать

- Не трогать guess mode логику
- Не трогать DrawCanvas компонент
- Не трогать spy:stroke / spy:clear handlers
- Не удалять существующие функции `nextWord()`, `replaceWord()`, `passTurn()` и т.п.
- Не трогать TV файл (`src/app/tv/...`)

## Отчёт

`codex-reports/229-spy-draw-mode-new-phases.md`
