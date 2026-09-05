import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from '@/lib/i18n';
import { useAuth } from '@/lib/auth-context';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { GlassInput } from '@/components/ui/GlassInput';
import { Colors } from '@/lib/colors';

export default function AuthVerifyScreen() {
  const { t } = useTranslation();
  const { user, updateNickname } = useAuth();
  const [nickname, setNickname] = useState(user?.nickname || '');

  if (!user) {
    setTimeout(() => router.replace('/auth'), 0);
    return null;
  }
  if (user.nickname) {
    setTimeout(() => router.replace('/'), 0);
    return null;
  }

  const handleSubmit = () => {
    if (nickname.trim().length < 2) return;
    updateNickname(nickname.trim());
    router.replace('/');
  };

  return (
    <LinearGradient
      colors={['#0c0a15', '#1a1035', '#0f172a', '#0c0a15']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.gradient}
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.hero}>
          <Text style={styles.heroIcon}>👋</Text>
          <Text style={styles.heroTitle}>{t('auth.welcome')}</Text>
        </View>

        <GlassCard style={styles.card}>
          <View style={styles.form}>
            <GlassInput
              label={t('lobby.nickname')}
              placeholder={t('lobby.nicknamePlaceholder')}
              value={nickname}
              onChangeText={setNickname}
              maxLength={20}
              autoFocus
            />
            <GlassButton
              variant="primary"
              size="lg"
              onPress={handleSubmit}
              disabled={nickname.trim().length < 2}
              style={styles.fullWidth}
            >
              {t('common.confirm')}
            </GlassButton>
          </View>
        </GlassCard>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  hero: { alignItems: 'center', marginBottom: 32 },
  heroIcon: { fontSize: 56, marginBottom: 16 },
  heroTitle: { fontSize: 26, fontWeight: '700', color: Colors.white },
  card: { width: '100%', maxWidth: 380, padding: 32 },
  form: { gap: 16 },
  fullWidth: { width: '100%' },
});
