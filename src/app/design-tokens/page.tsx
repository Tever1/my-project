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
const BACKGROUND_VARIANTS = [
  {
    label: "A",
    background:
      "radial-gradient(ellipse at 50% -10%, rgba(250,204,21,0.12) 0%, transparent 55%), linear-gradient(135deg, #0c0a15 0%, #1a1035 30%, #0f172a 60%, #0c0a15 100%)",
  },
  {
    label: "B",
    background:
      "radial-gradient(ellipse at 50% 100%, rgba(255,255,255,0.03) 0%, transparent 60%), #08080f",
  },
  {
    label: "C",
    background: "#09090f",
    noise: true,
  },
];
const CROC_BG_DARK =
  "linear-gradient(135deg, #200707 0%, #3b0a0a 30%, #2a0c0c 60%, #200707 100%)";
const CROC_BG_CARD =
  "radial-gradient(110% 70% at 50% -5%, rgba(255,255,255,.30), transparent 55%), linear-gradient(165deg, #ef4444 0%, #991b1b 100%)";
const ICON_COLORS = [
  { name: "Белый", hex: "#ffffff" },
  { name: "Кремовый", hex: "#f5efe6" },
  { name: "Золото", hex: "#ffd60a" },
  { name: "Янтарь", hex: "#ff9f0a" },
  { name: "Мятный (lime)", hex: "#a7f66a" },
  { name: "Светло-голубой", hex: "#7fdfff" },
  { name: "Графит", hex: "#1f2937" },
];

type IconRenderer = (size?: number) => React.ReactElement;

const IcMic: IconRenderer = (s = 28) => (
  <svg width={s} height={s} viewBox="0 0 20 20" fill="none">
    <rect x="7" y="2" width="6" height="10" rx="3" stroke="currentColor" strokeWidth="1.8" />
    <path d="M4 9a6 6 0 0012 0M10 15v3M7 18h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);
const IcTrophy: IconRenderer = (s = 28) => (
  <svg width={s} height={s} viewBox="0 0 20 20" fill="none">
    <path d="M5 3h10v4a5 5 0 01-10 0V3z" stroke="currentColor" strokeWidth="1.8" />
    <path d="M5 4H3v2a2 2 0 002 2M15 4h2v2a2 2 0 01-2 2M10 12v3M7 17h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);
const IcCrown: IconRenderer = (s = 28) => (
  <svg width={s} height={s} viewBox="0 0 20 20" fill="none">
    <path d="M3 7l3 3 4-6 4 6 3-3-1.5 9h-11L3 7z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
  </svg>
);
const IcTalk: IconRenderer = (s = 28) => (
  <svg width={s} height={s} viewBox="0 0 20 20" fill="none">
    <path d="M3 5h10v7H7l-4 3V5z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
    <path d="M15 8c1.5.5 2 2 0 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);
const IcCheck: IconRenderer = (s = 28) => (
  <svg width={s} height={s} viewBox="0 0 20 20" fill="none">
    <path d="M4 10.5l4 4 8-9" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const CROC_SAMPLE_ICONS: { label: string; render: IconRenderer }[] = [
  { label: "Микрофон", render: IcMic },
  { label: "Трофей", render: IcTrophy },
  { label: "Корона", render: IcCrown },
  { label: "Речь", render: IcTalk },
  { label: "Галочка", render: IcCheck },
];

const SPY_BG_DARK =
  "linear-gradient(135deg, #07201d 0%, #0a3b34 30%, #0c2a2e 60%, #07201d 100%)";
const SPY_BG_CARD =
  "radial-gradient(110% 70% at 50% -5%, rgba(255,255,255,.22), transparent 55%), linear-gradient(165deg, #14b8a6 0%, #0f766e 100%)";

// Плоские line-иконки Шпиона (viewBox 24). currentColor — цвет задаёт панель.
const SpMask: IconRenderer = (s = 28) => (
  <span
    aria-hidden
    style={{
      display: 'inline-block',
      width: s,
      height: s,
      backgroundColor: 'currentColor',
      WebkitMaskImage: 'url(/icons/spy/mask-face.png)',
      maskImage: 'url(/icons/spy/mask-face.png)',
      WebkitMaskRepeat: 'no-repeat',
      maskRepeat: 'no-repeat',
      WebkitMaskPosition: 'center',
      maskPosition: 'center',
      WebkitMaskSize: 'contain',
      maskSize: 'contain',
    }}
  />
);
const SpSpeech: IconRenderer = (s = 28) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
    <path d="M5 4h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-7l-4 3v-3H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
    <path d="M8 10h.01M12 10h.01M16 10h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);
const SpPalette: IconRenderer = (s = 28) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
    <path d="M12 3c5 0 9 3.4 9 8 0 2.2-1.8 4-4 4h-2c-.9 0-1.6.7-1.6 1.6 0 .4.2.7.2 1.1 0 .9-.6 1.3-1.6 1.3A9 8 0 0 1 12 3Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
    <circle cx="8" cy="9.5" r="1" fill="currentColor" />
    <circle cx="11.5" cy="6.5" r="1" fill="currentColor" />
    <circle cx="15.5" cy="7.5" r="1" fill="currentColor" />
  </svg>
);
const SpBallot: IconRenderer = (s = 28) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
    <path d="M4 8.5l8-4.5 8 4.5V19a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V8.5Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
    <path d="M9 12.5l2 2 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const SpCheck: IconRenderer = (s = 28) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
    <path d="M5 12.5l4.5 4.5L19 7" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const SpCross: IconRenderer = (s = 28) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
    <path d="M7 7l10 10M17 7L7 17" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
  </svg>
);
const SpHide: IconRenderer = (s = 28) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
    <path d="M3 12s3.6-6.5 9-6.5 9 6.5 9 6.5-3.6 6.5-9 6.5S3 12 3 12Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
    <circle cx="12" cy="12" r="2.6" stroke="currentColor" strokeWidth="1.6" />
    <path d="M4 4l16 16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);
const SpRefresh: IconRenderer = (s = 28) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
    <path d="M20 6.5A8 8 0 1 0 21 13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    <path d="M20 3v4h-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const SpShield: IconRenderer = (s = 28) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
    <path d="M12 3l7 3v5c0 4.6-3 8.2-7 9.4C8 19.2 5 15.6 5 11V6l7-3Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
    <path d="M9 11.8l2 2 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const SpTrophy: IconRenderer = (s = 28) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
    <path d="M6 4h12v4a6 6 0 0 1-12 0V4Z" stroke="currentColor" strokeWidth="1.7" />
    <path d="M6 5H3v2a3 3 0 0 0 3 3M18 5h3v2a3 3 0 0 1-3 3M12 14v4M8 20h8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
  </svg>
);
const SpEye: IconRenderer = (s = 28) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
    <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.6" />
  </svg>
);
const SpMedal: IconRenderer = (s = 28) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
    <path d="M8 3l3 6M16 3l-3 6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    <circle cx="12" cy="15" r="6" stroke="currentColor" strokeWidth="1.7" />
    <path d="M12 11.8L12.82 13.87L15.04 14.01L13.33 15.43L13.88 17.59L12 16.4L10.12 17.59L10.67 15.43L8.96 14.01L11.18 13.87Z" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round" />
  </svg>
);
const SpSkip: IconRenderer = (s = 28) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
    <path d="M5 6l7 6-7 6V6Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
    <path d="M13 6l7 6-7 6V6Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
  </svg>
);
const SpWarning: IconRenderer = (s = 28) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
    <path d="M12 4l9 16H3L12 4Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
    <path d="M12 10v4M12 17h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const SPY_SAMPLE_ICONS: { name: string; label: string; render: IconRenderer }[] = [
  { name: "mask", label: "Маска", render: SpMask },
  { name: "speech", label: "Реплика", render: SpSpeech },
  { name: "palette", label: "Рисовать", render: SpPalette },
  { name: "ballot", label: "Голос", render: SpBallot },
  { name: "check", label: "Верно", render: SpCheck },
  { name: "cross", label: "Неверно", render: SpCross },
  { name: "hide", label: "Скрыть", render: SpHide },
  { name: "refresh", label: "Сменить", render: SpRefresh },
  { name: "shield", label: "Защита", render: SpShield },
  { name: "trophy", label: "Трофей", render: SpTrophy },
  { name: "eye", label: "Глаз", render: SpEye },
  { name: "medal", label: "Медаль", render: SpMedal },
  { name: "skip", label: "Пропуск", render: SpSkip },
  { name: "warning", label: "Внимание", render: SpWarning },
];

const ALIAS_BG_DARK =
  "linear-gradient(135deg, #2a0a1f 0%, #3b0a2f 30%, #2a0a24 60%, #2a0a1f 100%)";
const ALIAS_BG_CARD =
  "radial-gradient(110% 70% at 50% -5%, rgba(255,255,255,.22), transparent 55%), linear-gradient(165deg, #ec4899 0%, #9d174d 100%)";

// Плоские line-иконки Alias (viewBox 24). currentColor — цвет задаёт панель.
const AlSpeech: IconRenderer = (s = 28) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
    <path d="M5 4h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-7l-4 3v-3H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
    <path d="M8 10h.01M12 10h.01M16 10h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);
const AlBook: IconRenderer = (s = 28) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
    <path d="M12 6C9.8 4.6 6.5 4.4 4 5v13c2.5-.6 5.8-.4 8 1 2.2-1.4 5.5-1.6 8-1V5c-2.5-.6-5.8-.4-8 1Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
    <path d="M12 6v13" stroke="currentColor" strokeWidth="1.5" />
  </svg>
);
const AlLetters: IconRenderer = (s = 28) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
    <rect x="3" y="3.5" width="18" height="17" rx="4" stroke="currentColor" strokeWidth="1.7" />
    <path d="M8.5 15.5l3.5-8 3.5 8M9.7 12.8h4.6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const AlShuffle: IconRenderer = (s = 28) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
    <path d="M2 18h1.4c1.3 0 2.5-.6 3.3-1.7l6.1-8.6c.7-1.1 2-1.7 3.3-1.7H22" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M2 6h1.9c1.5 0 2.9.9 3.6 2.2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M22 18h-5.9c-1.3 0-2.6-.7-3.3-1.8l-.5-.8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M18 2l4 4-4 4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M18 14l4 4-4 4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const AlMic: IconRenderer = (s = 28) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
    <rect x="9" y="3" width="6" height="11" rx="3" stroke="currentColor" strokeWidth="1.7" />
    <path d="M5 11a7 7 0 0 0 14 0M12 18v3M8 21h8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
  </svg>
);
const AlTalk: IconRenderer = (s = 28) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
    <path d="M3 5h11a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1H8l-4 3V5Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
    <path d="M18 8.5c1.5.7 1.5 3.3 0 4M20.5 6.5c2.6 1.4 2.6 5.6 0 7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);
const AlHourglass: IconRenderer = (s = 28) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
    <path d="M6 3h12M6 21h12" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    <path d="M7 3c0 5 5 6 5 9s-5 4-5 9M17 3c0 5-5 6-5 9s5 4 5 9" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
  </svg>
);
const AlCheck: IconRenderer = (s = 28) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
    <path d="M5 12.5l4.5 4.5L19 7" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const AlCross: IconRenderer = (s = 28) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
    <path d="M7 7l10 10M17 7L7 17" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
  </svg>
);
const AlSkip: IconRenderer = (s = 28) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
    <path d="M5 6l7 6-7 6V6Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
    <path d="M13 6l7 6-7 6V6Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
  </svg>
);
const AlTrophy: IconRenderer = (s = 28) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
    <path d="M6 4h12v4a6 6 0 0 1-12 0V4Z" stroke="currentColor" strokeWidth="1.7" />
    <path d="M6 5H3v2a3 3 0 0 0 3 3M18 5h3v2a3 3 0 0 1-3 3M12 14v4M8 20h8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
  </svg>
);
const AlMedal: IconRenderer = (s = 28) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
    <path d="M8 3l3 6M16 3l-3 6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    <circle cx="12" cy="15" r="6" stroke="currentColor" strokeWidth="1.7" />
    <path d="M12 11.8L12.82 13.87L15.04 14.01L13.33 15.43L13.88 17.59L12 16.4L10.12 17.59L10.67 15.43L8.96 14.01L11.18 13.87Z" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round" />
  </svg>
);

const ALIAS_SAMPLE_ICONS: { name: string; label: string; render: IconRenderer }[] = [
  { name: "speech", label: "Угадай слово", render: AlSpeech },
  { name: "book", label: "Классика", render: AlBook },
  { name: "letters", label: "На букву", render: AlLetters },
  { name: "shuffle", label: "Случайно", render: AlShuffle },
  { name: "mic", label: "Объясняет", render: AlMic },
  { name: "talk", label: "Говори вслух", render: AlTalk },
  { name: "hourglass", label: "Ожидание", render: AlHourglass },
  { name: "check", label: "Угадано", render: AlCheck },
  { name: "cross", label: "Пропущено", render: AlCross },
  { name: "skip", label: "Пропустить", render: AlSkip },
  { name: "trophy", label: "Победа", render: AlTrophy },
  { name: "medal", label: "Медаль", render: AlMedal },
];

const WHOAMI_BG_DARK =
  "linear-gradient(135deg, #071825 0%, #0a2d3f 30%, #0c2530 60%, #071825 100%)";
const WHOAMI_BG_CARD =
  "radial-gradient(110% 70% at 50% -5%, rgba(255,255,255,.22), transparent 55%), linear-gradient(165deg, #38bdf8 0%, #0369a1 100%)";

// Плоские line-иконки «Кто я?» (viewBox 24). currentColor — цвет задаёт панель.
const WaProfile: IconRenderer = (s = 28) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="9.5" r="3.5" stroke="currentColor" strokeWidth="1.6" />
    <path d="M5 20c0-3.6 3.2-6.3 7-6.3s7 2.7 7 6.3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    <path d="M17.1 5c.5-1 1.9-1 2.4.1.4.8-.1 1.3-.6 1.7-.4.4-.6.7-.6 1.2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" fill="none" />
    <circle cx="18.4" cy="9.3" r=".55" fill="currentColor" />
  </svg>
);
const WaStar: IconRenderer = (s = 28) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
    <path d="M12 2.5l2.6 5.9 6.4.6-4.9 4.3 1.5 6.2L12 16.4l-5.6 3.1 1.5-6.2-4.9-4.3 6.4-.6L12 2.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
  </svg>
);
const WaPointer: IconRenderer = (s = 28) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
    <path d="M4 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const WaCheck: IconRenderer = (s = 28) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
    <path d="M5 12.5l4.5 4.5L19 7" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const WaCross: IconRenderer = (s = 28) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
    <path d="M7 7l10 10M17 7L7 17" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
  </svg>
);
const WaCelebrate: IconRenderer = (s = 28) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="3" fill="currentColor" />
    <path d="M12 2v3M4.2 4.2l2.1 2.1M2 12h3M4.2 19.8l2.1-2.1M19.8 4.2l-2.1 2.1M22 12h-3M19.8 19.8l-2.1-2.1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);
const WaTrophy: IconRenderer = (s = 28) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
    <path d="M6 4h12v4a6 6 0 0 1-12 0V4Z" stroke="currentColor" strokeWidth="1.7" />
    <path d="M6 5H3v2a3 3 0 0 0 3 3M18 5h3v2a3 3 0 0 1-3 3M12 14v4M8 20h8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
  </svg>
);
const WaMedal: IconRenderer = (s = 28) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
    <path d="M8 3l3 6M16 3l-3 6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    <circle cx="12" cy="15" r="6" stroke="currentColor" strokeWidth="1.7" />
    <path d="M12 11.8L12.82 13.87L15.04 14.01L13.33 15.43L13.88 17.59L12 16.4L10.12 17.59L10.67 15.43L8.96 14.01L11.18 13.87Z" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round" />
  </svg>
);

const WHOAMI_SAMPLE_ICONS: { name: string; label: string; render: IconRenderer }[] = [
  { name: "profile", label: "Игра (силуэт+?)", render: WaProfile },
  { name: "star", label: "Хост", render: WaStar },
  { name: "pointer", label: "Сейчас ход", render: WaPointer },
  { name: "check", label: "Угадано", render: WaCheck },
  { name: "cross", label: "Неверно", render: WaCross },
  { name: "celebrate", label: "Правильно!", render: WaCelebrate },
  { name: "trophy", label: "Игра окончена", render: WaTrophy },
  { name: "medal", label: "Место в топе", render: WaMedal },
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

        <Section title="Game Backgrounds" subtitle="Варианты фона игровых экранов — выбор атмосферы">
          <style>{`
            .bg-noise::before {
              content: '';
              position: absolute;
              inset: 0;
              background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.035'/%3E%3C/svg%3E");
              background-size: 200px 200px;
              pointer-events: none;
              z-index: 1;
            }
          `}</style>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
            {BACKGROUND_VARIANTS.map((variant) => (
              <GameBackgroundPreview
                key={variant.label}
                label={variant.label}
                background={variant.background}
                noise={variant.noise}
              />
            ))}
          </div>
        </Section>

        <CrocIconColorMatrix />
        <SpyIconPreview />
        <AliasIconPreview />
        <WhoAmIIconPreview />

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

function CrocIconColorMatrix() {
  return (
    <Section
      title="Крокодил · цвет иконок на красном"
      subtitle="Иконки заменят эмодзи. Выбери цвет, который читается на красном фоне и карточке. Красный фон делает красные иконки невидимыми."
    >
      <div style={{ display: "grid", gap: 18 }}>
        {ICON_COLORS.map((color) => (
          <div
            key={color.hex}
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 260px), 1fr))",
              gap: 16,
              padding: 18,
              borderRadius: radius.xl,
              border: "1px solid rgba(255,255,255,0.1)",
              background: "rgba(255,255,255,0.035)",
              backdropFilter: "blur(14px)",
            }}
          >
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, color: "rgba(255,255,255,0.92)" }}>
                {color.name}
              </div>
              <div
                className="font-mono"
                style={{
                  marginTop: 6,
                  fontSize: 13,
                  color: color.hex,
                  textTransform: "uppercase",
                }}
              >
                {color.hex}
              </div>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 240px), 1fr))",
                gap: 14,
              }}
            >
              <CrocIconPreview
                label="Фон экрана"
                background={CROC_BG_DARK}
                color={color.hex}
                borderRadius={22}
              />
              <CrocIconPreview
                label="Красная карточка"
                background={CROC_BG_CARD}
                color={color.hex}
                borderRadius={28}
              />
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}

function SpyIconPreview() {
  const panels = [
    { label: "На тёмном фоне (бирюзовый)", bg: SPY_BG_DARK, color: "#5eead4" },
    { label: "На бирюзовой карточке (кремовый)", bg: SPY_BG_CARD, color: "#f5efe6" },
  ];
  return (
    <Section
      title="Шпион · плоские иконки (превью)"
      subtitle="Кандидаты на замену PNG-иконок Шпиона. В игру пока не внедрены — оцени форму и цвет."
    >
      <div style={{ display: "grid", gap: 18 }}>
        {panels.map((panel) => (
          <div
            key={panel.label}
            style={{
              padding: 20,
              borderRadius: radius.xl,
              background: panel.bg,
              color: panel.color,
              border: "1px solid rgba(255,255,255,0.14)",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.12), 0 14px 30px rgba(0,0,0,0.24)",
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 16, color: "rgba(255,255,255,0.6)" }}>
              {panel.label}
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(92px, 1fr))",
                gap: 18,
              }}
            >
              {SPY_SAMPLE_ICONS.map((ic) => (
                <div
                  key={ic.name}
                  style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}
                >
                  <span style={{ display: "inline-flex", lineHeight: 0 }}>{ic.render(34)}</span>
                  <span style={{ fontSize: 11, fontWeight: 600, opacity: 0.85 }}>{ic.label}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}

function AliasIconPreview() {
  const panels = [
    { label: "На тёмном фоне (розовый)", bg: ALIAS_BG_DARK, color: "#f9a8d4" },
    { label: "На розовой карточке (кремовый)", bg: ALIAS_BG_CARD, color: "#fdf2f8" },
  ];
  return (
    <Section
      title="Угадай слово · плоские иконки (превью)"
      subtitle="Кандидаты на замену эмодзи в Alias. В игру пока не внедрены — оцени форму и цвет."
    >
      <div style={{ display: "grid", gap: 18 }}>
        {panels.map((panel) => (
          <div
            key={panel.label}
            style={{
              padding: 20,
              borderRadius: radius.xl,
              background: panel.bg,
              color: panel.color,
              border: "1px solid rgba(255,255,255,0.14)",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.12), 0 14px 30px rgba(0,0,0,0.24)",
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 16, color: "rgba(255,255,255,0.6)" }}>
              {panel.label}
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(92px, 1fr))",
                gap: 18,
              }}
            >
              {ALIAS_SAMPLE_ICONS.map((ic) => (
                <div
                  key={ic.name}
                  style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}
                >
                  <span style={{ display: "inline-flex", lineHeight: 0 }}>{ic.render(34)}</span>
                  <span style={{ fontSize: 11, fontWeight: 600, opacity: 0.85 }}>{ic.label}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}

function WhoAmIIconPreview() {
  const panels = [
    { label: "На тёмном фоне (голубой)", bg: WHOAMI_BG_DARK, color: "#7dd3fc" },
    { label: "На голубой карточке (кремовый)", bg: WHOAMI_BG_CARD, color: "#f0f9ff" },
  ];
  return (
    <Section
      title="Кто я? · плоские иконки (превью)"
      subtitle="Кандидаты на замену эмодзи в «Кто я?». В игру пока не внедрены — оцени форму и цвет."
    >
      <div style={{ display: "grid", gap: 18 }}>
        {panels.map((panel) => (
          <div
            key={panel.label}
            style={{
              padding: 20,
              borderRadius: radius.xl,
              background: panel.bg,
              color: panel.color,
              border: "1px solid rgba(255,255,255,0.14)",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.12), 0 14px 30px rgba(0,0,0,0.24)",
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 16, color: "rgba(255,255,255,0.6)" }}>
              {panel.label}
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(92px, 1fr))",
                gap: 18,
              }}
            >
              {WHOAMI_SAMPLE_ICONS.map((ic) => (
                <div
                  key={ic.name}
                  style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}
                >
                  <span style={{ display: "inline-flex", lineHeight: 0 }}>{ic.render(34)}</span>
                  <span style={{ fontSize: 11, fontWeight: 600, opacity: 0.85 }}>{ic.label}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}

function CrocIconPreview({
  label,
  background,
  color,
  borderRadius,
}: {
  label: string;
  background: string;
  color: string;
  borderRadius: number;
}) {
  return (
    <div
      style={{
        minHeight: 120,
        padding: 20,
        borderRadius,
        background,
        color,
        border: "1px solid rgba(255,255,255,0.14)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.12), 0 14px 30px rgba(0,0,0,0.24)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          flexWrap: "wrap",
        }}
      >
        {CROC_SAMPLE_ICONS.map((icon) => (
          <span
            key={icon.label}
            aria-label={icon.label}
            title={icon.label}
            style={{ display: "inline-flex", lineHeight: 0 }}
          >
            {icon.render(28)}
          </span>
        ))}
      </div>
      <div
        className="font-mono"
        style={{
          marginTop: 18,
          fontSize: 15,
          fontWeight: 800,
          letterSpacing: "0.08em",
        }}
      >
        СЛОВО · УГАДЫВАЮТ
      </div>
      <div
        style={{
          marginTop: 10,
          fontSize: 12,
          fontWeight: 600,
          color: "rgba(255,255,255,0.58)",
        }}
      >
        {label}
      </div>
    </div>
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

function GameBackgroundPreview({
  label,
  background,
  noise = false,
}: {
  label: string;
  background: string;
  noise?: boolean;
}) {
  const contentLayer = noise ? { position: "relative" as const, zIndex: 2 } : { position: "relative" as const };

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        aspectRatio: "2/3",
        borderRadius: 20,
        overflow: "hidden",
        border: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      <div
        className={noise ? "bg-noise" : undefined}
        style={{
          position: "absolute",
          inset: 0,
          background,
        }}
      />

      <div
        style={{
          ...contentLayer,
          padding: "16px 20px 12px",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span style={{ color: "white", fontWeight: 700, fontSize: 16 }}>Квиз</span>
        <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 12 }}>Раунд 3/10</span>
      </div>

      <div
        style={{
          ...contentLayer,
          margin: "20px 16px 16px",
          background: "rgba(255,255,255,0.06)",
          borderRadius: 14,
          padding: "16px 18px",
          border: "1px solid rgba(255,255,255,0.1)",
        }}
      >
        <p style={{ color: "white", fontWeight: 600, fontSize: 14, lineHeight: 1.5, margin: 0 }}>
          Какая планета самая большая в Солнечной системе?
        </p>
      </div>

      {QUIZ_ANSWERS.map((answer, index) => (
        <div
          key={answer}
          style={{
            ...contentLayer,
            margin: "0 16px 8px",
            background: "rgba(255,255,255,0.05)",
            borderRadius: 12,
            padding: "10px 14px",
            border: "1px solid rgba(255,255,255,0.08)",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 12, fontWeight: 700, width: 20 }}>
            {index + 1}
          </span>
          <span style={{ color: "white", fontSize: 13, fontWeight: 500 }}>{answer}</span>
        </div>
      ))}

      <div
        style={{
          position: "absolute",
          bottom: 16,
          left: 0,
          right: 0,
          textAlign: "center",
          ...(noise ? { zIndex: 2 } : {}),
        }}
      >
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.1em",
            color: "rgba(255,255,255,0.35)",
          }}
        >
          ВАРИАНТ {label}
        </span>
      </div>
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
