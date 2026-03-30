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

// Answer state per cell: rev=revealed, to=assigned team (0=none, 1/2=team, -1=fund)
interface AnsState { rev: boolean; to: number; }

type Phase = 'title' | 'teams' | 'rules' | 'playing' | 'results' | 'bigGame' | 'final';

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
}

const mkInitial = (): GState => ({
  phase: 'title', curQ: 0,
  t1n: 'Команда 1', t2n: 'Команда 2',
  t1s: 0, t2s: 0,
  qState: ROUNDS.map(r => r.answers.map(() => ({ rev: false, to: 0 }))),
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

  const isHost = s.players.find(p => p.id === user?.id)?.isHost ?? false;
  const q = ROUNDS[s.curQ];

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

  // ── Host actions: start game ──
  const startGame = () => {
    warmup();
    const init = mkInitial();
    const patch: Partial<GState> = {
      ...init, phase: 'playing', players: s.players,
    };
    setS(prev => ({ ...prev, ...patch }));
    broadcast(patch);
    setTeamChooser(true);
  };

  // ── Open/close answer ──
  const openAns = (idx: number) => {
    if (!isHost) return;
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
    const newQState = s.qState.map((r, ri) => ri === s.curQ ? r.map((a, ai) => ai === idx ? { ...a, rev: true } : a) : r);

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
    const newQState = s.qState.map((r, ri) => ri === s.curQ ? r.map((a, ai) => ai === idx ? { rev: false, to: 0 } : a) : r);
    sndClose();
    update({ qState: newQState, t1s: newT1s, t2s: newT2s, roundFund: newFund });
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
    if (!isHost || s.curQ > 2) return;
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

  // ── Derived ──
  const scores = [{ name: s.t1n, score: s.t1s }, { name: s.t2n, score: s.t2s }];
  const allRevealed = q ? s.qState[s.curQ]?.every(a => a.rev) : false;
  const canNext = allRevealed || s.roundPhase[s.curQ] === 'won' || s.roundPhase[s.curQ] === 'showonly' || s.roundPhase[s.curQ] === 'switched';

  // ── RENDER ──
  return (
    <GameLayout title="100 к 1" icon="💯"
      round={s.phase === 'playing' ? s.curQ + 1 : undefined}
      totalRounds={s.phase === 'playing' ? 4 : undefined}
      scores={scores} onEnd={isHost ? endGame : undefined}
      showScoreboard={s.phase === 'playing' || s.phase === 'results'}>

      {/* ── TITLE ── */}
      {s.phase === 'title' && (
        <div className="text-center py-12 animate-fade-in">
          <div className="text-8xl mb-6">💯</div>
          <h2 className="text-4xl font-bold text-white mb-2" style={{ fontFamily: 'Russo One, sans-serif' }}>100 к 1</h2>
          <p className="text-white/50 mb-8 text-lg">Телеигра</p>
          {isHost ? (
            <GlassButton variant="primary" size="lg" onClick={startGame}>НАЧАТЬ ИГРУ</GlassButton>
          ) : (
            <p className="text-white/40 italic">Ожидание ведущего...</p>
          )}
        </div>
      )}

      {/* ── PLAYING ── */}
      {s.phase === 'playing' && q && (
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
            {isHost && s.curQ <= 2 && s.roundPhase[s.curQ] === 'start' && s.roundActiveTeam[s.curQ] > 0 && (
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
          {isHost && s.curQ <= 2 && (
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
          <GlassCard className="p-4 mb-3 text-center">
            <p className="text-lg md:text-xl font-bold text-white">{q.q}</p>
          </GlassCard>

          {/* Answer board */}
          <div className="space-y-1.5 mb-3">
            {q.answers.map((a, idx) => {
              const revealed = s.qState[s.curQ]?.[idx]?.rev;
              const pts = getDisplayPts(s.curQ, idx, a.p);
              return (
                <div key={idx} onClick={() => openAns(idx)}
                  className={`glass-card p-3 flex items-center justify-between transition-all
                    ${revealed ? 'bg-blue-600/20 border-blue-400/30' : ''}
                    ${isHost ? 'cursor-pointer hover:bg-white/10 active:scale-[0.99]' : ''}`}>
                  <div className="flex items-center gap-3">
                    <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
                      ${revealed ? 'bg-amber-500 text-black' : 'bg-white/10 text-white/30'}`}>{idx + 1}</span>
                    {revealed
                      ? <span className="text-white font-bold uppercase tracking-wide animate-fade-in">{a.t}</span>
                      : <span className="text-white/15 tracking-[6px]">? ? ?</span>}
                  </div>
                  {revealed
                    ? <span className="bg-amber-600/80 rounded-lg px-2.5 py-1 font-bold text-white animate-fade-in">{pts}</span>
                    : <span className="text-white/10">?</span>}
                </div>
              );
            })}
          </div>

          {/* Host controls */}
          {isHost && (
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
          {isHost && (
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
      {teamChooser && isHost && s.curQ <= 2 && (
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
      {assignModal && isHost && (
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

      {/* ── BIG GAME (placeholder — next commit) ── */}
      {s.phase === 'bigGame' && (
        <div className="text-center py-12 animate-fade-in">
          <div className="text-6xl mb-4">⭐</div>
          <h2 className="text-3xl font-bold text-amber-400 mb-4">БОЛЬШАЯ ИГРА</h2>
          <p className="text-white/50 mb-6">Скоро будет добавлена</p>
          {isHost && <GlassButton onClick={endGame}>В лобби</GlassButton>}
        </div>
      )}

      {/* ── FINAL (placeholder) ── */}
      {s.phase === 'final' && (
        <div className="text-center py-12 animate-fade-in">
          <div className="text-6xl mb-4">🏆</div>
          <h2 className="text-3xl font-bold text-amber-400 mb-2">ИГРА ОКОНЧЕНА</h2>
          {isHost && <GlassButton onClick={endGame}>В лобби</GlassButton>}
        </div>
      )}
    </GameLayout>
  );
}
