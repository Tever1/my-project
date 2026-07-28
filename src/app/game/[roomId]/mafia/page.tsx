'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSocket } from '@/lib/use-socket';
import { useRoomState } from '@/lib/use-room-state';
import { useGameBroadcast } from '@/lib/use-game-action';
import { useNavigateOnGameEnd } from '@/lib/use-navigate-on-game-end';
import { useTranslation } from '@/lib/i18n';
import { useGameIdentity } from '@/lib/use-game-identity';
import { GameLayout } from '@/components/games/GameLayout';
import { BreathingPlaceholder } from '@/components/ingame';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { MafiaRole, MafiaPhase, MafiaVoteResult, MafiaVoteRound } from '@/types/game';
import { Player } from '@/types/room';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MafiaGameState {
  phase: 'lobby' | 'role-reveal' | MafiaPhase;
  roles: Record<string, MafiaRole>;
  alive: string[];
  eliminated: { id: string; role: MafiaRole }[];
  mafiaVotes: Record<string, string>; // mafiaId -> targetId
  maniacKill: string | null; // targetId killed by maniac this night
  donCheck: string | null; // targetId checked by Don this night
  donCheckResult: boolean | null;
  loverVisit: string | null; // targetId visited by lover this night
  detectiveCheck: string | null; // targetId checked this night
  detectiveResult: MafiaRole | null;
  doctorSave: string | null; // targetId saved this night
  lastDoctorSave: string | null;
  lastLoverVisit: string | null;
  dayTimer: number;
  votes: Record<string, string>; // voterId -> targetId
  votingRound: MafiaVoteRound;
  votingCandidates: string[];
  lastVoteResult: MafiaVoteResult;
  lastVoteTargetIds: string[];
  lastNightKill: string | null;
  lastNightKills: string[];
  lastNightSaved: boolean;
  winner: 'mafia' | 'citizens' | 'maniac' | null;
  round: number;
}

type GameAction =
  | { type: 'start-game' }
  | { type: 'sync-state'; state: MafiaGameState }
  | { type: 'request-state' }
  | { type: 'assign-roles'; roles: Record<string, MafiaRole> }
  | { type: 'start-night' }
  | { type: 'mafia-vote'; voterId: string; targetId: string }
  | { type: 'maniac-kill'; maniacId: string; targetId: string | null }
  | { type: 'don-check-sheriff'; donId: string; targetId: string }
  | { type: 'don-check-result'; isDetective: boolean; donId: string; targetId: string }
  | { type: 'lover-visit'; loverId: string; targetId: string }
  | { type: 'detective-check'; detectiveId: string; targetId: string }
  | { type: 'detective-result'; role: MafiaRole; detectiveId: string }
  | { type: 'doctor-save'; doctorId: string; targetId: string }
  | { type: 'resolve-night' }
  | { type: 'night-result'; killedId: string | null; killedIds?: string[]; saved: boolean; savedIds?: string[]; lastDoctorSave: string | null; lastLoverVisit: string | null }
  | { type: 'start-voting' }
  | { type: 'cast-vote'; voterId: string; targetId: string }
  | { type: 'vote-alibi'; playerId: string }
  | { type: 'vote-tie'; round: MafiaVoteRound; candidates: string[] }
  | { type: 'vote-pardoned'; playerIds: string[] }
  | { type: 'resolve-votes' }
  | { type: 'eliminate'; playerId: string; role: MafiaRole }
  | { type: 'eliminate-many'; playerIds: string[]; roles: Record<string, MafiaRole> }
  | { type: 'game-over'; winner: 'mafia' | 'citizens' | 'maniac' }
  | { type: 'end-game' };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ROLE_LABELS: Record<MafiaRole, { ru: string; en: string }> = {
  citizen: { ru: 'Мирный', en: 'Citizen' },
  mafia: { ru: 'Мафия', en: 'Mafia' },
  don: { ru: 'Дон', en: 'Don' },
  maniac: { ru: 'Маньяк', en: 'Maniac' },
  detective: { ru: 'Детектив', en: 'Detective' },
  doctor: { ru: 'Доктор', en: 'Doctor' },
  lover: { ru: 'Любовница', en: 'Lover' },
};

const ROLE_ICONS: Record<MafiaRole, string> = {
  citizen: '👤',
  mafia: '🔫',
  don: '🎩',
  maniac: '🪓',
  detective: '🔍',
  doctor: '💉',
  lover: '💋',
};

function isMafiaRole(role: MafiaRole | undefined): boolean {
  return role === 'mafia' || role === 'don';
}

function hasExpandedRoles(roles: Record<string, MafiaRole>): boolean {
  return Object.values(roles).some((role) => role === 'don' || role === 'maniac' || role === 'lover');
}

function countVotes(votes: string[]): Record<string, number> {
  return votes.reduce<Record<string, number>>((acc, targetId) => {
    acc[targetId] = (acc[targetId] || 0) + 1;
    return acc;
  }, {});
}

function getTopVoteIds(voteCounts: Record<string, number>): string[] {
  const entries = Object.entries(voteCounts);
  if (entries.length === 0) return [];
  const maxVotes = Math.max(...entries.map(([, count]) => count));
  return entries
    .filter(([, count]) => count === maxVotes)
    .map(([id]) => id);
}

function getSingleVoteLeader(voteCounts: Record<string, number>): string | null {
  const topIds = getTopVoteIds(voteCounts);
  return topIds.length === 1 ? topIds[0] : null;
}

function assignRoles(playerIds: string[]): Record<string, MafiaRole> {
  const shuffled = [...playerIds].sort(() => Math.random() - 0.5);
  const roles: Record<string, MafiaRole> = {};
  const count = shuffled.length;

  const mafiaCount = count >= 15 ? 4 : count >= 12 ? 3 : count >= 6 ? 2 : 1;
  const hasDetective = count >= 4;
  const hasDoctor = count >= 7;
  const hasDon = count >= 10;
  const hasManiac = count >= 10;
  const hasLover = count >= 12;

  let idx = 0;
  if (hasDon) {
    roles[shuffled[idx++]] = 'don';
  }
  for (let m = 0; m < mafiaCount; m++) {
    roles[shuffled[idx++]] = 'mafia';
  }
  if (hasManiac) {
    roles[shuffled[idx++]] = 'maniac';
  }
  if (hasDetective) {
    roles[shuffled[idx++]] = 'detective';
  }
  if (hasDoctor) {
    roles[shuffled[idx++]] = 'doctor';
  }
  if (hasLover) {
    roles[shuffled[idx++]] = 'lover';
  }
  while (idx < count) {
    roles[shuffled[idx++]] = 'citizen';
  }
  return roles;
}

function checkWin(
  alive: string[],
  roles: Record<string, MafiaRole>,
): 'mafia' | 'citizens' | 'maniac' | null {
  if (alive.length === 1 && roles[alive[0]] === 'maniac') return 'maniac';
  const aliveMafia = alive.filter((id) => isMafiaRole(roles[id])).length;
  const aliveManiacs = alive.filter((id) => roles[id] === 'maniac').length;
  const aliveOthers = alive.length - aliveMafia;
  if (aliveMafia === 0 && aliveManiacs === 0) return 'citizens';
  if (aliveMafia >= aliveOthers) return 'mafia';
  return null;
}

function getInitialState(): MafiaGameState {
  return {
    phase: 'lobby',
    roles: {},
    alive: [],
    eliminated: [],
    mafiaVotes: {},
    maniacKill: null,
    donCheck: null,
    donCheckResult: null,
    detectiveCheck: null,
    detectiveResult: null,
    loverVisit: null,
    doctorSave: null,
    lastDoctorSave: null,
    lastLoverVisit: null,
    dayTimer: 0,
    votes: {},
    votingRound: 1,
    votingCandidates: [],
    lastVoteResult: null,
    lastVoteTargetIds: [],
    lastNightKill: null,
    lastNightKills: [],
    lastNightSaved: false,
    winner: null,
    round: 0,
  };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function MafiaPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const router = useRouter();
  const { emit, on, isConnected } = useSocket();
  const { locale } = useTranslation();
  const { user, effectivePlayerId, isGameHost } = useGameIdentity(roomId);
  useNavigateOnGameEnd(roomId, user ? 'lobby' : 'phone');

  const [players, setPlayers] = useState<Player[]>([]);
  const [gs, setGs] = useState<MafiaGameState>(getInitialState);
  const [roleRevealed, setRoleRevealed] = useState(false);
  const [nightActionDone, setNightActionDone] = useState(false);
  const [dayTimerValue, setDayTimerValue] = useState(60);
  // Cache of id→nickname that only grows — survives player disconnection
  const [nicknameCache, setNicknameCache] = useState<Record<string, string>>({});

  const myRole = effectivePlayerId ? gs.roles[effectivePlayerId] : undefined;
  const amAlive = effectivePlayerId ? gs.alive.includes(effectivePlayerId) : false;
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const gsRef = useRef<MafiaGameState>(getInitialState());

  const playerName = useCallback(
    (id: string) => nicknameCache[id] ?? players.find((p) => p.id === id)?.nickname ?? id,
    [nicknameCache, players],
  );

  // -----------------------------------------------------------------------
  // Broadcast helper
  // -----------------------------------------------------------------------
  const broadcast = useGameBroadcast(roomId, 'mafia') as (payload: GameAction) => void;

  const requestState = useCallback(() => {
    if (gsRef.current.phase === 'lobby') return;
    broadcast({ type: 'request-state' });
  }, [broadcast]);

  useEffect(() => {
    gsRef.current = gs;
  }, [gs]);

  useEffect(() => {
    requestState();

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        requestState();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [requestState]);

  // -----------------------------------------------------------------------
  // Listen for room state (players list)
  // -----------------------------------------------------------------------
  useRoomState(roomId, (data) => {
    const room = data as { players?: Player[] };
    if (room.players) {
      // Populate cache — never evict so disconnected players keep their name
      setNicknameCache((prev) => {
        const next = { ...prev };
        room.players!.forEach(p => { next[p.id] = p.nickname; });
        return next;
      });
      setPlayers(room.players);
    }
  });

  // -----------------------------------------------------------------------
  // Listen for game actions
  // -----------------------------------------------------------------------
  useEffect(() => {
    const cleanup = on('game:action', (data: unknown) => {
      const { action, payload } = data as {
        action: string;
        payload: GameAction;
        from: string;
      };
      if (action !== 'mafia') return;

      switch (payload.type) {
        case 'sync-state':
          setGs(payload.state);
          setNightActionDone(false);
          break;

        case 'request-state':
          if (isGameHost) {
            broadcast({ type: 'sync-state', state: gsRef.current });
          }
          break;

        case 'assign-roles':
          setGs((prev) => ({
            ...prev,
            phase: 'role-reveal',
            roles: payload.roles,
            alive: Object.keys(payload.roles),
            round: 1,
            votingRound: 1,
            votingCandidates: [],
            lastVoteResult: null,
            lastVoteTargetIds: [],
          }));
          setRoleRevealed(false);
          break;

        case 'start-night':
          setGs((prev) => ({
            ...prev,
            phase: 'night',
            mafiaVotes: {},
            maniacKill: null,
            donCheck: null,
            donCheckResult: null,
            detectiveCheck: null,
            detectiveResult: null,
            loverVisit: null,
            doctorSave: null,
            votingRound: 1,
            votingCandidates: [],
            lastVoteResult: null,
            lastVoteTargetIds: [],
          }));
          setNightActionDone(false);
          break;

        case 'mafia-vote':
          // Accumulate on host so handleResolveNight has all votes
          if (isGameHost) {
            setGs((prev) => ({
              ...prev,
              mafiaVotes: { ...prev.mafiaVotes, [payload.voterId]: payload.targetId },
            }));
          }
          break;

        case 'maniac-kill':
          if (isGameHost) {
            setGs((prev) => ({ ...prev, maniacKill: payload.targetId }));
          }
          break;

        case 'don-check-sheriff':
          if (isGameHost) {
            setGs((prev) => ({ ...prev, donCheck: payload.targetId }));
          }
          break;

        case 'don-check-result':
          if (effectivePlayerId === payload.donId) {
            setGs((prev) => ({
              ...prev,
              donCheck: payload.targetId,
              donCheckResult: payload.isDetective,
            }));
          }
          break;

        case 'lover-visit':
          if (isGameHost) {
            setGs((prev) => ({ ...prev, loverVisit: payload.targetId }));
          }
          break;

        case 'detective-check':
          // All clients store this so host has it for resolve night;
          // detective already set it locally in handleDetectiveCheck
          setGs((prev) => ({ ...prev, detectiveCheck: payload.targetId }));
          break;

        case 'doctor-save':
          // Accumulate on host so handleResolveNight can check the save
          if (isGameHost) {
            setGs((prev) => ({ ...prev, doctorSave: payload.targetId }));
          }
          break;

        case 'cast-vote':
          // Day vote — everyone accumulates for live tally
          setGs((prev) => ({
            ...prev,
            votes: { ...prev.votes, [payload.voterId]: payload.targetId },
          }));
          break;

        case 'detective-result':
          // Only the detective processes this result
          if (effectivePlayerId === payload.detectiveId) {
            setGs((prev) => ({
              ...prev,
              detectiveResult: payload.role,
            }));
          }
          break;

        case 'night-result': {
          const killedIds = payload.killedIds ?? (payload.killedId ? [payload.killedId] : []);
          setGs((prev) => ({
            ...prev,
            phase: 'day',
            lastNightKill: payload.killedId,
            lastNightKills: killedIds,
            lastNightSaved: payload.saved,
            lastDoctorSave: payload.lastDoctorSave,
            lastLoverVisit: payload.lastLoverVisit,
            alive: killedIds.length > 0
              ? prev.alive.filter((id) => !killedIds.includes(id))
              : prev.alive,
            eliminated: killedIds.length > 0
              ? [
                  ...prev.eliminated,
                  ...killedIds.map((id) => ({ id, role: prev.roles[id] })),
                ]
              : prev.eliminated,
            dayTimer: 60,
            votes: {},
            votingRound: 1,
            votingCandidates: [],
            lastVoteResult: null,
            lastVoteTargetIds: [],
          }));
          setDayTimerValue(60);
          break;
        }

        case 'start-voting':
          setGs((prev) => ({
            ...prev,
            phase: 'voting',
            votes: {},
            votingRound: 1,
            votingCandidates: [],
            lastVoteResult: null,
            lastVoteTargetIds: [],
          }));
          break;

        case 'vote-alibi':
          setGs((prev) => ({
            ...prev,
            phase: 'results',
            votes: {},
            votingRound: 1,
            votingCandidates: [],
            lastVoteResult: 'alibi',
            lastVoteTargetIds: [payload.playerId],
          }));
          break;

        case 'vote-tie':
          setGs((prev) => ({
            ...prev,
            phase: 'voting',
            votes: {},
            votingRound: payload.round,
            votingCandidates: payload.candidates,
            lastVoteResult: null,
            lastVoteTargetIds: payload.candidates,
          }));
          break;

        case 'vote-pardoned':
          setGs((prev) => ({
            ...prev,
            phase: 'results',
            votes: {},
            votingRound: 1,
            votingCandidates: [],
            lastVoteResult: 'pardoned',
            lastVoteTargetIds: payload.playerIds,
          }));
          break;

        case 'eliminate':
          setGs((prev) => ({
            ...prev,
            phase: 'results',
            alive: prev.alive.filter((id) => id !== payload.playerId),
            eliminated: [
              ...prev.eliminated,
              { id: payload.playerId, role: payload.role },
            ],
            votes: {},
            votingRound: 1,
            votingCandidates: [],
            lastVoteResult: 'eliminated',
            lastVoteTargetIds: [payload.playerId],
          }));
          break;

        case 'eliminate-many':
          setGs((prev) => ({
            ...prev,
            phase: 'results',
            alive: prev.alive.filter((id) => !payload.playerIds.includes(id)),
            eliminated: [
              ...prev.eliminated,
              ...payload.playerIds.map((id) => ({ id, role: payload.roles[id] })),
            ],
            votes: {},
            votingRound: 1,
            votingCandidates: [],
            lastVoteResult: 'eliminated',
            lastVoteTargetIds: payload.playerIds,
          }));
          break;

        case 'game-over':
          setGs((prev) => ({ ...prev, winner: payload.winner, phase: 'results' }));
          break;

        case 'end-game':
          setGs(getInitialState());
          break;
      }
    });
    return cleanup;
  }, [on, isGameHost, effectivePlayerId, broadcast]);

  // -----------------------------------------------------------------------
  // Day timer
  // -----------------------------------------------------------------------
  const isDayTimerActive = dayTimerValue > 0;
  useEffect(() => {
    if (gs.phase === 'day' && isDayTimerActive) {
      timerRef.current = setInterval(() => {
        setDayTimerValue((v) => {
          if (v <= 1) {
            clearInterval(timerRef.current!);
            return 0;
          }
          return v - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [gs.phase, isDayTimerActive]);

  // -----------------------------------------------------------------------
  // Host: start game
  // -----------------------------------------------------------------------
  const handleStart = () => {
    const playerIds = players.map((p) => p.id);
    const roles = assignRoles(playerIds);
    broadcast({ type: 'assign-roles', roles });
  };

  // -----------------------------------------------------------------------
  // Host: advance to night
  // -----------------------------------------------------------------------
  const handleStartNight = () => {
    broadcast({ type: 'start-night' });
  };

  // -----------------------------------------------------------------------
  // Night actions
  // -----------------------------------------------------------------------
  const handleMafiaVote = (targetId: string) => {
    if (!effectivePlayerId || !isConnected) return;
    broadcast({ type: 'mafia-vote', voterId: effectivePlayerId, targetId });
    // Update local state immediately for instant UI feedback
    setGs((prev) => ({
      ...prev,
      mafiaVotes: { ...prev.mafiaVotes, [effectivePlayerId]: targetId },
    }));
    setNightActionDone(true);
  };

  const handleDetectiveCheck = (targetId: string) => {
    if (!effectivePlayerId || !isConnected) return;
    broadcast({ type: 'detective-check', detectiveId: effectivePlayerId, targetId });
    setGs((prev) => ({ ...prev, detectiveCheck: targetId }));
    setNightActionDone(true);
  };

  const handleDoctorSave = (targetId: string) => {
    if (!effectivePlayerId || !isConnected) return;
    broadcast({ type: 'doctor-save', doctorId: effectivePlayerId, targetId });
    setGs((prev) => ({ ...prev, doctorSave: targetId }));
    setNightActionDone(true);
  };

  const handleManiacKill = (targetId: string | null) => {
    if (!effectivePlayerId || !isConnected) return;
    broadcast({ type: 'maniac-kill', maniacId: effectivePlayerId, targetId });
    setGs((prev) => ({ ...prev, maniacKill: targetId }));
    setNightActionDone(true);
  };

  const handleDonCheck = (targetId: string) => {
    if (!effectivePlayerId || !isConnected) return;
    broadcast({ type: 'don-check-sheriff', donId: effectivePlayerId, targetId });
    setGs((prev) => ({ ...prev, donCheck: targetId }));
    setNightActionDone(true);
  };

  const handleLoverVisit = (targetId: string) => {
    if (!effectivePlayerId || !isConnected) return;
    broadcast({ type: 'lover-visit', loverId: effectivePlayerId, targetId });
    setGs((prev) => ({ ...prev, loverVisit: targetId }));
    setNightActionDone(true);
  };

  // -----------------------------------------------------------------------
  // Host: resolve night
  // -----------------------------------------------------------------------
  const handleResolveNight = () => {
    const aliveSet = new Set(gs.alive);
    const killed = new Set<string>();
    const savedIds = new Set<string>();
    const loverId = Object.entries(gs.roles).find(
      ([id, role]) => role === 'lover' && aliveSet.has(id),
    )?.[0];
    const doctorId = Object.entries(gs.roles).find(
      ([id, role]) => role === 'doctor' && aliveSet.has(id),
    )?.[0];
    const detectiveId = Object.entries(gs.roles).find(
      ([id, role]) => role === 'detective' && aliveSet.has(id),
    )?.[0];
    const donId = Object.entries(gs.roles).find(
      ([id, role]) => role === 'don' && aliveSet.has(id),
    )?.[0];

    const blockedId = loverId ? gs.loverVisit : null;
    const isBlocked = (id: string | undefined) => Boolean(id && blockedId === id);

    // Determine mafia target. Don only breaks disagreement among regular mafia.
    const regularMafiaVotes = Object.entries(gs.mafiaVotes)
      .filter(([voterId]) => voterId !== donId)
      .map(([, targetId]) => targetId);
    const regularVoteCounts = countVotes(regularMafiaVotes);
    const regularLeader = getSingleVoteLeader(regularVoteCounts);
    const donVote = donId ? gs.mafiaVotes[donId] : null;
    const mafiaTarget = regularLeader ?? donVote ?? getTopVoteIds(regularVoteCounts)[0] ?? null;

    if (mafiaTarget) {
      killed.add(mafiaTarget);
    }

    if (gs.maniacKill && !isBlocked(Object.entries(gs.roles).find(([, role]) => role === 'maniac')?.[0])) {
      killed.add(gs.maniacKill);
    }

    const enforceDoctorRestrictions = hasExpandedRoles(gs.roles);
    const doctorSave = doctorId && !isBlocked(doctorId)
      && (!enforceDoctorRestrictions || gs.doctorSave !== doctorId)
      && (!enforceDoctorRestrictions || gs.doctorSave !== gs.lastDoctorSave)
      ? gs.doctorSave
      : null;
    if (doctorSave && killed.has(doctorSave)) {
      killed.delete(doctorSave);
      savedIds.add(doctorSave);
    }

    if (gs.detectiveCheck && detectiveId && !isBlocked(detectiveId)) {
      const checkedRole = gs.roles[gs.detectiveCheck];
      broadcast({ type: 'detective-result', role: checkedRole, detectiveId });
    }

    if (gs.donCheck && donId && !isBlocked(donId)) {
      broadcast({
        type: 'don-check-result',
        isDetective: gs.roles[gs.donCheck] === 'detective',
        donId,
        targetId: gs.donCheck,
      });
    }

    if (loverId && killed.has(loverId) && gs.loverVisit) {
      killed.add(gs.loverVisit);
    }

    const killedIds = Array.from(killed);
    const killedId = killedIds[0] ?? null;
    const saved = savedIds.size > 0;
    broadcast({
      type: 'night-result',
      killedId,
      killedIds,
      saved,
      savedIds: Array.from(savedIds),
      lastDoctorSave: doctorSave,
      lastLoverVisit: gs.loverVisit,
    });

    // Check win condition after night
    const aliveAfter = killedIds.length > 0
      ? gs.alive.filter((id) => !killedIds.includes(id))
      : gs.alive;
    const winner = checkWin(aliveAfter, gs.roles);
    if (winner) {
      setTimeout(() => broadcast({ type: 'game-over', winner }), 1500);
    }
  };

  // -----------------------------------------------------------------------
  // Host: start day voting
  // -----------------------------------------------------------------------
  const handleStartVoting = () => {
    broadcast({ type: 'start-voting' });
  };

  // -----------------------------------------------------------------------
  // Player: cast day vote
  // -----------------------------------------------------------------------
  const handleDayVote = (targetId: string) => {
    if (!effectivePlayerId || !isConnected) return;
    broadcast({ type: 'cast-vote', voterId: effectivePlayerId, targetId });
    // Update local state immediately for instant UI feedback
    setGs((prev) => ({
      ...prev,
      votes: { ...prev.votes, [effectivePlayerId]: targetId },
    }));
  };

  // -----------------------------------------------------------------------
  // Host: resolve day votes
  // -----------------------------------------------------------------------
  const handleResolveVotes = () => {
    const voteCounts = countVotes(Object.values(gs.votes));

    if (gs.votingRound === 3) {
      const executeVotes = voteCounts.execute ?? 0;
      const pardonVotes = voteCounts.pardon ?? 0;
      const candidates = gs.votingCandidates.filter((id) => gs.alive.includes(id));

      if (executeVotes <= pardonVotes || candidates.length === 0) {
        broadcast({ type: 'vote-pardoned', playerIds: candidates });
        return;
      }

      const eliminatedIds = candidates.filter((id) => id !== gs.lastLoverVisit);
      if (eliminatedIds.length === 0) {
        candidates.forEach((id) => broadcast({ type: 'vote-alibi', playerId: id }));
        return;
      }

      const roles = Object.fromEntries(
        eliminatedIds.map((id) => [id, gs.roles[id]]),
      ) as Record<string, MafiaRole>;
      if (eliminatedIds.length === 1) {
        broadcast({ type: 'eliminate', playerId: eliminatedIds[0], role: roles[eliminatedIds[0]] });
      } else {
        broadcast({ type: 'eliminate-many', playerIds: eliminatedIds, roles });
      }

      const aliveAfter = gs.alive.filter((id) => !eliminatedIds.includes(id));
      const winner = checkWin(aliveAfter, gs.roles);
      if (winner) {
        setTimeout(() => broadcast({ type: 'game-over', winner }), 1500);
      }
      return;
    }

    const tiedIds = getTopVoteIds(voteCounts).filter((id) => gs.alive.includes(id));
    if (tiedIds.length === 0) return;

    if (tiedIds.length > 1) {
      broadcast({
        type: 'vote-tie',
        round: gs.votingRound === 1 ? 2 : 3,
        candidates: tiedIds,
      });
      return;
    }

    const eliminatedId = tiedIds[0];
    if (eliminatedId === gs.lastLoverVisit) {
      broadcast({ type: 'vote-alibi', playerId: eliminatedId });
      return;
    }
    const eliminatedRole = gs.roles[eliminatedId];
    broadcast({ type: 'eliminate', playerId: eliminatedId, role: eliminatedRole });

    const aliveAfter = gs.alive.filter((id) => id !== eliminatedId);
    const winner = checkWin(aliveAfter, gs.roles);
    if (winner) {
      setTimeout(() => broadcast({ type: 'game-over', winner }), 1500);
    }
  };

  // -----------------------------------------------------------------------
  // Host: next night after results
  // -----------------------------------------------------------------------
  const handleNextNight = () => {
    setGs((prev) => ({ ...prev, round: prev.round + 1 }));
    broadcast({ type: 'start-night' });
  };

  const handleEndGame = () => {
    broadcast({ type: 'end-game' });
    // Tell the server the game is over so TV and all clients leave the game screen
    emit('game:end', { code: roomId });
    router.push(user ? `/lobby/${roomId}` : `/join/${roomId}`);
  };

  // -----------------------------------------------------------------------
  // Render helpers
  // -----------------------------------------------------------------------

  const otherAlivePlayers = gs.alive.filter((id) => id !== effectivePlayerId);
  const mafiaTeammates =
    isMafiaRole(myRole)
      ? gs.alive.filter((id) => id !== effectivePlayerId && isMafiaRole(gs.roles[id]))
      : [];
  const mafiaVoteDone = Boolean(effectivePlayerId && gs.mafiaVotes[effectivePlayerId]);
  const detectiveDone = Boolean(gs.detectiveCheck);
  const doctorDone = Boolean(gs.doctorSave);
  const maniacDone = gs.maniacKill !== null;
  const donCheckDone = Boolean(gs.donCheck);
  const loverDone = Boolean(gs.loverVisit);
  const enforceDoctorRestrictions = hasExpandedRoles(gs.roles);

  const l = useCallback(
    (ru: string, en: string) => (locale === 'ru' ? ru : en),
    [locale],
  );

  // -----------------------------------------------------------------------
  // RENDER: Lobby (waiting to start)
  // -----------------------------------------------------------------------
  const renderLobby = () => (
    <div className="flex-1 flex flex-col items-center justify-center gap-6">
      <GlassCard className="w-full max-w-md text-center">
        <h2 className="text-2xl font-bold text-white mb-2">
          {l('Мафия', 'Mafia')}
        </h2>
        <p className="text-white/60 mb-4">
          {l(
            `${players.length} игроков в комнате`,
            `${players.length} players in room`,
          )}
        </p>
        <div className="flex flex-wrap gap-2 justify-center mb-6">
          {players.map((p) => (
            <span key={p.id} className="glass-badge">
              {p.nickname}
              {p.isHost && ' ⭐'}
            </span>
          ))}
        </div>
        {isGameHost ? (
          <GlassButton
            variant="primary"
            size="lg"
            onClick={handleStart}
            disabled={players.length < 4}
            className="w-full"
          >
            {l('Начать игру', 'Start Game')}
          </GlassButton>
        ) : (
          <BreathingPlaceholder
            text={l('Ожидание ведущего...', 'Waiting for host...')}
            variant="breathing-text"
          />
        )}
        {isGameHost && players.length < 4 && (
          <p className="text-red-400/80 text-sm mt-2">
            {l('Нужно минимум 4 игрока', 'Need at least 4 players')}
          </p>
        )}
      </GlassCard>
    </div>
  );

  // -----------------------------------------------------------------------
  // RENDER: Role reveal
  // -----------------------------------------------------------------------
  const renderRoleReveal = () => (
    <div className="flex-1 flex flex-col items-center justify-center gap-6">
      <GlassCard className="w-full max-w-sm text-center">
        {!roleRevealed ? (
          <>
            <p className="text-white/60 mb-4 text-lg">
              {l('Нажмите, чтобы увидеть вашу роль', 'Tap to reveal your role')}
            </p>
            <GlassButton
              variant="primary"
              size="lg"
              onClick={() => setRoleRevealed(true)}
              className="w-full"
            >
              {l('Показать роль', 'Reveal Role')}
            </GlassButton>
          </>
        ) : myRole ? (
          <div className="animate-scale-in">
            <div className="text-6xl mb-4">{ROLE_ICONS[myRole]}</div>
            <h2 className="text-3xl font-bold text-white mb-2">
              {ROLE_LABELS[myRole][locale]}
            </h2>
            <p className="text-white/50 text-sm mb-6">
              {myRole === 'mafia' &&
                l(
                  'Убивайте мирных ночью, не попадитесь днём',
                  'Kill citizens at night, stay hidden during the day',
                )}
              {myRole === 'don' &&
                l(
                  'Голосуйте с мафией и ищите шерифа по ночам',
                  'Vote with the mafia and search for the sheriff at night',
                )}
              {myRole === 'maniac' &&
                l(
                  'Вы играете сами за себя и можете убивать ночью',
                  'You play for yourself and may kill at night',
                )}
              {myRole === 'citizen' &&
                l(
                  'Найдите и устраните мафию голосованием',
                  'Find and eliminate the mafia by voting',
                )}
              {myRole === 'detective' &&
                l(
                  'Проверяйте одного игрока каждую ночь',
                  'Check one player each night',
                )}
              {myRole === 'doctor' &&
                l(
                  'Спасайте одного игрока каждую ночь, но не себя и не того же подряд',
                  'Protect one player each night, but not yourself or the same target twice',
                )}
              {myRole === 'lover' &&
                l(
                  'Блокируйте способности и давайте цели алиби на дневном голосовании',
                  'Block abilities and give your target an alibi for the day vote',
                )}
            </p>
            {isMafiaRole(myRole) && mafiaTeammates.length > 0 && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 mb-4">
                <p className="text-red-300 text-sm font-medium mb-1">
                  {l('Ваши союзники:', 'Your allies:')}
                </p>
                {mafiaTeammates.map((id) => (
                  <span key={id} className="glass-badge mr-1">
                    {playerName(id)}
                  </span>
                ))}
              </div>
            )}
          </div>
        ) : (
          <p className="text-white/60">
            {l('Роли распределяются...', 'Assigning roles...')}
          </p>
        )}
      </GlassCard>

      {isGameHost && roleRevealed && (
        <GlassButton variant="primary" size="lg" onClick={handleStartNight}>
          {l('Начать ночь', 'Start Night')}
        </GlassButton>
      )}
    </div>
  );

  // -----------------------------------------------------------------------
  // RENDER: Night phase
  // -----------------------------------------------------------------------
  const renderNight = () => {
    const targets = otherAlivePlayers;

    return (
      <div className="flex-1 flex flex-col items-center gap-4">
        {/* Dark night header */}
        <div className="w-full text-center py-6">
          <p className="text-4xl mb-2">🌙</p>
          <h2 className="text-2xl font-bold text-indigo-200">
            {l('Город засыпает...', 'The city falls asleep...')}
          </h2>
          <p className="text-white/40 mt-1">
            {l(`Ночь ${gs.round}`, `Night ${gs.round}`)}
          </p>
        </div>

        {!amAlive ? (
          <GlassCard className="text-center w-full max-w-sm">
            <p className="text-white/50 text-lg">
              {l('Вы выбыли. Наблюдайте за игрой.', 'You are eliminated. Watch the game.')}
            </p>
          </GlassCard>
        ) : isMafiaRole(myRole) && !mafiaVoteDone ? (
          <GlassCard className="w-full max-w-sm">
            <h3 className="text-lg font-bold text-red-300 mb-3 text-center">
              {ROLE_ICONS.mafia} {l('Выберите жертву', 'Choose a victim')}
            </h3>
            <div className="space-y-2">
              {targets
                .filter((id) => !isMafiaRole(gs.roles[id]))
                .map((id) => (
                  <GlassButton
                    key={id}
                    className="w-full justify-start"
                    onClick={() => handleMafiaVote(id)}
                  >
                    {playerName(id)}
                  </GlassButton>
                ))}
            </div>
          </GlassCard>
        ) : myRole === 'don' && !donCheckDone ? (
          <GlassCard className="w-full max-w-sm">
            <h3 className="text-lg font-bold text-red-300 mb-3 text-center">
              {ROLE_ICONS.don} {l('Проверить на шерифа', 'Check for sheriff')}
            </h3>
            <div className="space-y-2">
              {Object.keys(gs.roles)
                .filter((id) => id !== effectivePlayerId)
                .map((id) => (
                  <GlassButton
                    key={id}
                    className="w-full justify-start"
                    onClick={() => handleDonCheck(id)}
                  >
                    {playerName(id)}
                    {!gs.alive.includes(id) ? l(' (выбыл)', ' (eliminated)') : ''}
                  </GlassButton>
                ))}
            </div>
          </GlassCard>
        ) : myRole === 'detective' && !detectiveDone ? (
          <GlassCard className="w-full max-w-sm">
            <h3 className="text-lg font-bold text-blue-300 mb-3 text-center">
              {ROLE_ICONS.detective} {l('Проверить игрока', 'Check a player')}
            </h3>
            <div className="space-y-2">
              {targets.map((id) => (
                <GlassButton
                  key={id}
                  className="w-full justify-start"
                  onClick={() => handleDetectiveCheck(id)}
                >
                  {playerName(id)}
                </GlassButton>
              ))}
            </div>
          </GlassCard>
        ) : myRole === 'doctor' && !doctorDone ? (
          <GlassCard className="w-full max-w-sm">
            <h3 className="text-lg font-bold text-green-300 mb-3 text-center">
              {ROLE_ICONS.doctor} {l('Защитить игрока', 'Protect a player')}
            </h3>
            <div className="space-y-2">
              {gs.alive
                .filter((id) => (
                  !enforceDoctorRestrictions
                  || (id !== effectivePlayerId && id !== gs.lastDoctorSave)
                ))
                .map((id) => (
                  <GlassButton
                    key={id}
                    className="w-full justify-start"
                    onClick={() => handleDoctorSave(id)}
                  >
                    {playerName(id)}
                  </GlassButton>
                ))}
            </div>
          </GlassCard>
        ) : myRole === 'maniac' && !nightActionDone && !maniacDone ? (
          <GlassCard className="w-full max-w-sm">
            <h3 className="text-lg font-bold text-orange-300 mb-3 text-center">
              {ROLE_ICONS.maniac} {l('Выберите жертву', 'Choose a victim')}
            </h3>
            <div className="space-y-2">
              {targets.map((id) => (
                <GlassButton
                  key={id}
                  className="w-full justify-start"
                  onClick={() => handleManiacKill(id)}
                >
                  {playerName(id)}
                </GlassButton>
              ))}
              <GlassButton
                variant="default"
                className="w-full justify-center"
                onClick={() => handleManiacKill(null)}
              >
                {l('Не убивать этой ночью', 'Do not kill tonight')}
              </GlassButton>
            </div>
          </GlassCard>
        ) : myRole === 'lover' && !loverDone ? (
          <GlassCard className="w-full max-w-sm">
            <h3 className="text-lg font-bold text-pink-300 mb-3 text-center">
              {ROLE_ICONS.lover} {l('К кому пойти?', 'Who to visit?')}
            </h3>
            <div className="space-y-2">
              {targets
                .filter((id) => id !== gs.lastLoverVisit)
                .map((id) => (
                  <GlassButton
                    key={id}
                    className="w-full justify-start"
                    onClick={() => handleLoverVisit(id)}
                  >
                    {playerName(id)}
                  </GlassButton>
                ))}
            </div>
          </GlassCard>
        ) : (
          <GlassCard className="text-center w-full max-w-sm">
            {nightActionDone ? (
              <>
                <p className="text-2xl mb-2">✅</p>
                <p className="text-white/60">
                  {l('Действие выполнено. Ждите утра.', 'Action done. Wait for dawn.')}
                </p>
                {myRole === 'detective' && gs.detectiveResult && (
                  <div className="mt-4 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
                    <p className="text-blue-300 text-sm">
                      {playerName(gs.detectiveCheck!)} —{' '}
                      <span className="font-bold">
                        {ROLE_LABELS[gs.detectiveResult][locale]}
                      </span>
                    </p>
                  </div>
                )}
                {myRole === 'don' && gs.donCheck && gs.donCheckResult !== null && (
                  <div className="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                    <p className="text-red-300 text-sm">
                      {playerName(gs.donCheck)} —{' '}
                      <span className="font-bold">
                        {gs.donCheckResult
                          ? l('это шериф', 'is the sheriff')
                          : l('не шериф', 'is not the sheriff')}
                      </span>
                    </p>
                  </div>
                )}
              </>
            ) : (
              <>
                <p className="text-2xl mb-2">😴</p>
                <p className="text-white/60">
                  {myRole === 'citizen'
                    ? l('Вы спите. Ждите утра.', 'You are asleep. Wait for dawn.')
                    : l('Ожидание...', 'Waiting...')}
                </p>
              </>
            )}
          </GlassCard>
        )}

        {isGameHost && (
          <GlassButton variant="primary" size="lg" onClick={handleResolveNight}>
            {l('Завершить ночь', 'Resolve Night')}
          </GlassButton>
        )}
      </div>
    );
  };

  // -----------------------------------------------------------------------
  // RENDER: Day phase
  // -----------------------------------------------------------------------
  const renderDay = () => (
    <div className="flex-1 flex flex-col items-center gap-4">
      {/* Day header */}
      <div className="w-full text-center py-4">
        <p className="text-4xl mb-2">☀️</p>
        <h2 className="text-2xl font-bold text-amber-200">
          {l('Город просыпается', 'The city wakes up')}
        </h2>
      </div>

      {/* Night result */}
      <GlassCard className="w-full max-w-md text-center">
        {gs.lastNightKill ? (
          <>
            <p className="text-red-400 text-lg font-bold mb-1">
              {gs.lastNightKills.length > 1
                ? l('Этой ночью были убиты:', 'Last night were killed:')
                : l('Этой ночью был убит:', 'Last night was killed:')}
            </p>
            <div className="space-y-2">
              {(gs.lastNightKills.length > 0 ? gs.lastNightKills : [gs.lastNightKill]).map((id) => (
                <div key={id}>
                  <p className="text-2xl font-bold text-white">
                    {playerName(id)}
                  </p>
                  <span className="glass-badge glass-badge--accent mt-2">
                    {ROLE_LABELS[gs.roles[id]][locale]}
                  </span>
                </div>
              ))}
            </div>
          </>
        ) : gs.lastNightSaved ? (
          <p className="text-green-400 text-lg font-bold">
            {l('Доктор спас жертву! Никто не погиб.', 'The doctor saved the victim! Nobody died.')}
          </p>
        ) : (
          <p className="text-green-400 text-lg font-bold">
            {l('Мирная ночь. Никто не погиб.', 'Peaceful night. Nobody died.')}
          </p>
        )}
      </GlassCard>

      {/* Timer */}
      <GlassCard className="w-full max-w-md text-center">
        <p className="text-white/60 text-sm mb-1">
          {l('Обсуждение', 'Discussion')}
        </p>
        <p className="text-5xl font-bold text-white font-mono">
          {Math.floor(dayTimerValue / 60)}:{String(dayTimerValue % 60).padStart(2, '0')}
        </p>
      </GlassCard>

      {/* Alive players */}
      <GlassCard className="w-full max-w-md">
        <h3 className="text-sm font-medium text-white/50 mb-2">
          {l('Живые игроки', 'Alive Players')} ({gs.alive.length})
        </h3>
        <div className="flex flex-wrap gap-2">
          {gs.alive.map((id) => (
            <span key={id} className="glass-badge">
              {playerName(id)}
              {id === effectivePlayerId ? ' (👈)' : ''}
            </span>
          ))}
        </div>
      </GlassCard>

      {isGameHost && (
        <GlassButton variant="primary" size="lg" onClick={handleStartVoting}>
          {l('Начать голосование', 'Start Voting')}
        </GlassButton>
      )}
    </div>
  );

  // -----------------------------------------------------------------------
  // RENDER: Voting phase
  // -----------------------------------------------------------------------
  const renderVoting = () => {
    const myVote = effectivePlayerId ? gs.votes[effectivePlayerId] : undefined;
    const voteCounts = countVotes(Object.values(gs.votes));
    const totalVoters = gs.alive.length;
    const totalVotes = Object.keys(gs.votes).length;
    const isBinaryVote = gs.votingRound === 3;
    const candidateIds = gs.votingRound === 1
      ? otherAlivePlayers
      : gs.votingCandidates.filter((id) => id !== effectivePlayerId && gs.alive.includes(id));
    const tallyRows = isBinaryVote
      ? [
          { id: 'execute', label: l('Казнить', 'Execute') },
          { id: 'pardon', label: l('Помиловать', 'Pardon') },
        ]
      : (gs.votingRound === 1 ? gs.alive : gs.votingCandidates.filter((id) => gs.alive.includes(id)))
          .map((id) => ({ id, label: playerName(id) }));
    const votingTitle = gs.votingRound === 1
      ? l('Голосование', 'Voting')
      : gs.votingRound === 2
      ? l('Переголосование', 'Revote')
      : l('Казнить или помиловать?', 'Execute or pardon?');
    const votingPrompt = gs.votingRound === 1
      ? l('Кого вы подозреваете?', 'Who do you suspect?')
      : gs.votingRound === 2
      ? l('Выберите одного из кандидатов', 'Choose one of the candidates')
      : l('Что сделать с кандидатами?', 'What should happen to the candidates?');

    return (
      <div className="flex-1 flex flex-col items-center gap-4">
        <div className="w-full text-center py-4">
          <p className="text-4xl mb-2">🗳️</p>
          <h2 className="text-2xl font-bold text-white">
            {votingTitle}
          </h2>
          <p className="text-white/40 text-sm">
            {l(
              `Голосов: ${totalVotes}/${totalVoters}`,
              `Votes: ${totalVotes}/${totalVoters}`,
            )}
          </p>
        </div>

        {amAlive && !myVote ? (
          <GlassCard className="w-full max-w-sm">
            <h3 className="text-white/70 text-sm mb-3 text-center">
              {votingPrompt}
            </h3>
            <div className="space-y-2">
              {isBinaryVote ? (
                <>
                  <GlassButton
                    variant="danger"
                    className="w-full justify-between"
                    onClick={() => handleDayVote('execute')}
                  >
                    <span>{l('Казнить кандидатов', 'Execute the candidates')}</span>
                    {voteCounts.execute ? (
                      <span className="glass-badge text-xs">{voteCounts.execute}</span>
                    ) : null}
                  </GlassButton>
                  <GlassButton
                    variant="default"
                    className="w-full justify-between"
                    onClick={() => handleDayVote('pardon')}
                  >
                    <span>{l('Помиловать кандидатов', 'Pardon the candidates')}</span>
                    {voteCounts.pardon ? (
                      <span className="glass-badge text-xs">{voteCounts.pardon}</span>
                    ) : null}
                  </GlassButton>
                </>
              ) : (
                candidateIds.map((id) => (
                  <GlassButton
                    key={id}
                    className="w-full justify-between"
                    onClick={() => handleDayVote(id)}
                  >
                    <span>{playerName(id)}</span>
                    {voteCounts[id] ? (
                      <span className="glass-badge text-xs">
                        {voteCounts[id]}
                      </span>
                    ) : null}
                  </GlassButton>
                ))
              )}
            </div>
          </GlassCard>
        ) : (
          <GlassCard className="w-full max-w-sm text-center">
            {!amAlive ? (
              <p className="text-white/50">
                {l('Вы выбыли. Наблюдайте.', 'You are eliminated. Watch.')}
              </p>
            ) : (
              <>
                <p className="text-white/60 mb-2">
                  {l('Вы проголосовали за:', 'You voted for:')}
                </p>
                <span className="glass-badge glass-badge--accent text-base">
                  {myVote === 'execute'
                    ? l('Казнить', 'Execute')
                    : myVote === 'pardon'
                    ? l('Помиловать', 'Pardon')
                    : playerName(myVote!)}
                </span>
              </>
            )}
          </GlassCard>
        )}

        {/* Live vote tally */}
        <GlassCard className="w-full max-w-sm">
          <h3 className="text-white/50 text-sm mb-2">
            {l('Результаты', 'Results')}
          </h3>
          {tallyRows.map(({ id, label }) => (
            <div
              key={id}
              className="flex items-center justify-between py-1.5 border-b border-white/5 last:border-0"
            >
              <span className="text-white/80 text-sm">{label}</span>
              <span className="text-white/40 text-sm font-mono">
                {voteCounts[id] || 0}
              </span>
            </div>
          ))}
        </GlassCard>

        {isGameHost && totalVotes >= totalVoters && (
          <GlassButton variant="danger" size="lg" onClick={handleResolveVotes}>
            {l('Подвести итоги', 'Resolve Votes')}
          </GlassButton>
        )}
        {isGameHost && totalVotes > 0 && totalVotes < totalVoters && (
          <GlassButton variant="default" size="sm" onClick={handleResolveVotes}>
            {l('Завершить досрочно', 'End early')}
          </GlassButton>
        )}
      </div>
    );
  };

  // -----------------------------------------------------------------------
  // RENDER: Results (elimination / game over)
  // -----------------------------------------------------------------------
  const renderResults = () => {
    const lastEliminated = gs.lastVoteTargetIds
      .filter((id) => !gs.alive.includes(id))
      .map((id) => ({ id, role: gs.roles[id] }))
      .filter((item): item is { id: string; role: MafiaRole } => Boolean(item.role));

    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-6">
        {gs.winner ? (
          <GlassCard className="w-full max-w-md text-center animate-scale-in">
            <p className="text-5xl mb-4">
              {gs.winner === 'mafia' ? '🔫' : gs.winner === 'maniac' ? '🪓' : '🎉'}
            </p>
            <h2 className="text-3xl font-bold text-white mb-2">
              {gs.winner === 'mafia'
                ? l('Мафия победила!', 'Mafia wins!')
                : gs.winner === 'maniac'
                ? l('Маньяк победил!', 'Maniac wins!')
                : l('Мирные победили!', 'Citizens win!')}
            </h2>
            <div className="mt-4 space-y-2">
              <h3 className="text-white/50 text-sm">
                {l('Роли:', 'Roles:')}
              </h3>
              {Object.entries(gs.roles).map(([id, role]) => (
                <div
                  key={id}
                  className="flex items-center justify-between py-1"
                >
                  <span className="text-white/80">{playerName(id)}</span>
                  <span className="flex items-center gap-1">
                    <span>{ROLE_ICONS[role]}</span>
                    <span className="text-white/60 text-sm">
                      {ROLE_LABELS[role][locale]}
                    </span>
                  </span>
                </div>
              ))}
            </div>
            {isGameHost && (
              <GlassButton
                variant="primary"
                size="lg"
                className="w-full mt-6"
                onClick={handleEndGame}
              >
                {l('Новая игра', 'New Game')}
              </GlassButton>
            )}
          </GlassCard>
        ) : (
          <GlassCard className="w-full max-w-md text-center animate-scale-in">
            {gs.lastVoteResult === 'eliminated' && lastEliminated.length > 0 ? (
              <>
                <p className="text-4xl mb-2">💀</p>
                <h2 className="text-xl font-bold text-white mb-1">
                  {lastEliminated.length === 1
                    ? `${playerName(lastEliminated[0].id)} ${l('выбывает', 'is eliminated')}`
                    : l('Кандидаты выбывают', 'Candidates are eliminated')}
                </h2>
                <div className="space-y-2 mt-3">
                  {lastEliminated.map((item) => (
                    <div key={item.id} className="flex items-center justify-center gap-2">
                      {lastEliminated.length > 1 && (
                        <span className="text-white/80">{playerName(item.id)}</span>
                      )}
                      <span className="text-2xl">{ROLE_ICONS[item.role]}</span>
                      <span className="text-white/60">
                        {ROLE_LABELS[item.role][locale]}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            ) : gs.lastVoteResult === 'pardoned' ? (
              <>
                <p className="text-4xl mb-2">⚖️</p>
                <h2 className="text-xl font-bold text-white mb-1">
                  {l('Кандидаты оправданы', 'Candidates are pardoned')}
                </h2>
                <p className="text-white/60">
                  {l('Никто не выбывает.', 'Nobody is eliminated.')}
                </p>
              </>
            ) : (
              <>
                <p className="text-4xl mb-2">💋</p>
                <h2 className="text-xl font-bold text-white mb-1">
                  {l('Алиби сработало', 'The alibi worked')}
                </h2>
                <p className="text-white/60">
                  {gs.lastLoverVisit
                    ? l(
                        `${playerName(gs.lastLoverVisit)} остаётся в игре.`,
                        `${playerName(gs.lastLoverVisit)} stays in the game.`,
                      )
                    : l('Никто не выбывает.', 'Nobody is eliminated.')}
                </p>
              </>
            )}
            {isGameHost && (
              <GlassButton
                variant="primary"
                size="lg"
                className="w-full mt-6"
                onClick={handleNextNight}
              >
                {l('Следующая ночь', 'Next Night')}
              </GlassButton>
            )}
          </GlassCard>
        )}
      </div>
    );
  };

  // -----------------------------------------------------------------------
  // Main render
  // -----------------------------------------------------------------------
  const phaseRenderers: Record<string, () => React.JSX.Element> = {
    lobby: renderLobby,
    'role-reveal': renderRoleReveal,
    night: renderNight,
    day: renderDay,
    voting: renderVoting,
    results: renderResults,
  };

  return (
    <GameLayout
      title={l('Мафия', 'Mafia')}
      icon="🕵️"
      round={gs.round || undefined}
      onEnd={isGameHost ? handleEndGame : undefined}
      phaseKey={gs.phase}
    >
      {(phaseRenderers[gs.phase] ?? renderLobby)()}
    </GameLayout>
  );
}
