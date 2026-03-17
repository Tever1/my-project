import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from '@/lib/i18n';
import { useAuth } from '@/lib/auth-context';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { GlassInput } from '@/components/ui/GlassInput';
import { LanguageToggle } from '@/components/ui/LanguageToggle';
import { Colors } from '@/lib/colors';

export default function AuthScreen() {
  const { t } = useTranslation();
  const { user, sendCode, verifyCode } = useAuth();
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (user && user.nickname) {
    setTimeout(() => router.replace('/'), 0);
    return null;
  }
  if (user && !user.nickname) {
    setTimeout(() => router.replace('/auth-verify'), 0);
    return null;
  }

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length <= 1) return '+' + digits;
    if (digits.length <= 4) return `+${digits.slice(0, 1)} (${digits.slice(1)}`;
    if (digits.length <= 7) return `+${digits.slice(0, 1)} (${digits.slice(1, 4)}) ${digits.slice(4)}`;
    if (digits.length <= 9) return `+${digits.slice(0, 1)} (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
    return `+${digits.slice(0, 1)} (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7, 9)}-${digits.slice(9, 11)}`;
  };

  const handleSendCode = async () => {
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 10) {
      setError(t('auth.invalidPhone'));
      return;
    }
    setLoading(true);
    const success = await sendCode(digits);
    setLoading(false);
    if (success) {
      setStep('code');
      setError('');
    }
  };

  const handleVerifyCode = async () => {
    if (code.length < 4) {
      setError(t('auth.invalidCode'));
      return;
    }
    setLoading(true);
    const digits = phone.replace(/\D/g, '');
    const success = await verifyCode(digits, code);
    setLoading(false);
    if (success) {
      router.replace('/auth-verify');
    } else {
      setError(t('auth.invalidCode'));
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
        <View style={styles.langToggle}>
          <LanguageToggle />
        </View>

        <View style={styles.hero}>
          <Text style={styles.heroIcon}>🎮</Text>
          <Text style={styles.heroTitle}>{t('app.title')}</Text>
          <Text style={styles.heroSubtitle}>{t('app.subtitle')}</Text>
        </View>

        <GlassCard style={styles.card}>
          <Text style={styles.cardTitle}>{t('auth.title')}</Text>

          {step === 'phone' ? (
            <View style={styles.form}>
              <GlassInput
                label={t('auth.phone')}
                placeholder={t('auth.phonePlaceholder')}
                value={phone}
                onChangeText={(text) => { setPhone(formatPhone(text)); setError(''); }}
                keyboardType="phone-pad"
                error={error}
              />
              <GlassButton
                variant="primary"
                size="lg"
                onPress={handleSendCode}
                disabled={loading}
                style={styles.fullWidth}
              >
                {loading ? t('common.loading') : t('auth.sendCode')}
              </GlassButton>
            </View>
          ) : (
            <View style={styles.form}>
              <Text style={styles.codeSent}>{t('auth.codeSent')}</Text>
              <Text style={styles.phoneDisplay}>{phone}</Text>
              <GlassInput
                label={t('auth.code')}
                placeholder={t('auth.codePlaceholder')}
                value={code}
                onChangeText={(text) => { setCode(text.replace(/\D/g, '').slice(0, 4)); setError(''); }}
                keyboardType="number-pad"
                maxLength={4}
                style={styles.codeInput}
                error={error}
              />
              <GlassButton
                variant="primary"
                size="lg"
                onPress={handleVerifyCode}
                disabled={loading}
                style={styles.fullWidth}
              >
                {loading ? t('common.loading') : t('auth.verify')}
              </GlassButton>
              <GlassButton
                size="sm"
                onPress={() => { setStep('phone'); setCode(''); setError(''); }}
                style={styles.fullWidth}
              >
                {t('auth.back')}
              </GlassButton>
            </View>
          )}

          <Text style={styles.hint}>Demo: код подтверждения — 1234</Text>
        </GlassCard>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  langToggle: { position: 'absolute', top: 60, right: 20 },
  hero: { alignItems: 'center', marginBottom: 32 },
  heroIcon: { fontSize: 56, marginBottom: 16 },
  heroTitle: { fontSize: 32, fontWeight: '700', color: Colors.white, marginBottom: 8 },
  heroSubtitle: { fontSize: 16, color: 'rgba(255,255,255,0.5)' },
  card: { width: '100%', maxWidth: 380, padding: 32 },
  cardTitle: { fontSize: 22, fontWeight: '600', color: Colors.white, textAlign: 'center', marginBottom: 24 },
  form: { gap: 16 },
  codeSent: { fontSize: 14, color: 'rgba(255,255,255,0.5)', textAlign: 'center' },
  phoneDisplay: { fontSize: 14, color: 'rgba(255,255,255,0.7)', textAlign: 'center', fontFamily: 'monospace' },
  codeInput: { textAlign: 'center', fontSize: 24, letterSpacing: 12 },
  fullWidth: { width: '100%' },
  hint: { fontSize: 11, color: 'rgba(255,255,255,0.2)', textAlign: 'center', marginTop: 24 },
});
