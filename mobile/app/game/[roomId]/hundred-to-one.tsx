import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from '@/lib/i18n';
import { useAuth } from '@/lib/auth-context';
import { useSocket } from '@/lib/use-socket';
import { GameLayout } from '@/components/games/GameLayout';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { GlassInput } from '@/components/ui/GlassInput';
import { GlassBadge } from '@/components/ui/GlassBadge';
import { HUNDRED_TO_ONE_QUESTIONS } from '@/lib/game-data';
import { Colors, Radius } from '@/lib/colors';

type Phase = 'waiting' | 'playing' | 'steal' | 'round-end' | 'final';

interface HundredState {
  phase: Phase; questionIndex: number; revealedAnswers: number[];
  strikes: number; teamAScore: number; teamBScore: number;
  activeTeam: 'A' | 'B'; stealTeam: 'A' | 'B' | null; roundPoints: number;
  players: { id: string; nickname: string; isHost: boolean }[];
  lastGuess: string; lastGuessResult: 'hit' | 'miss' | null;
}

const TOTAL_ROUNDS = HUNDRED_TO_ONE_QUESTIONS.length;
const MAX_STRIKES = 3;

const INITIAL: HundredState = {
  phase: 'waiting', questionIndex: 0, revealedAnswers: [], strikes: 0,
  teamAScore: 0, teamBScore: 0, activeTeam: 'A', stealTeam: null,
  roundPoints: 0, players: [], lastGuess: '', lastGuessResult: null,
};

export default function HundredToOneScreen() {
  const { roomId } = useLocalSearchParams<{ roomId: string }>();
  const { locale } = useTranslation();
  const { user } = useAuth();
  const { emit, on } = useSocket();
  const [state, setState] = useState<HundredState>(INITIAL);
  const [guess, setGuess] = useState('');

  const isHost = state.players.find((p) => p.id === user?.id)?.isHost ?? false;
  const question = HUNDRED_TO_ONE_QUESTIONS[state.questionIndex];

  useEffect(() => {
    const unsub1 = on('room:state', (data: unknown) => {
      const room = data as { players: HundredState['players'] };
      setState((prev) => ({ ...prev, players: room.players }));
    });
    const unsub2 = on('game:action', (data: unknown) => {
      const { action, payload } = data as { action: string; payload: Record<string, unknown> };
      switch (action) {
        case 'h2o:sync': setState((prev) => ({ ...prev, ...(payload as Partial<HundredState>) })); break;
        case 'h2o:reveal': {
          const { answerIndex, points } = payload as { answerIndex: number; points: number };
          setState((prev) => ({ ...prev, revealedAnswers: [...prev.revealedAnswers, answerIndex], roundPoints: prev.roundPoints + points, lastGuessResult: 'hit' })); break;
        }
        case 'h2o:strike': setState((prev) => ({ ...prev, strikes: (payload.strikes as number) ?? prev.strikes + 1, lastGuessResult: 'miss' })); break;
        case 'h2o:steal': setState((prev) => ({ ...prev, phase: 'steal', stealTeam: payload.stealTeam as 'A' | 'B', strikes: 0, lastGuessResult: null, lastGuess: '' })); break;
        case 'h2o:round-end': {
          const { teamAScore, teamBScore } = payload as { teamAScore: number; teamBScore: number };
          setState((prev) => ({ ...prev, phase: 'round-end', teamAScore, teamBScore })); break;
        }
        case 'h2o:next-round': {
          const p = payload as Partial<HundredState>;
          setState((prev) => ({ ...prev, ...p, phase: 'playing', revealedAnswers: [], strikes: 0, stealTeam: null, roundPoints: 0, lastGuess: '', lastGuessResult: null })); break;
        }
        case 'h2o:guess': setState((prev) => ({ ...prev, lastGuess: payload.guess as string, lastGuessResult: null })); break;
        case 'h2o:final': setState((prev) => ({ ...prev, phase: 'final' })); break;
      }
    });
    const unsub3 = on('game:ended', () => router.replace(`/lobby/${roomId}` as any));
    return () => { unsub1(); unsub2(); unsub3(); };
  }, [on, roomId]);

  const broadcast = useCallback((action: string, payload: Record<string, unknown>) => {
    emit('game:action', { code: roomId, action, payload });
  }, [emit, roomId]);

  const startGame = () => {
    const update: Partial<HundredState> = { phase: 'playing', questionIndex: 0, revealedAnswers: [], strikes: 0, teamAScore: 0, teamBScore: 0, activeTeam: 'A', stealTeam: null, roundPoints: 0, lastGuess: '', lastGuessResult: null };
    setState((prev) => ({ ...prev, ...update }));
    broadcast('h2o:sync', update);
  };

  const revealAnswer = (index: number) => {
    if (!isHost || state.revealedAnswers.includes(index)) return;
    const pts = question.answers[index].points;
    setState((prev) => ({ ...prev, revealedAnswers: [...prev.revealedAnswers, index], roundPoints: prev.roundPoints + pts, lastGuessResult: 'hit' }));
    broadcast('h2o:reveal', { answerIndex: index, points: pts });
  };

  const addStrike = () => {
    if (!isHost) return;
    const newStrikes = state.strikes + 1;
    if (newStrikes >= MAX_STRIKES) {
      if (state.phase === 'steal') { awardRound(state.activeTeam); return; }
      const stealTeam = state.activeTeam === 'A' ? 'B' : 'A';
      setState((prev) => ({ ...prev, phase: 'steal', stealTeam, strikes: 0, lastGuessResult: null, lastGuess: '' }));
      broadcast('h2o:steal', { stealTeam });
    } else {
      setState((prev) => ({ ...prev, strikes: newStrikes, lastGuessResult: 'miss' }));
      broadcast('h2o:strike', { strikes: newStrikes });
    }
  };

  const awardRound = (winnerTeam: 'A' | 'B') => {
    const base = winnerTeam === 'A' ? state.teamAScore : state.teamBScore;
    const newScore = base + state.roundPoints;
    const update = { teamAScore: winnerTeam === 'A' ? newScore : state.teamAScore, teamBScore: winnerTeam === 'B' ? newScore : state.teamBScore, winner: winnerTeam };
    setState((prev) => ({ ...prev, phase: 'round-end', teamAScore: update.teamAScore, teamBScore: update.teamBScore }));
    broadcast('h2o:round-end', update);
    emit('game:state-update', { code: roomId, gameState: { teamAScore: update.teamAScore, teamBScore: update.teamBScore } });
  };

  const nextRound = () => {
    const nextIdx = state.questionIndex + 1;
    if (nextIdx >= TOTAL_ROUNDS) { setState((prev) => ({ ...prev, phase: 'final' })); broadcast('h2o:final', {}); return; }
    const update: Partial<HundredState> = { questionIndex: nextIdx, activeTeam: state.activeTeam === 'A' ? 'B' : 'A' };
    setState((prev) => ({ ...prev, ...update, phase: 'playing', revealedAnswers: [], strikes: 0, stealTeam: null, roundPoints: 0, lastGuess: '', lastGuessResult: null }));
    broadcast('h2o:next-round', update);
  };

  const submitGuess = () => {
    if (!guess.trim()) return;
    broadcast('h2o:guess', { guess: guess.trim(), from: user?.nickname });
    setGuess('');
  };

  const endGame = () => emit('game:end', { code: roomId });

  const scores = [
    { name: `${locale === 'ru' ? 'Команда' : 'Team'} A`, score: state.teamAScore },
    { name: `${locale === 'ru' ? 'Команда' : 'Team'} B`, score: state.teamBScore },
  ];

  const l = (ru: string, en: string) => locale === 'ru' ? ru : en;

  return (
    <GameLayout title={l('100 к 1', '100 to 1')} icon="💯"
      round={state.phase !== 'waiting' && state.phase !== 'final' ? state.questionIndex + 1 : undefined}
      totalRounds={state.phase !== 'waiting' ? TOTAL_ROUNDS : undefined}
      scores={scores} onEnd={isHost ? endGame : undefined} showScoreboard={state.phase !== 'waiting'}>

      {state.phase === 'waiting' && (
        <View style={styles.center}>
          <Text style={styles.bigIcon}>💯</Text>
          <Text style={styles.bigTitle}>{l('100 к 1', '100 to 1')}</Text>
          <Text style={styles.desc}>{l('Угадывайте популярные ответы! Две команды, 3 промаха = перехват.', 'Guess popular answers! Two teams, 3 strikes = steal.')}</Text>
          {isHost ? (
            <GlassButton variant="primary" size="lg" onPress={startGame}>{l('Начать игру', 'Start Game')}</GlassButton>
          ) : (
            <Text style={styles.waitText}>{l('Ожидание ведущего...', 'Waiting for the host...')}</Text>
          )}
        </View>
      )}

      {(state.phase === 'playing' || state.phase === 'steal') && question && (
        <View>
          {/* Team scores */}
          <View style={styles.teamsRow}>
            <View style={[styles.teamBox, state.activeTeam === 'A' && state.phase === 'playing' && styles.activeTeam]}>
              <Text style={styles.teamLabel}>{l('Ком.', 'Team')} A</Text>
              <Text style={styles.teamScore}>{state.teamAScore}</Text>
            </View>
            <View style={styles.strikesRow}>
              {[0, 1, 2].map((i) => (
                <View key={i} style={[styles.strike, i < state.strikes && styles.strikeActive]}>
                  <Text style={styles.strikeText}>✕</Text>
                </View>
              ))}
            </View>
            <View style={[styles.teamBox, state.activeTeam === 'B' && state.phase === 'playing' && styles.activeTeamB]}>
              <Text style={styles.teamLabel}>{l('Ком.', 'Team')} B</Text>
              <Text style={styles.teamScore}>{state.teamBScore}</Text>
            </View>
          </View>

          {state.phase === 'steal' && (
            <GlassCard style={styles.stealBanner}>
              <Text style={styles.stealText}>
                {l(`Команда ${state.stealTeam} может украсть ${state.roundPoints} очков!`, `Team ${state.stealTeam} can steal ${state.roundPoints} points!`)}
              </Text>
            </GlassCard>
          )}

          <GlassCard style={styles.questionCard}>
            <Text style={styles.questionLabel}>{l('Вопрос', 'Question')} {state.questionIndex + 1}/{TOTAL_ROUNDS}</Text>
            <Text style={styles.questionText}>{locale === 'ru' ? question.questionRu : question.questionEn}</Text>
          </GlassCard>

          {/* Answer board */}
          {question.answers.map((answer, idx) => {
            const isRevealed = state.revealedAnswers.includes(idx);
            return (
              <Pressable key={idx} onPress={() => isHost && !isRevealed && revealAnswer(idx)}
                style={[styles.answerRow, isRevealed && styles.answerRevealed]}>
                <View style={[styles.answerNum, isRevealed && styles.answerNumRevealed]}>
                  <Text style={styles.answerNumText}>{idx + 1}</Text>
                </View>
                <Text style={styles.answerText}>
                  {isRevealed ? (locale === 'ru' ? answer.textRu : answer.textEn) : '- - - - -'}
                </Text>
                <Text style={styles.answerPoints}>{isRevealed ? answer.points : '?'}</Text>
              </Pressable>
            );
          })}

          <Text style={styles.roundPoints}>{l('Очки раунда:', 'Round points:')} {state.roundPoints}</Text>

          {!isHost && (
            <View style={styles.guessRow}>
              <View style={{ flex: 1 }}>
                <GlassInput placeholder={l('Ваш ответ...', 'Your guess...')} value={guess}
                  onChangeText={setGuess} onSubmitEditing={submitGuess} returnKeyType="send" />
              </View>
              <GlassButton variant="primary" onPress={submitGuess}>{l('Ответить', 'Submit')}</GlassButton>
            </View>
          )}

          {isHost && (
            <View style={styles.hostControls}>
              {state.phase === 'playing' && (
                <>
                  <GlassButton variant="danger" onPress={addStrike}>✕ {l('Промах', 'Strike')}</GlassButton>
                  <GlassButton onPress={() => awardRound(state.activeTeam)}>{l('Следующий', 'Skip')}</GlassButton>
                </>
              )}
              {state.phase === 'steal' && (
                <>
                  <GlassButton variant="primary" onPress={() => awardRound(state.stealTeam!)}>{l('Угадали!', 'Correct!')}</GlassButton>
                  <GlassButton variant="danger" onPress={() => awardRound(state.activeTeam)}>{l('Не угадали', 'Wrong')}</GlassButton>
                </>
              )}
            </View>
          )}
        </View>
      )}

      {state.phase === 'round-end' && (
        <View style={styles.center}>
          <Text style={styles.bigTitle}>{l('Раунд завершён!', 'Round Complete!')}</Text>
          <View style={styles.scoreCards}>
            <GlassCard style={[styles.scoreCard, state.teamAScore >= state.teamBScore && styles.winCard]}>
              <Text style={styles.teamLabel}>{l('Команда', 'Team')} A</Text>
              <Text style={styles.bigScore}>{state.teamAScore}</Text>
            </GlassCard>
            <GlassCard style={[styles.scoreCard, state.teamBScore > state.teamAScore && styles.winCardB]}>
              <Text style={styles.teamLabel}>{l('Команда', 'Team')} B</Text>
              <Text style={styles.bigScore}>{state.teamBScore}</Text>
            </GlassCard>
          </View>
          {isHost && (
            <GlassButton variant="primary" size="lg" onPress={nextRound} style={{ marginTop: 20 }}>
              {state.questionIndex + 1 < TOTAL_ROUNDS ? l('Следующий раунд', 'Next Round') : l('Итоги', 'Final Results')}
            </GlassButton>
          )}
        </View>
      )}

      {state.phase === 'final' && (
        <View style={styles.center}>
          <Text style={styles.bigIcon}>🏆</Text>
          <Text style={styles.bigTitle}>{l('Финальный счёт', 'Final Score')}</Text>
          <Text style={styles.winnerText}>
            {state.teamAScore !== state.teamBScore
              ? l(`Побеждает ${state.teamAScore > state.teamBScore ? 'Команда A' : 'Команда B'}!`,
                  `${state.teamAScore > state.teamBScore ? 'Team A' : 'Team B'} wins!`)
              : l('Ничья!', "It's a tie!")}
          </Text>
          <View style={styles.scoreCards}>
            <GlassCard style={[styles.scoreCard, state.teamAScore >= state.teamBScore && styles.winCard]}>
              <Text style={styles.teamLabel}>{l('Команда', 'Team')} A</Text>
              <Text style={styles.bigScore}>{state.teamAScore}</Text>
            </GlassCard>
            <GlassCard style={[styles.scoreCard, state.teamBScore >= state.teamAScore && styles.winCardB]}>
              <Text style={styles.teamLabel}>{l('Команда', 'Team')} B</Text>
              <Text style={styles.bigScore}>{state.teamBScore}</Text>
            </GlassCard>
          </View>
          {isHost && (
            <View style={styles.finalActions}>
              <GlassButton onPress={endGame}>{l('В лобби', 'Back to Lobby')}</GlassButton>
              <GlassButton variant="primary" onPress={startGame}>{l('Играть снова', 'Play Again')}</GlassButton>
            </View>
          )}
        </View>
      )}
    </GameLayout>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', paddingVertical: 32 },
  bigIcon: { fontSize: 64, marginBottom: 12 },
  bigTitle: { fontSize: 28, fontWeight: '700', color: Colors.white, marginBottom: 12 },
  desc: { fontSize: 14, color: 'rgba(255,255,255,0.5)', textAlign: 'center', marginBottom: 24, maxWidth: 320 },
  waitText: { fontSize: 14, color: 'rgba(255,255,255,0.4)', fontStyle: 'italic' },
  teamsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  teamBox: { backgroundColor: Colors.glassBg, borderWidth: 1, borderColor: Colors.glassBorder, borderRadius: Radius.md, padding: 12, alignItems: 'center', flex: 1 },
  activeTeam: { borderColor: Colors.blue, backgroundColor: 'rgba(96,165,250,0.1)' },
  activeTeamB: { borderColor: Colors.green, backgroundColor: 'rgba(74,222,128,0.1)' },
  teamLabel: { fontSize: 13, color: 'rgba(255,255,255,0.6)' },
  teamScore: { fontSize: 20, fontWeight: '700', color: Colors.white },
  strikesRow: { flexDirection: 'row', gap: 8, marginHorizontal: 12 },
  strike: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' },
  strikeActive: { backgroundColor: 'rgba(239,68,68,0.3)' },
  strikeText: { fontSize: 16, fontWeight: '700', color: 'rgba(255,255,255,0.15)' },
  stealBanner: { padding: 12, marginBottom: 12, borderColor: 'rgba(250,204,21,0.3)', backgroundColor: 'rgba(250,204,21,0.1)' },
  stealText: { color: '#fde68a', fontWeight: '700', textAlign: 'center' },
  questionCard: { padding: 24, marginBottom: 12, alignItems: 'center' },
  questionLabel: { fontSize: 12, color: 'rgba(255,255,255,0.3)', marginBottom: 8 },
  questionText: { fontSize: 20, fontWeight: '600', color: Colors.white, textAlign: 'center' },
  answerRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.glassBg, borderWidth: 1, borderColor: Colors.glassBorder, borderRadius: Radius.lg, padding: 16, marginBottom: 8, gap: 12 },
  answerRevealed: { backgroundColor: 'rgba(168,85,247,0.1)', borderColor: 'rgba(168,85,247,0.2)' },
  answerNum: { width: 32, height: 32, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  answerNumRevealed: { backgroundColor: 'rgba(168,85,247,0.3)' },
  answerNumText: { fontSize: 14, fontWeight: '700', color: 'rgba(255,255,255,0.3)' },
  answerText: { flex: 1, fontSize: 15, fontWeight: '500', color: Colors.white },
  answerPoints: { fontSize: 14, fontWeight: '700', color: Colors.accent },
  roundPoints: { textAlign: 'center', fontSize: 14, color: 'rgba(255,255,255,0.4)', marginVertical: 12 },
  guessRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  hostControls: { flexDirection: 'row', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginTop: 8 },
  scoreCards: { flexDirection: 'row', gap: 12, marginTop: 16, width: '100%' },
  scoreCard: { flex: 1, padding: 24, alignItems: 'center' },
  winCard: { borderColor: 'rgba(96,165,250,0.5)' },
  winCardB: { borderColor: 'rgba(74,222,128,0.5)' },
  bigScore: { fontSize: 36, fontWeight: '700', color: Colors.white },
  winnerText: { fontSize: 18, color: Colors.yellow, marginBottom: 8 },
  finalActions: { flexDirection: 'row', gap: 12, marginTop: 24 },
});
