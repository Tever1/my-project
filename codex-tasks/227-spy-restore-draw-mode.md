# TASK-227 — Spy: вернуть draw mode поверх TASK-226

## Контекст

TASK-226 добавил новый guess mode (локации, dealing, voting, roundResult).
При этом draw mode был удалён — его нужно вернуть.

Draw mode — отдельная механика: один игрок рисует слово пальцем на canvas,
остальные угадывают вслух. Шпион не знает слова и старается копировать чужие
движения. Использует `SPY_WORDS` (простые существительные), а НЕ `SPY_LOCATIONS`.

## Whitelist файлов

- `src/app/game/[roomId]/spy/page.tsx`
- `src/app/tv/[roomId]/[gameType]/page.tsx`

## Что нужно сделать

### 1. spy/page.tsx

#### 1.1 Восстановить интерфейс DrawStroke

Добавить после импортов, перед первым `type`:

```typescript
interface DrawStroke {
  x1: number; y1: number; x2: number; y2: number;
}
```

#### 1.2 SpyMode → вернуть 'draw'

```typescript
type SpyMode = 'guess' | 'draw';
```

#### 1.3 Добавить drawerId в SpyGameState

В интерфейс `SpyGameState` добавить:
```typescript
drawerId: string;
usedWordIndices: number[];   // для draw mode (SPY_WORDS)
```

В `mkInitial()`:
```typescript
drawerId: '',
usedWordIndices: [],
```

#### 1.4 Восстановить DrawCanvas компонент

Добавить ДО `export default function SpyGamePage()`, после `DrawStroke`:

```typescript
interface DrawCanvasProps {
  canDraw: boolean;
  onStroke: (stroke: DrawStroke) => void;
  onClear: () => void;
}

function DrawCanvas({ canDraw, onStroke, onClear }: DrawCanvasProps) {
  const { locale } = useTranslation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const lastPos = useRef<{ x: number; y: number } | null>(null);
  const sizeRef = useRef({ w: 0, h: 0 });

  const getNormPos = (e: React.TouchEvent | React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    if ('touches' in e) {
      return { x: (e.touches[0].clientX - rect.left) / rect.width, y: (e.touches[0].clientY - rect.top) / rect.height };
    }
    return { x: ((e as React.MouseEvent).clientX - rect.left) / rect.width, y: ((e as React.MouseEvent).clientY - rect.top) / rect.height };
  };

  const startDraw = (e: React.TouchEvent | React.MouseEvent) => {
    if (!canDraw) return;
    e.preventDefault();
    drawing.current = true;
    lastPos.current = getNormPos(e);
  };

  const moveDraw = (e: React.TouchEvent | React.MouseEvent) => {
    if (!canDraw) return;
    e.preventDefault();
    if (!drawing.current || !lastPos.current) return;
    const pos = getNormPos(e);
    onStroke({ x1: lastPos.current.x, y1: lastPos.current.y, x2: pos.x, y2: pos.y });
    drawLine(lastPos.current.x, lastPos.current.y, pos.x, pos.y);
    lastPos.current = pos;
  };

  const endDraw = () => { drawing.current = false; lastPos.current = null; };

  const drawLine = useCallback((x1: number, y1: number, x2: number, y2: number) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(x1 * sizeRef.current.w, y1 * sizeRef.current.h);
    ctx.lineTo(x2 * sizeRef.current.w, y2 * sizeRef.current.h);
    ctx.stroke();
  }, []);

  const clearAll = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * 2;
    canvas.height = rect.height * 2;
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.scale(2, 2);
    sizeRef.current = { w: rect.width, h: rect.height };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    (canvas as unknown as { _drawLine: typeof drawLine; _clearAll: typeof clearAll })._drawLine = drawLine;
    (canvas as unknown as { _clearAll: typeof clearAll })._clearAll = clearAll;
  }, [drawLine, clearAll]);

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        id="spy-canvas"
        className={`w-full aspect-square rounded-xl bg-black/30 border transition-all touch-none ${canDraw ? 'border-amber-400/40' : 'border-white/10'}`}
        onMouseDown={startDraw} onMouseMove={moveDraw} onMouseUp={endDraw} onMouseLeave={endDraw}
        onTouchStart={startDraw} onTouchMove={moveDraw} onTouchEnd={endDraw}
      />
      {canDraw && (
        <button
          onClick={() => { clearAll(); onClear(); }}
          className="absolute top-2 right-2 px-3 py-1 rounded-md bg-white/10 text-white/50 text-xs hover:bg-white/20"
        >
          {locale === 'ru' ? 'Очистить' : 'Clear'}
        </button>
      )}
    </div>
  );
}
```

#### 1.5 Добавить импорт SPY_WORDS

В строке с импортом из `@/lib/game-data` добавить `SPY_WORDS`:
```typescript
import { SPY_LOCATIONS, SpyLocation, SPY_WORDS } from '@/lib/game-data';
```

#### 1.6 Добавить хелперы для SPY_WORDS (draw mode)

Рядом с `pickLocation`:

```typescript
const pickWord = (used: number[]): { word: string; idx: number } => {
  const available = SPY_WORDS.map((w, i) => ({ w, i })).filter(x => !used.includes(x.i));
  if (available.length === 0) {
    const i = Math.floor(Math.random() * SPY_WORDS.length);
    return { word: SPY_WORDS[i], idx: i };
  }
  const pick = available[Math.floor(Math.random() * available.length)];
  return { word: pick.w, idx: pick.i };
};
```

#### 1.7 Добавить sendStroke / sendClear / isDrawer

В компоненте, после `sendAction`:

```typescript
const sendStroke = useCallback((stroke: DrawStroke) => {
  sendAction('spy:stroke', stroke);
}, [sendAction]);

const sendClear = useCallback(() => {
  sendAction('spy:clear');
}, [sendAction]);

// isDrawer: only relevant in draw mode
const isDrawer = s.mode === 'draw' && s.drawerId === effectivePlayerId;
```

#### 1.8 Восстановить spy:stroke и spy:clear в socket listener

В `useEffect` с `on('game:action', ...)` добавить после существующих кейсов:

```typescript
if (action === 'spy:stroke') {
  const { x1, y1, x2, y2 } = payload as unknown as DrawStroke;
  const canvas = document.getElementById('spy-canvas') as HTMLCanvasElement | null;
  if (canvas) (canvas as unknown as { _drawLine?: (x1: number, y1: number, x2: number, y2: number) => void })._drawLine?.(x1, y1, x2, y2);
}
if (action === 'spy:clear') {
  const canvas = document.getElementById('spy-canvas') as HTMLCanvasElement | null;
  if (canvas) (canvas as unknown as { _clearAll?: () => void })._clearAll?.();
}
```

#### 1.9 startGame — разделить по режиму

Найти существующую функцию `startGame` и изменить так:

```typescript
const startGame = (mode: SpyMode) => {
  if (!isGameHost) return;
  if (mode === 'draw') {
    // Draw mode: simple words, no dealing phase, straight to playing
    const { word, idx } = pickWord([]);
    const spyId = pickRandomSpy(s.players);
    const playerOrder = shufflePlayers(s.players);
    update({
      phase: 'playing',
      mode: 'draw',
      word,
      category: '',
      categoryIcon: '',
      locationIdx: -1,
      usedLocationIndices: [],
      usedWordIndices: [idx],
      spyId,
      drawerId: playerOrder[0] ?? '',
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
      totalRounds: Math.max(3, Math.min(s.players.length, 7)),
      gameOver: false,
    });
  } else {
    // Guess mode: location-based, dealing phase
    // (этот код уже есть как startGame в TASK-226, сохранить его)
    // ... существующий код guess startGame ...
  }
};
```

#### 1.10 nextWord (draw mode) — восстановить

Добавить функцию `nextWord` для draw mode:

```typescript
const nextWord = () => {
  if (!isGameHost || s.mode !== 'draw') return;
  const { word, idx } = pickWord(s.usedWordIndices);
  const spyId = pickRandomSpy(s.players);
  const playerOrder = shufflePlayers(s.players);
  const newUsed = s.usedWordIndices.length >= SPY_WORDS.length - 1 ? [idx] : [...s.usedWordIndices, idx];
  sendClear();
  update({
    word,
    spyId,
    drawerId: playerOrder[0] ?? '',
    usedWordIndices: newUsed,
    playerOrder,
    playerOrderIdx: 0,
    timerLeft: 300,
    timerRunning: false,
  });
};
```

#### 1.11 passTurn — добавить draw mode поведение

В существующем `passTurn`, после вычисления `nextIdx`:

```typescript
const nextPlayerId = s.playerOrder[nextIdx] ?? '';
if (s.mode === 'draw') sendClear();
update({
  playerOrderIdx: nextIdx,
  drawerId: s.mode === 'draw' ? nextPlayerId : s.drawerId,
});
```

#### 1.12 modeSelect UI — добавить кнопку draw

В фазе `modeSelect`, для `isGameHost`, добавить вторую кнопку:

```jsx
<GlassButton variant="primary" size="lg" className="w-full" onClick={() => startGame('guess')}>
  <span className="text-2xl mr-2">💬</span> {l('Угадай слово', 'Guess the Word')}
</GlassButton>
<GlassButton variant="secondary" size="lg" className="w-full" onClick={() => startGame('draw')}>
  <span className="text-2xl mr-2">🎨</span> {l('Нарисуй', 'Draw')}
</GlassButton>
```

Добавить в rules card (внутри GlassCard с правилами) секцию о draw mode:

```jsx
<div className="border-t border-white/10 pt-2 text-white/50 text-xs">
  {l('🎨 В режиме ', '🎨 In ')}
  <b>{l('«Нарисуй»', '"Draw"')}</b>
  {l(' каждый по очереди рисует слово. Шпион не знает что рисовать.', ' mode each player draws the word in turn. The spy doesn\'t know what to draw.')}
</div>
```

#### 1.13 playing phase — добавить draw mode UI

В рендере фазы `playing`, после существующего spy/word card:

```jsx
{/* Drawing canvas — draw mode only */}
{s.mode === 'draw' && (
  <DrawCanvas canDraw={isDrawer} onStroke={sendStroke} onClear={sendClear} />
)}

{/* Active player indicator */}
<div className={`rounded-xl border px-4 py-3 text-center text-sm transition-all ${
  isActivePlayer ? 'border-purple-400/60 bg-purple-500/15 text-purple-300'
  : 'border-white/10 bg-white/5 text-white/50'
}`}>
  {isActivePlayer
    ? <span className="font-bold">
        {s.mode === 'draw'
          ? l('🎨 Твой ход — рисуй!', '🎨 Your turn — draw!')
          : l('🎤 Твой ход — задавай вопрос!', '🎤 Your turn — ask a question!')}
      </span>
    : <span>
        {s.mode === 'draw'
          ? <>{l('🎨 Рисует: ', '🎨 Drawing: ')}<span className="font-bold text-white">{activePlayerName}</span></>
          : <>{l('🎤 Сейчас отвечает: ', '🎤 Now answering: ')}<span className="font-bold text-white">{activePlayerName}</span></>}
      </span>
  }
</div>

{/* Pass turn — draw mode OR active player in guess mode */}
{s.mode === 'draw' && (isActivePlayer || isGameHost) && (
  <GlassButton className="w-full" onClick={passTurn}>
    {l('➡ Передать ход', '➡ Pass turn')}
  </GlassButton>
)}

{/* Next word — draw mode only, host only */}
{s.mode === 'draw' && isGameHost && (
  <GlassButton variant="primary" size="lg" className="w-full" onClick={nextWord}>
    {l('🔄 Следующее слово', '🔄 Next word')}
  </GlassButton>
)}
```

### 2. tv/page.tsx

#### 2.1 Восстановить spyCanvasRef и spyCanvasSizeRef

В компоненте (там где уже есть `spyState`), добавить:

```typescript
const spyCanvasRef = useRef<HTMLCanvasElement>(null);
const spyCanvasSizeRef = useRef({ w: 0, h: 0 });

const initSpyCanvas = useCallback((canvas: HTMLCanvasElement | null) => {
  if (!canvas || spyCanvasRef.current === canvas) return;
  spyCanvasRef.current = canvas;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * 2;
  canvas.height = rect.height * 2;
  const ctx = canvas.getContext('2d');
  if (ctx) ctx.scale(2, 2);
  spyCanvasSizeRef.current = { w: rect.width, h: rect.height };
}, []);
```

#### 2.2 Восстановить spy:stroke и spy:clear в TV listener

В `useEffect` с `on('game:action', ...)`, в блоке `if (gameType === 'spy')`:

```typescript
if (action === 'spy:stroke') {
  const { x1, y1, x2, y2 } = payload as unknown as { x1: number; y1: number; x2: number; y2: number };
  const canvas = spyCanvasRef.current;
  if (canvas) {
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const { w, h } = spyCanvasSizeRef.current;
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(x1 * w, y1 * h);
      ctx.lineTo(x2 * w, y2 * h);
      ctx.stroke();
    }
  }
}
if (action === 'spy:clear') {
  const canvas = spyCanvasRef.current;
  if (canvas) {
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
}
```

#### 2.3 TV playing phase — добавить draw mode рендер

В TV spy `playing` phase блоке, добавить условие:

```jsx
{/* Draw mode: big canvas instead of spotlight */}
{sp.phase === 'playing' && sp.mode === 'draw' && (
  <div className="h-full flex flex-col items-center justify-center gap-4 px-12 py-6">
    <p className="text-2xl text-white/50">
      {l('🎨 Рисует: ', '🎨 Drawing: ')}
      <span className="font-bold text-amber-400">{activePlayerName}</span>
    </p>
    <div className="flex-1 min-h-0 w-full flex items-center justify-center">
      <canvas
        ref={initSpyCanvas}
        className="rounded-2xl bg-black/30 border-2 border-white/10"
        style={{ width: 'min(100%, calc(100vh - 10rem))', aspectRatio: '1' }}
      />
    </div>
  </div>
)}
```

Существующий guess mode playing phase остаётся без изменений (уже за условием `sp.mode !== 'draw'` или рядом).

## Acceptance criteria

1. `npm run lint` — чисто
2. `tsc --noEmit` — чисто
3. modeSelect показывает ДВЕ кнопки: «Угадай слово» и «Нарисуй»
4. Нажатие «Нарисуй» → `phase: 'playing'`, canvas виден в TV
5. Нажатие «Угадай слово» → `phase: 'dealing'` (поведение TASK-226)
6. spy:stroke и spy:clear синхронизируются между phone и TV

## Не трогать

- Всю логику guess mode (dealing/voting/roundResult) из TASK-226
- GameLayout, useGameIdentity, useNavigateOnGameEnd
- Все остальные игры в TV-файле
- game-data.ts, server.mts

## Отчёт

`codex-reports/227-spy-restore-draw-mode.md`
