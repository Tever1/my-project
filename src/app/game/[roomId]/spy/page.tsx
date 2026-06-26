'use client';

import { type ReactNode, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSocket } from '@/lib/use-socket';
import { useRoomState } from '@/lib/use-room-state';
import { useGameAction, useGameBroadcast } from '@/lib/use-game-action';
import { useNavigateOnGameEnd } from '@/lib/use-navigate-on-game-end';
import { useGameIdentity } from '@/lib/use-game-identity';
import { useTranslation } from '@/lib/i18n';
import { GameLayout } from '@/components/games/GameLayout';
import { SpyIcon } from '@/components/games/SpyIcon';
import { BreathingPlaceholder } from '@/components/ingame';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { SPY_LOCATIONS, SpyLocation, SPY_WORDS } from '@/lib/game-data';

interface DrawStroke {
  x1: number; y1: number; x2: number; y2: number;
}

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

function FitWord({ text, className, max, min = 14 }: { text: string; className?: string; max: number; min?: number }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const [fontSize, setFontSize] = useState(max);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    let size = max;
    el.style.fontSize = `${size}px`;
    while (size > min && el.scrollWidth > el.clientWidth) {
      size -= 1;
      el.style.fontSize = `${size}px`;
    }
    const frame = requestAnimationFrame(() => setFontSize(size));
    return () => cancelAnimationFrame(frame);
  }, [text, max, min]);
  return (
    <p ref={ref} className={className} style={{ fontSize, whiteSpace: 'nowrap', overflow: 'hidden' }}>
      {text}
    </p>
  );
}

type SpyMode = 'guess' | 'draw';
type Phase = 'modeSelect' | 'dealing' | 'playing' | 'voting' | 'spyGuess' | 'roundResult';

interface GamePlayer { id: string; nickname: string; isHost: boolean; }

interface SpyGameState {
  phase: Phase;
  mode: SpyMode;
  word: string;
  category: string;
  categoryIcon: string;
  locationIdx: number;
  usedLocationIndices: number[];
  drawerId: string;
  usedWordIndices: number[];
  spyId: string;
  players: GamePlayer[];
  playerOrder: string[];
  playerOrderIdx: number;
  timerLeft: number;
  timerRunning: boolean;
  readyPlayers: string[];
  votes: Record<string, string>;
  voteTimerLeft: number;
  voteTimerRunning: boolean;
  roundResult: {
    spyCaught: boolean;
    exposedId: string;
    voteCount: number;
    viaGuess?: boolean;
    guessedRight?: boolean;
  } | null;
  spyGuessText: string;
  spyGuessNeedsConfirm: boolean;
  spyGuessAwaitingJudge: boolean;
  spyGuessJudgeId: string;
  scores: Record<string, number>;
  lastRoundDelta: Record<string, number>;
  currentRound: number;
  totalRounds: number;
  gameOver: boolean;
}

const TIMER_TOTAL = 300;
const VOTE_TIMER_TOTAL = 60;
const mkInitial = (): SpyGameState => ({
  phase: 'modeSelect',
  mode: 'guess',
  word: '',
  category: '',
  categoryIcon: '',
  locationIdx: -1,
  usedLocationIndices: [],
  drawerId: '',
  usedWordIndices: [],
  spyId: '',
  players: [],
  playerOrder: [],
  playerOrderIdx: 0,
  timerLeft: TIMER_TOTAL,
  timerRunning: false,
  readyPlayers: [],
  votes: {},
  voteTimerLeft: VOTE_TIMER_TOTAL,
  voteTimerRunning: false,
  roundResult: null,
  spyGuessText: '',
  spyGuessNeedsConfirm: false,
  spyGuessAwaitingJudge: false,
  spyGuessJudgeId: '',
  scores: {},
  lastRoundDelta: {},
  currentRound: 1,
  totalRounds: 3,
  gameOver: false,
});

const formatTime = (sec: number) =>
  `${Math.floor(sec / 60)}:${(sec % 60).toString().padStart(2, '0')}`;

const normalizeWord = (w: string) =>
  w.trim().toLowerCase().replace(/ё/g, 'е').replace(/\s+/g, ' ');

const shufflePlayers = (players: GamePlayer[]): string[] => {
  const ids = players.map(p => p.id);
  for (let i = ids.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [ids[i], ids[j]] = [ids[j], ids[i]];
  }
  return ids;
};

const pickRandomSpy = (players: GamePlayer[]): string => {
  const ids = players.map(p => p.id);
  return ids[Math.floor(Math.random() * ids.length)] ?? '';
};

const pickLocation = (used: number[]): { loc: SpyLocation; idx: number } => {
  const available = SPY_LOCATIONS
    .map((loc, idx) => ({ loc, idx }))
    .filter(item => !used.includes(item.idx));

  if (available.length === 0) {
    const idx = Math.floor(Math.random() * SPY_LOCATIONS.length);
    return { loc: SPY_LOCATIONS[idx], idx };
  }

  const pick = available[Math.floor(Math.random() * available.length)];
  return { loc: pick.loc, idx: pick.idx };
};

const pickWord = (used: number[]): { word: string; idx: number } => {
  const available = SPY_WORDS.map((w, i) => ({ w, i })).filter(x => !used.includes(x.i));
  if (available.length === 0) {
    const i = Math.floor(Math.random() * SPY_WORDS.length);
    return { word: SPY_WORDS[i], idx: i };
  }
  const pick = available[Math.floor(Math.random() * available.length)];
  return { word: pick.w, idx: pick.i };
};

function resolveVoting(votes: Record<string, string>, s: SpyGameState): Partial<SpyGameState> {
  const tally: Record<string, number> = {};
  for (const suspectId of Object.values(votes)) {
    tally[suspectId] = (tally[suspectId] ?? 0) + 1;
  }

  let exposedId = '';
  let maxVotes = 0;
  for (const [id, count] of Object.entries(tally)) {
    if (count > maxVotes) {
      maxVotes = count;
      exposedId = id;
    }
  }

  const spyCaught = exposedId === s.spyId;

  return {
    phase: 'roundResult',
    voteTimerRunning: false,
    roundResult: { spyCaught, exposedId, voteCount: maxVotes },
  };
}

function resolveSpyGuess(correct: boolean, s: SpyGameState): Partial<SpyGameState> {
  return {
    phase: 'roundResult',
    spyGuessAwaitingJudge: false,
    spyGuessNeedsConfirm: false,
    spyGuessJudgeId: '',
    roundResult: { spyCaught: !correct, exposedId: s.spyId, voteCount: 0, viaGuess: true, guessedRight: correct },
  };
}

export default function SpyGamePage() {
  const { roomId } = useParams<{ roomId: string }>();
  const router = useRouter();
  const { locale } = useTranslation();
  const { user, effectivePlayerId, isGameHost } = useGameIdentity(roomId);
  useNavigateOnGameEnd(roomId, user ? 'lobby' : 'phone');
  const { emit, on } = useSocket();
  const sendAction = useGameAction(roomId);
  const broadcast = useGameBroadcast(roomId, 'spy:sync') as (payload: Partial<SpyGameState>) => void;

  const [s, setS] = useState<SpyGameState>(mkInitial);
  const [peeking, setPeeking] = useState(false);
  const [localVote, setLocalVote] = useState<string | null>(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [guessInput, setGuessInput] = useState('');
  const [confirmPlay, setConfirmPlay] = useState<null | 'replace' | 'voting'>(null);
  const [confirmBack, setConfirmBack] = useState(false);

  const sRef = useRef(s);
  useEffect(() => { sRef.current = s; }, [s]);

  const l = useCallback(
    (ru: string, en: string) => (locale === 'ru' ? ru : en),
    [locale],
  );

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

  useRoomState(roomId, (data) => {
    const room = data as { players: GamePlayer[] };
    setS(prev => ({ ...prev, players: room.players }));
  });

  const isSpy = effectivePlayerId === s.spyId;
  const isJudge = effectivePlayerId === s.spyGuessJudgeId;
  const isDrawer = s.mode === 'draw' && s.drawerId === effectivePlayerId;
  const activePlayerId = s.playerOrder[s.playerOrderIdx % Math.max(s.playerOrder.length, 1)] ?? '';
  const isActivePlayer = activePlayerId === effectivePlayerId;
  const activePlayerName = s.players.find(p => p.id === activePlayerId)?.nickname ?? '???';
  const myReadyInDealing = s.readyPlayers.includes(effectivePlayerId);
  const myVoteInVoting = s.votes[effectivePlayerId];
  const selectedVoteName = s.players.find(p => p.id === localVote)?.nickname ?? '';
  useEffect(() => {
    const unsub = on('game:action', (data: unknown) => {
      const { action, payload } = data as { action: string; payload: Record<string, unknown> };

      if (action === 'spy:sync') {
        const patch = payload as Partial<SpyGameState>;
        if (patch.phase === 'voting') {
          setLocalVote(null);
          setHasVoted(false);
        }
        if (patch.phase === 'spyGuess') {
          setGuessInput('');
        }
        if (patch.phase) setPeeking(false);
        setS(prev => ({ ...prev, ...patch }));
      }

      if (action === 'spy:request-state' && isGameHost) {
        broadcast(sRef.current);
      }

      if (action === 'spy:ready' && isGameHost) {
        const { playerId } = payload as { playerId: string };
        setS(prev => {
          const newReady = prev.readyPlayers.includes(playerId)
            ? prev.readyPlayers
            : [...prev.readyPlayers, playerId];
          const patch: Partial<SpyGameState> = { readyPlayers: newReady };
          if (newReady.length >= prev.players.length && prev.phase === 'dealing') {
            Object.assign(patch, { phase: 'playing' as Phase, timerRunning: true });
            if (prev.mode === 'draw') patch.drawerId = prev.playerOrder[0] ?? '';
          }
          broadcast(patch);
          return { ...prev, ...patch };
        });
      }

      if (action === 'spy:vote' && isGameHost) {
        const { voterId, suspectId } = payload as { voterId: string; suspectId: string };
        setS(prev => {
          const newVotes = { ...prev.votes, [voterId]: suspectId };
          const patch: Partial<SpyGameState> = { votes: newVotes };
          if (Object.keys(newVotes).length >= prev.players.length) {
            Object.assign(patch, resolveVoting(newVotes, prev));
          }
          broadcast(patch);
          return { ...prev, ...patch };
        });
      }

      if (action === 'spy:guess-start' && isGameHost) {
        setS(prev => {
          const patch: Partial<SpyGameState> = {
            phase: 'spyGuess',
            timerRunning: false,
            spyGuessText: '',
            spyGuessNeedsConfirm: false,
            spyGuessAwaitingJudge: false,
            spyGuessJudgeId: '',
          };
          broadcast(patch);
          return { ...prev, ...patch };
        });
      }

      if (action === 'spy:guess-try' && isGameHost) {
        const { text } = payload as { text: string };
        setS(prev => {
          const correct = normalizeWord(text) === normalizeWord(prev.word);
          const patch: Partial<SpyGameState> = correct
            ? resolveSpyGuess(true, prev)
            : { spyGuessText: text, spyGuessNeedsConfirm: true, spyGuessAwaitingJudge: false };
          broadcast(patch);
          return { ...prev, ...patch };
        });
      }

      if (action === 'spy:guess-confirm' && isGameHost) {
        setS(prev => {
          const candidates = prev.players.filter(p => p.id !== prev.spyId);
          const judge = candidates[Math.floor(Math.random() * candidates.length)]?.id ?? '';
          const patch: Partial<SpyGameState> = { spyGuessNeedsConfirm: false, spyGuessAwaitingJudge: true, spyGuessJudgeId: judge };
          broadcast(patch);
          return { ...prev, ...patch };
        });
      }

      if (action === 'spy:guess-verdict' && isGameHost) {
        const { accept } = payload as { accept: boolean };
        setS(prev => {
          const patch = resolveSpyGuess(accept, prev);
          broadcast(patch);
          return { ...prev, ...patch };
        });
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
  }, [broadcast, isGameHost, on]);

  useEffect(() => {
    if (!isGameHost) return;
    if (!s.timerRunning || s.timerLeft <= 0) return;

    const id = setInterval(() => {
      const cur = sRef.current;
      if (!cur.timerRunning || cur.timerLeft <= 0) {
        clearInterval(id);
        return;
      }
      const newLeft = cur.timerLeft - 1;
      if (newLeft <= 0) {
        const patch = {
          timerLeft: 0,
          timerRunning: false,
          phase: 'voting' as Phase,
          votes: {},
          voteTimerLeft: VOTE_TIMER_TOTAL,
          voteTimerRunning: true,
        };
        setS(prev => ({ ...prev, ...patch }));
        broadcast(patch);
        clearInterval(id);
        return;
      }
      const patch = { timerLeft: newLeft, timerRunning: newLeft > 0 };
      setS(prev => ({ ...prev, ...patch }));
      broadcast(patch);
    }, 1000);

    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.timerRunning, isGameHost, broadcast]);

  useEffect(() => {
    if (!isGameHost) return;
    if (!s.voteTimerRunning || s.voteTimerLeft <= 0) return;

    const id = setInterval(() => {
      const cur = sRef.current;
      if (!cur.voteTimerRunning || cur.voteTimerLeft <= 0) {
        clearInterval(id);
        return;
      }

      const newLeft = cur.voteTimerLeft - 1;
      if (newLeft <= 0) {
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.voteTimerRunning, isGameHost, broadcast]);

  const startGame = (mode: SpyMode) => {
    if (!isGameHost) return;
    if (mode === 'draw') {
      const { word, idx } = pickWord([]);
      const spyId = pickRandomSpy(s.players);
      const playerOrder = shufflePlayers(s.players);
      update({
        phase: 'dealing',
        mode: 'draw',
        word,
        category: '',
        categoryIcon: '',
        locationIdx: -1,
        usedLocationIndices: [],
        usedWordIndices: [idx],
        spyId,
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
        spyGuessText: '',
        spyGuessNeedsConfirm: false,
        spyGuessAwaitingJudge: false,
        spyGuessJudgeId: '',
        scores: {},
        lastRoundDelta: {},
        currentRound: 1,
        totalRounds: Math.max(3, Math.min(s.players.length, 7)),
        gameOver: false,
      });
      return;
    }

    const { loc, idx } = pickLocation([]);
    update({
      phase: 'dealing',
      mode: 'guess',
      word: loc.word,
      category: loc.category,
      categoryIcon: loc.categoryIcon,
      locationIdx: idx,
      usedLocationIndices: [idx],
      usedWordIndices: [],
      spyId: pickRandomSpy(s.players),
      drawerId: '',
      playerOrder: shufflePlayers(s.players),
      playerOrderIdx: 0,
      timerLeft: TIMER_TOTAL,
      timerRunning: false,
      readyPlayers: [],
      votes: {},
      voteTimerLeft: VOTE_TIMER_TOTAL,
      voteTimerRunning: false,
      roundResult: null,
      spyGuessText: '',
      spyGuessNeedsConfirm: false,
      spyGuessAwaitingJudge: false,
      spyGuessJudgeId: '',
      lastRoundDelta: {},
      currentRound: 1,
      totalRounds: Math.max(3, Math.min(s.players.length, 7)),
      gameOver: false,
    });
  };

  const acknowledgeWord = () => {
    if (!effectivePlayerId || myReadyInDealing) return;
    sendAction('spy:ready', { playerId: effectivePlayerId });
    setS(prev => ({
      ...prev,
      readyPlayers: prev.readyPlayers.includes(effectivePlayerId)
        ? prev.readyPlayers
        : [...prev.readyPlayers, effectivePlayerId],
    }));
  };

  const startPlaying = () => {
    if (!isGameHost) return;
    const patch: Partial<SpyGameState> = { phase: 'playing', timerRunning: true };
    if (s.mode === 'draw') patch.drawerId = s.playerOrder[0] ?? '';
    update(patch);
  };

  const backToModeSelect = () => {
    if (!isGameHost) return;
    setConfirmPlay(null);
    setConfirmBack(false);
    update({ phase: 'modeSelect' });
  };

  const passTurn = () => {
    if (!isActivePlayer) return;
    const nextIdx = (s.playerOrderIdx + 1) % Math.max(s.playerOrder.length, 1);
    const nextPlayerId = s.playerOrder[nextIdx] ?? '';
    update({
      playerOrderIdx: nextIdx,
      drawerId: s.mode === 'draw' ? nextPlayerId : s.drawerId,
    });
  };

  const replaceWord = () => {
    if (!isGameHost) return;
    const { loc, idx } = pickLocation(s.usedLocationIndices);
    const newUsed = s.usedLocationIndices.length >= SPY_LOCATIONS.length - 1
      ? [idx]
      : [...s.usedLocationIndices, idx];
    update({
      phase: 'dealing',
      word: loc.word,
      category: loc.category,
      categoryIcon: loc.categoryIcon,
      locationIdx: idx,
      usedLocationIndices: newUsed,
      usedWordIndices: [],
      spyId: pickRandomSpy(s.players),
      drawerId: '',
      playerOrder: shufflePlayers(s.players),
      playerOrderIdx: 0,
      timerLeft: TIMER_TOTAL,
      timerRunning: false,
      readyPlayers: [],
      votes: {},
      voteTimerLeft: VOTE_TIMER_TOTAL,
      voteTimerRunning: false,
      roundResult: null,
      spyGuessText: '',
      spyGuessNeedsConfirm: false,
      spyGuessAwaitingJudge: false,
      spyGuessJudgeId: '',
      lastRoundDelta: {},
    });
  };

  const startVoting = () => {
    if (!isGameHost) return;
    setLocalVote(null);
    setHasVoted(false);
    setPeeking(false);
    update({
      phase: 'voting',
      timerRunning: false,
      votes: {},
      voteTimerLeft: VOTE_TIMER_TOTAL,
      voteTimerRunning: true,
    });
  };

  const submitVote = (suspectId: string) => {
    if (!effectivePlayerId) return;
    setS(prev => ({
      ...prev,
      votes: { ...prev.votes, [effectivePlayerId]: suspectId },
    }));
    sendAction('spy:vote', { voterId: effectivePlayerId, suspectId });
  };

  const handleSubmitVote = () => {
    if (!localVote || hasVoted) return;
    submitVote(localVote);
    setHasVoted(true);
  };

  const nextRound = () => {
    if (!isGameHost) return;

    if (s.mode === 'draw') {
      const { word, idx } = pickWord(s.usedWordIndices);
      const newUsed = s.usedWordIndices.length >= SPY_WORDS.length - 1
        ? [idx]
        : [...s.usedWordIndices, idx];
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
        spyGuessText: '',
        spyGuessNeedsConfirm: false,
        spyGuessAwaitingJudge: false,
        spyGuessJudgeId: '',
        lastRoundDelta: {},
        currentRound: s.currentRound + 1,
      });
      return;
    }

    const { loc, idx } = pickLocation(s.usedLocationIndices);
    const newUsed = s.usedLocationIndices.length >= SPY_LOCATIONS.length - 1
      ? [idx]
      : [...s.usedLocationIndices, idx];
    update({
      phase: 'dealing',
      word: loc.word,
      category: loc.category,
      categoryIcon: loc.categoryIcon,
      locationIdx: idx,
      usedLocationIndices: newUsed,
      usedWordIndices: [],
      spyId: pickRandomSpy(s.players),
      drawerId: '',
      playerOrder: shufflePlayers(s.players),
      playerOrderIdx: 0,
      timerLeft: TIMER_TOTAL,
      timerRunning: false,
      readyPlayers: [],
      votes: {},
      voteTimerLeft: VOTE_TIMER_TOTAL,
      voteTimerRunning: false,
      roundResult: null,
      spyGuessText: '',
      spyGuessNeedsConfirm: false,
      spyGuessAwaitingJudge: false,
      spyGuessJudgeId: '',
      lastRoundDelta: {},
      currentRound: s.currentRound + 1,
    });
  };

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
      timerLeft: TIMER_TOTAL,
      timerRunning: false,
      spyGuessText: '',
      spyGuessNeedsConfirm: false,
      spyGuessAwaitingJudge: false,
      spyGuessJudgeId: '',
    });
  };

  const endGame = () => {
    emit('game:end', { code: roomId });
    router.push(user ? `/lobby/${roomId}` : `/join/${roomId}`);
  };

  const renderPeekBar = () => (
    <div
      className="glass-card spy-card w-full px-4 py-1 select-none"
      style={{ transform: 'none' }}
      onPointerDown={() => setPeeking(true)}
      onPointerUp={() => setPeeking(false)}
      onPointerLeave={() => setPeeking(false)}
      onPointerCancel={() => setPeeking(false)}
    >
      <div className="flex h-6 items-center justify-between gap-3">
        <div className="flex h-6 min-w-0 items-center overflow-hidden">
          {peeking ? (
            isSpy ? (
              <p className="truncate text-sm font-black leading-tight text-red-500">
                {l('ТЫ ШПИОН', 'YOU ARE THE SPY')}
                {s.category && (
                  <span className="ml-2 text-xs font-normal text-teal-300">{s.category}</span>
                )}
              </p>
            ) : (
              <FitWord text={s.word} max={16} className="font-bold text-white" />
            )
          ) : (
            <p className="text-xs text-white/40">
              {l('твоё слово', 'your word')}
            </p>
          )}
        </div>
        <span className="flex-shrink-0 rounded-full border border-white/10 bg-white/5 px-3 py-0.5 text-xs text-white/50">
          {l('ЗАЖМИ', 'HOLD')}
        </span>
      </div>
    </div>
  );

  const renderHostAction = (
    type: 'replace' | 'voting',
    label: string,
    icon: ReactNode,
    accent?: string,
  ) => {
    const armed = confirmPlay === type;
    return (
      <div className={`glass-button flex w-full items-center justify-between gap-3 px-8 py-3.5 text-lg ${accent ?? ''}`}>
        <button
          type="button"
          disabled={armed}
          onClick={() => setConfirmPlay(type)}
          className="flex flex-1 items-center justify-center gap-2 font-medium disabled:cursor-default"
        >
          {icon}
          <span>{label}</span>
        </button>
        {armed && (
          <div className="flex flex-shrink-0 items-center gap-2">
            <button
              type="button"
              aria-label="confirm"
              onClick={() => {
                if (type === 'replace') replaceWord();
                else startVoting();
                setConfirmPlay(null);
              }}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-green-400/50 bg-green-500/25 text-green-300"
            >
              <SpyIcon name="check" className="h-5 w-5" />
            </button>
            <button
              type="button"
              aria-label="cancel"
              onClick={() => setConfirmPlay(null)}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-red-400/50 bg-red-500/25 text-red-300"
            >
              <SpyIcon name="cross" className="h-5 w-5" />
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderBackButton = () => {
    if (!isGameHost) return null;

    const needConfirm = s.phase === 'playing' && s.timerRunning;

    if (!needConfirm) {
      return (
        <button
          type="button"
          onClick={backToModeSelect}
          className="self-start text-sm text-white/50 hover:text-white/80"
        >
          {l('← К выбору режима', '← Back to mode select')}
        </button>
      );
    }

    return (
      <div className="flex min-h-[28px] items-center gap-2 self-start">
        <button
          type="button"
          disabled={confirmBack}
          onClick={() => setConfirmBack(true)}
          className="text-sm text-white/50 hover:text-white/80 disabled:opacity-100"
        >
          {l('← К выбору режима', '← Back to mode select')}
        </button>
        {confirmBack && (
          <>
            <button
              type="button"
              aria-label="confirm-back"
              onClick={backToModeSelect}
              className="flex h-7 w-7 items-center justify-center rounded-full border border-green-400/50 bg-green-500/25 text-green-300"
            >
              <SpyIcon name="check" className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label="cancel-back"
              onClick={() => setConfirmBack(false)}
              className="flex h-7 w-7 items-center justify-center rounded-full border border-red-400/50 bg-red-500/25 text-red-300"
            >
              <SpyIcon name="cross" className="h-4 w-4" />
            </button>
          </>
        )}
      </div>
    );
  };

  return (
    <GameLayout
      title={l('Шпион', 'Spy')}
      icon={<SpyIcon name="mask" className="h-7 w-7 text-teal-300" />}
      onEnd={isGameHost ? endGame : undefined}
      phaseKey={s.gameOver ? 'gameOver' : s.phase}
      gradientClass="bg-gradient-spy"
    >
      {s.gameOver && (
        <div className="mx-auto w-full max-w-md py-6 animate-fade-in space-y-4">
          <div className="text-center space-y-2 text-teal-300">
            <SpyIcon name="trophy" className="mx-auto h-16 w-16" />
            <h2 className="text-3xl font-black text-white">{l('Игра окончена!', 'Game over!')}</h2>
          </div>
          {isGameHost && (
            <GlassButton variant="primary" size="lg" className="w-full" onClick={endGame}>
              {l('Завершить игру', 'End game')}
            </GlassButton>
          )}
        </div>
      )}

      {!s.gameOver && s.phase === 'modeSelect' && (
        <div className="mx-auto max-w-lg py-6 animate-fade-in space-y-4">
          <div className="text-center space-y-2 text-teal-300">
            <SpyIcon name="mask" className="mx-auto h-16 w-16" />
            <h2 className="text-3xl font-black text-white">{l('Шпион', 'Spy')}</h2>
          </div>
          <GlassCard className="spy-card p-4 space-y-3">
            {[
              l('Все получают одно секретное слово — кроме шпиона', 'Everyone gets one secret word, except the spy'),
              l('По очереди описывайте слово, не называя его', 'Take turns describing the word without naming it'),
              l('Найдите шпиона на голосовании', 'Find the spy during the vote'),
            ].map((rule, idx) => (
              <div key={rule} className="flex gap-3 text-sm text-white/80">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-teal-500/20 text-xs font-black text-teal-300">
                  {idx + 1}
                </span>
                <span>{rule}</span>
              </div>
            ))}
            <div className="border-t border-white/10 pt-2 text-white/50 text-xs">
              <SpyIcon name="palette" className="inline-block h-[1em] w-[1em] align-[-0.15em] mr-1" />
              {l('В режиме ', 'In ')}
              <b>{l('«Нарисуй»', '"Draw"')}</b>
              {l(' каждый по очереди рисует слово. Шпион не знает что рисовать.', ' mode each player draws the word in turn. The spy doesn\'t know what to draw.')}
            </div>
          </GlassCard>
          {isGameHost ? (
            <div className="space-y-3">
              <GlassButton variant="primary" size="lg" className="w-full" onClick={() => startGame('guess')}>
                <SpyIcon name="speech" className="mr-2 h-6 w-6" /> {l('Угадай слово', 'Guess the Word')}
              </GlassButton>
              <GlassButton variant="primary" size="lg" className="w-full" onClick={() => startGame('draw')}>
                <SpyIcon name="palette" className="mr-2 h-6 w-6" /> {l('Нарисуй', 'Draw')}
              </GlassButton>
            </div>
          ) : (
            <BreathingPlaceholder text={l('Ожидание ведущего…', 'Waiting for the host...')} variant="breathing-text" />
          )}
        </div>
      )}

      {!s.gameOver && s.phase === 'dealing' && (
        <div className="mx-auto w-full max-w-md py-4 animate-fade-in space-y-4">
          {renderBackButton()}

          <div className="text-center">
            <p className="text-sm text-white/40">
              {l('Раунд', 'Round')} {s.currentRound}
            </p>
            <h2 className={`text-2xl font-black ${isSpy ? 'text-red-300' : 'text-teal-300'}`}>
              {isSpy ? (
                <>
                  <SpyIcon name="mask" className="inline-block h-[1em] w-[1em] align-[-0.15em] mr-1.5" />
                  {l('Ты — ШПИОН', 'You are the SPY')}
                </>
              ) : (
                <>
                  <SpyIcon name="shield" className="inline-block h-[1em] w-[1em] align-[-0.15em] mr-1.5" />
                  {l('Ты — мирный житель', 'You are a civilian')}
                </>
              )}
            </h2>
          </div>

          {s.mode === 'draw' ? (
            isSpy ? (
              <GlassCard className="spy-card-red p-6 text-center space-y-4">
                <SpyIcon name="mask" className="mx-auto h-16 w-16" />
                <div>
                  <h3 className="text-2xl font-black text-white">{l('Ты — ШПИОН', 'You are the SPY')}</h3>
                  <p className="text-white/55">
                    {l('Слова у тебя нет — рисуй что угодно похожее', 'You have no word — draw anything that fits')}
                  </p>
                </div>
                <div className="space-y-2 text-left text-sm text-white/75">
                  <p>{l('1. Смотри как рисуют другие и подражай', '1. Watch others draw and mimic')}</p>
                  <p>{l('2. Рисуй что-то похожее на тему', '2. Draw something related to the theme')}</p>
                  <p>{l('3. Не дай себя раскрыть на голосовании', '3. Avoid being exposed in the vote')}</p>
                </div>
              </GlassCard>
            ) : (
              <GlassCard className="spy-card p-6 text-center space-y-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-teal-200/70">{l('слово для рисования', 'word to draw')}</p>
                  <FitWord text={s.word} max={36} className="mt-3 font-black text-white" />
                </div>
                <div className="h-px bg-white/10" />
                <p className="text-sm text-white/70">
                  {l('Рисуй это слово по очереди. Среди вас шпион — он слова не знает.', 'Take turns drawing this word. The spy among you doesn\'t know it.')}
                </p>
              </GlassCard>
            )
          ) : isSpy ? (
            <GlassCard className="spy-card-red p-6 text-center space-y-4">
              <SpyIcon name="mask" className="mx-auto h-16 w-16" />
              <div>
                <h3 className="text-2xl font-black text-white">{l('Слова у тебя нет', 'You have no word')}</h3>
                <p className="text-white/55">{l('Категория:', 'Category:')} {s.category}</p>
              </div>
              <div className="space-y-2 text-left text-sm text-white/75">
                <p>{l('1. Слушай чужие ответы и притворяйся своим', '1. Listen to others and blend in')}</p>
                <p>{l('2. Вычисли слово по описаниям', '2. Guess the word from descriptions')}</p>
                <p>{l('3. Не дай себя раскрыть на голосовании', '3. Avoid being exposed in the vote')}</p>
              </div>
            </GlassCard>
          ) : (
            <GlassCard className="spy-card p-6 text-center space-y-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-teal-200/70">{l('твоё секретное слово', 'your secret word')}</p>
                <p className="mt-2 text-white/55">{s.category}</p>
                <FitWord text={s.word} max={36} className="mt-2 font-black text-white" />
              </div>
              <div className="h-px bg-white/10" />
              <p className="text-sm text-white/70">
                {l('Описывай слово, не называя его. Среди вас шпион — он слова не знает.', 'Describe the word without naming it. The spy among you does not know it.')}
              </p>
            </GlassCard>
          )}

          <p className="text-center text-sm text-white/45">
            {s.readyPlayers.length} / {s.players.length} {l('посмотрели слово', 'saw the word')}
          </p>

          {myReadyInDealing ? (
            <GlassButton className="w-full border-green-400/30 bg-green-500/15 text-green-300" disabled>
              <SpyIcon name="check" className="inline-block h-[1em] w-[1em] align-[-0.15em] mr-1" />
              {l('Готов', 'Ready')}
            </GlassButton>
          ) : (
            <GlassButton variant="primary" size="lg" className="w-full" onClick={acknowledgeWord}>
              {isSpy ? l('Понятно, спрятать', 'Got it, hide') : (
                <>
                  <SpyIcon name="hide" className="inline-block h-[1em] w-[1em] align-[-0.15em] mr-1" />
                  {l('Понятно, спрятать', 'Got it, hide')}
                </>
              )}
            </GlassButton>
          )}

          {isGameHost && (
            <GlassButton className="w-full" onClick={startPlaying}>
              {s.mode === 'draw'
                ? l('▶ Начать рисование', '▶ Start drawing')
                : l('▶ Начать обсуждение', '▶ Start discussion')}
            </GlassButton>
          )}
        </div>
      )}

      {!s.gameOver && s.phase === 'playing' && (
        <div className="mx-auto w-full max-w-md py-4 animate-fade-in space-y-4">
          {renderBackButton()}

          <GlassCard className="spy-card p-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs text-white/40">{l('Раунд', 'Round')} {s.currentRound}</p>
              {s.category && <p className="text-sm text-white/70">{s.category}</p>}
            </div>
            {s.mode === 'draw' && (
              <div className="text-right text-sm">
                {isActivePlayer ? (
                  <span className="font-bold text-purple-300">
                    <SpyIcon name="palette" className="inline-block h-[1em] w-[1em] align-[-0.15em] mr-1" />
                    {l('Твой ход — рисуй!', 'Your turn — draw!')}
                  </span>
                ) : (
                  <span className="text-white/60">
                    {l('Рисует: ', 'Drawing: ')}
                    <span className="font-bold text-white">{activePlayerName}</span>
                  </span>
                )}
              </div>
            )}
          </GlassCard>

          {s.mode === 'guess' && (
            <div className="space-y-4">
              {isActivePlayer ? (
                <GlassCard className="spy-card p-4 text-center">
                  <h2 className="text-2xl font-black text-teal-200">{l('Твой ход', 'Your turn')}</h2>
                  <p className="mt-1 text-sm text-white/60">{l('Опиши слово одним предложением — но не называй его.', 'Describe the word in one sentence, but do not name it.')}</p>
                </GlassCard>
              ) : (
                <GlassCard className="spy-card p-4 text-center">
                  <p className="text-white/40">{l('Сейчас отвечает', 'Now speaking')}</p>
                  <p className="mt-1 text-2xl font-black text-white">{activePlayerName}</p>
                </GlassCard>
              )}
            </div>
          )}

          {renderPeekBar()}

          {isSpy && (
            <GlassButton size="lg" className="w-full" onClick={() => sendAction('spy:guess-start')}>
              {l('Угадать слово', 'Guess the word')}
            </GlassButton>
          )}

          {s.mode === 'draw' && (
            <DrawCanvas canDraw={isDrawer} onStroke={sendStroke} onClear={sendClear} />
          )}

          {s.mode === 'guess' && isActivePlayer && (
            <GlassButton variant="primary" size="lg" className="w-full bg-teal-500/25" onClick={passTurn}>
              {l('→ Передать ход', '→ Pass turn')}
            </GlassButton>
          )}

          {s.mode === 'draw' && isActivePlayer && (
            <GlassButton className="w-full" onClick={passTurn}>
              {l('➡ Передать ход', '➡ Pass turn')}
            </GlassButton>
          )}

          {s.mode === 'draw' && isGameHost && (
            <GlassButton variant="primary" size="lg" className="w-full" onClick={nextWord}>
              <SpyIcon name="refresh" className="inline-block h-[1em] w-[1em] align-[-0.15em] mr-1" />
              {l('Следующее слово', 'Next word')}
            </GlassButton>
          )}

          {s.mode === 'draw' && isGameHost && (
            renderHostAction(
              'voting',
              l('Голосование', 'Voting'),
              <SpyIcon name="ballot" className="inline-block h-[1em] w-[1em] align-[-0.15em]" />,
              'border-amber-400/30 bg-amber-500/15 text-amber-200',
            )
          )}

          {s.mode === 'guess' && isGameHost && (
            <div className="space-y-2">
              {renderHostAction(
                'replace',
                l('Заменить слово', 'Replace word'),
                <SpyIcon name="refresh" className="inline-block h-[1em] w-[1em] align-[-0.15em]" />,
              )}
              {renderHostAction(
                'voting',
                l('Голосование', 'Voting'),
                <SpyIcon name="ballot" className="inline-block h-[1em] w-[1em] align-[-0.15em]" />,
                'border-amber-400/30 bg-amber-500/15 text-amber-200',
              )}
            </div>
          )}
        </div>
      )}

      {!s.gameOver && s.phase === 'spyGuess' && (
        <div className="mx-auto w-full max-w-md py-4 animate-fade-in space-y-4">
          {isSpy ? (
            <GlassCard className="spy-card-red p-5 space-y-4">
              <h2 className="text-2xl font-black text-red-300 text-center">{l('Угадай слово', 'Guess the word')}</h2>
              <p className="text-sm text-white/60 text-center">{l('Впиши слово, которое загадали остальные.', 'Type the word the others were given.')}</p>
              <input
                value={guessInput}
                onChange={(e) => setGuessInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && guessInput.trim()) {
                    sendAction('spy:guess-try', { text: guessInput });
                  }
                }}
                placeholder={l('Твоя версия…', 'Your guess…')}
                className="w-full rounded-xl bg-black/30 border border-white/15 px-4 py-3 text-lg text-white outline-none focus:border-teal-400/50"
              />
              <GlassButton
                variant="primary"
                size="lg"
                className="w-full"
                disabled={!guessInput.trim()}
                onClick={() => sendAction('spy:guess-try', { text: guessInput })}
              >
                {l('Проверить', 'Check')}
              </GlassButton>
              {s.spyGuessNeedsConfirm && !s.spyGuessAwaitingJudge && (
                <div className="space-y-2">
                  <p className="text-sm text-amber-300 text-center">{l('Не совпало автоматически. Настаиваешь, что верно?', 'No exact match. Insist it is correct?')}</p>
                  <GlassButton
                    size="lg"
                    className="w-full border-amber-400/30 bg-amber-500/15 text-amber-200"
                    onClick={() => sendAction('spy:guess-confirm')}
                  >
                    {l('Подтвердить', 'Confirm')}
                  </GlassButton>
                </div>
              )}
              {s.spyGuessAwaitingJudge && (
                <p className="text-center text-sm text-white/60">{l('Ожидание подтверждения игрока…', 'Waiting for a player to confirm…')}</p>
              )}
            </GlassCard>
          ) : isJudge && s.spyGuessAwaitingJudge ? (
            <GlassCard className="spy-card p-5 space-y-4">
              <p className="text-sm text-white/60 text-center">{l('Шпион вписал слово. Это правильное слово?', 'The spy typed a word. Is it correct?')}</p>
              <div className="space-y-3">
                <div className="rounded-xl bg-white/5 p-3">
                  <p className="text-xs uppercase tracking-widest text-white/35">{l('Слово шпиона', 'Spy word')}</p>
                  <p className="mt-1 text-2xl font-black text-white">{s.spyGuessText}</p>
                </div>
                <div className="rounded-xl bg-white/5 p-3">
                  <p className="text-xs uppercase tracking-widest text-white/35">{l('Правильное слово', 'Correct word')}</p>
                  <p className="mt-1 text-2xl font-black text-white">{s.word}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <GlassButton variant="primary" size="lg" onClick={() => sendAction('spy:guess-verdict', { accept: true })}>
                  {l('Верно', 'Correct')}
                </GlassButton>
                <GlassButton variant="danger" size="lg" onClick={() => sendAction('spy:guess-verdict', { accept: false })}>
                  {l('Отклонить', 'Reject')}
                </GlassButton>
              </div>
            </GlassCard>
          ) : (
            <BreathingPlaceholder text={l('Шпион угадывает слово…', 'The spy is guessing the word…')} variant="breathing-text" />
          )}
        </div>
      )}

      {!s.gameOver && s.phase === 'voting' && (
        <div className="mx-auto w-full max-w-md py-4 animate-fade-in space-y-4">
          <div className="text-center space-y-1">
            <h2 className="text-3xl font-black text-white">{l('Кто шпион?', 'Who is the spy?')}</h2>
            <p className="text-amber-300">⏱ {formatTime(s.voteTimerLeft)}</p>
          </div>

          <div className="space-y-2">
            {s.players.filter(p => p.id !== effectivePlayerId).map((p, idx) => {
              const selected = localVote === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => !hasVoted && setLocalVote(p.id)}
                  className={`glass-card flex w-full items-center gap-3 px-4 py-3 text-left transition-all ${selected ? 'border-teal-400/50 bg-teal-500/15' : 'border-white/10'}`}
                  disabled={hasVoted}
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 font-black">
                    {p.nickname[0] ?? idx + 1}
                  </span>
                  <span className="flex-1 font-bold text-white">{p.nickname}</span>
                  <span className={`h-5 w-5 rounded-full border ${selected ? 'border-teal-300 bg-teal-300 shadow-[0_0_12px_rgba(45,212,191,.7)]' : 'border-white/25'}`} />
                </button>
              );
            })}
          </div>

          {hasVoted || myVoteInVoting ? (
            <GlassCard className="spy-card p-4 text-center text-sm text-white/60">
              {l('Ваш голос принят, ожидание результатов…', 'Your vote is in, waiting for results...')}
            </GlassCard>
          ) : (
            <GlassButton
              variant="primary"
              size="lg"
              className="w-full"
              onClick={handleSubmitVote}
              disabled={!localVote}
            >
              <SpyIcon name="ballot" className="mr-1.5 h-5 w-5" />
              {selectedVoteName
                ? l(`Голосовать за ${selectedVoteName}`, `Vote for ${selectedVoteName}`)
                : l('Выбери игрока', 'Choose a player')}
            </GlassButton>
          )}
        </div>
      )}

      {!s.gameOver && s.phase === 'roundResult' && s.roundResult && (
        <div className="mx-auto w-full max-w-md py-4 animate-fade-in space-y-4">
          {renderBackButton()}

          <GlassCard className={`p-4 ${s.roundResult.spyCaught ? 'spy-card-green' : 'spy-card-red'}`}>
            <div className="flex items-center gap-3">
              {s.roundResult.spyCaught ? <SpyIcon name="check" className="h-8 w-8" /> : <SpyIcon name="cross" className="h-8 w-8" />}
              <div>
                <h2 className="text-xl font-black text-white">
                  {s.roundResult.spyCaught
                    ? l('Шпиона раскрыли!', 'Spy exposed!')
                    : l('Шпион победил!', 'Spy won!')}
                </h2>
                <p className="text-sm text-white/55">
                  {s.roundResult.viaGuess
                    ? l('Шпион угадывал слово', 'Spy attempted to guess')
                    : (
                        <>
                          {l('Больше всего голосов:', 'Most votes:')} {s.players.find(p => p.id === s.roundResult?.exposedId)?.nickname ?? '???'}
                        </>
                      )}
                </p>
              </div>
            </div>
          </GlassCard>

          <div className="grid grid-cols-2 gap-3">
            <GlassCard className="spy-card p-4 text-center">
              <p className="text-xs uppercase tracking-widest text-white/35">{l('Шпион', 'Spy')}</p>
              <SpyIcon name="mask" className="mx-auto mt-2 h-8 w-8" />
              <p className="mt-1 font-black text-white">{s.players.find(p => p.id === s.spyId)?.nickname ?? '???'}</p>
            </GlassCard>
            <GlassCard className="spy-card p-4 text-center">
              <p className="text-xs uppercase tracking-widest text-white/35">{l('Слово', 'Word')}</p>
              <p className="mt-2 text-sm text-white/55">{s.category}</p>
              <FitWord text={s.word} max={20} className="mt-1 font-black text-white" />
            </GlassCard>
          </div>

          {isGameHost ? (
            <GlassButton variant="primary" size="lg" className="w-full" onClick={nextRound}>
              {l('Новое слово', 'New word')}
            </GlassButton>
          ) : (
            <BreathingPlaceholder text={l('Ведущий запустит следующий раунд', 'The host will start the next round')} variant="breathing-text" />
          )}
        </div>
      )}
    </GameLayout>
  );
}
