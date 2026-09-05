import React from 'react';
import { View, TextInput, Text, StyleSheet, TextInputProps } from 'react-native';
import { Colors, Radius } from '@/lib/colors';

interface GlassInputProps extends TextInputProps {
  label?: string;
  error?: string;
}

export function GlassInput({ label, error, style, ...props }: GlassInputProps) {
  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TextInput
        placeholderTextColor="rgba(165, 160, 191, 0.7)"
        style={[styles.input, error ? styles.inputError : null, style]}
        {...props}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  label: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 6,
  },
  input: {
    width: '100%',
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: Colors.glassBg,
    borderWidth: 1,
    borderColor: Colors.glassBorderSubtle,
    borderRadius: Radius.md,
    color: Colors.textPrimary,
    fontSize: 16,
  },
  inputError: {
    borderColor: Colors.danger,
  },
  error: {
    color: Colors.dangerText,
    fontSize: 12,
    marginTop: 4,
  },
});
