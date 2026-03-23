'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSocket } from '@/lib/use-socket';
import { useTranslation } from '@/lib/i18n';
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
}

export default function TVPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const { emit, on } = useSocket();
  const { locale } = useTranslation();
  const router = useRouter();
  const [room, setRoom] = useState<RoomState | null>(null);
  const [networkIP, setNetworkIP] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/network-info')
      .then(res => res.json())
      .then(data => setNetworkIP(data.ip))
      .catch(() => {});
  }, []);

  const qrOrigin = networkIP && networkIP !== 'localhost'
    ? `http://${networkIP}:${typeof window !== 'undefined' ? window.location.port : '3000'}`
    : (typeof window !== 'undefined' ? window.location.origin : '');

  const joinUrl = qrOrigin ? `${qrOrigin}/lobby/${roomId}` : '';

  useEffect(() => {
    const unsub = on('room:state', (data: unknown) => {
      setRoom(data as RoomState);
    });

    const unsubStarted = on('game:started', (data: unknown) => {
      const { gameType, roomCode } = data as { gameType: string; roomCode: string };
      router.push(`/tv/${roomCode}/${gameType}`);
    });

    emit('tv:join', { code: roomId }, () => {});

    return () => {
      unsub();
      unsubStarted();
    };
  }, [roomId, emit, on, router]);

  const currentGameInfo = room?.currentGame ? GAMES.find(g => g.id === room.currentGame) : null;

  return (
    <div className="min-h-screen bg-gradient-main tv-mode flex flex-col items-center justify-center p-8">
      {/* Title */}
      <div className="text-center mb-12 animate-fade-in">
        <h1 className="text-6xl font-bold text-white mb-2">🎮 Party Games Hub</h1>
        {room && (
          <p className="text-3xl text-white/40 font-mono tracking-[0.5em]">
            {room.code}
          </p>
        )}
      </div>

      {/* Waiting for game */}
      {room?.status === 'lobby' && (
        <div className="flex flex-col lg:flex-row items-center gap-16 animate-slide-up">
          {/* QR Code */}
          <div className="text-center">
            <div className="bg-white rounded-3xl p-6 shadow-2xl">
              <QRCodeCanvas value={joinUrl} size={280} />
            </div>
            <p className="text-xl text-white/50 mt-4">
              {locale === 'ru' ? 'Сканируйте, чтобы присоединиться' : 'Scan to join'}
            </p>
          </div>

          {/* Players */}
          <div className="text-center lg:text-left">
            <h2 className="text-3xl font-semibold text-white mb-6">
              {locale === 'ru' ? 'Игроки' : 'Players'} ({room.players.length})
            </h2>
            <div className="flex flex-wrap gap-4 justify-center lg:justify-start">
              {room.players.map((player) => (
                <div
                  key={player.id}
                  className="glass-card px-6 py-3 flex items-center gap-3"
                >
                  <div className={`w-3 h-3 rounded-full ${player.isConnected ? 'bg-green-400' : 'bg-red-400'}`} />
                  <span className="text-xl text-white">{player.nickname}</span>
                  {player.isHost && <span className="text-xl">👑</span>}
                </div>
              ))}
            </div>

            {currentGameInfo && (
              <div className="mt-8 glass-card p-6 inline-block">
                <p className="text-white/50 text-lg mb-2">
                  {locale === 'ru' ? 'Выбранная игра' : 'Selected game'}
                </p>
                <p className="text-3xl text-white font-semibold">
                  {currentGameInfo.icon} {locale === 'ru' ? currentGameInfo.titleRu : currentGameInfo.titleEn}
                </p>
              </div>
            )}

            {!currentGameInfo && (
              <p className="mt-8 text-2xl text-white/30 animate-pulse">
                {locale === 'ru' ? 'Ожидание выбора игры...' : 'Waiting for game selection...'}
              </p>
            )}
          </div>
        </div>
      )}

      {/* In-game state on TV shows game-specific content */}
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
  );
}
