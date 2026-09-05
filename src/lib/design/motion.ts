/**
 * Motion variants — reusable Framer Motion patterns.
 *
 * Import these instead of writing variant objects inline.
 * Keeps motion language consistent across the app.
 *
 *   import { fadeInUp, stagger } from "@/lib/design/motion";
 *   <motion.ul variants={stagger}>...</motion.ul>
 *
 * For spring/duration/easing primitives, see `tokens.ts`.
 */

import { spring, easing, duration } from "./tokens";

// ============================================================
// Basic enter/exit
// ============================================================

/** Fade in only — for backgrounds, overlays, low-importance elements. */
export const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: duration.base, ease: easing.ios },
};

/** Fade up — most common entry. Use for cards, list items, panels. */
export const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
  transition: spring.soft,
};

/** Fade down — for dropdowns, menus, sheets entering from above. */
export const fadeInDown = {
  initial: { opacity: 0, y: -20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 10 },
  transition: spring.soft,
};

/** Scale in — for modals, focus moments, "appearing" elements. */
export const scaleIn = {
  initial: { opacity: 0, scale: 0.92 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.96 },
  transition: spring.medium,
};

/** Pop — for celebrations, score updates, "wow" reveals. */
export const pop = {
  initial: { opacity: 0, scale: 0.6 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.8 },
  transition: spring.bouncy,
};

// ============================================================
// Slide variants (for game phase transitions)
// ============================================================

export const slideInRight = {
  initial: { opacity: 0, x: 40 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -40 },
  transition: spring.soft,
};

export const slideInLeft = {
  initial: { opacity: 0, x: -40 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 40 },
  transition: spring.soft,
};

// ============================================================
// Stagger containers (for lists)
// ============================================================

/**
 * Apply to a parent that wraps animated children.
 * Children animate with a slight delay between each.
 *
 *   <motion.ul variants={stagger} initial="initial" animate="animate">
 *     {items.map(it => <motion.li variants={fadeInUp} ... />)}
 *   </motion.ul>
 */
export const stagger = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.04,
    },
  },
  exit: {
    transition: {
      staggerChildren: 0.03,
      staggerDirection: -1,
    },
  },
};

export const staggerSlow = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.08,
    },
  },
};

// ============================================================
// Interactive (hover / tap)
// ============================================================

/**
 * Apply directly via `whileHover` / `whileTap`:
 *   <motion.button whileHover={hover.lift} whileTap={tap.press}>
 */
export const hover = {
  lift: { y: -2, transition: spring.snappy },
  glow: { scale: 1.02, transition: spring.snappy },
  zoom: { scale: 1.05, transition: spring.snappy },
};

export const tap = {
  press: { scale: 0.96, transition: spring.stiff },
  pressDeep: { scale: 0.92, transition: spring.stiff },
};

// ============================================================
// Background cross-fade (for PS5-style lobby bg switching)
// ============================================================

export const bgCrossfade = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: duration.cinema, ease: easing.ios },
};
