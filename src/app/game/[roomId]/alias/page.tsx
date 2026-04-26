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

type AliasMode = 'classic' | 'letter';

interface AliasGameState {
  phase: 'modeSelect' | 'teamSelect' | 'waiting' | 'explaining' | 'turnResult' | 'finished';
  mode: AliasMode;
  teams: Team[];
  activeTeamIndex: number;        // which team is playing
  explainerIndex: number;         // legacy, kept for backward compat
  explainerIndices: number[];     // per-team explainer index
  currentWordIndex: number;
  timeLeft: number;
  wordsGuessed: number;           // +1 per guessed word this turn
  wordsSkipped: number;           // +1 per skip this turn
  round: number;
  totalRounds: number;
  usedWordIndices: number[];
  turnHistory: { word: { ru: string; en: string }; guessed: boolean }[];
  currentLetter: string;          // letter mode: the letter to use for explanations
}

const TURN_DURATION_CLASSIC = 60;
const TURN_DURATION_LETTER = 90;
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

const RU_LETTERS = 'АБВГДЕЖЗИКЛМНОПРСТУФХЦЧШЩЭЮЯ'.split('');
const EN_LETTERS = 'ABCDEFGHIJKLMNOPRSTUVW'.split('');

function pickRandomLetter(locale: string): string {
  const letters = locale === 'ru' ? RU_LETTERS : EN_LETTERS;
  return letters[Math.floor(Math.random() * letters.length)];
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
  const [selectedMode, setSelectedMode] = useState<AliasMode | null>(null);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const gameStateRef = useRef<AliasGameState | null>(null);
  const isHostRef = useRef(false);

  const isHost = user?.id === hostId;
  isHostRef.current = isHost;
  const myId = user?.id ?? '';

  // Derived
  const activeTeam = gameState?.teams[gameState.activeTeamIndex];
  const explainerIndices = gameState?.explainerIndices ?? gameState?.teams.map(() => 0) ?? [];
  const explainer = activeTeam
    ? players.find(
        (p) =>
          p.id ===
          activeTeam.playerIds[
            (explainerIndices[gameState!.activeTeamIndex] ?? 0) % activeTeam.playerIds.length
          ],
      )
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
          gameStateRef.current = payload;
          break;
        case 'alias:tick':
          setGameState((prev) => {
            const next = prev
              ? { ...prev, timeLeft: (payload as unknown as { timeLeft: number }).timeLeft }
              : prev;
            gameStateRef.current = next;
            return next;
          });
          break;
        case 'alias:request-state':
          // TV joined mid-game — host re-broadcasts current state
          if (isHostRef.current && gameStateRef.current) {
            emit('game:action', { code: roomId, action: 'alias:state', payload: gameStateRef.current });
          }
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
  }, [isHost, gameState?.phase, gameState?.activeTeamIndex, gameState?.explainerIndices?.[gameState?.activeTeamIndex ?? 0]]);

  // ------------------------------------------------------------------
  // Host: team select helpers
  // ------------------------------------------------------------------

  const handleJoinTeam = useCallback(
    (playerId: string, teamIndex: number) => {
      setGameState((prev) => {
        if (!prev) return prev;
        // Remove player from all teams
        const updatedTeams = prev.teams.map((t) => ({
          ...t,
          playerIds: t.playerIds.filter((id) => id !== playerId),
        }));
        // Add to target team
        updatedTeams[teamIndex] = {
          ...updatedTeams[teamIndex],
          playerIds: [...updatedTeams[teamIndex].playerIds, playerId],
        };
        const next = { ...prev, teams: updatedTeams };
        broadcast('alias:state', next);
        return next;
      });
    },
    [broadcast],
  );

  const handleRandomizeTeams = useCallback(() => {
    setGameState((prev) => {
      if (!prev) return prev;
      const allPlayers = players.map((p) => p.id);
      const [t1Ids, t2Ids] = splitIntoTeams(allPlayers);
      const updatedTeams = prev.teams.map((t, i) => ({
        ...t,
        playerIds: i === 0 ? t1Ids : t2Ids,
      }));
      const next = { ...prev, teams: updatedTeams };
      broadcast('alias:state', next);
      return next;
    });
  }, [broadcast, players]);

  const finalizeTeams = useCallback(() => {
    setGameState((prev) => {
      if (!prev) return prev;
      // Find players not in any team
      const assignedIds = new Set(prev.teams.flatMap((t) => t.playerIds));
      const unassigned = players.map((p) => p.id).filter((id) => !assignedIds.has(id));

      let updatedTeams = [...prev.teams];
      // Assign unassigned players to the smaller team
      for (const playerId of unassigned) {
        const smallerIdx = updatedTeams[0].playerIds.length <= updatedTeams[1].playerIds.length ? 0 : 1;
        updatedTeams[smallerIdx] = {
          ...updatedTeams[smallerIdx],
          playerIds: [...updatedTeams[smallerIdx].playerIds, playerId],
        };
      }

      const next: AliasGameState = {
        ...prev,
        phase: 'waiting',
        teams: updatedTeams,
      };
      broadcast('alias:state', next);
      return next;
    });
  }, [broadcast, players]);

  // ------------------------------------------------------------------
  // Host: start game
  // ------------------------------------------------------------------

  const startGame = useCallback((mode: AliasMode) => {
    const minPlayers = mode === 'classic' ? 4 : 2;
    if (!isHost || players.length < minPlayers) return;

    const pIds = players.map((p) => p.id);
    const firstWord = pickRandomWordIndex([]);

    if (mode === 'letter') {
      // Individual play for letter mode (scoring is per-player)
      const shuffled = [...pIds].sort(() => Math.random() - 0.5);
      const teams: Team[] = shuffled.map((id, i) => ({
        id: `player-${i}`,
        name: players.find((p) => p.id === id)?.nickname ?? `Player ${i + 1}`,
        playerIds: [id],
        score: 0,
      }));

      const initial: AliasGameState = {
        phase: 'waiting',
        mode,
        teams,
        activeTeamIndex: 0,
        explainerIndex: 0,
        explainerIndices: teams.map(() => 0),
        currentWordIndex: firstWord,
        timeLeft: TURN_DURATION_LETTER,
        wordsGuessed: 0,
        wordsSkipped: 0,
        round: 1,
        totalRounds: DEFAULT_ROUNDS,
        usedWordIndices: [firstWord],
        turnHistory: [],
        currentLetter: pickRandomLetter(locale),
      };

      setGameState(initial);
      broadcast('alias:state', initial);
    } else {
      // Classic mode: go to teamSelect first
      const teams: Team[] = [
        { id: 'team-1', name: locale === 'ru' ? 'Команда 1' : 'Team 1', playerIds: [], score: 0 },
        { id: 'team-2', name: locale === 'ru' ? 'Команда 2' : 'Team 2', playerIds: [], score: 0 },
      ];

      const teamSelectState: AliasGameState = {
        phase: 'teamSelect',
        mode,
        teams,
        activeTeamIndex: 0,
        explainerIndex: 0,
        explainerIndices: [0, 0],
        currentWordIndex: firstWord,
        timeLeft: TURN_DURATION_CLASSIC,
        wordsGuessed: 0,
        wordsSkipped: 0,
        round: 1,
        totalRounds: DEFAULT_ROUNDS,
        usedWordIndices: [firstWord],
        turnHistory: [],
        currentLetter: '',
      };

      setGameState(teamSelectState);
      broadcast('alias:state', teamSelectState);
    }
  }, [isHost, players, broadcast, locale]);

  // ------------------------------------------------------------------
  // Host: begin turn (explainer presses Start)
  // ------------------------------------------------------------------

  const beginTurn = useCallback(() => {
    if (!gameState) return;
    const updated: AliasGameState = {
      ...gameState,
      phase: 'explaining',
      timeLeft: gameState.mode === 'letter' ? TURN_DURATION_LETTER : TURN_DURATION_CLASSIC,
      wordsGuessed: 0,
      wordsSkipped: 0,
      turnHistory: [],
      currentLetter: gameState.mode === 'letter' ? pickRandomLetter(locale) : gameState.currentLetter,
    };
    setGameState(updated);
    broadcast('alias:state', updated);
  }, [gameState, broadcast, locale]);

  // ------------------------------------------------------------------
  // Host: finish turn (time's up)
  // ------------------------------------------------------------------

  const finishTurn = useCallback(
    (prev: AliasGameState) => {
      // Letter mode: scores are already awarded live to guessers.
      // Classic mode: apply wordsGuessed - wordsSkipped to the active team.
      const updatedTeams =
        prev.mode === 'letter'
          ? prev.teams
          : prev.teams.map((t, i) =>
              i === prev.activeTeamIndex
                ? { ...t, score: t.score + (prev.wordsGuessed - prev.wordsSkipped) }
                : t,
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

    // Cycle through all teams; increment round when we wrap back to team 0
    const teamCount = gameState.teams.length;
    const nextTeamIndex = (gameState.activeTeamIndex + 1) % teamCount;
    const newRound = nextTeamIndex === 0 ? gameState.round + 1 : gameState.round;

    // Check if game is over
    if (newRound > gameState.totalRounds) {
      const finished: AliasGameState = { ...gameState, phase: 'finished' };
      setGameState(finished);
      broadcast('alias:state', finished);
      return;
    }

    const currentIndices = gameState.explainerIndices ?? gameState.teams.map(() => 0);

    // Increment explainerIndex for the team that just played
    const updatedIndices = currentIndices.map((idx, i) => {
      if (i === gameState.activeTeamIndex) {
        const teamSize = gameState.teams[i].playerIds.length;
        return teamSize > 0 ? (idx + 1) % teamSize : 0;
      }
      return idx;
    });

    const nextWordIdx = pickRandomWordIndex(gameState.usedWordIndices);

    const next: AliasGameState = {
      ...gameState,
      phase: 'waiting',
      activeTeamIndex: nextTeamIndex,
      explainerIndex: updatedIndices[nextTeamIndex],
      explainerIndices: updatedIndices,
      currentWordIndex: nextWordIdx,
      round: newRound,
      timeLeft: gameState.mode === 'letter' ? TURN_DURATION_LETTER : TURN_DURATION_CLASSIC,
      wordsGuessed: 0,
      wordsSkipped: 0,
      usedWordIndices: [...gameState.usedWordIndices, nextWordIdx],
      turnHistory: [],
      currentLetter: gameState.currentLetter,
    };
    setGameState(next);
    broadcast('alias:state', next);
  }, [gameState, broadcast]);

  // ------------------------------------------------------------------
  // Host: word guessed (+1)
  // ------------------------------------------------------------------

  const handleGuessed = useCallback(() => {
    if (!isHost || !gameState || gameState.phase !== 'explaining') return;

    const isLetter = gameState.mode === 'letter';
    const nextWordIdx = pickRandomWordIndex(gameState.usedWordIndices);

    // Letter mode: award +1 to the active explainer's team live
    const updatedTeams = isLetter
      ? gameState.teams.map((t, i) =>
          i === gameState.activeTeamIndex ? { ...t, score: t.score + 1 } : t,
        )
      : gameState.teams;

    const updated: AliasGameState = {
      ...gameState,
      currentWordIndex: nextWordIdx,
      wordsGuessed: gameState.wordsGuessed + 1,
      teams: updatedTeams,
      usedWordIndices: [...gameState.usedWordIndices, nextWordIdx],
      turnHistory: [
        ...gameState.turnHistory,
        { word: ALIAS_WORDS[gameState.currentWordIndex], guessed: true },
      ],
      currentLetter: isLetter ? pickRandomLetter(locale) : gameState.currentLetter,
    };
    setGameState(updated);
    broadcast('alias:state', updated);
  }, [isHost, gameState, broadcast, locale]);

  // ------------------------------------------------------------------
  // Host: word skipped (-1)
  // ------------------------------------------------------------------

  const handleSkip = useCallback(() => {
    if (!isHost || !gameState || gameState.phase !== 'explaining') return;

    const isLetter = gameState.mode === 'letter';
    const nextWordIdx = pickRandomWordIndex(gameState.usedWordIndices);
    const updated: AliasGameState = {
      ...gameState,
      currentWordIndex: nextWordIdx,
      wordsSkipped: gameState.wordsSkipped + 1,
      usedWordIndices: [...gameState.usedWordIndices, nextWordIdx],
      turnHistory: isLetter
        ? gameState.turnHistory
        : [
            ...gameState.turnHistory,
            { word: ALIAS_WORDS[gameState.currentWordIndex], guessed: false },
          ],
      currentLetter: isLetter ? pickRandomLetter(locale) : gameState.currentLetter,
    };
    setGameState(updated);
    broadcast('alias:state', updated);
  }, [isHost, gameState, broadcast, locale]);

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
      const { action, payload, from } = data as { action: string; payload: Record<string, unknown>; from: string };
      if (action === 'alias:guessed') handleGuessed();
      if (action === 'alias:skip') handleSkip();
      if (action === 'alias:begin-turn') beginTurn();
      if (action === 'alias:next-turn') nextTurn();
      if (action === 'alias:select-mode') {
        const mode = payload.mode as AliasMode;
        setSelectedMode(mode);
        broadcast('alias:state', { phase: 'modeSelect', mode } as unknown as AliasGameState);
      }
      if (action === 'alias:join-team') {
        const teamIndex = payload.teamIndex as number;
        handleJoinTeam(from, teamIndex);
      }
      if (action === 'alias:randomize-teams') {
        handleRandomizeTeams();
      }
      if (action === 'alias:confirm-teams') {
        finalizeTeams();
      }
    });
    return cleanup;
  }, [isHost, on, handleGuessed, handleSkip, beginTurn, nextTurn, broadcast, handleJoinTeam, handleRandomizeTeams, finalizeTeams]);

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

  // Derived: players not yet in any team (for teamSelect)
  const assignedPlayerIds = gameState?.teams.flatMap((t) => t.playerIds) ?? [];
  const unassignedPlayers = players.filter((p) => !assignedPlayerIds.includes(p.id));

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
      {/* ---- MODE SELECT ---- */}
      {(!gameState || gameState.phase === 'modeSelect') && (
        <div className="flex-1 flex flex-col items-center justify-center gap-6">
          <p className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
            💬 {locale === 'ru' ? 'Угадай слово' : 'Guess the Word'}
          </p>

          {/* Mode cards */}
          <div className="w-full max-w-md flex flex-col gap-3">
            {/* Classic */}
            <GlassCard
              className={`p-5 cursor-pointer transition-all ${
                selectedMode === 'classic' ? 'outline outline-2 outline-purple-400' : ''
              }`}
              onClick={() => {
                setSelectedMode('classic');
                if (!isHost) emit('game:action', { code: roomId, action: 'alias:select-mode', payload: { mode: 'classic' } });
              }}
            >
              <div className="flex items-center gap-4">
                <span className="text-3xl">📖</span>
                <div>
                  <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                    {locale === 'ru' ? 'Классические правила' : 'Classic Rules'}
                  </p>
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    {locale === 'ru'
                      ? 'Объясняйте слова любыми словами, не называя само слово'
                      : 'Explain words using any words, without saying the word itself'}
                  </p>
                  <span className="inline-block mt-1 text-xs glass-badge">
                    {locale === 'ru' ? '4–20 игроков' : '4–20 players'}
                  </span>
                </div>
              </div>
            </GlassCard>

            {/* Letter mode */}
            <GlassCard
              className={`p-5 cursor-pointer transition-all ${
                selectedMode === 'letter' ? 'outline outline-2 outline-purple-400' : ''
              }`}
              onClick={() => {
                setSelectedMode('letter');
                if (!isHost) emit('game:action', { code: roomId, action: 'alias:select-mode', payload: { mode: 'letter' } });
              }}
            >
              <div className="flex items-center gap-4">
                <span className="text-3xl">🔤</span>
                <div>
                  <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                    {locale === 'ru' ? 'Объясни на букву' : 'Letter Mode'}
                  </p>
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    {locale === 'ru'
                      ? 'Объясняйте слова, используя только слова на определённую букву'
                      : 'Explain words using only words starting with a specific letter'}
                  </p>
                  <span className="inline-block mt-1 text-xs glass-badge">
                    {locale === 'ru' ? '2–20 игроков' : '2–20 players'}
                  </span>
                </div>
              </div>
            </GlassCard>
          </div>

          {/* Players */}
          <div className="w-full max-w-md">
            <p className="text-sm font-medium mb-2 text-center" style={{ color: 'var(--text-secondary)' }}>
              {locale === 'ru' ? 'Игроки' : 'Players'} ({players.length})
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              {players.map((p) => (
                <span key={p.id} className="glass-badge">{p.nickname}</span>
              ))}
            </div>
          </div>

          {/* Start */}
          {isHost ? (
            <GlassButton
              variant="primary"
              size="lg"
              className="w-full max-w-md"
              onClick={() => selectedMode && startGame(selectedMode)}
              disabled={!selectedMode || players.length < (selectedMode === 'classic' ? 4 : 2)}
            >
              {locale === 'ru' ? 'Начать игру' : 'Start Game'}
            </GlassButton>
          ) : (
            <p className="text-sm italic" style={{ color: 'var(--text-secondary)' }}>
              {selectedMode
                ? locale === 'ru' ? 'Ожидание хоста...' : 'Waiting for host...'
                : locale === 'ru' ? 'Хост выбирает режим...' : 'Host is choosing mode...'}
            </p>
          )}
        </div>
      )}

      {/* ---- TEAM SELECT (classic mode only) ---- */}
      {gameState?.phase === 'teamSelect' && (
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <p className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
            {locale === 'ru' ? 'Выберите команду' : 'Choose your team'}
          </p>

          {/* Team cards */}
          <div className="w-full max-w-md flex gap-3">
            {gameState.teams.map((team, ti) => (
              <GlassCard
                key={team.id}
                className="flex-1 p-4 text-center cursor-pointer hover:outline hover:outline-1 hover:outline-purple-400 transition-all"
                onClick={() => {
                  if (isHost) {
                    handleJoinTeam(myId, ti);
                  } else {
                    emit('game:action', { code: roomId, action: 'alias:join-team', payload: { teamIndex: ti } });
                  }
                }}
              >
                <p className="text-lg font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
                  {team.name}
                </p>
                <div className="flex flex-wrap gap-1 justify-center min-h-[2rem]">
                  {team.playerIds.map((id) => {
                    const p = players.find((pl) => pl.id === id);
                    return (
                      <span
                        key={id}
                        className={`glass-badge text-xs ${id === myId ? 'outline outline-1 outline-amber-400' : ''}`}
                      >
                        {p?.nickname ?? id}
                      </span>
                    );
                  })}
                  {team.playerIds.length === 0 && (
                    <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                      {locale === 'ru' ? 'пока никого' : 'nobody yet'}
                    </span>
                  )}
                </div>
              </GlassCard>
            ))}
          </div>

          {/* Unassigned players */}
          {unassignedPlayers.length > 0 && (
            <div className="w-full max-w-md">
              <p className="text-xs text-center mb-2" style={{ color: 'var(--text-secondary)' }}>
                {locale === 'ru' ? 'Ещё не выбрали команду:' : 'Haven\'t chosen yet:'}
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                {unassignedPlayers.map((p) => (
                  <span key={p.id} className="glass-badge text-xs opacity-60">{p.nickname}</span>
                ))}
              </div>
            </div>
          )}

          {/* Host controls */}
          {isHost && (
            <div className="w-full max-w-md flex flex-col gap-3">
              <GlassButton
                size="lg"
                className="w-full"
                onClick={handleRandomizeTeams}
              >
                {locale === 'ru' ? '🔀 Случайное распределение' : '🔀 Randomize Teams'}
              </GlassButton>
              <GlassButton
                variant="primary"
                size="lg"
                className="w-full"
                onClick={finalizeTeams}
                disabled={
                  gameState.teams[0].playerIds.length === 0 ||
                  gameState.teams[1].playerIds.length === 0
                }
              >
                {locale === 'ru' ? 'Начать игру →' : 'Start Game →'}
              </GlassButton>
            </div>
          )}

          {!isHost && (
            <p className="text-sm italic" style={{ color: 'var(--text-secondary)' }}>
              {locale === 'ru' ? 'Нажмите на карточку команды, чтобы вступить' : 'Tap a team card to join'}
            </p>
          )}
        </div>
      )}

      {/* ---- WAITING FOR EXPLAINER TO START ---- */}
      {gameState?.phase === 'waiting' && (
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          {/* Team cards */}
          <div className="w-full max-w-md flex gap-3">
            {gameState.teams.map((team, ti) => {
              const teamExplainerIdx = (gameState.explainerIndices ?? gameState.teams.map(() => 0))[ti] ?? 0;
              return (
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
                        id === team.playerIds[teamExplainerIdx % team.playerIds.length];
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
              );
            })}
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
                  width: `${(gameState.timeLeft / (gameState.mode === 'letter' ? TURN_DURATION_LETTER : TURN_DURATION_CLASSIC)) * 100}%`,
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
              {gameState.mode === 'letter'
                ? locale === 'ru'
                  ? `Угадано: ${gameState.wordsGuessed}`
                  : `Guessed: ${gameState.wordsGuessed}`
                : locale === 'ru'
                ? `Угадано: ${gameState.wordsGuessed} | Пропущено: ${gameState.wordsSkipped}`
                : `Guessed: ${gameState.wordsGuessed} | Skipped: ${gameState.wordsSkipped}`}
            </p>
          </GlassCard>

          {/* Word card */}
          {isExplainer && currentWord ? (
            <GlassCard className="w-full max-w-md p-8 text-center">
              {gameState.mode === 'letter' && gameState.currentLetter && (
                <div className="mb-3">
                  <p className="text-sm uppercase tracking-wider mb-1" style={{ color: 'var(--text-secondary)' }}>
                    {locale === 'ru' ? 'Объясняй словами на букву' : 'Use words starting with'}
                  </p>
                  <p className="text-5xl font-black text-purple-400">{gameState.currentLetter}</p>
                </div>
              )}
              {gameState.mode === 'classic' && (
                <p className="text-sm uppercase tracking-wider mb-2" style={{ color: 'var(--text-secondary)' }}>
                  {locale === 'ru' ? 'Объясните это слово' : 'Explain this word'}
                </p>
              )}
              <p className="text-3xl font-extrabold" style={{ color: 'var(--text-primary)' }}>
                {locale === 'ru' ? currentWord.ru : currentWord.en}
              </p>
            </GlassCard>
          ) : gameState.mode === 'letter' ? (
            /* Letter mode non-explainer: guess out loud */
            <GlassCard className="w-full max-w-md p-8 text-center">
              {gameState.currentLetter && (
                <div className="mb-3">
                  <p className="text-xs uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                    {locale === 'ru' ? 'Буква' : 'Letter'}
                  </p>
                  <p className="text-4xl font-black text-purple-400">{gameState.currentLetter}</p>
                </div>
              )}
              <p className="text-4xl mb-3">🗣️</p>
              <p className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                {locale === 'ru' ? 'Угадывайте вслух!' : 'Guess out loud!'}
              </p>
              <p className="text-sm mt-2" style={{ color: 'var(--text-secondary)' }}>
                {locale === 'ru'
                  ? `${explainer?.nickname ?? '...'} объясняет слово`
                  : `${explainer?.nickname ?? '...'} is explaining`}
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
              {!isMyTeamActive && <p className="text-5xl mt-2">⏳</p>}
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
                {locale === 'ru' ? 'Угадали! ✓' : 'Guessed! ✓'}
              </GlassButton>
              <GlassButton
                size="lg"
                className="flex-1"
                onClick={() => (isHost ? handleSkip() : emitAction('alias:skip'))}
              >
                {gameState.mode === 'letter'
                  ? (locale === 'ru' ? 'Пропустить →' : 'Skip →')
                  : (locale === 'ru' ? 'Пропуск −1' : 'Skip −1')}
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
            {gameState.mode === 'letter' ? (
              <div className="text-sm space-y-1 mb-4" style={{ color: 'var(--text-secondary)' }}>
                <p>✅ {locale === 'ru' ? 'Угадано' : 'Guessed'}: {gameState.wordsGuessed}</p>
                <p>❌ {locale === 'ru' ? 'Пропущено' : 'Skipped'}: {gameState.wordsSkipped}</p>
              </div>
            ) : (
              <>
                <p className="text-3xl font-bold text-amber-400 mb-4">
                  {activeTeam?.name}: {gameState.wordsGuessed - gameState.wordsSkipped > 0 ? '+' : ''}
                  {gameState.wordsGuessed - gameState.wordsSkipped}
                </p>
                <div className="text-sm space-y-1 mb-4" style={{ color: 'var(--text-secondary)' }}>
                  <p>✅ {locale === 'ru' ? 'Угадано' : 'Guessed'}: {gameState.wordsGuessed}</p>
                  <p>❌ {locale === 'ru' ? 'Пропущено' : 'Skipped'}: {gameState.wordsSkipped}</p>
                </div>
              </>
            )}

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
            <GlassButton variant="primary" size="lg" onClick={() => startGame(gameState.mode)}>
              {locale === 'ru' ? 'Играть снова' : 'Play Again'}
            </GlassButton>
          )}
        </div>
      )}
    </GameLayout>
  );
}
