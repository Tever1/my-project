'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslation } from '@/lib/i18n';
import { useAuth } from '@/lib/auth-context';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { GlassInput } from '@/components/ui/GlassInput';
import { LanguageToggle } from '@/components/ui/LanguageToggle';

export default function AuthPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-main flex flex-col items-center justify-center">
        <div className="text-5xl mb-4">🎮</div>
        <h1 className="text-3xl font-bold text-white">Party Games Hub</h1>
      </div>
    }>
      <AuthPageContent />
    </Suspense>
  );
}

function AuthPageContent() {
  const { t } = useTranslation();
  const { user, sendCode, verifyCode } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '';
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user && user.nickname) {
      router.push(redirect || '/');
    } else if (user && !user.nickname) {
      router.push(redirect ? `/auth/verify?redirect=${encodeURIComponent(redirect)}` : '/auth/verify');
    }
  }, [user, router, redirect]);

  if (user) {
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

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhone(e.target.value);
    setPhone(formatted);
    setError('');
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
      router.push(redirect ? `/auth/verify?redirect=${encodeURIComponent(redirect)}` : '/auth/verify');
    } else {
      setError(t('auth.invalidCode'));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-main flex flex-col items-center justify-center px-4">
      <div className="absolute top-4 right-4">
        <LanguageToggle />
      </div>

      <div className="text-center mb-8 animate-fade-in">
        <div className="text-5xl mb-4">🎮</div>
        <h1 className="text-3xl font-bold text-white mb-2">{t('app.title')}</h1>
        <p className="text-white/50">{t('app.subtitle')}</p>
      </div>

      <GlassCard className="w-full max-w-sm p-8 animate-slide-up">
        <h2 className="text-xl font-semibold text-white mb-6 text-center">
          {t('auth.title')}
        </h2>

        {step === 'phone' ? (
          <div className="space-y-4">
            <GlassInput
              label={t('auth.phone')}
              placeholder={t('auth.phonePlaceholder')}
              value={phone}
              onChange={handlePhoneChange}
              type="tel"
              error={error}
            />
            <GlassButton
              variant="primary"
              size="lg"
              className="w-full"
              onClick={handleSendCode}
              disabled={loading}
            >
              {loading ? t('common.loading') : t('auth.sendCode')}
            </GlassButton>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-white/50 text-center mb-2">
              {t('auth.codeSent')}
            </p>
            <p className="text-sm text-white/70 text-center font-mono">{phone}</p>
            <GlassInput
              label={t('auth.code')}
              placeholder={t('auth.codePlaceholder')}
              value={code}
              onChange={(e) => {
                setCode(e.target.value.replace(/\D/g, '').slice(0, 4));
                setError('');
              }}
              type="text"
              inputMode="numeric"
              maxLength={4}
              className="text-center text-2xl tracking-[0.5em]"
              error={error}
            />
            <GlassButton
              variant="primary"
              size="lg"
              className="w-full"
              onClick={handleVerifyCode}
              disabled={loading}
            >
              {loading ? t('common.loading') : t('auth.verify')}
            </GlassButton>
            <button
              onClick={() => { setStep('phone'); setCode(''); setError(''); }}
              className="w-full text-center text-sm text-white/40 hover:text-white/70 transition-colors"
            >
              {t('auth.back')}
            </button>
          </div>
        )}

        {/* Dev hint */}
        <p className="mt-6 text-xs text-white/20 text-center">
          Demo: код подтверждения — 1234
        </p>
      </GlassCard>
    </div>
  );
}
