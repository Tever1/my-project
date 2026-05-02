"use client";

/**
 * /icon-compare — side-by-side comparison of generated icon styles.
 *
 * v1, v2: only A (flat-3d) and B (glassy) shown — C and D dropped.
 * v3: deep dive on B (glassy) — 4 variations (2 with glow, 2 without).
 * Each variant gets a "lobby tile preview" with overflowing icon + hover scale.
 */

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { fadeInUp, hover, tap } from "@/lib/design/motion";
import { gameColors, radius, spring } from "@/lib/design/tokens";
import { GlassPanel } from "@/components/glass";

type Version = "v1" | "v2" | "v3";

const styleMetaV1V2 = [
  {
    id: "flat-3d",
    label: "A — Flat 3D",
    desc: "Объёмные иконки, мягкий свет, тени. iOS 26 / Apple Vision OS вайб.",
  },
  {
    id: "glassy",
    label: "B — Glassy",
    desc: "Полупрозрачные стеклянные иконки с внутренним свечением.",
  },
];

// v3 = глубокое погружение в Glassy. 4 варианта на основе нового референса
// (мафиозо в белом костюме). 2 со внутренним свечением, 2 без.
const v3Variants = [
  {
    id: "glow-1",
    label: "B-1 · Со свечением",
    desc: "Внутренняя красная подсветка + лицо в тени",
    file: "/icons/test/mafia-v3-glow-1.png",
    glow: true,
  },
  {
    id: "glow-2",
    label: "B-2 · Со свечением (вариация позы)",
    desc: "Три-четверти поворот, широкие плечи",
    file: "/icons/test/mafia-v3-glow-2.png",
    glow: true,
  },
  {
    id: "noglow-1",
    label: "B-3 · Без свечения",
    desc: "Чистое стекло, только внешний свет",
    file: "/icons/test/mafia-v3-noglow-1.png",
    glow: false,
  },
  {
    id: "noglow-2",
    label: "B-4 · Без свечения (вариация позы)",
    desc: "Три-четверти поворот, монохром",
    file: "/icons/test/mafia-v3-noglow-2.png",
    glow: false,
  },
];

const versionMeta: Record<
  Version,
  { label: string; subject: string; accent: string }
> = {
  v1: {
    label: "v1 — Венецианская маска",
    subject: "венецианская маска (карнавальная)",
    accent: gameColors.mafia.accent,
  },
  v2: {
    label: "v2 — Гангстер в федоре",
    subject: "силуэт мафиози в шляпе с красным галстуком",
    accent: "#dc2626",
  },
  v3: {
    label: "v3 — Glassy: белый костюм",
    subject: "мафиозо в белом костюме (по референсу)",
    accent: "#dc2626",
  },
};

const fileFor = (version: Version, style: string) =>
  version === "v1"
    ? `/icons/test/mafia-${style}.png`
    : `/icons/test/mafia-v2-${style}.png`;

export default function IconComparePage() {
  const [version, setVersion] = useState<Version>("v3");

  useEffect(() => {
    document.documentElement.classList.add("dark");
    return () => document.documentElement.classList.remove("dark");
  }, []);

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
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        {/* Header */}
        <motion.header {...fadeInUp} style={{ marginBottom: 32 }}>
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
            Фаза C — выбор стиля иконок
          </p>
          <h1
            style={{
              fontSize: 48,
              fontWeight: 700,
              letterSpacing: "-0.03em",
              lineHeight: 1.05,
              margin: 0,
            }}
          >
            Сравнение стилей
          </h1>
          <p
            style={{
              fontSize: 17,
              color: "rgba(240, 238, 246, 0.6)",
              marginTop: 16,
              maxWidth: 720,
              lineHeight: 1.5,
            }}
          >
            v1 и v2 — два стиля (A — Flat 3D, B — Glassy). v3 — углублённое
            исследование Glassy: мафиозо в белом костюме, 2 варианта со
            свечением и 2 без.
          </p>
        </motion.header>

        {/* Version toggle */}
        <div
          style={{
            display: "flex",
            gap: 8,
            marginBottom: 40,
            padding: 6,
            background: "rgba(255,255,255,0.04)",
            borderRadius: radius.full,
            border: "1px solid rgba(255,255,255,0.08)",
            width: "fit-content",
            flexWrap: "wrap",
          }}
        >
          {(Object.keys(versionMeta) as Version[]).map((v) => (
            <button
              key={v}
              onClick={() => setVersion(v)}
              style={{
                padding: "10px 22px",
                borderRadius: radius.full,
                background:
                  version === v
                    ? `color-mix(in srgb, ${versionMeta[v].accent} 20%, transparent)`
                    : "transparent",
                border:
                  version === v
                    ? `1px solid color-mix(in srgb, ${versionMeta[v].accent} 50%, transparent)`
                    : "1px solid transparent",
                color:
                  version === v ? versionMeta[v].accent : "rgba(255,255,255,0.6)",
                fontFamily: "inherit",
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 200ms",
              }}
            >
              {versionMeta[v].label}
            </button>
          ))}
        </div>

        {/* v1/v2 — original layout (A and B only) */}
        {version !== "v3" && (
          <div style={{ display: "grid", gap: 32 }}>
            {styleMetaV1V2.map((s, i) => (
              <StyleSection
                key={`${version}-${s.id}`}
                index={i}
                label={s.label}
                desc={s.desc}
                file={fileFor(version, s.id)}
              />
            ))}
          </div>
        )}

        {/* v3 — deep dive into Glassy variants */}
        {version === "v3" && (
          <div style={{ display: "grid", gap: 32 }}>
            {v3Variants.map((v, i) => (
              <StyleSection
                key={v.id}
                index={i}
                label={v.label}
                desc={v.desc}
                file={v.file}
                badgeText={v.glow ? "Со свечением" : "Без свечения"}
                badgeColor={v.glow ? "#dc2626" : "#94a3b8"}
              />
            ))}
          </div>
        )}

        {/* Decision panel */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spring.soft, delay: 0.5 }}
          style={{ marginTop: 64 }}
        >
          <GlassPanel variant="hero" padding={32}>
            <h3
              style={{
                fontSize: 22,
                fontWeight: 600,
                margin: 0,
                marginBottom: 8,
              }}
            >
              Что оценивать
            </h3>
            <ul
              style={{
                margin: 0,
                paddingLeft: 20,
                fontSize: 15,
                color: "rgba(255,255,255,0.75)",
                lineHeight: 1.7,
              }}
            >
              <li>
                <strong>Премиум-ощущение</strong> — выглядит дорого или дёшево?
              </li>
              <li>
                <strong>Лобби-тайл</strong> — иконка эффектно выступает из рамки?
                Hover-увеличение чувствуется?
              </li>
              <li>
                <strong>Свечение vs без</strong> (v3) — что лучше работает на
                тёмном фоне? Что на светлом?
              </li>
              <li>
                <strong>Читаемость на 24px</strong> — узнаётся в маленьком размере?
              </li>
              <li>
                <strong>Атмосфера «мафии»</strong> — чувствуется интрига?
              </li>
            </ul>
            <p
              style={{
                marginTop: 20,
                marginBottom: 0,
                fontSize: 14,
                color: "rgba(255,255,255,0.55)",
                fontStyle: "italic",
              }}
            >
              Скажи в чате какой вариант берём. Например: «B-2» (со свечением,
              три-четверти) или «B-3» (без свечения, прямой). Тогда зафиксирую
              выбор и сгенерирую все 7 игр.
            </p>
          </GlassPanel>
        </motion.div>
      </div>
    </main>
  );
}

/**
 * StyleSection — single style/variant block with 3 backgrounds + lobby tile preview + size check.
 */
function StyleSection({
  index,
  label,
  desc,
  file,
  badgeText,
  badgeColor,
}: {
  index: number;
  label: string;
  desc: string;
  file: string;
  badgeText?: string;
  badgeColor?: string;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...spring.soft, delay: index * 0.08 }}
    >
      {/* Label + badge */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 16,
          flexWrap: "wrap",
        }}
      >
        <h2
          style={{
            fontSize: 24,
            fontWeight: 600,
            letterSpacing: "-0.02em",
            margin: 0,
          }}
        >
          {label}
        </h2>
        {badgeText && (
          <span
            style={{
              padding: "4px 10px",
              borderRadius: radius.full,
              background: `color-mix(in srgb, ${badgeColor} 18%, transparent)`,
              border: `1px solid color-mix(in srgb, ${badgeColor} 35%, transparent)`,
              color: badgeColor,
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.05em",
              textTransform: "uppercase",
            }}
          >
            {badgeText}
          </span>
        )}
      </div>
      <p
        style={{
          fontSize: 14,
          color: "rgba(255,255,255,0.55)",
          marginTop: 0,
          marginBottom: 20,
          maxWidth: 600,
        }}
      >
        {desc}
      </p>

      {/* 3 backgrounds */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 16,
          marginBottom: 20,
        }}
      >
        <BackgroundCard label="Игровой тайл (тёмный фон)">
          <div
            style={{
              width: "100%",
              aspectRatio: "1",
              borderRadius: radius.xl,
              background: `linear-gradient(135deg, ${gameColors.mafia.deep}55, ${gameColors.mafia.accent}25)`,
              backdropFilter: "blur(16px)",
              border: `1px solid ${gameColors.mafia.accent}40`,
              boxShadow: `0 16px 48px ${gameColors.mafia.accent}30`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "10%",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={file}
              alt={label}
              style={{ width: "100%", height: "100%", objectFit: "contain" }}
            />
          </div>
        </BackgroundCard>

        <BackgroundCard label="Glass-карточка (светлая)">
          <div
            style={{
              width: "100%",
              aspectRatio: "1",
              borderRadius: radius.xl,
              background: "rgba(255,255,255,0.85)",
              backdropFilter: "blur(20px)",
              border: "1px solid rgba(255,255,255,0.95)",
              boxShadow: "0 16px 48px rgba(0,0,0,0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "10%",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={file}
              alt={label}
              style={{ width: "100%", height: "100%", objectFit: "contain" }}
            />
          </div>
        </BackgroundCard>

        <BackgroundCard label="TV-режим (крупно)">
          <div
            style={{
              width: "100%",
              aspectRatio: "1",
              borderRadius: radius["2xl"],
              background: `linear-gradient(180deg, ${gameColors.mafia.deep}, #0c0a15)`,
              border: `2px solid ${gameColors.mafia.accent}40`,
              boxShadow: `0 0 64px ${gameColors.mafia.accent}50`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "8%",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={file}
              alt={label}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "contain",
                filter: `drop-shadow(0 0 24px ${gameColors.mafia.accent}80)`,
              }}
            />
          </div>
        </BackgroundCard>
      </div>

      {/* Lobby tile preview — icon overflows + hover scale */}
      <LobbyTilePreview src={file} />

      {/* Small-size readability check */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 24,
          marginTop: 20,
          padding: "16px 20px",
          background: "rgba(255,255,255,0.03)",
          borderRadius: radius.md,
          border: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <span
          style={{
            fontSize: 12,
            color: "rgba(255,255,255,0.5)",
            letterSpacing: "0.04em",
            textTransform: "uppercase",
            flexShrink: 0,
          }}
        >
          Маленький размер
        </span>
        {[24, 40, 64, 96].map((size) => (
          <div
            key={size}
            style={{ display: "flex", alignItems: "center", gap: 8 }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={file}
              alt=""
              style={{ width: size, height: size, objectFit: "contain" }}
            />
            <span
              className="font-mono"
              style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}
            >
              {size}px
            </span>
          </div>
        ))}
      </div>
    </motion.section>
  );
}

/**
 * LobbyTilePreview — Phase D PS5 lobby tile spec.
 * Иконка выходит за верхнюю границу рамки на 40%. Hover: тайл поднимается,
 * иконка увеличивается и парит, сзади появляется radial-glow halo.
 */
function LobbyTilePreview({ src }: { src: string }) {
  return (
    <div>
      <p
        className="font-mono"
        style={{
          fontSize: 11,
          color: "rgba(255,255,255,0.4)",
          letterSpacing: "0.05em",
          textTransform: "uppercase",
          marginTop: 0,
          marginBottom: 8,
        }}
      >
        Превью лобби-тайла — наведи мышку
      </p>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 240px))",
          gap: 20,
          paddingTop: 80,
        }}
      >
        {[1, 2, 3].map((n) => (
          <motion.div
            key={n}
            whileHover="hover"
            initial="rest"
            animate="rest"
            style={{ position: "relative", cursor: "pointer" }}
          >
            <motion.div
              variants={{ rest: { opacity: 0 }, hover: { opacity: 1 } }}
              transition={{ duration: 0.4 }}
              style={{
                position: "absolute",
                inset: -20,
                background: `radial-gradient(circle at center, ${gameColors.mafia.accent}40, transparent 70%)`,
                borderRadius: radius["2xl"],
                pointerEvents: "none",
                zIndex: 0,
              }}
            />

            <motion.div
              variants={{
                rest: { y: 0, scale: 1 },
                hover: { y: -6, scale: 1.02 },
              }}
              transition={spring.soft}
              style={{
                position: "relative",
                aspectRatio: "1",
                borderRadius: radius.xl,
                background: `linear-gradient(135deg, ${gameColors.mafia.deep}55, ${gameColors.mafia.accent}20)`,
                backdropFilter: "blur(16px)",
                border: `1px solid ${gameColors.mafia.accent}50`,
                boxShadow: `0 16px 48px rgba(0,0,0,0.4), 0 0 0 1px ${gameColors.mafia.accent}20`,
                overflow: "visible",
                zIndex: 1,
              }}
            >
              <motion.img
                src={src}
                alt="Mafia"
                variants={{
                  rest: { y: 0, scale: 1 },
                  hover: { y: -8, scale: 1.12 },
                }}
                transition={spring.soft}
                style={{
                  position: "absolute",
                  top: "-40%",
                  left: "50%",
                  transform: "translateX(-50%)",
                  width: "85%",
                  height: "85%",
                  objectFit: "contain",
                  filter: `drop-shadow(0 12px 24px rgba(0,0,0,0.5)) drop-shadow(0 0 16px ${gameColors.mafia.accent}40)`,
                  pointerEvents: "none",
                }}
              />

              <div
                style={{
                  position: "absolute",
                  bottom: 0,
                  left: 0,
                  right: 0,
                  padding: 16,
                  textAlign: "center",
                }}
              >
                <div
                  style={{
                    fontSize: 18,
                    fontWeight: 600,
                    color: "white",
                    letterSpacing: "-0.01em",
                  }}
                >
                  Мафия
                </div>
                <div
                  className="font-mono"
                  style={{
                    fontSize: 11,
                    color: "rgba(255,255,255,0.5)",
                    marginTop: 4,
                    letterSpacing: "0.05em",
                  }}
                >
                  6–14 игроков · 20 мин
                </div>
              </div>
            </motion.div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function BackgroundCard({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p
        className="font-mono"
        style={{
          fontSize: 11,
          color: "rgba(255,255,255,0.4)",
          letterSpacing: "0.05em",
          textTransform: "uppercase",
          marginTop: 0,
          marginBottom: 8,
        }}
      >
        {label}
      </p>
      {children}
    </div>
  );
}

void hover;
void tap;
void fadeInUp;
