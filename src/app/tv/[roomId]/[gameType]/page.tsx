'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSocket } from '@/lib/use-socket';
import { useTranslation } from '@/lib/i18n';
import { GAMES } from '@/lib/games-config';
import { QUIZ_TOPICS, QUIZ_DIFFICULTIES } from '@/lib/quiz';
import { ROUNDS as H2O_ROUNDS, ROUND_NAMES as H2O_ROUND_NAMES, BIG_Q as H2O_BIG_Q, getDisplayPts as h2oGetDisplayPts } from '@/lib/hundred-to-one/questions';
import { CROCODILE_WORDS, ALIAS_WORDS } from '@/lib/game-data';

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

interface H2OAnsState { rev: boolean; pub: boolean; to: number; }
interface H2OState {
  phase: string;
  curQ: number;
  t1n: string; t2n: string;
  t1s: number; t2s: number;
  qState: H2OAnsState[][];
  strikes: number[][];
  roundActiveTeam: number[];
  roundFund: number[];
  roundPhase: string[];
  r4Time: number;
  bgPhase: number;
  bgP1Ans: string[]; bgP2Ans: string[];
  bgP1Matched: (string | null)[]; bgP2Matched: (string | null)[];
  bgFund: number; bgCurQ: number; bgTimeLeft: number;
  bgP1Id: string; bgP2Id: string;
  winTeam: number;
  buzzerWinner: number; buzzerCountdown: number;
}

const mkH2OInitial = (): H2OState => ({
  phase: 'roleSelect', curQ: 0,
  t1n: 'Команда 1', t2n: 'Команда 2', t1s: 0, t2s: 0,
  qState: H2O_ROUNDS.map(r => r.answers.map(() => ({ rev: false, pub: false, to: 0 }))),
  strikes: [[0, 0], [0, 0], [0, 0]],
  roundActiveTeam: [0, 0, 0], roundFund: [0, 0, 0],
  roundPhase: ['start', 'start', 'start'],
  r4Time: 60, bgPhase: 0, bgP1Ans: [], bgP2Ans: [],
  bgP1Matched: [], bgP2Matched: [],
  bgFund: 0, bgCurQ: 0, bgTimeLeft: 0,
  bgP1Id: '', bgP2Id: '', winTeam: 0,
  buzzerWinner: 0, buzzerCountdown: -1,
});

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
  const [h2oState, setH2OState] = useState<H2OState>(mkH2OInitial);
  const [spyState, setSpyState] = useState<{ phase: string; mode: string; word: string; spyId: string; drawerId: string }>({
    phase: 'modeSelect', mode: 'guess', word: '', spyId: '', drawerId: '',
  });
  const spyCanvasRef = useRef<HTMLCanvasElement>(null);
  const spyCanvasSizeRef = useRef({ w: 0, h: 0 });
  const [crocState, setCrocState] = useState<{
    phase: string; explainerId: string; currentWordIndex: number;
    timeLeft: number; scores: Record<string, number>; wordsGuessed: number;
    playersOrder: string[]; completedExplainers: string[];
  }>({ phase: 'waiting', explainerId: '', currentWordIndex: -1, timeLeft: 60, scores: {}, wordsGuessed: 0, playersOrder: [], completedExplainers: [] });
  const [aliasState, setAliasState] = useState<{
    phase: string; mode: string; teams: { id: string; name: string; playerIds: string[]; score: number }[];
    activeTeamIndex: number; explainerIndex: number; currentWordIndex: number;
    timeLeft: number; wordsGuessed: number; wordsSkipped: number;
    round: number; totalRounds: number;
    turnHistory: { word: { ru: string; en: string }; guessed: boolean }[];
    currentLetter: string;
  }>({
    phase: 'waiting', mode: 'classic', teams: [], activeTeamIndex: 0, explainerIndex: 0,
    currentWordIndex: -1, timeLeft: 60, wordsGuessed: 0, wordsSkipped: 0,
    round: 1, totalRounds: 4, turnHistory: [], currentLetter: '',
  });

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

      if (gameType === 'spy') {
        if (action === 'spy:sync') {
          setSpyState(prev => ({ ...prev, ...(payload as Partial<typeof prev>) }));
        }
        if (action === 'spy:stroke') {
          const { x1, y1, x2, y2 } = payload as unknown as { x1: number; y1: number; x2: number; y2: number };
          const canvas = spyCanvasRef.current;
          if (canvas) {
            const ctx = canvas.getContext('2d');
            const { w, h } = spyCanvasSizeRef.current;
            if (ctx && w > 0) {
              ctx.strokeStyle = '#fbbf24';
              ctx.lineWidth = 4;
              ctx.lineCap = 'round';
              ctx.lineJoin = 'round';
              ctx.beginPath();
              ctx.moveTo(x1 * w, y1 * h);
              ctx.lineTo(x2 * w, y2 * h);
              ctx.stroke();
            }
          }
        }
        if (action === 'spy:clear') {
          const canvas = spyCanvasRef.current;
          if (canvas) {
            const ctx = canvas.getContext('2d');
            if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
          }
        }
      }

      if (gameType === 'crocodile') {
        if (action === 'croc:state') {
          setCrocState(prev => ({ ...prev, ...(payload as Partial<typeof prev>) }));
        }
        if (action === 'croc:tick') {
          setCrocState(prev => ({ ...prev, timeLeft: (payload as unknown as { timeLeft: number }).timeLeft }));
        }
      }

      if (gameType === 'alias') {
        if (action === 'alias:state') {
          setAliasState(prev => ({ ...prev, ...(payload as Partial<typeof prev>) }));
        }
        if (action === 'alias:tick') {
          setAliasState(prev => ({ ...prev, timeLeft: (payload as unknown as { timeLeft: number }).timeLeft }));
        }
      }

      if (gameType === 'hundred-to-one') {
        if (action === 'h2o:sync') {
          setH2OState(prev => ({ ...prev, ...(payload as Partial<H2OState>) }));
        }
      }

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
    // Request full 100к1 state so TV catches up if joining late
    if (gameType === 'hundred-to-one') {
      emit('game:action', { code: roomId, action: 'h2o:request-state', payload: {} });
    }

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

  // ===================== 100 к 1 TV RENDER =====================
  if (gameType === 'hundred-to-one') {
    const h = h2oState;
    const q = H2O_ROUNDS[h.curQ];
    const activeTeam = h.roundActiveTeam[h.curQ] || 0;

    return (
      <div className="h-screen bg-gradient-main text-white flex flex-col overflow-hidden">
        {/* Top bar */}
        <div className="flex items-center justify-between px-8 py-3 bg-black/20 backdrop-blur-sm border-b border-white/10 flex-shrink-0">
          <div className="flex items-center gap-4">
            <span className="text-4xl">💯</span>
            <h1 className="text-3xl font-bold">100 к 1</h1>
            {(h.phase === 'playing' || h.phase === 'buzzer') && (
              <span className="glass-badge px-3 py-1 text-sm text-amber-300 font-bold">
                РАУНД {h.curQ + 1}/4 · {H2O_ROUND_NAMES[h.curQ]}
              </span>
            )}
          </div>
          {/* Team scores */}
          <div className="flex items-center gap-4">
            <div className={`px-5 py-2 rounded-xl border-2 transition-all ${activeTeam === 1 ? 'bg-yellow-500/30 border-yellow-400 shadow-lg shadow-yellow-500/30' : 'bg-white/5 border-white/10 opacity-60'}`}>
              <span className="text-sm font-bold text-yellow-300 mr-3">{h.t1n}</span>
              <span className="text-2xl font-black">{h.t1s}</span>
            </div>
            <div className={`px-5 py-2 rounded-xl border-2 transition-all ${activeTeam === 2 ? 'bg-red-500/30 border-red-400 shadow-lg shadow-red-500/30' : 'bg-white/5 border-white/10 opacity-60'}`}>
              <span className="text-sm font-bold text-red-300 mr-3">{h.t2n}</span>
              <span className="text-2xl font-black">{h.t2s}</span>
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 flex flex-col items-center justify-center px-8 py-6 min-h-0 overflow-hidden">
          {/* Title/waiting phases */}
          {(h.phase === 'roleSelect' || h.phase === 'teamNames' || h.phase === 'captainSelect' || h.phase === 'title' || h.phase === 'teams' || h.phase === 'rules') && (
            <div className="text-center animate-fade-in">
              <div className="text-9xl mb-6">💯</div>
              <h2 className="text-6xl font-black mb-4">100 К 1</h2>
              <p className="text-2xl text-white/50 animate-pulse">
                {h.phase === 'roleSelect' ? 'Распределение ролей...' :
                 h.phase === 'captainSelect' ? 'Выбор капитанов...' :
                 h.phase === 'teamNames' ? 'Команды выбирают названия...' :
                 'Подготовка к игре...'}
              </p>
            </div>
          )}

          {/* Buzzer phase */}
          {h.phase === 'buzzer' && (
            <div className="text-center animate-fade-in">
              <h2 className="text-4xl font-bold text-amber-400 mb-6">КТО БЫСТРЕЕ?</h2>
              {h.buzzerCountdown > 0 ? (
                <div className="text-[14rem] font-black leading-none text-red-400 animate-pulse">
                  {h.buzzerCountdown}
                </div>
              ) : h.buzzerCountdown === 0 && h.buzzerWinner === 0 ? (
                <div className="text-8xl font-black text-green-400 animate-pulse">ЖМИ!</div>
              ) : h.buzzerWinner !== 0 ? (
                <div>
                  <div className="text-7xl font-black mb-3" style={{ color: h.buzzerWinner === 1 ? '#fbbf24' : '#f87171' }}>
                    {h.buzzerWinner === 1 ? h.t1n : h.t2n}
                  </div>
                  <p className="text-2xl text-white/50">Играет первым!</p>
                </div>
              ) : (
                <p className="text-2xl text-white/50">Готовьтесь...</p>
              )}
            </div>
          )}

          {/* Playing phase */}
          {h.phase === 'playing' && q && (
            <div className="w-full max-w-6xl flex flex-col items-center">
              {/* Question */}
              <div className="glass-card p-6 mb-6 w-full text-center bg-amber-900/25 border-amber-500/50">
                <p className="text-xs text-amber-400/70 font-bold tracking-widest mb-2">ВОПРОС</p>
                <p className="text-4xl font-bold">{q.q}</p>
              </div>

              {/* Answers grid */}
              <div className="grid grid-cols-2 gap-3 w-full mb-4">
                {q.answers.map((a, idx) => {
                  const revealed = h.qState[h.curQ]?.[idx]?.pub;
                  const pts = h2oGetDisplayPts(h.curQ, idx, a.p);
                  return (
                    <div key={idx} className={`rounded-xl border-2 p-4 flex items-center justify-between transition-all ${revealed ? 'bg-yellow-400/25 border-yellow-400/60' : 'bg-white/5 border-white/10'}`}>
                      <div className="flex items-center gap-4">
                        <span className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl font-bold ${revealed ? 'bg-amber-500 text-black' : 'bg-white/10 text-white/30'}`}>
                          {idx + 1}
                        </span>
                        {revealed
                          ? <span className="text-2xl font-bold uppercase tracking-wide">{a.t}</span>
                          : <span className="text-3xl text-white/15 tracking-[10px]">? ? ?</span>}
                      </div>
                      {revealed
                        ? <span className="bg-amber-600 rounded-lg px-4 py-2 text-2xl font-bold">{pts}</span>
                        : <span className="text-white/10 text-2xl">?</span>}
                    </div>
                  );
                })}
              </div>

              {/* Bottom bar: strikes, fund, timer */}
              <div className="w-full flex items-center justify-between gap-4">
                {h.curQ <= 2 && (
                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-yellow-300/70 font-bold">{h.t1n}</span>
                      {[0, 1, 2].map(i => (
                        <div key={i} className={`w-8 h-8 rounded-full flex items-center justify-center text-lg font-bold transition-all
                          ${i < h.strikes[h.curQ][0] ? 'bg-red-500/40 text-red-300 scale-110' : 'bg-white/5 text-white/15'}`}>✕</div>
                      ))}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-red-300/70 font-bold">{h.t2n}</span>
                      {[0, 1, 2].map(i => (
                        <div key={i} className={`w-8 h-8 rounded-full flex items-center justify-center text-lg font-bold transition-all
                          ${i < h.strikes[h.curQ][1] ? 'bg-red-500/40 text-red-300 scale-110' : 'bg-white/5 text-white/15'}`}>✕</div>
                      ))}
                    </div>
                  </div>
                )}
                {h.curQ <= 2 && (
                  <div className="text-center">
                    <span className="text-xs text-white/40 font-bold">БАНК: </span>
                    <span className="font-black text-3xl text-yellow-300">{h.roundFund[h.curQ]}</span>
                  </div>
                )}
                {h.curQ === 3 && (
                  <div className="mx-auto text-center">
                    <span className="text-xs text-white/40 font-bold">ОБСУЖДЕНИЕ: </span>
                    <span className={`font-black text-4xl ${h.r4Time <= 10 && h.r4Time > 0 ? 'text-red-400 animate-pulse' : 'text-yellow-300'}`}>
                      {Math.floor(h.r4Time / 60)}:{(h.r4Time % 60).toString().padStart(2, '0')}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Results phase */}
          {h.phase === 'results' && (
            <div className="text-center animate-fade-in">
              <h2 className="text-5xl font-bold text-amber-400 mb-8">ИТОГИ 4 РАУНДОВ</h2>
              <div className="flex items-center justify-center gap-10 mb-8">
                <div className="glass-card p-6 border-yellow-400/60 bg-yellow-500/10">
                  <p className="text-xl text-yellow-300 font-bold mb-2">{h.t1n}</p>
                  <p className="text-7xl font-black">{h.t1s}</p>
                </div>
                <div className="text-4xl text-white/30">VS</div>
                <div className="glass-card p-6 border-red-400/60 bg-red-500/10">
                  <p className="text-xl text-red-300 font-bold mb-2">{h.t2n}</p>
                  <p className="text-7xl font-black">{h.t2s}</p>
                </div>
              </div>
              <p className="text-2xl text-white/50">
                Побеждает: <span className="font-bold text-amber-300">{h.t1s >= h.t2s ? h.t1n : h.t2n}</span>
              </p>
            </div>
          )}

          {/* Big Game phase */}
          {h.phase === 'bigGame' && (
            <div className="w-full max-w-5xl flex flex-col items-center">
              <h2 className="text-4xl font-bold text-amber-400 mb-2">БОЛЬШАЯ ИГРА</h2>
              {h.bgPhase >= 1 && h.bgPhase <= 4 && (
                <p className="text-xl text-yellow-300 font-bold mb-3">
                  {h.bgPhase === 1 ? 'ИГРОК 1 — 30 СЕК' : h.bgPhase === 2 ? 'ПРОВЕРКА ИГРОКА 1' : h.bgPhase === 3 ? 'ИГРОК 2 — 40 СЕК' : 'ПРОВЕРКА ИГРОКА 2'}
                </p>
              )}
              {(h.bgPhase === 1 || h.bgPhase === 3) && h.bgTimeLeft > 0 && (
                <div className={`text-7xl font-black mb-3 ${h.bgTimeLeft <= 5 ? 'text-red-400 animate-pulse' : 'text-white'}`}>
                  {h.bgTimeLeft}
                </div>
              )}
              <div className="w-full space-y-2 mb-4">
                {H2O_BIG_Q.map((qq, i) => {
                  const ans = h.bgPhase <= 2 ? h.bgP1Ans[i] : h.bgP2Ans[i];
                  const matched = h.bgPhase <= 2 ? h.bgP1Matched[i] : h.bgP2Matched[i];
                  const isChecked = h.bgPhase === 2 || h.bgPhase === 4;
                  return (
                    <div key={i} className="glass-card p-3 flex items-center gap-3">
                      <span className="text-amber-400 font-bold text-xl w-8">{i + 1}.</span>
                      <span className="text-lg font-bold flex-1">{qq.q}</span>
                      <span className={`text-lg font-bold ${ans ? 'text-yellow-300' : 'text-white/30 italic'}`}>
                        {ans || '...'}
                      </span>
                      {isChecked && (
                        <span className={`font-bold text-lg min-w-[50px] text-right ${matched ? 'text-green-400' : 'text-red-400'}`}>
                          {matched ? `+${qq.answers.find(a => a.t === matched)?.p || 0}` : '✗'}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
              {h.bgPhase >= 2 && (
                <p className={`text-center font-black text-5xl ${h.bgFund >= 200 ? 'text-green-400 animate-pulse' : 'text-yellow-300'}`}>
                  ФОНД: {h.bgFund}
                </p>
              )}
            </div>
          )}

          {/* Final phase */}
          {h.phase === 'final' && (
            <div className="text-center animate-fade-in">
              <div className="text-9xl mb-6">🏆</div>
              {h.bgFund >= 200 ? (
                <>
                  <h2 className="text-6xl font-black text-green-400 mb-4">ПОБЕДА!</h2>
                  <p className="text-2xl text-white/60">Фонд: {h.bgFund} · Команда «{h.winTeam === 1 ? h.t1n : h.t2n}»</p>
                </>
              ) : (
                <>
                  <h2 className="text-5xl font-black text-amber-400 mb-4">ИГРА ОКОНЧЕНА</h2>
                  <p className="text-2xl text-white/60">Фонд: {h.bgFund} — не хватило до 200</p>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ===================== SPY TV RENDER =====================
  if (gameType === 'spy') {
    const sp = spyState;
    const drawerName = players.find(p => p.id === sp.drawerId)?.nickname || '???';

    // Init canvas on first render
    const initSpyCanvas = useCallback((canvas: HTMLCanvasElement | null) => {
      if (!canvas) return;
      spyCanvasRef.current = canvas;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * 2;
      canvas.height = rect.height * 2;
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.scale(2, 2);
      spyCanvasSizeRef.current = { w: rect.width, h: rect.height };
    }, []);

    return (
      <div className="h-screen bg-gradient-main text-white flex flex-col overflow-hidden">
        {/* Top bar */}
        <div className="flex items-center justify-between px-8 py-4 bg-black/20 backdrop-blur-sm border-b border-white/10 flex-shrink-0">
          <div className="flex items-center gap-4">
            <span className="text-4xl">🕵️‍♂️</span>
            <h1 className="text-3xl font-bold">Шпион</h1>
            {sp.phase === 'playing' && (
              <span className="glass-badge px-3 py-1 text-sm font-bold">
                {sp.mode === 'guess' ? '💬 Угадай слово' : '🎨 Нарисуй'}
              </span>
            )}
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 flex flex-col items-center justify-center px-8 py-6 min-h-0 overflow-hidden">
          {sp.phase === 'modeSelect' && (
            <div className="text-center animate-fade-in">
              <div className="text-9xl mb-6">🕵️‍♂️</div>
              <h2 className="text-6xl font-black mb-4">ШПИОН</h2>
              <p className="text-2xl text-white/50 animate-pulse">Выбор режима...</p>
            </div>
          )}

          {sp.phase === 'playing' && sp.mode === 'guess' && (
            <div className="text-center animate-fade-in">
              <p className="text-xl text-white/50 mb-4">Игра идёт — слушайте и наблюдайте!</p>
              <div className="text-9xl mb-6">💬</div>
              <h2 className="text-5xl font-bold text-amber-400">Угадай слово</h2>
              <p className="text-2xl text-white/40 mt-4">Кто же шпион?</p>
            </div>
          )}

          {sp.phase === 'playing' && sp.mode === 'draw' && (
            <div className="flex flex-col items-center w-full h-full min-h-0">
              {/* Drawer label */}
              <p className="text-2xl mb-3 shrink-0">
                <span className="text-white/50">Рисует: </span>
                <span className="font-bold text-amber-400">{drawerName}</span>
              </p>

              {/* Synced canvas — constrained to available height */}
              <div className="flex-1 min-h-0 w-full flex items-center justify-center">
                <canvas
                  ref={initSpyCanvas}
                  className="rounded-2xl bg-black/30 border-2 border-white/10"
                  style={{ width: 'min(100%, calc(100vh - 10rem))', aspectRatio: '1' }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ===================== CROCODILE TV RENDER =====================
  if (gameType === 'crocodile') {
    const explainerName = getPlayerName(crocState.explainerId);
    const currentRound = crocState.completedExplainers.length + 1;
    const totalRounds = crocState.playersOrder.length || players.length;
    const sortedScores = Object.entries(crocState.scores)
      .map(([id, score]) => ({ id, name: getPlayerName(id), score }))
      .sort((a, b) => b.score - a.score);
    const currentWord = crocState.currentWordIndex >= 0 ? CROCODILE_WORDS[crocState.currentWordIndex] : null;

    return (
      <div className="h-screen bg-gradient-main text-white flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-4 bg-black/20 backdrop-blur-sm border-b border-white/10 flex-shrink-0">
          <div className="flex items-center gap-4">
            <span className="text-4xl">🐊</span>
            <h1 className="text-3xl font-bold">{locale === 'ru' ? 'Крокодил' : 'Crocodile'}</h1>
          </div>
          {crocState.phase === 'explaining' && (
            <div className="flex items-center gap-3">
              <span className="text-white/50 text-lg">Ход {currentRound} / {totalRounds}</span>
            </div>
          )}
        </div>

        <div className="flex-1 flex flex-col items-center justify-center px-8 gap-6">
          {/* WAITING */}
          {crocState.phase === 'waiting' && (
            <div className="text-center">
              <div className="text-8xl mb-6">🐊</div>
              <h2 className="text-4xl font-bold mb-4">{locale === 'ru' ? 'Ожидание начала...' : 'Waiting to start...'}</h2>
              <div className="mt-6 flex items-center justify-center gap-4 flex-wrap">
                {players.map(p => (
                  <div key={p.id} className="glass-card px-6 py-3">
                    <span className="text-xl">{p.nickname}</span>
                    {p.isHost && <span className="ml-2">👑</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* EXPLAINING */}
          {crocState.phase === 'explaining' && (
            <>
              {/* Timer */}
              <div className="text-center">
                <span className={`font-bold text-8xl tabular-nums ${crocState.timeLeft <= 10 ? 'text-red-400 animate-pulse' : 'text-white'}`}>
                  {crocState.timeLeft}
                </span>
              </div>

              {/* Timer bar */}
              <div className="w-full max-w-2xl h-3 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-1000 linear"
                  style={{
                    width: `${(crocState.timeLeft / 60) * 100}%`,
                    background: crocState.timeLeft <= 10 ? 'linear-gradient(90deg, #f87171, #ef4444)' : 'linear-gradient(90deg, #a855f7, #6366f1)',
                  }}
                />
              </div>

              {/* Explainer + word */}
              <div className="glass-card px-12 py-8 text-center">
                <p className="text-white/50 text-xl mb-2">{locale === 'ru' ? 'Объясняет' : 'Explaining'}</p>
                <p className="text-4xl font-bold text-amber-400 mb-4">🎤 {explainerName}</p>
                {currentWord && (
                  <>
                    <p className="text-white/40 text-lg mb-1">{locale === 'ru' ? 'Слово' : 'Word'}</p>
                    <p className="text-5xl font-extrabold text-white">{locale === 'ru' ? currentWord.ru : currentWord.en}</p>
                  </>
                )}
              </div>

              {/* Words guessed this turn */}
              <p className="text-2xl text-white/60">
                {locale === 'ru' ? 'Угадано в этом ходе:' : 'Guessed this turn:'}{' '}
                <span className="font-bold text-green-400">{crocState.wordsGuessed}</span>
              </p>

              {/* Scoreboard */}
              <div className="w-full max-w-xl">
                <div className="grid grid-cols-2 gap-3">
                  {sortedScores.map(({ id, name, score }) => (
                    <div key={id} className={`glass-card px-5 py-3 flex items-center justify-between ${id === crocState.explainerId ? 'outline outline-2 outline-amber-400' : ''}`}>
                      <span className="text-lg font-bold">{name} {id === crocState.explainerId && '🎤'}</span>
                      <span className="text-2xl font-bold text-amber-400">{score}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* FINISHED */}
          {crocState.phase === 'finished' && (
            <div className="text-center">
              <div className="text-8xl mb-4">🏆</div>
              <h2 className="text-4xl font-bold text-amber-400 mb-6">{locale === 'ru' ? 'Игра окончена!' : 'Game Over!'}</h2>
              <div className="w-full max-w-xl mx-auto space-y-3">
                {sortedScores.map(({ id, name, score }, idx) => (
                  <div key={id} className={`glass-card px-8 py-4 flex items-center justify-between ${idx === 0 ? 'outline outline-2 outline-amber-400 bg-amber-500/10' : ''}`}>
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}.`}</span>
                      <span className="text-2xl font-bold">{name}</span>
                    </div>
                    <span className="text-3xl font-bold text-amber-400">{score}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ===================== ALIAS TV RENDER =====================
  if (gameType === 'alias') {
    const activeTeam = aliasState.teams[aliasState.activeTeamIndex];
    const explainerId = activeTeam
      ? activeTeam.playerIds[aliasState.explainerIndex % activeTeam.playerIds.length]
      : '';
    const explainerName = getPlayerName(explainerId);
    const currentWord = aliasState.currentWordIndex >= 0 ? ALIAS_WORDS[aliasState.currentWordIndex] : null;

    return (
      <div className="h-screen bg-gradient-main text-white flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-4 bg-black/20 backdrop-blur-sm border-b border-white/10 flex-shrink-0">
          <div className="flex items-center gap-4">
            <span className="text-4xl">💬</span>
            <h1 className="text-3xl font-bold">
              {locale === 'ru' ? 'Угадай слово' : 'Guess the Word'}
              {aliasState.mode === 'letter' && (
                <span className="text-lg text-purple-300 ml-3">
                  {locale === 'ru' ? '(на букву)' : '(letter mode)'}
                </span>
              )}
            </h1>
          </div>
          {aliasState.phase === 'explaining' && (
            <span className="text-white/50 text-lg">
              {locale === 'ru' ? 'Раунд' : 'Round'} {aliasState.round} / {aliasState.totalRounds}
            </span>
          )}
        </div>

        <div className="flex-1 flex flex-col items-center justify-center px-8 gap-6">
          {/* WAITING / MODE SELECT — no game yet */}
          {(aliasState.phase === 'modeSelect' || (aliasState.phase === 'waiting' && aliasState.teams.length === 0)) && (
            <div className="text-center">
              <div className="text-8xl mb-6">💬</div>
              <h2 className="text-4xl font-bold mb-4">{locale === 'ru' ? 'Ожидание начала...' : 'Waiting to start...'}</h2>
              <div className="mt-6 flex items-center justify-center gap-4 flex-wrap">
                {players.map(p => (
                  <div key={p.id} className="glass-card px-6 py-3">
                    <span className="text-xl">{p.nickname}</span>
                    {p.isHost && <span className="ml-2">👑</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* WAITING for explainer to start turn */}
          {aliasState.phase === 'waiting' && aliasState.teams.length > 0 && (
            <>
              {/* Team cards */}
              <div className="flex gap-8 w-full max-w-3xl">
                {aliasState.teams.map((team, ti) => (
                  <div
                    key={team.id}
                    className={`flex-1 glass-card px-8 py-6 text-center ${
                      ti === aliasState.activeTeamIndex ? 'outline outline-2 outline-purple-400' : 'opacity-50'
                    }`}
                  >
                    <p className="text-2xl font-bold mb-2">{team.name}</p>
                    <p className="text-5xl font-bold text-amber-400 mb-3">{team.score}</p>
                    <div className="flex flex-wrap gap-2 justify-center">
                      {team.playerIds.map(id => {
                        const isExp = ti === aliasState.activeTeamIndex && id === explainerId;
                        return (
                          <span key={id} className={`glass-badge text-lg px-3 py-1 ${isExp ? 'outline outline-1 outline-amber-400' : ''}`}>
                            {getPlayerName(id)} {isExp && '🎤'}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-2xl text-white/50">
                {locale === 'ru' ? `${explainerName} начинает ход...` : `${explainerName} starting turn...`}
              </p>
            </>
          )}

          {/* EXPLAINING */}
          {aliasState.phase === 'explaining' && (
            <>
              {/* Timer */}
              <div className="text-center">
                <span className={`font-bold text-8xl tabular-nums ${aliasState.timeLeft <= 10 ? 'text-red-400 animate-pulse' : 'text-white'}`}>
                  {aliasState.timeLeft}
                </span>
              </div>
              <div className="w-full max-w-2xl h-3 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-1000 linear"
                  style={{
                    width: `${(aliasState.timeLeft / 60) * 100}%`,
                    background: aliasState.timeLeft <= 10
                      ? 'linear-gradient(90deg, #f87171, #ef4444)'
                      : 'linear-gradient(90deg, #a855f7, #6366f1)',
                  }}
                />
              </div>

              {/* Explainer + letter + word */}
              <div className="glass-card px-12 py-8 text-center">
                <p className="text-white/50 text-xl mb-2">{locale === 'ru' ? 'Объясняет' : 'Explaining'}</p>
                <p className="text-4xl font-bold text-amber-400 mb-4">🎤 {explainerName}</p>
                {aliasState.mode === 'letter' && aliasState.currentLetter && (
                  <div className="mb-4">
                    <p className="text-white/40 text-lg mb-1">{locale === 'ru' ? 'Буква' : 'Letter'}</p>
                    <p className="text-7xl font-black text-purple-400">{aliasState.currentLetter}</p>
                  </div>
                )}
                {currentWord && (
                  <>
                    <p className="text-white/40 text-lg mb-1">{locale === 'ru' ? 'Слово' : 'Word'}</p>
                    <p className="text-5xl font-extrabold text-white">{locale === 'ru' ? currentWord.ru : currentWord.en}</p>
                  </>
                )}
              </div>

              {/* Stats */}
              <div className="flex gap-8 text-2xl">
                <span className="text-green-400">✅ {aliasState.wordsGuessed}</span>
                <span className="text-red-400">❌ {aliasState.wordsSkipped}</span>
              </div>

              {/* Team scores */}
              <div className="flex gap-8 w-full max-w-2xl">
                {aliasState.teams.map((team, ti) => (
                  <div
                    key={team.id}
                    className={`flex-1 glass-card px-5 py-3 flex items-center justify-between ${
                      ti === aliasState.activeTeamIndex ? 'outline outline-2 outline-purple-400' : 'opacity-50'
                    }`}
                  >
                    <span className="text-lg font-bold">{team.name}</span>
                    <span className="text-2xl font-bold text-amber-400">{team.score}</span>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* TURN RESULT */}
          {aliasState.phase === 'turnResult' && (
            <>
              <div className="text-center">
                <p className="text-4xl font-bold text-amber-400 mb-4">
                  {locale === 'ru' ? 'Время вышло!' : "Time's up!"}
                </p>
                <p className="text-6xl font-bold mb-2">
                  {activeTeam?.name}: {(aliasState.wordsGuessed - aliasState.wordsSkipped) > 0 ? '+' : ''}{aliasState.wordsGuessed - aliasState.wordsSkipped}
                </p>
                <div className="flex gap-8 justify-center text-2xl mt-4">
                  <span className="text-green-400">✅ {locale === 'ru' ? 'Угадано' : 'Guessed'}: {aliasState.wordsGuessed}</span>
                  <span className="text-red-400">❌ {locale === 'ru' ? 'Пропущено' : 'Skipped'}: {aliasState.wordsSkipped}</span>
                </div>
              </div>

              {/* Word history */}
              {aliasState.turnHistory.length > 0 && (
                <div className="w-full max-w-2xl grid grid-cols-2 gap-2 max-h-60 overflow-y-auto">
                  {aliasState.turnHistory.map((item, i) => (
                    <div
                      key={i}
                      className={`glass-card px-4 py-2 flex items-center justify-between ${
                        item.guessed ? 'bg-green-500/10' : 'bg-red-500/10'
                      }`}
                    >
                      <span className="text-lg">{locale === 'ru' ? item.word.ru : item.word.en}</span>
                      <span className="text-xl">{item.guessed ? '✅' : '❌'}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Team scores */}
              <div className="flex gap-8 w-full max-w-2xl">
                {aliasState.teams.map((team) => (
                  <div key={team.id} className="flex-1 glass-card px-5 py-4 text-center">
                    <p className="text-xl font-bold mb-1">{team.name}</p>
                    <p className="text-4xl font-bold text-amber-400">{team.score}</p>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* FINISHED */}
          {aliasState.phase === 'finished' && (
            <div className="text-center">
              <div className="text-8xl mb-4">🏆</div>
              <h2 className="text-4xl font-bold text-amber-400 mb-6">{locale === 'ru' ? 'Игра окончена!' : 'Game Over!'}</h2>
              <div className="w-full max-w-xl mx-auto space-y-3">
                {[...aliasState.teams].sort((a, b) => b.score - a.score).map((team, idx) => (
                  <div
                    key={team.id}
                    className={`glass-card px-8 py-4 flex items-center justify-between ${
                      idx === 0 ? 'outline outline-2 outline-amber-400 bg-amber-500/10' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{idx === 0 ? '🥇' : '🥈'}</span>
                      <span className="text-2xl font-bold">{team.name}</span>
                    </div>
                    <span className="text-3xl font-bold text-amber-400">{team.score}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
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
