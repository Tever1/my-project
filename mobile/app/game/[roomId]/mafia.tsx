import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { GameLayout } from '@/components/games/GameLayout';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { GlassBadge } from '@/components/ui/GlassBadge';
import { useSocket } from '@/lib/use-socket';
import { useAuth } from '@/lib/auth-context';
import { useTranslation } from '@/lib/i18n';
import { MafiaRole, MafiaPhase } from '@/types/game';
import { Player } from '@/types/room';
import { Colors, Radius } from '@/lib/colors';

interface MafiaGameState {
  phase: 'lobby' | 'role-reveal' | MafiaPhase;
  roles: Record<string, MafiaRole>;
  alive: string[];
  eliminated: { id: string; role: MafiaRole }[];
  mafiaVotes: Record<string, string>;
  detectiveCheck: string | null;
  detectiveResult: MafiaRole | null;
  doctorSave: string | null;
  dayTimer: number;
  votes: Record<string, string>;
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
  | { type: 'mafia-vote'; targetId: string }
  | { type: 'detective-check'; targetId: string }
  | { type: 'detective-result'; role: MafiaRole }
  | { type: 'doctor-save'; targetId: string }
  | { type: 'resolve-night' }
  | { type: 'night-result'; killedId: string | null; saved: boolean }
  | { type: 'start-voting' }
  | { type: 'cast-vote'; targetId: string }
  | { type: 'resolve-votes' }
  | { type: 'eliminate'; playerId: string; role: MafiaRole }
  | { type: 'game-over'; winner: 'mafia' | 'citizens' }
  | { type: 'end-game' };

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
  for (let m = 0; m < mafiaCount; m++) roles[shuffled[idx++]] = 'mafia';
  if (hasDetective) roles[shuffled[idx++]] = 'detective';
  if (hasDoctor) roles[shuffled[idx++]] = 'doctor';
  while (idx < count) roles[shuffled[idx++]] = 'citizen';
  return roles;
}

function checkWin(alive: string[], roles: Record<string, MafiaRole>): 'mafia' | 'citizens' | null {
  const aliveMafia = alive.filter((id) => roles[id] === 'mafia').length;
  const aliveOthers = alive.length - aliveMafia;
  if (aliveMafia === 0) return 'citizens';
  if (aliveMafia >= aliveOthers) return 'mafia';
  return null;
}

function getInitialState(): MafiaGameState {
  return {
    phase: 'lobby', roles: {}, alive: [], eliminated: [],
    mafiaVotes: {}, detectiveCheck: null, detectiveResult: null,
    doctorSave: null, dayTimer: 0, votes: {},
    lastNightKill: null, lastNightSaved: false, winner: null, round: 0,
  };
}

export default function MafiaScreen() {
  const { roomId } = useLocalSearchParams<{ roomId: string }>();
  const { emit, on } = useSocket();
  const { locale } = useTranslation();
  const { user } = useAuth();

  const [players, setPlayers] = useState<Player[]>([]);
  const [gs, setGs] = useState<MafiaGameState>(getInitialState);
  const [roleRevealed, setRoleRevealed] = useState(false);
  const [nightActionDone, setNightActionDone] = useState(false);
  const [dayTimerValue, setDayTimerValue] = useState(60);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isHost = players.find((p) => p.isHost)?.id === user?.id;
  const myRole = user ? gs.roles[user.id] : undefined;
  const amAlive = user ? gs.alive.includes(user.id) : false;

  const playerName = useCallback((id: string) => players.find((p) => p.id === id)?.nickname ?? id, [players]);
  const l = useCallback((ru: string, en: string) => (locale === 'ru' ? ru : en), [locale]);

  const broadcast = useCallback(
    (action: GameAction) => {
      emit('game:action', { code: roomId, action: 'mafia', payload: action });
    },
    [emit, roomId],
  );

  useEffect(() => {
    const cleanup = on('room:state', (data: unknown) => {
      const room = data as { players?: Player[] };
      if (room.players) setPlayers(room.players);
    });
    return cleanup;
  }, [on]);

  useEffect(() => {
    const cleanup = on('game:action', (data: unknown) => {
      const { action, payload } = data as { action: string; payload: GameAction; from: string };
      if (action !== 'mafia') return;
      switch (payload.type) {
        case 'sync-state':
          setGs(payload.state);
          setNightActionDone(false);
          break;
        case 'assign-roles':
          setGs((prev) => ({
            ...prev, phase: 'role-reveal', roles: payload.roles,
            alive: Object.keys(payload.roles), round: 1,
          }));
          setRoleRevealed(false);
          break;
        case 'start-night':
          setGs((prev) => ({
            ...prev, phase: 'night', mafiaVotes: {},
            detectiveCheck: null, detectiveResult: null, doctorSave: null,
          }));
          setNightActionDone(false);
          break;
        case 'detective-result':
          setGs((prev) => ({ ...prev, detectiveResult: payload.role }));
          break;
        case 'night-result':
          setGs((prev) => ({
            ...prev, phase: 'day',
            lastNightKill: payload.killedId, lastNightSaved: payload.saved,
            alive: payload.killedId ? prev.alive.filter((id) => id !== payload.killedId) : prev.alive,
            eliminated: payload.killedId
              ? [...prev.eliminated, { id: payload.killedId, role: prev.roles[payload.killedId] }]
              : prev.eliminated,
            dayTimer: 60, votes: {},
          }));
          setDayTimerValue(60);
          break;
        case 'start-voting':
          setGs((prev) => ({ ...prev, phase: 'voting', votes: {} }));
          break;
        case 'eliminate':
          setGs((prev) => ({
            ...prev, phase: 'results',
            alive: prev.alive.filter((id) => id !== payload.playerId),
            eliminated: [...prev.eliminated, { id: payload.playerId, role: payload.role }],
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
  }, [on]);

  // Day timer
  useEffect(() => {
    if (gs.phase === 'day' && dayTimerValue > 0) {
      timerRef.current = setInterval(() => {
        setDayTimerValue((v) => {
          if (v <= 1) { clearInterval(timerRef.current!); return 0; }
          return v - 1;
        });
      }, 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [gs.phase, dayTimerValue > 0]);

  const handleStart = () => {
    const playerIds = players.map((p) => p.id);
    broadcast({ type: 'assign-roles', roles: assignRoles(playerIds) });
  };

  const handleStartNight = () => broadcast({ type: 'start-night' });

  const handleMafiaVote = (targetId: string) => {
    if (!user) return;
    emit('game:action', { code: roomId, action: 'mafia-vote', payload: { voterId: user.id, targetId } });
    setGs((prev) => ({ ...prev, mafiaVotes: { ...prev.mafiaVotes, [user.id]: targetId } }));
    setNightActionDone(true);
  };

  const handleDetectiveCheck = (targetId: string) => {
    if (!user) return;
    emit('game:action', { code: roomId, action: 'detective-check', payload: { detectiveId: user.id, targetId } });
    setGs((prev) => ({ ...prev, detectiveCheck: targetId }));
    setNightActionDone(true);
  };

  const handleDoctorSave = (targetId: string) => {
    if (!user) return;
    emit('game:action', { code: roomId, action: 'doctor-save', payload: { doctorId: user.id, targetId } });
    setGs((prev) => ({ ...prev, doctorSave: targetId }));
    setNightActionDone(true);
  };

  const handleResolveNight = () => {
    const voteCounts: Record<string, number> = {};
    Object.values(gs.mafiaVotes).forEach((tid) => { voteCounts[tid] = (voteCounts[tid] || 0) + 1; });
    const mafiaTarget = Object.entries(voteCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
    const saved = mafiaTarget != null && gs.doctorSave === mafiaTarget;
    const killedId = saved ? null : mafiaTarget;

    if (gs.detectiveCheck) {
      const checkedRole = gs.roles[gs.detectiveCheck];
      emit('game:action', { code: roomId, action: 'mafia', payload: { type: 'detective-result', role: checkedRole } });
    }

    broadcast({ type: 'night-result', killedId, saved });
    const aliveAfter = killedId ? gs.alive.filter((id) => id !== killedId) : gs.alive;
    const winner = checkWin(aliveAfter, gs.roles);
    if (winner) setTimeout(() => broadcast({ type: 'game-over', winner }), 1500);
  };

  const handleStartVoting = () => broadcast({ type: 'start-voting' });

  const handleDayVote = (targetId: string) => {
    if (!user) return;
    emit('game:action', { code: roomId, action: 'mafia-day-vote', payload: { voterId: user.id, targetId } });
    setGs((prev) => ({ ...prev, votes: { ...prev.votes, [user.id]: targetId } }));
  };

  const handleResolveVotes = () => {
    const voteCounts: Record<string, number> = {};
    Object.values(gs.votes).forEach((tid) => { voteCounts[tid] = (voteCounts[tid] || 0) + 1; });
    const sorted = Object.entries(voteCounts).sort((a, b) => b[1] - a[1]);
    if (sorted.length > 0) {
      const eliminatedId = sorted[0][0];
      broadcast({ type: 'eliminate', playerId: eliminatedId, role: gs.roles[eliminatedId] });
      const aliveAfter = gs.alive.filter((id) => id !== eliminatedId);
      const winner = checkWin(aliveAfter, gs.roles);
      if (winner) setTimeout(() => broadcast({ type: 'game-over', winner }), 1500);
    }
  };

  const handleNextNight = () => {
    setGs((prev) => ({ ...prev, round: prev.round + 1 }));
    broadcast({ type: 'start-night' });
  };

  const handleEndGame = () => broadcast({ type: 'end-game' });

  const otherAlivePlayers = gs.alive.filter((id) => id !== user?.id);
  const mafiaTeammates = myRole === 'mafia'
    ? gs.alive.filter((id) => id !== user?.id && gs.roles[id] === 'mafia') : [];

  // === RENDER PHASES ===

  const renderLobby = () => (
    <View style={styles.center}>
      <GlassCard style={styles.card}>
        <Text style={styles.cardTitle}>{l('Мафия', 'Mafia')}</Text>
        <Text style={styles.cardDesc}>{l(`${players.length} игроков в комнате`, `${players.length} players in room`)}</Text>
        <View style={styles.badgeRow}>
          {players.map((p) => (
            <GlassBadge key={p.id}><Text style={styles.badgeText}>{p.nickname}{p.isHost ? ' ⭐' : ''}</Text></GlassBadge>
          ))}
        </View>
        {isHost ? (
          <GlassButton variant="primary" size="lg" onPress={handleStart} disabled={players.length < 4} style={styles.fullBtn}>
            {l('Начать игру', 'Start Game')}
          </GlassButton>
        ) : (
          <Text style={styles.waitText}>{l('Ожидание ведущего...', 'Waiting for host...')}</Text>
        )}
        {isHost && players.length < 4 && (
          <Text style={styles.minPlayers}>{l('Нужно минимум 4 игрока', 'Need at least 4 players')}</Text>
        )}
      </GlassCard>
    </View>
  );

  const renderRoleReveal = () => (
    <View style={styles.center}>
      <GlassCard style={styles.card}>
        {!roleRevealed ? (
          <>
            <Text style={styles.revealHint}>{l('Нажмите, чтобы увидеть вашу роль', 'Tap to reveal your role')}</Text>
            <GlassButton variant="primary" size="lg" onPress={() => setRoleRevealed(true)} style={styles.fullBtn}>
              {l('Показать роль', 'Reveal Role')}
            </GlassButton>
          </>
        ) : myRole ? (
          <>
            <Text style={styles.roleIcon}>{ROLE_ICONS[myRole]}</Text>
            <Text style={styles.roleName}>{ROLE_LABELS[myRole][locale]}</Text>
            <Text style={styles.roleDesc}>
              {myRole === 'mafia' && l('Убивайте мирных ночью, не попадитесь днём', 'Kill citizens at night, stay hidden during the day')}
              {myRole === 'citizen' && l('Найдите и устраните мафию голосованием', 'Find and eliminate the mafia by voting')}
              {myRole === 'detective' && l('Проверяйте одного игрока каждую ночь', 'Check one player each night')}
              {myRole === 'doctor' && l('Спасите одного игрока каждую ночь', 'Protect one player each night')}
            </Text>
            {myRole === 'mafia' && mafiaTeammates.length > 0 && (
              <View style={styles.allyBox}>
                <Text style={styles.allyLabel}>{l('Ваши союзники:', 'Your allies:')}</Text>
                {mafiaTeammates.map((id) => (
                  <GlassBadge key={id}><Text style={styles.badgeText}>{playerName(id)}</Text></GlassBadge>
                ))}
              </View>
            )}
          </>
        ) : (
          <Text style={styles.waitText}>{l('Роли распределяются...', 'Assigning roles...')}</Text>
        )}
      </GlassCard>
      {isHost && roleRevealed && (
        <GlassButton variant="primary" size="lg" onPress={handleStartNight}>
          {l('Начать ночь', 'Start Night')}
        </GlassButton>
      )}
    </View>
  );

  const renderNight = () => {
    const targets = otherAlivePlayers;
    return (
      <View style={styles.center}>
        <Text style={styles.nightEmoji}>🌙</Text>
        <Text style={styles.nightTitle}>{l('Город засыпает...', 'The city falls asleep...')}</Text>
        <Text style={styles.nightSub}>{l(`Ночь ${gs.round}`, `Night ${gs.round}`)}</Text>

        {!amAlive ? (
          <GlassCard style={styles.card}>
            <Text style={styles.waitText}>{l('Вы выбыли. Наблюдайте за игрой.', 'You are eliminated. Watch the game.')}</Text>
          </GlassCard>
        ) : myRole === 'mafia' && !nightActionDone ? (
          <GlassCard style={styles.card}>
            <Text style={styles.nightRoleTitle}>{ROLE_ICONS.mafia} {l('Выберите жертву', 'Choose a victim')}</Text>
            {targets.filter((id) => gs.roles[id] !== 'mafia').map((id) => (
              <GlassButton key={id} onPress={() => handleMafiaVote(id)} style={styles.fullBtn}>
                {playerName(id)}
              </GlassButton>
            ))}
          </GlassCard>
        ) : myRole === 'detective' && !nightActionDone ? (
          <GlassCard style={styles.card}>
            <Text style={[styles.nightRoleTitle, { color: '#93c5fd' }]}>{ROLE_ICONS.detective} {l('Проверить игрока', 'Check a player')}</Text>
            {targets.map((id) => (
              <GlassButton key={id} onPress={() => handleDetectiveCheck(id)} style={styles.fullBtn}>
                {playerName(id)}
              </GlassButton>
            ))}
          </GlassCard>
        ) : myRole === 'doctor' && !nightActionDone ? (
          <GlassCard style={styles.card}>
            <Text style={[styles.nightRoleTitle, { color: '#86efac' }]}>{ROLE_ICONS.doctor} {l('Защитить игрока', 'Protect a player')}</Text>
            {gs.alive.map((id) => (
              <GlassButton key={id} onPress={() => handleDoctorSave(id)} style={styles.fullBtn}>
                {playerName(id)}{id === user?.id ? l(' (Себя)', ' (Self)') : ''}
              </GlassButton>
            ))}
          </GlassCard>
        ) : (
          <GlassCard style={styles.card}>
            {nightActionDone ? (
              <>
                <Text style={styles.bigEmoji}>✅</Text>
                <Text style={styles.waitText}>{l('Действие выполнено. Ждите утра.', 'Action done. Wait for dawn.')}</Text>
                {myRole === 'detective' && gs.detectiveResult && (
                  <View style={styles.detectiveBox}>
                    <Text style={styles.detectiveResult}>
                      {playerName(gs.detectiveCheck!)} — {ROLE_LABELS[gs.detectiveResult][locale]}
                    </Text>
                  </View>
                )}
              </>
            ) : (
              <>
                <Text style={styles.bigEmoji}>😴</Text>
                <Text style={styles.waitText}>
                  {myRole === 'citizen'
                    ? l('Вы спите. Ждите утра.', 'You are asleep. Wait for dawn.')
                    : l('Ожидание...', 'Waiting...')}
                </Text>
              </>
            )}
          </GlassCard>
        )}

        {isHost && (
          <GlassButton variant="primary" size="lg" onPress={handleResolveNight}>
            {l('Завершить ночь', 'Resolve Night')}
          </GlassButton>
        )}
      </View>
    );
  };

  const renderDay = () => (
    <View style={styles.center}>
      <Text style={styles.bigEmoji}>☀️</Text>
      <Text style={styles.dayTitle}>{l('Город просыпается', 'The city wakes up')}</Text>

      <GlassCard style={styles.card}>
        {gs.lastNightKill ? (
          <>
            <Text style={styles.deathText}>{l('Этой ночью был убит:', 'Last night was killed:')}</Text>
            <Text style={styles.deathName}>{playerName(gs.lastNightKill)}</Text>
            <GlassBadge variant="accent"><Text style={styles.badgeText}>{ROLE_LABELS[gs.roles[gs.lastNightKill]][locale]}</Text></GlassBadge>
          </>
        ) : gs.lastNightSaved ? (
          <Text style={styles.savedText}>{l('Доктор спас жертву! Никто не погиб.', 'The doctor saved the victim! Nobody died.')}</Text>
        ) : (
          <Text style={styles.savedText}>{l('Мирная ночь. Никто не погиб.', 'Peaceful night. Nobody died.')}</Text>
        )}
      </GlassCard>

      <GlassCard style={styles.card}>
        <Text style={styles.timerLabel}>{l('Обсуждение', 'Discussion')}</Text>
        <Text style={styles.dayTimer}>
          {Math.floor(dayTimerValue / 60)}:{String(dayTimerValue % 60).padStart(2, '0')}
        </Text>
      </GlassCard>

      <GlassCard style={styles.card}>
        <Text style={styles.aliveLabel}>{l('Живые игроки', 'Alive Players')} ({gs.alive.length})</Text>
        <View style={styles.badgeRow}>
          {gs.alive.map((id) => (
            <GlassBadge key={id}><Text style={styles.badgeText}>{playerName(id)}{id === user?.id ? ' (👈)' : ''}</Text></GlassBadge>
          ))}
        </View>
      </GlassCard>

      {isHost && (
        <GlassButton variant="primary" size="lg" onPress={handleStartVoting}>
          {l('Начать голосование', 'Start Voting')}
        </GlassButton>
      )}
    </View>
  );

  const renderVoting = () => {
    const myVote = user ? gs.votes[user.id] : undefined;
    const voteCounts: Record<string, number> = {};
    Object.values(gs.votes).forEach((tid) => { voteCounts[tid] = (voteCounts[tid] || 0) + 1; });
    const totalVoters = gs.alive.length;
    const totalVotes = Object.keys(gs.votes).length;

    return (
      <View style={styles.center}>
        <Text style={styles.bigEmoji}>🗳️</Text>
        <Text style={styles.dayTitle}>{l('Голосование', 'Voting')}</Text>
        <Text style={styles.voteCount}>{l(`Голосов: ${totalVotes}/${totalVoters}`, `Votes: ${totalVotes}/${totalVoters}`)}</Text>

        {amAlive && !myVote ? (
          <GlassCard style={styles.card}>
            <Text style={styles.voteHint}>{l('Кого вы подозреваете?', 'Who do you suspect?')}</Text>
            {otherAlivePlayers.map((id) => (
              <View key={id} style={styles.voteRow}>
                <GlassButton onPress={() => handleDayVote(id)} style={styles.flex1}>
                  {playerName(id)}
                </GlassButton>
                {voteCounts[id] ? <GlassBadge><Text style={styles.badgeText}>{voteCounts[id]}</Text></GlassBadge> : null}
              </View>
            ))}
          </GlassCard>
        ) : (
          <GlassCard style={styles.card}>
            {!amAlive ? (
              <Text style={styles.waitText}>{l('Вы выбыли. Наблюдайте.', 'You are eliminated. Watch.')}</Text>
            ) : (
              <>
                <Text style={styles.waitText}>{l('Вы проголосовали за:', 'You voted for:')}</Text>
                <GlassBadge variant="accent"><Text style={styles.badgeText}>{playerName(myVote!)}</Text></GlassBadge>
              </>
            )}
          </GlassCard>
        )}

        <GlassCard style={styles.card}>
          <Text style={styles.aliveLabel}>{l('Результаты', 'Results')}</Text>
          {gs.alive.map((id) => (
            <View key={id} style={styles.resultRow}>
              <Text style={styles.resultName}>{playerName(id)}</Text>
              <Text style={styles.resultVotes}>{voteCounts[id] || 0}</Text>
            </View>
          ))}
        </GlassCard>

        {isHost && totalVotes >= totalVoters && (
          <GlassButton variant="danger" size="lg" onPress={handleResolveVotes}>
            {l('Подвести итоги', 'Resolve Votes')}
          </GlassButton>
        )}
        {isHost && totalVotes > 0 && totalVotes < totalVoters && (
          <GlassButton size="sm" onPress={handleResolveVotes}>
            {l('Завершить досрочно', 'End early')}
          </GlassButton>
        )}
      </View>
    );
  };

  const renderResults = () => {
    const lastElim = gs.eliminated.length > 0 ? gs.eliminated[gs.eliminated.length - 1] : null;

    return (
      <View style={styles.center}>
        {gs.winner ? (
          <GlassCard style={styles.card}>
            <Text style={styles.bigEmoji}>{gs.winner === 'mafia' ? '🔫' : '🎉'}</Text>
            <Text style={styles.winnerTitle}>
              {gs.winner === 'mafia' ? l('Мафия победила!', 'Mafia wins!') : l('Мирные победили!', 'Citizens win!')}
            </Text>
            <View style={{ marginTop: 16, width: '100%' }}>
              <Text style={styles.rolesLabel}>{l('Роли:', 'Roles:')}</Text>
              {Object.entries(gs.roles).map(([id, role]) => (
                <View key={id} style={styles.roleRow}>
                  <Text style={styles.roleRowName}>{playerName(id)}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Text>{ROLE_ICONS[role]}</Text>
                    <Text style={styles.roleRowRole}>{ROLE_LABELS[role][locale]}</Text>
                  </View>
                </View>
              ))}
            </View>
            {isHost && (
              <GlassButton variant="primary" size="lg" onPress={handleEndGame} style={[styles.fullBtn, { marginTop: 16 }]}>
                {l('Новая игра', 'New Game')}
              </GlassButton>
            )}
          </GlassCard>
        ) : (
          <GlassCard style={styles.card}>
            {lastElim && (
              <>
                <Text style={styles.bigEmoji}>💀</Text>
                <Text style={styles.elimName}>{playerName(lastElim.id)} {l('выбывает', 'is eliminated')}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 }}>
                  <Text style={{ fontSize: 24 }}>{ROLE_ICONS[lastElim.role]}</Text>
                  <Text style={styles.roleRowRole}>{ROLE_LABELS[lastElim.role][locale]}</Text>
                </View>
              </>
            )}
            {isHost && (
              <GlassButton variant="primary" size="lg" onPress={handleNextNight} style={[styles.fullBtn, { marginTop: 16 }]}>
                {l('Следующая ночь', 'Next Night')}
              </GlassButton>
            )}
          </GlassCard>
        )}
      </View>
    );
  };

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

const styles = StyleSheet.create({
  center: { alignItems: 'center', gap: 12 },
  card: { padding: 24, alignItems: 'center', width: '100%', gap: 8 },
  cardTitle: { fontSize: 22, fontWeight: '700', color: Colors.white },
  cardDesc: { fontSize: 13, color: 'rgba(255,255,255,0.5)', textAlign: 'center' },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center' },
  badgeText: { color: Colors.textSecondary, fontSize: 12 },
  fullBtn: { width: '100%' },
  flex1: { flex: 1 },
  waitText: { fontSize: 13, color: 'rgba(255,255,255,0.4)' },
  minPlayers: { fontSize: 12, color: 'rgba(239,68,68,0.8)', marginTop: 8 },
  revealHint: { fontSize: 16, color: 'rgba(255,255,255,0.5)', marginBottom: 16 },
  roleIcon: { fontSize: 56, marginBottom: 8 },
  roleName: { fontSize: 28, fontWeight: '700', color: Colors.white },
  roleDesc: { fontSize: 13, color: 'rgba(255,255,255,0.4)', textAlign: 'center', marginTop: 8 },
  allyBox: {
    marginTop: 12, padding: 12, borderRadius: Radius.lg,
    backgroundColor: 'rgba(239,68,68,0.1)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)',
    width: '100%', alignItems: 'center', gap: 4,
  },
  allyLabel: { fontSize: 13, color: '#fca5a5', fontWeight: '600' },
  nightEmoji: { fontSize: 40 },
  nightTitle: { fontSize: 22, fontWeight: '700', color: '#c7d2fe' },
  nightSub: { fontSize: 13, color: 'rgba(255,255,255,0.3)' },
  nightRoleTitle: { fontSize: 16, fontWeight: '700', color: '#fca5a5', marginBottom: 8 },
  bigEmoji: { fontSize: 40 },
  detectiveBox: {
    marginTop: 12, padding: 12, borderRadius: Radius.lg,
    backgroundColor: 'rgba(59,130,246,0.1)', borderWidth: 1, borderColor: 'rgba(59,130,246,0.2)',
  },
  detectiveResult: { fontSize: 13, color: '#93c5fd' },
  dayTitle: { fontSize: 22, fontWeight: '700', color: '#fde68a' },
  timerLabel: { fontSize: 13, color: 'rgba(255,255,255,0.5)' },
  dayTimer: { fontSize: 40, fontWeight: '700', color: Colors.white, fontFamily: 'monospace' },
  aliveLabel: { fontSize: 13, color: 'rgba(255,255,255,0.4)', fontWeight: '600', marginBottom: 4 },
  deathText: { fontSize: 16, fontWeight: '700', color: '#f87171' },
  deathName: { fontSize: 22, fontWeight: '700', color: Colors.white },
  savedText: { fontSize: 16, fontWeight: '700', color: '#4ade80' },
  voteCount: { fontSize: 13, color: 'rgba(255,255,255,0.3)' },
  voteHint: { fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 8 },
  voteRow: { flexDirection: 'row', gap: 8, alignItems: 'center', width: '100%', marginBottom: 4 },
  resultRow: {
    flexDirection: 'row', justifyContent: 'space-between', width: '100%',
    paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  resultName: { fontSize: 13, color: 'rgba(255,255,255,0.7)' },
  resultVotes: { fontSize: 13, color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace' },
  winnerTitle: { fontSize: 26, fontWeight: '700', color: Colors.white },
  rolesLabel: { fontSize: 13, color: 'rgba(255,255,255,0.4)', marginBottom: 8 },
  roleRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 4,
  },
  roleRowName: { fontSize: 14, color: 'rgba(255,255,255,0.7)' },
  roleRowRole: { fontSize: 13, color: 'rgba(255,255,255,0.5)' },
  elimName: { fontSize: 18, fontWeight: '700', color: Colors.white },
});
