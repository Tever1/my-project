'use client';

import { useEffect, useState, useCallback, useRef, type ReactNode } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSocket } from '@/lib/use-socket';
import { useRoomState } from '@/lib/use-room-state';
import { useGameAction, useGameBroadcast } from '@/lib/use-game-action';
import { useNavigateOnGameEnd } from '@/lib/use-navigate-on-game-end';
import { useGameIdentity } from '@/lib/use-game-identity';
import { useTranslation } from '@/lib/i18n';
import { GameLayout } from '@/components/games/GameLayout';
import { BreathingPlaceholder } from '@/components/ingame';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { HundredToOneIcon } from '@/components/games/HundredToOneIcon';
import { PlayerAvatar } from '@/components/ui/PlayerAvatar';
import { TOPICS, getDisplayPts } from '@/lib/hundred-to-one/questions';
import { sndReveal, sndClose, sndAssign, sndBuzz, sndTick, sndWin, sndDup, warmup } from '@/lib/hundred-to-one/sounds';

// ── Types ────────────────────────────────────────────────────────────────────

interface GamePlayer { id: string; nickname: string; isHost: boolean; }

// Answer state per cell: rev=revealed to host, pub=published to players, to=assigned team
interface AnsState { rev: boolean; pub: boolean; to: number; }

type Phase = 'topicSelect' | 'roleSelect' | 'teamNames' | 'captainSelect' | 'title' | 'buzzer' | 'buzzerResult' | 'teams' | 'rules' | 'playing' | 'r4rules' | 'results' | 'bigGame' | 'final';
type PlayerRole = 'team1' | 'team2' | 'host' | 'tv';

interface GState {
  phase: Phase;
  topicId: string;
  curQ: number; // current round 0-3
  t1n: string; t2n: string;
  t1s: number; t2s: number;
  qState: AnsState[][]; // [round][answerIdx]
  // Strikes per round per team: strikes[round][teamIdx 0|1]
  strikes: number[][];
  roundBusted: boolean[][];
  roundActiveTeam: number[]; // which team plays (1 or 2, 0=not chosen)
  roundFund: number[]; // neutral bank per round 0-2
  roundWonBy: number[]; // 0=none, 1, 2
  roundPhase: string[]; // 'start'|'switched'|'won'|'showonly'
  // Round 4 timer
  r4Time: number;
  r4Running: boolean;
  // Big game
  bgPhase: number; // 0=intro,1=p1,2=check1,3=p2,4=check2,5=result
  bgP1Ans: string[];
  bgP2Ans: string[];
  bgP1Matched: (string | null)[];
  bgP2Matched: (string | null)[];
  bgFund: number;
  bgCurQ: number;
  bgTimeLeft: number;
  bgTimerTotal: number;
  bgTimerPaused: boolean;
  bgP1Id: string; // selected player 1 (playerId)
  bgP2Id: string; // selected player 2 (playerId)
  winTeam: number;
  players: GamePlayer[];
  roles: Record<string, PlayerRole>; // playerId -> role
  captains: { team1?: string; team2?: string }; // playerId of captain per team
  captainConfirmed: { team1: boolean; team2: boolean };
  buzzerWinner: number; // 0=none, 1=team1, 2=team2
  buzzerActive: boolean; // can captains press?
  buzzerCountdown: number; // 3,2,1,0 — 0 means go!
  teamNameConfirmed: { team1: boolean; team2: boolean };
}

const mkInitial = (): GState => ({
  phase: 'topicSelect', topicId: 'general', curQ: 0,
  t1n: 'Команда 1', t2n: 'Команда 2',
  t1s: 0, t2s: 0,
  qState: TOPICS[0].rounds.map(r => r.answers.map(() => ({ rev: false, pub: false, to: 0 }))),
  strikes: [[0, 0], [0, 0], [0, 0]],
  roundBusted: [[false, false], [false, false], [false, false]],
  roundActiveTeam: [0, 0, 0],
  roundFund: [0, 0, 0],
  roundWonBy: [0, 0, 0],
  roundPhase: ['start', 'start', 'start'],
  r4Time: 60, r4Running: false,
  bgPhase: 0, bgP1Ans: [], bgP2Ans: [],
  bgP1Matched: [], bgP2Matched: [],
  bgFund: 0, bgCurQ: 0,
  bgTimeLeft: 0, bgTimerTotal: 0, bgTimerPaused: false,
  bgP1Id: '', bgP2Id: '',
  winTeam: 0,
  players: [],
  roles: {},
  captains: {},
  captainConfirmed: { team1: false, team2: false },
  buzzerWinner: 0,
  buzzerActive: false,
  buzzerCountdown: -1,
  teamNameConfirmed: { team1: false, team2: false },
});

const isBgAnsweringPhase = (phase: number | undefined) => phase === 1 || phase === 3;

const mergeH2OSyncState = (prev: GState, payload: Partial<GState>): GState => {
  const next = { ...prev, ...payload };
  const sameActiveBigGame =
    prev.phase === 'bigGame' &&
    payload.phase !== 'final' &&
    isBgAnsweringPhase(prev.bgPhase) &&
    payload.bgPhase === prev.bgPhase;

  if (!sameActiveBigGame) return next;

  const incomingCurQ = typeof payload.bgCurQ === 'number' ? payload.bgCurQ : prev.bgCurQ;
  if (incomingCurQ < prev.bgCurQ) {
    next.bgCurQ = prev.bgCurQ;
    next.bgTimeLeft = prev.bgTimeLeft;
    next.bgTimerPaused = prev.bgTimerPaused;
    next.bgP1Ans = prev.bgP1Ans;
    next.bgP2Ans = prev.bgP2Ans;
    return next;
  }

  if (incomingCurQ === prev.bgCurQ) {
    if (typeof payload.bgTimeLeft === 'number' && payload.bgTimeLeft > prev.bgTimeLeft) {
      next.bgTimeLeft = prev.bgTimeLeft;
    }
    if (payload.bgTimerPaused === true && prev.bgTimerPaused === false) {
      next.bgTimerPaused = false;
    }
    if (payload.bgP1Ans && payload.bgP1Ans.length < prev.bgP1Ans.length) {
      next.bgP1Ans = prev.bgP1Ans;
    }
    if (payload.bgP2Ans && payload.bgP2Ans.length < prev.bgP2Ans.length) {
      next.bgP2Ans = prev.bgP2Ans;
    }
  }

  return next;
};

const H2O_SURFACE =
  "bg-[radial-gradient(900px_580px_at_18%_8%,rgba(245,158,11,.18),transparent_58%),radial-gradient(800px_520px_at_86%_10%,rgba(251,191,36,.11),transparent_56%),linear-gradient(145deg,#170f08_0%,#2b1807_36%,#120c08_70%,#080606_100%)] before:absolute before:inset-0 before:-z-10 before:bg-[linear-gradient(78deg,transparent_0_24%,rgba(245,158,11,.13)_25%,transparent_35%),linear-gradient(104deg,transparent_0_61%,rgba(245,158,11,.11)_62%,transparent_72%)] after:absolute after:left-1/2 after:top-[12%] after:-z-10 after:h-[360px] after:w-[360px] after:-translate-x-1/2 after:rounded-full after:bg-[radial-gradient(circle,rgba(245,158,11,.20),transparent_68%)] after:blur-[34px]";
const H2O_GLASS =
  'border border-white/10 bg-white/[.06] shadow-[0_18px_56px_-28px_rgba(0,0,0,.9)] backdrop-blur-[20px]';
const H2O_GLASS_STRONG =
  'border border-white/[.16] bg-white/[.10] shadow-[0_22px_64px_-26px_rgba(0,0,0,.95)] backdrop-blur-[24px]';
const H2O_ACCENT =
  'bg-[radial-gradient(110%_70%_at_50%_-5%,rgba(255,255,255,.35),transparent_55%),linear-gradient(165deg,#fbbf24_0%,#f59e0b_55%,#b45309_100%)] shadow-[0_24px_60px_-16px_rgba(245,158,11,.75),inset_0_1px_0_rgba(255,255,255,.45)]';
const H2O_PRIMARY_BUTTON =
  `${H2O_ACCENT} inline-flex h-[54px] items-center justify-center gap-2 rounded-[var(--radius-md)] px-5 font-extrabold text-[#341f02] shadow-[0_16px_38px_-18px_rgba(245,158,11,.75)] transition active:scale-[.98] disabled:opacity-45 disabled:active:scale-100`;
const H2O_SECONDARY_BUTTON =
  `${H2O_GLASS} inline-flex h-[50px] items-center justify-center gap-2 rounded-[var(--radius-md)] px-4 font-bold text-white/75 transition hover:bg-white/[.10] active:scale-[.98] disabled:opacity-45`;
const H2O_TEAM_1 = 'border-yellow-200/25 bg-yellow-300/[.10]';
const H2O_TEAM_2 = 'border-red-300/25 bg-red-400/[.10]';

function H2OMark({ className = 'h-7 w-7', iconClassName = 'h-[22px] w-[22px]' }: { className?: string; iconClassName?: string }) {
  return (
    <span className={`${H2O_ACCENT} inline-flex items-center justify-center rounded-[10px] text-[#341f02] ${className}`}>
      <HundredToOneIcon name="bell" className={iconClassName} />
    </span>
  );
}

function TeamDot({ team, className = '' }: { team: 1 | 2; className?: string }) {
  return (
    <span
      className={`inline-block rounded-full ${team === 1 ? 'bg-[#ffe155] shadow-[0_0_14px_rgba(255,225,85,.55)]' : 'bg-[#ff7a70] shadow-[0_0_14px_rgba(255,122,112,.5)]'} ${className || 'h-3 w-3'}`}
    />
  );
}

function StrikeIcon({ on, asButton = false, onClick }: { on: boolean; asButton?: boolean; onClick?: () => void }) {
  const className = `inline-flex h-[26px] w-[26px] items-center justify-center rounded-full border-[1.2px] transition ${
    on
      ? 'border-red-300/60 bg-red-500/18 text-red-300 shadow-[0_0_14px_rgba(255,69,58,.28)]'
      : 'border-white/15 bg-white/[.04] text-white/18'
  } ${asButton ? 'cursor-pointer hover:border-red-300/60 hover:bg-red-500/15' : ''}`;

  if (asButton) {
    return (
      <button type="button" onClick={onClick} className={className}>
        <HundredToOneIcon name="cross" className="h-[13px] w-[13px]" strokeWidth={2.6} />
      </button>
    );
  }

  return (
    <span className={className}>
      <HundredToOneIcon name="cross" className="h-[13px] w-[13px]" strokeWidth={2.6} />
    </span>
  );
}

function TeamScoreCard({
  team,
  name,
  score,
  active,
  compact = false,
}: {
  team: 1 | 2;
  name: string;
  score: number;
  active?: boolean;
  compact?: boolean;
}) {
  return (
    <div
      className={`relative flex min-w-0 items-center gap-[9px] rounded-[var(--radius-lg)] border ${team === 1 ? H2O_TEAM_1 : H2O_TEAM_2} ${
        compact ? 'px-[13px] py-[9px]' : 'px-[13px] py-[10px]'
      } ${active ? 'before:pointer-events-none before:absolute before:inset-[-2px] before:rounded-[inherit] before:border-[1.5px] before:border-yellow-300/60 before:shadow-[0_0_18px_-3px_rgba(255,214,10,.4)]' : ''}`}
    >
      <TeamDot team={team} />
      <span className={`min-w-0 truncate font-extrabold tracking-[-.2px] ${compact ? 'text-[14px]' : 'text-[14.5px]'}`}>
        {name}
      </span>
      <span className={`ml-auto font-extrabold tracking-[-.5px] ${team === 1 ? 'text-[#ffe155]' : 'text-[#ff7a70]'} ${compact ? 'text-[20px]' : 'text-[22px]'}`}>
        {score}
      </span>
    </div>
  );
}

function H2OQuestionCard({ children, withIcon = true, compact = false }: { children: ReactNode; withIcon?: boolean; compact?: boolean }) {
  return (
    <div className={`flex items-center gap-[11px] rounded-[var(--radius-lg)] ${withIcon ? '' : H2O_GLASS} ${compact ? 'my-[8px] px-[13px] py-[10px]' : 'my-[10px] px-[14px] py-[12px]'}`}>
      {withIcon && (
        <span className="flex h-[34px] w-[34px] flex-shrink-0 items-center justify-center rounded-[10px] border border-amber-300/35 bg-amber-500/[.13] text-amber-200">
          <HundredToOneIcon name="question" className="h-[19px] w-[19px]" />
        </span>
      )}
      <span className={`text-balance font-bold leading-[1.25] tracking-[-.2px] ${compact ? 'text-[15px]' : 'text-[16px]'}`}>{children}</span>
    </div>
  );
}

function H2OAnswerRow({
  index,
  text,
  points,
  revealed,
  hostHidden,
  onClick,
}: {
  index: number;
  text: string;
  points: number;
  revealed: boolean;
  hostHidden?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      disabled={!onClick}
      onClick={onClick}
      className={`flex h-[46px] w-full items-center gap-[10px] rounded-[var(--radius-md)] border pr-[15px] text-left transition active:scale-[.99] ${
        revealed
          ? 'border-amber-300/45 bg-amber-300/[.18] text-white shadow-[0_0_18px_-10px_rgba(245,158,11,.75)]'
          : hostHidden
            ? 'border-dashed border-white/16 bg-black/[.18] text-white/58'
            : 'border-white/10 bg-white/[.045] text-white/25'
      } ${onClick ? 'cursor-pointer hover:border-amber-300/45 hover:bg-amber-500/[.13]' : 'cursor-default'}`}
    >
      <span className={`flex h-full w-[38px] flex-shrink-0 items-center justify-center rounded-l-[var(--radius-md)] font-mono text-[14px] font-bold ${
        revealed ? 'bg-amber-500 text-[#341f02]' : 'bg-black/[.16] text-white/30'
      }`}>
        {index + 1}
      </span>
      <span className={`min-w-0 flex-1 truncate font-bold ${revealed || hostHidden ? 'text-[16.5px]' : 'text-[13px] tracking-[4px]'}`}>
        {revealed || hostHidden ? text : '? ? ? ? ?'}
      </span>
      <span className={`font-bold ${revealed || hostHidden ? 'text-[16.5px]' : 'text-white/18'}`}>
        {revealed || hostHidden ? points : '··'}
      </span>
    </button>
  );
}

// ── Component ────────────────────────────────────────────────────────────────

export default function HundredToOnePage() {
  const { roomId } = useParams<{ roomId: string }>();
  const { user, effectivePlayerId } = useGameIdentity(roomId);
  const router = useRouter();
  useNavigateOnGameEnd(roomId, user ? 'lobby' : 'phone');
  const { emit, on } = useSocket();
  const { locale } = useTranslation();
  const l = useCallback((ru: string, en: string) => (locale === 'ru' ? ru : en), [locale]);

  const [s, setS] = useState<GState>(mkInitial);
  const sRef = useRef<GState>(s);
  useEffect(() => { sRef.current = s; }, [s]);
  const [teamChooser, setTeamChooser] = useState(false);
  const [assignModal, setAssignModal] = useState<{ idx: number; pts: number } | null>(null);
  const [bgInput, setBgInput] = useState('');
  const [bgDupMsg, setBgDupMsg] = useState(false);
  const r4Ref = useRef<ReturnType<typeof setInterval> | null>(null);
  const bgTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isHost = s.players.find(p => p.id === effectivePlayerId)?.isHost ?? false;
  const myRole: PlayerRole | null = effectivePlayerId ? s.roles[effectivePlayerId] || null : null;
  const isGameHost = myRole === 'host'; // game host (ведущий), not room host
  const topic = TOPICS.find(t => t.id === s.topicId) || TOPICS[0];
  const ROUNDS = topic.rounds;
  const BIG_Q = topic.bigQ;
  const sendAction = useGameAction(roomId);
  const broadcast = useGameBroadcast(roomId, 'h2o:sync') as (payload: Partial<GState>) => void;
  const q = ROUNDS[s.curQ];
  const roundNames = [
    l('ПРОСТАЯ ИГРА', 'SIMPLE GAME'),
    l('ДВОЙНАЯ ИГРА', 'DOUBLE GAME'),
    l('ТРОЙНАЯ ИГРА', 'TRIPLE GAME'),
    l('ИГРА НАОБОРОТ', 'REVERSE GAME'),
  ];
  const topicName = useCallback((topicId: string, fallback: string) => {
    const names: Record<string, string> = {
      general: l('Общие темы', 'General'),
      cinema: l('Кино', 'Cinema'),
      space: l('Космос', 'Space'),
    };
    return names[topicId] ?? fallback;
  }, [l]);

  // ── Role selection ──
  const selectRole = (role: PlayerRole) => {
    if (!effectivePlayerId) return;
    if (role === 'host' && Object.entries(s.roles).some(([id, r]) => r === 'host' && id !== effectivePlayerId)) return;
    if (myRole === role) {
      const newRoles = { ...s.roles };
      delete newRoles[effectivePlayerId];
      update({ roles: newRoles });
      return;
    }
    const newRoles = { ...s.roles, [effectivePlayerId]: role };
    update({ roles: newRoles });
  };

  const [teamNameInput1, setTeamNameInput1] = useState('');
  const [teamNameInput2, setTeamNameInput2] = useState('');
  const [selectedCaptain, setSelectedCaptain] = useState<string | null>(null); // local selection before confirm

  const myTeam: 'team1' | 'team2' | null = myRole === 'team1' ? 'team1' : myRole === 'team2' ? 'team2' : null;

  const confirmCaptain = () => {
    if (!myTeam || !selectedCaptain) return;
    const newCaptains = { ...s.captains, [myTeam]: selectedCaptain };
    const newConfirmed = { ...s.captainConfirmed, [myTeam]: true };
    const bothConfirmed = newConfirmed.team1 && newConfirmed.team2;
    update({ captains: newCaptains, captainConfirmed: newConfirmed, ...(bothConfirmed ? { phase: 'teamNames', teamNameConfirmed: { team1: false, team2: false } } : {}) });
    setSelectedCaptain(null);
  };

  // ── Socket ──
  useRoomState(roomId, (data) => {
    const room = data as { players: GamePlayer[] };
    setS(prev => {
      const next = { ...prev, players: room.players };
      sRef.current = next;
      return next;
    });
  });

  useEffect(() => {
    const unsub = on('game:action', (data: unknown) => {
      const { action, payload } = data as { action: string; payload: Partial<GState> };
      if (action === 'h2o:sync') {
        setS(prev => {
          const next = mergeH2OSyncState(prev, payload);
          sRef.current = next;
          return next;
        });
      }
      else if (action === 'h2o:request-state') {
        // Only game host responds with full state (for late-joining TV clients)
        const cur = sRef.current;
        const myId = effectivePlayerId;
        if (myId && cur.roles[myId] === 'host') {
          window.setTimeout(() => broadcast(sRef.current), 75);
        }
      }
    });
    return unsub;
  }, [on, effectivePlayerId, broadcast]);

  useEffect(() => {
    sendAction('h2o:request-state');

    const handleVisibilityChange = () => {
      if (!document.hidden) sendAction('h2o:request-state');
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [sendAction]);

  const update = useCallback((patch: Partial<GState>) => {
    sRef.current = { ...sRef.current, ...patch };
    setS(prev => ({ ...prev, ...patch }));
    broadcast(patch);
  }, [broadcast]);

  // ── Host actions ──
  const goToCaptainSelect = () => {
    update({ phase: 'captainSelect', captains: {}, captainConfirmed: { team1: false, team2: false } });
  };

  const confirmMyTeamName = () => {
    if (!myTeam) return;
    const input = myTeam === 'team1' ? teamNameInput1.trim() : teamNameInput2.trim();
    const name = input || (myTeam === 'team1' ? 'Команда 1' : 'Команда 2');
    const newConfirmed = { ...s.teamNameConfirmed, [myTeam]: true };
    const bothConfirmed = newConfirmed.team1 && newConfirmed.team2;
    const patch: Partial<GState> = {
      teamNameConfirmed: newConfirmed,
      ...(myTeam === 'team1' ? { t1n: name } : { t2n: name }),
      ...(bothConfirmed ? { phase: 'title' } : {}),
    };
    update(patch);
  };

  const startGame = () => {
    warmup();
    const cur = sRef.current;
    const selTopic = TOPICS.find(t => t.id === cur.topicId) || TOPICS[0];
    const init = mkInitial();
    const patch: Partial<GState> = {
      ...init, phase: 'buzzer', topicId: cur.topicId, players: cur.players, roles: cur.roles,
      t1n: cur.t1n, t2n: cur.t2n, captains: cur.captains,
      captainConfirmed: cur.captainConfirmed, buzzerWinner: 0, buzzerActive: false, buzzerCountdown: -1,
      qState: selTopic.rounds.map(r => r.answers.map(() => ({ rev: false, pub: false, to: 0 }))),
    };
    sRef.current = { ...sRef.current, ...patch };
    setS(prev => ({ ...prev, ...patch }));
    broadcast(patch);
  };

  const playAgain = () => {
    warmup();
    const cur = sRef.current;
    const init = mkInitial();
    const patch: GState = { ...init, players: cur.players };
    sRef.current = patch;
    setS(patch);
    setAssignModal(null);
    setTeamChooser(false);
    broadcast(patch);
  };

  const buzzerCountdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startBuzzer = () => {
    update({ buzzerCountdown: 3, buzzerActive: false, buzzerWinner: 0 });
    if (buzzerCountdownRef.current) clearInterval(buzzerCountdownRef.current);
    let count = 3;
    buzzerCountdownRef.current = setInterval(() => {
      count--;
      if (count <= 0) {
        if (buzzerCountdownRef.current) clearInterval(buzzerCountdownRef.current);
        buzzerCountdownRef.current = null;
        update({ buzzerCountdown: 0, buzzerActive: true });
      } else {
        update({ buzzerCountdown: count });
      }
    }, 1000);
  };

  const buzzerPressed = (team: number) => {
    if (!s.buzzerActive || s.buzzerWinner !== 0) return;
    sndBuzz();
    update({ buzzerWinner: team, buzzerActive: false });
    // After 3 seconds go to playing, with winning team as active
    setTimeout(() => {
      setS(prev => {
        const newActive = prev.roundActiveTeam.map((v, i) => i === prev.curQ ? team : v);
        const patch = { phase: 'playing' as Phase, roundActiveTeam: newActive };
        broadcast(patch);
        return { ...prev, ...patch };
      });
    }, 3000);
  };

  // ── Open/close answer ──
  const openAns = (idx: number) => {
    if (!isGameHost) return;
    const st = s.qState[s.curQ][idx];
    if (st.rev) {
      closeAns(idx);
      return;
    }
    sndReveal();
    const pts = getDisplayPts(s.curQ, idx, q.answers[idx].p);
    const newQState = s.qState.map((r, ri) => ri === s.curQ ? r.map((a, ai) => ai === idx ? { ...a, rev: true, pub: true } : a) : r);

    if (s.curQ <= 2) {
      // Fund logic for rounds 0-2
      const phase = s.roundPhase[s.curQ];
      if (phase === 'showonly' || phase === 'won') {
        newQState[s.curQ][idx].to = 0;
        update({ qState: newQState });
        return;
      }
      // Add to fund
      newQState[s.curQ][idx].to = -1;
      const newFund = [...s.roundFund];
      newFund[s.curQ] += pts;
      sndAssign();

      let newT1s = s.t1s, newT2s = s.t2s;
      const newPhase = [...s.roundPhase];
      const newWonBy = [...s.roundWonBy];

      if (phase === 'switched') {
        // Second team got correct — all fund goes to them
        const win = s.roundActiveTeam[s.curQ];
        if (win === 1) newT1s += newFund[s.curQ]; else newT2s += newFund[s.curQ];
        newPhase[s.curQ] = 'won';
        newWonBy[s.curQ] = win;
      } else if (phase === 'start') {
        const revCount = newQState[s.curQ].filter(a => a.rev).length;
        if (revCount === 6) {
          const win = s.roundActiveTeam[s.curQ];
          if (win === 1) newT1s += newFund[s.curQ]; else newT2s += newFund[s.curQ];
          newPhase[s.curQ] = 'won';
          newWonBy[s.curQ] = win;
        }
      }
      update({ qState: newQState, roundFund: newFund, t1s: newT1s, t2s: newT2s, roundPhase: newPhase, roundWonBy: newWonBy });
    } else {
      // Round 4 (наоборот) — show assign modal
      newQState[s.curQ][idx].rev = true;
      newQState[s.curQ][idx].pub = true;
      update({ qState: newQState });
      const team1Credited = s.qState[s.curQ].some(a => a.to === 1);
      const team2Credited = s.qState[s.curQ].some(a => a.to === 2);
      if (!team1Credited || !team2Credited) {
        setAssignModal({ idx, pts });
      } else {
        setAssignModal(null);
      }
    }
  };

  const closeAns = (idx: number) => {
    const st = s.qState[s.curQ][idx];
    const pts = getDisplayPts(s.curQ, idx, q.answers[idx].p);
    let newT1s = s.t1s, newT2s = s.t2s;
    const newFund = [...s.roundFund];

    if (s.curQ <= 2) {
      if (st.to === -1 && (s.roundPhase[s.curQ] === 'start' || s.roundPhase[s.curQ] === 'switched')) {
        newFund[s.curQ] -= pts;
      }
    } else {
      if (st.to === 1) newT1s -= pts;
      if (st.to === 2) newT2s -= pts;
    }
    const newQState = s.qState.map((r, ri) => ri === s.curQ ? r.map((a, ai) => ai === idx ? { rev: false, pub: false, to: 0 } : a) : r);
    sndClose();
    update({ qState: newQState, t1s: newT1s, t2s: newT2s, roundFund: newFund });
  };

  const assignPts = (team: number) => {
    if (!assignModal) return;
    const { idx, pts } = assignModal;
    const roundState = s.qState[s.curQ] || [];
    if ((team === 1 || team === 2) && roundState.some((a, ai) => ai !== idx && a.to === team)) return;
    const newQState = s.qState.map((r, ri) => ri === s.curQ ? r.map((a, ai) => ai === idx ? { ...a, to: team } : a) : r);
    let newT1s = s.t1s, newT2s = s.t2s;
    if (team === 1) { newT1s += pts; sndAssign(); }
    else if (team === 2) { newT2s += pts; sndAssign(); }
    setAssignModal(null);
    update({ qState: newQState, t1s: newT1s, t2s: newT2s });
  };

  // ── Strikes ──
  const addStrike = (team: number) => {
    if (!isGameHost || s.curQ > 2) return;
    const ti = team - 1;
    if (s.roundBusted[s.curQ][ti] || s.strikes[s.curQ][ti] >= 3) return;

    const newStrikes = s.strikes.map((r, ri) => ri === s.curQ ? r.map((v, i) => i === ti ? v + 1 : v) : r);
    sndBuzz();

    let newT1s = s.t1s, newT2s = s.t2s;
    const newPhase = [...s.roundPhase];
    const newWonBy = [...s.roundWonBy];
    const newBusted = s.roundBusted.map((r) => [...r]);
    const newActive = [...s.roundActiveTeam];

    // Switched phase: strike on active team = fund goes to original team
    if (s.roundPhase[s.curQ] === 'switched' && team === s.roundActiveTeam[s.curQ]) {
      const origTeam = team === 1 ? 2 : 1;
      if (s.roundFund[s.curQ] > 0) {
        if (origTeam === 1) newT1s += s.roundFund[s.curQ]; else newT2s += s.roundFund[s.curQ];
      }
      newPhase[s.curQ] = 'won';
      newWonBy[s.curQ] = origTeam;
      update({ strikes: newStrikes, t1s: newT1s, t2s: newT2s, roundPhase: newPhase, roundWonBy: newWonBy });
      return;
    }

    // 3 strikes in start phase: switch to other team
    if (newStrikes[s.curQ][ti] >= 3) {
      newBusted[s.curQ][ti] = true;
      const otherTeam = team === 1 ? 2 : 1;
      newActive[s.curQ] = otherTeam;
      newPhase[s.curQ] = 'switched';
    }

    update({ strikes: newStrikes, roundBusted: newBusted, roundActiveTeam: newActive, roundPhase: newPhase, roundWonBy: newWonBy, t1s: newT1s, t2s: newT2s });
  };

  // ── Reset round ──
  const resetRound = () => {
    if (!isGameHost) return;
    const ri = s.curQ;
    // Undo scores from this round
    let newT1s = s.t1s, newT2s = s.t2s;
    s.qState[ri].forEach((a, idx) => {
      const pts = getDisplayPts(ri, idx, q.answers[idx].p);
      if (a.to === 1) newT1s -= pts;
      else if (a.to === 2) newT2s -= pts;
    });
    // Rounds 1-3 award the accumulated fund as one lump score when the round is won.
    if (ri <= 2 && s.roundPhase[ri] === 'won') {
      const winTeam = s.roundWonBy[ri];
      if (winTeam === 1) newT1s -= s.roundFund[ri];
      else if (winTeam === 2) newT2s -= s.roundFund[ri];
    }
    const newQState = s.qState.map((r, i) => i === ri ? r.map(() => ({ rev: false, pub: false, to: 0 })) : r);
    const newStrikes = s.strikes.map((r, i) => i === ri ? [0, 0] : r);
    const newBusted = s.roundBusted.map((r, i) => i === ri ? [false, false] : r);
    const newActive = s.roundActiveTeam.map((v, i) => i === ri ? 0 : v);
    const newFund = s.roundFund.map((v, i) => i === ri ? 0 : v);
    const newWonBy = s.roundWonBy.map((v, i) => i === ri ? 0 : v);
    const newPhase = s.roundPhase.map((v, i) => i === ri ? 'start' : v);
    const resetPhase: Phase = s.curQ === 3 ? 'playing' : 'buzzer';
    update({ qState: newQState, strikes: newStrikes, roundBusted: newBusted, roundActiveTeam: newActive, roundFund: newFund, roundWonBy: newWonBy, roundPhase: newPhase, t1s: newT1s, t2s: newT2s, phase: resetPhase, buzzerWinner: 0, buzzerActive: false, buzzerCountdown: -1 });
  };

  // ── Choose team ──
  const chooseTeam = (team: number) => {
    const newActive = [...s.roundActiveTeam];
    newActive[s.curQ] = team;
    update({ roundActiveTeam: newActive });
    setTeamChooser(false);
  };

  // ── Next / prev round ──
  const nextRound = () => {
    const next = s.curQ + 1;
    if (next >= 4) { update({ phase: 'results' }); return; }
    // Round 4 (index 3) — show rules first, then play
    if (next === 3) {
      update({ curQ: next, phase: 'r4rules', buzzerWinner: 0, buzzerActive: false, buzzerCountdown: -1 });
    } else {
      update({ curQ: next, phase: 'buzzer', buzzerWinner: 0, buzzerActive: false, buzzerCountdown: -1 });
    }
  };

  const prevRound = () => {
    if (s.curQ > 0) update({ curQ: s.curQ - 1 });
  };

  const endGame = () => {
    emit('game:end', { code: roomId });
    router.push(user ? `/lobby/${roomId}` : `/join/${roomId}`);
  };

  // ── Round 4 timer (1 min discussion) ──
  const r4Start = () => {
    if (r4Ref.current) return;
    update({ r4Running: true });
    r4Ref.current = setInterval(() => {
      setS(prev => {
        const t = prev.r4Time - 1;
        if (t <= 10 && t > 0) sndTick();
        if (t <= 0) {
          if (r4Ref.current) { clearInterval(r4Ref.current); r4Ref.current = null; }
          sndBuzz();
          broadcast({ r4Time: 0, r4Running: false });
          return { ...prev, r4Time: 0, r4Running: false };
        }
        broadcast({ r4Time: t, r4Running: true });
        return { ...prev, r4Time: t };
      });
    }, 1000);
  };
  const r4Pause = () => { if (r4Ref.current) { clearInterval(r4Ref.current); r4Ref.current = null; } update({ r4Running: false }); };
  const r4Stop = () => { if (r4Ref.current) { clearInterval(r4Ref.current); r4Ref.current = null; } };
  const r4Reset = () => { r4Stop(); update({ r4Time: 60, r4Running: false }); };

  // ── Big Game ──
  const bgSelectPlayer = (slot: 1 | 2, playerId: string) => {
    if (slot === 1) {
      // If same player selected as P2, swap
      if (s.bgP2Id === playerId) update({ bgP1Id: playerId, bgP2Id: s.bgP1Id });
      else update({ bgP1Id: playerId });
    } else {
      if (s.bgP1Id === playerId) update({ bgP2Id: playerId, bgP1Id: s.bgP2Id });
      else update({ bgP2Id: playerId });
    }
  };

  const bgStartPlayer = (player: 1 | 2) => {
    const time = player === 1 ? 30 : 40;
    update({ bgPhase: player === 1 ? 1 : 3, bgCurQ: 0, bgTimeLeft: time, bgTimerTotal: time, bgTimerPaused: false, ...(player === 1 ? { bgP1Ans: [] } : { bgP2Ans: [] }) });
    // Start timer
    if (bgTimerRef.current) clearInterval(bgTimerRef.current);
    bgTimerRef.current = setInterval(() => {
      setS(prev => {
        if (prev.bgTimerPaused) return prev;
        const t = prev.bgTimeLeft - 1;
        if (t <= 5 && t > 0) sndTick();
        if (t <= 0) {
          if (bgTimerRef.current) { clearInterval(bgTimerRef.current); bgTimerRef.current = null; }
          sndBuzz();
          // Fill remaining with '—' but don't auto-transition — wait for manual button
          const ans = prev.bgPhase === 1 ? [...prev.bgP1Ans] : [...prev.bgP2Ans];
          while (ans.length < 5) ans.push('—');
          const patch = { bgTimeLeft: 0, bgCurQ: 5, ...(prev.bgPhase === 1 ? { bgP1Ans: ans } : { bgP2Ans: ans }) };
          sRef.current = { ...sRef.current, ...patch };
          broadcast(patch);
          return { ...prev, ...patch };
        }
        sRef.current = { ...sRef.current, bgTimeLeft: t };
        broadcast({ bgTimeLeft: t });
        return { ...prev, bgTimeLeft: t };
      });
    }, 1000);
  };

  const bgSubmitAnswer = () => {
    const v = bgInput.trim();
    if (!v) return;
    const cur = sRef.current;
    const aLow = v.toLowerCase();
    const isP1 = cur.bgPhase === 1;
    const myAns = isP1 ? cur.bgP1Ans : cur.bgP2Ans;
    const showDup = () => { sndDup(); setBgInput(''); setBgDupMsg(true); setTimeout(() => setBgDupMsg(false), 2000); };
    // Check duplicate with own previous answers
    if (myAns.some(a => {
      const prev = a.toLowerCase();
      return prev === aLow || (prev.length > 2 && aLow.length > 2 && (prev.includes(aLow) || aLow.includes(prev)));
    })) {
      showDup(); return;
    }
    // Check duplicate with P1 in phase 3 (same question index)
    if (cur.bgPhase === 3 && cur.bgCurQ < 5) {
      const p1 = cur.bgP1Ans[cur.bgCurQ] || '';
      const p1Low = p1.toLowerCase();
      if (p1Low && (aLow === p1Low || (aLow.length > 2 && p1Low.length > 2 && (aLow.includes(p1Low) || p1Low.includes(aLow))))) {
        showDup(); return;
      }
    }
    setBgInput('');
    const ans = [...myAns, v];
    const nextQ = cur.bgCurQ + 1;
    if (nextQ >= 5) {
      if (bgTimerRef.current) { clearInterval(bgTimerRef.current); bgTimerRef.current = null; }
      // Don't auto-transition — wait for manual "ПЕРЕЙТИ К ПРОВЕРКЕ" button
      update({ bgCurQ: nextQ, bgTimeLeft: 0, bgTimerPaused: false, ...(isP1 ? { bgP1Ans: ans } : { bgP2Ans: ans }) });
    } else {
      update({ bgCurQ: nextQ, bgTimerPaused: false, ...(isP1 ? { bgP1Ans: ans } : { bgP2Ans: ans }) });
    }
  };

  // Manual transition from input to check phase
  const bgGoToCheck = () => {
    if (!isGameHost) return;
    if (bgTimerRef.current) { clearInterval(bgTimerRef.current); bgTimerRef.current = null; }
    const isP1 = s.bgPhase === 1;
    const curAns = isP1 ? s.bgP1Ans : s.bgP2Ans;
    const filled = [...curAns];
    while (filled.length < 5) filled.push('—');
    update({ bgPhase: isP1 ? 2 : 4, bgTimeLeft: 0, ...(isP1 ? { bgP1Ans: filled } : { bgP2Ans: filled }) });
  };

  const bgManualCredit = (qIdx: number, ansIdx: number, isP1: boolean) => {
    const newAnsText = BIG_Q[qIdx].answers[ansIdx].t;
    const newPts = BIG_Q[qIdx].answers[ansIdx].p;
    const matchedArr = isP1 ? [...s.bgP1Matched] : [...s.bgP2Matched];
    // Ensure array is length 5
    while (matchedArr.length < 5) matchedArr.push(null);
    const prevMatched = matchedArr[qIdx];
    const prevPts = prevMatched ? (BIG_Q[qIdx].answers.find(a => a.t === prevMatched)?.p || 0) : 0;
    // Click same = uncredit
    if (prevMatched === newAnsText) {
      matchedArr[qIdx] = null;
      sndAssign();
      if (isP1) update({ bgP1Matched: matchedArr, bgFund: s.bgFund - prevPts });
      else update({ bgP2Matched: matchedArr, bgFund: s.bgFund - prevPts });
      return;
    }
    matchedArr[qIdx] = newAnsText;
    sndAssign();
    if (isP1) update({ bgP1Matched: matchedArr, bgFund: s.bgFund - prevPts + newPts });
    else update({ bgP2Matched: matchedArr, bgFund: s.bgFund - prevPts + newPts });
  };

  const bgShowResult = () => {
    if (s.bgFund >= 200) sndWin();
    update({ phase: 'final', bgPhase: 5 });
  };

  const resetBigGame = () => {
    if (!isGameHost) return;
    if (bgTimerRef.current) { clearInterval(bgTimerRef.current); bgTimerRef.current = null; }
    update({
      phase: 'bigGame',
      bgPhase: 0,
      bgP1Ans: [], bgP2Ans: [],
      bgP1Matched: [], bgP2Matched: [],
      bgFund: 0, bgCurQ: 0,
      bgP1Id: '', bgP2Id: '',
      bgTimeLeft: 0, bgTimerTotal: 0, bgTimerPaused: false,
    });
  };

  // Pause/resume timer on typing (broadcast so host's timer pauses)
  const bgPauseTimer = () => {
    const cur = sRef.current;
    if (isBgAnsweringPhase(cur.bgPhase) && !cur.bgTimerPaused) update({ bgTimerPaused: true });
  };
  const bgResumeTimer = () => {
    const cur = sRef.current;
    if (isBgAnsweringPhase(cur.bgPhase)) update({ bgTimerPaused: false });
  };

  // ── Derived ──
  const scores = [{ name: s.t1n, score: s.t1s }, { name: s.t2n, score: s.t2s }];
  const allRevealed = q ? s.qState[s.curQ]?.every(a => a.rev) : false;
  const canNext = allRevealed || s.roundPhase[s.curQ] === 'won' || s.roundPhase[s.curQ] === 'showonly' || s.roundPhase[s.curQ] === 'switched';

  // ── RENDER ──
  return (
    <GameLayout title={l('100 к 1', '100 to 1')} icon={<H2OMark />}
      round={s.phase === 'playing' ? s.curQ + 1 : undefined}
      totalRounds={s.phase === 'playing' ? 4 : undefined}
      scores={scores} onEnd={(isHost || isGameHost) ? endGame : undefined}
      showScoreboard={s.phase === 'results'}
      phaseKey={s.phase}
      gradientClass={H2O_SURFACE}>

      {/* ── TOPIC SELECT ── */}
      {s.phase === 'topicSelect' && (
        <div className="mx-auto flex w-full max-w-md flex-col py-8 text-center animate-fade-in">
          <H2OMark className="mx-auto mb-4 h-[88px] w-[88px] rounded-[26px]" iconClassName="h-12 w-12" />
          <h2 className="bg-[linear-gradient(180deg,#fde68a_10%,#f59e0b_60%,#d97706_95%)] bg-clip-text text-[40px] font-extrabold leading-none tracking-[-1.5px] text-transparent">
            {l('100 к 1', '100 to 1')}
          </h2>
          <p className="mb-6 mt-3 font-mono text-[12px] uppercase tracking-[2px] text-white/45">{l('Выберите тему игры', 'Choose a game topic')}</p>
          {isHost ? (
            <div className="space-y-3">
              {TOPICS.map(t => (
                <button key={t.id} type="button" className={`${H2O_PRIMARY_BUTTON} w-full`}
                  onClick={() => update({ topicId: t.id, phase: 'roleSelect', qState: t.rounds.map(r => r.answers.map(() => ({ rev: false, pub: false, to: 0 }))) })}>
                  <span className="text-2xl mr-2">{t.icon}</span> {topicName(t.id, t.name)}
                </button>
              ))}
            </div>
          ) : (
            <BreathingPlaceholder text={l('Хост выбирает тему...', 'Host is choosing a topic...')} variant="breathing-text" />
          )}
        </div>
      )}

      {/* ── ROLE SELECT ── */}
      {s.phase === 'roleSelect' && (
        <div className="mx-auto w-full max-w-2xl py-6 animate-fade-in">
          <div className="mb-[14px] flex items-center gap-[9px] px-1 text-[14px] font-medium text-amber-200">
            <HundredToOneIcon name="users" className="h-[18px] w-[18px]" />
            <span>{l('Выбери свою роль — тапни по карточке', 'Choose your role — tap a card')}</span>
          </div>
          <div className="flex flex-col gap-3">
            {(['team1', 'team2', 'host'] as const).map(role => {
              const cfg = {
                team1: { label: l('Команда 1', 'Team 1'), card: H2O_TEAM_1, dot: <TeamDot team={1} />, count: l('игроков', 'players') },
                team2: { label: l('Команда 2', 'Team 2'), card: H2O_TEAM_2, dot: <TeamDot team={2} />, count: l('игроков', 'players') },
                host:  { label: l('Ведущий', 'Host'), card: H2O_GLASS, dot: <span className="flex h-[30px] w-[30px] items-center justify-center rounded-[9px] border border-amber-300/40 bg-amber-500/[.14] text-amber-200"><HundredToOneIcon name="mic" className="h-[18px] w-[18px]" /></span>, count: l('место', 'seat') },
              }[role];
              const members = s.players.filter(p => s.roles[p.id] === role);
              const hostTakenByOther = role === 'host' && members.some(p => p.id !== effectivePlayerId);
              return (
                <button key={role} type="button"
                  disabled={hostTakenByOther}
                  className={`relative flex flex-col gap-[10px] rounded-[var(--radius-xl)] border p-[14px] text-left transition active:scale-[.99] disabled:cursor-not-allowed disabled:opacity-45 ${cfg.card} ${myRole === role ? 'before:pointer-events-none before:absolute before:inset-[-2.5px] before:rounded-[inherit] before:border-2 before:border-amber-400/60 before:shadow-[0_0_26px_-4px_rgba(245,158,11,.45)]' : ''}`}
                  onClick={() => selectRole(role)}>
                  <div className="flex items-center gap-[11px]">
                    {cfg.dot}
                    <span className="text-[18px] font-extrabold tracking-[-.2px]">{cfg.label}</span>
                    <span className="ml-auto font-mono text-[12px] text-white/45">
                      {role === 'host' ? `${Math.max(1 - members.length, 0)} ${cfg.count}` : `${members.length} ${cfg.count}`}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-[7px]">
                    {members.length === 0 ? (
                      <span className="rounded-full border border-white/10 bg-black/[.18] px-3 py-2 text-[13px] font-bold text-white/30">
                        {l('никого нет', 'no one yet')}
                      </span>
                    ) : members.map(p => (
                      <span key={p.id} className={`inline-flex items-center gap-[7px] rounded-full border px-3 py-1.5 pl-1.5 text-[13.5px] font-bold ${
                        p.id === effectivePlayerId ? 'border-amber-300/55 bg-amber-500/[.12] text-amber-200' : 'border-white/10 bg-black/[.22] text-white/80'
                      }`}>
                        <PlayerAvatar nickname={p.nickname || '?'} sizePx={26} />
                        {p.nickname || '?'}{p.id === effectivePlayerId ? ` · ${l('ты', 'you')}` : ''}
                      </span>
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
          {isHost && Object.keys(s.roles).length > 0 && (
            <button type="button" className={`${H2O_PRIMARY_BUTTON} mt-6 w-full`} onClick={goToCaptainSelect}>{l('Далее', 'Next')} →</button>
          )}
        </div>
      )}

      {/* ── TEAM NAMES ── */}
      {s.phase === 'teamNames' && (() => {
        const amCaptain = myTeam && effectivePlayerId === s.captains[myTeam];
        const myConfirmed = myTeam ? s.teamNameConfirmed[myTeam] : false;
        return (
          <div className="mx-auto w-full max-w-md py-6 text-center animate-fade-in">
            <div className="mb-5 text-center">
              <div className="font-mono text-[12px] font-bold uppercase tracking-[2px] text-amber-200">{l('Подготовка', 'Setup')}</div>
              <h2 className="mt-1 text-[30px] font-extrabold tracking-[-.6px]">{l('Названия команд', 'Team names')}</h2>
            </div>

            {/* Captain input: only their own team */}
            {amCaptain && !myConfirmed && myTeam && (
              <div className={`${H2O_GLASS_STRONG} rounded-[var(--radius-xl)] p-4`}>
                <p className={`mb-3 text-sm font-bold ${myTeam === 'team1' ? 'text-[#ffe155]' : 'text-[#ff7a70]'}`}>{l('Введите название вашей команды', 'Enter your team name')}</p>
                <div className="mb-4 flex items-center gap-3">
                  <TeamDot team={myTeam === 'team1' ? 1 : 2} className="h-4 w-4 flex-shrink-0" />
                  <input
                    value={myTeam === 'team1' ? teamNameInput1 : teamNameInput2}
                    onChange={e => myTeam === 'team1' ? setTeamNameInput1(e.target.value) : setTeamNameInput2(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') confirmMyTeamName(); }}
                    placeholder={myTeam === 'team1' ? l('Команда 1', 'Team 1') : l('Команда 2', 'Team 2')} maxLength={10}
                    className={`h-[58px] min-w-0 flex-1 rounded-[var(--radius-lg)] border bg-white/[.10] px-[18px] text-[19px] font-bold text-white outline-none shadow-[0_0_0_4px_rgba(245,158,11,.1)] placeholder:text-white/25 ${myTeam === 'team1' ? 'border-yellow-300/45 focus:border-yellow-200' : 'border-red-300/45 focus:border-red-200'}`} />
                </div>
                <button type="button" className={`${H2O_PRIMARY_BUTTON} w-full`} onClick={confirmMyTeamName}>{l('Подтвердить', 'Confirm')}</button>
              </div>
            )}

            {/* Captain waiting */}
            {amCaptain && myConfirmed && (
              <div className={`${H2O_GLASS_STRONG} rounded-[var(--radius-xl)] p-6`}>
                <HundredToOneIcon name="check" className="mx-auto mb-3 h-10 w-10 text-green-300" strokeWidth={2.2} />
                <p className="font-bold text-green-300">{l('Название подтверждено!', 'Name confirmed!')}</p>
                <p className="text-white/40 text-sm mt-1">
                  {myTeam && !s.teamNameConfirmed[myTeam === 'team1' ? 'team2' : 'team1'] && l('Ждём вторую команду...', 'Waiting for the other team...')}
                </p>
              </div>
            )}

            {/* Non-captain team member — see status */}
            {myTeam && effectivePlayerId !== s.captains[myTeam] && (
              <div className={`${H2O_GLASS_STRONG} rounded-[var(--radius-xl)] p-4`}>
                <p className="mb-3 text-white/55">{l('Капитан вводит название команды', 'Captain is entering the team name')}</p>
                <div className="space-y-2">
                  <div className={`${H2O_GLASS} rounded-[var(--radius-md)] px-4 py-2 text-sm ${s.teamNameConfirmed.team1 ? 'text-green-300' : 'text-white/40'}`}>
                    <TeamDot team={1} className="mr-2 inline-block h-2 w-2" />
                    {s.teamNameConfirmed.team1 ? `✓ ${s.t1n}` : l('Команда 1 ждёт', 'Team 1 waiting')}
                  </div>
                  <div className={`${H2O_GLASS} rounded-[var(--radius-md)] px-4 py-2 text-sm ${s.teamNameConfirmed.team2 ? 'text-green-300' : 'text-white/40'}`}>
                    <TeamDot team={2} className="mr-2 inline-block h-2 w-2" />
                    {s.teamNameConfirmed.team2 ? `✓ ${s.t2n}` : l('Команда 2 ждёт', 'Team 2 waiting')}
                  </div>
                </div>
              </div>
            )}

            {/* Host — just waits for captains */}
            {isGameHost && (
              <div className={`${H2O_GLASS_STRONG} rounded-[var(--radius-xl)] p-4`}>
                <p className="mb-3 text-white/55">{l('Капитаны вводят названия команд...', 'Captains are entering team names...')}</p>
                <div className="space-y-2">
                  <div className={`${H2O_GLASS} rounded-[var(--radius-md)] px-4 py-2 text-sm ${s.teamNameConfirmed.team1 ? 'text-green-300' : 'text-white/40'}`}>
                    <TeamDot team={1} className="mr-2 inline-block h-2 w-2" />
                    {s.teamNameConfirmed.team1 ? `✓ ${s.t1n}` : l('Команда 1 ждёт', 'Team 1 waiting')}
                  </div>
                  <div className={`${H2O_GLASS} rounded-[var(--radius-md)] px-4 py-2 text-sm ${s.teamNameConfirmed.team2 ? 'text-green-300' : 'text-white/40'}`}>
                    <TeamDot team={2} className="mr-2 inline-block h-2 w-2" />
                    {s.teamNameConfirmed.team2 ? `✓ ${s.t2n}` : l('Команда 2 ждёт', 'Team 2 waiting')}
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* ── CAPTAIN SELECT ── */}
      {s.phase === 'captainSelect' && (
        <div className="mx-auto w-full max-w-md py-6 text-center animate-fade-in">
          <div className="mb-5">
            <div className="font-mono text-[12px] font-bold uppercase tracking-[2px] text-amber-200">{l('Подготовка', 'Setup')}</div>
            <h2 className="mt-1 text-[30px] font-extrabold tracking-[-.6px]">{l('Выбор капитана', 'Captain selection')}</h2>
          </div>

          {/* View for team players */}
          {myTeam && (() => {
            const myTeamPlayers = s.players.filter(p => s.roles[p.id] === myTeam);
            const confirmed = s.captainConfirmed[myTeam];
            const teamColor = myTeam === 'team1' ? 'text-yellow-400' : 'text-red-400';
            const teamName = myTeam === 'team1' ? s.t1n : s.t2n;
            return (
              <div>
                <p className={`mb-4 text-lg font-extrabold ${teamColor}`}>{teamName}</p>
                {confirmed ? (
                  <div className={`${H2O_GLASS_STRONG} rounded-[var(--radius-xl)] p-6 text-center`}>
                    <HundredToOneIcon name="check" className="mx-auto mb-3 h-10 w-10 text-green-300" strokeWidth={2.2} />
                    <p className="font-bold text-green-300">{l('Капитан выбран!', 'Captain selected!')}</p>
                    <p className="text-white/40 text-sm mt-1">
                      {myTeam === 'team1' ? (s.captainConfirmed.team2 ? '' : l('Ждём выбора второй команды...', 'Waiting for the other team to choose...')) : (s.captainConfirmed.team1 ? '' : l('Ждём выбора второй команды...', 'Waiting for the other team to choose...'))}
                    </p>
                  </div>
                ) : (
                  <>
                    <p className="mb-4 text-sm text-white/55">{l('Нажмите на имя, чтобы выбрать капитана', 'Tap a name to choose a captain')}</p>
                    <div className="mb-6 space-y-2">
                      {myTeamPlayers.map(p => (
                        <button type="button" key={p.id}
                          onClick={() => setSelectedCaptain(p.id)}
                          className={`${H2O_GLASS} flex w-full cursor-pointer items-center gap-3 rounded-[var(--radius-md)] p-3 text-left transition ${selectedCaptain === p.id ? 'border-amber-300/55 bg-amber-500/[.12]' : 'hover:bg-white/[.10]'}`}>
                          <PlayerAvatar nickname={p.nickname || '?'} sizePx={36} ring={selectedCaptain === p.id ? 'rgba(245,158,11,.65)' : undefined} />
                          <span className={`font-bold ${selectedCaptain === p.id ? 'text-white' : 'text-white/70'}`}>{p.nickname}</span>
                          {p.id === effectivePlayerId && <span className="text-xs text-white/30 ml-auto">{l('вы', 'you')}</span>}
                        </button>
                      ))}
                    </div>
                    {selectedCaptain && (
                      <button type="button" className={`${H2O_PRIMARY_BUTTON} w-full`} onClick={confirmCaptain}>
                        {l('ПОДТВЕРДИТЬ КАПИТАНА', 'CONFIRM CAPTAIN')}
                      </button>
                    )}
                  </>
                )}
              </div>
            );
          })()}

          {/* View for host */}
          {isGameHost && (
            <div className={`${H2O_GLASS_STRONG} mt-4 rounded-[var(--radius-xl)] p-4`}>
              <p className="text-white/40 text-sm mb-3">{l('Статус выбора капитанов:', 'Captain selection status:')}</p>
              <div className="flex gap-4 justify-center">
                <div className={`${H2O_GLASS} rounded-[var(--radius-md)] px-4 py-2 text-sm ${s.captainConfirmed.team1 ? 'text-green-300' : 'text-white/40'}`}>
                  {s.t1n}: {s.captainConfirmed.team1 ? `✓ ${l('выбран', 'selected')}` : `⏳ ${l('ждём', 'waiting')}`}
                </div>
                <div className={`${H2O_GLASS} rounded-[var(--radius-md)] px-4 py-2 text-sm ${s.captainConfirmed.team2 ? 'text-green-300' : 'text-white/40'}`}>
                  {s.t2n}: {s.captainConfirmed.team2 ? `✓ ${l('выбран', 'selected')}` : `⏳ ${l('ждём', 'waiting')}`}
                </div>
              </div>
              {/* Host can skip if needed */}
              <button onClick={() => update({ phase: 'teamNames' })} className="mt-4 text-xs text-white/25 hover:text-white/50">
                {l('Пропустить', 'Skip')} →
              </button>
            </div>
          )}

          {/* View for TV/no-role */}
          {!myTeam && !isGameHost && (
            <p className="text-white/40 italic mt-4">{l('Команды выбирают капитанов...', 'Teams are choosing captains...')}</p>
          )}
        </div>
      )}

      {/* ── TITLE ── */}
      {s.phase === 'title' && (
        <div className="py-12 text-center animate-fade-in">
          <H2OMark className="mx-auto mb-5 h-[110px] w-[110px] rounded-[32px]" iconClassName="h-[62px] w-[62px]" />
          <h2 className="bg-[linear-gradient(180deg,#fde68a_10%,#f59e0b_60%,#d97706_95%)] bg-clip-text text-[54px] font-extrabold leading-none tracking-[-2px] text-transparent">{l('100 к 1', '100 to 1')}</h2>
          <p className="mb-2 mt-3 flex items-center justify-center gap-1.5 font-mono text-[24px] uppercase text-white/45">
            <span className="tracking-[4px]">{l('Тема:', 'Topic:')}</span>
            <span className="tracking-[4px]">{topicName(topic.id, topic.name)}</span>
          </p>
          <div className="mx-auto mb-8 inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/[.06] px-4 py-2 text-sm font-bold text-white/55 backdrop-blur-[20px]">
            <TeamDot team={1} /> {s.t1n} <span className="font-mono text-amber-300">VS</span> {s.t2n} <TeamDot team={2} />
          </div>
          {(isHost || isGameHost) ? (
            <button type="button" className={H2O_PRIMARY_BUTTON} onClick={startGame}>{l('НАЧАТЬ ИГРУ', 'START GAME')}</button>
          ) : (
            <p className="text-white/40 italic">{l('Ожидание ведущего...', 'Waiting for the host...')}</p>
          )}
        </div>
      )}

      {/* ── BUZZER ── */}
      {s.phase === 'buzzer' && (
        <div className="mx-auto flex min-h-[640px] w-full max-w-md flex-col py-8 text-center animate-fade-in">
          <div className="flex flex-col items-center gap-1.5 pt-[18px]">
            <span className="font-mono text-[12px] uppercase tracking-[3px] text-amber-400">{l(`Раунд ${s.curQ + 1}`, `Round ${s.curQ + 1}`)} · {roundNames[s.curQ]}</span>
            <h2 className="m-0 text-[30px] font-extrabold tracking-[-.6px]">{l('Кто начинает?', 'Who starts?')}</h2>
            <span className={`${H2O_GLASS} mt-2 inline-flex items-center gap-[9px] rounded-full px-[18px] py-[9px] text-[20px] font-extrabold text-amber-100 ${s.buzzerCountdown > 0 ? 'animate-pulse' : ''}`}>
              <HundredToOneIcon name="timer" className="h-5 w-5 text-amber-400" />
              {s.buzzerCountdown > 0 ? s.buzzerCountdown : s.buzzerActive ? '0' : '—'}
            </span>
          </div>

          {/* Buzzer button — visible to captains */}
          {myTeam && effectivePlayerId === s.captains[myTeam] && s.buzzerWinner === 0 && (
            <div className="flex flex-1 flex-col items-center justify-center gap-[26px]">
              <div className="flex items-center gap-[10px] font-mono text-[12.5px] uppercase tracking-[2px] text-white/45">
                <TeamDot team={myTeam === 'team1' ? 1 : 2} />
                {s.players.find(p => p.id === effectivePlayerId)?.nickname || l('Ты', 'You')} · {l('капитан', 'captain')} «{myTeam === 'team1' ? s.t1n : s.t2n}»
              </div>
              <button
                onClick={() => buzzerPressed(myTeam === 'team1' ? 1 : 2)}
                disabled={!s.buzzerActive}
                className={`flex h-44 w-44 select-none flex-col items-center justify-center rounded-full border-4 font-extrabold text-white shadow-2xl transition-all duration-150
                  ${s.buzzerActive
                    ? 'cursor-pointer animate-pulse border-red-300 bg-red-600 shadow-red-500/50 hover:bg-red-500 active:scale-95'
                    : s.buzzerCountdown > 0
                      ? 'cursor-not-allowed border-red-300/60 bg-red-600/80'
                      : 'cursor-not-allowed border-red-900/60 bg-red-950/45 text-white/30'
                  }`}
              >
                {s.buzzerCountdown > 0
                  ? <span className="text-6xl font-bold animate-pulse">{s.buzzerCountdown}</span>
                : s.buzzerActive
                    ? <span className="text-4xl font-extrabold">{l('ЖМИ!', 'PRESS!')}</span>
                    : <HundredToOneIcon name="timer" className="h-9 w-9" />}
              </button>
            </div>
          )}

          {/* Winner result — captain view */}
          {myTeam && effectivePlayerId === s.captains[myTeam] && s.buzzerWinner !== 0 && (
            <div className={`mx-auto my-auto flex h-44 w-44 items-center justify-center rounded-full border-4 text-4xl transition-all
              ${s.buzzerWinner === (myTeam === 'team1' ? 1 : 2)
                ? 'border-green-300 bg-green-600/30 text-green-300'
                : 'bg-white/5 border-white/10 text-white/20'}`}>
              <HundredToOneIcon name={s.buzzerWinner === (myTeam === 'team1' ? 1 : 2) ? 'check' : 'cross'} className="h-12 w-12" strokeWidth={2.4} />
            </div>
          )}

          {/* Non-captain team member */}
          {myTeam && effectivePlayerId !== s.captains[myTeam] && (
            <div className={`${H2O_GLASS_STRONG} my-auto rounded-[var(--radius-xl)] p-6`}>
              {s.buzzerCountdown > 0
                ? <p className="text-5xl font-extrabold text-red-300 animate-pulse">{s.buzzerCountdown}</p>
                : s.buzzerWinner === 0
                  ? <p className="text-white/40 italic">{s.buzzerActive ? l('Капитаны жмут кнопку!', 'Captains are pressing!') : l('Ожидание...', 'Waiting...')}</p>
                  : <p className={`text-xl font-bold animate-fade-in ${s.buzzerWinner === (myTeam === 'team1' ? 1 : 2) ? 'text-green-400' : 'text-white/60'}`}>
                      {s.buzzerWinner === (myTeam === 'team1' ? 1 : 2) ? `${l('Начинает', 'Starts')}: ${myTeam === 'team1' ? s.t1n : s.t2n}!` : `${l('Начинает', 'Starts')}: ${s.buzzerWinner === 1 ? s.t1n : s.t2n}...`}
                    </p>
              }
            </div>
          )}

          {/* Result: starting team announcement */}
          {s.buzzerWinner !== 0 && (
            <div className="mt-4 animate-fade-in">
              <p className="text-xl font-bold text-white">
                {l('Начинает', 'Starts')}: <span className={s.buzzerWinner === 1 ? 'text-[#ffe155]' : 'text-[#ff7a70]'}>
                  {s.buzzerWinner === 1 ? s.t1n : s.t2n}
                </span>!
              </p>
              <p className="text-white/40 text-sm mt-2">{l('Раунд начинается...', 'Round is starting...')}</p>
            </div>
          )}

          {/* Host controls */}
          {isGameHost && (
            <div className="mt-8">
              {s.buzzerCountdown < 0 && s.buzzerWinner === 0 && (
                <button type="button" className={H2O_PRIMARY_BUTTON} onClick={startBuzzer}>{l('ЗАПУСТИТЬ ОТСЧЁТ', 'START COUNTDOWN')}</button>
              )}
              {s.buzzerCountdown > 0 && (
                <p className="text-4xl font-bold text-red-400 animate-pulse">{s.buzzerCountdown}</p>
              )}
              {s.buzzerWinner !== 0 && (
                <p className="text-white/30 text-sm">{l('Переход к раунду через 3 секунды...', 'Starting the round in 3 seconds...')}</p>
              )}
            </div>
          )}
          <div className="px-6 text-center text-[14px] leading-[1.45] text-white/45">
            {l('Кто первым нажмёт после отсчёта —', 'The first press after countdown —')}
            <br />
            <b className="font-semibold text-amber-200">{l('та команда атакует раунд', 'starts the attacking team')}</b>.
          </div>
        </div>
      )}

      {/* ── ROUND 4 RULES ── */}
      {s.phase === 'r4rules' && (
        <div className="mx-auto w-full max-w-2xl py-8 text-center animate-fade-in">
          <div className="mb-4 font-mono text-[12px] font-bold uppercase tracking-[3px] text-amber-200">{l('Раунд 4', 'Round 4')}</div>
          <h2 className="mb-4 text-[34px] font-extrabold tracking-[-.8px] text-amber-300">{l('Игра наоборот', 'Reverse game')}</h2>
          <div className={`${H2O_GLASS_STRONG} mb-6 space-y-3 rounded-[var(--radius-xl)] p-6 text-left`}>
            <p className="font-bold text-white/80">{l('В этом раунде правила меняются:', 'The rules change this round:')}</p>
            <ul className="space-y-2 text-sm text-white/70">
              <li className="flex items-start gap-2"><span className="mt-0.5 font-bold text-amber-400">1.</span> {l('Обе команды отвечают на один и тот же вопрос', 'Both teams answer the same question')}</li>
              <li className="flex items-start gap-2"><span className="mt-0.5 font-bold text-amber-400">2.</span> {l('Команды обсуждают ответ', 'Teams discuss their answer')} <span className="font-bold text-[#ffe155]">{l('60 секунд', '60 seconds')}</span></li>
              <li className="flex items-start gap-2"><span className="mt-0.5 font-bold text-amber-400">3.</span> {l('Нужно найти', 'Find')} <span className="font-bold text-[#ff7a70]">{l('самый редкий', 'the rarest')}</span> {l('ответ', 'answer')}</li>
              <li className="flex items-start gap-2"><span className="mt-0.5 font-bold text-amber-400">4.</span> {l('Чем ниже ответ в списке — тем больше очков!', 'The lower the answer is on the list, the more points it gives!')}</li>
              <li className="flex items-start gap-2"><span className="mt-0.5 font-bold text-amber-400">5.</span> {l('Очки: 15, 30, 60, 120, 180, 240', 'Points: 15, 30, 60, 120, 180, 240')}</li>
            </ul>
          </div>
          {isGameHost && (
            <button type="button" className={H2O_PRIMARY_BUTTON} onClick={() => update({ phase: 'playing' })}>
              {l('НАЧАТЬ РАУНД 4', 'START ROUND 4')}
            </button>
          )}
          {!isGameHost && <p className="text-white/40 text-sm animate-pulse">{l('Ведущий начнёт раунд...', 'Host will start the round...')}</p>}
        </div>
      )}

      {/* ── PLAYING: PLAYER VIEW (team1/team2) ── */}
      {s.phase === 'playing' && q && (myRole === 'team1' || myRole === 'team2') && (
        <div className="mx-auto w-full max-w-3xl">
          <div className="grid grid-cols-2 gap-[9px]">
            <TeamScoreCard team={1} name={s.t1n} score={s.t1s} active={s.roundActiveTeam[s.curQ] === 1 && s.curQ <= 2} />
            <TeamScoreCard team={2} name={s.t2n} score={s.t2s} active={s.roundActiveTeam[s.curQ] === 2 && s.curQ <= 2} />
          </div>
          <div className="my-[12px] flex items-center justify-center gap-[10px]">
            <span className="font-mono text-[12.5px] font-bold uppercase tracking-[2.5px] text-amber-200">{l(`Раунд ${s.curQ + 1}`, `Round ${s.curQ + 1}`)} · {roundNames[s.curQ]}</span>
            <span className="rounded-full border border-amber-300/40 bg-amber-500/[.13] px-[9px] py-0.5 font-mono text-[12px] font-bold text-amber-400">×{s.curQ + 1}</span>
          </div>
          {s.curQ <= 2 && (
            <div className={`${H2O_GLASS_STRONG} grid grid-cols-[auto_1fr_auto] items-center gap-[14px] rounded-[var(--radius-xl)] px-4 py-[10px]`}>
              <div className="flex gap-1.5">{[0, 1, 2].map(i => <StrikeIcon key={i} on={i < s.strikes[s.curQ][0]} />)}</div>
              <div className="flex flex-col items-center">
                <span className="font-mono text-[10px] uppercase tracking-[3px] text-white/40">{l('Банк раунда', 'Round bank')}</span>
                <span className="text-[34px] font-extrabold leading-none tracking-[-1px] text-amber-200">{s.roundFund[s.curQ]}</span>
              </div>
              <div className="flex gap-1.5">{[0, 1, 2].map(i => <StrikeIcon key={i} on={i < s.strikes[s.curQ][1]} />)}</div>
            </div>
          )}
          {s.curQ === 3 && (
            <div className={`${H2O_GLASS_STRONG} rounded-[var(--radius-xl)] px-4 py-[10px] text-center`}>
              <span className="font-mono text-[10px] uppercase tracking-[3px] text-white/40">{l('Обсуждение', 'Discussion')}</span>
              <div className={`text-[34px] font-extrabold leading-none ${s.r4Time <= 10 && s.r4Time > 0 ? 'animate-pulse text-red-300' : 'text-amber-200'}`}>
                {Math.floor(s.r4Time / 60)}:{(s.r4Time % 60).toString().padStart(2, '0')}
              </div>
            </div>
          )}
          <H2OQuestionCard>{q.q}</H2OQuestionCard>
          <div className="flex flex-col gap-[7px]">
            {q.answers.map((a, idx) => {
              const revealed = s.qState[s.curQ]?.[idx]?.pub;
              const pts = getDisplayPts(s.curQ, idx, a.p);
              return <H2OAnswerRow key={idx} index={idx} text={a.t} points={pts} revealed={revealed} />;
            })}
          </div>
          <div className="mt-4 text-center text-[13px] font-medium text-white/45">
            {s.curQ === 3
              ? l('Обсуждайте ответ с командой — очки получит только самый редкий вариант', 'Discuss the answer with your team — only the rarest option scores')
              : (() => {
                  const activeTeam = s.roundActiveTeam[s.curQ];
                  const activeTeamRole = activeTeam === 1 ? 'team1' : activeTeam === 2 ? 'team2' : null;

                  if (myTeam && activeTeamRole === myTeam) {
                    return l('Отвечает ваша команда — говорите вслух, ведущий откроет ответ', 'Your team answers aloud, the host reveals the answer');
                  }

                  if (activeTeam === 1 || activeTeam === 2) {
                    const activeTeamName = activeTeam === 1 ? s.t1n : s.t2n;
                    return l(`Отвечает команда ${activeTeamName} — ждите своего хода`, `Team ${activeTeamName} answers aloud — wait for your turn`);
                  }

                  return l('Ждите своего хода — ведущий откроет ответ', 'Wait for your turn — the host reveals the answer');
                })()}
          </div>
        </div>
      )}

      {/* ── PLAYING: TV VIEW ── */}
      {s.phase === 'playing' && q && myRole === 'tv' && (
        <div className="max-w-4xl mx-auto w-full">
          {/* Big scores bar */}
          <div className="flex justify-between items-center mb-4">
            <div className={`glass-card px-6 py-3 flex items-center gap-3 ${s.roundActiveTeam[s.curQ] === 1 && s.curQ <= 2 ? 'ring-2 ring-yellow-400 bg-yellow-500/10' : ''}`}>
              <span className="w-4 h-4 rounded-full bg-yellow-400" />
              <span className="text-lg font-bold text-white">{s.t1n}</span>
              <span className="font-bold text-yellow-300 text-3xl ml-2">{s.t1s}</span>
            </div>
            <div className="text-center">
              <div className="w-14 h-14 bg-amber-500 rounded-full flex items-center justify-center font-bold text-black text-2xl">{s.curQ + 1}</div>
              <div className="text-xs text-white/40 mt-1">{l('РАУНД', 'ROUND')}</div>
            </div>
            <div className={`glass-card px-6 py-3 flex items-center gap-3 ${s.roundActiveTeam[s.curQ] === 2 && s.curQ <= 2 ? 'ring-2 ring-red-400 bg-red-500/10' : ''}`}>
              <span className="font-bold text-red-300 text-3xl mr-2">{s.t2s}</span>
              <span className="text-lg font-bold text-white">{s.t2n}</span>
              <span className="w-4 h-4 rounded-full bg-red-500" />
            </div>
          </div>
          <div className="text-center mb-2">
            <span className="text-amber-400 font-bold text-lg tracking-widest">{roundNames[s.curQ]}</span>
          </div>
          {/* Fund + Strikes */}
          {s.curQ <= 2 && (
            <div className="flex items-center justify-center gap-6 mb-3">
              <div className="flex items-center gap-1">
                {[0, 1, 2].map(i => <div key={i} className={`w-9 h-9 rounded-full flex items-center justify-center text-lg font-bold ${i < s.strikes[s.curQ][0] ? 'bg-red-500/30 text-red-400' : 'bg-white/5 text-white/15'}`}>✕</div>)}
              </div>
              <div className="text-center">
                <span className="text-xs text-white/40">{l('БАНК', 'BANK')}</span>
                <div className="font-bold text-yellow-300 text-2xl">{s.roundFund[s.curQ]}</div>
              </div>
              <div className="flex items-center gap-1">
                {[0, 1, 2].map(i => <div key={i} className={`w-9 h-9 rounded-full flex items-center justify-center text-lg font-bold ${i < s.strikes[s.curQ][1] ? 'bg-red-500/30 text-red-400' : 'bg-white/5 text-white/15'}`}>✕</div>)}
              </div>
            </div>
          )}
          {/* Question */}
          <GlassCard className="p-6 mb-4 text-center bg-amber-900/25 border-amber-500/50">
            <p className="text-xs text-amber-400/70 font-bold tracking-widest mb-2">{l('ВОПРОС', 'QUESTION')}</p>
            <p className="text-2xl md:text-3xl font-bold text-white">{q.q}</p>
          </GlassCard>
          {/* Answer board */}
          <div className="space-y-2 mb-4">
            {q.answers.map((a, idx) => {
              const revealed = s.qState[s.curQ]?.[idx]?.pub;
              const pts = getDisplayPts(s.curQ, idx, a.p);
              return (
                <div key={idx} className={`glass-card p-4 flex items-center justify-between transition-all ${revealed ? 'bg-yellow-300/25 border-yellow-400/50' : 'bg-white/5 border-white/10'}`}>
                  <div className="flex items-center gap-4">
                    <span className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold ${revealed ? 'bg-amber-500 text-black' : 'bg-white/10 text-white/30'}`}>{idx + 1}</span>
                    {revealed ? <span className="text-xl text-white font-bold uppercase tracking-wide">{a.t}</span> : <span className="text-white/15 tracking-[8px] text-xl">? ? ?</span>}
                  </div>
                  {revealed ? <span className="bg-amber-600/80 rounded-lg px-3 py-1.5 font-bold text-white text-xl">{pts}</span> : <span className="text-white/10 text-xl">?</span>}
                </div>
              );
            })}
          </div>
          {s.roundPhase[s.curQ] === 'switched' && <p className="text-center text-amber-400 font-bold">{l('Ход', 'Turn')} → {s.roundActiveTeam[s.curQ] === 1 ? s.t1n : s.t2n}</p>}
          {s.roundPhase[s.curQ] === 'won' && !allRevealed && <p className="text-center text-white/50 italic">{l('проверка оставшихся ответов', 'checking remaining answers')}</p>}
          {s.roundPhase[s.curQ] === 'won' && allRevealed && <p className="text-center text-green-400 font-bold">✓ {l('Все ответы открыты', 'All answers revealed')}</p>}
        </div>
      )}

      {/* ── PLAYING: HOST VIEW (ведущий) ── */}
      {s.phase === 'playing' && q && isGameHost && (
        <div className="mx-auto w-full max-w-3xl">
          <div className="grid grid-cols-2 gap-[9px]">
            <TeamScoreCard team={1} name={s.t1n} score={s.t1s} active={s.roundActiveTeam[s.curQ] === 1 && s.curQ <= 2} compact />
            <TeamScoreCard team={2} name={s.t2n} score={s.t2s} active={s.roundActiveTeam[s.curQ] === 2 && s.curQ <= 2} compact />
          </div>

          <div className="my-[10px] flex items-center justify-center gap-[10px]">
            <span className="font-mono text-[12px] font-bold uppercase tracking-[2px] text-amber-200">{l(`Раунд ${s.curQ + 1}`, `Round ${s.curQ + 1}`)} · ×{s.curQ + 1}</span>
            {isGameHost && s.curQ <= 2 && s.roundPhase[s.curQ] === 'start' && s.roundActiveTeam[s.curQ] > 0 && (
              <button type="button" onClick={() => setTeamChooser(true)} className={`${H2O_GLASS} inline-flex items-center gap-1.5 rounded-full px-[11px] py-[5px] font-mono text-[11px] uppercase tracking-[1px] text-white/65 hover:bg-white/[.10]`}>
                <HundredToOneIcon name="shuffle" className="h-[13px] w-[13px] text-amber-200" />
                {l('сменить команду', 'change team')}
              </button>
            )}
          </div>

          {s.curQ <= 2 && (
            <div className={`${H2O_GLASS_STRONG} grid grid-cols-[auto_1fr_auto] items-center gap-[14px] rounded-[var(--radius-xl)] px-4 py-[9px]`}>
              <div className="flex gap-[5px]">
                {[0, 1, 2].map(i => <StrikeIcon key={i} on={i < s.strikes[s.curQ][0]} asButton={s.roundActiveTeam[s.curQ] === 1} onClick={() => addStrike(1)} />)}
              </div>
              <div className="flex flex-col items-center">
                <span className="font-mono text-[10px] uppercase tracking-[3px] text-white/40">{l('Банк раунда', 'Round bank')}</span>
                <span className="text-[30px] font-extrabold leading-none tracking-[-1px] text-amber-200">{s.roundFund[s.curQ]}</span>
              </div>
              <div className="flex gap-[5px]">
                {[0, 1, 2].map(i => <StrikeIcon key={i} on={i < s.strikes[s.curQ][1]} asButton={s.roundActiveTeam[s.curQ] === 2} onClick={() => addStrike(2)} />)}
              </div>
            </div>
          )}
          <H2OQuestionCard withIcon={false} compact>{q.q}</H2OQuestionCard>

          <div className="mb-3 flex flex-col gap-[6px]">
            {q.answers.map((a, idx) => {
              const revealed = s.qState[s.curQ]?.[idx]?.rev;
              const pts = getDisplayPts(s.curQ, idx, a.p);
              return <H2OAnswerRow key={idx} index={idx} text={a.t} points={pts} revealed={revealed} hostHidden={!revealed} onClick={() => openAns(idx)} />;
            })}
          </div>
          <div className="mx-0.5 mt-1 text-center text-[11.5px] text-white/30">
            {l('Тап по ответу — открыть на игровом поле · тап по кресту — страйк', 'Tap answer to reveal · tap cross for a strike')}
          </div>

          {/* Round 4 discussion timer */}
          {isGameHost && s.curQ === 3 && (
            <div className="mb-3 flex items-center justify-center gap-3">
              <span className={`min-w-[60px] text-center text-2xl font-bold ${s.r4Time <= 10 && s.r4Time > 0 ? 'animate-pulse text-red-400' : 'text-yellow-300'}`}>
                {Math.floor(s.r4Time / 60)}:{(s.r4Time % 60).toString().padStart(2, '0')}
              </span>
              {s.r4Time === 0 ? null : (
                !s.r4Running
                  ? <GlassButton size="sm" onClick={r4Start}>{s.r4Time < 60 ? `▶ ${l('ПРОДОЛЖИТЬ', 'CONTINUE')}` : `▶ ${l('СТАРТ', 'START')}`}</GlassButton>
                  : <GlassButton size="sm" onClick={r4Pause}>⏸ {l('ПАУЗА', 'PAUSE')}</GlassButton>
              )}
              <GlassButton size="sm" onClick={r4Reset}>↺</GlassButton>
            </div>
          )}

          {/* Host controls */}
          {isGameHost && (
            <div className="mt-3 grid grid-cols-[1fr_1.1fr_1fr] items-center gap-[9px]">
              {s.curQ > 0 ? <button type="button" className={H2O_SECONDARY_BUTTON} onClick={prevRound}>← {l('Назад', 'Back')}</button> : <span />}
              <button type="button" className={`${H2O_SECONDARY_BUTTON} !border-red-300/45 !text-red-200`} onClick={resetRound}>{l('Сброс', 'Reset')}</button>
              {canNext ? <button type="button" className={H2O_PRIMARY_BUTTON} onClick={nextRound}>
                {s.curQ < 3 ? `${l('Далее', 'Next')} →` : `${l('Итоги', 'Results')} →`}
              </button> : <span />}
            </div>
          )}
        </div>
      )}

      {/* ── RESULTS ── */}
      {s.phase === 'results' && (
        <div className="mx-auto w-full max-w-md py-8 text-center animate-fade-in">
          <h2 className="mb-6 text-[30px] font-extrabold tracking-[-.6px] text-amber-300">{l('Итоги раундов', 'Round results')}</h2>
          <div className="mb-4 flex gap-4 justify-center">
            <div className={`relative flex-1 rounded-[var(--radius-xl)] border p-6 text-center ${H2O_TEAM_1} ${s.t1s >= s.t2s ? 'before:pointer-events-none before:absolute before:inset-[-2px] before:rounded-[inherit] before:border-2 before:border-amber-400/60 before:shadow-[0_0_26px_-4px_rgba(245,158,11,.45)]' : ''}`}>
              <p className="mb-1 font-bold text-[#ffe155]">{s.t1n}</p>
              <p className="text-3xl font-extrabold text-white">{s.t1s}</p>
              {s.t1s > s.t2s && <p className="mt-1 inline-flex items-center gap-1 text-xs text-amber-300"><HundredToOneIcon name="trophy" className="h-4 w-4" /> {l('Победитель!', 'Winner!')}</p>}
            </div>
            <div className={`relative flex-1 rounded-[var(--radius-xl)] border p-6 text-center ${H2O_TEAM_2} ${s.t2s > s.t1s ? 'before:pointer-events-none before:absolute before:inset-[-2px] before:rounded-[inherit] before:border-2 before:border-amber-400/60 before:shadow-[0_0_26px_-4px_rgba(245,158,11,.45)]' : ''}`}>
              <p className="mb-1 font-bold text-[#ff7a70]">{s.t2n}</p>
              <p className="text-3xl font-extrabold text-white">{s.t2s}</p>
              {s.t2s > s.t1s && <p className="mt-1 inline-flex items-center gap-1 text-xs text-amber-300"><HundredToOneIcon name="trophy" className="h-4 w-4" /> {l('Победитель!', 'Winner!')}</p>}
            </div>
          </div>
          <p className="text-white/50 mb-6">{l('Команда', 'Team')} &quot;{s.t1s >= s.t2s ? s.t1n : s.t2n}&quot; {l('играет Большую игру!', 'plays the Big Game!')}</p>
          {isGameHost && (
            <div className="flex gap-3 justify-center">
              <button type="button" className={H2O_SECONDARY_BUTTON} onClick={endGame}>{l('В лобби', 'To lobby')}</button>
              <button type="button" className={H2O_PRIMARY_BUTTON} onClick={() => update({ phase: 'bigGame', bgPhase: 0, bgP1Ans: [], bgP2Ans: [], bgP1Matched: [], bgP2Matched: [], bgFund: 0, bgCurQ: 0, bgP1Id: '', bgP2Id: '', winTeam: s.t1s >= s.t2s ? 1 : 2 })}>
                {l('БОЛЬШАЯ ИГРА', 'BIG GAME')} →
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── TEAM CHOOSER OVERLAY ── */}
      {teamChooser && isGameHost && s.curQ <= 2 && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center" onClick={() => setTeamChooser(false)}>
          <GlassCard className="p-8 max-w-sm text-center" onClick={undefined}>
            <h3 className="text-xl font-bold text-amber-400 mb-2">{l('КТО НАЧИНАЕТ?', 'WHO STARTS?')}</h3>
            <p className="text-white/50 text-sm mb-6">{roundNames[s.curQ]}</p>
            <div className="flex gap-4">
              <GlassButton className="flex-1 !border-yellow-400 !bg-yellow-500/10" onClick={() => chooseTeam(1)}>{s.t1n}</GlassButton>
              <GlassButton className="flex-1 !border-red-400 !bg-red-500/10" onClick={() => chooseTeam(2)}>{s.t2n}</GlassButton>
            </div>
          </GlassCard>
        </div>
      )}

      {/* ── ASSIGN MODAL (round 4) ── */}
      {assignModal && isGameHost && (
        (() => {
          const roundState = s.qState[s.curQ] || [];
          const team1Credited = roundState.some((a, ai) => ai !== assignModal.idx && a.to === 1);
          const team2Credited = roundState.some((a, ai) => ai !== assignModal.idx && a.to === 2);
          return (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center">
          <GlassCard className="p-6 max-w-sm text-center">
            <p className="text-amber-400 font-bold mb-1">{l('ОТВЕТ ОТКРЫТ!', 'ANSWER REVEALED!')}</p>
            <p className="text-3xl font-bold text-yellow-300 mb-4">+{assignModal.pts}</p>
            <p className="text-white/50 text-sm mb-4">{l('Какой команде записать очки?', 'Which team gets the points?')}</p>
            <div className="flex gap-3 mb-2">
              <GlassButton disabled={team1Credited} className="flex-1 !border-yellow-400 !bg-yellow-500/10 disabled:cursor-not-allowed disabled:opacity-35" onClick={() => assignPts(1)}>{s.t1n}</GlassButton>
              <GlassButton disabled={team2Credited} className="flex-1 !border-red-400 !bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-35" onClick={() => assignPts(2)}>{s.t2n}</GlassButton>
            </div>
            <button onClick={() => assignPts(0)} className="text-xs text-white/30 hover:text-white/60">{l('Никому', 'Nobody')}</button>
          </GlassCard>
        </div>
          );
        })()
      )}

      {/* ── BIG GAME ── */}
      {s.phase === 'bigGame' && (
        <div className="mx-auto w-full max-w-3xl py-4 animate-fade-in">
          <h2 className="mb-2 text-center text-[30px] font-extrabold tracking-[-.6px] text-amber-300">{l('БОЛЬШАЯ ИГРА', 'BIG GAME')}</h2>
          {isGameHost && s.bgPhase >= 1 && (
            <div className="mb-3 flex justify-center">
              <button type="button" className={`${H2O_SECONDARY_BUTTON} !border-red-300/45 !text-red-200`} onClick={resetBigGame}>{l('Сброс раунда', 'Reset round')}</button>
            </div>
          )}

          {/* Intro (bgPhase 0) — winning team picks 2 players */}
          {s.bgPhase === 0 && (() => {
            const winTeamRole = s.winTeam === 1 ? 'team1' : 'team2';
            const winTeamName = s.winTeam === 1 ? s.t1n : s.t2n;
            const winTeamPlayers = s.players.filter(p => s.roles[p.id] === winTeamRole);
            const captainId = s.winTeam === 1 ? s.captains.team1 : s.captains.team2;
            const isCaptain = effectivePlayerId === captainId;
            const bothPicked = !!s.bgP1Id && !!s.bgP2Id;
            const p1Name = s.players.find(p => p.id === s.bgP1Id)?.nickname;
            const p2Name = s.players.find(p => p.id === s.bgP2Id)?.nickname;
            return (
              <div className={`${H2O_GLASS_STRONG} rounded-[var(--radius-xl)] p-5 text-center`}>
                <p className="text-white/50 mb-4">{l('Команда', 'Team')} &quot;{winTeamName}&quot;: {l('капитан выбирает 2 игроков.', 'the captain chooses 2 players.')}<br/>{l('Игрок 1 — 30 сек, Игрок 2 — 40 сек.', 'Player 1 has 30 sec, Player 2 has 40 sec.')}<br/><span className="text-amber-400/60">{l('Второй не должен слышать ответы первого!', 'The second player must not hear the first player answers!')}</span></p>
                {isCaptain ? (
                  <div className="max-w-xl mx-auto space-y-4 mb-4">
                    <div>
                      <p className="text-xs text-yellow-400 font-bold mb-2">{l('ИГРОК 1 (30 СЕК)', 'PLAYER 1 (30 SEC)')}</p>
                      <div className="flex flex-wrap gap-2 justify-center">
                        {winTeamPlayers.map(p => (
                          <button key={p.id} onClick={() => bgSelectPlayer(1, p.id)}
                            className={`rounded-[var(--radius-md)] border px-4 py-2 text-sm font-bold transition-all
                              ${s.bgP1Id === p.id ? 'border-yellow-300 bg-yellow-500/30 text-yellow-100' : 'border-white/20 bg-white/[.05] text-white/60 hover:border-yellow-300/60'}`}>
                            {p.nickname}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-amber-400 font-bold mb-2">{l('ИГРОК 2 (40 СЕК)', 'PLAYER 2 (40 SEC)')}</p>
                      <div className="flex flex-wrap gap-2 justify-center">
                        {winTeamPlayers.map(p => (
                          <button key={p.id} onClick={() => bgSelectPlayer(2, p.id)}
                            className={`rounded-[var(--radius-md)] border px-4 py-2 text-sm font-bold transition-all
                              ${s.bgP2Id === p.id ? 'border-amber-300 bg-amber-500/30 text-amber-100' : 'border-white/20 bg-white/[.05] text-white/60 hover:border-amber-300/60'}`}>
                            {p.nickname}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="mb-4 text-sm text-white/50">
                    <p>{l('Игрок 1:', 'Player 1:')} <span className="text-yellow-300 font-bold">{p1Name || '—'}</span></p>
                    <p>{l('Игрок 2:', 'Player 2:')} <span className="text-amber-300 font-bold">{p2Name || '—'}</span></p>
                    {!bothPicked && <p className="text-xs text-white/30 mt-2">{l('Капитан выбирает игроков...', 'Captain is choosing players...')}</p>}
                  </div>
                )}
                {isGameHost && (
                  <button type="button" className={H2O_PRIMARY_BUTTON} disabled={!bothPicked} onClick={() => bgStartPlayer(1)}>
                    {bothPicked ? l('НАЧАТЬ (ИГРОК 1 — 30 сек)', 'START (PLAYER 1 — 30 sec)') : l('Ждём выбора игроков...', 'Waiting for player selection...')}
                  </button>
                )}
              </div>
            );
          })()}

          {/* Player label */}
          {s.bgPhase >= 1 && s.bgPhase <= 4 && (
            <p className="mb-2 text-center font-mono text-[12px] font-bold uppercase tracking-[2px] text-amber-200">
              {s.bgPhase === 1 ? l('ИГРОК 1 — 30 секунд', 'PLAYER 1 — 30 seconds') : s.bgPhase === 2 ? l('ПРОВЕРКА ОТВЕТОВ ИГРОКА 1', 'CHECKING PLAYER 1 ANSWERS') : s.bgPhase === 3 ? l('ИГРОК 2 — 40 секунд', 'PLAYER 2 — 40 seconds') : l('ПРОВЕРКА ОТВЕТОВ ИГРОКА 2', 'CHECKING PLAYER 2 ANSWERS')}
            </p>
          )}

          {/* Fund */}
          {s.bgPhase >= 1 && (
            <p className={`mb-3 text-center text-3xl font-extrabold ${s.bgFund >= 200 ? 'animate-pulse text-green-300' : 'text-amber-200'}`}>
              {l('ФОНД:', 'FUND:')} {s.bgFund}
            </p>
          )}

          {/* Active player input: show only current question + timer */}
          {(s.bgPhase === 1 || s.bgPhase === 3) && s.bgTimeLeft > 0 && s.bgCurQ < 5 &&
            (s.bgPhase === 1 ? effectivePlayerId === s.bgP1Id : effectivePlayerId === s.bgP2Id) && (
            <div className="mb-3">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <div className="font-mono text-[12px] font-bold uppercase tracking-[2px] text-amber-200">
                    {l('Большая игра', 'Big Game')} · {s.bgPhase === 1 ? l('Игрок 1', 'Player 1') : l('Игрок 2', 'Player 2')}
                  </div>
                  <div className="mt-0.5 text-[12.5px] text-white/45">
                    {s.players.find(p => p.id === (s.bgPhase === 1 ? s.bgP1Id : s.bgP2Id))?.nickname || '—'}, {l('отвечай быстро — первое, что придёт в голову', 'answer fast — first thing that comes to mind')}
                  </div>
                </div>
                <div className={`${H2O_GLASS} inline-flex items-center gap-2 rounded-full px-4 py-[9px] text-[22px] font-extrabold text-amber-100`}>
                  <HundredToOneIcon name="timer" className="h-[19px] w-[19px] text-amber-400" />
                  {Math.floor(s.bgTimeLeft / 60)}:{(s.bgTimeLeft % 60).toString().padStart(2, '0')}
                </div>
              </div>
              <div className="mb-3 flex gap-1.5">
                {[0, 1, 2, 3, 4].map(i => (
                  <span key={i} className={`h-[5px] flex-1 rounded-[3px] ${i < s.bgCurQ ? 'bg-amber-500/75' : i === s.bgCurQ ? 'bg-amber-200 shadow-[0_0_10px_rgba(245,158,11,.7)]' : 'bg-white/10'}`} />
                ))}
              </div>
              <div className={`${H2O_GLASS_STRONG} mb-3 flex flex-col gap-2 rounded-[var(--radius-xl)] p-[18px]`}>
                <span className="font-mono text-[11px] uppercase tracking-[3px] text-amber-400">{l('Вопрос', 'Question')} {s.bgCurQ + 1} {l('из', 'of')} 5</span>
                <span className="text-balance text-[23px] font-extrabold leading-[1.2] tracking-[-.4px]">{BIG_Q[s.bgCurQ].q}</span>
              </div>
              <div className="text-center">
                <input value={bgInput} onChange={e => { setBgInput(e.target.value); bgPauseTimer(); }}
                  onKeyDown={e => { if (e.key === 'Enter') { bgResumeTimer(); bgSubmitAnswer(); } }}
                  placeholder={l('Твой ответ…', 'Your answer...')} autoFocus
                  className="h-[58px] w-full max-w-md rounded-[var(--radius-lg)] border border-amber-300/50 bg-white/[.12] px-[18px] text-center text-[19px] font-bold text-white shadow-[0_0_0_4px_rgba(245,158,11,.1)] outline-none placeholder:text-white/25 focus:border-amber-200" />
                {bgDupMsg
                  ? <p className="text-sm text-red-400 font-bold mt-1 animate-pulse">{l('Этот ответ уже был!', 'This answer was already used!')}</p>
                  : <p className="mt-2 text-xs text-white/30">{l('Таймер на паузе · Enter — отправить', 'Timer paused · Enter to send')}</p>}
              </div>
            </div>
          )}

          {/* Everyone else (non-active player): questions list + status */}
          {!(
            (s.bgPhase === 1 || s.bgPhase === 3) && s.bgTimeLeft > 0 && s.bgCurQ < 5 &&
            (s.bgPhase === 1 ? effectivePlayerId === s.bgP1Id : effectivePlayerId === s.bgP2Id)
          ) && s.bgPhase >= 1 && (
            <>
              <div className="mb-3 space-y-[7px]">
                {BIG_Q.map((qq, i) => {
                  const ans = s.bgPhase <= 2 ? s.bgP1Ans[i] : s.bgP2Ans[i];
                  const matched = s.bgPhase <= 2 ? s.bgP1Matched[i] : s.bgP2Matched[i];
                  const isChecked = s.bgPhase === 2 || s.bgPhase === 4;
                  return (
                    <div key={i} className={`${H2O_GLASS} rounded-[var(--radius-md)] p-3`}>
                      <div className="flex items-center gap-2">
                        <span className="w-4 font-mono text-[12px] font-bold text-white/25">{i + 1}</span>
                        <span className="text-sm font-bold flex-1">{qq.q}</span>
                        <span className={`text-sm font-bold min-w-[80px] text-right ${ans ? 'text-yellow-300' : 'text-white/30 italic'}`}>
                          {ans || '...'}
                        </span>
                        {isChecked && (
                          <span className={`font-bold text-sm min-w-[40px] text-right ${matched ? 'text-green-400' : 'text-red-400'}`}>
                            {matched ? `+${qq.answers.find(a => a.t === matched)?.p || 0}` : '✗'}
                          </span>
                        )}
                      </div>
                      {/* Show all answers in check phase — host can click, players read-only */}
                      {isChecked && (
                        <div className="flex flex-wrap gap-1 mt-2 pt-2 border-t border-white/5">
                          {qq.answers.map((a, ai) => {
                            const usedByP1 = s.bgPhase === 4 && s.bgP1Matched[i] === a.t;
                            const isSelected = matched === a.t;
                            return isGameHost ? (
                              <button key={ai} disabled={usedByP1 && !isSelected}
                                onClick={() => bgManualCredit(i, ai, s.bgPhase === 2)}
                                className={`text-xs px-2 py-0.5 rounded border transition-all
                                  ${isSelected
                                    ? 'bg-green-500/30 text-green-300 border-green-400 font-bold'
                                    : usedByP1
                                      ? 'opacity-30 line-through border-white/10 text-white/30'
                                      : 'border-dashed border-white/20 text-white/50 hover:bg-green-500/20 hover:text-green-400 hover:border-green-400 cursor-pointer'}`}>
                                {a.t} ({a.p})
                              </button>
                            ) : (
                              <span key={ai}
                                className={`text-xs px-2 py-0.5 rounded border transition-all
                                  ${isSelected
                                    ? 'bg-green-500/30 text-green-300 border-green-400 font-bold'
                                    : usedByP1
                                      ? 'opacity-30 line-through border-white/10 text-white/30'
                                      : 'border-white/10 text-white/40'}`}>
                                {a.t} ({a.p})
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Non-active player waiting status during input phase */}
              {(s.bgPhase === 1 || s.bgPhase === 3) && s.bgTimeLeft > 0 && s.bgCurQ < 5 && (
                <div className="text-center mb-3">
                  <p className="text-sm text-white/40">
                    {l('Отвечает:', 'Answering:')} <span className="text-yellow-300 font-bold">
                      {s.players.find(p => p.id === (s.bgPhase === 1 ? s.bgP1Id : s.bgP2Id))?.nickname || '—'}
                    </span>
                  </p>
                  <p className="text-xs text-white/30 mt-1">{l('Вопрос', 'Question')} {s.bgCurQ + 1}/5</p>
                </div>
              )}
            </>
          )}

          {/* Manual transition to check phase */}
          {isGameHost && (s.bgPhase === 1 || s.bgPhase === 3) && (s.bgCurQ >= 5 || s.bgTimeLeft === 0) && (
            <div className="text-center mb-3">
              <button type="button" className={H2O_PRIMARY_BUTTON} onClick={bgGoToCheck}>{l('ПЕРЕЙТИ К ПРОВЕРКЕ', 'GO TO CHECK')} →</button>
            </div>
          )}

          {/* Action buttons */}
          {isGameHost && s.bgPhase === 2 && (
            <div className="text-center flex items-center justify-center gap-3">
              <button type="button" className={H2O_PRIMARY_BUTTON} onClick={() => bgStartPlayer(2)}>{l('ИГРОК 2 (40 сек)', 'PLAYER 2 (40 sec)')} →</button>
            </div>
          )}
          {isGameHost && s.bgPhase === 4 && (
            <div className="text-center flex items-center justify-center gap-3">
              <button type="button" className={H2O_PRIMARY_BUTTON} onClick={bgShowResult}>{l('РЕЗУЛЬТАТ', 'RESULT')} →</button>
            </div>
          )}
        </div>
      )}

      {/* ── FINAL ── */}
      {s.phase === 'final' && (
        <div className="py-10 text-center animate-fade-in">
          <div className={`${H2O_ACCENT} mx-auto mb-3 flex h-[88px] w-[88px] items-center justify-center rounded-[26px] text-[#341f02]`}>
            <HundredToOneIcon name="trophy" className="h-12 w-12" strokeWidth={1.6} />
          </div>
          {s.bgFund >= 200 ? (
            <>
              <h2 className="mb-2 bg-[linear-gradient(180deg,#fde68a_10%,#f59e0b_60%,#d97706_95%)] bg-clip-text text-[40px] font-extrabold leading-none tracking-[-1.5px] text-transparent">{l('ПОБЕДА!', 'VICTORY!')}</h2>
              <div className="mb-6 inline-flex items-center gap-[9px] text-[20px] font-extrabold">
                <TeamDot team={s.winTeam === 1 ? 1 : 2} />
                {s.winTeam === 1 ? s.t1n : s.t2n} {l('забирают игру', 'win the game')}
              </div>
            </>
          ) : (
            <>
              <h2 className="mb-2 text-[34px] font-extrabold tracking-[-.8px] text-amber-300">{l('ИГРА ОКОНЧЕНА', 'GAME OVER')}</h2>
              <p className="mb-6 text-white/50">{l('Не хватило до 200. Отличная игра!', 'Not enough to reach 200. Great game!')}</p>
            </>
          )}
          <div className={`${H2O_GLASS_STRONG} mx-auto mb-6 grid max-w-md grid-cols-[1fr_auto_1fr_auto_1.2fr] items-center gap-2 rounded-[var(--radius-xl)] px-4 py-[14px]`}>
            <div className="flex flex-col items-center gap-0.5">
              <span className="text-center font-mono text-[9.5px] uppercase tracking-[1.5px] text-white/30">{s.players.find(p => p.id === s.bgP1Id)?.nickname || l('Игрок 1', 'Player 1')}</span>
              <span className="text-[24px] font-extrabold">{s.bgP1Matched.reduce((sum, m, i) => sum + (m ? BIG_Q[i]?.answers.find(a => a.t === m)?.p || 0 : 0), 0)}</span>
            </div>
            <span className="text-[20px] font-extrabold text-white/25">+</span>
            <div className="flex flex-col items-center gap-0.5">
              <span className="text-center font-mono text-[9.5px] uppercase tracking-[1.5px] text-white/30">{s.players.find(p => p.id === s.bgP2Id)?.nickname || l('Игрок 2', 'Player 2')}</span>
              <span className="text-[24px] font-extrabold">{s.bgP2Matched.reduce((sum, m, i) => sum + (m ? BIG_Q[i]?.answers.find(a => a.t === m)?.p || 0 : 0), 0)}</span>
            </div>
            <span className="text-[20px] font-extrabold text-white/25">=</span>
            <div className="flex flex-col items-center gap-0.5">
              <span className="text-center font-mono text-[9.5px] uppercase tracking-[1.5px] text-green-300/80">{l('Фонд · цель 200', 'Fund · goal 200')}</span>
              <span className={`text-[24px] font-extrabold ${s.bgFund >= 200 ? 'text-green-300 drop-shadow-[0_0_18px_rgba(48,209,88,.45)]' : 'text-amber-200'}`}>{s.bgFund}</span>
            </div>
          </div>
          {isGameHost && (
            <div className="mx-auto flex max-w-md flex-col gap-[9px]">
              <button type="button" className={H2O_PRIMARY_BUTTON} onClick={playAgain}>{l('Сыграть ещё раз', 'Play again')}</button>
              <button type="button" className={H2O_SECONDARY_BUTTON} onClick={endGame}>{l('В лобби', 'To lobby')}</button>
            </div>
          )}
        </div>
      )}

    </GameLayout>
  );
}
