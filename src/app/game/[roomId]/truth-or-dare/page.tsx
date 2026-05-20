'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { GameLayout } from '@/components/games/GameLayout';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { useSocket } from '@/lib/use-socket';
import { useAuth } from '@/lib/auth-context';
import { useTranslation } from '@/lib/i18n';
import { TRUTHS, DARES, Difficulty } from '@/lib/game-data';
import { Player } from '@/types/room';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TodGameState {
  phase: 'choosing' | 'challenge' | 'finished';
  currentPlayerIndex: number;
  currentPlayerId: string;
  choice: 'truth' | 'dare' | null;
  currentChallenge: { ru: string; en: string } | null;
  difficulty: Difficulty;
  scores: Record<string, number>;
  round: number;
  playersOrder: string[];
  usedTruthIndices: number[];
  usedDareIndices: number[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function pickRandom<T>(
  items: T[],
  filterFn: (item: T, index: number) => boolean,
  usedIndices: number[],
): { item: T; index: number } | null {
  const candidates = items
    .map((item, index) => ({ item, index }))
    .filter(({ item, index }) => filterFn(item, index) && !usedIndices.includes(index));

  if (candidates.length === 0) {
    // All used up for this difficulty -- allow reuse
    const fallback = items
      .map((item, index) => ({ item, index }))
      .filter(({ item, index }) => filterFn(item, index));
    if (fallback.length === 0) return null;
    return fallback[Math.floor(Math.random() * fallback.length)];
  }
  return candidates[Math.floor(Math.random() * candidates.length)];
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function TruthOrDarePage() {
  const { roomId } = useParams<{ roomId: string }>();
  const { emit, on } = useSocket();
  const { user } = useAuth();
  const { locale } = useTranslation();

  // Room players
  const [players, setPlayers] = useState<Player[]>([]);
  const [hostId, setHostId] = useState<string>('');

  // Game state
  const [gameState, setGameState] = useState<TodGameState | null>(null);

  const isHost = user?.id === hostId;
  const myId = user?.id ?? '';

  // ------------------------------------------------------------------
  // Derived
  // ------------------------------------------------------------------

  const currentPlayer = players.find(
    (p) => p.id === gameState?.currentPlayerId,
  );
  const isMyTurn = myId === gameState?.currentPlayerId;

  // ------------------------------------------------------------------
  // Listen for room:state
  // ------------------------------------------------------------------

  useEffect(() => {
    const cleanup = on('room:state', (data: unknown) => {
      const d = data as { players: Player[]; hostId: string };
      if (d.players) setPlayers(d.players);
      if (d.hostId) setHostId(d.hostId);
    });
    return cleanup;
  }, [on]);

  // ------------------------------------------------------------------
  // Broadcast helper
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
    const cleanup = on('game:action', (data: unknown) => {
      const { action, payload } = data as {
        action: string;
        payload: TodGameState;
        from: string;
      };

      if (action === 'tod:state') {
        setGameState(payload);
      }
    });
    return cleanup;
  }, [on]);

  // ------------------------------------------------------------------
  // Host: start game
  // ------------------------------------------------------------------

  const startGame = useCallback(() => {
    if (!isHost || players.length < 2) return;

    const order = players.map((p) => p.id);
    const initial: TodGameState = {
      phase: 'choosing',
      currentPlayerIndex: 0,
      currentPlayerId: order[0],
      choice: null,
      currentChallenge: null,
      difficulty: 'medium',
      scores: Object.fromEntries(players.map((p) => [p.id, 0])),
      round: 1,
      playersOrder: order,
      usedTruthIndices: [],
      usedDareIndices: [],
    };

    setGameState(initial);
    broadcast('tod:state', initial);
  }, [isHost, players, broadcast]);

  // ------------------------------------------------------------------
  // Host: set difficulty
  // ------------------------------------------------------------------

  const setDifficulty = useCallback(
    (diff: Difficulty) => {
      if (!isHost || !gameState) return;
      const updated = { ...gameState, difficulty: diff };
      setGameState(updated);
      broadcast('tod:state', updated);
    },
    [isHost, gameState, broadcast],
  );

  // ------------------------------------------------------------------
  // Choose truth or dare
  // ------------------------------------------------------------------

  const handleChoice = useCallback(
    (choice: 'truth' | 'dare') => {
      if (!gameState) return;

      // If player is host, apply directly; otherwise emit to host
      if (isHost) {
        applyChoice(choice, gameState);
      } else {
        emit('game:action', {
          code: roomId,
          action: 'tod:choose',
          payload: { choice },
        });
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isHost, gameState, emit, roomId],
  );

  const applyChoice = useCallback(
    (choice: 'truth' | 'dare', state: TodGameState) => {
      const pool = choice === 'truth' ? TRUTHS : DARES;
      const usedIndices =
        choice === 'truth' ? state.usedTruthIndices : state.usedDareIndices;

      const picked = pickRandom(
        pool,
        (item) => item.difficulty === state.difficulty,
        usedIndices,
      );

      if (!picked) return;

      const newUsedTruths =
        choice === 'truth'
          ? [...state.usedTruthIndices, picked.index]
          : state.usedTruthIndices;
      const newUsedDares =
        choice === 'dare'
          ? [...state.usedDareIndices, picked.index]
          : state.usedDareIndices;

      const updated: TodGameState = {
        ...state,
        phase: 'challenge',
        choice,
        currentChallenge: { ru: picked.item.ru, en: picked.item.en },
        usedTruthIndices: newUsedTruths,
        usedDareIndices: newUsedDares,
      };

      setGameState(updated);
      broadcast('tod:state', updated);
    },
    [broadcast],
  );

  // ------------------------------------------------------------------
  // Done / Skip
  // ------------------------------------------------------------------

  const handleDone = useCallback(() => {
    if (!gameState) return;
    if (isHost) {
      applyDone(gameState);
    } else {
      emit('game:action', {
        code: roomId,
        action: 'tod:done',
        payload: {},
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHost, gameState, emit, roomId]);

  const applyDone = useCallback(
    (state: TodGameState) => {
      const points = state.choice === 'dare' ? 2 : 1;
      const newScores = {
        ...state.scores,
        [state.currentPlayerId]:
          (state.scores[state.currentPlayerId] ?? 0) + points,
      };
      advancePlayer({ ...state, scores: newScores });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const handleSkip = useCallback(() => {
    if (!gameState) return;
    if (isHost) {
      applySkip(gameState);
    } else {
      emit('game:action', {
        code: roomId,
        action: 'tod:skip',
        payload: {},
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHost, gameState, emit, roomId]);

  const applySkip = useCallback(
    (state: TodGameState) => {
      // Small penalty: -1 for skipping
      const newScores = {
        ...state.scores,
        [state.currentPlayerId]: Math.max(
          (state.scores[state.currentPlayerId] ?? 0) - 1,
          0,
        ),
      };
      advancePlayer({ ...state, scores: newScores });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  // ------------------------------------------------------------------
  // Advance to next player
  // ------------------------------------------------------------------

  const advancePlayer = useCallback(
    (state: TodGameState) => {
      const nextIndex =
        (state.currentPlayerIndex + 1) % state.playersOrder.length;
      const isNewRound = nextIndex === 0;

      const next: TodGameState = {
        ...state,
        phase: 'choosing',
        currentPlayerIndex: nextIndex,
        currentPlayerId: state.playersOrder[nextIndex],
        choice: null,
        currentChallenge: null,
        round: isNewRound ? state.round + 1 : state.round,
      };

      setGameState(next);
      broadcast('tod:state', next);
    },
    [broadcast],
  );

  // ------------------------------------------------------------------
  // Host listens for non-host actions
  // ------------------------------------------------------------------

  useEffect(() => {
    if (!isHost) return;
    const cleanup = on('game:action', (data: unknown) => {
      const { action, payload } = data as {
        action: string;
        payload: { choice?: 'truth' | 'dare' };
        from: string;
      };

      setGameState((prev) => {
        if (!prev) return prev;

        switch (action) {
          case 'tod:choose':
            if (payload.choice) {
              // We need to apply asynchronously since applyChoice broadcasts
              setTimeout(() => applyChoice(payload.choice!, prev), 0);
            }
            break;
          case 'tod:done':
            setTimeout(() => applyDone(prev), 0);
            break;
          case 'tod:skip':
            setTimeout(() => applySkip(prev), 0);
            break;
        }
        return prev;
      });
    });
    return cleanup;
  }, [isHost, on, applyChoice, applyDone, applySkip]);

  // ------------------------------------------------------------------
  // Host: end game
  // ------------------------------------------------------------------

  const endGame = useCallback(() => {
    if (!gameState) return;
    const finished: TodGameState = { ...gameState, phase: 'finished' };
    setGameState(finished);
    broadcast('tod:state', finished);
  }, [gameState, broadcast]);

  // ------------------------------------------------------------------
  // Scores for GameLayout
  // ------------------------------------------------------------------

  const layoutScores = gameState
    ? Object.entries(gameState.scores).map(([id, score]) => ({
        name: players.find((p) => p.id === id)?.nickname ?? id,
        score,
      }))
    : [];

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------

  return (
    <GameLayout
      title={locale === 'ru' ? 'Правда или Действие' : 'Truth or Dare'}
      icon="🎭"
      round={gameState?.round}
      totalRounds={undefined}
      scores={layoutScores}
      onEnd={isHost ? endGame : undefined}
      showScoreboard={gameState?.phase === 'finished'}
      phaseKey={gameState?.phase ?? 'choosing'}
    >
      {/* ---- NOT STARTED ---- */}
      {!gameState && (
        <div className="flex-1 flex flex-col items-center justify-center gap-6">
          <GlassCard className="w-full max-w-md p-6 text-center">
            <p
              className="text-xl font-semibold mb-2"
              style={{ color: 'var(--text-primary)' }}
            >
              {locale === 'ru' ? 'Правда или Действие' : 'Truth or Dare'}
            </p>
            <p
              className="text-sm mb-6"
              style={{ color: 'var(--text-secondary)' }}
            >
              {locale === 'ru'
                ? 'Выбирайте правду или действие и выполняйте задания. Правда = 1 очко, Действие = 2 очка.'
                : 'Choose truth or dare and complete challenges. Truth = 1 point, Dare = 2 points.'}
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

      {/* ---- CHOOSING PHASE ---- */}
      {gameState?.phase === 'choosing' && (
        <div className="flex-1 flex flex-col items-center gap-4">
          {/* Current player banner */}
          <GlassCard className="w-full max-w-md p-6 text-center">
            <p
              className="text-sm uppercase tracking-wider mb-1"
              style={{ color: 'var(--text-secondary)' }}
            >
              {locale === 'ru' ? 'Сейчас ходит' : 'Current turn'}
            </p>
            <p
              className="text-2xl font-bold"
              style={{ color: 'var(--text-primary)' }}
            >
              {currentPlayer?.nickname ?? '...'}
            </p>
            {isMyTurn && (
              <p
                className="text-sm mt-1"
                style={{ color: 'var(--accent)' }}
              >
                {locale === 'ru' ? 'Это ваш ход!' : "It's your turn!"}
              </p>
            )}
          </GlassCard>

          {/* Difficulty selector (host only) */}
          {isHost && (
            <GlassCard className="w-full max-w-md p-4">
              <p
                className="text-sm font-medium mb-2 text-center"
                style={{ color: 'var(--text-secondary)' }}
              >
                {locale === 'ru' ? 'Сложность' : 'Difficulty'}
              </p>
              <div className="flex gap-2">
                {(['easy', 'medium', 'hard'] as Difficulty[]).map((diff) => (
                  <GlassButton
                    key={diff}
                    size="sm"
                    variant={
                      gameState.difficulty === diff ? 'primary' : 'default'
                    }
                    className="flex-1"
                    onClick={() => setDifficulty(diff)}
                  >
                    {diff === 'easy'
                      ? locale === 'ru'
                        ? 'Легко'
                        : 'Easy'
                      : diff === 'medium'
                      ? locale === 'ru'
                        ? 'Средне'
                        : 'Medium'
                      : locale === 'ru'
                      ? 'Сложно'
                      : 'Hard'}
                  </GlassButton>
                ))}
              </div>
            </GlassCard>
          )}

          {/* Truth / Dare buttons (only active player can press) */}
          {isMyTurn ? (
            <div className="w-full max-w-md flex gap-4">
              <GlassCard
                hover
                className="flex-1 p-8 text-center cursor-pointer"
                onClick={() => handleChoice('truth')}
              >
                <p className="text-4xl mb-2">💬</p>
                <p
                  className="text-lg font-bold"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {locale === 'ru' ? 'Правда' : 'Truth'}
                </p>
                <p
                  className="text-xs mt-1"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  +1 {locale === 'ru' ? 'очко' : 'point'}
                </p>
              </GlassCard>

              <GlassCard
                hover
                className="flex-1 p-8 text-center cursor-pointer"
                onClick={() => handleChoice('dare')}
              >
                <p className="text-4xl mb-2">🔥</p>
                <p
                  className="text-lg font-bold"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {locale === 'ru' ? 'Действие' : 'Dare'}
                </p>
                <p
                  className="text-xs mt-1"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  +2 {locale === 'ru' ? 'очка' : 'points'}
                </p>
              </GlassCard>
            </div>
          ) : (
            <GlassCard className="w-full max-w-md p-6 text-center">
              <p
                className="text-lg"
                style={{ color: 'var(--text-secondary)' }}
              >
                {locale === 'ru'
                  ? `${currentPlayer?.nickname ?? '...'} выбирает...`
                  : `${currentPlayer?.nickname ?? '...'} is choosing...`}
              </p>
            </GlassCard>
          )}

          {/* Scores */}
          <ScoreList
            gameState={gameState}
            players={players}
            locale={locale}
          />
        </div>
      )}

      {/* ---- CHALLENGE PHASE ---- */}
      {gameState?.phase === 'challenge' && (
        <div className="flex-1 flex flex-col items-center gap-4">
          {/* Choice badge */}
          <div className="flex items-center gap-2">
            <span className="glass-badge text-base px-4 py-1.5">
              {gameState.choice === 'truth'
                ? locale === 'ru'
                  ? '💬 Правда'
                  : '💬 Truth'
                : locale === 'ru'
                ? '🔥 Действие'
                : '🔥 Dare'}
            </span>
            <span className="glass-badge text-sm">
              {currentPlayer?.nickname}
            </span>
          </div>

          {/* Challenge card */}
          <GlassCard className="w-full max-w-md p-8 text-center">
            <p
              className="text-xl font-semibold leading-relaxed"
              style={{ color: 'var(--text-primary)' }}
            >
              {gameState.currentChallenge
                ? locale === 'ru'
                  ? gameState.currentChallenge.ru
                  : gameState.currentChallenge.en
                : '...'}
            </p>
          </GlassCard>

          {/* Done / Skip buttons (current player or host) */}
          {(isMyTurn || isHost) && (
            <div className="w-full max-w-md flex gap-3">
              <GlassButton
                variant="primary"
                size="lg"
                className="flex-1"
                onClick={handleDone}
              >
                {locale === 'ru' ? 'Выполнено ✓' : 'Done ✓'}
              </GlassButton>
              <GlassButton
                size="lg"
                className="flex-1"
                onClick={handleSkip}
              >
                {locale === 'ru' ? 'Пропустить' : 'Skip'}
                <span className="text-xs ml-1 opacity-60">(-1)</span>
              </GlassButton>
            </div>
          )}

          {/* Waiting notice for other players */}
          {!isMyTurn && !isHost && (
            <p
              className="text-sm text-center"
              style={{ color: 'var(--text-secondary)' }}
            >
              {locale === 'ru'
                ? `Ждём, пока ${currentPlayer?.nickname} выполнит задание...`
                : `Waiting for ${currentPlayer?.nickname} to complete the challenge...`}
            </p>
          )}

          {/* Scores */}
          <ScoreList
            gameState={gameState}
            players={players}
            locale={locale}
          />
        </div>
      )}

      {/* ---- FINISHED ---- */}
      {gameState?.phase === 'finished' && (
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
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

// ---------------------------------------------------------------------------
// Score list sub-component
// ---------------------------------------------------------------------------

function ScoreList({
  gameState,
  players,
  locale,
}: {
  gameState: TodGameState;
  players: Player[];
  locale: string;
}) {
  return (
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
          return (
            <div
              key={id}
              className={`flex items-center justify-between px-3 py-1.5 rounded-lg ${
                id === gameState.currentPlayerId
                  ? 'bg-white/10 ring-1 ring-purple-400/40'
                  : ''
              }`}
            >
              <span
                className="text-sm"
                style={{ color: 'var(--text-primary)' }}
              >
                {player?.nickname ?? id}
                {id === gameState.currentPlayerId && ' 👈'}
              </span>
              <span className="glass-badge text-xs">
                {gameState.scores[id] ?? 0}
              </span>
            </div>
          );
        })}
      </div>
    </GlassCard>
  );
}
