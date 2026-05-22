"use client";

import { motion } from "framer-motion";

interface UrgencyTimerProps {
  total: number;
  current: number;
  variant: "ring" | "bar" | "pulse";
  color?: string;
  size?: "sm" | "md" | "lg";
}

const sizeConfig = {
  sm: { box: 88, stroke: 8, text: "text-2xl", bar: "h-2" },
  md: { box: 120, stroke: 10, text: "text-4xl", bar: "h-3" },
  lg: { box: 156, stroke: 12, text: "text-6xl", bar: "h-4" },
} as const;

function getRatio(total: number, current: number) {
  if (total <= 0) return 0;
  return Math.max(0, Math.min(1, current / total));
}

function getUrgencyColor(ratio: number, color: string) {
  if (ratio < 0.15) return "#ef4444";
  if (ratio < 0.3) return "#f97316";
  return color;
}

export function UrgencyTimer({
  total,
  current,
  variant,
  color = "#ffffff",
  size = "md",
}: UrgencyTimerProps) {
  const ratio = getRatio(total, current);
  const urgencyColor = getUrgencyColor(ratio, color);
  const isCritical = ratio < 0.15 && current > 0;
  const isWarning = ratio < 0.3 && current > 0;
  const config = sizeConfig[size];

  if (variant === "ring") {
    const radius = (config.box - config.stroke) / 2;

    return (
      <motion.div
        className="relative grid place-items-center"
        style={{ width: config.box, height: config.box, color: urgencyColor }}
        animate={isCritical ? { x: [-2, 2, -2, 0] } : { x: 0 }}
        transition={
          isCritical
            ? { duration: 0.4, repeat: Infinity, ease: "easeInOut" }
            : { duration: 0.2 }
        }
      >
        <svg width={config.box} height={config.box} className="-rotate-90">
          <circle
            cx={config.box / 2}
            cy={config.box / 2}
            r={radius}
            stroke="rgba(255,255,255,0.14)"
            strokeWidth={config.stroke}
            fill="none"
          />
          <motion.circle
            cx={config.box / 2}
            cy={config.box / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth={config.stroke}
            fill="none"
            strokeLinecap="round"
            initial={false}
            animate={{ pathLength: ratio }}
            transition={{ duration: 0.3, ease: "linear" }}
            style={{ pathLength: ratio }}
          />
        </svg>
        <span className={`absolute font-black tabular-nums text-white ${config.text}`}>
          {Math.ceil(current)}
        </span>
      </motion.div>
    );
  }

  if (variant === "bar") {
    return (
      <div className="flex w-full max-w-56 flex-col items-center gap-4">
        <span className={`font-black tabular-nums text-white ${config.text}`}>
          {Math.ceil(current)}
        </span>
        <div className={`w-full overflow-hidden rounded-full bg-white/10 ${config.bar}`}>
          <motion.div
            className="h-full rounded-full"
            style={{ backgroundColor: urgencyColor }}
            initial={false}
            animate={{
              width: `${ratio * 100}%`,
              opacity: isCritical ? [1, 0.4, 1] : 1,
            }}
            transition={{
              width: { duration: 0.3, ease: "linear" },
              opacity: isCritical
                ? { duration: 0.6, repeat: Infinity, ease: "easeInOut" }
                : { duration: 0.2 },
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <motion.div
      className={`rounded-2xl px-6 py-4 font-black tabular-nums text-white ${config.text}`}
      style={{
        color: urgencyColor,
        boxShadow: isWarning ? `0 0 12px ${urgencyColor}` : "none",
      }}
      animate={isCritical ? { scale: [1, 1.08, 1] } : { scale: 1 }}
      transition={
        isCritical
          ? { duration: 0.5, repeat: Infinity, ease: "easeInOut" }
          : { duration: 0.2 }
      }
    >
      {Math.ceil(current)}
    </motion.div>
  );
}
