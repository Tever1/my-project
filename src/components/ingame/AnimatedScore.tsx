"use client";

import { animate, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { spring } from "@/lib/design/tokens";

interface AnimatedScoreProps {
  value: number;
  variant: "countup" | "pop" | "countup-pop";
  color?: string;
  size?: "sm" | "md" | "lg" | "xl";
  prefix?: string;
}

const sizeClasses = {
  sm: "text-3xl",
  md: "text-5xl",
  lg: "text-7xl",
  xl: "text-8xl",
} as const;

function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T>(undefined);
  useEffect(() => {
    ref.current = value;
  }, [value]);
  // eslint-disable-next-line react-hooks/refs
  return ref.current;
}

export function AnimatedScore({
  value,
  variant,
  color = "#ffffff",
  size = "lg",
  prefix = "",
}: AnimatedScoreProps) {
  const previous = usePrevious(value);
  const [displayValue, setDisplayValue] = useState(value);
  const [pulseKey, setPulseKey] = useState(0);

  useEffect(() => {
    if (previous === undefined || previous === value) {
      return;
    }

    if (variant === "pop") {
      queueMicrotask(() => {
        setDisplayValue(value);
        setPulseKey((key) => key + 1);
      });
      return;
    }

    const controls = animate(previous, value, {
      duration: variant === "countup-pop" ? 0.3 : 0.4,
      ease: "easeOut",
      onUpdate: (latest) => setDisplayValue(Math.round(latest)),
      onComplete: () => {
        setDisplayValue(value);
        if (variant === "countup-pop") {
          setPulseKey((key) => key + 1);
        }
      },
    });

    return () => controls.stop();
  }, [previous, value, variant]);

  return (
    <motion.span
      key={pulseKey}
      className={`inline-block font-black tabular-nums tracking-normal ${sizeClasses[size]}`}
      style={{ color }}
      initial={false}
      animate={variant === "countup" ? { scale: 1 } : { scale: [1, 1.25, 1] }}
      transition={
        variant === "countup"
          ? spring.snappy
          : { duration: 0.3, ease: [0.34, 1.56, 0.64, 1] }
      }
    >
      {prefix}
      {displayValue}
    </motion.span>
  );
}
