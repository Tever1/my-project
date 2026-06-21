'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { CrocIcon } from '@/components/games/CrocIcon';
import { FitText } from '@/components/games/FitText';
import { GameLayout } from '@/components/games/GameLayout';
import { BreathingPlaceholder } from '@/components/ingame';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { PlayerAvatar } from '@/components/ui/PlayerAvatar';
import { useSocket } from '@/lib/use-socket';
import { useRoomState } from '@/lib/use-room-state';
import { useGameAction } from '@/lib/use-game-action';
import { useNavigateOnGameEnd } from '@/lib/use-navigate-on-game-end';
import { useGameIdentity } from '@/lib/use-game-identity';
import { useTranslation } from '@/lib/i18n';
import { CROCODILE_WORDS } from '@/lib/game-data';
import { Player } from '@/types/room';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CrocodileGameState {
  phase: 'waiting' | 'ready' | 'explaining' | 'finished';
  turnNumber: number;
  explainerIndex: number;
  explainerId: string;
  currentWordIndex: number;
  timeLeft: number;
  scores: Record<string, number>;
  wordsGuessed: number;
  wordsSkipped: number;
  playersOrder: string[];          // player ids in turn order
  usedWordIndices: number[];       // track used words to avoid repeats
}

const TURN_DURATION = 60; // seconds
const ROUNDS_PER_PLAYER = 3;

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

  // Timer ref for host-side countdown
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  isGameHostRef.current = isGameHost;

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
            setGameState(payload);
            gameStateRef.current = payload;
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

  // ------------------------------------------------------------------
  // Host: timer management
  // ------------------------------------------------------------------

  useEffect(() => {
    if (!isGameHost || !gameState || gameState.phase !== 'explaining') return;

    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      setGameState((prev) => {
        if (!prev || prev.phase !== 'explaining') return prev;
        const newTime = prev.timeLeft - 1;

        broadcast('croc:tick', { timeLeft: Math.max(newTime, 0) });

        if (newTime <= 0) {
          if (timerRef.current) clearInterval(timerRef.current);
          setTimeout(() => advanceToNextExplainer(prev), 0);
          return { ...prev, timeLeft: 0 };
        }
        return { ...prev, timeLeft: newTime };
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isGameHost, gameState?.phase, gameState?.explainerId]);

  // ------------------------------------------------------------------
  // Host: start game
  // ------------------------------------------------------------------

  const startGame = useCallback(() => {
    if (!isGameHost || players.length < 2) return;

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
      playersOrder: order,
      usedWordIndices: [firstWordIdx],
    };

    setGameState(initial);
    gameStateRef.current = initial;
    broadcast('croc:state', initial);
  }, [isGameHost, players, broadcast]);

  // ------------------------------------------------------------------
  // Host: advance to next explainer
  // ------------------------------------------------------------------

  const advanceToNextExplainer = useCallback(
    (prev: CrocodileGameState) => {
      const totalTurns = prev.playersOrder.length * ROUNDS_PER_PLAYER;

      if (prev.turnNumber >= totalTurns || prev.playersOrder.length === 0) {
        const finished: CrocodileGameState = {
          ...prev,
          phase: 'finished',
          timeLeft: 0,
        };
        setGameState(finished);
        gameStateRef.current = finished;
        broadcast('croc:state', finished);
        return;
      }

      const nextIndex = (prev.explainerIndex + 1) % prev.playersOrder.length;
      const nextId = prev.playersOrder[nextIndex];
      const nextWordIdx = pickRandomWordIndex(prev.usedWordIndices);

      const next: CrocodileGameState = {
        ...prev,
        phase: 'ready',
        turnNumber: prev.turnNumber + 1,
        explainerIndex: nextIndex,
        explainerId: nextId,
        currentWordIndex: nextWordIdx,
        timeLeft: TURN_DURATION,
        wordsGuessed: 0,
        wordsSkipped: 0,
        usedWordIndices: [...prev.usedWordIndices, nextWordIdx],
      };

      setGameState(next);
      gameStateRef.current = next;
      broadcast('croc:state', next);
    },
    [broadcast],
  );

  // ------------------------------------------------------------------
  // Host: explainer starts a ready turn
  // ------------------------------------------------------------------

  const startTurn = useCallback(() => {
    if (!isGameHost) return;

    const current = gameStateRef.current;
    if (!current || current.phase !== 'ready') return;

    const next: CrocodileGameState = {
      ...current,
      phase: 'explaining',
      timeLeft: TURN_DURATION,
    };

    setGameState(next);
    gameStateRef.current = next;
    broadcast('croc:state', next);
  }, [isGameHost, broadcast]);

  // ------------------------------------------------------------------
  // Host: explainer pressed "Угадали!" — award +1 to explainer, next word
  // ------------------------------------------------------------------

  const handleGuessed = useCallback(() => {
    if (!isGameHost || !gameState || gameState.phase !== 'explaining') return;

    const nextWordIdx = pickRandomWordIndex(gameState.usedWordIndices);
    const updated: CrocodileGameState = {
      ...gameState,
      currentWordIndex: nextWordIdx,
      wordsGuessed: gameState.wordsGuessed + 1,
      scores: {
        ...gameState.scores,
        [gameState.explainerId]: (gameState.scores[gameState.explainerId] ?? 0) + 1,
      },
      usedWordIndices: [...gameState.usedWordIndices, nextWordIdx],
    };

    setGameState(updated);
    gameStateRef.current = updated;
    broadcast('croc:state', updated);
  }, [isGameHost, gameState, broadcast]);

  // ------------------------------------------------------------------
  // Host: explainer pressed "Пропустить" — skip word, no points
  // ------------------------------------------------------------------

  const handleSkip = useCallback(() => {
    if (!isGameHost || !gameState || gameState.phase !== 'explaining') return;

    const nextWordIdx = pickRandomWordIndex(gameState.usedWordIndices);
    const updated: CrocodileGameState = {
      ...gameState,
      currentWordIndex: nextWordIdx,
      wordsSkipped: gameState.wordsSkipped + 1,
      usedWordIndices: [...gameState.usedWordIndices, nextWordIdx],
    };

    setGameState(updated);
    gameStateRef.current = updated;
    broadcast('croc:state', updated);
  }, [isGameHost, gameState, broadcast]);

  // ------------------------------------------------------------------
  // Explainer presses Guessed / Skip (emit to host if not host)
  // ------------------------------------------------------------------

  const emitAction = useCallback(
    (action: string) => {
      broadcast(action, {});
    },
    [broadcast],
  );

  // Non-host explainer actions -> host listens
  useEffect(() => {
    if (!isGameHost) return;
    const cleanup = on('game:action', (data: unknown) => {
      const { action } = data as {
        action: string;
        payload: Record<string, unknown>;
        from: string;
      };
      if (action === 'croc:guessed') handleGuessed();
      if (action === 'croc:skip') handleSkip();
      if (action === 'croc:start-turn') startTurn();
      if (action === 'croc:next-player' && gameState) {
        if (timerRef.current) clearInterval(timerRef.current);
        advanceToNextExplainer(gameState);
      }
    });
    return cleanup;
  }, [isGameHost, on, handleGuessed, handleSkip, startTurn, advanceToNextExplainer, gameState]);

  // ------------------------------------------------------------------
  // Host: end game manually
  // ------------------------------------------------------------------

  const endGame = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    emit('game:end', { code: roomId });
    router.push(user ? `/lobby/${roomId}` : `/join/${roomId}`);
  }, [emit, roomId, router, user]);

  // ------------------------------------------------------------------
  // Scores for GameLayout
  // ------------------------------------------------------------------

  const layoutScores = gameState
    ? Object.entries(gameState.scores).map(([id, score]) => ({
        name: players.find((p) => p.id === id)?.nickname ?? id,
        score,
      }))
    : [];

  const totalRounds = ROUNDS_PER_PLAYER;
  const playerCountForRound = gameState?.playersOrder.length || players.length || 1;
  const currentRound = gameState
    ? gameState.phase === 'finished'
      ? ROUNDS_PER_PLAYER
      : Math.min(
          ROUNDS_PER_PLAYER,
          Math.max(1, Math.floor((gameState.turnNumber - 1) / playerCountForRound) + 1),
        )
    : 0;
  const guessingPlayers = gameState
    ? players.filter((p) => p.id !== gameState.explainerId).slice(0, 5)
    : [];
  const formatTurnTime = (seconds: number) => {
    const safeSeconds = Math.max(0, seconds);
    const minutes = Math.floor(safeSeconds / 60);
    const rest = safeSeconds % 60;
    return `${minutes}:${rest.toString().padStart(2, '0')}`;
  };

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------

  return (
    <GameLayout
      title={locale === 'ru' ? 'Крокодил' : 'Crocodile'}
      icon={<CrocIcon name="croc" className="h-7 w-7" />}
      round={currentRound}
      totalRounds={totalRounds}
      scores={layoutScores}
      onEnd={isGameHost ? endGame : undefined}
      showScoreboard={false}
      phaseKey={`${gameState?.phase ?? 'waiting'}-${gameState?.turnNumber ?? 0}`}
      gradientClass="bg-gradient-crocodile"
    >
      {/* ---- WAITING / NOT STARTED ---- */}
      {(!gameState || gameState.phase === 'waiting') && (
        <div className="flex-1 flex flex-col items-center justify-center gap-6">
          <GlassCard className="w-full max-w-md p-6 text-center">
            <p
              className="text-xl font-semibold mb-2"
              style={{ color: 'var(--text-primary)' }}
            >
              {locale === 'ru' ? 'Крокодил' : 'Crocodile'}
            </p>
            <p
              className="text-sm mb-6"
              style={{ color: 'var(--text-primary)' }}
            >
              {locale === 'ru'
                ? 'Объясняйте слова, не называя их! У каждого будет 60 секунд. Очки получает тот, кто объясняет.'
                : 'Explain words without saying them! Each player gets 60 seconds. Points go to the explainer.'}
            </p>

            <div className="mb-4">
              <p
                className="text-sm font-medium mb-2"
                style={{ color: 'var(--text-secondary)' }}
              >
                {locale === 'ru' ? 'Игроки' : 'Players'} ({players.length})
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                {players.map((p) => (
                  <span key={p.id} className="glass-badge">
                    {p.nickname}
                  </span>
                ))}
              </div>
            </div>

            {isGameHost ? (
              <GlassButton
                variant="primary"
                size="lg"
                className="w-full"
                onClick={startGame}
                disabled={players.length < 2}
              >
                {locale === 'ru' ? 'Начать игру' : 'Start Game'}
              </GlassButton>
            ) : (
              <BreathingPlaceholder
                text={locale === 'ru' ? 'Ожидание хоста...' : 'Waiting for host...'}
                variant="breathing-text"
              />
            )}
          </GlassCard>
        </div>
      )}

      {/* ---- READY / EXPLAINING PHASE ---- */}
      {(gameState?.phase === 'ready' || gameState?.phase === 'explaining') && (
        <div className="flex-1 flex flex-col items-center gap-4 w-full">
          {/* Status bar */}
          <div className="w-full max-w-md">
            <div className="mb-2 flex items-center justify-between">
              <span className="font-mono text-xs font-bold uppercase tracking-[0.22em] text-white/65">
                {locale === 'ru' ? 'Раунд' : 'Round'} {currentRound} / {totalRounds}
              </span>
              <span
                className={`font-mono text-2xl font-black tabular-nums ${
                  gameState.timeLeft <= 10 ? 'text-red-200 animate-pulse' : 'text-white'
                }`}
              >
                {formatTurnTime(gameState.timeLeft)}
              </span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-white/[0.12] overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-1000 linear ${
                  gameState.timeLeft <= 10 ? 'animate-pulse' : ''
                }`}
                style={{
                  width: `${(gameState.timeLeft / TURN_DURATION) * 100}%`,
                  background: 'linear-gradient(90deg, #ef4444, #f87171)',
                  boxShadow: '0 0 12px #ef4444',
                }}
              />
            </div>
          </div>

          {/* Ready card */}
          {gameState.phase === 'ready' && isExplainer && (
            <div
              className="relative flex min-h-[320px] w-full max-w-md flex-1 flex-col items-center justify-center overflow-hidden rounded-[36px] px-6 py-7 text-center text-white"
              style={{
                background: 'radial-gradient(110% 70% at 50% -5%, rgba(255,255,255,.35), transparent 55%), linear-gradient(165deg, #ef4444 0%, #991b1b 100%)',
                boxShadow: '0 24px 60px -18px #ef4444cc',
              }}
            >
              <button
                type="button"
                className="min-h-[96px] rounded-[30px] border border-white/20 bg-white px-10 text-3xl font-black text-red-700 shadow-[0_18px_44px_rgba(0,0,0,.25)] transition active:scale-[0.98]"
                onClick={() => (isGameHost ? startTurn() : emitAction('croc:start-turn'))}
              >
                {locale === 'ru' ? 'НАЧАТЬ' : 'START'}
              </button>
              <p className="mt-5 text-base font-semibold text-white/80">
                {locale === 'ru' ? 'Нажми, когда готов показывать' : "Tap when you're ready"}
              </p>
            </div>
          )}

          {gameState.phase === 'ready' && !isExplainer && (
            <div
              className="flex min-h-[320px] w-full max-w-md flex-1 flex-col items-center justify-center rounded-[36px] px-8 py-10 text-center text-white"
              style={{
                background: 'radial-gradient(110% 70% at 50% -5%, rgba(255,255,255,.25), transparent 55%), linear-gradient(165deg, #ef4444 0%, #991b1b 100%)',
                boxShadow: '0 20px 50px -22px #ef4444cc',
              }}
            >
              <div className="mb-3 flex justify-center">
                <CrocIcon name="mic" className="h-14 w-14" />
              </div>
              <p
                className="text-2xl font-black"
                style={{ textShadow: '0 3px 14px rgba(0,0,0,.35)' }}
              >
                {locale === 'ru'
                  ? `${currentExplainer?.nickname ?? '...'} готовится начать…`
                  : `${currentExplainer?.nickname ?? '...'} is getting ready…`}
              </p>
            </div>
          )}

          {/* Word card — only visible to explainer */}
          {gameState.phase === 'explaining' && isExplainer && currentWord ? (
            <div
              className="relative flex min-h-[320px] w-full max-w-md flex-1 flex-col overflow-hidden rounded-[36px] px-6 py-7 text-white"
              style={{
                background: 'radial-gradient(110% 70% at 50% -5%, rgba(255,255,255,.35), transparent 55%), linear-gradient(165deg, #ef4444 0%, #991b1b 100%)',
                boxShadow: '0 24px 60px -18px #ef4444cc',
              }}
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold uppercase tracking-[0.22em] text-white/65">
                  {locale === 'ru' ? 'Слово' : 'Word'}
                </span>
                <CrocIcon name="croc" className="h-9 w-9" />
              </div>

              <div className="flex-1 min-h-0 py-8">
                <FitText
                  text={locale === 'ru' ? currentWord.ru : currentWord.en}
                  max={68}
                  min={22}
                  className="text-center font-black leading-[0.95]"
                  style={{
                    letterSpacing: '-1.5px',
                    textShadow: '0 3px 16px rgba(0,0,0,.35)',
                  }}
                />
              </div>

              <div>
                <p className="mb-2 font-mono text-xs font-bold uppercase tracking-[0.2em] text-white/60">
                  {locale === 'ru' ? 'Угадывают' : 'Guessing'}
                </p>
                <div className="flex flex-wrap gap-2">
                  {guessingPlayers.map((p) => (
                    <span
                      key={p.id}
                      className="inline-flex items-center gap-2 rounded-full bg-black/20 px-2.5 py-1.5 text-sm font-semibold text-white"
                    >
                      <PlayerAvatar nickname={p.nickname} sizePx={26} />
                      <span className="max-w-[120px] truncate">{p.nickname}</span>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ) : gameState.phase === 'explaining' ? (
            /* Non-explainer: just listen and guess out loud */
            <>
              <div
                className="flex min-h-[320px] w-full max-w-md flex-1 flex-col items-center justify-center rounded-[36px] px-8 py-10 text-center text-white"
                style={{
                  background: 'radial-gradient(110% 70% at 50% -5%, rgba(255,255,255,.25), transparent 55%), linear-gradient(165deg, #ef4444 0%, #991b1b 100%)',
                  boxShadow: '0 20px 50px -22px #ef4444cc',
                }}
              >
                <div className="mb-3 flex justify-center">
                  <CrocIcon name="talk" className="h-14 w-14" />
                </div>
                <p
                  className="text-2xl font-black"
                  style={{ textShadow: '0 3px 14px rgba(0,0,0,.35)' }}
                >
                  {locale === 'ru' ? 'Угадывайте вслух!' : 'Guess out loud!'}
                </p>
                <p className="mt-3 text-sm font-medium text-white/75">
                  {locale === 'ru'
                    ? `${currentExplainer?.nickname ?? '...'} объясняет слово`
                    : `${currentExplainer?.nickname ?? '...'} is explaining`}
                </p>
              </div>
              <div aria-hidden className="w-full max-w-md h-[76px] opacity-0 pointer-events-none select-none" />
            </>
          ) : null}

          {/* Action buttons — only for explainer */}
          {gameState.phase === 'explaining' && isExplainer && (
            <div className="w-full max-w-md space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  className="h-[76px] rounded-[24px] border border-white/[0.12] bg-white/[0.12] px-3 text-base font-black text-white shadow-[0_12px_30px_rgba(0,0,0,.2)] backdrop-blur-md transition active:scale-[0.98]"
                  onClick={() =>
                    isGameHost ? handleSkip() : emitAction('croc:skip')
                  }
                >
                  <span className="mb-1 block text-2xl leading-none">×</span>
                  {locale === 'ru' ? 'Пропустить' : 'Skip'}
                </button>
                <button
                  type="button"
                  className="h-[76px] rounded-[24px] px-3 text-base font-black shadow-[0_16px_34px_rgba(48,209,88,.28)] transition active:scale-[0.98]"
                  style={{
                    background: 'linear-gradient(180deg, #4bed7a, #30d158)',
                    color: '#05210f',
                  }}
                  onClick={() =>
                    isGameHost ? handleGuessed() : emitAction('croc:guessed')
                  }
                >
                  <span className="mb-1 block text-2xl leading-none">✓</span>
                  {locale === 'ru' ? 'Угадали' : 'Guessed'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ---- FINISHED ---- */}
      {gameState?.phase === 'finished' && (
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          {!isGameHost && (
            <GlassCard className="w-full max-w-md p-6 text-center">
              <div className="mb-3 flex justify-center">
                <CrocIcon name="trophy" className="h-12 w-12" />
              </div>
              <p
                className="text-lg font-semibold mb-1"
                style={{ color: 'var(--text-primary)' }}
              >
                {locale === 'ru' ? 'Игра окончена!' : 'Game over!'}
              </p>
              <BreathingPlaceholder
                text={locale === 'ru' ? 'Ожидание хоста...' : 'Waiting for host...'}
                variant="breathing-text"
              />
            </GlassCard>
          )}
          {isGameHost && (
            <GlassButton
              variant="primary"
              size="lg"
              onClick={startGame}
            >
              {locale === 'ru' ? 'Играть снова' : 'Play Again'}
            </GlassButton>
          )}
        </div>
      )}
    </GameLayout>
  );
}
