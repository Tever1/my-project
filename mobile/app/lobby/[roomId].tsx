import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, Share } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import QRCode from 'react-native-qrcode-svg';
import { useTranslation } from '@/lib/i18n';
import { useAuth } from '@/lib/auth-context';
import { useSocket } from '@/lib/use-socket';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { LanguageToggle } from '@/components/ui/LanguageToggle';
import { GlassBadge } from '@/components/ui/GlassBadge';
import { GAMES } from '@/lib/games-config';
import { GameType } from '@/types/game';
import { Colors, Radius } from '@/lib/colors';
import { getServerUrl } from '@/lib/socket';

interface RoomState {
  id: string;
  code: string;
  hostId: string;
  players: { id: string; nickname: string; isHost: boolean; isConnected: boolean }[];
  status: string;
  currentGame: string | null;
  gameState: Record<string, unknown> | null;
}

export default function LobbyScreen() {
  const { roomId } = useLocalSearchParams<{ roomId: string }>();
  const { t, locale } = useTranslation();
  const { user } = useAuth();
  const { emit, on } = useSocket();
  const [room, setRoom] = useState<RoomState | null>(null);
  const [selectedGame, setSelectedGame] = useState<GameType | null>(null);
  const [showQR, setShowQR] = useState(true);
  const [codeCopied, setCodeCopied] = useState(false);

  useEffect(() => {
    if (!user) {
      router.replace('/auth');
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
      router.push(`/game/${roomCode}/${gameType}` as any);
    });

    const unsubKicked = on('room:kicked', () => {
      router.replace('/');
    });

    emit('room:join', { code: roomId, playerId: user.id, nickname: user.nickname }, () => {});

    return () => { unsub(); unsubStarted(); unsubKicked(); };
  }, [user, roomId, emit, on]);

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

  const handleCopyCode = useCallback(async () => {
    if (!room) return;
    await Clipboard.setStringAsync(room.code);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  }, [room]);

  const handleShare = async () => {
    if (!room) return;
    await Share.share({
      message: `Join my Party Games Hub room! Code: ${room.code}`,
    });
  };

  const handleKick = (playerId: string) => {
    if (!isHost || !room) return;
    emit('room:kick', { code: room.code, playerId });
  };

  const handleLeave = () => {
    emit('room:leave');
    router.replace('/');
  };

  const selectedGameInfo = selectedGame ? GAMES.find(g => g.id === selectedGame) : null;
  const joinUrl = `${getServerUrl()}/lobby/${roomId}`;

  if (!user) return null;

  return (
    <LinearGradient
      colors={['#0c0a15', '#1a1035', '#0f172a', '#0c0a15']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.gradient}
    >
      <SafeAreaView style={styles.container}>
        {/* Nav */}
        <View style={styles.nav}>
          <View style={styles.navLeft}>
            <Pressable onPress={handleLeave}>
              <Text style={styles.backBtn}>←</Text>
            </Pressable>
            <Text style={styles.navTitle}>{t('lobby.title')}</Text>
          </View>
          <View style={styles.navRight}>
            <LanguageToggle />
            <GlassButton size="sm" onPress={handleShare}>
              📤 {t('lobby.shareLink')}
            </GlassButton>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* Room Code */}
          <GlassCard style={styles.codeCard}>
            <Text style={styles.codeLabel}>{t('lobby.roomCode')}</Text>
            <Pressable onPress={handleCopyCode}>
              <Text style={styles.codeText}>{room?.code || roomId}</Text>
            </Pressable>
            <Text style={styles.copyHint}>
              {codeCopied ? t('lobby.codeCopied') : t('lobby.copyCode')}
            </Text>

            {showQR && (
              <View style={styles.qrContainer}>
                <View style={styles.qrBg}>
                  <QRCode value={joinUrl} size={160} backgroundColor="white" color="black" />
                </View>
              </View>
            )}

            <Pressable onPress={() => setShowQR(!showQR)}>
              <Text style={styles.toggleQR}>
                {showQR ? t('common.close') : t('lobby.scanQR')}
              </Text>
            </Pressable>
          </GlassCard>

          {/* Players */}
          <GlassCard style={styles.playersCard}>
            <Text style={styles.sectionTitle}>
              {t('lobby.players')} ({room?.players.length || 0})
            </Text>
            {room?.players.map((player) => (
              <View key={player.id} style={styles.playerRow}>
                <View style={styles.playerLeft}>
                  <View style={[styles.dot, { backgroundColor: player.isConnected ? Colors.green : Colors.red }]} />
                  <Text style={styles.playerName}>{player.nickname}</Text>
                  {player.isHost && <Text style={styles.crown}>👑</Text>}
                </View>
                {isHost && !player.isHost && (
                  <Pressable onPress={() => handleKick(player.id)}>
                    <Text style={styles.kickText}>{t('lobby.kick')}</Text>
                  </Pressable>
                )}
              </View>
            ))}
            {(!room || room.players.length === 0) && (
              <Text style={styles.waiting}>{t('lobby.waiting')}</Text>
            )}
          </GlassCard>

          {/* Game Selection */}
          <GlassCard style={styles.gamesCard}>
            <Text style={styles.sectionTitle}>{t('lobby.selectGame')}</Text>
            {GAMES.map((game) => {
              const isSelected = selectedGame === game.id;
              const hasEnough = (room?.players.length || 0) >= game.minPlayers;
              return (
                <Pressable
                  key={game.id}
                  onPress={() => isHost && handleSelectGame(game.id)}
                  style={[styles.gameRow, isSelected && styles.gameRowSelected]}
                >
                  <Text style={styles.gameIcon}>{game.icon}</Text>
                  <View style={styles.gameInfo}>
                    <Text style={styles.gameTitle}>
                      {locale === 'ru' ? game.titleRu : game.titleEn}
                    </Text>
                    <Text style={styles.gameDesc}>
                      {locale === 'ru' ? game.descriptionRu : game.descriptionEn}
                    </Text>
                    <Text style={[styles.playerCount, { color: hasEnough ? Colors.green : Colors.red }]}>
                      {game.minPlayers}-{game.maxPlayers} {locale === 'ru' ? 'игр.' : 'pl.'}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </GlassCard>

          {/* Start */}
          {isHost && selectedGameInfo && (
            <View style={styles.startSection}>
              <GlassButton
                variant="primary"
                size="lg"
                onPress={handleStartGame}
                disabled={(room?.players.length || 0) < selectedGameInfo.minPlayers}
                style={{ width: '100%' }}
              >
                {t('lobby.startGame')}: {locale === 'ru' ? selectedGameInfo.titleRu : selectedGameInfo.titleEn}
              </GlassButton>
              {(room?.players.length || 0) < selectedGameInfo.minPlayers && (
                <Text style={styles.minPlayersHint}>
                  {t('lobby.minPlayers')}: {selectedGameInfo.minPlayers}
                </Text>
              )}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  container: { flex: 1 },
  nav: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  navLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  navRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  backBtn: { color: 'rgba(255,255,255,0.5)', fontSize: 20 },
  navTitle: { fontWeight: '700', fontSize: 16, color: Colors.white },
  scroll: { padding: 16, paddingBottom: 40 },
  codeCard: { padding: 20, alignItems: 'center', marginBottom: 12 },
  codeLabel: { fontSize: 13, color: 'rgba(255,255,255,0.5)' },
  codeText: { fontSize: 32, fontWeight: '700', color: Colors.white, letterSpacing: 8, fontFamily: 'monospace', marginVertical: 4 },
  copyHint: { fontSize: 11, color: 'rgba(255,255,255,0.3)' },
  qrContainer: { marginTop: 16, alignItems: 'center' },
  qrBg: { backgroundColor: 'white', borderRadius: 16, padding: 12 },
  toggleQR: { fontSize: 12, color: 'rgba(255,255,255,0.3)', marginTop: 12 },
  playersCard: { padding: 20, marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: 'rgba(255,255,255,0.6)', marginBottom: 12 },
  playerRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.glassBg, borderWidth: 1, borderColor: Colors.glassBorderSubtle,
    borderRadius: Radius.lg, padding: 12, marginBottom: 8,
  },
  playerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  playerName: { fontSize: 14, color: 'rgba(255,255,255,0.8)' },
  crown: { fontSize: 12 },
  kickText: { fontSize: 12, color: 'rgba(239,68,68,0.5)' },
  waiting: { fontSize: 14, color: 'rgba(255,255,255,0.3)', textAlign: 'center', paddingVertical: 16 },
  gamesCard: { padding: 20, marginBottom: 12 },
  gameRow: {
    flexDirection: 'row', gap: 12, padding: 12,
    backgroundColor: Colors.glassBg, borderWidth: 1, borderColor: Colors.glassBorder,
    borderRadius: Radius.lg, marginBottom: 8,
  },
  gameRowSelected: {
    borderColor: 'rgba(168,85,247,0.5)', backgroundColor: 'rgba(168,85,247,0.1)',
  },
  gameIcon: { fontSize: 28 },
  gameInfo: { flex: 1 },
  gameTitle: { fontSize: 15, fontWeight: '600', color: Colors.white },
  gameDesc: { fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2 },
  playerCount: { fontSize: 12, marginTop: 4 },
  startSection: { marginBottom: 20 },
  minPlayersHint: { fontSize: 12, color: 'rgba(255,255,255,0.3)', textAlign: 'center', marginTop: 8 },
});
