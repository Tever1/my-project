import React, { ReactNode } from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Colors, Radius } from '@/lib/colors';

interface GlassBadgeProps {
  children: ReactNode;
  accent?: boolean;
  variant?: 'default' | 'accent';
  style?: ViewStyle;
}

export function GlassBadge({ children, accent, variant, style }: GlassBadgeProps) {
  const isAccent = accent || variant === 'accent';
  return (
    <View style={[styles.badge, isAccent && styles.accent, style]}>
      {typeof children === 'string' ? (
        <Text style={[styles.text, isAccent && styles.accentText]}>{children}</Text>
      ) : (
        children
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 12,
    backgroundColor: Colors.glassBg,
    borderWidth: 1,
    borderColor: Colors.glassBorderSubtle,
    borderRadius: Radius.full,
  },
  accent: {
    backgroundColor: Colors.accentBg,
    borderColor: Colors.accentBorder,
  },
  text: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '500',
  },
  accentText: {
    color: Colors.accent,
  },
});
