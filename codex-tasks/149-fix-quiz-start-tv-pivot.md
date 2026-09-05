# TASK-149: Фикс запуска квиза в TV-pivot режиме

## Whitelist файлов
- `src/app/tv/[roomId]/[gameType]/page.tsx`
- `src/app/game/[roomId]/quiz/page.tsx`

---

## Контекст: почему квиз не запускается

**Архитектурная проблема:**
- Десктоп (TV) в лобби выбирает квиз → сохраняет конфиг в localStorage → переходит на `/tv/CODE/quiz`
- `/tv/.../page.tsx` не читает localStorage → `quizState.phase = 'setup-mode'` → показывает "Настройка игры..." без кнопок
- Телефон переходит на `/game/CODE/quiz` → кнопка "Начать игру" скрыта за `if (!isHost)` → хост = TV, а TV не на этой странице
- **Итог**: оба экрана зависают, никто не может стартовать

**Решение:**
1. TV страница читает localStorage-конфиг при маунте и emit'ит `quiz:config` (все клиенты переходят в `phase: 'waiting'`)
2. Телефон-phone-host (первый присоединившийся, `gameHostPlayerId`) видит "Начать игру" и управляет квизом

---

## Изменение 1 — TV страница (`src/app/tv/[roomId]/[gameType]/page.tsx`)

### Добавить импорты

В существующий импорт из `@/lib/quiz` добавить `getQuizQuestions`, `getSpecialQuizQuestions`:

```ts
import {
  QUIZ_TOPICS, QUIZ_DIFFICULTIES, SPECIAL_QUIZZES, SPECIAL_QUIZ_THEMES,
  getQuizQuestions, getSpecialQuizQuestions,
} from '@/lib/quiz';
```

### Добавить константу

Рядом с другими локальными константами (вверху компонента):

```ts
const QUESTIONS_PER_GAME = 10;
```

### Добавить useEffect для чтения localStorage

После существующих useEffect'ов, до JSX:

```tsx
// TV-pivot: read lobby quiz config and broadcast to all clients
useEffect(() => {
  if (gameType !== 'quiz') return;
  const raw = localStorage.getItem('party-hub-quiz-config');
  if (!raw) return;

  try {
    const config = JSON.parse(raw) as {
      mode: 'general' | 'special';
      difficulty: string;
      topic: string;
      specialQuizId: string | null;
    };
    localStorage.removeItem('party-hub-quiz-config');

    let quizConfig: QuizConfig;
    let total: number;

    if (config.mode === 'general') {
      quizConfig = {
        mode: 'general',
        difficulty: config.difficulty as QuizConfig['difficulty'],
        topic: config.topic as QuizConfig['topic'],
        specialTheme: null,
        specialQuizId: null,
      };
      const questions = getQuizQuestions(
        quizConfig.topic!,
        quizConfig.difficulty!,
        []
      );
      total = Math.min(QUESTIONS_PER_GAME, questions.length);
    } else {
      const specialQuiz = SPECIAL_QUIZZES.find((q) => q.id === config.specialQuizId);
      quizConfig = {
        mode: 'special',
        difficulty: null,
        topic: null,
        specialTheme: specialQuiz?.theme ?? null,
        specialQuizId: config.specialQuizId,
      };
      const questions = getSpecialQuizQuestions(config.specialQuizId ?? '', []);
      total = Math.min(QUESTIONS_PER_GAME, questions.length);
    }

    // Update local TV quiz state
    setQuizState((prev) => ({
      ...prev,
      config: quizConfig,
      phase: 'waiting',
      totalQuestions: total,
    }));

    // Broadcast config to all clients (phone game page handles quiz:config)
    emit('game:action', {
      code: roomId,
      action: 'quiz:config',
      payload: { config: quizConfig, phase: 'waiting', totalQuestions: total },
    });
  } catch {
    localStorage.removeItem('party-hub-quiz-config');
  }
}, [gameType, emit, roomId]);
```

**Примечание:** `roomId` — это параметр, который уже есть в компоненте TV страницы. Если переменная называется иначе (например `params.roomId`), используй правильное имя. Проверь как roomId доступен в этом компоненте.

---

## Изменение 2 — Телефонная страница квиза (`src/app/game/[roomId]/quiz/page.tsx`)

### 2.1 Добавить `gameHostPlayerId` в state/room

В `on('room:state', ...)` handler (строка ~201-205) дополнить извлечение данных:

```tsx
// БЫЛО:
const unsub1 = on('room:state', (data: unknown) => {
  const room = data as { players: { id: string; nickname: string; isHost: boolean }[] };
  setGameState((prev) => ({ ...prev, players: room.players }));

// СТАЛО:
const unsub1 = on('room:state', (data: unknown) => {
  const room = data as {
    players: { id: string; nickname: string; isHost: boolean }[];
    gameHostPlayerId?: string | null;
  };
  setGameState((prev) => ({
    ...prev,
    players: room.players,
    gameHostPlayerId: room.gameHostPlayerId ?? prev.gameHostPlayerId,
  }));
```

### 2.2 Добавить `gameHostPlayerId` в `QuizGameState`

В интерфейс/тип `QuizGameState` (строка ~36-70) добавить поле:

```ts
gameHostPlayerId: string | null;
```

И в начальный state (строка ~54-70):

```ts
gameHostPlayerId: null,
```

### 2.3 Добавить вычисление `isGameHost`

После строки с `const isHost = ...` (строка ~99) добавить:

```tsx
const isGameHost = Boolean(user?.id && gameState.gameHostPlayerId && user.id === gameState.gameHostPlayerId);
const isGameHostRef = useRef(false);
```

И синхронизировать ref (рядом с `isHostRef` update, строка ~122):

```tsx
isGameHostRef.current = isGameHost;
```

### 2.4 Заменить `isHost` на `isGameHost` в нужных местах

**Замены в логике (не UI):**

- Строка ~133: `if (!isHost) return;` → `if (!isGameHost) return;`
- Строка ~197: в deps массиве `[emit, isHost, roomId]` → `[emit, isGameHost, roomId]`
- Строка ~287: `if (isHostRef.current)` → `if (isGameHostRef.current)`
- Строка ~310: `if (!isHost) return;` → `if (!isGameHost) return;`
- Строка ~339: в deps `[isHost, ...]` → `[isGameHost, ...]`
- Строка ~386: `if (!isHost || ...)` → `if (!isGameHost || ...)`
- Строка ~390: в deps `[..., isHost, ...]` → `[..., isGameHost, ...]`

**Замены в JSX (UI):**

- Строки ~710, 718, 734, 785, 800, 838, 856: все `isHost` → `isGameHost`

**НЕ менять:** `isHost` в других местах если они не связаны с управлением квизом.

**Важно:** `isHostRef` остаётся (используется в других местах). Добавляем ПАРАЛЛЕЛЬНЫЙ `isGameHostRef`.

---

## Acceptance
1. После выбора квиза в лобби и нажатия НАЧАТЬ ИГРУ на телефоне:
   - TV переходит на `/tv/CODE/quiz`, видит "Ожидание начала..." (phase=waiting, конфиг применён)
   - Телефон (game-host) переходит на `/game/CODE/quiz`, видит кнопку "Начать игру"
   - Телефон нажимает → квиз стартует (обратный отсчёт → вопросы)
2. TV экран обновляется вместе с ходом квиза (получает `quiz:start-question` и т.п.)
3. `npm run lint` без ошибок

## Не трогать
- `CLAUDE.md`, `AGENTS.md`, `codex-tasks/`, `.codex/`
- Логика других игр в TV странице
- Classic/special quiz flow в телефонной странице, кроме указанных замен
