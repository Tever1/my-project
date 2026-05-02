"use client";

/**
 * /lobby-preview — Phase D PS5 + Spotlight hybrid mockup.
 *
 * Layout:
 *   Top bar:  brand + nav (Играть/Друзья/История/Комнаты)
 *             + "Друзей онлайн" + "Создать комнату"|roomCode + Avatar
 *   Hero:     left = giant title + meta + desc + CTA + room-code input
 *             right = tilted preview-card with per-game mock content
 *   Bottom:   tile strip (all 7 games, smaller radii)
 *
 * Icons fall back to <GameIcon> SVG placeholders until PNG files appear in
 * public/icons/games/.
 */

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { GameIcon } from "@/components/GameIcon";
import { gameColors, radius, spring, type GameId } from "@/lib/design/tokens";

interface GameInfo {
  id: GameId;
  name: string;
  /** Two-word title: word + accent. Accent gets gradient. */
  heroTitle: { word: string; accent: string };
  description: string;
  players: string;
  duration: string;
  mode: string;
}

const games: GameInfo[] = [
  {
    id: "mafia",
    name: "Мафия",
    heroTitle: { word: "Ночной", accent: "город" },
    description:
      "Шесть игроков за столом, и кто-то из них точно врёт. Найди мафию раньше, чем она найдёт тебя.",
    players: "6–14 игроков",
    duration: "≈ 20 минут",
    mode: "Роли",
  },
  {
    id: "quiz",
    name: "Квиз",
    heroTitle: { word: "Битва", accent: "эрудитов" },
    description:
      "Сегодня — мозговая разминка для всей компании. Сотни вопросов, четыре варианта, секунды на ответ.",
    players: "2–20 игроков",
    duration: "≈ 15 минут",
    mode: "Команды",
  },
  {
    id: "crocodile",
    name: "Крокодил",
    heroTitle: { word: "Без", accent: "слов" },
    description:
      "Покажи слово жестами, нарисуй на бумаге, изобрази звуком. Главное — никакой речи.",
    players: "4–20 игроков",
    duration: "≈ 15 минут",
    mode: "По очереди",
  },
  {
    id: "spy",
    name: "Шпион",
    heroTitle: { word: "Секретное", accent: "место" },
    description:
      "Все знают локацию, кроме одного. Задавай вопросы и вычисли шпиона до того, как он угадает место.",
    players: "3–10 игроков",
    duration: "≈ 10 минут",
    mode: "Дедукция",
  },
  {
    id: "alias",
    name: "Alias",
    heroTitle: { word: "Объясни", accent: "быстрее" },
    description:
      "Минута, секундомер и стопка слов. Чем больше угадает команда — тем больше очков.",
    players: "4–20 игроков",
    duration: "≈ 20 минут",
    mode: "На скорость",
  },
  {
    id: "who-am-i",
    name: "Кто я?",
    heroTitle: { word: "Угадай", accent: "себя" },
    description:
      "Ты не знаешь кто ты, но друзья знают. Задавай вопросы и собери картинку из ответов.",
    players: "3–12 игроков",
    duration: "≈ 15 минут",
    mode: "Вопросы",
  },
  {
    id: "hundred-to-one",
    name: "100 к 1",
    heroTitle: { word: "Самый", accent: "популярный" },
    description:
      "100 человек уже ответили. Угадай что они сказали — и забери банк команды.",
    players: "4–10 игроков",
    duration: "≈ 30 минут",
    mode: "Шоу",
  },
];

// ============================================================
// Page
// ============================================================

export default function LobbyPreviewPage() {
  const [activeGame, setActiveGame] = useState<GameId>("quiz");
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [joinCode, setJoinCode] = useState("");

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
        display: "flex",
        flexDirection: "column",
        background: "#06060c",
      }}
    >
      {/* Dynamic per-game background */}
      <motion.div
        animate={{
          background: `radial-gradient(1200px 800px at 70% 30%, ${accent}55, transparent 60%), radial-gradient(1000px 700px at 20% 70%, ${deep}66, transparent 60%), #06060c`,
        }}
        transition={{ duration: 0.8, ease: [0.32, 0.72, 0, 1] }}
        style={{ position: "absolute", inset: 0, zIndex: 0, pointerEvents: "none" }}
      />

      {/* Top bar */}
      <TopBar
        roomCode={roomCode}
        onCreateRoom={() => setRoomCode("ABXY7K")}
        accent={accent}
      />

      {/* Hero */}
      <section
        style={{
          position: "relative",
          zIndex: 1,
          flex: 1,
          maxWidth: 1600,
          width: "100%",
          margin: "0 auto",
          padding: "32px 32px",
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 120,
          alignItems: "center",
        }}
      >
        <HeroLeft
          game={active}
          accent={accent}
          deep={deep}
          joinCode={joinCode}
          onJoinCodeChange={setJoinCode}
        />

        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <TiltedPreview gameId={active.id} />
        </div>
      </section>

      {/* Bottom tile strip */}
      <TileStrip
        games={games}
        activeId={activeGame}
        onSelect={setActiveGame}
      />
    </main>
  );
}

// ============================================================
// Top bar
// ============================================================

function TopBar({
  roomCode,
  onCreateRoom,
  accent,
}: {
  roomCode: string | null;
  onCreateRoom: () => void;
  accent: string;
}) {
  return (
    <header
      style={{
        position: "relative",
        zIndex: 5,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "20px 32px",
      }}
    >
      {/* Left: brand + nav */}
      <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
        <BrandMark />
        <nav style={{ display: "flex", gap: 4 }}>
          <NavButton active>Играть</NavButton>
          <NavButton>Друзья</NavButton>
          <NavButton>История</NavButton>
        </nav>
      </div>

      {/* Right: friends online + room button + avatar */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <FriendsOnlinePill count={4} />
        <RoomButton roomCode={roomCode} onCreate={onCreateRoom} accent={accent} />
        <AvatarPill name="Аня" />
      </div>
    </header>
  );
}

function BrandMark() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <div
        style={{
          width: 38,
          height: 38,
          borderRadius: 11,
          background:
            "linear-gradient(135deg, #ff3b6b 0%, #ffd60a 45%, #0a84ff 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: 900,
          fontSize: 19,
          color: "#0a0a14",
          boxShadow: "0 4px 16px -2px rgba(255, 59, 107, 0.5)",
        }}
      >
        P
      </div>
      <div
        style={{
          fontWeight: 700,
          fontSize: 17,
          letterSpacing: "-0.02em",
        }}
      >
        Party Hub
      </div>
    </div>
  );
}

function NavButton({
  children,
  active = false,
}: {
  children: React.ReactNode;
  active?: boolean;
}) {
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.97 }}
      transition={spring.snappy}
      style={{
        padding: "10px 20px",
        borderRadius: radius.full,
        background: active ? "rgba(255, 255, 255, 0.1)" : "transparent",
        border: active ? "1px solid rgba(255, 255, 255, 0.12)" : "1px solid transparent",
        color: active ? "white" : "rgba(255, 255, 255, 0.55)",
        fontFamily: "inherit",
        fontSize: 15,
        fontWeight: 600,
        cursor: "pointer",
        letterSpacing: "-0.01em",
      }}
    >
      {children}
    </motion.button>
  );
}

function FriendsOnlinePill({ count }: { count: number }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "8px 16px",
        borderRadius: radius.full,
        background: "rgba(255, 255, 255, 0.04)",
        border: "1px solid rgba(255, 255, 255, 0.08)",
        fontSize: 14,
        color: "rgba(255, 255, 255, 0.85)",
        fontWeight: 500,
      }}
    >
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: "#30d158",
          boxShadow: "0 0 10px rgba(48, 209, 88, 0.7)",
        }}
      />
      {count} друзей онлайн
    </div>
  );
}

function RoomButton({
  roomCode,
  onCreate,
  accent,
}: {
  roomCode: string | null;
  onCreate: () => void;
  accent: string;
}) {
  return (
    <motion.button
      onClick={() => !roomCode && onCreate()}
      whileHover={{ scale: 1.03, y: -1 }}
      whileTap={{ scale: 0.97 }}
      transition={spring.snappy}
      style={{
        padding: "8px 18px",
        borderRadius: radius.full,
        background: roomCode
          ? `linear-gradient(135deg, ${accent}, ${accent}CC)`
          : "rgba(255, 255, 255, 0.04)",
        border: roomCode
          ? `1px solid ${accent}`
          : "1px solid rgba(255, 255, 255, 0.12)",
        color: roomCode ? "white" : "rgba(255, 255, 255, 0.85)",
        fontFamily: roomCode ? "var(--font-mono)" : "inherit",
        fontSize: roomCode ? 13 : 14,
        fontWeight: roomCode ? 700 : 600,
        letterSpacing: roomCode ? "0.12em" : "-0.01em",
        cursor: "pointer",
        boxShadow: roomCode ? `0 6px 20px -4px ${accent}80` : "none",
        textTransform: roomCode ? "uppercase" : undefined,
      }}
    >
      {roomCode ? `Комната · ${roomCode}` : "Создать комнату"}
    </motion.button>
  );
}

function AvatarPill({ name }: { name: string }) {
  const initial = name.charAt(0);
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "5px 16px 5px 5px",
        borderRadius: radius.full,
        background: "rgba(255, 255, 255, 0.04)",
        border: "1px solid rgba(255, 255, 255, 0.08)",
      }}
    >
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: "50%",
          background: "linear-gradient(135deg, #ff9f0a, #ff375f)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 14,
          fontWeight: 700,
          color: "white",
        }}
      >
        {initial}
      </div>
      <span style={{ fontSize: 14, fontWeight: 600 }}>{name}</span>
    </div>
  );
}

// ============================================================
// Hero left (title + meta + desc + CTA)
// ============================================================

function HeroLeft({
  game,
  accent,
  deep,
  joinCode,
  onJoinCodeChange,
}: {
  game: GameInfo;
  accent: string;
  deep: string;
  joinCode: string;
  onJoinCodeChange: (v: string) => void;
}) {
  return (
    <div style={{ position: "relative" }}>
      {/* Title — animates between games */}
      <AnimatePresence mode="wait">
        <motion.h1
          key={game.id}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={spring.soft}
          style={{
            fontWeight: 900,
            fontSize: "clamp(56px, 8.5vw, 116px)",
            lineHeight: 0.9,
            letterSpacing: "-0.045em",
            margin: 0,
            marginBottom: 24,
          }}
        >
          <span
            style={{
              display: "block",
              backgroundImage:
                "linear-gradient(180deg, #ffffff 0%, rgba(255,255,255,0.7) 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            {game.heroTitle.word}
          </span>
          <span
            style={{
              display: "block",
              backgroundImage: `linear-gradient(90deg, ${accent} 0%, color-mix(in srgb, ${accent} 60%, white) 50%, ${deep} 100%)`,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            {game.heroTitle.accent}
          </span>
        </motion.h1>
      </AnimatePresence>

      {/* Meta pills */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`meta-${game.id}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 20,
            marginBottom: 28,
            flexWrap: "wrap",
            fontFamily: "var(--font-mono)",
          }}
        >
          <MetaPill icon={<PersonIcon />}>{game.players}</MetaPill>
          <Dot />
          <MetaPill icon={<ClockIcon />}>{game.duration}</MetaPill>
          <Dot />
          <MetaPill icon={<TeamsIcon />}>{game.mode}</MetaPill>
        </motion.div>
      </AnimatePresence>

      {/* Description */}
      <AnimatePresence mode="wait">
        <motion.p
          key={`desc-${game.id}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          style={{
            fontSize: 18,
            lineHeight: 1.55,
            color: "rgba(235, 235, 245, 0.72)",
            maxWidth: 520,
            margin: "0 0 32px",
          }}
        >
          {game.description}
        </motion.p>
      </AnimatePresence>

      {/* CTA row */}
      <div
        style={{
          display: "flex",
          gap: 24,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <motion.button
          whileHover={{ scale: 1.03, y: -2 }}
          whileTap={{ scale: 0.97 }}
          transition={spring.snappy}
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            height: 60,
            padding: "0 32px",
            fontSize: 17,
            fontWeight: 700,
            borderRadius: radius.md,
            background: `linear-gradient(180deg, ${accent}, ${deep})`,
            color: "white",
            border: `1px solid color-mix(in srgb, ${accent} 60%, white)`,
            boxShadow: `0 12px 32px -8px ${accent}99, inset 0 1px 0 rgba(255,255,255,0.35)`,
            cursor: "pointer",
            letterSpacing: "-0.01em",
            fontFamily: "inherit",
          }}
        >
          <PlayIcon />
          Начать партию
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          transition={spring.snappy}
          style={{
            height: 60,
            padding: "0 26px",
            fontSize: 16,
            fontWeight: 600,
            borderRadius: radius.md,
            background: "rgba(255, 255, 255, 0.06)",
            color: "rgba(255, 255, 255, 0.9)",
            border: "1px solid rgba(255, 255, 255, 0.14)",
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          Правила
        </motion.button>

        {/* Join code input */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 12,
            height: 60,
            padding: "0 18px",
            borderRadius: radius.md,
            background: "rgba(0, 0, 0, 0.32)",
            border: "1px dashed rgba(255, 255, 255, 0.22)",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <span
              style={{
                fontSize: 10,
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                color: "rgba(235, 235, 245, 0.45)",
                fontWeight: 700,
                fontFamily: "var(--font-mono)",
              }}
            >
              Код комнаты
            </span>
            <input
              value={joinCode}
              onChange={(e) =>
                onJoinCodeChange(e.target.value.toUpperCase().slice(0, 6))
              }
              placeholder="ABXY7K"
              maxLength={6}
              style={{
                background: "transparent",
                border: "none",
                outline: "none",
                color: "white",
                fontFamily: "var(--font-mono)",
                fontWeight: 700,
                fontSize: 17,
                letterSpacing: "0.3em",
                width: 130,
                padding: 0,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Tilted preview (right column) — per-game mock content
// ============================================================

function TiltedPreview({ gameId }: { gameId: GameId }) {
  const accent = gameColors[gameId].accent;
  const deep = gameColors[gameId].deep;

  return (
    <div
      style={{
        position: "relative",
        aspectRatio: "1 / 1.05",
        maxWidth: 460,
        width: "100%",
      }}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={gameId}
          initial={{ opacity: 0, rotate: -8, scale: 0.92 }}
          animate={{ opacity: 1, rotate: -2, scale: 1 }}
          exit={{ opacity: 0, rotate: -8, scale: 0.95 }}
          transition={spring.soft}
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: 28,
            overflow: "hidden",
            background: `linear-gradient(155deg, ${accent} 0%, color-mix(in srgb, ${accent} 60%, white) 50%, ${deep} 100%)`,
            boxShadow: `0 40px 100px -20px ${accent}88, 0 24px 60px -12px ${deep}88, inset 0 1px 0 rgba(255,255,255,0.3)`,
          }}
        >
          {/* Top-light highlight */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "radial-gradient(120% 80% at 20% 0%, rgba(255,255,255,0.4), transparent 55%)",
              pointerEvents: "none",
            }}
          />

          {/* Big icon background watermark */}
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -55%)",
              opacity: 0.85,
              filter: "drop-shadow(0 16px 40px rgba(0,0,0,0.4))",
              pointerEvents: "none",
            }}
          >
            <GameIcon gameId={gameId} size={240} />
          </div>

          {/* Mock content */}
          <PreviewMock gameId={gameId} />
        </motion.div>
      </AnimatePresence>

      {/* Floating badges (animated) */}
      <FloatingBadge
        position={{ top: "5%", right: "-6%" }}
        animation="float1"
        icon={<span style={{ color: "#30d158" }}>●</span>}
        bg="rgba(48,209,88,0.2)"
        title="8 онлайн"
        subtitle="сейчас в игре"
      />
      <FloatingBadge
        position={{ bottom: "12%", left: "-8%" }}
        animation="float2"
        icon={<span style={{ color: "#ffd60a" }}>★</span>}
        bg="rgba(255,214,10,0.2)"
        title="2 480"
        subtitle="лучший рекорд"
      />
    </div>
  );
}

function PreviewMock({ gameId }: { gameId: GameId }) {
  switch (gameId) {
    case "quiz":
      return (
        <>
          <PreviewQuestion
            label="Вопрос 4 из 10"
            text="Какая планета самая горячая в Солнечной системе?"
          />
          <PreviewTimer value="12" />
          <PreviewAnswers
            answers={[
              { letter: "A", text: "Меркурий" },
              { letter: "B", text: "Венера", correct: true },
              { letter: "C", text: "Марс" },
              { letter: "D", text: "Юпитер" },
            ]}
          />
        </>
      );
    case "mafia":
      return (
        <>
          <PreviewQuestion label="Ночь · ход 3" text="Город засыпает. Просыпается мафия." />
          <PreviewBigText text="ДОКТОР" subtitle="Твоя роль" />
          <PreviewBottomChips chips={["Аня", "Боря", "Вера", "+3"]} />
        </>
      );
    case "crocodile":
      return (
        <>
          <PreviewQuestion label="Покажи без слов" text="Подбери жесты — никаких звуков" />
          <PreviewBigText text="САМОЛЁТ" subtitle="Твоё слово" />
          <PreviewTimer value="0:24" />
          <PreviewAnswers
            answers={[
              { letter: "✓", text: "Угадали", correct: true },
              { letter: "→", text: "Пропустить" },
            ]}
            cols={2}
          />
        </>
      );
    case "spy":
      return (
        <>
          <PreviewQuestion label="Локация" text="Это связано с водой?" />
          <PreviewBigText text="ПЛЯЖ" subtitle="Знают все, кроме шпиона" />
          <PreviewBottomChips chips={["Самолёт", "Банк", "Пляж", "Школа", "+4"]} />
        </>
      );
    case "alias":
      return (
        <>
          <PreviewQuestion label="Команда А · 0:42" text="Объясни не используя однокоренные" />
          <PreviewBigText text="ВЕЛОСИПЕД" subtitle="+5 угадали · 1 пропущено" />
          <PreviewAnswers
            answers={[
              { letter: "+", text: "Угадали", correct: true },
              { letter: "→", text: "Пропустить" },
            ]}
            cols={2}
          />
        </>
      );
    case "who-am-i":
      return (
        <>
          <PreviewQuestion label="Твой ход" text="Задавай вопросы которые отвечают да или нет" />
          <PreviewBigText text="?" subtitle="На лбу у тебя — кто-то" />
          <PreviewBottomChips chips={["Я живой?", "Я известный?", "Я мужчина?"]} />
        </>
      );
    case "hundred-to-one":
      return (
        <>
          <PreviewQuestion
            label="Вопрос команде Орлы"
            text="Что человек делает по утрам?"
          />
          <PreviewTimer value="БАНК · 25" />
          <PreviewAnswers
            answers={[
              { letter: "1", text: "Завтракает", correct: true },
              { letter: "2", text: "Чистит зубы", correct: true },
              { letter: "3", text: "···" },
              { letter: "4", text: "···" },
            ]}
          />
        </>
      );
    default:
      return null;
  }
}

// ---------- Preview building blocks ----------

function PreviewQuestion({ label, text }: { label: string; text: string }) {
  return (
    <div
      style={{
        position: "absolute",
        left: "8%",
        right: "8%",
        top: "10%",
        padding: "14px 18px",
        borderRadius: 18,
        background: "rgba(0, 0, 0, 0.32)",
        border: "1px solid rgba(255, 255, 255, 0.2)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        zIndex: 2,
      }}
    >
      <div
        style={{
          fontSize: 10,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: "rgba(255, 255, 255, 0.55)",
          fontWeight: 700,
          marginBottom: 6,
          fontFamily: "var(--font-mono)",
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 16, fontWeight: 700, color: "white", lineHeight: 1.3 }}>
        {text}
      </div>
    </div>
  );
}

function PreviewTimer({ value }: { value: string }) {
  const isBig = value.length > 2;
  return (
    <div
      style={{
        position: "absolute",
        top: "11%",
        right: "8%",
        height: 52,
        padding: isBig ? "0 14px" : "0",
        minWidth: 52,
        borderRadius: isBig ? 14 : "50%",
        background: "rgba(0, 0, 0, 0.5)",
        border: "1px solid rgba(255, 255, 255, 0.25)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: 800,
        fontSize: isBig ? 13 : 22,
        color: "#ffd60a",
        fontFamily: "var(--font-mono)",
        zIndex: 3,
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        letterSpacing: isBig ? "0.05em" : "0",
      }}
    >
      {value}
    </div>
  );
}

function PreviewBigText({ text, subtitle }: { text: string; subtitle: string }) {
  return (
    <div
      style={{
        position: "absolute",
        left: "8%",
        right: "8%",
        top: "44%",
        textAlign: "center",
        zIndex: 2,
      }}
    >
      <div
        style={{
          fontSize: 36,
          fontWeight: 900,
          letterSpacing: "-0.02em",
          color: "white",
          textShadow: "0 4px 20px rgba(0,0,0,0.5)",
          marginBottom: 4,
        }}
      >
        {text}
      </div>
      <div
        style={{
          fontSize: 11,
          color: "rgba(255, 255, 255, 0.7)",
          fontFamily: "var(--font-mono)",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          fontWeight: 600,
        }}
      >
        {subtitle}
      </div>
    </div>
  );
}

function PreviewAnswers({
  answers,
  cols = 2,
}: {
  answers: { letter: string; text: string; correct?: boolean }[];
  cols?: number;
}) {
  return (
    <div
      style={{
        position: "absolute",
        left: "8%",
        right: "8%",
        bottom: "8%",
        display: "grid",
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gap: 8,
        zIndex: 2,
      }}
    >
      {answers.map((a, i) => (
        <div
          key={i}
          style={{
            padding: "10px 12px",
            borderRadius: 12,
            background: a.correct
              ? "rgba(48, 209, 88, 0.32)"
              : "rgba(0, 0, 0, 0.32)",
            border: `1px solid ${a.correct ? "rgba(48, 209, 88, 0.6)" : "rgba(255, 255, 255, 0.22)"}`,
            boxShadow: a.correct ? "0 4px 16px rgba(48, 209, 88, 0.3)" : undefined,
            fontSize: 12,
            fontWeight: 600,
            color: "white",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span
            style={{
              width: 20,
              height: 20,
              borderRadius: 5,
              background: a.correct ? "rgba(48, 209, 88, 0.55)" : "rgba(255, 255, 255, 0.18)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 10,
              fontWeight: 800,
              fontFamily: "var(--font-mono)",
            }}
          >
            {a.letter}
          </span>
          {a.text}
        </div>
      ))}
    </div>
  );
}

function PreviewBottomChips({ chips }: { chips: string[] }) {
  return (
    <div
      style={{
        position: "absolute",
        left: "8%",
        right: "8%",
        bottom: "8%",
        display: "flex",
        flexWrap: "wrap",
        gap: 6,
        zIndex: 2,
      }}
    >
      {chips.map((c, i) => (
        <span
          key={i}
          style={{
            padding: "6px 12px",
            borderRadius: 999,
            background: "rgba(0, 0, 0, 0.32)",
            border: "1px solid rgba(255, 255, 255, 0.22)",
            fontSize: 12,
            fontWeight: 600,
            color: "white",
          }}
        >
          {c}
        </span>
      ))}
    </div>
  );
}

function FloatingBadge({
  position,
  animation,
  icon,
  bg,
  title,
  subtitle,
}: {
  position: React.CSSProperties;
  animation: "float1" | "float2";
  icon: React.ReactNode;
  bg: string;
  title: string;
  subtitle: string;
}) {
  const isFloat1 = animation === "float1";
  return (
    <motion.div
      animate={{
        y: isFloat1 ? [0, -12, 0] : [0, -10, 0],
        rotate: isFloat1 ? [2, 2, 2] : [-3, -3, -3],
      }}
      transition={{
        duration: isFloat1 ? 5 : 6,
        repeat: Infinity,
        ease: "easeInOut",
      }}
      style={{
        position: "absolute",
        ...position,
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 14px",
        borderRadius: 14,
        background: "rgba(20, 20, 32, 0.92)",
        border: "1px solid rgba(255, 255, 255, 0.18)",
        boxShadow: "0 16px 40px -10px rgba(0, 0, 0, 0.6)",
        zIndex: 5,
      }}
    >
      <div
        style={{
          width: 30,
          height: 30,
          borderRadius: 9,
          background: bg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 16,
        }}
      >
        {icon}
      </div>
      <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.1 }}>
        <span style={{ fontWeight: 800, fontSize: 14 }}>{title}</span>
        <span
          style={{
            fontSize: 10,
            color: "rgba(235, 235, 245, 0.5)",
            fontWeight: 500,
            fontFamily: "var(--font-mono)",
          }}
        >
          {subtitle}
        </span>
      </div>
    </motion.div>
  );
}

// ============================================================
// Bottom tile strip (smaller radii)
// ============================================================

function TileStrip({
  games,
  activeId,
  onSelect,
}: {
  games: GameInfo[];
  activeId: GameId;
  onSelect: (id: GameId) => void;
}) {
  return (
    <div style={{ position: "relative", zIndex: 1, paddingBottom: 32 }}>
      <p
        style={{
          fontSize: 11,
          color: "rgba(255, 255, 255, 0.4)",
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          marginBottom: 12,
          textAlign: "center",
          fontFamily: "var(--font-mono)",
          fontWeight: 700,
        }}
      >
        Все игры
      </p>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${games.length}, 1fr)`,
          gap: 28,
          maxWidth: 1280,
          margin: "0 auto",
          padding: "0 48px",
        }}
      >
        {games.map((game) => (
          <Tile
            key={game.id}
            game={game}
            isActive={game.id === activeId}
            onClick={() => onSelect(game.id)}
          />
        ))}
      </div>
    </div>
  );
}

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
      }}
    >
      <motion.div
        variants={{
          rest: { opacity: 0 },
          hover: { opacity: 1 },
          active: { opacity: 0.6 },
        }}
        transition={{ duration: 0.4 }}
        style={{
          position: "absolute",
          inset: -12,
          background: `radial-gradient(circle at center, ${accent}50, transparent 70%)`,
          borderRadius: radius.xl,
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      <motion.div
        variants={{
          rest: { y: 0, scale: 1 },
          hover: { y: -5, scale: 1.04 },
          active: { y: -3, scale: 1.02 },
        }}
        transition={spring.soft}
        style={{
          position: "relative",
          aspectRatio: "1",
          borderRadius: radius.md,
          background: `linear-gradient(135deg, ${deep}66, ${accent}22)`,
          backdropFilter: "blur(16px)",
          border: `1px solid ${isActive ? accent : `${accent}40`}`,
          boxShadow: isActive
            ? `0 12px 36px ${accent}55, 0 0 0 2px ${accent}80`
            : `0 10px 24px rgba(0,0,0,0.35), 0 0 0 1px ${accent}25`,
          overflow: "hidden",
          zIndex: 1,
        }}
      >
        {/* Icon fills the entire tile */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
          }}
        >
          <GameIcon
            gameId={game.id}
            style={{ width: "100%", height: "100%" }}
          />
        </div>

        {/* Bottom label with dark gradient mask for readability */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            padding: "18px 8px 10px",
            textAlign: "center",
            background:
              "linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.5) 50%, transparent 100%)",
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "white",
              letterSpacing: "-0.01em",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              textShadow: "0 1px 4px rgba(0,0,0,0.6)",
            }}
          >
            {game.name}
          </div>
        </div>
      </motion.div>
    </motion.button>
  );
}

// ============================================================
// SVG icons (inline)
// ============================================================

function PersonIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
      <path d="M8 8a3 3 0 100-6 3 3 0 000 6zM2 14a6 6 0 1112 0H2z" />
    </svg>
  );
}
function ClockIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
      <path d="M8 1.5A6.5 6.5 0 1014.5 8 6.5 6.5 0 008 1.5zm.5 6.79l3.5 2.02-.5.86L7.5 8.5V4h1z" />
    </svg>
  );
}
function TeamsIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
      <path d="M3 1h10v3H3V1zm-1 4h12v10H2V5zm3 2v6h6V7H5z" />
    </svg>
  );
}
function PlayIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
      <path d="M6 4.5v11l10-5.5L6 4.5z" />
    </svg>
  );
}

function MetaPill({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        fontSize: 13,
        fontWeight: 600,
        color: "rgba(235, 235, 245, 0.8)",
      }}
    >
      <span style={{ opacity: 0.65, display: "inline-flex" }}>{icon}</span>
      {children}
    </span>
  );
}

function Dot() {
  return (
    <span
      style={{
        width: 4,
        height: 4,
        borderRadius: "50%",
        background: "rgba(255, 255, 255, 0.25)",
      }}
    />
  );
}
