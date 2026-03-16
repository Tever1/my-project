'use client';

import { ReactNode, ButtonHTMLAttributes } from 'react';

interface GlassButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'default' | 'primary' | 'danger';
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
  };

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-5 py-2.5 text-base',
    lg: 'px-8 py-3.5 text-lg',
  };

  return (
    <button
      className={`${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
