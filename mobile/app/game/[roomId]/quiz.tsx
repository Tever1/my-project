import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from '@/lib/i18n';
import { useAuth } from '@/lib/auth-context';
import { useSocket } from '@/lib/use-socket';
import { GameLayout } from '@/components/games/GameLayout';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { GlassBadge } from '@/components/ui/GlassBadge';
import { QUIZ_QUESTIONS } from '@/lib/game-data';
import { Colors, Radius } from '@/lib/colors';

type Phase = 'waiting' | 'countdown' | 'question' | 'results' | 'final';

interface QuizGameState {
  phase: Phase;
  questionIndex: number;
  timeLeft: number;
  answers: Record<string, number>;
  scores: Record<string, number>;
  showCorrect: boolean;
  players: { id: string; nickname: string; isHost: boolean }[];
  countdownValue: number;
  correctPlayers: string[];
}

const TOTAL_QUESTIONS = QUIZ_QUESTIONS.length;
const TIME_PER_QUESTION = 15;

const INITIAL_STATE: QuizGameState = {
  phase: 'waiting',
  questionIndex: 0,
  timeLeft: TIME_PER_QUESTION,
  answers: {},
  scores: {},
  showCorrect: false,
  players: [],
  countdownValue: 3,
  correctPlayers: [],
};

const OPTION_COLORS = ['#3b82f620', '#10b98120', '#f59e0b20', '#ec489920'];
const OPTION_LABELS = ['A', 'B', 'C', 'D'];

export default function QuizScreen() {
  const { roomId } = useLocalSearchParams<{ roomId: string }>();
  const { t, locale } = useTranslation();
  const { user } = useAuth();
  const { emit, on } = useSocket();

  const [gameState, setGameState] = useState<QuizGameState>(INITIAL_STATE);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isHost = gameState.players.find((p) => p.id === user?.id)?.isHost ?? false;
  const currentQuestion = QUIZ_QUESTIONS[gameState.questionIndex];
  const myAnswer = user ? gameState.answers[user.id] : undefined;
  const totalPlayers = gameState.players.length;
  const answeredCount = Object.keys(gameState.answers).length;
  const allAnswered = totalPlayers > 0 && answeredCount >= totalPlayers;

  useEffect(() => {
    const unsub1 = on('room:state', (data: unknown) => {
      const room = data as { players: { id: string; nickname: string; isHost: boolean }[] };
      setGameState((prev) => ({ ...prev, players: room.players }));
    });

    const unsub2 = on('game:action', (data: unknown) => {
      const { action, payload } = data as { action: string; payload: Record<string, unknown> };
      switch (action) {
        case 'quiz:sync':
          setGameState((prev) => ({ ...prev, ...(payload as Partial<QuizGameState>) }));
          break;
        case 'quiz:answer': {
          const { playerId, answerIndex } = payload as { playerId: string; answerIndex: number };
          setGameState((prev) => ({ ...prev, answers: { ...prev.answers, [playerId]: answerIndex } }));
          break;
        }
        case 'quiz:timer':
          setGameState((prev) => ({ ...prev, timeLeft: payload.timeLeft as number }));
          break;
        case 'quiz:show-results': {
          const { scores, correctPlayers } = payload as { scores: Record<string, number>; correctPlayers: string[] };
          setGameState((prev) => ({ ...prev, showCorrect: true, scores, correctPlayers }));
          break;
        }
        case 'quiz:countdown':
          setGameState((prev) => ({ ...prev, phase: 'countdown', countdownValue: payload.value as number }));
          break;
        case 'quiz:start-question': {
          const p = payload as { questionIndex: number; timeLeft: number };
          setGameState((prev) => ({ ...prev, phase: 'question', ...p, answers: {}, showCorrect: false, correctPlayers: [] }));
          break;
        }
        case 'quiz:final':
          setGameState((prev) => ({ ...prev, phase: 'final' }));
          break;
      }
    });

    const unsub3 = on('game:ended', () => router.replace(`/lobby/${roomId}` as any));
    return () => { unsub1(); unsub2(); unsub3(); };
  }, [on, roomId]);

  useEffect(() => {
    if (!isHost || gameState.phase !== 'question' || gameState.showCorrect) return;
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setGameState((prev) => {
        const next = prev.timeLeft - 1;
        if (next <= 0) {
          if (timerRef.current) clearInterval(timerRef.current);
          return { ...prev, timeLeft: 0 };
        }
        emit('game:action', { code: roomId, action: 'quiz:timer', payload: { timeLeft: next } });
        return { ...prev, timeLeft: next };
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isHost, gameState.phase, gameState.showCorrect, gameState.questionIndex, emit, roomId]);

  useEffect(() => {
    if (!isHost || gameState.phase !== 'question' || gameState.showCorrect) return;
    if (gameState.timeLeft <= 0 || allAnswered) revealResults();
  }, [gameState.timeLeft, allAnswered, isHost, gameState.phase, gameState.showCorrect]);

  const revealResults = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    const question = QUIZ_QUESTIONS[gameState.questionIndex];
    const newScores = { ...gameState.scores };
    const correct: string[] = [];
    for (const [playerId, answerIdx] of Object.entries(gameState.answers)) {
      if (answerIdx === question.correctIndex) {
        const timeBonus = Math.max(gameState.timeLeft, 0) * 10;
        newScores[playerId] = (newScores[playerId] || 0) + 100 + timeBonus;
        correct.push(playerId);
      }
    }
    setGameState((prev) => ({ ...prev, showCorrect: true, scores: newScores, correctPlayers: correct }));
    emit('game:action', { code: roomId, action: 'quiz:show-results', payload: { scores: newScores, correctPlayers: correct } });
    emit('game:state-update', { code: roomId, gameState: { scores: newScores } });
  }, [gameState.questionIndex, gameState.answers, gameState.scores, gameState.timeLeft, emit, roomId]);

  const runCountdown = useCallback((questionIdx: number) => {
    let count = 3;
    setGameState((prev) => ({ ...prev, phase: 'countdown', countdownValue: count }));
    emit('game:action', { code: roomId, action: 'quiz:countdown', payload: { value: count } });
    const interval = setInterval(() => {
      count -= 1;
      if (count <= 0) {
        clearInterval(interval);
        const startPayload = { questionIndex: questionIdx, timeLeft: TIME_PER_QUESTION };
        setGameState((prev) => ({ ...prev, phase: 'question', ...startPayload, answers: {}, showCorrect: false, correctPlayers: [] }));
        emit('game:action', { code: roomId, action: 'quiz:start-question', payload: startPayload });
      } else {
        setGameState((prev) => ({ ...prev, countdownValue: count }));
        emit('game:action', { code: roomId, action: 'quiz:countdown', payload: { value: count } });
      }
    }, 1000);
  }, [emit, roomId]);

  const startGame = () => {
    const initialScores: Record<string, number> = {};
    gameState.players.forEach((p) => { initialScores[p.id] = 0; });
    setGameState((prev) => ({ ...prev, scores: initialScores }));
    emit('game:action', { code: roomId, action: 'quiz:sync', payload: { scores: initialScores } });
    runCountdown(0);
  };

  const startNextQuestion = () => {
    const nextIndex = gameState.questionIndex + 1;
    if (nextIndex >= TOTAL_QUESTIONS) {
      setGameState((prev) => ({ ...prev, phase: 'final' }));
      emit('game:action', { code: roomId, action: 'quiz:final', payload: {} });
      return;
    }
    runCountdown(nextIndex);
  };

  const submitAnswer = (answerIndex: number) => {
    if (myAnswer !== undefined || gameState.showCorrect || !user) return;
    emit('game:action', { code: roomId, action: 'quiz:answer', payload: { playerId: user.id, answerIndex } });
    setGameState((prev) => ({ ...prev, answers: { ...prev.answers, [user.id]: answerIndex } }));
  };

  const endGame = () => emit('game:end', { code: roomId });

  const scoreboard = gameState.players
    .map((p) => ({ name: p.nickname, score: gameState.scores[p.id] || 0 }))
    .sort((a, b) => b.score - a.score);

  const getPlayerName = (id: string) => gameState.players.find((p) => p.id === id)?.nickname || id;

  return (
    <GameLayout
      title={locale === 'ru' ? 'Квиз' : 'Quiz'}
      icon="🧠"
      round={gameState.phase === 'question' || gameState.phase === 'countdown' ? gameState.questionIndex + 1 : gameState.phase === 'final' ? TOTAL_QUESTIONS : undefined}
      totalRounds={gameState.phase !== 'waiting' ? TOTAL_QUESTIONS : undefined}
      scores={scoreboard}
      onEnd={isHost ? endGame : undefined}
      showScoreboard={gameState.phase !== 'waiting' && gameState.phase !== 'countdown'}
    >
      {/* WAITING */}
      {gameState.phase === 'waiting' && (
        <View style={styles.center}>
          <Text style={styles.bigIcon}>🧠</Text>
          <Text style={styles.bigTitle}>{locale === 'ru' ? 'Квиз' : 'Quiz'}</Text>
          <Text style={styles.description}>
            {locale === 'ru'
              ? `${TOTAL_QUESTIONS} вопросов. Чем быстрее ответите правильно, тем больше очков!`
              : `${TOTAL_QUESTIONS} questions. The faster you answer correctly, the more points!`}
          </Text>
          <Text style={styles.playerCount}>
            {locale === 'ru' ? `Игроков: ${gameState.players.length}` : `Players: ${gameState.players.length}`}
          </Text>
          {isHost ? (
            <GlassButton variant="primary" size="lg" onPress={startGame}>
              {locale === 'ru' ? 'Начать игру' : 'Start Game'}
            </GlassButton>
          ) : (
            <Text style={styles.waitingText}>{locale === 'ru' ? 'Ожидание ведущего...' : 'Waiting for the host...'}</Text>
          )}
        </View>
      )}

      {/* COUNTDOWN */}
      {gameState.phase === 'countdown' && (
        <View style={styles.countdownCenter}>
          <Text style={styles.countdownLabel}>
            {locale === 'ru' ? 'Вопрос' : 'Question'} {gameState.questionIndex + 1}
          </Text>
          <Text style={styles.countdownNumber}>{gameState.countdownValue}</Text>
        </View>
      )}

      {/* QUESTION */}
      {gameState.phase === 'question' && currentQuestion && (
        <View>
          {/* Timer */}
          <View style={styles.timerRow}>
            <Text style={styles.timerLabel}>
              {locale === 'ru' ? 'Вопрос' : 'Question'} {gameState.questionIndex + 1}/{TOTAL_QUESTIONS}
            </Text>
            <Text style={[styles.timerValue, gameState.timeLeft <= 5 && { color: Colors.red }]}>
              {gameState.timeLeft}s
            </Text>
          </View>
          <View style={styles.timerBar}>
            <View style={[styles.timerFill, {
              width: `${(gameState.timeLeft / TIME_PER_QUESTION) * 100}%`,
              backgroundColor: gameState.timeLeft <= 5 ? Colors.red : Colors.accent,
            }]} />
          </View>

          {/* Question */}
          <GlassCard style={styles.questionCard}>
            <Text style={styles.questionText}>
              {locale === 'ru' ? currentQuestion.questionRu : currentQuestion.questionEn}
            </Text>
          </GlassCard>

          {/* Options */}
          {currentQuestion.options.map((option, index) => {
            const isMyAnswer = myAnswer === index;
            const isCorrect = index === currentQuestion.correctIndex;
            const isCorrectRevealed = gameState.showCorrect && isCorrect;
            const isWrongRevealed = gameState.showCorrect && isMyAnswer && !isCorrect;
            const isDisabled = myAnswer !== undefined || gameState.showCorrect;

            return (
              <Pressable
                key={index}
                onPress={() => !isDisabled && submitAnswer(index)}
                style={[
                  styles.optionBtn,
                  { backgroundColor: OPTION_COLORS[index] },
                  isCorrectRevealed && styles.correctOption,
                  isWrongRevealed && styles.wrongOption,
                  isMyAnswer && !gameState.showCorrect && styles.selectedOption,
                  isDisabled && !isCorrectRevealed && !isWrongRevealed && !isMyAnswer && styles.dimmedOption,
                ]}
              >
                <View style={[
                  styles.optionLabel,
                  isCorrectRevealed && { backgroundColor: 'rgba(74,222,128,0.3)' },
                  isWrongRevealed && { backgroundColor: 'rgba(248,113,113,0.3)' },
                ]}>
                  <Text style={styles.optionLabelText}>
                    {isCorrectRevealed ? '✓' : isWrongRevealed ? '✕' : OPTION_LABELS[index]}
                  </Text>
                </View>
                <Text style={styles.optionText}>
                  {locale === 'ru' ? option.ru : option.en}
                </Text>
              </Pressable>
            );
          })}

          {/* Status */}
          <View style={styles.statusRow}>
            <Text style={styles.statusText}>
              {myAnswer !== undefined ? (locale === 'ru' ? 'Ответ принят!' : 'Answer submitted!') : ''}
            </Text>
            <Text style={styles.statusText}>{answeredCount}/{totalPlayers}</Text>
          </View>

          {/* Post-question */}
          {gameState.showCorrect && (
            <View style={styles.resultsSection}>
              <GlassCard style={styles.resultsCard}>
                {gameState.correctPlayers.length > 0 ? (
                  <>
                    <Text style={styles.correctLabel}>
                      {locale === 'ru' ? 'Правильно ответили:' : 'Answered correctly:'}
                    </Text>
                    <View style={styles.badgeRow}>
                      {gameState.correctPlayers.map((id) => (
                        <GlassBadge key={id}>{getPlayerName(id)}</GlassBadge>
                      ))}
                    </View>
                  </>
                ) : (
                  <Text style={styles.wrongLabel}>
                    {locale === 'ru' ? 'Никто не ответил правильно!' : 'Nobody answered correctly!'}
                  </Text>
                )}
              </GlassCard>
              {isHost && (
                <GlassButton variant="primary" size="lg" onPress={startNextQuestion} style={{ marginTop: 16, alignSelf: 'center' }}>
                  {gameState.questionIndex + 1 < TOTAL_QUESTIONS
                    ? locale === 'ru' ? 'Следующий вопрос' : 'Next Question'
                    : locale === 'ru' ? 'Показать результаты' : 'Show Results'}
                </GlassButton>
              )}
            </View>
          )}
        </View>
      )}

      {/* FINAL */}
      {gameState.phase === 'final' && (
        <View style={styles.center}>
          <Text style={styles.bigIcon}>🏆</Text>
          <Text style={styles.bigTitle}>{locale === 'ru' ? 'Итоги' : 'Final Results'}</Text>
          {scoreboard.map((entry, i) => (
            <GlassCard key={entry.name} style={[styles.finalRow, i === 0 && styles.firstPlace]}>
              <View style={styles.finalLeft}>
                <Text style={styles.finalRank}>
                  {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`}
                </Text>
                <Text style={styles.finalName}>{entry.name}</Text>
              </View>
              <Text style={styles.finalScore}>{entry.score}</Text>
            </GlassCard>
          ))}
          {isHost && (
            <View style={styles.finalActions}>
              <GlassButton onPress={endGame}>{locale === 'ru' ? 'В лобби' : 'Back to Lobby'}</GlassButton>
              <GlassButton variant="primary" onPress={startGame}>{locale === 'ru' ? 'Играть снова' : 'Play Again'}</GlassButton>
            </View>
          )}
        </View>
      )}
    </GameLayout>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', paddingVertical: 40 },
  bigIcon: { fontSize: 72, marginBottom: 16 },
  bigTitle: { fontSize: 30, fontWeight: '700', color: Colors.white, marginBottom: 12 },
  description: { fontSize: 14, color: 'rgba(255,255,255,0.5)', textAlign: 'center', maxWidth: 320, marginBottom: 8 },
  playerCount: { fontSize: 13, color: 'rgba(255,255,255,0.3)', marginBottom: 24 },
  waitingText: { fontSize: 14, color: 'rgba(255,255,255,0.4)', fontStyle: 'italic' },
  countdownCenter: { alignItems: 'center', paddingVertical: 80 },
  countdownLabel: { fontSize: 18, color: 'rgba(255,255,255,0.5)', marginBottom: 16 },
  countdownNumber: { fontSize: 96, fontWeight: '900', color: Colors.white },
  timerRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  timerLabel: { fontSize: 12, color: 'rgba(255,255,255,0.4)' },
  timerValue: { fontSize: 14, fontWeight: '700', color: 'rgba(255,255,255,0.7)' },
  timerBar: { height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.1)', overflow: 'hidden', marginBottom: 16 },
  timerFill: { height: '100%', borderRadius: 4 },
  questionCard: { padding: 24, marginBottom: 12 },
  questionText: { fontSize: 20, fontWeight: '600', color: Colors.white, lineHeight: 28 },
  optionBtn: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: Radius.lg, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', padding: 16, marginBottom: 8 },
  correctOption: { borderColor: Colors.green, backgroundColor: 'rgba(74,222,128,0.2)' },
  wrongOption: { borderColor: Colors.red, backgroundColor: 'rgba(248,113,113,0.2)' },
  selectedOption: { borderColor: Colors.accent, backgroundColor: 'rgba(168,85,247,0.15)' },
  dimmedOption: { opacity: 0.5 },
  optionLabel: { width: 32, height: 32, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  optionLabelText: { fontSize: 14, fontWeight: '700', color: 'rgba(255,255,255,0.6)' },
  optionText: { fontSize: 16, fontWeight: '500', color: Colors.white, flex: 1 },
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  statusText: { fontSize: 13, color: 'rgba(255,255,255,0.3)' },
  resultsSection: { marginTop: 20 },
  resultsCard: { padding: 16 },
  correctLabel: { fontSize: 15, fontWeight: '500', color: Colors.green, marginBottom: 8 },
  wrongLabel: { fontSize: 15, fontWeight: '500', color: Colors.red },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  finalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, marginBottom: 8, width: '100%' },
  firstPlace: { borderColor: 'rgba(250,204,21,0.5)', backgroundColor: 'rgba(250,204,21,0.1)' },
  finalLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  finalRank: { fontSize: 24, width: 36, textAlign: 'center' },
  finalName: { fontSize: 18, fontWeight: '600', color: Colors.white },
  finalScore: { fontSize: 20, fontWeight: '700', color: Colors.accent },
  finalActions: { flexDirection: 'row', gap: 12, marginTop: 32 },
});
