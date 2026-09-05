'use client';

import { motion, type HTMLMotionProps } from 'framer-motion';
import { ReactNode } from 'react';

interface GlassButtonProps extends HTMLMotionProps<'button'> {
  children: ReactNode;
  variant?: 'default' | 'primary' | 'danger' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

export function GlassButton({
  children,
  variant = 'default',
  size = 'md',
  className = '',
  ...props
}: GlassButtonProps) {
  const variantClasses = {
    default: 'glass-button',
    primary: 'glass-button-primary',
    danger: 'glass-button-danger',
    secondary: 'glass-button-secondary',
    ghost: 'glass-button-ghost',
  };

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-5 py-2.5 text-base',
    lg: 'px-8 py-3.5 text-lg',
  };

  return (
    <motion.button
      whileTap={{ scale: 0.96 }}
      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
      className={`${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...props}
    >
      {children}
    </motion.button>
  );
}
