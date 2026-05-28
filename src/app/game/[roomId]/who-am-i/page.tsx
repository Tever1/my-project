'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useSocket } from '@/lib/use-socket';
import { useNavigateOnGameEnd } from '@/lib/use-navigate-on-game-end';
import { useTranslation } from '@/lib/i18n';
import { useAuth } from '@/lib/auth-context';
import { GameLayout } from '@/components/games/GameLayout';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { GlassInput } from '@/components/ui/GlassInput';
import { WHO_AM_I_CHARACTERS } from '@/lib/game-data';
import { Player } from '@/types/room';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface WhoAmIGameState {
  phase: 'lobby' | 'playing' | 'finished';
  /** Mapping of playerId -> character assigned to them */
  characters: Record<string, { ru: string; en: string }>;
  /** Index into the alive (not-yet-guessed) player order */
  currentTurnIndex: number;
  /** Ordered list of player IDs for turn rotation */
  turnOrder: string[];
  /** Players who have successfully guessed their character */
  guessedPlayers: string[];
  /** How many questions each player has asked (for scoring) */
  questionsAsked: Record<string, number>;
  /** Scores awarded on correct guess */
  scores: Record<string, number>;
}

type GameAction =
  | { type: 'start-game'; characters: Record<string, { ru: string; en: string }>; turnOrder: string[] }
  | { type: 'sync-state'; state: WhoAmIGameState }
  | { type: 'next-turn' }
  | { type: 'ask-question' }
  | { type: 'guess'; playerId: string; guess: string; correct: boolean }
  | { type: 'end-game' };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function assignCharacters(
  playerIds: string[],
): Record<string, { ru: string; en: string }> {
  const shuffled = [...WHO_AM_I_CHARACTERS].sort(() => Math.random() - 0.5);
  const result: Record<string, { ru: string; en: string }> = {};
  playerIds.forEach((id, i) => {
    result[id] = shuffled[i % shuffled.length];
  });
  return result;
}

function calculateScore(questionsAsked: number): number {
  // Fewer questions = more points. Minimum 10 points for guessing at all.
  if (questionsAsked <= 1) return 100;
  if (questionsAsked <= 3) return 80;
  if (questionsAsked <= 5) return 60;
  if (questionsAsked <= 8) return 40;
  if (questionsAsked <= 12) return 20;
  return 10;
}

function getInitialState(): WhoAmIGameState {
  return {
    phase: 'lobby',
    characters: {},
    currentTurnIndex: 0,
    turnOrder: [],
    guessedPlayers: [],
    questionsAsked: {},
    scores: {},
  };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function WhoAmIPage() {
  const { roomId } = useParams<{ roomId: string }>();
  useNavigateOnGameEnd(roomId);
  const { emit, on } = useSocket();
  const { locale } = useTranslation();
  const { user } = useAuth();

  const [players, setPlayers] = useState<Player[]>([]);
  const [gs, setGs] = useState<WhoAmIGameState>(getInitialState);
  const [guessInput, setGuessInput] = useState('');
  const [showGuessInput, setShowGuessInput] = useState(false);
  const [lastGuessResult, setLastGuessResult] = useState<{
    playerId: string;
    correct: boolean;
    guess: string;
  } | null>(null);

  const isHost = players.find((p) => p.isHost)?.id === user?.id;

  const playerName = useCallback(
    (id: string) => players.find((p) => p.id === id)?.nickname ?? id,
    [players],
  );

  const l = useCallback(
    (ru: string, en: string) => (locale === 'ru' ? ru : en),
    [locale],
  );

  // Current player whose turn it is (only among non-guessed players)
  const activeTurnOrder = gs.turnOrder.filter(
    (id) => !gs.guessedPlayers.includes(id),
  );
  const currentPlayerId =
    activeTurnOrder.length > 0
      ? activeTurnOrder[gs.currentTurnIndex % activeTurnOrder.length]
      : null;
  const isMyTurn = currentPlayerId === user?.id;

  // -----------------------------------------------------------------------
  // Broadcast helper
  // -----------------------------------------------------------------------
  const broadcast = useCallback(
    (action: GameAction) => {
      emit('game:action', { code: roomId, action: 'who-am-i', payload: action });
    },
    [emit, roomId],
  );

  // -----------------------------------------------------------------------
  // Listen for room state
  // -----------------------------------------------------------------------
  useEffect(() => {
    const cleanup = on('room:state', (data: unknown) => {
      const room = data as { players?: Player[] };
      if (room.players) setPlayers(room.players);
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
      if (action !== 'who-am-i') return;

      switch (payload.type) {
        case 'start-game':
          setGs({
            phase: 'playing',
            characters: payload.characters,
            currentTurnIndex: 0,
            turnOrder: payload.turnOrder,
            guessedPlayers: [],
            questionsAsked: Object.fromEntries(
              payload.turnOrder.map((id) => [id, 0]),
            ),
            scores: Object.fromEntries(
              payload.turnOrder.map((id) => [id, 0]),
            ),
          });
          setLastGuessResult(null);
          break;

        case 'sync-state':
          setGs(payload.state);
          break;

        case 'next-turn':
          setGs((prev) => ({
            ...prev,
            currentTurnIndex: prev.currentTurnIndex + 1,
          }));
          setShowGuessInput(false);
          setGuessInput('');
          setLastGuessResult(null);
          break;

        case 'ask-question':
          setGs((prev) => {
            const cid = currentPlayerId;
            if (!cid) return prev;
            return {
              ...prev,
              questionsAsked: {
                ...prev.questionsAsked,
                [cid]: (prev.questionsAsked[cid] || 0) + 1,
              },
            };
          });
          break;

        case 'guess':
          if (payload.correct) {
            setGs((prev) => {
              const score = calculateScore(
                prev.questionsAsked[payload.playerId] || 0,
              );
              const newGuessed = [...prev.guessedPlayers, payload.playerId];
              const allGuessed =
                newGuessed.length >= prev.turnOrder.length;
              return {
                ...prev,
                guessedPlayers: newGuessed,
                scores: {
                  ...prev.scores,
                  [payload.playerId]:
                    (prev.scores[payload.playerId] || 0) + score,
                },
                phase: allGuessed ? 'finished' : prev.phase,
                currentTurnIndex: prev.currentTurnIndex + 1,
              };
            });
          }
          setLastGuessResult({
            playerId: payload.playerId,
            correct: payload.correct,
            guess: payload.guess,
          });
          setShowGuessInput(false);
          setGuessInput('');
          break;

        case 'end-game':
          setGs((prev) => ({ ...prev, phase: 'finished' }));
          break;
      }
    });
    return cleanup;
  }, [on, currentPlayerId]);

  // -----------------------------------------------------------------------
  // Host: start game
  // -----------------------------------------------------------------------
  const handleStart = () => {
    const playerIds = players.map((p) => p.id);
    const characters = assignCharacters(playerIds);
    const turnOrder = [...playerIds].sort(() => Math.random() - 0.5);
    broadcast({ type: 'start-game', characters, turnOrder });
  };

  // -----------------------------------------------------------------------
  // Current player: pass turn
  // -----------------------------------------------------------------------
  const handleNextTurn = () => {
    broadcast({ type: 'next-turn' });
  };

  // -----------------------------------------------------------------------
  // Current player: mark that a question was asked (for scoring)
  // -----------------------------------------------------------------------
  const handleQuestionAsked = () => {
    broadcast({ type: 'ask-question' });
  };

  // -----------------------------------------------------------------------
  // Current player: submit guess
  // -----------------------------------------------------------------------
  const handleGuess = () => {
    if (!user || !guessInput.trim()) return;
    const myChar = gs.characters[user.id];
    if (!myChar) return;

    const normalise = (s: string) => s.trim().toLowerCase();
    const correct =
      normalise(guessInput) === normalise(myChar.ru) ||
      normalise(guessInput) === normalise(myChar.en);

    broadcast({
      type: 'guess',
      playerId: user.id,
      guess: guessInput.trim(),
      correct,
    });
  };

  const handleEndGame = () => {
    broadcast({ type: 'end-game' });
    // Tell the server the game is over so TV and all clients leave the game screen
    emit('game:end', { code: roomId });
  };

  // -----------------------------------------------------------------------
  // Scores for GameLayout
  // -----------------------------------------------------------------------
  const layoutScores = Object.entries(gs.scores).map(([id, score]) => ({
    name: playerName(id),
    score,
  }));

  // -----------------------------------------------------------------------
  // RENDER: Lobby
  // -----------------------------------------------------------------------
  const renderLobby = () => (
    <div className="flex-1 flex flex-col items-center justify-center gap-6">
      <GlassCard className="w-full max-w-md text-center">
        <h2 className="text-2xl font-bold text-white mb-2">
          {l('Кто я?', 'Who Am I?')}
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
            disabled={players.length < 2}
            className="w-full"
          >
            {l('Начать игру', 'Start Game')}
          </GlassButton>
        ) : (
          <p className="text-white/40 text-sm">
            {l('Ожидание ведущего...', 'Waiting for host...')}
          </p>
        )}
      </GlassCard>
    </div>
  );

  // -----------------------------------------------------------------------
  // RENDER: Player list with characters (the core mechanic)
  // Each player sees everyone ELSE's character, but their own shows as "???"
  // -----------------------------------------------------------------------
  const renderPlayerCharacters = () => (
    <GlassCard className="w-full max-w-md">
      <h3 className="text-sm font-medium text-white/50 mb-3">
        {l('Персонажи игроков', 'Player Characters')}
      </h3>
      <div className="space-y-2">
        {gs.turnOrder.map((id) => {
          const char = gs.characters[id];
          const isMe = id === user?.id;
          const isGuessed = gs.guessedPlayers.includes(id);
          const isCurrent = id === currentPlayerId;

          return (
            <div
              key={id}
              className={`flex items-center justify-between p-3 rounded-xl transition-all ${
                isCurrent
                  ? 'bg-purple-500/15 border border-purple-500/30'
                  : 'bg-white/5'
              } ${isGuessed ? 'opacity-50' : ''}`}
            >
              <div className="flex items-center gap-2">
                {isCurrent && (
                  <span className="text-sm">👉</span>
                )}
                <span
                  className={`font-medium ${
                    isMe ? 'text-purple-300' : 'text-white/80'
                  }`}
                >
                  {playerName(id)}
                  {isMe ? ` (${l('Вы', 'You')})` : ''}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {isGuessed ? (
                  <span className="glass-badge glass-badge--accent text-xs">
                    ✅ {char?.[locale]}
                  </span>
                ) : isMe ? (
                  <span className="glass-badge text-lg font-bold">???</span>
                ) : (
                  <span className="glass-badge glass-badge--accent">
                    {char?.[locale]}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </GlassCard>
  );

  // -----------------------------------------------------------------------
  // RENDER: Playing phase
  // -----------------------------------------------------------------------
  const renderPlaying = () => {
    const myQuestions = user ? gs.questionsAsked[user.id] || 0 : 0;
    const haveIGuessed = user ? gs.guessedPlayers.includes(user.id) : false;

    return (
      <div className="flex-1 flex flex-col items-center gap-4">
        {/* Current turn indicator */}
        <GlassCard className="w-full max-w-md text-center">
          <p className="text-white/50 text-sm mb-1">
            {l('Сейчас ходит', 'Current turn')}
          </p>
          <p className="text-2xl font-bold text-white">
            {currentPlayerId
              ? currentPlayerId === user?.id
                ? l('Ваш ход!', 'Your turn!')
                : playerName(currentPlayerId)
              : l('Игра завершена', 'Game over')}
          </p>
          {isMyTurn && !haveIGuessed && (
            <p className="text-white/40 text-xs mt-1">
              {l(
                'Задайте вопрос вслух с ответом "Да" или "Нет"',
                'Ask a Yes/No question out loud',
              )}
            </p>
          )}
        </GlassCard>

        {/* Player characters grid */}
        {renderPlayerCharacters()}

        {/* Last guess result notification */}
        {lastGuessResult && (
          <GlassCard
            className={`w-full max-w-md text-center animate-scale-in ${
              lastGuessResult.correct
                ? 'border-green-500/30'
                : 'border-red-500/30'
            }`}
          >
            {lastGuessResult.correct ? (
              <>
                <p className="text-3xl mb-1">🎉</p>
                <p className="text-green-400 font-bold">
                  {playerName(lastGuessResult.playerId)}{' '}
                  {l('угадал!', 'guessed correctly!')}
                </p>
                <p className="text-white/60 text-sm">
                  &quot;{lastGuessResult.guess}&quot;
                </p>
              </>
            ) : (
              <>
                <p className="text-3xl mb-1">❌</p>
                <p className="text-red-400 font-bold">
                  {l('Неправильно!', 'Wrong!')}
                </p>
                <p className="text-white/60 text-sm">
                  &quot;{lastGuessResult.guess}&quot;
                </p>
              </>
            )}
          </GlassCard>
        )}

        {/* Controls for current player */}
        {isMyTurn && !haveIGuessed && (
          <GlassCard className="w-full max-w-md">
            <div className="text-center mb-3">
              <span className="glass-badge">
                {l(`Вопросов задано: ${myQuestions}`, `Questions asked: ${myQuestions}`)}
              </span>
            </div>

            {showGuessInput ? (
              <div className="space-y-3">
                <GlassInput
                  value={guessInput}
                  onChange={(e) => setGuessInput(e.target.value)}
                  placeholder={l('Введите ваш ответ...', 'Enter your guess...')}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleGuess();
                  }}
                  autoFocus
                />
                <div className="flex gap-2">
                  <GlassButton
                    variant="primary"
                    className="flex-1"
                    onClick={handleGuess}
                    disabled={!guessInput.trim()}
                  >
                    {l('Угадать!', 'Guess!')}
                  </GlassButton>
                  <GlassButton
                    variant="default"
                    onClick={() => {
                      setShowGuessInput(false);
                      setGuessInput('');
                    }}
                  >
                    {l('Отмена', 'Cancel')}
                  </GlassButton>
                </div>
              </div>
            ) : (
              <div className="flex gap-2">
                <GlassButton
                  variant="default"
                  className="flex-1"
                  onClick={() => {
                    handleQuestionAsked();
                    handleNextTurn();
                  }}
                >
                  {l('Дальше', 'Next')}
                </GlassButton>
                <GlassButton
                  variant="primary"
                  className="flex-1"
                  onClick={() => setShowGuessInput(true)}
                >
                  {l('Я знаю!', 'I Know!')}
                </GlassButton>
              </div>
            )}
          </GlassCard>
        )}

        {/* Waiting message for non-current players */}
        {!isMyTurn && !haveIGuessed && gs.phase === 'playing' && (
          <GlassCard className="w-full max-w-md text-center">
            <p className="text-white/40 text-sm">
              {l(
                'Ждите свой ход. Отвечайте на вопросы "Да" или "Нет".',
                'Wait for your turn. Answer questions with "Yes" or "No".',
              )}
            </p>
          </GlassCard>
        )}

        {/* Already guessed message */}
        {haveIGuessed && gs.phase === 'playing' && (
          <GlassCard className="w-full max-w-md text-center">
            <p className="text-2xl mb-2">🎉</p>
            <p className="text-green-400 font-medium">
              {l('Вы уже угадали! Наблюдайте за игрой.', 'You already guessed! Watch the game.')}
            </p>
            <p className="text-white/60 text-sm mt-1">
              {l('Ваш персонаж:', 'Your character:')}{' '}
              <span className="font-bold text-white">
                {gs.characters[user!.id]?.[locale]}
              </span>
            </p>
          </GlassCard>
        )}

        {/* Host controls */}
        {isHost && (
          <GlassButton variant="danger" size="sm" onClick={handleEndGame}>
            {l('Завершить игру', 'End Game')}
          </GlassButton>
        )}
      </div>
    );
  };

  // -----------------------------------------------------------------------
  // RENDER: Finished
  // -----------------------------------------------------------------------
  const renderFinished = () => {
    const sorted = Object.entries(gs.scores)
      .map(([id, score]) => ({ id, name: playerName(id), score }))
      .sort((a, b) => b.score - a.score);

    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-6">
        <GlassCard className="w-full max-w-md text-center animate-scale-in">
          <p className="text-5xl mb-3">🏆</p>
          <h2 className="text-2xl font-bold text-white mb-4">
            {l('Игра окончена!', 'Game Over!')}
          </h2>

          {/* Scoreboard */}
          <div className="space-y-2 mb-6">
            {sorted.map((entry, i) => {
              const char = gs.characters[entry.id];
              const guessed = gs.guessedPlayers.includes(entry.id);
              return (
                <div
                  key={entry.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-white/5"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold text-white/60 w-6 text-center">
                      {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`}
                    </span>
                    <div className="text-left">
                      <p className="font-medium text-white text-sm">
                        {entry.name}
                      </p>
                      <p className="text-white/40 text-xs">
                        {char?.[locale]}
                        {!guessed && ` (${l('не угадал', 'not guessed')})`}
                      </p>
                    </div>
                  </div>
                  <span className="glass-badge glass-badge--accent font-bold">
                    {entry.score}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Reveal all characters */}
          <div className="border-t border-white/10 pt-4">
            <h3 className="text-white/50 text-sm mb-3">
              {l('Все персонажи', 'All Characters')}
            </h3>
            <div className="space-y-1">
              {gs.turnOrder.map((id) => (
                <div
                  key={id}
                  className="flex items-center justify-between text-sm py-1"
                >
                  <span className="text-white/70">{playerName(id)}</span>
                  <span className="text-white/50">
                    {gs.characters[id]?.[locale]}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {isHost && (
            <GlassButton
              variant="primary"
              size="lg"
              className="w-full mt-6"
              onClick={handleStart}
            >
              {l('Играть снова', 'Play Again')}
            </GlassButton>
          )}
        </GlassCard>
      </div>
    );
  };

  // -----------------------------------------------------------------------
  // Main render
  // -----------------------------------------------------------------------
  const phaseRenderers: Record<string, () => React.JSX.Element> = {
    lobby: renderLobby,
    playing: renderPlaying,
    finished: renderFinished,
  };

  return (
    <GameLayout
      title={l('Кто я?', 'Who Am I?')}
      icon="🤔"
      scores={gs.phase !== 'lobby' ? layoutScores : undefined}
      onEnd={isHost ? handleEndGame : undefined}
      showScoreboard={gs.phase === 'finished'}
      phaseKey={gs.phase}
    >
      {(phaseRenderers[gs.phase] ?? renderLobby)()}
    </GameLayout>
  );
}
