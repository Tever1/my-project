"use client";

import { motion } from "framer-motion";
import { spring } from "@/lib/design/tokens";

interface TurnIndicatorProps {
  name: string;
  isActive: boolean;
  variant: "glow-pulse" | "ring-pulse" | "spotlight";
  color?: string;
  avatarUrl?: string;
}

function Avatar({ name, avatarUrl }: Pick<TurnIndicatorProps, "name" | "avatarUrl">) {
  return (
    <div className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-full bg-white/15 text-xl font-black text-white">
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        name.trim().charAt(0).toUpperCase()
      )}
    </div>
  );
}

export function TurnIndicator({
  name,
  isActive,
  variant,
  color = "#ef4444",
  avatarUrl,
}: TurnIndicatorProps) {
  if (variant === "ring-pulse") {
    return (
      <div className="relative flex items-center justify-center gap-3 rounded-2xl px-5 py-4 text-white">
        <div className="relative">
          <Avatar name={name} avatarUrl={avatarUrl} />
          {isActive ? (
            <motion.svg
              className="pointer-events-none absolute -inset-2"
              width="72"
              height="72"
              viewBox="0 0 72 72"
              fill="none"
              animate={{ opacity: [1, 0, 1] }}
              transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
            >
              <circle
                cx="36"
                cy="36"
                r="32"
                stroke={color}
                strokeWidth="3"
                strokeDasharray="10 8"
              />
            </motion.svg>
          ) : null}
        </div>
        <span className="text-xl font-bold">{name}</span>
      </div>
    );
  }

  if (variant === "spotlight") {
    return (
      <motion.div
        className="flex min-h-28 flex-col items-center justify-center rounded-3xl px-8 py-5 text-center text-white"
        style={{
          background: isActive
            ? `radial-gradient(circle, ${color}22 0%, transparent 70%)`
            : "transparent",
        }}
        animate={{ scale: isActive ? 1.08 : 1 }}
        transition={spring.medium}
      >
        {isActive ? (
          <motion.span
            className="mb-1 text-xs font-bold uppercase tracking-[0.2em] text-white/50"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            Текущий ход:
          </motion.span>
        ) : null}
        <span className="text-3xl font-black">{name}</span>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="flex items-center justify-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-white"
      style={{ boxShadow: isActive ? `0 0 16px 4px ${color}` : "none" }}
      animate={isActive ? { scale: [1, 1.05, 1] } : { scale: 1 }}
      transition={
        isActive
          ? { duration: 1.5, repeat: Infinity, ease: "easeInOut" }
          : { duration: 0.2 }
      }
    >
      <Avatar name={name} avatarUrl={avatarUrl} />
      <span className="text-xl font-bold">{name}</span>
    </motion.div>
  );
}
