'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { GameLayout } from '@/components/games/GameLayout';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { useSocket } from '@/lib/use-socket';
import { useAuth } from '@/lib/auth-context';
import { useTranslation } from '@/lib/i18n';
import { CROCODILE_WORDS } from '@/lib/game-data';
import { Player } from '@/types/room';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CrocodileGameState {
  phase: 'waiting' | 'explaining' | 'finished';
  explainerIndex: number;
  explainerId: string;
  currentWordIndex: number;
  timeLeft: number;
  scores: Record<string, number>;
  wordsGuessed: number;
  playersOrder: string[];          // player ids in turn order
  completedExplainers: string[];   // ids of players who already explained
  usedWordIndices: number[];       // track used words to avoid repeats
}

const TURN_DURATION = 60; // seconds

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function pickRandomWordIndex(usedIndices: number[]): number {
  const available = CROCODILE_WORDS.map((_, i) => i).filter(
    (i) => !usedIndices.includes(i),
  );
  if (available.length === 0) {
    // All words used -- reset pool
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
  const router = useRouter();
  const { emit, on } = useSocket();
  const { user } = useAuth();
  const { t, locale } = useTranslation();

  // Room players (from room:state)
  const [players, setPlayers] = useState<Player[]>([]);
  const [hostId, setHostId] = useState<string>('');

  // Game state (host is source of truth, broadcasts to all)
  const [gameState, setGameState] = useState<CrocodileGameState | null>(null);

  // Timer ref for host-side countdown
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isHost = user?.id === hostId;
  const myId = user?.id ?? '';

  // ------------------------------------------------------------------
  // Derived helpers
  // ------------------------------------------------------------------

  const currentExplainer = players.find(
    (p) => p.id === gameState?.explainerId,
  );
  const isExplainer = myId === gameState?.explainerId;
  const currentWord =
    gameState && gameState.currentWordIndex >= 0
      ? CROCODILE_WORDS[gameState.currentWordIndex]
      : null;

  // ------------------------------------------------------------------
  // Listen for room:state to get players list
  // ------------------------------------------------------------------

  useEffect(() => {
    const cleanup = on('room:state', (data: unknown) => {
      const d = data as { players: Player[]; hostId: string };
      if (d.players) setPlayers(d.players);
      if (d.hostId) setHostId(d.hostId);
    });
    emit('room:get-state', { code: roomId });
    return cleanup;
  }, [on, emit, roomId]);

  // ------------------------------------------------------------------
  // Broadcast helper (host -> all via game:action)
  // ------------------------------------------------------------------

  const broadcast = useCallback(
    (action: string, payload: unknown) => {
      emit('game:action', { code: roomId, action, payload });
    },
    [emit, roomId],
  );

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
            break;
          case 'croc:tick':
            setGameState((prev) =>
              prev
                ? { ...prev, timeLeft: (payload as unknown as { timeLeft: number }).timeLeft }
                : prev,
            );
            break;
        }
      },
    );
    const unsub2 = on('game:ended', () => router.push(`/lobby/${roomId}`));
    return () => { unsub1(); unsub2(); };
  }, [on, router, roomId]);

  // ------------------------------------------------------------------
  // Host: timer management
  // ------------------------------------------------------------------

  useEffect(() => {
    if (!isHost || !gameState || gameState.phase !== 'explaining') return;

    // Clear any existing timer
    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      setGameState((prev) => {
        if (!prev || prev.phase !== 'explaining') return prev;
        const newTime = prev.timeLeft - 1;

        // Broadcast tick to keep others in sync
        broadcast('croc:tick', { timeLeft: Math.max(newTime, 0) });

        if (newTime <= 0) {
          // Time is up -- advance to next explainer
          if (timerRef.current) clearInterval(timerRef.current);
          // Use setTimeout to avoid setState-in-setState
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
  }, [isHost, gameState?.phase, gameState?.explainerId]);

  // ------------------------------------------------------------------
  // Host: start game
  // ------------------------------------------------------------------

  const startGame = useCallback(() => {
    if (!isHost || players.length < 2) return;

    const order = shuffleArray(players.map((p) => p.id));
    const firstWordIdx = pickRandomWordIndex([]);

    const initial: CrocodileGameState = {
      phase: 'explaining',
      explainerIndex: 0,
      explainerId: order[0],
      currentWordIndex: firstWordIdx,
      timeLeft: TURN_DURATION,
      scores: Object.fromEntries(players.map((p) => [p.id, 0])),
      wordsGuessed: 0,
      playersOrder: order,
      completedExplainers: [],
      usedWordIndices: [firstWordIdx],
    };

    setGameState(initial);
    broadcast('croc:state', initial);
  }, [isHost, players, broadcast]);

  // ------------------------------------------------------------------
  // Host: advance to next explainer
  // ------------------------------------------------------------------

  const advanceToNextExplainer = useCallback(
    (prev: CrocodileGameState) => {
      const newCompleted = [...prev.completedExplainers, prev.explainerId];

      // Check if all players have explained
      if (newCompleted.length >= prev.playersOrder.length) {
        const finished: CrocodileGameState = {
          ...prev,
          phase: 'finished',
          completedExplainers: newCompleted,
          timeLeft: 0,
        };
        setGameState(finished);
        broadcast('croc:state', finished);
        return;
      }

      const nextIndex = prev.explainerIndex + 1;
      const nextId = prev.playersOrder[nextIndex];
      const nextWordIdx = pickRandomWordIndex(prev.usedWordIndices);

      const next: CrocodileGameState = {
        ...prev,
        phase: 'explaining',
        explainerIndex: nextIndex,
        explainerId: nextId,
        currentWordIndex: nextWordIdx,
        timeLeft: TURN_DURATION,
        wordsGuessed: 0,
        completedExplainers: newCompleted,
        usedWordIndices: [...prev.usedWordIndices, nextWordIdx],
      };

      setGameState(next);
      broadcast('croc:state', next);
    },
    [broadcast],
  );

  // ------------------------------------------------------------------
  // Host: word guessed (+1 point, next word)
  // ------------------------------------------------------------------

  const handleGuessed = useCallback(() => {
    if (!isHost || !gameState || gameState.phase !== 'explaining') return;

    const nextWordIdx = pickRandomWordIndex(gameState.usedWordIndices);
    const updated: CrocodileGameState = {
      ...gameState,
      currentWordIndex: nextWordIdx,
      wordsGuessed: gameState.wordsGuessed + 1,
      scores: {
        ...gameState.scores,
        [gameState.explainerId]:
          (gameState.scores[gameState.explainerId] ?? 0) + 1,
      },
      usedWordIndices: [...gameState.usedWordIndices, nextWordIdx],
    };

    setGameState(updated);
    broadcast('croc:state', updated);
  }, [isHost, gameState, broadcast]);

  // ------------------------------------------------------------------
  // Host: skip word (no penalty, just next word)
  // ------------------------------------------------------------------

  const handleSkip = useCallback(() => {
    if (!isHost || !gameState || gameState.phase !== 'explaining') return;

    const nextWordIdx = pickRandomWordIndex(gameState.usedWordIndices);
    const updated: CrocodileGameState = {
      ...gameState,
      currentWordIndex: nextWordIdx,
      usedWordIndices: [...gameState.usedWordIndices, nextWordIdx],
    };

    setGameState(updated);
    broadcast('croc:state', updated);
  }, [isHost, gameState, broadcast]);

  // ------------------------------------------------------------------
  // Explainer presses Guessed / Skip (emit to host)
  // ------------------------------------------------------------------

  const emitAction = useCallback(
    (action: string) => {
      emit('game:action', { code: roomId, action, payload: {} });
    },
    [emit, roomId],
  );

  // Non-host explainer actions -> host listens
  useEffect(() => {
    if (!isHost) return;
    const cleanup = on('game:action', (data: unknown) => {
      const { action } = data as { action: string; payload: unknown; from: string };
      if (action === 'croc:guessed') handleGuessed();
      if (action === 'croc:skip') handleSkip();
      if (action === 'croc:next-player' && gameState) {
        if (timerRef.current) clearInterval(timerRef.current);
        advanceToNextExplainer(gameState);
      }
    });
    return cleanup;
  }, [isHost, on, handleGuessed, handleSkip, advanceToNextExplainer, gameState]);

  // ------------------------------------------------------------------
  // Host: end game manually
  // ------------------------------------------------------------------

  const endGame = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    emit('game:end', { code: roomId });
  }, [emit, roomId]);

  // ------------------------------------------------------------------
  // Scores for GameLayout
  // ------------------------------------------------------------------

  const layoutScores = gameState
    ? Object.entries(gameState.scores).map(([id, score]) => ({
        name: players.find((p) => p.id === id)?.nickname ?? id,
        score,
      }))
    : [];

  const currentRound = gameState
    ? gameState.completedExplainers.length + 1
    : 0;
  const totalRounds = gameState ? gameState.playersOrder.length : players.length;

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------

  return (
    <GameLayout
      title={locale === 'ru' ? 'Крокодил' : 'Crocodile'}
      icon="🐊"
      round={currentRound}
      totalRounds={totalRounds}
      scores={layoutScores}
      onEnd={isHost ? endGame : undefined}
      showScoreboard={gameState?.phase === 'finished'}
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
              style={{ color: 'var(--text-secondary)' }}
            >
              {locale === 'ru'
                ? 'Объясняйте слова, не называя их! У каждого будет 60 секунд.'
                : 'Explain words without saying them! Each player gets 60 seconds.'}
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

            {isHost ? (
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
              <p
                className="text-sm italic"
                style={{ color: 'var(--text-secondary)' }}
              >
                {locale === 'ru'
                  ? 'Ожидание хоста...'
                  : 'Waiting for host...'}
              </p>
            )}
          </GlassCard>
        </div>
      )}

      {/* ---- EXPLAINING PHASE ---- */}
      {gameState?.phase === 'explaining' && (
        <div className="flex-1 flex flex-col items-center gap-4">
          {/* Timer */}
          <div className="w-full max-w-md">
            <div className="text-center mb-2">
              <span
                className={`text-5xl font-bold tabular-nums ${
                  gameState.timeLeft <= 10
                    ? 'text-red-400 animate-pulse'
                    : 'text-white'
                }`}
              >
                {gameState.timeLeft}
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-1000 linear"
                style={{
                  width: `${(gameState.timeLeft / TURN_DURATION) * 100}%`,
                  background: gameState.timeLeft <= 10 ? 'linear-gradient(90deg, #f87171, #ef4444)' : 'var(--accent-gradient)',
                }}
              />
            </div>
          </div>

          {/* Explainer name */}
          <GlassCard className="w-full max-w-md p-4 text-center">
            <p
              className="text-lg font-bold"
              style={{ color: 'var(--text-primary)' }}
            >
              {currentExplainer?.nickname ?? '...'}
            </p>
            <p
              className="text-sm"
              style={{ color: 'var(--text-secondary)' }}
            >
              {locale === 'ru'
                ? `Угадано слов: ${gameState.wordsGuessed}`
                : `Words guessed: ${gameState.wordsGuessed}`}
            </p>
          </GlassCard>

          {/* Word card -- only visible to explainer */}
          {isExplainer && currentWord ? (
            <GlassCard className="w-full max-w-md p-8 text-center">
              <p
                className="text-sm uppercase tracking-wider mb-2"
                style={{ color: 'var(--text-secondary)' }}
              >
                {locale === 'ru' ? 'Ваше слово' : 'Your word'}
              </p>
              <p
                className="text-3xl font-extrabold"
                style={{ color: 'var(--text-primary)' }}
              >
                {locale === 'ru' ? currentWord.ru : currentWord.en}
              </p>
            </GlassCard>
          ) : (
            <GlassCard className="w-full max-w-md p-8 text-center">
              <p
                className="text-lg"
                style={{ color: 'var(--text-secondary)' }}
              >
                {isExplainer
                  ? ''
                  : locale === 'ru'
                  ? 'Угадайте слово, которое объясняет игрок!'
                  : 'Guess the word being explained!'}
              </p>
              <p className="text-5xl mt-2">🤔</p>
            </GlassCard>
          )}

          {/* Action buttons */}
          {isExplainer && (
            <div className="w-full max-w-md flex gap-3">
              <GlassButton
                variant="primary"
                size="lg"
                className="flex-1"
                onClick={() =>
                  isHost ? handleGuessed() : emitAction('croc:guessed')
                }
              >
                {locale === 'ru' ? 'Угадали! ✓' : 'Guessed! ✓'}
              </GlassButton>
              <GlassButton
                size="lg"
                className="flex-1"
                onClick={() =>
                  isHost ? handleSkip() : emitAction('croc:skip')
                }
              >
                {locale === 'ru' ? 'Пропустить →' : 'Skip →'}
              </GlassButton>
            </div>
          )}

          {/* Host can force advance to next player */}
          {isHost && !isExplainer && (
            <div className="w-full max-w-md">
              <GlassButton
                size="md"
                className="w-full"
                onClick={() => {
                  if (timerRef.current) clearInterval(timerRef.current);
                  advanceToNextExplainer(gameState);
                }}
              >
                {locale === 'ru' ? 'Следующий игрок →' : 'Next Player →'}
              </GlassButton>
            </div>
          )}

          {/* Scoreboard summary */}
          <GlassCard className="w-full max-w-md p-4">
            <p
              className="text-sm font-semibold mb-2"
              style={{ color: 'var(--text-secondary)' }}
            >
              {locale === 'ru' ? 'Счёт' : 'Scores'}
            </p>
            <div className="space-y-1">
              {gameState.playersOrder.map((id) => {
                const player = players.find((p) => p.id === id);
                const done = gameState.completedExplainers.includes(id);
                return (
                  <div
                    key={id}
                    className={`flex items-center justify-between px-3 py-1.5 rounded-lg ${
                      id === gameState.explainerId
                        ? 'bg-white/10 ring-1 ring-purple-400/40'
                        : ''
                    }`}
                  >
                    <span
                      className="text-sm"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {player?.nickname ?? id}
                      {id === gameState.explainerId && ' 🎤'}
                      {done && ' ✓'}
                    </span>
                    <span className="glass-badge text-xs">
                      {gameState.scores[id] ?? 0}
                    </span>
                  </div>
                );
              })}
            </div>
          </GlassCard>
        </div>
      )}

      {/* ---- FINISHED ---- */}
      {gameState?.phase === 'finished' && (
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          {/* GameLayout showScoreboard handles the overlay, but we add a restart option */}
          {isHost && (
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
