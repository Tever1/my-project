import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from '@/lib/i18n';
import { useAuth } from '@/lib/auth-context';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { GlassInput } from '@/components/ui/GlassInput';
import { LanguageToggle } from '@/components/ui/LanguageToggle';
import { GlassBadge } from '@/components/ui/GlassBadge';
import { Colors, Radius } from '@/lib/colors';

export default function ProfileScreen() {
  const { t, locale } = useTranslation();
  const { user, updateNickname, logout } = useAuth();
  const [editing, setEditing] = useState(false);
  const [nickname, setNickname] = useState(user?.nickname || '');

  if (!user) {
    setTimeout(() => router.replace('/auth'), 0);
    return null;
  }

  const handleSave = () => {
    if (nickname.trim().length >= 2) {
      updateNickname(nickname.trim());
      setEditing(false);
    }
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
            <Pressable onPress={() => router.back()}>
              <Text style={styles.backBtn}>←</Text>
            </Pressable>
            <Text style={styles.navTitle}>{t('common.settings')}</Text>
          </View>
          <LanguageToggle />
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* Avatar */}
          <GlassCard style={styles.profileCard}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{user.nickname.charAt(0).toUpperCase()}</Text>
            </View>
            {editing ? (
              <View style={styles.editRow}>
                <View style={{ flex: 1 }}>
                  <GlassInput value={nickname} onChangeText={setNickname} maxLength={20} autoFocus />
                </View>
                <GlassButton variant="primary" size="sm" onPress={handleSave}>✓</GlassButton>
              </View>
            ) : (
              <View style={styles.nameSection}>
                <Text style={styles.name}>{user.nickname}</Text>
                <Pressable onPress={() => setEditing(true)}>
                  <Text style={styles.editLink}>{locale === 'ru' ? 'Изменить' : 'Edit'}</Text>
                </Pressable>
              </View>
            )}
            <Text style={styles.phone}>{user.phone}</Text>
          </GlassCard>

          {/* Stats */}
          <GlassCard style={styles.statsCard}>
            <Text style={styles.sectionTitle}>{t('common.stats')}</Text>
            <View style={styles.statsGrid}>
              <View style={styles.stat}>
                <Text style={styles.statValue}>{user.stats.gamesPlayed}</Text>
                <Text style={styles.statLabel}>{locale === 'ru' ? 'Игр' : 'Games'}</Text>
              </View>
              <View style={styles.stat}>
                <Text style={[styles.statValue, { color: Colors.green }]}>{user.stats.gamesWon}</Text>
                <Text style={styles.statLabel}>{locale === 'ru' ? 'Побед' : 'Wins'}</Text>
              </View>
              <View style={styles.stat}>
                <Text style={[styles.statValue, { color: Colors.accent }]}>{user.stats.totalScore}</Text>
                <Text style={styles.statLabel}>{locale === 'ru' ? 'Очков' : 'Points'}</Text>
              </View>
            </View>
          </GlassCard>

          {/* History */}
          <GlassCard style={styles.historyCard}>
            <Text style={styles.sectionTitle}>{t('common.history')}</Text>
            {user.gameHistory.length === 0 ? (
              <Text style={styles.noGames}>{t('common.noGames')}</Text>
            ) : (
              user.gameHistory.slice(0, 10).map((game, i) => (
                <View key={i} style={styles.historyRow}>
                  <View>
                    <Text style={styles.historyGame}>{game.gameType}</Text>
                    <Text style={styles.historyDate}>
                      {new Date(game.date).toLocaleDateString(locale)}
                    </Text>
                  </View>
                  <View style={styles.historyRight}>
                    <Text style={styles.historyScore}>{game.score} pts</Text>
                    {game.won && <Text>🏆</Text>}
                  </View>
                </View>
              ))
            )}
          </GlassCard>

          {/* Language */}
          <GlassCard style={{ padding: 20, marginBottom: 12 }}>
            <Text style={styles.sectionTitle}>{t('common.language')}</Text>
            <LanguageToggle />
          </GlassCard>

          {/* Logout */}
          <GlassButton
            variant="danger"
            onPress={() => { logout(); router.replace('/auth'); }}
            style={{ width: '100%' }}
          >
            {locale === 'ru' ? 'Выйти' : 'Log out'}
          </GlassButton>
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
  backBtn: { color: 'rgba(255,255,255,0.5)', fontSize: 20 },
  navTitle: { fontWeight: '700', fontSize: 16, color: Colors.white },
  scroll: { padding: 16, paddingBottom: 40 },
  profileCard: { padding: 24, alignItems: 'center', marginBottom: 12 },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(168,85,247,0.2)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  avatarText: { fontSize: 32, color: Colors.accent },
  editRow: { flexDirection: 'row', gap: 8, alignItems: 'center', width: '100%' },
  nameSection: { alignItems: 'center' },
  name: { fontSize: 22, fontWeight: '700', color: Colors.white },
  editLink: { fontSize: 12, color: 'rgba(255,255,255,0.3)', marginTop: 4 },
  phone: { fontSize: 13, color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace', marginTop: 4 },
  statsCard: { padding: 20, marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: Colors.white, marginBottom: 16 },
  statsGrid: { flexDirection: 'row', justifyContent: 'space-around' },
  stat: { alignItems: 'center' },
  statValue: { fontSize: 28, fontWeight: '700', color: Colors.white },
  statLabel: { fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 4 },
  historyCard: { padding: 20, marginBottom: 12 },
  noGames: { fontSize: 14, color: 'rgba(255,255,255,0.3)', textAlign: 'center', paddingVertical: 16 },
  historyRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: Colors.glassBg, borderWidth: 1, borderColor: Colors.glassBorderSubtle,
    borderRadius: Radius.lg, padding: 12, marginBottom: 8,
  },
  historyGame: { fontSize: 14, color: 'rgba(255,255,255,0.7)' },
  historyDate: { fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 2 },
  historyRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  historyScore: { fontSize: 14, color: 'rgba(255,255,255,0.6)' },
});
