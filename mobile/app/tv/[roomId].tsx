import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import QRCode from 'react-native-qrcode-svg';
import { GlassCard } from '@/components/ui/GlassCard';
import { useSocket } from '@/lib/use-socket';
import { useTranslation } from '@/lib/i18n';
import { GAMES } from '@/lib/games-config';
import { Colors, Radius } from '@/lib/colors';
import { SERVER_URL } from '@/lib/socket';

interface RoomState {
  id: string;
  code: string;
  hostId: string;
  players: { id: string; nickname: string; isHost: boolean; isConnected: boolean }[];
  status: string;
  currentGame: string | null;
  gameState: Record<string, unknown> | null;
}

export default function TVScreen() {
  const { roomId } = useLocalSearchParams<{ roomId: string }>();
  const { emit, on } = useSocket();
  const { locale } = useTranslation();
  const router = useRouter();
  const [room, setRoom] = useState<RoomState | null>(null);

  // Deep link URL for joining
  const joinUrl = `${SERVER_URL.replace(/:\d+$/, ':3000')}/lobby/${roomId}`;

  useEffect(() => {
    const unsub = on('room:state', (data: unknown) => {
      setRoom(data as RoomState);
    });

    const unsubStarted = on('game:started', (data: unknown) => {
      const { gameType, roomCode } = data as { gameType: string; roomCode: string };
      router.push(`/tv/${roomCode}/${gameType}` as never);
    });

    emit('tv:join', { code: roomId }, () => {});

    return () => { unsub(); unsubStarted(); };
  }, [roomId, emit, on, router]);

  const currentGameInfo = room?.currentGame ? GAMES.find(g => g.id === room.currentGame) : null;
  const l = (ru: string, en: string) => (locale === 'ru' ? ru : en);

  return (
    <LinearGradient
      colors={['#0c0a15', '#1a1035', '#0f172a', '#0c0a15']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <SafeAreaView style={styles.container}>
        {/* Title */}
        <View style={styles.titleSection}>
          <Text style={styles.mainTitle}>🎮 Party Games Hub</Text>
          {room && (
            <Text style={styles.roomCode}>{room.code}</Text>
          )}
        </View>

        {/* Lobby state */}
        {room?.status === 'lobby' && (
          <View style={styles.lobbyContent}>
            {/* QR Code */}
            <View style={styles.qrSection}>
              <View style={styles.qrContainer}>
                <QRCode value={joinUrl} size={200} backgroundColor="white" color="black" />
              </View>
              <Text style={styles.qrHint}>
                {l('Сканируйте, чтобы присоединиться', 'Scan to join')}
              </Text>
            </View>

            {/* Players */}
            <View style={styles.playersSection}>
              <Text style={styles.playersTitle}>
                {l('Игроки', 'Players')} ({room.players.length})
              </Text>
              <View style={styles.playersGrid}>
                {room.players.map((player) => (
                  <GlassCard key={player.id} style={styles.playerCard}>
                    <View style={[styles.statusDot, { backgroundColor: player.isConnected ? '#4ade80' : '#f87171' }]} />
                    <Text style={styles.playerName}>{player.nickname}</Text>
                    {player.isHost && <Text style={{ fontSize: 18 }}>👑</Text>}
                  </GlassCard>
                ))}
              </View>

              {currentGameInfo ? (
                <GlassCard style={styles.selectedGameCard}>
                  <Text style={styles.selectedGameLabel}>
                    {l('Выбранная игра', 'Selected game')}
                  </Text>
                  <Text style={styles.selectedGameName}>
                    {currentGameInfo.icon} {locale === 'ru' ? currentGameInfo.titleRu : currentGameInfo.titleEn}
                  </Text>
                </GlassCard>
              ) : (
                <Text style={styles.waitingGame}>
                  {l('Ожидание выбора игры...', 'Waiting for game selection...')}
                </Text>
              )}
            </View>
          </View>
        )}

        {/* In-game */}
        {room?.status === 'in-game' && room.gameState && (
          <View style={styles.inGameSection}>
            <Text style={styles.inGameTitle}>
              {currentGameInfo?.icon} {locale === 'ru' ? currentGameInfo?.titleRu : currentGameInfo?.titleEn}
            </Text>
            <Text style={styles.inGameSub}>
              {l('Игра идёт...', 'Game in progress...')}
            </Text>
          </View>
        )}
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  titleSection: { alignItems: 'center', paddingTop: 40, paddingBottom: 24 },
  mainTitle: { fontSize: 36, fontWeight: '700', color: Colors.white },
  roomCode: { fontSize: 24, color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace', letterSpacing: 8, marginTop: 8 },
  lobbyContent: { flex: 1, padding: 24, gap: 24 },
  qrSection: { alignItems: 'center' },
  qrContainer: {
    backgroundColor: 'white', borderRadius: Radius.xl, padding: 16,
    shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 20, elevation: 10,
  },
  qrHint: { fontSize: 16, color: 'rgba(255,255,255,0.4)', marginTop: 12 },
  playersSection: { flex: 1 },
  playersTitle: { fontSize: 22, fontWeight: '600', color: Colors.white, marginBottom: 12 },
  playersGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  playerCard: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 10 },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  playerName: { fontSize: 16, color: Colors.white },
  selectedGameCard: { marginTop: 20, padding: 16 },
  selectedGameLabel: { fontSize: 14, color: 'rgba(255,255,255,0.4)', marginBottom: 4 },
  selectedGameName: { fontSize: 22, fontWeight: '600', color: Colors.white },
  waitingGame: { marginTop: 20, fontSize: 18, color: 'rgba(255,255,255,0.2)' },
  inGameSection: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  inGameTitle: { fontSize: 32, fontWeight: '600', color: Colors.white },
  inGameSub: { fontSize: 20, color: 'rgba(255,255,255,0.4)', marginTop: 12 },
});
