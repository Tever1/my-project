'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslation } from '@/lib/i18n';
import { useAuth } from '@/lib/auth-context';
import { useSocket } from '@/lib/use-socket';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { LanguageToggle } from '@/components/ui/LanguageToggle';
import { GAMES } from '@/lib/games-config';
import { GameType } from '@/types/game';
import { QRCodeCanvas } from '@/components/ui/QRCode';

interface RoomState {
  id: string;
  code: string;
  hostId: string;
  players: { id: string; nickname: string; isHost: boolean; isConnected: boolean }[];
  status: string;
  currentGame: string | null;
  gameState: Record<string, unknown> | null;
}

export default function LobbyPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const { t, locale } = useTranslation();
  const { user } = useAuth();
  const { emit, on, isConnected } = useSocket();
  const router = useRouter();
  const [room, setRoom] = useState<RoomState | null>(null);
  const [selectedGame, setSelectedGame] = useState<GameType | null>(null);
  const [showQR, setShowQR] = useState(true);
  const [codeCopied, setCodeCopied] = useState(false);
  const [showTvModal, setShowTvModal] = useState(false);

  useEffect(() => {
    if (!user) {
      router.push(`/auth?redirect=/lobby/${roomId}`);
      return;
    }

    const unsub = on('room:state', (data: unknown) => {
      const roomData = data as RoomState;
      setRoom(roomData);
      if (roomData.currentGame) {
        setSelectedGame(roomData.currentGame as GameType);
      }
    });

    const unsubStarted = on('game:started', (data: unknown) => {
      const { gameType, roomCode } = data as { gameType: string; roomCode: string };
      router.push(`/game/${roomCode}/${gameType}`);
    });

    const unsubKicked = on('room:kicked', () => {
      router.push('/');
    });

    return () => {
      unsub();
      unsubStarted();
      unsubKicked();
    };
  }, [user, roomId, on, router]);

  // Join room only when socket is connected and user is ready
  useEffect(() => {
    if (!user || !isConnected) return;
    emit('room:join', { code: roomId, playerId: user.id, nickname: user.nickname }, () => {});
  }, [user, isConnected, roomId, emit]);

  const isHost = room && user && room.hostId === user.id;

  const handleSelectGame = (gameType: GameType) => {
    if (!isHost || !room) return;
    setSelectedGame(gameType);
    emit('game:select', { code: room.code, gameType });
  };

  const handleStartGame = () => {
    if (!isHost || !room || !selectedGame) return;
    emit('game:start', { code: room.code });
  };

  const handleCopyCode = useCallback(() => {
    if (!room) return;
    navigator.clipboard.writeText(room.code);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  }, [room]);

  const handleKick = (playerId: string) => {
    if (!isHost || !room) return;
    emit('room:kick', { code: room.code, playerId });
  };

  const handleTransferHost = (playerId: string) => {
    if (!isHost || !room) return;
    emit('room:transfer-host', { code: room.code, newHostId: playerId });
  };

  const handleLeave = () => {
    emit('room:leave');
    router.push('/');
  };

  const [networkIP, setNetworkIP] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/network-info')
      .then(res => res.json())
      .then(data => {
        console.log('[QR] Network IP:', data.ip);
        setNetworkIP(data.ip);
      })
      .catch((err) => console.error('[QR] Failed to fetch network info:', err));
  }, []);

  // Use network IP for QR codes so phones on the same Wi-Fi can connect
  const port = typeof window !== 'undefined' ? (window.location.port || '3000') : '3000';
  const qrOrigin = networkIP && networkIP !== 'localhost'
    ? `http://${networkIP}:${port}`
    : (typeof window !== 'undefined' ? window.location.origin : '');

  const joinUrl = qrOrigin ? `${qrOrigin}/lobby/${roomId}` : '';

  const tvUrl = qrOrigin ? `${qrOrigin}/tv/${roomId}` : '';

  const selectedGameInfo = selectedGame ? GAMES.find(g => g.id === selectedGame) : null;

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-main flex flex-col">
      {/* Nav */}
      <nav className="glass-nav flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <button onClick={handleLeave} className="text-white/50 hover:text-white transition-colors text-lg">
            ←
          </button>
          <span className="font-bold text-white">{t('lobby.title')}</span>
        </div>
        <div className="flex items-center gap-2">
          <LanguageToggle />
          <GlassButton size="sm" onClick={() => setShowTvModal(true)}>
            📺 {t('lobby.tvMode')}
          </GlassButton>
        </div>
      </nav>

      <div className="flex-1 flex flex-col lg:flex-row gap-4 p-4 max-w-6xl mx-auto w-full">
        {/* Left Column - Room Info & Players */}
        <div className="lg:w-1/3 space-y-4">
          {/* Room Code & QR */}
          <GlassCard className="p-5 animate-fade-in">
            <div className="text-center">
              <p className="text-sm text-white/50 mb-1">{t('lobby.roomCode')}</p>
              <button
                onClick={handleCopyCode}
                className="text-3xl font-mono font-bold text-white tracking-[0.3em] hover:text-white/80 transition-colors"
              >
                {room?.code || roomId}
              </button>
              <p className="text-xs text-white/30 mt-1">
                {codeCopied ? t('lobby.codeCopied') : t('lobby.copyCode')}
              </p>
            </div>

            {showQR && joinUrl && (
              <div className="mt-4 flex justify-center">
                <div className="bg-white rounded-2xl p-3">
                  <QRCodeCanvas value={joinUrl} size={160} />
                </div>
              </div>
            )}

            <button
              onClick={() => setShowQR(!showQR)}
              className="w-full text-xs text-white/30 mt-3 hover:text-white/50 transition-colors"
            >
              {showQR ? t('common.close') : t('lobby.scanQR')}
            </button>
          </GlassCard>

          {/* Players List */}
          <GlassCard className="p-5 animate-slide-up">
            <h3 className="text-sm font-semibold text-white/60 mb-3">
              {t('lobby.players')} ({room?.players.length || 0})
            </h3>
            <div className="space-y-2">
              {room?.players.map((player) => (
                <div
                  key={player.id}
                  className="flex items-center justify-between glass-badge px-3 py-2 rounded-xl"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        player.isConnected ? 'bg-green-400' : 'bg-red-400'
                      }`}
                    />
                    <span className="text-sm text-white/80">{player.nickname}</span>
                    {player.isHost && (
                      <span className="text-xs text-yellow-400/80">👑</span>
                    )}
                  </div>
                  {isHost && !player.isHost && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleTransferHost(player.id)}
                        className="text-xs text-yellow-400/50 hover:text-yellow-400 transition-colors"
                        title={locale === 'ru' ? 'Передать лидера' : 'Transfer host'}
                      >
                        👑
                      </button>
                      <button
                        onClick={() => handleKick(player.id)}
                        className="text-xs text-red-400/50 hover:text-red-400 transition-colors"
                      >
                        {t('lobby.kick')}
                      </button>
                    </div>
                  )}
                </div>
              ))}
              {(!room || room.players.length === 0) && (
                <p className="text-sm text-white/30 text-center py-4">
                  {t('lobby.waiting')}
                </p>
              )}
            </div>
          </GlassCard>
        </div>

        {/* Right Column - Game Selection */}
        <div className="lg:w-2/3 space-y-4">
          <GlassCard className="p-5 animate-slide-up">
            <h3 className="text-lg font-semibold text-white mb-4">
              {t('lobby.selectGame')}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {GAMES.map((game) => {
                const isSelected = selectedGame === game.id;
                const hasEnoughPlayers = (room?.players.length || 0) >= game.minPlayers;
                return (
                  <div
                    key={game.id}
                    onClick={() => isHost && handleSelectGame(game.id)}
                    className={`glass-card p-4 transition-all ${
                      isHost ? 'cursor-pointer hover:scale-[1.02]' : ''
                    } ${isSelected ? 'ring-2 ring-purple-400/50 bg-purple-500/10' : ''}`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">{game.icon}</span>
                      <div className="flex-1">
                        <h4 className="font-semibold text-white text-sm">
                          {locale === 'ru' ? game.titleRu : game.titleEn}
                        </h4>
                        <p className="text-xs text-white/40 mt-1">
                          {locale === 'ru' ? game.descriptionRu : game.descriptionEn}
                        </p>
                        <div className="flex gap-2 mt-2">
                          <span className={`text-xs px-1.5 py-0.5 rounded ${
                            hasEnoughPlayers ? 'text-green-400/70' : 'text-red-400/70'
                          }`}>
                            {game.minPlayers}-{game.maxPlayers} {locale === 'ru' ? 'игр.' : 'pl.'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </GlassCard>

          {/* Start Game Button */}
          {isHost && selectedGameInfo && (
            <div className="animate-scale-in">
              <GlassButton
                variant="primary"
                size="lg"
                className="w-full"
                onClick={handleStartGame}
                disabled={(room?.players.length || 0) < selectedGameInfo.minPlayers}
              >
                {t('lobby.startGame')}: {locale === 'ru' ? selectedGameInfo.titleRu : selectedGameInfo.titleEn}
              </GlassButton>
              {(room?.players.length || 0) < selectedGameInfo.minPlayers && (
                <p className="text-xs text-white/30 text-center mt-2">
                  {t('lobby.minPlayers')}: {selectedGameInfo.minPlayers}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* TV Mode Modal */}
      {showTvModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowTvModal(false)}>
          <GlassCard className="p-6 max-w-md w-full animate-scale-in" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
            <div className="text-center space-y-4">
              <span className="text-4xl">📺</span>
              <p className="text-white text-lg">
                {t('lobby.tvModalText')}
              </p>
              <a
                href={tvUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-purple-300 hover:text-purple-200 underline break-all text-sm"
              >
                {tvUrl}
              </a>
              <div className="flex gap-2 pt-2">
                <GlassButton
                  size="sm"
                  className="flex-1"
                  onClick={() => {
                    navigator.clipboard.writeText(tvUrl);
                  }}
                >
                  {t('lobby.copyCode')}
                </GlassButton>
                <GlassButton
                  size="sm"
                  className="flex-1"
                  onClick={() => setShowTvModal(false)}
                >
                  {t('common.close')}
                </GlassButton>
              </div>
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  );
}
