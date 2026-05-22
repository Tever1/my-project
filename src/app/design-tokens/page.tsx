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
import { toast } from "sonner";
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
import {
  GlassPanel,
  GlassSheet,
  GlassToaster,
  type GlassVariant,
} from "@/components/glass";
import { GameIcon } from "@/components/GameIcon";
import { Badge } from "@/components/ui/Badge";
import { Chip } from "@/components/ui/Chip";
import { PlayerAvatar } from "@/components/ui/PlayerAvatar";
import { Skeleton } from "@/components/ui/Skeleton";

const games: { id: GameId; ru: string }[] = [
  { id: "quiz", ru: "Квиз" },
  { id: "mafia", ru: "Мафия" },
  { id: "crocodile", ru: "Крокодил" },
  { id: "spy", ru: "Шпион" },
  { id: "alias", ru: "Угадай слово" },
  { id: "who-am-i", ru: "Кто я?" },
  { id: "hundred-to-one", ru: "100 к 1" },
];

const springEntries: { name: keyof typeof spring; label: string }[] = [
  { name: "soft", label: "мягкий (200/30) — премиум по умолчанию" },
  { name: "medium", label: "средний (280/28) — отзывчивый" },
  { name: "snappy", label: "быстрый (400/30) — кнопки" },
  { name: "bouncy", label: "пружинистый (350/18) — с отскоком" },
  { name: "stiff", label: "жёсткий (500/35) — мгновенный" },
];

const QUIZ_ACCENT = "#facc15";
const QUIZ_ANSWERS = ["Юпитер", "Сатурн", "Нептун", "Марс"];
const QUIZ_OPTION_LABELS = ["A", "B", "C", "D"];
const OPTION_COLORS_A = [
  "from-blue-600/60 to-blue-500/40 border-blue-400/60",
  "from-emerald-600/60 to-emerald-500/40 border-emerald-400/60",
  "from-amber-600/60 to-amber-500/40 border-amber-400/60",
  "from-pink-600/60 to-pink-500/40 border-pink-400/60",
];

export default function DesignTokensPage() {
  // Force-dark for this page
  useEffect(() => {
    document.documentElement.classList.add("dark");
    return () => document.documentElement.classList.remove("dark");
  }, []);

  const [popKey, setPopKey] = useState(0);
  const [activeGame, setActiveGame] = useState<GameId>("mafia");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sideSheetOpen, setSideSheetOpen] = useState(false);
  const [quizShowCorrect, setQuizShowCorrect] = useState(false);
  const [quizSelectedAnswer, setQuizSelectedAnswer] = useState<number | null>(1);
  const [countVal, setCountVal] = useState(3);
  const [isCountRunning, setIsCountRunning] = useState(false);
  const [revealState, setRevealState] = useState<"idle" | "correct" | "wrong">("idle");
  const [answeredCount, setAnsweredCount] = useState(0);

  useEffect(() => {
    if (!isCountRunning) return;

    const interval = window.setInterval(() => {
      setCountVal((value) => {
        if (value <= 1) {
          window.clearInterval(interval);
          setIsCountRunning(false);
          return 0;
        }
        return value - 1;
      });
    }, 800);

    return () => window.clearInterval(interval);
  }, [isCountRunning]);

  function startQuizCountdown() {
    setCountVal(3);
    setIsCountRunning(true);
  }

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
            Фаза A — Фундамент
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
            Превью дизайн-токенов
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
        <Section title="Типографика — Geist" subtitle="Sans для интерфейса, Mono для цифр">
          <GlassPanel>
            <div style={{ fontSize: 72, fontWeight: 700, letterSpacing: "-0.04em", lineHeight: 1 }}>
              Aa Bb 123
            </div>
            <div style={{ marginTop: 24, display: "grid", gap: 12 }}>
              <Row label="Заголовок 56">
                <span style={{ fontSize: 56, fontWeight: 700, letterSpacing: "-0.03em" }}>
                  Party Games Hub
                </span>
              </Row>
              <Row label="Подзаголовок 32">
                <span style={{ fontSize: 32, fontWeight: 600, letterSpacing: "-0.02em" }}>
                  Выбери игру
                </span>
              </Row>
              <Row label="Текст 16">
                <span style={{ fontSize: 16, color: "rgba(240, 238, 246, 0.85)" }}>
                  4 игрока готовы — нажми, чтобы начать
                </span>
              </Row>
              <Row label="Моно">
                <span className="font-mono" style={{ fontSize: 32, color: "#c084fc" }}>
                  03:24 · 1 250 очк
                </span>
              </Row>
            </div>
          </GlassPanel>
        </Section>

        {/* Per-game palette */}
        <Section
          title="Палитра по играм"
          subtitle="Каждая игра — свой акцент. Кликни, чтобы выбрать активную игру"
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
        <Section title="Шкала скруглений" subtitle="Щедрые радиусы в стиле iOS 26">
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
          title="Пружинная физика"
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
        <Section title="Motion-варианты" subtitle="Готовые паттерны для импорта">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
            {[
              { variant: scaleIn, label: "scaleIn", desc: "Модальные окна, появление в фокусе" },
              { variant: pop, label: "pop", desc: "Изменение очков, празднование" },
              { variant: fadeInUp, label: "fadeInUp", desc: "Списки, карточки (по умолчанию)" },
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
            ↻ Повторить анимации
          </button>
        </Section>

        {/* Durations & Easings reference */}
        <Section title="Длительности и easings" subtitle="Справочная таблица">
          <GlassPanel>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 }}>
              <div>
                <h4 style={{ margin: 0, marginBottom: 12, fontSize: 14, color: "#c084fc" }}>
                  Длительности
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

        {/* ============================================================
            Phase B — Liquid Glass system
            ============================================================ */}
        <div
          style={{
            marginTop: 96,
            paddingTop: 48,
            borderTop: "1px solid rgba(255,255,255,0.08)",
          }}
        >
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
            Фаза B — Жидкое стекло
          </p>
          <h2
            style={{
              fontSize: 40,
              fontWeight: 700,
              letterSpacing: "-0.03em",
              margin: 0,
              marginBottom: 8,
            }}
          >
            Стеклянные поверхности и компоненты
          </h2>
          <p
            style={{
              fontSize: 16,
              color: "rgba(240, 238, 246, 0.6)",
              marginTop: 0,
              marginBottom: 40,
            }}
          >
            Переиспользуемые строительные блоки: панели, шторки, уведомления.
            Собраны на токенах из Фазы A.
          </p>
        </div>

        {/* GlassPanel variants */}
        <Section
          title="<GlassPanel> — варианты"
          subtitle="Один компонент, 5 вариантов. Наведи курсор, чтобы увидеть отклик"
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: 16,
            }}
          >
            {(["subtle", "card", "floating", "hero", "elevated"] as GlassVariant[]).map(
              (v) => (
                <GlassPanel
                  key={v}
                  variant={v}
                  radius="lg"
                  interactive
                  accentColor={gameColors[activeGame].accent}
                  padding={20}
                >
                  <div
                    className="font-mono"
                    style={{
                      fontSize: 12,
                      color: gameColors[activeGame].accent,
                      fontWeight: 600,
                      letterSpacing: "0.05em",
                      textTransform: "uppercase",
                    }}
                  >
                    {v}
                  </div>
                  <div
                    style={{
                      fontSize: 14,
                      color: "rgba(255,255,255,0.7)",
                      marginTop: 6,
                      lineHeight: 1.4,
                    }}
                  >
                    {v === "subtle" && "Тихий фон, слабое размытие"}
                    {v === "card" && "Стандартная контентная панель"}
                    {v === "floating" && "Поповеры, выпадающие меню"}
                    {v === "hero" && "Главные панели, глубокая тень"}
                    {v === "elevated" && "Модальные окна, верхний слой"}
                  </div>
                </GlassPanel>
              ),
            )}
          </div>
          <p
            style={{
              fontSize: 12,
              color: "rgba(255,255,255,0.4)",
              marginTop: 12,
              fontStyle: "italic",
            }}
          >
            Подсказка: бордеры подсвечиваются цветом активной игры — попробуй
            переключить игру в палитре выше.
          </p>
        </Section>

        {/* GlassSheet demos */}
        <Section
          title="<GlassSheet> — шторка с drag-to-dismiss"
          subtitle="На базе vaul. Нижняя шторка (iOS-стиль) + боковая шторка"
        >
          <GlassPanel variant="card" padding={24}>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <DemoButton
                onClick={() => setSheetOpen(true)}
                accent={gameColors[activeGame].accent}
              >
                Открыть нижнюю шторку
              </DemoButton>
              <DemoButton
                onClick={() => setSideSheetOpen(true)}
                accent={gameColors[activeGame].accent}
              >
                Открыть боковую шторку →
              </DemoButton>
            </div>
            <p
              style={{
                fontSize: 13,
                color: "rgba(255,255,255,0.45)",
                marginTop: 16,
                lineHeight: 1.5,
              }}
            >
              Нижняя шторка: потяни вниз или кликни вне, чтобы закрыть.
              Боковая шторка: свайп вправо или клик вне.
            </p>
          </GlassPanel>
        </Section>

        {/* Toast demos */}
        <Section
          title="<GlassToaster> — sonner со стеклянной стилизацией"
          subtitle="Тост-уведомления. Подключи один раз, вызывай откуда угодно"
        >
          <GlassPanel variant="card" padding={24}>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <DemoButton
                accent={gameColors[activeGame].accent}
                onClick={() => toast("Игрок присоединился к комнате")}
              >
                Обычное
              </DemoButton>
              <DemoButton
                accent="#22c55e"
                onClick={() => toast.success("Победа! +250 очков")}
              >
                Успех
              </DemoButton>
              <DemoButton
                accent="#ef4444"
                onClick={() => toast.error("Соединение потеряно")}
              >
                Ошибка
              </DemoButton>
              <DemoButton
                accent={gameColors[activeGame].accent}
                onClick={() =>
                  toast("Твой ход!", {
                    description: "30 секунд на размышления",
                    duration: 5000,
                  })
                }
              >
                С описанием
              </DemoButton>
            </div>
          </GlassPanel>
        </Section>

        <Section
          title="Тайл игры — варианты"
          subtitle="Сравнение: с рамкой (как в лобби) и без рамки (только иконка + подпись)"
        >
          <h3
            style={{
              fontSize: 16,
              fontWeight: 600,
              color: "rgba(255,255,255,0.8)",
              margin: "0 0 12px",
            }}
          >
            Вариант A — с рамкой (текущий)
          </h3>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
              gap: 16,
              marginBottom: 32,
            }}
          >
            {games.map((g) => (
              <TileFramed key={g.id} gameId={g.id} label={g.ru} />
            ))}
          </div>

          <h3
            style={{
              fontSize: 16,
              fontWeight: 600,
              color: "rgba(255,255,255,0.8)",
              margin: "0 0 12px",
            }}
          >
            Вариант B — без рамки
          </h3>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
              gap: 16,
            }}
          >
            {games.map((g) => (
              <TileNaked key={g.id} gameId={g.id} label={g.ru} />
            ))}
          </div>
        </Section>

        {/* Phase E — New UI Components */}
        <section style={{ marginBottom: 48 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 24, color: "rgba(255,255,255,0.9)" }}>
            Фаза E — UI Компоненты
          </h2>

          {/* PlayerAvatar */}
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.08em" }}>PlayerAvatar</h3>
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 32 }}>
            <PlayerAvatar nickname="Аня" size="xs" />
            <PlayerAvatar nickname="Боря" size="sm" />
            <PlayerAvatar nickname="Вера" size="md" />
            <PlayerAvatar nickname="Гена" size="lg" />
            <PlayerAvatar nickname="Дима" size="lg" />
            <PlayerAvatar nickname="Женя" size="lg" />
          </div>

          {/* Badge */}
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Badge</h3>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 32 }}>
            <Badge>По умолчанию</Badge>
            <Badge variant="success">Хост</Badge>
            <Badge variant="warning">8 онлайн</Badge>
            <Badge variant="danger">Выбыл</Badge>
            <Badge variant="game" gameColor="#8b5cf6">Мафия</Badge>
            <Badge variant="game" gameColor="#facc15">Квиз</Badge>
            <Badge variant="game" gameColor="#ef4444">Крокодил</Badge>
          </div>

          {/* Chip */}
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Chip</h3>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 32 }}>
            <Chip>Обычный</Chip>
            <Chip selected>Выбран</Chip>
            <Chip onRemove={() => {}}>С крестиком</Chip>
            <Chip disabled>Disabled</Chip>
          </div>

          {/* Skeleton */}
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Skeleton</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 320 }}>
            <Skeleton height={16} borderRadius={4} />
            <Skeleton height={16} width="60%" borderRadius={4} />
            <Skeleton height={40} borderRadius={8} />
            <div style={{ display: "flex", gap: 10 }}>
              <Skeleton width={40} height={40} borderRadius="50%" />
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8, justifyContent: "center" }}>
                <Skeleton height={12} width="70%" borderRadius={4} />
                <Skeleton height={12} width="40%" borderRadius={4} />
              </div>
            </div>
          </div>
        </section>

        <Section title="Quiz Design Variants" subtitle="Выбор дизайна для компонентов квиза">
          <QuizSubsection title="Кнопки ответов">
            <div style={{ marginBottom: 16, display: "flex", justifyContent: "center", gap: 12, flexWrap: "wrap" }}>
              <DemoButton
                accent={QUIZ_ACCENT}
                onClick={() => {
                  setQuizShowCorrect((value) => !value);
                  setQuizSelectedAnswer((value) => value ?? 1);
                }}
              >
                {quizShowCorrect ? "Сбросить" : "Показать правильный"}
              </DemoButton>
              <DemoButton accent={QUIZ_ACCENT} onClick={() => setQuizSelectedAnswer(null)}>
                Очистить выбор
              </DemoButton>
            </div>
            <QuizVariantGrid>
              <QuizVariantCard label="ВАРИАНТ A">
                <QuizQuestionPreview />
                <AnswerVariantA
                  selectedAnswer={quizSelectedAnswer}
                  showCorrect={quizShowCorrect}
                  onSelect={setQuizSelectedAnswer}
                />
              </QuizVariantCard>
              <QuizVariantCard label="ВАРИАНТ B">
                <QuizQuestionPreview />
                <AnswerVariantB
                  selectedAnswer={quizSelectedAnswer}
                  showCorrect={quizShowCorrect}
                  onSelect={setQuizSelectedAnswer}
                />
              </QuizVariantCard>
              <QuizVariantCard label="ВАРИАНТ C">
                <QuizQuestionPreview />
                <AnswerVariantC
                  selectedAnswer={quizSelectedAnswer}
                  showCorrect={quizShowCorrect}
                  onSelect={setQuizSelectedAnswer}
                />
              </QuizVariantCard>
            </QuizVariantGrid>
          </QuizSubsection>

          <QuizSubsection title="Отсчёт 3-2-1">
            <div style={{ marginBottom: 16, display: "flex", justifyContent: "center" }}>
              <DemoButton accent={QUIZ_ACCENT} onClick={startQuizCountdown}>
                Запустить
              </DemoButton>
            </div>
            <QuizVariantGrid>
              <QuizVariantCard label="ВАРИАНТ A">
                <CountdownBaseline countVal={countVal} />
              </QuizVariantCard>
              <QuizVariantCard label="ВАРИАНТ B">
                <CountdownGlow countVal={countVal} />
              </QuizVariantCard>
              <QuizVariantCard label="ВАРИАНТ C">
                <CountdownRing countVal={countVal} />
              </QuizVariantCard>
            </QuizVariantGrid>
          </QuizSubsection>

          <QuizSubsection title="Reveal правильного ответа">
            <div style={{ marginBottom: 16, display: "flex", justifyContent: "center", gap: 12, flexWrap: "wrap" }}>
              <DemoButton accent="#22c55e" onClick={() => setRevealState("correct")}>
                Правильно
              </DemoButton>
              <DemoButton accent="#ef4444" onClick={() => setRevealState("wrong")}>
                Неправильно
              </DemoButton>
              <DemoButton accent={QUIZ_ACCENT} onClick={() => setRevealState("idle")}>
                Сбросить
              </DemoButton>
            </div>
            <QuizVariantGrid>
              <QuizVariantCard label="ВАРИАНТ A">
                <RevealBaseline state={revealState} />
              </QuizVariantCard>
              <QuizVariantCard label="ВАРИАНТ B">
                <RevealAnimated state={revealState} />
              </QuizVariantCard>
            </QuizVariantGrid>
          </QuizSubsection>

          <QuizSubsection title="Счётчик ответивших">
            <div style={{ marginBottom: 16, display: "flex", justifyContent: "center", gap: 12, flexWrap: "wrap" }}>
              <DemoButton accent={QUIZ_ACCENT} onClick={() => setAnsweredCount((value) => Math.min(5, value + 1))}>
                +1 ответ
              </DemoButton>
              <DemoButton accent={QUIZ_ACCENT} onClick={() => setAnsweredCount(0)}>
                Сбросить
              </DemoButton>
            </div>
            <QuizVariantGrid>
              <QuizVariantCard label="ВАРИАНТ A">
                <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 18 }}>{answeredCount}/5</p>
              </QuizVariantCard>
              <QuizVariantCard label="ВАРИАНТ B">
                <AnsweredAvatarPills answeredCount={answeredCount} />
              </QuizVariantCard>
            </QuizVariantGrid>
          </QuizSubsection>
        </Section>

        <p
          style={{
            textAlign: "center",
            marginTop: 64,
            fontSize: 13,
            color: "rgba(255,255,255,0.35)",
          }}
        >
          Исходники: <code className="font-mono">src/lib/design/tokens.ts</code> ·{" "}
          <code className="font-mono">src/lib/design/motion.ts</code> ·{" "}
          <code className="font-mono">src/components/glass/</code>
        </p>
      </div>

      {/* Sheets (rendered via portal, position outside main flow) */}
      <GlassSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        direction="bottom"
        title="Меню игрока"
        description="Потяни ручку вниз, чтобы закрыть"
      >
        <div style={{ display: "grid", gap: 12 }}>
          {["Сменить ник", "Покинуть комнату", "Настройки звука", "Помощь"].map(
            (label) => (
              <button
                key={label}
                style={{
                  padding: "14px 16px",
                  borderRadius: radius.md,
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  color: "white",
                  fontSize: 15,
                  fontFamily: "inherit",
                  textAlign: "left",
                  cursor: "pointer",
                }}
                onClick={() => setSheetOpen(false)}
              >
                {label}
              </button>
            ),
          )}
        </div>
      </GlassSheet>

      <GlassSheet
        open={sideSheetOpen}
        onOpenChange={setSideSheetOpen}
        direction="right"
        title="Чат комнаты"
      >
        <p style={{ color: "rgba(255,255,255,0.6)", lineHeight: 1.6 }}>
          Боковые шторки удобны для постоянных панелей: чат, список игроков,
          история. Свайп вправо или клик вне закроет.
        </p>
      </GlassSheet>

      {/* Toaster mounted once */}
      <GlassToaster accentColor={gameColors[activeGame].accent} />
    </main>
  );
}

function TileFramed({ gameId, label }: { gameId: GameId; label: string }) {
  const accent = gameColors[gameId].accent;
  const deep = gameColors[gameId].deep;

  return (
    <div
      style={{
        position: "relative",
        aspectRatio: "1",
        borderRadius: radius.md,
        background: `linear-gradient(135deg, ${deep}66, ${accent}22)`,
        backdropFilter: "blur(16px)",
        border: `1px solid ${accent}40`,
        boxShadow: `0 10px 24px rgba(0,0,0,0.35), 0 0 0 1px ${accent}25`,
        overflow: "hidden",
      }}
    >
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
        <GameIcon gameId={gameId} style={{ width: "100%", height: "100%" }} />
      </div>
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
          {label}
        </div>
      </div>
    </div>
  );
}

function TileNaked({ gameId, label }: { gameId: GameId; label: string }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 8,
      }}
    >
      <div style={{ width: "100%", aspectRatio: "1" }}>
        <GameIcon gameId={gameId} style={{ width: "100%", height: "100%" }} />
      </div>
      <div
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: "white",
          letterSpacing: "-0.01em",
          whiteSpace: "nowrap",
          textShadow: "0 1px 4px rgba(0,0,0,0.6)",
        }}
      >
        {label}
      </div>
    </div>
  );
}

function QuizSubsection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 48 }}>
      <h3
        style={{
          fontSize: 16,
          fontWeight: 600,
          color: "rgba(255,255,255,0.7)",
          marginBottom: 16,
        }}
      >
        {title}
      </h3>
      {children}
    </div>
  );
}

function QuizVariantGrid({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
        gap: 16,
      }}
    >
      {children}
    </div>
  );
}

function QuizVariantCard({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div
      className="bg-gray-900"
      style={{
        borderRadius: 16,
        padding: 24,
        border: "1px solid rgba(255,255,255,0.08)",
        minHeight: 260,
      }}
    >
      <p
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: "rgba(255,255,255,0.4)",
          marginBottom: 16,
          letterSpacing: "0.08em",
        }}
      >
        {label}
      </p>
      {children}
    </div>
  );
}

function QuizQuestionPreview() {
  return (
    <div style={{ marginBottom: 16 }}>
      <p style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", marginBottom: 6 }}>
        Вопрос
      </p>
      <p style={{ fontSize: 17, fontWeight: 700, color: "white", lineHeight: 1.35 }}>
        Какая планета самая большая в Солнечной системе?
      </p>
    </div>
  );
}

function AnswerVariantA({
  selectedAnswer,
  showCorrect,
  onSelect,
}: {
  selectedAnswer: number | null;
  showCorrect: boolean;
  onSelect: (value: number) => void;
}) {
  return (
    <div style={{ display: "grid", gap: 10 }}>
      {QUIZ_ANSWERS.map((answer, index) => {
        const isSelected = selectedAnswer === index;
        const isCorrect = index === 0;
        const isWrongSelected = showCorrect && isSelected && !isCorrect;

        return (
          <button
            key={answer}
            onClick={() => onSelect(index)}
            className={`rounded-2xl border p-4 text-left backdrop-blur-xl transition-all ${
              showCorrect && isCorrect
                ? "border-green-400 bg-green-500/40 ring-2 ring-green-400/50"
                : isWrongSelected
                  ? "border-red-400 bg-red-500/40 ring-2 ring-red-400/50"
                  : `bg-gradient-to-br ${OPTION_COLORS_A[index]}`
            }`}
            style={{ color: "white", cursor: "pointer" }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  display: "grid",
                  placeItems: "center",
                  background: "rgba(255,255,255,0.1)",
                  color: "rgba(255,255,255,0.75)",
                  fontWeight: 800,
                }}
              >
                {QUIZ_OPTION_LABELS[index]}
              </span>
              <span style={{ fontWeight: 700 }}>{answer}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

function AnswerVariantB({
  selectedAnswer,
  showCorrect,
  onSelect,
}: {
  selectedAnswer: number | null;
  showCorrect: boolean;
  onSelect: (value: number) => void;
}) {
  return (
    <div style={{ display: "grid", gap: 10 }}>
      {QUIZ_ANSWERS.map((answer, index) => {
        const isSelected = selectedAnswer === index;
        const isCorrect = index === 0;
        const isWrongSelected = showCorrect && isSelected && !isCorrect;
        const isMuted = showCorrect && !isCorrect && !isWrongSelected;

        return (
          <motion.button
            key={answer}
            onClick={() => onSelect(index)}
            whileHover={{ scale: 1.01 }}
            animate={
              showCorrect && isCorrect
                ? { scale: [1, 1.03, 1], x: 0 }
                : isWrongSelected
                  ? { x: [-4, 4, -4, 0], scale: 1 }
                  : { x: 0, scale: 1 }
            }
            transition={
              showCorrect && (isCorrect || isWrongSelected)
                ? { duration: 0.3, ease: easing.outBack }
                : spring.snappy
            }
            style={{
              padding: 16,
              borderRadius: 16,
              border: showCorrect && isCorrect
                ? "1px solid rgba(74,222,128,0.9)"
                : isWrongSelected
                  ? "1px solid rgba(248,113,113,0.9)"
                  : isSelected
                    ? "1px solid rgba(250,204,21,0.6)"
                    : "1px solid rgba(255,255,255,0.15)",
              background: showCorrect && isCorrect
                ? "rgba(34,197,94,0.2)"
                : isWrongSelected
                  ? "rgba(239,68,68,0.15)"
                  : isSelected
                    ? "rgba(234,179,8,0.15)"
                    : "rgba(255,255,255,0.08)",
              boxShadow: isSelected && !showCorrect ? "0 0 0 2px rgba(250,204,21,0.6)" : "none",
              backdropFilter: "blur(16px)",
              opacity: isMuted ? 0.5 : 1,
              color: "white",
              cursor: "pointer",
              textAlign: "left",
              fontFamily: "inherit",
            }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 10,
                  display: "grid",
                  placeItems: "center",
                  background: showCorrect && isCorrect ? "rgba(250,204,21,0.2)" : "rgba(255,255,255,0.1)",
                  color: showCorrect && isCorrect ? "#fde047" : "rgba(255,255,255,0.7)",
                  fontWeight: 800,
                }}
              >
                {QUIZ_OPTION_LABELS[index]}
              </span>
              <span style={{ fontWeight: 700 }}>{answer}</span>
            </span>
          </motion.button>
        );
      })}
    </div>
  );
}

function AnswerVariantC({
  selectedAnswer,
  showCorrect,
  onSelect,
}: {
  selectedAnswer: number | null;
  showCorrect: boolean;
  onSelect: (value: number) => void;
}) {
  return (
    <div style={{ display: "grid", gap: 10 }}>
      {QUIZ_ANSWERS.map((answer, index) => {
        const isSelected = selectedAnswer === index;
        const isCorrect = showCorrect && index === 0;
        const isWrongSelected = showCorrect && isSelected && index !== 0;
        const accent = isCorrect ? "#22c55e" : isWrongSelected ? "#ef4444" : isSelected ? QUIZ_ACCENT : "rgba(255,255,255,0.12)";

        return (
          <button
            key={answer}
            onClick={() => onSelect(index)}
            style={{
              position: "relative",
              display: "flex",
              alignItems: "center",
              gap: 14,
              padding: "15px 16px 15px 20px",
              borderRadius: 14,
              border: "1px solid rgba(255,255,255,0.1)",
              background: isCorrect
                ? "rgba(34,197,94,0.1)"
                : isWrongSelected
                  ? "rgba(239,68,68,0.1)"
                  : "rgba(255,255,255,0.05)",
              color: "white",
              cursor: "pointer",
              textAlign: "left",
              fontFamily: "inherit",
              overflow: "hidden",
            }}
          >
            <span
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                bottom: 0,
                width: 4,
                borderRadius: 999,
                background: accent,
              }}
            />
            <span
              style={{
                width: 34,
                fontSize: 26,
                fontWeight: 900,
                color: isCorrect ? "#4ade80" : isWrongSelected ? "#f87171" : "white",
              }}
            >
              {index + 1}
            </span>
            <span style={{ fontWeight: 700 }}>{answer}</span>
          </button>
        );
      })}
    </div>
  );
}

function CountdownBaseline({ countVal }: { countVal: number }) {
  return (
    <div style={{ minHeight: 150, display: "grid", placeItems: "center" }}>
      {countVal > 0 ? (
        <div key={countVal} className="animate-bounce text-8xl font-black text-white">
          {countVal}
        </div>
      ) : (
        <span style={{ color: "rgba(255,255,255,0.35)" }}>Готово</span>
      )}
    </div>
  );
}

function CountdownGlow({ countVal }: { countVal: number }) {
  return (
    <div style={{ minHeight: 150, display: "grid", placeItems: "center" }}>
      <AnimatePresence mode="wait">
        {countVal > 0 ? (
          <motion.div
            key={countVal}
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: [0.5, 1.2, 1], opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0, y: -20 }}
            transition={{ duration: 0.4, ease: easing.outBack }}
            style={{
              fontSize: 120,
              fontWeight: 900,
              color: QUIZ_ACCENT,
              textShadow: "0 0 40px rgba(250, 204, 21, 0.6), 0 0 80px rgba(250, 204, 21, 0.3)",
              lineHeight: 1,
            }}
          >
            {countVal}
          </motion.div>
        ) : (
          <motion.span key="done" initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ color: "rgba(255,255,255,0.35)" }}>
            Готово
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
}

function CountdownRing({ countVal }: { countVal: number }) {
  return (
    <div style={{ minHeight: 150, display: "grid", placeItems: "center" }}>
      {countVal > 0 ? (
        <div style={{ position: "relative", width: 140, height: 140, display: "grid", placeItems: "center" }}>
          <svg width={140} height={140} className="-rotate-90">
            <circle cx={70} cy={70} r={60} stroke="rgba(255,255,255,0.1)" strokeWidth={8} fill="none" />
            <motion.circle
              key={countVal}
              cx={70}
              cy={70}
              r={60}
              stroke={QUIZ_ACCENT}
              strokeWidth={8}
              fill="none"
              strokeLinecap="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.75, ease: "linear" }}
            />
          </svg>
          <span style={{ position: "absolute", fontSize: 64, fontWeight: 900, color: "white" }}>
            {countVal}
          </span>
        </div>
      ) : (
        <span style={{ color: "rgba(255,255,255,0.35)" }}>Готово</span>
      )}
    </div>
  );
}

function RevealBaseline({ state }: { state: "idle" | "correct" | "wrong" }) {
  return (
    <div
      style={{
        borderRadius: 18,
        border: state === "correct" ? "1px solid #4ade80" : state === "wrong" ? "1px solid #f87171" : "1px solid rgba(255,255,255,0.15)",
        background: state === "correct" ? "rgba(34,197,94,0.4)" : state === "wrong" ? "rgba(239,68,68,0.4)" : "rgba(255,255,255,0.08)",
        padding: 18,
        color: "white",
        fontWeight: 700,
      }}
    >
      Юпитер
    </div>
  );
}

function RevealAnimated({ state }: { state: "idle" | "correct" | "wrong" }) {
  return (
    <motion.div
      animate={state === "correct" ? { scale: [1, 1.04, 1], x: 0 } : state === "wrong" ? { x: [-6, 6, -6, 0], scale: 1 } : { x: 0, scale: 1 }}
      transition={state === "idle" ? spring.snappy : { duration: 0.35, ease: easing.outBack }}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        borderRadius: 18,
        border: state === "correct" ? "1px solid #4ade80" : state === "wrong" ? "1px solid #f87171" : "1px solid rgba(255,255,255,0.15)",
        background: state === "correct" ? "rgba(34,197,94,0.22)" : state === "wrong" ? "rgba(239,68,68,0.22)" : "rgba(255,255,255,0.08)",
        padding: 18,
        color: "white",
        fontWeight: 700,
      }}
    >
      <AnimatePresence mode="wait">
        {state === "correct" ? (
          <motion.svg key="check" width="24" height="24" viewBox="0 0 24 24" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
            <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </motion.svg>
        ) : state === "wrong" ? (
          <motion.span key="wrong" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} style={{ fontSize: 24, lineHeight: 1 }}>
            ×
          </motion.span>
        ) : null}
      </AnimatePresence>
      Юпитер
    </motion.div>
  );
}

function AnsweredAvatarPills({ answeredCount }: { answeredCount: number }) {
  return (
    <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
      {[1, 2, 3, 4, 5].map((player) => {
        const isAnswered = player <= answeredCount;
        return (
          <motion.div
            key={`${player}-${isAnswered}`}
            initial={isAnswered ? { scale: 0.85 } : false}
            animate={isAnswered ? { scale: [1, 1.12, 1] } : { scale: 1 }}
            transition={isAnswered ? { duration: 0.28, ease: easing.outBack } : spring.snappy}
            style={{
              width: 48,
              height: 48,
              borderRadius: 999,
              display: "grid",
              placeItems: "center",
              background: isAnswered ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.1)",
              border: isAnswered ? "1px solid rgba(255,255,255,0.3)" : "1px solid rgba(255,255,255,0.15)",
              color: isAnswered ? "white" : "rgba(255,255,255,0.45)",
              fontSize: 13,
              fontWeight: 800,
            }}
          >
            П{player}
          </motion.div>
        );
      })}
    </div>
  );
}

// Helper button used in demos
function DemoButton({
  onClick,
  accent,
  children,
}: {
  onClick: () => void;
  accent: string;
  children: React.ReactNode;
}) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={hover.lift}
      whileTap={tap.press}
      style={{
        padding: "10px 18px",
        borderRadius: radius.md,
        border: `1px solid color-mix(in srgb, ${accent} 35%, rgba(255,255,255,0.1))`,
        background: `color-mix(in srgb, ${accent} 12%, rgba(255,255,255,0.04))`,
        color: accent,
        fontFamily: "inherit",
        fontSize: 14,
        fontWeight: 600,
        cursor: "pointer",
      }}
    >
      {children}
    </motion.button>
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
