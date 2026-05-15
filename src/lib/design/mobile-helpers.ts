import type { TargetAndTransition, Transition, VariantLabels } from 'framer-motion';
import type { CSSProperties } from 'react';

interface DesktopMotionProps {
  initial?: TargetAndTransition | VariantLabels | boolean;
  animate?: TargetAndTransition | VariantLabels;
  exit?: TargetAndTransition | VariantLabels;
  transition?: Transition;
}

/**
 * Returns Framer Motion props that produce an instant (no-animation) mount/unmount
 * on mobile to prevent iOS Safari compositor glitches during parent re-renders.
 * Desktop gets the full animation.
 */
export function motionPropsInstant(
  isMobile: boolean,
  desktopProps: DesktopMotionProps
): DesktopMotionProps {
  if (!isMobile) return desktopProps;
  return {
    initial: false,
    animate: { opacity: 1 },
    exit: { opacity: 1 },
    transition: { duration: 0 },
  };
}

/**
 * Returns CSSProperties for a glass panel:
 * - mobile: same background as desktop, lighter blur(12px)
 * - desktop: frosted glass with blur(24px)
 */
export function glassMobileSolid(
  isMobile: boolean,
  desktopBg: string
): Pick<CSSProperties, 'background' | 'backdropFilter' | 'WebkitBackdropFilter'> {
  const blur = isMobile ? 'blur(12px)' : 'blur(24px)';
  return {
    background: desktopBg,
    backdropFilter: blur,
    WebkitBackdropFilter: blur,
  };
}
