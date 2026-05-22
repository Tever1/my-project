"use client";

import { motion } from "framer-motion";

interface BreathingPlaceholderProps {
  text: string;
  variant: "breathing-text" | "skeleton" | "skeleton-shimmer";
  lines?: number;
  width?: string;
}

export function BreathingPlaceholder({
  text,
  variant,
  lines = 2,
  width = "100%",
}: BreathingPlaceholderProps) {
  if (variant === "breathing-text") {
    return (
      <motion.p
        className="text-lg font-medium text-white/80"
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      >
        {text}
      </motion.p>
    );
  }

  const isShimmer = variant === "skeleton-shimmer";

  return (
    <div className="flex flex-col gap-3" style={{ width }}>
      {isShimmer ? (
        <style>{`
          @keyframes ingame-shimmer {
            0% { background-position: -200% 0; }
            100% { background-position: 200% 0; }
          }
        `}</style>
      ) : null}
      {Array.from({ length: lines }, (_, index) => (
        <div
          key={index}
          className="h-4 rounded-lg"
          style={{
            width: index === lines - 1 ? "72%" : "100%",
            background: isShimmer
              ? "linear-gradient(90deg, rgba(255,255,255,0.05), rgba(255,255,255,0.2), rgba(255,255,255,0.05))"
              : "rgba(255,255,255,0.1)",
            backgroundSize: isShimmer ? "200% 100%" : undefined,
            animation: isShimmer ? "ingame-shimmer 1.5s linear infinite" : undefined,
          }}
        />
      ))}
    </div>
  );
}
