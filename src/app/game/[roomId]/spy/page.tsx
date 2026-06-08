'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSocket } from '@/lib/use-socket';
import { useRoomState } from '@/lib/use-room-state';
import { useGameAction, useGameBroadcast } from '@/lib/use-game-action';
import { useNavigateOnGameEnd } from '@/lib/use-navigate-on-game-end';
import { useGameIdentity } from '@/lib/use-game-identity';
import { useTranslation } from '@/lib/i18n';
import { GameLayout } from '@/components/games/GameLayout';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { SPY_WORDS } from '@/lib/game-data';

// ── Types ──

type SpyMode = 'guess' | 'draw';
type Phase = 'modeSelect' | 'playing';

interface GamePlayer { id: string; nickname: string; isHost: boolean; }

interface SpyGameState {
  phase: Phase;
  mode: SpyMode;
  word: string;
  spyId: string;
  drawerId: string;
  usedWords: number[];
  players: GamePlayer[];
  playerOrder: string[];   // shuffled player IDs for turn order
  playerOrderIdx: number;  // current active player index
  timerLeft: number;       // seconds (300 = 5 min)
  timerRunning: boolean;
}

interface DrawStroke {
  x1: number; y1: number; x2: number; y2: number;
}

const TIMER_TOTAL = 300; // 5 minutes

const mkInitial = (): SpyGameState => ({
  phase: 'modeSelect',
  mode: 'guess',
  word: '',
  spyId: '',
  drawerId: '',
  usedWords: [],
  players: [],
  playerOrder: [],
  playerOrderIdx: 0,
  timerLeft: TIMER_TOTAL,
  timerRunning: false,
});

const formatTime = (sec: number) =>
  `${Math.floor(sec / 60)}:${(sec % 60).toString().padStart(2, '0')}`;

// ── Drawing Canvas ──

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
          {locale === "ru" ? "Очистить" : "Clear"}
        </button>
      )}
    </div>
  );
}

// ── Main component ──

export default function SpyGamePage() {
  const { roomId } = useParams<{ roomId: string }>();
  const router = useRouter();
  const { locale } = useTranslation();
  const { user, effectivePlayerId, isGameHost } = useGameIdentity(roomId);
  useNavigateOnGameEnd(roomId, user ? 'lobby' : 'phone');
  const { emit, on } = useSocket();

  const [s, setS] = useState<SpyGameState>(mkInitial);

  // Always-fresh ref for use inside intervals/closures
  const sRef = useRef(s);
  useEffect(() => { sRef.current = s; }, [s]);

  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isSpy = effectivePlayerId === s.spyId;

  // Active player = current questioner (guess) or drawer (draw)
  const activePlayerId = s.playerOrder.length > 0
    ? s.playerOrder[s.playerOrderIdx % s.playerOrder.length]
    : '';
  const isActivePlayer = effectivePlayerId === activePlayerId;
  const activePlayerName = s.players.find(p => p.id === activePlayerId)?.nickname || '???';
  const isDrawer = s.mode === 'draw' && isActivePlayer;
  const sendAction = useGameAction(roomId);
  const broadcast = useGameBroadcast(roomId, 'spy:sync') as (payload: Partial<SpyGameState>) => void;
  const l = useCallback(
    (ru: string, en: string) => (locale === 'ru' ? ru : en),
    [locale],
  );

  useRoomState(roomId, (data) => {
    const room = data as { players: GamePlayer[] };
    setS(prev => ({ ...prev, players: room.players }));
  });

  // ── Socket ──
  useEffect(() => {
    const unsub = on('game:action', (data: unknown) => {
      const { action, payload } = data as { action: string; payload: Record<string, unknown> };
      if (action === 'spy:sync') {
        setS(prev => ({ ...prev, ...(payload as Partial<SpyGameState>) }));
      }
      if (action === 'spy:stroke') {
        const { x1, y1, x2, y2 } = payload as unknown as DrawStroke;
        const canvas = document.getElementById('spy-canvas') as HTMLCanvasElement | null;
        if (canvas) (canvas as unknown as { _drawLine?: (x1: number, y1: number, x2: number, y2: number) => void })._drawLine?.(x1, y1, x2, y2);
      }
      if (action === 'spy:clear') {
        const canvas = document.getElementById('spy-canvas') as HTMLCanvasElement | null;
        if (canvas) (canvas as unknown as { _clearAll?: () => void })._clearAll?.();
      }
    });
    return unsub;
  }, [on]);

  // ── Timer (host only) ──
  useEffect(() => {
    if (!isGameHost) return;

    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    if (s.timerRunning && s.timerLeft > 0) {
      timerIntervalRef.current = setInterval(() => {
        const cur = sRef.current;
        if (!cur.timerRunning || cur.timerLeft <= 0) {
          if (timerIntervalRef.current) { clearInterval(timerIntervalRef.current); timerIntervalRef.current = null; }
          return;
        }
        const newLeft = cur.timerLeft - 1;
        const patch = { timerLeft: newLeft, timerRunning: newLeft > 0 };
        setS(prev => ({ ...prev, ...patch }));
        broadcast(patch);
      }, 1000);
    }

    return () => {
      if (timerIntervalRef.current) { clearInterval(timerIntervalRef.current); timerIntervalRef.current = null; }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.timerRunning, isGameHost]);

  // ── Helpers ──
  // Broadcast patch AND update local state
  const update = useCallback((patch: Partial<SpyGameState>) => {
    setS(prev => ({ ...prev, ...patch }));
    broadcast(patch);
  }, [broadcast]);

  const sendStroke = useCallback((stroke: DrawStroke) => {
    sendAction('spy:stroke', stroke);
  }, [sendAction]);

  const sendClear = useCallback(() => {
    sendAction('spy:clear');
  }, [sendAction]);

  const shufflePlayers = (players: GamePlayer[]): string[] => {
    const ids = players.map(p => p.id);
    for (let i = ids.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [ids[i], ids[j]] = [ids[j], ids[i]];
    }
    return ids;
  };

  const pickRandomWord = (used: number[]): { word: string; idx: number } => {
    const available = SPY_WORDS.map((w, i) => ({ w, i })).filter(x => !used.includes(x.i));
    if (available.length === 0) {
      const idx = Math.floor(Math.random() * SPY_WORDS.length);
      return { word: SPY_WORDS[idx], idx };
    }
    const pick = available[Math.floor(Math.random() * available.length)];
    return { word: pick.w, idx: pick.i };
  };

  const pickRandomSpy = (players: GamePlayer[]): string => {
    const ids = players.map(p => p.id);
    return ids[Math.floor(Math.random() * ids.length)];
  };

  // ── Actions ──
  const startGame = (mode: SpyMode) => {
    if (!isGameHost) return;
    const { word, idx } = pickRandomWord([]);
    const spyId = pickRandomSpy(s.players);
    const playerOrder = shufflePlayers(s.players);
    // Broadcast full initial state so all clients are in sync
    update({
      phase: 'playing',
      mode,
      word,
      spyId,
      drawerId: mode === 'draw' ? playerOrder[0] : '',
      usedWords: [idx],
      playerOrder,
      playerOrderIdx: 0,
      timerLeft: TIMER_TOTAL,
      timerRunning: false,
    });
  };

  const nextWord = () => {
    if (!isGameHost) return;
    const { word, idx } = pickRandomWord(s.usedWords);
    const spyId = pickRandomSpy(s.players);
    const playerOrder = shufflePlayers(s.players);
    const newUsed = s.usedWords.length >= SPY_WORDS.length - 1 ? [idx] : [...s.usedWords, idx];
    sendClear();
    // Broadcast ALL relevant fields — guarantees all clients get consistent state
    update({
      word,
      spyId,
      drawerId: s.mode === 'draw' ? playerOrder[0] : '',
      usedWords: newUsed,
      playerOrder,
      playerOrderIdx: 0,
      timerLeft: TIMER_TOTAL,
      timerRunning: false,
    });
  };

  const passTurn = () => {
    if (!isActivePlayer && !isGameHost) return;
    const nextIdx = (s.playerOrderIdx + 1) % Math.max(s.playerOrder.length, 1);
    const nextPlayerId = s.playerOrder[nextIdx] ?? '';
    if (s.mode === 'draw') sendClear();
    update({
      playerOrderIdx: nextIdx,
      drawerId: s.mode === 'draw' ? nextPlayerId : '',
    });
  };

  const toggleTimer = () => {
    if (!isGameHost) return;
    if (s.timerLeft <= 0) {
      update({ timerLeft: TIMER_TOTAL, timerRunning: true });
    } else {
      update({ timerRunning: !s.timerRunning });
    }
  };

  const resetTimer = () => {
    if (!isGameHost) return;
    update({ timerLeft: TIMER_TOTAL, timerRunning: false });
  };

  const endGame = () => {
    emit('game:end', { code: roomId });
    router.push(user ? `/lobby/${roomId}` : `/join/${roomId}`);
  };

  // ── Render ──
  return (
    <GameLayout title={l('Шпион', 'Spy')} icon="🕵️‍♂️" onEnd={isGameHost ? endGame : undefined} phaseKey={s.phase}>

      {/* ── MODE SELECT + RULES ── */}
      {s.phase === 'modeSelect' && (
        <div className="max-w-lg mx-auto py-6 animate-fade-in space-y-4">
          <div className="text-center">
            <div className="text-6xl mb-2">🕵️‍♂️</div>
            <h2 className="text-2xl font-bold text-white mb-1">{l('ШПИОН', 'SPY')}</h2>
            <p className="text-white/50 text-sm">{l('Один из вас — шпион. Остальные знают слово.', 'One of you is the spy. Everyone else knows the word.')}</p>
          </div>

          {/* Rules */}
          <GlassCard className="p-4 space-y-3 text-sm">
            <p className="font-bold text-amber-400 text-base">{l('📖 Как играть', '📖 How to play')}</p>
            <div className="space-y-2 text-white/80">
              <p>
                <span className="text-white font-semibold">{l('🎭 Роли', '🎭 Roles')}</span>
                {' '}{l('— все видят секретное слово, кроме одного игрока: шпиона. Он должен это скрыть.', '— everyone sees the secret word except one player: the spy. They must hide it.')}
              </p>
              <p>
                <span className="text-white font-semibold">{l('💬 Вопросы', '💬 Questions')}</span>
                {' '}{l('— игроки задают друг другу вопросы, связанные со словом. Отвечай убедительно, не раскрывая слово — шпион слушает и пытается понять, что загадано.', '— players ask each other questions about the word. Answer convincingly without revealing it — the spy listens and tries to figure out the word.')}
              </p>
              <p>
                <span className="text-white font-semibold">{l('🕵️ Задача шпиона', "🕵️ The spy's goal")}</span>
                {' '}{l('— отвечать уклончиво, не выдавая незнания. Если угадает слово до разоблачения — победа!', '— answer evasively without showing ignorance. Guess the word before being exposed to win!')}
              </p>
              <p>
                <span className="text-white font-semibold">{l('🗳️ Голосование', '🗳️ Voting')}</span>
                {' '}{l('— в конце все голосуют: кто шпион? Ошиблись — шпион победил!', '— at the end everyone votes: who is the spy? Vote wrong and the spy wins!')}
              </p>
            </div>
            <div className="border-t border-white/10 pt-2 text-white/50 text-xs">
              {l('🎨 В режиме ', '🎨 In ')}<b>{l('«Нарисуй»', '“Draw”')}</b>{l(' каждый по очереди рисует слово. Шпион не знает что рисовать и старается скопировать других.', " mode each player draws the word in turn. The spy doesn't know what to draw and tries to copy others.")}
            </div>
          </GlassCard>

          {isGameHost ? (
            <div className="space-y-3">
              <p className="text-xs text-white/40 text-center">{l('Выберите режим:', 'Choose a mode:')}</p>
              <GlassButton variant="primary" size="lg" className="w-full" onClick={() => startGame('guess')}>
                <span className="text-2xl mr-2">💬</span> {l('Угадай слово', 'Guess the Word')}
              </GlassButton>
              <GlassButton variant="primary" size="lg" className="w-full" onClick={() => startGame('draw')}>
                <span className="text-2xl mr-2">🎨</span> {l('Нарисуй', 'Draw')}
              </GlassButton>
            </div>
          ) : (
            <p className="text-white/40 text-sm text-center animate-pulse">{l('Хост выбирает режим...', 'Host is choosing a mode...')}</p>
          )}
        </div>
      )}

      {/* ── PLAYING ── */}
      {s.phase === 'playing' && (
        <div className="max-w-md mx-auto w-full py-4 animate-fade-in space-y-3">

          {/* Mode badge */}
          <div className="text-center">
            <span className="glass-badge px-4 py-1.5 text-sm font-bold">
              {s.mode === 'guess' ? l('💬 Угадай слово', '💬 Guess the Word') : l('🎨 Нарисуй', '🎨 Draw')}
            </span>
          </div>

          {/* Timer */}
          <GlassCard className="p-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="text-2xl">⏱️</span>
              <span className={`text-3xl font-black tabular-nums ${
                s.timerLeft <= 30 && s.timerRunning ? 'text-red-400 animate-pulse'
                : s.timerLeft <= 60 ? 'text-amber-400'
                : 'text-white'
              }`}>
                {formatTime(s.timerLeft)}
              </span>
              {s.timerRunning && (
                <span className="text-green-400 text-xs font-bold animate-pulse">{l('● ИДЁТ', '● LIVE')}</span>
              )}
              {!s.timerRunning && s.timerLeft < TIMER_TOTAL && s.timerLeft > 0 && (
                <span className="text-white/40 text-xs">{l('на паузе', 'paused')}</span>
              )}
              {s.timerLeft === 0 && (
                <span className="text-red-400 text-sm font-bold">{l('Время вышло!', "Time's up!")}</span>
              )}
            </div>
            {isGameHost && (
              <div className="flex gap-2">
                <button
                  onClick={toggleTimer}
                  className={`px-3 py-1.5 rounded-md text-sm font-bold transition-colors ${
                    s.timerRunning
                      ? 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30'
                      : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                  }`}
                >
                  {s.timerRunning ? l('⏸ Стоп', '⏸ Stop') : l('▶ Старт', '▶ Start')}
                </button>
                <button
                  onClick={resetTimer}
                  className="px-3 py-1.5 rounded-md text-sm text-white/40 bg-white/5 hover:bg-white/10 transition-colors"
                >
                  ↺
                </button>
              </div>
            )}
          </GlassCard>

          {/* Spy or Word card */}
          <GlassCard className={`p-6 text-center ${isSpy ? 'border-red-500/50 bg-red-900/20' : 'border-amber-500/50 bg-amber-900/20'}`}>
            {isSpy ? (
              <>
                <div className="text-5xl mb-3">🕵️‍♂️</div>
                <h2 className="text-3xl font-black text-red-400 mb-2">{l('ТЫ ШПИОН', 'YOU ARE THE SPY')}</h2>
                <p className="text-white/50 text-sm">{l('Ты не знаешь слово. Притворяйся убедительно!', "You don't know the word. Bluff convincingly!")}</p>
              </>
            ) : (
              <>
                <p className="text-xs text-amber-400/70 font-bold tracking-widest mb-2">{l('СЕКРЕТНОЕ СЛОВО', 'SECRET WORD')}</p>
                <h2 className="text-4xl font-black text-white mb-2">{s.word}</h2>
                <p className="text-white/40 text-sm">{l('Один из игроков — шпион и не знает это слово', "One of the players is the spy and doesn't know this word")}</p>
              </>
            )}
          </GlassCard>

          {/* Active player indicator */}
          {activePlayerId && (
            <div className={`rounded-xl border px-4 py-3 text-center text-sm transition-all ${
              isActivePlayer
                ? 'border-purple-400/60 bg-purple-500/15 text-purple-300'
                : 'border-white/10 bg-white/5 text-white/50'
            }`}>
              {isActivePlayer ? (
                <span className="font-bold">
                  {s.mode === 'guess' ? l('🎤 Твой ход — задавай вопрос!', '🎤 Your turn — ask a question!') : l('🎨 Твой ход — рисуй!', '🎨 Your turn — draw!')}
                </span>
              ) : (
                <span>
                  {s.mode === 'guess' ? l('🎤 Вопрос задаёт: ', '🎤 Asking: ') : l('🎨 Рисует: ', '🎨 Drawing: ')}
                  <span className="font-bold text-white">{activePlayerName}</span>
                </span>
              )}
            </div>
          )}

          {/* Drawing canvas (draw mode only) */}
          {s.mode === 'draw' && (
            <div>
              <DrawCanvas canDraw={isDrawer} onStroke={sendStroke} onClear={sendClear} />
            </div>
          )}

          {/* Pass turn button — active player or host */}
          {(isActivePlayer || isGameHost) && s.playerOrder.length > 0 && (
            <GlassButton className="w-full" onClick={passTurn}>
              {s.mode === 'guess' ? l('➡ Передать слово следующему', '➡ Pass the word on') : l('➡ Передать ход', '➡ Pass turn')}
            </GlassButton>
          )}

          {/* Host controls */}
          {isGameHost && (
            <GlassButton variant="primary" size="lg" className="w-full" onClick={nextWord}>
              {l('🔄 Следующее слово', '🔄 Next word')}
            </GlassButton>
          )}

          {/* Player turn order (guess mode) */}
          {s.mode === 'guess' && s.playerOrder.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs text-white/30 text-center">{l('Порядок ходов', 'Turn order')}</p>
              <div className="flex flex-wrap gap-2 justify-center">
                {s.playerOrder.map((id, i) => {
                  const name = s.players.find(p => p.id === id)?.nickname ?? id;
                  const isActive = i === s.playerOrderIdx % s.playerOrder.length;
                  return (
                    <span
                      key={id}
                      className={`text-xs px-2.5 py-1 rounded-full border transition-all ${
                        isActive
                          ? 'border-purple-400/60 bg-purple-500/20 text-purple-300 font-bold'
                          : 'border-white/10 text-white/30'
                      }`}
                    >
                      {isActive ? '🎤 ' : ''}{name}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {/* Info for non-host */}
          {!isGameHost && !isActivePlayer && (
            <p className="text-center text-xs text-white/25 mt-1">
              {s.mode === 'guess'
                ? l('Слушайте вопросы и ответы — вычислите шпиона!', 'Listen to the questions and answers — find the spy!')
                : l('Хост нажмёт «Следующее слово» когда будете готовы', "The host will tap “Next word” when you're ready")}
            </p>
          )}
        </div>
      )}
    </GameLayout>
  );
}
