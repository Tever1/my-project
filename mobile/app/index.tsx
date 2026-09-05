import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, Alert } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from '@/lib/i18n';
import { useAuth } from '@/lib/auth-context';
import { useSocket } from '@/lib/use-socket';
import { LanguageToggle } from '@/components/ui/LanguageToggle';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { GlassInput } from '@/components/ui/GlassInput';
import { GlassBadge } from '@/components/ui/GlassBadge';
import { GAMES } from '@/lib/games-config';
import { Colors } from '@/lib/colors';

export default function HomeScreen() {
  const { t, locale } = useTranslation();
  const { user, logout } = useAuth();
  const { emit, isConnected } = useSocket();
  const [joinCode, setJoinCode] = useState('');
  const [showJoin, setShowJoin] = useState(false);

  if (!user) {
    setTimeout(() => router.replace('/auth'), 0);
    return null;
  }
  if (!user.nickname) {
    setTimeout(() => router.replace('/auth-verify'), 0);
    return null;
  }

  const handleCreateRoom = () => {
    emit('room:create', { playerId: user.id, nickname: user.nickname }, (response: unknown) => {
      const res = response as { success: boolean; code: string };
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
        Alert.alert('Error', res.error || 'Error joining room');
      }
    });
  };

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
            <Text style={styles.navIcon}>🎮</Text>
            <Text style={styles.navTitle}>{t('app.title')}</Text>
            {!isConnected && (
              <View style={styles.offlineDot} />
            )}
          </View>
          <View style={styles.navRight}>
            <LanguageToggle />
            <Pressable onPress={() => router.push('/profile')} style={styles.profileBtn}>
              <Text style={styles.profileText}>{user.nickname}</Text>
            </Pressable>
          </View>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Hero */}
          <View style={styles.hero}>
            <Text style={styles.heroTitle}>{t('app.title')}</Text>
            <Text style={styles.heroSubtitle}>{t('app.subtitle')}</Text>
          </View>

          {/* Action Buttons */}
          <View style={styles.actions}>
            <GlassButton variant="primary" size="lg" onPress={handleCreateRoom} style={styles.actionBtn}>
              {t('lobby.createRoom')}
            </GlassButton>
            <GlassButton size="lg" onPress={() => setShowJoin(!showJoin)} style={styles.actionBtn}>
              {t('lobby.joinRoom')}
            </GlassButton>
          </View>

          {/* Join Room */}
          {showJoin && (
            <GlassCard style={styles.joinCard}>
              <View style={styles.joinRow}>
                <View style={styles.joinInputWrap}>
                  <GlassInput
                    placeholder={t('lobby.roomCode')}
                    value={joinCode}
                    onChangeText={(text) => setJoinCode(text.toUpperCase())}
                    maxLength={6}
                    autoCapitalize="characters"
                    style={styles.joinInput}
                  />
                </View>
                <GlassButton variant="primary" onPress={handleJoinRoom}>
                  {t('lobby.join')}
                </GlassButton>
              </View>
            </GlassCard>
          )}

          {/* Games Grid */}
          <Text style={styles.sectionTitle}>{t('lobby.selectGame')}</Text>
          {GAMES.map((game) => (
            <GlassCard key={game.id} style={styles.gameCard}>
              <Text style={styles.gameIcon}>{game.icon}</Text>
              <Text style={styles.gameTitle}>
                {locale === 'ru' ? game.titleRu : game.titleEn}
              </Text>
              <Text style={styles.gameDesc}>
                {locale === 'ru' ? game.descriptionRu : game.descriptionEn}
              </Text>
              <GlassBadge>
                <Text style={styles.badgeText}>
                  {game.minPlayers}-{game.maxPlayers} {locale === 'ru' ? 'игроков' : 'players'}
                </Text>
              </GlassBadge>
            </GlassCard>
          ))}
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
  navIcon: { fontSize: 24 },
  navTitle: { fontWeight: '700', fontSize: 16, color: Colors.white },
  offlineDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.red },
  profileBtn: {
    backgroundColor: Colors.glassBg, borderWidth: 1, borderColor: Colors.glassBorderSubtle,
    borderRadius: 999, paddingVertical: 6, paddingHorizontal: 12,
  },
  profileText: { color: Colors.textSecondary, fontSize: 13, fontWeight: '500' },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  hero: { alignItems: 'center', marginBottom: 24, marginTop: 16 },
  heroTitle: { fontSize: 36, fontWeight: '700', color: Colors.white, marginBottom: 8 },
  heroSubtitle: { fontSize: 16, color: 'rgba(255,255,255,0.5)' },
  actions: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  actionBtn: { flex: 1 },
  joinCard: { padding: 20, marginBottom: 16 },
  joinRow: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  joinInputWrap: { flex: 1 },
  joinInput: { textAlign: 'center', fontSize: 20, letterSpacing: 8 },
  sectionTitle: { fontSize: 20, fontWeight: '600', color: 'rgba(255,255,255,0.8)', marginBottom: 12 },
  gameCard: { padding: 20, marginBottom: 12 },
  gameIcon: { fontSize: 32, marginBottom: 8 },
  gameTitle: { fontSize: 18, fontWeight: '600', color: Colors.white, marginBottom: 4 },
  gameDesc: { fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 12 },
  badgeText: { color: Colors.textSecondary, fontSize: 12 },
});
