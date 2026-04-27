"use client";

/**
 * /design-tokens — visual preview of all Phase A foundation tokens.
 *
 * Living documentation. Visit this page to see typography, palette,
 * radius scale, motion presets, and glass surfaces in action.
 *
 * Force-dark via inline style on <main> wrapper (does not affect rest of app).
 */

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import {
  spring,
  duration,
  easing,
  gameColors,
  radius,
  type GameId,
} from "@/lib/design/tokens";
import {
  fadeInUp,
  scaleIn,
  pop,
  stagger,
  hover,
  tap,
} from "@/lib/design/motion";

const games: { id: GameId; ru: string }[] = [
  { id: "quiz", ru: "Квиз" },
  { id: "mafia", ru: "Мафия" },
  { id: "crocodile", ru: "Крокодил" },
  { id: "spy", ru: "Шпион" },
  { id: "alias", ru: "Alias" },
  { id: "who-am-i", ru: "Кто я?" },
  { id: "hundred-to-one", ru: "100 к 1" },
];

const springEntries: { name: keyof typeof spring; label: string }[] = [
  { name: "soft", label: "soft (200/30) — luxe default" },
  { name: "medium", label: "medium (280/28)" },
  { name: "snappy", label: "snappy (400/30)" },
  { name: "bouncy", label: "bouncy (350/18) — overshoot" },
  { name: "stiff", label: "stiff (500/35)" },
];

export default function DesignTokensPage() {
  // Force-dark for this page
  useEffect(() => {
    document.documentElement.classList.add("dark");
    return () => document.documentElement.classList.remove("dark");
  }, []);

  const [popKey, setPopKey] = useState(0);
  const [activeGame, setActiveGame] = useState<GameId>("mafia");

  return (
    <main
      style={{
        minHeight: "100dvh",
        padding: "48px 24px 96px",
        background:
          "radial-gradient(ellipse at top, #1a1035 0%, #0c0a15 60%, #050309 100%)",
        color: "#f0eef6",
      }}
    >
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        {/* Header */}
        <motion.header {...fadeInUp} style={{ marginBottom: 64 }}>
          <p
            className="font-mono"
            style={{
              fontSize: 13,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "rgba(192, 132, 252, 0.7)",
              marginBottom: 12,
            }}
          >
            Phase A — Foundation
          </p>
          <h1
            style={{
              fontSize: 56,
              fontWeight: 700,
              letterSpacing: "-0.03em",
              lineHeight: 1.05,
              margin: 0,
            }}
          >
            Design Tokens Preview
          </h1>
          <p
            style={{
              fontSize: 18,
              color: "rgba(240, 238, 246, 0.6)",
              marginTop: 16,
              maxWidth: 640,
              lineHeight: 1.5,
            }}
          >
            PS5 × iOS 26 Liquid Glass — фундамент новой дизайн-системы.
            Geist шрифт, per-game палитра, spring-physics, glass-поверхности.
          </p>
        </motion.header>

        {/* Typography */}
        <Section title="Typography — Geist" subtitle="Sans для UI, Mono для цифр">
          <GlassPanel>
            <div style={{ fontSize: 72, fontWeight: 700, letterSpacing: "-0.04em", lineHeight: 1 }}>
              Aa Bb 123
            </div>
            <div style={{ marginTop: 24, display: "grid", gap: 12 }}>
              <Row label="Display 56">
                <span style={{ fontSize: 56, fontWeight: 700, letterSpacing: "-0.03em" }}>
                  Party Games Hub
                </span>
              </Row>
              <Row label="Heading 32">
                <span style={{ fontSize: 32, fontWeight: 600, letterSpacing: "-0.02em" }}>
                  Выбери игру
                </span>
              </Row>
              <Row label="Body 16">
                <span style={{ fontSize: 16, color: "rgba(240, 238, 246, 0.85)" }}>
                  4 игрока готовы — нажми, чтобы начать
                </span>
              </Row>
              <Row label="Mono">
                <span className="font-mono" style={{ fontSize: 32, color: "#c084fc" }}>
                  03:24 · 1,250 pts
                </span>
              </Row>
            </div>
          </GlassPanel>
        </Section>

        {/* Per-game palette */}
        <Section
          title="Per-game palette"
          subtitle="Каждая игра — свой акцент. Hover чтобы увидеть deep-вариант"
        >
          <motion.div
            variants={stagger}
            initial="initial"
            animate="animate"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
              gap: 16,
            }}
          >
            {games.map((g) => (
              <motion.button
                key={g.id}
                variants={fadeInUp}
                whileHover={hover.lift}
                whileTap={tap.press}
                onClick={() => setActiveGame(g.id)}
                style={{
                  border: `1px solid ${
                    activeGame === g.id
                      ? gameColors[g.id].accent
                      : "rgba(255,255,255,0.1)"
                  }`,
                  borderRadius: radius.lg,
                  padding: 20,
                  background: `linear-gradient(135deg, ${gameColors[g.id].deep}40, ${gameColors[g.id].accent}20)`,
                  backdropFilter: "blur(16px)",
                  cursor: "pointer",
                  textAlign: "left",
                  color: "white",
                  fontFamily: "inherit",
                  boxShadow:
                    activeGame === g.id
                      ? `0 0 32px ${gameColors[g.id].accent}50`
                      : "0 8px 32px rgba(0,0,0,0.3)",
                  transition: "border-color 200ms, box-shadow 350ms",
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: radius.full,
                    background: gameColors[g.id].accent,
                    boxShadow: `0 0 20px ${gameColors[g.id].accent}`,
                    marginBottom: 12,
                  }}
                />
                <div style={{ fontSize: 16, fontWeight: 600 }}>{g.ru}</div>
                <div
                  className="font-mono"
                  style={{
                    fontSize: 11,
                    color: "rgba(255,255,255,0.5)",
                    marginTop: 4,
                  }}
                >
                  {gameColors[g.id].accent}
                </div>
              </motion.button>
            ))}
          </motion.div>
        </Section>

        {/* Radius scale */}
        <Section title="Radius scale" subtitle="iOS-26-style generous rounding">
          <GlassPanel>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "flex-end" }}>
              {Object.entries(radius)
                .filter(([k]) => k !== "full")
                .map(([key, value]) => (
                  <div key={key} style={{ textAlign: "center" }}>
                    <div
                      style={{
                        width: 80,
                        height: 80,
                        background: "linear-gradient(135deg, #c084fc, #818cf8)",
                        borderRadius: value as number,
                        marginBottom: 8,
                      }}
                    />
                    <div className="font-mono" style={{ fontSize: 11, color: "rgba(255,255,255,0.6)" }}>
                      {key} · {value}px
                    </div>
                  </div>
                ))}
            </div>
          </GlassPanel>
        </Section>

        {/* Spring presets */}
        <Section
          title="Spring presets"
          subtitle="Кликни на пресет — карточка прыгнет с этой физикой"
        >
          <GlassPanel>
            <div style={{ display: "grid", gap: 12, marginBottom: 24 }}>
              {springEntries.map((s) => (
                <motion.button
                  key={s.name}
                  whileHover={hover.glow}
                  whileTap={tap.press}
                  onClick={() => setPopKey((k) => k + 1)}
                  style={{
                    padding: "12px 16px",
                    borderRadius: radius.md,
                    border: "1px solid rgba(255,255,255,0.12)",
                    background: "rgba(255,255,255,0.04)",
                    backdropFilter: "blur(12px)",
                    color: "white",
                    fontFamily: "inherit",
                    fontSize: 14,
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <span style={{ color: "#c084fc", fontWeight: 600 }}>spring.{s.name}</span>
                  <span style={{ color: "rgba(255,255,255,0.5)", marginLeft: 12 }}>
                    {s.label}
                  </span>
                </motion.button>
              ))}
            </div>

            <div
              style={{
                height: 160,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: radius.lg,
                background: "rgba(255,255,255,0.02)",
                border: "1px dashed rgba(255,255,255,0.1)",
              }}
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={popKey}
                  initial={{ scale: 0.4, opacity: 0, rotate: -8 }}
                  animate={{ scale: 1, opacity: 1, rotate: 0 }}
                  exit={{ scale: 0.6, opacity: 0 }}
                  transition={spring.bouncy}
                  style={{
                    width: 96,
                    height: 96,
                    borderRadius: radius.xl,
                    background: `linear-gradient(135deg, ${gameColors[activeGame].accent}, ${gameColors[activeGame].deep})`,
                    boxShadow: `0 16px 48px ${gameColors[activeGame].accent}40, 0 0 32px ${gameColors[activeGame].accent}30`,
                  }}
                />
              </AnimatePresence>
            </div>
          </GlassPanel>
        </Section>

        {/* Motion variants in action */}
        <Section title="Motion variants" subtitle="Готовые паттерны для импорта">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
            {[
              { variant: scaleIn, label: "scaleIn", desc: "Modals, focus moments" },
              { variant: pop, label: "pop", desc: "Score updates, celebrations" },
              { variant: fadeInUp, label: "fadeInUp", desc: "Lists, cards (default)" },
            ].map((m, i) => (
              <motion.div
                key={`${m.label}-${popKey}-${i}`}
                {...m.variant}
                style={{
                  padding: 24,
                  borderRadius: radius.lg,
                  background: "rgba(255,255,255,0.05)",
                  backdropFilter: "blur(16px)",
                  border: "1px solid rgba(255,255,255,0.1)",
                }}
              >
                <div className="font-mono" style={{ fontSize: 13, color: "#c084fc", fontWeight: 600 }}>
                  {m.label}
                </div>
                <div style={{ marginTop: 8, fontSize: 14, color: "rgba(255,255,255,0.65)" }}>
                  {m.desc}
                </div>
              </motion.div>
            ))}
          </div>
          <button
            onClick={() => setPopKey((k) => k + 1)}
            style={{
              marginTop: 16,
              padding: "10px 20px",
              borderRadius: radius.md,
              border: "1px solid rgba(192, 132, 252, 0.3)",
              background: "rgba(192, 132, 252, 0.12)",
              color: "#c084fc",
              fontFamily: "inherit",
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            ↻ Replay animations
          </button>
        </Section>

        {/* Durations & Easings reference */}
        <Section title="Durations & easings" subtitle="Reference table">
          <GlassPanel>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 }}>
              <div>
                <h4 style={{ margin: 0, marginBottom: 12, fontSize: 14, color: "#c084fc" }}>
                  Durations
                </h4>
                <div style={{ display: "grid", gap: 8 }}>
                  {Object.entries(duration).map(([k, v]) => (
                    <div key={k} className="font-mono" style={{ fontSize: 13 }}>
                      <span style={{ color: "rgba(255,255,255,0.5)" }}>{k}</span>
                      <span style={{ color: "white", marginLeft: 12 }}>{(v * 1000).toFixed(0)}ms</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h4 style={{ margin: 0, marginBottom: 12, fontSize: 14, color: "#c084fc" }}>
                  Easings
                </h4>
                <div style={{ display: "grid", gap: 8 }}>
                  {Object.entries(easing).map(([k, v]) => (
                    <div key={k} className="font-mono" style={{ fontSize: 12 }}>
                      <span style={{ color: "rgba(255,255,255,0.5)" }}>{k}</span>
                      <span style={{ color: "rgba(255,255,255,0.7)", marginLeft: 8 }}>
                        [{v.join(", ")}]
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </GlassPanel>
        </Section>

        <p
          style={{
            textAlign: "center",
            marginTop: 64,
            fontSize: 13,
            color: "rgba(255,255,255,0.35)",
          }}
        >
          Source: <code className="font-mono">src/lib/design/tokens.ts</code> · <code className="font-mono">src/lib/design/motion.ts</code>
        </p>
      </div>
    </main>
  );
}

// ---------- Helpers ----------

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <motion.section
      {...fadeInUp}
      transition={spring.medium}
      style={{ marginBottom: 56 }}
    >
      <h2
        style={{
          fontSize: 24,
          fontWeight: 600,
          letterSpacing: "-0.02em",
          margin: 0,
        }}
      >
        {title}
      </h2>
      <p
        style={{
          fontSize: 14,
          color: "rgba(255,255,255,0.5)",
          marginTop: 4,
          marginBottom: 20,
        }}
      >
        {subtitle}
      </p>
      {children}
    </motion.section>
  );
}

function GlassPanel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        padding: 32,
        borderRadius: radius.xl,
        background: "rgba(255,255,255,0.04)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        border: "1px solid rgba(255,255,255,0.08)",
        boxShadow: "0 16px 48px rgba(0,0,0,0.4)",
      }}
    >
      {children}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 16 }}>
      <span
        className="font-mono"
        style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", width: 100, flexShrink: 0 }}
      >
        {label}
      </span>
      <div>{children}</div>
    </div>
  );
}
