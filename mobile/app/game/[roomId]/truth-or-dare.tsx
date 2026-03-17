import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { GameLayout } from '@/components/games/GameLayout';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { GlassBadge } from '@/components/ui/GlassBadge';
import { useSocket } from '@/lib/use-socket';
import { useAuth } from '@/lib/auth-context';
import { useTranslation } from '@/lib/i18n';
import { TRUTHS, DARES, Difficulty } from '@/lib/game-data';
import { Player } from '@/types/room';
import { Colors, Radius } from '@/lib/colors';

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

function pickRandom<T>(
  items: T[],
  filterFn: (item: T, index: number) => boolean,
  usedIndices: number[],
): { item: T; index: number } | null {
  const candidates = items
    .map((item, index) => ({ item, index }))
    .filter(({ item, index }) => filterFn(item, index) && !usedIndices.includes(index));
  if (candidates.length === 0) {
    const fallback = items
      .map((item, index) => ({ item, index }))
      .filter(({ item, index }) => filterFn(item, index));
    if (fallback.length === 0) return null;
    return fallback[Math.floor(Math.random() * fallback.length)];
  }
  return candidates[Math.floor(Math.random() * candidates.length)];
}

export default function TruthOrDareScreen() {
  const { roomId } = useLocalSearchParams<{ roomId: string }>();
  const { emit, on } = useSocket();
  const { user } = useAuth();
  const { locale } = useTranslation();

  const [players, setPlayers] = useState<Player[]>([]);
  const [hostId, setHostId] = useState<string>('');
  const [gameState, setGameState] = useState<TodGameState | null>(null);

  const isHost = user?.id === hostId;
  const myId = user?.id ?? '';
  const currentPlayer = players.find((p) => p.id === gameState?.currentPlayerId);
  const isMyTurn = myId === gameState?.currentPlayerId;

  const l = (ru: string, en: string) => (locale === 'ru' ? ru : en);

  useEffect(() => {
    const cleanup = on('room:state', (data: unknown) => {
      const d = data as { players: Player[]; hostId: string };
      if (d.players) setPlayers(d.players);
      if (d.hostId) setHostId(d.hostId);
    });
    return cleanup;
  }, [on]);

  const broadcast = useCallback(
    (action: string, payload: unknown) => {
      emit('game:action', { code: roomId, action, payload });
    },
    [emit, roomId],
  );

  useEffect(() => {
    const cleanup = on('game:action', (data: unknown) => {
      const { action, payload } = data as { action: string; payload: TodGameState; from: string };
      if (action === 'tod:state') setGameState(payload);
    });
    return cleanup;
  }, [on]);

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

  const setDifficulty = useCallback(
    (diff: Difficulty) => {
      if (!isHost || !gameState) return;
      const updated = { ...gameState, difficulty: diff };
      setGameState(updated);
      broadcast('tod:state', updated);
    },
    [isHost, gameState, broadcast],
  );

  const applyChoice = useCallback(
    (choice: 'truth' | 'dare', state: TodGameState) => {
      const pool = choice === 'truth' ? TRUTHS : DARES;
      const usedIndices = choice === 'truth' ? state.usedTruthIndices : state.usedDareIndices;
      const picked = pickRandom(pool, (item) => item.difficulty === state.difficulty, usedIndices);
      if (!picked) return;
      const newUsedTruths = choice === 'truth' ? [...state.usedTruthIndices, picked.index] : state.usedTruthIndices;
      const newUsedDares = choice === 'dare' ? [...state.usedDareIndices, picked.index] : state.usedDareIndices;
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

  const handleChoice = useCallback(
    (choice: 'truth' | 'dare') => {
      if (!gameState) return;
      if (isHost) {
        applyChoice(choice, gameState);
      } else {
        emit('game:action', { code: roomId, action: 'tod:choose', payload: { choice } });
      }
    },
    [isHost, gameState, emit, roomId, applyChoice],
  );

  const advancePlayer = useCallback(
    (state: TodGameState) => {
      const nextIndex = (state.currentPlayerIndex + 1) % state.playersOrder.length;
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

  const applyDone = useCallback(
    (state: TodGameState) => {
      const points = state.choice === 'dare' ? 2 : 1;
      const newScores = {
        ...state.scores,
        [state.currentPlayerId]: (state.scores[state.currentPlayerId] ?? 0) + points,
      };
      advancePlayer({ ...state, scores: newScores });
    },
    [advancePlayer],
  );

  const applySkip = useCallback(
    (state: TodGameState) => {
      const newScores = {
        ...state.scores,
        [state.currentPlayerId]: Math.max((state.scores[state.currentPlayerId] ?? 0) - 1, 0),
      };
      advancePlayer({ ...state, scores: newScores });
    },
    [advancePlayer],
  );

  const handleDone = useCallback(() => {
    if (!gameState) return;
    if (isHost) applyDone(gameState);
    else emit('game:action', { code: roomId, action: 'tod:done', payload: {} });
  }, [isHost, gameState, emit, roomId, applyDone]);

  const handleSkip = useCallback(() => {
    if (!gameState) return;
    if (isHost) applySkip(gameState);
    else emit('game:action', { code: roomId, action: 'tod:skip', payload: {} });
  }, [isHost, gameState, emit, roomId, applySkip]);

  // Host listens for non-host actions
  useEffect(() => {
    if (!isHost) return;
    const cleanup = on('game:action', (data: unknown) => {
      const { action, payload } = data as { action: string; payload: { choice?: 'truth' | 'dare' }; from: string };
      setGameState((prev) => {
        if (!prev) return prev;
        switch (action) {
          case 'tod:choose':
            if (payload.choice) setTimeout(() => applyChoice(payload.choice!, prev), 0);
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

  const endGame = useCallback(() => {
    if (!gameState) return;
    const finished: TodGameState = { ...gameState, phase: 'finished' };
    setGameState(finished);
    broadcast('tod:state', finished);
  }, [gameState, broadcast]);

  const layoutScores = gameState
    ? Object.entries(gameState.scores).map(([id, score]) => ({
        name: players.find((p) => p.id === id)?.nickname ?? id,
        score,
      }))
    : [];

  const ScoreList = ({ gs }: { gs: TodGameState }) => (
    <GlassCard style={styles.scoresCard}>
      <Text style={styles.scoresTitle}>{l('Счёт', 'Scores')}</Text>
      {gs.playersOrder.map((id) => {
        const player = players.find((p) => p.id === id);
        const isCurrent = id === gs.currentPlayerId;
        return (
          <View key={id} style={[styles.scoreRow, isCurrent && styles.scoreRowActive]}>
            <Text style={styles.scorePlayerName}>
              {player?.nickname ?? id}{isCurrent ? ' 👈' : ''}
            </Text>
            <GlassBadge><Text style={styles.badgeText}>{gs.scores[id] ?? 0}</Text></GlassBadge>
          </View>
        );
      })}
    </GlassCard>
  );

  return (
    <GameLayout
      title={l('Правда или Действие', 'Truth or Dare')}
      icon="🎭"
      round={gameState?.round}
      scores={layoutScores}
      onEnd={isHost ? endGame : undefined}
      showScoreboard={gameState?.phase === 'finished'}
    >
      {/* NOT STARTED */}
      {!gameState && (
        <View style={styles.center}>
          <GlassCard style={styles.card}>
            <Text style={styles.cardTitle}>{l('Правда или Действие', 'Truth or Dare')}</Text>
            <Text style={styles.cardDesc}>
              {l(
                'Выбирайте правду или действие и выполняйте задания. Правда = 1 очко, Действие = 2 очка.',
                'Choose truth or dare and complete challenges. Truth = 1 point, Dare = 2 points.',
              )}
            </Text>
            <Text style={styles.playerLabel}>
              {l('Игроки', 'Players')} ({players.length})
            </Text>
            <View style={styles.badgeRow}>
              {players.map((p) => (
                <GlassBadge key={p.id}><Text style={styles.badgeText}>{p.nickname}</Text></GlassBadge>
              ))}
            </View>
            {isHost ? (
              <GlassButton variant="primary" size="lg" onPress={startGame} disabled={players.length < 2} style={styles.fullBtn}>
                {l('Начать игру', 'Start Game')}
              </GlassButton>
            ) : (
              <Text style={styles.waitingText}>{l('Ожидание хоста...', 'Waiting for host...')}</Text>
            )}
          </GlassCard>
        </View>
      )}

      {/* CHOOSING */}
      {gameState?.phase === 'choosing' && (
        <View style={styles.center}>
          <GlassCard style={styles.card}>
            <Text style={styles.turnLabel}>{l('Сейчас ходит', 'Current turn')}</Text>
            <Text style={styles.turnName}>{currentPlayer?.nickname ?? '...'}</Text>
            {isMyTurn && (
              <Text style={styles.yourTurn}>{l('Это ваш ход!', "It's your turn!")}</Text>
            )}
          </GlassCard>

          {isHost && (
            <GlassCard style={styles.diffCard}>
              <Text style={styles.diffLabel}>{l('Сложность', 'Difficulty')}</Text>
              <View style={styles.diffRow}>
                {(['easy', 'medium', 'hard'] as Difficulty[]).map((diff) => (
                  <GlassButton
                    key={diff}
                    size="sm"
                    variant={gameState.difficulty === diff ? 'primary' : 'default'}
                    onPress={() => setDifficulty(diff)}
                    style={styles.flex1}
                  >
                    {diff === 'easy' ? l('Легко', 'Easy') : diff === 'medium' ? l('Средне', 'Medium') : l('Сложно', 'Hard')}
                  </GlassButton>
                ))}
              </View>
            </GlassCard>
          )}

          {isMyTurn ? (
            <View style={styles.choiceRow}>
              <Pressable style={styles.choiceCard} onPress={() => handleChoice('truth')}>
                <Text style={styles.choiceEmoji}>💬</Text>
                <Text style={styles.choiceTitle}>{l('Правда', 'Truth')}</Text>
                <Text style={styles.choicePoints}>+1 {l('очко', 'point')}</Text>
              </Pressable>
              <Pressable style={styles.choiceCard} onPress={() => handleChoice('dare')}>
                <Text style={styles.choiceEmoji}>🔥</Text>
                <Text style={styles.choiceTitle}>{l('Действие', 'Dare')}</Text>
                <Text style={styles.choicePoints}>+2 {l('очка', 'points')}</Text>
              </Pressable>
            </View>
          ) : (
            <GlassCard style={styles.card}>
              <Text style={styles.waitDesc}>
                {l(`${currentPlayer?.nickname ?? '...'} выбирает...`, `${currentPlayer?.nickname ?? '...'} is choosing...`)}
              </Text>
            </GlassCard>
          )}

          <ScoreList gs={gameState} />
        </View>
      )}

      {/* CHALLENGE */}
      {gameState?.phase === 'challenge' && (
        <View style={styles.center}>
          <View style={styles.badgeRow}>
            <GlassBadge>
              <Text style={styles.badgeText}>
                {gameState.choice === 'truth' ? l('💬 Правда', '💬 Truth') : l('🔥 Действие', '🔥 Dare')}
              </Text>
            </GlassBadge>
            <GlassBadge><Text style={styles.badgeText}>{currentPlayer?.nickname}</Text></GlassBadge>
          </View>

          <GlassCard style={styles.challengeCard}>
            <Text style={styles.challengeText}>
              {gameState.currentChallenge
                ? locale === 'ru' ? gameState.currentChallenge.ru : gameState.currentChallenge.en
                : '...'}
            </Text>
          </GlassCard>

          {(isMyTurn || isHost) && (
            <View style={styles.actionRow}>
              <GlassButton variant="primary" size="lg" onPress={handleDone} style={styles.flex1}>
                {l('Выполнено ✓', 'Done ✓')}
              </GlassButton>
              <GlassButton size="lg" onPress={handleSkip} style={styles.flex1}>
                {l('Пропустить (-1)', 'Skip (-1)')}
              </GlassButton>
            </View>
          )}

          {!isMyTurn && !isHost && (
            <Text style={styles.waitDesc}>
              {l(
                `Ждём, пока ${currentPlayer?.nickname} выполнит задание...`,
                `Waiting for ${currentPlayer?.nickname} to complete the challenge...`,
              )}
            </Text>
          )}

          <ScoreList gs={gameState} />
        </View>
      )}

      {/* FINISHED */}
      {gameState?.phase === 'finished' && (
        <View style={styles.center}>
          {isHost && (
            <GlassButton variant="primary" size="lg" onPress={startGame}>
              {l('Играть снова', 'Play Again')}
            </GlassButton>
          )}
        </View>
      )}
    </GameLayout>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', gap: 12 },
  card: { padding: 24, alignItems: 'center', width: '100%' },
  cardTitle: { fontSize: 20, fontWeight: '700', color: Colors.white, marginBottom: 8 },
  cardDesc: { fontSize: 13, color: 'rgba(255,255,255,0.5)', textAlign: 'center', marginBottom: 16 },
  playerLabel: { fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 8 },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center', marginBottom: 12 },
  badgeText: { color: Colors.textSecondary, fontSize: 12 },
  fullBtn: { width: '100%' },
  waitingText: { fontSize: 13, color: 'rgba(255,255,255,0.4)', fontStyle: 'italic' },
  turnLabel: { fontSize: 12, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 2 },
  turnName: { fontSize: 24, fontWeight: '700', color: Colors.white, marginTop: 4 },
  yourTurn: { fontSize: 13, color: Colors.accent, marginTop: 4 },
  diffCard: { padding: 16, width: '100%' },
  diffLabel: { fontSize: 13, color: 'rgba(255,255,255,0.5)', textAlign: 'center', marginBottom: 8 },
  diffRow: { flexDirection: 'row', gap: 8 },
  flex1: { flex: 1 },
  choiceRow: { flexDirection: 'row', gap: 12, width: '100%' },
  choiceCard: {
    flex: 1, padding: 24, alignItems: 'center',
    backgroundColor: Colors.glassBg, borderWidth: 1, borderColor: Colors.glassBorder,
    borderRadius: Radius.lg,
  },
  choiceEmoji: { fontSize: 32, marginBottom: 8 },
  choiceTitle: { fontSize: 16, fontWeight: '700', color: Colors.white },
  choicePoints: { fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 4 },
  challengeCard: { padding: 32, alignItems: 'center', width: '100%' },
  challengeText: { fontSize: 18, fontWeight: '600', color: Colors.white, textAlign: 'center', lineHeight: 26 },
  actionRow: { flexDirection: 'row', gap: 12, width: '100%' },
  waitDesc: { fontSize: 13, color: 'rgba(255,255,255,0.4)', textAlign: 'center' },
  scoresCard: { padding: 16, width: '100%' },
  scoresTitle: { fontSize: 14, fontWeight: '600', color: 'rgba(255,255,255,0.5)', marginBottom: 8 },
  scoreRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.sm, marginBottom: 4,
  },
  scoreRowActive: { backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(168,85,247,0.4)' },
  scorePlayerName: { fontSize: 13, color: Colors.textPrimary },
});
