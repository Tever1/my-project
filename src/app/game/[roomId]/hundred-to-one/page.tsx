'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslation } from '@/lib/i18n';
import { useAuth } from '@/lib/auth-context';
import { useSocket } from '@/lib/use-socket';
import { GameLayout } from '@/components/games/GameLayout';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { GlassInput } from '@/components/ui/GlassInput';
import { HUNDRED_TO_ONE_QUESTIONS } from '@/lib/game-data';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Phase = 'waiting' | 'playing' | 'steal' | 'round-end' | 'final';

interface GamePlayer {
  id: string;
  nickname: string;
  isHost: boolean;
}

interface HundredState {
  phase: Phase;
  questionIndex: number;
  revealedAnswers: number[]; // indices of revealed answers
  strikes: number; // current strikes for active team (max 3)
  teamAScore: number;
  teamBScore: number;
  activeTeam: 'A' | 'B';
  stealTeam: 'A' | 'B' | null; // team attempting to steal
  roundPoints: number; // points accumulated this round (go to winner)
  players: GamePlayer[];
  lastGuess: string; // last guess submitted (for display)
  lastGuessResult: 'hit' | 'miss' | null;
}

const TOTAL_ROUNDS = HUNDRED_TO_ONE_QUESTIONS.length;
const MAX_STRIKES = 3;

const INITIAL: HundredState = {
  phase: 'waiting',
  questionIndex: 0,
  revealedAnswers: [],
  strikes: 0,
  teamAScore: 0,
  teamBScore: 0,
  activeTeam: 'A',
  stealTeam: null,
  roundPoints: 0,
  players: [],
  lastGuess: '',
  lastGuessResult: null,
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function HundredToOnePage() {
  const { roomId } = useParams<{ roomId: string }>();
  const { t, locale } = useTranslation();
  const { user } = useAuth();
  const { emit, on } = useSocket();
  const router = useRouter();

  const [state, setState] = useState<HundredState>(INITIAL);
  const [guess, setGuess] = useState('');

  const isHost = state.players.find((p) => p.id === user?.id)?.isHost ?? false;
  const question = HUNDRED_TO_ONE_QUESTIONS[state.questionIndex];

  // ------- Socket listeners -------

  useEffect(() => {
    const unsub1 = on('room:state', (data: unknown) => {
      const room = data as { players: GamePlayer[] };
      setState((prev) => ({ ...prev, players: room.players }));
    });

    const unsub2 = on('game:action', (data: unknown) => {
      const { action, payload } = data as {
        action: string;
        payload: Record<string, unknown>;
      };

      switch (action) {
        case 'h2o:sync':
          setState((prev) => ({ ...prev, ...(payload as Partial<HundredState>) }));
          break;

        case 'h2o:reveal': {
          const { answerIndex, points } = payload as { answerIndex: number; points: number };
          setState((prev) => ({
            ...prev,
            revealedAnswers: [...prev.revealedAnswers, answerIndex],
            roundPoints: prev.roundPoints + points,
            lastGuessResult: 'hit',
          }));
          break;
        }

        case 'h2o:strike':
          setState((prev) => ({
            ...prev,
            strikes: (payload.strikes as number) ?? prev.strikes + 1,
            lastGuessResult: 'miss',
          }));
          break;

        case 'h2o:steal':
          setState((prev) => ({
            ...prev,
            phase: 'steal',
            stealTeam: payload.stealTeam as 'A' | 'B',
            strikes: 0,
            lastGuessResult: null,
            lastGuess: '',
          }));
          break;

        case 'h2o:round-end': {
          const { teamAScore, teamBScore, winner } = payload as {
            teamAScore: number;
            teamBScore: number;
            winner: 'A' | 'B';
          };
          setState((prev) => ({
            ...prev,
            phase: 'round-end',
            teamAScore,
            teamBScore,
          }));
          break;
        }

        case 'h2o:next-round': {
          const p = payload as Partial<HundredState>;
          setState((prev) => ({
            ...prev,
            ...p,
            phase: 'playing',
            revealedAnswers: [],
            strikes: 0,
            stealTeam: null,
            roundPoints: 0,
            lastGuess: '',
            lastGuessResult: null,
          }));
          break;
        }

        case 'h2o:guess':
          setState((prev) => ({
            ...prev,
            lastGuess: payload.guess as string,
            lastGuessResult: null,
          }));
          break;

        case 'h2o:final':
          setState((prev) => ({ ...prev, phase: 'final' }));
          break;
      }
    });

    const unsub3 = on('game:ended', () => router.push(`/lobby/${roomId}`));

    emit('room:get-state', { code: roomId });

    return () => {
      unsub1();
      unsub2();
      unsub3();
    };
  }, [on, emit, router, roomId]);

  // ------- Broadcast helper -------

  const broadcast = useCallback(
    (action: string, payload: Record<string, unknown>) => {
      emit('game:action', { code: roomId, action, payload });
    },
    [emit, roomId],
  );

  // ------- Host actions -------

  const startGame = () => {
    const update: Partial<HundredState> = {
      phase: 'playing',
      questionIndex: 0,
      revealedAnswers: [],
      strikes: 0,
      teamAScore: 0,
      teamBScore: 0,
      activeTeam: 'A',
      stealTeam: null,
      roundPoints: 0,
      lastGuess: '',
      lastGuessResult: null,
    };
    setState((prev) => ({ ...prev, ...update }));
    broadcast('h2o:sync', update);
  };

  const revealAnswer = (index: number) => {
    if (!isHost || state.revealedAnswers.includes(index)) return;
    const pts = question.answers[index].points;

    setState((prev) => ({
      ...prev,
      revealedAnswers: [...prev.revealedAnswers, index],
      roundPoints: prev.roundPoints + pts,
      lastGuessResult: 'hit',
    }));
    broadcast('h2o:reveal', { answerIndex: index, points: pts });
  };

  const addStrike = () => {
    if (!isHost) return;

    const newStrikes = state.strikes + 1;

    if (newStrikes >= MAX_STRIKES) {
      if (state.phase === 'steal') {
        // Steal failed - points go to the other team
        awardRound(state.activeTeam);
        return;
      }
      // 3 strikes - other team can steal
      const stealTeam = state.activeTeam === 'A' ? 'B' : 'A';
      setState((prev) => ({
        ...prev,
        phase: 'steal',
        stealTeam,
        strikes: 0,
        lastGuessResult: null,
        lastGuess: '',
      }));
      broadcast('h2o:steal', { stealTeam });
    } else {
      setState((prev) => ({
        ...prev,
        strikes: newStrikes,
        lastGuessResult: 'miss',
      }));
      broadcast('h2o:strike', { strikes: newStrikes });
    }
  };

  const awardRound = (winnerTeam: 'A' | 'B') => {
    const scoreKey = winnerTeam === 'A' ? 'teamAScore' : 'teamBScore';
    const baseScore = winnerTeam === 'A' ? state.teamAScore : state.teamBScore;
    const newScore = baseScore + state.roundPoints;

    const update = {
      teamAScore: winnerTeam === 'A' ? newScore : state.teamAScore,
      teamBScore: winnerTeam === 'B' ? newScore : state.teamBScore,
      winner: winnerTeam,
    };

    setState((prev) => ({
      ...prev,
      phase: 'round-end',
      teamAScore: update.teamAScore,
      teamBScore: update.teamBScore,
    }));
    broadcast('h2o:round-end', update);

    // Persist
    emit('game:state-update', {
      code: roomId,
      gameState: { teamAScore: update.teamAScore, teamBScore: update.teamBScore },
    });
  };

  const stealSuccess = () => {
    if (!isHost || !state.stealTeam) return;
    awardRound(state.stealTeam);
  };

  const stealFail = () => {
    if (!isHost) return;
    // Points go to the original team
    awardRound(state.activeTeam);
  };

  const nextRound = () => {
    const nextIdx = state.questionIndex + 1;
    if (nextIdx >= TOTAL_ROUNDS) {
      setState((prev) => ({ ...prev, phase: 'final' }));
      broadcast('h2o:final', {});
      return;
    }

    const update: Partial<HundredState> = {
      questionIndex: nextIdx,
      activeTeam: state.activeTeam === 'A' ? 'B' : 'A',
    };
    setState((prev) => ({
      ...prev,
      ...update,
      phase: 'playing',
      revealedAnswers: [],
      strikes: 0,
      stealTeam: null,
      roundPoints: 0,
      lastGuess: '',
      lastGuessResult: null,
    }));
    broadcast('h2o:next-round', update);
  };

  const endRoundEarly = () => {
    // Host can end round early, awarding current points to active team
    const winner = state.phase === 'steal' ? state.stealTeam || state.activeTeam : state.activeTeam;
    awardRound(winner);
  };

  const endGame = () => emit('game:end', { code: roomId });

  // ------- Player guess submission -------

  const submitGuess = () => {
    if (!guess.trim()) return;
    broadcast('h2o:guess', { guess: guess.trim(), from: user?.nickname });
    setGuess('');
  };

  // ------- Derived data -------

  const scores = [
    { name: `${locale === 'ru' ? 'Команда' : 'Team'} A`, score: state.teamAScore },
    { name: `${locale === 'ru' ? 'Команда' : 'Team'} B`, score: state.teamBScore },
  ];

  const allRevealed = question ? state.revealedAnswers.length >= question.answers.length : false;

  // ------- Render -------

  return (
    <GameLayout
      title={locale === 'ru' ? '100 к 1' : '100 to 1'}
      icon="💯"
      round={state.phase !== 'waiting' && state.phase !== 'final'
        ? state.questionIndex + 1
        : undefined}
      totalRounds={state.phase !== 'waiting' ? TOTAL_ROUNDS : undefined}
      scores={scores}
      onEnd={isHost ? endGame : undefined}
      showScoreboard={state.phase !== 'waiting'}
    >
      {/* ==================== WAITING ==================== */}
      {state.phase === 'waiting' && (
        <div className="text-center py-12 animate-fade-in">
          <div className="text-7xl mb-6">💯</div>
          <h2 className="text-3xl font-bold text-white mb-3">
            {locale === 'ru' ? '100 к 1' : '100 to 1'}
          </h2>
          <p className="text-white/50 mb-2 max-w-md mx-auto">
            {locale === 'ru'
              ? 'Угадывайте самые популярные ответы на вопросы! Две команды соревнуются. 3 промаха — и ход переходит к соперникам.'
              : 'Guess the most popular survey answers! Two teams compete. 3 strikes and the other team can steal.'}
          </p>
          <p className="text-white/30 text-sm mb-8">
            {locale === 'ru'
              ? `${TOTAL_ROUNDS} раундов | Игроков: ${state.players.length}`
              : `${TOTAL_ROUNDS} rounds | Players: ${state.players.length}`}
          </p>
          {isHost ? (
            <GlassButton variant="primary" size="lg" onClick={startGame}>
              {locale === 'ru' ? 'Начать игру' : 'Start Game'}
            </GlassButton>
          ) : (
            <p className="text-white/40 italic">
              {locale === 'ru' ? 'Ожидание ведущего...' : 'Waiting for the host...'}
            </p>
          )}
        </div>
      )}

      {/* ==================== PLAYING / STEAL ==================== */}
      {(state.phase === 'playing' || state.phase === 'steal') && question && (
        <div className="max-w-2xl mx-auto">
          {/* Team scores & active indicator */}
          <div className="flex justify-between items-center mb-4">
            <div
              className={`glass-card px-4 py-2 flex items-center gap-2 transition-all ${
                state.activeTeam === 'A' && state.phase === 'playing'
                  ? 'ring-2 ring-blue-400 bg-blue-500/10'
                  : state.stealTeam === 'A'
                    ? 'ring-2 ring-yellow-400 bg-yellow-500/10'
                    : ''
              }`}
            >
              <span className="text-sm text-white/60">
                {locale === 'ru' ? 'Ком.' : 'Team'} A
              </span>
              <span className="font-bold text-white">{state.teamAScore}</span>
            </div>

            {/* Strikes */}
            <div className="flex items-center gap-2">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-lg font-bold transition-all ${
                    i < state.strikes
                      ? 'bg-red-500/30 text-red-400 scale-110'
                      : 'bg-white/5 text-white/15'
                  }`}
                >
                  ✕
                </div>
              ))}
            </div>

            <div
              className={`glass-card px-4 py-2 flex items-center gap-2 transition-all ${
                state.activeTeam === 'B' && state.phase === 'playing'
                  ? 'ring-2 ring-green-400 bg-green-500/10'
                  : state.stealTeam === 'B'
                    ? 'ring-2 ring-yellow-400 bg-yellow-500/10'
                    : ''
              }`}
            >
              <span className="text-sm text-white/60">
                {locale === 'ru' ? 'Ком.' : 'Team'} B
              </span>
              <span className="font-bold text-white">{state.teamBScore}</span>
            </div>
          </div>

          {/* Steal banner */}
          {state.phase === 'steal' && (
            <div className="mb-4 text-center animate-fade-in">
              <GlassCard className="p-3 border-yellow-400/30 bg-yellow-500/10">
                <p className="text-yellow-300 font-bold">
                  {locale === 'ru'
                    ? `Команда ${state.stealTeam} может украсть ${state.roundPoints} очков!`
                    : `Team ${state.stealTeam} can steal ${state.roundPoints} points!`}
                </p>
              </GlassCard>
            </div>
          )}

          {/* Question */}
          <GlassCard className="p-6 mb-6 text-center">
            <p className="text-xs text-white/30 mb-2">
              {locale === 'ru' ? 'Вопрос' : 'Question'} {state.questionIndex + 1}/{TOTAL_ROUNDS}
            </p>
            <h3 className="text-xl md:text-2xl font-semibold text-white leading-snug">
              {locale === 'ru' ? question.questionRu : question.questionEn}
            </h3>
          </GlassCard>

          {/* Answer Board */}
          <div className="space-y-2 mb-6">
            {question.answers.map((answer, idx) => {
              const isRevealed = state.revealedAnswers.includes(idx);
              return (
                <div
                  key={idx}
                  onClick={() => isHost && !isRevealed && revealAnswer(idx)}
                  className={`
                    glass-card p-4 flex items-center justify-between transition-all
                    ${isRevealed ? 'bg-purple-500/10 border-purple-400/20' : ''}
                    ${isHost && !isRevealed ? 'cursor-pointer hover:bg-white/10 active:scale-[0.99]' : ''}
                  `}
                >
                  <div className="flex items-center gap-4">
                    <span
                      className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${
                        isRevealed ? 'bg-purple-500/30 text-purple-300' : 'bg-white/10 text-white/30'
                      }`}
                    >
                      {idx + 1}
                    </span>
                    {isRevealed ? (
                      <span className="text-white font-medium animate-fade-in">
                        {locale === 'ru' ? answer.textRu : answer.textEn}
                      </span>
                    ) : (
                      <span className="text-white/15 tracking-widest">- - - - -</span>
                    )}
                  </div>
                  {isRevealed ? (
                    <span className="glass-badge font-bold text-purple-300 animate-fade-in">
                      {answer.points}
                    </span>
                  ) : (
                    <span className="text-white/10 text-sm">?</span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Round points tally */}
          <div className="text-center mb-4">
            <span className="text-white/40 text-sm">
              {locale === 'ru' ? 'Очки раунда:' : 'Round points:'}
            </span>{' '}
            <span className="text-white font-bold text-lg">{state.roundPoints}</span>
          </div>

          {/* Last guess display */}
          {state.lastGuess && (
            <div className="text-center mb-4 animate-fade-in">
              <GlassCard className="p-3 inline-block">
                <span className="text-white/60 text-sm">
                  {locale === 'ru' ? 'Ответ:' : 'Guess:'}{' '}
                </span>
                <span className="text-white font-medium">{state.lastGuess}</span>
                {state.lastGuessResult === 'hit' && (
                  <span className="ml-2 text-green-400">✓</span>
                )}
                {state.lastGuessResult === 'miss' && (
                  <span className="ml-2 text-red-400">✕</span>
                )}
              </GlassCard>
            </div>
          )}

          {/* Player guess input */}
          {!isHost && (
            <div className="flex gap-2 mb-6">
              <GlassInput
                placeholder={locale === 'ru' ? 'Ваш ответ...' : 'Your guess...'}
                value={guess}
                onChange={(e) => setGuess(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && submitGuess()}
              />
              <GlassButton variant="primary" onClick={submitGuess}>
                {locale === 'ru' ? 'Ответить' : 'Submit'}
              </GlassButton>
            </div>
          )}

          {/* Host controls */}
          {isHost && (
            <div className="flex flex-wrap gap-3 justify-center">
              {state.phase === 'playing' && (
                <>
                  <GlassButton variant="danger" onClick={addStrike}>
                    ✕ {locale === 'ru' ? 'Промах' : 'Strike'}
                  </GlassButton>
                  {allRevealed && (
                    <GlassButton variant="primary" onClick={() => awardRound(state.activeTeam)}>
                      {locale === 'ru' ? 'Завершить раунд' : 'End Round'}
                    </GlassButton>
                  )}
                  <GlassButton onClick={endRoundEarly}>
                    {locale === 'ru' ? 'Следующий' : 'Skip Round'}
                  </GlassButton>
                </>
              )}
              {state.phase === 'steal' && (
                <>
                  <GlassButton
                    variant="primary"
                    onClick={stealSuccess}
                    className="min-w-[140px]"
                  >
                    {locale === 'ru' ? 'Угадали!' : 'Correct Steal!'}
                  </GlassButton>
                  <GlassButton
                    variant="danger"
                    onClick={stealFail}
                    className="min-w-[140px]"
                  >
                    {locale === 'ru' ? 'Не угадали' : 'Wrong Steal'}
                  </GlassButton>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* ==================== ROUND END ==================== */}
      {state.phase === 'round-end' && (
        <div className="max-w-md mx-auto text-center py-8 animate-fade-in">
          <div className="text-5xl mb-4">
            {state.teamAScore >= state.teamBScore ? '🔵' : '🟢'}
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">
            {locale === 'ru' ? 'Раунд завершён!' : 'Round Complete!'}
          </h2>
          <p className="text-white/50 mb-6">
            {locale === 'ru' ? 'Текущий счёт:' : 'Current Score:'}
          </p>

          <div className="flex gap-4 justify-center mb-8">
            <GlassCard
              className={`p-6 flex-1 text-center ${
                state.teamAScore >= state.teamBScore ? 'ring-2 ring-blue-400/50' : ''
              }`}
            >
              <p className="text-white/60 text-sm mb-1">
                {locale === 'ru' ? 'Команда' : 'Team'} A
              </p>
              <p className="text-3xl font-bold text-white">{state.teamAScore}</p>
            </GlassCard>
            <GlassCard
              className={`p-6 flex-1 text-center ${
                state.teamBScore > state.teamAScore ? 'ring-2 ring-green-400/50' : ''
              }`}
            >
              <p className="text-white/60 text-sm mb-1">
                {locale === 'ru' ? 'Команда' : 'Team'} B
              </p>
              <p className="text-3xl font-bold text-white">{state.teamBScore}</p>
            </GlassCard>
          </div>

          {isHost && (
            <GlassButton variant="primary" size="lg" onClick={nextRound}>
              {state.questionIndex + 1 < TOTAL_ROUNDS
                ? locale === 'ru'
                  ? 'Следующий раунд'
                  : 'Next Round'
                : locale === 'ru'
                  ? 'Итоги'
                  : 'Final Results'}
            </GlassButton>
          )}
        </div>
      )}

      {/* ==================== FINAL ==================== */}
      {state.phase === 'final' && (
        <div className="max-w-md mx-auto text-center py-8 animate-fade-in">
          <div className="text-6xl mb-4">🏆</div>
          <h2 className="text-3xl font-bold text-white mb-2">
            {locale === 'ru' ? 'Финальный счёт' : 'Final Score'}
          </h2>

          {state.teamAScore !== state.teamBScore ? (
            <p className="text-lg text-yellow-300 mb-6">
              {locale === 'ru'
                ? `Побеждает ${state.teamAScore > state.teamBScore ? 'Команда A' : 'Команда B'}!`
                : `${state.teamAScore > state.teamBScore ? 'Team A' : 'Team B'} wins!`}
            </p>
          ) : (
            <p className="text-lg text-yellow-300 mb-6">
              {locale === 'ru' ? 'Ничья!' : "It's a tie!"}
            </p>
          )}

          <div className="flex gap-4 justify-center mb-8">
            {scores
              .sort((a, b) => b.score - a.score)
              .map((s, i) => (
                <GlassCard
                  key={s.name}
                  className={`p-6 flex-1 text-center ${
                    i === 0 && s.score > 0 ? 'ring-2 ring-yellow-400/60 bg-yellow-500/10' : ''
                  }`}
                >
                  <div className="text-3xl mb-2">{i === 0 && s.score > 0 ? '👑' : ''}</div>
                  <p className="text-white/60 text-sm mb-1">{s.name}</p>
                  <p className="text-4xl font-bold text-white">{s.score}</p>
                </GlassCard>
              ))}
          </div>

          {isHost && (
            <div className="flex gap-3 justify-center">
              <GlassButton onClick={endGame}>
                {locale === 'ru' ? 'В лобби' : 'Back to Lobby'}
              </GlassButton>
              <GlassButton variant="primary" onClick={startGame}>
                {locale === 'ru' ? 'Играть снова' : 'Play Again'}
              </GlassButton>
            </div>
          )}
        </div>
      )}
    </GameLayout>
  );
}
