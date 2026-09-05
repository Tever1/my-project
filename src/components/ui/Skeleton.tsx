'use client';

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
  className?: string;
}

export function Skeleton({
  width = '100%',
  height = 16,
  borderRadius = 6,
  className = '',
}: SkeletonProps) {
  return (
    <div
      className={`skeleton-shimmer ${className}`}
      aria-hidden="true"
      style={{
        width,
        height,
        borderRadius,
        backgroundColor: 'rgba(255,255,255,0.06)',
        overflow: 'hidden',
      }}
    />
  );
}
