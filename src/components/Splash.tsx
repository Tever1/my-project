"use client";

import { motion } from "framer-motion";
import { GlassPanel } from "@/components/glass";
import { useIsMobile } from "@/lib/use-is-mobile";
import { type PlayMode, usePlayMode } from "@/lib/use-play-mode";

const ACCENT_COLOR = "var(--color-game-quiz, #facc15)";

export function Splash() {
  const isMobile = useIsMobile();
  const { setMode } = usePlayMode();
  const targetMode: PlayMode = isMobile ? "mobile" : "desktop";
  const label = isMobile ? "Играть на телефоне" : "Играть";
  const subtitle = isMobile
    ? "присоединиться к комнате по QR"
    : "запустить игру на этом экране";

  return (
    <main className="min-h-screen overflow-hidden bg-[#08080d] px-4 py-8 text-white sm:px-6">
      <motion.div
        className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-5xl items-center justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
      >
        <GlassPanel
          variant="hero"
          radius="xl"
          padding="clamp(24px, 5vw, 48px)"
          className="w-full"
          accentColor={ACCENT_COLOR}
        >
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-5xl font-black tracking-[0] text-white sm:text-6xl">
              Party Games Hub
            </h1>
            <p className="mt-4 text-xl font-semibold text-white/70">Где вы играете?</p>
          </div>

          <div className="mt-10 flex justify-center">
            <motion.button
              type="button"
              onClick={() => setMode(targetMode)}
              whileTap={{ scale: 0.97 }}
              transition={{ type: "spring", stiffness: 400, damping: 22 }}
              className="
                flex min-h-[180px] w-full max-w-md flex-col items-center justify-center gap-3
                rounded-3xl border border-white/15 bg-white/[0.06]
                px-8 py-10 text-center
                ring-2 ring-[var(--color-game-quiz)]
                shadow-[0_0_40px_rgba(250,204,21,0.30)]
                transition-all duration-200
                hover:border-white/25 hover:bg-white/[0.10]
                focus-visible:outline-none focus-visible:ring-4
              "
            >
              <span className="text-3xl font-black leading-tight text-white sm:text-4xl">
                {label}
              </span>
              <span className="text-base font-medium leading-relaxed text-white/70 sm:text-lg">
                {subtitle}
              </span>
            </motion.button>
          </div>
        </GlassPanel>
      </motion.div>
    </main>
  );
}
