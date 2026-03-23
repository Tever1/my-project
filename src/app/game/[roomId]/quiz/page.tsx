'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslation } from '@/lib/i18n';
import { useAuth } from '@/lib/auth-context';
import { useSocket } from '@/lib/use-socket';
import { GameLayout } from '@/components/games/GameLayout';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { QUIZ_QUESTIONS } from '@/lib/game-data';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Phase = 'waiting' | 'countdown' | 'question' | 'results' | 'final';

interface QuizGameState {
  phase: Phase;
  questionIndex: number;
  timeLeft: number;
  answers: Record<string, number>; // playerId -> answerIndex
  scores: Record<string, number>;  // playerId -> total score
  showCorrect: boolean;
  players: { id: string; nickname: string; isHost: boolean }[];
  countdownValue: number; // 3-2-1 pre-question countdown
  correctPlayers: string[]; // ids of players who answered correctly this round
}

const TOTAL_QUESTIONS = QUIZ_QUESTIONS.length; // 10
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

// Answer option colors for visual variety
const OPTION_COLORS = [
  'from-blue-600/20 to-blue-500/5 border-blue-500/20',
  'from-emerald-600/20 to-emerald-500/5 border-emerald-500/20',
  'from-amber-600/20 to-amber-500/5 border-amber-500/20',
  'from-pink-600/20 to-pink-500/5 border-pink-500/20',
];

const OPTION_LABELS = ['A', 'B', 'C', 'D'];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function QuizPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const { t, locale } = useTranslation();
  const { user } = useAuth();
  const { emit, on } = useSocket();
  const router = useRouter();

  const [gameState, setGameState] = useState<QuizGameState>(INITIAL_STATE);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isHost = gameState.players.find((p) => p.id === user?.id)?.isHost ?? false;
  const currentQuestion = QUIZ_QUESTIONS[gameState.questionIndex];
  const myAnswer = user ? gameState.answers[user.id] : undefined;
  const totalPlayers = gameState.players.length;
  const answeredCount = Object.keys(gameState.answers).length;
  const allAnswered = totalPlayers > 0 && answeredCount >= totalPlayers;

  // ------- Socket listeners -------

  useEffect(() => {
    const unsub1 = on('room:state', (data: unknown) => {
      const room = data as { players: { id: string; nickname: string; isHost: boolean }[] };
      setGameState((prev) => ({ ...prev, players: room.players }));
    });

    const unsub2 = on('game:action', (data: unknown) => {
      const { action, payload } = data as {
        action: string;
        payload: Record<string, unknown>;
        from?: string;
      };

      switch (action) {
        case 'quiz:sync':
          // Full state sync from host
          setGameState((prev) => ({ ...prev, ...(payload as Partial<QuizGameState>) }));
          break;

        case 'quiz:answer': {
          const { playerId, answerIndex } = payload as {
            playerId: string;
            answerIndex: number;
          };
          setGameState((prev) => ({
            ...prev,
            answers: { ...prev.answers, [playerId]: answerIndex },
          }));
          break;
        }

        case 'quiz:timer':
          setGameState((prev) => ({ ...prev, timeLeft: payload.timeLeft as number }));
          break;

        case 'quiz:show-results': {
          const { scores, correctPlayers } = payload as {
            scores: Record<string, number>;
            correctPlayers: string[];
          };
          setGameState((prev) => ({
            ...prev,
            showCorrect: true,
            scores,
            correctPlayers,
          }));
          break;
        }

        case 'quiz:countdown':
          setGameState((prev) => ({
            ...prev,
            phase: 'countdown',
            countdownValue: payload.value as number,
          }));
          break;

        case 'quiz:start-question': {
          const p = payload as {
            questionIndex: number;
            timeLeft: number;
          };
          setGameState((prev) => ({
            ...prev,
            phase: 'question',
            questionIndex: p.questionIndex,
            timeLeft: p.timeLeft,
            answers: {},
            showCorrect: false,
            correctPlayers: [],
          }));
          break;
        }

        case 'quiz:final':
          setGameState((prev) => ({ ...prev, phase: 'final' }));
          break;
      }
    });

    const unsub3 = on('game:ended', () => {
      router.push(`/lobby/${roomId}`);
    });

    // Request current room state so we get the players list (including isHost)
    emit('room:get-state', { code: roomId });

    return () => {
      unsub1();
      unsub2();
      unsub3();
    };
  }, [on, emit, router, roomId]);

  // ------- Host timer logic -------

  useEffect(() => {
    if (!isHost) return;
    if (gameState.phase !== 'question' || gameState.showCorrect) return;

    // Clear any existing timer
    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      setGameState((prev) => {
        const next = prev.timeLeft - 1;
        if (next <= 0) {
          // Time is up - trigger results
          if (timerRef.current) clearInterval(timerRef.current);
          // We handle results in a separate effect to avoid state issues
          return { ...prev, timeLeft: 0 };
        }
        // Broadcast timer tick
        emit('game:action', {
          code: roomId,
          action: 'quiz:timer',
          payload: { timeLeft: next },
        });
        return { ...prev, timeLeft: next };
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isHost, gameState.phase, gameState.showCorrect, gameState.questionIndex, emit, roomId]);

  // ------- Auto-reveal when time runs out or all answered -------

  useEffect(() => {
    if (!isHost || gameState.phase !== 'question' || gameState.showCorrect) return;

    if (gameState.timeLeft <= 0 || allAnswered) {
      revealResults();
    }
  }, [gameState.timeLeft, allAnswered, isHost, gameState.phase, gameState.showCorrect]);

  // ------- Actions -------

  const revealResults = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);

    const question = QUIZ_QUESTIONS[gameState.questionIndex];
    const newScores = { ...gameState.scores };
    const correct: string[] = [];

    for (const [playerId, answerIdx] of Object.entries(gameState.answers)) {
      if (answerIdx === question.correctIndex) {
        // Score: base 100 + time bonus (timeLeft * 10)
        const timeBonus = Math.max(gameState.timeLeft, 0) * 10;
        newScores[playerId] = (newScores[playerId] || 0) + 100 + timeBonus;
        correct.push(playerId);
      }
    }

    setGameState((prev) => ({
      ...prev,
      showCorrect: true,
      scores: newScores,
      correctPlayers: correct,
    }));

    emit('game:action', {
      code: roomId,
      action: 'quiz:show-results',
      payload: { scores: newScores, correctPlayers: correct },
    });

    // Also persist to server
    emit('game:state-update', {
      code: roomId,
      gameState: { scores: newScores },
    });
  }, [gameState.questionIndex, gameState.answers, gameState.scores, gameState.timeLeft, emit, roomId]);

  const runCountdown = useCallback(
    (questionIdx: number) => {
      let count = 3;
      setGameState((prev) => ({
        ...prev,
        phase: 'countdown',
        countdownValue: count,
      }));
      emit('game:action', {
        code: roomId,
        action: 'quiz:countdown',
        payload: { value: count },
      });

      const interval = setInterval(() => {
        count -= 1;
        if (count <= 0) {
          clearInterval(interval);
          // Start the question
          const startPayload = {
            questionIndex: questionIdx,
            timeLeft: TIME_PER_QUESTION,
          };
          setGameState((prev) => ({
            ...prev,
            phase: 'question',
            ...startPayload,
            answers: {},
            showCorrect: false,
            correctPlayers: [],
          }));
          emit('game:action', {
            code: roomId,
            action: 'quiz:start-question',
            payload: startPayload,
          });
        } else {
          setGameState((prev) => ({ ...prev, countdownValue: count }));
          emit('game:action', {
            code: roomId,
            action: 'quiz:countdown',
            payload: { value: count },
          });
        }
      }, 1000);
    },
    [emit, roomId],
  );

  const startGame = () => {
    const initialScores: Record<string, number> = {};
    gameState.players.forEach((p) => {
      initialScores[p.id] = 0;
    });

    setGameState((prev) => ({ ...prev, scores: initialScores }));

    // Sync initial scores then start countdown
    emit('game:action', {
      code: roomId,
      action: 'quiz:sync',
      payload: { scores: initialScores },
    });

    runCountdown(0);
  };

  const startNextQuestion = () => {
    const nextIndex = gameState.questionIndex + 1;
    if (nextIndex >= TOTAL_QUESTIONS) {
      setGameState((prev) => ({ ...prev, phase: 'final' }));
      emit('game:action', {
        code: roomId,
        action: 'quiz:final',
        payload: {},
      });
      return;
    }
    runCountdown(nextIndex);
  };

  const submitAnswer = (answerIndex: number) => {
    if (myAnswer !== undefined || gameState.showCorrect || !user) return;

    emit('game:action', {
      code: roomId,
      action: 'quiz:answer',
      payload: { playerId: user.id, answerIndex },
    });
    setGameState((prev) => ({
      ...prev,
      answers: { ...prev.answers, [user.id]: answerIndex },
    }));
  };

  const endGame = () => {
    emit('game:end', { code: roomId });
  };

  // ------- Derived data -------

  const scoreboard = gameState.players
    .map((p) => ({ name: p.nickname, score: gameState.scores[p.id] || 0 }))
    .sort((a, b) => b.score - a.score);

  const getPlayerName = (id: string) =>
    gameState.players.find((p) => p.id === id)?.nickname || id;

  // ------- Render -------

  return (
    <GameLayout
      title={locale === 'ru' ? 'Квиз' : 'Quiz'}
      icon="🧠"
      round={gameState.phase === 'question' || gameState.phase === 'countdown'
        ? gameState.questionIndex + 1
        : gameState.phase === 'final'
          ? TOTAL_QUESTIONS
          : undefined}
      totalRounds={gameState.phase !== 'waiting' ? TOTAL_QUESTIONS : undefined}
      scores={scoreboard}
      onEnd={isHost ? endGame : undefined}
      showScoreboard={gameState.phase !== 'waiting' && gameState.phase !== 'countdown'}
    >
      {/* ==================== WAITING ==================== */}
      {gameState.phase === 'waiting' && (
        <div className="text-center py-12 animate-fade-in">
          <div className="text-7xl mb-6">🧠</div>
          <h2 className="text-3xl font-bold text-white mb-3">
            {locale === 'ru' ? 'Квиз' : 'Quiz'}
          </h2>
          <p className="text-white/50 mb-2 max-w-md mx-auto">
            {locale === 'ru'
              ? `${TOTAL_QUESTIONS} вопросов с вариантами ответа. Чем быстрее ответите правильно, тем больше очков!`
              : `${TOTAL_QUESTIONS} multiple-choice questions. The faster you answer correctly, the more points you earn!`}
          </p>
          <p className="text-white/30 text-sm mb-8">
            {locale === 'ru'
              ? `Игроков: ${gameState.players.length}`
              : `Players: ${gameState.players.length}`}
          </p>
          {isHost ? (
            <GlassButton variant="primary" size="lg" onClick={startGame}>
              {locale === 'ru' ? 'Начать игру' : 'Start Game'}
            </GlassButton>
          ) : (
            <p className="text-white/40 italic">
              {locale === 'ru' ? 'Ожидание ведущего...' : 'Waiting for the host...'}
            </p>
          )}
        </div>
      )}

      {/* ==================== COUNTDOWN ==================== */}
      {gameState.phase === 'countdown' && (
        <div className="flex items-center justify-center py-24 animate-fade-in">
          <div className="text-center">
            <p className="text-white/50 text-lg mb-4">
              {locale === 'ru' ? 'Вопрос' : 'Question'} {gameState.questionIndex + 1}
            </p>
            <div
              key={gameState.countdownValue}
              className="text-8xl font-black text-white animate-bounce"
            >
              {gameState.countdownValue}
            </div>
          </div>
        </div>
      )}

      {/* ==================== QUESTION ==================== */}
      {gameState.phase === 'question' && currentQuestion && (
        <div className="max-w-2xl mx-auto">
          {/* Timer bar */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-white/40">
                {locale === 'ru' ? 'Вопрос' : 'Question'} {gameState.questionIndex + 1}/{TOTAL_QUESTIONS}
              </span>
              <span
                className={`text-sm font-bold ${
                  gameState.timeLeft <= 5 ? 'text-red-400' : 'text-white/70'
                }`}
              >
                {gameState.timeLeft}s
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-1000 ease-linear ${
                  gameState.timeLeft <= 5 ? 'bg-red-500' : 'bg-purple-500'
                }`}
                style={{
                  width: `${(gameState.timeLeft / TIME_PER_QUESTION) * 100}%`,
                }}
              />
            </div>
          </div>

          {/* Question card */}
          <GlassCard className="p-6 mb-6">
            <h3 className="text-xl md:text-2xl font-semibold text-white leading-snug">
              {locale === 'ru' ? currentQuestion.questionRu : currentQuestion.questionEn}
            </h3>
          </GlassCard>

          {/* Answer options */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {currentQuestion.options.map((option, index) => {
              const isMyAnswer = myAnswer === index;
              const isCorrectAnswer = index === currentQuestion.correctIndex;
              const isCorrectRevealed = gameState.showCorrect && isCorrectAnswer;
              const isWrongRevealed = gameState.showCorrect && isMyAnswer && !isCorrectAnswer;
              const isDisabled = myAnswer !== undefined || gameState.showCorrect;

              return (
                <button
                  key={index}
                  onClick={() => submitAnswer(index)}
                  disabled={isDisabled}
                  className={`
                    relative overflow-hidden rounded-2xl border p-4 text-left
                    transition-all duration-300
                    ${
                      isCorrectRevealed
                        ? 'border-green-400 bg-green-500/20 ring-2 ring-green-400/50'
                        : isWrongRevealed
                          ? 'border-red-400 bg-red-500/20 ring-2 ring-red-400/50'
                          : isMyAnswer
                            ? 'border-purple-400 bg-purple-500/15 ring-2 ring-purple-400/50'
                            : isDisabled
                              ? 'border-white/5 bg-white/5 opacity-50'
                              : `bg-gradient-to-br ${OPTION_COLORS[index]} hover:scale-[1.02] active:scale-[0.98] cursor-pointer`
                    }
                  `}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`
                        flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold
                        ${
                          isCorrectRevealed
                            ? 'bg-green-500/30 text-green-300'
                            : isWrongRevealed
                              ? 'bg-red-500/30 text-red-300'
                              : 'bg-white/10 text-white/60'
                        }
                      `}
                    >
                      {isCorrectRevealed ? '✓' : isWrongRevealed ? '✕' : OPTION_LABELS[index]}
                    </span>
                    <span className="text-white font-medium">
                      {locale === 'ru' ? option.ru : option.en}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Status bar */}
          <div className="mt-4 flex items-center justify-between text-sm">
            <p className="text-white/30">
              {myAnswer !== undefined
                ? locale === 'ru'
                  ? 'Ответ принят!'
                  : 'Answer submitted!'
                : gameState.showCorrect
                  ? ''
                  : locale === 'ru'
                    ? 'Выберите ответ'
                    : 'Choose an answer'}
            </p>
            <p className="text-white/30">
              {answeredCount}/{totalPlayers}
            </p>
          </div>

          {/* Post-question results */}
          {gameState.showCorrect && (
            <div className="mt-6 animate-fade-in">
              <GlassCard className="p-4">
                {gameState.correctPlayers.length > 0 ? (
                  <>
                    <p className="text-green-400 font-medium mb-2">
                      {locale === 'ru' ? 'Правильно ответили:' : 'Answered correctly:'}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {gameState.correctPlayers.map((id) => (
                        <span key={id} className="glass-badge text-xs">
                          {getPlayerName(id)}
                        </span>
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="text-red-400 font-medium">
                    {locale === 'ru' ? 'Никто не ответил правильно!' : 'Nobody answered correctly!'}
                  </p>
                )}
              </GlassCard>

              {isHost && (
                <div className="text-center mt-4">
                  <GlassButton variant="primary" size="lg" onClick={startNextQuestion}>
                    {gameState.questionIndex + 1 < TOTAL_QUESTIONS
                      ? locale === 'ru'
                        ? 'Следующий вопрос'
                        : 'Next Question'
                      : locale === 'ru'
                        ? 'Показать результаты'
                        : 'Show Results'}
                  </GlassButton>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ==================== FINAL LEADERBOARD ==================== */}
      {gameState.phase === 'final' && (
        <div className="max-w-lg mx-auto text-center animate-fade-in py-6">
          <div className="text-6xl mb-4">🏆</div>
          <h2 className="text-3xl font-bold text-white mb-8">
            {locale === 'ru' ? 'Итоги' : 'Final Results'}
          </h2>

          <div className="space-y-3">
            {scoreboard.map((entry, i) => (
              <GlassCard
                key={entry.name}
                className={`p-4 flex items-center justify-between transition-all ${
                  i === 0
                    ? 'ring-2 ring-yellow-400/60 bg-yellow-500/10'
                    : i === 1
                      ? 'ring-1 ring-gray-300/30 bg-gray-300/5'
                      : i === 2
                        ? 'ring-1 ring-amber-600/30 bg-amber-700/5'
                        : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl w-8 text-center">
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`}
                  </span>
                  <span className="text-white font-semibold text-lg">{entry.name}</span>
                </div>
                <span className="text-purple-400 font-bold text-xl">{entry.score}</span>
              </GlassCard>
            ))}
          </div>

          {isHost && (
            <div className="mt-10 flex gap-3 justify-center">
              <GlassButton onClick={endGame}>
                {locale === 'ru' ? 'В лобби' : 'Back to Lobby'}
              </GlassButton>
              <GlassButton variant="primary" onClick={startGame}>
                {locale === 'ru' ? 'Играть снова' : 'Play Again'}
              </GlassButton>
            </div>
          )}
        </div>
      )}
    </GameLayout>
  );
}
