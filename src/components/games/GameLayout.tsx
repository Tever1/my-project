'use client';

import { ReactNode, useState } from 'react';
import { useTranslation } from '@/lib/i18n';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';

interface GameLayoutProps {
  children: ReactNode;
  title: string;
  icon: string;
  round?: number;
  totalRounds?: number;
  scores?: { name: string; score: number }[];
  onEnd?: () => void;
  showScoreboard?: boolean;
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
}: GameLayoutProps) {
  const { t } = useTranslation();
  const [scoreboardOpen, setScoreboardOpen] = useState(false);

  const sortedScores = scores
    ? [...scores].sort((a, b) => b.score - a.score)
    : [];

  return (
    <div className="bg-gradient-main min-h-[100dvh] text-white flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-30 backdrop-blur-xl bg-black/20 border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-2xl flex-shrink-0">{icon}</span>
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
            {/* Mobile scoreboard toggle */}
            {showScoreboard && sortedScores.length > 0 && (
              <button
                onClick={() => setScoreboardOpen(!scoreboardOpen)}
                className="lg:hidden glass-button px-3 py-2 text-sm"
              >
                🏆 {sortedScores.length}
              </button>
            )}

            {onEnd && (
              <GlassButton variant="danger" size="sm" onClick={onEnd}>
                {t('game.end')}
              </GlassButton>
            )}
          </div>
        </div>
      </header>

      {/* Mobile scoreboard dropdown */}
      {showScoreboard && scoreboardOpen && sortedScores.length > 0 && (
        <div className="lg:hidden fixed inset-0 z-40" onClick={() => setScoreboardOpen(false)}>
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

      {/* Main content area */}
      <div className="flex-1 max-w-6xl mx-auto px-4 py-6 w-full">
        <div className={`flex gap-6 ${showScoreboard && sortedScores.length > 0 ? 'lg:flex-row' : ''} flex-col h-full`}>
          {/* Game content */}
          <div className="flex-1 min-w-0">{children}</div>

          {/* Desktop scoreboard sidebar */}
          {showScoreboard && sortedScores.length > 0 && (
            <aside className="hidden lg:block w-72 flex-shrink-0">
              <div className="sticky top-24">
                <GlassCard className="p-5">
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    🏆 {t('game.scoreboard')}
                  </h3>
                  <div className="space-y-2">
                    {sortedScores.map((entry, i) => (
                      <div
                        key={entry.name}
                        className={`flex items-center justify-between py-2 px-3 rounded-xl transition-all ${
                          i === 0
                            ? 'bg-yellow-500/15 border border-yellow-500/20'
                            : i === 1
                              ? 'bg-gray-300/10 border border-gray-300/15'
                              : i === 2
                                ? 'bg-amber-700/10 border border-amber-700/15'
                                : 'bg-white/5'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="text-lg w-6 text-center flex-shrink-0">
                            {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`}
                          </span>
                          <span className="font-medium truncate">{entry.name}</span>
                        </div>
                        <span className="glass-badge ml-2 flex-shrink-0 text-sm font-bold">
                          {entry.score}
                        </span>
                      </div>
                    ))}
                  </div>
                </GlassCard>
              </div>
            </aside>
          )}
        </div>
      </div>
    </div>
  );
}
