# TASK-226 — Spy: полный редизайн (локации + voting + round flow)

## Цель

Переработать игру Шпион по дизайн-референсам из `public/design-ref/` (11 файлов).
Добавить механику локаций (SpyCraft-стиль), 3 новые фазы (dealing / voting / roundResult),
новый TV-рендер. Обе стороны: мобильный (телефон-пульт) и TV.

## Whitelist файлов

- `src/lib/game-data.ts`
- `src/app/game/[roomId]/spy/page.tsx`
- `src/app/tv/[roomId]/[gameType]/page.tsx`

Остальное — не трогать.

---

## 1. game-data.ts — добавить SPY_LOCATIONS

После существующего `SPY_WORDS` добавить новый экспорт:

```typescript
export interface SpyLocation {
  category: string;
  categoryIcon: string;
  word: string;
}

export const SPY_LOCATIONS: SpyLocation[] = [
  // Места
  { category: 'Места', categoryIcon: '📍', word: 'Аэропорт' },
  { category: 'Места', categoryIcon: '📍', word: 'Вокзал' },
  { category: 'Места', categoryIcon: '📍', word: 'Школа' },
  { category: 'Места', categoryIcon: '📍', word: 'Больница' },
  { category: 'Места', categoryIcon: '📍', word: 'Пляж' },
  { category: 'Места', categoryIcon: '📍', word: 'Театр' },
  { category: 'Места', categoryIcon: '📍', word: 'Ресторан' },
  { category: 'Места', categoryIcon: '📍', word: 'Тюрьма' },
  { category: 'Места', categoryIcon: '📍', word: 'Казино' },
  { category: 'Места', categoryIcon: '📍', word: 'Библиотека' },
  // Природа
  { category: 'Природа', categoryIcon: '🌿', word: 'Лес' },
  { category: 'Природа', categoryIcon: '🌿', word: 'Горы' },
  { category: 'Природа', categoryIcon: '🌿', word: 'Пустыня' },
  { category: 'Природа', categoryIcon: '🌿', word: 'Джунгли' },
  { category: 'Природа', categoryIcon: '🌿', word: 'Пещера' },
  { category: 'Природа', categoryIcon: '🌿', word: 'Остров' },
  // Работа
  { category: 'Работа', categoryIcon: '🏢', word: 'Офис' },
  { category: 'Работа', categoryIcon: '🏢', word: 'Фабрика' },
  { category: 'Работа', categoryIcon: '🏢', word: 'Стройка' },
  { category: 'Работа', categoryIcon: '🏢', word: 'Лаборатория' },
  { category: 'Работа', categoryIcon: '🏢', word: 'Ферма' },
  { category: 'Работа', categoryIcon: '🏢', word: 'Шахта' },
  // Развлечения
  { category: 'Развлечения', categoryIcon: '🎭', word: 'Цирк' },
  { category: 'Развлечения', categoryIcon: '🎭', word: 'Стадион' },
  { category: 'Развлечения', categoryIcon: '🎭', word: 'Кинотеатр' },
  { category: 'Развлечения', categoryIcon: '🎭', word: 'Музей' },
  { category: 'Развлечения', categoryIcon: '🎭', word: 'Аквапарк' },
  { category: 'Развлечения', categoryIcon: '🎭', word: 'Зоопарк' },
  // Транспорт
  { category: 'Транспорт', categoryIcon: '🚗', word: 'Самолёт' },
  { category: 'Транспорт', categoryIcon: '🚗', word: 'Подводная лодка' },
  { category: 'Транспорт', categoryIcon: '🚗', word: 'Поезд' },
  { category: 'Транспорт', categoryIcon: '🚗', word: 'Корабль' },
  { category: 'Транспорт', categoryIcon: '🚗', word: 'Ракета' },
];
```

---

## 2. spy/page.tsx — полная переработка

### 2.1 Новые типы

```typescript
import { SPY_LOCATIONS, SpyLocation } from '@/lib/game-data';

type SpyMode = 'guess'; // draw mode удалён — оставить только guess
type Phase = 'modeSelect' | 'dealing' | 'playing' | 'voting' | 'roundResult';

interface SpyGameState {
  phase: Phase;
  mode: SpyMode;
  // Location
  word: string;
  category: string;
  categoryIcon: string;
  locationIdx: number;       // index in SPY_LOCATIONS to avoid repeats
  usedLocationIndices: number[];
  // Players
  spyId: string;
  players: GamePlayer[];
  playerOrder: string[];
  playerOrderIdx: number;
  // Timer (playing phase)
  timerLeft: number;
  timerRunning: boolean;
  // Dealing phase
  readyPlayers: string[];    // who clicked "Понятно, спрятать"
  // Voting phase
  votes: Record<string, string>; // voterId → suspectId
  voteTimerLeft: number;
  voteTimerRunning: boolean;
  // Round result
  roundResult: {
    spyCaught: boolean;
    exposedId: string;        // player with most votes
    voteCount: number;        // votes against exposed player
  } | null;
  scores: Record<string, number>;
  lastRoundDelta: Record<string, number>;
  currentRound: number;
  totalRounds: number;
  gameOver: boolean;
}
```

### 2.2 Удалить

- Весь код рисования (DrawCanvas компонент, DrawStroke, sendStroke, sendClear, spy:stroke, spy:clear)
- `drawerId` из state
- `SPY_WORDS` импорт (заменить на `SPY_LOCATIONS`)
- draw mode из modeSelect UI

### 2.3 Начальное состояние

```typescript
const mkInitial = (): SpyGameState => ({
  phase: 'modeSelect',
  mode: 'guess',
  word: '',
  category: '',
  categoryIcon: '',
  locationIdx: -1,
  usedLocationIndices: [],
  spyId: '',
  players: [],
  playerOrder: [],
  playerOrderIdx: 0,
  timerLeft: 300,
  timerRunning: false,
  readyPlayers: [],
  votes: {},
  voteTimerLeft: 60,
  voteTimerRunning: false,
  roundResult: null,
  scores: {},
  lastRoundDelta: {},
  currentRound: 1,
  totalRounds: 3,     // default, overridden on startGame
  gameOver: false,
});
```

### 2.4 Socket listeners

В `useEffect` для `on('game:action', ...)` добавить:

```typescript
if (action === 'spy:sync') {
  setS(prev => ({ ...prev, ...(payload as Partial<SpyGameState>) }));
}
if (action === 'spy:ready' && isGameHost) {
  // Player clicked "Понятно, спрятать"
  const { playerId } = payload as { playerId: string };
  setS(prev => {
    const newReady = prev.readyPlayers.includes(playerId)
      ? prev.readyPlayers
      : [...prev.readyPlayers, playerId];
    const patch: Partial<SpyGameState> = { readyPlayers: newReady };
    // Auto-start playing when all ready
    if (newReady.length >= prev.players.length && prev.phase === 'dealing') {
      Object.assign(patch, { phase: 'playing' as Phase, timerRunning: false });
    }
    broadcast(patch);
    return { ...prev, ...patch };
  });
}
if (action === 'spy:vote' && isGameHost) {
  // Player submitted a vote
  const { voterId, suspectId } = payload as { voterId: string; suspectId: string };
  setS(prev => {
    const newVotes = { ...prev.votes, [voterId]: suspectId };
    const patch: Partial<SpyGameState> = { votes: newVotes };
    // Resolve if all voted
    if (Object.keys(newVotes).length >= prev.players.length) {
      const resolved = resolveVoting(newVotes, prev);
      Object.assign(patch, resolved);
    }
    broadcast(patch);
    return { ...prev, ...patch };
  });
}
```

### 2.5 Vote resolution helper (pure function, outside component)

```typescript
function resolveVoting(votes: Record<string, string>, s: SpyGameState): Partial<SpyGameState> {
  // Count votes per suspect
  const tally: Record<string, number> = {};
  for (const suspectId of Object.values(votes)) {
    tally[suspectId] = (tally[suspectId] ?? 0) + 1;
  }
  // Find majority
  let exposedId = '';
  let maxVotes = 0;
  for (const [id, count] of Object.entries(tally)) {
    if (count > maxVotes) { maxVotes = count; exposedId = id; }
  }
  const spyCaught = exposedId === s.spyId;
  // Score: civilians +1 if spy caught; spy +2 if not caught
  const delta: Record<string, number> = {};
  for (const p of s.players) {
    if (p.id === s.spyId) {
      delta[p.id] = spyCaught ? 0 : 2;
    } else {
      delta[p.id] = spyCaught ? 1 : 0;
    }
  }
  const newScores: Record<string, number> = {};
  for (const p of s.players) {
    newScores[p.id] = (s.scores[p.id] ?? 0) + (delta[p.id] ?? 0);
  }
  return {
    phase: 'roundResult',
    voteTimerRunning: false,
    roundResult: { spyCaught, exposedId, voteCount: maxVotes },
    scores: newScores,
    lastRoundDelta: delta,
  };
}
```

### 2.6 Timers

Два таймера в двух отдельных useEffect (только host):

**Playing timer** — существующий таймер (без изменений по логике):
```typescript
// watches s.timerRunning, broadcasts { timerLeft, timerRunning } each second
```

**Vote timer** — новый:
```typescript
useEffect(() => {
  if (!isGameHost) return;
  if (!s.voteTimerRunning || s.voteTimerLeft <= 0) return;
  const id = setInterval(() => {
    const cur = sRef.current;
    if (!cur.voteTimerRunning || cur.voteTimerLeft <= 0) { clearInterval(id); return; }
    const newLeft = cur.voteTimerLeft - 1;
    if (newLeft <= 0) {
      // Force resolve with current votes
      const resolved = resolveVoting(cur.votes, cur);
      const patch = { voteTimerLeft: 0, voteTimerRunning: false, ...resolved };
      setS(prev => ({ ...prev, ...patch }));
      broadcast(patch);
      clearInterval(id);
      return;
    }
    const patch = { voteTimerLeft: newLeft };
    setS(prev => ({ ...prev, ...patch }));
    broadcast(patch);
  }, 1000);
  return () => clearInterval(id);
}, [s.voteTimerRunning, isGameHost]); // eslint-disable-line react-hooks/exhaustive-deps
```

### 2.7 Action handlers

```typescript
const pickLocation = (used: number[]): { loc: SpyLocation; idx: number } => {
  const available = SPY_LOCATIONS.map((l, i) => ({ l, i })).filter(x => !used.includes(x.i));
  if (available.length === 0) {
    const i = Math.floor(Math.random() * SPY_LOCATIONS.length);
    return { loc: SPY_LOCATIONS[i], idx: i };
  }
  const pick = available[Math.floor(Math.random() * available.length)];
  return { loc: pick.l, idx: pick.i };
};

const startGame = () => {
  if (!isGameHost) return;
  const { loc, idx } = pickLocation([]);
  const spyId = pickRandomSpy(s.players);
  const playerOrder = shufflePlayers(s.players);
  const totalRounds = Math.max(3, Math.min(s.players.length, 7));
  update({
    phase: 'dealing',
    word: loc.word,
    category: loc.category,
    categoryIcon: loc.categoryIcon,
    locationIdx: idx,
    usedLocationIndices: [idx],
    spyId,
    playerOrder,
    playerOrderIdx: 0,
    timerLeft: 300,
    timerRunning: false,
    readyPlayers: [],
    votes: {},
    voteTimerLeft: 60,
    voteTimerRunning: false,
    roundResult: null,
    scores: {},
    lastRoundDelta: {},
    currentRound: 1,
    totalRounds,
    gameOver: false,
  });
};

const acknowledgeWord = () => {
  // Called by any player on "Понятно, спрятать"
  sendAction('spy:ready', { playerId: effectivePlayerId });
  // Optimistic local update for this client
  setS(prev => ({
    ...prev,
    readyPlayers: prev.readyPlayers.includes(effectivePlayerId)
      ? prev.readyPlayers
      : [...prev.readyPlayers, effectivePlayerId],
  }));
};

const startPlaying = () => {
  // Host-only manual trigger if not all ready yet
  if (!isGameHost) return;
  update({ phase: 'playing', timerRunning: false });
};

const startTimer = () => {
  if (!isGameHost) return;
  update({ timerRunning: true });
};

const passTurn = () => {
  if (!isActivePlayer && !isGameHost) return;
  const nextIdx = (s.playerOrderIdx + 1) % Math.max(s.playerOrder.length, 1);
  update({ playerOrderIdx: nextIdx });
};

const replaceWord = () => {
  if (!isGameHost) return;
  const { loc, idx } = pickLocation(s.usedLocationIndices);
  const spyId = pickRandomSpy(s.players);
  const playerOrder = shufflePlayers(s.players);
  const newUsed = s.usedLocationIndices.length >= SPY_LOCATIONS.length - 1
    ? [idx] : [...s.usedLocationIndices, idx];
  update({
    word: loc.word,
    category: loc.category,
    categoryIcon: loc.categoryIcon,
    locationIdx: idx,
    usedLocationIndices: newUsed,
    spyId,
    playerOrder,
    playerOrderIdx: 0,
    readyPlayers: [],
    phase: 'dealing',
  });
};

const startVoting = () => {
  if (!isGameHost) return;
  update({
    phase: 'voting',
    timerRunning: false,
    votes: {},
    voteTimerLeft: 60,
    voteTimerRunning: true,
  });
};

const submitVote = (suspectId: string) => {
  // Optimistic local update for voter
  setS(prev => ({
    ...prev,
    votes: { ...prev.votes, [effectivePlayerId]: suspectId },
  }));
  sendAction('spy:vote', { voterId: effectivePlayerId, suspectId });
};

const nextRound = () => {
  if (!isGameHost) return;
  if (s.currentRound >= s.totalRounds) {
    update({ gameOver: true });
    return;
  }
  const { loc, idx } = pickLocation(s.usedLocationIndices);
  const spyId = pickRandomSpy(s.players);
  const playerOrder = shufflePlayers(s.players);
  const newUsed = s.usedLocationIndices.length >= SPY_LOCATIONS.length - 1
    ? [idx] : [...s.usedLocationIndices, idx];
  update({
    phase: 'dealing',
    word: loc.word,
    category: loc.category,
    categoryIcon: loc.categoryIcon,
    locationIdx: idx,
    usedLocationIndices: newUsed,
    spyId,
    playerOrder,
    playerOrderIdx: 0,
    timerLeft: 300,
    timerRunning: false,
    readyPlayers: [],
    votes: {},
    voteTimerLeft: 60,
    voteTimerRunning: false,
    roundResult: null,
    lastRoundDelta: {},
    currentRound: s.currentRound + 1,
  });
};
```

### 2.8 Phone UI по фазам

Вся игра обёрнута в `<GameLayout>` как раньше. Внутри — условный рендер по `s.phase`.

#### phase === 'modeSelect'
Только кнопка "Начать игру" (убрать выбор draw/guess — оставить только guess).
Добавить краткие правила игры.

Структура:
```
Лого / иконка 🎭
Заголовок "Шпион"
Раздел с правилами (3 пункта):
  1. Все получают одно секретное слово — кроме шпиона
  2. По очереди описывайте слово, не называя его
  3. Найдите шпиона на голосовании
[Кнопка: НАЧАТЬ ИГРУ] — только для isGameHost
Для не-хостов: BreathingPlaceholder "Ожидание ведущего…"
```

#### phase === 'dealing'
Разная для шпиона и мирных:

**Если `effectivePlayerId === s.spyId`** — экран шпиона:
```
Роль: "🎭 Ты — ШПИОН"
GlassCard с:
  - 🎭 большая иконка маски
  - "Слова у тебя нет"
  - "Категория: {categoryIcon} {category}"
Миссия (3 шага):
  1. Слушай чужие ответы и притворяйся своим
  2. Вычисли слово по описаниям
  3. Не дай себя раскрыть на голосовании
Кнопки:
  - [Понятно, спрятать] — если не в readyPlayers
  - [✓ Готов] (disabled/green) — если уже в readyPlayers
```

**Если `effectivePlayerId !== s.spyId`** — экран слова:
```
Роль: "🛡 Ты — мирный житель"
GlassCard с:
  - "твоё секретное слово"
  - Категория: {categoryIcon} {category}
  - Слово большим шрифтом: {word}
  - Разделитель (горизонтальная линия)
Инструкция: "Описывай слово, не называя его. Среди вас шпион — он слова не знает."
Кнопки:
  - [🙈 Понятно, спрятать] — если не в readyPlayers
  - [✓ Готов] — если уже в readyPlayers
```

**Для isGameHost** — дополнительно кнопка [▶ Начать обсуждение] если хочет запустить до того как все готовы.

Прогресс готовности: "{readyPlayers.length} / {players.length} посмотрели слово"

#### phase === 'playing'

**Если `isActivePlayer`** — "Твой ход":
```
Баннер с таймером (SVG кольцо + секунды в центре):
  - Кольцо: stroke-dasharray вычисляется по timerLeft/300
  - В центре: секунды (e.g. "18")
  - Подпись: "сейчас твой ход"
Peek bar (GlassCard):
  - Слева: "твоё слово" + {word} (для мирных)  
    или "Слова у тебя нет" (для шпиона)
  - Справа: кнопка [👁 Зажми чтобы увидеть] (not actually hold — просто отображает word когда нажато)
  Примечание: peek реализовать через onPointerDown/onPointerUp на кнопке, показывает word пока нажато
Кнопки действий:
  - [→ Передать ход] — основная, cyan/teal цвет
  - [🔄 Заменить слово] — только isGameHost, secondary
  - [⏭ Пропустить] — isGameHost, secondary (то же что передать ход)
```

**Если не activePlayer** — "Ожидание хода":
```
Информация: "Сейчас отвечает {activePlayerName}"
Peek bar — кнопка [👁 Зажми, чтобы увидеть слово]
  - мирный: показывает {word} по hold
  - шпион: показывает "Категория: {icon} {category} — слова у тебя нет"
```

**Для isGameHost** — кнопка [🗳 Начать голосование] внизу всегда видна.

Таймер в шапке AppBar: formatTime(s.timerLeft), если timerRunning.
Если !timerRunning: кнопка [▶ Запустить таймер] для host.

#### phase === 'voting'

```
Заголовок: "Кто шпион?"
Таймер голосования: "⏱ {formatTime(voteTimerLeft)}"
Список игроков (кроме себя):
  Для каждого player:
    GlassCard c:
      - Аватар (инициал в кружке с цветом)
      - Имя
      - Radio-dot справа (filled если выбран)
    onClick → setLocalVote(player.id) (локальный state)
    Класс "selected" если localVote === player.id
Кнопка [🗳 Голосовать за {selectedName}] (disabled если не выбрано)
  onClick → submitVote(localVote)
После submitVote: показать "Ваш голос принят, ожидание результатов…"
```

#### phase === 'roundResult'

```
const { spyCaught, exposedId } = s.roundResult!;
const spyName = s.players.find(p => p.id === s.spyId)?.nickname;
const exposedName = s.players.find(p => p.id === exposedId)?.nickname;

Баннер:
  - ✓ зелёный: "Шпиона раскрыли! +1 очко мирным" — если spyCaught
  - ✗ красный: "Шпион победил! +2 очка шпиону" — если !spyCaught

Два блока:
  1. "Шпион" — аватар + имя шпиона с маской
  2. "Слово" — {icon} {category} · {word}

Текущие очки игрока (myId):
  "🥈 {myPosition}-е место · {scores[myId]} очков (+{lastRoundDelta[myId]})"

Для isGameHost:
  Если currentRound < totalRounds: [▶ Раунд {currentRound+1}] → nextRound()
  Иначе: [🏆 Завершить игру] → endGame()
Для не-хостов: "Ведущий запустит следующий раунд"
```

**Если `s.gameOver`** (итоговый экран):
```
Таблица финального счёта: players отсортированы по scores, место + имя + очки
Кнопка [Завершить игру] для host
```

---

## 3. TV-файл — секция spy (строки 1079-1184)

Полностью заменить блок `if (gameType === 'spy') { ... return (...) }`.

### 3.1 Расширить spyState

В существующем `useState<{...}>` добавить новые поля (совместимо с тем что приходит из spy:sync):

```typescript
const [spyState, setSpyState] = useState<{
  phase: string;
  mode: string;
  word: string;
  category: string;
  categoryIcon: string;
  spyId: string;
  drawerId: string;
  players: { id: string; nickname: string; isHost: boolean }[];
  playerOrder: string[];
  playerOrderIdx: number;
  timerLeft: number;
  timerRunning: boolean;
  readyPlayers: string[];
  votes: Record<string, string>;
  voteTimerLeft: number;
  roundResult: {
    spyCaught: boolean;
    exposedId: string;
    voteCount: number;
  } | null;
  scores: Record<string, number>;
  lastRoundDelta: Record<string, number>;
  currentRound: number;
  totalRounds: number;
  gameOver: boolean;
}>({
  phase: 'modeSelect', mode: 'guess',
  word: '', category: '', categoryIcon: '',
  spyId: '', drawerId: '',
  players: [],
  playerOrder: [], playerOrderIdx: 0,
  timerLeft: 300, timerRunning: false,
  readyPlayers: [],
  votes: {}, voteTimerLeft: 60,
  roundResult: null,
  scores: {}, lastRoundDelta: {},
  currentRound: 1, totalRounds: 3,
  gameOver: false,
});
```

Убрать `spyCanvasRef` и `spyCanvasSizeRef` и `initSpyCanvas` — draw mode удалён.

Убрать из `useEffect` для `spy:stroke` и `spy:clear`.

### 3.2 Новый TV spy render

```typescript
if (gameType === 'spy') {
  const sp = spyState;
  const spyPlayerList = sp.players.length > 0 ? sp.players : players;
  const spyGetName = (id: string) => spyPlayerList.find(p => p.id === id)?.nickname ?? id;
  const activePlayerId = sp.playerOrder[sp.playerOrderIdx % Math.max(sp.playerOrder.length, 1)] ?? '';
  const activePlayerName = spyGetName(activePlayerId);
  const formatSec = (s: number) => `${Math.floor(s/60)}:${(s%60).toString().padStart(2,'0')}`;
  const spyName = spyGetName(sp.spyId);

  // Calculate timer ring: circumference of r=118 = 2*π*118 ≈ 741.4
  const CIRC = 741.4;
  const timerRatio = Math.max(0, sp.timerLeft / 300);
  const timerOffset = CIRC * (1 - timerRatio);
  const timerColor = sp.timerLeft <= 30 ? '#ff453a' : sp.timerLeft <= 90 ? '#ffd60a' : '#64d2ff';

  return (
    <GameSurface className="h-screen bg-gradient-main text-white flex flex-col overflow-hidden">
      {/* HEADER */}
      <div className="flex items-center justify-between px-8 py-4 border-b border-white/10 flex-shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-3xl">🎭</span>
          <div>
            <h1 className="text-2xl font-bold leading-none">Шпион</h1>
            <p className="text-xs text-white/40 font-mono uppercase tracking-widest">Party Hub</p>
          </div>
        </div>
        {sp.phase === 'playing' && (
          <div className="glass-card px-4 py-2 text-sm">
            Раунд <span className="font-bold text-teal-300">{sp.currentRound}</span>
            {' · '}
            {sp.category && <span>{sp.categoryIcon} {sp.category}</span>}
          </div>
        )}
        {sp.phase === 'voting' && (
          <div className="glass-card px-4 py-2 flex items-center gap-2">
            <span>⏱</span>
            <span className="font-mono font-bold text-xl">{formatSec(sp.voteTimerLeft)}</span>
          </div>
        )}
        {(sp.phase === 'dealing' || sp.phase === 'playing') && (
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
            <span className="text-sm text-white/60">{spyPlayerList.length} в игре</span>
          </div>
        )}
      </div>

      {/* MAIN */}
      <div className="flex-1 min-h-0 overflow-hidden">

        {/* modeSelect */}
        {sp.phase === 'modeSelect' && (
          <div className="h-full flex flex-col items-center justify-center gap-6">
            <span className="text-[120px] leading-none">🎭</span>
            <h2 className="text-7xl font-black tracking-tight">ШПИОН</h2>
            <p className="text-2xl text-white/40 animate-pulse">Ожидание ведущего…</p>
          </div>
        )}

        {/* dealing — word distributed */}
        {sp.phase === 'dealing' && (
          <div className="h-full flex flex-col items-center justify-center gap-8 px-16">
            {/* Category reveal */}
            <div className="text-center">
              <p className="text-xl text-white/40 uppercase tracking-[4px] font-mono mb-3">Категория раунда</p>
              <div className="flex items-center justify-center gap-4">
                <span className="text-6xl">{sp.categoryIcon}</span>
                <span className="text-7xl font-black">{sp.category}</span>
              </div>
            </div>
            <p className="text-xl text-white/60">Слово отправлено на телефоны · <span className="text-teal-300">🎭 Один из вас — шпион. Он слова не получил.</span></p>
            {/* Ready chips */}
            <div className="w-full">
              <p className="text-center text-white/40 text-sm mb-3">
                Посмотрели слово: <b>{sp.readyPlayers.length}</b> / {spyPlayerList.length}
              </p>
              <div className="flex flex-wrap gap-3 justify-center">
                {spyPlayerList.map(p => {
                  const ready = sp.readyPlayers.includes(p.id);
                  return (
                    <div key={p.id} className={`glass-card px-4 py-2 flex items-center gap-2 transition-all ${ready ? 'border-teal-400/40' : 'opacity-50'}`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${ready ? 'bg-teal-500/30' : 'bg-white/10'}`}>
                        {p.nickname[0]}
                      </div>
                      <span>{p.nickname}</span>
                      {ready && <span className="text-teal-400">✓</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* playing */}
        {sp.phase === 'playing' && (
          <div className="h-full flex gap-8 px-12 py-6">
            {/* Left: big timer */}
            <div className="flex flex-col items-center justify-center gap-4 flex-shrink-0">
              <svg width="260" height="260">
                <circle cx="130" cy="130" r="118" stroke="rgba(255,255,255,.08)" strokeWidth="14" fill="none"/>
                <circle cx="130" cy="130" r="118" stroke={timerColor} strokeWidth="14" fill="none"
                  strokeLinecap="round"
                  strokeDasharray={CIRC}
                  strokeDashoffset={timerOffset}
                  style={{ filter: `drop-shadow(0 0 14px ${timerColor}80)`, transition: 'stroke-dashoffset 1s linear' }}
                />
              </svg>
              {/* Overlay timer number — absolute inside a relative container */}
              <p className="text-lg text-white/40 uppercase tracking-widest -mt-2">ход</p>
              {/* Timer number overlay — rendered separately due to SVG constraints */}
            </div>
            {/* Right: active player spotlight */}
            <div className="flex-1 flex flex-col justify-center gap-6">
              <div>
                <p className="text-lg text-teal-300 uppercase tracking-widest mb-2">Сейчас отвечает</p>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-teal-500/20 border border-teal-400/30 flex items-center justify-center text-2xl font-bold">
                    {activePlayerName[0]}
                  </div>
                  <span className="text-5xl font-black">{activePlayerName}</span>
                </div>
                <p className="text-white/40 mt-2">Опиши слово одним предложением — но не называй его</p>
              </div>
              <div className="glass-card px-6 py-4">
                <span className="text-white/40 text-sm">Категория</span>
                <p className="text-2xl font-bold mt-1">{sp.categoryIcon} {sp.category}</p>
                <p className="text-white/30 mt-1 text-sm font-mono uppercase tracking-widest">СЛОВО СКРЫТО</p>
              </div>
            </div>
          </div>
        )}

        {/* Timer number — centered overlay for playing phase */}
        {/* NOTE: render inside the SVG we can't easily do DOM overlay, so render the number
            as absolute text that visually overlaps the svg */}

        {/* voting */}
        {sp.phase === 'voting' && (
          <div className="h-full flex flex-col px-12 py-6 gap-6">
            <div className="flex items-center justify-center gap-4">
              <h2 className="text-5xl font-black">Кто шпион?</h2>
              <div className="glass-card px-4 py-2 text-sm">
                Проголосовали <b>{Object.keys(sp.votes).length}</b> / {spyPlayerList.length}
              </div>
            </div>
            {/* Candidate cards in a row */}
            <div className="flex-1 flex items-center justify-center">
              <div className="flex gap-4 flex-wrap justify-center">
                {spyPlayerList.map(p => {
                  const votesFor = Object.values(sp.votes).filter(v => v === p.id).length;
                  const maxVotes = Math.max(1, ...spyPlayerList.map(pp =>
                    Object.values(sp.votes).filter(v => v === pp.id).length
                  ));
                  const barPct = maxVotes > 0 ? Math.round((votesFor / maxVotes) * 100) : 0;
                  const voters = Object.entries(sp.votes)
                    .filter(([, s]) => s === p.id)
                    .map(([vid]) => vid);
                  return (
                    <div key={p.id} className={`glass-card px-6 py-5 flex flex-col items-center gap-3 min-w-[160px] ${votesFor === maxVotes && votesFor > 0 ? 'border-amber-400/40' : ''}`}>
                      {votesFor === maxVotes && votesFor > 0 && (
                        <span className="text-xs font-mono uppercase text-amber-400 tracking-widest">лидер</span>
                      )}
                      <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-lg font-bold">
                        {p.nickname[0]}
                      </div>
                      <span className="font-semibold">{p.nickname}</span>
                      {/* Vote bar */}
                      <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                        <div className="h-full rounded-full bg-teal-400 transition-all" style={{ width: `${barPct}%` }} />
                      </div>
                      {/* Voter mini-avatars */}
                      <div className="flex gap-1">
                        {voters.map(vid => (
                          <div key={vid} className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-xs">
                            {spyGetName(vid)[0]}
                          </div>
                        ))}
                      </div>
                      <div className="font-bold text-xl">{votesFor}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* roundResult / развязка */}
        {sp.phase === 'roundResult' && sp.roundResult && (
          <div className="h-full flex flex-col px-12 py-6 gap-6">
            {/* Banner */}
            <div className={`rounded-2xl px-6 py-4 flex items-center gap-4 ${sp.roundResult.spyCaught ? 'bg-green-500/20 border border-green-400/30' : 'bg-red-500/20 border border-red-400/30'}`}>
              <span className="text-3xl">{sp.roundResult.spyCaught ? '✓' : '✗'}</span>
              <div>
                <p className="text-2xl font-bold">{sp.roundResult.spyCaught ? 'Мирные вычислили шпиона!' : 'Шпион победил!'}</p>
                <p className="text-white/60">{sp.roundResult.spyCaught ? '+1 очко каждому мирному' : '+2 очка шпиону'}</p>
              </div>
            </div>
            {/* Two cards row */}
            <div className="flex gap-6 flex-1">
              {/* Spy card */}
              <div className="glass-card flex-1 flex flex-col items-center justify-center gap-4 p-8">
                <p className="text-white/40 text-sm uppercase tracking-widest">Шпионом была</p>
                <div className="relative">
                  <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center text-3xl font-bold">
                    {spyName[0]}
                  </div>
                  <span className="absolute -bottom-1 -right-1 text-xl">🎭</span>
                </div>
                <p className="text-3xl font-black">{spyName}</p>
                <p className="text-white/40 text-sm">
                  {sp.roundResult.voteCount} из {spyPlayerList.length} голосов
                </p>
              </div>
              {/* Word card */}
              <div className="glass-card flex-1 flex flex-col items-center justify-center gap-4 p-8">
                <p className="text-white/40 text-sm uppercase tracking-widest">Загаданное слово</p>
                <p className="text-white/60 text-lg">{sp.categoryIcon} Категория · {sp.category}</p>
                <p className="text-6xl font-black">{sp.word}</p>
              </div>
            </div>
            {/* Score deltas row */}
            <div className="flex gap-2 justify-center">
              {spyPlayerList.map(p => {
                const delta = sp.lastRoundDelta[p.id] ?? 0;
                return (
                  <div key={p.id} className="glass-card px-4 py-2 flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-sm font-bold">
                      {p.nickname[0]}
                    </div>
                    <span className={`font-bold ${delta > 0 ? 'text-green-400' : 'text-white/30'}`}>
                      {delta > 0 ? `+${delta}` : '0'}
                    </span>
                  </div>
                );
              })}
            </div>
            <p className="text-center text-white/30 text-sm">📱 Ведущий: запустить раунд {sp.currentRound + 1} →</p>
          </div>
        )}

        {/* gameOver */}
        {sp.gameOver && (
          <div className="h-full flex flex-col items-center justify-center gap-8 px-12">
            <h2 className="text-6xl font-black">Игра окончена!</h2>
            <div className="flex gap-4">
              {[...spyPlayerList]
                .sort((a, b) => (sp.scores[b.id] ?? 0) - (sp.scores[a.id] ?? 0))
                .map((p, i) => (
                  <div key={p.id} className="glass-card px-6 py-4 flex flex-col items-center gap-2">
                    <span className="text-2xl">{i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}</span>
                    <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center font-bold">
                      {p.nickname[0]}
                    </div>
                    <p className="font-bold">{p.nickname}</p>
                    <p className="text-3xl font-black text-teal-300">{sp.scores[p.id] ?? 0}</p>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>

      {/* FOOTER: turn order rail (only in playing phase) */}
      {sp.phase === 'playing' && sp.playerOrder.length > 0 && (
        <div className="flex-shrink-0 border-t border-white/10 px-8 py-3">
          <div className="flex items-center gap-3 overflow-x-auto">
            <p className="text-xs text-white/30 uppercase tracking-widest flex-shrink-0">Порядок хода</p>
            {sp.playerOrder.map((id, i) => {
              const isActive = i === sp.playerOrderIdx % sp.playerOrder.length;
              const isDone = i < sp.playerOrderIdx % sp.playerOrder.length;
              return (
                <div key={id} className={`flex items-center gap-1 flex-shrink-0 ${isActive ? '' : isDone ? 'opacity-30' : 'opacity-60'}`}>
                  {i > 0 && <span className="text-white/20 text-sm mx-1">›</span>}
                  <div className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg transition-all ${isActive ? 'bg-teal-500/20 border border-teal-400/30' : ''}`}>
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${isActive ? 'bg-teal-400/20' : 'bg-white/10'}`}>
                      {spyGetName(id)[0]}
                    </div>
                    <span className="text-xs">{spyGetName(id)}</span>
                    {isActive && <span className="text-[10px] text-teal-300">говорит</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {qrOverlay}
    </GameSurface>
  );
}
```

**Важно по таймеру (SVG):** В playing phase — таймер число нужно отобразить внутри SVG.
Обернуть весь левый блок (svg + число) в `relative` div, наложить `<div className="absolute inset-0 flex items-center justify-center flex-col">` с числом секунд и подписью.

---

## 4. Дополнительные детали

### Peek bar (phone playing phase)

```typescript
const [peeking, setPeeking] = useState(false);

// В JSX:
<div
  className="glass-card px-4 py-3 flex items-center justify-between select-none"
  onPointerDown={() => setPeeking(true)}
  onPointerUp={() => setPeeking(false)}
  onPointerLeave={() => setPeeking(false)}
>
  <div>
    <p className="text-xs text-white/40">твоё слово</p>
    {peeking
      ? (isSpy
          ? <p className="text-white/60">Слова у тебя нет · <span className="text-teal-300">{categoryIcon} {category}</span></p>
          : <p className="text-xl font-bold">{word}</p>)
      : <p className="text-white/40">👁 Зажми, чтобы увидеть</p>
    }
  </div>
</div>
```

### Local vote state (phone voting phase)

```typescript
const [localVote, setLocalVote] = useState<string | null>(null);
const [hasVoted, setHasVoted] = useState(false);

// Reset when phase changes to voting
useEffect(() => {
  if (s.phase === 'voting') {
    setLocalVote(null);
    setHasVoted(false);
  }
}, [s.phase]);

const handleSubmitVote = () => {
  if (!localVote || hasVoted) return;
  submitVote(localVote);
  setHasVoted(true);
};
```

### Derived values (top of component, after state declarations)

```typescript
const isSpy = effectivePlayerId === s.spyId;
const isActivePlayer = s.playerOrder[s.playerOrderIdx % Math.max(s.playerOrder.length, 1)] === effectivePlayerId;
const activePlayerName = s.players.find(p => p.id === s.playerOrder[s.playerOrderIdx % Math.max(s.playerOrder.length, 1)])?.nickname ?? '???';
const myReadyInDealing = s.readyPlayers.includes(effectivePlayerId);
const myVoteInVoting = s.votes[effectivePlayerId];
```

---

## 5. Acceptance criteria

1. `npm run build` и `npm run lint` проходят без новых ошибок.
2. Новые поля `SPY_LOCATIONS` и `SpyLocation` экспортируются из `game-data.ts`.
3. Phone: 5 фаз рендерятся (modeSelect, dealing с 2 вариантами шпион/мирный, playing с peek, voting, roundResult).
4. TV: 5 фаз рендерятся без ошибок (modeSelect, dealing, playing с SVG-таймером, voting, roundResult).
5. Draw mode удалён из обоих файлов (ни `DrawCanvas`, ни `spy:stroke`/`spy:clear`).
6. `spy:ready` и `spy:vote` action'ы обрабатываются в хосте.
7. Нет TypeScript-ошибок (`tsc --noEmit`).

---

## 6. Не трогать

- Логика reconnect/guest (`useGameIdentity`, `useRoomState`, `useNavigateOnGameEnd`).
- `GameLayout` проп API (title, icon, onEnd, phaseKey).
- Все другие игры в TV-файле.
- `server.mts` и `src/server/socket-handlers.mts`.
- i18n: используй `l(ru, en)` хелпер для всех видимых строк (импорт `useTranslation`).

---

## 7. Отчёт

`codex-reports/226-spy-full-redesign.md` — что изменено, строки, diff summary.
