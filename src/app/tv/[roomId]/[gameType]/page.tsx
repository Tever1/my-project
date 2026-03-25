'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSocket } from '@/lib/use-socket';
import { useTranslation } from '@/lib/i18n';
import { GAMES } from '@/lib/games-config';
import { QUIZ_TOPICS, QUIZ_DIFFICULTIES } from '@/lib/quiz';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PlayerInfo {
  id: string;
  nickname: string;
  isHost: boolean;
  isConnected: boolean;
}

interface QuizQuestionData {
  questionRu: string;
  questionEn: string;
  options: { ru: string; en: string }[];
  correctIndex: number;
}

interface QuizConfig {
  difficulty: string | null;
  mode: string | null;
  topic: string | null;
}

interface QuizState {
  phase: string;
  config: QuizConfig;
  questionIndex: number;
  totalQuestions: number;
  timeLeft: number;
  answers: Record<string, number>;
  scores: Record<string, number>;
  showCorrect: boolean;
  countdownValue: number;
  correctPlayers: string[];
  currentQuestion: QuizQuestionData | null;
}

interface GenericGameState {
  [key: string]: unknown;
}

const OPTION_COLORS_TV = [
  'from-blue-600/30 to-blue-500/10 border-blue-400/40',
  'from-emerald-600/30 to-emerald-500/10 border-emerald-400/40',
  'from-amber-600/30 to-amber-500/10 border-amber-400/40',
  'from-pink-600/30 to-pink-500/10 border-pink-400/40',
];

const OPTION_LABELS = ['A', 'B', 'C', 'D'];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function TVGamePage() {
  const { roomId, gameType } = useParams<{ roomId: string; gameType: string }>();
  const { emit, on, isConnected } = useSocket();
  const { locale } = useTranslation();
  const router = useRouter();

  const [players, setPlayers] = useState<PlayerInfo[]>([]);
  const [quizState, setQuizState] = useState<QuizState>({
    phase: 'setup-difficulty',
    config: { difficulty: null, mode: null, topic: null },
    questionIndex: 0,
    totalQuestions: 10,
    timeLeft: 15,
    answers: {},
    scores: {},
    showCorrect: false,
    countdownValue: 3,
    correctPlayers: [],
    currentQuestion: null,
  });
  const [genericState, setGenericState] = useState<GenericGameState>({});

  const gameInfo = GAMES.find((g) => g.id === gameType);
  const gameTitle = gameInfo
    ? locale === 'ru' ? gameInfo.titleRu : gameInfo.titleEn
    : gameType;
  const gameIcon = gameInfo?.icon || '🎮';

  // Join TV room
  useEffect(() => {
    if (!isConnected) return;
    emit('tv:join', { code: roomId }, () => {});
  }, [isConnected, roomId, emit]);

  // Socket listeners
  useEffect(() => {
    const unsub1 = on('room:state', (data: unknown) => {
      const room = data as { players: PlayerInfo[]; status: string };
      setPlayers(room.players);
    });

    const unsub2 = on('game:action', (data: unknown) => {
      const { action, payload } = data as {
        action: string;
        payload: Record<string, unknown>;
      };

      if (gameType === 'quiz') {
        switch (action) {
          case 'quiz:sync':
            setQuizState((prev) => ({ ...prev, ...(payload as Partial<QuizState>) }));
            break;
          case 'quiz:config':
            setQuizState((prev) => ({
              ...prev,
              config: payload.config as QuizConfig,
              phase: payload.phase as string,
              totalQuestions: (payload.totalQuestions as number) || prev.totalQuestions,
            }));
            break;
          case 'quiz:answer': {
            const { playerId, answerIndex } = payload as { playerId: string; answerIndex: number };
            setQuizState((prev) => ({
              ...prev,
              answers: { ...prev.answers, [playerId]: answerIndex },
            }));
            break;
          }
          case 'quiz:timer':
            setQuizState((prev) => ({ ...prev, timeLeft: payload.timeLeft as number }));
            break;
          case 'quiz:show-results': {
            const { scores, correctPlayers } = payload as {
              scores: Record<string, number>;
              correctPlayers: string[];
            };
            setQuizState((prev) => ({ ...prev, showCorrect: true, scores, correctPlayers }));
            break;
          }
          case 'quiz:countdown':
            setQuizState((prev) => ({ ...prev, phase: 'countdown', countdownValue: payload.value as number }));
            break;
          case 'quiz:start-question': {
            const p = payload as {
              questionIndex: number;
              timeLeft: number;
              question: QuizQuestionData;
            };
            setQuizState((prev) => ({
              ...prev,
              phase: 'question',
              questionIndex: p.questionIndex,
              timeLeft: p.timeLeft,
              currentQuestion: p.question,
              answers: {},
              showCorrect: false,
              correctPlayers: [],
            }));
            break;
          }
          case 'quiz:final':
            setQuizState((prev) => ({ ...prev, phase: 'final' }));
            break;
        }
      }

      setGenericState((prev) => ({ ...prev, lastAction: action, ...payload }));
    });

    const unsub3 = on('game:ended', () => {
      router.push(`/tv/${roomId}`);
    });

    emit('room:get-state', { code: roomId });

    return () => {
      unsub1();
      unsub2();
      unsub3();
    };
  }, [on, emit, router, roomId, gameType]);

  const getPlayerName = useCallback(
    (id: string) => players.find((p) => p.id === id)?.nickname || id,
    [players],
  );

  const scoreboard = players
    .map((p) => ({ id: p.id, name: p.nickname, score: quizState.scores[p.id] || 0 }))
    .sort((a, b) => b.score - a.score);

  // ===================== QUIZ TV RENDER =====================
  if (gameType === 'quiz') {
    const currentQuestion = quizState.currentQuestion;
    const answeredCount = Object.keys(quizState.answers).length;
    const totalPlayers = players.length;
    const timePerQuestion = quizState.config.difficulty === 'easy' ? 15
      : quizState.config.difficulty === 'hard' ? 25 : 20;

    const topicInfo = quizState.config.topic ? QUIZ_TOPICS.find((t) => t.id === quizState.config.topic) : null;
    const diffInfo = quizState.config.difficulty ? QUIZ_DIFFICULTIES.find((d) => d.id === quizState.config.difficulty) : null;
    const isSetup = quizState.phase.startsWith('setup-');

    return (
      <div className="h-screen bg-gradient-main text-white flex flex-col overflow-hidden">
        {/* Top bar */}
        <div className="flex items-center justify-between px-8 py-4 bg-black/20 backdrop-blur-sm border-b border-white/10 flex-shrink-0">
          <div className="flex items-center gap-4">
            <span className="text-4xl">{gameIcon}</span>
            <h1 className="text-3xl font-bold">{gameTitle}</h1>
            {diffInfo && (
              <span className="glass-badge px-3 py-1 text-sm">
                {diffInfo.icon} {locale === 'ru' ? diffInfo.titleRu : diffInfo.titleEn}
              </span>
            )}
            {topicInfo && (
              <span className="glass-badge px-3 py-1 text-sm">
                {topicInfo.icon} {locale === 'ru' ? topicInfo.titleRu : topicInfo.titleEn}
              </span>
            )}
          </div>
          {quizState.phase === 'question' && (
            <div className="flex items-center gap-6">
              <span className="text-xl text-white/60">
                {quizState.questionIndex + 1} / {quizState.totalQuestions}
              </span>
              <span className={`text-4xl font-black tabular-nums ${quizState.timeLeft <= 5 ? 'text-red-400' : 'text-white'}`}>
                {quizState.timeLeft}
              </span>
            </div>
          )}
        </div>

        {/* Main content */}
        <div className="flex-1 flex flex-col justify-center px-8 py-4 min-h-0">
          {/* SETUP / WAITING */}
          {(isSetup || quizState.phase === 'waiting') && (
            <div className="text-center animate-fade-in">
              <div className="text-8xl mb-6">{gameIcon}</div>
              <h2 className="text-5xl font-bold mb-4">{gameTitle}</h2>
              <p className="text-2xl text-white/50 animate-pulse">
                {isSetup
                  ? locale === 'ru' ? 'Настройка игры...' : 'Setting up...'
                  : locale === 'ru' ? 'Ожидание начала...' : 'Waiting to start...'}
              </p>
              {(diffInfo || topicInfo) && (
                <div className="mt-6 flex items-center justify-center gap-4">
                  {diffInfo && (
                    <span className="glass-badge px-4 py-2 text-lg">
                      {diffInfo.icon} {locale === 'ru' ? diffInfo.titleRu : diffInfo.titleEn}
                    </span>
                  )}
                  {topicInfo && (
                    <span className="glass-badge px-4 py-2 text-lg">
                      {topicInfo.icon} {locale === 'ru' ? topicInfo.titleRu : topicInfo.titleEn}
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

          {/* COUNTDOWN */}
          {quizState.phase === 'countdown' && (
            <div className="text-center animate-fade-in">
              <p className="text-3xl text-white/50 mb-6">
                {locale === 'ru' ? 'Вопрос' : 'Question'} {quizState.questionIndex + 1}
              </p>
              <div key={quizState.countdownValue} className="text-[12rem] font-black leading-none animate-bounce">
                {quizState.countdownValue}
              </div>
            </div>
          )}

          {/* QUESTION */}
          {quizState.phase === 'question' && currentQuestion && (
            <div className="flex flex-col h-full justify-center">
              {/* Timer bar */}
              <div className="w-full h-3 rounded-full bg-white/10 overflow-hidden mb-6 flex-shrink-0">
                <div
                  className={`h-full rounded-full transition-all duration-1000 ease-linear ${
                    quizState.timeLeft <= 5 ? 'bg-red-500' : 'bg-purple-500'
                  }`}
                  style={{ width: `${(quizState.timeLeft / timePerQuestion) * 100}%` }}
                />
              </div>

              {/* Question */}
              <div className="glass-card p-8 mb-6 flex-shrink-0">
                <h3 className="text-3xl xl:text-4xl font-bold text-center leading-snug">
                  {locale === 'ru' ? currentQuestion.questionRu : currentQuestion.questionEn}
                </h3>
              </div>

              {/* Options grid */}
              <div className="grid grid-cols-2 gap-4 flex-shrink-0">
                {currentQuestion.options.map((option, index) => {
                  const isCorrectAnswer = index === currentQuestion.correctIndex;
                  const isCorrectRevealed = quizState.showCorrect && isCorrectAnswer;
                  const isWrongRevealed = quizState.showCorrect && !isCorrectAnswer;

                  return (
                    <div
                      key={index}
                      className={`
                        rounded-2xl border-2 p-5 transition-all duration-500
                        ${isCorrectRevealed
                          ? 'border-green-400 bg-green-500/25 ring-4 ring-green-400/30 scale-105'
                          : isWrongRevealed
                            ? 'border-white/10 bg-white/5 opacity-40'
                            : `bg-gradient-to-br ${OPTION_COLORS_TV[index]}`
                        }
                      `}
                    >
                      <div className="flex items-center gap-4">
                        <span className={`
                          flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center text-xl font-black
                          ${isCorrectRevealed ? 'bg-green-500/40 text-green-200' : 'bg-white/10 text-white/70'}
                        `}>
                          {isCorrectRevealed ? '✓' : OPTION_LABELS[index]}
                        </span>
                        <span className="text-2xl font-semibold">
                          {locale === 'ru' ? option.ru : option.en}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Answer status */}
              <div className="mt-4 text-center flex-shrink-0">
                {!quizState.showCorrect ? (
                  <p className="text-xl text-white/40">
                    {locale === 'ru'
                      ? `Ответили: ${answeredCount} / ${totalPlayers}`
                      : `Answered: ${answeredCount} / ${totalPlayers}`}
                  </p>
                ) : (
                  <div className="flex items-center justify-center gap-6">
                    {quizState.correctPlayers.length > 0 ? (
                      <p className="text-xl text-green-400">
                        {locale === 'ru' ? 'Правильно: ' : 'Correct: '}
                        {quizState.correctPlayers.map((id) => getPlayerName(id)).join(', ')}
                      </p>
                    ) : (
                      <p className="text-xl text-red-400">
                        {locale === 'ru' ? 'Никто не угадал!' : 'Nobody got it right!'}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* FINAL */}
          {quizState.phase === 'final' && (
            <div className="text-center animate-fade-in">
              <div className="text-7xl mb-4">🏆</div>
              <h2 className="text-5xl font-bold mb-8">
                {locale === 'ru' ? 'Итоги' : 'Final Results'}
              </h2>
              <div className="max-w-2xl mx-auto space-y-3">
                {scoreboard.map((entry, i) => (
                  <div
                    key={entry.id}
                    className={`flex items-center justify-between py-4 px-8 rounded-2xl transition-all ${
                      i === 0
                        ? 'bg-yellow-500/20 border-2 border-yellow-400/40 scale-105'
                        : i === 1
                          ? 'bg-gray-300/10 border border-gray-300/20'
                          : i === 2
                            ? 'bg-amber-700/10 border border-amber-700/20'
                            : 'bg-white/5 border border-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <span className="text-4xl w-12 text-center">
                        {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`}
                      </span>
                      <span className="text-2xl font-bold">{entry.name}</span>
                    </div>
                    <span className="text-3xl font-black text-purple-400">{entry.score}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Bottom scoreboard bar */}
        {(quizState.phase === 'question' || quizState.phase === 'countdown') && scoreboard.length > 0 && (
          <div className="flex items-center justify-center gap-6 px-8 py-3 bg-black/20 backdrop-blur-sm border-t border-white/10 flex-shrink-0">
            {scoreboard.slice(0, 8).map((entry, i) => (
              <div key={entry.id} className="flex items-center gap-2">
                <span className="text-sm">
                  {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`}
                </span>
                <span className="text-sm font-medium text-white/80">{entry.name}</span>
                <span className="text-sm font-bold text-purple-400">{entry.score}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ===================== GENERIC TV RENDER =====================
  return (
    <div className="h-screen bg-gradient-main text-white flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-8 py-4 bg-black/20 backdrop-blur-sm border-b border-white/10 flex-shrink-0">
        <div className="flex items-center gap-4">
          <span className="text-4xl">{gameIcon}</span>
          <h1 className="text-3xl font-bold">{gameTitle}</h1>
        </div>
        <div className="flex items-center gap-4">
          {players.map((p) => (
            <div key={p.id} className="flex items-center gap-2 glass-badge px-3 py-1.5">
              <div className={`w-2 h-2 rounded-full ${p.isConnected ? 'bg-green-400' : 'bg-red-400'}`} />
              <span className="text-sm">{p.nickname}</span>
              {p.isHost && <span>👑</span>}
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center px-8">
        <div className="text-center">
          <div className="text-8xl mb-6">{gameIcon}</div>
          <h2 className="text-4xl font-bold mb-4">{gameTitle}</h2>
          <p className="text-2xl text-white/50">
            {locale === 'ru' ? 'Игра идёт — смотрите на телефонах!' : 'Game in progress — check your phones!'}
          </p>
          <div className="mt-8 flex items-center justify-center gap-4 flex-wrap">
            {players.map((p) => (
              <div key={p.id} className="glass-card px-6 py-3">
                <span className="text-xl">{p.nickname}</span>
                {p.isHost && <span className="ml-2">👑</span>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
