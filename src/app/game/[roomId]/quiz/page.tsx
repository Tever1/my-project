'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslation } from '@/lib/i18n';
import { useAuth } from '@/lib/auth-context';
import { useSocket } from '@/lib/use-socket';
import { GameLayout } from '@/components/games/GameLayout';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { QuizDifficulty, QuizTopic, QuizQuestion } from '@/types/game';
import { getQuizQuestions, getSpecialQuizQuestions, QUIZ_TOPICS, QUIZ_DIFFICULTIES, SPECIAL_QUIZZES, SPECIAL_QUIZ_THEMES, getSpecialQuizzesByTheme } from '@/lib/quiz';
import { useTimerSound } from '@/lib/use-timer-sound';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Phase = 'setup-mode' | 'setup-difficulty' | 'setup-topic' | 'setup-special-theme' | 'setup-special-quiz' | 'waiting' | 'countdown' | 'question' | 'results' | 'mid-leaderboard' | 'final';

interface QuizConfig {
  mode: 'general' | 'special' | null;
  difficulty: QuizDifficulty | null;
  topic: QuizTopic | null;
  specialTheme: string | null;
  specialQuizId: string | null;
}

interface QuizGameState {
  phase: Phase;
  config: QuizConfig;
  questionIndex: number;
  totalQuestions: number;
  timeLeft: number;
  answers: Record<string, number>;
  scores: Record<string, number>;
  showCorrect: boolean;
  players: { id: string; nickname: string; isHost: boolean }[];
  countdownValue: number;
  correctPlayers: string[];
  // Synced question data (so non-host players see the question)
  currentQuestion: {
    questionRu: string;
    questionEn: string;
    options: { ru: string; en: string }[];
    correctIndex: number;
  } | null;
}

const QUESTIONS_PER_GAME = 10;

const INITIAL_STATE: QuizGameState = {
  phase: 'setup-mode',
  config: { mode: null, difficulty: null, topic: null, specialTheme: null, specialQuizId: null },
  questionIndex: 0,
  totalQuestions: QUESTIONS_PER_GAME,
  timeLeft: 15,
  answers: {},
  scores: {},
  showCorrect: false,
  players: [],
  countdownValue: 3,
  correctPlayers: [],
  currentQuestion: null,
};

const OPTION_COLORS = [
  'from-blue-600/60 to-blue-500/40 border-blue-400/60',
  'from-emerald-600/60 to-emerald-500/40 border-emerald-400/60',
  'from-amber-600/60 to-amber-500/40 border-amber-400/60',
  'from-pink-600/60 to-pink-500/40 border-pink-400/60',
];

const OPTION_LABELS = ['A', 'B', 'C', 'D'];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function QuizPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const { locale } = useTranslation();
  const { user } = useAuth();
  const { emit, on } = useSocket();
  const router = useRouter();

  const [gameState, setGameState] = useState<QuizGameState>(INITIAL_STATE);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { tick: timerTick, stop: stopTimerSound, warmup: warmupSound } = useTimerSound();

  // Host-only state: the actual question objects (not sent to clients, only question data is synced)
  const questionsRef = useRef<QuizQuestion[]>([]);
  const shownIdsRef = useRef<Set<string>>(new Set());

  const isHost = gameState.players.find((p) => p.id === user?.id)?.isHost ?? false;
  const myAnswer = user ? gameState.answers[user.id] : undefined;
  const totalPlayers = gameState.players.length;
  const answeredCount = Object.keys(gameState.answers).length;
  const allAnswered = totalPlayers > 0 && answeredCount >= totalPlayers;

  const timePerQuestion = gameState.config.difficulty === 'easy' ? 15
    : gameState.config.difficulty === 'hard' ? 25 : 20;

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
      };

      switch (action) {
        case 'quiz:sync':
          setGameState((prev) => ({ ...prev, ...(payload as Partial<QuizGameState>) }));
          break;

        case 'quiz:config':
          setGameState((prev) => ({
            ...prev,
            config: payload.config as QuizConfig,
            phase: payload.phase as Phase,
            totalQuestions: (payload.totalQuestions as number) || QUESTIONS_PER_GAME,
          }));
          break;

        case 'quiz:answer': {
          const { playerId, answerIndex } = payload as { playerId: string; answerIndex: number };
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
          setGameState((prev) => ({ ...prev, showCorrect: true, scores, correctPlayers }));
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
            question: {
              questionRu: string;
              questionEn: string;
              options: { ru: string; en: string }[];
              correctIndex: number;
            };
          };
          setGameState((prev) => ({
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
          setGameState((prev) => ({ ...prev, phase: 'final' }));
          break;
      }
    });

    const unsub3 = on('game:ended', () => {
      router.push(`/lobby/${roomId}`);
    });

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

    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      setGameState((prev) => {
        const next = prev.timeLeft - 1;
        if (next <= 0) {
          if (timerRef.current) clearInterval(timerRef.current);
          return { ...prev, timeLeft: 0 };
        }
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

  // ------- Timer sound effect -------

  useEffect(() => {
    if (gameState.phase === 'question' && !gameState.showCorrect) {
      timerTick(gameState.timeLeft, timePerQuestion);
    } else {
      stopTimerSound();
    }
  }, [gameState.timeLeft, gameState.phase, gameState.showCorrect, timePerQuestion, timerTick, stopTimerSound]);

  // ------- Auto-reveal -------

  useEffect(() => {
    if (!isHost || gameState.phase !== 'question' || gameState.showCorrect) return;
    if (gameState.timeLeft <= 0 || allAnswered) {
      revealResults();
    }
  }, [gameState.timeLeft, allAnswered, isHost, gameState.phase, gameState.showCorrect]);

  // ------- Setup Actions (host only) -------

  const selectMode = (mode: 'general' | 'special') => {
    warmupSound();
    const newConfig = { ...gameState.config, mode };
    const nextPhase: Phase = mode === 'general' ? 'setup-difficulty' : 'setup-special-theme';
    setGameState((prev) => ({ ...prev, config: newConfig, phase: nextPhase }));
    emit('game:action', {
      code: roomId,
      action: 'quiz:config',
      payload: { config: newConfig, phase: nextPhase },
    });
  };

  const goBack = () => {
    let newConfig = { ...gameState.config };
    let prevPhase: Phase = 'setup-mode';

    switch (gameState.phase) {
      case 'setup-difficulty':
        newConfig = { ...newConfig, mode: null };
        prevPhase = 'setup-mode';
        break;
      case 'setup-topic':
        newConfig = { ...newConfig, difficulty: null };
        prevPhase = 'setup-difficulty';
        break;
      case 'setup-special-theme':
        newConfig = { ...newConfig, mode: null };
        prevPhase = 'setup-mode';
        break;
      case 'setup-special-quiz':
        newConfig = { ...newConfig, specialTheme: null, specialQuizId: null };
        prevPhase = 'setup-special-theme';
        break;
      case 'waiting':
        if (newConfig.mode === 'special') {
          newConfig = { ...newConfig, specialQuizId: null };
          prevPhase = 'setup-special-quiz';
        } else {
          newConfig = { ...newConfig, topic: null };
          prevPhase = 'setup-topic';
        }
        break;
      default:
        return;
    }

    setGameState((prev) => ({ ...prev, config: newConfig, phase: prevPhase }));
    emit('game:action', {
      code: roomId,
      action: 'quiz:config',
      payload: { config: newConfig, phase: prevPhase },
    });
  };

  const selectSpecialTheme = (themeId: string) => {
    const newConfig = { ...gameState.config, specialTheme: themeId };
    setGameState((prev) => ({ ...prev, config: newConfig, phase: 'setup-special-quiz' }));
    emit('game:action', {
      code: roomId,
      action: 'quiz:config',
      payload: { config: newConfig, phase: 'setup-special-quiz' },
    });
  };

  const selectDifficulty = (difficulty: QuizDifficulty) => {
    const newConfig = { ...gameState.config, difficulty };
    setGameState((prev) => ({ ...prev, config: newConfig, phase: 'setup-topic' }));
    emit('game:action', {
      code: roomId,
      action: 'quiz:config',
      payload: { config: newConfig, phase: 'setup-topic' },
    });
  };

  const selectTopic = (topic: QuizTopic) => {
    const newConfig = { ...gameState.config, topic };
    // Generate questions for this session
    const questions = getQuizQuestions(topic, newConfig.difficulty!, shownIdsRef.current);
    const total = Math.min(QUESTIONS_PER_GAME, questions.length);
    questionsRef.current = questions.slice(0, total);

    setGameState((prev) => ({
      ...prev,
      config: newConfig,
      phase: 'waiting',
      totalQuestions: total,
    }));
    emit('game:action', {
      code: roomId,
      action: 'quiz:config',
      payload: { config: newConfig, phase: 'waiting', totalQuestions: total },
    });
  };

  const selectSpecialQuiz = (quizId: string) => {
    const newConfig = { ...gameState.config, specialQuizId: quizId };
    const questions = getSpecialQuizQuestions(quizId, shownIdsRef.current);
    const total = Math.min(QUESTIONS_PER_GAME, questions.length);
    questionsRef.current = questions.slice(0, total);

    setGameState((prev) => ({
      ...prev,
      config: newConfig,
      phase: 'waiting',
      totalQuestions: total,
    }));
    emit('game:action', {
      code: roomId,
      action: 'quiz:config',
      payload: { config: newConfig, phase: 'waiting', totalQuestions: total },
    });
  };

  // ------- Game Actions -------

  const revealResults = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);

    const question = gameState.currentQuestion;
    if (!question) return;

    const newScores = { ...gameState.scores };
    const correct: string[] = [];

    for (const [playerId, answerIdx] of Object.entries(gameState.answers)) {
      if (answerIdx === question.correctIndex) {
        newScores[playerId] = (newScores[playerId] || 0) + 1;
        correct.push(playerId);
      }
    }

    setGameState((prev) => ({ ...prev, showCorrect: true, scores: newScores, correctPlayers: correct }));

    emit('game:action', {
      code: roomId,
      action: 'quiz:show-results',
      payload: { scores: newScores, correctPlayers: correct },
    });

    emit('game:state-update', {
      code: roomId,
      gameState: { scores: newScores },
    });
  }, [gameState.currentQuestion, gameState.answers, gameState.scores, gameState.timeLeft, emit, roomId]);

  const runCountdown = useCallback(
    (questionIdx: number) => {
      let count = 3;
      setGameState((prev) => ({ ...prev, phase: 'countdown', countdownValue: count }));
      emit('game:action', {
        code: roomId,
        action: 'quiz:countdown',
        payload: { value: count },
      });

      const interval = setInterval(() => {
        count -= 1;
        if (count <= 0) {
          clearInterval(interval);
          const q = questionsRef.current[questionIdx];
          if (!q) return;

          // Track shown question
          shownIdsRef.current.add(q.id);

          const questionData = {
            questionRu: q.questionRu,
            questionEn: q.questionEn,
            options: q.options,
            correctIndex: q.correctIndex,
          };

          const startPayload = {
            questionIndex: questionIdx,
            timeLeft: q.timeLimit,
            question: questionData,
          };

          setGameState((prev) => ({
            ...prev,
            phase: 'question',
            questionIndex: questionIdx,
            timeLeft: q.timeLimit,
            currentQuestion: questionData,
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
    warmupSound();
    // If host hasn't generated questions yet (e.g., "Play Again"), regenerate
    if (questionsRef.current.length === 0) {
      if (gameState.config.mode === 'special' && gameState.config.specialQuizId) {
        const questions = getSpecialQuizQuestions(gameState.config.specialQuizId, shownIdsRef.current);
        questionsRef.current = questions.slice(0, Math.min(QUESTIONS_PER_GAME, questions.length));
      } else if (gameState.config.topic && gameState.config.difficulty) {
        const questions = getQuizQuestions(gameState.config.topic, gameState.config.difficulty, shownIdsRef.current);
        questionsRef.current = questions.slice(0, Math.min(QUESTIONS_PER_GAME, questions.length));
      }
    }

    const initialScores: Record<string, number> = {};
    gameState.players.forEach((p) => {
      initialScores[p.id] = 0;
    });

    setGameState((prev) => ({ ...prev, scores: initialScores }));

    emit('game:action', {
      code: roomId,
      action: 'quiz:sync',
      payload: { scores: initialScores },
    });

    runCountdown(0);
  };

  const startQuestionImmediate = useCallback((questionIdx: number) => {
    const q = questionsRef.current[questionIdx];
    if (!q) return;

    shownIdsRef.current.add(q.id);

    const questionData = {
      questionRu: q.questionRu,
      questionEn: q.questionEn,
      options: q.options,
      correctIndex: q.correctIndex,
    };

    setGameState((prev) => ({
      ...prev,
      phase: 'question',
      questionIndex: questionIdx,
      timeLeft: q.timeLimit,
      currentQuestion: questionData,
      answers: {},
      showCorrect: false,
      correctPlayers: [],
    }));

    emit('game:action', {
      code: roomId,
      action: 'quiz:start-question',
      payload: { questionIndex: questionIdx, timeLeft: q.timeLimit, question: questionData },
    });
  }, [emit, roomId]);

  const startNextQuestion = () => {
    const nextIndex = gameState.questionIndex + 1;
    if (nextIndex >= gameState.totalQuestions) {
      setGameState((prev) => ({ ...prev, phase: 'final' }));
      emit('game:action', { code: roomId, action: 'quiz:final', payload: {} });
      return;
    }
    // Show mid-game leaderboard after round 5
    if (nextIndex === 5) {
      setGameState((prev) => ({ ...prev, phase: 'mid-leaderboard' }));
      emit('game:action', { code: roomId, action: 'quiz:sync', payload: { phase: 'mid-leaderboard' } });
      return;
    }
    startQuestionImmediate(nextIndex);
  };

  const submitAnswer = (answerIndex: number) => {
    warmupSound();
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

  const playAgain = () => {
    // Regenerate questions (excluding already shown ones)
    if (gameState.config.mode === 'special' && gameState.config.specialQuizId) {
      const questions = getSpecialQuizQuestions(gameState.config.specialQuizId, shownIdsRef.current);
      const total = Math.min(QUESTIONS_PER_GAME, questions.length);
      questionsRef.current = questions.slice(0, total);
      setGameState((prev) => ({ ...prev, totalQuestions: total }));
    } else if (gameState.config.topic && gameState.config.difficulty) {
      const questions = getQuizQuestions(gameState.config.topic, gameState.config.difficulty, shownIdsRef.current);
      const total = Math.min(QUESTIONS_PER_GAME, questions.length);
      questionsRef.current = questions.slice(0, total);
      setGameState((prev) => ({ ...prev, totalQuestions: total }));
    }
    startGame();
  };

  const endGame = () => {
    setShowEndConfirm(true);
  };

  const confirmEndGame = () => {
    setShowEndConfirm(false);
    stopTimerSound();
    emit('game:end', { code: roomId });
  };

  // ------- Derived data -------

  const scoreboard = gameState.players
    .map((p) => ({ name: p.nickname, score: gameState.scores[p.id] || 0 }))
    .sort((a, b) => b.score - a.score);

  const getPlayerName = (id: string) =>
    gameState.players.find((p) => p.id === id)?.nickname || id;

  const currentQuestion = gameState.currentQuestion;
  const topicInfo = gameState.config.topic ? QUIZ_TOPICS.find((t) => t.id === gameState.config.topic) : null;
  const diffInfo = gameState.config.difficulty ? QUIZ_DIFFICULTIES.find((d) => d.id === gameState.config.difficulty) : null;
  const specialQuizInfo = gameState.config.specialQuizId ? SPECIAL_QUIZZES.find((q) => q.id === gameState.config.specialQuizId) : null;
  const specialThemeInfo = gameState.config.specialTheme ? SPECIAL_QUIZ_THEMES.find((t) => t.id === gameState.config.specialTheme) : null;
  const backgroundUrl = specialQuizInfo?.backgroundUrl ?? specialThemeInfo?.backgroundUrl ?? topicInfo?.backgroundUrl;

  // ------- Render -------

  const isSetup = gameState.phase.startsWith('setup-');

  return (
    <GameLayout
      title={locale === 'ru' ? 'Квиз' : 'Quiz'}
      icon="🧠"
      round={gameState.phase === 'question' || gameState.phase === 'countdown'
        ? gameState.questionIndex + 1
        : gameState.phase === 'final'
          ? gameState.totalQuestions
          : undefined}
      totalRounds={!isSetup && gameState.phase !== 'waiting' ? gameState.totalQuestions : undefined}
      scores={scoreboard}
      onEnd={isHost ? endGame : undefined}
      showScoreboard={!isSetup && gameState.phase !== 'waiting' && gameState.phase !== 'countdown'}
      backgroundUrl={backgroundUrl}
    >
      {/* ==================== SETUP: MODE (first step) ==================== */}
      {gameState.phase === 'setup-mode' && (
        <div className="text-center py-8 animate-fade-in max-w-lg mx-auto">
          <div className="text-6xl mb-4">🧠</div>
          <h2 className="text-2xl font-bold text-white mb-2">
            {locale === 'ru' ? 'Выберите тип квиза' : 'Choose quiz type'}
          </h2>
          <p className="text-white/80 mb-8">
            {locale === 'ru' ? 'Общие темы или специальные квизы' : 'General topics or special quizzes'}
          </p>

          {isHost ? (
            <div className="space-y-3">
              <button
                onClick={() => selectMode('general')}
                className="w-full rounded-2xl border p-5 text-left transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer bg-gradient-to-br from-purple-600/20 to-purple-500/5 border-purple-500/30"
              >
                <div className="flex items-center gap-4">
                  <span className="text-3xl">📚</span>
                  <div>
                    <p className="text-lg font-semibold text-white">
                      {locale === 'ru' ? 'Общие темы' : 'General Topics'}
                    </p>
                    <p className="text-sm text-white/80">
                      {locale === 'ru' ? 'Наука, история, поп-культура и др.' : 'Science, history, pop culture, etc.'}
                    </p>
                  </div>
                </div>
              </button>
              <button
                onClick={() => selectMode('special')}
                className="w-full rounded-2xl border p-5 text-left transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer bg-gradient-to-br from-amber-600/20 to-amber-500/5 border-amber-500/30"
              >
                <div className="flex items-center gap-4">
                  <span className="text-3xl">🌟</span>
                  <div>
                    <p className="text-lg font-semibold text-white">
                      {locale === 'ru' ? 'Специальные квизы' : 'Special Quizzes'}
                    </p>
                    <p className="text-sm text-white/80">
                      {locale === 'ru' ? 'Тематические подборки без уровней сложности' : 'Themed sets, no difficulty levels'}
                    </p>
                  </div>
                </div>
              </button>
            </div>
          ) : (
            <p className="text-white/40 italic">
              {locale === 'ru' ? 'Ведущий выбирает тип квиза...' : 'Host is choosing quiz type...'}
            </p>
          )}

          <p className="text-white/30 text-sm mt-6">
            {locale === 'ru' ? `Игроков: ${totalPlayers}` : `Players: ${totalPlayers}`}
          </p>
        </div>
      )}

      {/* ==================== SETUP: DIFFICULTY (after mode=general) ==================== */}
      {gameState.phase === 'setup-difficulty' && (
        <div className="text-center py-8 animate-fade-in max-w-lg mx-auto">
          {isHost && (
            <button onClick={goBack} className="flex items-center gap-1.5 text-white/70 hover:text-white text-sm mb-6 mx-auto transition-colors">
              ← {locale === 'ru' ? 'Назад' : 'Back'}
            </button>
          )}
          <div className="flex items-center justify-center gap-2 mb-6">
            <span className="text-2xl">📚</span>
            <span className="text-white/60 font-medium">
              {locale === 'ru' ? 'Общие темы' : 'General Topics'}
            </span>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">
            {locale === 'ru' ? 'Выберите уровень сложности' : 'Choose difficulty level'}
          </h2>

          {isHost ? (
            <div className="space-y-3 mt-8">
              {QUIZ_DIFFICULTIES.map((d) => (
                <button
                  key={d.id}
                  onClick={() => selectDifficulty(d.id)}
                  className={`w-full rounded-2xl border p-5 text-left transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer bg-gradient-to-br ${d.color}`}
                >
                  <div className="flex items-center gap-4">
                    <span className="text-3xl">{d.icon}</span>
                    <div>
                      <p className="text-lg font-semibold text-white">
                        {locale === 'ru' ? d.titleRu : d.titleEn}
                      </p>
                      <p className="text-sm text-white/80">
                        {d.id === 'easy'
                          ? locale === 'ru' ? '15 сек на вопрос' : '15 sec per question'
                          : d.id === 'medium'
                            ? locale === 'ru' ? '20 сек на вопрос' : '20 sec per question'
                            : locale === 'ru' ? '25 сек на вопрос' : '25 sec per question'}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-white/40 italic">
              {locale === 'ru' ? 'Ведущий выбирает сложность...' : 'Host is choosing difficulty...'}
            </p>
          )}
        </div>
      )}

      {/* ==================== SETUP: SPECIAL THEME (after mode=special) ==================== */}
      {gameState.phase === 'setup-special-theme' && (
        <div className="text-center py-8 animate-fade-in max-w-lg mx-auto">
          {isHost && (
            <button onClick={goBack} className="flex items-center gap-1.5 text-white/70 hover:text-white text-sm mb-6 mx-auto transition-colors">
              ← {locale === 'ru' ? 'Назад' : 'Back'}
            </button>
          )}
          <div className="flex items-center justify-center gap-2 mb-6">
            <span className="text-2xl">🌟</span>
            <span className="text-white/80 font-medium">
              {locale === 'ru' ? 'Специальные квизы' : 'Special Quizzes'}
            </span>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">
            {locale === 'ru' ? 'Выберите тему' : 'Choose a theme'}
          </h2>
          <p className="text-white/80 mb-8">
            {locale === 'ru' ? 'Тематическая подборка, без уровней сложности' : 'Themed set, no difficulty levels'}
          </p>

          {isHost ? (
            <div className="space-y-3">
              {SPECIAL_QUIZ_THEMES.map((theme) => (
                <button
                  key={theme.id}
                  onClick={() => selectSpecialTheme(theme.id)}
                  className="w-full rounded-2xl border p-5 text-left transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer bg-gradient-to-br from-amber-600/20 to-amber-500/5 border-amber-500/30"
                >
                  <div className="flex items-center gap-4">
                    <span className="text-3xl">{theme.icon}</span>
                    <div>
                      <p className="text-lg font-semibold text-white">
                        {locale === 'ru' ? theme.titleRu : theme.titleEn}
                      </p>
                      <p className="text-sm text-white/70">
                        {(() => {
                          const n = getSpecialQuizzesByTheme(theme.id).length;
                          return locale === 'ru'
                            ? `${n} ${n === 1 ? 'квиз' : n < 5 ? 'квиза' : 'квизов'}`
                            : `${n} ${n === 1 ? 'quiz' : 'quizzes'}`;
                        })()}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-white/70 italic">
              {locale === 'ru' ? 'Ведущий выбирает тему...' : 'Host is choosing a theme...'}
            </p>
          )}
        </div>
      )}

      {/* ==================== SETUP: SPECIAL QUIZ (after theme chosen) ==================== */}
      {gameState.phase === 'setup-special-quiz' && specialThemeInfo && (
        <div className="text-center py-8 animate-fade-in max-w-lg mx-auto">
          {/* Back button */}
          {isHost && (
            <button
              onClick={goBack}
              className="flex items-center gap-1.5 text-white/70 hover:text-white text-sm mb-6 mx-auto transition-colors"
            >
              ← {locale === 'ru' ? 'Назад' : 'Back'}
            </button>
          )}

          {/* Theme heading — large, no emoji */}
          <h2 className="text-4xl font-bold text-white mb-1">
            {locale === 'ru' ? specialThemeInfo.titleRu : specialThemeInfo.titleEn}
          </h2>
          <p className="text-white/70 mb-8">
            {locale === 'ru' ? 'Выберите квиз' : 'Choose a quiz'}
          </p>

          {isHost ? (
            <div className="space-y-3">
              {getSpecialQuizzesByTheme(specialThemeInfo.id).map((q) => (
                <button
                  key={q.id}
                  onClick={() => selectSpecialQuiz(q.id)}
                  className="w-full rounded-2xl border-2 p-5 text-left transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer bg-gradient-to-br from-amber-700/70 to-amber-600/50 border-amber-400/80"
                >
                  <div className="flex items-center gap-4">
                    <span className="text-3xl font-black text-white">#{q.number}</span>
                    <p className="text-lg font-semibold text-white">
                      {locale === 'ru' ? specialThemeInfo.titleRu : specialThemeInfo.titleEn}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-white/70 italic">
              {locale === 'ru' ? 'Ведущий выбирает квиз...' : 'Host is choosing a quiz...'}
            </p>
          )}
        </div>
      )}

      {/* ==================== SETUP: TOPIC ==================== */}
      {gameState.phase === 'setup-topic' && (
        <div className="text-center py-8 animate-fade-in max-w-lg mx-auto">
          {isHost && (
            <button onClick={goBack} className="flex items-center gap-1.5 text-white/70 hover:text-white text-sm mb-6 mx-auto transition-colors">
              ← {locale === 'ru' ? 'Назад' : 'Back'}
            </button>
          )}
          <div className="flex items-center justify-center gap-2 mb-6">
            <span className="text-2xl">{diffInfo?.icon}</span>
            <span className="text-white/60 font-medium">
              {locale === 'ru' ? diffInfo?.titleRu : diffInfo?.titleEn}
            </span>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">
            {locale === 'ru' ? 'Выберите тему' : 'Choose a topic'}
          </h2>
          <p className="text-white/80 mb-8">
            {locale === 'ru' ? '10 вопросов по выбранной теме' : '10 questions on the chosen topic'}
          </p>

          {isHost ? (
            <div className="space-y-3">
              {QUIZ_TOPICS.map((topic) => (
                <button
                  key={topic.id}
                  onClick={() => selectTopic(topic.id)}
                  className="w-full rounded-2xl border p-5 text-left transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer bg-gradient-to-br from-indigo-600/20 to-indigo-500/5 border-indigo-500/30"
                >
                  <div className="flex items-center gap-4">
                    <span className="text-3xl">{topic.icon}</span>
                    <div>
                      <p className="text-lg font-semibold text-white">
                        {locale === 'ru' ? topic.titleRu : topic.titleEn}
                      </p>
                      {topic.id === 'random' && (
                        <p className="text-xs text-white/40 mt-0.5">
                          ({locale === 'ru' ? 'вопрос из любой темы' : 'questions from any topic'})
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="text-white/40 italic">
              <p>{locale === 'ru' ? 'Ведущий выбирает тему...' : 'Host is choosing topic...'}</p>
            </div>
          )}
        </div>
      )}

      {/* ==================== WAITING (ready to start) ==================== */}
      {gameState.phase === 'waiting' && (
        <div className="text-center pt-2 pb-8 animate-fade-in">
          {isHost && (
            <button onClick={goBack} className="flex items-center gap-1.5 text-white/70 hover:text-white text-sm mb-8 mx-auto transition-colors">
              ← {locale === 'ru' ? 'Назад' : 'Back'}
            </button>
          )}
          <h2 className="text-5xl font-bold text-white mb-6">
            {locale === 'ru' ? 'Квиз' : 'Quiz'}
          </h2>

          {/* Config badges */}
          <div className="flex items-center justify-center gap-4 mb-8 flex-wrap">
            {specialQuizInfo ? (
              <span className="glass-badge px-5 py-2.5 text-lg">
                {specialQuizInfo.icon} {locale === 'ru' ? specialQuizInfo.titleRu : specialQuizInfo.titleEn}
              </span>
            ) : (
              <>
                {diffInfo && (
                  <span className="glass-badge px-5 py-2.5 text-lg">
                    {diffInfo.icon} {locale === 'ru' ? diffInfo.titleRu : diffInfo.titleEn}
                  </span>
                )}
                {topicInfo && (
                  <span className="glass-badge px-5 py-2.5 text-lg">
                    {topicInfo.icon} {locale === 'ru' ? topicInfo.titleRu : topicInfo.titleEn}
                  </span>
                )}
              </>
            )}
          </div>

          <p className="text-white mb-4 max-w-xl mx-auto text-xl">
            {locale === 'ru'
              ? `${gameState.totalQuestions} вопросов. 1 очко за правильный ответ!`
              : `${gameState.totalQuestions} questions. 1 point for each correct answer!`}
          </p>
          <p className="text-white/80 text-lg mb-10">
            {locale === 'ru' ? `Игроков: ${totalPlayers}` : `Players: ${totalPlayers}`}
          </p>
          {isHost ? (
            <GlassButton variant="primary" size="lg" className="text-xl px-12 py-5" onClick={startGame}>
              {locale === 'ru' ? 'Начать игру' : 'Start Game'}
            </GlassButton>
          ) : (
            <p className="text-white/40 italic text-xl">
              {locale === 'ru' ? 'Ожидание ведущего...' : 'Waiting for the host...'}
            </p>
          )}
        </div>
      )}

      {/* ==================== COUNTDOWN ==================== */}
      {gameState.phase === 'countdown' && (
        <div className="flex items-center justify-center py-24 animate-fade-in">
          <div className="text-center">
            <p className="text-white/80 text-lg mb-4">
              {locale === 'ru' ? 'Вопрос' : 'Question'} {gameState.questionIndex + 1}
            </p>
            <div key={gameState.countdownValue} className="text-8xl font-black text-white animate-bounce">
              {gameState.countdownValue}
            </div>
          </div>
        </div>
      )}

      {/* ==================== QUESTION ==================== */}
      {gameState.phase === 'question' && currentQuestion && (
        <div className="max-w-5xl mx-auto w-full">
          {/* Timer bar */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-white/40">
                {locale === 'ru' ? 'Вопрос' : 'Question'} {gameState.questionIndex + 1}/{gameState.totalQuestions}
              </span>
              <span className={`text-lg font-bold ${gameState.timeLeft <= 5 ? 'text-red-400' : 'text-white/70'}`}>
                {gameState.timeLeft}s
              </span>
            </div>
            <div className="w-full h-3 rounded-full bg-white/10 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-1000 ease-linear ${
                  gameState.timeLeft <= 5 ? 'bg-red-500' : 'bg-purple-500'
                }`}
                style={{ width: `${(gameState.timeLeft / timePerQuestion) * 100}%` }}
              />
            </div>
          </div>

          {/* Question card */}
          <GlassCard className="p-8 mb-8">
            <h3 className="text-2xl md:text-3xl lg:text-4xl font-semibold text-white leading-snug">
              {locale === 'ru' ? currentQuestion.questionRu : currentQuestion.questionEn}
            </h3>
          </GlassCard>

          {/* Answer options */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                    relative overflow-hidden rounded-2xl border p-5 md:p-6 text-left transition-all duration-300
                    ${isCorrectRevealed
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
                  <div className="flex items-center gap-4">
                    <span className={`
                      flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center text-base font-bold
                      ${isCorrectRevealed
                        ? 'bg-green-500/30 text-green-300'
                        : isWrongRevealed
                          ? 'bg-red-500/30 text-red-300'
                          : 'bg-white/10 text-white/60'
                      }
                    `}>
                      {isCorrectRevealed ? '✓' : isWrongRevealed ? '✕' : OPTION_LABELS[index]}
                    </span>
                    <span className="text-white font-medium text-lg md:text-xl">
                      {locale === 'ru' ? option.ru : option.en}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Status bar */}
          <div className="mt-5 flex items-center justify-between text-base">
            <p className="text-white/30">
              {myAnswer !== undefined
                ? locale === 'ru' ? 'Ответ принят!' : 'Answer submitted!'
                : gameState.showCorrect ? '' : locale === 'ru' ? 'Выберите ответ' : 'Choose an answer'}
            </p>
            <p className="text-white/30">{answeredCount}/{totalPlayers}</p>
          </div>

          {/* Post-question results */}
          {gameState.showCorrect && (
            <div className="mt-6 animate-fade-in">
              <GlassCard className="p-5">
                {gameState.correctPlayers.length > 0 ? (
                  <>
                    <p className="text-green-400 font-medium mb-2">
                      {locale === 'ru' ? 'Правильно ответили:' : 'Answered correctly:'}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {gameState.correctPlayers.map((id) => (
                        <span key={id} className="glass-badge text-xs">{getPlayerName(id)}</span>
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
                    {gameState.questionIndex + 1 < gameState.totalQuestions
                      ? locale === 'ru' ? 'Следующий вопрос' : 'Next Question'
                      : locale === 'ru' ? 'Показать результаты' : 'Show Results'}
                  </GlassButton>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ==================== MID-GAME LEADERBOARD (after round 5) ==================== */}
      {gameState.phase === 'mid-leaderboard' && (
        <div className="max-w-2xl mx-auto text-center animate-fade-in py-6">
          <div className="text-5xl mb-4">📊</div>
          <h2 className="text-3xl font-bold text-white mb-2">
            {locale === 'ru' ? 'Промежуточные результаты' : 'Halftime Results'}
          </h2>
          <p className="text-white/80 mb-6">
            {locale === 'ru' ? `После ${gameState.questionIndex + 1} из ${gameState.totalQuestions} вопросов` : `After ${gameState.questionIndex + 1} of ${gameState.totalQuestions} questions`}
          </p>

          <div className="space-y-3 mb-8">
            {scoreboard.map((entry, i) => (
              <GlassCard
                key={entry.name}
                className={`p-4 flex items-center justify-between transition-all ${
                  i === 0 ? 'ring-2 ring-yellow-400/60 bg-yellow-500/10'
                    : i === 1 ? 'ring-1 ring-gray-300/30 bg-gray-300/5'
                      : i === 2 ? 'ring-1 ring-amber-600/30 bg-amber-700/5' : ''
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
            <GlassButton variant="primary" size="lg" onClick={() => startQuestionImmediate(5)}>
              {locale === 'ru' ? 'Продолжить' : 'Continue'}
            </GlassButton>
          )}
          {!isHost && (
            <p className="text-white/40 italic">
              {locale === 'ru' ? 'Ожидание ведущего...' : 'Waiting for the host...'}
            </p>
          )}
        </div>
      )}

      {/* ==================== FINAL LEADERBOARD ==================== */}
      {gameState.phase === 'final' && (
        <div className="max-w-lg mx-auto text-center animate-fade-in py-6">
          <div className="text-6xl mb-4">🏆</div>
          <h2 className="text-3xl font-bold text-white mb-2">
            {locale === 'ru' ? 'Итоги' : 'Final Results'}
          </h2>
          {specialQuizInfo ? (
            <div className="flex items-center justify-center gap-2 mb-6">
              <span className="glass-badge text-xs">{specialQuizInfo.icon} {locale === 'ru' ? specialQuizInfo.titleRu : specialQuizInfo.titleEn}</span>
            </div>
          ) : topicInfo && diffInfo ? (
            <div className="flex items-center justify-center gap-2 mb-6">
              <span className="glass-badge text-xs">{diffInfo.icon} {locale === 'ru' ? diffInfo.titleRu : diffInfo.titleEn}</span>
              <span className="glass-badge text-xs">{topicInfo.icon} {locale === 'ru' ? topicInfo.titleRu : topicInfo.titleEn}</span>
            </div>
          ) : null}

          <div className="space-y-3">
            {scoreboard.map((entry, i) => (
              <GlassCard
                key={entry.name}
                className={`p-4 flex items-center justify-between transition-all ${
                  i === 0 ? 'ring-2 ring-yellow-400/60 bg-yellow-500/10'
                    : i === 1 ? 'ring-1 ring-gray-300/30 bg-gray-300/5'
                      : i === 2 ? 'ring-1 ring-amber-600/30 bg-amber-700/5' : ''
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
              <GlassButton variant="primary" onClick={playAgain}>
                {locale === 'ru' ? 'Играть снова' : 'Play Again'}
              </GlassButton>
            </div>
          )}
        </div>
      )}

      {/* End game confirmation modal */}
      {showEndConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
          onClick={() => setShowEndConfirm(false)}
        >
          <div
            className="glass-card p-6 max-w-sm w-full animate-scale-in text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-white text-lg font-semibold mb-2">
              {locale === 'ru' ? 'Завершить игру?' : 'End game?'}
            </p>
            <p className="text-white/80 text-sm mb-6">
              {locale === 'ru'
                ? 'Все игроки вернутся в лобби'
                : 'All players will return to the lobby'}
            </p>
            <div className="flex gap-3">
              <GlassButton className="flex-1" onClick={() => setShowEndConfirm(false)}>
                {locale === 'ru' ? 'Отмена' : 'Cancel'}
              </GlassButton>
              <GlassButton variant="danger" className="flex-1" onClick={confirmEndGame}>
                {locale === 'ru' ? 'Завершить' : 'End Game'}
              </GlassButton>
            </div>
          </div>
        </div>
      )}
    </GameLayout>
  );
}
