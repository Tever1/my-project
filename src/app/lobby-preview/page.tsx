"use client";

/**
 * /lobby-preview — preview of the PS5-style lobby with all 7 game tiles.
 *
 * Uses <GameIcon> with placeholder fallback. Once PNGs land in
 * public/icons/games/ they'll show up automatically.
 */

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { GameIcon } from "@/components/GameIcon";
import { gameColors, radius, spring, type GameId } from "@/lib/design/tokens";
import { fadeInUp } from "@/lib/design/motion";

interface GameInfo {
  id: GameId;
  name: string;
  description: string;
  players: string;
  duration: string;
}

const games: GameInfo[] = [
  {
    id: "mafia",
    name: "Мафия",
    description: "Найди своих среди чужих в ночном городе",
    players: "6–14 игроков",
    duration: "20 мин",
  },
  {
    id: "quiz",
    name: "Квиз",
    description: "500+ вопросов на любую тему",
    players: "2–20 игроков",
    duration: "15 мин",
  },
  {
    id: "crocodile",
    name: "Крокодил",
    description: "Объясни слово, не используя слов",
    players: "4–20 игроков",
    duration: "15 мин",
  },
  {
    id: "spy",
    name: "Шпион",
    description: "Угадай локацию или сохрани прикрытие",
    players: "3–10 игроков",
    duration: "10 мин",
  },
  {
    id: "alias",
    name: "Alias",
    description: "Объясняй слова на скорость",
    players: "4–20 игроков",
    duration: "20 мин",
  },
  {
    id: "who-am-i",
    name: "Кто я?",
    description: "Угадай кто ты по вопросам",
    players: "3–12 игроков",
    duration: "15 мин",
  },
  {
    id: "hundred-to-one",
    name: "100 к 1",
    description: "Самые популярные ответы",
    players: "4–10 игроков",
    duration: "30 мин",
  },
];

export default function LobbyPreviewPage() {
  const [activeGame, setActiveGame] = useState<GameId>("mafia");

  useEffect(() => {
    document.documentElement.classList.add("dark");
    return () => document.documentElement.classList.remove("dark");
  }, []);

  const active = games.find((g) => g.id === activeGame)!;
  const accent = gameColors[active.id].accent;
  const deep = gameColors[active.id].deep;

  return (
    <main
      style={{
        minHeight: "100dvh",
        position: "relative",
        overflow: "hidden",
        color: "#f0eef6",
        padding: "32px 24px",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Dynamic background that morphs to active game's accent */}
      <motion.div
        animate={{
          background: `radial-gradient(ellipse 90% 60% at 50% 0%, ${deep}AA 0%, ${deep}55 30%, #0c0a15 70%, #050309 100%)`,
        }}
        transition={{ duration: 0.8, ease: [0.32, 0.72, 0, 1] }}
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 0,
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          position: "relative",
          zIndex: 1,
          maxWidth: 1280,
          margin: "0 auto",
          width: "100%",
          flex: 1,
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header / nav */}
        <motion.header {...fadeInUp} style={{ marginBottom: 24 }}>
          <p
            className="font-mono"
            style={{
              fontSize: 13,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "rgba(192, 132, 252, 0.7)",
              marginBottom: 6,
            }}
          >
            Превью лобби · Фаза D
          </p>
          <h1
            style={{
              fontSize: 28,
              fontWeight: 700,
              letterSpacing: "-0.02em",
              margin: 0,
            }}
          >
            Party Games Hub
          </h1>
          <p
            style={{
              fontSize: 13,
              color: "rgba(255,255,255,0.45)",
              marginTop: 6,
            }}
          >
            Иконки сейчас — заглушки. PNG-файлы из{" "}
            <code className="font-mono" style={{ color: "rgba(255,255,255,0.7)" }}>
              public/icons/games/
            </code>{" "}
            подхватятся автоматически.
          </p>
        </motion.header>

        {/* Center info card for active game */}
        <motion.div
          key={active.id}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={spring.soft}
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            paddingBottom: 64,
          }}
        >
          {/* Big featured icon */}
          <motion.div
            key={`hero-${active.id}`}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={spring.soft}
            style={{
              filter: `drop-shadow(0 20px 60px ${accent}AA) drop-shadow(0 0 40px ${accent}55)`,
              marginBottom: 24,
            }}
          >
            <GameIcon gameId={active.id} size={220} />
          </motion.div>

          <h2
            style={{
              fontSize: 64,
              fontWeight: 700,
              letterSpacing: "-0.03em",
              lineHeight: 1.05,
              margin: 0,
              marginBottom: 12,
            }}
          >
            {active.name}
          </h2>
          <p
            style={{
              fontSize: 18,
              color: "rgba(255,255,255,0.7)",
              margin: 0,
              maxWidth: 520,
              lineHeight: 1.5,
            }}
          >
            {active.description}
          </p>

          {/* Meta badges */}
          <div
            style={{
              display: "flex",
              gap: 12,
              marginTop: 24,
              flexWrap: "wrap",
              justifyContent: "center",
            }}
          >
            <Badge accent={accent}>{active.players}</Badge>
            <Badge accent={accent}>{active.duration}</Badge>
          </div>

          <motion.button
            whileHover={{ scale: 1.04, y: -2 }}
            whileTap={{ scale: 0.97 }}
            transition={spring.snappy}
            style={{
              marginTop: 36,
              padding: "16px 40px",
              borderRadius: radius.full,
              border: `1px solid ${accent}`,
              background: `linear-gradient(135deg, ${accent}, ${deep})`,
              color: "white",
              fontFamily: "inherit",
              fontSize: 17,
              fontWeight: 600,
              cursor: "pointer",
              boxShadow: `0 12px 36px ${accent}50, 0 0 0 1px ${accent}30`,
              letterSpacing: "-0.01em",
            }}
          >
            Начать игру →
          </motion.button>
        </motion.div>

        {/* Bottom tile strip */}
        <div style={{ paddingTop: 64 }}>
          <p
            style={{
              fontSize: 12,
              color: "rgba(255,255,255,0.4)",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              marginBottom: 16,
              textAlign: "center",
            }}
            className="font-mono"
          >
            Выбери игру
          </p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${games.length}, 1fr)`,
              gap: 16,
              maxWidth: 1100,
              margin: "0 auto",
            }}
          >
            {games.map((game) => (
              <Tile
                key={game.id}
                game={game}
                isActive={game.id === activeGame}
                onClick={() => setActiveGame(game.id)}
              />
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}

// ---------- Tile ----------

function Tile({
  game,
  isActive,
  onClick,
}: {
  game: GameInfo;
  isActive: boolean;
  onClick: () => void;
}) {
  const accent = gameColors[game.id].accent;
  const deep = gameColors[game.id].deep;

  return (
    <motion.button
      onClick={onClick}
      whileHover="hover"
      animate={isActive ? "active" : "rest"}
      initial="rest"
      style={{
        position: "relative",
        cursor: "pointer",
        background: "transparent",
        border: "none",
        padding: 0,
        fontFamily: "inherit",
        color: "inherit",
        marginTop: 32, // space for overflowing icon
      }}
    >
      {/* Halo on hover/active */}
      <motion.div
        variants={{
          rest: { opacity: 0 },
          hover: { opacity: 1 },
          active: { opacity: 0.7 },
        }}
        transition={{ duration: 0.4 }}
        style={{
          position: "absolute",
          inset: -16,
          background: `radial-gradient(circle at center, ${accent}50, transparent 70%)`,
          borderRadius: radius["2xl"],
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      {/* Tile frame */}
      <motion.div
        variants={{
          rest: { y: 0, scale: 1 },
          hover: { y: -6, scale: 1.04 },
          active: { y: -4, scale: 1.02 },
        }}
        transition={spring.soft}
        style={{
          position: "relative",
          aspectRatio: "1",
          borderRadius: radius.xl,
          background: `linear-gradient(135deg, ${deep}66, ${accent}22)`,
          backdropFilter: "blur(16px)",
          border: `1px solid ${isActive ? accent : `${accent}40`}`,
          boxShadow: isActive
            ? `0 16px 48px ${accent}55, 0 0 0 2px ${accent}80`
            : `0 12px 32px rgba(0,0,0,0.35), 0 0 0 1px ${accent}25`,
          overflow: "visible",
          zIndex: 1,
        }}
      >
        {/* Icon — overflows top by 40% */}
        <motion.div
          variants={{
            rest: { y: 0, scale: 1 },
            hover: { y: -8, scale: 1.12 },
            active: { y: -4, scale: 1.06 },
          }}
          transition={spring.soft}
          style={{
            position: "absolute",
            top: "-40%",
            left: "50%",
            transform: "translateX(-50%)",
            width: "82%",
            height: "82%",
            filter: `drop-shadow(0 12px 24px rgba(0,0,0,0.5)) drop-shadow(0 0 16px ${accent}50)`,
            pointerEvents: "none",
          }}
        >
          <GameIcon gameId={game.id} size={140} />
        </motion.div>

        {/* Content */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            padding: "12px 8px",
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: "white",
              letterSpacing: "-0.01em",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {game.name}
          </div>
        </div>
      </motion.div>
    </motion.button>
  );
}

function Badge({
  children,
  accent,
}: {
  children: React.ReactNode;
  accent: string;
}) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "8px 16px",
        borderRadius: radius.full,
        background: `color-mix(in srgb, ${accent} 12%, rgba(255,255,255,0.04))`,
        border: `1px solid color-mix(in srgb, ${accent} 30%, rgba(255,255,255,0.1))`,
        color: "rgba(255,255,255,0.85)",
        fontSize: 14,
        fontWeight: 500,
      }}
    >
      {children}
    </span>
  );
}
