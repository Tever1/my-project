'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { ReactNode, useState } from 'react';
import { useTranslation } from '@/lib/i18n';
import { PlayerAvatar } from '@/components/ui';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';

interface GameLayoutProps {
  children: ReactNode;
  title: string;
  icon?: string;
  round?: number;
  totalRounds?: number;
  scores?: {
    name: string;
    score: number;
    hasAnswered?: boolean;
    isCorrect?: boolean;
  }[];
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
  const [endConfirmOpen, setEndConfirmOpen] = useState(false);

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
            {onEnd && (
              <GlassButton variant="danger" size="sm" onClick={() => setEndConfirmOpen(true)}>
                {t('game.end')}
              </GlassButton>
            )}
          </div>
        </div>

        {showScoreboard && scores && scores.length > 0 && (
          <div className="border-t border-white/10 px-4 py-2">
            <div className="flex items-center gap-3 overflow-x-auto scrollbar-none">
              <div className="flex-shrink-0 pr-3 border-r border-white/15">
                <p className="text-[10px] uppercase tracking-widest text-white/40 leading-tight">
                  {locale === 'ru' ? 'В ИГРЕ' : 'PLAYING'}
                </p>
                <p className="text-sm font-bold leading-tight">{scores.length}</p>
              </div>

              {scores.map((entry) => {
                const isAnswered = entry.hasAnswered;
                const isCorrect = entry.isCorrect;

                return (
                  <div
                    key={entry.name}
                    className={`
                      flex-shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-xl
                      border transition-colors duration-300
                      ${isCorrect
                        ? 'border-green-400/60 bg-green-500/10'
                        : 'border-white/10 bg-white/5'}
                    `}
                  >
                    <PlayerAvatar nickname={entry.name} size="xs" />
                    <div className="min-w-0">
                      <p className="text-xs font-medium truncate max-w-[72px] leading-tight">
                        {entry.name}
                      </p>
                      <p className="text-[11px] font-bold text-green-400 leading-tight">
                        {entry.score}
                      </p>
                    </div>
                    <span className={`text-xs ml-1 ${isAnswered ? 'text-green-400' : 'text-white/30'}`}>
                      {isAnswered ? '✓' : '…'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </header>

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
