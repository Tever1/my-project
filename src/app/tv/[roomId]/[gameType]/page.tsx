'use client';

import { useEffect, useState, useCallback, useRef, type ReactNode } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useSocket } from '@/lib/use-socket';
import { useGameAction } from '@/lib/use-game-action';
import { useTranslation } from '@/lib/i18n';
import { formatGameTime } from '@/lib/format-game-time';
import { ALIAS_CLASSIC_TARGET_SCORE, ALIAS_LETTER_TARGET_SCORE } from '@/lib/alias-classic.mts';
import { getWhoAmIActivePlayerId, getWhoAmINextTurnIndex } from '@/lib/who-am-i-flow';
import { GAMES } from '@/lib/games-config';
import { useNavigateOnGameEnd } from '@/lib/use-navigate-on-game-end';
import { useRoomState } from '@/lib/use-room-state';
import { GameIcon } from '@/components/GameIcon';
import { CrocIcon } from '@/components/games/CrocIcon';
import { GameSurface } from '@/components/games/GameSurface';
import { QuizPulseTvScreen } from '@/components/games/quiz-pulse/QuizPulse';
import { AliasIcon } from '@/components/games/AliasIcon';
import { SpyIcon, type SpyIconName } from '@/components/games/SpyIcon';
import { WhoAmIIcon } from '@/components/games/WhoAmIIcon';
import {
  ClayBlob,
  WhoAmIClayTvLayout,
  whoAmIClayStyles as whoClay,
} from '@/components/games/who-am-i-clay/WhoAmIClay';
import { HundredToOneIcon } from '@/components/games/HundredToOneIcon';
import {
  MafiaClubTvLayout,
  MafiaPlayerToken,
  MafiaRoleThumb,
  mafiaClubStyles as club,
} from '@/components/games/mafia-club/MafiaClub';
import { QRCodeCanvas } from '@/components/ui/QRCode';
import { PlayerAvatar } from '@/components/ui/PlayerAvatar';
import { QUIZ_TOPICS, SPECIAL_QUIZZES, SPECIAL_QUIZ_THEMES, getQuizQuestions, getSpecialQuizQuestions } from '@/lib/quiz';
import { ROUNDS as H2O_ROUNDS, ROUND_NAMES as H2O_ROUND_NAMES, BIG_Q as H2O_BIG_Q, TOPICS as H2O_TOPICS, getDisplayPts as h2oGetDisplayPts } from '@/lib/hundred-to-one/questions';
import type { MafiaRole, QuizDifficulty, QuizTopic } from '@/types/game';

const ROOM_CLOSED_NOTICE_KEY = 'party-hub-room-closed-notice';

/** Maps gameType to the action that requests a full state broadcast from the host. */
const TV_STATE_REQUEST: Partial<Record<string, string>> = {
  'hundred-to-one': 'h2o:request-state',
  crocodile: 'croc:request-state',
  alias: 'alias:request-state',
  quiz: 'quiz:request-state',
  spy: 'spy:request-state',
};

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
  bgAwaitingReady?: boolean;
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

const WHO_AM_I_TV_SURFACE =
  "h-screen bg-[linear-gradient(135deg,#071825_0%,#0a2d3f_30%,#0c2530_60%,#071825_100%)] text-white flex flex-col overflow-hidden before:absolute before:inset-0 before:-z-10 before:bg-[radial-gradient(circle_at_18%_18%,rgba(56,189,248,.28),transparent_34%),radial-gradient(circle_at_82%_12%,rgba(2,132,199,.24),transparent_32%)] before:animate-pulse";
const WHO_AM_I_ACCENT_MARK =
  'bg-[radial-gradient(110%_70%_at_50%_-5%,rgba(255,255,255,.28),transparent_55%),linear-gradient(165deg,#38bdf8_0%,#0369a1_100%)] text-sky-50 shadow-[0_24px_60px_-14px_rgba(2,132,199,.8),inset_0_1px_0_rgba(255,255,255,.5)]';

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
      totalVotes?: number;
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
    drawStrokes: { x1: number; y1: number; x2: number; y2: number }[];
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
    timerLeft: 180,
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
    drawStrokes: [],
  });
  const spyCanvasRef = useRef<HTMLCanvasElement>(null);
  const spyCanvasSizeRef = useRef({ w: 0, h: 0 });
  const [crocState, setCrocState] = useState<{
    phase: string; explainerId: string; currentWordIndex: number;
    timeLeft: number; scores: Record<string, number>; wordsGuessed: number; wordsSkipped: number;
    playersOrder: string[]; turnNumber: number; winnerId: string | null; finishingRound: number | null;
  }>({ phase: 'waiting', explainerId: '', currentWordIndex: -1, timeLeft: 60, scores: {}, wordsGuessed: 0, wordsSkipped: 0, playersOrder: [], turnNumber: 1, winnerId: null, finishingRound: null });
  const [aliasState, setAliasState] = useState<{
    phase: string; mode: string; teams: { id: string; name: string; playerIds: string[]; score: number }[];
    teamNameConfirmed?: boolean[];
    activeTeamIndex: number; explainerIndex: number; explainerIndices: number[]; currentWordIndex: number;
    timeLeft: number; wordsGuessed: number; wordsSkipped: number;
    round: number; totalRounds: number;
    turnHistory: { word: { ru: string; en: string }; guessed: boolean }[];
    currentLetter: string;
    finalWordPending?: boolean;
    finalWordAwardTeamIndex?: number | null;
    finishingRound?: number | null;
    lastTurnDeltas?: Record<string, number>;
  }>({
    phase: 'waiting', mode: 'classic', teams: [], activeTeamIndex: 0, explainerIndex: 0,
    explainerIndices: [],
    currentWordIndex: -1, timeLeft: 60, wordsGuessed: 0, wordsSkipped: 0,
    round: 1, totalRounds: 4, turnHistory: [], currentLetter: '',
    finalWordPending: false, finalWordAwardTeamIndex: null, finishingRound: null, lastTurnDeltas: {},
  });
  const [mafiaState, setMafiaState] = useState<{
    dayTimer?: number;
    phase: string;
    hostPlayerId: string | null;
    nightStage: 'mafia' | 'lover' | 'maniac' | 'doctor' | 'detective' | 'don' | null;
    alive: string[];   // player IDs currently alive
    eliminated: { id: string }[];
    roles: Record<string, string>;
    lastNightKilledIds: string[];
    lastNightSaved: boolean;
    lastEliminatedIds: string[];
    lastVerdict: 'alibi' | 'pardoned' | 'eliminated' | null;
    lastVerdictPlayerIds: string[];
    votesReceived: string[];
    lastEvent: string; // human-readable last event
    winner: string | null;
    round: number;
    votingRound: number;
    votingCandidates: string[];
  }>({ phase: 'lobby', hostPlayerId: null, nightStage: null, alive: [], eliminated: [], roles: {}, lastNightKilledIds: [], lastNightSaved: false, lastEliminatedIds: [], lastVerdict: null, lastVerdictPlayerIds: [], votesReceived: [], lastEvent: '', winner: null, round: 1, votingRound: 1, votingCandidates: [] });
  const [whoAmIState, setWhoAmIState] = useState<WhoAmIState>(mkWhoAmIInitial);
  const [lastWhoAmIGuessResult, setLastWhoAmIGuessResult] = useState<{
    playerId: string;
    correct: boolean;
    guess: string;
  } | null>(null);
  const whoAmIGuessTimeoutRef = useRef<number | null>(null);
  const [siteUrl, setSiteUrl] = useState('');
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

  useEffect(() => {
    const canvas = spyCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const { w, h } = spyCanvasSizeRef.current;
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    spyState.drawStrokes.forEach(({ x1, y1, x2, y2 }) => {
      ctx.beginPath();
      ctx.moveTo(x1 * w, y1 * h);
      ctx.lineTo(x2 * w, y2 * h);
      ctx.stroke();
    });
  }, [spyState.drawStrokes]);

  const gameInfo = GAMES.find((g) => g.id === gameType);
  const gameTitle = gameInfo
    ? locale === 'ru' ? gameInfo.titleRu : gameInfo.titleEn
    : gameType;
  const joinUrl = `${siteUrl}/join/${roomId}`;

  const requestCurrentGameState = useCallback(() => {
    const requestAction = TV_STATE_REQUEST[gameType];
    if (gameType === 'who-am-i') {
      sendAction('who-am-i', { type: 'request-state' });
    } else if (gameType === 'mafia') {
      sendAction('mafia', { type: 'request-state' });
    } else if (requestAction) {
      sendAction(requestAction);
    }
  }, [gameType, sendAction]);

  // Join TV room
  useEffect(() => {
    if (!isConnected) return;
    emit('tv:join', { code: roomId }, () => {
      // Request full game state only after the socket has joined the room,
      // otherwise the h2o:sync response won't be delivered to this socket yet.
      requestCurrentGameState();
    });
  }, [isConnected, roomId, emit, requestCurrentGameState]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && isConnected) requestCurrentGameState();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isConnected, requestCurrentGameState]);

  useEffect(() => {
    // Resolve browser-only values after hydration so the initial markup matches SSR.
    const { origin, port } = window.location;
    fetch('/api/local-ip')
      .then((response) => response.json())
      .then((data: { ip?: string }) => {
        setSiteUrl(data.ip ? `http://${data.ip}${port ? `:${port}` : ''}` : origin);
      })
      .catch(() => setSiteUrl(origin));
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
              ctx.strokeStyle = '#000000';
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
        const mp = payload as { type: string; roles?: Record<string, string>; role?: string; hostPlayerId?: string; stage?: 'mafia' | 'lover' | 'maniac' | 'doctor' | 'detective' | 'don'; killedId?: string | null; killedIds?: string[]; saved?: boolean; playerId?: string; playerIds?: string[]; voterId?: string; winner?: string; round?: number; candidates?: string[]; state?: unknown };
        switch (mp.type) {
          case 'day-timer':
            setMafiaState(prev => ({ ...prev, dayTimer: (payload as unknown as { value: number }).value }));
            break;
          case 'select-host':
            setMafiaState(prev => ({
              ...prev,
              hostPlayerId: mp.hostPlayerId ?? prev.hostPlayerId,
              lastEvent: locale === 'ru' ? 'Ведущий выбран' : 'Host selected',
            }));
            break;
          case 'sync-state': {
            const state = mp.state as {
              dayTimer?: number;
              phase: string;
              hostPlayerId?: string | null;
              nightStage?: 'mafia' | 'lover' | 'maniac' | 'doctor' | 'detective' | 'don' | null;
              roles?: Record<string, string>;
              alive: string[];
              eliminated: { id: string; role: string }[];
              winner: string | null;
              round: number;
              votingRound?: number;
              votingCandidates?: string[];
              lastVoteResult?: 'alibi' | 'pardoned' | 'eliminated' | null;
              lastVoteTargetIds?: string[];
            };
            setMafiaState({
              dayTimer: state.dayTimer,
              phase: state.phase,
              hostPlayerId: state.hostPlayerId ?? null,
              nightStage: state.nightStage ?? null,
              roles: state.roles ?? {},
              alive: state.alive,
              eliminated: state.eliminated.map((e) => ({ id: e.id })),
              lastNightKilledIds: [],
              lastNightSaved: false,
              lastEliminatedIds: state.lastVoteResult === 'eliminated' ? state.lastVoteTargetIds ?? [] : [],
              lastVerdict: state.lastVoteResult ?? null,
              lastVerdictPlayerIds: state.lastVoteTargetIds ?? [],
              votesReceived: [],
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
              hostPlayerId: mp.hostPlayerId ?? prev.hostPlayerId,
              nightStage: null,
              roles: mp.roles ?? {},
              alive: Object.keys(mp.roles ?? {}),
              eliminated: [],
              lastNightKilledIds: [],
              lastNightSaved: false,
              lastEliminatedIds: [],
              lastVerdict: null,
              lastVerdictPlayerIds: [],
              votesReceived: [],
              lastEvent: locale === 'ru' ? 'Роли розданы' : 'Roles assigned',
              winner: null,
              round: 1,
              votingRound: 1,
              votingCandidates: [],
            }));
            break;
          case 'start-night':
            setMafiaState(prev => ({
              ...prev,
              phase: 'night',
              nightStage: 'mafia',
              lastNightKilledIds: [],
              lastNightSaved: false,
              lastEliminatedIds: [],
              lastVerdict: null,
              lastVerdictPlayerIds: [],
              votesReceived: [],
              lastEvent: locale === 'ru' ? 'Ночь наступила' : 'Night falls',
              round: mp.round ?? prev.round,
              votingRound: 1,
              votingCandidates: [],
            }));
            break;
          case 'advance-night-stage':
            setMafiaState(prev => ({
              ...prev,
              nightStage: mp.stage ?? prev.nightStage,
              lastEvent: locale === 'ru' ? 'Следующая ночная роль' : 'Next night role',
            }));
            break;
          case 'night-result': {
            const killedCount = mp.killedIds?.length ?? (mp.killedId ? 1 : 0);
            const saved = mp.saved ?? false;
            const killedIds = mp.killedIds ?? (mp.killedId ? [mp.killedId] : []);
            setMafiaState(prev => ({
              ...prev,
              phase: 'day',
              nightStage: null,
              alive: prev.alive.filter((id) => !killedIds.includes(id)),
              eliminated: [
                ...prev.eliminated,
                ...killedIds.filter((id) => !prev.eliminated.some((entry) => entry.id === id)).map((id) => ({ id })),
              ],
              lastNightKilledIds: killedIds,
              lastNightSaved: saved,
              lastVerdict: null,
              lastVerdictPlayerIds: [],
              lastEvent: killedCount > 0
                ? (killedCount > 1
                  ? (locale === 'ru' ? 'Ночью погибли несколько игроков' : 'Several players died last night')
                  : (locale === 'ru' ? 'Ночью кто-то погиб' : 'Someone died last night'))
                : saved
                ? (locale === 'ru' ? 'Доктор спас жертву' : 'The doctor saved the victim')
                : (locale === 'ru' ? 'Мирная ночь' : 'A peaceful night'),
            }));
            break;
          }
          case 'start-voting':
            setMafiaState(prev => ({
              ...prev,
              phase: 'voting',
              votesReceived: [],
              lastVerdict: null,
              lastVerdictPlayerIds: [],
              lastEvent: locale === 'ru' ? 'Голосование' : 'Voting',
              votingRound: 1,
              votingCandidates: [],
            }));
            break;
          case 'vote-tie':
            setMafiaState(prev => ({
              ...prev,
              phase: 'voting',
              lastEvent: mp.round === 2
                ? (locale === 'ru' ? 'Переголосование' : 'Revote')
                : (locale === 'ru' ? 'Казнить или помиловать?' : 'Execute or pardon?'),
              votingRound: mp.round ?? 1,
              votingCandidates: mp.candidates ?? [],
              votesReceived: [],
            }));
            break;
          case 'cast-vote':
            if (mp.voterId) {
              setMafiaState(prev => ({
                ...prev,
                votesReceived: prev.votesReceived.includes(mp.voterId!)
                  ? prev.votesReceived
                  : [...prev.votesReceived, mp.voterId!],
              }));
            }
            break;
          case 'vote-alibi':
            setMafiaState(prev => ({
              ...prev,
              phase: 'results',
              lastEliminatedIds: [],
              lastVerdict: 'alibi',
              lastVerdictPlayerIds: mp.playerId ? [mp.playerId] : [],
              lastEvent: locale === 'ru' ? 'Алиби сработало' : 'The alibi worked',
              votingRound: 1,
              votingCandidates: [],
            }));
            break;
          case 'vote-pardoned':
            setMafiaState(prev => ({
              ...prev,
              phase: 'results',
              lastEliminatedIds: [],
              lastVerdict: 'pardoned',
              lastVerdictPlayerIds: mp.playerIds ?? [],
              lastEvent: locale === 'ru' ? 'Кандидаты оправданы' : 'Candidates pardoned',
              votingRound: 1,
              votingCandidates: [],
            }));
            break;
          case 'eliminate':
            setMafiaState(prev => ({
              ...prev,
              phase: 'results',
              alive: prev.alive.filter(id => id !== mp.playerId),
              eliminated: [...prev.eliminated, { id: mp.playerId! }],
              roles: mp.playerId && mp.role ? { ...prev.roles, [mp.playerId]: mp.role } : prev.roles,
              lastEliminatedIds: mp.playerId ? [mp.playerId] : [],
              lastVerdict: 'eliminated',
              lastVerdictPlayerIds: mp.playerId ? [mp.playerId] : [],
              lastEvent: locale === 'ru' ? 'Игрок исключён' : 'Player eliminated',
              votingRound: 1,
              votingCandidates: [],
            }));
            break;
          case 'eliminate-many':
            setMafiaState(prev => ({
              ...prev,
              phase: 'results',
              alive: prev.alive.filter(id => !(mp.playerIds ?? []).includes(id)),
              eliminated: [
                ...prev.eliminated,
                ...(mp.playerIds ?? []).map((id) => ({ id })),
              ],
              roles: mp.roles ? { ...prev.roles, ...mp.roles } : prev.roles,
              lastEliminatedIds: mp.playerIds ?? [],
              lastVerdict: 'eliminated',
              lastVerdictPlayerIds: mp.playerIds ?? [],
              lastEvent: locale === 'ru' ? 'Кандидаты исключены' : 'Candidates eliminated',
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
                ? (locale === 'ru' ? 'Мафия победила' : 'The mafia wins')
                : mp.winner === 'maniac'
                ? (locale === 'ru' ? 'Маньяк победил' : 'The maniac wins')
                : (locale === 'ru' ? 'Мирные победили' : 'The citizens win'),
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
            });
            setLastWhoAmIGuessResult(null);
            if (whoAmIGuessTimeoutRef.current !== null) {
              window.clearTimeout(whoAmIGuessTimeoutRef.current);
              whoAmIGuessTimeoutRef.current = null;
            }
            break;

          case 'sync-state':
            setWhoAmIState(wp.state);
            if (wp.state.guessNeedsConfirm || wp.state.guessAwaitingJudge) {
              setLastWhoAmIGuessResult(null);
            }
            break;

          case 'next-turn':
            setWhoAmIState((prev) => ({
              ...prev,
              currentTurnIndex: getWhoAmINextTurnIndex(prev),
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
                const guessedPlayers = prev.guessedPlayers.includes(wp.playerId)
                  ? prev.guessedPlayers
                  : [...prev.guessedPlayers, wp.playerId];
                const allGuessed = guessedPlayers.length >= prev.turnOrder.length;

                return {
                  ...prev,
                  guessedPlayers,
                  phase: allGuessed ? 'finished' : prev.phase,
                  currentTurnIndex: getWhoAmINextTurnIndex(prev),
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

  const quizPlayers = players.map((p) => ({
    id: p.id,
    name: p.nickname,
    score: quizState.scores[p.id] || 0,
    away: !p.isConnected || Boolean(p.isAway),
    hasAnswered: Object.hasOwn(quizState.answers, p.id),
    isCorrect: quizState.showCorrect && quizState.correctPlayers.includes(p.id),
  }));
  const scoreboard = [...quizPlayers].sort((a, b) => b.score - a.score);
  const qrOverlay = showQrOverlay && gameType !== 'who-am-i' ? (
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
    const topicInfo = quizState.config.topic ? QUIZ_TOPICS.find((topic) => topic.id === quizState.config.topic) : null;
    const specialQuizInfo = quizState.config.specialQuizId ? SPECIAL_QUIZZES.find((quiz) => quiz.id === quizState.config.specialQuizId) : null;
    const specialThemeInfo = quizState.config.specialTheme ? SPECIAL_QUIZ_THEMES.find((theme) => theme.id === quizState.config.specialTheme) : null;
    const backgroundUrl = specialQuizInfo?.backgroundUrl ?? specialThemeInfo?.backgroundUrl;
    const topicLabel = specialQuizInfo
      ? (locale === 'ru' ? specialQuizInfo.titleRu : specialQuizInfo.titleEn)
      : specialThemeInfo
        ? (locale === 'ru' ? specialThemeInfo.titleRu : specialThemeInfo.titleEn)
        : topicInfo
          ? (locale === 'ru' ? topicInfo.titleRu : topicInfo.titleEn)
          : (locale === 'ru' ? 'Общий квиз' : 'General quiz');
    const timePerQuestion = quizState.config.difficulty === 'easy' ? 15
      : quizState.config.difficulty === 'hard' ? 25 : 20;

    return (
      <>
        <QuizPulseTvScreen
          locale={locale}
          phase={quizState.phase}
          topic={topicLabel}
          backgroundUrl={backgroundUrl}
          question={quizState.currentQuestion}
          questionIndex={quizState.questionIndex}
          totalQuestions={quizState.totalQuestions}
          timeLeft={quizState.timeLeft}
          timePerQuestion={timePerQuestion}
          countdownValue={quizState.countdownValue}
          scores={scoreboard}
          players={quizPlayers}
          totalPlayers={players.length}
          showCorrect={quizState.showCorrect}
          answeredCount={Object.keys(quizState.answers).length}
          isSetup={quizState.phase.startsWith('setup-')}
        />
        {qrOverlay}
      </>
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
          {h.phase === 'r4rules' && (
            <>
              <div className="flex items-center justify-between"><H2OTVBrand />{h2oLivePill}</div>
              <div className="flex flex-1 items-center justify-center">
                <section className={`${H2O_TV_GLASS_STRONG} w-full max-w-[1100px] rounded-[var(--radius-2xl)] p-12`}>
                  <h2 className="mb-8 text-center text-[52px] font-extrabold text-amber-200">{l('ИГРА НАОБОРОТ', 'REVERSE GAME')}</h2>
                  <ol className="list-decimal space-y-5 pl-10 text-[28px] leading-snug">
                    <li>{l('Обе команды отвечают на один и тот же вопрос', 'Both teams answer the same question')}</li>
                    <li>{l('Команды обсуждают ответ 60 секунд', 'Teams discuss their answer for 60 seconds')}</li>
                    <li>{l('Нужно найти самый редкий ответ', 'Find the rarest answer')}</li>
                    <li>{l('Чем ниже ответ в списке — тем больше очков!', 'The lower the answer is on the list, the more points it gives!')}</li>
                    <li>{l('Очки: 15, 30, 60, 120, 180, 240', 'Points: 15, 30, 60, 120, 180, 240')}</li>
                  </ol>
                  <p className="mt-8 text-center text-[24px] text-white/60">{l('Ведущий начнёт раунд…', 'Waiting for the host to start…')}</p>
                </section>
              </div>
            </>
          )}
          {h.phase === 'playing' && q && (
            <>
              <div className="grid grid-cols-[1fr_auto_1fr] items-center">
                <H2OTVBrand />
                <div className={`${H2O_TV_GLASS} inline-flex items-center gap-[14px] rounded-full px-[30px] py-[14px]`}>
                  <HundredToOneIcon name="board" className="h-[26px] w-[26px] text-amber-400" />
                  <b className="text-[26px] font-extrabold uppercase tracking-[2px] text-amber-200">РАУНД {h.curQ + 1} · {H2O_ROUND_NAMES[h.curQ]}</b>
                  {h.curQ < 3 && <span className="rounded-full border border-amber-300/40 bg-amber-500/[.13] px-3 py-1 font-mono text-[20px] font-bold text-amber-400">×{h.curQ + 1}</span>}
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
            h.bgAwaitingReady ? (
              <>
                <div className="flex items-center justify-between"><H2OTVBrand />{h2oLivePill}</div>
                <div className="flex flex-1 flex-col items-center justify-center gap-8 text-center">
                  <h2 className="text-[52px] font-extrabold text-amber-200">{l('БОЛЬШАЯ ИГРА', 'BIG GAME')}</h2>
                  <p className="text-[34px]">{h2oPlayerName(h.bgPhase === 1 ? h.bgP1Id : h.bgP2Id)}</p>
                  <p className="text-[28px] text-white/60">{l('Ждём подтверждения готовности на телефоне игрока', 'Waiting for the player to confirm readiness on their phone')}</p>
                </div>
              </>
            ) : h.bgPhase === 0 ? (
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
                          if (!ans) return null;
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
                      <span className="text-[128px] font-extrabold tabular-nums leading-none tracking-[-4px] text-[#fffbeb] drop-shadow-[0_0_44px_rgba(245,158,11,.4)]">
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
    const timerRatio = Math.max(0, Math.min(1, sp.timerLeft / 180));
    const timerOffset = CIRC * (1 - timerRatio);
    const timerColor = sp.timerLeft <= 30 ? '#ff453a' : sp.timerLeft <= 90 ? '#ffd60a' : '#64d2ff';
    const votedCount = Object.keys(sp.votes).length;
    const tvPhase = sp.gameOver
      ? l('Итоги операции', 'Operation results')
      : sp.phase === 'modeSelect' ? l('Выбор режима', 'Mode selection')
      : sp.phase === 'dealing' ? l('Секретное задание', 'Secret briefing')
      : sp.phase === 'playing' ? (sp.mode === 'draw' ? l('Нарисуй', 'Draw') : l('Допрос', 'Interview'))
      : sp.phase === 'spyGuess' ? (sp.spyGuessAwaitingJudge ? l('Проверка ответа', 'Answer review') : l('Попытка шпиона', 'Spy attempt'))
      : sp.phase === 'discussion' ? l('Обсуждение', 'Discussion')
      : sp.phase === 'voting' ? l('Голосование', 'Voting')
      : l('Итог раунда', 'Round result');

    return (
      <GameSurface className="spy-live-tv h-screen overflow-hidden text-white">
        <div className="spy-live-tv-grid" />
        <header className="spy-live-tv-header">
          <div><SpyImg name="mask" className="h-10 w-10" /><span><b>{l('ШПИОН', 'SPY')}</b></span></div>
          <p><span>{l('ТЕКУЩИЙ ЭТАП', 'CURRENT STAGE')}</span><b>{tvPhase}</b></p>
          <em><i />{sp.phase === 'voting' ? `${votedCount} ${l('ИЗ', 'OF')} ${spyPlayerList.length} ${l('ПРОГОЛОСОВАЛИ', 'VOTED')}` : sp.gameOver ? l('ОПЕРАЦИЯ ЗАКРЫТА', 'OPERATION CLOSED') : `${spyPlayerList.length} ${l('УЧАСТНИКОВ', 'PLAYERS')}`}</em>
        </header>

        {sp.gameOver && <div className="spy-live-tv-center spy-live-tv-over"><div className="spy-live-tv-end"><SpyImg name="mask" className="h-28 w-28" /><i /></div><span>{l('ВСЕ ДЕЛА ЗАКРЫТЫ', 'ALL CASES CLOSED')}</span><h1>{l('Операция завершена', 'Operation complete')}</h1><p>{l('Спасибо за игру. Никому нельзя доверять.', 'Thank you for playing. Trust no one.')}</p></div>}

        {!sp.gameOver && sp.phase === 'modeSelect' && <div className="spy-live-tv-center spy-live-tv-wait"><div className="spy-live-tv-radar"><SpyImg name="mask" className="h-28 w-28" /><i /><i /><i /></div><span>{l('ОПЕРАЦИЯ ЕЩЁ НЕ НАЧАЛАСЬ', 'OPERATION NOT STARTED')}</span><h1>{l('Ожидаем решения ведущего', 'Waiting for the host')}</h1><p>{l('На телефоне ведущего выбирается режим игры.', 'The host is choosing a game mode on their phone.')}</p></div>}

        {!sp.gameOver && sp.phase === 'dealing' && <div className="spy-live-tv-center spy-live-tv-brief"><span>{l('СЕКРЕТНЫЕ ДАННЫЕ ОТПРАВЛЕНЫ', 'CLASSIFIED DATA SENT')}</span><h1>{l('Проверьте свои телефоны', 'Check your phones')}</h1><p>{l('Один участник не получил слово. Не показывайте экран соседям.', 'One player did not receive the word. Keep your screen private.')}</p><div className="spy-live-tv-ready">{spyPlayerList.map((player) => { const ready = sp.readyPlayers.includes(player.id); return <div key={player.id} className={ready ? 'ready' : ''}><i>{player.nickname[0]}</i><b>{player.nickname}</b><span>{ready ? l('ГОТОВ', 'READY') : l('ОЖИДАЕМ', 'WAITING')}</span></div>; })}</div><div className="spy-live-tv-progress"><i><b style={{ width: spyPlayerList.length ? `${(sp.readyPlayers.length / spyPlayerList.length) * 100}%` : '0%' }} /></i><span>{sp.readyPlayers.length} / {spyPlayerList.length}</span></div></div>}

        {!sp.gameOver && sp.phase === 'playing' && sp.mode !== 'draw' && <div className="spy-live-tv-question">
          <div className="spy-live-tv-timer"><svg viewBox="0 0 260 260"><circle cx="130" cy="130" r="118" /><circle className="progress" cx="130" cy="130" r="118" stroke={timerColor} strokeDasharray={CIRC} strokeDashoffset={timerOffset} /></svg><b>{formatSec(sp.timerLeft)}</b><span>{l('ДО ОБСУЖДЕНИЯ', 'UNTIL DISCUSSION')}</span></div>
          <div className="spy-live-tv-interview"><span>{l('АКТИВНЫЙ ДОПРОС', 'ACTIVE INTERVIEW')}</span><div><i>{activePlayerName[0]}</i><p><small>{l('ЗАДАЁТ ВОПРОС', 'ASKING')}</small><b>{activePlayerName}</b></p></div><em>→</em><div className="target"><i>{targetPlayerName[0]}</i><p><small>{l('ОТВЕЧАЕТ', 'ANSWERING')}</small><b>{targetPlayerName}</b></p></div><small>{l('Опишите слово, не называя его', 'Describe the word without saying it')}</small></div>
          <aside>{sp.playerOrder.slice(0, 7).map((id, index) => <div key={id} className={id === activePlayerId ? 'active' : ''}><i>{index + 1}</i><b>{spyGetName(id)}</b><span>{id === activePlayerId ? l('ГОВОРИТ', 'SPEAKING') : l('ОЖИДАЕТ', 'WAITING')}</span></div>)}</aside>
        </div>}

        {!sp.gameOver && sp.phase === 'playing' && sp.mode === 'draw' && <div className="spy-live-tv-draw"><div className="spy-live-tv-draw-meta"><span><i /> LIVE CANVAS</span><b>{formatSec(sp.timerLeft)}</b></div><canvas ref={initSpyCanvas} /><div className="spy-live-tv-drawer"><span>{l('РИСУЕТ', 'DRAWING')}</span><b>{activePlayerName}</b><small>{l('СЛЕДУЮЩИЙ', 'NEXT')} · {spyGetName(sp.playerOrder[(sp.playerOrderIdx + 1) % Math.max(1, sp.playerOrder.length)] ?? '')}</small></div><div className="spy-live-tv-order">{sp.playerOrder.slice(0, 8).map((id) => <i key={id} className={id === activePlayerId ? 'active' : ''}>{spyGetName(id)[0]}</i>)}</div></div>}

        {!sp.gameOver && sp.phase === 'discussion' && <div className="spy-live-tv-center spy-live-tv-discussion"><span>{l('ОБЩИЙ КАНАЛ ОТКРЫТ', 'OPEN CHANNEL')}</span><div>{formatSec(sp.discussionTimeLeft)}</div><h1>{l('Обсудите подозреваемых', 'Discuss the suspects')}</h1><p>{l('После таймера начнётся голосование. Ведущий может запустить его раньше.', 'Voting starts when the timer ends. The host can start it earlier.')}</p><section>{Array.from({ length: 36 }, (_, index) => <i key={index} style={{ height: `${18 + ((index * 17) % 66)}px`, animationDelay: `${(index % 9) * -0.11}s` }} />)}</section></div>}

        {!sp.gameOver && sp.phase === 'voting' && <div className="spy-live-tv-voting"><div><span>{l('ГОЛОСОВАНИЕ ИДЁТ', 'VOTING IN PROGRESS')}</span><h1>{l('Кто здесь шпион?', 'Who is the spy?')}</h1><p>{l('Личный выбор каждого остаётся скрытым до завершения голосования.', 'Every choice stays private until voting ends.')}</p><div className="spy-live-tv-vote-progress"><i><b style={{ width: spyPlayerList.length ? `${(votedCount / spyPlayerList.length) * 100}%` : '0%' }} /></i><span>{votedCount} / {spyPlayerList.length}</span></div></div><div className="spy-live-tv-voters">{spyPlayerList.map((player) => { const done = Object.hasOwn(sp.votes, player.id); return <div key={player.id} className={done ? 'done' : ''}><i>{player.nickname[0]}</i><b>{player.nickname}</b><span>{done ? l('ГОЛОС ПРИНЯТ', 'VOTE ACCEPTED') : l('ОЖИДАЕМ', 'WAITING')}</span></div>; })}</div></div>}

        {!sp.gameOver && sp.phase === 'spyGuess' && !sp.spyGuessAwaitingJudge && <div className="spy-live-tv-center spy-live-tv-spy"><div><SpyImg name="mask" className="h-24 w-24" /></div><span>{l('ПОСЛЕДНЯЯ ПОПЫТКА', 'FINAL ATTEMPT')}</span><h1>{l('Шпион угадывает слово', 'The spy is guessing the word')}</h1><p>{l('Остался последний шанс угадать секретное слово.', 'One final chance remains to guess the secret word.')}</p><section><span>{l('КАТЕГОРИЯ', 'CATEGORY')}</span><b>{sp.category}</b><small>{l('ОТВЕТ ВВОДИТСЯ НА ТЕЛЕФОНЕ', 'ANSWER ENTERED ON PHONE')}</small></section></div>}

        {!sp.gameOver && sp.phase === 'spyGuess' && sp.spyGuessAwaitingJudge && <div className="spy-live-tv-center spy-live-tv-verdict"><span>{l('ОТВЕТ ПЕРЕДАН НА ПРОВЕРКУ', 'ANSWER SENT FOR REVIEW')}</span><h1>{l(`Ожидаем решение ${spyGetName(sp.spyGuessJudgeId)}`, `Waiting for ${spyGetName(sp.spyGuessJudgeId)}`)}</h1><p>{l('Автоматическая проверка не нашла точного совпадения.', 'Automatic review found no exact match.')}</p><div><section><span>{l('ВЕРСИЯ ШПИОНА', 'SPY GUESS')}</span><b>{sp.spyGuessText}</b></section><i>?</i><section><span>{l('СЕКРЕТНОЕ СЛОВО', 'SECRET WORD')}</span><b>{l('СКРЫТО', 'HIDDEN')}</b></section></div><small>{l('ТОЛЬКО ПРОВЕРЯЮЩИЙ ВИДИТ ОБА СЛОВА', 'ONLY THE JUDGE SEES BOTH WORDS')}</small></div>}

        {!sp.gameOver && sp.phase === 'roundResult' && sp.roundResult && <div className="spy-live-tv-result"><div className={sp.roundResult.spyCaught ? '' : 'danger'}><SpyImg name={sp.roundResult.spyCaught ? 'shield' : 'mask'} className="h-14 w-14" /><span><small>{sp.roundResult.spyCaught ? l('ОПЕРАЦИЯ УСПЕШНА', 'OPERATION SUCCESSFUL') : l('ОПЕРАЦИЯ ПРОВАЛЕНА', 'OPERATION FAILED')}</small><b>{sp.roundResult.spyCaught ? l('ШПИОН РАСКРЫТ', 'SPY EXPOSED') : l('ШПИОН ПОБЕДИЛ', 'SPY WINS')}</b></span></div><section><div><span>{l('ШПИОНОМ БЫЛ', 'THE SPY WAS')}</span><i>{spyName[0]}</i><b>{spyName}</b><small>{sp.roundResult.viaGuess ? l('ПОСЛЕДНЯЯ ПОПЫТКА', 'FINAL ATTEMPT') : `${sp.roundResult.voteCount} ${l('ИЗ', 'OF')} ${sp.roundResult.totalVotes ?? votedCount} ${l('ГОЛОСОВ', 'VOTES')}`}</small></div><div><span>{l('СЕКРЕТНОЕ СЛОВО', 'SECRET WORD')}</span><small>{sp.category}</small><b>{sp.word}</b><em>{sp.roundResult.spyCaught ? l('ДЕЛО ЗАКРЫТО', 'CASE CLOSED') : l('ШПИОН СКРЫЛСЯ', 'SPY ESCAPED')}</em></div></section></div>}

        <footer className="spy-live-tv-footer"><span>{l('ДЕЛО', 'CASE')} 01 · {l('РАУНД', 'ROUND')} {sp.currentRound}</span><b>{sp.gameOver ? l('АРХИВ СОХРАНЁН', 'ARCHIVE SAVED') : sp.phase === 'roundResult' ? l('ДЕЛО ЗАКРЫТО', 'CASE CLOSED') : l('КТО-ТО ЗА СТОЛОМ ЛЖЁТ', 'SOMEONE IS LYING')}</b><span>{l('СИГНАЛ СТАБИЛЕН', 'SIGNAL STABLE')}</span></footer>
        {qrOverlay}
      </GameSurface>
    );
  }

  // ===================== CROCODILE TV RENDER =====================
  if (gameType === 'crocodile') {
    const explainerName = getPlayerName(crocState.explainerId);
    const crocTargetScore = 20;
    const crocRaceColors = ['#ff584d', '#ff8a52', '#ffd166', '#f2eee5', '#38d9a9', '#4dabf7', '#748ffc', '#b197fc', '#f783ac', '#ced4da'];
    const scoreIds = new Set([...players.map((player) => player.id), ...Object.keys(crocState.scores)]);
    const sortedScores = Array.from(scoreIds)
      .map((id) => ({ id, name: getPlayerName(id), score: crocState.scores[id] ?? 0 }))
      .sort((a, b) => b.score - a.score);
    const winnerId = crocState.winnerId ?? (crocState.phase === 'finished' ? sortedScores[0]?.id : null);
    const winner = sortedScores.find((player) => player.id === winnerId) ?? sortedScores[0];
    const crocRound = Math.floor((crocState.turnNumber - 1) / Math.max(1, crocState.playersOrder.length)) + 1;
    const crocTime = formatGameTime(crocState.timeLeft);
    const crocTvGridClass = 'grid h-full grid-cols-[minmax(0,1fr)_minmax(480px,560px)] items-center gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(520px,580px)] xl:gap-10 2xl:grid-cols-[minmax(0,1fr)_minmax(680px,760px)] 2xl:gap-20';
    const racePanel = (final = false) => (
      <aside className={`rounded-[36px] border border-white/10 px-8 py-8 2xl:px-10 2xl:py-9 ${final ? 'bg-[#ef3340]' : 'bg-white/[0.055]'}`}>
        <div className="mb-6 flex items-center justify-between gap-5">
          <b className="text-2xl 2xl:text-3xl">{final
            ? l('Финальный результат', 'Final result')
            : crocState.finishingRound !== null
              ? l('Финальный круг', 'Final round')
              : l('До финиша', 'To the finish')}</b>
          <span className={`rounded-full px-4 py-2 font-mono text-base font-bold 2xl:text-lg ${final ? 'bg-white text-[#991b2f]' : 'bg-[#ef3340] text-white'}`}>
            {l('ЦЕЛЬ 20', 'GOAL 20')}
          </span>
        </div>
        <div className="grid grid-cols-[max-content_minmax(0,1fr)_76px] items-center gap-x-3 gap-y-3 2xl:grid-cols-[max-content_minmax(0,1fr)_90px] 2xl:gap-x-4">
          {sortedScores.slice(0, 10).map((player, index) => (
            <div key={player.id} className="contents">
              <span className="max-w-[150px] truncate text-[17px] font-bold 2xl:max-w-[190px] 2xl:text-xl">{player.name}</span>
              <div className="h-3 overflow-hidden rounded-full bg-white/15 2xl:h-3.5">
                <i
                  className="block h-full origin-left rounded-full transition-[width] duration-700 motion-reduce:transition-none"
                  style={{ width: `${Math.min(100, (player.score / crocTargetScore) * 100)}%`, background: crocRaceColors[index] }}
                />
              </div>
              <b className="text-right font-mono text-lg tabular-nums 2xl:text-xl">{player.score}<small className="text-white/45">/20</small></b>
            </div>
          ))}
        </div>
      </aside>
    );

    return (
      <GameSurface className="h-screen overflow-hidden bg-[#100d12] bg-[radial-gradient(circle_at_18%_45%,rgba(239,51,64,.19),transparent_34%),radial-gradient(circle_at_90%_0%,rgba(255,106,77,.14),transparent_35%)] text-white">
        <header className="relative flex h-20 items-center justify-between border-b border-white/10 px-8">
          <div className="flex items-center gap-3">
            <CrocIcon name="croc" className="h-10 w-10 text-[#ef3340]" />
            <b className="text-xl">{l('КРОКОДИЛ', 'CROCODILE')}</b>
          </div>
          <span className="font-mono text-xs uppercase tracking-[0.14em] text-[#ff8b78]">
            {crocState.finishingRound !== null
              ? l(`ФИНАЛЬНЫЙ КРУГ · РАУНД ${crocRound}`, `FINAL ROUND · ROUND ${crocRound}`)
              : l(`РАУНД ${crocRound} · ЦЕЛЬ 20`, `ROUND ${crocRound} · GOAL 20`)}
          </span>
        </header>

        <main className="relative h-[calc(100vh-5rem)] px-10 py-8 2xl:px-14 2xl:py-10">
          {crocState.phase === 'waiting' && (
            <div className={crocTvGridClass}>
              <section>
                <small className="font-mono uppercase tracking-[0.25em] text-[#ff8b78]">{l('КОМНАТА ГОТОВА', 'ROOM READY')}</small>
                <h2 className="mt-4 text-7xl font-black leading-[0.9] tracking-[-0.06em]">{l('Соберите\n20 слов', 'Collect\n20 words').split('\n').map((line) => <span key={line} className="block">{line}</span>)}</h2>
                <p className="mt-6 max-w-2xl text-xl text-white/45">{l('Карточка вправо даёт +1, влево пропускает слово', 'Swipe right for +1 or left to skip a word')}</p>
              </section>
              <section>
                {racePanel()}
                <div className="mt-5 rounded-full bg-[#ef3340] px-5 py-3 text-center font-bold animate-pulse motion-reduce:animate-none">{l('ЖДЁМ СТАРТА', 'WAITING TO START')}</div>
              </section>
            </div>
          )}

          {(crocState.phase === 'ready' || crocState.phase === 'explaining') && (
            <div className={crocTvGridClass}>
              <section className="flex min-w-0 items-center justify-center gap-8 xl:gap-10 2xl:gap-14">
                <div className="rounded-full bg-[#ef3340]/10 p-3 shadow-[0_0_65px_rgba(239,51,64,.2)] motion-safe:animate-pulse">
                  <PlayerAvatar nickname={explainerName} sizePx={180} ring="#ef3340" />
                </div>
                <div className="min-w-0">
                  <small className="font-mono text-sm uppercase tracking-[0.2em] text-[#ff8b78] 2xl:text-base">{crocState.phase === 'ready' ? l('ГОТОВИТСЯ НАЧАТЬ', 'GETTING READY') : l('СЕЙЧАС ПОКАЗЫВАЕТ', 'NOW EXPLAINING')}</small>
                  <h2 className="max-w-[620px] truncate text-7xl font-black leading-[0.9] tracking-[-0.07em] xl:text-8xl 2xl:text-[9rem]">{explainerName}</h2>
                  <div className="mt-8 w-[340px] rounded-[24px] bg-[#211b24] p-5 xl:w-[380px] 2xl:w-[480px] 2xl:p-6">
                    <div className="flex items-center justify-between"><small className="font-mono text-xs uppercase tracking-[0.2em] text-white/45 2xl:text-sm">{l('ВРЕМЯ ХОДА', 'TURN TIME')}</small><b className="font-mono text-4xl tabular-nums 2xl:text-5xl">{crocTime}</b></div>
                    <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-white/10 2xl:h-3"><i className="block h-full rounded-full bg-[#ef3340] transition-[width] duration-1000 motion-reduce:transition-none" style={{ width: `${Math.max(0, Math.min(100, (crocState.timeLeft / 60) * 100))}%` }} /></div>
                  </div>
                </div>
              </section>
              {racePanel()}
            </div>
          )}

          {crocState.phase === 'finished' && (
            <div className={crocTvGridClass}>
              <section>
                <small className="font-mono uppercase tracking-[0.25em] text-[#ff8b78]">{l('ИГРА ОКОНЧЕНА', 'GAME OVER')}</small>
                <h2 className="mt-4 text-8xl font-black leading-[0.88] tracking-[-0.065em]">{winner?.name ?? l('Победитель', 'Winner')}<br />{winner?.score ?? 0}</h2>
                <p className="mt-5 text-xl text-white/50">{l('Больше всех слов после полного круга', 'Most words after the full round')}</p>
              </section>
              {racePanel(true)}
            </div>
          )}
        </main>
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
    const aliasTargetScore = aliasState.mode === 'letter' ? ALIAS_LETTER_TARGET_SCORE : ALIAS_CLASSIC_TARGET_SCORE;
    const aliasTimerRadius = 118;
    const aliasTimerCirc = 2 * Math.PI * aliasTimerRadius;
    const aliasTimerRatio = Math.max(0, Math.min(1, aliasState.timeLeft / aliasDuration));
    const aliasTimerOffset = aliasTimerCirc * (1 - aliasTimerRatio);
    const aliasSortedTeams = [...aliasState.teams].sort((a, b) => b.score - a.score);
    const aliasWinner = aliasSortedTeams[0];
    const aliasTurnPoints = aliasState.mode === 'letter'
      ? aliasState.wordsGuessed
      : aliasState.lastTurnDeltas?.[activeTeam?.id ?? ''] ?? aliasState.wordsGuessed - aliasState.wordsSkipped;
    const aliasFinalWordTeam = aliasState.finalWordAwardTeamIndex !== null
      && aliasState.finalWordAwardTeamIndex !== undefined
      ? aliasState.teams[aliasState.finalWordAwardTeamIndex]
      : null;
    const aliasGuessedWords = aliasState.turnHistory.filter((item) => item.guessed);
    const aliasSkippedWords = aliasState.turnHistory.filter((item) => !item.guessed);
    return (
      <GameSurface className="alias-live-tv">
        <div className="alias-live-tv-decor" aria-hidden="true">{Array.from({ length: 22 }, (_, index) => <i key={index} />)}</div>
        <header><div><AliasIcon name="speech" className="h-11 w-11" /><span><b>{l('УГАДАЙ СЛОВО', 'GUESS THE WORD')}</b><small>{aliasState.mode === 'classic' ? l('КЛАССИКА', 'CLASSIC') : l('НА БУКВУ', 'LETTER MODE')}{aliasState.teams.length > 0 ? ` · ${l('РАУНД', 'ROUND')} ${aliasState.round}` : ''}</small></span></div></header>
        <main>
          {/* WAITING / MODE SELECT — no game yet */}
          {(aliasState.phase === 'modeSelect' || (aliasState.phase === 'waiting' && aliasState.teams.length === 0)) && (
            <section className="alias-live-tv-lobby"><div className="alias-live-tv-deck"><i /><i /><article><AliasIcon name="speech" className="h-24 w-24" /></article></div><small>{l('СОБИРАЕМ ИГРОКОВ', 'GATHERING PLAYERS')}</small><h1>{l('Выберите режим и начнём игру', 'Choose a mode and start the game')}</h1><div className="alias-live-tv-avatars">{players.map((player) => <span key={player.id}><i>{player.nickname.slice(0, 1).toUpperCase()}</i><b>{player.nickname}</b></span>)}</div><p>{l('Хост выбирает правила на своём телефоне', 'The host chooses the rules on their phone')}</p></section>
          )}

          {/* TEAM SELECT */}
          {aliasState.phase === 'teamSelect' && (
            <section className="alias-live-tv-setup"><small>{l('РАСПРЕДЕЛЕНИЕ ПО КОМАНДАМ', 'TEAM ASSIGNMENT')}</small><h1>{l('Выберите свою сторону', 'Choose your side')}</h1><div className="alias-live-tv-teamtables">{aliasState.teams.map((team, teamIndex) => <article key={team.id}><span>{l('КОМАНДА', 'TEAM')} 0{teamIndex + 1}</span><b>{team.name}</b><div className="alias-live-tv-avatars">{team.playerIds.map((id) => <span key={id}><i>{getPlayerName(id).slice(0, 1).toUpperCase()}</i><b>{getPlayerName(id)}</b></span>)}</div>{team.playerIds.length === 0 && <em>{l('ПОКА НИКОГО', 'NOBODY YET')}</em>}</article>)}</div><p>{l('Все игроки выбирают команду на своих телефонах', 'Players choose a team on their phones')}</p></section>
          )}

          {aliasState.phase === 'individualSetup' && (
            <section className="alias-live-tv-setup"><small>{l('ЛИЧНЫЙ ЗАЧЁТ', 'INDIVIDUAL GAME')}</small><h1>{l('Порядок игроков определён', 'Player order is ready')}</h1><div className="alias-live-tv-order">{aliasState.teams.map((team, index) => <article key={team.id}><span>{String(index + 1).padStart(2, '0')}</span><i>{team.name.slice(0, 1).toUpperCase()}</i><b>{team.name}</b></article>)}</div><p>{l('Каждый играет сам за себя', 'Every player competes individually')}</p></section>
          )}

          {/* TEAM NAME */}
          {aliasState.phase === 'teamName' && (
            <section className="alias-live-tv-setup"><small>{l('КОМАНДЫ ВЫБИРАЮТ НАЗВАНИЯ', 'TEAMS ARE CHOOSING NAMES')}</small><h1>{l('Последний штрих', 'The final touch')}</h1><div className="alias-live-tv-namecards">{aliasState.teams.map((team, teamIndex) => { const namerId = team.playerIds.find((id) => players.find((p) => p.id === id)?.isConnected) ?? team.playerIds[0]; const done = (aliasState.teamNameConfirmed ?? [])[teamIndex]; return <article key={team.id}><span>{l('КОМАНДА', 'TEAM')} 0{teamIndex + 1}</span><b>{team.name || '…'}</b><small>{done ? l('ИМЯ ВЫБРАНО ✓', 'NAME SET ✓') : l(`${getPlayerName(namerId)} ВЫБИРАЕТ ИМЯ`, `${getPlayerName(namerId)} IS NAMING`)}</small></article>; })}</div></section>
          )}

          {aliasState.phase === 'letterRule' && (
            <section className="alias-live-tv-setup"><small>{l('ПРАВИЛО ЛИЧНОГО РАУНДА', 'INDIVIDUAL ROUND RULE')}</small><h1>{l('Объясняйте только на букву', 'Explain only using the letter')}</h1><div className="alias-live-tv-bigletter"><span>{l('БУКВА МЕНЯЕТСЯ ПОСЛЕ КАЖДОГО УГАДАННОГО СЛОВА', 'LETTER CHANGES AFTER EVERY GUESSED WORD')}</span><b>{aliasState.currentLetter}</b><small>{l('90 СЕКУНД · ЦЕЛЬ 15 · ПРОПУСК БЕЗ ШТРАФА', '90 SECONDS · FIRST TO 15 · NO SKIP PENALTY')}</small></div></section>
          )}

          {/* WAITING for explainer to start turn */}
          {aliasState.phase === 'waiting' && aliasState.teams.length > 0 && (
            <section className="alias-live-tv-ready"><div className="alias-live-tv-playercard"><i /><i /><article><AliasIcon name="mic" className="h-20 w-20" /><small>{l('СЕЙЧАС ОБЪЯСНЯЕТ', 'NOW EXPLAINING')}</small><b>{explainerName}</b><span>{aliasState.mode === 'classic' ? `${l('КОМАНДА', 'TEAM')} «${activeTeam?.name ?? ''}»` : l('ЛИЧНЫЙ ХОД · БУКВА СКРЫТА', 'INDIVIDUAL TURN · LETTER HIDDEN')}</span></article></div><h1>{l('Передаём ход', 'Passing the turn')}</h1><p>{l(`${explainerName} запускает таймер на своём телефоне`, `${explainerName} starts the timer on their phone`)}</p></section>
          )}

          {/* EXPLAINING */}
          {aliasState.phase === 'explaining' && (
            <section className="alias-live-tv-playing">
              <div className="alias-live-tv-timer"><svg viewBox="0 0 260 260"><circle cx="130" cy="130" r={aliasTimerRadius} /><circle className={aliasState.timeLeft <= 10 ? 'danger' : ''} cx="130" cy="130" r={aliasTimerRadius} strokeDasharray={aliasTimerCirc} strokeDashoffset={aliasTimerOffset} transform="rotate(-90 130 130)" /></svg><b>{aliasState.timeLeft}</b><small>{aliasState.mode === 'classic' && aliasState.timeLeft <= 0 ? l('ПОСЛЕДНЕЕ СЛОВО', 'FINAL WORD') : l('СЕКУНД', 'SECONDS')}</small></div>
              <div className="alias-live-tv-focus"><small>{aliasState.finalWordPending ? l('ОБЪЯСНЯЮЩИЙ ВЫБИРАЕТ КОМАНДУ', 'EXPLAINER IS CHOOSING A TEAM') : aliasState.mode === 'classic' && aliasState.timeLeft <= 0 ? l('ВРЕМЯ ВЫШЛО · ДОИГРЫВАЕМ СЛОВО', 'TIME IS UP · FINISH THE WORD') : l('СЕЙЧАС ОБЪЯСНЯЕТ', 'NOW EXPLAINING')}</small><h1>{explainerName}</h1>{aliasState.mode === 'letter' ? <div className="alias-live-tv-letter"><span>{l('ОБЪЯСНЯЙТЕ НА БУКВУ', 'EXPLAIN USING LETTER')}</span><b>{aliasState.currentLetter}</b></div> : <div className="alias-live-tv-team"><div>{(activeTeam?.playerIds ?? []).slice(0, 4).map((id) => <i key={id}>{getPlayerName(id).slice(0, 1).toUpperCase()}</i>)}</div><span>{aliasState.finalWordPending ? l('КОМУ ЗАСЧИТАТЬ ПОСЛЕДНЕЕ СЛОВО?', 'WHO GETS THE FINAL WORD?') : l(`КОМАНДА «${activeTeam?.name ?? ''}» УГАДЫВАЕТ`, `TEAM “${activeTeam?.name ?? ''}” IS GUESSING`)}</span></div>}<div className="alias-live-tv-counters"><span><AliasIcon name="check" className="h-7 w-7" /><b>{aliasState.wordsGuessed}</b><small>{l('УГАДАНО', 'GUESSED')}</small></span><span><AliasIcon name="cross" className="h-7 w-7" /><b>{aliasState.wordsSkipped}</b><small>{l('ПРОПУЩЕНО', 'SKIPPED')}</small></span></div></div>
              <aside><small>{l('ТАБЛИЦА ОЧКОВ', 'SCOREBOARD')}</small>{aliasSortedTeams.slice(0, 8).map((team, index) => <article className={team.id === activeTeam?.id ? 'active' : ''} key={team.id}><span>0{index + 1}</span><b>{team.name}</b><strong>{team.score}/{aliasTargetScore}</strong></article>)}</aside>
            </section>
          )}

          {/* TURN RESULT */}
          {aliasState.phase === 'turnResult' && (
            <section className="alias-live-tv-result"><small>{aliasState.finishingRound !== null && aliasState.finishingRound !== undefined ? l('ФИНАЛЬНЫЙ РАУНД', 'FINAL ROUND') : l('ВРЕМЯ ВЫШЛО', 'TIME IS UP')}</small><h1>{aliasTurnPoints > 0 ? '+' : ''}{aliasTurnPoints}</h1><p>{aliasState.mode === 'classic' ? activeTeam?.name : explainerName} · {l('ОЧКОВ ЗА ХОД', 'POINTS THIS TURN')}{aliasFinalWordTeam ? ` · ${l('последнее слово', 'final word')} → ${aliasFinalWordTeam.name}` : ''}</p><div className="alias-live-tv-result-stats"><span><i>✓</i><b>{aliasState.wordsGuessed}</b><small>{l('УГАДАНО', 'GUESSED')}</small></span><span><i>×</i><b>{aliasState.wordsSkipped}</b><small>{l('ПРОПУЩЕНО', 'SKIPPED')}</small></span></div>{aliasState.turnHistory.length > 0 && <div className="alias-live-tv-ledger"><article><b><i>✓</i>{l('УГАДАНЫ', 'GUESSED')} · {aliasGuessedWords.length}</b><div>{aliasGuessedWords.map((item, index) => <span key={`${item.word.ru}-${index}`}>{locale === 'ru' ? item.word.ru : item.word.en}</span>)}</div></article><article className="skipped"><b><i>×</i>{l('ПРОПУЩЕНЫ', 'SKIPPED')} · {aliasSkippedWords.length}</b><div>{aliasSkippedWords.map((item, index) => <span key={`${item.word.ru}-${index}`}>{locale === 'ru' ? item.word.ru : item.word.en}</span>)}</div></article></div>}<aside>{aliasSortedTeams.slice(0, 8).map((team, index) => <article className={index === 0 ? 'active' : ''} key={team.id}><span>0{index + 1}</span><b>{team.name}</b><strong>{team.score}/{aliasTargetScore}</strong></article>)}</aside></section>
          )}

          {/* FINISHED */}
          {aliasState.phase === 'finished' && (
            <section className="alias-live-tv-finished"><div><AliasIcon name="trophy" className="h-28 w-28" /></div><small>{l('ИГРА ОКОНЧЕНА · ПОБЕДИТЕЛЬ', 'GAME OVER · WINNER')}</small><h1>{aliasWinner?.name ?? '—'}</h1><strong>{aliasWinner?.score ?? 0} <span>{l('ОЧКОВ', 'POINTS')}</span></strong><section>{aliasSortedTeams.slice(0, 4).map((team, index) => <article key={team.id}><span>{index + 1}</span><b>{team.name}</b><strong>{team.score}</strong></article>)}</section></section>
          )}
        </main>
        <footer><span>{aliasState.phase === 'turnResult' ? l('РЕЗУЛЬТАТЫ ХОДА ОТКРЫТЫ', 'TURN RESULTS REVEALED') : l('СЕКРЕТНЫЕ СЛОВА ВИДИТ ТОЛЬКО ОБЪЯСНЯЮЩИЙ', 'ONLY THE EXPLAINER SEES SECRET WORDS')}</span><b>{aliasState.phase === 'finished' ? l('СПАСИБО ЗА ИГРУ', 'THANKS FOR PLAYING') : aliasSortedTeams.slice(0, 2).map((team) => `${team.name} ${team.score}/${aliasTargetScore}`).join(' · ')}</b></footer>
        {qrOverlay}
      </GameSurface>
    );
  }

  // ===================== MAFIA TV RENDER =====================
  if (gameType === 'mafia') {
    const ms = mafiaState;
    const phaseLabel = ms.phase === 'night'
      ? (locale === 'ru' ? `Ночь · ${ms.round}` : `Night · ${ms.round}`)
      : ms.phase === 'day'
      ? (locale === 'ru' ? `День · ${ms.round}` : `Day · ${ms.round}`)
      : ms.phase === 'voting' && ms.votingRound === 2
      ? (locale === 'ru' ? 'Переголосование' : 'Revote')
      : ms.phase === 'voting' && ms.votingRound === 3
      ? (locale === 'ru' ? 'Вердикт города' : 'The city verdict')
      : ms.phase === 'voting'
      ? (locale === 'ru' ? 'Голосование' : 'Voting')
      : ms.phase === 'role-reveal'
      ? (locale === 'ru' ? 'Роли розданы' : 'Roles assigned')
      : ms.phase === 'results'
      ? (locale === 'ru' ? 'Итоги вечера' : 'The final record')
      : (locale === 'ru' ? 'Приём гостей' : 'Guest reception');

    const aliveIds = ms.alive.length > 0 ? ms.alive : players.map((player) => player.id);
    const isMafiaRole = (role: string | undefined): role is MafiaRole =>
      role != null && ['citizen', 'mafia', 'don', 'maniac', 'detective', 'doctor', 'lover'].includes(role);
    const roleLabel = (role: MafiaRole) => ({
      citizen: locale === 'ru' ? 'Мирный житель' : 'Citizen',
      mafia: locale === 'ru' ? 'Мафия' : 'Mafia',
      don: locale === 'ru' ? 'Дон' : 'Don',
      maniac: locale === 'ru' ? 'Маньяк' : 'Maniac',
      detective: locale === 'ru' ? 'Шериф' : 'Detective',
      doctor: locale === 'ru' ? 'Доктор' : 'Doctor',
      lover: locale === 'ru' ? 'Любовница' : 'Lover',
    })[role];
    const candidateIds = ms.votingCandidates.length > 0 ? ms.votingCandidates : aliveIds;
    const hasAliveDon = aliveIds.some((id) => ms.roles[id] === 'don');
    const nightStageTitle = ({
      mafia: hasAliveDon
        ? (locale === 'ru' ? 'Просыпаются Мафия и Дон' : 'The Mafia and Don wake up')
        : (locale === 'ru' ? 'Просыпается Мафия' : 'The Mafia wakes up'),
      lover: locale === 'ru' ? 'Просыпается Любовница' : 'The Lover wakes up',
      maniac: locale === 'ru' ? 'Просыпается Маньяк' : 'The Maniac wakes up',
      doctor: locale === 'ru' ? 'Просыпается Доктор' : 'The Doctor wakes up',
      detective: locale === 'ru' ? 'Просыпается Шериф' : 'The Detective wakes up',
      don: locale === 'ru' ? 'Дон ищет Шерифа' : 'The Don searches for the Detective',
    } as const)[ms.nightStage ?? 'mafia'];
    const nightStageCopy = ({
      mafia: locale === 'ru'
        ? (ms.round === 1 ? 'Семья знакомится и выбирает общую цель.' : hasAliveDon ? 'Семья выбирает общую цель. Последнее слово остаётся за Доном.' : 'Семья выбирает общую цель.')
        : (ms.round === 1 ? 'The family meets and chooses a shared target.' : hasAliveDon ? 'The family chooses a shared target. The Don has the final word.' : 'The family chooses a shared target.'),
      lover: locale === 'ru' ? 'Любовница выбирает, чью способность заблокировать.' : 'The Lover chooses whose ability to block.',
      maniac: locale === 'ru' ? 'Маньяк принимает своё независимое решение.' : 'The Maniac makes an independent decision.',
      doctor: locale === 'ru' ? 'Доктор выбирает, кого защитить этой ночью.' : 'The Doctor chooses whom to protect tonight.',
      detective: locale === 'ru' ? 'Шериф проводит тайную проверку.' : 'The Detective conducts a secret investigation.',
      don: locale === 'ru' ? 'Последнее действие ночи: Дон проверяет игрока на Шерифа.' : 'The final action of the night: the Don searches for the Detective.',
    } as const)[ms.nightStage ?? 'mafia'];
    const footer = ms.phase === 'night'
      ? (locale === 'ru' ? 'Смотрите только на свой телефон' : 'Keep your eyes on your own phone')
      : ms.phase === 'day'
      ? (locale === 'ru' ? 'Обсуждение ведётся вслух' : 'The discussion takes place aloud')
      : ms.phase === 'voting'
      ? (locale === 'ru' ? 'Голосуйте на личных экранах' : 'Cast your vote on your private screen')
      : ms.phase === 'results' && ms.winner
      ? (locale === 'ru' ? 'Партия завершена' : 'The game is over')
      : (locale === 'ru' ? 'Следуйте указаниям на телефонах' : 'Follow the directions on your phones');

    const guestGrid = (ids: string[], eliminated = false) => (
      <div className={club.tvPlayerGrid}>
        {ids.map((id) => {
          const name = getPlayerName(id);
          const voted = ms.votesReceived.includes(id);
          return (
            <div key={id} className={`${club.tvPlayer} ${eliminated ? club.tvPlayerEliminated : ''}`}>
              <MafiaPlayerToken name={name} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-lg font-semibold text-[#fbf3df]">{name}</p>
                <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.16em] text-[#fbf3df]/40">
                  {voted
                    ? (locale === 'ru' ? 'Голос принят' : 'Vote received')
                    : eliminated
                    ? (locale === 'ru' ? 'Покинул игру' : 'Left the game')
                    : (locale === 'ru' ? 'В клубе' : 'In the club')}
                </p>
              </div>
              {voted && <span className="h-2.5 w-2.5 rounded-full bg-[#d6b46a] shadow-[0_0_16px_#d6b46a]" aria-hidden="true" />}
            </div>
          );
        })}
      </div>
    );

    return (
      <MafiaClubTvLayout
        phase={phaseLabel}
        playerCount={locale === 'ru' ? `${aliveIds.length} в клубе` : `${aliveIds.length} in the club`}
        footer={footer}
      >
        {ms.phase === 'lobby' && (
          <div className="flex flex-1 flex-col justify-center">
            <span className="font-mono text-sm font-bold uppercase tracking-[0.24em] text-[#d6b46a]">
              {locale === 'ru' ? 'Частная сессия' : 'Private session'}
            </span>
            <h1 className={club.tvHeroTitle}>{locale === 'ru' ? 'Гости собираются' : 'The guests arrive'}</h1>
            <p className={club.tvHeroCopy}>
              {locale === 'ru' ? 'Вечер ещё не начался. Займите своё место и дождитесь приглашения ведущего.' : 'The evening has not begun. Take your seat and wait for the host’s invitation.'}
            </p>
            {ms.hostPlayerId && (
              <div className="mx-auto mt-8 flex min-h-20 items-center gap-4 border border-[#d6b46a]/45 bg-[#d6b46a]/[.08] px-6 py-4 shadow-[0_0_50px_rgba(214,180,106,.12)] transition-all duration-300 motion-reduce:transition-none">
                <MafiaPlayerToken name={getPlayerName(ms.hostPlayerId)} />
                <div className="text-left"><span className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[#d6b46a]">{locale === 'ru' ? 'Выбран ведущий' : 'Host selected'}</span><p className="mt-1 font-serif text-2xl text-[#fbf3df]">{getPlayerName(ms.hostPlayerId)}</p></div>
              </div>
            )}
            <div className="mt-12">{guestGrid(players.map((player) => player.id))}</div>
          </div>
        )}

        {ms.phase === 'role-reveal' && (
          <div className="flex flex-1 flex-col items-center justify-center text-center">
            <span className="mb-8 grid h-32 w-32 place-items-center rounded-full border border-[#d6b46a]/35 font-serif text-6xl text-[#f0d795] shadow-[0_0_70px_rgba(214,180,106,.1)]">M</span>
            <span className="font-mono text-sm font-bold uppercase tracking-[0.24em] text-[#d6b46a]">{locale === 'ru' ? 'Личные досье' : 'Private dossiers'}</span>
            <h1 className={club.tvHeroTitle}>{locale === 'ru' ? 'Роли розданы' : 'The roles are dealt'}</h1>
            <p className={club.tvHeroCopy}>{locale === 'ru' ? 'Каждый гость получил тайную карту. Не выдавайте себя.' : 'Every guest has received a secret card. Do not reveal yourself.'}</p>
          </div>
        )}

        {ms.phase === 'night' && (
          <div className="flex flex-1 flex-col items-center justify-center text-center">
            <div className="relative mb-8 h-32 w-32 rounded-full bg-[#f0d795] shadow-[0_0_80px_rgba(214,180,106,.17)]" aria-hidden="true">
              <span className="absolute -right-4 -top-3 h-32 w-32 rounded-full bg-[#170919]" />
            </div>
            <span className="font-mono text-sm font-bold uppercase tracking-[0.26em] text-[#d6b46a]">{locale === 'ru' ? `Ночь ${ms.round}` : `Night ${ms.round}`}</span>
            <h1 className={club.tvHeroTitle}>{nightStageTitle}</h1>
            <p className={club.tvHeroCopy}>{nightStageCopy}</p>
          </div>
        )}

        {ms.phase === 'day' && (
          <div className="flex flex-1 flex-col justify-center">
            <div className="text-center font-mono text-4xl tabular-nums text-[#d6b46a]" aria-label={l('До голосования', 'Until voting')}>
              {Math.floor((ms.dayTimer ?? 60) / 60)}:{String((ms.dayTimer ?? 60) % 60).padStart(2, '0')}
            </div>
            <span className="text-center font-mono text-sm font-bold uppercase tracking-[0.24em] text-[#d6b46a]">{locale === 'ru' ? `Утро · День ${ms.round}` : `Morning · Day ${ms.round}`}</span>
            <div className={`${club.tvEvent} mt-7`}>
              <h2>
                {ms.lastNightKilledIds.length > 0
                  ? ms.lastNightKilledIds.length > 1
                    ? (locale === 'ru' ? 'Ночь забрала нескольких гостей' : 'The night claimed several guests')
                    : (locale === 'ru' ? 'Ночь забрала гостя' : 'The night claimed a guest')
                  : ms.lastNightSaved
                  ? (locale === 'ru' ? 'Покушение не удалось' : 'The attempt failed')
                  : (locale === 'ru' ? 'Этой ночью — тишина' : 'A silent night')}
              </h2>
              <p>
                {ms.lastNightKilledIds.length > 0
                  ? ms.lastNightKilledIds.map(getPlayerName).join(', ')
                  : ms.lastNightSaved
                  ? (locale === 'ru' ? 'Доктор успел вмешаться' : 'The doctor intervened in time')
                  : (locale === 'ru' ? 'Все гости встречают новый день' : 'Every guest lives to see another day')}
              </p>
            </div>
            <div className="mt-10">{guestGrid(aliveIds)}</div>
          </div>
        )}

        {ms.phase === 'voting' && (
          <div className="flex flex-1 flex-col justify-center">
            <div className="text-center">
              <span className="font-mono text-sm font-bold uppercase tracking-[0.24em] text-[#d6b46a]">
                {locale === 'ru' ? `Раунд голосования ${ms.votingRound}` : `Voting round ${ms.votingRound}`}
              </span>
              <h1 className={club.tvHeroTitle}>
                {ms.votingRound === 3
                  ? (locale === 'ru' ? 'Казнить или помиловать?' : 'Execute or pardon?')
                  : ms.votingRound === 2
                  ? (locale === 'ru' ? 'Город должен решить' : 'The city must decide')
                  : (locale === 'ru' ? 'Время назвать виновного' : 'Name the guilty one')}
              </h1>
              <p className={club.tvHeroCopy + ' mx-auto'}>
                {locale === 'ru' ? `Принято голосов: ${ms.votesReceived.length} из ${aliveIds.length}` : `Votes received: ${ms.votesReceived.length} of ${aliveIds.length}`}
              </p>
            </div>
            <div className="mt-10">{guestGrid(candidateIds)}</div>
          </div>
        )}

        {ms.phase === 'results' && (
          <div className="flex flex-1 flex-col items-center justify-center text-center">
            <span className="font-mono text-sm font-bold uppercase tracking-[0.24em] text-[#d6b46a]">{ms.winner ? (locale === 'ru' ? 'Последняя запись' : 'The final record') : (locale === 'ru' ? 'Вердикт' : 'The verdict')}</span>
            <h1 className={club.tvHeroTitle}>
              {ms.winner === 'mafia'
                ? (locale === 'ru' ? 'Клуб принадлежит мафии' : 'The club belongs to the mafia')
                : ms.winner === 'maniac'
                ? (locale === 'ru' ? 'Маньяк остался один' : 'The maniac stands alone')
                : ms.winner === 'citizens'
                ? (locale === 'ru' ? 'Город выстоял' : 'The city endured')
                : ms.lastVerdict === 'eliminated'
                ? (locale === 'ru' ? 'Гость покидает клуб' : 'A guest leaves the club')
                : ms.lastVerdict === 'alibi'
                ? (locale === 'ru' ? 'Алиби принято' : 'The alibi stands')
                : (locale === 'ru' ? 'Кандидаты помилованы' : 'The candidates are pardoned')}
            </h1>
            {!ms.winner && ms.lastVerdict === 'eliminated' && ms.lastEliminatedIds.length > 0 && (
              <div className="flex flex-wrap justify-center gap-8">
                {ms.lastEliminatedIds.map((id) => {
                  return (
                    <div key={id} className="flex items-center gap-4 border border-[#d6b46a]/20 bg-black/15 px-6 py-4 text-left">
                      <MafiaPlayerToken name={getPlayerName(id)} />
                      <p className="text-2xl font-semibold">{getPlayerName(id)}</p>
                    </div>
                  );
                })}
              </div>
            )}
            {!ms.winner && ms.lastVerdict !== 'eliminated' && ms.lastVerdictPlayerIds.length > 0 && (
              <p className={`${club.tvHeroCopy} mt-2 text-center`}>
                {ms.lastVerdict === 'alibi'
                  ? (locale === 'ru'
                    ? `${ms.lastVerdictPlayerIds.map(getPlayerName).join(', ')} остаётся в клубе благодаря алиби.`
                    : `${ms.lastVerdictPlayerIds.map(getPlayerName).join(', ')} remains in the club under an alibi.`)
                  : (locale === 'ru'
                    ? `${ms.lastVerdictPlayerIds.map(getPlayerName).join(', ')} остаются в клубе.`
                    : `${ms.lastVerdictPlayerIds.map(getPlayerName).join(', ')} remain in the club.`)}
              </p>
            )}
            {ms.winner && (
              <div className="mt-4 flex max-w-5xl flex-wrap justify-center gap-4">
                {Object.entries(ms.roles).map(([id, role]) => isMafiaRole(role) && (
                  <div key={id} className="flex items-center gap-3 border border-[#d6b46a]/15 bg-black/15 px-4 py-3 text-left">
                    <MafiaRoleThumb role={role} alt={roleLabel(role)} />
                    <div><p className="max-w-40 truncate text-base font-semibold">{getPlayerName(id)}</p><p className="mt-1 font-mono text-[10px] uppercase tracking-[0.12em] text-[#d6b46a]">{roleLabel(role)}</p></div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        {qrOverlay}
      </MafiaClubTvLayout>
    );
  }

  // ===================== WHO AM I TV RENDER =====================
  if (gameType === 'who-am-i') {
    const ws = whoAmIState;
    const currentPlayerId = getWhoAmIActivePlayerId(ws);
    const currentPlayerName = currentPlayerId ? getPlayerName(currentPlayerId) : l('ожидание', 'waiting');
    const disputingPlayerName = ws.guessPendingPlayerId ? getPlayerName(ws.guessPendingPlayerId) : l('Игрок', 'Player');
    const otherPlayerIds = ws.turnOrder.filter((id) => id !== currentPlayerId);
    const resultRows = (ws.turnOrder.length > 0 ? ws.turnOrder : players.map((p) => p.id))
      .map((id) => ({
        id,
        name: getPlayerName(id),
        character: ws.characters[id],
        guessed: ws.guessedPlayers.includes(id),
      }));

    if (['lobby', 'playing', 'finished'].includes(ws.phase)) {
      if (ws.phase === 'lobby') {
        return (
          <WhoAmIClayTvLayout>
            <main className={whoClay.tvMain}>
              <div className={`${whoClay.tvLobby} ${whoClay.tvLobbyClosed}`}>
                <section className={whoClay.tvLobbyHero}>
                  <div className={whoClay.tvLogo}><WhoAmIIcon name="profile" /></div>
                  <small>PARTY GAMES HUB</small>
                  <h1>{l('Кто я?', 'Who Am I?')}</h1>
                  <p>{l('Угадай, кем тебя назначили. Задавай вопросы, на которые можно ответить «Да» или «Нет».', 'Guess who you are. Ask questions that can be answered Yes or No.')}</p>
                  <div className={whoClay.tvLobbyPlayers}>
                    {players.map((player) => <div key={player.id} className={whoClay.tvPlayerChip}><ClayBlob name={player.nickname} size="sm" /><b>{player.nickname}</b>{player.isHost && <WhoAmIIcon name="star" />}</div>)}
                  </div>
                </section>
              </div>
            </main>
            {qrOverlay}
          </WhoAmIClayTvLayout>
        );
      }

      if (ws.phase === 'finished') {
        return (
          <WhoAmIClayTvLayout>
            <header className={whoClay.tvHeader}>
              <span className={whoClay.tvBrand}><i><WhoAmIIcon name="profile" /></i><b>{l('КТО Я?', 'WHO AM I?')}</b></span>
              <em className={whoClay.tvPhase}>{l('ФИНАЛ', 'RESULTS')}</em>
              <strong className={whoClay.tvMeta}>{ws.turnOrder.length} {l('ИГРОКОВ', 'PLAYERS')}</strong>
            </header>
            <main className={whoClay.tvMain}>
              <div className={whoClay.tvResults}>
                <div className={whoClay.tvResultsTitle}><span className={whoClay.iconBlob}><WhoAmIIcon name="celebrate" /></span><div><small>{l('ИГРА ОКОНЧЕНА', 'GAME OVER')}</small><h1>{l('Спасибо за игру!', 'Thanks for playing!')}</h1></div></div>
                <section className={whoClay.tvResultsList}>
                  {resultRows.map((row) => {
                    const character = row.guessed ? row.character?.[locale] ?? '???' : l('не угадал', 'not guessed');
                    return <article key={row.id} className={`${whoClay.tvResultRow} ${whoClay.tvParticipantRow}`}><ClayBlob name={row.name} /><div><b>{row.name}</b><small>{character}</small></div></article>;
                  })}
                </section>
              </div>
            </main>
            <footer className={whoClay.tvFooter}><span>{l('Ведущий может начать новую игру', 'The host can start a new game')}</span><b>PARTY GAMES HUB · WHO AM I?</b></footer>
            {qrOverlay}
          </WhoAmIClayTvLayout>
        );
      }

      const disputeActive = ws.guessNeedsConfirm || ws.guessAwaitingJudge;
      return (
        <WhoAmIClayTvLayout>
          <header className={whoClay.tvHeader}>
            <span className={whoClay.tvBrand}><i><WhoAmIIcon name="profile" /></i><b>{l('КТО Я?', 'WHO AM I?')}</b></span>
            <em className={whoClay.tvPhase}>{l(`${currentPlayerName} ХОДИТ · «ДА» ${ws.consecutiveYesAnswers}/3`, `${currentPlayerName} · YES ${ws.consecutiveYesAnswers}/3`)}</em>
            <strong className={whoClay.tvMeta}>{ws.guessedPlayers.length} / {ws.turnOrder.length} {l('УГАДАЛИ', 'GUESSED')}</strong>
          </header>
          <main className={whoClay.tvMain}>
            <div className={whoClay.tvGame}>
              <section className={`${whoClay.tvStage} ${disputeActive || lastWhoAmIGuessResult ? whoClay.tvDimmed : ''}`}>
                <div className={whoClay.tvActive}><ClayBlob name={currentPlayerName} active size="lg" /><small>{l('СЕЙЧАС ХОДИТ', 'CURRENT TURN')}</small><h1>{currentPlayerName}</h1><p>{l('Задаёт вопрос о себе', 'Asking about themselves')}</p></div>
                <div className={whoClay.tvMystery}><i /><i /><i /><span><WhoAmIIcon name="profile" /><strong>?</strong></span><small>{l('ПЕРСОНАЖ СКРЫТ', 'CHARACTER HIDDEN')}</small></div>
                <div className={whoClay.tvStreak}><span>{l('«ДА» ПОДРЯД', 'YES STREAK')}</span>{[0,1,2].map((dot) => <i key={dot} data-filled={dot < ws.consecutiveYesAnswers} />)}<b>{ws.consecutiveYesAnswers}/3</b></div>
              </section>
              <aside className={`${whoClay.tvRanking} ${disputeActive || lastWhoAmIGuessResult ? whoClay.tvDimmed : ''}`}>
                <small>{l('УЧАСТНИКИ', 'PLAYERS')}</small>
                {resultRows.map((row) => <article key={row.id} className={`${whoClay.tvRankRow} ${whoClay.tvParticipantStatus} ${row.id === currentPlayerId ? whoClay.tvRankCurrent : ''}`}><ClayBlob name={row.name} size="sm" /><b>{row.name}</b><span aria-label={row.guessed ? l('Угадал', 'Guessed') : row.id === currentPlayerId ? l('Сейчас ходит', 'Current turn') : l('Ждёт хода', 'Waiting for turn')}>{row.guessed ? <WhoAmIIcon name="check" /> : row.id === currentPlayerId ? <WhoAmIIcon name="profile" /> : null}</span></article>)}
              </aside>

              {disputeActive && !lastWhoAmIGuessResult && (
                <div className={`${whoClay.tvOverlay} ${whoClay.tvOverlayWarm}`}><span className={whoClay.iconBlob}><WhoAmIIcon name="profile" /></span><small>{l('ОСПАРИВАНИЕ ОТВЕТА', 'ANSWER DISPUTE')}</small><h1>{ws.guessAwaitingJudge ? l(`${disputingPlayerName} передал(а) ответ судье`, `${disputingPlayerName} sent the answer to a judge`) : l(`${disputingPlayerName} подтверждает отправку ответа`, `${disputingPlayerName} is confirming the review request`)}</h1><p>{ws.guessAwaitingJudge ? l('Вердикт принимается на телефоне случайного игрока. Ответ и персонаж не показываются на TV.', 'A random player decides on their phone. The guess and character stay hidden from TV.') : l('Нет точного совпадения. Игрок может передать ответ на проверку со своего телефона.', 'No exact match. The player can submit the answer for review on their phone.')}</p></div>
              )}

              {lastWhoAmIGuessResult && (
                <div className={`${whoClay.tvOverlay} ${lastWhoAmIGuessResult.correct ? '' : whoClay.tvOverlayDanger}`}><span className={whoClay.iconBlob}><WhoAmIIcon name={lastWhoAmIGuessResult.correct ? 'celebrate' : 'cross'} /></span><small>{lastWhoAmIGuessResult.correct ? l('ЛИЧНОСТЬ РАСКРЫТА', 'IDENTITY REVEALED') : l('НЕВЕРНАЯ ПОПЫТКА', 'WRONG GUESS')}</small><h1>{lastWhoAmIGuessResult.correct ? l(`${getPlayerName(lastWhoAmIGuessResult.playerId)} — ${whoAmIState.characters[lastWhoAmIGuessResult.playerId]?.[locale] ?? lastWhoAmIGuessResult.guess}!`, `${getPlayerName(lastWhoAmIGuessResult.playerId)} is ${whoAmIState.characters[lastWhoAmIGuessResult.playerId]?.[locale] ?? lastWhoAmIGuessResult.guess}!`) : l(`${getPlayerName(lastWhoAmIGuessResult.playerId)} пока не угадал(а)`, `${getPlayerName(lastWhoAmIGuessResult.playerId)} has not guessed yet`)}</h1><p>{lastWhoAmIGuessResult.correct ? l('Продолжаем угадывать по очереди', 'Keep guessing in turn') : l('Персонаж остаётся скрытым', 'The character remains hidden')}</p></div>
              )}
            </div>
          </main>
          <footer className={whoClay.tvFooter}><span>{ws.guessAwaitingJudge ? l('ОЖИДАЕМ РЕШЕНИЕ СУДЬИ', 'WAITING FOR THE JUDGE') : ws.guessNeedsConfirm ? l('ОЖИДАЕМ ПОДТВЕРЖДЕНИЕ ИГРОКА', 'WAITING FOR PLAYER CONFIRMATION') : l(`НА ТЕЛЕФОНЕ ${currentPlayerName}`, `ON ${currentPlayerName}'S PHONE`)}</span><b>{disputeActive ? l('ОТВЕТ НЕ ПОКАЗЫВАЕТСЯ НА TV', 'THE ANSWER STAYS OFF TV') : l('НЕТ · Я ЗНАЮ! · ДА', 'NO · I KNOW! · YES')}</b></footer>
          {qrOverlay}
        </WhoAmIClayTvLayout>
      );
    }

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
                    <WhoAmIIcon name="celebrate" className="mx-auto mb-3 h-14 w-14 text-sky-200" />
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
                            {l('Угадано', 'Guessed')}
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
          <div className="flex flex-1 flex-col items-center gap-6 overflow-auto px-12 py-8">
            <WhoAmIIcon name="celebrate" className="h-20 w-20 text-sky-200" />
            <h1 className="text-6xl font-black">{l('Спасибо за игру!', 'Thanks for playing!')}</h1>
            {resultRows.map((row) => (
              <div key={row.id} className="glass-card flex w-full max-w-4xl items-center gap-4 rounded-2xl px-5 py-3">
                <PlayerAvatar nickname={row.name} size="sm" />
                <div><b>{row.name}</b><p>{row.guessed ? row.character?.[locale] ?? '???' : l('не угадал', 'not guessed')}</p></div>
              </div>
            ))}
            <p>{l('Ведущий может начать новую игру', 'The host can start a new game')}</p>
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
