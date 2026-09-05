# TASK-185: Quiz pre-config through socket, not localStorage

## Проблема
Конфиг квиза (режим, тема, сложность, specialQuizId) сохраняется в `localStorage` десктопного браузера (где открыто лобби), но квиз-страница читает его на телефоне хост-игрока — там `localStorage` пуст → квиз показывает `setup-mode` заново вместо сразу `waiting`.

## Решение
Передавать конфиг через сокет:
1. `game:select` (лобби → сервер) принимает опциональный `quizConfig` и сохраняет на room
2. `game:started` (сервер → все клиенты) включает `quizConfig` если она есть
3. Квиз-страница: если `game:started` содержит `quizConfig` — применяет её и сразу идёт в фазу `waiting`, минуя setup

## Whitelist файлов
- `src/server/socket-handlers.mts`
- `src/components/lobby/Lobby.tsx`
- `src/app/game/[roomId]/quiz/page.tsx`

## Детали реализации

### 1. src/server/socket-handlers.mts

Добавить поле `pendingQuizConfig` в тип Room (найди где описывается тип Room):
```ts
pendingQuizConfig?: {
  mode: 'general' | 'special';
  difficulty: string;
  topic: string;
  specialQuizId: string | null;
} | null;
```

Обновить обработчик `game:select` (около строки 252):
```ts
socket.on('game:select', (data: {
  code: string;
  gameType: string;
  quizConfig?: { mode: string; difficulty: string; topic: string; specialQuizId: string | null } | null;
}) => {
  const room = getRoomByCode(data.code);
  if (!room) return;
  room.currentGame = data.gameType;
  if (data.quizConfig) {
    room.pendingQuizConfig = data.quizConfig as Room['pendingQuizConfig'];
  } else {
    room.pendingQuizConfig = null;
  }
  broadcastRoomState(io, room);
});
```

Обновить обработчик `game:start` (около строки 260) — включить quizConfig в `game:started`:
```ts
io.to(`room:${room.code}`).emit('game:started', {
  gameType: room.currentGame,
  roomCode: room.code,
  quizConfig: room.pendingQuizConfig ?? null,
});
```

### 2. src/components/lobby/Lobby.tsx

В `handleStartGame` (около строки 615-631) найди вызов `emit('game:select', ...)` и расширь его — добавь `quizConfig: null` по умолчанию:
```ts
emit('game:select', { code, gameType: activeGame, quizConfig: null });
```

В `handleQuizGeneralConfigConfirm` (около строки 633):
- Убери `localStorage.setItem("party-hub-quiz-config", ...)` 
- Вместо этого сохрани config в state (добавь `const [pendingQuizConfig, setPendingQuizConfig] = useState(null)`)
- Обнови `handleStartGame` так чтобы он принимал опциональный config и передавал его в `game:select`:

Добавь state:
```ts
const [pendingQuizConfig, setPendingQuizConfig] = useState<{
  mode: 'general' | 'special';
  difficulty: string;
  topic: string;
  specialQuizId: string | null;
} | null>(null);
```

Измени `handleStartGame` чтобы принимал config:
```ts
const handleStartGame = useCallback(async (quizConfig?: typeof pendingQuizConfig) => {
  // ... существующий код создания комнаты если нет ...
  const code = roomCode ?? await createRoom();
  if (!code) return;
  emit('game:select', { code, gameType: activeGame, quizConfig: quizConfig ?? null });
  setRoomMenuOpen(false);
  setIsWaitingForPlayers(true);
}, [activeGame, createRoom, emit, roomCode]);
```

Измени `handleQuizGeneralConfigConfirm`:
```ts
const handleQuizGeneralConfigConfirm = useCallback(() => {
  const config = {
    mode: 'general' as const,
    difficulty: quizDifficulty,
    topic: quizTopic,
    specialQuizId: null,
  };
  // убрать localStorage.setItem
  setQuizGeneralConfigOpen(false);
  setQuizSelectionOpen(false);
  void handleStartGame(config);
}, [handleStartGame, quizDifficulty, quizTopic]);
```

Измени `handleSelectSpecialQuiz`:
```ts
const handleSelectSpecialQuiz = useCallback((specialQuizId: string) => {
  const config = {
    mode: 'special' as const,
    difficulty: 'medium',
    topic: 'random',
    specialQuizId,
  };
  // убрать localStorage.setItem
  setQuizSelectionOpen(false);
  void handleStartGame(config);
}, [handleStartGame]);
```

### 3. src/app/game/[roomId]/quiz/page.tsx

Найди где обрабатывается `game:started` (через `useNavigateOnGameStart` или прямой on-listener) и добавь обработку `quizConfig` из payload.

Сейчас квиз-страница читает localStorage в useEffect (строки 204-261). Нужно ДОПОЛНИТЕЛЬНО слушать `game:started` event с quizConfig.

Добавь useEffect (рядом с существующим чтением localStorage):
```ts
useEffect(() => {
  return on('game:started', (payload: unknown) => {
    const data = payload as { quizConfig?: {
      mode: 'general' | 'special';
      difficulty: string;
      topic: string;
      specialQuizId: string | null;
    } | null };
    if (!data.quizConfig || !isGameHost) return;
    const config = data.quizConfig;
    if (config.mode === 'general') {
      const newConfig: QuizConfig = {
        mode: 'general',
        difficulty: config.difficulty as QuizDifficulty,
        topic: config.topic as QuizTopic,
        specialTheme: null,
        specialQuizId: null,
      };
      const questions = getQuizQuestions(newConfig.topic!, newConfig.difficulty!, shownIdsRef.current);
      const total = Math.min(QUESTIONS_PER_GAME, questions.length);
      questionsRef.current = questions.slice(0, total);
      setGameState((prev) => ({ ...prev, config: newConfig, phase: 'waiting', totalQuestions: total }));
      sendAction('quiz:config', { config: newConfig, phase: 'waiting', totalQuestions: total });
    } else if (config.mode === 'special' && config.specialQuizId) {
      const specialQuiz = SPECIAL_QUIZZES.find((q) => q.id === config.specialQuizId);
      const newConfig: QuizConfig = {
        mode: 'special',
        difficulty: null,
        topic: null,
        specialTheme: specialQuiz?.theme ?? null,
        specialQuizId: config.specialQuizId,
      };
      const questions = getSpecialQuizQuestions(config.specialQuizId, shownIdsRef.current);
      const total = Math.min(QUESTIONS_PER_GAME, questions.length);
      questionsRef.current = questions.slice(0, total);
      setGameState((prev) => ({ ...prev, config: newConfig, phase: 'waiting', totalQuestions: total }));
      sendAction('quiz:config', { config: newConfig, phase: 'waiting', totalQuestions: total });
    }
  });
}, [on, isGameHost, sendAction]);
```

Также сохрани обратную совместимость — localStorage-чтение можно оставить как fallback для случая когда host открывает квиз-страницу напрямую без game:started (например после перезагрузки страницы).

## Acceptance criteria
- Хост выбирает квиз в лобби → нажимает «НАЧАТЬ ИГРУ» на телефоне → квиз сразу открывается в фазе `waiting` (ждёт вопроса), без экрана setup
- Другие игроки видят «Ожидание ведущего...» как обычно
- `localStorage` можно убрать из основного пути (или оставить как fallback)

## Не трогать
- Логику quiz:action, quiz:config, question/results фазы
- Alias, Crocodile, Mafia, Spy, Who Am I, 100 to 1
- CLAUDE.md, AGENTS.md, codex-tasks/

## Отчёт
Сохрани в `codex-reports/185-quiz-config-via-socket.md`
