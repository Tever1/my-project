import React from 'react';
import { Pressable, Text, StyleSheet, View } from 'react-native';
import { useTranslation } from '@/lib/i18n';
import { Colors, Radius } from '@/lib/colors';

export function LanguageToggle() {
  const { locale, setLocale } = useTranslation();

  return (
    <View style={styles.container}>
      <Pressable
        onPress={() => setLocale('ru')}
        style={[styles.option, locale === 'ru' && styles.active]}
      >
        <Text style={[styles.text, locale === 'ru' && styles.activeText]}>RU</Text>
      </Pressable>
      <Pressable
        onPress={() => setLocale('en')}
        style={[styles.option, locale === 'en' && styles.active]}
      >
        <Text style={[styles.text, locale === 'en' && styles.activeText]}>EN</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: Colors.glassBg,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.glassBorderSubtle,
    overflow: 'hidden',
  },
  option: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  active: {
    backgroundColor: Colors.accentBg,
  },
  text: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '500',
  },
  activeText: {
    color: Colors.accent,
  },
});
