"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";

interface CelebrationBurstProps {
  trigger: boolean;
  variant: "flash" | "particles" | "flash-particles";
  color?: string;
  onComplete?: () => void;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  duration: number;
  opacity: number;
}

function createParticles(count = 10): Particle[] {
  return Array.from({ length: count }, (_, id) => {
    const angle = Math.random() * Math.PI * 2;
    const distance = 40 + Math.random() * 40;
    return {
      id,
      x: Math.cos(angle) * distance,
      y: Math.sin(angle) * distance,
      size: 6 + Math.random() * 4,
      duration: 0.4 + Math.random() * 0.2,
      opacity: 0.7 + Math.random() * 0.3,
    };
  });
}

export function CelebrationBurst({
  trigger,
  variant,
  color = "#facc15",
  onComplete,
}: CelebrationBurstProps) {
  const [triggerCount, setTriggerCount] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    if (!trigger) return;

    queueMicrotask(() => {
      setTriggerCount((count) => count + 1);
      setParticles(createParticles(10));
      setIsRunning(true);
    });

    const timeout = window.setTimeout(() => {
      setIsRunning(false);
      onComplete?.();
    }, 700);

    return () => window.clearTimeout(timeout);
  }, [trigger, onComplete]);

  if (!isRunning) return null;

  const showFlash = variant === "flash" || variant === "flash-particles";
  const showParticles = variant === "particles" || variant === "flash-particles";

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-inherit">
      {showFlash ? (
        <motion.div
          key={`flash-${triggerCount}`}
          className="absolute inset-0"
          style={{ backgroundColor: color }}
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.35, 0] }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        />
      ) : null}

      {showParticles
        ? particles.map((particle) => (
            <motion.span
              key={`${triggerCount}-${particle.id}`}
              className="absolute left-1/2 top-1/2 rounded-full"
              style={{
                width: particle.size,
                height: particle.size,
                marginLeft: -particle.size / 2,
                marginTop: -particle.size / 2,
                backgroundColor: color,
              }}
              initial={{ x: 0, y: 0, opacity: particle.opacity, scale: 1 }}
              animate={{ x: particle.x, y: particle.y, opacity: 0, scale: 0.4 }}
              transition={{ duration: particle.duration, ease: "easeOut" }}
            />
          ))
        : null}
    </div>
  );
}
