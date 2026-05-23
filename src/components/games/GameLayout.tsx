'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { ReactNode, useState } from 'react';
import { useTranslation } from '@/lib/i18n';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';

interface GameLayoutProps {
  children: ReactNode;
  title: string;
  icon?: string;
  round?: number;
  totalRounds?: number;
  scores?: { name: string; score: number }[];
  onEnd?: () => void;
  showScoreboard?: boolean;
  backgroundUrl?: string;
  phaseKey?: string;
}

export function GameLayout({
  children,
  title,
  icon,
  round,
  totalRounds,
  scores,
  onEnd,
  showScoreboard = false,
  backgroundUrl,
  phaseKey,
}: GameLayoutProps) {
  const { t, locale } = useTranslation();
  const [scoreboardOpen, setScoreboardOpen] = useState(false);
  const [endConfirmOpen, setEndConfirmOpen] = useState(false);

  const sortedScores = scores
    ? [...scores].sort((a, b) => b.score - a.score)
    : [];

  return (
    <div
      className={`bg-gradient-main min-h-[100dvh] text-white flex flex-col relative ${backgroundUrl ? '[text-shadow:_0_2px_8px_rgb(0_0_0_/_80%)]' : ''}`}
      style={backgroundUrl ? { backgroundImage: `url(${backgroundUrl})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' } : undefined}
    >
      {/* Header */}
      <header className="sticky top-0 z-30 backdrop-blur-xl bg-black/20 border-b border-white/10">
        <div className="w-[92%] max-w-screen-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            {icon && <span className="text-2xl flex-shrink-0">{icon}</span>}
            <div className="min-w-0">
              <h1 className="text-lg font-bold truncate">{title}</h1>
              {round != null && totalRounds != null && (
                <p className="text-sm text-white/60">
                  {t('game.round')} {round} / {totalRounds}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Inline player scores in header */}
            {showScoreboard && sortedScores.length > 0 && (
              <>
                {/* Desktop: show all players inline */}
                <div className="hidden md:flex items-center gap-1.5">
                  {sortedScores.map((entry, i) => (
                    <div
                      key={entry.name}
                      className="flex items-center gap-1.5 glass-badge px-2.5 py-1 rounded-full text-xs"
                    >
                      <span className="w-4 text-center">
                        {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`}
                      </span>
                      <span className="text-white/80 max-w-[80px] truncate">{entry.name}</span>
                      <span className="text-white font-bold">{entry.score}</span>
                    </div>
                  ))}
                </div>

                {/* Mobile: toggle button */}
                <button
                  onClick={() => setScoreboardOpen(!scoreboardOpen)}
                  className="md:hidden glass-button px-3 py-2 text-sm"
                >
                  🏆 {sortedScores.length}
                </button>
              </>
            )}

            {onEnd && (
              <GlassButton variant="danger" size="sm" onClick={() => setEndConfirmOpen(true)}>
                {t('game.end')}
              </GlassButton>
            )}
          </div>
        </div>
      </header>

      {/* Mobile scoreboard dropdown */}
      {showScoreboard && scoreboardOpen && sortedScores.length > 0 && (
        <div className="md:hidden fixed inset-0 z-40" onClick={() => setScoreboardOpen(false)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div
            className="absolute top-16 right-4 w-72 z-50"
            onClick={(e) => e.stopPropagation()}
          >
            <GlassCard className="p-4">
              <h3 className="text-base font-bold mb-3 flex items-center gap-2">
                🏆 {t('game.scoreboard')}
              </h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {sortedScores.map((entry, i) => (
                  <div
                    key={entry.name}
                    className="flex items-center justify-between py-1.5 px-2 rounded-lg bg-white/5"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-sm font-mono text-white/50 w-5 text-right flex-shrink-0">
                        {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`}
                      </span>
                      <span className="text-sm truncate">{entry.name}</span>
                    </div>
                    <span className="glass-badge text-xs ml-2 flex-shrink-0">
                      {entry.score}
                    </span>
                  </div>
                ))}
              </div>
            </GlassCard>
          </div>
        </div>
      )}

      {/* Main content area — fills remaining viewport */}
      <div className="flex-1 w-[92%] max-w-screen-2xl mx-auto px-4 py-4 flex flex-col">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={phaseKey ?? 'static'}
            className="flex-1 flex flex-col justify-center"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* End game confirmation modal */}
      {endConfirmOpen && onEnd && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={() => setEndConfirmOpen(false)}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div
            className="relative z-10 w-full max-w-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <GlassCard className="p-6 text-center">
              <p className="text-4xl mb-3">⚠️</p>
              <h3 className="text-xl font-bold mb-2">
                {locale === 'ru' ? 'Завершить игру?' : 'End the game?'}
              </h3>
              <p className="text-sm text-white/60 mb-6">
                {locale === 'ru'
                  ? 'Все игроки вернутся в лобби. Прогресс будет потерян.'
                  : 'All players will return to the lobby. Progress will be lost.'}
              </p>
              <div className="flex gap-3">
                <GlassButton
                  size="md"
                  className="flex-1"
                  onClick={() => setEndConfirmOpen(false)}
                >
                  {locale === 'ru' ? 'Отмена' : 'Cancel'}
                </GlassButton>
                <GlassButton
                  variant="danger"
                  size="md"
                  className="flex-1"
                  onClick={() => {
                    setEndConfirmOpen(false);
                    onEnd();
                  }}
                >
                  {locale === 'ru' ? 'Завершить' : 'End Game'}
                </GlassButton>
              </div>
            </GlassCard>
          </div>
        </div>
      )}
    </div>
  );
}
