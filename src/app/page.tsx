'use client';

import { useTranslation } from '@/lib/i18n';
import { useAuth } from '@/lib/auth-context';
import { LanguageToggle } from '@/components/ui/LanguageToggle';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { GlassInput } from '@/components/ui/GlassInput';
import { QRCode } from '@/components/ui/QRCode';
import { GAMES } from '@/lib/games-config';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';
import { useSocket } from '@/lib/use-socket';

export default function Home() {
  const { t, locale } = useTranslation();
  const { user, logout } = useAuth();
  const router = useRouter();
  const { emit } = useSocket();
  const [joinCode, setJoinCode] = useState('');
  const [showJoin, setShowJoin] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedGame, setSelectedGame] = useState<string | null>(null);
  const [maxPlayers, setMaxPlayers] = useState(10);
  const [createdRoomCode, setCreatedRoomCode] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);

  useEffect(() => {
    if (!user) {
      router.push('/auth');
    } else if (!user.nickname) {
      router.push('/auth/verify');
    }
  }, [user, router]);

  if (!user || !user.nickname) {
    return null;
  }

  const handleOpenCreateModal = () => {
    setShowCreateModal(true);
    setCreatedRoomCode(null);
    setSelectedGame(null);
    setMaxPlayers(10);
    setCodeCopied(false);
  };

  const handleCreateRoom = () => {
    setCreating(true);
    emit('room:create', { playerId: user.id, nickname: user.nickname }, (response: unknown) => {
      const res = response as { success: boolean; code: string };
      setCreating(false);
      if (res.success) {
        setCreatedRoomCode(res.code);
        if (selectedGame) {
          emit('game:select', { roomId: res.code, gameId: selectedGame });
        }
      }
    });
  };

  const handleGoToLobby = () => {
    if (createdRoomCode) {
      router.push(`/lobby/${createdRoomCode}`);
    }
  };

  const handleCopyCode = () => {
    if (createdRoomCode) {
      navigator.clipboard.writeText(createdRoomCode);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    }
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
            onClick={handleOpenCreateModal}
          >
            {t('lobby.createRoom')}
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

      {/* Create Room Modal */}
      {showCreateModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
          onClick={(e) => { if (e.target === e.currentTarget && !createdRoomCode) setShowCreateModal(false); }}
        >
          <div className="glass-card p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto animate-scale-in">
            {!createdRoomCode ? (
              <>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-white">{t('createRoom.title')}</h2>
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="text-white/50 hover:text-white text-xl transition-colors"
                  >
                    ✕
                  </button>
                </div>

                {/* Game Selection */}
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-white/70 uppercase tracking-wide mb-3">
                    {t('createRoom.chooseGame')}
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    {GAMES.map((game) => (
                      <div
                        key={game.id}
                        onClick={() => setSelectedGame(selectedGame === game.id ? null : game.id)}
                        className={`glass-card p-3 cursor-pointer transition-all ${
                          selectedGame === game.id
                            ? 'ring-2 ring-purple-400 bg-white/15'
                            : 'hover:bg-white/10'
                        }`}
                      >
                        <div className="text-xl mb-1">{game.icon}</div>
                        <div className="text-sm font-medium text-white">
                          {locale === 'ru' ? game.titleRu : game.titleEn}
                        </div>
                        <div className="text-xs text-white/40">
                          {game.minPlayers}-{game.maxPlayers} {locale === 'ru' ? 'игр.' : 'pl.'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Max Players */}
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-white/70 uppercase tracking-wide mb-3">
                    {t('createRoom.maxPlayers')}
                  </h3>
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => setMaxPlayers(Math.max(2, maxPlayers - 1))}
                      className="glass-button w-10 h-10 flex items-center justify-center text-lg"
                    >
                      −
                    </button>
                    <span className="text-2xl font-bold text-white min-w-[3ch] text-center">{maxPlayers}</span>
                    <button
                      onClick={() => setMaxPlayers(Math.min(20, maxPlayers + 1))}
                      className="glass-button w-10 h-10 flex items-center justify-center text-lg"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Create Button */}
                <GlassButton
                  variant="primary"
                  size="lg"
                  className="w-full"
                  onClick={handleCreateRoom}
                  disabled={creating}
                >
                  {creating ? t('common.loading') : t('createRoom.create')}
                </GlassButton>
              </>
            ) : (
              <>
                {/* Room Created - Share Screen */}
                <div className="text-center">
                  <div className="text-4xl mb-3">🎉</div>
                  <h2 className="text-2xl font-bold text-white mb-2">{t('createRoom.roomReady')}</h2>
                  <p className="text-white/60 mb-6">{t('createRoom.shareWithFriends')}</p>

                  {/* Room Code */}
                  <div className="glass-card p-4 mb-4">
                    <div className="text-xs text-white/50 uppercase tracking-wide mb-1">{t('lobby.roomCode')}</div>
                    <div className="text-4xl font-bold tracking-[0.3em] text-white mb-3">{createdRoomCode}</div>
                    <GlassButton size="sm" onClick={handleCopyCode}>
                      {codeCopied ? t('lobby.codeCopied') : t('lobby.copyCode')}
                    </GlassButton>
                  </div>

                  {/* QR Code */}
                  <div className="glass-card p-4 mb-6 inline-block">
                    <QRCode value={`${typeof window !== 'undefined' ? window.location.origin : ''}/lobby/${createdRoomCode}`} size={180} />
                    <div className="text-xs text-white/40 mt-2">{t('lobby.scanQR')}</div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3">
                    <GlassButton
                      className="flex-1"
                      onClick={() => {
                        setShowCreateModal(false);
                        setCreatedRoomCode(null);
                      }}
                    >
                      {t('common.close')}
                    </GlassButton>
                    <GlassButton
                      variant="primary"
                      className="flex-1"
                      onClick={handleGoToLobby}
                    >
                      {t('createRoom.goToLobby')}
                    </GlassButton>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
