"use client";

/**
 * / — Phase D PS5 + Spotlight hybrid lobby (main page).
 *
 * Layout:
 *   Top bar:  brand + nav (Играть/Друзья/ТВ-режим/Комнаты)
 *             + "Друзей онлайн" + "Создать комнату"|roomCode + Avatar
 *   Hero:     left = giant title + meta + desc + CTA + room-code input
 *             right = tilted preview-card with per-game mock content
 *   Bottom:   tile strip (all 7 games, smaller radii)
 *
 * Icons fall back to <GameIcon> SVG placeholders until PNG files appear in
 * public/icons/games/.
 */

import { motion, AnimatePresence } from "framer-motion";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { forwardRef, useCallback, useEffect, useRef, useState } from "react";
import { GameIcon } from "@/components/GameIcon";
import { GlassPanel, GlassToaster } from "@/components/glass";
import { useAuth, type User } from "@/lib/auth-context";
import { gameColors, radius, spring, type GameId } from "@/lib/design/tokens";
import { useSocket } from "@/lib/use-socket";
import { QRCode } from "react-qrcode-logo";
import { toast } from "sonner";

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

interface RoomCreateResponse {
  success: boolean;
  code?: string;
  roomId?: string;
  error?: string;
}

interface RoomJoinResponse {
  success: boolean;
  code?: string;
  roomId?: string;
  error?: string;
}

interface RoomPlayer {
  id: string;
  nickname: string;
  isHost: boolean;
  isConnected: boolean;
}

interface RoomState {
  players: RoomPlayer[];
  hostId: string;
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
    name: "Угадай слово",
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

function useIsMobile(breakpoint = 1024) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint}px)`);
    const onChange = () => setIsMobile(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [breakpoint]);

  return isMobile;
}

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
  const { emit, on, isConnected } = useSocket();
  const initialCode = initialRoomCode?.trim().toUpperCase() || null;
  const isRoomRoute = initialCode !== null;
  const [activeGame, setActiveGame] = useState<GameId>("quiz");
  const [roomCode, setRoomCode] = useState<string | null>(initialCode);
  const [joinCode, setJoinCode] = useState("");
  const [presenceCount, setPresenceCount] = useState(0);
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [roomMenuOpen, setRoomMenuOpen] = useState(false);
  const [authMenuOpen, setAuthMenuOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [isJoiningRoom, setIsJoiningRoom] = useState(false);
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
    if (user?.nickname) queueMicrotask(() => setAuthMenuOpen(false));
  }, [user?.nickname]);

  useEffect(() => {
    const unsubscribe = on('presence:count', (data: unknown) => {
      const payload = data as { count?: number };
      setPresenceCount(typeof payload.count === "number" ? payload.count : 0);
    });

    if (isConnected) {
      emit('presence:subscribe');
    }

    return unsubscribe;
  }, [emit, isConnected, on]);

  useEffect(() => {
    const unsubscribe = on('room:state', (data: unknown) => {
      const payload = data as Partial<RoomState>;
      setRoomState({
        players: Array.isArray(payload.players) ? payload.players : [],
        hostId: typeof payload.hostId === "string" ? payload.hostId : "",
      });
    });

    return unsubscribe;
  }, [on]);

  useEffect(() => {
    if (roomCode && isConnected) {
      emit('room:get-state', { code: roomCode });
    }
  }, [emit, isConnected, roomCode]);

  useEffect(() => {
    if (!initialCode || !user || !isConnected) return;
    emit('room:join', { code: initialCode, playerId: user.id, nickname: user.nickname }, () => {});
  }, [emit, initialCode, isConnected, user]);

  useEffect(() => {
    const unsubscribe = on('room:kicked', () => {
      if (isRoomRoute) {
        router.push("/");
        return;
      }
      setRoomCode(null);
      setRoomState(null);
      setRoomMenuOpen(false);
      toast.error("Вас удалили из комнаты");
    });

    return unsubscribe;
  }, [isRoomRoute, on, router]);

  useEffect(() => {
    if (!roomMenuOpen) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setRoomMenuOpen(false);
      }
    };

    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (roomMenuRef.current?.contains(target)) return;
      if (target.closest('[data-topbar="room"]')) return;
      setRoomMenuOpen(false);
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("pointerdown", onPointerDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("pointerdown", onPointerDown);
    };
  }, [roomMenuOpen]);

  const getPlayerPayload = useCallback(() => {
    if (!user?.id || !user.nickname) {
      toast.error("Войдите в профиль, чтобы создать или присоединиться к комнате");
      setAuthMenuOpen(true);
      return null;
    }

    return { playerId: user.id, nickname: user.nickname };
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

      const sent = emit('room:create', player, (response: unknown) => {
        clearTimeout(timeout);
        setIsCreatingRoom(false);
        const res = response as RoomCreateResponse;
        if (res.success && res.code) {
          setRoomCode(res.code);
          router.push(`/lobby/${res.code}?m=1&game=${activeGame}`);
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
  }, [activeGame, emit, getPlayerPayload, isConnected, router]);

  const handleCreateRoom = useCallback(() => {
    void createRoom();
  }, [createRoom]);

  const handleRoomButtonClick = useCallback(() => {
    setRoomMenuOpen((open) => !open);
  }, []);

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

    const sent = emit('room:join', { code, ...player }, (response: unknown) => {
      clearTimeout(timeout);
      setIsJoiningRoom(false);
      const res = response as RoomJoinResponse;
      if (res.success && res.code) {
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
  }, [emit, getPlayerPayload, isConnected, joinCode]);

  const isCurrentUserHost =
    !roomCode ||
    roomState?.hostId === user?.id ||
    (!isRoomRoute && roomState == null);

  const handleStartGame = useCallback(async () => {
    if (!isCurrentUserHost) return;

    const existingCode = roomCode;
    const code = existingCode ?? (await createRoom()).code;

    if (!code) return;

    router.push(`/lobby/${code}?game=${activeGame}`);
  }, [activeGame, createRoom, isCurrentUserHost, roomCode, router]);

  const handleKick = useCallback((playerId: string) => {
    if (!roomCode) return;
    emit('room:kick', { code: roomCode, playerId });
  }, [emit, roomCode]);

  const handleTransferHost = useCallback((playerId: string) => {
    if (!roomCode) return;
    emit('room:transfer-host', { code: roomCode, newHostId: playerId });
  }, [emit, roomCode]);

  const handleLeaveRoom = useCallback(() => {
    if (!roomCode) return;
    emit('room:leave', {});
    setRoomMenuOpen(false);
    if (isRoomRoute) {
      router.push("/");
      return;
    }
    setRoomCode(null);
    setRoomState(null);
  }, [emit, isRoomRoute, roomCode, router]);

  const handleLogout = useCallback(() => {
    if (roomCode) {
      emit('room:leave', {});
      setRoomCode(null);
      setRoomState(null);
      setRoomMenuOpen(false);
    }
    logout();
  }, [emit, logout, roomCode]);

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
          const order = ["play", "friends-nav", "tv", "friends-online", "room", "avatar"];
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
          const ctaOrder =
            joinCode.length === 6
              ? ["start", "rules", "join-code", "join-submit"]
              : ["start", "rules", "join-code"];
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
          handleStartGame();
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
  }, [activeGame, handleStartGame, joinCode]);

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
        onCreateRoom={handleCreateRoom}
        onRoomMenuToggle={handleRoomButtonClick}
        accent={accent}
        deep={deep}
        isMobile={isMobile}
        isNarrowDesktop={isNarrowDesktop}
        presenceCount={presenceCount}
        isCreatingRoom={isCreatingRoom}
        user={user}
        authMenuOpen={authMenuOpen}
        accountMenuOpen={accountMenuOpen}
        onOpenAuth={openAuth}
        onCloseAuth={closeAuth}
        onOpenAccountMenu={openAccountMenu}
        onCloseAccountMenu={closeAccountMenu}
        onLogout={handleLogout}
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
          gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
          gap: isMobile ? 32 : 120,
          alignItems: "center",
        }}
      >
        <HeroLeft
          game={active}
          accent={accent}
          deep={deep}
          joinCode={joinCode}
          onJoinCodeChange={setJoinCode}
          onJoinRoom={handleJoinRoom}
          onStartGame={handleStartGame}
          startGameButtonRef={startGameButtonRef}
          isMobile={isMobile}
          isJoiningRoom={isJoiningRoom}
          isCurrentUserHost={isCurrentUserHost}
          showJoinRoom={!isRoomRoute}
        />

        {!isMobile && (
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
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
                  onKick={handleKick}
                  onTransferHost={handleTransferHost}
                  onLeaveRoom={handleLeaveRoom}
                  onClose={() => setRoomMenuOpen(false)}
                />
              ) : (
                <TiltedPreview key="tilted-preview" gameId={active.id} />
              )}
            </AnimatePresence>
          </div>
        )}
      </section>

      {/* Mobile room menu overlay */}
      {isMobile && (
        <AnimatePresence>
          {roomMenuOpen && roomCode && (
            <>
              {/* Dim backdrop */}
              <motion.div
                key="room-menu-backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                onClick={() => setRoomMenuOpen(false)}
                style={{
                  position: "fixed",
                  inset: 0,
                  background: "rgba(0, 0, 0, 0.6)",
                  backdropFilter: "blur(4px)",
                  WebkitBackdropFilter: "blur(4px)",
                  zIndex: 40,
                }}
              />
              {/* Scrollable panel */}
              <motion.div
                key="room-menu-mobile"
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 40 }}
                transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
                style={{
                  position: "fixed",
                  bottom: 0,
                  left: 0,
                  right: 0,
                  zIndex: 41,
                  maxHeight: "88dvh",
                  overflowY: "auto",
                  padding: "0 12px 24px",
                }}
              >
                <RoomMenu
                  ref={roomMenuRef}
                  roomCode={roomCode}
                  roomState={roomState}
                  accent={accent}
                  deep={deep}
                  currentUserId={user?.id ?? ""}
                  onKick={handleKick}
                  onTransferHost={handleTransferHost}
                  onLeaveRoom={handleLeaveRoom}
                  onClose={() => setRoomMenuOpen(false)}
                />
              </motion.div>
            </>
          )}
        </AnimatePresence>
      )}

      {/* Bottom tile strip */}
      <TileStrip
        ref={tileStripRef}
        games={games}
        activeId={activeGame}
        onSelect={setActiveGame}
        isMobile={isMobile}
      />
      <GlassToaster accentColor={accent} />
    </main>
  );
}

// ============================================================
// Top bar
// ============================================================

function TopBar({
  roomCode,
  onCreateRoom,
  onRoomMenuToggle,
  accent,
  deep,
  isMobile,
  isNarrowDesktop,
  presenceCount,
  isCreatingRoom,
  user,
  authMenuOpen,
  accountMenuOpen,
  onOpenAuth,
  onCloseAuth,
  onOpenAccountMenu,
  onCloseAccountMenu,
  onLogout,
}: {
  roomCode: string | null;
  onCreateRoom: () => void;
  onRoomMenuToggle: () => void;
  accent: string;
  deep: string;
  isMobile: boolean;
  isNarrowDesktop: boolean;
  presenceCount: number;
  isCreatingRoom: boolean;
  user: User | null;
  authMenuOpen: boolean;
  accountMenuOpen: boolean;
  onOpenAuth: () => void;
  onCloseAuth: () => void;
  onOpenAccountMenu: () => void;
  onCloseAccountMenu: () => void;
  onLogout: () => void;
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
      <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
        <BrandMark />
        <nav style={{ display: isMobile ? "none" : "flex", gap: 4 }}>
          <NavButton active topbarId="play" isNarrowDesktop={compact}>
            Играть
          </NavButton>
          <NavButton topbarId="friends-nav" isNarrowDesktop={compact}>Друзья</NavButton>
          <NavButton
            topbarId="tv"
            isNarrowDesktop={compact}
            disabled={!roomCode}
            onClick={() => {
              if (!roomCode) return;
              window.open(`/tv/${roomCode}`, "_blank", "noopener,noreferrer");
            }}
          >
            ТВ-режим
          </NavButton>
        </nav>
      </div>

      {/* Right: friends online + room button + avatar */}
      <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 8 : compact ? 8 : 12 }}>
        {!isMobile && (
          <FriendsOnlinePill count={presenceCount} isNarrowDesktop={compact} topbarId="friends-online" />
        )}
        <RoomButton
          roomCode={roomCode}
          onCreate={onCreateRoom}
          onToggle={onRoomMenuToggle}
          accent={accent}
          topbarId="room"
          isNarrowDesktop={compact}
          isCreating={isCreatingRoom}
        />
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
          whiteSpace: "nowrap",
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

function FriendsOnlinePill({
  count,
  isNarrowDesktop = false,
  topbarId,
}: {
  count: number;
  isNarrowDesktop?: boolean;
  topbarId?: string;
}) {
  const [focused, setFocused] = useState(false);

  return (
    <motion.button
      data-topbar={topbarId}
      onClick={() => console.log("friends panel — TODO")}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.97 }}
      transition={spring.snappy}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: isNarrowDesktop ? "8px 12px" : "8px 16px",
        borderRadius: radius.full,
        background: "rgba(255, 255, 255, 0.04)",
        border: "1px solid rgba(255, 255, 255, 0.08)",
        fontFamily: "inherit",
        fontSize: isNarrowDesktop ? 13 : 14,
        color: "rgba(255, 255, 255, 0.85)",
        fontWeight: 500,
        cursor: "pointer",
        outline: "none",
        boxShadow: focused ? "0 0 0 3px rgba(255,255,255,0.6)" : "none",
        whiteSpace: "nowrap",
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
    </motion.button>
  );
}

function RoomButton({
  roomCode,
  onCreate,
  onToggle,
  accent,
  topbarId,
  isNarrowDesktop = false,
  isCreating = false,
}: {
  roomCode: string | null;
  onCreate: () => void;
  onToggle: () => void;
  accent: string;
  topbarId?: string;
  isNarrowDesktop?: boolean;
  isCreating?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  const baseShadow = roomCode ? `0 6px 20px -4px ${accent}80` : "none";
  const focusRing = roomCode ? `0 0 0 3px ${accent}99` : "0 0 0 3px rgba(255,255,255,0.7)";

  return (
    <motion.button
      data-topbar={topbarId}
      onClick={() => roomCode ? onToggle() : onCreate()}
      disabled={isCreating}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      whileHover={{ scale: 1.03, y: -1 }}
      whileTap={{ scale: 0.97 }}
      transition={spring.snappy}
      style={{
        padding: isNarrowDesktop ? "8px 14px" : "8px 18px",
        borderRadius: radius.full,
        background: roomCode
          ? `linear-gradient(135deg, ${accent}, ${accent}CC)`
          : "rgba(255, 255, 255, 0.04)",
        border: roomCode
          ? `1px solid ${accent}`
          : "1px solid rgba(255, 255, 255, 0.12)",
        color: roomCode ? "white" : "rgba(255, 255, 255, 0.85)",
        fontFamily: roomCode ? "var(--font-mono)" : "inherit",
        fontSize: roomCode || isNarrowDesktop ? 13 : 14,
        fontWeight: roomCode ? 700 : 600,
        letterSpacing: roomCode ? "0.12em" : "-0.01em",
        cursor: isCreating ? "wait" : "pointer",
        opacity: isCreating ? 0.72 : 1,
        outline: "none",
        boxShadow: focused
          ? baseShadow !== "none"
            ? `${focusRing}, ${baseShadow}`
            : focusRing
          : baseShadow,
        textTransform: roomCode ? "uppercase" : undefined,
        whiteSpace: "nowrap",
      }}
    >
      {roomCode ? (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <span>{`Комната · ${roomCode}`}</span>
          <svg
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill="none"
            aria-hidden="true"
            style={{ opacity: 0.75, flexShrink: 0 }}
          >
            {/* Top-left finder square */}
            <rect x="0" y="0" width="5" height="5" rx="1" fill="currentColor" />
            <rect x="1.5" y="1.5" width="2" height="2" fill="black" fillOpacity="0.5" />
            {/* Top-right finder square */}
            <rect x="9" y="0" width="5" height="5" rx="1" fill="currentColor" />
            <rect x="10.5" y="1.5" width="2" height="2" fill="black" fillOpacity="0.5" />
            {/* Bottom-left finder square */}
            <rect x="0" y="9" width="5" height="5" rx="1" fill="currentColor" />
            <rect x="1.5" y="10.5" width="2" height="2" fill="black" fillOpacity="0.5" />
            {/* Data dots */}
            <rect x="9" y="9" width="2" height="2" rx="0.5" fill="currentColor" />
            <rect x="12" y="9" width="2" height="2" rx="0.5" fill="currentColor" />
            <rect x="9" y="12" width="2" height="2" rx="0.5" fill="currentColor" />
            <rect x="12" y="12" width="2" height="2" rx="0.5" fill="currentColor" />
          </svg>
        </span>
      ) : isCreating ? "Создаём..." : "Создать комнату"}
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

  const initial = user.nickname.charAt(0);
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
  const { sendCode, verifyCode, updateNickname } = useAuth();
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
    if (nickname.trim().length < 2) {
      setError('Минимум 2 символа');
      return;
    }
    updateNickname(nickname.trim());
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
        backdropFilter: 'blur(4px)',
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
    background: 'rgba(255,255,255,0.28)',
    backdropFilter: 'blur(24px)',
    WebkitBackdropFilter: 'blur(24px)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 20,
    padding: 24,
    boxShadow: `0 24px 64px rgba(0,0,0,0.5), 0 0 0 1px ${accent}22`,
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '12px 16px',
    borderRadius: 12,
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.12)',
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
      initial={{ opacity: 0, y: -8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.97 }}
      transition={spring.snappy}
      style={containerStyle}
    >
      <div ref={ref} style={panelStyle}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: 'white' }}>
            {step === 'phone' && 'Вход'}
            {step === 'code' && 'Введите код'}
            {step === 'nickname' && 'Как вас зовут?'}
          </span>
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
            <button style={btnStyle(false)} onClick={() => { setStep('phone'); setCode(''); setError(''); }}>
              Назад
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
                maxLength={20}
                onChange={(e) => { setNickname(e.target.value); setError(''); }}
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
    background: 'rgba(18, 18, 28, 0.92)',
    backdropFilter: 'blur(32px)',
    WebkitBackdropFilter: 'blur(32px)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 16,
    padding: 8,
    boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
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
      initial={{ opacity: 0, y: -8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.97 }}
      transition={spring.snappy}
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

// ============================================================
// Hero left (title + meta + desc + CTA)
// ============================================================

function HeroLeft({
  game,
  accent,
  deep,
  joinCode,
  onJoinCodeChange,
  onJoinRoom,
  onStartGame,
  startGameButtonRef,
  isMobile,
  isJoiningRoom,
  isCurrentUserHost,
  showJoinRoom,
}: {
  game: GameInfo;
  accent: string;
  deep: string;
  joinCode: string;
  onJoinCodeChange: (v: string) => void;
  onJoinRoom: () => void;
  onStartGame: () => void;
  startGameButtonRef: React.RefObject<HTMLButtonElement | null>;
  isMobile: boolean;
  isJoiningRoom: boolean;
  isCurrentUserHost: boolean;
  showJoinRoom: boolean;
}) {
  const [startFocused, setStartFocused] = useState(false);
  const [rulesFocused, setRulesFocused] = useState(false);
  const [joinWrapperFocused, setJoinWrapperFocused] = useState(false);
  const [joinInputFocused, setJoinInputFocused] = useState(false);
  const [submitFocused, setSubmitFocused] = useState(false);
  const joinInputRef = useRef<HTMLInputElement>(null);
  const joinWrapperRef = useRef<HTMLButtonElement>(null);
  const joinSelectedByEscRef = useRef(false);
  const startButtonShadow = `0 12px 32px -8px ${accent}99, inset 0 1px 0 rgba(255,255,255,0.35)`;
  const joinFocusRing = joinWrapperFocused || joinInputFocused;

  const handleJoinWrapperFocus = () => {
    setJoinWrapperFocused(true);
    if (joinSelectedByEscRef.current) {
      joinSelectedByEscRef.current = false;
      return;
    }
    joinInputRef.current?.focus();
  };

  const handleJoinWrapperKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.target !== e.currentTarget) return;

    if (e.key === "ArrowLeft") {
      e.preventDefault();
      e.stopPropagation();
      document.querySelector<HTMLElement>('[data-lobby-cta="rules"]')?.focus();
      return;
    }

    if (e.key === "ArrowRight" || e.key === "Enter") {
      e.preventDefault();
      e.stopPropagation();
      joinInputRef.current?.focus();
    }
  };

  const handleJoinInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && e.currentTarget.value.length === 6) {
      e.preventDefault();
      e.stopPropagation();
      onJoinRoom();
      return;
    }

    if (e.key === "ArrowRight") {
      const target = e.currentTarget;
      const isAtEnd =
        target.selectionStart === target.value.length &&
        target.selectionEnd === target.value.length;

      if (isAtEnd && target.value.length === 6) {
        e.preventDefault();
        document.querySelector<HTMLElement>('[data-lobby-cta="join-submit"]')?.focus();
      }
      return;
    }

    if (e.key !== "Escape") return;

    e.preventDefault();
    e.stopPropagation();
    joinSelectedByEscRef.current = true;
    joinWrapperRef.current?.focus();
  };

  return (
    <div style={{ position: "relative" }}>
      {/* Title — animates between games */}
      <motion.h1
        key={game.id}
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
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

      {/* Meta pills */}
      <motion.div
        key={`meta-${game.id}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
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
      </motion.div>

      {/* Description */}
      <motion.p
        key={`desc-${game.id}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        style={{
          fontSize: isMobile ? 14 : 18,
          lineHeight: 1.55,
          color: "rgba(235, 235, 245, 0.72)",
          maxWidth: 520,
          margin: isMobile ? "0 0 24px" : "0 0 32px",
        }}
      >
        {game.description}
      </motion.p>

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
          onClick={onStartGame}
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
          {isCurrentUserHost ? "Начать партию" : "Ожидание хоста"}
        </motion.button>

        <motion.button
          data-lobby-cta="rules"
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

        {showJoinRoom && (
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 12,
              width: isMobile ? "100%" : undefined,
              flexShrink: 0,
            }}
          >
            {/* Join code input */}
            <button
              ref={joinWrapperRef}
              type="button"
              tabIndex={-1}
              data-lobby-cta="join-code"
              onFocus={handleJoinWrapperFocus}
              onBlur={() => setJoinWrapperFocused(false)}
              onKeyDown={handleJoinWrapperKeyDown}
              onClick={() => joinInputRef.current?.focus()}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 12,
                height: isMobile ? 54 : 51,
                flex: isMobile ? "1 1 auto" : undefined,
                minWidth: 0,
                padding: isMobile ? "0 18px" : "0 15px",
                borderRadius: radius.md,
                background: "rgba(0, 0, 0, 0.32)",
                border: "1px dashed rgba(255, 255, 255, 0.22)",
                boxShadow: joinFocusRing ? `0 0 0 3px ${accent}99` : "none",
                cursor: "text",
                fontFamily: "inherit",
                outline: "none",
                color: "inherit",
              }}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: 2, width: "100%" }}>
                <span
                  style={{
                    fontSize: isMobile ? 10 : 9,
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
                  ref={joinInputRef}
                  data-lobby-cta="join-code-input"
                  value={joinCode}
                  onChange={(e) =>
                    onJoinCodeChange(e.target.value.toUpperCase().slice(0, 6))
                  }
                  onFocus={() => setJoinInputFocused(true)}
                  onBlur={() => setJoinInputFocused(false)}
                  onKeyDown={handleJoinInputKeyDown}
                  placeholder="ABXY7K"
                  maxLength={6}
                  style={{
                    background: "transparent",
                    border: "none",
                    outline: "none",
                    color: "white",
                    fontFamily: "var(--font-mono)",
                    fontWeight: 700,
                    fontSize: isMobile ? 17 : 15,
                    letterSpacing: "0.3em",
                    width: isMobile ? "100%" : 110,
                    padding: 0,
                  }}
                />
              </div>
            </button>

            {joinCode.length === 6 && (
              <motion.button
                data-lobby-cta="join-submit"
                aria-label="Присоединиться к комнате"
                onClick={onJoinRoom}
                onFocus={() => setSubmitFocused(true)}
                onBlur={() => setSubmitFocused(false)}
                disabled={isJoiningRoom}
                whileHover={{ scale: 1.03, y: -2 }}
                whileTap={{ scale: 0.97 }}
                transition={spring.snappy}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  height: isMobile ? 54 : 51,
                  width: isMobile ? 60 : 51,
                  padding: 0,
                  flexShrink: 0,
                  borderRadius: radius.md,
                  background: `linear-gradient(180deg, ${accent}, ${deep})`,
                  color: "white",
                  border: `1px solid color-mix(in srgb, ${accent} 60%, white)`,
                  boxShadow: submitFocused
                    ? `0 0 0 3px rgba(255,255,255,0.7), 0 12px 32px -8px ${accent}99`
                    : `0 12px 32px -8px ${accent}99, inset 0 1px 0 rgba(255,255,255,0.35)`,
                  cursor: isJoiningRoom ? "wait" : "pointer",
                  opacity: isJoiningRoom ? 0.72 : 1,
                  fontFamily: "inherit",
                  outline: "none",
                }}
              >
                <svg
                  width={isMobile ? 22 : 19}
                  height={isMobile ? 22 : 19}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-label="Присоединиться"
                >
                  <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                  <polyline points="10 17 15 12 10 7" />
                  <line x1="15" y1="12" x2="3" y2="12" />
                </svg>
              </motion.button>
            )}
          </div>
        )}
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
  onKick: (playerId: string) => void;
  onTransferHost: (playerId: string) => void;
  onLeaveRoom: () => void;
  onClose: () => void;
}>(function RoomMenu({
  roomCode,
  roomState,
  accent,
  deep,
  currentUserId,
  onKick,
  onTransferHost,
  onLeaveRoom,
  onClose,
}, ref) {
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [localIp, setLocalIp] = useState<string | null>(null);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const origin = localIp
    ? `http://${localIp}:${typeof window !== "undefined" ? window.location.port || "3000" : "3000"}`
    : typeof window !== "undefined" ? window.location.origin : "";
  const joinUrl = roomCode ? `${origin}/lobby/${roomCode}` : "";
  const connectedPlayers = (roomState?.players ?? []).filter(
    (p) => p.isConnected !== false && p.nickname
  );
  const isCurrentUserHost = currentUserId !== "" && currentUserId === roomState?.hostId;
  const handleClose = () => {
    setConfirmLeave(false);
    onClose();
  };

  useEffect(() => {
    fetch('/api/local-ip')
      .then((r) => r.json())
      .then((data) => setLocalIp(data.ip))
      .catch(() => setLocalIp(null));
  }, []);

  useEffect(() => {
    return () => setSelectedPlayerId(null);
  }, []);

  return (
    <GlassPanel
      ref={ref}
      variant="floating"
      radius="lg"
      padding={32}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
      style={{
        width: "100%",
        maxWidth: 460,
        minHeight: 480,
        background: "rgba(255,255,255,0.08)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        border: "1px solid rgba(255,255,255,0.12)",
        display: "flex",
        flexDirection: "column",
        gap: 26,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 24,
              fontWeight: 700,
              lineHeight: 1.1,
              backgroundImage: `linear-gradient(90deg, ${accent}, color-mix(in srgb, ${accent} 62%, white), ${deep})`,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              marginBottom: 8,
            }}
          >
            Комната · {roomCode}
          </div>
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
        </div>
        {!confirmLeave ? (
          <button
            type="button"
            onClick={() => setConfirmLeave(true)}
            aria-label="Выйти из комнаты"
            style={{
              flexShrink: 0,
              padding: "8px 14px",
              borderRadius: radius.full,
              background: "rgba(239, 68, 68, 0.12)",
              border: "1px solid rgba(239, 68, 68, 0.35)",
              color: "#fca5a5",
              fontSize: 12,
              fontWeight: 650,
              fontFamily: "inherit",
              cursor: "pointer",
              whiteSpace: "nowrap",
              transition: "background 160ms ease, color 160ms ease, border-color 160ms ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(239, 68, 68, 0.22)";
              e.currentTarget.style.color = "#fee2e2";
              e.currentTarget.style.borderColor = "rgba(239, 68, 68, 0.6)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(239, 68, 68, 0.12)";
              e.currentTarget.style.color = "#fca5a5";
              e.currentTarget.style.borderColor = "rgba(239, 68, 68, 0.35)";
            }}
          >
            Выйти
          </button>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
            <span style={{
              fontSize: 12,
              color: "#fca5a5",
              fontWeight: 600,
              whiteSpace: "nowrap",
            }}>
              Выйти?
            </span>
            <button
              type="button"
              onClick={onLeaveRoom}
              style={{
                padding: "6px 12px",
                borderRadius: "999px",
                background: "rgba(239, 68, 68, 0.75)",
                border: "1px solid rgba(239, 68, 68, 0.9)",
                color: "#fff",
                fontSize: 12,
                fontWeight: 700,
                fontFamily: "inherit",
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              Да
            </button>
            <button
              type="button"
              onClick={() => setConfirmLeave(false)}
              style={{
                padding: "6px 12px",
                borderRadius: "999px",
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.15)",
                color: "rgba(255,255,255,0.7)",
                fontSize: 12,
                fontWeight: 600,
                fontFamily: "inherit",
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              Отмена
            </button>
          </div>
        )}
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

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 10,
          minHeight: 70,
          alignContent: "flex-start",
        }}
      >
        {connectedPlayers.length > 0 ? (
          connectedPlayers.map((player) => {
            const isHost = player.isHost || player.id === roomState?.hostId;
            const canManagePlayer = isCurrentUserHost && player.id !== currentUserId;
            const isSelected = selectedPlayerId === player.id;
            return (
              <div
                key={player.id}
                style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}
              >
                <button
                  type="button"
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
                  <span>{player.nickname}</span>
                  {isHost && (
                    <span
                      style={{
                        padding: "3px 7px",
                        borderRadius: radius.full,
                        background: `linear-gradient(135deg, ${accent}, ${deep})`,
                        color: "white",
                        fontSize: 10,
                        fontWeight: 800,
                        fontFamily: "var(--font-mono)",
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                      }}
                    >
                      хост
                    </span>
                  )}
                </button>
                <AnimatePresence>
                  {isSelected && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.15 }}
                      style={{
                        background: "rgba(20,20,24,0.92)",
                        backdropFilter: "blur(12px)",
                        WebkitBackdropFilter: "blur(12px)",
                        border: "1px solid rgba(255,255,255,0.12)",
                        borderRadius: radius.md,
                        padding: 6,
                        marginTop: 6,
                        display: "flex",
                        flexDirection: "column",
                        gap: 2,
                        minWidth: 210,
                      }}
                    >
                      <RoomMenuActionButton
                        icon={<KickPlayerIcon />}
                        label="Удалить из комнаты"
                        hoverColor="#ef4444"
                        onClick={() => {
                          onKick(player.id);
                          setSelectedPlayerId(null);
                        }}
                      />
                      <RoomMenuActionButton
                        icon={<HostCrownIcon />}
                        label="Передать роль хоста"
                        hoverColor={accent}
                        onClick={() => {
                          onTransferHost(player.id);
                          setSelectedPlayerId(null);
                        }}
                      />
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

      <div
        style={{
          marginTop: "auto",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 14,
          paddingTop: 8,
        }}
      >
        <div
          style={{
            width: 206,
            height: 206,
            borderRadius: 24,
            background: "rgba(255, 255, 255, 0.94)",
            border: "1px solid rgba(255, 255, 255, 0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 24px 60px -28px rgba(0,0,0,0.85)",
          }}
        >
          {joinUrl && (
            <QRCode
              value={joinUrl}
              size={180}
              quietZone={4}
              bgColor="#ffffff"
              fgColor="#06060c"
              qrStyle="dots"
              eyeRadius={10}
            />
          )}
        </div>
        <div
          style={{
            maxWidth: 280,
            textAlign: "center",
            color: "rgba(235, 235, 245, 0.62)",
            fontSize: 13,
            lineHeight: 1.45,
          }}
        >
          Покажи QR друзьям для быстрого подключения
        </div>
      </div>
    </GlassPanel>
  );
});

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
