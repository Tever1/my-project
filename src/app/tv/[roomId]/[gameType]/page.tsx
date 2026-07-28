'use client';

import { useEffect, useState, useCallback, useRef, type ReactNode } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useSocket } from '@/lib/use-socket';
import { useGameAction } from '@/lib/use-game-action';
import { useTranslation } from '@/lib/i18n';
import { GAMES } from '@/lib/games-config';
import { useNavigateOnGameEnd } from '@/lib/use-navigate-on-game-end';
import { useRoomState } from '@/lib/use-room-state';
import { GameIcon } from '@/components/GameIcon';
import { CrocIcon } from '@/components/games/CrocIcon';
import { GameSurface } from '@/components/games/GameSurface';
import { AliasIcon } from '@/components/games/AliasIcon';
import { SpyIcon, type SpyIconName } from '@/components/games/SpyIcon';
import { WhoAmIIcon } from '@/components/games/WhoAmIIcon';
import { HundredToOneIcon } from '@/components/games/HundredToOneIcon';
import { QRCodeCanvas } from '@/components/ui/QRCode';
import { PlayerAvatar } from '@/components/ui/PlayerAvatar';
import { QUIZ_TOPICS, QUIZ_DIFFICULTIES, SPECIAL_QUIZZES, SPECIAL_QUIZ_THEMES, getQuizQuestions, getSpecialQuizQuestions } from '@/lib/quiz';
import { ROUNDS as H2O_ROUNDS, ROUND_NAMES as H2O_ROUND_NAMES, BIG_Q as H2O_BIG_Q, TOPICS as H2O_TOPICS, getDisplayPts as h2oGetDisplayPts } from '@/lib/hundred-to-one/questions';
import type { QuizDifficulty, QuizTopic } from '@/types/game';

const ROOM_CLOSED_NOTICE_KEY = 'party-hub-room-closed-notice';

/** Maps gameType to the action that requests a full state broadcast from the host. */
const TV_STATE_REQUEST: Partial<Record<string, string>> = {
  'hundred-to-one': 'h2o:request-state',
  crocodile: 'croc:request-state',
  alias: 'alias:request-state',
  quiz: 'quiz:request-state',
  spy: 'spy:request-state',
};

function QuizIcon({ iconUrl, fallback, size = 20 }: { iconUrl?: string; fallback: string; size?: number }) {
  if (iconUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={iconUrl}
        alt=""
        width={size}
        height={size}
        style={{ objectFit: 'contain', display: 'inline-block', verticalAlign: 'middle' }}
        aria-hidden="true"
      />
    );
  }

  return <span aria-hidden="true">{fallback}</span>;
}

function DifficultyIcon({ difficulty, size = 16 }: { difficulty?: QuizDifficulty | string | null; size?: number }) {
  const color = difficulty === 'easy' ? '#22c55e' : difficulty === 'hard' ? '#ef4444' : '#eab308';

  return (
    <span
      aria-hidden="true"
      className="inline-block rounded-full border border-white/30 align-middle"
      style={{ width: size, height: size, backgroundColor: color, boxShadow: `0 0 ${Math.round(size / 2)}px ${color}66` }}
    />
  );
}

function SpyImg({ name, className }: { name: string; className?: string }) {
  return <SpyIcon name={name as SpyIconName} className={className} style={{ color: '#5eead4' }} />;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PlayerInfo {
  id: string;
  nickname: string;
  isHost: boolean;
  isConnected: boolean;
  isAway?: boolean;
}

interface QuizQuestionData {
  questionRu: string;
  questionEn: string;
  options: { ru: string; en: string }[];
  correctIndex: number;
}

interface QuizConfig {
  mode: string | null;
  difficulty: string | null;
  topic: string | null;
  specialTheme: string | null;
  specialQuizId: string | null;
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
  topicId: string;
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
  players: { id: string; nickname: string; isHost: boolean }[];
  roles: Record<string, 'team1' | 'team2' | 'host' | 'tv'>;
  captains: { team1?: string; team2?: string };
  teamNameConfirmed: { team1: boolean; team2: boolean };
}

interface WhoAmIState {
  phase: 'lobby' | 'playing' | 'finished';
  characters: Record<string, { ru: string; en: string }>;
  currentTurnIndex: number;
  turnOrder: string[];
  guessedPlayers: string[];
  questionsAsked: Record<string, number>;
  consecutiveYesAnswers: number;
  guessNeedsConfirm: boolean;
  guessAwaitingJudge: boolean;
  guessJudgeId: string;
  guessPendingPlayerId: string;
  guessPendingText: string;
  scores: Record<string, number>;
}

type WhoAmIAction =
  | { type: 'start-game'; characters: Record<string, { ru: string; en: string }>; turnOrder: string[] }
  | { type: 'sync-state'; state: WhoAmIState }
  | { type: 'request-state' }
  | { type: 'next-turn' }
  | { type: 'ask-question'; answer?: 'yes' | 'no'; playerId: string; questionsAsked: number; consecutiveYesAnswers: number }
  | { type: 'guess-try'; playerId: string; guess: string }
  | { type: 'guess-confirm'; playerId: string; judgeId: string }
  | { type: 'guess'; playerId: string; guess: string; correct: boolean }
  | { type: 'end-game' };

const clearWhoAmIGuessDispute = () => ({
  guessNeedsConfirm: false,
  guessAwaitingJudge: false,
  guessJudgeId: '',
  guessPendingPlayerId: '',
  guessPendingText: '',
});

const mkWhoAmIInitial = (): WhoAmIState => ({
  phase: 'lobby',
  characters: {},
  currentTurnIndex: 0,
  turnOrder: [],
  guessedPlayers: [],
  questionsAsked: {},
  consecutiveYesAnswers: 0,
  ...clearWhoAmIGuessDispute(),
  scores: {},
});

const mkH2OInitial = (): H2OState => ({
  phase: 'topicSelect', curQ: 0, topicId: 'general',
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
  players: [], roles: {}, captains: {},
  teamNameConfirmed: { team1: false, team2: false },
});

const QUESTIONS_PER_GAME = 10;

function calculateWhoAmIScore(questionsAsked: number): number {
  if (questionsAsked <= 1) return 100;
  if (questionsAsked <= 3) return 80;
  if (questionsAsked <= 5) return 60;
  if (questionsAsked <= 8) return 40;
  if (questionsAsked <= 12) return 20;
  return 10;
}

const WHO_AM_I_TV_SURFACE =
  "h-screen bg-[linear-gradient(135deg,#071825_0%,#0a2d3f_30%,#0c2530_60%,#071825_100%)] text-white flex flex-col overflow-hidden before:absolute before:inset-0 before:-z-10 before:bg-[radial-gradient(circle_at_18%_18%,rgba(56,189,248,.28),transparent_34%),radial-gradient(circle_at_82%_12%,rgba(2,132,199,.24),transparent_32%)] before:animate-pulse";
const WHO_AM_I_ACCENT_MARK =
  'bg-[radial-gradient(110%_70%_at_50%_-5%,rgba(255,255,255,.28),transparent_55%),linear-gradient(165deg,#38bdf8_0%,#0369a1_100%)] text-sky-50 shadow-[0_24px_60px_-14px_rgba(2,132,199,.8),inset_0_1px_0_rgba(255,255,255,.5)]';

function whoAmIRankStyle(index: number) {
  if (index === 0) return 'border-amber-300/35 bg-amber-400/10 text-amber-300';
  if (index === 1) return 'border-slate-200/30 bg-slate-200/10 text-slate-200';
  if (index === 2) return 'border-orange-300/30 bg-orange-400/10 text-orange-300';
  return 'border-white/10 bg-white/5 text-white/55';
}

const H2O_TV_SURFACE =
  "h-screen overflow-hidden text-white bg-[radial-gradient(1200px_760px_at_18%_6%,rgba(245,158,11,.18),transparent_58%),radial-gradient(980px_620px_at_86%_10%,rgba(251,191,36,.11),transparent_56%),linear-gradient(145deg,#170f08_0%,#2b1807_36%,#120c08_70%,#080606_100%)] before:absolute before:inset-0 before:-z-10 before:bg-[linear-gradient(78deg,transparent_0_24%,rgba(245,158,11,.13)_25%,transparent_35%),linear-gradient(104deg,transparent_0_61%,rgba(245,158,11,.11)_62%,transparent_72%)] after:absolute after:left-1/2 after:top-[10%] after:-z-10 after:h-[580px] after:w-[580px] after:-translate-x-1/2 after:rounded-full after:bg-[radial-gradient(circle,rgba(245,158,11,.20),transparent_68%)] after:blur-[44px]";
const H2O_TV_GLASS = 'border border-white/10 bg-white/[.06] shadow-[0_24px_72px_-34px_rgba(0,0,0,.95)] backdrop-blur-[20px]';
const H2O_TV_GLASS_STRONG = 'border border-white/[.16] bg-white/[.10] shadow-[0_28px_84px_-32px_rgba(0,0,0,1)] backdrop-blur-[24px]';
const H2O_TV_ACCENT = 'bg-[radial-gradient(110%_70%_at_50%_-5%,rgba(255,255,255,.35),transparent_55%),linear-gradient(165deg,#fbbf24_0%,#f59e0b_55%,#b45309_100%)] shadow-[0_28px_72px_-18px_rgba(245,158,11,.75),inset_0_1px_0_rgba(255,255,255,.45)]';

function H2OTeamDot({ team, className = 'h-4 w-4' }: { team: 1 | 2; className?: string }) {
  return <span className={`inline-block rounded-full ${team === 1 ? 'bg-[#ffe155] shadow-[0_0_16px_rgba(255,225,85,.55)]' : 'bg-[#ff7a70] shadow-[0_0_16px_rgba(255,122,112,.5)]'} ${className}`} />;
}

function H2OTVBrand() {
  return (
    <div className="flex items-center gap-4">
      <div className={`${H2O_TV_ACCENT} flex h-[62px] w-[62px] items-center justify-center rounded-[20px] text-[#341f02]`}>
        <HundredToOneIcon name="bell" className="h-9 w-9" />
      </div>
      <div className="leading-none">
        <div className="text-[30px] font-extrabold tracking-[-.4px]">100 к 1</div>
        <small className="font-mono text-[12px] uppercase tracking-[3px] text-white/40">Party Hub</small>
      </div>
    </div>
  );
}

function H2ORemoteHint({ children }: { children: ReactNode }) {
  return (
    <div className={`${H2O_TV_GLASS} inline-flex items-center gap-[12px] rounded-full px-6 py-[13px] text-[21px] font-bold text-white/65`}>
      <HundredToOneIcon name="phone" className="h-6 w-6 text-amber-200" />
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function TVGamePage() {
  const { roomId, gameType } = useParams<{ roomId: string; gameType: string }>();
  const router = useRouter();
  const { emit, on, isConnected } = useSocket();
  const sendAction = useGameAction(roomId);
  const { locale } = useTranslation();
  useNavigateOnGameEnd(roomId, 'tv');

  const [players, setPlayers] = useState<PlayerInfo[]>([]);
  const [quizState, setQuizState] = useState<QuizState>({
    phase: 'setup-mode',
    config: { mode: null, difficulty: null, topic: null, specialTheme: null, specialQuizId: null },
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
  const [, setGenericState] = useState<GenericGameState>({});
  const [h2oState, setH2OState] = useState<H2OState>(mkH2OInitial);
  const [spyState, setSpyState] = useState<{
    phase: string;
    mode: string;
    word: string;
    category: string;
    categoryIcon: string;
    spyId: string;
    players: { id: string; nickname: string; isHost: boolean }[];
    playerOrder: string[];
    playerOrderIdx: number;
    guessAskerId: string;
    guessTargetId: string;
    timerLeft: number;
    timerRunning: boolean;
    readyPlayers: string[];
    votes: Record<string, string>;
    discussionTimeLeft: number;
    voteTimerLeft: number;
    roundResult: {
      spyCaught: boolean;
      exposedId: string;
      voteCount: number;
      viaGuess?: boolean;
      guessedRight?: boolean;
    } | null;
    spyGuessText: string;
    spyGuessNeedsConfirm: boolean;
    spyGuessAwaitingJudge: boolean;
    spyGuessJudgeId: string;
    scores: Record<string, number>;
    lastRoundDelta: Record<string, number>;
    currentRound: number;
    totalRounds: number;
    gameOver: boolean;
    drawerId: string;
  }>({
    phase: 'modeSelect',
    mode: 'guess',
    word: '',
    category: '',
    categoryIcon: '',
    spyId: '',
    players: [],
    playerOrder: [],
    playerOrderIdx: 0,
    guessAskerId: '',
    guessTargetId: '',
    timerLeft: 300,
    timerRunning: false,
    readyPlayers: [],
    votes: {},
    discussionTimeLeft: 120,
    voteTimerLeft: 60,
    roundResult: null,
    spyGuessText: '',
    spyGuessNeedsConfirm: false,
    spyGuessAwaitingJudge: false,
    spyGuessJudgeId: '',
    scores: {},
    lastRoundDelta: {},
    currentRound: 1,
    totalRounds: 3,
    gameOver: false,
    drawerId: '',
  });
  const spyCanvasRef = useRef<HTMLCanvasElement>(null);
  const spyCanvasSizeRef = useRef({ w: 0, h: 0 });
  const [crocState, setCrocState] = useState<{
    phase: string; explainerId: string; currentWordIndex: number;
    timeLeft: number; scores: Record<string, number>; wordsGuessed: number; wordsSkipped: number;
    playersOrder: string[]; turnNumber: number;
  }>({ phase: 'waiting', explainerId: '', currentWordIndex: -1, timeLeft: 60, scores: {}, wordsGuessed: 0, wordsSkipped: 0, playersOrder: [], turnNumber: 1 });
  const [aliasState, setAliasState] = useState<{
    phase: string; mode: string; teams: { id: string; name: string; playerIds: string[]; score: number }[];
    teamNameConfirmed?: boolean[];
    activeTeamIndex: number; explainerIndex: number; explainerIndices: number[]; currentWordIndex: number;
    timeLeft: number; wordsGuessed: number; wordsSkipped: number;
    round: number; totalRounds: number;
    turnHistory: { word: { ru: string; en: string }; guessed: boolean }[];
    currentLetter: string;
  }>({
    phase: 'waiting', mode: 'classic', teams: [], activeTeamIndex: 0, explainerIndex: 0,
    explainerIndices: [],
    currentWordIndex: -1, timeLeft: 60, wordsGuessed: 0, wordsSkipped: 0,
    round: 1, totalRounds: 4, turnHistory: [], currentLetter: '',
  });
  const [mafiaState, setMafiaState] = useState<{
    phase: string;
    alive: string[];   // player IDs currently alive
    eliminated: { id: string }[];
    lastEvent: string; // human-readable last event
    winner: string | null;
    round: number;
    votingRound: number;
    votingCandidates: string[];
  }>({ phase: 'lobby', alive: [], eliminated: [], lastEvent: '', winner: null, round: 1, votingRound: 1, votingCandidates: [] });
  const [whoAmIState, setWhoAmIState] = useState<WhoAmIState>(mkWhoAmIInitial);
  const [lastWhoAmIGuessResult, setLastWhoAmIGuessResult] = useState<{
    playerId: string;
    correct: boolean;
    guess: string;
  } | null>(null);
  const whoAmIGuessTimeoutRef = useRef<number | null>(null);
  const [localIp, setLocalIp] = useState('');
  const [showQrOverlay, setShowQrOverlay] = useState(false);
  const [roomShowQrCode, setRoomShowQrCode] = useState<boolean | null>(null);

  const l = useCallback(
    (ru: string, en: string) => (locale === 'ru' ? ru : en),
    [locale],
  );

  const initSpyCanvas = useCallback((canvas: HTMLCanvasElement | null) => {
    if (!canvas || spyCanvasRef.current === canvas) return;
    spyCanvasRef.current = canvas;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * 2;
    canvas.height = rect.height * 2;
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.scale(2, 2);
    spyCanvasSizeRef.current = { w: rect.width, h: rect.height };
  }, []);

  const gameInfo = GAMES.find((g) => g.id === gameType);
  const gameTitle = gameInfo
    ? locale === 'ru' ? gameInfo.titleRu : gameInfo.titleEn
    : gameType;
  const port = typeof window !== 'undefined' ? window.location.port : '3000';
  const siteUrl = localIp
    ? `http://${localIp}${port ? `:${port}` : ''}`
    : (typeof window !== 'undefined' ? window.location.origin : '');
  const joinUrl = `${siteUrl}/join/${roomId}`;

  // Join TV room
  useEffect(() => {
    if (!isConnected) return;
    emit('tv:join', { code: roomId }, () => {
      // Request full game state only after the socket has joined the room,
      // otherwise the h2o:sync response won't be delivered to this socket yet.
      const requestAction = TV_STATE_REQUEST[gameType];
      if (gameType === 'who-am-i') {
        sendAction('who-am-i', { type: 'request-state' });
      } else if (gameType === 'mafia') {
        sendAction('mafia', { type: 'request-state' });
      } else if (requestAction) {
        sendAction(requestAction);
      }
    });
  }, [isConnected, roomId, emit, gameType, sendAction]);

  useEffect(() => {
    fetch('/api/local-ip')
      .then((response) => response.json())
      .then((data: { ip?: string }) => {
        if (data.ip) setLocalIp(data.ip);
      })
      .catch(() => {});
  }, []);

  // Socket listeners
  useRoomState(roomId, (data) => {
    const room = data as { players?: PlayerInfo[]; status?: string; showQrCode?: boolean };
    setPlayers(Array.isArray(room.players) ? room.players : []);
    setRoomShowQrCode(typeof room.showQrCode === 'boolean' ? room.showQrCode : false);
  });

  useEffect(() => {
    const unsubscribe = on('room:closed', () => {
      window.sessionStorage.setItem(ROOM_CLOSED_NOTICE_KEY, '1');
      router.push('/');
    });

    return unsubscribe;
  }, [on, router]);

  useEffect(() => {
    const unsubscribe = on('room:show-qr', (data: unknown) => {
      const show = (data as { show?: boolean } | undefined)?.show !== false;
      setShowQrOverlay(show);
    });

    return unsubscribe;
  }, [on]);

  useEffect(() => {
    if (roomShowQrCode === null) return;
    queueMicrotask(() => setShowQrOverlay(roomShowQrCode));
  }, [roomShowQrCode]);

  useEffect(() => {
    if (!showQrOverlay) return;
    const timeout = window.setTimeout(() => setShowQrOverlay(false), 30000);
    return () => window.clearTimeout(timeout);
  }, [showQrOverlay]);

  useEffect(() => {
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
            if (ctx) {
              const { w, h } = spyCanvasSizeRef.current;
              ctx.strokeStyle = '#fbbf24';
              ctx.lineWidth = 3;
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

      if (action === 'mafia') {
        const mp = payload as { type: string; roles?: Record<string, string>; killedId?: string | null; killedIds?: string[]; saved?: boolean; playerId?: string; playerIds?: string[]; winner?: string; round?: number; candidates?: string[]; state?: unknown };
        switch (mp.type) {
          case 'sync-state': {
            const state = mp.state as {
              phase: string;
              alive: string[];
              eliminated: { id: string; role: string }[];
              winner: string | null;
              round: number;
              votingRound?: number;
              votingCandidates?: string[];
            };
            setMafiaState({
              phase: state.phase,
              alive: state.alive,
              eliminated: state.eliminated.map((e) => ({ id: e.id })),
              lastEvent: '',
              winner: state.winner,
              round: state.round,
              votingRound: state.votingRound ?? 1,
              votingCandidates: state.votingCandidates ?? [],
            });
            break;
          }
          case 'assign-roles':
            setMafiaState(prev => ({
              ...prev,
              phase: 'role-reveal',
              alive: Object.keys(mp.roles ?? {}),
              eliminated: [],
              lastEvent: locale === 'ru' ? '🎭 Роли розданы' : '🎭 Roles assigned',
              winner: null,
              votingRound: 1,
              votingCandidates: [],
            }));
            break;
          case 'start-night':
            setMafiaState(prev => ({
              ...prev,
              phase: 'night',
              lastEvent: locale === 'ru' ? '🌙 Ночь наступила...' : '🌙 Night falls...',
              votingRound: 1,
              votingCandidates: [],
            }));
            break;
          case 'night-result': {
            const killedCount = mp.killedIds?.length ?? (mp.killedId ? 1 : 0);
            const saved = mp.saved ?? false;
            setMafiaState(prev => ({
              ...prev,
              lastEvent: killedCount > 0
                ? (killedCount > 1
                  ? (locale === 'ru' ? '💀 Ночью погибли несколько игроков' : '💀 Several players died last night')
                  : (locale === 'ru' ? '💀 Ночью кто-то погиб' : '💀 Someone died last night'))
                : saved
                ? (locale === 'ru' ? '🛡️ Доктор спас жертву!' : '🛡️ Doctor saved the victim!')
                : (locale === 'ru' ? '🌅 Мирная ночь' : '🌅 Peaceful night'),
            }));
            break;
          }
          case 'start-voting':
            setMafiaState(prev => ({
              ...prev,
              phase: 'voting',
              lastEvent: locale === 'ru' ? '🗳️ Голосование' : '🗳️ Voting',
              votingRound: 1,
              votingCandidates: [],
            }));
            break;
          case 'vote-tie':
            setMafiaState(prev => ({
              ...prev,
              phase: 'voting',
              lastEvent: mp.round === 2
                ? (locale === 'ru' ? '🗳️ Переголосование' : '🗳️ Revote')
                : (locale === 'ru' ? '⚖️ Казнить или помиловать?' : '⚖️ Execute or pardon?'),
              votingRound: mp.round ?? 1,
              votingCandidates: mp.candidates ?? [],
            }));
            break;
          case 'vote-alibi':
            setMafiaState(prev => ({
              ...prev,
              phase: 'results',
              lastEvent: locale === 'ru' ? '💋 Алиби сработало' : '💋 Alibi worked',
              votingRound: 1,
              votingCandidates: [],
            }));
            break;
          case 'vote-pardoned':
            setMafiaState(prev => ({
              ...prev,
              phase: 'results',
              lastEvent: locale === 'ru' ? '⚖️ Кандидаты оправданы' : '⚖️ Candidates pardoned',
              votingRound: 1,
              votingCandidates: [],
            }));
            break;
          case 'eliminate':
            setMafiaState(prev => ({
              ...prev,
              alive: prev.alive.filter(id => id !== mp.playerId),
              eliminated: [...prev.eliminated, { id: mp.playerId! }],
              lastEvent: locale === 'ru' ? '⚖️ Игрок исключён' : '⚖️ Player eliminated',
              votingRound: 1,
              votingCandidates: [],
            }));
            break;
          case 'eliminate-many':
            setMafiaState(prev => ({
              ...prev,
              alive: prev.alive.filter(id => !(mp.playerIds ?? []).includes(id)),
              eliminated: [
                ...prev.eliminated,
                ...(mp.playerIds ?? []).map((id) => ({ id })),
              ],
              lastEvent: locale === 'ru' ? '⚖️ Кандидаты исключены' : '⚖️ Candidates eliminated',
              votingRound: 1,
              votingCandidates: [],
            }));
            break;
          case 'game-over':
            setMafiaState(prev => ({
              ...prev,
              phase: 'results',
              winner: mp.winner ?? null,
              lastEvent: mp.winner === 'mafia'
                ? (locale === 'ru' ? '🔫 Мафия победила!' : '🔫 Mafia wins!')
                : mp.winner === 'maniac'
                ? (locale === 'ru' ? '🪓 Маньяк победил!' : '🪓 Maniac wins!')
                : (locale === 'ru' ? '🎉 Мирные победили!' : '🎉 Citizens win!'),
            }));
            break;
        }
      }

      if (gameType === 'who-am-i' && action === 'who-am-i') {
        const wp = payload as unknown as WhoAmIAction;
        switch (wp.type) {
          case 'start-game':
            setWhoAmIState({
              phase: 'playing',
              characters: wp.characters,
              currentTurnIndex: 0,
              turnOrder: wp.turnOrder,
              guessedPlayers: [],
              questionsAsked: Object.fromEntries(wp.turnOrder.map((id) => [id, 0])),
              consecutiveYesAnswers: 0,
              ...clearWhoAmIGuessDispute(),
              scores: Object.fromEntries(wp.turnOrder.map((id) => [id, 0])),
            });
            setLastWhoAmIGuessResult(null);
            if (whoAmIGuessTimeoutRef.current !== null) {
              window.clearTimeout(whoAmIGuessTimeoutRef.current);
              whoAmIGuessTimeoutRef.current = null;
            }
            break;

          case 'sync-state':
            setWhoAmIState(wp.state);
            break;

          case 'next-turn':
            setWhoAmIState((prev) => ({
              ...prev,
              currentTurnIndex: prev.currentTurnIndex + 1,
              consecutiveYesAnswers: 0,
              ...clearWhoAmIGuessDispute(),
            }));
            setLastWhoAmIGuessResult(null);
            break;

          case 'ask-question':
            setWhoAmIState((prev) => ({
              ...prev,
              questionsAsked: {
                ...prev.questionsAsked,
                [wp.playerId]: wp.questionsAsked,
              },
              consecutiveYesAnswers: wp.consecutiveYesAnswers,
            }));
            break;

          case 'guess-try':
            setWhoAmIState((prev) => ({
              ...prev,
              guessNeedsConfirm: true,
              guessAwaitingJudge: false,
              guessJudgeId: '',
              guessPendingPlayerId: wp.playerId,
              guessPendingText: wp.guess,
            }));
            setLastWhoAmIGuessResult(null);
            break;

          case 'guess-confirm':
            setWhoAmIState((prev) => ({
              ...prev,
              guessNeedsConfirm: false,
              guessAwaitingJudge: true,
              guessJudgeId: wp.judgeId,
              guessPendingPlayerId: wp.playerId,
            }));
            break;

          case 'guess':
            if (wp.correct) {
              setWhoAmIState((prev) => {
                const score = calculateWhoAmIScore(prev.questionsAsked[wp.playerId] || 0);
                const guessedPlayers = prev.guessedPlayers.includes(wp.playerId)
                  ? prev.guessedPlayers
                  : [...prev.guessedPlayers, wp.playerId];
                const allGuessed = guessedPlayers.length >= prev.turnOrder.length;

                return {
                  ...prev,
                  guessedPlayers,
                  scores: {
                    ...prev.scores,
                    [wp.playerId]: (prev.scores[wp.playerId] || 0) + score,
                  },
                  phase: allGuessed ? 'finished' : prev.phase,
                  currentTurnIndex: prev.currentTurnIndex + 1,
                  consecutiveYesAnswers: 0,
                  ...clearWhoAmIGuessDispute(),
                };
              });
            } else {
              setWhoAmIState((prev) => ({
                ...prev,
                ...clearWhoAmIGuessDispute(),
              }));
            }
            setLastWhoAmIGuessResult({
              playerId: wp.playerId,
              correct: wp.correct,
              guess: wp.guess,
            });
            if (whoAmIGuessTimeoutRef.current !== null) {
              window.clearTimeout(whoAmIGuessTimeoutRef.current);
            }
            whoAmIGuessTimeoutRef.current = window.setTimeout(() => {
              setLastWhoAmIGuessResult(null);
              whoAmIGuessTimeoutRef.current = null;
            }, 3000);
            break;

          case 'end-game':
            setWhoAmIState((prev) => ({
              ...prev,
              phase: 'finished',
              ...clearWhoAmIGuessDispute(),
            }));
            setLastWhoAmIGuessResult(null);
            break;
        }
      }

      setGenericState((prev) => ({ ...prev, lastAction: action, ...payload }));
    });

    // Note: the full-state request is sent in the tv:join
    // callback above, after the socket has confirmed it joined the room.

    return unsub2;
  }, [on, gameType, locale]);

  useEffect(() => {
    return () => {
      if (whoAmIGuessTimeoutRef.current !== null) {
        window.clearTimeout(whoAmIGuessTimeoutRef.current);
      }
    };
  }, []);

  // TV-pivot: read lobby quiz config and broadcast it to all clients.
  useEffect(() => {
    if (gameType !== 'quiz') return;
    if (!isConnected) return;
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

      let quizConfig: QuizConfig;
      let total: number;

      if (config.mode === 'general') {
        quizConfig = {
          mode: 'general',
          difficulty: config.difficulty,
          topic: config.topic,
          specialTheme: null,
          specialQuizId: null,
        };
        const questions = getQuizQuestions(
          quizConfig.topic as QuizTopic,
          quizConfig.difficulty as QuizDifficulty,
          new Set<string>(),
        );
        total = Math.min(QUESTIONS_PER_GAME, questions.length);
      } else {
        const specialQuiz = SPECIAL_QUIZZES.find((q) => q.id === config.specialQuizId);
        quizConfig = {
          mode: 'special',
          difficulty: null,
          topic: null,
          specialTheme: specialQuiz?.theme ?? null,
          specialQuizId: config.specialQuizId,
        };
        const questions = getSpecialQuizQuestions(config.specialQuizId ?? '', new Set<string>());
        total = Math.min(QUESTIONS_PER_GAME, questions.length);
      }

      queueMicrotask(() => {
        setQuizState((prev) => ({
          ...prev,
          config: quizConfig,
          phase: 'waiting',
          totalQuestions: total,
        }));
      });

      sendAction('quiz:config', { config: quizConfig, phase: 'waiting', totalQuestions: total });
    } catch {
      localStorage.removeItem('party-hub-quiz-config');
    }
  }, [gameType, isConnected, sendAction]);

  const getPlayerName = useCallback(
    (id: string) => players.find((p) => p.id === id)?.nickname || id,
    [players],
  );

  const scoreboard = players
    .map((p) => ({
      id: p.id,
      name: p.nickname,
      score: quizState.scores[p.id] || 0,
      away: !p.isConnected || Boolean(p.isAway),
    }))
    .sort((a, b) => b.score - a.score);
  const qrOverlay = showQrOverlay ? (
    <button
      type="button"
      onClick={() => setShowQrOverlay(false)}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/72 px-6 text-white backdrop-blur-md"
      aria-label={locale === 'ru' ? 'Скрыть QR-код' : 'Hide QR code'}
    >
      <div className="flex max-w-xl flex-col items-center gap-5 rounded-2xl border border-white/15 bg-neutral-950/92 px-8 py-7 text-center shadow-2xl">
        <div className="rounded-2xl bg-white p-4 shadow-xl">
          <QRCodeCanvas value={joinUrl} size={240} />
        </div>
        <div className="space-y-2">
          <p className="text-3xl font-black">
            {locale === 'ru' ? 'Отсканируй, чтобы присоединиться' : 'Scan to join'}
          </p>
          <p className="font-mono text-lg font-bold tracking-[0.18em] text-white/80">{roomId}</p>
          <p className="font-mono text-sm text-white/45">{siteUrl}/join</p>
        </div>
      </div>
    </button>
  ) : null;

  // ===================== QUIZ TV RENDER =====================
  if (gameType === 'quiz') {
    const currentQuestion = quizState.currentQuestion;
    const answeredCount = Object.keys(quizState.answers).length;
    const totalPlayers = players.length;
    const timePerQuestion = quizState.config.difficulty === 'easy' ? 15
      : quizState.config.difficulty === 'hard' ? 25 : 20;

    const topicInfo = quizState.config.topic ? QUIZ_TOPICS.find((t) => t.id === quizState.config.topic) : null;
    const diffInfo = quizState.config.difficulty ? QUIZ_DIFFICULTIES.find((d) => d.id === quizState.config.difficulty) : null;
    const specialQuizInfo = quizState.config.specialQuizId ? SPECIAL_QUIZZES.find((q) => q.id === quizState.config.specialQuizId) : null;
    const specialThemeInfo = quizState.config.specialTheme ? SPECIAL_QUIZ_THEMES.find((t) => t.id === quizState.config.specialTheme) : null;
    const backgroundUrl: string | undefined =
      specialQuizInfo?.backgroundUrl ?? specialThemeInfo?.backgroundUrl ?? undefined;
    const isSetup = quizState.phase.startsWith('setup-');

    return (
      <GameSurface backgroundUrl={backgroundUrl} className="h-screen bg-gradient-main text-white flex flex-col overflow-hidden">
        {/* Top bar */}
        <div className="flex items-center justify-between gap-4 px-8 py-4 bg-black/20 backdrop-blur-sm border-b border-white/10 flex-shrink-0">
          <div className="flex items-center gap-4 min-w-0">
            <GameIcon gameId={gameType as import('@/lib/design/tokens').GameId} size={36} className="flex-shrink-0" />
            <h1 className="text-3xl font-bold">{gameTitle}</h1>
          </div>
          {/* Center: player scores in header */}
          {scoreboard.length > 0 && (quizState.phase === 'question' || quizState.phase === 'countdown') && (
            <div className="flex items-center justify-center gap-2 flex-wrap min-w-0">
              {scoreboard.map((entry, i) => {
                const guessedRight = quizState.showCorrect && quizState.correctPlayers.includes(entry.id);
                const guessedWrong = quizState.showCorrect && !quizState.correctPlayers.includes(entry.id);
                const chipClass = guessedRight
                  ? 'bg-green-500/15 border-green-400/50'
                  : guessedWrong
                    ? 'bg-red-500/15 border-red-400/50'
                    : 'bg-white/10 border-white/15';
                return (
                  <div key={entry.id} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md border transition-colors duration-300 ${chipClass} ${entry.away ? 'opacity-40 grayscale' : ''}`}>
                    <span className="text-xs text-white/50">{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`}</span>
                    <span className="text-sm font-semibold text-white">{entry.name}</span>
                    <span className="text-sm font-black text-purple-400">{entry.score}</span>
                  </div>
                );
              })}
            </div>
          )}
          {quizState.phase === 'question' && (
            <div className="flex items-center gap-6">
              <span className="text-lg text-white/50">
                {locale === 'ru' ? 'Ответили' : 'Answered'}: {answeredCount}/{totalPlayers}
              </span>
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
              <div className="mb-6 flex justify-center">
                <GameIcon gameId={gameType as import('@/lib/design/tokens').GameId} size={96} />
              </div>
              <h2 className="text-5xl font-bold mb-4">{gameTitle}</h2>
              <p className="text-2xl text-white/50 animate-pulse">
                {isSetup
                  ? locale === 'ru' ? 'Настройка игры...' : 'Setting up...'
                  : locale === 'ru' ? 'Ожидание начала...' : 'Waiting to start...'}
              </p>
              {specialQuizInfo ? (
                <div className="mt-6 flex items-center justify-center gap-4">
                  <span className="rounded-md border border-white/10 bg-white/5 backdrop-blur-xl px-12 py-8 text-5xl font-semibold inline-flex items-center">
                    {locale === 'ru' ? specialQuizInfo.titleRu : specialQuizInfo.titleEn}
                  </span>
                </div>
              ) : specialThemeInfo ? (
                <div className="mt-6 flex items-center justify-center gap-4">
                  <span className="glass-badge px-4 py-2 text-lg inline-flex items-center gap-2">
                    <QuizIcon iconUrl={specialThemeInfo.iconUrl} fallback={specialThemeInfo.icon} size={24} />
                    {locale === 'ru' ? specialThemeInfo.titleRu : specialThemeInfo.titleEn}
                  </span>
                </div>
              ) : (diffInfo || topicInfo) && (
                <div className="mt-6 flex items-center justify-center gap-4">
                  {diffInfo && (
                    <span className="rounded-md border border-white/10 bg-white/5 backdrop-blur-xl px-4 py-2 text-lg font-semibold inline-flex items-center gap-2">
                      <DifficultyIcon difficulty={diffInfo.id} size={16} />
                      {locale === 'ru' ? diffInfo.titleRu : diffInfo.titleEn}
                    </span>
                  )}
                  {topicInfo && (
                    <span className="rounded-md border border-white/10 bg-white/5 backdrop-blur-xl px-4 py-2 text-lg font-semibold inline-flex items-center">
                      {locale === 'ru' ? topicInfo.titleRu : topicInfo.titleEn}
                    </span>
                  )}
                </div>
              )}
              {quizState.phase === 'waiting' && (
                <div className="mt-8 space-y-2">
                  <p className="text-2xl text-white/90">
                    {locale === 'ru'
                      ? `${quizState.totalQuestions} вопросов. 1 очко за правильный ответ!`
                      : `${quizState.totalQuestions} questions. 1 point for each correct answer!`}
                  </p>
                  <p className="text-xl text-white/70">
                    {locale === 'ru' ? `Игроков: ${totalPlayers}` : `Players: ${totalPlayers}`}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* COUNTDOWN */}
          {quizState.phase === 'countdown' && (
            <div className="text-center animate-fade-in">
              <p className="text-2xl text-white/50 mb-4">
                {locale === 'ru' ? 'Вопрос' : 'Question'} {quizState.questionIndex + 1}
              </p>
              <AnimatePresence mode="popLayout">
                <motion.div
                  key={quizState.countdownValue}
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: [0.5, 1.2, 1], opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  transition={{ duration: 0.3, ease: [0.34, 1.56, 0.64, 1] }}
                  className="text-[clamp(5rem,18vh,12rem)] font-black leading-none"
                  style={{
                    color: '#facc15',
                    textShadow: '0 0 40px rgba(250, 204, 21, 0.6), 0 0 80px rgba(250, 204, 21, 0.3)',
                  }}
                >
                  {quizState.countdownValue}
                </motion.div>
              </AnimatePresence>
            </div>
          )}

          {/* QUESTION */}
          {quizState.phase === 'question' && currentQuestion && (
            <div className="flex-1 w-full flex flex-col justify-end">
              {/* BOTTOM: Question + timer + options + result */}
              <div className="flex flex-col gap-3 flex-shrink-0">
                {/* Question */}
                <div className="glass-card p-6 flex-shrink-0">
                  <h3 className="text-2xl xl:text-3xl font-bold text-center leading-snug line-clamp-3">
                    {locale === 'ru' ? currentQuestion.questionRu : currentQuestion.questionEn}
                  </h3>
                </div>

                {/* Timer bar */}
                <div className="w-full h-3 rounded-full bg-white/10 overflow-hidden flex-shrink-0">
                  <div
                    className={`h-full rounded-full transition-all duration-1000 ease-linear ${
                      quizState.timeLeft <= 5 ? 'bg-red-500' : 'bg-purple-500'
                    }`}
                    style={{ width: `${(quizState.timeLeft / timePerQuestion) * 100}%` }}
                  />
                </div>

                {/* Options grid */}
                <div className="grid grid-cols-2 gap-3 flex-shrink-0">
                  {currentQuestion.options.map((option, index) => {
                    const isCorrectAnswer = index === currentQuestion.correctIndex;
                    const isCorrectRevealed = quizState.showCorrect && isCorrectAnswer;
                    const isWrongRevealed = quizState.showCorrect && !isCorrectAnswer;
                    const stripColor = isCorrectRevealed ? '#4ade80' : isWrongRevealed ? '#f87171' : 'transparent';
                    const bgClass = isCorrectRevealed
                      ? 'bg-green-500/10 border-green-400/30'
                      : isWrongRevealed
                        ? 'bg-white/5 border-white/10 opacity-40'
                        : 'bg-white/5 border-white/10';

                    return (
                      <div
                        key={index}
                        className={`relative overflow-hidden rounded-md border p-5 text-left backdrop-blur-xl transition-colors duration-300 ${bgClass}`}
                      >
                        <div
                          className="absolute left-0 inset-y-0 w-1.5 transition-colors duration-300"
                          style={{ backgroundColor: stripColor }}
                        />
                        <div className="flex items-center gap-4 pl-3">
                          <span className={`
                            flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-lg font-black
                            ${isCorrectRevealed ? 'bg-green-500/20 text-green-300' : 'bg-white/8 text-white/50'}
                          `}>
                            {isCorrectRevealed ? '✓' : index + 1}
                          </span>
                          <span className={`text-xl font-semibold line-clamp-2 leading-tight ${
                            isCorrectRevealed ? 'text-green-100' : 'text-white'
                          }`}>
                            {locale === 'ru' ? option.ru : option.en}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

              </div>
            </div>
          )}

          {/* MID-LEADERBOARD */}
          {quizState.phase === 'mid-leaderboard' && (
            <div className="text-center animate-fade-in">
              <h2 className="text-5xl font-bold mb-2">
                {locale === 'ru' ? 'Промежуточные результаты' : 'Halftime Results'}
              </h2>
              <p className="text-white/60 mb-8 text-xl">
                {locale === 'ru'
                  ? `После ${quizState.questionIndex + 1} из ${quizState.totalQuestions} вопросов`
                  : `After ${quizState.questionIndex + 1} of ${quizState.totalQuestions} questions`}
              </p>
              <div className="w-full max-w-3xl mx-auto space-y-3">
                {scoreboard.map((entry, i) => (
                  <div
                    key={entry.id}
                    className={`relative overflow-hidden flex items-center justify-between py-4 px-8 rounded-md border backdrop-blur-xl transition-all ${
                      i === 0
                        ? 'bg-yellow-500/20 border-yellow-400/40 scale-105'
                      : i === 1
                          ? 'bg-white/8 border-white/15'
                          : i === 2
                            ? 'bg-amber-700/10 border-amber-700/20'
                            : 'bg-white/5 border-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <span className="text-3xl w-10 text-center flex-shrink-0">
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

          {/* FINAL */}
          {quizState.phase === 'final' && (
            <div className="text-center animate-fade-in">
              <div className="text-7xl mb-4">🏆</div>
              <h2 className="text-5xl font-bold mb-8">
                {locale === 'ru' ? 'Итоги' : 'Final Results'}
              </h2>
              <div className="w-full max-w-3xl mx-auto space-y-3">
                {scoreboard.map((entry, i) => (
                  <div
                    key={entry.id}
                    className={`relative overflow-hidden flex items-center justify-between py-4 px-8 rounded-md border backdrop-blur-xl transition-all ${
                      i === 0
                        ? 'bg-yellow-500/20 border-yellow-400/40 scale-105'
                        : i === 1
                          ? 'bg-white/8 border-white/15'
                          : i === 2
                            ? 'bg-amber-700/10 border-amber-700/20'
                            : 'bg-white/5 border-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <span className="text-3xl w-10 text-center flex-shrink-0">
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
        {qrOverlay}
      </GameSurface>
    );
  }

  // ===================== 100 к 1 TV RENDER =====================
  if (gameType === 'hundred-to-one') {
    const h = h2oState;
    const activeRounds = H2O_TOPICS.find(t => t.id === h.topicId)?.rounds ?? H2O_ROUNDS;
    const activeBigQ = H2O_TOPICS.find(t => t.id === h.topicId)?.bigQ ?? H2O_BIG_Q;
    const activeTopic = H2O_TOPICS.find(t => t.id === h.topicId);
    const h2oTopicName = activeTopic?.name ?? '—';
    const q = activeRounds[h.curQ];
    const activeTeam = h.roundActiveTeam[h.curQ] || 0;
    const h2oPlayers = h.players.length > 0 ? h.players : players;
    const h2oHost = h2oPlayers.find((p) => h.roles[p.id] === 'host');
    const h2oPlayerName = (id: string) => h2oPlayers.find((p) => p.id === id)?.nickname || id || '—';
    const h2oTeamPlayers = (team: 1 | 2) => h2oPlayers.filter((p) => h.roles[p.id] === (team === 1 ? 'team1' : 'team2'));
    const h2oUnassignedPlayers = h2oPlayers.filter((p) => !h.roles[p.id]);
    const h2oCaptain = (team: 1 | 2) => team === 1 ? h.captains.team1 : h.captains.team2;
    const h2oPrepStep = h.phase === 'topicSelect' ? 0 : h.phase === 'roleSelect' ? 1 : h.phase === 'captainSelect' ? 2 : h.phase === 'teamNames' ? 3 : 4;
    const h2oLivePill = (
      <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[.06] px-4 py-2 font-mono text-[14px] font-bold uppercase tracking-[1px] text-white/55 backdrop-blur-[20px]">
        <span className="h-2 w-2 rounded-full bg-green-300 shadow-[0_0_12px_rgba(74,222,128,.8)]" />
        {h2oPlayers.length || players.length} в игре
      </div>
    );

    return (
      <GameSurface className={H2O_TV_SURFACE}>
        <div className="relative z-[1] flex h-full flex-col px-16 pb-11 pt-12">
          {h.phase === 'topicSelect' && (
            <>
              <div className="flex items-center justify-between">
                <H2OTVBrand />
                {h2oLivePill}
              </div>
              <div className="flex flex-1 flex-col items-center justify-center gap-9 text-center">
                <div className={`${H2O_TV_ACCENT} flex h-[148px] w-[148px] items-center justify-center rounded-[40px] text-[#341f02]`}>
                  <HundredToOneIcon name="bell" className="h-[78px] w-[78px]" strokeWidth={1.7} />
                </div>
                <div className={`${H2O_TV_GLASS_STRONG} flex max-w-[720px] flex-col items-center gap-4 rounded-[var(--radius-2xl)] px-12 py-10`}>
                  <div className="font-mono text-[15px] font-bold uppercase tracking-[4px] text-amber-200/75">
                    {l('Подготовка телеигры', 'Game setup')}
                  </div>
                  <h2 className="text-balance text-[54px] font-extrabold leading-[1.02] tracking-[-1.5px] text-white">
                    {l('Хост выбирает тему для игры…', 'Host is choosing the game topic...')}
                  </h2>
                </div>
              </div>
              <div className="flex justify-center">
                <H2ORemoteHint><span>{l('Ожидание выбора темы', 'Waiting for topic selection')} ·</span> <b className="text-white/85">{l('дальше роли и команды', 'roles and teams next')}</b></H2ORemoteHint>
              </div>
            </>
          )}

          {(h.phase === 'title' || h.phase === 'teams' || h.phase === 'rules') && (
            <>
              <div className="flex items-center justify-between">
                <H2OTVBrand />
                {h2oLivePill}
              </div>
              <div className="flex flex-1 flex-col items-center justify-center gap-11 text-center">
                <div className="flex flex-col items-center gap-5">
                  <div className={`${H2O_TV_ACCENT} flex h-[148px] w-[148px] items-center justify-center rounded-[40px] text-[#341f02]`}>
                    <HundredToOneIcon name="bell" className="h-[78px] w-[78px]" strokeWidth={1.7} />
                  </div>
                  <h2 className="bg-[linear-gradient(180deg,#fde68a_10%,#f59e0b_60%,#d97706_95%)] bg-clip-text text-[148px] font-extrabold leading-[.9] tracking-[-5px] text-transparent drop-shadow-[0_14px_44px_rgba(245,158,11,.35)]">
                    100 к 1
                  </h2>
                  <div className="font-mono text-[20px] font-semibold uppercase tracking-[9px] text-white/35">Телеигра · Тема: {h2oTopicName}</div>
                </div>
                <div className="flex items-center gap-10">
                  <div className={`${H2O_TV_GLASS_STRONG} flex items-center gap-[18px] rounded-[var(--radius-xl)] border-yellow-200/25 bg-yellow-300/[.10] px-10 py-6`}>
                    <H2OTeamDot team={1} />
                    <span className="text-[44px] font-extrabold tracking-[-.6px]">{h.t1n}</span>
                  </div>
                  <span className="text-[34px] font-extrabold tracking-[2px] text-amber-400">VS</span>
                  <div className={`${H2O_TV_GLASS_STRONG} flex items-center gap-[18px] rounded-[var(--radius-xl)] border-red-300/25 bg-red-400/[.10] px-10 py-6`}>
                    <H2OTeamDot team={2} />
                    <span className="text-[44px] font-extrabold tracking-[-.6px]">{h.t2n}</span>
                  </div>
                </div>
                <div className={`${H2O_TV_GLASS} inline-flex items-center gap-[14px] rounded-full px-[30px] py-4 text-[22px] font-bold text-white/65`}>
                  <HundredToOneIcon name="mic" className="h-[26px] w-[26px] text-amber-200" />
                  Ведущий <b className="text-amber-200">{h2oHost?.nickname || '—'}</b> начнёт игру со своего телефона
                </div>
              </div>
              <div className="flex justify-center">
                <H2ORemoteHint><span>4 раунда + Большая игра ·</span> <b className="text-white/85">фонд 200 — победа</b></H2ORemoteHint>
              </div>
            </>
          )}

          {(h.phase === 'roleSelect' || h.phase === 'captainSelect' || h.phase === 'teamNames') && (
            <>
              <div className="grid grid-cols-[1fr_auto_1fr] items-center">
                <H2OTVBrand />
                <div className="flex flex-col items-center gap-3">
                  <div className={`${H2O_TV_GLASS} inline-flex items-center gap-[22px] rounded-full px-7 py-[14px]`}>
                    {[l('Тема', 'Topic'), l('Роли', 'Roles'), l('Капитаны', 'Captains'), l('Названия', 'Names'), l('Старт', 'Start')].map((step, idx) => (
                      <span key={step} className={`flex items-center gap-[9px] font-mono text-[14px] uppercase tracking-[1.5px] ${idx < h2oPrepStep ? 'text-white/40' : idx === h2oPrepStep ? 'font-bold text-amber-200' : 'text-white/25'}`}>
                        <span className={`h-[9px] w-[9px] rounded-full ${idx < h2oPrepStep ? 'bg-amber-500/55' : idx === h2oPrepStep ? 'bg-amber-400 shadow-[0_0_12px_rgba(245,158,11,.8)]' : 'bg-white/[.14]'}`} />
                        {step}
                      </span>
                    ))}
                  </div>
                  <div className="font-mono text-[28px] font-semibold uppercase tracking-[2px] text-white/38">
                    {l('Тема:', 'Topic:')} <span className="text-amber-200/80">{h2oTopicName}</span>
                  </div>
                </div>
                <div className="flex justify-end">{h2oLivePill}</div>
              </div>
              <div className="mt-[34px] grid min-h-0 flex-1 grid-cols-[1fr_460px_1fr] items-stretch gap-10">
                {[1].map(() => {
                  const teamPlayers = h2oTeamPlayers(1);
                  const captainId = h2oCaptain(1);
                  return (
                    <div key="team1" className="flex flex-col gap-[14px] rounded-[var(--radius-2xl)] border border-yellow-200/25 bg-yellow-300/[.10] p-[30px]">
                      <div className="flex items-center gap-[14px]">
                        <H2OTeamDot team={1} />
                        <span className="text-[34px] font-extrabold tracking-[-.5px]">{h.t1n}</span>
                        <span className="ml-auto font-mono text-[15px] font-semibold text-white/40">{teamPlayers.length} игрока</span>
                      </div>
                      <div className="mb-1 mt-[-4px] font-mono text-[13.5px] uppercase tracking-[2px] text-white/35">
                        {captainId ? <>Капитан — <b className="text-amber-200">{h2oPlayerName(captainId)}</b></> : h.phase === 'teamNames' ? <>Название — <b className="text-amber-200">выбирают</b></> : <>Капитан — <b className="text-amber-200">голосование идёт</b></>}
                      </div>
                      {teamPlayers.map((p) => (
                        <div key={p.id} className={`${H2O_TV_GLASS} flex items-center gap-3 rounded-full py-[9px] pl-[9px] pr-4 ${captainId === p.id ? 'border-amber-300/50 bg-amber-500/[.09]' : ''}`}>
                          <PlayerAvatar nickname={p.nickname} sizePx={46} />
                          <span className="text-[22px] font-bold tracking-[-.3px]">{p.nickname}</span>
                          {captainId === p.id && <HundredToOneIcon name="trophy" className="ml-auto h-6 w-6 text-amber-200" />}
                        </div>
                      ))}
                    </div>
                  );
                })}
                <div className={`${H2O_TV_GLASS_STRONG} flex min-h-0 flex-col items-center gap-[22px] rounded-[var(--radius-2xl)] px-[30px] py-[34px]`}>
                  {h.phase === 'roleSelect' ? (
                    <>
                      <div className="text-center font-mono text-[14px] uppercase tracking-[3px] text-white/40">
                        {l('Ещё выбирают роль', 'Still choosing roles')}
                      </div>
                      {h2oUnassignedPlayers.length > 0 ? (
                        <div className="grid min-h-0 w-full flex-1 grid-cols-2 gap-x-3">
                          {[
                            h2oUnassignedPlayers.slice(0, Math.ceil(h2oUnassignedPlayers.length / 2)),
                            h2oUnassignedPlayers.slice(Math.ceil(h2oUnassignedPlayers.length / 2)),
                          ].map((columnPlayers, columnIdx) => (
                            <div key={columnIdx} className="flex min-w-0 flex-col gap-y-[10px]">
                              {columnPlayers.map((p) => (
                                <div key={p.id} className={`${H2O_TV_GLASS} flex min-w-0 items-center gap-2.5 rounded-full py-[7px] pl-[7px] pr-3`}>
                                  <PlayerAvatar nickname={p.nickname} sizePx={38} />
                                  <span className="min-w-0 truncate text-[18px] font-bold tracking-[-.3px]">{p.nickname}</span>
                                </div>
                              ))}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className={`${H2O_TV_GLASS} flex flex-1 items-center justify-center rounded-[var(--radius-xl)] px-6 py-8 text-center text-[30px] font-extrabold tracking-[-.5px] text-amber-200`}>
                          {l('Все выбрали роль ✓', 'Everyone picked a role ✓')}
                        </div>
                      )}
                      <div className={`${H2O_TV_GLASS} mt-auto flex items-center gap-3 rounded-full py-[10px] pl-[10px] pr-[22px]`}>
                        <PlayerAvatar nickname={h2oHost?.nickname || l('не выбран', 'not chosen')} sizePx={44} />
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[21px] font-bold">{h2oHost?.nickname || l('не выбран', 'not chosen')}</span>
                          <small className="font-mono text-[12px] uppercase tracking-[2px] text-white/40">{l('Ведущий', 'Host')}</small>
                        </div>
                        <HundredToOneIcon name="mic" className="h-[22px] w-[22px] text-amber-200" />
                      </div>
                    </>
                  ) : h.phase === 'captainSelect' ? (
                    <div className={`${H2O_TV_GLASS} flex flex-1 items-center justify-center rounded-[var(--radius-xl)] px-6 py-8 text-center text-[30px] font-extrabold tracking-[-.5px] text-amber-200`}>
                      {l('Команды выбирают капитанов...', 'Teams are choosing captains...')}
                    </div>
                  ) : (
                    <div className={`${H2O_TV_GLASS} flex flex-1 items-center justify-center rounded-[var(--radius-xl)] px-6 py-8 text-center text-[30px] font-extrabold tracking-[-.5px] text-amber-200`}>
                      {l('Игроки выбирают название команды...', 'Players are choosing a team name...')}
                    </div>
                  )}
                </div>
                {[2].map(() => {
                  const teamPlayers = h2oTeamPlayers(2);
                  const captainId = h2oCaptain(2);
                  return (
                    <div key="team2" className="flex flex-col gap-[14px] rounded-[var(--radius-2xl)] border border-red-300/25 bg-red-400/[.10] p-[30px]">
                      <div className="flex items-center gap-[14px]">
                        <H2OTeamDot team={2} />
                        <span className="text-[34px] font-extrabold tracking-[-.5px]">{h.t2n}</span>
                        <span className="ml-auto font-mono text-[15px] font-semibold text-white/40">{teamPlayers.length} игрока</span>
                      </div>
                      <div className="mb-1 mt-[-4px] font-mono text-[13.5px] uppercase tracking-[2px] text-white/35">
                        {captainId ? <>Капитан — <b className="text-amber-200">{h2oPlayerName(captainId)}</b></> : h.phase === 'teamNames' ? <>Название — <b className="text-amber-200">выбирают</b></> : <>Капитан — <b className="text-amber-200">голосование идёт</b></>}
                      </div>
                      {teamPlayers.map((p) => (
                        <div key={p.id} className={`${H2O_TV_GLASS} flex items-center gap-3 rounded-full py-[9px] pl-[9px] pr-4 ${captainId === p.id ? 'border-amber-300/50 bg-amber-500/[.09]' : ''}`}>
                          <PlayerAvatar nickname={p.nickname} sizePx={46} />
                          <span className="text-[22px] font-bold tracking-[-.3px]">{p.nickname}</span>
                          {captainId === p.id && <HundredToOneIcon name="trophy" className="ml-auto h-6 w-6 text-amber-200" />}
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
              <div className="mt-[26px] flex justify-center">
                <H2ORemoteHint><span>{h.phase === 'roleSelect' ? 'Выбор ролей' : h.phase === 'captainSelect' ? 'Выбор капитанов' : 'Названия команд'} —</span> <b className="text-white/85">на телефонах игроков</b></H2ORemoteHint>
              </div>
            </>
          )}

          {/* Buzzer phase */}
          {h.phase === 'buzzer' && (
            <>
              <div className="grid grid-cols-[1fr_auto_1fr] items-center">
                <H2OTVBrand />
                <div className={`${H2O_TV_GLASS} rounded-full px-[30px] py-[14px]`}>
                  <b className="text-[26px] font-extrabold uppercase tracking-[2px] text-amber-200">РАУНД {h.curQ + 1} · КТО НАЧИНАЕТ?</b>
                </div>
                <div className="flex justify-end">{h2oLivePill}</div>
              </div>
              <div className="grid flex-1 grid-cols-[1fr_auto_1fr] items-center gap-[60px]">
                <div className={`${H2O_TV_GLASS_STRONG} flex flex-col items-center gap-[18px] rounded-[var(--radius-2xl)] p-[40px_30px] transition-all duration-500 ${
                  h.buzzerWinner === 1
                    ? 'border-[3px] border-yellow-300 bg-yellow-300/[.18] shadow-[0_0_50px_rgba(250,204,21,.4)]'
                    : h.buzzerWinner === 2
                      ? 'border-yellow-200/10 bg-yellow-300/[.04] opacity-50'
                      : 'border-yellow-200/25 bg-yellow-300/[.10]'
                }`}>
                  <PlayerAvatar nickname={h2oCaptain(1) ? h2oPlayerName(h2oCaptain(1) || '') : '—'} sizePx={118} />
                  <div className="text-[40px] font-extrabold tracking-[-.6px]">{h2oCaptain(1) ? h2oPlayerName(h2oCaptain(1) || '') : '—'}</div>
                  <div className="flex items-center gap-[10px] font-mono text-[15px] font-semibold uppercase tracking-[2px] text-white/40">
                    <H2OTeamDot team={1} />
                    Капитан · {h.t1n}
                  </div>
                  <div className="text-[20px] font-bold text-white/35">{h.buzzerWinner === 1 ? 'нажал первым' : 'рука на кнопке…'}</div>
                </div>
                <div className="flex flex-col items-center gap-[18px]">
                  <div className={`${h.buzzerWinner ? (h.buzzerWinner === 1 ? 'border-yellow-300/60 text-[#ffe155]' : 'border-red-300/60 text-[#ff7a70]') : 'border-amber-300/50 text-[#fffbeb]'} flex h-[320px] w-[320px] items-center justify-center rounded-full border-2 bg-[radial-gradient(90%_60%_at_50%_10%,rgba(255,255,255,.25),transparent_55%),rgba(245,158,11,.14)] text-[160px] font-extrabold leading-none shadow-[0_0_60px_rgba(245,158,11,.25)]`}>
                    {h.buzzerWinner ? (h.buzzerWinner === 1 ? h.t1n.slice(0, 1) : h.t2n.slice(0, 1)) : h.buzzerCountdown > 0 ? h.buzzerCountdown : h.buzzerCountdown === 0 ? '0' : '—'}
                  </div>
                  <div className="font-mono text-[17px] font-semibold uppercase tracking-[5px] text-amber-400">
                    {h.buzzerWinner ? `${h.buzzerWinner === 1 ? h.t1n : h.t2n} начинает` : 'Готовьтесь'}
                  </div>
                </div>
                <div className={`${H2O_TV_GLASS_STRONG} flex flex-col items-center gap-[18px] rounded-[var(--radius-2xl)] p-[40px_30px] transition-all duration-500 ${
                  h.buzzerWinner === 2
                    ? 'border-[3px] border-red-400 bg-red-500/[.28] shadow-[0_0_70px_rgba(248,113,113,.65)]'
                    : h.buzzerWinner === 1
                      ? 'border-red-300/10 bg-red-400/[.04] opacity-50'
                      : 'border-red-300/25 bg-red-400/[.10]'
                }`}>
                  <PlayerAvatar nickname={h2oCaptain(2) ? h2oPlayerName(h2oCaptain(2) || '') : '—'} sizePx={118} />
                  <div className="text-[40px] font-extrabold tracking-[-.6px]">{h2oCaptain(2) ? h2oPlayerName(h2oCaptain(2) || '') : '—'}</div>
                  <div className="flex items-center gap-[10px] font-mono text-[15px] font-semibold uppercase tracking-[2px] text-white/40">
                    <H2OTeamDot team={2} />
                    Капитан · {h.t2n}
                  </div>
                  <div className="text-[20px] font-bold text-white/35">{h.buzzerWinner === 2 ? 'нажал первым' : 'рука на кнопке…'}</div>
                </div>
              </div>
              <div className="flex justify-center">
                <H2ORemoteHint>
                  <span className="flex flex-col text-center leading-[1.25]">
                    <span>Кто первым нажмёт буззер —</span>
                    <b className="text-white/85">та команда атакует раунд</b>
                  </span>
                </H2ORemoteHint>
              </div>
            </>
          )}

          {/* Playing phase */}
          {h.phase === 'playing' && q && (
            <>
              <div className="grid grid-cols-[1fr_auto_1fr] items-center">
                <H2OTVBrand />
                <div className={`${H2O_TV_GLASS} inline-flex items-center gap-[14px] rounded-full px-[30px] py-[14px]`}>
                  <HundredToOneIcon name="board" className="h-[26px] w-[26px] text-amber-400" />
                  <b className="text-[26px] font-extrabold uppercase tracking-[2px] text-amber-200">РАУНД {h.curQ + 1} · {H2O_ROUND_NAMES[h.curQ]}</b>
                  <span className="rounded-full border border-amber-300/40 bg-amber-500/[.13] px-3 py-1 font-mono text-[20px] font-bold text-amber-400">×{h.curQ + 1}</span>
                </div>
                <div className="flex justify-end">{h2oLivePill}</div>
              </div>

              <div className="mt-[22px] grid grid-cols-[1fr_auto_1fr] items-center gap-[30px]">
                {[1, 2].map((team) => {
                  const teamNum = team as 1 | 2;
                  const active = activeTeam === teamNum && h.curQ <= 2;
                  const name = teamNum === 1 ? h.t1n : h.t2n;
                  const score = teamNum === 1 ? h.t1s : h.t2s;
                  return (
                    <div key={team} className={`${H2O_TV_GLASS_STRONG} relative flex items-center gap-5 rounded-[var(--radius-xl)] border px-7 py-5 ${teamNum === 1 ? 'border-yellow-200/25 bg-yellow-300/[.10]' : 'row-start-1 col-start-3 flex-row-reverse border-red-300/25 bg-red-400/[.10] text-right'} ${active ? 'before:pointer-events-none before:absolute before:inset-[-3px] before:rounded-[inherit] before:border-2 before:border-yellow-300/60 before:shadow-[0_0_40px_-6px_rgba(255,214,10,.4)]' : ''}`}>
                      <div className="flex min-w-0 flex-col gap-1">
                        <span className={`flex items-center gap-3 text-[30px] font-extrabold tracking-[-.4px] ${teamNum === 2 ? 'flex-row-reverse' : ''}`}><H2OTeamDot team={teamNum} />{name}</span>
                        <span className="font-mono text-[13px] uppercase tracking-[2px] text-white/35">{active ? 'атакуют' : 'ждут хода'}</span>
                      </div>
                      <span className={`ml-auto text-[62px] font-extrabold tabular-nums tracking-[0] ${teamNum === 1 ? 'text-[#ffe155]' : 'mr-auto ml-0 text-[#ff7a70]'}`}>{score}</span>
                    </div>
                  );
                })}
                <div className={`${H2O_TV_GLASS_STRONG} col-start-2 min-w-[220px] rounded-[var(--radius-2xl)] px-11 py-[18px]`}>
                  <div className="flex flex-col items-center">
                    <span className="font-mono text-[14px] uppercase tracking-[3px] text-white/40">{h.curQ <= 2 ? 'Банк раунда' : 'Обсуждение'}</span>
                    <span className={`text-[66px] font-extrabold leading-none tabular-nums tracking-[0] ${h.curQ <= 2 ? 'text-amber-200' : h.r4Time <= 10 && h.r4Time > 0 ? 'text-red-300' : 'text-amber-200'}`}>
                      {h.curQ <= 2 ? h.roundFund[h.curQ] : `${Math.floor(h.r4Time / 60)}:${(h.r4Time % 60).toString().padStart(2, '0')}`}
                    </span>
                  </div>
                </div>
              </div>

              <div className={`${H2O_TV_GLASS_STRONG} mx-auto mt-5 flex w-[1160px] items-center gap-[22px] rounded-[var(--radius-xl)] px-[34px] py-5`}>
                <span className="flex h-[58px] w-[58px] flex-shrink-0 items-center justify-center rounded-[16px] border border-amber-300/35 bg-amber-500/[.13] text-amber-200">
                  <HundredToOneIcon name="question" className="h-8 w-8" />
                </span>
                <span className="text-balance text-[36px] font-extrabold tracking-[-.6px]">{q.q}</span>
              </div>

              <div className="mx-auto mt-[18px] flex w-[1160px] min-h-0 flex-1 items-stretch gap-[14px]">
                {h.curQ <= 2 && (
                  <div className="flex w-[74px] flex-shrink-0 flex-col gap-[8px]">
                    {[0, 1, 2].map(i => (
                      <span key={i} className={`flex flex-1 items-center justify-center rounded-[var(--radius-md)] border ${i < h.strikes[h.curQ][0] ? 'border-red-300/60 bg-red-500/18 text-red-300 shadow-[0_0_24px_-10px_rgba(255,69,58,.55)]' : 'border-white/12 bg-white/[.04] text-white/18'}`}>
                        <HundredToOneIcon name="cross" className="h-[30px] w-[30px]" strokeWidth={2.4} />
                      </span>
                    ))}
                  </div>
                )}

                <div className="grid min-h-0 flex-1 grid-rows-6 gap-[8px]">
                  {q.answers.map((a, idx) => {
                    const revealed = h.qState[h.curQ]?.[idx]?.pub;
                    const pts = h2oGetDisplayPts(h.curQ, idx, a.p);
                    return (
                      <div key={idx} className={`flex min-h-0 items-center gap-5 rounded-[var(--radius-md)] border pr-[30px] ${revealed ? 'border-amber-300/45 bg-amber-300/[.18]' : 'border-white/10 bg-white/[.045]'}`}>
                        <span className={`flex h-full w-[76px] items-center justify-center rounded-l-[var(--radius-md)] text-[25px] font-bold ${revealed ? 'bg-amber-500 text-[#341f02]' : 'bg-black/[.16] text-white/30'}`}>{idx + 1}</span>
                        <span className={`min-w-0 flex-1 truncate font-bold ${revealed ? 'text-[30px]' : 'text-[24px] tracking-[8px] text-white/18'}`}>{revealed ? a.t : '? ? ? ? ?'}</span>
                        <span className={`text-[30px] font-bold ${revealed ? 'text-amber-100' : 'text-white/12'}`}>{revealed ? pts : '··'}</span>
                      </div>
                    );
                  })}
                </div>

                {h.curQ <= 2 && (
                  <div className="flex w-[74px] flex-shrink-0 flex-col gap-[8px]">
                    {[0, 1, 2].map(i => (
                      <span key={i} className={`flex flex-1 items-center justify-center rounded-[var(--radius-md)] border ${i < h.strikes[h.curQ][1] ? 'border-red-300/60 bg-red-500/18 text-red-300 shadow-[0_0_24px_-10px_rgba(255,69,58,.55)]' : 'border-white/12 bg-white/[.04] text-white/18'}`}>
                        <HundredToOneIcon name="cross" className="h-[30px] w-[30px]" strokeWidth={2.4} />
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-4 flex justify-center">
                <div className={`${H2O_TV_GLASS} inline-flex items-center gap-3 rounded-full px-6 py-[12px] text-[21px] font-bold text-white/65`}>
                  <HundredToOneIcon name="mic" className="h-6 w-6 text-amber-400" />
                  Отвечает команда <b className="text-[#ffe155]">{activeTeam === 1 ? h.t1n : activeTeam === 2 ? h.t2n : '—'}</b> — ведущий открывает ответы
                </div>
              </div>
            </>
          )}

          {/* Results phase */}
          {h.phase === 'results' && (
            <>
              <div className="flex items-center justify-between">
                <H2OTVBrand />
                {h2oLivePill}
              </div>
              <div className="flex flex-1 flex-col items-center justify-center gap-8 text-center">
                <h2 className="text-[96px] font-extrabold tracking-[-3px] text-amber-300">ИТОГИ РАУНДОВ</h2>
                <div className="flex items-center justify-center gap-10">
                  <div className={`${H2O_TV_GLASS_STRONG} rounded-[var(--radius-2xl)] border-yellow-200/25 bg-yellow-300/[.10] p-10`}>
                    <p className="mb-2 text-[34px] font-extrabold text-[#ffe155]">{h.t1n}</p>
                    <p className="text-[96px] font-extrabold leading-none">{h.t1s}</p>
                  </div>
                  <div className="text-[44px] font-extrabold text-amber-400">VS</div>
                  <div className={`${H2O_TV_GLASS_STRONG} rounded-[var(--radius-2xl)] border-red-300/25 bg-red-400/[.10] p-10`}>
                    <p className="mb-2 text-[34px] font-extrabold text-[#ff7a70]">{h.t2n}</p>
                    <p className="text-[96px] font-extrabold leading-none">{h.t2s}</p>
                  </div>
                </div>
                <p className="text-[30px] text-white/50">
                  Побеждает: <span className="font-bold text-amber-200">{h.t1s >= h.t2s ? h.t1n : h.t2n}</span>
                </p>
              </div>
              <div className="flex justify-center">
                <H2ORemoteHint><span>Ведущий запускает</span> <b className="text-white/85">Большую игру</b></H2ORemoteHint>
              </div>
            </>
          )}

          {/* Big Game phase */}
          {h.phase === 'bigGame' && (
            h.bgPhase === 0 ? (
              <>
                <div className="flex items-center justify-between">
                  <H2OTVBrand />
                  {h2oLivePill}
                </div>
                <div className="flex flex-1 flex-col items-center justify-center gap-9 text-center">
                  <div className={`${H2O_TV_ACCENT} flex h-[148px] w-[148px] items-center justify-center rounded-[40px] text-[#341f02]`}>
                    <HundredToOneIcon name="shuffle" className="h-[78px] w-[78px]" strokeWidth={1.7} />
                  </div>
                  <div className={`${H2O_TV_GLASS_STRONG} flex max-w-[720px] flex-col items-center gap-4 rounded-[var(--radius-2xl)] px-12 py-10`}>
                    <div className="font-mono text-[15px] font-bold uppercase tracking-[4px] text-amber-200/75">
                      {l('Большая игра', 'Big game')}
                    </div>
                    <h2 className="text-balance text-[54px] font-extrabold leading-[1.02] tracking-[-1.5px] text-white">
                      {l('Капитан выбирает игроков…', 'Captain is choosing players…')}
                    </h2>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="grid grid-cols-[1fr_auto_1fr] items-center">
                  <H2OTVBrand />
                  <div className={`${H2O_TV_GLASS} inline-flex items-center gap-[14px] rounded-full px-[30px] py-[14px]`}>
                    <HundredToOneIcon name="shuffle" className="h-[26px] w-[26px] text-amber-400" />
                    <b className="text-[26px] font-extrabold uppercase tracking-[2px] text-amber-200">
                      БОЛЬШАЯ ИГРА · {h.bgPhase <= 2 ? 'ИГРОК 1 — 30 СЕК' : 'ИГРОК 2 — 40 СЕК'}
                    </b>
                  </div>
                  <div className="flex justify-end">{h2oLivePill}</div>
                </div>
                <div className="mt-[26px] grid min-h-0 flex-1 grid-cols-[1fr_380px] gap-[30px]">
                  <div className={`flex min-h-0 flex-col gap-3 ${(h.bgPhase === 1 || h.bgPhase === 3) ? 'justify-center' : ''}`}>
                    {(h.bgPhase === 1 || h.bgPhase === 3) && h.bgCurQ >= 5 ? (
                      <div className={`${H2O_TV_GLASS} flex flex-1 items-center justify-center rounded-[var(--radius-xl)] px-6 py-8 text-center text-[30px] font-extrabold tracking-[-.5px] text-amber-200`}>
                        {l(
                          `Игрок ${h2oPlayerName(h.bgPhase === 1 ? h.bgP1Id : h.bgP2Id)} ответил на все вопросы — ждём проверки ведущего`,
                          `${h2oPlayerName(h.bgPhase === 1 ? h.bgP1Id : h.bgP2Id)} answered all questions — waiting for the host to check`
                        )}
                      </div>
                    ) : (
                      activeBigQ.map((qq, i) => {
                        if ((h.bgPhase === 1 || h.bgPhase === 3) && i !== h.bgCurQ) return null;
                        const ans1 = h.bgP1Ans[i];
                        const ans2 = h.bgP2Ans[i];
                        const match1 = h.bgP1Matched[i];
                        const match2 = h.bgP2Matched[i];
                        const current = i === h.bgCurQ && (h.bgPhase === 1 || h.bgPhase === 3);
                        const chip = (ans?: string, match?: string | null) => {
                          if (!ans) return <span className="rounded-full border border-dashed border-white/16 bg-white/[.04] px-4 py-2 font-bold tracking-[3px] text-white/25">···</span>;
                          if (match) return <span className="inline-flex items-center gap-2 rounded-full border border-green-300/40 bg-green-500/[.13] px-4 py-2 text-[19px] font-bold text-green-300"><HundredToOneIcon name="check" className="h-[19px] w-[19px]" strokeWidth={2.2} />{ans} +{qq.answers.find(a => a.t === match)?.p || 0}</span>;
                          return <span className="inline-flex items-center gap-2 rounded-full border border-red-300/35 bg-red-500/[.11] px-4 py-2 text-[19px] font-bold text-red-200"><HundredToOneIcon name="cross" className="h-[19px] w-[19px]" strokeWidth={2.2} />{ans}</span>;
                        };
                        return (
                          <div key={i} className={`flex items-center gap-5 rounded-[var(--radius-xl)] border px-[26px] py-4 backdrop-blur-[20px] ${(h.bgPhase === 1 || h.bgPhase === 3) ? '' : 'flex-1'} ${current ? 'border-amber-300/50 bg-amber-500/[.08]' : 'border-white/10 bg-white/[.06]'}`}>
                            <span className={`w-[30px] font-mono text-[20px] font-bold ${current ? 'text-amber-400' : 'text-white/25'}`}>{i + 1}</span>
                            <span className="min-w-0 flex-1 text-[27px] font-bold tracking-[-.4px]">{qq.q}</span>
                            {chip(ans1, match1)}
                            {chip(ans2, match2)}
                          </div>
                        );
                      })
                    )}
                  </div>
                  <div className="flex flex-col gap-[22px]">
                    <div className={`${H2O_TV_GLASS_STRONG} flex flex-1 flex-col items-center justify-center gap-[10px] rounded-[var(--radius-2xl)]`}>
                      <span className="font-mono text-[15px] uppercase tracking-[4px] text-white/40">Осталось</span>
                      <span className="text-[128px] font-extrabold leading-none tracking-[-4px] text-[#fffbeb] drop-shadow-[0_0_44px_rgba(245,158,11,.4)]">
                        {Math.floor(h.bgTimeLeft / 60)}:{(h.bgTimeLeft % 60).toString().padStart(2, '0')}
                      </span>
                      <div className="mt-1 flex items-center gap-3">
                        <PlayerAvatar nickname={h2oPlayerName(h.bgPhase <= 2 ? h.bgP1Id : h.bgP2Id)} sizePx={42} />
                        <b className="text-[22px]">{h2oPlayerName(h.bgPhase <= 2 ? h.bgP1Id : h.bgP2Id)}</b>
                      </div>
                    </div>
                    <div className={`${H2O_TV_ACCENT} flex flex-col items-center gap-1.5 rounded-[var(--radius-2xl)] px-5 py-[26px] text-[#341f02]`}>
                      <span className="font-mono text-[15px] uppercase tracking-[4px] opacity-75">Фонд</span>
                      <span className="text-[84px] font-extrabold leading-none tracking-[-3px]">{h.bgFund}</span>
                      <span className="font-mono text-[15px] font-semibold tracking-[1px] opacity-75">цель — 200 очков</span>
                    </div>
                  </div>
                </div>
              </>
            )
          )}

          {/* Final phase */}
          {h.phase === 'final' && (
            <>
              <div className="flex items-center justify-between">
                <H2OTVBrand />
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[.06] px-4 py-2 font-mono text-[14px] font-bold uppercase tracking-[1px] text-white/55 backdrop-blur-[20px]">
                  <span className="h-2 w-2 rounded-full bg-amber-300 shadow-[0_0_12px_rgba(245,158,11,.8)]" />
                  Большая игра завершена
                </div>
              </div>
              <div className="flex flex-1 flex-col items-center justify-center gap-[34px] text-center">
                <div className={`${H2O_TV_ACCENT} flex h-[168px] w-[168px] items-center justify-center rounded-[46px] text-[#341f02]`}>
                  <HundredToOneIcon name="trophy" className="h-[92px] w-[92px]" strokeWidth={1.6} />
                </div>
                <h2 className="bg-[linear-gradient(180deg,#fde68a_10%,#f59e0b_60%,#d97706_95%)] bg-clip-text text-[132px] font-extrabold leading-[.92] tracking-[-4px] text-transparent drop-shadow-[0_14px_44px_rgba(245,158,11,.4)]">
                  {h.bgFund >= 200 ? 'ПОБЕДА!' : 'ФИНАЛ'}
                </h2>
                <div className={`${H2O_TV_GLASS_STRONG} flex items-center gap-4 rounded-full border-yellow-200/25 bg-yellow-300/[.10] px-9 py-[18px]`}>
                  <H2OTeamDot team={h.winTeam === 2 ? 2 : 1} />
                  <span className="text-[40px] font-extrabold tracking-[-.5px]">{h.winTeam === 2 ? h.t2n : h.t1n}</span>
                  <span className="text-[26px] font-bold text-white/40">{h.bgFund >= 200 ? 'забирают игру' : 'сыграли Большую игру'}</span>
                </div>
                <div className="flex items-center gap-[26px]">
                  <div className={`${H2O_TV_GLASS} rounded-[var(--radius-xl)] px-10 py-5`}><span className="block font-mono text-[13px] uppercase tracking-[3px] text-white/40">{h2oPlayerName(h.bgP1Id)}</span><span className="text-[52px] font-extrabold">{h.bgP1Matched.reduce((sum, m, i) => sum + (m ? activeBigQ[i]?.answers.find(a => a.t === m)?.p || 0 : 0), 0)}</span></div>
                  <span className="text-[38px] font-extrabold text-white/25">+</span>
                  <div className={`${H2O_TV_GLASS} rounded-[var(--radius-xl)] px-10 py-5`}><span className="block font-mono text-[13px] uppercase tracking-[3px] text-white/40">{h2oPlayerName(h.bgP2Id)}</span><span className="text-[52px] font-extrabold">{h.bgP2Matched.reduce((sum, m, i) => sum + (m ? activeBigQ[i]?.answers.find(a => a.t === m)?.p || 0 : 0), 0)}</span></div>
                  <span className="text-[38px] font-extrabold text-white/25">=</span>
                  <div className="rounded-[var(--radius-xl)] border border-green-300/40 bg-green-500/[.08] px-10 py-5"><span className="block font-mono text-[13px] uppercase tracking-[3px] text-green-300/80">Фонд · цель 200</span><span className="text-[52px] font-extrabold text-green-300 drop-shadow-[0_0_34px_rgba(48,209,88,.5)]">{h.bgFund}</span></div>
                </div>
              </div>
              <div className="flex justify-center">
                <H2ORemoteHint><span>Ведущий вернёт всех</span> <b className="text-white/85">в лобби</b></H2ORemoteHint>
              </div>
            </>
          )}
        </div>
        {qrOverlay}
      </GameSurface>
    );
  }

  // ===================== SPY TV RENDER =====================
  if (gameType === 'spy') {
    const sp = spyState;
    const spyPlayerList = sp.players.length > 0 ? sp.players : players;
    const spyGetName = (id: string) => spyPlayerList.find(p => p.id === id)?.nickname ?? id;
    const activePlayerId = sp.mode === 'guess'
      ? (sp.guessAskerId || sp.playerOrder[sp.playerOrderIdx % Math.max(sp.playerOrder.length, 1)] || '')
      : (sp.playerOrder[sp.playerOrderIdx % Math.max(sp.playerOrder.length, 1)] ?? '');
    const activePlayerName = spyGetName(activePlayerId);
    const targetPlayerName = sp.guessTargetId ? spyGetName(sp.guessTargetId) : '???';
    const formatSec = (sec: number) =>
      `${Math.floor(sec / 60)}:${(sec % 60).toString().padStart(2, '0')}`;
    const spyName = spyGetName(sp.spyId);
    const CIRC = 741.4;
    const timerRatio = Math.max(0, Math.min(1, sp.timerLeft / 300));
    const timerOffset = CIRC * (1 - timerRatio);
    const timerColor = sp.timerLeft <= 30 ? '#ff453a' : sp.timerLeft <= 90 ? '#ffd60a' : '#64d2ff';

    return (
      <GameSurface className="h-screen bg-gradient-spy text-white flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-8 py-4 border-b border-white/10 flex-shrink-0">
          <div className="flex items-center gap-3">
            <SpyImg name="mask" className="h-8 w-8" />
            <div>
              <h1 className="text-2xl font-bold leading-none">Шпион</h1>
              <p className="text-xs text-white/40 font-mono uppercase tracking-widest">Party Hub</p>
            </div>
          </div>
          {sp.phase === 'playing' && (
            <div className="glass-card px-4 py-2 text-sm">
              Раунд <span className="font-bold text-teal-300">{sp.currentRound}</span>
              {' · '}
              {sp.category && <span>{sp.category}</span>}
            </div>
          )}
          {sp.phase === 'voting' && (
            <div className="glass-card px-4 py-2 flex items-center gap-2">
              <span>⏱</span>
              <span className="font-mono font-bold text-xl">{formatSec(sp.voteTimerLeft)}</span>
            </div>
          )}
          {sp.phase === 'discussion' && (
            <div className="glass-card px-4 py-2 flex items-center gap-2">
              <span>⏱</span>
              <span className="font-mono font-bold text-xl">{formatSec(sp.discussionTimeLeft)}</span>
            </div>
          )}
          {(sp.phase === 'dealing' || sp.phase === 'playing') && (
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
              <span className="text-sm text-white/60">{spyPlayerList.length} в игре</span>
            </div>
          )}
        </div>

        <div className="flex-1 min-h-0 overflow-hidden">
          {sp.gameOver && (
            <div className="h-full flex flex-col items-center justify-center gap-8 px-12">
              <h2 className="text-6xl font-black">Игра окончена!</h2>
            </div>
          )}

          {!sp.gameOver && sp.phase === 'modeSelect' && (
            <div className="h-full flex flex-col items-center justify-center gap-6">
              <SpyImg name="mask" className="h-32 w-32" />
              <h2 className="text-7xl font-black tracking-tight">ШПИОН</h2>
              <p className="text-2xl text-white/40 animate-pulse">Ожидание ведущего…</p>
            </div>
          )}

          {!sp.gameOver && sp.phase === 'dealing' && (
            <div className="h-full flex flex-col items-center justify-center gap-8 px-16">
              <div className="text-center">
                <p className="text-xl text-white/40 uppercase tracking-[4px] font-mono mb-3">Категория раунда</p>
                <div className="flex items-center justify-center gap-4">
                  <span className="text-7xl font-black">{sp.category}</span>
                </div>
              </div>
              <p className="text-xl text-white/60">
                Слово отправлено на телефоны · <span className="text-teal-300"><SpyImg name="mask" className="inline-block h-[1em] w-[1em] align-[-0.15em] mr-1" />Один из вас — шпион. Он слова не получил.</span>
              </p>
              <div className="w-full">
                <p className="text-center text-white/40 text-sm mb-3">
                  Посмотрели слово: <b>{sp.readyPlayers.length}</b> / {spyPlayerList.length}
                </p>
                <div className="flex flex-wrap gap-3 justify-center">
                  {spyPlayerList.map(p => {
                    const ready = sp.readyPlayers.includes(p.id);
                    return (
                      <div key={p.id} className={`glass-card px-4 py-2 flex items-center gap-2 transition-all ${ready ? 'border-teal-400/40' : 'opacity-50'}`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${ready ? 'bg-teal-500/30' : 'bg-white/10'}`}>
                          {p.nickname[0]}
                        </div>
                        <span>{p.nickname}</span>
                        {ready && <SpyImg name="check" className="h-5 w-5" />}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {!sp.gameOver && sp.phase === 'playing' && sp.mode === 'draw' && (
            <div className="relative h-full flex flex-col items-center justify-center gap-4 px-12 py-6">
              <div className="absolute top-6 left-6 z-10 h-[120px] w-[120px]">
                <svg viewBox="0 0 260 260" width="120" height="120">
                  <circle cx="130" cy="130" r="118" stroke="rgba(255,255,255,.08)" strokeWidth="14" fill="none" />
                  <circle
                    cx="130"
                    cy="130"
                    r="118"
                    stroke={timerColor}
                    strokeWidth="14"
                    fill="none"
                    strokeLinecap="round"
                    strokeDasharray={CIRC}
                    strokeDashoffset={timerOffset}
                    style={{ filter: `drop-shadow(0 0 14px ${timerColor}80)`, transition: 'stroke-dashoffset 1s linear' }}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="font-mono text-3xl font-black tabular-nums">{sp.timerLeft}</span>
                </div>
              </div>
              <p className="text-2xl text-white/50">
                <SpyImg name="palette" className="inline-block h-[1em] w-[1em] align-[-0.15em] mr-1" />
                {l('Рисует: ', 'Drawing: ')}
                <span className="font-bold text-amber-400">{activePlayerName}</span>
              </p>
              <div className="flex-1 min-h-0 w-full flex items-center justify-center">
                <canvas
                  ref={initSpyCanvas}
                  className="rounded-2xl bg-black/30 border-2 border-white/10"
                  style={{ height: '100%', maxWidth: '100%', maxHeight: '100%', aspectRatio: '1' }}
                />
              </div>
            </div>
          )}

          {!sp.gameOver && sp.phase === 'playing' && sp.mode !== 'draw' && (
            <div className="h-full flex gap-8 px-12 py-6">
              <div className="flex flex-col items-center justify-center gap-4 flex-shrink-0">
                <div className="relative h-[260px] w-[260px]">
                  <svg width="260" height="260">
                    <circle cx="130" cy="130" r="118" stroke="rgba(255,255,255,.08)" strokeWidth="14" fill="none" />
                    <circle
                      cx="130"
                      cy="130"
                      r="118"
                      stroke={timerColor}
                      strokeWidth="14"
                      fill="none"
                      strokeLinecap="round"
                      strokeDasharray={CIRC}
                      strokeDashoffset={timerOffset}
                      style={{ filter: `drop-shadow(0 0 14px ${timerColor}80)`, transition: 'stroke-dashoffset 1s linear' }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="font-mono text-6xl font-black tabular-nums">{sp.timerLeft}</span>
                    <span className="text-lg text-white/40 uppercase tracking-widest">ход</span>
                  </div>
                </div>
              </div>
              <div className="flex-1 flex flex-col justify-center gap-6">
                <div>
                  <p className="text-lg text-teal-300 uppercase tracking-widest mb-2">Задаёт вопрос</p>
                  <span className="text-5xl font-black">{activePlayerName}</span>
                  <p className="text-2xl text-white/60 mt-2">→ {targetPlayerName}</p>
                  <p className="text-white/40 mt-2">Опиши слово одним предложением — но не называй его</p>
                </div>
                <div className="glass-card px-6 py-4">
                  <span className="text-white/40 text-sm">Категория</span>
                  <p className="text-2xl font-bold mt-1">{sp.category}</p>
                  <p className="text-white/30 mt-1 text-sm font-mono uppercase tracking-widest">СЛОВО СКРЫТО</p>
                </div>
              </div>
            </div>
          )}

          {!sp.gameOver && sp.phase === 'spyGuess' && (
            <div className="h-full flex flex-col items-center justify-center gap-6 px-12">
              <SpyImg name="mask" className="h-24 w-24" />
              <h2 className="text-6xl font-black text-center">
                {l('Шпион', 'Spy')} <span className="text-red-300">{spyName}</span>
              </h2>
              <p className="text-3xl text-white/60">{l('угадывает слово…', 'is guessing the word...')}</p>
              {sp.spyGuessAwaitingJudge && (
                <p className="text-xl text-teal-300">{l(`${spyGetName(sp.spyGuessJudgeId)} проверяет ответ`, `${spyGetName(sp.spyGuessJudgeId)} is checking the answer`)}</p>
              )}
            </div>
          )}

          {!sp.gameOver && sp.phase === 'discussion' && (
            <div className="h-full flex flex-col items-center justify-center gap-6 px-12">
              <h2 className="text-6xl font-black text-center">Обсуждение</h2>
              <p className="text-2xl text-white/50 text-center max-w-2xl">
                Обсудите, кто кажется подозрительным
              </p>
              <div className="font-mono text-5xl font-black text-amber-300">
                {formatSec(sp.discussionTimeLeft)}
              </div>
            </div>
          )}

          {!sp.gameOver && sp.phase === 'voting' && (
            <div className="h-full flex flex-col px-12 py-6 gap-6">
              <div className="flex items-center justify-center gap-4">
                <h2 className="text-5xl font-black">Кто шпион?</h2>
                <div className="glass-card px-4 py-2 text-sm">
                  Проголосовали <b>{Object.keys(sp.votes).length}</b> / {spyPlayerList.length}
                </div>
              </div>
              <div className="flex-1 flex items-center justify-center">
                <div className="flex gap-4 flex-wrap justify-center">
                  {spyPlayerList.map(p => {
                    const votesFor = Object.values(sp.votes).filter(v => v === p.id).length;
                    const maxVotes = Math.max(1, ...spyPlayerList.map(pp =>
                      Object.values(sp.votes).filter(v => v === pp.id).length
                    ));
                    const barPct = Math.round((votesFor / maxVotes) * 100);
                    return (
                      <div key={p.id} className={`glass-card px-6 py-5 flex flex-col items-center gap-3 min-w-[160px] ${votesFor === maxVotes && votesFor > 0 ? 'border-amber-400/40' : ''}`}>
                        {votesFor === maxVotes && votesFor > 0 && (
                          <span className="text-xs font-mono uppercase text-amber-400 tracking-widest">лидер</span>
                        )}
                        <span className="font-semibold">{p.nickname}</span>
                        <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                          <div className="h-full rounded-full bg-teal-400 transition-all" style={{ width: `${barPct}%` }} />
                        </div>
                        <div className="font-bold text-xl">{votesFor}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {!sp.gameOver && sp.phase === 'roundResult' && sp.roundResult && (
            <div className="h-full flex flex-col px-12 py-6 gap-6">
              <div className={`rounded-2xl px-6 py-4 flex items-center gap-4 ${sp.roundResult.spyCaught ? 'bg-green-500/20 border border-green-400/30' : 'bg-red-500/20 border border-red-400/30'}`}>
                {sp.roundResult.spyCaught ? <SpyImg name="check" className="h-8 w-8" /> : <SpyImg name="cross" className="h-8 w-8" />}
                <div>
                  <p className="text-2xl font-bold">{sp.roundResult.spyCaught ? 'Мирные вычислили шпиона!' : 'Шпион победил!'}</p>
                </div>
              </div>
              <div className="flex-1 min-h-0 flex items-center justify-center">
                <div className="flex w-full gap-6">
                  <div className="glass-card spy-card flex-1 flex flex-col items-center justify-center gap-4 p-8">
                    <p className="text-white/40 text-sm uppercase tracking-widest">Шпионом был(а)</p>
                    <div className="relative">
                      <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center text-3xl font-bold">
                        {spyName[0]}
                      </div>
                      <SpyImg name="mask" className="absolute -bottom-1 -right-1 h-5 w-5" />
                    </div>
                    <p className="text-white/40 text-sm">
                      {sp.roundResult.viaGuess
                        ? l('Шпион пытался угадать слово', 'Spy attempted to guess the word')
                        : l(`${sp.roundResult.voteCount} из ${spyPlayerList.length} голосов`, `${sp.roundResult.voteCount} of ${spyPlayerList.length} votes`)}
                    </p>
                  </div>
                  <div className="glass-card spy-card flex-1 flex flex-col items-center justify-center gap-4 p-8">
                    <p className="text-white/40 text-sm uppercase tracking-widest">Загаданное слово</p>
                    <p className="text-white/60 text-lg">Категория · {sp.category}</p>
                    <p className="text-6xl font-black">{sp.word}</p>
                    {sp.roundResult.viaGuess && (
                      <p className="text-sm text-white/40">{l('Шпион пытался угадать слово', 'Spy attempted to guess the word')}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {sp.phase === 'playing' && sp.playerOrder.length > 0 && !sp.gameOver && (
          <div className="flex-shrink-0 border-t border-white/10 px-8 py-3">
            <div className="flex items-center gap-3 overflow-x-auto">
              <p className="text-xs text-white/30 uppercase tracking-widest flex-shrink-0">Порядок хода</p>
              {sp.playerOrder.map((id, i) => {
                const isActive = sp.mode === 'guess'
                  ? id === activePlayerId
                  : i === sp.playerOrderIdx % sp.playerOrder.length;
                const isDone = sp.mode === 'guess'
                  ? false
                  : i < sp.playerOrderIdx % sp.playerOrder.length;
                return (
                  <div key={id} className={`flex items-center gap-1 flex-shrink-0 ${isActive ? '' : isDone ? 'opacity-30' : 'opacity-60'}`}>
                    {i > 0 && <span className="text-white/20 text-sm mx-1">›</span>}
                    <div className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg transition-all ${isActive ? 'bg-teal-500/20 border border-teal-400/30' : ''}`}>
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${isActive ? 'bg-teal-400/20' : 'bg-white/10'}`}>
                        {spyGetName(id)[0]}
                      </div>
                      {isActive && <span className="text-[10px] text-teal-300">{sp.mode === 'draw' ? 'рисует' : 'говорит'}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        {qrOverlay}
      </GameSurface>
    );
  }

  // ===================== CROCODILE TV RENDER =====================
  if (gameType === 'crocodile') {
    const explainerName = getPlayerName(crocState.explainerId);
    const totalRounds = 3;
    const playerCountForRound = crocState.playersOrder.length || players.length || 1;
    const currentRound = crocState.phase === 'finished'
      ? totalRounds
      : Math.min(
          totalRounds,
          Math.max(1, Math.floor((crocState.turnNumber - 1) / playerCountForRound) + 1),
        );
    const sortedScores = Object.entries(crocState.scores)
      .map(([id, score]) => ({ id, name: getPlayerName(id), score }))
      .sort((a, b) => b.score - a.score);
    const crocTimerRadius = 118;
    const crocTimerCirc = 2 * Math.PI * crocTimerRadius;
    const crocTimerRatio = Math.max(0, Math.min(1, crocState.timeLeft / 60));
    const crocTimerOffset = crocTimerCirc * (1 - crocTimerRatio);
    const medalColors = ['#ffd60a', '#c7cdd6', '#cd8e54'];
    const crocCounterStats = [
      {
        label: locale === 'ru' ? 'Угадано' : 'Guessed',
        value: crocState.wordsGuessed,
        icon: '✓',
        color: '#ef4444',
      },
      {
        label: locale === 'ru' ? 'Пропущено' : 'Skipped',
        value: crocState.wordsSkipped,
        icon: '›',
        color: '#ff9f0a',
      },
    ];
    return (
      <GameSurface className="h-screen bg-gradient-crocodile text-white flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between gap-8 px-8 py-4 bg-black/20 backdrop-blur-sm border-b border-white/10 flex-shrink-0">
          <div className="flex items-center gap-4">
            <CrocIcon name="croc" className="h-10 w-10" />
            <h1 className="text-3xl font-bold">{locale === 'ru' ? 'Крокодил' : 'Crocodile'}</h1>
            {(crocState.phase === 'ready' || crocState.phase === 'explaining') && (
              <span className="rounded-full border border-red-300/30 bg-red-500/20 px-4 py-1.5 font-mono text-sm font-bold uppercase tracking-[0.18em] text-red-100">
                {locale === 'ru' ? 'Раунд' : 'Round'} {currentRound} / {totalRounds}
              </span>
            )}
          </div>
          {(crocState.phase === 'ready' || crocState.phase === 'explaining') && (
            <div className="flex items-center gap-3">
              {crocCounterStats.map((stat) => (
                <div
                  key={stat.label}
                  className="flex min-w-[150px] items-center gap-3 rounded-3xl border border-white/10 bg-white/[0.06] px-4 py-3 shadow-[0_14px_38px_rgba(0,0,0,.22)]"
                >
                  <span
                    className="flex h-11 w-11 items-center justify-center rounded-2xl text-2xl font-black"
                    style={{
                      backgroundColor: `${stat.color}22`,
                      color: stat.color,
                    }}
                  >
                    {stat.icon}
                  </span>
                  <span className="flex flex-col leading-none">
                    <span
                      className="font-mono text-[42px] font-black tabular-nums leading-none"
                      style={{ color: stat.color }}
                    >
                      {stat.value}
                    </span>
                    <span className="mt-1 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-white/45">
                      {stat.label}
                    </span>
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex-1 flex flex-col items-center justify-center px-8 gap-4 overflow-hidden min-h-0">
          {/* WAITING */}
          {crocState.phase === 'waiting' && (
            <div className="text-center">
              <div className="mb-6 flex justify-center">
                <CrocIcon name="croc" className="h-24 w-24" />
              </div>
              <h2 className="text-4xl font-bold mb-4">{locale === 'ru' ? 'Ожидание начала...' : 'Waiting to start...'}</h2>
              <div className="mt-6 flex items-center justify-center gap-4 flex-wrap">
                {players.map(p => (
                  <div key={p.id} className="glass-card flex items-center justify-center gap-2 px-6 py-3">
                    <span aria-hidden className="h-5 w-5 flex-shrink-0" />
                    <span className="text-xl">{p.nickname}</span>
                    <span className="inline-flex h-5 w-5 flex-shrink-0 items-center justify-center">
                      {p.isHost && <CrocIcon name="crown" className="h-5 w-5" style={{ color: '#facc15' }} />}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* READY / EXPLAINING */}
          {(crocState.phase === 'ready' || crocState.phase === 'explaining') && (
            <>
              <div className="flex flex-1 min-h-0 w-full items-center justify-center gap-[clamp(2rem,6vw,4rem)]">
                <div className="relative h-[280px] w-[280px] flex-shrink-0">
                  <svg viewBox="0 0 260 260" width="280" height="280">
                    <circle cx="130" cy="130" r={crocTimerRadius} stroke="rgba(255,255,255,.08)" strokeWidth="14" fill="none" />
                    <circle
                      cx="130"
                      cy="130"
                      r={crocTimerRadius}
                      stroke="#ef4444"
                      strokeWidth="14"
                      fill="none"
                      strokeLinecap="round"
                      strokeDasharray={crocTimerCirc}
                      strokeDashoffset={crocTimerOffset}
                      transform="rotate(-90 130 130)"
                      style={{ filter: 'drop-shadow(0 0 12px #ef444488)', transition: 'stroke-dashoffset 1s linear' }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className={`font-mono text-7xl font-black tabular-nums leading-none ${crocState.timeLeft <= 10 ? 'text-red-200 animate-pulse' : 'text-white'}`}>
                      {crocState.timeLeft}
                    </span>
                    <span className="mt-2 font-mono text-sm font-bold uppercase tracking-[0.28em] text-white/40">
                      {locale === 'ru' ? 'сек' : 'sec'}
                    </span>
                  </div>
                </div>

                <div className="min-w-0 max-w-[48vw] flex-1">
                  <p className="mb-4 font-mono text-lg font-bold uppercase tracking-[0.22em] text-white/45">
                    {crocState.phase === 'ready'
                      ? locale === 'ru' ? 'Готовится начать' : 'Getting ready'
                      : locale === 'ru' ? 'Показывает слово' : 'Showing the word'}
                  </p>
                  <div className="flex min-w-0 items-center gap-6">
                    <PlayerAvatar nickname={explainerName} sizePx={88} ring="#ef4444" />
                    <p
                      className="min-w-0 truncate text-[clamp(3rem,6vw,4.5rem)] font-black leading-none"
                      style={{ letterSpacing: '-1.5px' }}
                    >
                      {explainerName}
                    </p>
                  </div>
                </div>
              </div>

              <div className="w-full flex-shrink-0 rounded-[24px] border border-white/10 bg-white/[0.05] p-4 shadow-[0_18px_54px_rgba(0,0,0,.25)]">
                <div className="mb-3 flex items-center gap-2">
                  <CrocIcon name="trophy" className="h-7 w-7" />
                  <h2 className="text-xl font-black">{locale === 'ru' ? 'Таблица очков' : 'Scoreboard'}</h2>
                </div>
                <div
                  className="grid gap-3"
                  style={{ gridTemplateColumns: `repeat(${Math.max(1, Math.min(sortedScores.length, 8))}, minmax(0, 1fr))` }}
                >
                  {sortedScores.slice(0, 8).map(({ id, name, score }, idx) => {
                    const active = id === crocState.explainerId;
                    const rankColor = medalColors[idx] ?? 'rgba(255,255,255,.42)';
                    return (
                      <div
                        key={id}
                        className="min-w-0 rounded-[20px] px-3 py-3 text-center"
                        style={{
                          background: active ? 'linear-gradient(180deg, #ef44442e, rgba(255,255,255,.04))' : 'rgba(255,255,255,.04)',
                          border: active ? '1px solid #ef444466' : '1px solid rgba(255,255,255,.08)',
                        }}
                      >
                        <p className="mb-2 font-mono text-xs font-black" style={{ color: rankColor }}>
                          #{idx + 1}
                        </p>
                        <div className="mb-2 flex justify-center">
                          <PlayerAvatar nickname={name} sizePx={48} ring={active ? '#ef4444' : undefined} />
                        </div>
                        <p className="truncate text-[15px] font-bold text-white">{name}</p>
                        <p className="mt-1 font-mono text-[26px] font-black leading-none text-white tabular-nums">{score}</p>
                      </div>
                    );
                  })}
                  {sortedScores.length === 0 && (
                    <div className="rounded-[20px] border border-white/10 bg-white/[0.04] px-4 py-6 text-center text-white/50">
                      {locale === 'ru' ? 'Пока нет игроков' : 'No players yet'}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* FINISHED */}
          {crocState.phase === 'finished' && (
            <div className="text-center">
              <div className="mb-4 flex justify-center">
                <CrocIcon name="trophy" className="h-24 w-24" />
              </div>
              <h2 className="text-4xl font-bold text-amber-400 mb-6">{locale === 'ru' ? 'Игра окончена!' : 'Game Over!'}</h2>
              <div className="w-full max-w-xl mx-auto space-y-3">
                {sortedScores.map(({ id, name, score }, idx) => (
                  <div key={id} className={`glass-card px-8 py-4 flex items-center justify-between ${idx === 0 ? 'outline outline-2 outline-amber-400 bg-amber-500/10' : ''}`}>
                    <div className="flex items-center gap-3">
                      {idx < 3 ? (
                        <CrocIcon
                          name="medal"
                          className="h-9 w-9"
                          style={{ color: medalColors[idx] ?? '#f5efe6' }}
                        />
                      ) : (
                        <span className="text-3xl">{idx + 1}.</span>
                      )}
                      <span className="text-2xl font-bold">{name}</span>
                    </div>
                    <span className="text-3xl font-bold text-amber-400">{score}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        {qrOverlay}
      </GameSurface>
    );
  }

  // ===================== ALIAS TV RENDER =====================
  if (gameType === 'alias') {
    const activeTeam = aliasState.teams[aliasState.activeTeamIndex];
    const explainerId = activeTeam
      ? activeTeam.playerIds[
          (aliasState.explainerIndices?.[aliasState.activeTeamIndex] ?? aliasState.explainerIndex ?? 0) %
            activeTeam.playerIds.length
        ]
      : '';
    const explainerName = getPlayerName(explainerId);
    const aliasDuration = aliasState.mode === 'letter' ? 90 : 60;
    const aliasTimerRadius = 118;
    const aliasTimerCirc = 2 * Math.PI * aliasTimerRadius;
    const aliasTimerRatio = Math.max(0, Math.min(1, aliasState.timeLeft / aliasDuration));
    const aliasTimerOffset = aliasTimerCirc * (1 - aliasTimerRatio);
    const aliasCounters: { label: string; value: number; name: 'check' | 'cross'; color: string }[] = [
      { label: locale === 'ru' ? 'Угадано' : 'Guessed', value: aliasState.wordsGuessed, name: 'check', color: '#22c55e' },
      { label: locale === 'ru' ? 'Пропущено' : 'Skipped', value: aliasState.wordsSkipped, name: 'cross', color: '#f59e0b' },
    ];

    return (
      <GameSurface className="h-screen bg-gradient-alias text-white flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between gap-8 px-8 py-4 bg-black/20 backdrop-blur-sm border-b border-white/10 flex-shrink-0">
          <div className="flex items-center gap-4">
            <AliasIcon name="speech" className="h-10 w-10" />
            <h1 className="text-3xl font-bold">
              {locale === 'ru' ? 'Угадай слово' : 'Guess the Word'}
              {aliasState.mode === 'letter' && (
                <span className="text-lg text-pink-300 ml-3">
                  {locale === 'ru' ? '(на букву)' : '(letter mode)'}
                </span>
              )}
            </h1>
            {aliasState.phase === 'explaining' && (
              <span className="rounded-full border border-pink-300/30 bg-pink-500/20 px-4 py-1.5 font-mono text-sm font-bold uppercase tracking-[0.18em] text-pink-100">
                {locale === 'ru' ? 'Раунд' : 'Round'} {aliasState.round} / {aliasState.totalRounds}
              </span>
            )}
          </div>
          {aliasState.phase === 'explaining' && (
            <div className="flex items-center gap-3">
              {aliasCounters.map((stat) => (
                <div
                  key={stat.label}
                  className="flex min-w-[150px] items-center gap-3 rounded-3xl border border-white/10 bg-white/[0.06] px-4 py-3 shadow-[0_14px_38px_rgba(0,0,0,.22)]"
                >
                  <span
                    className="flex h-11 w-11 items-center justify-center rounded-2xl"
                    style={{ backgroundColor: `${stat.color}22`, color: stat.color }}
                  >
                    <AliasIcon name={stat.name} className="h-6 w-6" />
                  </span>
                  <span className="flex flex-col leading-none">
                    <span className="font-mono text-[42px] font-black tabular-nums leading-none" style={{ color: stat.color }}>
                      {stat.value}
                    </span>
                    <span className="mt-1 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-white/45">
                      {stat.label}
                    </span>
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex-1 flex flex-col items-center justify-center px-8 gap-3 overflow-hidden min-h-0">
          {/* WAITING / MODE SELECT — no game yet */}
          {(aliasState.phase === 'modeSelect' || (aliasState.phase === 'waiting' && aliasState.teams.length === 0)) && (
            <div className="text-center">
              <div className="mb-6 flex justify-center"><AliasIcon name="speech" className="h-24 w-24" /></div>
              <h2 className="text-4xl font-bold mb-4">{locale === 'ru' ? 'Ожидание начала...' : 'Waiting to start...'}</h2>
              <div className="mt-6 flex items-center justify-center gap-4 flex-wrap">
                {players.map(p => (
                  <div key={p.id} className="glass-card px-6 py-3">
                    <span className="text-xl">{p.nickname}</span>
                    {p.isHost && <span className="ml-2 inline-flex items-center"><CrocIcon name="crown" style={{ width: '1em', height: '1em', color: '#facc15' }} /></span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TEAM SELECT */}
          {aliasState.phase === 'teamSelect' && (
            <div className="flex gap-8 w-full max-w-4xl">
              {aliasState.teams.map((team) => (
                <div key={team.id} className="flex-1 glass-card px-8 py-6 text-center">
                  <p className="text-2xl font-bold text-amber-400 mb-4">{team.name}</p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {team.playerIds.map(id => (
                      <span key={id} className="glass-badge text-lg px-3 py-1">{getPlayerName(id)}</span>
                    ))}
                    {team.playerIds.length === 0 && (
                      <p className="text-white/30 text-sm">{locale === 'ru' ? 'пока никого' : 'nobody yet'}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TEAM NAME */}
          {aliasState.phase === 'teamName' && (
            <>
              <h2 className="text-4xl font-bold mb-2">
                {locale === 'ru' ? 'Команды выбирают названия' : 'Teams are choosing names'}
              </h2>
              <div className="flex gap-8 w-full max-w-4xl">
                {aliasState.teams.map((team, ti) => {
                  const namerId =
                    team.playerIds.find((id) => players.find((p) => p.id === id)?.isConnected) ?? team.playerIds[0];
                  const done = (aliasState.teamNameConfirmed ?? [])[ti];
                  return (
                    <div key={team.id} className="flex-1 glass-card px-8 py-6 text-center">
                      <p className="text-3xl font-bold text-amber-400 mb-3">{team.name}</p>
                      <p className="text-lg text-white/60">
                        {done
                          ? (locale === 'ru' ? 'Имя выбрано ✓' : 'Name set ✓')
                          : (locale === 'ru' ? `${getPlayerName(namerId)} выбирает имя…` : `${getPlayerName(namerId)} is naming…`)}
                      </p>
                    </div>
                  );
                })}
              </div>
            </>
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
                      ti === aliasState.activeTeamIndex ? 'outline outline-2 outline-pink-400' : 'opacity-50'
                    }`}
                  >
                    {aliasState.mode !== 'letter' && (
                      <p className="text-2xl font-bold mb-2">{team.name}</p>
                    )}
                    <p className="text-5xl font-bold text-amber-400 mb-3">{team.score}</p>
                    <div className="flex flex-wrap gap-2 justify-center">
                      {team.playerIds.map(id => {
                        const isExp = ti === aliasState.activeTeamIndex && id === explainerId;
                        return (
                          <span key={id} className={`glass-badge text-lg px-3 py-1 ${isExp ? 'outline outline-1 outline-amber-400' : ''}`}>
                            {getPlayerName(id)} {isExp && <AliasIcon name="mic" className="inline-block h-[1em] w-[1em] align-[-0.15em]" />}
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
              <div className="flex flex-1 min-h-0 w-full items-center justify-center gap-[clamp(2rem,6vw,4rem)]">
                {/* Circular timer */}
                <div className="relative h-[280px] w-[280px] flex-shrink-0">
                  <svg viewBox="0 0 260 260" width="280" height="280">
                    <circle cx="130" cy="130" r={aliasTimerRadius} stroke="rgba(255,255,255,.08)" strokeWidth="14" fill="none" />
                    <circle
                      cx="130"
                      cy="130"
                      r={aliasTimerRadius}
                      stroke={aliasState.timeLeft <= 10 ? '#ef4444' : '#ec4899'}
                      strokeWidth="14"
                      fill="none"
                      strokeLinecap="round"
                      strokeDasharray={aliasTimerCirc}
                      strokeDashoffset={aliasTimerOffset}
                      transform="rotate(-90 130 130)"
                      style={{ filter: 'drop-shadow(0 0 12px #ec489988)', transition: 'stroke-dashoffset 1s linear' }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className={`font-mono text-7xl font-black tabular-nums leading-none ${aliasState.timeLeft <= 10 ? 'text-red-200 animate-pulse' : 'text-white'}`}>
                      {aliasState.timeLeft}
                    </span>
                    <span className="mt-2 font-mono text-sm font-bold uppercase tracking-[0.28em] text-white/40">
                      {locale === 'ru' ? 'сек' : 'sec'}
                    </span>
                  </div>
                </div>

                {/* Explainer + letter */}
                <div className="min-w-0 max-w-[48vw] flex-1">
                  <p className="mb-4 font-mono text-lg font-bold uppercase tracking-[0.22em] text-white/45">
                    {locale === 'ru' ? 'Объясняет' : 'Explaining'}
                  </p>
                  <div className="min-w-0">
                    <p className="min-w-0 truncate text-[clamp(3rem,6vw,4.5rem)] font-black leading-none" style={{ letterSpacing: '-1.5px' }}>
                      {explainerName}
                    </p>
                  </div>
                  {aliasState.mode === 'letter' && aliasState.currentLetter && (
                    <p className="mt-5 font-mono text-lg uppercase tracking-[0.22em] text-white/45">
                      {locale === 'ru' ? 'Буква' : 'Letter'}: <span className="font-black text-pink-300">{aliasState.currentLetter}</span>
                    </p>
                  )}
                </div>
              </div>

              {/* Scoreboard (teams) */}
              <div className="w-full flex-shrink-0 rounded-[24px] border border-white/10 bg-white/[0.05] p-4 shadow-[0_18px_54px_rgba(0,0,0,.25)]">
                <div className="mb-3 flex items-center gap-2">
                  <AliasIcon name="trophy" className="h-7 w-7" />
                  <h2 className="text-xl font-black">{locale === 'ru' ? 'Таблица очков' : 'Scoreboard'}</h2>
                </div>
                <div
                  className="grid gap-3"
                  style={{ gridTemplateColumns: `repeat(${Math.max(1, Math.min(aliasState.teams.length, 8))}, minmax(0, 1fr))` }}
                >
                  {aliasState.teams.map((team, ti) => {
                    const active = ti === aliasState.activeTeamIndex;
                    return (
                      <div
                        key={team.id}
                        className="min-w-0 rounded-[20px] px-3 py-3 text-center"
                        style={{
                          background: active ? 'linear-gradient(180deg, #ec48992e, rgba(255,255,255,.04))' : 'rgba(255,255,255,.04)',
                          border: active ? '1px solid #ec489966' : '1px solid rgba(255,255,255,.08)',
                        }}
                      >
                        <p className="truncate text-[15px] font-bold text-white">{team.name}</p>
                        <p className="mt-1 font-mono text-[26px] font-black leading-none text-white tabular-nums">{team.score}</p>
                      </div>
                    );
                  })}
                </div>
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
                  <span className="text-green-400">
                    <AliasIcon name="check" className="mr-1 inline-block h-[1em] w-[1em] align-[-0.15em]" />
                    {locale === 'ru' ? 'Угадано' : 'Guessed'}: {aliasState.wordsGuessed}
                  </span>
                  <span className="text-red-400">
                    <AliasIcon name="cross" className="mr-1 inline-block h-[1em] w-[1em] align-[-0.15em]" />
                    {locale === 'ru' ? 'Пропущено' : 'Skipped'}: {aliasState.wordsSkipped}
                  </span>
                </div>
              </div>

              {/* Word history */}
              {aliasState.mode !== 'classic' && aliasState.turnHistory.length > 0 && (
                <div className="w-full max-w-2xl grid grid-cols-2 gap-2 max-h-[28vh] overflow-y-auto">
                  {aliasState.turnHistory.map((item, i) => (
                    <div
                      key={i}
                      className={`glass-card px-3 py-1.5 flex items-center justify-between gap-2 ${
                        item.guessed ? 'bg-green-500/10' : 'bg-red-500/10'
                      }`}
                    >
                      <span className="text-base truncate">{locale === 'ru' ? item.word.ru : item.word.en}</span>
                      <span className="text-lg flex-shrink-0">
                        {item.guessed ? <AliasIcon name="check" className="h-5 w-5" /> : <AliasIcon name="cross" className="h-5 w-5" />}
                      </span>
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
              <div className="mb-4 flex justify-center"><AliasIcon name="trophy" className="h-20 w-20" /></div>
              <h2 className="text-4xl font-bold text-amber-400 mb-6">{locale === 'ru' ? 'Игра окончена!' : 'Game Over!'}</h2>
              <div className="w-full max-w-xl mx-auto space-y-3">
                {[...aliasState.teams].sort((a, b) => b.score - a.score).map((team, idx) => (
                  <div
                    key={team.id}
                    className={`glass-card px-8 py-4 flex items-center justify-between gap-3 ${
                      idx === 0 ? 'outline outline-2 outline-amber-400 bg-amber-500/10' : ''
                    }`}
                  >
                    <span className="min-w-0 truncate text-xl font-bold">{team.name}</span>
                    <span className="shrink-0 text-2xl font-bold text-amber-400">{team.score}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        {qrOverlay}
      </GameSurface>
    );
  }

  // ===================== MAFIA TV RENDER =====================
  if (gameType === 'mafia') {
    const ms = mafiaState;
    const phaseLabel = ms.phase === 'night'
      ? (locale === 'ru' ? '🌙 Ночь' : '🌙 Night')
      : ms.phase === 'day'
      ? (locale === 'ru' ? '☀️ День' : '☀️ Day')
      : ms.phase === 'voting' && ms.votingRound === 2
      ? (locale === 'ru' ? '🗳️ Переголосование' : '🗳️ Revote')
      : ms.phase === 'voting' && ms.votingRound === 3
      ? (locale === 'ru' ? '⚖️ Казнить или помиловать?' : '⚖️ Execute or pardon?')
      : ms.phase === 'voting'
      ? (locale === 'ru' ? '🗳️ Голосование' : '🗳️ Voting')
      : ms.phase === 'role-reveal'
      ? (locale === 'ru' ? '🎭 Роли розданы' : '🎭 Roles assigned')
      : ms.phase === 'results'
      ? (locale === 'ru' ? '🏁 Игра окончена' : '🏁 Game over')
      : (locale === 'ru' ? '⏳ Ожидание...' : '⏳ Waiting...');

    const alivePlayers = ms.alive.length > 0
      ? ms.alive.map(id => players.find(p => p.id === id)?.nickname ?? id)
      : players.map(p => p.nickname);
    const votingCandidateNames = ms.votingCandidates
      .map(id => players.find(p => p.id === id)?.nickname ?? id)
      .join(', ');

    return (
      <GameSurface className="h-screen bg-gradient-main text-white flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-4 bg-black/20 backdrop-blur-sm border-b border-white/10 flex-shrink-0">
          <div className="flex items-center gap-4">
            <span className="text-4xl">🕵️</span>
            <h1 className="text-3xl font-bold">{locale === 'ru' ? 'Мафия' : 'Mafia'}</h1>
            <span className="glass-badge px-3 py-1 text-sm">{phaseLabel}</span>
          </div>
          <span className="text-white/50 text-lg">
            {locale === 'ru' ? `В живых: ${alivePlayers.length}` : `Alive: ${alivePlayers.length}`}
          </span>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center px-8 gap-8">
          {/* Last event banner */}
          {ms.lastEvent && (
            <div className="glass-card px-10 py-5 text-center border-white/20">
              <p className="text-3xl font-bold">{ms.lastEvent}</p>
            </div>
          )}

          {/* Winner announcement */}
          {ms.winner && (
            <div className={`glass-card px-12 py-8 text-center ${ms.winner === 'mafia' ? 'border-red-400/40 bg-red-500/10' : ms.winner === 'maniac' ? 'border-orange-400/40 bg-orange-500/10' : 'border-green-400/40 bg-green-500/10'}`}>
              <p className="text-7xl mb-4">{ms.winner === 'mafia' ? '🔫' : ms.winner === 'maniac' ? '🪓' : '🎉'}</p>
              <p className="text-4xl font-bold">
                {ms.winner === 'mafia'
                  ? (locale === 'ru' ? 'Мафия победила!' : 'Mafia wins!')
                  : ms.winner === 'maniac'
                  ? (locale === 'ru' ? 'Маньяк победил!' : 'Maniac wins!')
                  : (locale === 'ru' ? 'Мирные победили!' : 'Citizens win!')}
              </p>
            </div>
          )}

          {/* Alive players grid */}
          {alivePlayers.length > 0 && !ms.winner && (
            <div className="flex flex-wrap gap-3 justify-center">
              {alivePlayers.map((name, i) => (
                <div key={i} className="glass-card px-6 py-3 flex items-center gap-2">
                  <span className="text-green-400">●</span>
                  <span className="text-xl">{name}</span>
                </div>
              ))}
            </div>
          )}

          {/* Phase instructions */}
          {!ms.winner && (
            <p className="text-white/40 text-lg">
              {ms.phase === 'night'
                ? (locale === 'ru' ? 'Закройте глаза — мафия действует' : 'Close your eyes — mafia is acting')
                : ms.phase === 'day'
                ? (locale === 'ru' ? 'Обсуждайте перед голосованием' : 'Discuss before voting')
                : ms.phase === 'voting' && ms.votingRound === 2
                ? (locale === 'ru' ? `Повторное голосование: ${votingCandidateNames}` : `Revote: ${votingCandidateNames}`)
                : ms.phase === 'voting' && ms.votingRound === 3
                ? (locale === 'ru' ? `Город решает судьбу: ${votingCandidateNames}` : `The town decides: ${votingCandidateNames}`)
                : ms.phase === 'voting'
                ? (locale === 'ru' ? 'Город голосует за казнь' : 'The town votes for elimination')
                : (locale === 'ru' ? 'Смотрите на телефоны' : 'Check your phones')}
            </p>
          )}
        </div>
        {qrOverlay}
      </GameSurface>
    );
  }

  // ===================== WHO AM I TV RENDER =====================
  if (gameType === 'who-am-i') {
    const ws = whoAmIState;
    const activeOrder = ws.turnOrder.filter((id) => !ws.guessedPlayers.includes(id));
    const currentPlayerId = activeOrder.length > 0
      ? activeOrder[ws.currentTurnIndex % activeOrder.length]
      : null;
    const currentPlayerName = currentPlayerId ? getPlayerName(currentPlayerId) : l('ожидание', 'waiting');
    const disputingPlayerName = ws.guessPendingPlayerId ? getPlayerName(ws.guessPendingPlayerId) : l('Игрок', 'Player');
    const otherPlayerIds = ws.turnOrder.filter((id) => id !== currentPlayerId);
    const resultRows = (ws.turnOrder.length > 0 ? ws.turnOrder : players.map((p) => p.id))
      .map((id) => ({
        id,
        name: getPlayerName(id),
        score: ws.scores[id] || 0,
        character: ws.characters[id],
        guessed: ws.guessedPlayers.includes(id),
      }))
      .sort((a, b) => b.score - a.score);

    const revealStep = resultRows.length >= 10 ? 0.34 : 0.46;
    const winner = resultRows[0];

    return (
      <GameSurface className={WHO_AM_I_TV_SURFACE}>
        {ws.phase === 'lobby' && (
          <div className="flex flex-1 items-center justify-center px-12 py-10">
            <div className="grid w-full max-w-7xl grid-cols-[1fr_360px] items-center gap-12">
              <div className="min-w-0">
                <div className={`mb-8 flex h-36 w-36 items-center justify-center rounded-[40px] ${WHO_AM_I_ACCENT_MARK}`}>
                  <WhoAmIIcon name="profile" className="h-20 w-20" />
                </div>
                <h1 className="text-[112px] font-black leading-[.9] tracking-tight">
                  {l('Кто я?', 'Who Am I?')}
                </h1>
                <p className="mt-6 max-w-4xl text-3xl font-medium leading-tight text-white/65">
                  {l('Угадай, кем тебя назначили — задавай вопросы Да/Нет', 'Guess who you are — ask Yes/No questions')}
                </p>
                <div className="mt-8 flex flex-wrap gap-3">
                  {players.map((p) => (
                    <div key={p.id} className="glass-card flex items-center gap-3 rounded-full px-4 py-3">
                      <PlayerAvatar nickname={p.nickname} size="sm" />
                      <span className="text-xl font-bold">{p.nickname}</span>
                      {p.isHost && <WhoAmIIcon name="star" className="h-5 w-5 text-amber-300" />}
                    </div>
                  ))}
                </div>
              </div>

              <div className="glass-card flex flex-col items-center gap-5 rounded-[32px] px-8 py-8 text-center">
                <div className="rounded-2xl bg-white p-4 shadow-xl">
                  <QRCodeCanvas value={joinUrl} size={248} />
                </div>
                <div>
                  <p className="font-mono text-sm uppercase tracking-[0.28em] text-white/45">{l('код комнаты', 'room code')}</p>
                  <p className="mt-2 font-mono text-5xl font-black tracking-[0.18em] text-sky-200">{roomId}</p>
                </div>
                <p className="text-lg text-white/45">{siteUrl}/join</p>
              </div>
            </div>
          </div>
        )}

        {ws.phase === 'playing' && (
          <>
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-6 border-b border-white/10 px-8 py-4 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${WHO_AM_I_ACCENT_MARK}`}>
                  <WhoAmIIcon name="profile" className="h-7 w-7" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold leading-none">{l('Кто я?', 'Who Am I?')}</h1>
                  <p className="font-mono text-xs uppercase tracking-widest text-white/40">Party Hub</p>
                </div>
              </div>
              <div className="glass-card flex items-center gap-4 rounded-full px-5 py-3">
                <PlayerAvatar nickname={currentPlayerName} size="sm" />
                <div>
                  <p className="font-mono text-xs uppercase tracking-[0.2em] text-white/40">{l('Сейчас ходит', 'Current turn')}</p>
                  <p className="text-2xl font-black text-sky-200">{currentPlayerName}</p>
                </div>
              </div>
              <div className="flex justify-end">
                <div className="glass-card flex items-center gap-3 rounded-full px-5 py-3 text-xl font-bold">
                  <WhoAmIIcon name="check" className="h-6 w-6 text-green-300" />
                  <span>{l('Угадали', 'Guessed')} <b className="font-mono text-sky-200">{ws.guessedPlayers.length} / {ws.turnOrder.length}</b></span>
                </div>
              </div>
            </div>

            <div className="relative flex flex-1 flex-col items-center justify-center gap-8 px-8 py-8">
              <div className={(ws.guessNeedsConfirm || ws.guessAwaitingJudge) ? 'opacity-[.38] saturate-[.7] transition' : 'transition'}>
                {currentPlayerId ? (
                  <div className="relative">
                    <motion.div
                      className="absolute -inset-4 rounded-[40px] border border-sky-300/35"
                      animate={{ scale: [1, 1.035, 1], opacity: [0.35, 0.75, 0.35] }}
                      transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
                    />
                    <div className="glass-card relative w-[min(980px,calc(100vw-160px))] rounded-[32px] border-sky-300/20 bg-white/10 px-12 py-10">
                      <div className="flex items-center gap-9">
                        <PlayerAvatar nickname={currentPlayerName} sizePx={156} ring="rgba(56,189,248,.65)" />
                        <div className="min-w-0">
                          <p className="text-lg font-semibold uppercase tracking-[0.24em] text-sky-300">{l('Сейчас ходит', 'Current turn')}</p>
                          <p className="truncate text-7xl font-black leading-none tracking-tight">{currentPlayerName}</p>
                          <p className="mt-4 inline-flex rounded-full border border-sky-300/30 bg-sky-400/10 px-5 py-2 font-mono text-lg font-semibold text-sky-100">
                            {l('«Да» подряд', 'Yes streak')} · {ws.consecutiveYesAnswers}/3
                          </p>
                        </div>
                      </div>
                      <div className="mt-8 flex items-center gap-6 overflow-hidden rounded-3xl border border-dashed border-sky-200/25 bg-black/25 px-8 py-6">
                        <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full border border-sky-200/25 bg-sky-400/10 text-sky-200">
                          <WhoAmIIcon name="profile" className="h-11 w-11" />
                        </div>
                        <div>
                          <p className="text-3xl font-bold">{l('Персонаж скрыт', 'Character hidden')}</p>
                          <p className="mt-1 text-xl text-white/45">
                            {l('Откроется, когда игрок угадает или передаст ход', 'Reveals when the player guesses or passes the turn')}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="glass-card px-10 py-8 text-center">
                    <WhoAmIIcon name="trophy" className="mx-auto mb-3 h-14 w-14 text-sky-200" />
                    <p className="text-3xl font-bold">{l('Все игроки угадали', 'Everyone guessed')}</p>
                  </div>
                )}
              </div>

              {otherPlayerIds.length > 0 && (
                <div className="flex w-full max-w-[1760px] flex-nowrap items-center justify-center gap-2">
                  {otherPlayerIds.map((id) => {
                    const guessed = ws.guessedPlayers.includes(id);
                    return (
                      <div
                        key={id}
                        className={`glass-card flex min-w-0 flex-1 items-center justify-center gap-2 rounded-full px-3 py-2 ${
                          guessed ? 'border-green-300/25 bg-green-500/10' : ''
                        }`}
                      >
                        <PlayerAvatar nickname={getPlayerName(id)} size="xs" />
                        <span className="truncate text-base font-bold text-white/75">{getPlayerName(id)}</span>
                        {guessed && <WhoAmIIcon name="check" className="h-5 w-5 shrink-0 text-green-300" />}
                      </div>
                    );
                  })}
                </div>
              )}

              <AnimatePresence>
                {(ws.guessNeedsConfirm || ws.guessAwaitingJudge) && (
                  <motion.div
                    key="whoami-dispute-tv"
                    initial={{ opacity: 0, scale: 0.82 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.92 }}
                    transition={{ duration: 0.5, ease: [0.2, 0.9, 0.3, 1.3] }}
                      className="glass-card absolute left-1/2 top-1/2 z-30 flex -translate-x-1/2 -translate-y-1/2 items-center gap-6 rounded-full border-white/20 bg-neutral-900/75 px-12 py-8 shadow-2xl"
                      style={{
                        boxShadow: '0 36px 100px -20px rgba(0,0,0,.7), inset 0 1px 0 rgba(255,255,255,.14)',
                      }}
                  >
                    <div className="flex h-20 w-20 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white/70">
                      <WhoAmIIcon name="profile" className="h-11 w-11" />
                    </div>
                    <div>
                      <p className="text-4xl font-black tracking-[-.8px]">
                        {l(
                          `${disputingPlayerName} оспаривает ответ`,
                          `${disputingPlayerName} is disputing the answer`,
                        )}
                      </p>
                      <p className="mt-2 text-2xl text-white/45">{l('Вердикт выносится на телефоне судьи', 'The verdict happens on the judge phone')}</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence>
                {lastWhoAmIGuessResult && (
                  <motion.div
                    key={`${lastWhoAmIGuessResult.playerId}-${lastWhoAmIGuessResult.guess}-${lastWhoAmIGuessResult.correct}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-40 flex items-center justify-center bg-[rgba(4,14,22,.66)] px-8 backdrop-blur-[16px] backdrop-saturate-[140%]"
                  >
                    <motion.div
                      initial={{ opacity: 0, scale: 0.72, y: 30 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9, y: -12 }}
                      transition={{ duration: 0.55, ease: [0.2, 0.9, 0.3, 1.3] }}
                      className={`glass-card flex max-w-5xl flex-col items-center gap-[30px] rounded-[56px] px-24 pb-14 pt-16 text-center shadow-[0_40px_120px_-24px_rgba(2,132,199,.75),inset_0_1px_0_rgba(255,255,255,.16)] ${
                        lastWhoAmIGuessResult.correct
                          ? 'border-sky-300/35 bg-sky-400/10'
                          : 'border-red-300/35 bg-red-500/15'
                      }`}
                    >
                      <div className={`mx-auto mb-8 flex h-32 w-32 items-center justify-center rounded-full ${
                        lastWhoAmIGuessResult.correct
                          ? WHO_AM_I_ACCENT_MARK
                          : 'border border-red-300/35 bg-red-500/20 text-red-200'
                      }`}
                      >
                        <WhoAmIIcon name={lastWhoAmIGuessResult.correct ? 'celebrate' : 'cross'} className="h-20 w-20" />
                      </div>
                      <p className="text-[92px] font-black leading-[.95] tracking-[-3px]">
                        {lastWhoAmIGuessResult.correct
                          ? l(`${getPlayerName(lastWhoAmIGuessResult.playerId)} угадал!`, `${getPlayerName(lastWhoAmIGuessResult.playerId)} guessed!`)
                          : l('Неверная попытка', 'Wrong guess')}
                      </p>
                      <div className="flex items-center gap-[14px]">
                        <span className="inline-flex rounded-full border border-sky-300/40 bg-sky-300/10 px-7 py-[15px] text-[26px] font-bold tracking-[-.3px] text-sky-200">
                          {lastWhoAmIGuessResult.guess}
                        </span>
                        {lastWhoAmIGuessResult.correct && (
                          <span className="inline-flex rounded-full border border-green-400/40 bg-green-500/15 px-7 py-[15px] font-mono text-[26px] font-bold text-green-300">
                            +{calculateWhoAmIScore(ws.questionsAsked[lastWhoAmIGuessResult.playerId] || 0)} {l('очков', 'points')}
                          </span>
                        )}
                      </div>
                      {lastWhoAmIGuessResult.correct && (
                        <p className="text-[23px] text-white/65">
                          {l(
                            `Понадобилось ${ws.questionsAsked[lastWhoAmIGuessResult.playerId] || 0} вопросов`,
                            `It took ${ws.questionsAsked[lastWhoAmIGuessResult.playerId] || 0} questions`,
                          )}
                        </p>
                      )}
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <div className="flex items-center justify-between px-16 pb-11">
              <div className="glass-card inline-flex items-center gap-3 rounded-full px-6 py-3 text-xl text-white/65">
                <WhoAmIIcon name="profile" className="h-6 w-6 text-sky-200" />
                {ws.guessNeedsConfirm || ws.guessAwaitingJudge ? (
                  <span>{l('Вердикт выносится на телефоне судьи', 'The verdict happens on the judge phone')}</span>
                ) : (
                  <>
                    <span>
                      {l(`У ${currentPlayerName} на телефоне:`, `On ${currentPlayerName}'s phone:`)}
                    </span>
                    <b className="text-white">{l('Нет · Да · Я знаю!', 'No · Yes · I know!')}</b>
                  </>
                )}
              </div>
              <div className="glass-card inline-flex items-center gap-2 rounded-full px-5 py-3 text-lg text-white/70">
                <span className="h-2.5 w-2.5 rounded-full bg-green-400" />
                {l(`${ws.turnOrder.length} в игре`, `${ws.turnOrder.length} playing`)}
              </div>
            </div>
          </>
        )}

        {ws.phase === 'finished' && (
          <div className="flex flex-1 flex-col px-12 py-8">
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.2, 0.9, 0.3, 1.2] }}
              className="flex items-center justify-center gap-5"
            >
              <div className={`flex h-20 w-20 items-center justify-center rounded-[24px] ${WHO_AM_I_ACCENT_MARK}`}>
                <WhoAmIIcon name="trophy" className="h-12 w-12" />
              </div>
              <h1 className="text-6xl font-black tracking-tight">{l('Игра окончена!', 'Game over!')}</h1>
            </motion.div>

            <div className="mx-auto mt-8 flex w-full max-w-6xl flex-1 flex-col justify-center gap-2">
              {resultRows.map((row, index) => {
                const character = row.guessed
                  ? row.character?.[locale] ?? '???'
                  : l('не угадал', 'not guessed');
                const delay = 0.35 + (resultRows.length - 1 - index) * revealStep;

                return (
                  <motion.div
                    key={row.id}
                    initial={{ opacity: 0, y: 24, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ delay, duration: 0.42, ease: [0.2, 0.9, 0.3, 1.15] }}
                    className={`glass-card grid grid-cols-[64px_56px_1fr_auto] items-center gap-4 rounded-2xl border px-5 py-3 text-left ${whoAmIRankStyle(index)} ${
                      index === 0 ? 'py-4' : ''
                    }`}
                  >
                    <div className="relative flex h-12 w-12 items-center justify-center">
                      {index < 3 ? (
                        <>
                          <WhoAmIIcon name="medal" className={index === 0 ? 'h-14 w-14' : 'h-12 w-12'} />
                          <span className="absolute mt-1 font-mono text-sm font-black">{index + 1}</span>
                        </>
                      ) : (
                        <span className="font-mono text-2xl font-black text-white/45">{index + 1}</span>
                      )}
                    </div>
                    <PlayerAvatar nickname={row.name} size={index === 0 ? 'md' : 'sm'} />
                    <div className="min-w-0">
                      <p className={`truncate font-black ${index === 0 ? 'text-4xl' : 'text-2xl'}`}>{row.name}</p>
                      <p className="truncate text-lg text-white/55">
                        <span className="text-sky-100/85">{character}</span>
                        {row.guessed && (
                          <span className="text-white/35"> · {ws.questionsAsked[row.id] ?? 0} {l('вопросов', 'questions')}</span>
                        )}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`font-mono font-black ${index === 0 ? 'text-4xl' : 'text-3xl'}`}>{row.score}</p>
                      <p className="font-mono text-xs uppercase tracking-widest text-white/35">{l('очков', 'points')}</p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
            <div className="mt-8 flex items-center justify-between px-4">
              {winner ? (
                <div className="glass-card inline-flex items-center gap-3 rounded-full px-6 py-3 text-xl text-white/65">
                  <WhoAmIIcon name="profile" className="h-6 w-6 text-sky-200" />
                  <span>{l(`У ${winner.name} на телефоне:`, `On ${winner.name}'s phone:`)}</span>
                  <b className="text-white">{l('Играть снова', 'Play again')}</b>
                </div>
              ) : (
                <span />
              )}
              <div className="glass-card inline-flex items-center gap-2 rounded-full px-5 py-3 text-lg text-white/70">
                <span className="h-2.5 w-2.5 rounded-full bg-green-400" />
                {l(`${ws.turnOrder.length} в игре`, `${ws.turnOrder.length} playing`)}
              </div>
            </div>
          </div>
        )}

        {qrOverlay}
      </GameSurface>
    );
  }

  // ===================== GENERIC TV RENDER =====================
  return (
    <GameSurface className="h-screen bg-gradient-main text-white flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-8 py-4 bg-black/20 backdrop-blur-sm border-b border-white/10 flex-shrink-0">
        <div className="flex items-center gap-4">
          <GameIcon gameId={gameType as import('@/lib/design/tokens').GameId} size={36} className="flex-shrink-0" />
          <h1 className="text-3xl font-bold">{gameTitle}</h1>
        </div>
        <div className="flex items-center gap-4">
          {players.map((p) => (
            <div key={p.id} className="flex items-center gap-2 glass-badge px-3 py-1.5">
              <div className={`w-2 h-2 rounded-full ${p.isConnected ? 'bg-green-400' : 'bg-red-400'}`} />
              <span className="text-sm">{p.nickname}</span>
              {p.isHost && <span className="inline-flex items-center"><CrocIcon name="crown" style={{ width: '1em', height: '1em', color: '#facc15' }} /></span>}
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center px-8">
        <div className="text-center">
          <div className="mb-6 flex justify-center">
            <GameIcon gameId={gameType as import('@/lib/design/tokens').GameId} size={96} />
          </div>
          <h2 className="text-4xl font-bold mb-4">{gameTitle}</h2>
          <p className="text-2xl text-white/50">
            {locale === 'ru' ? 'Игра идёт — смотрите на телефонах!' : 'Game in progress — check your phones!'}
          </p>
          <div className="mt-8 flex items-center justify-center gap-4 flex-wrap">
            {players.map((p) => (
              <div key={p.id} className="glass-card px-6 py-3">
                <span className="text-xl">{p.nickname}</span>
                {p.isHost && <span className="ml-2 inline-flex items-center"><CrocIcon name="crown" style={{ width: '1em', height: '1em', color: '#facc15' }} /></span>}
              </div>
            ))}
          </div>
        </div>
      </div>
      {qrOverlay}
    </GameSurface>
  );
}
