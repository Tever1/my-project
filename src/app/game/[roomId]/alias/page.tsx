'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';
import { GameLayout } from '@/components/games/GameLayout';
import { AliasIcon } from '@/components/games/AliasIcon';
import { FitText } from '@/components/games/FitText';
import { BreathingPlaceholder } from '@/components/ingame';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { useSocket } from '@/lib/use-socket';
import { useRoomState } from '@/lib/use-room-state';
import { useGameAction } from '@/lib/use-game-action';
import { useNavigateOnGameEnd } from '@/lib/use-navigate-on-game-end';
import { useGameIdentity } from '@/lib/use-game-identity';
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
  phase: 'modeSelect' | 'teamSelect' | 'teamName' | 'waiting' | 'explaining' | 'turnResult' | 'finished';
  mode: AliasMode;
  teams: Team[];
  teamNameConfirmed?: boolean[];
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

function TeamNameInput({
  defaultValue,
  onSubmit,
  locale,
}: {
  defaultValue: string;
  onSubmit: (name: string) => void;
  locale: string;
}) {
  const [value, setValue] = useState(defaultValue);
  return (
    <div className="w-full max-w-md flex flex-col gap-3">
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && value.trim()) onSubmit(value);
        }}
        maxLength={9}
        placeholder={locale === 'ru' ? 'Название команды' : 'Team name'}
        className="w-full rounded-[20px] border border-white/20 bg-white/[0.1] px-5 py-4 text-center text-xl font-bold text-white placeholder-white/40 outline-none focus:border-pink-300"
      />
      <GlassButton
        variant="primary"
        size="lg"
        className="w-full"
        onClick={() => onSubmit(value)}
        disabled={!value.trim()}
      >
        {locale === 'ru' ? 'Готово' : 'Done'}
      </GlassButton>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AliasPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const { emit, on } = useSocket();
  const { user, effectivePlayerId, isGameHost } = useGameIdentity(roomId);
  useNavigateOnGameEnd(roomId, user ? 'lobby' : 'phone');
  const { locale } = useTranslation();

  const [players, setPlayers] = useState<Player[]>([]);
  const [gameState, setGameState] = useState<AliasGameState | null>(null);
  const [selectedMode, setSelectedMode] = useState<AliasMode | null>(null);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const gameStateRef = useRef<AliasGameState | null>(null);
  const isHostRef = useRef(false);

  const isHost = isGameHost;
  isHostRef.current = isHost;
  const myId = effectivePlayerId;

  // Derived
  const activeTeam = gameState?.teams?.[gameState.activeTeamIndex];
  const explainerIndices = gameState?.explainerIndices ?? gameState?.teams?.map(() => 0) ?? [];
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
  const aliasGuessers: Player[] = gameState
    ? gameState.mode === 'letter'
      ? players.filter((p) => p.id !== explainer?.id)
      : (activeTeam?.playerIds ?? [])
          .filter((id) => id !== explainer?.id)
          .map((id) => players.find((p) => p.id === id))
          .filter((p): p is Player => Boolean(p))
    : [];
  const currentWord =
    gameState && gameState.currentWordIndex >= 0
      ? ALIAS_WORDS[gameState.currentWordIndex]
      : null;
  const myTeamIndex = gameState ? gameState.teams.findIndex((t) => t.playerIds.includes(myId)) : -1;
  const teamNameConfirmed = gameState?.teamNameConfirmed ?? gameState?.teams.map(() => false) ?? [];
  const firstConnectedInTeam = (team?: Team): string | null =>
    team
      ? (team.playerIds.find((id) => players.find((p) => p.id === id)?.isConnected) ?? team.playerIds[0] ?? null)
      : null;
  const myTeamNamerId = myTeamIndex >= 0 ? firstConnectedInTeam(gameState?.teams[myTeamIndex]) : null;
  const isTeamNamer = !!myTeamNamerId && myId === myTeamNamerId;

  // ------------------------------------------------------------------
  // Room state
  // ------------------------------------------------------------------

  useRoomState(roomId, (data) => {
    const d = data as { players: Player[] };
    if (d.players) setPlayers(d.players);
  });

  // ------------------------------------------------------------------
  // Broadcast
  // ------------------------------------------------------------------

  const broadcast = useGameAction(roomId);

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
            broadcast('alias:state', gameStateRef.current);
          }
          break;
      }
    });
    return () => { unsub1(); };
  }, [on, broadcast]);

  useEffect(() => {
    broadcast('alias:request-state');

    const handleVisibilityChange = () => {
      if (!document.hidden) broadcast('alias:request-state');
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [broadcast]);

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

      const updatedTeams = [...prev.teams];
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
        phase: 'teamName',
        teams: updatedTeams,
        teamNameConfirmed: updatedTeams.map(() => false),
      };
      broadcast('alias:state', next);
      return next;
    });
  }, [broadcast, players]);

  const setTeamName = useCallback((teamIndex: number, rawName: string) => {
    setGameState((prev) => {
      if (!prev) return prev;
      const fallback = locale === 'ru' ? `Команда ${teamIndex + 1}` : `Team ${teamIndex + 1}`;
      const name = rawName.trim() || prev.teams[teamIndex]?.name || fallback;
      const updatedTeams = prev.teams.map((t, i) => (i === teamIndex ? { ...t, name } : t));
      const confirmed = [...(prev.teamNameConfirmed ?? prev.teams.map(() => false))];
      confirmed[teamIndex] = true;
      const allConfirmed = updatedTeams.every((_, i) => confirmed[i]);
      const next: AliasGameState = {
        ...prev,
        teams: updatedTeams,
        teamNameConfirmed: confirmed,
        phase: allConfirmed ? 'waiting' : prev.phase,
      };
      broadcast('alias:state', next);
      return next;
    });
  }, [broadcast, locale]);

  const continueFromTeamNames = useCallback(() => {
    setGameState((prev) => {
      if (!prev) return prev;
      const next: AliasGameState = { ...prev, phase: 'waiting' };
      broadcast('alias:state', next);
      return next;
    });
  }, [broadcast]);

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

  const backToModeSelect = useCallback(() => {
    if (!isHost || !gameState) return;
    const next: AliasGameState = { ...gameState, phase: 'modeSelect' };
    setGameState(next);
    broadcast('alias:state', next);
  }, [isHost, gameState, broadcast]);

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
      broadcast(action, {});
    },
    [broadcast],
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
        const joiningPlayerId = (payload.playerId as string) ?? from;
        handleJoinTeam(joiningPlayerId, teamIndex);
      }
      if (action === 'alias:randomize-teams') {
        handleRandomizeTeams();
      }
      if (action === 'alias:confirm-teams') {
        finalizeTeams();
      }
      if (action === 'alias:set-team-name') {
        setTeamName(payload.teamIndex as number, (payload.name as string) ?? '');
      }
      if (action === 'alias:continue-teamnames') {
        continueFromTeamNames();
      }
    });
    return cleanup;
  }, [isHost, on, handleGuessed, handleSkip, beginTurn, nextTurn, broadcast, handleJoinTeam, handleRandomizeTeams, finalizeTeams, setTeamName, continueFromTeamNames]);

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

  const layoutScores = gameState?.teams
    ? gameState.teams.map((t) => ({ name: t.name, score: t.score }))
    : [];

  const currentRound = gameState?.round ?? 0;
  const totalRounds = gameState?.totalRounds ?? DEFAULT_ROUNDS;

  // Derived: players not yet in any team (for teamSelect)
  const assignedPlayerIds = gameState?.teams?.flatMap((t) => t.playerIds) ?? [];
  const unassignedPlayers = players.filter((p) => !assignedPlayerIds.includes(p.id));

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------

  return (
    <GameLayout
      title={locale === 'ru' ? 'Угадай слово' : 'Guess the Word'}
      icon={<AliasIcon name="speech" className="h-7 w-7" />}
      gradientClass="bg-gradient-alias"
      round={currentRound}
      totalRounds={totalRounds}
      scores={layoutScores}
      onEnd={isHost ? endGame : undefined}
      showScoreboard={false}
      phaseKey={gameState?.phase ?? 'modeSelect'}
    >
      {/* ---- MODE SELECT ---- */}
      {(!gameState || gameState.phase === 'modeSelect') && (
        <div className="flex-1 flex flex-col items-center justify-center gap-6">
          <p className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
            <AliasIcon name="speech" className="mr-1 inline-block h-[1em] w-[1em] align-[-0.15em]" />{' '}
            {locale === 'ru' ? 'Угадай слово' : 'Guess the Word'}
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
                if (!isHost) broadcast('alias:select-mode', { mode: 'classic' });
              }}
            >
              <div className="flex items-center gap-4">
                <AliasIcon name="book" className="h-8 w-8 shrink-0" />
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
                if (!isHost) broadcast('alias:select-mode', { mode: 'letter' });
              }}
            >
              <div className="flex items-center gap-4">
                <AliasIcon name="letters" className="h-8 w-8 shrink-0" />
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
            <BreathingPlaceholder
              text={
                selectedMode
                  ? locale === 'ru' ? 'Ожидание хоста...' : 'Waiting for host...'
                  : locale === 'ru' ? 'Хост выбирает режим...' : 'Host is choosing mode...'
              }
              variant="breathing-text"
            />
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
                    broadcast('alias:join-team', { teamIndex: ti, playerId: myId });
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
                <AliasIcon name="shuffle" className="mr-2 inline-block h-[1em] w-[1em] align-[-0.15em]" />
                {locale === 'ru' ? 'Случайное распределение' : 'Randomize Teams'}
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

      {/* ---- TEAM NAME (classic mode only) ---- */}
      {gameState?.phase === 'teamName' && (
        <div className="flex-1 flex flex-col items-center justify-center gap-5">
          <div className="w-full max-w-md flex gap-3">
            {gameState.teams.map((team, ti) => {
              const namerId = firstConnectedInTeam(team);
              const namerName = players.find((p) => p.id === namerId)?.nickname ?? '...';
              const done = teamNameConfirmed[ti];
              return (
                <GlassCard
                  key={team.id}
                  className={`alias-card flex-1 p-4 text-center ${
                    ti === myTeamIndex ? 'outline outline-2 outline-pink-400' : 'opacity-70'
                  }`}
                >
                  <p className="text-lg font-bold text-white">{team.name}</p>
                  <p className="mt-1 text-xs text-white/75">
                    {done
                      ? (locale === 'ru' ? 'Имя выбрано' : 'Name set')
                      : (locale === 'ru' ? `${namerName} выбирает имя…` : `${namerName} is naming…`)}
                  </p>
                </GlassCard>
              );
            })}
          </div>

          {isTeamNamer && myTeamIndex >= 0 && !teamNameConfirmed[myTeamIndex] ? (
            <TeamNameInput
              defaultValue=""
              locale={locale}
              onSubmit={(name) =>
                isHost
                  ? setTeamName(myTeamIndex, name)
                  : broadcast('alias:set-team-name', { teamIndex: myTeamIndex, name })
              }
            />
          ) : (
            <p className="text-sm text-white/75 text-center">
              {myTeamIndex >= 0 && teamNameConfirmed[myTeamIndex]
                ? (locale === 'ru' ? 'Ждём вторую команду…' : 'Waiting for the other team…')
                : (locale === 'ru' ? 'Капитан команды выбирает имя…' : 'Your captain is naming the team…')}
            </p>
          )}

          {isHost && (
            <button
              type="button"
              className="w-full max-w-md rounded-[24px] border border-white/20 bg-white/[0.12] px-6 py-4 text-base font-black text-white transition active:scale-[0.98]"
              onClick={() => (isHost ? continueFromTeamNames() : emitAction('alias:continue-teamnames'))}
            >
              {locale === 'ru' ? 'Продолжить →' : 'Continue →'}
            </button>
          )}
        </div>
      )}

      {/* ---- WAITING FOR EXPLAINER TO START ---- */}
      {gameState?.phase === 'waiting' && (
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          {/* Start button for explainer */}
          {isExplainer ? (
            <button
              type="button"
              className="min-h-[96px] w-full max-w-md rounded-[30px] border border-white/20 bg-white px-10 text-3xl font-black text-[#9d174d] shadow-[0_18px_44px_rgba(0,0,0,.25)] transition active:scale-[0.98]"
              onClick={() => (isHost ? beginTurn() : emitAction('alias:begin-turn'))}
            >
              {locale === 'ru' ? 'Начать ход!' : 'Start Turn!'}
            </button>
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
          {/* Status bar: round + timer + progress */}
          <div className="w-full max-w-md">
            <div className="mb-2 flex items-center justify-between">
              <span className="font-mono text-xs font-bold uppercase tracking-[0.22em] text-white/65">
                {locale === 'ru' ? 'Раунд' : 'Round'} {gameState.round} / {gameState.totalRounds}
              </span>
              <span
                className={`font-mono text-2xl font-black tabular-nums ${
                  gameState.timeLeft <= 10 ? 'text-red-200 animate-pulse' : 'text-white'
                }`}
              >
                {Math.floor(gameState.timeLeft / 60)}:{String(gameState.timeLeft % 60).padStart(2, '0')}
              </span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-white/[0.12] overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-1000 linear ${
                  gameState.timeLeft <= 10 ? 'animate-pulse' : ''
                }`}
                style={{
                  width: `${(gameState.timeLeft / (gameState.mode === 'letter' ? TURN_DURATION_LETTER : TURN_DURATION_CLASSIC)) * 100}%`,
                  background:
                    gameState.timeLeft <= 10
                      ? 'linear-gradient(90deg, #f87171, #ef4444)'
                      : 'linear-gradient(90deg, #ec4899, #f472b6)',
                  boxShadow: '0 0 12px #ec4899',
                }}
              />
            </div>
          </div>

          {/* Word / guess card */}
          {isExplainer && currentWord ? (
            <div
              className="relative flex min-h-[320px] w-full max-w-md flex-1 flex-col overflow-hidden rounded-[36px] px-6 py-7 text-white"
              style={{
                background:
                  'radial-gradient(110% 70% at 50% -5%, rgba(255,255,255,.30), transparent 55%), linear-gradient(165deg, #ec4899 0%, #9d174d 100%)',
                boxShadow: '0 24px 60px -18px #ec4899cc',
              }}
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold uppercase tracking-[0.22em] text-white/65">
                  {gameState.mode === 'letter'
                    ? `${locale === 'ru' ? 'Слово · буква' : 'Word · letter'} ${gameState.currentLetter ?? ''}`
                    : locale === 'ru' ? 'Слово' : 'Word'}
                </span>
                <AliasIcon name="speech" className="h-9 w-9" />
              </div>

              <div className="relative flex-1 min-h-0 py-4">
                <div className="absolute inset-0 flex items-center justify-center px-2">
                  <FitText
                    text={locale === 'ru' ? currentWord.ru : currentWord.en}
                    max={96}
                    min={22}
                    className="text-center font-black leading-[0.95]"
                    style={{ letterSpacing: '0', textShadow: '0 3px 16px rgba(0,0,0,.35)' }}
                  />
                </div>
              </div>

              <div>
                <p className="mb-2 font-mono text-xs font-bold uppercase tracking-[0.2em] text-white/60">
                  {locale === 'ru' ? 'Угадывают' : 'Guessing'}
                </p>
                <div className="flex flex-wrap gap-2">
                  {aliasGuessers.map((p) => (
                    <span
                      key={p.id}
                      className="inline-flex items-center rounded-full bg-black/20 px-2.5 py-1.5 text-sm font-semibold text-white"
                    >
                      {p.nickname}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div
              className="relative flex min-h-[320px] w-full max-w-md flex-1 flex-col items-center justify-center overflow-hidden rounded-[36px] px-8 py-10 text-center text-white"
              style={{
                background:
                  'radial-gradient(110% 70% at 50% -5%, rgba(255,255,255,.25), transparent 55%), linear-gradient(165deg, #ec4899 0%, #9d174d 100%)',
                boxShadow: '0 20px 50px -22px #ec4899cc',
              }}
            >
              {gameState.mode === 'letter' && gameState.currentLetter && (
                <div className="mb-3">
                  <p className="text-xs uppercase tracking-wider text-white/70">
                    {locale === 'ru' ? 'Буква' : 'Letter'}
                  </p>
                  <p className="text-4xl font-black text-white">{gameState.currentLetter}</p>
                </div>
              )}
              <div className="mb-3 flex justify-center">
                <AliasIcon name="talk" className="h-14 w-14" />
              </div>
              <p className="text-2xl font-black" style={{ textShadow: '0 3px 14px rgba(0,0,0,.35)' }}>
                {gameState.mode === 'classic' && !isMyTeamActive
                  ? locale === 'ru' ? 'Ход другой команды...' : "Other team's turn..."
                  : locale === 'ru' ? 'Угадывайте вслух!' : 'Guess out loud!'}
              </p>
              <p className="mt-3 text-sm font-medium text-white/75">
                {locale === 'ru'
                  ? `${explainer?.nickname ?? '...'} объясняет слово`
                  : `${explainer?.nickname ?? '...'} is explaining`}
              </p>
            </div>
          )}

          {/* Action slot - reserve height so the card matches with/without buttons */}
          <div className="w-full max-w-md">
            {isExplainer ? (
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  className="h-[76px] rounded-[24px] border border-white/[0.12] bg-white/[0.12] px-3 text-base font-black text-white shadow-[0_12px_30px_rgba(0,0,0,.2)] backdrop-blur-md transition active:scale-[0.98]"
                  onClick={() => (isHost ? handleSkip() : emitAction('alias:skip'))}
                >
                  <AliasIcon name="cross" className="mx-auto mb-1 block h-6 w-6" />
                  {gameState.mode === 'letter'
                    ? (locale === 'ru' ? 'Пропустить' : 'Skip')
                    : (locale === 'ru' ? 'Пропуск −1' : 'Skip −1')}
                </button>
                <button
                  type="button"
                  className="h-[76px] rounded-[24px] px-3 text-base font-black shadow-[0_16px_34px_rgba(48,209,88,.28)] transition active:scale-[0.98]"
                  style={{ background: 'linear-gradient(180deg, #4bed7a, #30d158)', color: '#05210f' }}
                  onClick={() => (isHost ? handleGuessed() : emitAction('alias:guessed'))}
                >
                  <AliasIcon name="check" className="mx-auto mb-1 block h-6 w-6" />
                  {locale === 'ru' ? 'Угадали' : 'Guessed'}
                </button>
              </div>
            ) : (
              <div className="h-[76px]" aria-hidden />
            )}
          </div>
        </div>
      )}

      {/* ---- TURN RESULT ---- */}
      {gameState?.phase === 'turnResult' && (
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <GlassCard className="alias-card w-full max-w-md p-6 text-center">
            <p className="text-xl font-bold mb-2 text-white">
              {locale === 'ru' ? 'Время вышло!' : "Time's up!"}
            </p>
            {gameState.mode === 'letter' ? (
              <div className="text-sm space-y-1 mb-4 text-white/70">
                <p>
                  <AliasIcon name="check" className="mr-1 inline-block h-[1em] w-[1em] align-[-0.15em]" />
                  {locale === 'ru' ? 'Угадано' : 'Guessed'}: {gameState.wordsGuessed}
                </p>
                <p>
                  <AliasIcon name="cross" className="mr-1 inline-block h-[1em] w-[1em] align-[-0.15em]" />
                  {locale === 'ru' ? 'Пропущено' : 'Skipped'}: {gameState.wordsSkipped}
                </p>
              </div>
            ) : (
              <>
                <p className="text-3xl font-bold text-amber-400 mb-4">
                  {activeTeam?.name}: {gameState.wordsGuessed - gameState.wordsSkipped > 0 ? '+' : ''}
                  {gameState.wordsGuessed - gameState.wordsSkipped}
                </p>
                <div className="text-sm space-y-1 mb-4 text-white/70">
                  <p>
                    <AliasIcon name="check" className="mr-1 inline-block h-[1em] w-[1em] align-[-0.15em]" />
                    {locale === 'ru' ? 'Угадано' : 'Guessed'}: {gameState.wordsGuessed}
                  </p>
                  <p>
                    <AliasIcon name="cross" className="mr-1 inline-block h-[1em] w-[1em] align-[-0.15em]" />
                    {locale === 'ru' ? 'Пропущено' : 'Skipped'}: {gameState.wordsSkipped}
                  </p>
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
                      item.guessed
                        ? 'bg-green-500/30 text-white ring-1 ring-green-300/35'
                        : 'bg-white/10 text-white/55 ring-1 ring-white/10'
                    }`}
                  >
                    <span className={item.guessed ? 'font-semibold text-white' : 'text-white/65'}>
                      {locale === 'ru' ? item.word.ru : item.word.en}
                    </span>
                    <AliasIcon
                      name={item.guessed ? 'check' : 'cross'}
                      className="inline-block h-[1em] w-[1em] align-[-0.15em]"
                    />
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
          <GlassCard className="alias-card w-full max-w-md p-6 text-center">
            <div className="mb-3 flex justify-center">
              <AliasIcon name="trophy" className="h-12 w-12" />
            </div>
            <p className="text-xl font-bold mb-4 text-white">
              {locale === 'ru' ? 'Игра окончена!' : 'Game Over!'}
            </p>
            {gameState.teams
              .sort((a, b) => b.score - a.score)
              .map((team, i) => (
                <div
                  key={team.id}
                  className={`flex items-center justify-between gap-3 px-4 py-3 rounded-xl mb-2 ${
                    i === 0 ? 'bg-amber-500/10 outline outline-1 outline-amber-400' : 'bg-white/5'
                  }`}
                >
                  <span className="min-w-0 truncate text-base font-bold text-white">{team.name}</span>
                  <span className="text-2xl font-bold text-amber-400">{team.score}</span>
                </div>
              ))}
          </GlassCard>
          {isHost && (
            <div className="flex flex-col items-center gap-2">
              <GlassButton variant="primary" size="lg" onClick={() => startGame(gameState.mode)}>
                {locale === 'ru' ? 'Играть снова' : 'Play Again'}
              </GlassButton>
              <button
                type="button"
                onClick={backToModeSelect}
                className="text-sm text-white/50 hover:text-white/80"
              >
                {locale === 'ru' ? '← К выбору режима' : '← Back to mode select'}
              </button>
            </div>
          )}
        </div>
      )}
    </GameLayout>
  );
}
