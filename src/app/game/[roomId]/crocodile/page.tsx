'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, type PanInfo, useReducedMotion } from 'framer-motion';
import { useParams, useRouter } from 'next/navigation';
import { CrocIcon } from '@/components/games/CrocIcon';
import { FitText } from '@/components/games/FitText';
import { GameLayout } from '@/components/games/GameLayout';
import { PlayerAvatar } from '@/components/ui/PlayerAvatar';
import { useSocket } from '@/lib/use-socket';
import { useRoomState } from '@/lib/use-room-state';
import { useGameAction } from '@/lib/use-game-action';
import { useNavigateOnGameEnd } from '@/lib/use-navigate-on-game-end';
import { useGameIdentity } from '@/lib/use-game-identity';
import { useTranslation } from '@/lib/i18n';
import { CROCODILE_WORDS } from '@/lib/game-data';
import { formatGameTime } from '@/lib/format-game-time';
import { mergeCrocodileStateSync } from '@/lib/crocodile-state-sync';
import { Player } from '@/types/room';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CrocodileGameState {
  phase: 'waiting' | 'ready' | 'explaining' | 'turnResult' | 'finished';
  turnNumber: number;
  explainerIndex: number;
  explainerId: string;
  currentWordIndex: number;
  timeLeft: number;
  scores: Record<string, number>;
  wordsGuessed: number;
  wordsSkipped: number;
  winnerId: string | null;
  finishingRound: number | null;
  playersOrder: string[];          // player ids in turn order
  usedWordIndices: number[];       // track used words to avoid repeats
}

const TURN_DURATION = 60; // seconds
const MIN_PLAYERS = 2;
const MAX_PLAYERS = 10;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function pickRandomWordIndex(usedIndices: number[]): number {
  const available = CROCODILE_WORDS.map((_, i) => i).filter(
    (i) => !usedIndices.includes(i),
  );
  if (available.length === 0) {
    return Math.floor(Math.random() * CROCODILE_WORDS.length);
  }
  return available[Math.floor(Math.random() * available.length)];
}

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function getRoundNumber(state: Pick<CrocodileGameState, 'turnNumber' | 'playersOrder'>): number {
  return Math.floor((state.turnNumber - 1) / Math.max(1, state.playersOrder.length)) + 1;
}

function getLeaderId(scores: Record<string, number>): string | null {
  return Object.entries(scores).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
}

function SwipeWordCard({
  word,
  locale,
  active = false,
  direction,
  reduceMotion,
  stackIndex = 0,
  transitionDuration = 0.34,
  className = '',
  onSwipe,
}: {
  word: { ru: string; en: string } | null;
  locale: 'ru' | 'en';
  active?: boolean;
  direction: 'left' | 'right' | null;
  reduceMotion: boolean;
  stackIndex?: 0 | 1 | 2;
  transitionDuration?: number;
  className?: string;
  onSwipe: (direction: 'left' | 'right') => void;
}) {
  const handleDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (!active || direction) return;
    if (info.offset.x > 82 || info.velocity.x > 520) onSwipe('right');
    if (info.offset.x < -82 || info.velocity.x < -520) onSwipe('left');
  };

  return (
    <motion.section
      drag={active && !direction ? 'x' : false}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.72}
      onDragEnd={handleDragEnd}
      animate={direction
        ? { x: direction === 'right' ? 520 : -520, rotate: direction === 'right' ? 12 : -12, opacity: 0 }
        : {
            x: 0,
            y: stackIndex * 8,
            rotate: stackIndex === 1 ? -2.5 : stackIndex === 2 ? 3.5 : 0,
            scale: 1 - stackIndex * 0.035,
            opacity: 1,
          }}
      transition={{ duration: reduceMotion ? 0 : transitionDuration, ease: [0.22, 1, 0.36, 1] }}
      style={{ zIndex: 3 - stackIndex }}
      className={`absolute inset-0 flex flex-col justify-between overflow-hidden rounded-[34px] bg-[linear-gradient(145deg,#ff6a4d_0%,#ef3340_48%,#a90f2b_100%)] p-6 text-white shadow-[0_26px_65px_rgba(0,0,0,.52)] ${active ? 'touch-none cursor-grab select-none active:cursor-grabbing' : 'pointer-events-none touch-pan-y'} ${className}`}
      aria-label={active ? (locale === 'ru' ? 'Карточка слова. Смахните влево, чтобы пропустить, или вправо, если слово угадано' : 'Word card. Swipe left to skip or right when guessed') : undefined}
    >
      <div className="flex items-center justify-between gap-3 font-mono text-[10px] font-black uppercase tracking-[0.14em]">
        <button
          type="button"
          disabled={!active || Boolean(direction)}
          onClick={() => onSwipe('left')}
          className="min-h-11 rounded-full px-1 text-left text-white transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 disabled:pointer-events-none"
        >
          ← {locale === 'ru' ? 'пропустить' : 'skip'}
        </button>
        <button
          type="button"
          disabled={!active || Boolean(direction)}
          onClick={() => onSwipe('right')}
          className="min-h-11 rounded-full px-1 text-right text-white transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 disabled:pointer-events-none"
        >
          {locale === 'ru' ? 'угадали +1' : 'guessed +1'} →
        </button>
      </div>

      <div className="relative min-h-0 flex-1">
        <div className="absolute -inset-x-4 inset-y-7">
          {word ? (
            <FitText
              text={locale === 'ru' ? word.ru : word.en}
              max={58}
              min={18}
              className="text-center font-black uppercase leading-[0.88] tracking-[-0.055em]"
              style={{ textShadow: '0 4px 18px rgba(74,0,13,.35)' }}
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <CrocIcon name="croc" className="h-24 w-24 text-white/80" />
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-white/80">
        <span>←</span><i className="h-px flex-1 bg-white/45" />
        <span>{locale === 'ru' ? 'Свайпни карточку' : 'Swipe the card'}</span>
        <i className="h-px flex-1 bg-white/45" /><span>→</span>
      </div>
    </motion.section>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function CrocodilePage() {
  const { roomId } = useParams<{ roomId: string }>();
  const { emit, on } = useSocket();
  const { user, effectivePlayerId, isGameHost } = useGameIdentity(roomId);
  const router = useRouter();
  useNavigateOnGameEnd(roomId, user ? 'lobby' : 'phone');
  const { locale } = useTranslation();

  // Room players (from room:state)
  const [players, setPlayers] = useState<Player[]>([]);

  // Game state (host is source of truth, broadcasts to all)
  const [gameState, setGameState] = useState<CrocodileGameState | null>(null);
  const gameStateRef = useRef<CrocodileGameState | null>(null);
  const isGameHostRef = useRef(false);
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);
  const [outgoingWordIndex, setOutgoingWordIndex] = useState<number | null>(null);
  const [cardCycle, setCardCycle] = useState(0);
  const [swipeFeedback, setSwipeFeedback] = useState<'skipped' | 'guessed' | null>(null);
  const [swipeAnimationDone, setSwipeAnimationDone] = useState(false);
  const swipeLockRef = useRef(false);
  const swipeResetRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const feedbackResetRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reduceMotion = useReducedMotion();

  // Timer ref for host-side countdown
  useEffect(() => { isGameHostRef.current = isGameHost; }, [isGameHost]);

  // ------------------------------------------------------------------
  // Derived helpers
  // ------------------------------------------------------------------

  const currentExplainer = players.find(
    (p) => p.id === gameState?.explainerId,
  );
  const isExplainer = effectivePlayerId === gameState?.explainerId;
  const currentWord =
    gameState && gameState.currentWordIndex >= 0
      ? CROCODILE_WORDS[gameState.currentWordIndex]
      : null;
  const outgoingWord = outgoingWordIndex == null
    ? currentWord
    : CROCODILE_WORDS[outgoingWordIndex] ?? currentWord;
  const nextWordIsReady = outgoingWordIndex !== null
    && gameState !== null
    && gameState.currentWordIndex !== outgoingWordIndex;
  const revealedNextWord = nextWordIsReady ? currentWord : null;

  // ------------------------------------------------------------------
  // Listen for room:state to get players list
  // ------------------------------------------------------------------

  useRoomState(roomId, (data) => {
    const d = data as { players: Player[] };
    if (d.players) setPlayers(d.players);
  });

  // ------------------------------------------------------------------
  // Broadcast helper (host -> all via game:action)
  // ------------------------------------------------------------------

  const broadcast = useGameAction(roomId);

  // ------------------------------------------------------------------
  // Listen for game:action events
  // ------------------------------------------------------------------

  useEffect(() => {
    const unsub1 = on(
      'game:action',
      (data: unknown) => {
        const { action, payload } = data as {
          action: string;
          payload: CrocodileGameState;
          from: string;
        };

        switch (action) {
          case 'croc:state':
            setGameState((prev) => {
              const next = mergeCrocodileStateSync(prev, payload);
              gameStateRef.current = next;
              return next;
            });
            break;
          case 'croc:tick':
            setGameState((prev) => {
              const next = prev
                ? { ...prev, timeLeft: (payload as unknown as { timeLeft: number }).timeLeft }
                : prev;
              gameStateRef.current = next;
              return next;
            });
            break;
          case 'croc:request-state':
            // TV joined mid-game — host re-broadcasts current state
            if (isGameHostRef.current && gameStateRef.current) {
              broadcast('croc:state', gameStateRef.current);
            }
            break;
        }
      },
    );
    return () => { unsub1(); };
  }, [on, broadcast]);

  useEffect(() => {
    broadcast('croc:request-state');

    const handleVisibilityChange = () => {
      if (!document.hidden) broadcast('croc:request-state');
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [broadcast]);

  useEffect(() => () => {
    if (swipeResetRef.current) clearTimeout(swipeResetRef.current);
    if (feedbackResetRef.current) clearTimeout(feedbackResetRef.current);
  }, []);

  // ------------------------------------------------------------------
  // The server owns the turn clock, including when the host phone sleeps.
  // ------------------------------------------------------------------

  // ------------------------------------------------------------------
  // Host: start game
  // ------------------------------------------------------------------

  const startGame = useCallback(() => {
    if (!isGameHost || players.length < MIN_PLAYERS || players.length > MAX_PLAYERS) return;

    const order = shuffleArray(players.map((p) => p.id));
    const firstWordIdx = pickRandomWordIndex([]);

    const initial: CrocodileGameState = {
      phase: 'ready',
      turnNumber: 1,
      explainerIndex: 0,
      explainerId: order[0],
      currentWordIndex: firstWordIdx,
      timeLeft: TURN_DURATION,
      scores: Object.fromEntries(players.map((p) => [p.id, 0])),
      wordsGuessed: 0,
      wordsSkipped: 0,
      winnerId: null,
      finishingRound: null,
      playersOrder: order,
      usedWordIndices: [firstWordIdx],
    };

    setGameState(initial);
    gameStateRef.current = initial;
    broadcast('croc:state', initial);
  }, [isGameHost, players, broadcast]);

  // ------------------------------------------------------------------
  // The current explainer asks the server to start the turn.
  // ------------------------------------------------------------------

  const startTurn = useCallback(() => {
    const current = gameStateRef.current;
    if (!current || current.phase !== 'ready') return;
    broadcast('croc:start-turn', {
      turnNumber: current.turnNumber,
      currentWordIndex: current.currentWordIndex,
    });
  }, [broadcast]);

  // ------------------------------------------------------------------
  // Explainer presses Guessed / Skip (emit to host if not host)
  // ------------------------------------------------------------------

  const emitAction = useCallback(
    (action: string, payload: Record<string, unknown> = {}) => {
      broadcast(action, payload);
    },
    [broadcast],
  );

  const triggerSwipe = useCallback((direction: 'left' | 'right') => {
    const current = gameStateRef.current;
    if (!current || current.phase !== 'explaining' || swipeDirection || swipeLockRef.current) return;

    swipeLockRef.current = true;
    setSwipeAnimationDone(false);
    setOutgoingWordIndex(current.currentWordIndex);
    setSwipeDirection(direction);
    setSwipeFeedback(direction === 'right' ? 'guessed' : 'skipped');

    if (swipeResetRef.current) clearTimeout(swipeResetRef.current);
    if (feedbackResetRef.current) clearTimeout(feedbackResetRef.current);

    emitAction(direction === 'right' ? 'croc:guessed' : 'croc:skip', {
      turnNumber: current.turnNumber,
      currentWordIndex: current.currentWordIndex,
    });

    swipeResetRef.current = setTimeout(() => {
      setSwipeAnimationDone(true);
    }, reduceMotion ? 20 : 620);

    feedbackResetRef.current = setTimeout(() => {
      setSwipeFeedback(null);
    }, reduceMotion ? 40 : 1050);
  }, [emitAction, reduceMotion, swipeDirection]);

  useEffect(() => {
    if (!swipeDirection || !swipeAnimationDone || !nextWordIsReady) return;
    const frame = requestAnimationFrame(() => {
      setOutgoingWordIndex(null);
      setSwipeDirection(null);
      setCardCycle((cycle) => cycle + 1);
      swipeLockRef.current = false;
    });
    return () => cancelAnimationFrame(frame);
  }, [nextWordIsReady, swipeAnimationDone, swipeDirection]);

  // ------------------------------------------------------------------
  // Host: end game manually
  // ------------------------------------------------------------------

  const endGame = useCallback(() => {
    emit('game:end', { code: roomId });
    router.push(user ? `/lobby/${roomId}` : `/join/${roomId}`);
  }, [emit, roomId, router, user]);

  const winnerId = gameState?.winnerId
    ?? (gameState?.phase === 'finished'
      ? getLeaderId(gameState.scores)
      : null);
  const winner = players.find((player) => player.id === winnerId);
  const winnerScore = winnerId ? gameState?.scores[winnerId] ?? 0 : 0;
  const roundNumber = gameState ? getRoundNumber(gameState) : 1;
  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------

  return (
    <GameLayout
      title={locale === 'ru' ? 'Крокодил' : 'Crocodile'}
      icon={<CrocIcon name="croc" className="h-7 w-7" />}
      onEnd={isGameHost ? endGame : undefined}
      showScoreboard={false}
      phaseKey={`${gameState?.phase ?? 'waiting'}-${gameState?.turnNumber ?? 0}`}
      gradientClass={`bg-[#100d12] bg-[radial-gradient(circle_at_85%_0%,rgba(239,51,64,.28),transparent_40%)] ${gameState?.phase === 'explaining' && isExplainer ? 'h-[100dvh] overflow-hidden overscroll-none' : ''}`}
    >
      <div className="mx-auto mb-3 flex w-full max-w-md items-center justify-between">
        <span className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-white/45">
          {locale === 'ru' ? `РАУНД ${roundNumber}` : `ROUND ${roundNumber}`}
        </span>
        <span className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-white/45">
          {gameState?.finishingRound !== null && gameState?.finishingRound !== undefined
            ? locale === 'ru' ? 'ФИНАЛЬНЫЙ КРУГ' : 'FINAL ROUND'
            : locale === 'ru' ? 'ЦЕЛЬ · 20 СЛОВ' : 'GOAL · 20 WORDS'}
        </span>
      </div>

      {(!gameState || gameState.phase === 'waiting') && (
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center text-center">
          <span className="mx-auto flex h-28 w-28 items-center justify-center rounded-full bg-[#ef3340]/15 shadow-[0_0_50px_rgba(239,51,64,.18)]">
            <CrocIcon name="croc" className="h-20 w-20 text-[#ef3340]" />
          </span>
          <h2 className="mt-7 text-4xl font-black tracking-[-0.045em]">
            {locale === 'ru' ? 'Гонка до 20 слов' : 'Race to 20 words'}
          </h2>
          <p className="mt-3 text-white/50">
            {locale === 'ru'
              ? `Подключено игроков: ${players.length}`
              : `Players connected: ${players.length}`}
          </p>
          <p className="mx-auto mt-5 max-w-sm text-sm leading-relaxed text-white/40">
            {locale === 'ru'
              ? 'Смахни карточку вправо, если слово угадано, или влево, чтобы пропустить.'
              : 'Swipe right when the word is guessed or left to skip it.'}
          </p>

          <div className="mt-10">
            {isGameHost ? (
              <button
                type="button"
                onClick={startGame}
                disabled={players.length < MIN_PLAYERS || players.length > MAX_PLAYERS}
                className="min-h-[72px] w-full rounded-[24px] bg-[#ef3340] px-6 text-lg font-black text-white shadow-[0_18px_44px_rgba(239,51,64,.3)] transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {players.length < MIN_PLAYERS
                  ? locale === 'ru' ? `Нужно минимум ${MIN_PLAYERS} игрока` : `At least ${MIN_PLAYERS} players required`
                  : players.length > MAX_PLAYERS
                  ? locale === 'ru' ? `Максимум ${MAX_PLAYERS} игроков` : `Maximum ${MAX_PLAYERS} players`
                  : locale === 'ru' ? 'НАЧАТЬ ИГРУ' : 'START GAME'}
              </button>
            ) : (
              <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-5 font-bold text-white/55 animate-pulse motion-reduce:animate-none">
                {locale === 'ru' ? 'Ждём запуска хоста' : 'Waiting for the host'}
              </div>
            )}
          </div>
        </div>
      )}

      {gameState?.phase === 'ready' && isExplainer && (
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col">
          <div className="flex flex-1 items-center justify-center">
            <div className="flex h-[390px] w-[285px] flex-col items-center justify-center rounded-[38px] bg-[linear-gradient(145deg,#ff6a4d,#ef3340,#a90f2b)] text-center shadow-[0_30px_70px_rgba(0,0,0,.5)] motion-safe:animate-[pulse_2.8s_cubic-bezier(.45,0,.2,1)_infinite]">
              <CrocIcon name="croc" className="h-24 w-24 text-white" />
              <b className="mt-8 text-2xl">{locale === 'ru' ? 'Колода слов' : 'Word deck'}</b>
              <small className="mt-2 text-white/60">{locale === 'ru' ? 'Слово откроется после старта' : 'The word appears after start'}</small>
            </div>
          </div>
          <button
            type="button"
            onClick={startTurn}
            className="min-h-[72px] rounded-[24px] bg-[#fff4da] text-lg font-black text-[#8f1224] shadow-[0_18px_42px_rgba(0,0,0,.25)] transition active:scale-[0.98]"
          >
            {locale === 'ru' ? 'НАЧАТЬ' : 'START'}
          </button>
          <p className="mt-3 text-center text-sm text-white/55">
            {locale === 'ru' ? 'Нажми, когда готов показывать' : 'Tap when you are ready to explain'}
          </p>
        </div>
      )}

      {gameState?.phase === 'ready' && !isExplainer && (
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center text-center">
          <div className="rounded-full bg-[#ef3340]/15 p-4 shadow-[0_0_50px_rgba(239,51,64,.16)] motion-safe:animate-pulse">
            <PlayerAvatar nickname={currentExplainer?.nickname ?? '?'} sizePx={120} ring="#ef3340" />
          </div>
          <h2 className="mt-8 text-4xl font-black tracking-[-0.045em]">
            {locale === 'ru'
              ? `${currentExplainer?.nickname ?? 'Игрок'} готовится`
              : `${currentExplainer?.nickname ?? 'Player'} is getting ready`}
          </h2>
          <p className="mt-3 text-white/50">
            {locale === 'ru' ? 'Первая карточка уже на телефоне игрока' : 'The first card is ready on the player’s phone'}
          </p>
        </div>
      )}

      {gameState?.phase === 'explaining' && isExplainer && currentWord && (
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col">
          <div className="rounded-[18px] bg-[#211b24] p-3 text-white">
            <div className="flex items-center justify-between">
              <small className="font-mono text-[9px] uppercase tracking-[0.2em] text-white/45">{locale === 'ru' ? 'Время хода' : 'Turn time'}</small>
              <b className={`font-mono text-2xl tabular-nums ${gameState.timeLeft <= 10 ? 'text-red-200 animate-pulse motion-reduce:animate-none' : ''}`}>{formatGameTime(gameState.timeLeft)}</b>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
              <i className="block h-full rounded-full bg-[#ef3340] transition-[width] duration-1000 motion-reduce:transition-none" style={{ width: `${(gameState.timeLeft / TURN_DURATION) * 100}%` }} />
            </div>
          </div>

          <div className="relative mx-auto mt-6 h-[500px] w-[min(100%,340px)]">
            <SwipeWordCard word={null} locale={locale} direction={null} reduceMotion={Boolean(reduceMotion)} stackIndex={2} onSwipe={triggerSwipe} />
            <SwipeWordCard
              word={revealedNextWord}
              locale={locale}
              direction={null}
              reduceMotion={Boolean(reduceMotion)}
              stackIndex={nextWordIsReady ? 0 : 1}
              transitionDuration={0.5}
              onSwipe={triggerSwipe}
            />
            <SwipeWordCard key={`active-${cardCycle}`} word={outgoingWord} locale={locale} active direction={swipeDirection} reduceMotion={Boolean(reduceMotion)} onSwipe={triggerSwipe} />

            {swipeFeedback && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.94 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className={`absolute bottom-20 z-20 rounded-full px-5 py-3 text-sm font-black shadow-xl ${swipeFeedback === 'guessed' ? 'right-5 bg-[#fff4da] text-[#971124]' : 'left-5 bg-[#24212a] text-white'}`}
                aria-live="polite"
              >
                {swipeFeedback === 'guessed'
                  ? locale === 'ru' ? '+1 УГАДАНО' : '+1 GUESSED'
                  : locale === 'ru' ? 'ПРОПУСК' : 'SKIPPED'}
              </motion.div>
            )}
          </div>
        </div>
      )}

      {gameState?.phase === 'explaining' && !isExplainer && (
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center text-center">
          <div className="flex h-48 w-48 items-center justify-center rounded-full border border-[#ef3340]/40 bg-[#ef3340]/10 shadow-[0_0_55px_rgba(239,51,64,.14)] motion-safe:animate-pulse">
            <CrocIcon name="talk" className="h-20 w-20 text-[#ef3340]" />
          </div>
          <h2 className="mt-9 text-4xl font-black">{locale === 'ru' ? 'Угадывайте' : 'Guess'}</h2>
          <p className="mt-3 text-white/50">
            {locale === 'ru'
              ? `${currentExplainer?.nickname ?? 'Игрок'} показывает слово`
              : `${currentExplainer?.nickname ?? 'Player'} is showing a word`}
          </p>
          <div className="mt-10 w-full rounded-[18px] bg-[#211b24] p-3 text-left">
            <div className="flex items-center justify-between"><small className="font-mono text-[9px] uppercase tracking-[0.2em] text-white/45">{locale === 'ru' ? 'Время хода' : 'Turn time'}</small><b className="font-mono text-2xl tabular-nums">{formatGameTime(gameState.timeLeft)}</b></div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10"><i className="block h-full rounded-full bg-[#ef3340] transition-[width] duration-1000 motion-reduce:transition-none" style={{ width: `${(gameState.timeLeft / TURN_DURATION) * 100}%` }} /></div>
          </div>
        </div>
      )}

      {gameState?.phase === 'turnResult' && (
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col text-center">
          <div className="flex flex-1 flex-col items-center justify-center py-8">
            <span className="font-mono text-xs uppercase tracking-[0.2em] text-[#ff8b78]">{locale === 'ru' ? 'ХОД ЗАВЕРШЁН' : 'TURN COMPLETE'}</span>
            <h2 className="mt-4 text-3xl font-black">{isExplainer ? (locale === 'ru' ? 'Твой результат' : 'Your result') : currentExplainer?.nickname}</h2>
            <div className="mt-8 w-full rounded-[32px] bg-[#ef3340] p-8">
              <b className="block font-mono text-7xl">{gameState.wordsGuessed}</b>
              <span className="mt-3 block text-lg font-bold">{locale === 'ru' ? 'Угадано слов за ход' : 'Words guessed this turn'}</span>
            </div>
          </div>
          {isExplainer ? (
            <button type="button" onClick={() => emitAction('croc:continue', { turnNumber: gameState.turnNumber })} className="mt-6 min-h-[68px] w-full shrink-0 rounded-[24px] bg-[#fff4da] text-lg font-black text-[#8f1224] transition active:scale-[0.98]">
              {locale === 'ru' ? 'ПРОДОЛЖИТЬ' : 'CONTINUE'}
            </button>
          ) : <p className="mt-6 text-white/60">{locale === 'ru' ? 'Ждём, пока игрок нажмёт «Продолжить»' : 'Waiting for the player to continue'}</p>}
        </div>
      )}

      {gameState?.phase === 'finished' && (
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center">
          <span className="font-mono text-xs font-bold uppercase tracking-[0.25em] text-[#ff8b78]">{locale === 'ru' ? `Финиш · раунд ${roundNumber}` : `Finish · round ${roundNumber}`}</span>
          <h2 className="mt-3 text-5xl font-black tracking-[-0.05em]">
            {winnerId && winnerId === effectivePlayerId
              ? (locale === 'ru' ? 'Вы победили' : 'You won')
              : (locale === 'ru' ? `${winner?.nickname ?? 'Игрок'} победил` : `${winner?.nickname ?? 'Player'} wins`)}
          </h2>
          <div className="mt-8 rounded-[34px] bg-[#ef3340] p-7 shadow-[0_28px_70px_rgba(239,51,64,.3)]">
            <PlayerAvatar nickname={winner?.nickname ?? '?'} sizePx={88} ring="#fff4da" />
            <b className="mt-5 block font-mono text-6xl">{winnerScore}</b>
            <span>{locale === 'ru' ? 'Больше всех угаданных слов' : 'Most guessed words'}</span>
          </div>
          {isGameHost && (
            <button
              type="button"
              onClick={startGame}
              className="mt-8 min-h-[68px] w-full rounded-[24px] bg-[#fff4da] text-lg font-black text-[#8f1224] transition active:scale-[0.98]"
            >
              {locale === 'ru' ? 'ИГРАТЬ СНОВА' : 'PLAY AGAIN'}
            </button>
          )}
        </div>
      )}
    </GameLayout>
  );
}
