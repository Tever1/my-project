'use client';

import { motion } from 'framer-motion';
import { MouseEvent, ReactNode } from 'react';

interface ChipProps {
  children: ReactNode;
  selected?: boolean;
  onSelect?: () => void;
  onRemove?: () => void;
  disabled?: boolean;
  className?: string;
}

export function Chip({
  children,
  selected = false,
  onSelect,
  onRemove,
  disabled = false,
  className = '',
}: ChipProps) {
  const handleClick = () => {
    if (!disabled) {
      onSelect?.();
    }
  };

  const handleRemove = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (!disabled) {
      onRemove?.();
    }
  };

  return (
    <motion.div
      className={className}
      whileTap={!disabled && onSelect ? { scale: 0.95 } : undefined}
      onClick={handleClick}
      role={onSelect ? 'button' : undefined}
      tabIndex={onSelect && !disabled ? 0 : undefined}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '5px 12px',
        borderRadius: 999,
        fontSize: 13,
        fontWeight: 500,
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'all 0.15s ease',
        border: selected
          ? '1px solid rgba(255,255,255,0.4)'
          : '1px solid rgba(255,255,255,0.15)',
        background: selected
          ? 'rgba(255,255,255,0.15)'
          : 'rgba(255,255,255,0.05)',
        color: selected ? 'white' : 'rgba(255,255,255,0.7)',
        opacity: disabled ? 0.4 : 1,
      }}
    >
      {children}
      {onRemove && (
        <button
          type="button"
          aria-label="Remove"
          onClick={handleRemove}
          disabled={disabled}
          style={{
            width: 14,
            height: 14,
            border: 0,
            padding: 0,
            margin: 0,
            background: 'transparent',
            color: 'inherit',
            fontSize: 14,
            lineHeight: 1,
            cursor: disabled ? 'not-allowed' : 'pointer',
          }}
        >
          ×
        </button>
      )}
    </motion.div>
  );
}
