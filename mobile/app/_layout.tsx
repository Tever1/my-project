import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '@/lib/auth-context';
import { I18nProvider } from '@/lib/i18n-provider';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <I18nProvider>
        <AuthProvider>
          <StatusBar style="light" />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: '#0c0a15' },
              animation: 'slide_from_right',
            }}
          />
        </AuthProvider>
      </I18nProvider>
    </SafeAreaProvider>
  );
}
