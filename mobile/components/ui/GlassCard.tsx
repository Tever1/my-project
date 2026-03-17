import React, { ReactNode } from 'react';
import { View, StyleSheet, ViewStyle, Pressable } from 'react-native';
import { Colors, Radius, Shadows } from '@/lib/colors';

interface GlassCardProps {
  children: ReactNode;
  style?: ViewStyle;
  hover?: boolean;
  onPress?: () => void;
}

export function GlassCard({ children, style, hover, onPress }: GlassCardProps) {
  if (onPress || hover) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.card,
          pressed && styles.cardPressed,
          style,
        ]}
      >
        {children}
      </Pressable>
    );
  }

  return (
    <View style={[styles.card, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.glassBg,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    borderRadius: Radius.lg,
    padding: 24,
    ...Shadows.glass,
  },
  cardPressed: {
    backgroundColor: Colors.glassBgHover,
    transform: [{ scale: 0.98 }],
  },
});
