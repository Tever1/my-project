'use client';

import { ReactNode } from 'react';

interface BadgeProps {
  children: ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'game';
  gameColor?: string;
  className?: string;
}

const VARIANT_STYLES = {
  default: {
    background: 'rgba(255,255,255,0.1)',
    color: 'rgba(255,255,255,0.7)',
    border: '1px solid rgba(255,255,255,0.15)',
  },
  success: {
    background: 'rgba(34,197,94,0.15)',
    color: '#4ade80',
    border: '1px solid rgba(34,197,94,0.25)',
  },
  warning: {
    background: 'rgba(251,191,36,0.15)',
    color: '#fbbf24',
    border: '1px solid rgba(251,191,36,0.25)',
  },
  danger: {
    background: 'rgba(239,68,68,0.15)',
    color: '#f87171',
    border: '1px solid rgba(239,68,68,0.25)',
  },
};

export function Badge({
  children,
  variant = 'default',
  gameColor = '#8b5cf6',
  className = '',
}: BadgeProps) {
  const variantStyle =
    variant === 'game'
      ? {
          background: `${gameColor}20`,
          color: gameColor,
          border: `1px solid ${gameColor}40`,
        }
      : VARIANT_STYLES[variant];

  return (
    <span
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '2px 8px',
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: '0.04em',
        whiteSpace: 'nowrap',
        ...variantStyle,
      }}
    >
      {children}
    </span>
  );
}
