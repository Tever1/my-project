'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';
import { GameSurface } from '@/components/games/GameSurface';
import { AliasIcon } from '@/components/games/AliasIcon';
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
  phase: 'modeSelect' | 'teamSelect' | 'individualSetup' | 'teamName' | 'letterRule' | 'waiting' | 'explaining' | 'turnResult' | 'finished';
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

function getAliasWordSizeClass(word: string): string {
  const longestTokenLength = Math.max(...word.trim().split(/\s+/).map((token) => token.length));
  if (longestTokenLength >= 18) return 'alias-word-size-xlong';
  if (longestTokenLength >= 14) return 'alias-word-size-long';
  if (longestTokenLength >= 11) return 'alias-word-size-medium';
  return '';
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
    <div className="alias-live-name-form">
      <div className="alias-live-name-card">
        <label htmlFor="alias-team-name">{locale === 'ru' ? 'НАПИШИТЕ НАЗВАНИЕ' : 'ENTER A NAME'}</label>
        <input
          id="alias-team-name"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && value.trim()) onSubmit(value);
          }}
          maxLength={9}
          placeholder={locale === 'ru' ? 'НАЗВАНИЕ' : 'TEAM NAME'}
          className="alias-live-name-input"
        />
        <i />
      </div>
      <button
        type="button"
        className="alias-live-primary"
        onClick={() => onSubmit(value)}
        disabled={!value.trim()}
      >
        {locale === 'ru' ? 'Готово' : 'Done'}
      </button>
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
  const [endConfirmOpen, setEndConfirmOpen] = useState(false);
  const [cardExitDirection, setCardExitDirection] = useState<'left' | 'right' | null>(null);
  const [visualWordIndex, setVisualWordIndex] = useState(-1);
  const [visualLetter, setVisualLetter] = useState('');

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cardMotionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingVisualWordRef = useRef(-1);
  const pendingVisualLetterRef = useRef('');
  const gameStateRef = useRef<AliasGameState | null>(null);
  const selectedModeRef = useRef<AliasMode | null>(null);
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
  const visualWord = visualWordIndex >= 0 ? ALIAS_WORDS[visualWordIndex] : currentWord;
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
        case 'alias:select-mode': {
          const mode = (payload as unknown as { mode: AliasMode }).mode;
          selectedModeRef.current = mode;
          setSelectedMode(mode);
          break;
        }
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
          } else if (isHostRef.current && selectedModeRef.current) {
            broadcast('alias:select-mode', { mode: selectedModeRef.current });
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

  useEffect(() => {
    if (cardExitDirection) {
      pendingVisualWordRef.current = gameState?.currentWordIndex ?? -1;
      pendingVisualLetterRef.current = gameState?.currentLetter ?? '';
      return;
    }
    setVisualWordIndex(gameState?.currentWordIndex ?? -1);
    setVisualLetter(gameState?.currentLetter ?? '');
  }, [gameState?.currentWordIndex, gameState?.currentLetter, cardExitDirection]);

  useEffect(() => {
    if (gameState?.phase === 'explaining') return;
    if (cardMotionTimerRef.current) clearTimeout(cardMotionTimerRef.current);
    cardMotionTimerRef.current = null;
    setCardExitDirection(null);
  }, [gameState?.phase]);

  useEffect(() => () => {
    if (cardMotionTimerRef.current) clearTimeout(cardMotionTimerRef.current);
  }, []);

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
      const assignedIds = new Set(prev.teams.flatMap((t) => t.playerIds));
      const hasUnassignedPlayers = players.some((player) => !assignedIds.has(player.id));
      const hasEmptyTeam = prev.teams.some((team) => team.playerIds.length === 0);
      if (hasUnassignedPlayers || hasEmptyTeam) return prev;

      const next: AliasGameState = {
        ...prev,
        phase: 'teamName',
        teamNameConfirmed: prev.teams.map(() => false),
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

  const continueIndividualSetup = useCallback(() => {
    setGameState((prev) => {
      if (!prev) return prev;
      const next: AliasGameState = { ...prev, phase: 'letterRule' };
      broadcast('alias:state', next);
      return next;
    });
  }, [broadcast]);

  const continueLetterRule = useCallback(() => {
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
        phase: 'individualSetup',
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
      currentLetter: gameState.currentLetter,
    };
    setGameState(updated);
    broadcast('alias:state', updated);
  }, [gameState, broadcast]);

  // ------------------------------------------------------------------
  // Host: finish turn (time's up)
  // ------------------------------------------------------------------

  const finishTurn = useCallback(
    (prev: AliasGameState) => {
      // Letter mode: the explainer's individual score is awarded live.
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
      currentLetter: gameState.mode === 'letter' ? pickRandomLetter(locale) : gameState.currentLetter,
    };
    setGameState(next);
    broadcast('alias:state', next);
  }, [gameState, broadcast, locale]);

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
      currentLetter: gameState.currentLetter,
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
      currentLetter: gameState.currentLetter,
    };
    setGameState(updated);
    broadcast('alias:state', updated);
  }, [isHost, gameState, broadcast]);

  // ------------------------------------------------------------------
  // Non-host actions forwarded to host
  // ------------------------------------------------------------------

  const emitAction = useCallback(
    (action: string) => {
      broadcast(action, {});
    },
    [broadcast],
  );

  const runWordAction = useCallback((direction: 'left' | 'right') => {
    if (cardExitDirection || gameState?.phase !== 'explaining') return;
    setCardExitDirection(direction);
    if (direction === 'left') {
      if (isHost) handleSkip();
      else emitAction('alias:skip');
    } else {
      if (isHost) handleGuessed();
      else emitAction('alias:guessed');
    }
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    cardMotionTimerRef.current = setTimeout(() => {
      setVisualWordIndex(pendingVisualWordRef.current);
      setVisualLetter(pendingVisualLetterRef.current);
      setCardExitDirection(null);
      cardMotionTimerRef.current = null;
    }, reducedMotion ? 20 : 360);
  }, [cardExitDirection, gameState?.phase, isHost, handleSkip, handleGuessed, emitAction]);

  useEffect(() => {
    if (!isHost) return;
    const cleanup = on('game:action', (data: unknown) => {
      const { action, payload, from } = data as { action: string; payload: Record<string, unknown>; from: string };
      if (action === 'alias:guessed') handleGuessed();
      if (action === 'alias:skip') handleSkip();
      if (action === 'alias:begin-turn') beginTurn();
      if (action === 'alias:next-turn') nextTurn();
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
      if (action === 'alias:continue-individual-setup') {
        continueIndividualSetup();
      }
      if (action === 'alias:continue-letter-rule') {
        continueLetterRule();
      }
    });
    return cleanup;
  }, [isHost, on, handleGuessed, handleSkip, beginTurn, nextTurn, broadcast, handleJoinTeam, handleRandomizeTeams, finalizeTeams, setTeamName, continueFromTeamNames, continueIndividualSetup, continueLetterRule]);

  // ------------------------------------------------------------------
  // End game
  // ------------------------------------------------------------------

  const endGame = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    emit('game:end', { code: roomId });
  }, [emit, roomId]);

  // Derived: players not yet in any team (for teamSelect)
  const assignedPlayerIds = gameState?.teams?.flatMap((t) => t.playerIds) ?? [];
  const unassignedPlayers = players.filter((p) => !assignedPlayerIds.includes(p.id));
  const mode = gameState?.mode ?? selectedMode ?? 'classic';
  const sortedTeams = gameState ? [...gameState.teams].sort((a, b) => b.score - a.score) : [];
  const winner = sortedTeams[0];
  const turnPoints = gameState
    ? gameState.mode === 'letter'
      ? gameState.wordsGuessed
      : gameState.wordsGuessed - gameState.wordsSkipped
    : 0;
  const guessedWords = gameState?.turnHistory.filter((item) => item.guessed) ?? [];
  const skippedWords = gameState?.turnHistory.filter((item) => !item.guessed) ?? [];
  const formatTime = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------

  return (
    <GameSurface className="alias-live-phone">
      <div className="alias-live-decor" aria-hidden="true">
        {Array.from({ length: 14 }, (_, index) => <i key={index} />)}
      </div>
      <header className="alias-live-header">
        <div className="alias-live-brand"><AliasIcon name="speech" className="h-7 w-7" /><span><b>{locale === 'ru' ? 'УГАДАЙ СЛОВО' : 'GUESS THE WORD'}</b><small>{mode === 'classic' ? (locale === 'ru' ? 'КЛАССИКА' : 'CLASSIC') : (locale === 'ru' ? 'НА БУКВУ' : 'LETTER MODE')}</small></span></div>
        {isHost && <button type="button" className="alias-live-end" onClick={() => setEndConfirmOpen(true)}>{locale === 'ru' ? 'ЗАВЕРШИТЬ' : 'END'}</button>}
      </header>
      <main className="alias-live-main">
      {/* ---- MODE SELECT ---- */}
      {(!gameState || gameState.phase === 'modeSelect') && (
        <section className="alias-live-screen alias-live-mode">
          <span className="alias-live-kicker">{locale === 'ru' ? `НОВАЯ ПАРТИЯ · ${players.length} ИГРОКОВ` : `NEW GAME · ${players.length} PLAYERS`}</span>
          <h1>{locale === 'ru' ? <>Выберите<br/>правила</> : <>Choose the<br/>rules</>}</h1>
          <div className="alias-live-mode-list">
            <button type="button" disabled={!isHost} className={selectedMode === 'classic' ? 'selected' : ''} onClick={() => { selectedModeRef.current = 'classic'; setSelectedMode('classic'); broadcast('alias:select-mode', { mode: 'classic' }); }}>
              <AliasIcon name="book" className="h-[30px] w-[30px]" /><span><b>{locale === 'ru' ? 'Классика' : 'Classic'}<em>{locale === 'ru' ? '4–10 игроков' : '4–10 players'}</em></b><small>{locale === 'ru' ? 'Две команды · 60 секунд' : 'Two teams · 60 seconds'}</small></span><i>{selectedMode === 'classic' ? '✓' : ''}</i>
            </button>
            <button type="button" disabled={!isHost} className={selectedMode === 'letter' ? 'selected' : ''} onClick={() => { selectedModeRef.current = 'letter'; setSelectedMode('letter'); broadcast('alias:select-mode', { mode: 'letter' }); }}>
              <AliasIcon name="letters" className="h-[30px] w-[30px]" /><span><b>{locale === 'ru' ? 'На букву' : 'Letter mode'}<em>{locale === 'ru' ? '2–10 игроков' : '2–10 players'}</em></b><small>{locale === 'ru' ? 'Каждый сам за себя · 90 секунд' : 'Every player for themselves · 90 seconds'}</small></span><i>{selectedMode === 'letter' ? '✓' : ''}</i>
            </button>
          </div>
          <div className="alias-live-avatars">{players.map((player) => <span key={player.id} title={player.nickname}>{player.nickname.slice(0, 1).toUpperCase()}</span>)}</div>
          {isHost ? <button type="button" className="alias-live-primary" onClick={() => selectedMode && startGame(selectedMode)} disabled={!selectedMode || players.length < (selectedMode === 'classic' ? 4 : 2)}>{locale === 'ru' ? 'НАЧАТЬ ИГРУ' : 'START GAME'} <span>→</span></button> : <div className="alias-live-wait"><i />{selectedMode ? (locale === 'ru' ? 'ОЖИДАЕМ ХОСТА' : 'WAITING FOR HOST') : (locale === 'ru' ? 'ХОСТ ВЫБИРАЕТ РЕЖИМ' : 'HOST IS CHOOSING')}</div>}
        </section>
      )}

      {/* ---- TEAM SELECT (classic mode only) ---- */}
      {gameState?.phase === 'teamSelect' && (
        <section className="alias-live-screen alias-live-teams">
          <span className="alias-live-kicker">{locale === 'ru' ? 'РАЗДЕЛИТЕСЬ НА ДВЕ КОМАНДЫ' : 'SPLIT INTO TWO TEAMS'}</span>
          <h1>{locale === 'ru' ? <>Выберите<br/>сторону</> : <>Choose<br/>a side</>}</h1>
          <div className="alias-live-team-grid">
            {gameState.teams.map((team, ti) => (
              <button
                type="button"
                key={team.id}
                className={team.playerIds.includes(myId) ? 'selected' : ''}
                onClick={() => {
                  if (isHost) handleJoinTeam(myId, ti);
                  else broadcast('alias:join-team', { teamIndex: ti, playerId: myId });
                }}
              >
                <small>{locale === 'ru' ? `КОМАНДА 0${ti + 1}` : `TEAM 0${ti + 1}`}</small><b>{team.name}</b>
                <div className="alias-live-team-members">
                  {team.playerIds.map((id) => {
                    const p = players.find((pl) => pl.id === id);
                    return <i key={id} title={p?.nickname ?? id}>{(p?.nickname ?? id).slice(0, 1).toUpperCase()}</i>;
                  })}
                  {team.playerIds.length === 0 && <em>{locale === 'ru' ? 'ПОКА НИКОГО' : 'NOBODY YET'}</em>}
                </div>
              </button>
            ))}
          </div>
          {unassignedPlayers.length > 0 && <div className="alias-live-unassigned"><span>{locale === 'ru' ? 'ЕЩЁ НЕ ВЫБРАЛИ' : 'NOT ASSIGNED'}</span>{unassignedPlayers.map((p) => <i key={p.id}>{p.nickname}</i>)}</div>}
          {isHost && (
            <div className="alias-live-stack-actions">
              <button type="button" className="alias-live-secondary" onClick={handleRandomizeTeams}><AliasIcon name="shuffle" className="h-5 w-5" />{locale === 'ru' ? 'РАСПРЕДЕЛИТЬ СЛУЧАЙНО' : 'RANDOMIZE TEAMS'}</button>
              <button type="button" className="alias-live-primary" onClick={finalizeTeams} disabled={unassignedPlayers.length > 0 || gameState.teams.some((team) => team.playerIds.length === 0)}>{locale === 'ru' ? 'ПРОДОЛЖИТЬ' : 'CONTINUE'} <span>→</span></button>
            </div>
          )}
          {!isHost && <p className="alias-live-note">{locale === 'ru' ? 'Нажмите на карточку команды, чтобы вступить' : 'Tap a team card to join'}</p>}
        </section>
      )}

      {gameState?.phase === 'individualSetup' && (
        <section className="alias-live-screen alias-live-individual">
          <span className="alias-live-kicker">{locale === 'ru' ? 'ЛИЧНАЯ ИГРА · КАЖДЫЙ САМ ЗА СЕБЯ' : 'INDIVIDUAL GAME · EVERY PLAYER FOR THEMSELVES'}</span><h1>{locale === 'ru' ? <>Все<br/>в сборе</> : <>Everyone<br/>is ready</>}</h1>
          <div className="alias-live-player-list">{gameState.teams.map((team, index) => <article key={team.id}><span>{index + 1}</span><i>{team.name.slice(0, 1).toUpperCase()}</i><b>{team.name}</b><small>{index === 0 ? (locale === 'ru' ? 'ПЕРВАЯ' : 'FIRST') : (locale === 'ru' ? 'ГОТОВ' : 'READY')}</small></article>)}</div>
          {isHost ? <button type="button" className="alias-live-primary" onClick={continueIndividualSetup}>{locale === 'ru' ? 'ПРОДОЛЖИТЬ' : 'CONTINUE'} <span>→</span></button> : <div className="alias-live-wait"><i />{locale === 'ru' ? 'ХОСТ ПРОВЕРЯЕТ ПОРЯДОК' : 'HOST CHECKS THE ORDER'}</div>}
        </section>
      )}

      {/* ---- TEAM NAME (classic mode only) ---- */}
      {gameState?.phase === 'teamName' && (
        <section className="alias-live-screen alias-live-names">
          <span className="alias-live-kicker">{isTeamNamer ? (locale === 'ru' ? `ВЫ НАЗЫВАЕТЕ КОМАНДУ 0${myTeamIndex + 1}` : `YOU NAME TEAM 0${myTeamIndex + 1}`) : (locale === 'ru' ? 'КОМАНДЫ ВЫБИРАЮТ НАЗВАНИЯ' : 'TEAMS ARE CHOOSING NAMES')}</span>
          <h1>{locale === 'ru' ? <>Имя<br/>команды</> : <>Team<br/>name</>}</h1>
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
            <div className="alias-live-name-wait">
              <AliasIcon name="hourglass" className="h-8 w-8" />
              <p>
              {myTeamIndex >= 0 && teamNameConfirmed[myTeamIndex]
                ? (locale === 'ru' ? 'Ждём вторую команду…' : 'Waiting for the other team…')
                : (locale === 'ru' ? 'Капитан команды выбирает имя…' : 'Your captain is naming the team…')}
              </p>
            </div>
          )}
          <div className="alias-live-name-status">{gameState.teams.map((team, ti) => { const namerId = firstConnectedInTeam(team); const namerName = players.find((p) => p.id === namerId)?.nickname ?? '...'; return <article key={team.id} className={ti === myTeamIndex ? 'active' : ''}><span>{locale === 'ru' ? `КОМАНДА 0${ti + 1}` : `TEAM 0${ti + 1}`}</span><b>{team.name}</b><small>{teamNameConfirmed[ti] ? (locale === 'ru' ? 'ИМЯ ВЫБРАНО ✓' : 'NAME SET ✓') : (locale === 'ru' ? `${namerName} выбирает…` : `${namerName} is naming…`)}</small></article>; })}</div>
          {isHost && (
            <button type="button" className="alias-live-secondary" onClick={continueFromTeamNames}>{locale === 'ru' ? 'ПРОДОЛЖИТЬ' : 'CONTINUE'} <span>→</span></button>
          )}
        </section>
      )}

      {gameState?.phase === 'letterRule' && (
        <section className="alias-live-screen alias-live-letter-rule-screen">
          <span className="alias-live-kicker">{locale === 'ru' ? 'ПРАВИЛО РАУНДА' : 'ROUND RULE'}</span><h1>{locale === 'ru' ? <>Только<br/>на букву</> : <>Only words<br/>with the letter</>}</h1>
          <div className="alias-live-letter-rule"><small>{locale === 'ru' ? 'ОБЪЯСНЯЙТЕ СЛОВА, ИСПОЛЬЗУЯ СЛОВА НА' : 'EXPLAIN USING WORDS THAT START WITH'}</small><b>{gameState.currentLetter}</b><span>{locale === 'ru' ? 'Буква меняется каждый ход' : 'The letter changes every turn'}</span></div>
          <article className="alias-live-rule-note"><AliasIcon name="hourglass" className="h-7 w-7" /><span><b>90 {locale === 'ru' ? 'секунд' : 'seconds'}</b><small>{locale === 'ru' ? 'Пропуск без штрафа' : 'Skip without penalty'}</small></span></article>
          {isHost ? <button type="button" className="alias-live-primary" onClick={continueLetterRule}>{locale === 'ru' ? 'ПОНЯТНО' : 'GOT IT'} <span>→</span></button> : <div className="alias-live-wait"><i />{locale === 'ru' ? 'ОЖИДАЕМ ХОСТА' : 'WAITING FOR HOST'}</div>}
        </section>
      )}

      {/* ---- WAITING FOR EXPLAINER TO START ---- */}
      {gameState?.phase === 'waiting' && (
        <section className="alias-live-screen alias-live-ready">
          <span className="alias-live-kicker">{locale === 'ru' ? `РАУНД ${gameState.round} · ${gameState.mode === 'classic' ? `ХОД КОМАНДЫ «${activeTeam?.name ?? ''}»` : 'ЛИЧНЫЙ ХОД'}` : `ROUND ${gameState.round} · ${gameState.mode === 'classic' ? `${activeTeam?.name ?? ''} TURN` : 'INDIVIDUAL TURN'}`}</span>
          <div className="alias-live-ready-deck"><i /><i /><article><AliasIcon name="mic" className="h-11 w-11" /><small>{locale === 'ru' ? 'СЕЙЧАС ОБЪЯСНЯЕТ' : 'NOW EXPLAINING'}</small><b>{explainer?.nickname ?? '...'}</b>{gameState.mode === 'letter' && <em>{locale === 'ru' ? 'БУКВА ОТКРОЕТСЯ ПОСЛЕ СТАРТА' : 'THE LETTER APPEARS AFTER START'}</em>}</article></div>
          <p>{isExplainer ? (locale === 'ru' ? 'Возьмите телефон так, чтобы остальные не видели карточки.' : 'Hold the phone so nobody else can see the cards.') : (locale === 'ru' ? 'Передайте телефон объясняющему.' : 'Pass the phone to the explainer.')}</p>
          {isExplainer ? (
            <button type="button" className="alias-live-primary tall" onClick={() => (isHost ? beginTurn() : emitAction('alias:begin-turn'))}>{locale === 'ru' ? 'НАЧАТЬ ХОД!' : 'START TURN!'}</button>
          ) : (
            <div className="alias-live-wait"><i />{locale === 'ru' ? `ЖДЁМ: ${explainer?.nickname ?? '...'}` : `WAITING: ${explainer?.nickname ?? '...'}`}</div>
          )}
        </section>
      )}

      {/* ---- EXPLAINING PHASE ---- */}
      {gameState?.phase === 'explaining' && (
        <section className="alias-live-screen alias-live-playing">
          <div className="alias-live-roundline"><span>{locale === 'ru' ? `РАУНД ${gameState.round} · ${gameState.mode === 'classic' ? activeTeam?.name ?? '' : explainer?.nickname ?? ''}` : `ROUND ${gameState.round} · ${gameState.mode === 'classic' ? activeTeam?.name ?? '' : explainer?.nickname ?? ''}`}</span><b>{isExplainer ? (locale === 'ru' ? 'ОБЪЯСНЯЕТЕ ВЫ' : 'YOU EXPLAIN') : (locale === 'ru' ? 'ХОД ИДЁТ' : 'TURN IN PROGRESS')}</b></div>

          {/* Word / guess card */}
          {isExplainer && visualWord ? (
            <div className="alias-live-card-stack">
              <i /><i />
              <article key={visualWordIndex} className={cardExitDirection ? `exiting-${cardExitDirection}` : ''} aria-live="polite">
                <div className="alias-live-card-meta"><span>{gameState.mode === 'letter' ? `${locale === 'ru' ? 'СЛОВО · БУКВА' : 'WORD · LETTER'} ${visualLetter}` : `${locale === 'ru' ? 'СЛОВО' : 'WORD'} ${String(gameState.wordsGuessed + gameState.wordsSkipped + 1).padStart(2, '0')}`}</span><AliasIcon name={gameState.mode === 'letter' ? 'letters' : 'talk'} className="h-8 w-8" /></div>
                {gameState.mode === 'letter' && <em>{visualLetter}</em>}
                <h1 className={getAliasWordSizeClass(locale === 'ru' ? visualWord.ru : visualWord.en)}>{locale === 'ru' ? visualWord.ru : visualWord.en}</h1>
                <div className="alias-live-guessers"><small>{locale === 'ru' ? 'УГАДЫВАЮТ' : 'GUESSING'}</small><div>{aliasGuessers.map((player) => <i key={player.id} title={player.nickname}>{player.nickname.slice(0, 1).toUpperCase()}</i>)}</div></div>
              </article>
            </div>
          ) : (
            <div className="alias-live-listen-card"><AliasIcon name="talk" className="h-16 w-16" /><small>{locale === 'ru' ? `${explainer?.nickname ?? '...'} ОБЪЯСНЯЕТ ${gameState.mode === 'classic' && !isMyTeamActive ? 'ДРУГОЙ КОМАНДЕ' : 'СЛОВО'}` : `${explainer?.nickname ?? '...'} IS EXPLAINING`}</small><h1>{gameState.mode === 'classic' && !isMyTeamActive ? (locale === 'ru' ? <>Ход другой<br/>команды</> : <>Other team&apos;s<br/>turn</>) : (locale === 'ru' ? <>Угадывайте<br/>вслух!</> : <>Guess out<br/>loud!</>)}</h1>{gameState.mode === 'letter' && <em>{locale === 'ru' ? 'БУКВА' : 'LETTER'} · {gameState.currentLetter}</em>}</div>
          )}

          <div className={`alias-live-timebar${gameState.timeLeft <= 10 ? ' danger' : ''}`}><div><i style={{ width: `${(gameState.timeLeft / (gameState.mode === 'letter' ? TURN_DURATION_LETTER : TURN_DURATION_CLASSIC)) * 100}%` }} /></div><span>{formatTime(gameState.timeLeft)}</span></div>
          <div className="alias-live-action-slot">
            {isExplainer ? (
              <div className="alias-live-action-row">
                <button type="button" disabled={cardExitDirection !== null} onClick={() => runWordAction('left')}><AliasIcon name="cross" className="h-6 w-6" /><span><b>{locale === 'ru' ? 'ПРОПУСТИТЬ' : 'SKIP'}</b><small>{gameState.mode === 'letter' ? (locale === 'ru' ? 'БЕЗ ШТРАФА' : 'NO PENALTY') : (locale === 'ru' ? '−1 ОЧКО' : '−1 POINT')}</small></span></button>
                <button type="button" disabled={cardExitDirection !== null} onClick={() => runWordAction('right')}><AliasIcon name="check" className="h-6 w-6" /><span><b>{locale === 'ru' ? 'УГАДАЛИ' : 'GUESSED'}</b><small>{locale === 'ru' ? '+1 ОЧКО' : '+1 POINT'}</small></span></button>
              </div>
            ) : (
              <div className="alias-live-counters"><span><AliasIcon name="check" className="h-5 w-5" />{locale === 'ru' ? 'УГАДАНО' : 'GUESSED'} <b>{gameState.wordsGuessed}</b></span><span><AliasIcon name="cross" className="h-5 w-5" />{locale === 'ru' ? 'ПРОПУЩЕНО' : 'SKIPPED'} <b>{gameState.wordsSkipped}</b></span></div>
            )}
          </div>
        </section>
      )}

      {/* ---- TURN RESULT ---- */}
      {gameState?.phase === 'turnResult' && (
        <section className="alias-live-screen alias-live-result">
          <span className="alias-live-kicker">{locale === 'ru' ? 'ХОД ЗАВЕРШЁН' : 'TURN COMPLETE'}</span><h1>{locale === 'ru' ? <>Отличная<br/>работа!</> : <>Great<br/>work!</>}</h1>
          <div className="alias-live-result-score"><small>{gameState.mode === 'classic' ? activeTeam?.name : explainer?.nickname}</small><b>{turnPoints > 0 ? '+' : ''}{turnPoints}</b><span>{locale === 'ru' ? 'ОЧКОВ ЗА ХОД' : 'POINTS THIS TURN'}</span></div>
          <div className="alias-live-result-stats"><span><i>✓</i><b>{gameState.wordsGuessed}</b><small>{locale === 'ru' ? 'УГАДАНО' : 'GUESSED'}</small></span><span><i>×</i><b>{gameState.wordsSkipped}</b><small>{locale === 'ru' ? 'ПРОПУЩЕНО' : 'SKIPPED'}</small></span></div>
          {gameState.turnHistory.length > 0 && <div className="alias-live-word-ledger"><article><b><i>✓</i>{locale === 'ru' ? 'УГАДАНЫ' : 'GUESSED'} · {guessedWords.length}</b><div>{guessedWords.map((item, index) => <span key={`${item.word.ru}-${index}`}>{locale === 'ru' ? item.word.ru : item.word.en}</span>)}</div></article><article className="skipped"><b><i>×</i>{locale === 'ru' ? 'ПРОПУЩЕНЫ' : 'SKIPPED'} · {skippedWords.length}</b><div>{skippedWords.map((item, index) => <span key={`${item.word.ru}-${index}`}>{locale === 'ru' ? item.word.ru : item.word.en}</span>)}</div></article></div>}
          {isHost ? <button type="button" className="alias-live-primary" onClick={nextTurn}>{locale === 'ru' ? 'СЛЕДУЮЩИЙ ХОД' : 'NEXT TURN'} <span>→</span></button> : <div className="alias-live-wait"><i />{locale === 'ru' ? 'ВЕДУЩИЙ ПРОДОЛЖИТ ИГРУ' : 'HOST WILL CONTINUE'}</div>}
        </section>
      )}

      {/* ---- FINISHED ---- */}
      {gameState?.phase === 'finished' && (
        <section className="alias-live-screen alias-live-finished">
          <span className="alias-live-kicker">{locale === 'ru' ? 'ИГРА ОКОНЧЕНА' : 'GAME OVER'}</span>
          <div className="alias-live-winner"><AliasIcon name="trophy" className="h-16 w-16" /><small>{locale === 'ru' ? 'ПОБЕДИТЕЛЬ' : 'WINNER'}</small><b>{winner?.name ?? '—'}</b><strong>{winner?.score ?? 0}</strong><span>{locale === 'ru' ? 'ОЧКОВ' : 'POINTS'}</span></div>
          <div className="alias-live-final-list">{sortedTeams.slice(0, 6).map((team, index) => <article key={team.id}><span>{index + 1}</span><b>{team.name}</b><strong>{team.score}</strong></article>)}</div>
          {isHost && (
            <><button type="button" className="alias-live-primary" onClick={() => startGame(gameState.mode)}>{locale === 'ru' ? 'ИГРАТЬ СНОВА' : 'PLAY AGAIN'}</button><button type="button" className="alias-live-link" onClick={backToModeSelect}>{locale === 'ru' ? '← К ВЫБОРУ РЕЖИМА' : '← BACK TO MODE SELECT'}</button></>
          )}
        </section>
      )}
      </main>
      <footer className="alias-live-footer"><b>{gameState?.teams.length ? (gameState.mode === 'letter' ? sortedTeams : sortedTeams.slice(0, 2)).map((team) => `${team.name} ${team.score}`).join(' · ') : ''}</b></footer>
      {endConfirmOpen && <div className="alias-live-modal" role="dialog" aria-modal="true"><div><span className="alias-live-kicker">{locale === 'ru' ? 'ЗАВЕРШИТЬ ПАРТИЮ?' : 'END THE GAME?'}</span><h2>{locale === 'ru' ? 'Закрыть мастерскую' : 'Close the workshop'}</h2><p>{locale === 'ru' ? 'Все игроки вернутся в лобби, а прогресс будет потерян.' : 'Everyone will return to the lobby and progress will be lost.'}</p><button type="button" className="alias-live-danger" onClick={endGame}>{locale === 'ru' ? 'ДА, ЗАВЕРШИТЬ' : 'YES, END'}</button><button type="button" className="alias-live-secondary" onClick={() => setEndConfirmOpen(false)}>{locale === 'ru' ? 'ОТМЕНА' : 'CANCEL'}</button></div></div>}
    </GameSurface>
  );
}
