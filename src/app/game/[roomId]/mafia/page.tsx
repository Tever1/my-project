'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';
import { useSocket } from '@/lib/use-socket';
import { useTranslation } from '@/lib/i18n';
import { useAuth } from '@/lib/auth-context';
import { GameLayout } from '@/components/games/GameLayout';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { MafiaRole, MafiaPhase } from '@/types/game';
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
  detectiveCheck: string | null; // targetId checked this night
  detectiveResult: MafiaRole | null;
  doctorSave: string | null; // targetId saved this night
  dayTimer: number;
  votes: Record<string, string>; // voterId -> targetId
  lastNightKill: string | null;
  lastNightSaved: boolean;
  winner: 'mafia' | 'citizens' | null;
  round: number;
}

type GameAction =
  | { type: 'start-game' }
  | { type: 'sync-state'; state: MafiaGameState }
  | { type: 'assign-roles'; roles: Record<string, MafiaRole> }
  | { type: 'start-night' }
  | { type: 'mafia-vote'; voterId: string; targetId: string }
  | { type: 'detective-check'; detectiveId: string; targetId: string }
  | { type: 'detective-result'; role: MafiaRole; detectiveId: string }
  | { type: 'doctor-save'; doctorId: string; targetId: string }
  | { type: 'resolve-night' }
  | { type: 'night-result'; killedId: string | null; saved: boolean }
  | { type: 'start-voting' }
  | { type: 'cast-vote'; voterId: string; targetId: string }
  | { type: 'resolve-votes' }
  | { type: 'eliminate'; playerId: string; role: MafiaRole }
  | { type: 'game-over'; winner: 'mafia' | 'citizens' }
  | { type: 'end-game' };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ROLE_LABELS: Record<MafiaRole, { ru: string; en: string }> = {
  citizen: { ru: 'Мирный', en: 'Citizen' },
  mafia: { ru: 'Мафия', en: 'Mafia' },
  detective: { ru: 'Детектив', en: 'Detective' },
  doctor: { ru: 'Доктор', en: 'Doctor' },
};

const ROLE_ICONS: Record<MafiaRole, string> = {
  citizen: '👤',
  mafia: '🔫',
  detective: '🔍',
  doctor: '💉',
};

function assignRoles(playerIds: string[]): Record<string, MafiaRole> {
  const shuffled = [...playerIds].sort(() => Math.random() - 0.5);
  const roles: Record<string, MafiaRole> = {};
  const count = shuffled.length;

  const mafiaCount = count >= 6 ? 2 : 1;
  const hasDetective = count >= 5;
  const hasDoctor = count >= 6;

  let idx = 0;
  for (let m = 0; m < mafiaCount; m++) {
    roles[shuffled[idx++]] = 'mafia';
  }
  if (hasDetective) {
    roles[shuffled[idx++]] = 'detective';
  }
  if (hasDoctor) {
    roles[shuffled[idx++]] = 'doctor';
  }
  while (idx < count) {
    roles[shuffled[idx++]] = 'citizen';
  }
  return roles;
}

function checkWin(
  alive: string[],
  roles: Record<string, MafiaRole>,
): 'mafia' | 'citizens' | null {
  const aliveMafia = alive.filter((id) => roles[id] === 'mafia').length;
  const aliveOthers = alive.length - aliveMafia;
  if (aliveMafia === 0) return 'citizens';
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
    detectiveCheck: null,
    detectiveResult: null,
    doctorSave: null,
    dayTimer: 0,
    votes: {},
    lastNightKill: null,
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
  const { emit, on, isConnected } = useSocket();
  const { locale } = useTranslation();
  const { user } = useAuth();

  const [players, setPlayers] = useState<Player[]>([]);
  const [gs, setGs] = useState<MafiaGameState>(getInitialState);
  const [roleRevealed, setRoleRevealed] = useState(false);
  const [nightActionDone, setNightActionDone] = useState(false);
  const [dayTimerValue, setDayTimerValue] = useState(60);
  // Cache of id→nickname that only grows — survives player disconnection
  const nicknameCacheRef = useRef<Record<string, string>>({});

  const isHost = players.find((p) => p.isHost)?.id === user?.id;
  const myRole = user ? gs.roles[user.id] : undefined;
  const amAlive = user ? gs.alive.includes(user.id) : false;
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const playerName = useCallback(
    (id: string) => nicknameCacheRef.current[id] ?? players.find((p) => p.id === id)?.nickname ?? id,
    [players],
  );

  // -----------------------------------------------------------------------
  // Broadcast helper
  // -----------------------------------------------------------------------
  const broadcast = useCallback(
    (action: GameAction) => {
      emit('game:action', { code: roomId, action: 'mafia', payload: action });
    },
    [emit, roomId],
  );

  // -----------------------------------------------------------------------
  // Listen for room state (players list)
  // -----------------------------------------------------------------------
  useEffect(() => {
    const cleanup = on('room:state', (data: unknown) => {
      const room = data as { players?: Player[] };
      if (room.players) {
        // Populate cache — never evict so disconnected players keep their name
        room.players.forEach(p => { nicknameCacheRef.current[p.id] = p.nickname; });
        setPlayers(room.players);
      }
    });
    emit('room:get-state', { code: roomId });
    return cleanup;
  }, [on, emit, roomId]);

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

        case 'assign-roles':
          setGs((prev) => ({
            ...prev,
            phase: 'role-reveal',
            roles: payload.roles,
            alive: Object.keys(payload.roles),
            round: 1,
          }));
          setRoleRevealed(false);
          break;

        case 'start-night':
          setGs((prev) => ({
            ...prev,
            phase: 'night',
            mafiaVotes: {},
            detectiveCheck: null,
            detectiveResult: null,
            doctorSave: null,
          }));
          setNightActionDone(false);
          break;

        case 'mafia-vote':
          // Accumulate on host so handleResolveNight has all votes
          if (isHost) {
            setGs((prev) => ({
              ...prev,
              mafiaVotes: { ...prev.mafiaVotes, [payload.voterId]: payload.targetId },
            }));
          }
          break;

        case 'detective-check':
          // All clients store this so host has it for resolve night;
          // detective already set it locally in handleDetectiveCheck
          setGs((prev) => ({ ...prev, detectiveCheck: payload.targetId }));
          break;

        case 'doctor-save':
          // Accumulate on host so handleResolveNight can check the save
          if (isHost) {
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
          if (user?.id === payload.detectiveId) {
            setGs((prev) => ({
              ...prev,
              detectiveResult: payload.role,
            }));
          }
          break;

        case 'night-result':
          setGs((prev) => ({
            ...prev,
            phase: 'day',
            lastNightKill: payload.killedId,
            lastNightSaved: payload.saved,
            alive: payload.killedId
              ? prev.alive.filter((id) => id !== payload.killedId)
              : prev.alive,
            eliminated: payload.killedId
              ? [
                  ...prev.eliminated,
                  {
                    id: payload.killedId,
                    role: prev.roles[payload.killedId],
                  },
                ]
              : prev.eliminated,
            dayTimer: 60,
            votes: {},
          }));
          setDayTimerValue(60);
          break;

        case 'start-voting':
          setGs((prev) => ({ ...prev, phase: 'voting', votes: {} }));
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
  }, [on, isHost, user]);

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
    if (!user || !isConnected) return;
    broadcast({ type: 'mafia-vote', voterId: user.id, targetId });
    // Update local state immediately for instant UI feedback
    setGs((prev) => ({
      ...prev,
      mafiaVotes: { ...prev.mafiaVotes, [user.id]: targetId },
    }));
    setNightActionDone(true);
  };

  const handleDetectiveCheck = (targetId: string) => {
    if (!user || !isConnected) return;
    broadcast({ type: 'detective-check', detectiveId: user.id, targetId });
    setGs((prev) => ({ ...prev, detectiveCheck: targetId }));
    setNightActionDone(true);
  };

  const handleDoctorSave = (targetId: string) => {
    if (!user || !isConnected) return;
    broadcast({ type: 'doctor-save', doctorId: user.id, targetId });
    setGs((prev) => ({ ...prev, doctorSave: targetId }));
    setNightActionDone(true);
  };

  // -----------------------------------------------------------------------
  // Host: resolve night
  // -----------------------------------------------------------------------
  const handleResolveNight = () => {
    // Determine mafia target (majority vote)
    const voteCounts: Record<string, number> = {};
    Object.values(gs.mafiaVotes).forEach((tid) => {
      voteCounts[tid] = (voteCounts[tid] || 0) + 1;
    });
    const mafiaTarget =
      Object.entries(voteCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

    // Doctor saved?
    const saved = mafiaTarget != null && gs.doctorSave === mafiaTarget;
    const killedId = saved ? null : mafiaTarget;

    // Detective gets result — include detectiveId so only they process it
    if (gs.detectiveCheck) {
      const checkedRole = gs.roles[gs.detectiveCheck];
      const detectiveId = Object.entries(gs.roles).find(
        ([, r]) => r === 'detective',
      )?.[0];
      if (detectiveId) {
        broadcast({ type: 'detective-result', role: checkedRole, detectiveId });
      }
    }

    broadcast({ type: 'night-result', killedId, saved });

    // Check win condition after night
    const aliveAfter = killedId
      ? gs.alive.filter((id) => id !== killedId)
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
    if (!user || !isConnected) return;
    broadcast({ type: 'cast-vote', voterId: user.id, targetId });
    // Update local state immediately for instant UI feedback
    setGs((prev) => ({
      ...prev,
      votes: { ...prev.votes, [user.id]: targetId },
    }));
  };

  // -----------------------------------------------------------------------
  // Host: resolve day votes
  // -----------------------------------------------------------------------
  const handleResolveVotes = () => {
    const voteCounts: Record<string, number> = {};
    Object.values(gs.votes).forEach((tid) => {
      voteCounts[tid] = (voteCounts[tid] || 0) + 1;
    });
    const sorted = Object.entries(voteCounts).sort((a, b) => b[1] - a[1]);
    if (sorted.length > 0) {
      const eliminatedId = sorted[0][0];
      const eliminatedRole = gs.roles[eliminatedId];
      broadcast({ type: 'eliminate', playerId: eliminatedId, role: eliminatedRole });

      const aliveAfter = gs.alive.filter((id) => id !== eliminatedId);
      const winner = checkWin(aliveAfter, gs.roles);
      if (winner) {
        setTimeout(() => broadcast({ type: 'game-over', winner }), 1500);
      }
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
    // Tell the server the game is over — this triggers 'game:ended' on TV and all clients
    emit('game:end', { code: roomId });
  };

  // -----------------------------------------------------------------------
  // Render helpers
  // -----------------------------------------------------------------------

  const otherAlivePlayers = gs.alive.filter((id) => id !== user?.id);
  const mafiaTeammates =
    myRole === 'mafia'
      ? gs.alive.filter((id) => id !== user?.id && gs.roles[id] === 'mafia')
      : [];

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
        {isHost ? (
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
          <p className="text-white/40 text-sm">
            {l('Ожидание ведущего...', 'Waiting for host...')}
          </p>
        )}
        {isHost && players.length < 4 && (
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
                  'Спасите одного игрока каждую ночь',
                  'Protect one player each night',
                )}
            </p>
            {myRole === 'mafia' && mafiaTeammates.length > 0 && (
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

      {isHost && roleRevealed && (
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
        ) : myRole === 'mafia' && !nightActionDone ? (
          <GlassCard className="w-full max-w-sm">
            <h3 className="text-lg font-bold text-red-300 mb-3 text-center">
              {ROLE_ICONS.mafia} {l('Выберите жертву', 'Choose a victim')}
            </h3>
            <div className="space-y-2">
              {targets
                .filter((id) => gs.roles[id] !== 'mafia')
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
        ) : myRole === 'detective' && !nightActionDone ? (
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
        ) : myRole === 'doctor' && !nightActionDone ? (
          <GlassCard className="w-full max-w-sm">
            <h3 className="text-lg font-bold text-green-300 mb-3 text-center">
              {ROLE_ICONS.doctor} {l('Защитить игрока', 'Protect a player')}
            </h3>
            <div className="space-y-2">
              {gs.alive.map((id) => (
                <GlassButton
                  key={id}
                  className="w-full justify-start"
                  onClick={() => handleDoctorSave(id)}
                >
                  {playerName(id)} {id === user?.id ? l('(Себя)', '(Self)') : ''}
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

        {isHost && (
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
              {l('Этой ночью был убит:', 'Last night was killed:')}
            </p>
            <p className="text-2xl font-bold text-white">
              {playerName(gs.lastNightKill)}
            </p>
            <span className="glass-badge glass-badge--accent mt-2">
              {ROLE_LABELS[gs.roles[gs.lastNightKill]][locale]}
            </span>
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
              {id === user?.id ? ' (👈)' : ''}
            </span>
          ))}
        </div>
      </GlassCard>

      {isHost && (
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
    const myVote = user ? gs.votes[user.id] : undefined;
    const voteCounts: Record<string, number> = {};
    Object.values(gs.votes).forEach((tid) => {
      voteCounts[tid] = (voteCounts[tid] || 0) + 1;
    });
    const totalVoters = gs.alive.length;
    const totalVotes = Object.keys(gs.votes).length;

    return (
      <div className="flex-1 flex flex-col items-center gap-4">
        <div className="w-full text-center py-4">
          <p className="text-4xl mb-2">🗳️</p>
          <h2 className="text-2xl font-bold text-white">
            {l('Голосование', 'Voting')}
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
              {l('Кого вы подозреваете?', 'Who do you suspect?')}
            </h3>
            <div className="space-y-2">
              {otherAlivePlayers.map((id) => (
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
              ))}
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
                  {playerName(myVote!)}
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
          {gs.alive.map((id) => (
            <div
              key={id}
              className="flex items-center justify-between py-1.5 border-b border-white/5 last:border-0"
            >
              <span className="text-white/80 text-sm">{playerName(id)}</span>
              <span className="text-white/40 text-sm font-mono">
                {voteCounts[id] || 0}
              </span>
            </div>
          ))}
        </GlassCard>

        {isHost && totalVotes >= totalVoters && (
          <GlassButton variant="danger" size="lg" onClick={handleResolveVotes}>
            {l('Подвести итоги', 'Resolve Votes')}
          </GlassButton>
        )}
        {isHost && totalVotes > 0 && totalVotes < totalVoters && (
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
    const lastElim =
      gs.eliminated.length > 0
        ? gs.eliminated[gs.eliminated.length - 1]
        : null;

    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-6">
        {gs.winner ? (
          <GlassCard className="w-full max-w-md text-center animate-scale-in">
            <p className="text-5xl mb-4">
              {gs.winner === 'mafia' ? '🔫' : '🎉'}
            </p>
            <h2 className="text-3xl font-bold text-white mb-2">
              {gs.winner === 'mafia'
                ? l('Мафия победила!', 'Mafia wins!')
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
            {isHost && (
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
            {lastElim && (
              <>
                <p className="text-4xl mb-2">💀</p>
                <h2 className="text-xl font-bold text-white mb-1">
                  {playerName(lastElim.id)}{' '}
                  {l('выбывает', 'is eliminated')}
                </h2>
                <div className="flex items-center justify-center gap-2 mt-2">
                  <span className="text-2xl">{ROLE_ICONS[lastElim.role]}</span>
                  <span className="text-white/60">
                    {ROLE_LABELS[lastElim.role][locale]}
                  </span>
                </div>
              </>
            )}
            {isHost && (
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
      onEnd={isHost ? handleEndGame : undefined}
    >
      {(phaseRenderers[gs.phase] ?? renderLobby)()}
    </GameLayout>
  );
}
