"use client";

/**
 * / — Phase D PS5 + Spotlight hybrid lobby (main page).
 *
 * Layout:
 *   Top bar:  brand + nav (Играть) + Avatar
 *   Hero:     left = giant title + meta + desc + CTA + room-code input
 *             right = tilted preview-card with per-game mock content
 *   Bottom:   tile strip (all 7 games, smaller radii)
 *
 * Icons fall back to <GameIcon> SVG placeholders until PNG files appear in
 * public/icons/games/.
 */

import { motion, AnimatePresence } from "framer-motion";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import { GameIcon } from "@/components/GameIcon";
import { GlassPanel, GlassToaster } from "@/components/glass";
import { PlayerAvatar, Badge } from "@/components/ui";
import { useAuth, useAuthActions, type User } from "@/lib/auth-context";
import { motionPropsInstant, glassMobileSolid } from "@/lib/design/mobile-helpers";
import { gameColors, radius, spring, type GameId } from "@/lib/design/tokens";
import { useNavigateOnGameStart } from "@/lib/use-navigate-on-game-start";
import { useIsMobile } from "@/lib/use-is-mobile";
import { usePlayMode } from "@/lib/use-play-mode";
import { getRoomReconnectToken, saveRoomReconnectToken } from "@/lib/room-reconnect-token";
import { useTranslation } from "@/lib/i18n";
import { limitPlayerName, normalizePlayerName } from "@/lib/player-name";
import { useSocket } from "@/lib/use-socket";
import { SPECIAL_QUIZZES } from "@/lib/quiz";
import { QRCode } from "react-qrcode-logo";
import { toast } from "sonner";

export { useIsMobile } from "@/lib/use-is-mobile";

const GUEST_ID_KEY = 'party-hub-join-guest-id';
const ROOM_CLOSED_NOTICE_KEY = 'party-hub-room-closed-notice';
const ROOM_CLOSED_MESSAGE = { ru: 'Комната закрыта', en: 'Room closed' };

function getGuestPlayerId(): string {
  if (typeof window === 'undefined') return '';
  const existing = window.localStorage.getItem(GUEST_ID_KEY);
  if (existing) return existing;
  const next = `guest_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  window.localStorage.setItem(GUEST_ID_KEY, next);
  return next;
}

function getBrowserLocale(): 'ru' | 'en' {
  if (typeof window === 'undefined') return 'ru';
  return window.location.pathname.startsWith('/en') || window.navigator.language.startsWith('en') ? 'en' : 'ru';
}

interface GameInfo {
  id: GameId;
  name: string;
  /** Two-word title: word + accent. Accent gets gradient. */
  heroTitle: { word: string; accent: string };
  description: string;
  players: string;
  duration: string;
  mode: string;
  rules: {
    sections: Array<{ title: string; items: string[] }>;
  };
}

interface RoomCreateResponse {
  success: boolean;
  code?: string;
  roomId?: string;
  reconnectToken?: string;
  error?: string;
}

interface RoomJoinResponse {
  success: boolean;
  code?: string;
  roomId?: string;
  reconnectToken?: string;
  error?: string;
}

interface RoomPlayer {
  id: string;
  nickname: string;
  isHost: boolean;
  isConnected: boolean;
  isAway: boolean;
  role?: "tv" | "player";
}

interface RoomState {
  players: RoomPlayer[];
  ownerId: string;
  hostId: string;
  tvConnected?: boolean;
  currentGame?: string | null;
  gameHostPlayerId?: string | null;
  showQrCode?: boolean;
  locale?: 'ru' | 'en';
}

type PendingQuizConfig = {
  mode: 'general' | 'special';
  difficulty: string;
  topic: string;
  specialQuizId: string | null;
};

const games: GameInfo[] = [
  {
    id: "mafia",
    name: "Мафия",
    heroTitle: { word: "Ночной", accent: "город" },
    description:
      "Шесть игроков за столом, и кто-то из них точно врёт. Найди мафию раньше, чем она найдёт тебя.",
    players: "5–17 игроков",
    duration: "≈ 20 минут",
    mode: "Роли",
    rules: { sections: [
        {
          title: "Роли",
          items: [
            "Мафия — убивает одного игрока каждую ночь",
            "Доктор — спасает одного игрока каждую ночь",
            "Детектив — узнаёт роль одного игрока за ночь",
            "Мирный житель — не имеет особых способностей",
          ],
        },
        {
          title: "Ход игры",
          items: [
            "Ночь: мафия выбирает жертву → доктор спасает → детектив проверяет",
            "День: игроки обсуждают и голосуют за подозреваемого",
            "Набравший больше голосов выбывает из игры",
          ],
        },
        {
          title: "Победа",
          items: [
            "Мирные: устранить всех членов мафии",
            "Мафия: сравняться по числу с мирными",
          ],
        },
      ] },
  },
  {
    id: "quiz",
    name: "Квиз",
    heroTitle: { word: "Битва", accent: "эрудитов" },
    description:
      "Сегодня — мозговая разминка для всей компании. Сотни вопросов, четыре варианта, секунды на ответ.",
    players: "2–10 игроков",
    duration: "≈ 15 минут",
    mode: "Команды",
    rules: { sections: [
        {
          title: "Как играть",
          items: [
            "Ведущий выбирает тему и сложность вопросов",
            "Вопрос и 4 варианта ответа появляются на экране",
            "Каждый игрок отвечает на своём телефоне",
            "Таймер ограничивает время на ответ",
          ],
        },
        {
          title: "Очки",
          items: [
            "Правильный ответ приносит очки",
            "Чем быстрее ответишь — тем больше бонус за скорость",
            "Неправильный ответ очков не приносит",
          ],
        },
        {
          title: "Победа",
          items: ["Побеждает игрок с наибольшим количеством очков"],
        },
      ] },
  },
  {
    id: "crocodile",
    name: "Крокодил",
    heroTitle: { word: "Без", accent: "слов" },
    description:
      "Покажи слово жестами, нарисуй на бумаге, изобрази звуком. Главное — никакой речи.",
    players: "2–10 игроков",
    duration: "≈ 15 минут",
    mode: "По очереди",
    rules: { sections: [
        {
          title: "Как играть",
          items: [
            "По очереди один игрок объясняет слово",
            "Можно использовать жесты, мимику, звуки",
            "Нельзя говорить само слово и однокоренные",
            "Нельзя показывать буквы руками",
          ],
        },
        {
          title: "Очки",
          items: [
            "+1 очко объясняющему за каждое угаданное слово",
            "Пропущенные слова очков не приносят",
          ],
        },
        {
          title: "Победа",
          items: ["Побеждает первый игрок, который угадает 20 слов"],
        },
      ] },
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
    rules: { sections: [
        {
          title: "Как играть",
          items: [
            "Все получают карточку с секретной локацией — кроме шпиона",
            "Игроки по очереди задают друг другу вопросы о локации",
            "Шпион пытается не раскрыться, отвечая уклончиво",
          ],
        },
        {
          title: "Победа",
          items: [
            "Мирные: проголосовать за шпиона до конца раунда",
            "Шпион: угадать локацию до разоблачения",
          ],
        },
      ] },
  },
  {
    id: "alias",
    name: "Угадай слово",
    heroTitle: { word: "Объясни", accent: "быстрее" },
    description:
      "Минута, секундомер и стопка слов. Чем больше угадает команда — тем больше очков.",
    players: "2–10 игроков",
    duration: "≈ 20 минут",
    mode: "На скорость",
    rules: { sections: [
        {
          title: "Режимы",
          items: [
            "Классика: объясняй слова команде любыми словами",
            "Буква: слова на определённую букву, каждый сам за себя",
          ],
        },
        {
          title: "Правила",
          items: [
            "Нельзя использовать однокоренные слова",
            "Нельзя называть само слово или его часть",
            "Таймер ограничивает каждый ход",
          ],
        },
        {
          title: "Победа",
          items: ["Побеждает набравший наибольшее количество очков"],
        },
      ] },
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
    rules: { sections: [
        {
          title: "Как играть",
          items: [
            "Каждому игроку тайно присваивается персонаж или понятие",
            "Ты не знаешь своего персонажа — зато знают все остальные",
            "По очереди задавай вопросы с ответом «Да» или «Нет»",
            "За один ход можно задать несколько вопросов подряд",
          ],
        },
        {
          title: "Победа",
          items: [
            "Угадай своего персонажа первым",
            "Чем быстрее угадаешь — тем лучше",
          ],
        },
      ] },
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
    rules: { sections: [
        {
          title: "Как играть",
          items: [
            "Две команды соревнуются за банк очков",
            "100 человек уже ответили на вопрос — нужно угадать их ответы",
            "Три страйка (неверных ответа) — ход уходит к сопернику",
          ],
        },
        {
          title: "Раунды",
          items: [
            "Простая: стандартные очки",
            "Двойная: очки удвоены",
            "Тройная: очки утроены",
            "Наоборот: побеждает набравший меньше (редкие ответы)",
          ],
        },
        {
          title: "Финал",
          items: [
            "После 4 раундов — Большая игра",
            "Два игрока от победившей команды отвечают по очереди",
            "Набери 200 очков — и весь приз достанется команде",
          ],
        },
      ] },
  },
];

function useIsNarrowDesktop() {
  const [isNarrowDesktop, setIsNarrowDesktop] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1025px) and (max-width: 1100px)");
    const onChange = () => setIsNarrowDesktop(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return isNarrowDesktop;
}

interface LobbyProps {
  /** If provided, lobby starts already attached to an existing room. */
  initialRoomCode?: string;
}

// ============================================================
// Lobby
// ============================================================

export function Lobby({ initialRoomCode }: LobbyProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { user, isLoading, logout } = useAuth();
  const { setLocale } = useTranslation();
  const { emit, on, isConnected } = useSocket();
  const { mode } = usePlayMode();
  const myRole: "tv" | "player" = mode === "desktop" ? "tv" : "player";
  const initialCode = initialRoomCode?.trim().toUpperCase() || null;
  const isRoomRoute = initialCode !== null;
  const [activeGame, setActiveGame] = useState<GameId>("quiz");
  const [roomCode, setRoomCode] = useState<string | null>(initialCode);
  const [joinCode, setJoinCode] = useState("");
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [guestPlayerId, setGuestPlayerId] = useState('');
  const [localIp, setLocalIp] = useState<string>('');
  const [roomMenuOpen, setRoomMenuOpen] = useState(false);
  const [authMenuOpen, setAuthMenuOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [isWaitingForPlayers, setIsWaitingForPlayers] = useState(false);
  const [quizSelectionOpen, setQuizSelectionOpen] = useState(false);
  const [quizGeneralConfigOpen, setQuizGeneralConfigOpen] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [, setQuizMode] = useState<"general" | "special">("general");
  const [quizDifficulty, setQuizDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [quizTopic, setQuizTopic] = useState<"random" | "science" | "history" | "pop-culture">("random");
  const [pendingQuizConfig, setPendingQuizConfig] = useState<PendingQuizConfig | null>(null);
  const [, setIsCreatingRoom] = useState(false);
  const [isJoiningRoom, setIsJoiningRoom] = useState(false);
  const roomStateShowQrCode = roomState?.showQrCode;
  const roomMenuRef = useRef<HTMLDivElement>(null);
  const tileStripRef = useRef<HTMLDivElement>(null);
  const startGameButtonRef = useRef<HTMLButtonElement>(null);
  const isMobile = useIsMobile();
  const isNarrowDesktop = useIsNarrowDesktop();
  const openAuth = useCallback(() => setAuthMenuOpen(true), []);
  const closeAuth = useCallback(() => setAuthMenuOpen(false), []);
  const openAccountMenu = useCallback(() => setAccountMenuOpen(true), []);
  const closeAccountMenu = useCallback(() => setAccountMenuOpen(false), []);

  useEffect(() => {
    document.documentElement.classList.add("dark");
    return () => document.documentElement.classList.remove("dark");
  }, []);

  useEffect(() => {
    fetch('/api/local-ip')
      .then((response) => response.json())
      .then((data: { ip: string }) => {
        if (data.ip) setLocalIp(data.ip);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    queueMicrotask(() => setGuestPlayerId(getGuestPlayerId()));
  }, []);

  useEffect(() => {
    const notice = window.sessionStorage.getItem(ROOM_CLOSED_NOTICE_KEY);
    if (!notice) return;
    window.sessionStorage.removeItem(ROOM_CLOSED_NOTICE_KEY);
    toast.error(ROOM_CLOSED_MESSAGE[getBrowserLocale()]);
  }, []);

  useEffect(() => {
    if (searchParams.get("m") !== "1") return;
    queueMicrotask(() => setRoomMenuOpen(true));
    router.replace(pathname);
  }, [pathname, router, searchParams]);

  useEffect(() => {
    const gameParam = searchParams.get("game") as GameId | null;
    if (gameParam && games.some((g) => g.id === gameParam)) {
      setActiveGame(gameParam);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isMobile) return;
    document.body.classList.add("lobby-mobile-locked");
    return () => {
      document.body.classList.remove("lobby-mobile-locked");
    };
  }, [isMobile]);

  useEffect(() => {
    if (initialCode) {
      queueMicrotask(() => setRoomCode(initialCode));
    }
  }, [initialCode]);

  useEffect(() => {
    if (!isRoomRoute || isLoading || user) return;
    queueMicrotask(() => setAuthMenuOpen(true));
  }, [isLoading, isRoomRoute, user]);

  useEffect(() => {
    const unsubscribe = on('room:state', (data: unknown) => {
      const payload = data as Partial<RoomState>;
      setRoomState({
        players: Array.isArray(payload.players) ? payload.players : [],
        ownerId: typeof payload.ownerId === "string" ? payload.ownerId : "",
        hostId: typeof payload.hostId === "string" ? payload.hostId : "",
        tvConnected: typeof payload.tvConnected === "boolean" ? payload.tvConnected : false,
        currentGame: typeof payload.currentGame === "string" ? payload.currentGame : null,
        gameHostPlayerId: typeof payload.gameHostPlayerId === "string" ? payload.gameHostPlayerId : null,
        showQrCode: typeof payload.showQrCode === "boolean" ? payload.showQrCode : false,
        locale: payload.locale === 'en' ? 'en' : 'ru',
      });
      if (payload.locale === 'ru' || payload.locale === 'en') setLocale(payload.locale);
    });

    return unsubscribe;
  }, [on, setLocale]);

  useEffect(() => {
    if (roomCode && isConnected) {
      emit('room:get-state', { code: roomCode });
    }
  }, [emit, isConnected, roomCode]);

  useEffect(() => {
    const code = initialCode || roomCode;
    if (!code || !user || !user.nickname || !isConnected) return;
    emit('room:join', {
      code,
      playerId: user.id,
      nickname: user.nickname,
      isReconnect: true,
      role: myRole,
      reconnectToken: getRoomReconnectToken(code, user.id),
    }, (res: unknown) => {
      const response = res as { success: boolean; reconnectToken?: string };
      if (!response.success) {
        setRoomCode(null);
        setRoomState(null);
        if (isRoomRoute) router.push('/');
      }
    });
  }, [emit, initialCode, roomCode, isConnected, isRoomRoute, myRole, router, user]);

  // Only emit room:leave when navigating away from a room route,
  // NOT on socket reconnect (isConnected changes must not trigger this).
  useEffect(() => {
    if (isRoomRoute || !isConnected) return;
    emit('room:leave', {});
    setRoomCode(null);
    setRoomState(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRoomRoute, emit]);

  useEffect(() => {
    const unsubscribe = on('room:kicked', () => {
      setRoomCode(null);
      setRoomState(null);
      setRoomMenuOpen(false);
      toast.error("Вас удалили из комнаты");
      if (isRoomRoute) {
        router.push("/");
        return;
      }
    });

    return unsubscribe;
  }, [isRoomRoute, on, router]);

  useEffect(() => {
    const unsubscribe = on('room:closed', () => {
      setRoomCode(null);
      setRoomState(null);
      setRoomMenuOpen(false);
      setIsWaitingForPlayers(false);
      setQuizSelectionOpen(false);
      setQuizGeneralConfigOpen(false);
      toast.error(ROOM_CLOSED_MESSAGE[getBrowserLocale()]);
      router.push('/');
    });

    return unsubscribe;
  }, [on, router]);

  useEffect(() => {
    const unsubscribe = on('room:not-found', () => {
      setRoomCode(null);
      setRoomState(null);
      setRoomMenuOpen(false);
      if (isRoomRoute) {
        router.push('/');
      }
    });
    return unsubscribe;
  }, [isRoomRoute, on, router]);

  useNavigateOnGameStart(
    ({ roomCode, gameType }) =>
      myRole === 'tv'
        ? `/tv/${roomCode}/${gameType}`
        : `/game/${roomCode}/${gameType}`,
    () => setIsWaitingForPlayers(false),
  );

  useEffect(() => {
    return on('room:show-qr', (data: unknown) => {
      const show = (data as { show?: boolean } | undefined)?.show !== false;
      setIsWaitingForPlayers(show);
    });
  }, [on]);

  useEffect(() => {
    if (myRole !== "tv" || roomStateShowQrCode === undefined) return;
    queueMicrotask(() => setIsWaitingForPlayers(roomStateShowQrCode));
  }, [myRole, roomStateShowQrCode]);

  const getPlayerPayload = useCallback(() => {
    if (!user?.id || !user.nickname) {
      toast.error("Войдите в профиль, чтобы создать или присоединиться к комнате");
      setAuthMenuOpen(true);
      return null;
    }

    return { playerId: user.id, nickname: normalizePlayerName(user.nickname) };
  }, [user]);

  const createRoom = useCallback(() => {
    const player = getPlayerPayload();
    if (!player) return Promise.resolve<RoomCreateResponse>({ success: false, error: "Auth required" });

    if (!isConnected) {
      const error = "Нет подключения к серверу";
      toast.error(error);
      return Promise.resolve<RoomCreateResponse>({ success: false, error });
    }

    setIsCreatingRoom(true);

    return new Promise<RoomCreateResponse>((resolve) => {
      const timeout = setTimeout(() => {
        const error = "Сервер не отвечает. Попробуйте ещё раз";
        setIsCreatingRoom(false);
        toast.error(error);
        resolve({ success: false, error });
      }, 5000);

      const sent = emit('room:create', { ...player, role: myRole }, (response: unknown) => {
        clearTimeout(timeout);
        setIsCreatingRoom(false);
        const res = response as RoomCreateResponse;
        if (res.success && res.code) {
          saveRoomReconnectToken(res.code, player.playerId, res.reconnectToken);
          setRoomCode(res.code);
          setRoomMenuOpen(true);
          window.history.pushState({}, "", `/lobby/${res.code}`);
        } else {
          toast.error(res.error || "Не удалось создать комнату");
        }
        resolve(res);
      });

      if (!sent) {
        clearTimeout(timeout);
        const error = "Нет подключения к серверу";
        setIsCreatingRoom(false);
        toast.error(error);
        resolve({ success: false, error });
      }
    });
  }, [emit, getPlayerPayload, isConnected, myRole]);

  const handleJoinRoom = useCallback(() => {
    const code = joinCode.trim().toUpperCase();
    if (code.length !== 6) return;

    const player = getPlayerPayload();
    if (!player) return;

    if (!isConnected) {
      toast.error("Нет подключения к серверу");
      return;
    }

    setIsJoiningRoom(true);

    const timeout = setTimeout(() => {
      setIsJoiningRoom(false);
      toast.error("Сервер не отвечает. Попробуйте ещё раз");
    }, 5000);

    const sent = emit('room:join', {
      code,
      ...player,
      isReconnect: false,
      role: myRole,
      reconnectToken: getRoomReconnectToken(code, player.playerId),
    }, (response: unknown) => {
      clearTimeout(timeout);
      setIsJoiningRoom(false);
      const res = response as RoomJoinResponse;
      if (res.success && res.code) {
        saveRoomReconnectToken(res.code, player.playerId, res.reconnectToken);
        setRoomCode(res.code);
        setJoinCode("");
      } else {
        toast.error(res.error || "Не удалось присоединиться к комнате");
      }
    });

    if (!sent) {
      clearTimeout(timeout);
      setIsJoiningRoom(false);
      toast.error("Нет подключения к серверу");
    }
  }, [emit, getPlayerPayload, isConnected, joinCode, myRole]);

  const isCurrentUserHost =
    !roomCode ||
    roomState?.hostId === user?.id ||
    (!isRoomRoute && roomState == null);
  // TV/creator screen always controls game selection; the phone host only
  // launches (game:start). Without this, isCurrentUserHost is false on the TV
  // once a phone becomes host, disabling the "select game" button after a game ends.
  const canSelectGame = myRole === "tv" || isCurrentUserHost;
  const gameHostPlayerId = roomState?.gameHostPlayerId ?? null;
  const localPlayerIds = [user?.id, guestPlayerId].filter((id): id is string => Boolean(id));
  const isGameHostPhone = Boolean(
    gameHostPlayerId &&
    localPlayerIds.includes(gameHostPlayerId)
  );
  const canAddPlayer = myRole === "tv" || isCurrentUserHost || isGameHostPhone;

  const handleStartGame = useCallback(async (quizConfig?: PendingQuizConfig | null) => {
    if (!canSelectGame) return;

    const existingCode = roomCode;
    const code = existingCode ?? (await createRoom()).code;

    if (!code) return;

    const selectedQuizConfig = activeGame === "quiz" ? quizConfig ?? pendingQuizConfig ?? null : null;
    emit('game:select', { code, gameType: activeGame, quizConfig: selectedQuizConfig });
    setRoomMenuOpen(false);
    setIsWaitingForPlayers(true);
    emit('room:show-qr', { code, show: true });
  }, [activeGame, canSelectGame, createRoom, emit, pendingQuizConfig, roomCode]);

  const handleQuizGeneralConfigConfirm = useCallback(() => {
    const config = {
      mode: "general" as const,
      difficulty: quizDifficulty,
      topic: quizTopic,
      specialQuizId: null,
    };
    setPendingQuizConfig(config);
    setQuizGeneralConfigOpen(false);
    setQuizSelectionOpen(false);
    void handleStartGame(config);
  }, [handleStartGame, quizDifficulty, quizTopic]);

  const handleSelectSpecialQuiz = useCallback((specialQuizId: string) => {
    const config = {
      mode: "special",
      difficulty: "medium",
      topic: "random",
      specialQuizId,
    } as const;
    setPendingQuizConfig(config);
    setQuizSelectionOpen(false);
    void handleStartGame(config);
  }, [handleStartGame]);

  const handleCancelWaiting = useCallback(() => {
    if (roomCode) {
      emit('game:deselect', { code: roomCode });
      emit('room:show-qr', { code: roomCode, show: false });
    }
    setIsWaitingForPlayers(false);
  }, [emit, roomCode]);

  const handleAddPlayer = useCallback(() => {
    if (!roomCode) return;
    if (myRole === "tv" && !roomState?.currentGame) {
      emit('game:select', { code: roomCode, gameType: activeGame });
    }
    emit('room:show-qr', { code: roomCode, show: true });
  }, [activeGame, emit, myRole, roomCode, roomState?.currentGame]);

  const handleEmitStartGame = useCallback(() => {
    if (!roomCode) return;
    emit('room:show-qr', { code: roomCode, show: false });
    emit('game:start', { code: roomCode });
  }, [emit, roomCode]);

  const handleKick = useCallback((playerId: string) => {
    if (!roomCode) return;
    emit('room:kick', { code: roomCode, playerId });
  }, [emit, roomCode]);

  const handleTransferHost = useCallback((playerId: string) => {
    if (!roomCode) return;
    emit('room:transfer-host', { code: roomCode, newHostId: playerId });
  }, [emit, roomCode]);

  const handleLogout = useCallback(() => {
    if (roomCode) {
      emit('room:leave', {});
      setRoomCode(null);
      setRoomState(null);
      setRoomMenuOpen(false);
    }
    setAccountMenuOpen(false);
    logout();
    router.push('/');
  }, [emit, logout, roomCode, router]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      const editable = target?.isContentEditable;
      if (tag === "INPUT" || tag === "TEXTAREA" || editable) return;

      const focused = document.activeElement as HTMLElement | null;
      const focusedCta = focused?.dataset?.lobbyCta;

      if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
        const inTopBar = focused?.dataset?.topbar !== undefined;
        if (inTopBar) {
          e.preventDefault();
          const order = ["play", "avatar"];
          const cur = focused.dataset.topbar!;
          const idx = order.indexOf(cur);
          if (idx === -1) return;

          const direction = e.key === "ArrowRight" ? 1 : -1;
          const next = idx + direction;
          if (next < 0 || next >= order.length) return;

          document.querySelector<HTMLElement>(`[data-topbar="${order[next]}"]`)?.focus();
          return;
        }

        if (focusedCta) {
          e.preventDefault();
          const ctaOrder = ["start", "rules"];
          const idx = ctaOrder.indexOf(focusedCta);
          if (idx === -1) return;

          const direction = e.key === "ArrowRight" ? 1 : -1;
          const next = idx + direction;
          if (next < 0 || next >= ctaOrder.length) return;

          document.querySelector<HTMLElement>(`[data-lobby-cta="${ctaOrder[next]}"]`)?.focus();
          return;
        }

        e.preventDefault();
        const inTileStrip = focused?.dataset?.gameId !== undefined;
        const focusedTag = focused?.tagName;
        const isOnBody = !focused || focusedTag === "BODY" || focusedTag === "HTML";
        const curId = inTileStrip ? focused.dataset.gameId! : activeGame;
        const idx = games.findIndex((g) => g.id === curId);
        const direction = e.key === "ArrowRight" ? 1 : -1;
        const nextIdx = (idx + direction + games.length) % games.length;
        const nextId = games[nextIdx].id;
        setActiveGame(nextId);

        if (inTileStrip || isOnBody) {
          document.querySelector<HTMLElement>(`[data-game-id="${nextId}"]`)?.focus();
        }
      } else if (e.key === "ArrowUp") {
        const focusedTag = focused?.tagName;
        const focusedCta = focused?.dataset?.lobbyCta !== undefined;
        const inTileStrip = focused?.dataset?.gameId !== undefined;
        const isOnBody = !focused || focusedTag === "BODY" || focusedTag === "HTML";
        if (focusedCta) {
          e.preventDefault();
          document.querySelector<HTMLElement>('[data-topbar="play"]')?.focus();
          return;
        }
        if (inTileStrip || isOnBody) {
          e.preventDefault();
          startGameButtonRef.current?.focus();
        }
      } else if (e.key === "ArrowDown") {
        const inTopBar = focused?.dataset?.topbar !== undefined;
        if (inTopBar) {
          e.preventDefault();
          startGameButtonRef.current?.focus();
          return;
        }

        if (focusedCta) {
          e.preventDefault();
          document.querySelector<HTMLElement>(`[data-game-id="${activeGame}"]`)?.focus();
        }
      } else if (e.key === "Enter") {
        const inTileStrip = focused?.dataset?.gameId !== undefined;
        if (inTileStrip) {
          e.preventDefault();
          startGameButtonRef.current?.focus();
          return;
        }

        if (tag !== "BUTTON" && tag !== "A") {
          if (activeGame === "quiz") {
            setQuizSelectionOpen(true);
          } else {
            handleStartGame();
          }
        }
      } else if (e.key === "Escape") {
        const activeElement = document.activeElement as HTMLElement | null;
        if (activeElement && tileStripRef.current?.contains(activeElement)) {
          activeElement.blur();
        }
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeGame, handleStartGame, myRole]);

  const active = games.find((g) => g.id === activeGame)!;
  const accent = gameColors[active.id].accent;
  const deep = gameColors[active.id].deep;
  const startGameLabel = pathname.startsWith("/en") ? "START GAME" : "НАЧАТЬ ИГРУ";
  const selectedRoomGame = roomState?.currentGame
    ? games.find((game) => game.id === roomState.currentGame)
    : null;
  const selectedRoomGameName = selectedRoomGame?.name ?? roomState?.currentGame ?? "";
  const shouldShowGameHostStartBanner =
    myRole === "player" &&
    !isWaitingForPlayers &&
    Boolean(roomState?.currentGame) &&
    (gameHostPlayerId ? localPlayerIds.includes(gameHostPlayerId) : false);

  // QR waiting screen — shown on desktop after "Start game" is pressed.
  if (myRole === "tv" && isWaitingForPlayers && roomCode) {
    const port = typeof window !== 'undefined' ? window.location.port : '3000';
    const siteUrl = localIp
      ? `http://${localIp}${port ? `:${port}` : ''}`
      : (typeof window !== "undefined" ? window.location.origin : "");
    const joinUrl = `${siteUrl}/join/${roomCode}`;
    const gamePlayers = (roomState?.players ?? []).filter((player) => player.role !== "tv" && player.nickname);
    const specialQuizBgUrl = activeGame === 'quiz' && pendingQuizConfig?.specialQuizId
      ? SPECIAL_QUIZZES.find(q => q.id === pendingQuizConfig.specialQuizId)?.backgroundUrl
      : undefined;

    return (
      <main
        style={{
          position: 'relative',
          isolation: 'isolate',
          minHeight: "100vh",
          background:
            `radial-gradient(900px 620px at 65% 20%, ${accent}33, transparent 62%), radial-gradient(760px 560px at 25% 85%, ${deep}38, transparent 64%), #08080d`,
          color: "white",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 28,
          padding: 32,
          textAlign: "center",
        }}
      >
        {specialQuizBgUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={specialQuizBgUrl}
            alt=""
            fetchPriority="high"
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: -1 }}
            aria-hidden="true"
          />
        )}
        <p
          style={{
            color: "rgba(255,255,255,0.52)",
            fontSize: 16,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            fontWeight: 750,
            margin: 0,
          }}
        >
          {active.name}
        </p>

        <div
          style={{
            background: "white",
            borderRadius: 24,
            padding: 20,
            boxShadow: `0 0 72px ${accent}22, 0 28px 80px rgba(0,0,0,0.45)`,
          }}
        >
          <QRCode
            value={joinUrl}
            size={240}
            qrStyle="dots"
            eyeRadius={8}
            removeQrCodeBehindLogo={false}
          />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "center" }}>
          <p style={{ color: "rgba(255,255,255,0.42)", fontSize: 13, margin: 0 }}>
            Отсканируй QR или открой на телефоне:
          </p>
          <p
            style={{
              fontSize: 15,
              fontWeight: 600,
              color: "rgba(255,255,255,0.55)",
              fontFamily: "var(--font-mono)",
              margin: 0,
              letterSpacing: "0.02em",
            }}
          >
            {siteUrl}/join
          </p>
          <p
            style={{
              fontSize: 36,
              fontWeight: 900,
              color: "white",
              fontFamily: "var(--font-mono)",
              margin: 0,
              letterSpacing: "0.18em",
            }}
          >
            {roomCode}
          </p>
        </div>

        <div style={{ textAlign: "center", minHeight: 70 }}>
          {gamePlayers.length === 0 ? (
            <p style={{ color: "rgba(255,255,255,0.34)", fontSize: 15, margin: 0 }}>
              Ожидание игроков...
            </p>
          ) : (
            <>
              <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 13, margin: "0 0 12px" }}>
                Подключились ({gamePlayers.length}):
              </p>
              <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
                {gamePlayers.map((player) => {
                  const isHost = player.id === gameHostPlayerId;

                  return (
                    <span
                      key={player.id}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "7px 14px 7px 8px",
                        borderRadius: radius.full,
                        background: isHost
                          ? `${accent}24`
                          : player.isConnected ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.04)",
                        border: isHost ? `1px solid ${accent}` : "1px solid rgba(255,255,255,0.12)",
                        color: player.isConnected ? "white" : "rgba(255,255,255,0.35)",
                        fontSize: 15,
                        fontWeight: 650,
                      }}
                    >
                      <PlayerAvatar
                        nickname={player.nickname}
                        size="xs"
                        away={!player.isConnected || player.isAway}
                      />
                      {player.nickname}
                      {isHost && (
                        <svg width="15" height="15" viewBox="0 0 24 24" fill={accent} aria-hidden="true">
                          <path d="M3 7l4 4 5-7 5 7 4-4v10H3V7z" />
                        </svg>
                      )}
                    </span>
                  );
                })}
              </div>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={handleCancelWaiting}
          style={{
            padding: "10px 24px",
            borderRadius: 10,
            background: "transparent",
            border: "1px solid rgba(255,255,255,0.16)",
            color: "rgba(255,255,255,0.52)",
            fontSize: 14,
            fontWeight: 650,
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          ← Назад к лобби
        </button>
      </main>
    );
  }

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
        style={{ position: "absolute", inset: 0, zIndex: 0, pointerEvents: "none", transform: "translateZ(0)" }}
      />

      {/* Top bar */}
      <TopBar
        accent={accent}
        deep={deep}
        isMobile={isMobile}
        isNarrowDesktop={isNarrowDesktop}
        user={user}
        authMenuOpen={authMenuOpen}
        accountMenuOpen={accountMenuOpen}
        onOpenAuth={openAuth}
        onCloseAuth={closeAuth}
        onOpenAccountMenu={openAccountMenu}
        onCloseAccountMenu={closeAccountMenu}
        onLogout={handleLogout}
        roomCode={roomCode}
        onOpenRoomMenu={() => setRoomMenuOpen(true)}
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
          padding: isMobile ? "16px 16px" : "32px 32px",
          display: "grid",
          gridTemplateColumns: myRole === "player" || isMobile ? "1fr" : "1fr 1fr",
          gap: isMobile ? 32 : 120,
          alignItems: "center",
        }}
      >
        {myRole === "player" ? (
          <PlayerJoinView
            roomCode={roomCode}
            roomState={roomState}
            joinCode={joinCode}
            setJoinCode={setJoinCode}
            onJoin={handleJoinRoom}
            isJoiningRoom={isJoiningRoom}
            isMobile={isMobile}
            accent={accent}
          />
        ) : (
          <HeroLeft
            game={active}
            accent={accent}
            deep={deep}
            onStartGame={handleStartGame}
            onOpenQuizConfig={() => setQuizSelectionOpen(true)}
            startGameButtonRef={startGameButtonRef}
            isMobile={isMobile}
            isCurrentUserHost={canSelectGame}
            onRules={() => setRulesOpen(true)}
          />
        )}

        <div style={{ display: isMobile ? "none" : "flex", justifyContent: "flex-end" }}>
          <AnimatePresence mode="wait">
            {roomMenuOpen && roomCode ? (
              <RoomMenu
                key="room-menu"
                ref={roomMenuRef}
                roomCode={roomCode}
                roomState={roomState}
                accent={accent}
                deep={deep}
                currentUserId={user?.id ?? ""}
                canAddPlayer={canAddPlayer}
                onKick={handleKick}
                onTransferHost={handleTransferHost}
                onAddPlayer={handleAddPlayer}
                onClose={() => setRoomMenuOpen(false)}
              />
            ) : (
              <TiltedPreview key="tilted-preview" gameId={active.id} />
            )}
          </AnimatePresence>
        </div>
      </section>

      {/* Mobile room menu overlay */}
      {isMobile && roomCode && (
        <>
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0, 0, 0, 0.7)",
              zIndex: 40,
              opacity: roomMenuOpen ? 1 : 0,
              pointerEvents: roomMenuOpen ? "auto" : "none",
              transition: "opacity 0.22s ease-out",
              willChange: "opacity",
            }}
          />
          <div
            style={{
              position: "fixed",
              bottom: 0,
              left: 0,
              right: 0,
              zIndex: 41,
              maxHeight: "88dvh",
              overflowY: "auto",
              padding: "0 12px 24px",
              transform: roomMenuOpen ? "translateY(0)" : "translateY(100%)",
              transition: roomMenuOpen
                ? "transform 0.28s cubic-bezier(0.32, 0.72, 0, 1)"
                : "transform 0.22s cubic-bezier(0.4, 0, 1, 1)",
              willChange: "transform",
              pointerEvents: roomMenuOpen ? "auto" : "none",
            }}
          >
            <RoomMenu
              ref={roomMenuRef}
              roomCode={roomCode}
              roomState={roomState}
              accent={accent}
              deep={deep}
              currentUserId={user?.id ?? ""}
              canAddPlayer={canAddPlayer}
              isMobile={true}
              onKick={handleKick}
              onTransferHost={handleTransferHost}
              onAddPlayer={handleAddPlayer}
              onClose={() => setRoomMenuOpen(false)}
            />
          </div>
        </>
      )}

      {/* Bottom tile strip */}
      {myRole === "tv" && (
        <TileStrip
          ref={tileStripRef}
          games={games}
          activeId={activeGame}
          onSelect={setActiveGame}
          isMobile={isMobile}
        />
      )}
      {shouldShowGameHostStartBanner && (
        <div
          style={{
            position: "fixed",
            bottom: 24,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 30,
            background: "rgba(255,255,255,0.97)",
            color: "#08080d",
            borderRadius: 20,
            padding: "16px 28px",
            display: "flex",
            gap: 16,
            alignItems: "center",
            boxShadow: "0 8px 40px rgba(0,0,0,0.45)",
          }}
        >
          <span style={{ fontSize: 15, fontWeight: 750, whiteSpace: "nowrap" }}>
            {selectedRoomGameName}
          </span>
          <button
            type="button"
            onClick={handleEmitStartGame}
            style={{
              fontWeight: 900,
              fontSize: 16,
              cursor: "pointer",
              border: "none",
              background: "transparent",
              color: "#08080d",
              fontFamily: "inherit",
              whiteSpace: "nowrap",
            }}
          >
            {startGameLabel}
          </button>
        </div>
      )}
      {quizSelectionOpen && (
        <QuizSelectionScreen
          accent={gameColors.quiz.accent}
          onBack={() => {
            setQuizGeneralConfigOpen(false);
            setQuizSelectionOpen(false);
          }}
          onSelectGeneral={() => {
            setQuizMode("general");
            setQuizGeneralConfigOpen(true);
          }}
          onSelectSpecial={(specialQuizId) => handleSelectSpecialQuiz(specialQuizId)}
        />
      )}
      {quizSelectionOpen && quizGeneralConfigOpen && (
        <QuizConfigOverlay
          accent={gameColors.quiz.accent}
          difficulty={quizDifficulty}
          topic={quizTopic}
          onDifficultyChange={setQuizDifficulty}
          onTopicChange={setQuizTopic}
          onConfirm={handleQuizGeneralConfigConfirm}
          onClose={() => setQuizGeneralConfigOpen(false)}
        />
      )}
      <GlassToaster accentColor={accent} />
      <AnimatePresence>
        {rulesOpen && (
          <motion.div
            key="rules-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={() => setRulesOpen(false)}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 80,
              background: "rgba(0,0,0,0.65)",
              backdropFilter: "blur(6px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "20px 16px",
            }}
          >
            <motion.div
              key="rules-panel"
              initial={{ opacity: 0, scale: 0.94, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 16 }}
              transition={{ duration: 0.22, ease: [0.34, 1.56, 0.64, 1] }}
              onClick={(e) => e.stopPropagation()}
              style={{
                background: "rgba(18,20,32,0.92)",
                border: "1px solid rgba(255,255,255,0.14)",
                borderRadius: 20,
                padding: "28px 28px 32px",
                maxWidth: 480,
                width: "100%",
                maxHeight: "85vh",
                overflowY: "auto",
                boxShadow: "0 24px 64px rgba(0,0,0,0.6)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 24,
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: 12,
                      letterSpacing: "0.12em",
                      textTransform: "uppercase",
                      color: `${accent}cc`,
                      fontWeight: 700,
                      marginBottom: 4,
                    }}
                  >
                    Правила
                  </div>
                  <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, letterSpacing: "-0.02em" }}>
                    {active.name}
                  </h2>
                </div>
                <button
                  onClick={() => setRulesOpen(false)}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    background: "rgba(255,255,255,0.08)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    color: "rgba(255,255,255,0.7)",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 18,
                    lineHeight: 1,
                    fontFamily: "inherit",
                  }}
                >
                  ✕
                </button>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                {active.rules.sections.map((section) => (
                  <div key={section.title}>
                    <div
                      style={{
                        fontSize: 11,
                        letterSpacing: "0.12em",
                        textTransform: "uppercase",
                        color: "rgba(255,255,255,0.45)",
                        fontWeight: 700,
                        marginBottom: 8,
                      }}
                    >
                      {section.title}
                    </div>
                    <ul
                      style={{
                        margin: 0,
                        padding: 0,
                        listStyle: "none",
                        display: "flex",
                        flexDirection: "column",
                        gap: 6,
                      }}
                    >
                      {section.items.map((item, i) => (
                        <li
                          key={i}
                          style={{
                            display: "flex",
                            gap: 10,
                            alignItems: "flex-start",
                            fontSize: 14,
                            lineHeight: 1.5,
                            color: "rgba(255,255,255,0.82)",
                          }}
                        >
                          <span style={{ color: `${accent}cc`, fontWeight: 700, flexShrink: 0, marginTop: 1 }}>
                            —
                          </span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}

// ============================================================
// Top bar
// ============================================================

function TopBar({
  accent,
  deep,
  isMobile,
  isNarrowDesktop,
  user,
  authMenuOpen,
  accountMenuOpen,
  onOpenAuth,
  onCloseAuth,
  onOpenAccountMenu,
  onCloseAccountMenu,
  onLogout,
  roomCode,
  onOpenRoomMenu,
}: {
  accent: string;
  deep: string;
  isMobile: boolean;
  isNarrowDesktop: boolean;
  user: User | null;
  authMenuOpen: boolean;
  accountMenuOpen: boolean;
  onOpenAuth: () => void;
  onCloseAuth: () => void;
  onOpenAccountMenu: () => void;
  onCloseAccountMenu: () => void;
  onLogout: () => void;
  roomCode?: string | null;
  onOpenRoomMenu?: () => void;
}) {
  const compact = isNarrowDesktop && !isMobile;

  return (
    <header
      style={{
        position: "relative",
        zIndex: 5,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: isMobile ? "12px 16px" : compact ? "20px 20px" : "20px 32px",
        gap: isMobile ? 12 : compact ? 12 : 24,
      }}
    >
      {/* Left: brand + nav */}
      <div style={{ display: "flex", alignItems: "center", gap: 24, minWidth: 0, overflow: "hidden" }}>
        <BrandMark isMobile={isMobile} />
        <nav style={{ display: isMobile ? "none" : "flex", gap: 4, overflow: "clip" }}>
          <NavButton active topbarId="play" isNarrowDesktop={compact}>
            Играть
          </NavButton>
        </nav>
      </div>

      {/* Right: avatar */}
      <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 8 : compact ? 8 : 12, flexShrink: 0 }}>
        {roomCode && onOpenRoomMenu && (
          <button
            type="button"
            onClick={onOpenRoomMenu}
            style={{
              padding: "8px 14px",
              borderRadius: 999,
              background: "rgba(255,255,255,0.09)",
              border: "1px solid rgba(255,255,255,0.14)",
              color: "white",
              fontWeight: 700,
              fontSize: 13,
              letterSpacing: "0.08em",
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            {roomCode}
          </button>
        )}
        <div style={{ position: "relative" }}>
          <AvatarPill
            user={user}
            isMobile={isMobile}
            isNarrowDesktop={compact}
            topbarId="avatar"
            onLoginClick={onOpenAuth}
            onAccountClick={onOpenAccountMenu}
          />
          <AnimatePresence>
            {authMenuOpen && (
              <AuthDropdown
                key="auth-dropdown"
                isMobile={isMobile}
                accent={accent}
                deep={deep}
                onClose={onCloseAuth}
              />
            )}
          </AnimatePresence>
          <AnimatePresence>
            {accountMenuOpen && (
              <AccountDropdown
                key="account-dropdown"
                isMobile={isMobile}
                onClose={onCloseAccountMenu}
                onLogout={onLogout}
              />
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}

function BrandMark({ isMobile = false }: { isMobile?: boolean }) {
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
      {!isMobile && (
        <div
          style={{
            fontWeight: 700,
            fontSize: 17,
            letterSpacing: "-0.02em",
            whiteSpace: "nowrap",
          }}
        >
          Party Hub
        </div>
      )}
    </div>
  );
}

function NavButton({
  children,
  active = false,
  topbarId,
  isNarrowDesktop = false,
  onClick,
  disabled = false,
}: {
  children: React.ReactNode;
  active?: boolean;
  topbarId?: string;
  isNarrowDesktop?: boolean;
  onClick?: () => void;
  disabled?: boolean;
}) {
  const [focused, setFocused] = useState(false);

  return (
    <motion.button
      data-topbar={topbarId}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      whileHover={disabled ? undefined : { scale: 1.02 }}
      whileTap={disabled ? undefined : { scale: 0.97 }}
      transition={spring.snappy}
      style={{
        padding: isNarrowDesktop ? "10px 14px" : "10px 20px",
        borderRadius: radius.full,
        background: active ? "rgba(255, 255, 255, 0.1)" : "transparent",
        border: active ? "1px solid rgba(255, 255, 255, 0.12)" : "1px solid transparent",
        color: active ? "white" : "rgba(255, 255, 255, 0.55)",
        fontFamily: "inherit",
        fontSize: isNarrowDesktop ? 14 : 15,
        fontWeight: 600,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.4 : 1,
        letterSpacing: "-0.01em",
        outline: "none",
        boxShadow: focused ? "0 0 0 2px rgba(255,255,255,0.6)" : "none",
      }}
    >
      {children}
    </motion.button>
  );
}

function AvatarPill({
  user,
  isMobile = false,
  isNarrowDesktop = false,
  topbarId,
  onLoginClick,
  onAccountClick,
}: {
  user: User | null;
  isMobile?: boolean;
  isNarrowDesktop?: boolean;
  topbarId?: string;
  onLoginClick: () => void;
  onAccountClick: () => void;
}) {
  const [focused, setFocused] = useState(false);
  if (!user) {
    return (
      <motion.button
        data-topbar={topbarId}
        onClick={onLoginClick}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        transition={spring.snappy}
        style={{
          padding: isNarrowDesktop ? "8px 14px" : "8px 20px",
          borderRadius: radius.full,
          background: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.15)",
          color: "rgba(255,255,255,0.9)",
          fontFamily: "inherit",
          fontSize: isNarrowDesktop ? 13 : 14,
          fontWeight: 600,
          cursor: "pointer",
          outline: "none",
          letterSpacing: "-0.01em",
          boxShadow: focused ? "0 0 0 3px rgba(255,255,255,0.6)" : "none",
        }}
      >
        Вход
      </motion.button>
    );
  }

  return (
    <motion.button
      data-topbar={topbarId}
      onClick={onAccountClick}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      transition={spring.snappy}
      style={{
        display: "flex",
        alignItems: "center",
        gap: isMobile ? 0 : isNarrowDesktop ? 8 : 10,
        padding: isMobile ? 5 : isNarrowDesktop ? "5px 12px 5px 5px" : "5px 16px 5px 5px",
        borderRadius: radius.full,
        background: "rgba(255, 255, 255, 0.04)",
        border: "1px solid rgba(255, 255, 255, 0.08)",
        outline: "none",
        cursor: "pointer",
        boxShadow: focused ? "0 0 0 3px rgba(255,255,255,0.6)" : "none",
        fontFamily: "inherit",
        color: "inherit",
      }}
    >
      <PlayerAvatar nickname={user.nickname} size="sm" />
      {!isMobile && <span style={{ fontSize: 14, fontWeight: 600 }}>{user.nickname}</span>}
    </motion.button>
  );
}

function AuthDropdown({
  isMobile,
  accent,
  deep,
  onClose,
}: {
  isMobile: boolean;
  accent: string;
  deep: string;
  onClose: () => void;
}) {
  const { sendCode, verifyCode, updateNickname } = useAuthActions();
  const [step, setStep] = useState<'phone' | 'code' | 'nickname'>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [nickname, setNickname] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const formatPhone = (value: string) => {
    let digits = value.replace(/\D/g, '');
    if (digits.length === 0) return '';
    // Auto-prepend country code 7 if missing
    if (digits[0] !== '7') digits = '7' + digits;
    digits = digits.slice(0, 11);
    if (digits.length <= 1) return '+' + digits;
    if (digits.length <= 4) return `+${digits[0]} (${digits.slice(1)}`;
    if (digits.length <= 7) return `+${digits[0]} (${digits.slice(1, 4)}) ${digits.slice(4)}`;
    if (digits.length <= 9) return `+${digits[0]} (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
    return `+${digits[0]} (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7, 9)}-${digits.slice(9, 11)}`;
  };

  const handleSendCode = async () => {
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 11) {
      setError('Введите корректный номер');
      return;
    }
    setLoading(true);
    await sendCode(digits);
    setLoading(false);
    setStep('code');
    setError('');
  };

  const handleVerifyCode = async () => {
    if (code.length < 4) {
      setError('Введите 4-значный код');
      return;
    }
    setLoading(true);
    const digits = phone.replace(/\D/g, '');
    const ok = await verifyCode(digits, code);
    setLoading(false);
    if (ok) {
      setStep('nickname');
      setError('');
    } else {
      setError('Неверный код');
    }
  };

  const handleSetNickname = () => {
    const normalizedNickname = normalizePlayerName(nickname);
    if (normalizedNickname.length < 2) {
      setError('Минимум 2 символа');
      return;
    }
    updateNickname(normalizedNickname);
    onClose();
  };

  const containerStyle: React.CSSProperties = isMobile
    ? {
        position: 'fixed',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
        background: `radial-gradient(ellipse 120% 70% at 70% 30%, ${accent}44, transparent 60%), radial-gradient(ellipse 100% 80% at 20% 70%, ${deep}55, transparent 60%), rgba(6,6,12,0.92)`,
        padding: 24,
      }
    : {
        position: 'absolute',
        top: 'calc(100% + 8px)',
        right: 0,
        zIndex: 100,
      };

  const panelStyle: React.CSSProperties = {
    width: isMobile ? '100%' : 320,
    maxWidth: isMobile ? 400 : undefined,
    ...glassMobileSolid(isMobile, 'rgba(255,255,255,0.28)'),
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 20,
    padding: 24,
    boxShadow: `0 24px 64px rgba(0,0,0,0.5), 0 0 0 1px ${accent}22`,
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '12px 16px',
    borderRadius: 12,
    background: 'rgba(0,0,0,0.32)',
    border: '1px solid rgba(255,255,255,0.22)',
    color: 'white',
    fontFamily: 'inherit',
    fontSize: 16,
    outline: 'none',
    boxSizing: 'border-box',
  };

  const btnStyle = (primary = true): React.CSSProperties => ({
    width: '100%',
    padding: '12px 20px',
    borderRadius: 12,
    background: primary ? 'rgba(255,255,255,0.75)' : 'rgba(0,0,0,0.32)',
    border: primary ? 'none' : '1px solid rgba(255,255,255,0.22)',
    color: primary ? '#06060c' : 'rgba(255,255,255,1)',
    fontFamily: 'inherit',
    fontSize: 15,
    fontWeight: 600,
    cursor: loading ? 'not-allowed' : 'pointer',
    opacity: loading ? 0.6 : 1,
    letterSpacing: '-0.01em',
  });

  return (
    <motion.div
      {...motionPropsInstant(isMobile, {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        transition: { duration: 0.15, ease: 'easeOut' },
      })}
      style={containerStyle}
    >
      <div ref={ref} style={panelStyle}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {(step === 'code' || step === 'nickname') && (
              <button
                onClick={() => {
                  if (step === 'code') { setStep('phone'); setCode(''); setError(''); }
                  if (step === 'nickname') { setStep('code'); setNickname(''); setError(''); }
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'rgba(255,255,255,0.7)',
                  fontSize: 28, lineHeight: 1,
                  cursor: 'pointer',
                  padding: '0 4px 0 0',
                  fontFamily: 'inherit', flexShrink: 0,
                }}
              >
                ‹
              </button>
            )}
            <span style={{ fontSize: 16, fontWeight: 700, color: 'white' }}>
              {step === 'phone' && 'Вход'}
              {step === 'code' && 'Введите код'}
              {step === 'nickname' && 'Как вас зовут?'}
            </span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: 20, lineHeight: 1 }}>×</button>
        </div>

        {step === 'phone' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 8 }}>Номер телефона</div>
              <input
                style={inputStyle}
                type="tel"
                placeholder="+7 (999) 123-45-67"
                value={phone}
                onChange={(e) => { setPhone(formatPhone(e.target.value)); setError(''); }}
                onKeyDown={(e) => { if (e.key === 'Enter') void handleSendCode(); }}
                autoFocus
              />
            </div>
            {error && <p style={{ fontSize: 13, color: '#ff453a', margin: 0 }}>{error}</p>}
            <button style={btnStyle()} onClick={() => void handleSendCode()} disabled={loading}>
              {loading ? 'Отправка...' : 'Получить код'}
            </button>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)', textAlign: 'center', margin: 0 }}>
              Demo: код подтверждения — 1234
            </p>
          </div>
        )}

        {step === 'code' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', textAlign: 'center', margin: 0 }}>
              Код отправлен на <span style={{ color: 'rgba(255,255,255,0.8)', fontFamily: 'var(--font-mono)' }}>{phone}</span>
            </p>
            <input
              style={{ ...inputStyle, textAlign: 'center', fontSize: 24, letterSpacing: '0.5em', fontFamily: 'var(--font-mono)' }}
              type="text"
              inputMode="numeric"
              maxLength={4}
              placeholder="1234"
              value={code}
              onChange={(e) => { setCode(e.target.value.replace(/\D/g, '').slice(0, 4)); setError(''); }}
              onKeyDown={(e) => { if (e.key === 'Enter') void handleVerifyCode(); }}
              autoFocus
            />
            {error && <p style={{ fontSize: 13, color: '#ff453a', margin: 0 }}>{error}</p>}
            <button style={btnStyle()} onClick={() => void handleVerifyCode()} disabled={loading}>
              {loading ? 'Проверка...' : 'Войти'}
            </button>
          </div>
        )}

        {step === 'nickname' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 8 }}>Ваше имя в игре</div>
              <input
                style={inputStyle}
                type="text"
                placeholder="Введите никнейм"
                value={nickname}
                onChange={(e) => { setNickname(limitPlayerName(e.target.value)); setError(''); }}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSetNickname(); }}
                autoFocus
              />
            </div>
            {error && <p style={{ fontSize: 13, color: '#ff453a', margin: 0 }}>{error}</p>}
            <button style={btnStyle()} onClick={handleSetNickname} disabled={loading || nickname.trim().length < 2}>
              Готово
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function AccountDropdown({
  isMobile,
  onClose,
  onLogout,
}: {
  isMobile: boolean;
  onClose: () => void;
  onLogout: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [confirmLogout, setConfirmLogout] = useState(false);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const containerStyle: React.CSSProperties = isMobile
    ? {
        position: 'fixed',
        inset: 0,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'flex-end',
        zIndex: 100,
        background: 'rgba(0,0,0,0.35)',
        padding: '72px 16px 16px',
      }
    : {
        position: 'absolute',
        top: 'calc(100% + 8px)',
        right: 0,
        zIndex: 100,
      };

  const panelStyle: React.CSSProperties = {
    width: 220,
    ...glassMobileSolid(isMobile, 'rgba(255,255,255,0.08)'),
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 16,
    padding: 8,
    boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
  };

  const itemStyle: React.CSSProperties = {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '12px 14px',
    borderRadius: 10,
    background: 'transparent',
    border: 'none',
    color: 'rgba(255,255,255,0.88)',
    fontFamily: 'inherit',
    fontSize: 14,
    fontWeight: 600,
    textAlign: 'left',
    cursor: 'pointer',
  };

  return (
    <motion.div
      {...motionPropsInstant(isMobile, {
        initial: { opacity: 0, y: -8, scale: 0.97 },
        animate: { opacity: 1, y: 0, scale: 1 },
        exit: { opacity: 0, y: -8, scale: 0.97 },
        transition: spring.snappy,
      })}
      style={containerStyle}
      onClick={isMobile ? onClose : undefined}
    >
      <div
        ref={ref}
        style={panelStyle}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          style={itemStyle}
          onClick={() => undefined}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
        >
          <span aria-hidden="true">⚙️</span>
          Настройки
        </button>
        {!confirmLogout ? (
          <button
            type="button"
            style={{ ...itemStyle, color: '#ff6b6b' }}
            onClick={() => setConfirmLogout(true)}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,107,107,0.1)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          >
            <span aria-hidden="true">🚪</span>
            Выход
          </button>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '4px 0' }}>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', padding: '0 14px 4px' }}>
              Выйти из аккаунта?
            </div>
            <button
              type="button"
              style={{ ...itemStyle, color: '#ff6b6b', fontWeight: 700 }}
              onClick={() => { onLogout(); onClose(); }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,107,107,0.15)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >
              Да, выйти
            </button>
            <button
              type="button"
              style={itemStyle}
              onClick={() => setConfirmLogout(false)}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >
              Отмена
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// Inline component — join screen for mobile players
function PlayerJoinView({
  roomCode,
  roomState,
  joinCode,
  setJoinCode,
  onJoin,
  isJoiningRoom,
  isMobile,
  accent,
}: {
  roomCode: string | null;
  roomState: RoomState | null;
  joinCode: string;
  setJoinCode: (v: string) => void;
  onJoin: () => void;
  isJoiningRoom: boolean;
  isMobile: boolean;
  accent: string;
}) {
  const gamePlayers = (roomState?.players ?? []).filter((p) => p.role !== "tv" && p.nickname);
  const selectedGame = roomState?.currentGame
    ? games.find((game) => game.id === roomState.currentGame)?.name ?? roomState.currentGame
    : null;
  const canJoin = joinCode.length === 6 && !isJoiningRoom;

  if (roomCode) {
    return (
      <div
        style={{
          width: "100%",
          maxWidth: 520,
          margin: "0 auto",
          textAlign: "center",
          padding: isMobile ? "32px 4px 96px" : "56px 16px",
        }}
      >
        {selectedGame && (
          <p
            style={{
              color: "rgba(255,255,255,0.56)",
              margin: "0 0 10px",
              fontSize: 14,
              fontWeight: 650,
            }}
          >
            Игра: {selectedGame}
          </p>
        )}
        <h1
          style={{
            margin: "0 0 24px",
            fontSize: isMobile ? 28 : 34,
            lineHeight: 1.08,
            fontWeight: 850,
            letterSpacing: "-0.02em",
          }}
        >
          Ожидание хоста...
        </h1>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 10,
            justifyContent: "center",
            marginBottom: 22,
          }}
        >
          {gamePlayers.map((player) => (
            <span
              key={player.id}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                minHeight: 38,
                padding: "7px 12px 7px 8px",
                borderRadius: radius.full,
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.12)",
                color: player.isConnected ? "rgba(255,255,255,0.92)" : "rgba(255,255,255,0.36)",
                fontSize: 14,
                fontWeight: 650,
              }}
            >
              <PlayerAvatar
                nickname={player.nickname}
                size="xs"
                away={!player.isConnected || player.isAway}
              />
              {player.nickname}
            </span>
          ))}
        </div>
        <p style={{ margin: 0, color: "rgba(255,255,255,0.46)", fontSize: 14 }}>
          Хост запустит игру на большом экране
        </p>
      </div>
    );
  }

  return (
    <div
      style={{
        width: "100%",
        maxWidth: 440,
        margin: "0 auto",
        textAlign: "center",
        padding: isMobile ? "32px 4px 96px" : "56px 16px",
      }}
    >
      <h1
        style={{
          margin: "0 0 10px",
          fontSize: isMobile ? 30 : 38,
          lineHeight: 1.05,
          fontWeight: 900,
          letterSpacing: "-0.03em",
        }}
      >
        Введи код комнаты
      </h1>
      <p style={{ color: "rgba(255,255,255,0.52)", margin: "0 0 26px", fontSize: 14 }}>
        Попроси хоста показать код на экране
      </p>
      <div
        style={{
          display: "flex",
          gap: 10,
          justifyContent: "center",
          flexWrap: "wrap",
        }}
      >
        <input
          value={joinCode}
          onChange={(e) => setJoinCode(e.target.value.toUpperCase().slice(0, 6))}
          onKeyDown={(e) => {
            if (e.key === "Enter" && canJoin) onJoin();
          }}
          placeholder="ABCD12"
          maxLength={6}
          autoCapitalize="characters"
          inputMode="text"
          style={{
            width: isMobile ? "min(100%, 190px)" : 190,
            minWidth: 0,
            padding: "14px 16px",
            borderRadius: 14,
            border: `1.5px solid ${joinCode.length === 6 ? `${accent}aa` : "rgba(255,255,255,0.2)"}`,
            background: "rgba(255,255,255,0.06)",
            color: "white",
            outline: "none",
            fontFamily: "var(--font-mono)",
            fontSize: 24,
            fontWeight: 800,
            letterSpacing: "0.14em",
            textAlign: "center",
            boxShadow: joinCode.length === 6 ? `0 0 0 3px ${accent}22` : undefined,
          }}
        />
        <button
          type="button"
          onClick={onJoin}
          disabled={!canJoin}
          style={{
            minHeight: 56,
            padding: "0 24px",
            borderRadius: 14,
            background: canJoin ? "white" : "rgba(255,255,255,0.14)",
            color: canJoin ? "#08080d" : "rgba(255,255,255,0.42)",
            fontWeight: 800,
            fontSize: 16,
            border: "none",
            cursor: canJoin ? "pointer" : "not-allowed",
            fontFamily: "inherit",
            transition: "background 150ms ease, color 150ms ease, transform 150ms ease",
          }}
        >
          {isJoiningRoom ? "..." : "Войти"}
        </button>
      </div>
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
  onStartGame,
  onOpenQuizConfig,
  startGameButtonRef,
  isMobile,
  isCurrentUserHost,
  onRules,
}: {
  game: GameInfo;
  accent: string;
  deep: string;
  onStartGame: () => void;
  onOpenQuizConfig: () => void;
  startGameButtonRef: React.RefObject<HTMLButtonElement | null>;
  isMobile: boolean;
  isCurrentUserHost: boolean;
  onRules: () => void;
}) {
  const [startFocused, setStartFocused] = useState(false);
  const [rulesFocused, setRulesFocused] = useState(false);
  const startButtonShadow = `0 12px 32px -8px ${accent}99, inset 0 1px 0 rgba(255,255,255,0.35)`;

  return (
    <div style={{ position: "relative" }}>
      {/* Title — animates between games */}
      <AnimatePresence mode="wait">
        <motion.h1
          key={game.id}
          initial={{ y: 30 }}
          animate={{ y: 0 }}
          exit={{ opacity: 0, transition: { duration: 0 } }}
          transition={spring.soft}
          style={{
            fontWeight: 900,
            fontSize: isMobile ? "clamp(40px, 12vw, 44px)" : "clamp(56px, 8.5vw, 116px)",
            lineHeight: isMobile ? 0.96 : 0.9,
            letterSpacing: isMobile ? "-0.03em" : "-0.045em",
            margin: 0,
            marginBottom: isMobile ? 18 : 24,
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
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: isMobile ? 10 : 20,
          marginBottom: isMobile ? 20 : 28,
          flexWrap: "wrap",
          fontFamily: "var(--font-mono)",
        }}
      >
        <MetaPill icon={<PersonIcon />}>{game.players}</MetaPill>
        {!isMobile && <Dot />}
        <MetaPill icon={<ClockIcon />}>{game.duration}</MetaPill>
        {!isMobile && <Dot />}
        <MetaPill icon={<TeamsIcon />}>{game.mode}</MetaPill>
      </div>

      {/* Description */}
      <p
        style={{
          fontSize: isMobile ? 14 : 18,
          lineHeight: 1.55,
          color: "rgba(235, 235, 245, 0.72)",
          maxWidth: 520,
          margin: isMobile ? "0 0 24px" : "0 0 32px",
        }}
      >
        {game.description}
      </p>

      {/* CTA row */}
      <div
        style={{
          display: "flex",
          gap: isMobile ? 12 : 24,
          flexWrap: "wrap",
          flexDirection: isMobile ? "column" : "row",
          alignItems: isMobile ? "stretch" : "center",
        }}
      >
        <motion.button
          ref={startGameButtonRef}
          onClick={() => {
            if (game.id === "quiz") {
              onOpenQuizConfig();
            } else {
              onStartGame();
            }
          }}
          disabled={!isCurrentUserHost}
          data-lobby-cta="start"
          onFocus={() => setStartFocused(true)}
          onBlur={() => setStartFocused(false)}
          whileHover={isCurrentUserHost ? { scale: 1.03, y: -2 } : undefined}
          whileTap={isCurrentUserHost ? { scale: 0.97 } : undefined}
          transition={spring.snappy}
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            height: isMobile ? 54 : 51,
            width: isMobile ? "100%" : undefined,
            padding: isMobile ? "0 22px" : "0 27px",
            fontSize: isMobile ? 16 : 15,
            fontWeight: 700,
            borderRadius: radius.md,
            background: isCurrentUserHost
              ? `linear-gradient(180deg, ${accent}, ${deep})`
              : "rgba(255,255,255,0.06)",
            color: isCurrentUserHost ? "white" : "rgba(255,255,255,0.45)",
            border: isCurrentUserHost
              ? `1px solid color-mix(in srgb, ${accent} 60%, white)`
              : "1px solid rgba(255,255,255,0.10)",
            boxShadow: isCurrentUserHost
              ? startFocused
                ? `0 0 0 3px ${accent}, ${startButtonShadow}`
                : startButtonShadow
              : "none",
            cursor: isCurrentUserHost ? "pointer" : "not-allowed",
            letterSpacing: "-0.01em",
            fontFamily: "inherit",
            outline: "none",
          }}
        >
          {isCurrentUserHost && <PlayIcon />}
          {isCurrentUserHost
            ? game.id === "quiz" ? "Выбрать квиз" : "Начать партию"
            : "Ожидание хоста"}
        </motion.button>

        <motion.button
          data-lobby-cta="rules"
          onClick={onRules}
          onFocus={() => setRulesFocused(true)}
          onBlur={() => setRulesFocused(false)}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          transition={spring.snappy}
          style={{
            height: isMobile ? 54 : 51,
            width: isMobile ? "100%" : undefined,
            padding: isMobile ? "0 22px" : "0 22px",
            fontSize: isMobile ? 15 : 14,
            fontWeight: 600,
            borderRadius: radius.md,
            background: "rgba(255, 255, 255, 0.06)",
            color: "rgba(255, 255, 255, 0.9)",
            border: "1px solid rgba(255, 255, 255, 0.14)",
            cursor: "pointer",
            fontFamily: "inherit",
            outline: "none",
            boxShadow: rulesFocused ? "0 0 0 3px rgba(255,255,255,0.4)" : "none",
          }}
        >
          Правила
        </motion.button>
      </div>
    </div>
  );
}

// ============================================================
// Room menu
// ============================================================

const RoomMenu = forwardRef<HTMLDivElement, {
  roomCode: string;
  roomState: RoomState | null;
  accent: string;
  deep: string;
  currentUserId: string;
  canAddPlayer: boolean;
  isMobile?: boolean;
  onKick: (playerId: string) => void;
  onTransferHost: (playerId: string) => void;
  onAddPlayer: () => void;
  onClose: () => void;
}>(function RoomMenu({
  roomCode,
  roomState,
  accent,
  deep,
  currentUserId,
  canAddPlayer,
  isMobile = false,
  onKick,
  onTransferHost,
  onAddPlayer,
  onClose,
}, ref) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const connectedPlayers = (roomState?.players ?? []).filter(
    (p) => p.nickname
  );
  const isCurrentUserOwner = currentUserId !== "" && currentUserId === roomState?.ownerId;
  const isCurrentUserHost = currentUserId !== "" && currentUserId === roomState?.hostId;
  const handleClose = () => {
    onClose();
  };

  useImperativeHandle(ref, () => panelRef.current as HTMLDivElement, []);

  useEffect(() => {
    if (!selectedPlayerId) return;
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      // Click on the chip is handled by the chip button itself.
      if (target.closest('[data-player-chip]')) return;
      // Keep the menu mounted long enough for action button onClick handlers.
      if (target.closest('[data-player-action-menu]')) return;
      setSelectedPlayerId(null);
    };
    window.addEventListener("pointerdown", onPointerDown);
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, [selectedPlayerId]);

  return (
    <GlassPanel
      ref={panelRef}
      variant="floating"
      radius="lg"
      padding={32}
      initial={isMobile ? false : { opacity: 0, scale: 0.95 }}
      animate={isMobile ? { opacity: 1, scale: 1 } : { opacity: 1, scale: 1 }}
      exit={isMobile ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.95 }}
      transition={isMobile ? { duration: 0 } : { duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
      style={{
        width: "100%",
        maxWidth: 460,
        minHeight: 480,
        ...glassMobileSolid(isMobile, "rgba(255,255,255,0.08)"),
        border: "1px solid rgba(255,255,255,0.12)",
        display: "flex",
        flexDirection: "column",
        gap: 26,
        willChange: isMobile ? undefined : "opacity, transform",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 0,
        }}
      >
        <div
          style={{
            width: "100%",
            fontSize: isMobile ? 20 : 22,
            fontWeight: 700,
            lineHeight: 1.1,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            backgroundImage: `linear-gradient(90deg, ${accent}, color-mix(in srgb, ${accent} 62%, white), ${deep})`,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            marginBottom: 10,
          }}
        >
          Комната · {roomCode}
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
          }}
        >
          <div
            style={{
              color: "rgba(235, 235, 245, 0.58)",
              fontSize: 13,
              fontFamily: "var(--font-mono)",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              fontWeight: 700,
            }}
          >
            В комнате · {connectedPlayers.length}
          </div>
          <div
            style={{
              flexShrink: 0,
              display: "flex",
              justifyContent: "flex-end",
              alignItems: "center",
              gap: 8,
            }}
          >
            <button
              type="button"
              onClick={handleClose}
              aria-label="Закрыть"
              style={{
                flexShrink: 0,
                width: 28,
                height: 28,
                borderRadius: radius.full,
                background: "rgba(255,255,255,0.07)",
                border: "1px solid rgba(255,255,255,0.12)",
                color: "rgba(255,255,255,0.55)",
                fontSize: 16,
                lineHeight: 1,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: "inherit",
                transition: "background 150ms ease, color 150ms ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.14)";
                e.currentTarget.style.color = "rgba(255,255,255,0.9)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.07)";
                e.currentTarget.style.color = "rgba(255,255,255,0.55)";
              }}
            >
              ✕
            </button>
          </div>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 10,
          minHeight: 70,
          alignContent: "flex-start",
        }}
        onClick={() => setSelectedPlayerId(null)}
      >
        {connectedPlayers.length > 0 ? (
          connectedPlayers.map((player) => {
            const isHost = player.id === roomState?.gameHostPlayerId;
            const canKickPlayer = isCurrentUserOwner && player.id !== currentUserId;
            const canTransferHost = isCurrentUserHost && !isHost && player.id !== currentUserId;
            const canManagePlayer = canKickPlayer || canTransferHost;
            return (
              <div
                key={player.id}
                onClick={(e) => e.stopPropagation()}
                style={{ position: "relative", display: "inline-flex" }}
              >
                <button
                  type="button"
                  data-player-chip=""
                  onClick={() => {
                    if (!canManagePlayer) return;
                    setSelectedPlayerId((id) => (id === player.id ? null : player.id));
                  }}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    minHeight: 36,
                    padding: "8px 12px",
                    borderRadius: radius.full,
                    background: isHost ? `${accent}24` : "rgba(255, 255, 255, 0.07)",
                    border: `1px solid ${isHost ? `${accent}88` : "rgba(255, 255, 255, 0.12)"}`,
                    color: "rgba(255, 255, 255, 0.9)",
                    fontFamily: "inherit",
                    fontSize: 14,
                    fontWeight: 650,
                    boxShadow: isHost ? `0 8px 24px -14px ${accent}` : undefined,
                    cursor: canManagePlayer ? "pointer" : "default",
                  }}
                >
                  <PlayerAvatar
                    nickname={player.nickname}
                    size="xs"
                    away={!player.isConnected || player.isAway}
                  />
                  <span>{player.nickname}</span>
                  {isHost && (
                    <Badge variant="game" gameColor={accent}>хост</Badge>
                  )}
                </button>
                <AnimatePresence>
                  {selectedPlayerId === player.id && (
                    <motion.div
                      key="player-action-menu"
                      data-player-action-menu=""
                      initial={isMobile ? false : { opacity: 0, y: -4, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={isMobile ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: -4, scale: 0.96 }}
                      transition={isMobile ? { duration: 0 } : { duration: 0.13 }}
                      style={{
                        position: "absolute",
                        top: "calc(100% + 6px)",
                        left: 0,
                        zIndex: 50,
                        background: isMobile ? "rgba(10, 10, 16, 0.97)" : "rgba(14, 14, 20, 0.92)",
                        backdropFilter: isMobile ? undefined : "blur(16px)",
                        WebkitBackdropFilter: isMobile ? undefined : "blur(16px)",
                        border: "1px solid rgba(255,255,255,0.12)",
                        borderRadius: 12,
                        padding: 6,
                        display: "flex",
                        flexDirection: "column",
                        gap: 2,
                        minWidth: 210,
                        boxShadow: "0 8px 32px -8px rgba(0,0,0,0.6)",
                      }}
                    >
                      {canKickPlayer && (
                        <RoomMenuActionButton
                          icon={<KickPlayerIcon />}
                          label="Удалить из комнаты"
                          hoverColor="#ef4444"
                          onClick={() => {
                            onKick(player.id);
                            setSelectedPlayerId(null);
                          }}
                        />
                      )}
                      {canTransferHost && (
                        <RoomMenuActionButton
                          icon={<HostCrownIcon />}
                          label="Передать роль хоста"
                          hoverColor={accent}
                          onClick={() => {
                            onTransferHost(player.id);
                            setSelectedPlayerId(null);
                          }}
                        />
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })
        ) : (
          <span style={{ color: "rgba(235, 235, 245, 0.52)", fontSize: 14 }}>
            Ждём игроков...
          </span>
        )}
      </div>

      {canAddPlayer && (
        <button
          type="button"
          onClick={() => {
            onAddPlayer();
            onClose();
          }}
          style={{
            width: "100%",
            padding: "14px 20px",
            borderRadius: 14,
            background: "rgba(255,255,255,0.08)",
            border: "1px solid rgba(255,255,255,0.15)",
            color: "white",
            fontWeight: 800,
            fontSize: 16,
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          + Добавить игрока
        </button>
      )}

    </GlassPanel>
  );
});

function QuizSelectionScreen({
  accent,
  onBack,
  onSelectGeneral,
  onSelectSpecial,
}: {
  accent: string;
  onBack: () => void;
  onSelectGeneral: () => void;
  onSelectSpecial: (specialQuizId: string, backgroundUrl: string) => void;
}) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 20,
        color: "white",
        background:
          `radial-gradient(900px 620px at 70% 20%, ${accent}33, transparent 62%), radial-gradient(760px 560px at 18% 82%, rgba(48, 88, 255, 0.22), transparent 64%), #08080d`,
        padding: "clamp(24px, 5vw, 56px)",
        display: "flex",
        flexDirection: "column",
        overflowY: "auto",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 18,
          marginBottom: 36,
        }}
      >
        <button
          type="button"
          onClick={onBack}
          style={{
            padding: "10px 16px",
            borderRadius: 999,
            background: "rgba(255,255,255,0.08)",
            border: "1px solid rgba(255,255,255,0.14)",
            color: "rgba(255,255,255,0.86)",
            fontWeight: 750,
            fontSize: 14,
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          ← Назад
        </button>
        <h1 style={{ margin: 0, fontSize: "clamp(34px, 6vw, 72px)", lineHeight: 0.95, fontWeight: 900 }}>
          Выбери квиз
        </h1>
      </div>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 22,
          alignItems: "stretch",
        }}
      >
        <QuizSelectionTile
          title="Общие квизы"
          subtitle="Наука, история, поп-культура"
          icon="🎲"
          gradient="linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)"
          onClick={onSelectGeneral}
        />
        <QuizSelectionTile
          title="Гарри Поттер #1"
          backgroundUrl="/backgrounds/harry-potter.webp"
          onClick={() => onSelectSpecial("harry-potter-1", "/backgrounds/harry-potter.webp")}
        />
        <QuizSelectionTile
          title="Marvel #1"
          backgroundUrl="/backgrounds/marvel.webp"
          onClick={() => onSelectSpecial("marvel-1", "/backgrounds/marvel.webp")}
        />
      </div>
    </div>
  );
}

function QuizSelectionTile({
  title,
  subtitle,
  icon,
  gradient,
  backgroundUrl,
  onClick,
}: {
  title: string;
  subtitle?: string;
  icon?: string;
  gradient?: string;
  backgroundUrl?: string;
  onClick: () => void;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ scale: 1.03, boxShadow: "0 14px 44px rgba(0,0,0,0.52)" }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.15 }}
      style={{
        width: 280,
        height: 180,
        borderRadius: 8,
        overflow: "hidden",
        cursor: "pointer",
        position: "relative",
        border: "1px solid rgba(255,255,255,0.10)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        transition: "transform 150ms ease, box-shadow 150ms ease",
        padding: 20,
        textAlign: "left",
        fontFamily: "inherit",
        background: gradient ?? "rgba(255,255,255,0.05)",
      }}
    >
      {backgroundUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={backgroundUrl}
          alt=""
          fetchPriority="high"
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
          aria-hidden="true"
        />
      )}
      {icon && (
        <div
          style={{
            position: "absolute",
            top: 22,
            left: 22,
            fontSize: 42,
            lineHeight: 1,
          }}
        >
          {icon}
        </div>
      )}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          background: "linear-gradient(transparent, rgba(0,0,0,0.85))",
          padding: "32px 16px 14px",
          color: "white",
        }}
      >
        <div style={{ fontWeight: 750, fontSize: 16 }}>
          {title}
        </div>
        {subtitle && (
          <div style={{ marginTop: 5, color: "rgba(255,255,255,0.68)", fontSize: 13, fontWeight: 600 }}>
            {subtitle}
          </div>
        )}
      </div>
    </motion.button>
  );
}

function QuizConfigOverlay({
  accent,
  difficulty,
  topic,
  onDifficultyChange,
  onTopicChange,
  onConfirm,
  onClose,
}: {
  accent: string;
  difficulty: "easy" | "medium" | "hard";
  topic: "random" | "science" | "history" | "pop-culture";
  onDifficultyChange: (difficulty: "easy" | "medium" | "hard") => void;
  onTopicChange: (topic: "random" | "science" | "history" | "pop-culture") => void;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const optionStyle = (active: boolean): React.CSSProperties => ({
    padding: "10px 16px",
    borderRadius: 10,
    background: active ? `${accent}22` : "rgba(255,255,255,0.06)",
    border: active ? `1px solid ${accent}66` : "1px solid rgba(255,255,255,0.12)",
    color: active ? "white" : "rgba(255,255,255,0.7)",
    fontWeight: active ? 750 : 600,
    cursor: "pointer",
    fontFamily: "inherit",
  });

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 30,
          background: "rgba(0,0,0,0.7)",
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
        }}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Настройки квиза"
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          zIndex: 31,
          width: "calc(100% - 32px)",
          maxWidth: 480,
          background: "rgba(20,20,32,0.95)",
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: 24,
          padding: "32px 28px",
          boxShadow: "0 32px 96px rgba(0,0,0,0.6)",
          color: "white",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16, marginBottom: 24 }}>
          <h2 style={{ margin: 0, fontSize: 26, lineHeight: 1.1, fontWeight: 850 }}>
            Настройки квиза
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрыть"
            style={{
              width: 32,
              height: 32,
              borderRadius: radius.full,
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.12)",
              color: "rgba(255,255,255,0.72)",
              cursor: "pointer",
              fontFamily: "inherit",
              fontSize: 16,
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        </div>

        <QuizConfigGroup title="Сложность">
          <button type="button" onClick={() => onDifficultyChange("easy")} style={optionStyle(difficulty === "easy")}>
            Лёгкий
          </button>
          <button type="button" onClick={() => onDifficultyChange("medium")} style={optionStyle(difficulty === "medium")}>
            Средний
          </button>
          <button type="button" onClick={() => onDifficultyChange("hard")} style={optionStyle(difficulty === "hard")}>
            Сложный
          </button>
        </QuizConfigGroup>
        <QuizConfigGroup title="Тема">
          <button type="button" onClick={() => onTopicChange("random")} style={optionStyle(topic === "random")}>
            Случайные
          </button>
          <button type="button" onClick={() => onTopicChange("science")} style={optionStyle(topic === "science")}>
            Наука
          </button>
          <button type="button" onClick={() => onTopicChange("history")} style={optionStyle(topic === "history")}>
            История
          </button>
          <button type="button" onClick={() => onTopicChange("pop-culture")} style={optionStyle(topic === "pop-culture")}>
            Поп-культура
          </button>
        </QuizConfigGroup>

        <button
          type="button"
          onClick={onConfirm}
          style={{
            width: "100%",
            padding: "16px",
            borderRadius: 14,
            background: "white",
            color: "#08080d",
            fontWeight: 900,
            fontSize: 18,
            border: "none",
            cursor: "pointer",
            marginTop: 8,
            fontFamily: "inherit",
          }}
        >
          ВЫБРАТЬ
        </button>
      </div>
    </>
  );
}

function QuizConfigGroup({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section style={{ marginBottom: 20 }}>
      <div
        style={{
          marginBottom: 10,
          color: "rgba(255,255,255,0.52)",
          fontSize: 12,
          fontWeight: 800,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
        }}
      >
        {title}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
        {children}
      </div>
    </section>
  );
}

function RoomMenuActionButton({
  icon,
  label,
  hoverColor,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  hoverColor: string;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: "100%",
        textAlign: "left",
        padding: "8px 12px",
        borderRadius: radius.sm,
        fontSize: 13,
        fontWeight: 600,
        color: hovered ? hoverColor : "rgba(255,255,255,0.85)",
        background: hovered ? "rgba(255,255,255,0.07)" : "transparent",
        border: "none",
        cursor: "pointer",
        fontFamily: "inherit",
        display: "flex",
        alignItems: "center",
        gap: 8,
      }}
    >
      <span style={{ display: "inline-flex", color: "currentColor" }}>{icon}</span>
      {label}
    </button>
  );
}

function KickPlayerIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="10" cy="10" r="7.5" stroke="currentColor" strokeWidth="2" />
      <path d="M5 15 15 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function HostCrownIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M3.5 6.5 7.5 11 10 5l2.5 6 4-4.5-1.2 8H4.7l-1.2-8Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M5.5 16h9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
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
            willChange: "opacity, transform",
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

// ============================================================
// Bottom tile strip (smaller radii)
// ============================================================

const TileStrip = forwardRef<HTMLDivElement, {
  games: GameInfo[];
  activeId: GameId;
  onSelect: (id: GameId) => void;
  isMobile: boolean;
}>(function TileStrip({
  games,
  activeId,
  onSelect,
  isMobile,
}, ref) {
  return (
    <div
      className={isMobile ? "tile-strip-mobile" : undefined}
      style={{ position: "relative", zIndex: 1, paddingBottom: isMobile ? 20 : 32 }}
    >
      <p
        style={{
          fontSize: 11,
          color: "rgba(255, 255, 255, 0.4)",
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          marginBottom: isMobile ? 32 : 12,
          textAlign: "center",
          fontFamily: "var(--font-mono)",
          fontWeight: 700,
        }}
      >
        Все игры
      </p>
      <div
        ref={ref}
        style={{
          display: "grid",
          gridTemplateColumns: isMobile ? undefined : `repeat(${games.length}, 1fr)`,
          gridAutoFlow: isMobile ? "column" : undefined,
          gridAutoColumns: isMobile ? 110 : undefined,
          gap: isMobile ? 12 : 28,
          maxWidth: 1280,
          margin: "0 auto",
          padding: isMobile ? "8px 16px 10px" : "0 48px",
          overflowX: isMobile ? "auto" : undefined,
          overflowY: isMobile ? "hidden" : undefined,
          scrollSnapType: isMobile ? "x mandatory" : undefined,
          WebkitOverflowScrolling: isMobile ? "touch" : undefined,
          touchAction: isMobile ? "pan-x" : undefined,
        }}
      >
        {games.map((game) => (
          <Tile
            key={game.id}
            game={game}
            isActive={game.id === activeId}
            onClick={() => onSelect(game.id)}
            onFocus={() => onSelect(game.id)}
            isMobile={isMobile}
          />
        ))}
      </div>
    </div>
  );
});

function Tile({
  game,
  isActive,
  onClick,
  onFocus,
  isMobile = false,
}: {
  game: GameInfo;
  isActive: boolean;
  onClick: () => void;
  onFocus: () => void;
  isMobile?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);
  const pressReleaseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const accent = gameColors[game.id].accent;
  const deep = gameColors[game.id].deep;
  const highlighted = isActive || focused;

  useEffect(() => {
    return () => {
      if (pressReleaseTimerRef.current) {
        clearTimeout(pressReleaseTimerRef.current);
      }
    };
  }, []);

  const releasePressSoon = () => {
    if (pressReleaseTimerRef.current) {
      clearTimeout(pressReleaseTimerRef.current);
    }
    pressReleaseTimerRef.current = setTimeout(() => setPressed(false), 120);
  };

  const tileAnimate = isMobile
    ? (pressed
        ? { y: 0, scale: 0.92 }
        : isActive
          ? { y: 0, scale: 1.02 }
          : { y: 0, scale: 1 })
    : (pressed
        ? { y: -2, scale: 0.92 }
        : isActive
          ? { y: -3, scale: 1.02 }
          : hovered
            ? { y: -5, scale: 1.04 }
            : { y: 0, scale: 1 });

  return (
    <motion.button
      onClick={onClick}
      data-game-id={game.id}
      onFocus={() => {
        setFocused(true);
        onFocus();
      }}
      onBlur={() => setFocused(false)}
      onHoverStart={isMobile ? undefined : () => setHovered(true)}
      onHoverEnd={isMobile ? undefined : () => setHovered(false)}
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      onPointerCancel={() => setPressed(false)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          setPressed(true);
          releasePressSoon();
        }
      }}
      onKeyUp={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          releasePressSoon();
        }
      }}
      animate={tileAnimate}
      transition={
        isMobile
          ? { duration: 0.12, ease: [0.32, 0.72, 0, 1] }
          : pressed
            ? { type: "spring", stiffness: 700, damping: 22 }
            : spring.soft
      }
      style={{
        position: "relative",
        cursor: "pointer",
        background: "transparent",
        border: "none",
        outline: "none",
        padding: 0,
        fontFamily: "inherit",
        color: "inherit",
        scrollSnapAlign: isMobile ? "start" : undefined,
        touchAction: isMobile ? "pan-x" : undefined,
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: -12,
          background: `radial-gradient(circle at center, ${accent}50, transparent 70%)`,
          borderRadius: radius.xl,
          pointerEvents: "none",
          zIndex: 0,
          opacity: isActive ? 0.6 : hovered ? 1 : 0,
          transition: "opacity 400ms ease-out",
        }}
      />

      <div
        style={{
          position: "relative",
          aspectRatio: "1",
          borderRadius: radius.md,
          background: `linear-gradient(135deg, ${deep}66, ${accent}22)`,
          backdropFilter: "blur(16px)",
          border: `1px solid ${highlighted ? accent : `${accent}40`}`,
          boxShadow: highlighted
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
      </div>
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
