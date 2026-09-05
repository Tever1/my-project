import React, { ReactNode } from 'react';
import { Pressable, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Radius, Shadows } from '@/lib/colors';

interface GlassButtonProps {
  children: ReactNode;
  onPress?: () => void;
  variant?: 'default' | 'primary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export function GlassButton({
  children,
  onPress,
  variant = 'default',
  size = 'md',
  disabled = false,
  style,
  textStyle,
}: GlassButtonProps) {
  const sizeStyle = SIZE_STYLES[size];

  if (variant === 'primary') {
    return (
      <Pressable
        onPress={onPress}
        disabled={disabled}
        style={({ pressed }) => [
          pressed && styles.pressed,
          disabled && styles.disabled,
          style,
        ]}
      >
        <LinearGradient
          colors={[Colors.gradientStart, Colors.gradientEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.button, sizeStyle.button, styles.primaryBorder]}
        >
          <Text style={[styles.primaryText, sizeStyle.text, textStyle]}>
            {children}
          </Text>
        </LinearGradient>
      </Pressable>
    );
  }

  const variantStyle = variant === 'danger' ? styles.dangerButton : styles.defaultButton;
  const variantTextStyle = variant === 'danger' ? styles.dangerText : styles.defaultText;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        sizeStyle.button,
        variantStyle,
        pressed && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
    >
      <Text style={[variantTextStyle, sizeStyle.text, textStyle]}>
        {children}
      </Text>
    </Pressable>
  );
}

const SIZE_STYLES = {
  sm: StyleSheet.create({
    button: { paddingVertical: 8, paddingHorizontal: 14 },
    text: { fontSize: 13 },
  }),
  md: StyleSheet.create({
    button: { paddingVertical: 12, paddingHorizontal: 20 },
    text: { fontSize: 15 },
  }),
  lg: StyleSheet.create({
    button: { paddingVertical: 16, paddingHorizontal: 28 },
    text: { fontSize: 17 },
  }),
};

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.md,
    flexDirection: 'row',
    gap: 8,
    ...Shadows.glass,
  },
  defaultButton: {
    backgroundColor: Colors.glassBg,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
  dangerButton: {
    backgroundColor: Colors.dangerBg,
    borderWidth: 1,
    borderColor: Colors.dangerBorder,
  },
  primaryBorder: {
    borderWidth: 1,
    borderColor: Colors.accentBorder,
  },
  defaultText: {
    color: Colors.textPrimary,
    fontWeight: '500',
    textAlign: 'center',
  },
  primaryText: {
    color: Colors.white,
    fontWeight: '600',
    textAlign: 'center',
  },
  dangerText: {
    color: Colors.dangerText,
    fontWeight: '500',
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.97 }],
  },
  disabled: {
    opacity: 0.5,
  },
});
