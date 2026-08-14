'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSocket } from '@/lib/use-socket';
import { useRoomState } from '@/lib/use-room-state';
import { useGameBroadcast } from '@/lib/use-game-action';
import { useNavigateOnGameEnd } from '@/lib/use-navigate-on-game-end';
import { useTranslation } from '@/lib/i18n';
import { useGameIdentity } from '@/lib/use-game-identity';
import {
  MafiaClubMobileLayout,
  MafiaOrnament,
  MafiaPlayerToken,
  MafiaRoleCard,
  MafiaRoleThumb,
  mafiaClubStyles as club,
} from '@/components/games/mafia-club/MafiaClub';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { MafiaRole, MafiaPhase, MafiaVoteResult, MafiaVoteRound } from '@/types/game';
import { Player } from '@/types/room';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MafiaGameState {
  phase: 'lobby' | 'role-reveal' | MafiaPhase;
  hostPlayerId: string | null;
  nightStage: MafiaNightStage | null;
  roles: Record<string, MafiaRole>;
  roleSeenIds: string[];
  alive: string[];
  eliminated: { id: string; role: MafiaRole }[];
  mafiaVotes: Record<string, string>; // mafiaId -> targetId
  maniacKill: string | null; // targetId killed by maniac this night
  maniacActed: boolean;
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

type MafiaNightStage = 'mafia' | 'lover' | 'maniac' | 'doctor' | 'detective' | 'don';

type GameAction =
  | { type: 'start-game' }
  | { type: 'sync-state'; state: MafiaGameState }
  | { type: 'request-state' }
  | { type: 'select-host'; hostPlayerId: string }
  | { type: 'assign-roles'; roles: Record<string, MafiaRole>; hostPlayerId: string }
  | { type: 'role-seen'; playerId: string }
  | { type: 'start-night'; round: number }
  | { type: 'advance-night-stage'; stage: MafiaNightStage }
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
  detective: { ru: 'Шериф', en: 'Detective' },
  doctor: { ru: 'Доктор', en: 'Doctor' },
  lover: { ru: 'Любовница', en: 'Lover' },
};

const ROLE_ICONS: Record<MafiaRole, string> = {
  citizen: 'C', mafia: 'M', don: 'D', maniac: 'X', detective: 'S', doctor: '+', lover: 'L',
};

const NIGHT_STAGE_ORDER: MafiaNightStage[] = ['mafia', 'lover', 'maniac', 'doctor', 'detective', 'don'];

const NIGHT_STAGE_ROLE: Record<MafiaNightStage, MafiaRole> = {
  mafia: 'mafia',
  lover: 'lover',
  maniac: 'maniac',
  doctor: 'doctor',
  detective: 'detective',
  don: 'don',
};

function isMafiaRole(role: MafiaRole | undefined): boolean {
  return role === 'mafia' || role === 'don';
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

function getAvailableNightStages(
  roles: Record<string, MafiaRole>,
  alive: string[],
): MafiaNightStage[] {
  const aliveRoles = new Set(alive.map((id) => roles[id]));
  return NIGHT_STAGE_ORDER.filter((stage) => (
    stage === 'mafia'
      ? alive.some((id) => isMafiaRole(roles[id]))
      : aliveRoles.has(NIGHT_STAGE_ROLE[stage])
  ));
}

function assignRoles(playerIds: string[]): Record<string, MafiaRole> {
  const shuffled = [...playerIds].sort(() => Math.random() - 0.5);
  const roles: Record<string, MafiaRole> = {};
  const count = shuffled.length;

  // Regular Mafia count does not include the Don.
  const mafiaCount = count >= 15 ? 3 : count >= 6 ? 2 : 1;
  const hasDetective = count >= 6;
  const hasDoctor = count >= 7;
  const hasDon = count >= 9;
  const hasLover = count >= 10;
  const hasManiac = count >= 12;

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
    hostPlayerId: null,
    nightStage: null,
    roles: {},
    roleSeenIds: [],
    alive: [],
    eliminated: [],
    mafiaVotes: {},
    maniacKill: null,
    maniacActed: false,
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
  const [roleSeen, setRoleSeen] = useState(false);
  const [nightActionDone, setNightActionDone] = useState(false);
  const [dayTimerValue, setDayTimerValue] = useState(60);
  const [pendingDoctorTargetId, setPendingDoctorTargetId] = useState<string | null>(null);
  const [pendingDetectiveTargetId, setPendingDetectiveTargetId] = useState<string | null>(null);
  const [pendingDayVoteTargetId, setPendingDayVoteTargetId] = useState<string | null>(null);
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
          if (effectivePlayerId && effectivePlayerId === gsRef.current.hostPlayerId) {
            broadcast({ type: 'sync-state', state: gsRef.current });
          }
          break;

        case 'select-host':
          setGs((prev) => ({ ...prev, hostPlayerId: payload.hostPlayerId }));
          break;

        case 'assign-roles':
          setGs((prev) => ({
            ...prev,
            phase: 'role-reveal',
            hostPlayerId: payload.hostPlayerId,
            nightStage: null,
            roles: payload.roles,
            roleSeenIds: [],
            alive: Object.keys(payload.roles),
            round: 1,
            votingRound: 1,
            votingCandidates: [],
            lastVoteResult: null,
            lastVoteTargetIds: [],
          }));
          setRoleRevealed(false);
          setRoleSeen(false);
          break;

        case 'role-seen':
          setGs((prev) => ({
            ...prev,
            roleSeenIds: prev.roleSeenIds.includes(payload.playerId)
              ? prev.roleSeenIds
              : [...prev.roleSeenIds, payload.playerId],
          }));
          break;

        case 'start-night':
          setGs((prev) => ({
            ...prev,
            phase: 'night',
            nightStage: getAvailableNightStages(prev.roles, prev.alive)[0] ?? 'mafia',
            round: payload.round,
            mafiaVotes: {},
            maniacKill: null,
            maniacActed: false,
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

        case 'advance-night-stage':
          setGs((prev) => ({ ...prev, nightStage: payload.stage }));
          setNightActionDone(false);
          break;

        case 'mafia-vote':
          if (gsRef.current.nightStage !== 'mafia') break;
          setGs((prev) => ({
            ...prev,
            mafiaVotes: { ...prev.mafiaVotes, [payload.voterId]: payload.targetId },
          }));
          break;

        case 'maniac-kill':
          if (gsRef.current.nightStage !== 'maniac') break;
          setGs((prev) => ({ ...prev, maniacKill: payload.targetId, maniacActed: true }));
          break;

        case 'don-check-sheriff':
          if (gsRef.current.nightStage !== 'don') break;
          setGs((prev) => ({ ...prev, donCheck: payload.targetId }));
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
          if (gsRef.current.nightStage !== 'lover') break;
          setGs((prev) => ({ ...prev, loverVisit: payload.targetId }));
          break;

        case 'detective-check':
          if (gsRef.current.nightStage !== 'detective') break;
          setGs((prev) => ({ ...prev, detectiveCheck: payload.targetId }));
          break;

        case 'doctor-save':
          if (gsRef.current.nightStage !== 'doctor') break;
          setGs((prev) => ({ ...prev, doctorSave: payload.targetId }));
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
            nightStage: null,
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
  }, [on, effectivePlayerId, broadcast]);

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

  useEffect(() => {
    queueMicrotask(() => {
      setPendingDoctorTargetId(null);
      setPendingDetectiveTargetId(null);
      setPendingDayVoteTargetId(null);
    });
  }, [gs.phase, gs.nightStage, gs.votingRound, gs.round]);

  // -----------------------------------------------------------------------
  // Host: start game
  // -----------------------------------------------------------------------
  const handleStart = () => {
    if (!gs.hostPlayerId || effectivePlayerId !== gs.hostPlayerId) return;
    const playerIds = players
      .filter((p) => p.id !== gs.hostPlayerId)
      .map((p) => p.id);
    const roles = assignRoles(playerIds);
    broadcast({ type: 'assign-roles', roles, hostPlayerId: gs.hostPlayerId });
  };

  const handleSelectHost = (hostPlayerId: string) => {
    if (!isGameHost || gs.phase !== 'lobby') return;
    broadcast({ type: 'select-host', hostPlayerId });
  };

  const handleRoleRevealStart = () => {
    setRoleRevealed(true);
    if (!roleSeen && effectivePlayerId && myRole) {
      setRoleSeen(true);
      broadcast({ type: 'role-seen', playerId: effectivePlayerId });
    }
  };

  // -----------------------------------------------------------------------
  // Host: advance to night
  // -----------------------------------------------------------------------
  const handleStartNight = () => {
    broadcast({ type: 'start-night', round: Math.max(1, gs.round) });
  };

  // -----------------------------------------------------------------------
  // Night actions
  // -----------------------------------------------------------------------
  const handleMafiaVote = (targetId: string) => {
    if (!effectivePlayerId || !isConnected || gs.nightStage !== 'mafia' || !isMafiaRole(myRole)) return;
    broadcast({ type: 'mafia-vote', voterId: effectivePlayerId, targetId });
    // Update local state immediately for instant UI feedback
    setGs((prev) => ({
      ...prev,
      mafiaVotes: { ...prev.mafiaVotes, [effectivePlayerId]: targetId },
    }));
  };

  const handleDetectiveCheck = (targetId: string) => {
    if (!effectivePlayerId || !isConnected || gs.nightStage !== 'detective' || myRole !== 'detective' || gs.loverVisit === effectivePlayerId) return;
    broadcast({ type: 'detective-check', detectiveId: effectivePlayerId, targetId });
    setGs((prev) => ({ ...prev, detectiveCheck: targetId }));
    setPendingDetectiveTargetId(null);
    setNightActionDone(true);
  };

  const handleDoctorSave = (targetId: string) => {
    if (!effectivePlayerId || !isConnected || gs.nightStage !== 'doctor' || myRole !== 'doctor' || gs.loverVisit === effectivePlayerId) return;
    broadcast({ type: 'doctor-save', doctorId: effectivePlayerId, targetId });
    setGs((prev) => ({ ...prev, doctorSave: targetId }));
    setPendingDoctorTargetId(null);
    setNightActionDone(true);
  };

  const handleManiacKill = (targetId: string | null) => {
    if (!effectivePlayerId || !isConnected || gs.nightStage !== 'maniac' || myRole !== 'maniac' || gs.loverVisit === effectivePlayerId) return;
    broadcast({ type: 'maniac-kill', maniacId: effectivePlayerId, targetId });
    setGs((prev) => ({ ...prev, maniacKill: targetId, maniacActed: true }));
    setNightActionDone(true);
  };

  const handleDonCheck = (targetId: string) => {
    if (!effectivePlayerId || !isConnected || gs.nightStage !== 'don' || myRole !== 'don' || gs.loverVisit === effectivePlayerId) return;
    broadcast({ type: 'don-check-sheriff', donId: effectivePlayerId, targetId });
    setGs((prev) => ({ ...prev, donCheck: targetId }));
    setNightActionDone(true);
  };

  const handleLoverVisit = (targetId: string) => {
    if (!effectivePlayerId || !isConnected || gs.nightStage !== 'lover' || myRole !== 'lover' || targetId === effectivePlayerId) return;
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

    // The Don has the final word whenever the Mafia disagrees.
    const regularMafiaVotes = Object.entries(gs.mafiaVotes)
      .filter(([voterId]) => voterId !== donId)
      .map(([, targetId]) => targetId);
    const regularVoteCounts = countVotes(regularMafiaVotes);
    const donVote = donId ? gs.mafiaVotes[donId] : null;
    const mafiaTarget = donVote ?? getSingleVoteLeader(regularVoteCounts) ?? getTopVoteIds(regularVoteCounts)[0] ?? null;

    if (mafiaTarget) {
      killed.add(mafiaTarget);
    }

    if (gs.maniacKill && !isBlocked(Object.entries(gs.roles).find(([, role]) => role === 'maniac')?.[0])) {
      killed.add(gs.maniacKill);
    }

    const doctorSave = doctorId && !isBlocked(doctorId)
      && gs.doctorSave !== doctorId
      && gs.doctorSave !== gs.lastDoctorSave
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

  const handleAdvanceNightStage = () => {
    const stages = getAvailableNightStages(gs.roles, gs.alive);
    const currentIndex = gs.nightStage ? stages.indexOf(gs.nightStage) : -1;
    const nextStage = stages[currentIndex + 1];
    if (nextStage) {
      broadcast({ type: 'advance-night-stage', stage: nextStage });
      return;
    }
    handleResolveNight();
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
    setPendingDayVoteTargetId(null);
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
    broadcast({ type: 'start-night', round: gs.round + 1 });
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
  const selectedHostId = gs.hostPlayerId;
  const isMafiaHost = Boolean(effectivePlayerId && selectedHostId === effectivePlayerId);
  const rolePlayerCount = players.filter((player) => player.id !== selectedHostId).length;
  const mafiaVoteDone = Boolean(effectivePlayerId && gs.mafiaVotes[effectivePlayerId]);
  const detectiveDone = Boolean(gs.detectiveCheck);
  const doctorDone = Boolean(gs.doctorSave);
  const maniacDone = gs.maniacActed;
  const donCheckDone = Boolean(gs.donCheck);
  const loverDone = Boolean(gs.loverVisit);

  const l = useCallback(
    (ru: string, en: string) => (locale === 'ru' ? ru : en),
    [locale],
  );

  const renderHostRoleRoster = () => isMafiaHost ? (
    <details className={`${club.card} mb-4 p-4 text-left`} open>
      <summary className="min-h-11 cursor-pointer list-none font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-[#d6b46a] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f0d795]">
        {l('Все роли · пульт ведущего', 'All roles · host console')}
      </summary>
      <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {Object.entries(gs.roles).map(([id, role]) => {
          const isAlive = gs.alive.includes(id);
          return (
          <div key={id} className={`flex min-h-12 items-center gap-2 border-b border-[#d6b46a]/10 py-2 ${isAlive ? '' : 'opacity-40 grayscale'}`}>
            <MafiaRoleThumb role={role} alt="" />
            <span className={`min-w-0 flex-1 truncate text-xs font-semibold ${isAlive ? '' : 'line-through'}`}>{playerName(id)}</span>
            <span className="text-right text-[10px] text-[#d6b46a]">{ROLE_LABELS[role][locale]}{!isAlive && <b className="mt-1 block text-[#efb4b9]">{l('ВЫБЫЛ', 'OUT')}</b>}</span>
          </div>
          );
        })}
      </div>
    </details>
  ) : null;

  // -----------------------------------------------------------------------
  // RENDER: Lobby (waiting to start)
  // -----------------------------------------------------------------------
  const renderLobby = () => (
    <div className="flex flex-1 flex-col justify-center py-6 text-center">
      <span className={club.kicker}>{l('THE PURPLE ROOM · ЧАСТНОЕ СОБРАНИЕ', 'THE PURPLE ROOM · PRIVATE SESSION')}</span>
      <h2 className={club.title}>{l('Кто проведёт\nэтот вечер?', 'Who will host\nthis evening?').split('\n').map((line, index) => <span key={line}>{index > 0 && <br />}{line}</span>)}</h2>
      <p className={club.subtitle}>
        {isGameHost
          ? l('Выберите обязательного ведущего. Он увидит все роли и решения, но сам не будет играть.', 'Select the required host. They will see every role and decision, but will not play.')
          : selectedHostId
          ? l(`${playerName(selectedHostId)} назначен ведущим.`, `${playerName(selectedHostId)} has been selected as host.`)
          : l('Владелец клуба выбирает ведущего.', 'The club owner is selecting the host.')}
      </p>

      <div className="my-7 flex justify-center">
        <div className={club.statusSeal}>
          <strong>{players.length}</strong>
          <span>{l('гостей в клубе', 'guests in club')}</span>
        </div>
      </div>

      <div className={`${club.card} mb-5 p-4 text-left`}>
        <div className="mb-3 flex items-center justify-between">
          <span className={club.kicker}>{l('СПИСОК ГОСТЕЙ', 'GUEST LIST')}</span>
          <span className="text-xs text-[#d6b46a]">{players.length}</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {players.map((player) => (
            <button key={player.id} type="button" disabled={!isGameHost} aria-pressed={player.id === selectedHostId} onClick={() => handleSelectHost(player.id)} className={`flex min-h-14 min-w-0 items-center gap-2 border-b py-2 text-left transition-[background,border-color,transform] duration-200 motion-reduce:transition-none ${isGameHost ? 'cursor-pointer active:scale-[.98]' : 'cursor-default'} ${player.id === selectedHostId ? 'border-[#d6b46a]/55 bg-[#d6b46a]/[.09] px-2 ring-1 ring-[#d6b46a]/35' : 'border-[#d6b46a]/10'}`}>
              <MafiaPlayerToken name={player.nickname} />
              <span className="truncate text-xs font-semibold">{player.nickname}</span>
              {player.id === selectedHostId && <span className="ml-auto text-[9px] font-bold text-[#d6b46a]">{l('ВЕДУЩИЙ', 'HOST')}</span>}
            </button>
          ))}
        </div>
      </div>

      {isMafiaHost ? (
        <>
          <button type="button" className={club.primaryButton} onClick={handleStart} disabled={!selectedHostId || rolePlayerCount < 4}>
            {l('Открыть заседание', 'Open the session')}
          </button>
          {selectedHostId && rolePlayerCount < 4 && <p className="mt-3 text-xs text-[#efb4b9]">{l('Кроме ведущего нужно минимум 4 игрока', 'At least 4 players plus the host are required')}</p>}
        </>
      ) : (
        <div className={`${club.card} flex min-h-14 items-center justify-center gap-3 px-4 text-xs text-[#fbf3df]/55`}>
          <span className="h-2 w-2 animate-pulse rounded-full bg-[#d6b46a] shadow-[0_0_14px_#d6b46a] motion-reduce:animate-none" />
          {isGameHost && selectedHostId
            ? l(`Ведущий выбран: ${playerName(selectedHostId)}`, `Host selected: ${playerName(selectedHostId)}`)
            : l('Ожидаем решение владельца клуба', 'Waiting for the club owner')}
        </div>
      )}
    </div>
  );

  // -----------------------------------------------------------------------
  // RENDER: Role reveal
  // -----------------------------------------------------------------------
  const renderRoleReveal = () => isMafiaHost ? (
    <div className="flex flex-1 flex-col py-2">
      <span className={club.kicker}>{l('ПУЛЬТ ВЕДУЩЕГО · РОЛИ РАЗДАНЫ', 'HOST CONSOLE · ROLES DEALT')}</span>
      <h2 className={club.title}>{l('Все тайны\nперед вами', 'Every secret\nis before you').split('\n').map((line, index) => <span key={line}>{index > 0 && <br />}{line}</span>)}</h2>
      <p className={`${club.subtitle} mb-5`}>{l('Ведущий не получает игровую роль. Убедитесь, что участники посмотрели карты, и начинайте ночь.', 'The host receives no game role. Make sure the players have viewed their cards, then begin the night.')}</p>
      <div className={`${club.cardGold} ${club.card} mb-4 p-4`}>
        <div className="mb-3 flex items-center justify-between">
          <span className={club.kicker}>{l('КАРТЫ ПРОСМОТРЕНЫ', 'CARDS VIEWED')}</span>
          <b className="font-serif text-2xl text-[#f0d795]">{gs.roleSeenIds.length} / {Object.keys(gs.roles).length}</b>
        </div>
        <div className="h-0.5 bg-[#d6b46a]/10"><div className="h-full bg-[#d6b46a] transition-[width] duration-300 motion-reduce:transition-none" style={{ width: `${Object.keys(gs.roles).length ? (gs.roleSeenIds.length / Object.keys(gs.roles).length) * 100 : 0}%` }} /></div>
      </div>
      <div className={`${club.card} mb-5 flex-1 p-4`}>
        <span className={club.kicker}>{l('ДОСЬЕ УЧАСТНИКОВ', 'PLAYER DOSSIERS')}</span>
        <div className="mt-3 space-y-2">
          {Object.entries(gs.roles).map(([id, role]) => (
            <div key={id} className="flex min-h-14 items-center gap-3 border-b border-[#d6b46a]/10 py-2 last:border-0">
              <MafiaRoleThumb role={role} alt={ROLE_LABELS[role][locale]} />
              <span className="min-w-0 flex-1 truncate text-sm font-semibold">{playerName(id)}</span>
              <span className="text-xs text-[#d6b46a]">{ROLE_LABELS[role][locale]}</span>
              <span className="text-xs" aria-label={gs.roleSeenIds.includes(id) ? l('Карта просмотрена', 'Card viewed') : l('Карта не просмотрена', 'Card not viewed')}>{gs.roleSeenIds.includes(id) ? '✓' : '—'}</span>
            </div>
          ))}
        </div>
      </div>
      <button type="button" className={club.primaryButton} onClick={handleStartNight}>{l('Погрузить город в ночь', 'Send the city into the night')}</button>
    </div>
  ) : (
    <div className="flex flex-1 flex-col py-2 text-center">
      <span className={club.kicker}>{l('ВАША ТАЙНАЯ РОЛЬ', 'YOUR SECRET ROLE')}</span>
      <h2 className={`${club.title} !text-[36px]`}>
        {roleRevealed ? l('Никому не показывайте', 'Do not show anyone') : l('Узнайте, кто вы', 'Discover who you are')}
      </h2>
      <p className={club.subtitle}>
        {roleRevealed ? l('Отпустите карту, чтобы снова скрыть роль.', 'Release the card to hide your role again.') : l('Убедитесь, что никто не смотрит на экран.', 'Make sure nobody can see your screen.')}
      </p>

      <button
        type="button"
        className={`${club.card} relative my-5 flex min-h-[455px] flex-1 touch-none select-none items-center justify-center overflow-hidden p-3`}
        aria-label={l('Удерживайте, чтобы увидеть роль', 'Press and hold to reveal your role')}
        aria-pressed={roleRevealed}
        onPointerDown={handleRoleRevealStart}
        onPointerUp={() => setRoleRevealed(false)}
        onPointerCancel={() => setRoleRevealed(false)}
        onPointerLeave={() => setRoleRevealed(false)}
        onKeyDown={(event) => {
          if (event.key === ' ' || event.key === 'Enter') { event.preventDefault(); handleRoleRevealStart(); }
        }}
        onKeyUp={(event) => {
          if (event.key === ' ' || event.key === 'Enter') { event.preventDefault(); setRoleRevealed(false); }
        }}
        onContextMenu={(event) => event.preventDefault()}
      >
        {roleRevealed && myRole ? (
          <div className="w-full animate-scale-in">
            <MafiaRoleCard role={myRole} alt={`${l('Ваша роль', 'Your role')}: ${ROLE_LABELS[myRole][locale]}`} priority />
          </div>
        ) : (
          <div className="flex flex-col items-center px-6">
            <div className="mb-12 font-serif text-[112px] leading-none text-[#d6b46a]/10">M</div>
            <div className="flex h-28 w-28 flex-col items-center justify-center rounded-full border border-[#d6b46a]/45 text-[#f0d795] shadow-[0_0_0_8px_rgba(214,180,106,.035)]">
              <span className="text-2xl">◉</span>
              <b className="mt-2 text-[11px]">{l('Удерживайте', 'Press and hold')}</b>
            </div>
            <p className="mt-7 max-w-[230px] text-xs leading-relaxed text-[#fbf3df]/40">
              {l('Роль скроется, как только вы отпустите экран.', 'Your role will hide as soon as you release the screen.')}
            </p>
          </div>
        )}
      </button>

      {myRole && roleSeen && !roleRevealed && (
        <div className={`${club.card} mb-4 flex items-center gap-3 p-4 text-left`}>
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-[#d6b46a]/35 text-[#d6b46a]" aria-hidden="true">✓</span>
          <div>
            <span className={club.kicker}>{l('КАРТА ПРОСМОТРЕНА', 'CARD VIEWED')}</span>
            <p className="mt-1 text-xs text-[#fbf3df]/48">{l('Ваша роль снова скрыта. Удерживайте карту, чтобы посмотреть ещё раз.', 'Your role is hidden again. Press and hold the card to view it once more.')}</p>
          </div>
        </div>
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
                .filter((id) => id !== effectivePlayerId && id !== gs.lastDoctorSave)
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

        {isMafiaHost && (
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

      {isMafiaHost && (
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

        {isMafiaHost && totalVotes >= totalVoters && (
          <GlassButton variant="danger" size="lg" onClick={handleResolveVotes}>
            {l('Подвести итоги', 'Resolve Votes')}
          </GlassButton>
        )}
        {isMafiaHost && totalVotes > 0 && totalVotes < totalVoters && (
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
            {isMafiaHost && (
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
            {isMafiaHost && (
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
  // APPROVED DESIGN: Private club production views
  // -----------------------------------------------------------------------
  const renderNightClub = () => {
    const targets = otherAlivePlayers;
    const currentStage = gs.nightStage ?? 'mafia';
    const stages = getAvailableNightStages(gs.roles, gs.alive);
    const currentStageIndex = stages.indexOf(currentStage);
    const nextStage = stages[currentStageIndex + 1] ?? null;
    const mafiaMembers = gs.alive.filter((id) => isMafiaRole(gs.roles[id]));
    const hasAliveDon = mafiaMembers.some((id) => gs.roles[id] === 'don');
    const isMyAbilityBlocked = Boolean(
      effectivePlayerId
      && gs.loverVisit === effectivePlayerId
      && currentStage !== 'mafia'
      && currentStage !== 'lover',
    );
    const stageLabel = (stage: MafiaNightStage) => ({
      mafia: l('Мафия и Дон', 'Mafia and Don'),
      lover: l('Любовница', 'Lover'),
      maniac: l('Маньяк', 'Maniac'),
      doctor: l('Доктор', 'Doctor'),
      detective: l('Шериф', 'Detective'),
      don: l('Дон ищет Шерифа', 'Don searches for the Detective'),
    })[stage];
    const renderTargets = (
      ids: string[],
      action: (id: string) => void,
      meta = l('Гость клуба', 'Club guest'),
      danger = false,
    ) => (
      <div className={club.playerList}>
        {ids.map((id) => {
          const name = playerName(id);
          return (
            <button key={id} type="button" className={`${club.playerButton} ${danger ? club.playerButtonDanger : ''}`} onClick={() => action(id)}>
              <MafiaPlayerToken name={name} />
              <span className={club.playerName}>{name}</span>
              <span className={club.playerMeta}>{!gs.alive.includes(id) ? l('ВЫБЫЛ', 'OUT') : meta}</span>
            </button>
          );
        })}
      </div>
    );

    const actionPanel = (role: MafiaRole, heading: string, copy: string, body: React.ReactNode, danger = false) => (
      <div className="flex flex-1 flex-col">
        <div className="mb-5 flex items-center gap-3">
          <MafiaRoleThumb role={role} alt="" />
          <div><span className={club.kicker}>{l('ВАШЕ НОЧНОЕ ДЕЙСТВИЕ', 'YOUR NIGHT ACTION')}</span><h2 className="mt-1 font-serif text-3xl leading-none">{heading}</h2></div>
        </div>
        <p className={`${club.subtitle} mb-5`}>{copy}</p>
        <div className={`${club.card} ${danger ? club.cardDanger : ''} flex-1 p-3`}>{body}</div>
      </div>
    );

    const renderMafiaTargets = () => (
      <div className={club.playerList}>
        {targets.filter((id) => !isMafiaRole(gs.roles[id])).map((id) => {
          const name = playerName(id);
          const voters = mafiaMembers.filter((memberId) => gs.mafiaVotes[memberId] === id);
          const isOwnChoice = Boolean(effectivePlayerId && gs.mafiaVotes[effectivePlayerId] === id);
          const teammateVoters = voters.filter((id) => id !== effectivePlayerId);
          return (
            <button key={id} type="button" className={`${club.playerButton} ${club.playerButtonDanger} ${isOwnChoice ? 'ring-2 ring-[#f0d795] ring-offset-2 ring-offset-[#170919]' : ''}`} aria-pressed={isOwnChoice} onClick={() => handleMafiaVote(id)}>
              <MafiaPlayerToken name={name} />
              <span className={club.playerName}>{name}</span>
              <span className="ml-auto flex max-w-[48%] flex-col items-end gap-1 text-right">
                {isOwnChoice && <b className="text-[10px] uppercase tracking-[0.12em] text-[#f0d795]">{l('Ваш выбор', 'Your choice')}</b>}
                {teammateVoters.length > 0 && <span className="text-[10px] leading-tight text-[#efb4b9]">{l('Голоса семьи:', 'Family votes:')} {teammateVoters.map(playerName).join(', ')}</span>}
                {!isOwnChoice && teammateVoters.length === 0 && <span className={club.playerMeta}>{l('ЦЕЛЬ', 'TARGET')}</span>}
              </span>
            </button>
          );
        })}
      </div>
    );

    const renderHostNightConsole = () => {
      const stageActorIds = currentStage === 'mafia'
        ? mafiaMembers
        : gs.alive.filter((id) => gs.roles[id] === NIGHT_STAGE_ROLE[currentStage]);
      const blockedActor = currentStage !== 'mafia' && currentStage !== 'lover'
        ? stageActorIds.find((id) => gs.loverVisit === id)
        : undefined;
      const decisionRows: { actor: string; target: string | null }[] = currentStage === 'mafia'
        ? mafiaMembers.map((id) => ({ actor: id, target: gs.mafiaVotes[id] ?? null }))
        : currentStage === 'lover'
        ? stageActorIds.map((id) => ({ actor: id, target: gs.loverVisit }))
        : currentStage === 'maniac'
        ? stageActorIds.map((id) => ({ actor: id, target: gs.maniacKill }))
        : currentStage === 'doctor'
        ? stageActorIds.map((id) => ({ actor: id, target: gs.doctorSave }))
        : currentStage === 'detective'
        ? stageActorIds.map((id) => ({ actor: id, target: gs.detectiveCheck }))
        : stageActorIds.map((id) => ({ actor: id, target: gs.donCheck }));
      const accepted = blockedActor ? decisionRows.length : currentStage === 'maniac' && gs.maniacActed ? decisionRows.length : decisionRows.filter((row) => row.target !== null).length;

      return (
        <div className="flex flex-1 flex-col">
          <span className={club.kicker}>{l('ПУЛЬТ ВЕДУЩЕГО · ТЕКУЩИЙ ЭТАП', 'HOST CONSOLE · CURRENT STAGE')}</span>
          <h2 className={`${club.title} !text-[38px]`}>{stageLabel(currentStage)}</h2>
          <p className={`${club.subtitle} mb-5`}>{blockedActor ? l(`${playerName(blockedActor)} заблокирован любовницей и пропускает действие.`, `${playerName(blockedActor)} is blocked by the Lover and skips the action.`) : l('Следите за решениями игроков. Когда этап завершён, разбудите следующую роль.', 'Watch the players’ decisions. When the stage is complete, wake the next role.')}</p>
          <div className={`${blockedActor ? club.cardDanger : club.cardGold} ${club.card} mb-4 p-4`}>
            <div className="flex items-center justify-between"><span className={club.kicker}>{l('РЕШЕНИЙ ПРИНЯТО', 'DECISIONS RECEIVED')}</span><b className="font-serif text-2xl text-[#f0d795]">{accepted} / {decisionRows.length}</b></div>
          </div>
          <div className={`${club.card} flex-1 p-4`}>
            <span className={club.kicker}>{l('ДЕЙСТВИЯ ИГРОКОВ', 'PLAYER ACTIONS')}</span>
            <div className="mt-3 space-y-2">
              {decisionRows.map(({ actor, target }) => (
                <div key={actor} className="flex min-h-14 items-center gap-3 border-b border-[#d6b46a]/10 py-2 last:border-0">
                  <MafiaRoleThumb role={gs.roles[actor]} alt={ROLE_LABELS[gs.roles[actor]][locale]} />
                  <div className="min-w-0 flex-1"><b className="block truncate text-sm">{playerName(actor)}</b><span className="text-[10px] uppercase tracking-[0.12em] text-[#d6b46a]">{ROLE_LABELS[gs.roles[actor]][locale]}</span></div>
                  <span className="max-w-[42%] text-right text-xs text-[#fbf3df]/65">{blockedActor === actor ? l('Ход заблокирован', 'Action blocked') : target ? playerName(target) : currentStage === 'maniac' && gs.maniacActed ? l('Пропустил ход', 'Skipped action') : l('Ожидаем решение', 'Waiting for decision')}</span>
                </div>
              ))}
            </div>
          </div>
          <button type="button" className={`${nextStage ? club.primaryButton : club.dangerButton} mt-5`} onClick={handleAdvanceNightStage}>
            {nextStage ? l(`Следующий этап: ${stageLabel(nextStage)}`, `Next stage: ${stageLabel(nextStage)}`) : l('Завершить ночь и объявить утро', 'End the night and announce dawn')}
          </button>
        </div>
      );
    };

    let content: React.ReactNode;
    if (isMafiaHost) {
      content = renderHostNightConsole();
    } else if (!amAlive) {
      content = (
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <span className={club.kicker}>{l('ВЫ ПОКИНУЛИ КЛУБ', 'YOU LEFT THE CLUB')}</span>
          <h2 className={club.title}>{l('Наблюдайте\nза ночью', 'Watch the\nnight unfold').split('\n').map((line, index) => <span key={line}>{index > 0 && <br />}{line}</span>)}</h2>
          <p className={club.subtitle}>{l('Ваши действия завершены, но история города продолжается.', 'Your actions are over, but the city story continues.')}</p>
        </div>
      );
    } else if (currentStage === 'mafia' && isMafiaRole(myRole)) {
      const mafiaActionCopy = gs.round === 1
        ? hasAliveDon
          ? l('Познакомьтесь с семьёй и выберите цель. При разногласии последнее слово остаётся за Доном.', 'Meet the family and choose a target. If you disagree, the Don has the final word.')
          : l('Познакомьтесь с семьёй и выберите общую цель.', 'Meet the family and choose a shared target.')
        : hasAliveDon
        ? l('Выберите цель. Ваш выбор и голоса семьи отмечены разными индикаторами. Последнее слово остаётся за Доном.', 'Choose a target. Your choice and family votes use different indicators. The Don has the final word.')
        : l('Выберите общую цель. Ваш выбор и голоса семьи отмечены разными индикаторами.', 'Choose a shared target. Your choice and family votes use different indicators.');
      content = actionPanel('mafia', l('Кого сегодня не станет?', 'Who will disappear tonight?'), mafiaActionCopy, <><div className={`${club.cardGold} mb-3 p-3 text-xs`}><span className={club.kicker}>{l('ВАША СЕМЬЯ', 'YOUR FAMILY')}</span><p className="mt-2 text-[#fbf3df]/65">{mafiaMembers.map((id) => `${playerName(id)} · ${ROLE_LABELS[gs.roles[id]][locale]}`).join('  /  ')}</p></div>{renderMafiaTargets()}</>, true);
    } else if (isMyAbilityBlocked && NIGHT_STAGE_ROLE[currentStage] === myRole) {
      content = (
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <div className={club.statusSeal}><strong>×</strong><span>{l('действие заблокировано', 'action blocked')}</span></div>
          <h2 className={`${club.title} mt-8 !text-[38px]`}>{l('Этой ночью вы пропускаете ход', 'You skip your action tonight')}</h2>
          <p className={club.subtitle}>{l('Любовница заблокировала вашу способность. Ожидайте следующего этапа.', 'The Lover blocked your ability. Wait for the next stage.')}</p>
        </div>
      );
    } else if (currentStage === 'don' && myRole === 'don' && !donCheckDone) {
      content = actionPanel('don', l('Кто скрывает жетон шерифа?', 'Who carries the sheriff badge?'), l('Проверьте одного участника. Результат узнаете только вы.', 'Inspect one player. Only you will learn the result.'), renderTargets(Object.keys(gs.roles).filter((id) => id !== effectivePlayerId), handleDonCheck, l('ПРОВЕРИТЬ', 'CHECK')));
    } else if (currentStage === 'detective' && myRole === 'detective' && !detectiveDone) {
      content = actionPanel('detective', l('Кому нельзя доверять?', 'Who cannot be trusted?'), l('Проверьте одного живого игрока этой ночью.', 'Investigate one living player tonight.'), pendingDetectiveTargetId ? <div className="flex h-full flex-col items-center justify-center text-center"><MafiaPlayerToken name={playerName(pendingDetectiveTargetId)} /><span className={`${club.kicker} mt-5`}>{l('ПОДТВЕРДИТЕ ПРОВЕРКУ', 'CONFIRM INVESTIGATION')}</span><h3 className="mt-3 font-serif text-3xl">{playerName(pendingDetectiveTargetId)}</h3><p className={`${club.subtitle} mt-3`}>{l('После подтверждения выбор изменить нельзя.', 'You cannot change this choice after confirming.')}</p><div className="mt-6 grid w-full grid-cols-2 gap-3"><button type="button" className={club.secondaryButton} onClick={() => setPendingDetectiveTargetId(null)}>{l('Назад', 'Back')}</button><button type="button" className={club.primaryButton} onClick={() => handleDetectiveCheck(pendingDetectiveTargetId)}>{l('Подтвердить', 'Confirm')}</button></div></div> : renderTargets(targets, setPendingDetectiveTargetId, l('ВЫБРАТЬ', 'SELECT')));
    } else if (currentStage === 'doctor' && myRole === 'doctor' && !doctorDone) {
      content = actionPanel('doctor', l('Кого защитить этой ночью?', 'Who should be protected?'), l('Нельзя лечить себя и одного игрока две ночи подряд.', 'You cannot heal yourself or the same player on consecutive nights.'), pendingDoctorTargetId ? <div className="flex h-full flex-col items-center justify-center text-center"><MafiaPlayerToken name={playerName(pendingDoctorTargetId)} /><span className={`${club.kicker} mt-5`}>{l('ПОДТВЕРДИТЕ ЗАЩИТУ', 'CONFIRM PROTECTION')}</span><h3 className="mt-3 font-serif text-3xl">{playerName(pendingDoctorTargetId)}</h3><p className={`${club.subtitle} mt-3`}>{l('После подтверждения выбор изменить нельзя.', 'You cannot change this choice after confirming.')}</p><div className="mt-6 grid w-full grid-cols-2 gap-3"><button type="button" className={club.secondaryButton} onClick={() => setPendingDoctorTargetId(null)}>{l('Назад', 'Back')}</button><button type="button" className={club.primaryButton} onClick={() => handleDoctorSave(pendingDoctorTargetId)}>{l('Подтвердить', 'Confirm')}</button></div></div> : renderTargets(gs.alive.filter((id) => id !== effectivePlayerId && id !== gs.lastDoctorSave), setPendingDoctorTargetId, l('ВЫБРАТЬ', 'SELECT')));
    } else if (currentStage === 'maniac' && myRole === 'maniac' && !nightActionDone && !maniacDone) {
      content = actionPanel('maniac', l('Кто станет вашей целью?', 'Who becomes your target?'), l('Вы играете один. Можно отказаться от действия.', 'You play alone. You may skip the action.'), <><div className={club.playerList}>{renderTargets(targets, handleManiacKill, l('ЦЕЛЬ', 'TARGET'), true)}</div><button type="button" className={`${club.secondaryButton} mt-3 w-full`} onClick={() => handleManiacKill(null)}>{l('Никого не выбирать', 'Choose nobody')}</button></>, true);
    } else if (currentStage === 'lover' && myRole === 'lover' && !loverDone) {
      content = actionPanel('lover', l('К кому отправиться?', 'Who will you visit?'), l('Нельзя выбрать себя или одного игрока две ночи подряд. Ход мафии уже состоялся и не блокируется.', 'You cannot choose yourself or the same player on consecutive nights. The Mafia has already acted and cannot be blocked.'), renderTargets(targets.filter((id) => id !== gs.lastLoverVisit), handleLoverVisit, l('НАВЕСТИТЬ', 'VISIT')));
    } else {
      content = (
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <div className={club.statusSeal}><strong>{nightActionDone ? '✓' : 'I'}</strong><span>{nightActionDone ? l('решение принято', 'decision accepted') : l('город спит', 'city sleeps')}</span></div>
          <h2 className={`${club.title} mt-8 !text-[38px]`}>{nightActionDone ? l('Ваш выбор сохранён', 'Your choice is sealed') : l('Ожидайте наступления утра', 'Wait for the dawn')}</h2>
          <p className={club.subtitle}>{myRole === 'citizen' ? l('Закройте глаза. Ночные роли принимают решения.', 'Close your eyes. Night roles are making decisions.') : l('Решение скрыто от остальных гостей клуба.', 'The decision is hidden from the other club guests.')}</p>
          {myRole === 'detective' && gs.detectiveResult && gs.detectiveCheck && (
            <div className={`${club.cardGold} ${club.card} mt-6 w-full p-4 text-left`}><span className={club.kicker}>{l('РЕЗУЛЬТАТ ПРОВЕРКИ', 'INVESTIGATION RESULT')}</span><p className="mt-2 text-sm"><b>{playerName(gs.detectiveCheck)}</b> — {ROLE_LABELS[gs.detectiveResult][locale]}</p></div>
          )}
          {myRole === 'don' && gs.donCheck && gs.donCheckResult !== null && (
            <div className={`${club.cardDanger} ${club.card} mt-6 w-full p-4 text-left`}><span className={club.kicker}>{l('РЕЗУЛЬТАТ ПРОВЕРКИ', 'CHECK RESULT')}</span><p className="mt-2 text-sm"><b>{playerName(gs.donCheck)}</b> — {gs.donCheckResult ? l('это шериф', 'is the sheriff') : l('не шериф', 'is not the sheriff')}</p></div>
          )}
        </div>
      );
    }

    return (
      <div className="flex flex-1 flex-col">
        <div className="mb-5 text-center"><span className={club.kicker}>{l(`НОЧЬ ${gs.round}`, `NIGHT ${gs.round}`)}</span><MafiaOrnament /></div>
        {content}
      </div>
    );
  };

  const renderDayClub = () => {
    const killedIds = gs.lastNightKills.length > 0 ? gs.lastNightKills : (gs.lastNightKill ? [gs.lastNightKill] : []);
    return (
      <div className="flex flex-1 flex-col">
        <span className={club.kicker}>{l('УТРО · СВОДКА КЛУБА', 'MORNING · CLUB REPORT')}</span>
        <h2 className={club.title}>{l('Город снова\nоткрыл глаза', 'The city opens\nits eyes again').split('\n').map((line, index) => <span key={line}>{index > 0 && <br />}{line}</span>)}</h2>

        {myRole === 'detective' && gs.detectiveCheck && gs.detectiveResult && (
          <div className={`${club.cardGold} ${club.card} mb-4 p-5 text-left`}>
            <span className={club.kicker}>{l('ВАША НОЧНАЯ ПРОВЕРКА', 'YOUR NIGHT INVESTIGATION')}</span>
            <h3 className="mt-3 font-serif text-2xl">{playerName(gs.detectiveCheck)}</h3>
            <p className="mt-2 text-sm text-[#fbf3df]/65">
              {l('Результат:', 'Result:')} <b className="text-[#f0d795]">{ROLE_LABELS[gs.detectiveResult][locale]}</b>
            </p>
          </div>
        )}

        {myRole === 'don' && gs.donCheck && gs.donCheckResult !== null && (
          <div className={`${club.cardDanger} ${club.card} mb-4 p-5 text-left`}>
            <span className={club.kicker}>{l('ВАША НОЧНАЯ ПРОВЕРКА', 'YOUR NIGHT INVESTIGATION')}</span>
            <h3 className="mt-3 font-serif text-2xl">{playerName(gs.donCheck)}</h3>
            <p className="mt-2 text-sm text-[#fbf3df]/65">
              {gs.donCheckResult ? l('Это Шериф.', 'This is the Detective.') : l('Это не Шериф.', 'This is not the Detective.')}
            </p>
          </div>
        )}

        <div className={`${club.card} ${killedIds.length > 0 ? club.cardDanger : club.cardSuccess} mb-4 p-5 text-center`}>
          {killedIds.length > 0 ? (
            <><span className={club.kicker}>{l('ЭТОЙ НОЧЬЮ КЛУБ ПОКИНУЛИ', 'LEFT THE CLUB TONIGHT')}</span><div className="mt-4 space-y-3">{killedIds.map((id) => <div key={id} className="flex items-center justify-center gap-3"><MafiaPlayerToken name={playerName(id)} /><div className="text-left"><b className="block font-serif text-xl">{playerName(id)}</b><span className="text-xs text-[#fbf3df]/45">{ROLE_LABELS[gs.roles[id]][locale]}</span></div></div>)}</div></>
          ) : (
            <><span className={club.kicker}>{l('НИКТО НЕ ПОКИНУЛ ГОРОД', 'NOBODY LEFT THE CITY')}</span><h3 className="mt-3 font-serif text-2xl">{gs.lastNightSaved ? l('Доктор изменил исход ночи', 'The doctor changed the night') : l('Ночь прошла спокойно', 'The night passed quietly')}</h3></>
          )}
        </div>

        <div className={`${club.cardGold} ${club.card} mb-4 min-h-[92px] p-5`}>
          <div className="flex items-end justify-between gap-4"><div><span className={club.kicker}>{l('ДО ГОЛОСОВАНИЯ', 'UNTIL VOTING')}</span><p className="mt-2 text-xs text-[#fbf3df]/45">{l('Обсудите, кому больше нельзя доверять', 'Discuss who can no longer be trusted')}</p></div><b className="inline-block w-[5ch] shrink-0 text-right font-mono text-4xl tabular-nums text-[#f0d795]">{Math.floor(dayTimerValue / 60)}:{String(dayTimerValue % 60).padStart(2, '0')}</b></div>
          <div className="mt-4 h-0.5 bg-[#d6b46a]/10"><div className="h-full bg-[#d6b46a] shadow-[0_0_12px_rgba(214,180,106,.5)]" style={{ width: `${Math.max(0, Math.min(100, (dayTimerValue / 60) * 100))}%` }} /></div>
        </div>

        <div className={`${club.card} mb-5 p-4`}><div className="mb-3 flex items-center justify-between"><span className={club.kicker}>{l('В КЛУБЕ ОСТАЛИСЬ', 'STILL IN THE CLUB')}</span><b className="font-serif text-xl text-[#d6b46a]">{gs.alive.length}</b></div><div className="flex flex-wrap gap-2">{gs.alive.map((id) => <span key={id} className="inline-flex min-h-10 items-center gap-2 rounded-full border border-[#d6b46a]/15 px-3 text-xs"><MafiaPlayerToken name={playerName(id)} /><span>{playerName(id)}</span>{id === effectivePlayerId && <b className="text-[#d6b46a]">{l('ВЫ', 'YOU')}</b>}</span>)}</div></div>
        {renderHostRoleRoster()}
        {isMafiaHost && <button type="button" className={club.primaryButton} onClick={handleStartVoting}>{l('Открыть голосование', 'Open the vote')}</button>}
      </div>
    );
  };

  const renderVotingClub = () => {
    const myVote = effectivePlayerId ? gs.votes[effectivePlayerId] : undefined;
    const voteCounts = countVotes(Object.values(gs.votes));
    const totalVoters = gs.alive.length;
    const totalVotes = Object.keys(gs.votes).length;
    const isBinaryVote = gs.votingRound === 3;
    const candidateIds = gs.votingRound === 1 ? otherAlivePlayers : gs.votingCandidates.filter((id) => id !== effectivePlayerId && gs.alive.includes(id));
    const votingTitle = gs.votingRound === 1 ? l('Кто покинет клуб?', 'Who leaves the club?') : gs.votingRound === 2 ? l('Город разделился', 'The city is divided') : l('Последнее решение', 'The final decision');

    return (
      <div className="flex flex-1 flex-col">
        <span className={club.kicker}>{gs.votingRound === 1 ? l('РЕШЕНИЕ ГОРОДА', 'THE CITY DECIDES') : gs.votingRound === 2 ? l('ПЕРЕГОЛОСОВАНИЕ', 'REVOTE') : l('КАЗНИТЬ ИЛИ ПОМИЛОВАТЬ', 'EXECUTE OR PARDON')}</span>
        <h2 className={club.title}>{votingTitle}</h2>
        <p className={`${club.subtitle} mb-5`}>{l('Голос окончателен. Остальные увидят результат после завершения процедуры.', 'Your vote is final. The result appears when the procedure ends.')}</p>

        {amAlive && !myVote ? (
          pendingDayVoteTargetId ? (
            <div className={`${club.cardGold} ${club.card} p-6 text-center`}><span className={club.kicker}>{l('ПОДТВЕРДИТЕ ГОЛОС', 'CONFIRM YOUR VOTE')}</span><h3 className="mt-4 font-serif text-3xl">{pendingDayVoteTargetId === 'execute' ? l('Казнить кандидатов', 'Execute the candidates') : pendingDayVoteTargetId === 'pardon' ? l('Помиловать кандидатов', 'Pardon the candidates') : playerName(pendingDayVoteTargetId)}</h3><p className={`${club.subtitle} mt-3`}>{l('После подтверждения голос изменить нельзя.', 'You cannot change your vote after confirming.')}</p><div className="mt-6 grid grid-cols-2 gap-3"><button type="button" className={club.secondaryButton} onClick={() => setPendingDayVoteTargetId(null)}>{l('Назад', 'Back')}</button><button type="button" className={pendingDayVoteTargetId === 'execute' ? club.dangerButton : club.primaryButton} onClick={() => handleDayVote(pendingDayVoteTargetId)}>{l('Подтвердить', 'Confirm')}</button></div></div>
          ) : isBinaryVote ? (
            <div className="grid gap-3"><button type="button" className={club.dangerButton} onClick={() => setPendingDayVoteTargetId('execute')}>{l('Казнить кандидатов', 'Execute the candidates')}</button><button type="button" className={club.secondaryButton} onClick={() => setPendingDayVoteTargetId('pardon')}>{l('Помиловать кандидатов', 'Pardon the candidates')}</button></div>
          ) : (
            <div className={`${club.card} flex-1 p-3`}><div className={club.playerList}>{candidateIds.map((id) => { const name = playerName(id); return <button key={id} type="button" className={club.playerButton} onClick={() => setPendingDayVoteTargetId(id)}><MafiaPlayerToken name={name} /><span className={club.playerName}>{name}</span><span className={club.playerMeta}>{l('ВЫБРАТЬ', 'SELECT')}</span></button>; })}</div></div>
          )
        ) : (
          <div className={`${club.cardGold} ${club.card} p-6 text-center`}><div className={`${club.statusSeal} mx-auto`}><strong>{amAlive ? '✓' : '—'}</strong><span>{amAlive ? l('голос принят', 'vote accepted') : l('наблюдение', 'watching')}</span></div><h3 className="mt-6 font-serif text-2xl">{amAlive ? l('Решение запечатано', 'Your decision is sealed') : l('Вы наблюдаете за голосованием', 'You are watching the vote')}</h3>{myVote && <p className="mt-2 text-sm text-[#fbf3df]/48">{l('Ваш выбор:', 'Your choice:')} <b className="text-[#f0d795]">{myVote === 'execute' ? l('Казнить', 'Execute') : myVote === 'pardon' ? l('Помиловать', 'Pardon') : playerName(myVote)}</b></p>}</div>
        )}

        <div className={`${club.card} mt-4 p-4`}><div className="flex items-center justify-between"><span className={club.kicker}>{l('ГОЛОСОВ ПРИНЯТО', 'VOTES RECEIVED')}</span><b className="font-serif text-2xl text-[#d6b46a]">{totalVotes} / {totalVoters}</b></div><div className="mt-3 h-0.5 bg-[#d6b46a]/10"><div className="h-full bg-[#d6b46a]" style={{ width: `${totalVoters ? Math.min(100, (totalVotes / totalVoters) * 100) : 0}%` }} /></div>{Object.keys(voteCounts).length > 0 && <p className="mt-3 text-[10px] text-[#fbf3df]/35">{l('Промежуточный итог скрыт до окончания голосования.', 'The interim tally stays hidden until voting ends.')}</p>}</div>
        {isMafiaHost && Object.keys(gs.votes).length > 0 && (
          <div className={`${club.cardGold} ${club.card} mt-4 p-4 text-left`}>
            <span className={club.kicker}>{l('РЕШЕНИЯ ВИДИТ ТОЛЬКО ВЕДУЩИЙ', 'VISIBLE TO THE HOST ONLY')}</span>
            <div className="mt-3 space-y-2">{Object.entries(gs.votes).map(([voterId, targetId]) => <div key={voterId} className="flex items-center justify-between gap-3 border-b border-[#d6b46a]/10 py-2 last:border-0"><span className="truncate text-sm">{playerName(voterId)}</span><span className="text-right text-xs text-[#f0d795]">{targetId === 'execute' ? l('Казнить', 'Execute') : targetId === 'pardon' ? l('Помиловать', 'Pardon') : playerName(targetId)}</span></div>)}</div>
          </div>
        )}
        {renderHostRoleRoster()}
        {isMafiaHost && totalVotes >= totalVoters && <button type="button" className={`${club.dangerButton} mt-4`} onClick={handleResolveVotes}>{l('Огласить решение', 'Announce the decision')}</button>}
        {isMafiaHost && totalVotes > 0 && totalVotes < totalVoters && <button type="button" className={`${club.secondaryButton} mt-3`} onClick={handleResolveVotes}>{l('Завершить досрочно', 'End early')}</button>}
      </div>
    );
  };

  const renderResultsClub = () => {
    const lastEliminated = gs.lastVoteTargetIds.filter((id) => !gs.alive.includes(id)).map((id) => ({ id, role: gs.roles[id] })).filter((item): item is { id: string; role: MafiaRole } => Boolean(item.role));
    if (gs.winner) {
      const winnerTitle = gs.winner === 'mafia' ? l('Мафия победила', 'The mafia wins') : gs.winner === 'maniac' ? l('Маньяк победил', 'The maniac wins') : l('Мирные жители победили', 'The citizens win');
      return (
        <div className="flex flex-1 flex-col text-center"><span className={club.kicker}>{l('КЛУБ ЗАКРЫВАЕТСЯ', 'THE CLUB IS CLOSING')}</span><h2 className={club.title}>{winnerTitle}</h2><p className={`${club.subtitle} mb-6`}>{l('Все тайны этого вечера раскрыты.', 'Every secret of the evening is now revealed.')}</p><div className={`${club.cardGold} ${club.card} mb-5 flex-1 p-4 text-left`}><span className={club.kicker}>{l('ВСЕ РОЛИ', 'ALL ROLES')}</span><div className="mt-3 space-y-2">{Object.entries(gs.roles).map(([id, role]) => <div key={id} className="flex items-center gap-3 border-b border-[#d6b46a]/10 py-2 last:border-0"><MafiaRoleThumb role={role} /><span className="min-w-0 flex-1 truncate text-sm font-semibold">{playerName(id)}</span><span className="text-xs text-[#d6b46a]">{ROLE_LABELS[role][locale]}</span></div>)}</div></div>{isMafiaHost && <button type="button" className={club.primaryButton} onClick={handleEndGame}>{l('Вернуться в лобби', 'Return to lobby')}</button>}</div>
      );
    }

    const eliminated = gs.lastVoteResult === 'eliminated' && lastEliminated.length > 0;
    const pardoned = gs.lastVoteResult === 'pardoned';
    return (
        <div className="flex flex-1 flex-col items-center justify-center text-center"><span className={club.kicker}>{eliminated ? l('ПРИГОВОР ГОРОДА', 'THE CITY VERDICT') : pardoned ? l('РЕШЕНИЕ ГОРОДА', 'THE CITY DECISION') : l('АЛИБИ ПОДТВЕРЖДЕНО', 'ALIBI CONFIRMED')}</span><div className="my-7 flex gap-3">{eliminated ? lastEliminated.map((item) => <MafiaPlayerToken key={item.id} name={playerName(item.id)} />) : <div className={club.statusSeal}><strong>—</strong><span>{l('никто не выбыл', 'nobody left')}</span></div>}</div><h2 className={`${club.title} !text-[38px]`}>{eliminated ? (lastEliminated.length === 1 ? l(`${playerName(lastEliminated[0].id)} покидает клуб`, `${playerName(lastEliminated[0].id)} leaves the club`) : l('Кандидаты покидают клуб', 'The candidates leave the club')) : pardoned ? l('Кандидаты помилованы', 'The candidates are pardoned') : l('Алиби изменило решение', 'The alibi changed the verdict')}</h2>{eliminated && <div className={`${club.cardDanger} ${club.card} w-full p-4`}>{lastEliminated.map((item) => <p key={item.id} className="text-sm font-semibold">{playerName(item.id)}</p>)}</div>} {!eliminated && <p className={club.subtitle}>{pardoned && gs.lastVoteTargetIds.length > 0 ? l(`${gs.lastVoteTargetIds.map(playerName).join(', ')} остаются в игре.`, `${gs.lastVoteTargetIds.map(playerName).join(', ')} remain in the game.`) : gs.lastVoteTargetIds[0] ? l(`${playerName(gs.lastVoteTargetIds[0])} остаётся в игре.`, `${playerName(gs.lastVoteTargetIds[0])} stays in the game.`) : l('Никто не покидает город.', 'Nobody leaves the city.')}</p>}{isMafiaHost && <button type="button" className={`${club.primaryButton} mt-7 w-full`} onClick={handleNextNight}>{l('Начать следующую ночь', 'Begin the next night')}</button>}</div>
    );
  };

  // -----------------------------------------------------------------------
  // Main render
  // -----------------------------------------------------------------------
  const phaseRenderers: Record<string, () => React.JSX.Element> = {
    lobby: renderLobby,
    'role-reveal': renderRoleReveal,
    night: renderNightClub,
    day: renderDayClub,
    voting: renderVotingClub,
    results: renderResultsClub,
  };

  const phaseLabel = gs.phase === 'lobby'
    ? l('Сбор гостей', 'Guest reception')
    : gs.phase === 'role-reveal'
    ? l('Раздача ролей', 'Role assignment')
    : gs.phase === 'night'
    ? l('Ночное заседание', 'Night session')
    : gs.phase === 'day'
    ? l('Дневное обсуждение', 'Day discussion')
    : gs.phase === 'voting'
    ? l('Голосование', 'Voting')
    : gs.winner
    ? l('Вечер завершён', 'Evening complete')
    : l('Решение города', 'City verdict');

  return (
    <MafiaClubMobileLayout
      phase={phaseLabel}
      round={gs.round || undefined}
      onEnd={isMafiaHost ? handleEndGame : undefined}
      phaseKey={gs.phase}
      locale={locale}
    >
      {(phaseRenderers[gs.phase] ?? renderLobby)()}
    </MafiaClubMobileLayout>
  );
}
