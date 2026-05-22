"use client";

import { useEffect, useState, type ReactNode } from "react";
import {
  AnimatedScore,
  BreathingPlaceholder,
  CelebrationBurst,
  TurnIndicator,
  UrgencyTimer,
} from "@/components/ingame";

const gameColors = {
  quiz: "#facc15",
  crocodile: "#ef4444",
  spy: "#14b8a6",
  alias: "#ec4899",
} as const;

function PreviewSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-t border-white/10 pt-8">
      <h2 className="mb-4 text-xl font-semibold text-white/70">{title}</h2>
      {children}
    </section>
  );
}

function PreviewCard({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex min-h-52 flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] p-6">
      <div className="flex min-h-32 w-full items-center justify-center">{children}</div>
      <p className="mt-5 text-sm font-medium text-white/50">{label}</p>
    </div>
  );
}

function PreviewButton({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-lg bg-white/10 px-4 py-2 text-sm text-white transition-colors hover:bg-white/20"
    >
      {children}
    </button>
  );
}

function Checkmark() {
  return (
    <svg width="44" height="44" viewBox="0 0 44 44" fill="none" aria-hidden="true">
      <path
        d="M11 23.5L18.2 30.5L33.5 13.5"
        stroke="currentColor"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function IngamePreviewPage() {
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerCurrent, setTimerCurrent] = useState(30);
  const [score, setScore] = useState(24);
  const [celebrationTrigger, setCelebrationTrigger] = useState(false);
  const [turnActive, setTurnActive] = useState(true);

  useEffect(() => {
    if (!timerRunning) return;

    const interval = window.setInterval(() => {
      setTimerCurrent((current) => {
        if (current <= 1) {
          setTimerRunning(false);
          return 0;
        }
        return current - 1;
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [timerRunning]);

  function resetTimer() {
    setTimerRunning(false);
    setTimerCurrent(30);
  }

  function fireCelebration() {
    setCelebrationTrigger(true);
    window.setTimeout(() => setCelebrationTrigger(false), 700);
  }

  return (
    <main className="min-h-screen bg-gray-950 px-6 py-10 text-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-12">
        <header>
          <h1 className="mb-8 text-3xl font-bold text-white">In-Game Polish — Phase G</h1>
          <p className="max-w-2xl text-sm leading-6 text-white/45">
            Dev preview for shared in-game motion components before integration into games.
          </p>
        </header>

        <PreviewSection title="UrgencyTimer">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <PreviewCard label="ring">
              <UrgencyTimer
                variant="ring"
                total={30}
                current={timerCurrent}
                color={gameColors.quiz}
                size="md"
              />
            </PreviewCard>
            <PreviewCard label="bar">
              <UrgencyTimer
                variant="bar"
                total={30}
                current={timerCurrent}
                color={gameColors.spy}
                size="md"
              />
            </PreviewCard>
            <PreviewCard label="pulse">
              <UrgencyTimer
                variant="pulse"
                total={30}
                current={timerCurrent}
                color={gameColors.alias}
                size="md"
              />
            </PreviewCard>
          </div>
          <div className="mt-5 flex justify-center gap-3">
            <PreviewButton onClick={() => setTimerRunning((running) => !running)}>
              {timerRunning ? "⏸ Пауза" : "▶ Старт"}
            </PreviewButton>
            <PreviewButton onClick={resetTimer}>⟳ Reset</PreviewButton>
          </div>
        </PreviewSection>

        <PreviewSection title="AnimatedScore">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <PreviewCard label="countup">
              <AnimatedScore
                variant="countup"
                value={score}
                color={gameColors.quiz}
                size="lg"
              />
            </PreviewCard>
            <PreviewCard label="pop">
              <AnimatedScore
                variant="pop"
                value={score}
                color={gameColors.crocodile}
                size="lg"
              />
            </PreviewCard>
            <PreviewCard label="countup-pop">
              <AnimatedScore
                variant="countup-pop"
                value={score}
                color={gameColors.alias}
                size="lg"
              />
            </PreviewCard>
          </div>
          <div className="mt-5 flex justify-center gap-3">
            <PreviewButton onClick={() => setScore((value) => value + 1)}>+1</PreviewButton>
            <PreviewButton onClick={() => setScore((value) => value + 10)}>+10</PreviewButton>
            <PreviewButton onClick={() => setScore((value) => value - 5)}>-5</PreviewButton>
          </div>
        </PreviewSection>

        <PreviewSection title="CelebrationBurst">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <PreviewCard label="flash">
              <div className="relative grid size-[120px] place-items-center overflow-hidden rounded-3xl border border-white/10 bg-white/5 text-white">
                <Checkmark />
                <CelebrationBurst
                  trigger={celebrationTrigger}
                  variant="flash"
                  color={gameColors.quiz}
                />
              </div>
            </PreviewCard>
            <PreviewCard label="particles">
              <div className="relative grid size-[120px] place-items-center overflow-hidden rounded-3xl border border-white/10 bg-white/5 text-white">
                <Checkmark />
                <CelebrationBurst
                  trigger={celebrationTrigger}
                  variant="particles"
                  color={gameColors.spy}
                />
              </div>
            </PreviewCard>
            <PreviewCard label="flash-particles">
              <div className="relative grid size-[120px] place-items-center overflow-hidden rounded-3xl border border-white/10 bg-white/5 text-white">
                <Checkmark />
                <CelebrationBurst
                  trigger={celebrationTrigger}
                  variant="flash-particles"
                  color={gameColors.alias}
                />
              </div>
            </PreviewCard>
          </div>
          <div className="mt-5 flex justify-center gap-3">
            <PreviewButton onClick={fireCelebration}>🎉 Fire!</PreviewButton>
          </div>
        </PreviewSection>

        <PreviewSection title="TurnIndicator">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <PreviewCard label="glow-pulse">
              <TurnIndicator
                variant="glow-pulse"
                name="Аня 👀"
                isActive={turnActive}
                color={gameColors.crocodile}
              />
            </PreviewCard>
            <PreviewCard label="ring-pulse">
              <TurnIndicator
                variant="ring-pulse"
                name="Аня 👀"
                isActive={turnActive}
                color={gameColors.crocodile}
              />
            </PreviewCard>
            <PreviewCard label="spotlight">
              <TurnIndicator
                variant="spotlight"
                name="Аня 👀"
                isActive={turnActive}
                color={gameColors.crocodile}
              />
            </PreviewCard>
          </div>
          <div className="mt-5 flex justify-center gap-3">
            <PreviewButton onClick={() => setTurnActive((active) => !active)}>
              {turnActive ? "Активен" : "Неактивен"}
            </PreviewButton>
          </div>
        </PreviewSection>

        <PreviewSection title="BreathingPlaceholder">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <PreviewCard label="breathing-text">
              <BreathingPlaceholder
                variant="breathing-text"
                text="Ждём хоста…"
              />
            </PreviewCard>
            <PreviewCard label="skeleton">
              <BreathingPlaceholder
                variant="skeleton"
                text=""
                lines={3}
                width="220px"
              />
            </PreviewCard>
            <PreviewCard label="skeleton-shimmer">
              <BreathingPlaceholder
                variant="skeleton-shimmer"
                text=""
                lines={3}
                width="220px"
              />
            </PreviewCard>
          </div>
        </PreviewSection>
      </div>
    </main>
  );
}
