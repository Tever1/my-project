'use client';

import { type ReactNode, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSocket } from '@/lib/use-socket';
import { useRoomState } from '@/lib/use-room-state';
import { useGameAction, useGameBroadcast } from '@/lib/use-game-action';
import { useNavigateOnGameEnd } from '@/lib/use-navigate-on-game-end';
import { useGameIdentity } from '@/lib/use-game-identity';
import { useTranslation } from '@/lib/i18n';
import { GameSurface } from '@/components/games/GameSurface';
import { SpyIcon } from '@/components/games/SpyIcon';
import { BreathingPlaceholder } from '@/components/ingame';
import { SPY_LOCATIONS, SpyLocation, SPY_WORDS } from '@/lib/game-data';

interface DrawStroke {
  x1: number; y1: number; x2: number; y2: number;
}

interface DrawCanvasProps {
  canDraw: boolean;
  onStroke: (stroke: DrawStroke) => void;
  onClear: () => void;
  onUndo: (remainingStrokes: DrawStroke[]) => void;
}

function DrawCanvas({ canDraw, onStroke, onClear, onUndo }: DrawCanvasProps) {
  const { locale } = useTranslation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const lastPos = useRef<{ x: number; y: number } | null>(null);
  const sizeRef = useRef({ w: 0, h: 0 });
  const groupsRef = useRef<DrawStroke[][]>([]);
  const currentGroupRef = useRef<DrawStroke[]>([]);
  const suppressNextClearRef = useRef(false);
  const [hasHistory, setHasHistory] = useState(false);

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
    ctx.strokeStyle = '#18322c';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(x1 * sizeRef.current.w, y1 * sizeRef.current.h);
    ctx.lineTo(x2 * sizeRef.current.w, y2 * sizeRef.current.h);
    ctx.stroke();
  }, []);

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }, []);

  const clearAll = useCallback(() => {
    clearCanvas();
    groupsRef.current = [];
    currentGroupRef.current = [];
    setHasHistory(false);
  }, [clearCanvas]);

  const receiveClear = useCallback(() => {
    if (suppressNextClearRef.current) {
      suppressNextClearRef.current = false;
      return;
    }
    clearAll();
  }, [clearAll]);

  const startDraw = (e: React.TouchEvent | React.MouseEvent) => {
    if (!canDraw) return;
    e.preventDefault();
    drawing.current = true;
    currentGroupRef.current = [];
    lastPos.current = getNormPos(e);
  };

  const moveDraw = (e: React.TouchEvent | React.MouseEvent) => {
    if (!canDraw) return;
    e.preventDefault();
    if (!drawing.current || !lastPos.current) return;
    const pos = getNormPos(e);
    const stroke = { x1: lastPos.current.x, y1: lastPos.current.y, x2: pos.x, y2: pos.y };
    currentGroupRef.current.push(stroke);
    onStroke(stroke);
    drawLine(stroke.x1, stroke.y1, stroke.x2, stroke.y2);
    lastPos.current = pos;
  };

  const endDraw = () => {
    drawing.current = false;
    lastPos.current = null;
    if (currentGroupRef.current.length > 0) {
      groupsRef.current = [...groupsRef.current, currentGroupRef.current];
      currentGroupRef.current = [];
      setHasHistory(true);
    }
  };

  const undoLast = () => {
    groupsRef.current = groupsRef.current.slice(0, -1);
    clearCanvas();
    groupsRef.current.forEach(group => {
      group.forEach(seg => drawLine(seg.x1, seg.y1, seg.x2, seg.y2));
    });
    suppressNextClearRef.current = true;
    onUndo(groupsRef.current.flat());
    setHasHistory(groupsRef.current.length > 0);
  };

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
    (canvas as unknown as { _drawLine: typeof drawLine; _clearAll: typeof receiveClear })._drawLine = drawLine;
    (canvas as unknown as { _clearAll: typeof receiveClear })._clearAll = receiveClear;
  }, [drawLine, receiveClear]);

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
        <div className="absolute top-2 right-2 flex gap-2">
          {hasHistory && (
            <button
              onClick={undoLast}
              className="px-3 py-1 rounded-md bg-white/10 text-white/50 text-xs hover:bg-white/20"
            >
              {locale === 'ru' ? 'Отменить' : 'Undo'}
            </button>
          )}
          <button
            onClick={() => { suppressNextClearRef.current = true; clearAll(); onClear(); }}
            className="px-3 py-1 rounded-md bg-white/10 text-white/50 text-xs hover:bg-white/20"
          >
            {locale === 'ru' ? 'Очистить' : 'Clear'}
          </button>
        </div>
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
type Phase = 'modeSelect' | 'dealing' | 'playing' | 'discussion' | 'voting' | 'spyGuess' | 'roundResult';

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
  guessAskerId: string;
  guessTargetId: string;
  guessCycleAnswered: string[];
  timerLeft: number;
  timerRunning: boolean;
  readyPlayers: string[];
  votes: Record<string, string>;
  discussionTimeLeft: number;
  discussionTimerRunning: boolean;
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
const DISCUSSION_TIMER_TOTAL = 120;
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
  guessAskerId: '',
  guessTargetId: '',
  guessCycleAnswered: [],
  timerLeft: TIMER_TOTAL,
  timerRunning: false,
  readyPlayers: [],
  votes: {},
  discussionTimeLeft: DISCUSSION_TIMER_TOTAL,
  discussionTimerRunning: false,
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

const pickNextTarget = (
  players: GamePlayer[],
  askerId: string,
  answeredThisCycle: string[],
): { targetId: string; cycleAnswered: string[] } => {
  const notAsker = players.filter(p => p.id !== askerId);
  let candidates = notAsker.filter(p => !answeredThisCycle.includes(p.id));
  let nextCycleAnswered = answeredThisCycle;

  if (candidates.length === 0) {
    candidates = notAsker;
    nextCycleAnswered = [];
  }

  if (candidates.length === 0) {
    return { targetId: '', cycleAnswered: nextCycleAnswered };
  }

  const chosen = candidates[Math.floor(Math.random() * candidates.length)].id;
  return { targetId: chosen, cycleAnswered: [...nextCycleAnswered, chosen] };
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
  const [endConfirmOpen, setEndConfirmOpen] = useState(false);

  const sRef = useRef(s);
  useEffect(() => { sRef.current = s; }, [s]);

  useEffect(() => {
    if (!peeking) return;
    const hideSecret = () => setPeeking(false);
    window.addEventListener('pointerup', hideSecret);
    window.addEventListener('pointercancel', hideSecret);
    window.addEventListener('blur', hideSecret);
    return () => {
      window.removeEventListener('pointerup', hideSecret);
      window.removeEventListener('pointercancel', hideSecret);
      window.removeEventListener('blur', hideSecret);
    };
  }, [peeking]);

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

  const handleUndo = useCallback((remainingStrokes: DrawStroke[]) => {
    sendClear();
    remainingStrokes.forEach((stroke) => sendAction('spy:stroke', stroke));
  }, [sendClear, sendAction]);

  useRoomState(roomId, (data) => {
    const room = data as { players: GamePlayer[] };
    setS(prev => ({ ...prev, players: room.players }));
  });

  const isSpy = effectivePlayerId === s.spyId;
  const isJudge = effectivePlayerId === s.spyGuessJudgeId;
  const isDrawer = s.mode === 'draw' && s.drawerId === effectivePlayerId;
  const activePlayerId = s.mode === 'guess'
    ? (s.guessAskerId || s.playerOrder[s.playerOrderIdx % Math.max(s.playerOrder.length, 1)] || '')
    : (s.playerOrder[s.playerOrderIdx % Math.max(s.playerOrder.length, 1)] ?? '');
  const isActivePlayer = activePlayerId === effectivePlayerId;
  const activePlayerName = s.players.find(p => p.id === activePlayerId)?.nickname ?? '???';
  const targetPlayerName = s.players.find(p => p.id === s.guessTargetId)?.nickname ?? '???';
  const isTargetPlayer = s.guessTargetId === effectivePlayerId;
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
            if (prev.mode === 'draw') {
              patch.drawerId = prev.playerOrder[0] ?? '';
            } else {
              const asker = prev.playerOrder[0] ?? '';
              const { targetId, cycleAnswered } = pickNextTarget(prev.players, asker, []);
              patch.guessAskerId = asker;
              patch.guessTargetId = targetId;
              patch.guessCycleAnswered = cycleAnswered;
            }
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
    sendAction('spy:request-state');

    const handleVisibilityChange = () => {
      if (!document.hidden) sendAction('spy:request-state');
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [sendAction]);

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
          phase: 'discussion' as Phase,
          discussionTimeLeft: DISCUSSION_TIMER_TOTAL,
          discussionTimerRunning: true,
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

  useEffect(() => {
    if (!isGameHost) return;
    if (!s.discussionTimerRunning || s.discussionTimeLeft <= 0) return;

    const id = setInterval(() => {
      const cur = sRef.current;
      if (cur.phase !== 'discussion' || !cur.discussionTimerRunning || cur.discussionTimeLeft <= 0) {
        clearInterval(id);
        return;
      }

      const newLeft = cur.discussionTimeLeft - 1;
      if (newLeft <= 0) {
        const patch = {
          discussionTimeLeft: 0,
          discussionTimerRunning: false,
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

      const patch = { discussionTimeLeft: newLeft };
      setS(prev => ({ ...prev, ...patch }));
      broadcast(patch);
    }, 1000);

    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.discussionTimerRunning, isGameHost, broadcast]);

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
        guessAskerId: '',
        guessTargetId: '',
        guessCycleAnswered: [],
        timerLeft: TIMER_TOTAL,
        timerRunning: false,
        readyPlayers: [],
        votes: {},
        discussionTimeLeft: DISCUSSION_TIMER_TOTAL,
        discussionTimerRunning: false,
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
      guessAskerId: '',
      guessTargetId: '',
      guessCycleAnswered: [],
      timerLeft: TIMER_TOTAL,
      timerRunning: false,
      readyPlayers: [],
      votes: {},
      discussionTimeLeft: DISCUSSION_TIMER_TOTAL,
      discussionTimerRunning: false,
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
    if (s.mode === 'draw') {
      patch.drawerId = s.playerOrder[0] ?? '';
    } else {
      const asker = s.playerOrder[0] ?? '';
      const { targetId, cycleAnswered } = pickNextTarget(s.players, asker, []);
      patch.guessAskerId = asker;
      patch.guessTargetId = targetId;
      patch.guessCycleAnswered = cycleAnswered;
    }
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
    if (s.mode === 'guess') {
      const newAsker = s.guessTargetId || s.playerOrder[(s.playerOrderIdx + 1) % Math.max(s.playerOrder.length, 1)] || '';
      const { targetId, cycleAnswered } = pickNextTarget(s.players, newAsker, s.guessCycleAnswered);
      update({ guessAskerId: newAsker, guessTargetId: targetId, guessCycleAnswered: cycleAnswered });
      return;
    }
    const nextIdx = (s.playerOrderIdx + 1) % Math.max(s.playerOrder.length, 1);
    const nextPlayerId = s.playerOrder[nextIdx] ?? '';
    update({
      playerOrderIdx: nextIdx,
      drawerId: nextPlayerId,
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
      guessAskerId: '',
      guessTargetId: '',
      guessCycleAnswered: [],
      timerLeft: TIMER_TOTAL,
      timerRunning: false,
      readyPlayers: [],
      votes: {},
      discussionTimeLeft: DISCUSSION_TIMER_TOTAL,
      discussionTimerRunning: false,
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
      discussionTimerRunning: false,
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
        guessAskerId: '',
        guessTargetId: '',
        guessCycleAnswered: [],
        timerLeft: TIMER_TOTAL,
        timerRunning: false,
        readyPlayers: [],
        votes: {},
        discussionTimeLeft: DISCUSSION_TIMER_TOTAL,
        discussionTimerRunning: false,
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
      guessAskerId: '',
      guessTargetId: '',
      guessCycleAnswered: [],
      timerLeft: TIMER_TOTAL,
      timerRunning: false,
      readyPlayers: [],
      votes: {},
      discussionTimeLeft: DISCUSSION_TIMER_TOTAL,
      discussionTimerRunning: false,
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
      guessAskerId: '',
      guessTargetId: '',
      guessCycleAnswered: [],
      timerLeft: TIMER_TOTAL,
      timerRunning: false,
      discussionTimeLeft: DISCUSSION_TIMER_TOTAL,
      discussionTimerRunning: false,
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
      onKeyDown={(event) => {
        if (event.key === ' ' || event.key === 'Enter') {
          event.preventDefault();
          setPeeking(true);
        }
      }}
      onKeyUp={(event) => {
        if (event.key === ' ' || event.key === 'Enter') {
          event.preventDefault();
          setPeeking(false);
        }
      }}
      onContextMenu={(event) => event.preventDefault()}
      role="button"
      tabIndex={0}
      aria-label={l('Удерживайте, чтобы посмотреть секретное слово', 'Hold to reveal the secret word')}
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

    const needConfirm =
      (s.phase === 'playing' && s.timerRunning) ||
      (s.phase === 'discussion' && s.discussionTimerRunning);

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

  const phaseLabel = s.gameOver
    ? l('Итоги операции', 'Operation results')
    : ({
        modeSelect: l('Выбор режима', 'Mode selection'),
        dealing: l('Секретное задание', 'Secret briefing'),
        playing: s.mode === 'draw' ? l('Нарисуй', 'Draw') : l('Допрос', 'Interview'),
        spyGuess: l('Попытка шпиона', 'Spy attempt'),
        discussion: l('Обсуждение', 'Discussion'),
        voting: l('Голосование', 'Voting'),
        roundResult: l('Итог раунда', 'Round result'),
      } as const)[s.phase];
  const spyPlayerName = s.players.find((player) => player.id === s.spyId)?.nickname ?? '???';
  const readyRatio = s.players.length > 0 ? `${(s.readyPlayers.length / s.players.length) * 100}%` : '0%';

  return (
    <GameSurface className="spy-live-phone min-h-[100dvh] text-white">
      <header className="spy-live-header">
        <div className="spy-live-brand">
          <SpyIcon name="mask" className="h-6 w-6" />
          <div><b>{l('ШПИОН', 'SPY')}</b></div>
        </div>
        <div className="spy-live-stage"><b>{s.phase === 'modeSelect' ? l('НАСТРОЙКА', 'SETUP') : `${l('РАУНД', 'ROUND')} ${s.currentRound}`}</b><span>{phaseLabel}</span></div>
        {isGameHost && (
          <button type="button" className="spy-live-end" onClick={() => setEndConfirmOpen(true)}>{l('ЗАВЕРШИТЬ', 'END')}</button>
        )}
      </header>

      <main className="spy-live-main">
        {s.gameOver && (
          <section className="spy-live-screen spy-live-over">
            <span className="spy-live-kicker">{l('ОПЕРАЦИЯ ЗАВЕРШЕНА', 'OPERATION COMPLETE')}</span>
            <div className="spy-live-end-mark"><SpyIcon name="mask" className="h-20 w-20" /><i /></div>
            <h1>{l('Никому нельзя доверять', 'Trust no one')}</h1>
            <p>{l('Все раунды завершены. Ведущий может закрыть комнату.', 'All rounds are complete. The host can close the room.')}</p>
            <div className="spy-live-stats"><div><b>{s.currentRound}</b><span>{l('РАУНДОВ', 'ROUNDS')}</span></div><div><b>{s.players.length}</b><span>{l('АГЕНТОВ', 'AGENTS')}</span></div><div><b>{Object.keys(s.lastRoundDelta).length}</b><span>{l('УЛИК', 'CLUES')}</span></div></div>
            {isGameHost && <button type="button" className="spy-live-primary" onClick={endGame}>{l('ЗАВЕРШИТЬ ИГРУ', 'END GAME')}</button>}
          </section>
        )}

        {!s.gameOver && s.phase === 'modeSelect' && (
          <section className="spy-live-screen spy-live-mode">
            <span className="spy-live-kicker">{l('НОВАЯ ОПЕРАЦИЯ', 'NEW OPERATION')}</span>
            <h1>{l('Выберите формат расследования', 'Choose an investigation format')}</h1>
            <p>{l('Режим определяет, как участники будут оставлять улики.', 'The mode determines how players leave clues.')}</p>
            {isGameHost ? (
              <div className="spy-live-mode-list">
                <button type="button" onClick={() => startGame('guess')}><SpyIcon name="speech" className="h-9 w-9" /><span><b>{l('УГАДАЙ СЛОВО', 'GUESS THE WORD')}</b><small>{l('Задавайте вопросы по цепочке', 'Ask questions in a chain')}</small></span><i>→</i></button>
                <button type="button" onClick={() => startGame('draw')}><SpyIcon name="palette" className="h-9 w-9" /><span><b>{l('НАРИСУЙ', 'DRAW')}</b><small>{l('Оставляйте улики на общем холсте', 'Leave clues on a shared canvas')}</small></span><i>→</i></button>
              </div>
            ) : (
              <div className="spy-live-radar"><SpyIcon name="mask" className="h-20 w-20" /><i /><i /><i /></div>
            )}
            <div className="spy-live-host-note"><i /><span>{isGameHost ? l('Только вы выбираете режим', 'Only you choose the mode') : l('Ожидаем решения ведущего', 'Waiting for the host')}</span></div>
          </section>
        )}

        {!s.gameOver && s.phase === 'dealing' && (
          <section className="spy-live-screen spy-live-briefing">
            {renderBackButton()}
            <span className="spy-live-kicker">{myReadyInDealing ? l('ДАННЫЕ ПОЛУЧЕНЫ', 'DATA RECEIVED') : l('СЕКРЕТНАЯ РОЛЬ', 'SECRET ROLE')}</span>
            <h1>{myReadyInDealing ? l('Задание сохранено', 'Briefing secured') : l('Узнайте задание', 'Reveal your mission')}</h1>
            <p>{myReadyInDealing ? l('Секрет снова скрыт. Дождитесь остальных участников.', 'The secret is hidden again. Wait for the other agents.') : l('Убедитесь, что никто не видит экран.', 'Make sure nobody can see your screen.')}</p>

            {!myReadyInDealing && !peeking && (
              <button
                type="button"
                className="spy-live-secret"
                onPointerDown={() => setPeeking(true)} onPointerUp={() => setPeeking(false)} onPointerLeave={() => setPeeking(false)} onPointerCancel={() => setPeeking(false)}
                onKeyDown={(event) => { if (event.key === ' ' || event.key === 'Enter') { event.preventDefault(); setPeeking(true); } }}
                onKeyUp={(event) => { if (event.key === ' ' || event.key === 'Enter') { event.preventDefault(); setPeeking(false); } }}
                onContextMenu={(event) => event.preventDefault()}
              >
                <span><SpyIcon name="eye" className="h-12 w-12" /></span><b>{l('УДЕРЖИВАЙТЕ', 'PRESS AND HOLD')}</b><small>{l('Данные исчезнут, когда вы отпустите экран', 'Data disappears when you release')}</small>
              </button>
            )}

            {!myReadyInDealing && peeking && (
              <div className={`spy-live-role ${isSpy ? 'is-spy' : ''}`}>
                <div><SpyIcon name={isSpy ? 'mask' : 'shield'} className="h-16 w-16" /></div>
                <span>{l('ВАША РОЛЬ', 'YOUR ROLE')}</span><b>{isSpy ? l('ШПИОН', 'SPY') : l('МИРНЫЙ', 'CIVILIAN')}</b>
                <small>{isSpy ? l('СЕКРЕТНОЕ СЛОВО ОТСУТСТВУЕТ', 'NO SECRET WORD') : `${l('КАТЕГОРИЯ', 'CATEGORY')} · ${s.category || l('РИСОВАНИЕ', 'DRAWING')}`}</small>
                {!isSpy && <FitWord text={s.word} max={30} className="spy-live-role-word" />}
                <p>{isSpy ? l('Слушайте улики. Вычислите слово. Не выдайте себя.', 'Listen to the clues. Find the word. Stay hidden.') : l('Запомните слово и не показывайте его соседям.', 'Remember the word and keep it hidden.')}</p>
              </div>
            )}

            {myReadyInDealing && (
              <div className={`spy-live-role is-saved ${isSpy ? 'is-spy' : ''}`}><div><SpyIcon name={isSpy ? 'mask' : 'shield'} className="h-14 w-14" /></div><span>{l('ВАША СТОРОНА', 'YOUR SIDE')}</span><b>{isSpy ? l('ШПИОН', 'SPY') : l('МИРНЫЙ', 'CIVILIAN')}</b><small>{l('СЛОВО ЗАЩИЩЕНО', 'WORD SECURED')}</small></div>
            )}

            {!myReadyInDealing && <button type="button" className="spy-live-primary" onClick={acknowledgeWord}>{l('ПОНЯТНО · СКРЫТЬ ДАННЫЕ', 'UNDERSTOOD · HIDE DATA')}</button>}
            <div className="spy-live-progress"><i style={{ width: readyRatio }} /><span>{s.readyPlayers.length} {l('ИЗ', 'OF')} {s.players.length} {l('ГОТОВЫ', 'READY')}</span></div>
            {isGameHost && <button type="button" className="spy-live-secondary" onClick={startPlaying}>{s.mode === 'draw' ? l('НАЧАТЬ РИСОВАНИЕ', 'START DRAWING') : l('НАЧАТЬ ДОПРОС', 'START INTERVIEW')}</button>}
          </section>
        )}

        {!s.gameOver && s.phase === 'playing' && (
          <section className={`spy-live-screen spy-live-playing ${s.mode === 'draw' ? 'is-draw' : ''}`}>
            {renderBackButton()}
            <div className="spy-live-round-row"><span>{formatTime(s.timerLeft)}</span><b>{s.mode === 'draw' ? (isActivePlayer ? l('РИСУЕТЕ ВЫ', 'YOU ARE DRAWING') : `${l('РИСУЕТ', 'DRAWING')} · ${activePlayerName}`) : s.category}</b></div>
            {s.mode === 'guess' ? (
              <>
                <span className="spy-live-kicker">{isActivePlayer ? l('ВАШ ХОД', 'YOUR TURN') : isTargetPlayer ? l('ВАМ ЗАДАЮТ ВОПРОС', 'YOU ARE BEING ASKED') : l('АКТИВНЫЙ ДОПРОС', 'ACTIVE INTERVIEW')}</span>
                <h1>{isActivePlayer ? l(`Задайте вопрос ${targetPlayerName}`, `Ask ${targetPlayerName}`) : l(`${activePlayerName} задаёт вопрос`, `${activePlayerName} is asking`)}</h1>
                <div className={`spy-live-target ${isTargetPlayer ? 'is-you' : ''}`}><i>{targetPlayerName[0] ?? '?'}</i><div><small>{l('АДРЕСАТ', 'TARGET')}</small><b>{targetPlayerName}</b><span>{l('После ответа он продолжит цепочку', 'They continue the chain after answering')}</span></div></div>
                <div className="spy-live-rule"><SpyIcon name="speech" className="h-6 w-6" /><p>{l('Спросите так, чтобы мирные узнали слово, но шпион не получил прямую подсказку.', 'Ask so civilians recognize the word without giving the spy a direct clue.')}</p></div>
              </>
            ) : (
              <>
                <span className="spy-live-kicker">{isActivePlayer ? l('ВАШ ХОД', 'YOUR TURN') : l('ОБЩИЙ ХОЛСТ', 'SHARED CANVAS')}</span>
                <h1>{isActivePlayer ? l('Нарисуйте улику', 'Draw a clue') : l(`${activePlayerName} рисует`, `${activePlayerName} is drawing`)}</h1>
                <p>{l('Не используйте буквы и цифры.', 'Do not use letters or numbers.')}</p>
                <div className="spy-live-canvas"><DrawCanvas canDraw={isDrawer} onStroke={sendStroke} onClear={sendClear} onUndo={handleUndo} /><span>{l('ХОЛСТ СИНХРОНИЗИРУЕТСЯ С TV', 'CANVAS SYNCED WITH TV')}</span></div>
              </>
            )}

            {renderPeekBar()}
            {isSpy && <button type="button" className="spy-live-secondary" onClick={() => sendAction('spy:guess-start')}>{l('УГАДАТЬ СЛОВО', 'GUESS THE WORD')}</button>}
            {isActivePlayer && <button type="button" className="spy-live-primary" onClick={passTurn}>{s.mode === 'draw' ? l('ГОТОВО · ПЕРЕДАТЬ ХОД', 'DONE · PASS TURN') : l('ВОПРОС ЗАДАН · ПЕРЕДАТЬ ХОД', 'QUESTION ASKED · PASS TURN')}</button>}
            {s.mode === 'draw' && isGameHost && <button type="button" className="spy-live-secondary" onClick={nextWord}>{l('СЛЕДУЮЩЕЕ СЛОВО', 'NEXT WORD')}</button>}
            {isGameHost && <div className="spy-live-host-actions">{s.mode === 'guess' && renderHostAction('replace', l('ЗАМЕНИТЬ СЛОВО', 'REPLACE WORD'), <SpyIcon name="refresh" className="h-5 w-5" />)}{renderHostAction('voting', l('ОТКРЫТЬ ГОЛОСОВАНИЕ', 'OPEN VOTING'), <SpyIcon name="ballot" className="h-5 w-5" />)}</div>}
          </section>
        )}

        {!s.gameOver && s.phase === 'discussion' && (
          <section className="spy-live-screen spy-live-discussion">
            <span className="spy-live-kicker">{l('ОБЩИЙ КАНАЛ ОТКРЫТ', 'OPEN CHANNEL')}</span>
            <div className="spy-live-timer"><svg viewBox="0 0 180 180"><circle cx="90" cy="90" r="78" /><circle className="progress" cx="90" cy="90" r="78" /></svg><b>{formatTime(s.discussionTimeLeft)}</b><small>{l('ДО ГОЛОСОВАНИЯ', 'UNTIL VOTING')}</small></div>
            <h1>{l('Сверьте показания', 'Compare the evidence')}</h1><p>{l('Обсудите улики и назовите тех, чьи ответы звучали подозрительно.', 'Discuss the clues and identify suspicious answers.')}</p>
            <div className="spy-live-agents">{s.players.slice(0, 7).map((player) => <i key={player.id}>{player.nickname[0]}</i>)}</div>
            {isGameHost ? renderHostAction('voting', l('НАЧАТЬ ГОЛОСОВАНИЕ', 'START VOTING'), <SpyIcon name="ballot" className="h-5 w-5" />) : <div className="spy-live-host-note"><i /><span>{l('Ведущий откроет голосование', 'The host will open voting')}</span></div>}
          </section>
        )}

        {!s.gameOver && s.phase === 'voting' && (
          <section className="spy-live-screen spy-live-voting">
            <div className="spy-live-round-row"><span>{formatTime(s.voteTimerLeft)}</span><b>{l('ВЫБОР ЗАШИФРОВАН', 'ENCRYPTED VOTE')}</b></div>
            <span className="spy-live-kicker">{l('ФИНАЛЬНОЕ РЕШЕНИЕ', 'FINAL DECISION')}</span><h1>{l('Кто здесь шпион?', 'Who is the spy?')}</h1><p>{l('Выберите одного участника. После подтверждения изменить голос нельзя.', 'Choose one player. The vote cannot be changed after confirmation.')}</p>
            <div className="spy-live-vote-list">{s.players.filter((player) => player.id !== effectivePlayerId).map((player) => { const selected = localVote === player.id; return <button key={player.id} type="button" className={selected ? 'selected' : ''} disabled={hasVoted || Boolean(myVoteInVoting)} onClick={() => setLocalVote(player.id)}><i>{player.nickname[0]}</i><b>{player.nickname}</b><span>{selected ? l('ВЫБРАН', 'SELECTED') : ''}</span></button>; })}</div>
            {hasVoted || myVoteInVoting ? <div className="spy-live-accepted"><SpyIcon name="check" className="h-6 w-6" /><span>{l('ГОЛОС ПРИНЯТ · ОЖИДАЕМ ОСТАЛЬНЫХ', 'VOTE ACCEPTED · WAITING')}</span></div> : <button type="button" className="spy-live-primary" disabled={!localVote} onClick={handleSubmitVote}>{selectedVoteName ? l(`ПОДТВЕРДИТЬ · ${selectedVoteName}`, `CONFIRM · ${selectedVoteName}`) : l('ВЫБЕРИТЕ ИГРОКА', 'SELECT A PLAYER')}</button>}
          </section>
        )}

        {!s.gameOver && s.phase === 'spyGuess' && (
          <section className="spy-live-screen spy-live-guess">
            {isSpy ? <>
              <span className="spy-live-kicker is-danger">{l('ВАС РАСКРЫЛИ', 'IDENTITY EXPOSED')}</span><div className="spy-live-alert"><SpyIcon name="mask" className="h-16 w-16" /></div><h1>{l('Последний шанс', 'One last chance')}</h1><p>{l('Угадайте секретное слово и перехватите победу.', 'Guess the secret word and steal the victory.')}</p>
              <label className="spy-live-input"><span>{l('ВАША ВЕРСИЯ', 'YOUR GUESS')}</span><input value={guessInput} onChange={(event) => setGuessInput(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && guessInput.trim()) sendAction('spy:guess-try', { text: guessInput }); }} placeholder={l('Введите слово', 'Enter the word')} /></label>
              <div className="spy-live-category"><span>{l('КАТЕГОРИЯ', 'CATEGORY')}</span><b>{s.category}</b></div>
              {!s.spyGuessAwaitingJudge && <button type="button" className="spy-live-danger" disabled={!guessInput.trim()} onClick={() => sendAction('spy:guess-try', { text: guessInput })}>{l('ОТПРАВИТЬ ОТВЕТ', 'SUBMIT ANSWER')}</button>}
              {s.spyGuessNeedsConfirm && !s.spyGuessAwaitingJudge && <button type="button" className="spy-live-secondary" onClick={() => sendAction('spy:guess-confirm')}>{l('ДА, ПРОВЕРИТЬ У ИГРОКА', 'YES, ASK A PLAYER')}</button>}
              {s.spyGuessAwaitingJudge && <BreathingPlaceholder text={l('Ожидаем решение проверяющего…', 'Waiting for the judge...')} variant="breathing-text" />}
            </> : isJudge && s.spyGuessAwaitingJudge ? <>
              <span className="spy-live-kicker">{l('ТРЕБУЕТСЯ ПРОВЕРКА', 'REVIEW REQUIRED')}</span><h1>{l('Ответ можно засчитать?', 'Can this answer count?')}</h1><p>{l('Сравните версию шпиона с секретным словом.', 'Compare the spy guess with the secret word.')}</p>
              <div className="spy-live-compare"><div><span>{l('ОТВЕТ ШПИОНА', 'SPY ANSWER')}</span><b>{s.spyGuessText}</b></div><i>≠</i><div><span>{l('СЕКРЕТНОЕ СЛОВО', 'SECRET WORD')}</span><b>{s.word}</b></div></div>
              <button type="button" className="spy-live-primary" onClick={() => sendAction('spy:guess-verdict', { accept: true })}>{l('ДА, ЭТО ВЕРНЫЙ ОТВЕТ', 'YES, ACCEPT')}</button><button type="button" className="spy-live-danger" onClick={() => sendAction('spy:guess-verdict', { accept: false })}>{l('НЕТ, ОТКЛОНИТЬ', 'NO, REJECT')}</button>
            </> : <div className="spy-live-wait"><div className="spy-live-alert"><SpyIcon name="mask" className="h-16 w-16" /></div><h1>{l(`${spyPlayerName} угадывает слово`, `${spyPlayerName} is guessing`)}</h1><BreathingPlaceholder text={l('Ответ вводится на личном экране', 'The answer is entered privately')} variant="breathing-text" /></div>}
          </section>
        )}

        {!s.gameOver && s.phase === 'roundResult' && s.roundResult && (
          <section className="spy-live-screen spy-live-result">
            {renderBackButton()}<span className="spy-live-kicker">{l('ДЕЛО ЗАКРЫТО', 'CASE CLOSED')}</span><div className={`spy-live-success ${s.roundResult.spyCaught ? '' : 'is-danger'}`}><SpyIcon name={s.roundResult.spyCaught ? 'shield' : 'mask'} className="h-16 w-16" /></div><h1>{s.roundResult.spyCaught ? l('Шпион раскрыт', 'Spy exposed') : l('Шпион победил', 'Spy wins')}</h1><p>{s.roundResult.viaGuess ? l('Результат определила последняя попытка шпиона.', 'The spy’s final attempt decided the round.') : l('Большинство завершило расследование.', 'The majority closed the investigation.')}</p>
            <div className="spy-live-result-grid"><div><span>{l('ШПИОН', 'SPY')}</span><b>{spyPlayerName}</b></div><div><span>{l('СЛОВО', 'WORD')}</span><b>{s.word}</b></div></div>
            {!s.roundResult.viaGuess && <div className="spy-live-progress"><i style={{ width: `${Math.min(100, (s.roundResult.voteCount / Math.max(1, s.players.length)) * 100)}%` }} /><span>{s.roundResult.voteCount} {l('ИЗ', 'OF')} {s.players.length} {l('ГОЛОСОВ', 'VOTES')}</span></div>}
            {isGameHost ? <button type="button" className="spy-live-primary" onClick={nextRound}>{l('НОВОЕ СЛОВО', 'NEW WORD')}</button> : <BreathingPlaceholder text={l('Ведущий запустит следующий раунд', 'The host starts the next round')} variant="breathing-text" />}
          </section>
        )}
      </main>

      <footer className="spy-live-footer"><i /> {l('ЗАЩИЩЁННАЯ СЕТЬ · СИГНАЛ СТАБИЛЕН', 'SECURE NETWORK · SIGNAL STABLE')}</footer>
      {endConfirmOpen && <div className="spy-live-modal" role="dialog" aria-modal="true"><div><span className="spy-live-kicker is-danger">{l('ЗАКРЫТЬ ОПЕРАЦИЮ?', 'CLOSE OPERATION?')}</span><h2>{l('Завершить игру', 'End game')}</h2><p>{l('Все участники вернутся в лобби.', 'Everyone will return to the lobby.')}</p><button type="button" className="spy-live-danger" onClick={endGame}>{l('ДА, ЗАВЕРШИТЬ', 'YES, END')}</button><button type="button" className="spy-live-secondary" onClick={() => setEndConfirmOpen(false)}>{l('ОТМЕНА', 'CANCEL')}</button></div></div>}
    </GameSurface>
  );
}
