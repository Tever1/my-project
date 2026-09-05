'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useSocket } from '@/lib/use-socket';
import { useTranslation } from '@/lib/i18n';
import { useNavigateOnGameStart } from '@/lib/use-navigate-on-game-start';
import { GAMES } from '@/lib/games-config';
import { QRCodeCanvas } from '@/components/ui/QRCode';

interface RoomState {
  id: string;
  code: string;
  hostId: string;
  players: { id: string; nickname: string; isHost: boolean; isConnected: boolean }[];
  status: string;
  currentGame: string | null;
  gameState: Record<string, unknown> | null;
  locale: 'ru' | 'en';
}

export default function TVPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const { emit, on, isConnected } = useSocket();
  const { locale, setLocale } = useTranslation();
  const [room, setRoom] = useState<RoomState | null>(null);
  const [networkIP, setNetworkIP] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/network-info')
      .then(res => res.json())
      .then(data => setNetworkIP(data.ip))
      .catch(() => {});
  }, []);

  const port = typeof window !== 'undefined' ? (window.location.port || '3000') : '3000';
  const qrOrigin = networkIP && networkIP !== 'localhost'
    ? `http://${networkIP}:${port}`
    : (typeof window !== 'undefined' ? window.location.origin : '');

  const joinUrl = qrOrigin ? `${qrOrigin}/lobby/${roomId}` : '';

  useEffect(() => {
    return on('room:state', (data: unknown) => {
      const nextRoom = data as RoomState;
      setRoom(nextRoom);
      if (nextRoom.locale === 'ru' || nextRoom.locale === 'en') setLocale(nextRoom.locale);
    });
  }, [on, setLocale]);

  useNavigateOnGameStart(
    ({ roomCode, gameType }) => `/tv/${roomCode}/${gameType}`,
  );

  // Join TV room only when socket is connected
  useEffect(() => {
    if (!isConnected) return;
    emit('tv:join', { code: roomId }, () => {});
  }, [isConnected, roomId, emit]);

  const currentGameInfo = room?.currentGame ? GAMES.find(g => g.id === room.currentGame) : null;

  return (
    <div className="h-screen bg-gradient-main text-white flex flex-col overflow-hidden">
      {/* Header */}
      <div className="text-center py-4 flex-shrink-0">
        <h1 className="text-4xl xl:text-5xl font-bold">🎮 Party Games Hub</h1>
        {room && (
          <p className="text-2xl xl:text-3xl text-white/40 font-mono tracking-[0.5em] mt-1">
            {room.code}
          </p>
        )}
      </div>

      {/* Main content - fills remaining space */}
      <div className="flex-1 flex items-center justify-center px-8 pb-6 min-h-0">
        {/* Lobby */}
        {room?.status === 'lobby' && (
          <div className="flex flex-row items-center gap-12 xl:gap-20 animate-slide-up w-full max-w-6xl justify-center">
            {/* QR Code - left side */}
            <div className="text-center flex-shrink-0">
              <div className="bg-white rounded-2xl p-4 shadow-2xl inline-block">
                <QRCodeCanvas value={joinUrl} size={220} />
              </div>
              <p className="text-base text-white/50 mt-3">
                {locale === 'ru' ? 'Сканируйте, чтобы присоединиться' : 'Scan to join'}
              </p>
            </div>

            {/* Players & game info - right side */}
            <div className="flex-1 min-w-0 max-w-xl">
              <h2 className="text-2xl xl:text-3xl font-semibold text-white mb-4">
                {locale === 'ru' ? 'Игроки' : 'Players'} ({room.players.length})
              </h2>
              <div className="flex flex-wrap gap-3">
                {room.players.map((player) => (
                  <div
                    key={player.id}
                    className="glass-card px-4 py-2 flex items-center gap-2"
                  >
                    <div className={`w-2.5 h-2.5 rounded-full ${player.isConnected ? 'bg-green-400' : 'bg-red-400'}`} />
                    <span className="text-lg text-white">{player.nickname}</span>
                    {player.isHost && <span className="text-lg">👑</span>}
                  </div>
                ))}
              </div>

              {currentGameInfo && (
                <div className="mt-6 glass-card p-4 inline-block">
                  <p className="text-white/50 text-sm mb-1">
                    {locale === 'ru' ? 'Выбранная игра' : 'Selected game'}
                  </p>
                  <p className="text-2xl text-white font-semibold">
                    {currentGameInfo.icon} {locale === 'ru' ? currentGameInfo.titleRu : currentGameInfo.titleEn}
                  </p>
                </div>
              )}

              {!currentGameInfo && (
                <p className="mt-6 text-xl text-white/30 animate-pulse">
                  {locale === 'ru' ? 'Ожидание выбора игры...' : 'Waiting for game selection...'}
                </p>
              )}
            </div>
          </div>
        )}

        {/* In-game fallback (shouldn't normally show after navigation) */}
        {room?.status === 'in-game' && room.gameState && (
          <div className="text-center animate-fade-in">
            <p className="text-4xl text-white font-semibold">
              {currentGameInfo?.icon} {locale === 'ru' ? currentGameInfo?.titleRu : currentGameInfo?.titleEn}
            </p>
            <p className="text-2xl text-white/50 mt-4">
              {locale === 'ru' ? 'Игра идёт...' : 'Game in progress...'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
