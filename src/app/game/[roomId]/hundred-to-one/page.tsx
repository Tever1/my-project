'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslation } from '@/lib/i18n';
import { useAuth } from '@/lib/auth-context';
import { useSocket } from '@/lib/use-socket';
import { GameLayout } from '@/components/games/GameLayout';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { ROUNDS, ROUND_NAMES, ROUND_MULT, REVERSE_PTS, BIG_Q, getDisplayPts } from '@/lib/hundred-to-one/questions';
import { sndReveal, sndClose, sndAssign, sndBuzz, sndTick, sndWin, sndDup, warmup } from '@/lib/hundred-to-one/sounds';

// ── Types ────────────────────────────────────────────────────────────────────

interface GamePlayer { id: string; nickname: string; isHost: boolean; }

// Answer state per cell: rev=revealed to host, pub=published to players, to=assigned team
interface AnsState { rev: boolean; pub: boolean; to: number; }

type Phase = 'roleSelect' | 'teamNames' | 'captainSelect' | 'title' | 'buzzer' | 'buzzerResult' | 'teams' | 'rules' | 'playing' | 'results' | 'bigGame' | 'final';
type PlayerRole = 'team1' | 'team2' | 'host' | 'tv';

interface GState {
  phase: Phase;
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
  // God mode
  godMode: boolean;
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
  winTeam: number;
  players: GamePlayer[];
  roles: Record<string, PlayerRole>; // playerId -> role
  captains: { team1?: string; team2?: string }; // playerId of captain per team
  captainConfirmed: { team1: boolean; team2: boolean };
  buzzerWinner: number; // 0=none, 1=team1, 2=team2
  buzzerActive: boolean; // can captains press?
}

const mkInitial = (): GState => ({
  phase: 'roleSelect', curQ: 0,
  t1n: 'Команда 1', t2n: 'Команда 2',
  t1s: 0, t2s: 0,
  qState: ROUNDS.map(r => r.answers.map(() => ({ rev: false, pub: false, to: 0 }))),
  strikes: [[0, 0], [0, 0], [0, 0]],
  roundBusted: [[false, false], [false, false], [false, false]],
  roundActiveTeam: [0, 0, 0],
  roundFund: [0, 0, 0],
  roundWonBy: [0, 0, 0],
  roundPhase: ['start', 'start', 'start'],
  r4Time: 60, r4Running: false,
  godMode: false,
  bgPhase: 0, bgP1Ans: [], bgP2Ans: [],
  bgP1Matched: [], bgP2Matched: [],
  bgFund: 0, bgCurQ: 0,
  bgTimeLeft: 0, bgTimerTotal: 0, bgTimerPaused: false,
  winTeam: 0,
  players: [],
  roles: {},
  captains: {},
  captainConfirmed: { team1: false, team2: false },
  buzzerWinner: 0,
  buzzerActive: false,
});

// ── Component ────────────────────────────────────────────────────────────────

export default function HundredToOnePage() {
  const { roomId } = useParams<{ roomId: string }>();
  const { locale } = useTranslation();
  const { user } = useAuth();
  const { emit, on } = useSocket();
  const router = useRouter();

  const [s, setS] = useState<GState>(mkInitial);
  const [teamChooser, setTeamChooser] = useState(false);
  const [assignModal, setAssignModal] = useState<{ idx: number; pts: number } | null>(null);
  const [reassignModal, setReassignModal] = useState<{ idx: number; pts: number; cur: number } | null>(null);
  const [bgInput, setBgInput] = useState('');
  const r4Ref = useRef<ReturnType<typeof setInterval> | null>(null);
  const bgTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isHost = s.players.find(p => p.id === user?.id)?.isHost ?? false;
  const myRole: PlayerRole | null = user?.id ? s.roles[user.id] || null : null;
  const isGameHost = myRole === 'host'; // game host (ведущий), not room host
  const q = ROUNDS[s.curQ];

  // ── Role selection ──
  const selectRole = (role: PlayerRole) => {
    if (!user?.id) return;
    const newRoles = { ...s.roles, [user.id]: role };
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
    update({ captains: newCaptains, captainConfirmed: newConfirmed, ...(bothConfirmed ? { phase: 'title' } : {}) });
    setSelectedCaptain(null);
  };

  // ── Socket ──
  useEffect(() => {
    const u1 = on('room:state', (data: unknown) => {
      const room = data as { players: GamePlayer[] };
      setS(prev => ({ ...prev, players: room.players }));
    });
    const u2 = on('game:action', (data: unknown) => {
      const { action, payload } = data as { action: string; payload: Partial<GState> };
      if (action === 'h2o:sync') setS(prev => ({ ...prev, ...payload }));
    });
    const u3 = on('game:ended', () => router.push(`/lobby/${roomId}`));
    emit('room:get-state', { code: roomId });
    return () => { u1(); u2(); u3(); };
  }, [on, emit, router, roomId]);

  const broadcast = useCallback((payload: Partial<GState>) => {
    emit('game:action', { code: roomId, action: 'h2o:sync', payload });
  }, [emit, roomId]);

  const update = useCallback((patch: Partial<GState>) => {
    setS(prev => ({ ...prev, ...patch }));
    broadcast(patch);
  }, [broadcast]);

  // ── Host actions ──
  const goToTeamNames = () => {
    update({ phase: 'teamNames' });
  };

  const confirmTeamNames = () => {
    const n1 = teamNameInput1.trim() || 'Команда 1';
    const n2 = teamNameInput2.trim() || 'Команда 2';
    update({ t1n: n1, t2n: n2, phase: 'captainSelect', captains: {}, captainConfirmed: { team1: false, team2: false } });
  };

  const startGame = () => {
    warmup();
    const init = mkInitial();
    const patch: Partial<GState> = {
      ...init, phase: 'buzzer', players: s.players, roles: s.roles,
      t1n: s.t1n, t2n: s.t2n, captains: s.captains,
      captainConfirmed: s.captainConfirmed, buzzerWinner: 0, buzzerActive: false,
    };
    setS(prev => ({ ...prev, ...patch }));
    broadcast(patch);
  };

  const startBuzzer = () => {
    update({ buzzerActive: true, buzzerWinner: 0 });
  };

  const buzzerPressed = (team: number) => {
    if (!s.buzzerActive || s.buzzerWinner !== 0) return;
    sndBuzz();
    update({ buzzerWinner: team, buzzerActive: false });
    // After 3 seconds go to playing, with winning team as active
    setTimeout(() => {
      setS(prev => {
        const newActive = prev.roundActiveTeam.map((v, i) => i === prev.curQ ? team : v);
        return { ...prev, phase: 'playing', roundActiveTeam: newActive };
      });
      broadcast({ phase: 'playing', roundActiveTeam: (() => {
        const arr = [0, 0, 0];
        arr[0] = team; return arr;
      })() });
    }, 3000);
  };

  // ── Open/close answer ──
  const openAns = (idx: number) => {
    if (!isGameHost) return;
    const st = s.qState[s.curQ][idx];
    if (st.rev) {
      if (s.godMode) {
        const pts = getDisplayPts(s.curQ, idx, q.answers[idx].p);
        setReassignModal({ idx, pts, cur: st.to });
        return;
      }
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
      setS(prev => ({ ...prev, qState: newQState }));
      broadcast({ qState: newQState });
      setAssignModal({ idx, pts });
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

  // Publish/unpublish answer visibility to players (without affecting game logic)
  const pubAns = (idx: number) => {
    if (!isGameHost) return;
    const newQState = s.qState.map((r, ri) => ri === s.curQ ? r.map((a, ai) => ai === idx ? { ...a, pub: !a.pub } : a) : r);
    update({ qState: newQState });
  };

  const assignPts = (team: number) => {
    if (!assignModal) return;
    const { idx, pts } = assignModal;
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
    const newBusted = s.roundBusted.map((r, ri) => [...r]);
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
    update({ curQ: next });
    if (next <= 2) setTeamChooser(true);
  };

  const prevRound = () => {
    if (s.curQ > 0) update({ curQ: s.curQ - 1 });
  };

  const endGame = () => emit('game:end', { code: roomId });

  // ── Round 4 timer (1 min discussion) ──
  const r4Start = () => {
    if (r4Ref.current) return;
    update({ r4Running: true });
    r4Ref.current = setInterval(() => {
      setS(prev => {
        const t = prev.r4Time - 1;
        if (t <= 10 && t > 0) sndTick();
        if (t <= 0) { r4Stop(); sndBuzz(); return { ...prev, r4Time: 0, r4Running: false }; }
        return { ...prev, r4Time: t };
      });
    }, 1000);
  };
  const r4Pause = () => { if (r4Ref.current) { clearInterval(r4Ref.current); r4Ref.current = null; } update({ r4Running: false }); };
  const r4Stop = () => { if (r4Ref.current) { clearInterval(r4Ref.current); r4Ref.current = null; } };
  const r4Reset = () => { r4Stop(); update({ r4Time: 60, r4Running: false }); };

  // ── God mode reassign ──
  const reassignPts = (target: number) => {
    if (!reassignModal) return;
    const { idx, pts, cur } = reassignModal;
    let newT1s = s.t1s, newT2s = s.t2s;
    const newFund = [...s.roundFund];
    // Remove from previous
    if (cur === 1) newT1s -= pts;
    else if (cur === 2) newT2s -= pts;
    else if (cur === -1 && s.curQ <= 2) {
      if ((s.roundPhase[s.curQ] === 'won' || s.roundPhase[s.curQ] === 'showonly') && s.roundWonBy[s.curQ] > 0) {
        if (s.roundWonBy[s.curQ] === 1) newT1s -= pts; else newT2s -= pts;
      }
      newFund[s.curQ] -= pts;
    }
    // Assign to new
    if (target === 1) { newT1s += pts; sndAssign(); }
    else if (target === 2) { newT2s += pts; sndAssign(); }
    else if (target === -1 && s.curQ <= 2) {
      newFund[s.curQ] += pts;
      if ((s.roundPhase[s.curQ] === 'won' || s.roundPhase[s.curQ] === 'showonly') && s.roundWonBy[s.curQ] > 0) {
        if (s.roundWonBy[s.curQ] === 1) newT1s += pts; else newT2s += pts;
      }
      sndAssign();
    }
    const newQState = s.qState.map((r, ri) => ri === s.curQ ? r.map((a, ai) => ai === idx ? { ...a, to: target } : a) : r);
    setReassignModal(null);
    update({ qState: newQState, t1s: newT1s, t2s: newT2s, roundFund: newFund });
  };

  // ── Big Game ──
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
          // Fill remaining with '—'
          const ans = prev.bgPhase === 1 ? [...prev.bgP1Ans] : [...prev.bgP2Ans];
          while (ans.length < 5) ans.push('—');
          return { ...prev, bgTimeLeft: 0, bgPhase: prev.bgPhase === 1 ? 2 : 4, ...(prev.bgPhase === 1 ? { bgP1Ans: ans } : { bgP2Ans: ans }) };
        }
        return { ...prev, bgTimeLeft: t };
      });
    }, 1000);
  };

  const bgSubmitAnswer = () => {
    const v = bgInput.trim();
    if (!v) return;
    // Check duplicate with P1 in phase 3
    if (s.bgPhase === 3 && s.bgCurQ < 5) {
      const p1 = s.bgP1Ans[s.bgCurQ] || '';
      const aLow = v.toLowerCase(), p1Low = p1.toLowerCase();
      if (aLow === p1Low || (aLow.length > 2 && p1Low.length > 2 && (aLow.includes(p1Low) || p1Low.includes(aLow)))) {
        sndDup(); setBgInput(''); return;
      }
    }
    setBgInput('');
    setS(prev => {
      const ans = prev.bgPhase === 1 ? [...prev.bgP1Ans, v] : [...prev.bgP2Ans, v];
      const nextQ = prev.bgCurQ + 1;
      if (nextQ >= 5) {
        if (bgTimerRef.current) { clearInterval(bgTimerRef.current); bgTimerRef.current = null; }
        return { ...prev, bgCurQ: nextQ, bgPhase: prev.bgPhase === 1 ? 2 : 4, bgTimeLeft: 0, ...(prev.bgPhase === 1 ? { bgP1Ans: ans } : { bgP2Ans: ans }) };
      }
      return { ...prev, bgCurQ: nextQ, ...(prev.bgPhase === 1 ? { bgP1Ans: ans } : { bgP2Ans: ans }) };
    });
  };

  // Check answers against BIG_Q and calculate points
  const bgCheckAnswers = (answers: string[], isP1: boolean): { matched: (string | null)[]; points: number } => {
    let total = 0;
    const matched: (string | null)[] = [];
    answers.forEach((ans, i) => {
      const qq = BIG_Q[i];
      const ansLow = ans.toLowerCase().trim();
      let match: { t: string; p: number } | null = null;
      for (const a of qq.answers) {
        const aLow = a.t.toLowerCase();
        if (aLow.includes(ansLow) || ansLow.includes(aLow)) {
          if (!isP1) { const p1Low = (s.bgP1Ans[i] || '').toLowerCase(); if (aLow.includes(p1Low) || p1Low.includes(aLow)) continue; }
          match = a; break;
        }
      }
      if (match) { total += match.p; matched.push(match.t); } else { matched.push(null); }
    });
    return { matched, points: total };
  };

  const bgDoCheck = (isP1: boolean) => {
    const ans = isP1 ? s.bgP1Ans : s.bgP2Ans;
    const { matched, points } = bgCheckAnswers(ans, isP1);
    const newFund = s.bgFund + points;
    if (isP1) update({ bgP1Matched: matched, bgFund: newFund });
    else update({ bgP2Matched: matched, bgFund: newFund });
  };

  const bgManualCredit = (qIdx: number, ansIdx: number, isP1: boolean) => {
    const pts = BIG_Q[qIdx].answers[ansIdx].p;
    const matchedArr = isP1 ? [...s.bgP1Matched] : [...s.bgP2Matched];
    matchedArr[qIdx] = BIG_Q[qIdx].answers[ansIdx].t;
    sndAssign();
    if (isP1) update({ bgP1Matched: matchedArr, bgFund: s.bgFund + pts });
    else update({ bgP2Matched: matchedArr, bgFund: s.bgFund + pts });
  };

  const bgShowResult = () => {
    if (s.bgFund >= 200) sndWin();
    update({ phase: 'final', bgPhase: 5 });
  };

  // Pause/resume timer on typing
  const bgPauseTimer = () => { if (s.bgPhase === 1 || s.bgPhase === 3) setS(prev => ({ ...prev, bgTimerPaused: true })); };
  const bgResumeTimer = () => { if (s.bgPhase === 1 || s.bgPhase === 3) setS(prev => ({ ...prev, bgTimerPaused: false })); };

  // ── Derived ──
  const scores = [{ name: s.t1n, score: s.t1s }, { name: s.t2n, score: s.t2s }];
  const allRevealed = q ? s.qState[s.curQ]?.every(a => a.rev) : false;
  const canNext = allRevealed || s.roundPhase[s.curQ] === 'won' || s.roundPhase[s.curQ] === 'showonly' || s.roundPhase[s.curQ] === 'switched';

  // ── RENDER ──
  return (
    <GameLayout title="100 к 1" icon="💯"
      round={s.phase === 'playing' ? s.curQ + 1 : undefined}
      totalRounds={s.phase === 'playing' ? 4 : undefined}
      scores={scores} onEnd={(isHost || isGameHost) ? endGame : undefined}
      showScoreboard={s.phase === 'playing' || s.phase === 'results'}>

      {/* ── ROLE SELECT ── */}
      {s.phase === 'roleSelect' && (
        <div className="max-w-lg mx-auto text-center py-8 animate-fade-in">
          <div className="text-6xl mb-4">💯</div>
          <h2 className="text-2xl font-bold text-amber-400 mb-6">Выберите свою роль</h2>
          <div className="grid grid-cols-3 gap-3 mb-4">
            {(['team1', 'team2', 'host'] as PlayerRole[]).map(role => {
              const cfg = {
                team1: { icon: '🟡', label: 'Команда 1', color: 'yellow', ring: 'ring-yellow-400 bg-yellow-500/15', text: 'text-yellow-400' },
                team2: { icon: '🔴', label: 'Команда 2', color: 'red', ring: 'ring-red-400 bg-red-500/15', text: 'text-red-400' },
                host:  { icon: '🎙️', label: 'Ведущий', color: 'amber', ring: 'ring-amber-400 bg-amber-500/15', text: 'text-amber-400' },
              }[role];
              const members = s.players.filter(p => s.roles[p.id] === role);
              return (
                <GlassCard key={role} hover
                  className={`p-4 cursor-pointer transition-all ${myRole === role ? `ring-2 ${cfg.ring}` : ''}`}
                  onClick={() => selectRole(role)}>
                  <div className="text-2xl mb-1">{cfg.icon}</div>
                  <p className={`font-bold ${cfg.text}`}>{cfg.label}</p>
                  {members.length === 0
                    ? <p className="text-xs text-white/25 mt-1">никого нет</p>
                    : <div className="mt-1.5 space-y-0.5">
                        {members.map(p => (
                          <p key={p.id} className={`text-xs ${myRole === role && p.id === user?.id ? 'text-white font-bold' : 'text-white/50'}`}>
                            {p.id === user?.id ? '→ ' : ''}{p.nickname || '?'}
                          </p>
                        ))}
                      </div>
                  }
                </GlassCard>
              );
            })}
          </div>
          {isHost && Object.keys(s.roles).length > 0 && (
            <GlassButton variant="primary" size="lg" onClick={goToTeamNames}>Далее →</GlassButton>
          )}
        </div>
      )}

      {/* ── TEAM NAMES ── */}
      {s.phase === 'teamNames' && (
        <div className="max-w-md mx-auto text-center py-8 animate-fade-in">
          <h2 className="text-2xl font-bold text-amber-400 mb-6">НАЗВАНИЯ КОМАНД</h2>
          {isGameHost || isHost ? (
            <>
              <div className="space-y-4 mb-6">
                <div className="flex items-center gap-3">
                  <span className="w-4 h-4 rounded-full bg-yellow-400" />
                  <input value={teamNameInput1} onChange={e => setTeamNameInput1(e.target.value)}
                    placeholder="Команда 1" maxLength={20}
                    className="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/15 text-white font-bold outline-none focus:border-amber-400" />
                </div>
                <div className="flex items-center gap-3">
                  <span className="w-4 h-4 rounded-full bg-red-500" />
                  <input value={teamNameInput2} onChange={e => setTeamNameInput2(e.target.value)}
                    placeholder="Команда 2" maxLength={20}
                    className="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/15 text-white font-bold outline-none focus:border-amber-400" />
                </div>
              </div>
              <GlassButton variant="primary" size="lg" onClick={confirmTeamNames}>ДАЛЕЕ</GlassButton>
            </>
          ) : (
            <p className="text-white/40 italic">Ведущий вводит названия команд...</p>
          )}
        </div>
      )}

      {/* ── CAPTAIN SELECT ── */}
      {s.phase === 'captainSelect' && (
        <div className="max-w-md mx-auto text-center py-6 animate-fade-in">
          <h2 className="text-2xl font-bold text-amber-400 mb-2">ВЫБОР КАПИТАНА</h2>

          {/* View for team players */}
          {myTeam && (() => {
            const myTeamPlayers = s.players.filter(p => s.roles[p.id] === myTeam);
            const confirmed = s.captainConfirmed[myTeam];
            const teamColor = myTeam === 'team1' ? 'text-yellow-400' : 'text-red-400';
            const teamName = myTeam === 'team1' ? s.t1n : s.t2n;
            return (
              <div>
                <p className={`font-bold text-lg mb-4 ${teamColor}`}>{teamName}</p>
                {confirmed ? (
                  <div className="text-center py-6">
                    <div className="text-4xl mb-3">✅</div>
                    <p className="text-green-400 font-bold">Капитан выбран!</p>
                    <p className="text-white/40 text-sm mt-1">
                      {myTeam === 'team1' ? (s.captainConfirmed.team2 ? '' : 'Ждём выбора второй команды...') : (s.captainConfirmed.team1 ? '' : 'Ждём выбора второй команды...')}
                    </p>
                  </div>
                ) : (
                  <>
                    <p className="text-white/50 text-sm mb-4">Нажмите на имя, чтобы выбрать капитана</p>
                    <div className="space-y-2 mb-6">
                      {myTeamPlayers.map(p => (
                        <div key={p.id}
                          onClick={() => setSelectedCaptain(p.id)}
                          className={`glass-card p-4 cursor-pointer flex items-center gap-3 transition-all ${selectedCaptain === p.id ? 'ring-2 ring-red-500 bg-red-500/15' : 'hover:bg-white/10'}`}>
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center text-lg font-bold transition-all ${selectedCaptain === p.id ? 'bg-red-500 text-white' : 'bg-white/10 text-white/50'}`}>
                            {selectedCaptain === p.id ? '⭐' : p.nickname[0]?.toUpperCase() || '?'}
                          </div>
                          <span className={`font-bold ${selectedCaptain === p.id ? 'text-white' : 'text-white/70'}`}>{p.nickname}</span>
                          {p.id === user?.id && <span className="text-xs text-white/30 ml-auto">вы</span>}
                        </div>
                      ))}
                    </div>
                    {selectedCaptain && (
                      <GlassButton variant="primary" size="lg" onClick={confirmCaptain}>
                        ПОДТВЕРДИТЬ КАПИТАНА
                      </GlassButton>
                    )}
                  </>
                )}
              </div>
            );
          })()}

          {/* View for host */}
          {isGameHost && (
            <div className="mt-4">
              <p className="text-white/40 text-sm mb-3">Статус выбора капитанов:</p>
              <div className="flex gap-4 justify-center">
                <div className={`glass-card px-4 py-2 text-sm ${s.captainConfirmed.team1 ? 'text-green-400' : 'text-white/40'}`}>
                  {s.t1n}: {s.captainConfirmed.team1 ? '✓ выбран' : '⏳ ждём'}
                </div>
                <div className={`glass-card px-4 py-2 text-sm ${s.captainConfirmed.team2 ? 'text-green-400' : 'text-white/40'}`}>
                  {s.t2n}: {s.captainConfirmed.team2 ? '✓ выбран' : '⏳ ждём'}
                </div>
              </div>
              {/* Host can skip if needed */}
              <button onClick={() => update({ phase: 'title' })} className="mt-4 text-xs text-white/25 hover:text-white/50">
                Пропустить →
              </button>
            </div>
          )}

          {/* View for TV/no-role */}
          {!myTeam && !isGameHost && (
            <p className="text-white/40 italic mt-4">Команды выбирают капитанов...</p>
          )}
        </div>
      )}

      {/* ── TITLE ── */}
      {s.phase === 'title' && (
        <div className="text-center py-12 animate-fade-in">
          <div className="text-8xl mb-6">💯</div>
          <h2 className="text-4xl font-bold text-white mb-2" style={{ fontFamily: 'Russo One, sans-serif' }}>100 к 1</h2>
          <p className="text-white/50 mb-2 text-lg">Телеигра</p>
          <p className="text-white/30 text-sm mb-8">{s.t1n} vs {s.t2n}</p>
          {(isHost || isGameHost) ? (
            <GlassButton variant="primary" size="lg" onClick={startGame}>НАЧАТЬ ИГРУ</GlassButton>
          ) : (
            <p className="text-white/40 italic">Ожидание ведущего...</p>
          )}
        </div>
      )}

      {/* ── BUZZER ── */}
      {s.phase === 'buzzer' && (
        <div className="max-w-md mx-auto text-center py-8 animate-fade-in">
          <h2 className="text-2xl font-bold text-amber-400 mb-2">{ROUND_NAMES[s.curQ]}</h2>
          <p className="text-white/50 text-sm mb-8">Кто первым нажмёт — та команда начинает раунд!</p>

          {/* Captain view — big red buzzer button */}
          {myTeam && user?.id === s.captains[myTeam] && (
            <div className="flex flex-col items-center gap-4">
              {s.buzzerWinner === 0 ? (
                <button
                  onClick={() => buzzerPressed(myTeam === 'team1' ? 1 : 2)}
                  disabled={!s.buzzerActive}
                  className={`w-44 h-44 rounded-full font-bold text-white text-2xl shadow-2xl transition-all duration-150 select-none
                    ${s.buzzerActive
                      ? 'bg-red-600 hover:bg-red-500 active:scale-95 cursor-pointer animate-pulse shadow-red-500/50 border-4 border-red-400'
                      : 'bg-red-900/40 border-4 border-red-900/60 cursor-not-allowed text-white/30'
                    }`}
                >
                  {s.buzzerActive ? '🔔' : '⏳'}
                </button>
              ) : (
                <div className={`w-44 h-44 rounded-full flex items-center justify-center text-4xl border-4 transition-all
                  ${s.buzzerWinner === (myTeam === 'team1' ? 1 : 2)
                    ? 'bg-green-600/30 border-green-400 text-green-400'
                    : 'bg-white/5 border-white/10 text-white/20'}`}>
                  {s.buzzerWinner === (myTeam === 'team1' ? 1 : 2) ? '✓' : '✕'}
                </div>
              )}
            </div>
          )}

          {/* Non-captain team member */}
          {myTeam && user?.id !== s.captains[myTeam] && (
            <div className="py-8">
              {s.buzzerWinner === 0
                ? <p className="text-white/40 italic">Капитан нажимает кнопку...</p>
                : <p className={`text-xl font-bold animate-fade-in ${s.buzzerWinner === (myTeam === 'team1' ? 1 : 2) ? 'text-green-400' : 'text-white/60'}`}>
                    {s.buzzerWinner === (myTeam === 'team1' ? 1 : 2) ? `Начинает ${myTeam === 'team1' ? s.t1n : s.t2n}!` : `Начинает ${s.buzzerWinner === 1 ? s.t1n : s.t2n}...`}
                  </p>
              }
            </div>
          )}

          {/* Result: starting team announcement (3s countdown) */}
          {s.buzzerWinner !== 0 && (
            <div className="mt-4 animate-fade-in">
              <p className="text-xl font-bold text-white">
                Начинает <span className={s.buzzerWinner === 1 ? 'text-yellow-400' : 'text-red-400'}>
                  {s.buzzerWinner === 1 ? s.t1n : s.t2n}
                </span>!
              </p>
              <p className="text-white/40 text-sm mt-2">Раунд начинается...</p>
            </div>
          )}

          {/* Host controls */}
          {isGameHost && (
            <div className="mt-8">
              {!s.buzzerActive && s.buzzerWinner === 0 && (
                <GlassButton variant="primary" size="lg" onClick={startBuzzer}>ЗАПУСТИТЬ ЗУММЕР</GlassButton>
              )}
              {s.buzzerWinner !== 0 && (
                <p className="text-white/30 text-sm">Переход к раунду через 3 секунды...</p>
              )}
            </div>
          )}

          {/* TV / other view */}
          {myRole === 'tv' && (
            <div className="py-4">
              {s.buzzerWinner === 0
                ? <p className="text-white/40">{s.buzzerActive ? 'Капитаны нажимают кнопку...' : 'Ожидание ведущего...'}</p>
                : <p className="text-2xl font-bold text-white animate-fade-in">
                    Начинает <span className={s.buzzerWinner === 1 ? 'text-yellow-400' : 'text-red-400'}>{s.buzzerWinner === 1 ? s.t1n : s.t2n}</span>!
                  </p>
              }
            </div>
          )}
        </div>
      )}

      {/* ── PLAYING: PLAYER VIEW (team1/team2) ── */}
      {s.phase === 'playing' && q && (myRole === 'team1' || myRole === 'team2') && (
        <div className="max-w-3xl mx-auto w-full">
          {/* Scores */}
          <div className="flex justify-between items-center mb-3">
            <div className={`glass-card px-4 py-2 flex items-center gap-2 ${myRole === 'team1' ? 'ring-2 ring-yellow-400 bg-yellow-500/10' : ''}`}>
              <span className="w-3 h-3 rounded-full bg-yellow-400" />
              <span className="text-sm text-white/60">{s.t1n}</span>
              <span className="font-bold text-white text-lg">{s.t1s}</span>
            </div>
            <div className="text-center">
              <div className="w-10 h-10 bg-amber-500 rounded-full flex items-center justify-center font-bold text-black text-lg">{s.curQ + 1}</div>
              <div className="text-[10px] text-white/40 mt-0.5">РАУНД</div>
            </div>
            <div className={`glass-card px-4 py-2 flex items-center gap-2 ${myRole === 'team2' ? 'ring-2 ring-red-400 bg-red-500/10' : ''}`}>
              <span className="font-bold text-white text-lg">{s.t2s}</span>
              <span className="text-sm text-white/60">{s.t2n}</span>
              <span className="w-3 h-3 rounded-full bg-red-500" />
            </div>
          </div>
          <div className="text-center mb-2">
            <span className="text-amber-400 font-bold text-sm tracking-widest">{ROUND_NAMES[s.curQ]}</span>
          </div>
          {/* Strikes for my team */}
          {s.curQ <= 2 && (
            <div className="flex items-center justify-center gap-2 mb-2">
              {[0, 1, 2].map(i => (
                <div key={i} className={`w-8 h-8 rounded-full flex items-center justify-center text-lg font-bold transition-all
                  ${i < s.strikes[s.curQ][myRole === 'team1' ? 0 : 1] ? 'bg-red-500/30 text-red-400 scale-110' : 'bg-white/5 text-white/15'}`}>✕</div>
              ))}
            </div>
          )}
          {/* Question */}
          <GlassCard className="p-5 mb-3 text-center bg-amber-900/25 border-amber-500/50">
            <p className="text-xs text-amber-400/70 font-bold tracking-widest mb-1.5">ВОПРОС</p>
            <p className="text-xl md:text-2xl font-bold text-white">{q.q}</p>
          </GlassCard>
          {/* Answer board — only published answers visible */}
          <div className="space-y-1.5 mb-3">
            {q.answers.map((a, idx) => {
              const revealed = s.qState[s.curQ]?.[idx]?.pub;
              const pts = getDisplayPts(s.curQ, idx, a.p);
              return (
                <div key={idx} className={`glass-card p-3 flex items-center justify-between transition-all bg-yellow-900/15 border-yellow-800/30 ${revealed ? 'ring-1 ring-amber-500/40' : ''}`}>
                  <div className="flex items-center gap-3">
                    <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${revealed ? 'bg-amber-500 text-black' : 'bg-white/10 text-white/30'}`}>{idx + 1}</span>
                    {revealed ? <span className="text-white font-bold uppercase tracking-wide">{a.t}</span> : <span className="text-white/15 tracking-[6px]">? ? ?</span>}
                  </div>
                  {revealed ? <span className="bg-amber-600/80 rounded-lg px-2.5 py-1 font-bold text-white">{pts}</span> : <span className="text-white/10">?</span>}
                </div>
              );
            })}
          </div>
          {/* Fund */}
          {s.curQ <= 2 && (
            <div className="flex items-center justify-center gap-3">
              <span className="text-xs text-white/40 font-bold">БАНК:</span>
              <span className="font-bold text-yellow-300 text-xl">{s.roundFund[s.curQ]}</span>
            </div>
          )}
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
              <div className="text-xs text-white/40 mt-1">РАУНД</div>
            </div>
            <div className={`glass-card px-6 py-3 flex items-center gap-3 ${s.roundActiveTeam[s.curQ] === 2 && s.curQ <= 2 ? 'ring-2 ring-red-400 bg-red-500/10' : ''}`}>
              <span className="font-bold text-red-300 text-3xl mr-2">{s.t2s}</span>
              <span className="text-lg font-bold text-white">{s.t2n}</span>
              <span className="w-4 h-4 rounded-full bg-red-500" />
            </div>
          </div>
          <div className="text-center mb-2">
            <span className="text-amber-400 font-bold text-lg tracking-widest">{ROUND_NAMES[s.curQ]}</span>
          </div>
          {/* Fund + Strikes */}
          {s.curQ <= 2 && (
            <div className="flex items-center justify-center gap-6 mb-3">
              <div className="flex items-center gap-1">
                {[0, 1, 2].map(i => <div key={i} className={`w-9 h-9 rounded-full flex items-center justify-center text-lg font-bold ${i < s.strikes[s.curQ][0] ? 'bg-red-500/30 text-red-400' : 'bg-white/5 text-white/15'}`}>✕</div>)}
              </div>
              <div className="text-center">
                <span className="text-xs text-white/40">БАНК</span>
                <div className="font-bold text-yellow-300 text-2xl">{s.roundFund[s.curQ]}</div>
              </div>
              <div className="flex items-center gap-1">
                {[0, 1, 2].map(i => <div key={i} className={`w-9 h-9 rounded-full flex items-center justify-center text-lg font-bold ${i < s.strikes[s.curQ][1] ? 'bg-red-500/30 text-red-400' : 'bg-white/5 text-white/15'}`}>✕</div>)}
              </div>
            </div>
          )}
          {/* Question */}
          <GlassCard className="p-6 mb-4 text-center bg-amber-900/25 border-amber-500/50">
            <p className="text-xs text-amber-400/70 font-bold tracking-widest mb-2">ВОПРОС</p>
            <p className="text-2xl md:text-3xl font-bold text-white">{q.q}</p>
          </GlassCard>
          {/* Answer board */}
          <div className="space-y-2 mb-4">
            {q.answers.map((a, idx) => {
              const revealed = s.qState[s.curQ]?.[idx]?.pub;
              const pts = getDisplayPts(s.curQ, idx, a.p);
              return (
                <div key={idx} className={`glass-card p-4 flex items-center justify-between transition-all bg-yellow-900/15 border-yellow-800/30 ${revealed ? 'ring-1 ring-amber-500/40' : ''}`}>
                  <div className="flex items-center gap-4">
                    <span className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold ${revealed ? 'bg-amber-500 text-black' : 'bg-white/10 text-white/30'}`}>{idx + 1}</span>
                    {revealed ? <span className="text-xl text-white font-bold uppercase tracking-wide">{a.t}</span> : <span className="text-white/15 tracking-[8px] text-xl">? ? ?</span>}
                  </div>
                  {revealed ? <span className="bg-amber-600/80 rounded-lg px-3 py-1.5 font-bold text-white text-xl">{pts}</span> : <span className="text-white/10 text-xl">?</span>}
                </div>
              );
            })}
          </div>
          {s.roundPhase[s.curQ] === 'switched' && <p className="text-center text-amber-400 font-bold">Ход → {s.roundActiveTeam[s.curQ] === 1 ? s.t1n : s.t2n}</p>}
          {s.roundPhase[s.curQ] === 'won' && <p className="text-center text-green-400 font-bold">✓ Очки начислены!</p>}
        </div>
      )}

      {/* ── PLAYING: HOST VIEW (ведущий) ── */}
      {s.phase === 'playing' && q && isGameHost && (
        <div className="max-w-3xl mx-auto w-full">
          {/* Team scores bar */}
          <div className="flex justify-between items-center mb-3">
            <div className={`glass-card px-4 py-2 flex items-center gap-2 transition-all ${s.roundActiveTeam[s.curQ] === 1 && s.curQ <= 2 ? 'ring-2 ring-yellow-400 bg-yellow-500/10' : ''}`}>
              <span className="w-3 h-3 rounded-full bg-yellow-400" />
              <span className="text-sm text-white/60">{s.t1n}</span>
              <span className="font-bold text-white text-lg">{s.t1s}</span>
            </div>
            <div className="text-center">
              <div className="w-10 h-10 bg-amber-500 rounded-full flex items-center justify-center font-bold text-black text-lg">{s.curQ + 1}</div>
              <div className="text-[10px] text-white/40 mt-0.5">РАУНД</div>
            </div>
            <div className={`glass-card px-4 py-2 flex items-center gap-2 transition-all ${s.roundActiveTeam[s.curQ] === 2 && s.curQ <= 2 ? 'ring-2 ring-red-400 bg-red-500/10' : ''}`}>
              <span className="font-bold text-white text-lg">{s.t2s}</span>
              <span className="text-sm text-white/60">{s.t2n}</span>
              <span className="w-3 h-3 rounded-full bg-red-500" />
            </div>
          </div>

          {/* Round type */}
          <div className="text-center mb-2">
            <span className="text-amber-400 font-bold text-sm tracking-widest">{ROUND_NAMES[s.curQ]}</span>
            {isGameHost && s.curQ <= 2 && s.roundPhase[s.curQ] === 'start' && s.roundActiveTeam[s.curQ] > 0 && (
              <button onClick={() => setTeamChooser(true)} className="ml-2 text-xs text-white/40 hover:text-white/80">↺ сменить</button>
            )}
          </div>

          {/* Fund (rounds 0-2) */}
          {s.curQ <= 2 && (
            <div className="flex items-center justify-center gap-3 mb-2">
              <span className="text-xs text-white/40 font-bold">БАНК:</span>
              <span className="font-bold text-yellow-300 text-xl px-3 py-0.5 rounded-lg bg-yellow-500/10 border border-yellow-500/20">{s.roundFund[s.curQ]}</span>
              {s.roundPhase[s.curQ] === 'switched' && <span className="text-xs text-amber-400 font-bold">Ход → {s.roundActiveTeam[s.curQ] === 1 ? s.t1n : s.t2n}</span>}
              {s.roundPhase[s.curQ] === 'won' && <span className="text-xs text-green-400 font-bold">✓ Очки начислены!</span>}
            </div>
          )}

          {/* Strikes (rounds 0-2) */}
          {isGameHost && s.curQ <= 2 && (
            <div className="flex justify-between items-center mb-2 px-4">
              <div className="flex items-center gap-1">
                <span className="text-xs text-white/40 mr-1">{s.t1n}</span>
                {[0, 1, 2].map(i => (
                  <button key={i} onClick={() => addStrike(1)}
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold transition-all
                      ${i < s.strikes[s.curQ][0] ? 'bg-red-500/30 text-red-400' : 'bg-white/5 text-white/15'}
                      ${s.roundActiveTeam[s.curQ] === 1 ? 'cursor-pointer hover:bg-red-500/20' : 'opacity-30 cursor-not-allowed'}`}>✕</button>
                ))}
              </div>
              <div className="flex items-center gap-1">
                {[0, 1, 2].map(i => (
                  <button key={i} onClick={() => addStrike(2)}
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold transition-all
                      ${i < s.strikes[s.curQ][1] ? 'bg-red-500/30 text-red-400' : 'bg-white/5 text-white/15'}
                      ${s.roundActiveTeam[s.curQ] === 2 ? 'cursor-pointer hover:bg-red-500/20' : 'opacity-30 cursor-not-allowed'}`}>✕</button>
                ))}
                <span className="text-xs text-white/40 ml-1">{s.t2n}</span>
              </div>
            </div>
          )}

          {/* Question */}
          <GlassCard className="p-4 mb-3 text-center bg-amber-900/25 border-amber-500/50">
            <p className="text-xs text-amber-400/70 font-bold tracking-widest mb-1">ВОПРОС</p>
            <p className="text-lg md:text-xl font-bold text-white">{q.q}</p>
          </GlassCard>

          {/* Answer board */}
          <div className="space-y-1.5 mb-3">
            {q.answers.map((a, idx) => {
              const st = s.qState[s.curQ]?.[idx];
              const revealed = st?.rev;
              const published = st?.pub;
              const pts = getDisplayPts(s.curQ, idx, a.p);
              return (
                <div key={idx}
                  className={`glass-card p-3 flex items-center justify-between transition-all bg-yellow-900/15 border-yellow-800/30
                    ${revealed ? 'ring-1 ring-amber-500/40' : ''}
                    ${isGameHost ? 'cursor-pointer hover:bg-yellow-900/25 active:scale-[0.99]' : ''}`}
                  onClick={() => openAns(idx)}>
                  <div className="flex items-center gap-3">
                    <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0
                      ${revealed ? 'bg-amber-500 text-black' : 'bg-white/10 text-white/30'}`}>{idx + 1}</span>
                    <span className={`font-bold uppercase tracking-wide ${revealed ? 'text-white' : 'text-white/50'}`}>{a.t}</span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {revealed && <span className="bg-amber-600/80 rounded-lg px-2.5 py-1 font-bold text-white">{pts}</span>}
                    <button
                      onClick={(e) => { e.stopPropagation(); pubAns(idx); }}
                      className={`w-7 h-7 rounded-md flex items-center justify-center text-sm transition-all border
                        ${published ? 'bg-green-500/25 text-green-400 border-green-500/40' : 'bg-white/5 text-white/20 border-white/10 hover:bg-white/15 hover:text-white/60'}`}
                      title={published ? 'Скрыть от игроков' : 'Показать игрокам'}>
                      👁
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Round 4 discussion timer */}
          {isGameHost && s.curQ === 3 && (
            <div className="flex items-center justify-center gap-3 mb-3">
              <span className="text-xs text-white/40 font-bold">ОБСУЖДЕНИЕ:</span>
              <span className={`font-bold text-2xl min-w-[60px] text-center ${s.r4Time <= 10 && s.r4Time > 0 ? 'text-red-400 animate-pulse' : 'text-yellow-300'}`}>
                {Math.floor(s.r4Time / 60)}:{(s.r4Time % 60).toString().padStart(2, '0')}
              </span>
              {!s.r4Running
                ? <GlassButton size="sm" onClick={r4Start}>{s.r4Time < 60 ? '▶ ПРОДОЛЖИТЬ' : '▶ СТАРТ'}</GlassButton>
                : <GlassButton size="sm" onClick={r4Pause}>⏸ ПАУЗА</GlassButton>}
              <GlassButton size="sm" onClick={r4Reset}>↺</GlassButton>
            </div>
          )}

          {/* Host controls */}
          {isGameHost && (
            <div className="flex flex-wrap gap-2 justify-center items-center">
              {s.curQ > 0 && <GlassButton size="sm" onClick={prevRound}>← Назад</GlassButton>}
              <GlassButton size="sm" onClick={() => update({ godMode: !s.godMode })}
                className={s.godMode ? '!border-yellow-400 !text-yellow-300' : ''}>
                {s.godMode ? '⚡ РЕЖИМ БОГА' : 'Режим бога'}
              </GlassButton>
              {canNext && <GlassButton variant="primary" size="sm" onClick={nextRound}>
                {s.curQ < 3 ? 'Далее →' : 'Итоги →'}
              </GlassButton>}
            </div>
          )}
        </div>
      )}

      {/* ── RESULTS ── */}
      {s.phase === 'results' && (
        <div className="max-w-md mx-auto text-center py-8 animate-fade-in">
          <h2 className="text-2xl font-bold text-amber-400 mb-6">ИТОГИ РАУНДОВ</h2>
          <div className="flex gap-4 justify-center mb-4">
            <GlassCard className={`p-6 flex-1 text-center ${s.t1s >= s.t2s ? 'ring-2 ring-yellow-400/50' : ''}`}>
              <p className="text-yellow-400 font-bold mb-1">{s.t1n}</p>
              <p className="text-3xl font-bold text-white">{s.t1s}</p>
              {s.t1s > s.t2s && <p className="text-xs text-amber-400 mt-1">🏆 Победитель!</p>}
            </GlassCard>
            <GlassCard className={`p-6 flex-1 text-center ${s.t2s > s.t1s ? 'ring-2 ring-red-400/50' : ''}`}>
              <p className="text-red-400 font-bold mb-1">{s.t2n}</p>
              <p className="text-3xl font-bold text-white">{s.t2s}</p>
              {s.t2s > s.t1s && <p className="text-xs text-amber-400 mt-1">🏆 Победитель!</p>}
            </GlassCard>
          </div>
          <p className="text-white/50 mb-6">Команда «{s.t1s >= s.t2s ? s.t1n : s.t2n}» играет Большую игру!</p>
          {isGameHost && (
            <div className="flex gap-3 justify-center">
              <GlassButton onClick={endGame}>В лобби</GlassButton>
              <GlassButton variant="primary" onClick={() => update({ phase: 'bigGame', bgPhase: 0, bgP1Ans: [], bgP2Ans: [], bgP1Matched: [], bgP2Matched: [], bgFund: 0, bgCurQ: 0, winTeam: s.t1s >= s.t2s ? 1 : 2 })}>
                БОЛЬШАЯ ИГРА →
              </GlassButton>
            </div>
          )}
        </div>
      )}

      {/* ── TEAM CHOOSER OVERLAY ── */}
      {teamChooser && isGameHost && s.curQ <= 2 && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center" onClick={() => setTeamChooser(false)}>
          <GlassCard className="p-8 max-w-sm text-center" onClick={undefined}>
            <h3 className="text-xl font-bold text-amber-400 mb-2">КТО НАЧИНАЕТ?</h3>
            <p className="text-white/50 text-sm mb-6">{ROUND_NAMES[s.curQ]}</p>
            <div className="flex gap-4">
              <GlassButton className="flex-1 !border-yellow-400 !bg-yellow-500/10" onClick={() => chooseTeam(1)}>{s.t1n}</GlassButton>
              <GlassButton className="flex-1 !border-red-400 !bg-red-500/10" onClick={() => chooseTeam(2)}>{s.t2n}</GlassButton>
            </div>
          </GlassCard>
        </div>
      )}

      {/* ── ASSIGN MODAL (round 4) ── */}
      {assignModal && isGameHost && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center">
          <GlassCard className="p-6 max-w-sm text-center">
            <p className="text-amber-400 font-bold mb-1">ОТВЕТ ОТКРЫТ!</p>
            <p className="text-3xl font-bold text-yellow-300 mb-4">+{assignModal.pts}</p>
            <p className="text-white/50 text-sm mb-4">Какой команде записать очки?</p>
            <div className="flex gap-3 mb-2">
              <GlassButton className="flex-1 !border-yellow-400 !bg-yellow-500/10" onClick={() => assignPts(1)}>{s.t1n}</GlassButton>
              <GlassButton className="flex-1 !border-red-400 !bg-red-500/10" onClick={() => assignPts(2)}>{s.t2n}</GlassButton>
            </div>
            <button onClick={() => assignPts(0)} className="text-xs text-white/30 hover:text-white/60">Никому</button>
          </GlassCard>
        </div>
      )}

      {/* ── REASSIGN MODAL (god mode) ── */}
      {reassignModal && isGameHost && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center">
          <GlassCard className="p-6 max-w-sm text-center">
            <p className="text-yellow-300 font-bold mb-1">⚡ ПЕРЕРАСПРЕДЕЛЕНИЕ</p>
            <p className="text-3xl font-bold text-yellow-300 mb-2">{reassignModal.pts} очков</p>
            <p className="text-xs text-white/40 mb-4">
              {reassignModal.cur === 1 ? `Сейчас: ${s.t1n}` : reassignModal.cur === 2 ? `Сейчас: ${s.t2n}` : reassignModal.cur === -1 ? 'Сейчас: в банке' : 'Сейчас: никому'}
            </p>
            <div className="flex gap-2 mb-2">
              <GlassButton className="flex-1 !border-yellow-400 !bg-yellow-500/10" onClick={() => reassignPts(1)}>{s.t1n}</GlassButton>
              {s.curQ <= 2 && <GlassButton className="flex-1 !border-yellow-300 !bg-yellow-500/5" onClick={() => reassignPts(-1)}>В банк</GlassButton>}
              <GlassButton className="flex-1 !border-red-400 !bg-red-500/10" onClick={() => reassignPts(2)}>{s.t2n}</GlassButton>
            </div>
            <button onClick={() => setReassignModal(null)} className="text-xs text-white/30 hover:text-white/60">Отмена</button>
          </GlassCard>
        </div>
      )}

      {/* ── BIG GAME ── */}
      {s.phase === 'bigGame' && (
        <div className="max-w-3xl mx-auto w-full py-4 animate-fade-in">
          <h2 className="text-2xl font-bold text-amber-400 text-center mb-2">БОЛЬШАЯ ИГРА</h2>

          {/* Intro (bgPhase 0) */}
          {s.bgPhase === 0 && (
            <div className="text-center">
              <p className="text-white/50 mb-6">Команда «{s.winTeam === 1 ? s.t1n : s.t2n}»: выберите 2 игроков.<br/>Игрок 1 — 30 сек, Игрок 2 — 40 сек.<br/>Второй не должен слышать ответы первого!</p>
              {isGameHost && <GlassButton variant="primary" onClick={() => bgStartPlayer(1)}>НАЧАТЬ (ИГРОК 1 — 30 сек)</GlassButton>}
            </div>
          )}

          {/* Player label */}
          {s.bgPhase >= 1 && s.bgPhase <= 4 && (
            <p className="text-center font-bold text-yellow-300 mb-2">
              {s.bgPhase === 1 ? 'ИГРОК 1 — 30 секунд' : s.bgPhase === 2 ? 'ПРОВЕРКА ОТВЕТОВ ИГРОКА 1' : s.bgPhase === 3 ? 'ИГРОК 2 — 40 секунд' : 'ПРОВЕРКА ОТВЕТОВ ИГРОКА 2'}
            </p>
          )}

          {/* Timer */}
          {(s.bgPhase === 1 || s.bgPhase === 3) && s.bgTimeLeft > 0 && (
            <div className="text-center mb-3">
              <span className={`font-bold text-4xl ${s.bgTimeLeft <= 5 ? 'text-red-400 animate-pulse' : s.bgTimerPaused ? 'text-yellow-300' : 'text-white'}`}>
                {s.bgTimeLeft}{s.bgTimerPaused ? ' ⏸' : ''}
              </span>
            </div>
          )}

          {/* Questions list */}
          {s.bgPhase >= 1 && (
            <div className="space-y-1.5 mb-3">
              {BIG_Q.map((qq, i) => {
                const ans = s.bgPhase <= 2 ? s.bgP1Ans[i] : s.bgP2Ans[i];
                const matched = s.bgPhase <= 2 ? s.bgP1Matched[i] : s.bgP2Matched[i];
                const isChecked = s.bgPhase === 2 || s.bgPhase === 4;
                return (
                  <GlassCard key={i} className="p-3">
                    <div className="flex items-center gap-2">
                      <span className="text-amber-400 font-bold">{i + 1}.</span>
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
                    {/* Show all answers for manual credit in check phase */}
                    {isChecked && !matched && isGameHost && (
                      <div className="flex flex-wrap gap-1 mt-2 pt-2 border-t border-white/5">
                        {qq.answers.map((a, ai) => {
                          const usedByP1 = s.bgPhase === 4 && s.bgP1Matched[i] === a.t;
                          return (
                            <button key={ai} disabled={usedByP1}
                              onClick={() => bgManualCredit(i, ai, s.bgPhase === 2)}
                              className={`text-xs px-2 py-0.5 rounded border transition-all
                                ${usedByP1 ? 'opacity-30 line-through border-white/10 text-white/30' : 'border-dashed border-white/20 text-white/50 hover:bg-green-500/20 hover:text-green-400 hover:border-green-400 cursor-pointer'}`}>
                              {a.t} ({a.p})
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </GlassCard>
                );
              })}
            </div>
          )}

          {/* Input area (during answering) */}
          {isGameHost && (s.bgPhase === 1 || s.bgPhase === 3) && s.bgTimeLeft > 0 && s.bgCurQ < 5 && (
            <div className="text-center mb-3">
              <input value={bgInput} onChange={e => { setBgInput(e.target.value); bgPauseTimer(); }}
                onKeyDown={e => { if (e.key === 'Enter') { bgResumeTimer(); bgSubmitAnswer(); } }}
                placeholder="Ответ → Enter" autoFocus
                className="w-full max-w-md px-4 py-3 rounded-xl bg-white/5 border border-amber-400/40 text-white text-center font-bold text-lg outline-none focus:border-amber-400" />
              <p className="text-xs text-white/30 mt-1">⏸ Таймер на паузе пока вы печатаете · Enter — отправить</p>
            </div>
          )}

          {/* Fund */}
          {s.bgPhase >= 2 && (
            <p className={`text-center font-bold text-2xl mb-3 ${s.bgFund >= 200 ? 'text-green-400 animate-pulse' : 'text-yellow-300'}`}>
              ФОНД: {s.bgFund} очков
            </p>
          )}

          {/* Action buttons */}
          {isGameHost && s.bgPhase === 2 && (
            <div className="text-center">
              {s.bgP1Matched.length === 0 && <GlassButton variant="primary" className="mr-2" onClick={() => bgDoCheck(true)}>ПРОВЕРИТЬ ОТВЕТЫ</GlassButton>}
              {s.bgP1Matched.length > 0 && <GlassButton variant="primary" onClick={() => bgStartPlayer(2)}>ИГРОК 2 (40 сек) →</GlassButton>}
            </div>
          )}
          {isGameHost && s.bgPhase === 4 && (
            <div className="text-center">
              {s.bgP2Matched.length === 0 && <GlassButton variant="primary" className="mr-2" onClick={() => bgDoCheck(false)}>ПРОВЕРИТЬ ОТВЕТЫ</GlassButton>}
              {s.bgP2Matched.length > 0 && <GlassButton variant="primary" onClick={bgShowResult}>РЕЗУЛЬТАТ →</GlassButton>}
            </div>
          )}
        </div>
      )}

      {/* ── FINAL ── */}
      {s.phase === 'final' && (
        <div className="text-center py-12 animate-fade-in">
          <div className="text-6xl mb-4">🏆</div>
          {s.bgFund >= 200 ? (
            <>
              <h2 className="text-3xl font-bold text-green-400 mb-2">ПОБЕДА! 🎉</h2>
              <p className="text-white/50 mb-6">Фонд: {s.bgFund} очков (≥200). Команда «{s.winTeam === 1 ? s.t1n : s.t2n}» выиграла!</p>
            </>
          ) : (
            <>
              <h2 className="text-3xl font-bold text-amber-400 mb-2">ИГРА ОКОНЧЕНА</h2>
              <p className="text-white/50 mb-6">Фонд: {s.bgFund} очков. Не хватило до 200. Отличная игра!</p>
            </>
          )}
          {isGameHost && (
            <div className="flex gap-3 justify-center">
              <GlassButton onClick={endGame}>В лобби</GlassButton>
              <GlassButton variant="primary" onClick={startGame}>ИГРАТЬ СНОВА</GlassButton>
            </div>
          )}
        </div>
      )}

    </GameLayout>
  );
}
