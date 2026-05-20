'use client';

interface PlayerAvatarProps {
  nickname: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

const GRADIENTS = [
  'linear-gradient(135deg, #ff9f0a, #ff375f)',
  'linear-gradient(135deg, #8b5cf6, #ec4899)',
  'linear-gradient(135deg, #14b8a6, #3b82f6)',
  'linear-gradient(135deg, #facc15, #f59e0b)',
  'linear-gradient(135deg, #ef4444, #f97316)',
  'linear-gradient(135deg, #38bdf8, #818cf8)',
];

const SIZES = {
  xs: 24,
  sm: 32,
  md: 40,
  lg: 56,
};

export function PlayerAvatar({
  nickname,
  size = 'md',
  className = '',
}: PlayerAvatarProps) {
  const trimmedNickname = nickname.trim();
  const initial = trimmedNickname.charAt(0).toUpperCase() || '?';
  const charCode = trimmedNickname.charCodeAt(0) || 0;
  const px = SIZES[size];

  return (
    <div
      className={className}
      aria-label={nickname}
      style={{
        width: px,
        height: px,
        borderRadius: '50%',
        background: GRADIENTS[charCode % GRADIENTS.length],
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#ffffff',
        fontSize: px * 0.4,
        fontWeight: 700,
        lineHeight: 1,
        flexShrink: 0,
      }}
    >
      {initial}
    </div>
  );
}
