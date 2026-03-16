'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslation } from '@/lib/i18n';
import { useAuth } from '@/lib/auth-context';
import { useSocket } from '@/lib/use-socket';
import { GameLayout } from '@/components/games/GameLayout';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { GlassInput } from '@/components/ui/GlassInput';
import { HUNDRED_TO_ONE_QUESTIONS } from '@/lib/game-data';

interface GamePlayer {
  id: string;
  nickname: string;
  isHost: boolean;
}

interface HundredState {
  phase: 'waiting' | 'playing' | 'final';
  questionIndex: number;
  revealedAnswers: number[];
  strikes: number;
  teamAScore: number;
  teamBScore: number;
  activeTeam: 'A' | 'B';
  players: GamePlayer[];
}

const INITIAL: HundredState = {
  phase: 'waiting',
  questionIndex: 0,
  revealedAnswers: [],
  strikes: 0,
  teamAScore: 0,
  teamBScore: 0,
  activeTeam: 'A',
  players: [],
};

export default function HundredToOnePage() {
  const { roomId } = useParams<{ roomId: string }>();
  const { t, locale } = useTranslation();
  const { user } = useAuth();
  const { emit, on } = useSocket();
  const router = useRouter();
  const [state, setState] = useState<HundredState>(INITIAL);
  const [guess, setGuess] = useState('');

  const isHost = state.players.find(p => p.id === user?.id)?.isHost ?? false;
  const question = HUNDRED_TO_ONE_QUESTIONS[state.questionIndex];

  useEffect(() => {
    const unsub1 = on('room:state', (data: unknown) => {
      const room = data as { players: GamePlayer[] };
      setState(prev => ({ ...prev, players: room.players }));
    });

    const unsub2 = on('game:action', (data: unknown) => {
      const { action, payload } = data as { action: string; payload: Record<string, unknown> };
      if (action === 'h2o:state') {
        setState(prev => ({ ...prev, ...payload as Partial<HundredState> }));
      }
    });

    const unsub3 = on('game:ended', () => router.push(`/lobby/${roomId}`));

    return () => { unsub1(); unsub2(); unsub3(); };
  }, [on, router, roomId]);

  const broadcast = (update: Partial<HundredState>) => {
    setState(prev => ({ ...prev, ...update }));
    emit('game:action', { code: roomId, action: 'h2o:state', payload: update });
  };

  const startGame = () => {
    broadcast({ phase: 'playing', questionIndex: 0, revealedAnswers: [], strikes: 0 });
  };

  const revealAnswer = (index: number) => {
    if (!isHost || state.revealedAnswers.includes(index)) return;
    const newRevealed = [...state.revealedAnswers, index];
    const pts = question.answers[index].points;
    const scoreKey = state.activeTeam === 'A' ? 'teamAScore' : 'teamBScore';
    broadcast({
      revealedAnswers: newRevealed,
      [scoreKey]: (state.activeTeam === 'A' ? state.teamAScore : state.teamBScore) + pts,
    });
  };

  const addStrike = () => {
    if (!isHost) return;
    const newStrikes = state.strikes + 1;
    if (newStrikes >= 3) {
      broadcast({
        strikes: 0,
        activeTeam: state.activeTeam === 'A' ? 'B' : 'A',
      });
    } else {
      broadcast({ strikes: newStrikes });
    }
  };

  const nextQuestion = () => {
    const nextIdx = state.questionIndex + 1;
    if (nextIdx >= HUNDRED_TO_ONE_QUESTIONS.length) {
      broadcast({ phase: 'final' });
    } else {
      broadcast({
        questionIndex: nextIdx,
        revealedAnswers: [],
        strikes: 0,
        activeTeam: state.activeTeam === 'A' ? 'B' : 'A',
      });
    }
  };

  const endGame = () => emit('game:end', { code: roomId });

  const scores = [
    { name: `${locale === 'ru' ? 'Команда' : 'Team'} A`, score: state.teamAScore },
    { name: `${locale === 'ru' ? 'Команда' : 'Team'} B`, score: state.teamBScore },
  ];

  return (
    <GameLayout
      title={locale === 'ru' ? '100 к 1' : '100 to 1'}
      icon="💯"
      round={state.questionIndex + 1}
      totalRounds={HUNDRED_TO_ONE_QUESTIONS.length}
      scores={scores}
      onEnd={isHost ? endGame : undefined}
      showScoreboard={state.phase !== 'waiting'}
    >
      {state.phase === 'waiting' && (
        <div className="text-center py-12 animate-fade-in">
          <div className="text-6xl mb-6">💯</div>
          <h2 className="text-2xl font-bold text-white mb-4">
            {locale === 'ru' ? '100 к 1' : '100 to 1'}
          </h2>
          <p className="text-white/50 mb-8">
            {locale === 'ru'
              ? 'Угадывайте популярные ответы! 2 команды соревнуются.'
              : 'Guess popular answers! 2 teams compete.'}
          </p>
          {isHost && (
            <GlassButton variant="primary" size="lg" onClick={startGame}>
              {t('lobby.startGame')}
            </GlassButton>
          )}
        </div>
      )}

      {state.phase === 'playing' && question && (
        <div className="max-w-2xl mx-auto animate-scale-in">
          {/* Active Team & Strikes */}
          <div className="flex justify-between items-center mb-4">
            <div className={`glass-badge px-4 py-2 ${state.activeTeam === 'A' ? 'ring-2 ring-blue-400' : ''}`}>
              {locale === 'ru' ? 'Команда' : 'Team'} A: {state.teamAScore}
            </div>
            <div className="flex gap-1">
              {[0, 1, 2].map(i => (
                <span key={i} className={`text-2xl ${i < state.strikes ? 'text-red-500' : 'text-white/20'}`}>
                  ✕
                </span>
              ))}
            </div>
            <div className={`glass-badge px-4 py-2 ${state.activeTeam === 'B' ? 'ring-2 ring-green-400' : ''}`}>
              {locale === 'ru' ? 'Команда' : 'Team'} B: {state.teamBScore}
            </div>
          </div>

          {/* Question */}
          <GlassCard className="p-6 mb-6 text-center">
            <h3 className="text-xl font-semibold text-white">
              {locale === 'ru' ? question.questionRu : question.questionEn}
            </h3>
          </GlassCard>

          {/* Answer Board */}
          <div className="space-y-2 mb-6">
            {question.answers.map((answer, idx) => (
              <div
                key={idx}
                onClick={() => isHost && revealAnswer(idx)}
                className={`glass-card p-3 flex items-center justify-between transition-all ${
                  isHost && !state.revealedAnswers.includes(idx) ? 'cursor-pointer hover:bg-white/10' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-white/40 font-mono w-6">{idx + 1}</span>
                  {state.revealedAnswers.includes(idx) ? (
                    <span className="text-white font-medium animate-scale-in">
                      {locale === 'ru' ? answer.textRu : answer.textEn}
                    </span>
                  ) : (
                    <span className="text-white/20">• • • • •</span>
                  )}
                </div>
                {state.revealedAnswers.includes(idx) && (
                  <span className="text-purple-400 font-bold animate-fade-in">{answer.points}</span>
                )}
              </div>
            ))}
          </div>

          {/* Host Controls */}
          {isHost && (
            <div className="flex gap-3 justify-center">
              <GlassButton variant="danger" onClick={addStrike}>
                ✕ {locale === 'ru' ? 'Промах' : 'Strike'}
              </GlassButton>
              <GlassButton variant="primary" onClick={nextQuestion}>
                {state.questionIndex + 1 < HUNDRED_TO_ONE_QUESTIONS.length ? t('game.next') : t('game.results')}
              </GlassButton>
            </div>
          )}
        </div>
      )}

      {state.phase === 'final' && (
        <div className="max-w-md mx-auto text-center animate-fade-in">
          <div className="text-5xl mb-4">🏆</div>
          <h2 className="text-2xl font-bold text-white mb-6">{t('game.results')}</h2>
          <div className="space-y-3">
            {scores.sort((a, b) => b.score - a.score).map((s, i) => (
              <GlassCard key={i} className={`p-4 flex justify-between items-center ${
                i === 0 ? 'ring-2 ring-yellow-400/50' : ''
              }`}>
                <span className="text-white font-medium">{s.name} {i === 0 && '👑'}</span>
                <span className="text-purple-400 font-bold">{s.score}</span>
              </GlassCard>
            ))}
          </div>
          {isHost && (
            <GlassButton className="mt-8" onClick={endGame}>
              {t('game.backToLobby')}
            </GlassButton>
          )}
        </div>
      )}
    </GameLayout>
  );
}
