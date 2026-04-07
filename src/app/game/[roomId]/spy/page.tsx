'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useSocket } from '@/lib/use-socket';
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
  usedWords: number[];
  players: GamePlayer[];
}

const mkInitial = (): SpyGameState => ({
  phase: 'modeSelect',
  mode: 'guess',
  word: '',
  spyId: '',
  usedWords: [],
  players: [],
});

// ── Drawing canvas component ──

function DrawCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const lastPos = useRef<{ x: number; y: number } | null>(null);

  const getPos = (e: React.TouchEvent | React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    if ('touches' in e) {
      return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
    }
    return { x: (e as React.MouseEvent).clientX - rect.left, y: (e as React.MouseEvent).clientY - rect.top };
  };

  const startDraw = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    drawing.current = true;
    lastPos.current = getPos(e);
  };

  const moveDraw = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    if (!drawing.current || !lastPos.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;
    const pos = getPos(e);
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    lastPos.current = pos;
  };

  const endDraw = () => {
    drawing.current = false;
    lastPos.current = null;
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  // Set canvas resolution on mount
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * 2;
    canvas.height = rect.height * 2;
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.scale(2, 2);
  }, []);

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        className="w-full aspect-square rounded-xl bg-black/30 border border-white/10 touch-none"
        onMouseDown={startDraw} onMouseMove={moveDraw} onMouseUp={endDraw} onMouseLeave={endDraw}
        onTouchStart={startDraw} onTouchMove={moveDraw} onTouchEnd={endDraw}
      />
      <button onClick={clearCanvas}
        className="absolute top-2 right-2 px-3 py-1 rounded-lg bg-white/10 text-white/50 text-xs hover:bg-white/20">
        Очистить
      </button>
    </div>
  );
}

// ── Main component ──

export default function SpyGamePage() {
  const { roomId } = useParams<{ roomId: string }>();
  const { user } = useAuth();
  const { emit, on } = useSocket();
  const router = useRouter();

  const [s, setS] = useState<SpyGameState>(mkInitial);

  const isHost = s.players.find(p => p.id === user?.id)?.isHost ?? false;
  const isSpy = user?.id === s.spyId;
  const spyName = s.players.find(p => p.id === s.spyId)?.nickname || '???';

  // ── Socket ──
  useEffect(() => {
    const u1 = on('room:state', (data: unknown) => {
      const room = data as { players: GamePlayer[] };
      setS(prev => ({ ...prev, players: room.players }));
    });
    const u2 = on('game:action', (data: unknown) => {
      const { action, payload } = data as { action: string; payload: Partial<SpyGameState> };
      if (action === 'spy:sync') setS(prev => ({ ...prev, ...payload }));
    });
    const u3 = on('game:ended', () => router.push(`/lobby/${roomId}`));
    emit('room:get-state', { code: roomId });
    return () => { u1(); u2(); u3(); };
  }, [on, emit, router, roomId]);

  const broadcast = useCallback((payload: Partial<SpyGameState>) => {
    emit('game:action', { code: roomId, action: 'spy:sync', payload });
  }, [emit, roomId]);

  const update = useCallback((patch: Partial<SpyGameState>) => {
    setS(prev => ({ ...prev, ...patch }));
    broadcast(patch);
  }, [broadcast]);

  // ── Actions ──
  const pickRandomWord = (used: number[]): { word: string; idx: number } => {
    const available = SPY_WORDS.map((w, i) => ({ w, i })).filter(x => !used.includes(x.i));
    if (available.length === 0) {
      // Reset pool
      const idx = Math.floor(Math.random() * SPY_WORDS.length);
      return { word: SPY_WORDS[idx], idx };
    }
    const pick = available[Math.floor(Math.random() * available.length)];
    return { word: pick.w, idx: pick.i };
  };

  const pickRandomSpy = (): string => {
    const playerIds = s.players.map(p => p.id);
    return playerIds[Math.floor(Math.random() * playerIds.length)];
  };

  const startGame = (mode: SpyMode) => {
    if (!isHost) return;
    const { word, idx } = pickRandomWord([]);
    const spyId = pickRandomSpy();
    update({
      phase: 'playing',
      mode,
      word,
      spyId,
      usedWords: [idx],
    });
  };

  const nextWord = () => {
    if (!isHost) return;
    const { word, idx } = pickRandomWord(s.usedWords);
    const spyId = pickRandomSpy();
    const newUsed = s.usedWords.length >= SPY_WORDS.length - 1 ? [idx] : [...s.usedWords, idx];
    update({ word, spyId, usedWords: newUsed });
  };

  const endGame = () => {
    if (confirm('Завершить игру?')) {
      emit('game:end', { code: roomId });
    }
  };

  // ── Render ──
  return (
    <GameLayout title="Шпион" icon="🕵️‍♂️" onEnd={isHost ? endGame : undefined}>

      {/* ── MODE SELECT ── */}
      {s.phase === 'modeSelect' && (
        <div className="max-w-md mx-auto text-center py-8 animate-fade-in">
          <div className="text-6xl mb-4">🕵️‍♂️</div>
          <h2 className="text-2xl font-bold text-white mb-2">ШПИОН</h2>
          <p className="text-white/50 text-sm mb-6">Один из вас — шпион! Остальные знают слово.</p>

          {isHost ? (
            <div className="space-y-3">
              <p className="text-xs text-white/40 mb-2">Выберите режим:</p>
              <GlassButton variant="primary" size="lg" className="w-full" onClick={() => startGame('guess')}>
                <span className="text-2xl mr-2">💬</span> Угадай слово
              </GlassButton>
              <GlassButton variant="primary" size="lg" className="w-full" onClick={() => startGame('draw')}>
                <span className="text-2xl mr-2">🎨</span> Нарисуй
              </GlassButton>
            </div>
          ) : (
            <p className="text-white/40 text-sm animate-pulse">Хост выбирает режим...</p>
          )}
        </div>
      )}

      {/* ── PLAYING ── */}
      {s.phase === 'playing' && (
        <div className="max-w-md mx-auto w-full py-6 animate-fade-in">
          {/* Mode badge */}
          <div className="text-center mb-4">
            <span className="glass-badge px-4 py-1.5 text-sm font-bold">
              {s.mode === 'guess' ? '💬 Угадай слово' : '🎨 Нарисуй'}
            </span>
          </div>

          {/* Card — spy or word */}
          <GlassCard className={`p-8 mb-5 text-center ${isSpy ? 'border-red-500/50 bg-red-900/20' : 'border-amber-500/50 bg-amber-900/20'}`}>
            {isSpy ? (
              <>
                <div className="text-5xl mb-3">🕵️‍♂️</div>
                <h2 className="text-3xl font-black text-red-400 mb-2">ТЫ ШПИОН</h2>
                <p className="text-white/50 text-sm">Ты не знаешь слово. Притворяйся!</p>
              </>
            ) : (
              <>
                <p className="text-xs text-amber-400/70 font-bold tracking-widest mb-2">СЛОВО</p>
                <h2 className="text-4xl font-black text-white mb-2">{s.word}</h2>
                <p className="text-white/40 text-sm">Один из игроков — шпион и не знает это слово</p>
              </>
            )}
          </GlassCard>

          {/* Drawing canvas (draw mode only) */}
          {s.mode === 'draw' && (
            <div className="mb-5">
              <DrawCanvas />
            </div>
          )}

          {/* Next word button (host only) */}
          {isHost && (
            <div className="text-center">
              <GlassButton variant="primary" size="lg" onClick={nextWord}>
                Следующее слово
              </GlassButton>
            </div>
          )}

          {/* Non-host sees smaller info */}
          {!isHost && (
            <p className="text-center text-xs text-white/30 mt-2">Хост нажмёт «Следующее слово» когда будете готовы</p>
          )}
        </div>
      )}
    </GameLayout>
  );
}
