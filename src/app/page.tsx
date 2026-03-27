'use client';

import { useTranslation } from '@/lib/i18n';
import { useAuth } from '@/lib/auth-context';
import { LanguageToggle } from '@/components/ui/LanguageToggle';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { GlassInput } from '@/components/ui/GlassInput';
import { GAMES } from '@/lib/games-config';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useSocket } from '@/lib/use-socket';

export default function Home() {
  const { t, locale } = useTranslation();
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();
  const { emit, isConnected } = useSocket();
  const [joinCode, setJoinCode] = useState('');
  const [showJoin, setShowJoin] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      router.push('/auth');
    } else if (!user.nickname) {
      router.push('/auth/verify');
    }
  }, [user, isLoading, router]);

  if (isLoading || !user || !user.nickname) {
    return (
      <div className="min-h-screen bg-gradient-main flex flex-col items-center justify-center">
        <div className="text-5xl mb-4">🎮</div>
        <h1 className="text-3xl font-bold text-white mb-2">Party Games Hub</h1>
        <p className="text-white/50 animate-pulse mt-4">{isLoading ? '...' : ''}</p>
      </div>
    );
  }

  const handleCreateRoom = () => {
    if (!isConnected) {
      setCreateError(locale === 'ru' ? 'Нет подключения к серверу. Проверьте, запущен ли сервер.' : 'No connection to server. Check if the server is running.');
      setShowCreateModal(true);
      return;
    }
    setCreating(true);
    setCreateError(null);

    const timeout = setTimeout(() => {
      setCreating(false);
      setCreateError(locale === 'ru' ? 'Сервер не отвечает. Попробуйте ещё раз.' : 'Server not responding. Try again.');
      setShowCreateModal(true);
    }, 5000);

    emit('room:create', { playerId: user.id, nickname: user.nickname }, (response: unknown) => {
      clearTimeout(timeout);
      const res = response as { success: boolean; code: string };
      setCreating(false);
      if (res.success) {
        router.push(`/lobby/${res.code}`);
      }
    });
  };

  const handleJoinRoom = () => {
    if (joinCode.length < 4) return;
    emit('room:join', { code: joinCode.toUpperCase(), playerId: user.id, nickname: user.nickname }, (response: unknown) => {
      const res = response as { success: boolean; code: string; error?: string };
      if (res.success) {
        router.push(`/lobby/${res.code}`);
      } else {
        alert(res.error || 'Error joining room');
      }
    });
  };

  return (
    <div className="min-h-screen bg-gradient-main flex flex-col">
      {/* Navigation */}
      <nav className="glass-nav flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🎮</span>
          <span className="font-bold text-lg text-white">{t('app.title')}</span>
        </div>
        <div className="flex items-center gap-3">
          <LanguageToggle />
          <button
            onClick={() => router.push('/profile')}
            className="glass-badge px-3 py-1.5 text-sm cursor-pointer hover:scale-105 transition-all"
          >
            {user.nickname}
          </button>
          <button
            onClick={logout}
            className="text-white/50 hover:text-white/80 text-sm transition-colors"
          >
            ✕
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="flex-1 flex flex-col items-center justify-start px-4 pt-8 pb-20 max-w-4xl mx-auto w-full">
        <div className="text-center mb-8 animate-fade-in">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-3">
            {t('app.title')}
          </h1>
          <p className="text-lg text-white/60">{t('app.subtitle')}</p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 mb-10 w-full max-w-md animate-slide-up">
          <GlassButton
            variant="primary"
            size="lg"
            className="flex-1"
            onClick={handleCreateRoom}
            disabled={creating}
          >
            {creating ? t('common.loading') : t('lobby.createRoom')}
          </GlassButton>
          <GlassButton
            size="lg"
            className="flex-1"
            onClick={() => setShowJoin(!showJoin)}
          >
            {t('lobby.joinRoom')}
          </GlassButton>
        </div>

        {/* Join Room Input */}
        {showJoin && (
          <div className="w-full max-w-md mb-10 animate-scale-in">
            <GlassCard className="p-6">
              <div className="flex gap-3">
                <GlassInput
                  placeholder={t('lobby.roomCode')}
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  maxLength={6}
                  className="text-center text-xl tracking-widest uppercase"
                />
                <GlassButton variant="primary" onClick={handleJoinRoom}>
                  {t('lobby.join')}
                </GlassButton>
              </div>
            </GlassCard>
          </div>
        )}

        {/* Games Grid */}
        <div className="w-full">
          <h2 className="text-xl font-semibold text-white/80 mb-4">
            {t('lobby.selectGame')}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {GAMES.map((game, index) => (
              <GlassCard
                key={game.id}
                hover
                className="p-5 cursor-pointer animate-slide-up"
              >
                <div style={{ animationDelay: `${index * 0.1}s` }}>
                  <div className="text-3xl mb-3">{game.icon}</div>
                  <h3 className="text-lg font-semibold text-white mb-1">
                    {locale === 'ru' ? game.titleRu : game.titleEn}
                  </h3>
                  <p className="text-sm text-white/50 mb-3">
                    {locale === 'ru' ? game.descriptionRu : game.descriptionEn}
                  </p>
                  <div className="flex gap-2">
                    <span className="glass-badge text-xs px-2 py-0.5">
                      {game.minPlayers}-{game.maxPlayers} {locale === 'ru' ? 'игроков' : 'players'}
                    </span>
                  </div>
                </div>
              </GlassCard>
            ))}
          </div>
        </div>
      </div>

      {/* Error Modal */}
      {showCreateModal && createError && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowCreateModal(false); }}
        >
          <div className="glass-card p-6 w-full max-w-md animate-scale-in">
            <div className="mb-4 p-3 rounded-lg bg-red-500/20 border border-red-500/30 text-red-300 text-sm">
              {createError}
            </div>
            <GlassButton className="w-full" onClick={() => setShowCreateModal(false)}>
              OK
            </GlassButton>
          </div>
        </div>
      )}
    </div>
  );
}
