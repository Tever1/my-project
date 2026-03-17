import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TextInput } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { GameLayout } from '@/components/games/GameLayout';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { GlassBadge } from '@/components/ui/GlassBadge';
import { useSocket } from '@/lib/use-socket';
import { useAuth } from '@/lib/auth-context';
import { useTranslation } from '@/lib/i18n';
import { WHO_AM_I_CHARACTERS } from '@/lib/game-data';
import { Player } from '@/types/room';
import { Colors, Radius } from '@/lib/colors';

interface WhoAmIGameState {
  phase: 'lobby' | 'playing' | 'finished';
  characters: Record<string, { ru: string; en: string }>;
  currentTurnIndex: number;
  turnOrder: string[];
  guessedPlayers: string[];
  questionsAsked: Record<string, number>;
  scores: Record<string, number>;
}

type GameAction =
  | { type: 'start-game'; characters: Record<string, { ru: string; en: string }>; turnOrder: string[] }
  | { type: 'sync-state'; state: WhoAmIGameState }
  | { type: 'next-turn' }
  | { type: 'ask-question' }
  | { type: 'guess'; playerId: string; guess: string; correct: boolean }
  | { type: 'end-game' };

function assignCharacters(playerIds: string[]): Record<string, { ru: string; en: string }> {
  const shuffled = [...WHO_AM_I_CHARACTERS].sort(() => Math.random() - 0.5);
  const result: Record<string, { ru: string; en: string }> = {};
  playerIds.forEach((id, i) => { result[id] = shuffled[i % shuffled.length]; });
  return result;
}

function calculateScore(questionsAsked: number): number {
  if (questionsAsked <= 1) return 100;
  if (questionsAsked <= 3) return 80;
  if (questionsAsked <= 5) return 60;
  if (questionsAsked <= 8) return 40;
  if (questionsAsked <= 12) return 20;
  return 10;
}

function getInitialState(): WhoAmIGameState {
  return {
    phase: 'lobby', characters: {}, currentTurnIndex: 0,
    turnOrder: [], guessedPlayers: [], questionsAsked: {}, scores: {},
  };
}

export default function WhoAmIScreen() {
  const { roomId } = useLocalSearchParams<{ roomId: string }>();
  const { emit, on } = useSocket();
  const { locale } = useTranslation();
  const { user } = useAuth();

  const [players, setPlayers] = useState<Player[]>([]);
  const [gs, setGs] = useState<WhoAmIGameState>(getInitialState);
  const [guessInput, setGuessInput] = useState('');
  const [showGuessInput, setShowGuessInput] = useState(false);
  const [lastGuessResult, setLastGuessResult] = useState<{
    playerId: string; correct: boolean; guess: string;
  } | null>(null);

  const isHost = players.find((p) => p.isHost)?.id === user?.id;
  const playerName = useCallback((id: string) => players.find((p) => p.id === id)?.nickname ?? id, [players]);
  const l = useCallback((ru: string, en: string) => (locale === 'ru' ? ru : en), [locale]);

  const activeTurnOrder = gs.turnOrder.filter((id) => !gs.guessedPlayers.includes(id));
  const currentPlayerId = activeTurnOrder.length > 0
    ? activeTurnOrder[gs.currentTurnIndex % activeTurnOrder.length] : null;
  const isMyTurn = currentPlayerId === user?.id;

  const broadcast = useCallback(
    (action: GameAction) => {
      emit('game:action', { code: roomId, action: 'who-am-i', payload: action });
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
      if (action !== 'who-am-i') return;
      switch (payload.type) {
        case 'start-game':
          setGs({
            phase: 'playing', characters: payload.characters, currentTurnIndex: 0,
            turnOrder: payload.turnOrder, guessedPlayers: [],
            questionsAsked: Object.fromEntries(payload.turnOrder.map((id) => [id, 0])),
            scores: Object.fromEntries(payload.turnOrder.map((id) => [id, 0])),
          });
          setLastGuessResult(null);
          break;
        case 'sync-state':
          setGs(payload.state);
          break;
        case 'next-turn':
          setGs((prev) => ({ ...prev, currentTurnIndex: prev.currentTurnIndex + 1 }));
          setShowGuessInput(false); setGuessInput(''); setLastGuessResult(null);
          break;
        case 'ask-question':
          setGs((prev) => {
            const cid = currentPlayerId;
            if (!cid) return prev;
            return { ...prev, questionsAsked: { ...prev.questionsAsked, [cid]: (prev.questionsAsked[cid] || 0) + 1 } };
          });
          break;
        case 'guess':
          if (payload.correct) {
            setGs((prev) => {
              const score = calculateScore(prev.questionsAsked[payload.playerId] || 0);
              const newGuessed = [...prev.guessedPlayers, payload.playerId];
              const allGuessed = newGuessed.length >= prev.turnOrder.length;
              return {
                ...prev, guessedPlayers: newGuessed,
                scores: { ...prev.scores, [payload.playerId]: (prev.scores[payload.playerId] || 0) + score },
                phase: allGuessed ? 'finished' : prev.phase,
                currentTurnIndex: prev.currentTurnIndex + 1,
              };
            });
          }
          setLastGuessResult({ playerId: payload.playerId, correct: payload.correct, guess: payload.guess });
          setShowGuessInput(false); setGuessInput('');
          break;
        case 'end-game':
          setGs((prev) => ({ ...prev, phase: 'finished' }));
          break;
      }
    });
    return cleanup;
  }, [on, currentPlayerId]);

  const handleStart = () => {
    const playerIds = players.map((p) => p.id);
    broadcast({ type: 'start-game', characters: assignCharacters(playerIds), turnOrder: [...playerIds].sort(() => Math.random() - 0.5) });
  };

  const handleNextTurn = () => broadcast({ type: 'next-turn' });
  const handleQuestionAsked = () => broadcast({ type: 'ask-question' });

  const handleGuess = () => {
    if (!user || !guessInput.trim()) return;
    const myChar = gs.characters[user.id];
    if (!myChar) return;
    const normalise = (s: string) => s.trim().toLowerCase();
    const correct = normalise(guessInput) === normalise(myChar.ru) || normalise(guessInput) === normalise(myChar.en);
    broadcast({ type: 'guess', playerId: user.id, guess: guessInput.trim(), correct });
  };

  const handleEndGame = () => broadcast({ type: 'end-game' });

  const layoutScores = Object.entries(gs.scores).map(([id, score]) => ({ name: playerName(id), score }));

  const renderPlayerCharacters = () => (
    <GlassCard style={styles.charCard}>
      <Text style={styles.charTitle}>{l('Персонажи игроков', 'Player Characters')}</Text>
      {gs.turnOrder.map((id) => {
        const char = gs.characters[id];
        const isMe = id === user?.id;
        const isGuessed = gs.guessedPlayers.includes(id);
        const isCurrent = id === currentPlayerId;
        return (
          <View key={id} style={[styles.charRow, isCurrent && styles.charRowActive, isGuessed && styles.charRowGuessed]}>
            <View style={styles.charRowLeft}>
              {isCurrent && <Text style={{ fontSize: 14 }}>👉</Text>}
              <Text style={[styles.charRowName, isMe && { color: '#d8b4fe' }]}>
                {playerName(id)}{isMe ? ` (${l('Вы', 'You')})` : ''}
              </Text>
            </View>
            {isGuessed ? (
              <GlassBadge variant="accent"><Text style={styles.badgeText}>✅ {char?.[locale]}</Text></GlassBadge>
            ) : isMe ? (
              <GlassBadge><Text style={[styles.badgeText, { fontSize: 16, fontWeight: '700' }]}>???</Text></GlassBadge>
            ) : (
              <GlassBadge variant="accent"><Text style={styles.badgeText}>{char?.[locale]}</Text></GlassBadge>
            )}
          </View>
        );
      })}
    </GlassCard>
  );

  const renderLobby = () => (
    <View style={styles.center}>
      <GlassCard style={styles.card}>
        <Text style={styles.cardTitle}>{l('Кто я?', 'Who Am I?')}</Text>
        <Text style={styles.cardDesc}>{l(`${players.length} игроков в комнате`, `${players.length} players in room`)}</Text>
        <View style={styles.badgeRow}>
          {players.map((p) => (
            <GlassBadge key={p.id}><Text style={styles.badgeText}>{p.nickname}{p.isHost ? ' ⭐' : ''}</Text></GlassBadge>
          ))}
        </View>
        {isHost ? (
          <GlassButton variant="primary" size="lg" onPress={handleStart} disabled={players.length < 2} style={styles.fullBtn}>
            {l('Начать игру', 'Start Game')}
          </GlassButton>
        ) : (
          <Text style={styles.waitText}>{l('Ожидание ведущего...', 'Waiting for host...')}</Text>
        )}
      </GlassCard>
    </View>
  );

  const renderPlaying = () => {
    const myQuestions = user ? gs.questionsAsked[user.id] || 0 : 0;
    const haveIGuessed = user ? gs.guessedPlayers.includes(user.id) : false;

    return (
      <View style={styles.center}>
        <GlassCard style={styles.card}>
          <Text style={styles.turnLabel}>{l('Сейчас ходит', 'Current turn')}</Text>
          <Text style={styles.turnName}>
            {currentPlayerId
              ? currentPlayerId === user?.id ? l('Ваш ход!', 'Your turn!') : playerName(currentPlayerId)
              : l('Игра завершена', 'Game over')}
          </Text>
          {isMyTurn && !haveIGuessed && (
            <Text style={styles.turnHint}>{l('Задайте вопрос вслух с ответом "Да" или "Нет"', 'Ask a Yes/No question out loud')}</Text>
          )}
        </GlassCard>

        {renderPlayerCharacters()}

        {lastGuessResult && (
          <GlassCard style={styles.card}>
            {lastGuessResult.correct ? (
              <>
                <Text style={styles.bigEmoji}>🎉</Text>
                <Text style={styles.correctText}>
                  {playerName(lastGuessResult.playerId)} {l('угадал!', 'guessed correctly!')}
                </Text>
                <Text style={styles.guessText}>"{lastGuessResult.guess}"</Text>
              </>
            ) : (
              <>
                <Text style={styles.bigEmoji}>❌</Text>
                <Text style={styles.wrongText}>{l('Неправильно!', 'Wrong!')}</Text>
                <Text style={styles.guessText}>"{lastGuessResult.guess}"</Text>
              </>
            )}
          </GlassCard>
        )}

        {isMyTurn && !haveIGuessed && (
          <GlassCard style={styles.controlCard}>
            <GlassBadge><Text style={styles.badgeText}>{l(`Вопросов задано: ${myQuestions}`, `Questions asked: ${myQuestions}`)}</Text></GlassBadge>

            {showGuessInput ? (
              <View style={{ width: '100%', gap: 12, marginTop: 12 }}>
                <TextInput
                  value={guessInput}
                  onChangeText={setGuessInput}
                  placeholder={l('Введите ваш ответ...', 'Enter your guess...')}
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  style={styles.input}
                  autoFocus
                  onSubmitEditing={handleGuess}
                />
                <View style={styles.row}>
                  <GlassButton variant="primary" onPress={handleGuess} disabled={!guessInput.trim()} style={styles.flex1}>
                    {l('Угадать!', 'Guess!')}
                  </GlassButton>
                  <GlassButton onPress={() => { setShowGuessInput(false); setGuessInput(''); }} style={styles.flex1}>
                    {l('Отмена', 'Cancel')}
                  </GlassButton>
                </View>
              </View>
            ) : (
              <View style={[styles.row, { marginTop: 12 }]}>
                <GlassButton onPress={() => { handleQuestionAsked(); handleNextTurn(); }} style={styles.flex1}>
                  {l('Дальше', 'Next')}
                </GlassButton>
                <GlassButton variant="primary" onPress={() => setShowGuessInput(true)} style={styles.flex1}>
                  {l('Я знаю!', 'I Know!')}
                </GlassButton>
              </View>
            )}
          </GlassCard>
        )}

        {!isMyTurn && !haveIGuessed && gs.phase === 'playing' && (
          <GlassCard style={styles.card}>
            <Text style={styles.waitText}>
              {l('Ждите свой ход. Отвечайте на вопросы "Да" или "Нет".', 'Wait for your turn. Answer questions with "Yes" or "No".')}
            </Text>
          </GlassCard>
        )}

        {haveIGuessed && gs.phase === 'playing' && (
          <GlassCard style={styles.card}>
            <Text style={styles.bigEmoji}>🎉</Text>
            <Text style={styles.correctText}>{l('Вы уже угадали! Наблюдайте за игрой.', 'You already guessed! Watch the game.')}</Text>
            <Text style={styles.guessText}>
              {l('Ваш персонаж:', 'Your character:')} {gs.characters[user!.id]?.[locale]}
            </Text>
          </GlassCard>
        )}

        {isHost && (
          <GlassButton variant="danger" size="sm" onPress={handleEndGame}>
            {l('Завершить игру', 'End Game')}
          </GlassButton>
        )}
      </View>
    );
  };

  const renderFinished = () => {
    const sorted = Object.entries(gs.scores)
      .map(([id, score]) => ({ id, name: playerName(id), score }))
      .sort((a, b) => b.score - a.score);

    return (
      <View style={styles.center}>
        <GlassCard style={styles.card}>
          <Text style={styles.bigEmoji}>🏆</Text>
          <Text style={styles.finishedTitle}>{l('Игра окончена!', 'Game Over!')}</Text>

          {sorted.map((entry, i) => {
            const char = gs.characters[entry.id];
            const guessed = gs.guessedPlayers.includes(entry.id);
            return (
              <View key={entry.id} style={styles.finScoreRow}>
                <View style={styles.finScoreLeft}>
                  <Text style={styles.finRank}>
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`}
                  </Text>
                  <View>
                    <Text style={styles.finName}>{entry.name}</Text>
                    <Text style={styles.finChar}>
                      {char?.[locale]}{!guessed ? ` (${l('не угадал', 'not guessed')})` : ''}
                    </Text>
                  </View>
                </View>
                <GlassBadge variant="accent"><Text style={[styles.badgeText, { fontWeight: '700' }]}>{entry.score}</Text></GlassBadge>
              </View>
            );
          })}

          <View style={styles.divider} />
          <Text style={styles.allCharsTitle}>{l('Все персонажи', 'All Characters')}</Text>
          {gs.turnOrder.map((id) => (
            <View key={id} style={styles.allCharRow}>
              <Text style={styles.allCharName}>{playerName(id)}</Text>
              <Text style={styles.allCharValue}>{gs.characters[id]?.[locale]}</Text>
            </View>
          ))}

          {isHost && (
            <GlassButton variant="primary" size="lg" onPress={handleStart} style={[styles.fullBtn, { marginTop: 16 }]}>
              {l('Играть снова', 'Play Again')}
            </GlassButton>
          )}
        </GlassCard>
      </View>
    );
  };

  const phaseRenderers: Record<string, () => React.JSX.Element> = {
    lobby: renderLobby, playing: renderPlaying, finished: renderFinished,
  };

  return (
    <GameLayout
      title={l('Кто я?', 'Who Am I?')}
      icon="🤔"
      scores={gs.phase !== 'lobby' ? layoutScores : undefined}
      onEnd={isHost ? handleEndGame : undefined}
      showScoreboard={gs.phase === 'finished'}
    >
      {(phaseRenderers[gs.phase] ?? renderLobby)()}
    </GameLayout>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', gap: 12 },
  card: { padding: 24, alignItems: 'center', width: '100%', gap: 6 },
  cardTitle: { fontSize: 22, fontWeight: '700', color: Colors.white },
  cardDesc: { fontSize: 13, color: 'rgba(255,255,255,0.5)' },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center', marginVertical: 8 },
  badgeText: { color: Colors.textSecondary, fontSize: 12 },
  fullBtn: { width: '100%' },
  flex1: { flex: 1 },
  waitText: { fontSize: 13, color: 'rgba(255,255,255,0.4)', textAlign: 'center' },
  turnLabel: { fontSize: 12, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 2 },
  turnName: { fontSize: 22, fontWeight: '700', color: Colors.white },
  turnHint: { fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 4 },
  charCard: { padding: 16, width: '100%' },
  charTitle: { fontSize: 13, color: 'rgba(255,255,255,0.4)', fontWeight: '600', marginBottom: 8 },
  charRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 12, borderRadius: Radius.lg, backgroundColor: 'rgba(255,255,255,0.05)', marginBottom: 6,
  },
  charRowActive: { backgroundColor: 'rgba(168,85,247,0.15)', borderWidth: 1, borderColor: 'rgba(168,85,247,0.3)' },
  charRowGuessed: { opacity: 0.5 },
  charRowLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  charRowName: { fontSize: 14, fontWeight: '600', color: 'rgba(255,255,255,0.8)' },
  bigEmoji: { fontSize: 36 },
  correctText: { fontSize: 15, fontWeight: '700', color: '#4ade80' },
  wrongText: { fontSize: 15, fontWeight: '700', color: '#f87171' },
  guessText: { fontSize: 13, color: 'rgba(255,255,255,0.5)' },
  controlCard: { padding: 16, alignItems: 'center', width: '100%' },
  input: {
    backgroundColor: Colors.glassBg, borderWidth: 1, borderColor: Colors.glassBorder,
    borderRadius: Radius.md, padding: 12, color: Colors.white, fontSize: 15, width: '100%',
  },
  row: { flexDirection: 'row', gap: 12, width: '100%' },
  finishedTitle: { fontSize: 22, fontWeight: '700', color: Colors.white, marginBottom: 12 },
  finScoreRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 12, borderRadius: Radius.lg, backgroundColor: 'rgba(255,255,255,0.05)',
    width: '100%', marginBottom: 6,
  },
  finScoreLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  finRank: { fontSize: 16, fontWeight: '700', color: 'rgba(255,255,255,0.5)', width: 24, textAlign: 'center' },
  finName: { fontSize: 14, fontWeight: '600', color: Colors.white },
  finChar: { fontSize: 11, color: 'rgba(255,255,255,0.3)' },
  divider: { width: '100%', height: 1, backgroundColor: 'rgba(255,255,255,0.1)', marginVertical: 12 },
  allCharsTitle: { fontSize: 13, color: 'rgba(255,255,255,0.4)', marginBottom: 8 },
  allCharRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', paddingVertical: 4 },
  allCharName: { fontSize: 13, color: 'rgba(255,255,255,0.6)' },
  allCharValue: { fontSize: 13, color: 'rgba(255,255,255,0.4)' },
});
