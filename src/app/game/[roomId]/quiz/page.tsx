'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslation } from '@/lib/i18n';
import { useAuth } from '@/lib/auth-context';
import { useSocket } from '@/lib/use-socket';
import { useNavigateOnGameEnd } from '@/lib/use-navigate-on-game-end';
import { GameLayout } from '@/components/games/GameLayout';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { UrgencyTimer, AnimatedScore, BreathingPlaceholder } from '@/components/ingame';
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
  gameHostPlayerId: string | null;
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
const GUEST_ID_KEY = 'party-hub-join-guest-id';

function getGuestPlayerId() {
  if (typeof window === 'undefined') return '';
  return window.localStorage.getItem(GUEST_ID_KEY) ?? '';
}

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
  gameHostPlayerId: null,
  countdownValue: 3,
  correctPlayers: [],
  currentQuestion: null,
};

const answerVariants = {
  idle: { scale: 1, x: 0 },
  correct: { scale: [1, 1.03, 1] },
  wrong: { x: [-6, 6, -6, 0] },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function QuizPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const { locale } = useTranslation();
  const { user } = useAuth();
  const { emit, on, isConnected } = useSocket();
  const router = useRouter();
  useNavigateOnGameEnd(roomId);

  const [gameState, setGameState] = useState<QuizGameState>(INITIAL_STATE);
  const [guestPlayerId, setGuestPlayerId] = useState('');
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef(3);
  const gameStateRef = useRef<QuizGameState>(INITIAL_STATE);
  const isHostRef = useRef(false);
  const isGameHostRef = useRef(false);

  const { tick: timerTick, stop: stopTimerSound, warmup: warmupSound } = useTimerSound();

  // Host-only state: the actual question objects (not sent to clients, only question data is synced)
  const questionsRef = useRef<QuizQuestion[]>([]);
  const shownIdsRef = useRef<Set<string>>(new Set());

  const effectivePlayerId = user?.id ?? guestPlayerId;
  const isHost = gameState.players.find((p) => p.id === user?.id)?.isHost ?? false;
  const isGameHost = Boolean(effectivePlayerId && gameState.gameHostPlayerId && effectivePlayerId === gameState.gameHostPlayerId);
  const myAnswer = effectivePlayerId ? gameState.answers[effectivePlayerId] : undefined;
  const totalPlayers = gameState.players.length;
  const answeredCount = Object.keys(gameState.answers).length;
  const allAnswered = totalPlayers > 0 && answeredCount >= totalPlayers;

  useEffect(() => {
    queueMicrotask(() => setGuestPlayerId(getGuestPlayerId()));
  }, []);

  // Auto-reconnect: re-join room channel on socket reconnect (e.g. page refresh mid-game)
  useEffect(() => {
    if (!user || !isConnected || !roomId) return;
    emit(
      'room:join',
      { code: roomId, playerId: user.id, nickname: user.nickname, isReconnect: true },
      (res: unknown) => {
        const response = res as { success: boolean; error?: string };
        if (!response.success) {
          // Kicked (grace expired) or room gone — send to home
          router.push('/');
        }
      }
    );
  }, [isConnected, emit, user, roomId, router]);

  useEffect(() => {
    isHostRef.current = isHost;
    isGameHostRef.current = isGameHost;
  }, [isHost, isGameHost]);

  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  const timePerQuestion = gameState.config.difficulty === 'easy' ? 15
    : gameState.config.difficulty === 'hard' ? 25 : 20;

  useEffect(() => {
    if (!isGameHost) return;
    const raw = localStorage.getItem('party-hub-quiz-config');
    if (!raw) return;

    try {
      const config = JSON.parse(raw) as {
        mode: 'general' | 'special';
        difficulty: string;
        topic: string;
        specialQuizId: string | null;
      };
      localStorage.removeItem('party-hub-quiz-config');

      if (config.mode === 'general') {
        const newConfig: QuizConfig = {
          mode: 'general',
          difficulty: config.difficulty as QuizDifficulty,
          topic: config.topic as QuizTopic,
          specialTheme: null,
          specialQuizId: null,
        };
        const questions = getQuizQuestions(newConfig.topic!, newConfig.difficulty!, shownIdsRef.current);
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
      } else if (config.mode === 'special' && config.specialQuizId) {
        const specialQuiz = SPECIAL_QUIZZES.find((quiz) => quiz.id === config.specialQuizId);
        const newConfig: QuizConfig = {
          mode: 'special',
          difficulty: null,
          topic: null,
          specialTheme: specialQuiz?.theme ?? null,
          specialQuizId: config.specialQuizId,
        };
        const questions = getSpecialQuizQuestions(config.specialQuizId, shownIdsRef.current);
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
      }
    } catch {
      localStorage.removeItem('party-hub-quiz-config');
    }
  }, [emit, isGameHost, roomId]);

  // ------- Socket listeners -------

  useEffect(() => {
    const unsub1 = on('room:state', (data: unknown) => {
      const room = data as {
        players: { id: string; nickname: string; isHost: boolean }[];
        gameHostPlayerId?: string | null;
      };
      setGameState((prev) => ({
        ...prev,
        players: room.players,
        gameHostPlayerId: room.gameHostPlayerId ?? prev.gameHostPlayerId,
      }));
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

        case 'quiz:request-state':
          // TV joined mid-game — host re-broadcasts current state
          if (isGameHostRef.current) {
            emit('game:action', { code: roomId, action: 'quiz:sync', payload: gameStateRef.current as unknown as Record<string, unknown> });
          }
          break;
      }
    });

    emit('room:get-state', { code: roomId });

    return () => {
      unsub1();
      unsub2();
    };
  }, [on, emit, roomId]);

  // ------- Host timer logic -------

  useEffect(() => {
    if (!isGameHost) return;
    if (gameState.phase !== 'question' || gameState.showCorrect) return;

    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      setGameState((prev) => {
        const next = prev.timeLeft - 1;
        if (next <= 0) {
          if (timerRef.current) clearInterval(timerRef.current);
          emit('game:action', {
            code: roomId,
            action: 'quiz:timer',
            payload: { timeLeft: 0 },
          });
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
  }, [isGameHost, gameState.phase, gameState.showCorrect, gameState.questionIndex, emit, roomId]);

  // ------- Timer sound effect -------

  useEffect(() => {
    if (gameState.phase === 'question' && !gameState.showCorrect) {
      timerTick(gameState.timeLeft, timePerQuestion);
    } else {
      stopTimerSound();
    }
  }, [gameState.timeLeft, gameState.phase, gameState.showCorrect, timePerQuestion, timerTick, stopTimerSound]);

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
  }, [gameState.currentQuestion, gameState.answers, gameState.scores, emit, roomId]);

  // ------- Auto-reveal -------

  useEffect(() => {
    if (!isGameHost || gameState.phase !== 'question' || gameState.showCorrect) return;
    if (gameState.timeLeft <= 0 || allAnswered) {
      queueMicrotask(revealResults);
    }
  }, [gameState.timeLeft, allAnswered, isGameHost, gameState.phase, gameState.showCorrect, revealResults]);

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

  const runCountdown = (questionIdx: number) => {
    countdownRef.current = 3;
    setGameState((prev) => ({ ...prev, phase: 'countdown', countdownValue: countdownRef.current }));
    emit('game:action', {
      code: roomId,
      action: 'quiz:countdown',
      payload: { value: countdownRef.current },
    });

    const interval = setInterval(() => {
      countdownRef.current -= 1;
      if (countdownRef.current <= 0) {
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
        setGameState((prev) => ({ ...prev, countdownValue: countdownRef.current }));
        emit('game:action', {
          code: roomId,
          action: 'quiz:countdown',
          payload: { value: countdownRef.current },
        });
      }
    }, 1000);
  };

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

  const startQuestionImmediate = (questionIdx: number) => {
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
  };

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
    if (myAnswer !== undefined || gameState.showCorrect || !effectivePlayerId) return;

    emit('game:action', {
      code: roomId,
      action: 'quiz:answer',
      payload: { playerId: effectivePlayerId, answerIndex },
    });
    setGameState((prev) => ({
      ...prev,
      answers: { ...prev.answers, [effectivePlayerId]: answerIndex },
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

  const scoreboard = gameState.players.map((p) => ({
    name: p.nickname,
    score: gameState.scores[p.id] || 0,
    hasAnswered: p.id in gameState.answers,
    isCorrect: gameState.showCorrect && gameState.correctPlayers.includes(p.id),
  }));

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
      scores={scoreboard}
      onEnd={isGameHost ? confirmEndGame : undefined}
      showScoreboard={!isSetup && gameState.phase !== 'waiting' && gameState.phase !== 'countdown'}
      backgroundUrl={backgroundUrl}
      phaseKey={gameState.phase}
    >
      {/* ==================== SETUP: MODE (first step) ==================== */}
      {gameState.phase === 'setup-mode' && (
        <div className="text-center py-8 animate-fade-in max-w-lg mx-auto">
          {isGameHost && (
            <button
              onClick={() => router.push(`/lobby/${roomId}`)}
              className="flex items-center gap-1.5 text-white/70 hover:text-white text-sm mb-6 mx-auto transition-colors"
            >
              ← {locale === 'ru' ? 'В лобби' : 'Back to Lobby'}
            </button>
          )}
          <div className="text-6xl mb-4">🧠</div>
          <h2 className="text-2xl font-bold text-white mb-2">
            {locale === 'ru' ? 'Выберите тип квиза' : 'Choose quiz type'}
          </h2>
          <p className="text-white/80 mb-8">
            {locale === 'ru' ? 'Общие темы или специальные квизы' : 'General topics or special quizzes'}
          </p>

          {isGameHost ? (
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
            <BreathingPlaceholder
              text={locale === 'ru' ? 'Ведущий выбирает тип квиза...' : 'Host is choosing quiz type...'}
              variant="breathing-text"
            />
          )}

          <p className="text-white/30 text-sm mt-6">
            {locale === 'ru' ? `Игроков: ${totalPlayers}` : `Players: ${totalPlayers}`}
          </p>
        </div>
      )}

      {/* ==================== SETUP: DIFFICULTY (after mode=general) ==================== */}
      {gameState.phase === 'setup-difficulty' && (
        <div className="text-center py-8 animate-fade-in max-w-lg mx-auto">
          {isGameHost && (
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

          {isGameHost ? (
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
            <BreathingPlaceholder
              text={locale === 'ru' ? 'Ведущий выбирает сложность...' : 'Host is choosing difficulty...'}
              variant="breathing-text"
            />
          )}
        </div>
      )}

      {/* ==================== SETUP: SPECIAL THEME (after mode=special) ==================== */}
      {gameState.phase === 'setup-special-theme' && (
        <div className="text-center py-8 animate-fade-in max-w-lg mx-auto">
          {isGameHost && (
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

          {isGameHost ? (
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
            <BreathingPlaceholder
              text={locale === 'ru' ? 'Ведущий выбирает тему...' : 'Host is choosing a theme...'}
              variant="breathing-text"
            />
          )}
        </div>
      )}

      {/* ==================== SETUP: SPECIAL QUIZ (after theme chosen) ==================== */}
      {gameState.phase === 'setup-special-quiz' && specialThemeInfo && (
        <div className="text-center py-8 animate-fade-in max-w-lg mx-auto">
          {/* Back button */}
          {isGameHost && (
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

          {isGameHost ? (
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
            <BreathingPlaceholder
              text={locale === 'ru' ? 'Ведущий выбирает квиз...' : 'Host is choosing a quiz...'}
              variant="breathing-text"
            />
          )}
        </div>
      )}

      {/* ==================== SETUP: TOPIC ==================== */}
      {gameState.phase === 'setup-topic' && (
        <div className="text-center py-8 animate-fade-in max-w-lg mx-auto">
          {isGameHost && (
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

          {isGameHost ? (
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
            <BreathingPlaceholder
              text={locale === 'ru' ? 'Ведущий выбирает тему...' : 'Host is choosing topic...'}
              variant="breathing-text"
            />
          )}
        </div>
      )}

      {/* ==================== WAITING (ready to start) ==================== */}
      {gameState.phase === 'waiting' && (
        <div className="text-center pt-2 pb-8 animate-fade-in">
          {isGameHost && (
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
          {isGameHost ? (
            <GlassButton variant="primary" size="lg" className="text-xl px-12 py-5" onClick={startGame}>
              {locale === 'ru' ? 'Начать игру' : 'Start Game'}
            </GlassButton>
          ) : (
            <BreathingPlaceholder
              text={locale === 'ru' ? 'Ожидание ведущего...' : 'Waiting for the host...'}
              variant="breathing-text"
            />
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
            <AnimatePresence mode="wait">
              <motion.div
                key={gameState.countdownValue}
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: [0.5, 1.2, 1], opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0, y: -20 }}
                transition={{ duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
                style={{
                  fontSize: 120,
                  fontWeight: 900,
                  color: '#facc15',
                  textShadow: '0 0 40px rgba(250, 204, 21, 0.6), 0 0 80px rgba(250, 204, 21, 0.3)',
                  lineHeight: 1,
                }}
              >
                {gameState.countdownValue}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* ==================== QUESTION ==================== */}
      {gameState.phase === 'question' && currentQuestion && (
        <div className="max-w-5xl mx-auto w-full relative">
          {/* Timer */}
          <div className="mb-6 flex items-center justify-between">
            <span className="text-sm text-white/40">
              {locale === 'ru' ? 'Вопрос' : 'Question'} {gameState.questionIndex + 1}/{gameState.totalQuestions}
            </span>
            <UrgencyTimer
              total={timePerQuestion}
              current={gameState.timeLeft}
              variant="ring"
              color="var(--color-game-quiz)"
              size="xs"
            />
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

              // Accent strip color (left border)
              const stripColor = isCorrectRevealed
                ? '#4ade80'
                : isWrongRevealed
                  ? '#f87171'
                  : isMyAnswer
                    ? '#facc15'
                    : 'transparent';

              // Button background
              const bgClass = isCorrectRevealed
                ? 'bg-green-500/10 border-green-400/30'
                : isWrongRevealed
                  ? 'bg-red-500/10 border-red-400/30'
                  : isMyAnswer
                    ? 'bg-yellow-500/10 border-yellow-400/40'
                    : isDisabled
                      ? 'bg-white/5 border-white/10 opacity-60'
                      : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20 cursor-pointer';

              return (
                <motion.button
                  key={index}
                  onClick={() => submitAnswer(index)}
                  disabled={isDisabled}
                  className={`relative overflow-hidden rounded-md border p-5 md:p-6 text-left backdrop-blur-xl transition-colors duration-200 ${bgClass}`}
                  variants={answerVariants}
                  animate={
                    isCorrectRevealed
                      ? 'correct'
                      : isWrongRevealed
                        ? 'wrong'
                        : 'idle'
                  }
                  transition={
                    isCorrectRevealed
                      ? { duration: 0.3, ease: [0.34, 1.56, 0.64, 1] }
                      : isWrongRevealed
                        ? { duration: 0.35, ease: 'easeInOut' }
                        : { duration: 0.2 }
                  }
                  whileHover={!isDisabled ? { scale: 1.01 } : {}}
                  whileTap={!isDisabled ? { scale: 0.98 } : {}}
                >
                  {/* Left accent strip */}
                  <div
                    className="absolute left-0 inset-y-0 w-1.5 transition-colors duration-200"
                    style={{ backgroundColor: stripColor }}
                  />

                  <div className="flex items-center gap-4 pl-3">
                    {/* Number badge */}
                    <span className={`
                      flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center text-sm font-black
                      ${isCorrectRevealed
                        ? 'bg-green-500/20 text-green-300'
                        : isWrongRevealed
                          ? 'bg-red-500/20 text-red-300'
                          : isMyAnswer
                            ? 'bg-yellow-500/20 text-yellow-300'
                            : 'bg-white/8 text-white/50'
                      }
                    `}>
                      {index + 1}
                    </span>

                    {/* Answer text */}
                    <span className={`font-medium text-lg md:text-xl ${
                      isCorrectRevealed ? 'text-green-100' : isWrongRevealed ? 'text-red-100' : 'text-white'
                    }`}>
                      {locale === 'ru' ? option.ru : option.en}
                    </span>

                    {/* Reveal icon — checkmark or X (Variant B) */}
                    <AnimatePresence>
                      {(isCorrectRevealed || isWrongRevealed) && (
                        <motion.span
                          className="ml-auto flex-shrink-0"
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ duration: 0.2, ease: [0.34, 1.56, 0.64, 1] }}
                        >
                          {isCorrectRevealed ? (
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M5 13l4 4L19 7" />
                            </svg>
                          ) : (
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M18 6L6 18M6 6l12 12" />
                            </svg>
                          )}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.button>
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
              <div className={`p-5 rounded-2xl border backdrop-blur-2xl ${
                gameState.correctPlayers.length > 0
                  ? 'bg-green-900/40 border-green-400/40'
                  : 'bg-red-900/40 border-red-400/40'
              }`}>
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
              </div>

              {isGameHost && (
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
          <h2 className="text-3xl font-bold text-white mb-2">
            {locale === 'ru' ? 'Промежуточные результаты' : 'Halftime Results'}
          </h2>
          <p className="text-white/80 mb-6">
            {locale === 'ru' ? `После ${gameState.questionIndex + 1} из ${gameState.totalQuestions} вопросов` : `After ${gameState.questionIndex + 1} of ${gameState.totalQuestions} questions`}
          </p>

          <div className="space-y-3 mb-8">
            {scoreboard.map((entry, i) => (
              <div
                key={entry.name}
                className={`p-4 flex items-center justify-between rounded-2xl border backdrop-blur-2xl transition-all ${
                  i === 0 ? 'bg-white/10 border-yellow-400/50 ring-2 ring-yellow-400/30'
                    : i === 1 ? 'bg-white/10 border-white/15 ring-1 ring-white/15'
                      : i === 2 ? 'bg-white/10 border-amber-600/30 ring-1 ring-amber-600/20'
                        : 'bg-white/10 border-white/10'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl w-8 text-center">
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`}
                  </span>
                  <span className="text-white font-semibold text-lg">{entry.name}</span>
                </div>
                <AnimatedScore value={entry.score} variant="pop" size="sm" color="#a855f7" />
              </div>
            ))}
          </div>

          {isGameHost && (
            <GlassButton variant="primary" size="lg" onClick={() => startQuestionImmediate(5)}>
              {locale === 'ru' ? 'Продолжить' : 'Continue'}
            </GlassButton>
          )}
          {!isGameHost && (
            <BreathingPlaceholder
              text={locale === 'ru' ? 'Ожидание ведущего...' : 'Waiting for the host...'}
              variant="breathing-text"
            />
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
              <div
                key={entry.name}
                className={`p-4 flex items-center justify-between rounded-2xl border backdrop-blur-2xl transition-all ${
                  i === 0 ? 'bg-white/10 border-yellow-400/50 ring-2 ring-yellow-400/30'
                    : i === 1 ? 'bg-white/10 border-white/15 ring-1 ring-white/15'
                      : i === 2 ? 'bg-white/10 border-amber-600/30 ring-1 ring-amber-600/20'
                        : 'bg-white/10 border-white/10'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl w-8 text-center">
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`}
                  </span>
                  <span className="text-white font-semibold text-lg">{entry.name}</span>
                </div>
                <AnimatedScore value={entry.score} variant="pop" size="sm" color="#a855f7" />
              </div>
            ))}
          </div>

          {isGameHost && (
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
