'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/lib/i18n';
import { useAuth } from '@/lib/auth-context';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { GlassInput } from '@/components/ui/GlassInput';

export default function SetNicknamePage() {
  const { t } = useTranslation();
  const { user, updateNickname } = useAuth();
  const router = useRouter();
  const [nickname, setNickname] = useState(user?.nickname || '');

  useEffect(() => {
    if (!user) {
      router.push('/auth');
    } else if (user.nickname) {
      router.push('/');
    }
  }, [user, router]);

  if (!user || user.nickname) {
    return null;
  }

  const handleSubmit = () => {
    if (nickname.trim().length < 2) return;
    updateNickname(nickname.trim());
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-gradient-main flex flex-col items-center justify-center px-4">
      <div className="text-center mb-8 animate-fade-in">
        <div className="text-5xl mb-4">👋</div>
        <h1 className="text-2xl font-bold text-white">{t('auth.welcome')}</h1>
      </div>

      <GlassCard className="w-full max-w-sm p-8 animate-slide-up">
        <div className="space-y-4">
          <GlassInput
            label={t('lobby.nickname')}
            placeholder={t('lobby.nicknamePlaceholder')}
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            maxLength={20}
            autoFocus
          />
          <GlassButton
            variant="primary"
            size="lg"
            className="w-full"
            onClick={handleSubmit}
            disabled={nickname.trim().length < 2}
          >
            {t('common.confirm')}
          </GlassButton>
        </div>
      </GlassCard>
    </div>
  );
}
