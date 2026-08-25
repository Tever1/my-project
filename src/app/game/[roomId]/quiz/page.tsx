'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslation } from '@/lib/i18n';
import { useGameIdentity } from '@/lib/use-game-identity';
import { useSocket } from '@/lib/use-socket';
import { useGameAction } from '@/lib/use-game-action';
import { useNavigateOnGameEnd } from '@/lib/use-navigate-on-game-end';
import { useRoomState } from '@/lib/use-room-state';
import { GlassButton } from '@/components/ui/GlassButton';
import { QuizPulsePlayerScreen } from '@/components/games/quiz-pulse/QuizPulse';
import { QuizDifficulty, QuizTopic, QuizQuestion } from '@/types/game';
import { getQuizQuestions, getSpecialQuizQuestions, QUIZ_TOPICS, QUIZ_DIFFICULTIES, SPECIAL_QUIZZES, SPECIAL_QUIZ_THEMES } from '@/lib/quiz';
import { useTimerSound } from '@/lib/use-timer-sound';

const ROOM_CLOSED_NOTICE_KEY = 'party-hub-room-closed-notice';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Phase = 'waiting' | 'countdown' | 'question' | 'results' | 'mid-leaderboard' | 'final';

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

type PreconfiguredQuizConfig = {
  mode: 'general' | 'special';
  difficulty: string;
  topic: string;
  specialQuizId: string | null;
};

const QUESTIONS_PER_GAME = 10;

const INITIAL_STATE: QuizGameState = {
  phase: 'waiting',
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

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function QuizPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const { locale } = useTranslation();
  const { user, effectivePlayerId } = useGameIdentity(roomId);
  const { emit, on } = useSocket();
  const sendAction = useGameAction(roomId);
  const router = useRouter();
  useNavigateOnGameEnd(roomId, user ? 'lobby' : 'phone');

  const [gameState, setGameState] = useState<QuizGameState>(INITIAL_STATE);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef(3);
  const gameStateRef = useRef<QuizGameState>(INITIAL_STATE);
  const isHostRef = useRef(false);
  const isGameHostRef = useRef(false);
  const appliedPreconfigRef = useRef<string | null>(null);

  const { tick: timerTick, stop: stopTimerSound, warmup: warmupSound } = useTimerSound();

  // Host-only state: the actual question objects (not sent to clients, only question data is synced)
  const questionsRef = useRef<QuizQuestion[]>([]);
  const shownIdsRef = useRef<Set<string>>(new Set());

  const isHost = gameState.players.find((p) => p.id === user?.id)?.isHost ?? false;
  const isGameHost = Boolean(effectivePlayerId && gameState.gameHostPlayerId && effectivePlayerId === gameState.gameHostPlayerId);
  const myAnswer = effectivePlayerId ? gameState.answers[effectivePlayerId] : undefined;
  const totalPlayers = gameState.players.length;
  const answeredCount = Object.keys(gameState.answers).length;
  const allAnswered = totalPlayers > 0 && answeredCount >= totalPlayers;

  useEffect(() => {
    const unsubscribe = on('room:closed', () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      stopTimerSound();
      window.sessionStorage.setItem(ROOM_CLOSED_NOTICE_KEY, '1');
      router.push('/');
    });

    return unsubscribe;
  }, [on, router, stopTimerSound]);

  useEffect(() => {
    isHostRef.current = isHost;
    isGameHostRef.current = isGameHost;
  }, [isHost, isGameHost]);

  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  const timePerQuestion = gameState.config.difficulty === 'easy' ? 15
    : gameState.config.difficulty === 'hard' ? 25 : 20;

  const applyPreconfiguredQuiz = useCallback((config: PreconfiguredQuizConfig) => {
    const key = JSON.stringify(config);
    if (appliedPreconfigRef.current === key) return;
    appliedPreconfigRef.current = key;

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
      sendAction('quiz:config', { config: newConfig, phase: 'waiting', totalQuestions: total });
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
      sendAction('quiz:config', { config: newConfig, phase: 'waiting', totalQuestions: total });
    }
  }, [sendAction]);

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

      applyPreconfiguredQuiz(config);
    } catch {
      localStorage.removeItem('party-hub-quiz-config');
    }
  }, [applyPreconfiguredQuiz, isGameHost]);

  useEffect(() => {
    return on('game:started', (payload: unknown) => {
      const data = payload as { quizConfig?: PreconfiguredQuizConfig | null };
      if (!data.quizConfig || !isGameHostRef.current) return;
      applyPreconfiguredQuiz(data.quizConfig);
    });
  }, [applyPreconfiguredQuiz, on]);

  // ------- Socket listeners -------

  useRoomState(roomId, (data) => {
    const room = data as {
      players: { id: string; nickname: string; isHost: boolean }[];
      gameHostPlayerId?: string | null;
      pendingQuizConfig?: PreconfiguredQuizConfig | null;
    };
    const nextGameHostPlayerId = room.gameHostPlayerId ?? gameStateRef.current.gameHostPlayerId;
    setGameState((prev) => {
      const pendingCfg = room.pendingQuizConfig;
      const configPatch = (pendingCfg && prev.config.specialQuizId === null && pendingCfg.specialQuizId)
        ? {
            config: {
              ...prev.config,
              mode: pendingCfg.mode,
              specialQuizId: pendingCfg.specialQuizId,
              specialTheme: SPECIAL_QUIZZES.find((q) => q.id === pendingCfg.specialQuizId)?.theme ?? null,
            },
          }
        : {};

      return {
        ...prev,
        players: room.players,
        gameHostPlayerId: nextGameHostPlayerId,
        ...configPatch,
      };
    });
    const currentPlayerId = effectivePlayerId;
    const isHostNow = Boolean(
      currentPlayerId &&
      nextGameHostPlayerId &&
      currentPlayerId === nextGameHostPlayerId
    );
    if (room.pendingQuizConfig && isHostNow) {
      applyPreconfiguredQuiz(room.pendingQuizConfig);
    }
  });

  useEffect(() => {
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
            sendAction('quiz:sync', gameStateRef.current);
          }
          break;
      }
    });

    return unsub2;
  }, [on, sendAction]);

  useEffect(() => {
    sendAction('quiz:request-state');

    const handleVisibilityChange = () => {
      if (!document.hidden) sendAction('quiz:request-state');
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [sendAction]);

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
          sendAction('quiz:timer', { timeLeft: 0 });
          return { ...prev, timeLeft: 0 };
        }
        sendAction('quiz:timer', { timeLeft: next });
        return { ...prev, timeLeft: next };
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isGameHost, gameState.phase, gameState.showCorrect, gameState.questionIndex, sendAction]);

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

    sendAction('quiz:show-results', { scores: newScores, correctPlayers: correct });

    emit('game:state-update', {
      code: roomId,
      gameState: { scores: newScores },
    });
  }, [gameState.currentQuestion, gameState.answers, gameState.scores, emit, roomId, sendAction]);

  // ------- Auto-reveal -------

  useEffect(() => {
    if (!isGameHost || gameState.phase !== 'question' || gameState.showCorrect) return;
    if (gameState.timeLeft <= 0 || allAnswered) {
      queueMicrotask(revealResults);
    }
  }, [gameState.timeLeft, allAnswered, isGameHost, gameState.phase, gameState.showCorrect, revealResults]);

  const runCountdown = (questionIdx: number) => {
    countdownRef.current = 3;
    setGameState((prev) => ({ ...prev, phase: 'countdown', countdownValue: countdownRef.current }));
    sendAction('quiz:countdown', { value: countdownRef.current });

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

        sendAction('quiz:start-question', startPayload);
      } else {
        setGameState((prev) => ({ ...prev, countdownValue: countdownRef.current }));
        sendAction('quiz:countdown', { value: countdownRef.current });
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

    sendAction('quiz:sync', { scores: initialScores });

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

    sendAction('quiz:start-question', { questionIndex: questionIdx, timeLeft: q.timeLimit, question: questionData });
  };

  const startNextQuestion = () => {
    const nextIndex = gameState.questionIndex + 1;
    if (nextIndex >= gameState.totalQuestions) {
      setGameState((prev) => ({ ...prev, phase: 'final' }));
      sendAction('quiz:final');
      return;
    }
    // Show mid-game leaderboard after round 5
    if (nextIndex === 5) {
      setGameState((prev) => ({ ...prev, phase: 'mid-leaderboard' }));
      sendAction('quiz:sync', { phase: 'mid-leaderboard' });
      return;
    }
    startQuestionImmediate(nextIndex);
  };

  const submitAnswer = (answerIndex: number) => {
    warmupSound();
    if (myAnswer !== undefined || gameState.showCorrect || !effectivePlayerId) return;

    sendAction('quiz:answer', { playerId: effectivePlayerId, answerIndex });
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
    router.push(user ? `/lobby/${roomId}` : `/join/${roomId}`);
  };

  // ------- Derived data -------

  const scoreboard = gameState.players.map((p) => ({
    name: p.nickname,
    score: gameState.scores[p.id] || 0,
    hasAnswered: p.id in gameState.answers,
    isCorrect: gameState.showCorrect && gameState.correctPlayers.includes(p.id),
  }));

  const currentQuestion = gameState.currentQuestion;
  const topicInfo = gameState.config.topic ? QUIZ_TOPICS.find((t) => t.id === gameState.config.topic) : null;
  const diffInfo = gameState.config.difficulty ? QUIZ_DIFFICULTIES.find((d) => d.id === gameState.config.difficulty) : null;
  const specialQuizInfo = gameState.config.specialQuizId ? SPECIAL_QUIZZES.find((q) => q.id === gameState.config.specialQuizId) : null;
  const specialThemeInfo = gameState.config.specialTheme ? SPECIAL_QUIZ_THEMES.find((t) => t.id === gameState.config.specialTheme) : null;
  const backgroundUrl: string | undefined =
    specialQuizInfo?.backgroundUrl ?? specialThemeInfo?.backgroundUrl ?? undefined;

  // ------- Render -------

  const pulseTopic = specialQuizInfo
    ? (locale === 'ru' ? specialQuizInfo.titleRu : specialQuizInfo.titleEn)
    : specialThemeInfo
      ? (locale === 'ru' ? specialThemeInfo.titleRu : specialThemeInfo.titleEn)
      : topicInfo
        ? (locale === 'ru' ? topicInfo.titleRu : topicInfo.titleEn)
        : (locale === 'ru' ? 'Общий квиз' : 'General quiz');
  const pulseDifficulty = diffInfo ? (locale === 'ru' ? diffInfo.titleRu : diffInfo.titleEn) : undefined;
  const pulseScores = [...scoreboard].sort((a, b) => b.score - a.score);

  return (
    <>
      <QuizPulsePlayerScreen
        locale={locale}
        phase={gameState.phase}
        topic={pulseTopic}
        difficulty={pulseDifficulty}
        backgroundUrl={backgroundUrl}
        question={currentQuestion}
        questionIndex={gameState.questionIndex}
        totalQuestions={gameState.totalQuestions}
        timeLeft={gameState.timeLeft}
        timePerQuestion={timePerQuestion}
        countdownValue={gameState.countdownValue}
        scores={pulseScores}
        totalPlayers={totalPlayers}
        myAnswer={myAnswer}
        showCorrect={gameState.showCorrect}
        myAnswerIsCorrect={myAnswer !== undefined && myAnswer === currentQuestion?.correctIndex}
        isGameHost={isGameHost}
        onAnswer={submitAnswer}
        onStart={startGame}
        onNext={startNextQuestion}
        onContinue={() => startQuestionImmediate(5)}
        onPlayAgain={playAgain}
        onEnd={endGame}
      />

      {showEndConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm"
          onClick={() => setShowEndConfirm(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-white/15 bg-[#07172d]/95 p-6 text-center text-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 className="text-xl font-black">
              {locale === 'ru' ? 'Завершить игру?' : 'End the game?'}
            </h3>
            <p className="mt-2 text-sm text-white/60">
              {locale === 'ru' ? 'Все игроки вернутся в лобби' : 'All players will return to the lobby'}
            </p>
            <div className="mt-6 flex gap-3">
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
    </>
  );
}
