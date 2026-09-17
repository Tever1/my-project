'use client';

import { ReactNode } from 'react';
import { I18nProvider } from '@/lib/i18n-provider';
import { AuthProvider } from '@/lib/auth-context';
import { RuntimeContent } from '@/components/RuntimeContent';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <I18nProvider>
      <AuthProvider>
        <RuntimeContent>{children}</RuntimeContent>
      </AuthProvider>
    </I18nProvider>
  );
}
