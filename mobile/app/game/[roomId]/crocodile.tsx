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
import { CROCODILE_WORDS } from '@/lib/game-data';
import { Player } from '@/types/room';
import { Colors, Radius } from '@/lib/colors';

interface CrocodileGameState {
  phase: 'waiting' | 'explaining' | 'finished';
  explainerIndex: number;
  explainerId: string;
  currentWordIndex: number;
  timeLeft: number;
  scores: Record<string, number>;
  wordsGuessed: number;
  playersOrder: string[];
  completedExplainers: string[];
  usedWordIndices: number[];
}

const TURN_DURATION = 60;

function pickRandomWordIndex(usedIndices: number[]): number {
  const available = CROCODILE_WORDS.map((_, i) => i).filter(
    (i) => !usedIndices.includes(i),
  );
  if (available.length === 0) {
    return Math.floor(Math.random() * CROCODILE_WORDS.length);
  }
  return available[Math.floor(Math.random() * available.length)];
}

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function CrocodileScreen() {
  const { roomId } = useLocalSearchParams<{ roomId: string }>();
  const { emit, on } = useSocket();
  const { user } = useAuth();
  const { locale } = useTranslation();

  const [players, setPlayers] = useState<Player[]>([]);
  const [hostId, setHostId] = useState<string>('');
  const [gameState, setGameState] = useState<CrocodileGameState | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isHost = user?.id === hostId;
  const myId = user?.id ?? '';

  const currentExplainer = players.find((p) => p.id === gameState?.explainerId);
  const isExplainer = myId === gameState?.explainerId;
  const currentWord =
    gameState && gameState.currentWordIndex >= 0
      ? CROCODILE_WORDS[gameState.currentWordIndex]
      : null;

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
      const { action, payload } = data as {
        action: string;
        payload: CrocodileGameState;
        from: string;
      };
      switch (action) {
        case 'croc:state':
          setGameState(payload);
          break;
        case 'croc:tick':
          setGameState((prev) =>
            prev
              ? { ...prev, timeLeft: (payload as unknown as { timeLeft: number }).timeLeft }
              : prev,
          );
          break;
      }
    });
    return cleanup;
  }, [on]);

  // Host: timer
  useEffect(() => {
    if (!isHost || !gameState || gameState.phase !== 'explaining') return;
    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      setGameState((prev) => {
        if (!prev || prev.phase !== 'explaining') return prev;
        const newTime = prev.timeLeft - 1;
        broadcast('croc:tick', { timeLeft: Math.max(newTime, 0) });
        if (newTime <= 0) {
          if (timerRef.current) clearInterval(timerRef.current);
          setTimeout(() => advanceToNextExplainer(prev), 0);
          return { ...prev, timeLeft: 0 };
        }
        return { ...prev, timeLeft: newTime };
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHost, gameState?.phase, gameState?.explainerId]);

  const startGame = useCallback(() => {
    if (!isHost || players.length < 2) return;
    const order = shuffleArray(players.map((p) => p.id));
    const firstWordIdx = pickRandomWordIndex([]);
    const initial: CrocodileGameState = {
      phase: 'explaining',
      explainerIndex: 0,
      explainerId: order[0],
      currentWordIndex: firstWordIdx,
      timeLeft: TURN_DURATION,
      scores: Object.fromEntries(players.map((p) => [p.id, 0])),
      wordsGuessed: 0,
      playersOrder: order,
      completedExplainers: [],
      usedWordIndices: [firstWordIdx],
    };
    setGameState(initial);
    broadcast('croc:state', initial);
  }, [isHost, players, broadcast]);

  const advanceToNextExplainer = useCallback(
    (prev: CrocodileGameState) => {
      const newCompleted = [...prev.completedExplainers, prev.explainerId];
      if (newCompleted.length >= prev.playersOrder.length) {
        const finished: CrocodileGameState = {
          ...prev,
          phase: 'finished',
          completedExplainers: newCompleted,
          timeLeft: 0,
        };
        setGameState(finished);
        broadcast('croc:state', finished);
        return;
      }
      const nextIndex = prev.explainerIndex + 1;
      const nextId = prev.playersOrder[nextIndex];
      const nextWordIdx = pickRandomWordIndex(prev.usedWordIndices);
      const next: CrocodileGameState = {
        ...prev,
        phase: 'explaining',
        explainerIndex: nextIndex,
        explainerId: nextId,
        currentWordIndex: nextWordIdx,
        timeLeft: TURN_DURATION,
        wordsGuessed: 0,
        completedExplainers: newCompleted,
        usedWordIndices: [...prev.usedWordIndices, nextWordIdx],
      };
      setGameState(next);
      broadcast('croc:state', next);
    },
    [broadcast],
  );

  const handleGuessed = useCallback(() => {
    if (!isHost || !gameState || gameState.phase !== 'explaining') return;
    const nextWordIdx = pickRandomWordIndex(gameState.usedWordIndices);
    const updated: CrocodileGameState = {
      ...gameState,
      currentWordIndex: nextWordIdx,
      wordsGuessed: gameState.wordsGuessed + 1,
      scores: {
        ...gameState.scores,
        [gameState.explainerId]: (gameState.scores[gameState.explainerId] ?? 0) + 1,
      },
      usedWordIndices: [...gameState.usedWordIndices, nextWordIdx],
    };
    setGameState(updated);
    broadcast('croc:state', updated);
  }, [isHost, gameState, broadcast]);

  const handleSkip = useCallback(() => {
    if (!isHost || !gameState || gameState.phase !== 'explaining') return;
    const nextWordIdx = pickRandomWordIndex(gameState.usedWordIndices);
    const updated: CrocodileGameState = {
      ...gameState,
      currentWordIndex: nextWordIdx,
      usedWordIndices: [...gameState.usedWordIndices, nextWordIdx],
    };
    setGameState(updated);
    broadcast('croc:state', updated);
  }, [isHost, gameState, broadcast]);

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
      if (action === 'croc:guessed') handleGuessed();
      if (action === 'croc:skip') handleSkip();
      if (action === 'croc:next-player' && gameState) {
        if (timerRef.current) clearInterval(timerRef.current);
        advanceToNextExplainer(gameState);
      }
    });
    return cleanup;
  }, [isHost, on, handleGuessed, handleSkip, advanceToNextExplainer, gameState]);

  const endGame = useCallback(() => {
    if (!gameState) return;
    if (timerRef.current) clearInterval(timerRef.current);
    const finished: CrocodileGameState = { ...gameState, phase: 'finished', timeLeft: 0 };
    setGameState(finished);
    broadcast('croc:state', finished);
  }, [gameState, broadcast]);

  const layoutScores = gameState
    ? Object.entries(gameState.scores).map(([id, score]) => ({
        name: players.find((p) => p.id === id)?.nickname ?? id,
        score,
      }))
    : [];

  const currentRound = gameState ? gameState.completedExplainers.length + 1 : 0;
  const totalRounds = gameState ? gameState.playersOrder.length : players.length;

  const l = (ru: string, en: string) => (locale === 'ru' ? ru : en);

  return (
    <GameLayout
      title={l('Крокодил', 'Crocodile')}
      icon="🐊"
      round={currentRound}
      totalRounds={totalRounds}
      scores={layoutScores}
      onEnd={isHost ? endGame : undefined}
      showScoreboard={gameState?.phase === 'finished'}
    >
      {/* WAITING */}
      {(!gameState || gameState.phase === 'waiting') && (
        <View style={styles.center}>
          <GlassCard style={styles.card}>
            <Text style={styles.cardTitle}>{l('Крокодил', 'Crocodile')}</Text>
            <Text style={styles.cardDesc}>
              {l(
                'Объясняйте слова, не называя их! У каждого будет 60 секунд.',
                'Explain words without saying them! Each player gets 60 seconds.',
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
              <GlassButton
                variant="primary"
                size="lg"
                onPress={startGame}
                disabled={players.length < 2}
                style={styles.fullBtn}
              >
                {l('Начать игру', 'Start Game')}
              </GlassButton>
            ) : (
              <Text style={styles.waitingText}>
                {l('Ожидание хоста...', 'Waiting for host...')}
              </Text>
            )}
          </GlassCard>
        </View>
      )}

      {/* EXPLAINING */}
      {gameState?.phase === 'explaining' && (
        <View style={styles.center}>
          {/* Timer */}
          <GlassCard style={styles.timerCard}>
            <View style={styles.timerRow}>
              <Text style={styles.timerLabel}>{l('Объясняет', 'Explaining')}</Text>
              <Text style={[styles.timerValue, gameState.timeLeft <= 10 && styles.timerDanger]}>
                {gameState.timeLeft}s
              </Text>
            </View>
            <View style={styles.timerBarBg}>
              <View
                style={[
                  styles.timerBarFill,
                  { width: `${(gameState.timeLeft / TURN_DURATION) * 100}%` },
                ]}
              />
            </View>
          </GlassCard>

          {/* Explainer name */}
          <GlassCard style={styles.nameCard}>
            <Text style={styles.explainerName}>{currentExplainer?.nickname ?? '...'}</Text>
            <Text style={styles.guessedCount}>
              {l(`Угадано слов: ${gameState.wordsGuessed}`, `Words guessed: ${gameState.wordsGuessed}`)}
            </Text>
          </GlassCard>

          {/* Word card */}
          {isExplainer && currentWord ? (
            <GlassCard style={styles.wordCard}>
              <Text style={styles.wordLabel}>
                {l('Ваше слово', 'Your word')}
              </Text>
              <Text style={styles.wordText}>
                {locale === 'ru' ? currentWord.ru : currentWord.en}
              </Text>
            </GlassCard>
          ) : (
            <GlassCard style={styles.wordCard}>
              <Text style={styles.guessHint}>
                {l('Угадайте слово, которое объясняет игрок!', 'Guess the word being explained!')}
              </Text>
              <Text style={styles.bigEmoji}>🤔</Text>
            </GlassCard>
          )}

          {/* Actions for explainer */}
          {isExplainer && (
            <View style={styles.actionRow}>
              <GlassButton
                variant="primary"
                size="lg"
                onPress={() => (isHost ? handleGuessed() : emitAction('croc:guessed'))}
                style={styles.flex1}
              >
                {l('Угадали! ✓', 'Guessed! ✓')}
              </GlassButton>
              <GlassButton
                size="lg"
                onPress={() => (isHost ? handleSkip() : emitAction('croc:skip'))}
                style={styles.flex1}
              >
                {l('Пропустить →', 'Skip →')}
              </GlassButton>
            </View>
          )}

          {/* Host force next player */}
          {isHost && !isExplainer && (
            <GlassButton
              onPress={() => {
                if (timerRef.current) clearInterval(timerRef.current);
                advanceToNextExplainer(gameState);
              }}
              style={styles.fullBtn}
            >
              {l('Следующий игрок →', 'Next Player →')}
            </GlassButton>
          )}

          {/* Scores */}
          <GlassCard style={styles.scoresCard}>
            <Text style={styles.scoresTitle}>{l('Счёт', 'Scores')}</Text>
            {gameState.playersOrder.map((id) => {
              const player = players.find((p) => p.id === id);
              const done = gameState.completedExplainers.includes(id);
              const isCurrent = id === gameState.explainerId;
              return (
                <View key={id} style={[styles.scoreRow, isCurrent && styles.scoreRowActive]}>
                  <Text style={styles.scorePlayerName}>
                    {player?.nickname ?? id}
                    {isCurrent ? ' 🎤' : ''}
                    {done ? ' ✓' : ''}
                  </Text>
                  <GlassBadge><Text style={styles.badgeText}>{gameState.scores[id] ?? 0}</Text></GlassBadge>
                </View>
              );
            })}
          </GlassCard>
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
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center', marginBottom: 16 },
  badgeText: { color: Colors.textSecondary, fontSize: 12 },
  fullBtn: { width: '100%' },
  waitingText: { fontSize: 13, color: 'rgba(255,255,255,0.4)', fontStyle: 'italic' },
  timerCard: { padding: 16, width: '100%' },
  timerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  timerLabel: { fontSize: 13, color: 'rgba(255,255,255,0.5)' },
  timerValue: { fontSize: 28, fontWeight: '700', color: Colors.white, fontVariant: ['tabular-nums'] },
  timerDanger: { color: '#f87171' },
  timerBarBg: { width: '100%', height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.1)', overflow: 'hidden' },
  timerBarFill: { height: '100%', borderRadius: 4, backgroundColor: Colors.accent },
  nameCard: { padding: 16, alignItems: 'center', width: '100%' },
  explainerName: { fontSize: 18, fontWeight: '700', color: Colors.white },
  guessedCount: { fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: 4 },
  wordCard: { padding: 32, alignItems: 'center', width: '100%' },
  wordLabel: { fontSize: 12, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 8 },
  wordText: { fontSize: 28, fontWeight: '800', color: Colors.white },
  guessHint: { fontSize: 16, color: 'rgba(255,255,255,0.5)', textAlign: 'center' },
  bigEmoji: { fontSize: 48, marginTop: 8 },
  actionRow: { flexDirection: 'row', gap: 12, width: '100%' },
  flex1: { flex: 1 },
  scoresCard: { padding: 16, width: '100%' },
  scoresTitle: { fontSize: 14, fontWeight: '600', color: 'rgba(255,255,255,0.5)', marginBottom: 8 },
  scoreRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.sm, marginBottom: 4,
  },
  scoreRowActive: { backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(168,85,247,0.4)' },
  scorePlayerName: { fontSize: 13, color: Colors.textPrimary },
});
