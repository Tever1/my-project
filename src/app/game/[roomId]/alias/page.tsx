'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { GameLayout } from '@/components/games/GameLayout';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { useSocket } from '@/lib/use-socket';
import { useAuth } from '@/lib/auth-context';
import { useTranslation } from '@/lib/i18n';
import { ALIAS_WORDS } from '@/lib/game-data';
import { Player } from '@/types/room';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Team {
  id: string;          // 'team-1' | 'team-2'
  name: string;
  playerIds: string[];
  score: number;
}

interface AliasGameState {
  phase: 'teamSetup' | 'waiting' | 'explaining' | 'turnResult' | 'finished';
  teams: Team[];
  activeTeamIndex: number;        // which team is playing
  explainerIndex: number;         // index inside team's player list
  currentWordIndex: number;
  timeLeft: number;
  wordsGuessed: number;           // +1 per guessed word this turn
  wordsSkipped: number;           // +1 per skip this turn
  round: number;
  totalRounds: number;
  usedWordIndices: number[];
  turnHistory: { word: { ru: string; en: string }; guessed: boolean }[];
}

const TURN_DURATION = 60;
const DEFAULT_ROUNDS = 4; // each team plays this many turns

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function pickRandomWordIndex(usedIndices: number[]): number {
  const available = ALIAS_WORDS.map((_, i) => i).filter(
    (i) => !usedIndices.includes(i),
  );
  if (available.length === 0) {
    return Math.floor(Math.random() * ALIAS_WORDS.length);
  }
  return available[Math.floor(Math.random() * available.length)];
}

function splitIntoTeams(playerIds: string[]): [string[], string[]] {
  const shuffled = [...playerIds].sort(() => Math.random() - 0.5);
  const mid = Math.ceil(shuffled.length / 2);
  return [shuffled.slice(0, mid), shuffled.slice(mid)];
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AliasPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const router = useRouter();
  const { emit, on } = useSocket();
  const { user } = useAuth();
  const { locale } = useTranslation();

  const [players, setPlayers] = useState<Player[]>([]);
  const [hostId, setHostId] = useState<string>('');
  const [gameState, setGameState] = useState<AliasGameState | null>(null);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isHost = user?.id === hostId;
  const myId = user?.id ?? '';

  // Derived
  const activeTeam = gameState?.teams[gameState.activeTeamIndex];
  const explainer = activeTeam
    ? players.find((p) => p.id === activeTeam.playerIds[gameState!.explainerIndex % activeTeam.playerIds.length])
    : null;
  const isExplainer = myId === explainer?.id;
  const isMyTeamActive = activeTeam?.playerIds.includes(myId) ?? false;
  const currentWord =
    gameState && gameState.currentWordIndex >= 0
      ? ALIAS_WORDS[gameState.currentWordIndex]
      : null;

  // ------------------------------------------------------------------
  // Room state
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
  // Broadcast
  // ------------------------------------------------------------------

  const broadcast = useCallback(
    (action: string, payload: unknown) => {
      emit('game:action', { code: roomId, action, payload });
    },
    [emit, roomId],
  );

  // ------------------------------------------------------------------
  // Listen for game actions
  // ------------------------------------------------------------------

  useEffect(() => {
    const unsub1 = on('game:action', (data: unknown) => {
      const { action, payload } = data as {
        action: string;
        payload: AliasGameState;
        from: string;
      };
      switch (action) {
        case 'alias:state':
          setGameState(payload);
          break;
        case 'alias:tick':
          setGameState((prev) =>
            prev
              ? { ...prev, timeLeft: (payload as unknown as { timeLeft: number }).timeLeft }
              : prev,
          );
          break;
      }
    });
    const unsub2 = on('game:ended', () => router.push(`/lobby/${roomId}`));
    return () => { unsub1(); unsub2(); };
  }, [on, router, roomId]);

  // ------------------------------------------------------------------
  // Host: timer
  // ------------------------------------------------------------------

  useEffect(() => {
    if (!isHost || !gameState || gameState.phase !== 'explaining') return;

    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      setGameState((prev) => {
        if (!prev || prev.phase !== 'explaining') return prev;
        const newTime = prev.timeLeft - 1;
        broadcast('alias:tick', { timeLeft: Math.max(newTime, 0) });

        if (newTime <= 0) {
          if (timerRef.current) clearInterval(timerRef.current);
          setTimeout(() => finishTurn(prev), 0);
          return { ...prev, timeLeft: 0 };
        }
        return { ...prev, timeLeft: newTime };
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHost, gameState?.phase, gameState?.activeTeamIndex, gameState?.explainerIndex]);

  // ------------------------------------------------------------------
  // Host: start game
  // ------------------------------------------------------------------

  const startGame = useCallback(() => {
    if (!isHost || players.length < 4) return;

    const [t1Ids, t2Ids] = splitIntoTeams(players.map((p) => p.id));
    const firstWord = pickRandomWordIndex([]);

    const initial: AliasGameState = {
      phase: 'waiting',
      teams: [
        { id: 'team-1', name: locale === 'ru' ? 'Команда 1' : 'Team 1', playerIds: t1Ids, score: 0 },
        { id: 'team-2', name: locale === 'ru' ? 'Команда 2' : 'Team 2', playerIds: t2Ids, score: 0 },
      ],
      activeTeamIndex: 0,
      explainerIndex: 0,
      currentWordIndex: firstWord,
      timeLeft: TURN_DURATION,
      wordsGuessed: 0,
      wordsSkipped: 0,
      round: 1,
      totalRounds: DEFAULT_ROUNDS,
      usedWordIndices: [firstWord],
      turnHistory: [],
    };

    setGameState(initial);
    broadcast('alias:state', initial);
  }, [isHost, players, broadcast, locale]);

  // ------------------------------------------------------------------
  // Host: begin turn (explainer presses Start)
  // ------------------------------------------------------------------

  const beginTurn = useCallback(() => {
    if (!gameState) return;
    const updated: AliasGameState = {
      ...gameState,
      phase: 'explaining',
      timeLeft: TURN_DURATION,
      wordsGuessed: 0,
      wordsSkipped: 0,
      turnHistory: [],
    };
    setGameState(updated);
    broadcast('alias:state', updated);
  }, [gameState, broadcast]);

  // ------------------------------------------------------------------
  // Host: finish turn (time's up)
  // ------------------------------------------------------------------

  const finishTurn = useCallback(
    (prev: AliasGameState) => {
      const turnScore = prev.wordsGuessed - prev.wordsSkipped;
      const updatedTeams = prev.teams.map((t, i) =>
        i === prev.activeTeamIndex ? { ...t, score: t.score + turnScore } : t,
      );

      const result: AliasGameState = {
        ...prev,
        phase: 'turnResult',
        teams: updatedTeams,
        timeLeft: 0,
      };
      setGameState(result);
      broadcast('alias:state', result);
    },
    [broadcast],
  );

  // ------------------------------------------------------------------
  // Host: next turn
  // ------------------------------------------------------------------

  const nextTurn = useCallback(() => {
    if (!gameState) return;

    // Alternate teams. After both teams played, increment round.
    const nextTeamIndex = gameState.activeTeamIndex === 0 ? 1 : 0;
    const newRound = nextTeamIndex === 0 ? gameState.round + 1 : gameState.round;

    // Check if game is over
    if (newRound > gameState.totalRounds) {
      const finished: AliasGameState = { ...gameState, phase: 'finished' };
      setGameState(finished);
      broadcast('alias:state', finished);
      return;
    }

    // Advance explainer within the next team
    const nextTeam = gameState.teams[nextTeamIndex];
    const nextExplainerIdx =
      nextTeamIndex === gameState.activeTeamIndex
        ? (gameState.explainerIndex + 1) % nextTeam.playerIds.length
        : // If switching teams, advance that team's explainer count too
          Math.floor(
            (newRound - 1) * (nextTeamIndex === 0 ? 1 : 1)
          ) % nextTeam.playerIds.length;

    // Simpler: just track explainer per team
    const nextWordIdx = pickRandomWordIndex(gameState.usedWordIndices);

    const next: AliasGameState = {
      ...gameState,
      phase: 'waiting',
      activeTeamIndex: nextTeamIndex,
      explainerIndex: nextTeamIndex === gameState.activeTeamIndex
        ? (gameState.explainerIndex + 1) % nextTeam.playerIds.length
        : gameState.explainerIndex,
      currentWordIndex: nextWordIdx,
      round: newRound,
      timeLeft: TURN_DURATION,
      wordsGuessed: 0,
      wordsSkipped: 0,
      usedWordIndices: [...gameState.usedWordIndices, nextWordIdx],
      turnHistory: [],
    };
    setGameState(next);
    broadcast('alias:state', next);
  }, [gameState, broadcast]);

  // ------------------------------------------------------------------
  // Host: word guessed (+1)
  // ------------------------------------------------------------------

  const handleGuessed = useCallback(() => {
    if (!isHost || !gameState || gameState.phase !== 'explaining') return;

    const nextWordIdx = pickRandomWordIndex(gameState.usedWordIndices);
    const updated: AliasGameState = {
      ...gameState,
      currentWordIndex: nextWordIdx,
      wordsGuessed: gameState.wordsGuessed + 1,
      usedWordIndices: [...gameState.usedWordIndices, nextWordIdx],
      turnHistory: [
        ...gameState.turnHistory,
        { word: ALIAS_WORDS[gameState.currentWordIndex], guessed: true },
      ],
    };
    setGameState(updated);
    broadcast('alias:state', updated);
  }, [isHost, gameState, broadcast]);

  // ------------------------------------------------------------------
  // Host: word skipped (-1)
  // ------------------------------------------------------------------

  const handleSkip = useCallback(() => {
    if (!isHost || !gameState || gameState.phase !== 'explaining') return;

    const nextWordIdx = pickRandomWordIndex(gameState.usedWordIndices);
    const updated: AliasGameState = {
      ...gameState,
      currentWordIndex: nextWordIdx,
      wordsSkipped: gameState.wordsSkipped + 1,
      usedWordIndices: [...gameState.usedWordIndices, nextWordIdx],
      turnHistory: [
        ...gameState.turnHistory,
        { word: ALIAS_WORDS[gameState.currentWordIndex], guessed: false },
      ],
    };
    setGameState(updated);
    broadcast('alias:state', updated);
  }, [isHost, gameState, broadcast]);

  // ------------------------------------------------------------------
  // Non-host actions forwarded to host
  // ------------------------------------------------------------------

  const emitAction = useCallback(
    (action: string) => {
      emit('game:action', { code: roomId, action, payload: {} });
    },
    [emit, roomId],
  );

  useEffect(() => {
    if (!isHost) return;
    const cleanup = on('game:action', (data: unknown) => {
      const { action } = data as { action: string; payload: unknown; from: string };
      if (action === 'alias:guessed') handleGuessed();
      if (action === 'alias:skip') handleSkip();
      if (action === 'alias:begin-turn') beginTurn();
      if (action === 'alias:next-turn') nextTurn();
    });
    return cleanup;
  }, [isHost, on, handleGuessed, handleSkip, beginTurn, nextTurn]);

  // ------------------------------------------------------------------
  // End game
  // ------------------------------------------------------------------

  const endGame = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    emit('game:end', { code: roomId });
  }, [emit, roomId]);

  // ------------------------------------------------------------------
  // Layout scores
  // ------------------------------------------------------------------

  const layoutScores = gameState
    ? gameState.teams.map((t) => ({ name: t.name, score: t.score }))
    : [];

  const currentRound = gameState?.round ?? 0;
  const totalRounds = gameState?.totalRounds ?? DEFAULT_ROUNDS;

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------

  return (
    <GameLayout
      title={locale === 'ru' ? 'Угадай слово' : 'Guess the Word'}
      icon="💬"
      round={currentRound}
      totalRounds={totalRounds}
      scores={layoutScores}
      onEnd={isHost ? endGame : undefined}
      showScoreboard={gameState?.phase === 'finished'}
    >
      {/* ---- TEAM SETUP / NOT STARTED ---- */}
      {!gameState && (
        <div className="flex-1 flex flex-col items-center justify-center gap-6">
          <GlassCard className="w-full max-w-md p-6 text-center">
            <p className="text-xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
              💬 {locale === 'ru' ? 'Угадай слово' : 'Guess the Word'}
            </p>
            <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
              {locale === 'ru'
                ? 'Разделитесь на 2 команды. Объясняйте слова за 60 секунд! +1 за угаданное, −1 за пропуск.'
                : 'Split into 2 teams. Explain words in 60 seconds! +1 for guessed, −1 for skipped.'}
            </p>

            <div className="mb-4">
              <p className="text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                {locale === 'ru' ? 'Игроки' : 'Players'} ({players.length})
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                {players.map((p) => (
                  <span key={p.id} className="glass-badge">{p.nickname}</span>
                ))}
              </div>
            </div>

            {isHost ? (
              <GlassButton
                variant="primary"
                size="lg"
                className="w-full"
                onClick={startGame}
                disabled={players.length < 4}
              >
                {locale === 'ru' ? 'Начать игру' : 'Start Game'}
              </GlassButton>
            ) : (
              <p className="text-sm italic" style={{ color: 'var(--text-secondary)' }}>
                {locale === 'ru' ? 'Ожидание хоста...' : 'Waiting for host...'}
              </p>
            )}
          </GlassCard>
        </div>
      )}

      {/* ---- WAITING FOR EXPLAINER TO START ---- */}
      {gameState?.phase === 'waiting' && (
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          {/* Team cards */}
          <div className="w-full max-w-md flex gap-3">
            {gameState.teams.map((team, ti) => (
              <GlassCard
                key={team.id}
                className={`flex-1 p-4 text-center ${
                  ti === gameState.activeTeamIndex ? 'outline outline-2 outline-purple-400' : 'opacity-60'
                }`}
              >
                <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                  {team.name}
                </p>
                <p className="text-2xl font-bold text-amber-400">{team.score}</p>
                <div className="mt-2 flex flex-wrap gap-1 justify-center">
                  {team.playerIds.map((id) => {
                    const p = players.find((pl) => pl.id === id);
                    const isExp =
                      ti === gameState.activeTeamIndex &&
                      id === team.playerIds[gameState.explainerIndex % team.playerIds.length];
                    return (
                      <span
                        key={id}
                        className={`glass-badge text-xs ${isExp ? 'outline outline-1 outline-amber-400' : ''}`}
                      >
                        {p?.nickname ?? id} {isExp && '🎤'}
                      </span>
                    );
                  })}
                </div>
              </GlassCard>
            ))}
          </div>

          {/* Start button for explainer */}
          {isExplainer ? (
            <GlassButton
              variant="primary"
              size="lg"
              className="w-full max-w-md"
              onClick={() => (isHost ? beginTurn() : emitAction('alias:begin-turn'))}
            >
              {locale === 'ru' ? 'Начать ход!' : 'Start Turn!'}
            </GlassButton>
          ) : (
            <GlassCard className="w-full max-w-md p-4 text-center">
              <p style={{ color: 'var(--text-secondary)' }}>
                {locale === 'ru'
                  ? `Ожидание: ${explainer?.nickname ?? '...'} начинает ход`
                  : `Waiting: ${explainer?.nickname ?? '...'} starts the turn`}
              </p>
            </GlassCard>
          )}
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
                  gameState.timeLeft <= 10 ? 'text-red-400 animate-pulse' : 'text-white'
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
                  background:
                    gameState.timeLeft <= 10
                      ? 'linear-gradient(90deg, #f87171, #ef4444)'
                      : 'var(--accent-gradient)',
                }}
              />
            </div>
          </div>

          {/* Active team + scores */}
          <div className="w-full max-w-md flex gap-3">
            {gameState.teams.map((team, ti) => (
              <div
                key={team.id}
                className={`flex-1 rounded-xl px-3 py-2 text-center ${
                  ti === gameState.activeTeamIndex
                    ? 'bg-white/10 outline outline-1 outline-purple-400'
                    : 'bg-white/5 opacity-50'
                }`}
              >
                <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                  {team.name}
                </p>
                <p className="text-lg font-bold text-amber-400">{team.score}</p>
              </div>
            ))}
          </div>

          {/* Explainer info */}
          <GlassCard className="w-full max-w-md p-3 text-center">
            <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
              🎤 {explainer?.nickname ?? '...'}
            </p>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              {locale === 'ru'
                ? `Угадано: ${gameState.wordsGuessed} | Пропущено: ${gameState.wordsSkipped}`
                : `Guessed: ${gameState.wordsGuessed} | Skipped: ${gameState.wordsSkipped}`}
            </p>
          </GlassCard>

          {/* Word card */}
          {isExplainer && currentWord ? (
            <GlassCard className="w-full max-w-md p-8 text-center">
              <p className="text-sm uppercase tracking-wider mb-2" style={{ color: 'var(--text-secondary)' }}>
                {locale === 'ru' ? 'Объясните это слово' : 'Explain this word'}
              </p>
              <p className="text-3xl font-extrabold" style={{ color: 'var(--text-primary)' }}>
                {locale === 'ru' ? currentWord.ru : currentWord.en}
              </p>
            </GlassCard>
          ) : (
            <GlassCard className="w-full max-w-md p-8 text-center">
              <p className="text-lg" style={{ color: 'var(--text-secondary)' }}>
                {isMyTeamActive
                  ? locale === 'ru'
                    ? 'Угадайте слово!'
                    : 'Guess the word!'
                  : locale === 'ru'
                  ? 'Ход другой команды...'
                  : "Other team's turn..."}
              </p>
              <p className="text-5xl mt-2">{isMyTeamActive ? '🤔' : '⏳'}</p>
            </GlassCard>
          )}

          {/* Action buttons for explainer */}
          {isExplainer && (
            <div className="w-full max-w-md flex gap-3">
              <GlassButton
                variant="primary"
                size="lg"
                className="flex-1"
                onClick={() => (isHost ? handleGuessed() : emitAction('alias:guessed'))}
              >
                {locale === 'ru' ? 'Угадали! +1' : 'Guessed! +1'}
              </GlassButton>
              <GlassButton
                size="lg"
                className="flex-1"
                onClick={() => (isHost ? handleSkip() : emitAction('alias:skip'))}
              >
                {locale === 'ru' ? 'Пропуск −1' : 'Skip −1'}
              </GlassButton>
            </div>
          )}
        </div>
      )}

      {/* ---- TURN RESULT ---- */}
      {gameState?.phase === 'turnResult' && (
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <GlassCard className="w-full max-w-md p-6 text-center">
            <p className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
              {locale === 'ru' ? 'Время вышло!' : "Time's up!"}
            </p>
            <p className="text-3xl font-bold text-amber-400 mb-4">
              {activeTeam?.name}: {gameState.wordsGuessed - gameState.wordsSkipped > 0 ? '+' : ''}
              {gameState.wordsGuessed - gameState.wordsSkipped}
            </p>
            <div className="text-sm space-y-1 mb-4" style={{ color: 'var(--text-secondary)' }}>
              <p>✅ {locale === 'ru' ? 'Угадано' : 'Guessed'}: {gameState.wordsGuessed}</p>
              <p>❌ {locale === 'ru' ? 'Пропущено' : 'Skipped'}: {gameState.wordsSkipped}</p>
            </div>

            {/* Turn history */}
            {gameState.turnHistory.length > 0 && (
              <div className="max-h-40 overflow-y-auto space-y-1 mb-4">
                {gameState.turnHistory.map((item, i) => (
                  <div
                    key={i}
                    className={`flex items-center justify-between px-3 py-1 rounded-lg text-sm ${
                      item.guessed ? 'bg-green-500/10' : 'bg-red-500/10'
                    }`}
                  >
                    <span style={{ color: 'var(--text-primary)' }}>
                      {locale === 'ru' ? item.word.ru : item.word.en}
                    </span>
                    <span>{item.guessed ? '✅' : '❌'}</span>
                  </div>
                ))}
              </div>
            )}
          </GlassCard>

          {/* Team standings */}
          <div className="w-full max-w-md flex gap-3">
            {gameState.teams.map((team) => (
              <GlassCard key={team.id} className="flex-1 p-4 text-center">
                <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                  {team.name}
                </p>
                <p className="text-2xl font-bold text-amber-400">{team.score}</p>
              </GlassCard>
            ))}
          </div>

          {/* Next turn / Game over */}
          {isHost && (
            <GlassButton
              variant="primary"
              size="lg"
              className="w-full max-w-md"
              onClick={nextTurn}
            >
              {locale === 'ru' ? 'Следующий ход →' : 'Next Turn →'}
            </GlassButton>
          )}
        </div>
      )}

      {/* ---- FINISHED ---- */}
      {gameState?.phase === 'finished' && (
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <GlassCard className="w-full max-w-md p-6 text-center">
            <p className="text-4xl mb-2">🏆</p>
            <p className="text-xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
              {locale === 'ru' ? 'Игра окончена!' : 'Game Over!'}
            </p>
            {gameState.teams
              .sort((a, b) => b.score - a.score)
              .map((team, i) => (
                <div
                  key={team.id}
                  className={`flex items-center justify-between px-4 py-3 rounded-xl mb-2 ${
                    i === 0 ? 'bg-amber-500/10 outline outline-1 outline-amber-400' : 'bg-white/5'
                  }`}
                >
                  <span className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                    {i === 0 ? '🥇' : '🥈'} {team.name}
                  </span>
                  <span className="text-2xl font-bold text-amber-400">{team.score}</span>
                </div>
              ))}
          </GlassCard>
          {isHost && (
            <GlassButton variant="primary" size="lg" onClick={startGame}>
              {locale === 'ru' ? 'Играть снова' : 'Play Again'}
            </GlassButton>
          )}
        </div>
      )}
    </GameLayout>
  );
}
