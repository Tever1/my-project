'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/lib/i18n';
import { useAuth } from '@/lib/auth-context';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { GlassInput } from '@/components/ui/GlassInput';
import { LanguageToggle } from '@/components/ui/LanguageToggle';

export default function ProfilePage() {
  const { t, locale } = useTranslation();
  const { user, updateNickname, logout } = useAuth();
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [nickname, setNickname] = useState(user?.nickname || '');

  if (!user) {
    router.push('/');
    return null;
  }

  const handleSave = () => {
    if (nickname.trim().length >= 2) {
      updateNickname(nickname.trim());
      setEditing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-main flex flex-col">
      <nav className="glass-nav flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <button onClick={() => router.push('/')} className="text-white/50 hover:text-white transition-colors text-lg">
            ←
          </button>
          <span className="font-bold text-white">{t('common.settings')}</span>
        </div>
        <LanguageToggle />
      </nav>

      <div className="flex-1 flex flex-col items-center px-4 pt-8 max-w-lg mx-auto w-full space-y-4">
        {/* Profile Card */}
        <GlassCard className="p-6 w-full animate-fade-in">
          <div className="text-center mb-4">
            <div className="w-20 h-20 rounded-full bg-purple-500/20 flex items-center justify-center text-3xl mx-auto mb-3">
              {user.nickname.charAt(0).toUpperCase()}
            </div>
            {editing ? (
              <div className="flex gap-2 items-end">
                <GlassInput
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  maxLength={20}
                  autoFocus
                />
                <GlassButton variant="primary" size="sm" onClick={handleSave}>
                  ✓
                </GlassButton>
              </div>
            ) : (
              <div>
                <h2 className="text-xl font-bold text-white">{user.nickname}</h2>
                <button
                  onClick={() => setEditing(true)}
                  className="text-xs text-white/30 hover:text-white/60 transition-colors mt-1"
                >
                  {locale === 'ru' ? 'Изменить' : 'Edit'}
                </button>
              </div>
            )}
            <p className="text-sm text-white/30 mt-1 font-mono">{user.phone}</p>
          </div>
        </GlassCard>

        {/* Stats */}
        <GlassCard className="p-6 w-full animate-slide-up">
          <h3 className="text-lg font-semibold text-white mb-4">{t('common.stats')}</h3>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-white">{user.stats.gamesPlayed}</p>
              <p className="text-xs text-white/40">{locale === 'ru' ? 'Игр' : 'Games'}</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-400">{user.stats.gamesWon}</p>
              <p className="text-xs text-white/40">{locale === 'ru' ? 'Побед' : 'Wins'}</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-purple-400">{user.stats.totalScore}</p>
              <p className="text-xs text-white/40">{locale === 'ru' ? 'Очков' : 'Points'}</p>
            </div>
          </div>
        </GlassCard>

        {/* Game History */}
        <GlassCard className="p-6 w-full animate-slide-up">
          <h3 className="text-lg font-semibold text-white mb-4">{t('common.history')}</h3>
          {user.gameHistory.length === 0 ? (
            <p className="text-sm text-white/30 text-center py-4">{t('common.noGames')}</p>
          ) : (
            <div className="space-y-2">
              {user.gameHistory.slice(0, 10).map((game, i) => (
                <div key={i} className="glass-badge px-4 py-2 rounded-xl flex items-center justify-between">
                  <div>
                    <span className="text-sm text-white/70">{game.gameType}</span>
                    <span className="text-xs text-white/30 ml-2">
                      {new Date(game.date).toLocaleDateString(locale)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-white/60">{game.score} pts</span>
                    {game.won && <span className="text-yellow-400 text-xs">🏆</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </GlassCard>

        {/* Language */}
        <GlassCard className="p-6 w-full">
          <h3 className="text-lg font-semibold text-white mb-4">{t('common.language')}</h3>
          <div className="flex gap-3">
            <LanguageToggle />
          </div>
        </GlassCard>

        {/* Logout */}
        <GlassButton
          variant="danger"
          className="w-full"
          onClick={() => { logout(); router.push('/'); }}
        >
          {locale === 'ru' ? 'Выйти' : 'Log out'}
        </GlassButton>
      </div>
    </div>
  );
}
