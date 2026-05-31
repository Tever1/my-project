"use client";

import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useNavigateOnGameStart } from "@/lib/use-navigate-on-game-start";
import { useSocket } from "@/lib/use-socket";

type JoinRoomPlayer = {
  id: string;
  nickname: string;
  isConnected: boolean;
  role?: string;
};

type JoinRoomState = {
  players: JoinRoomPlayer[];
  currentGame: string | null;
  gameHostPlayerId: string | null;
  status: string;
};

const GUEST_ID_KEY = "party-hub-join-guest-id";

function getGuestPlayerId() {
  if (typeof window === "undefined") return "";
  const existing = window.localStorage.getItem(GUEST_ID_KEY);
  if (existing) return existing;
  const next = `guest_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  window.localStorage.setItem(GUEST_ID_KEY, next);
  return next;
}

// Phone-proportioned join page.
// Narrow centered layout regardless of device — works on both phone and desktop.
export default function JoinPage() {
  const params = useParams<{ code: string }>();
  const code = params.code?.toUpperCase() ?? "";
  const { emit, on, isConnected } = useSocket();
  const { user } = useAuth();

  const [guestPlayerId, setGuestPlayerId] = useState("");
  const [nickname, setNickname] = useState("");
  const [joined, setJoined] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [roomState, setRoomState] = useState<JoinRoomState | null>(null);

  const playerId = user?.id ?? guestPlayerId;

  useEffect(() => {
    queueMicrotask(() => setGuestPlayerId(getGuestPlayerId()));
  }, []);

  useEffect(() => {
    if (user?.nickname && !nickname) {
      queueMicrotask(() => setNickname(user.nickname));
    }
  }, [nickname, user]);

  useEffect(() => {
    return on("room:state", (data: unknown) => {
      const payload = data as Partial<JoinRoomState>;
      setRoomState({
        players: Array.isArray(payload.players) ? payload.players : [],
        currentGame: typeof payload.currentGame === "string" ? payload.currentGame : null,
        gameHostPlayerId: typeof payload.gameHostPlayerId === "string" ? payload.gameHostPlayerId : null,
        status: typeof payload.status === "string" ? payload.status : "lobby",
      });
    });
  }, [on]);

  // Request a room-state snapshot on connect so a player returning from a
  // finished game is recognized as an existing member (auto-rejoin below).
  useEffect(() => {
    if (!isConnected || !code || !playerId) return;
    emit("room:get-state", { code });
  }, [isConnected, code, playerId, emit]);

  useNavigateOnGameStart(
    ({ roomCode, gameType }) => `/game/${roomCode}/${gameType}`,
  );

  useEffect(() => {
    if (!roomState || !playerId || joined) return;
    const existingPlayer = roomState.players.find((player) => player.id === playerId);
    if (!existingPlayer) return;
    queueMicrotask(() => {
      setJoined(true);
      if (!nickname && existingPlayer.nickname) {
        setNickname(existingPlayer.nickname);
      }
      // Re-subscribe this socket to the room channel for live updates
      // (new players, game start). isReconnect=true reuses the existing player.
      emit("room:join", {
        code,
        playerId,
        nickname: existingPlayer.nickname,
        isReconnect: true,
        role: "player",
      });
    });
  }, [roomState, playerId, joined, nickname, emit, code]);

  const handleJoin = useCallback(() => {
    const trimmedNickname = nickname.trim();
    if (!trimmedNickname || !code || !isConnected || !playerId) return;

    setIsJoining(true);
    setError(null);

    emit(
      "room:join",
      {
        code,
        playerId,
        nickname: trimmedNickname,
        isReconnect: false,
        role: "player",
      },
      (res: unknown) => {
        const result = res as { success: boolean; error?: string };
        setIsJoining(false);
        if (result.success) {
          setJoined(true);
        } else {
          setError(result.error ?? "Не удалось подключиться");
        }
      }
    );
  }, [code, emit, isConnected, nickname, playerId]);

  const handleStartGame = useCallback(() => {
    if (!code) return;
    emit("game:start", { code });
  }, [code, emit]);

  const visiblePlayers = (roomState?.players ?? []).filter((player) => player.role !== "tv");
  const gameHostPlayer = visiblePlayers.find((player) => player.id === roomState?.gameHostPlayerId);
  const canStartGame =
    joined &&
    (roomState?.gameHostPlayerId === playerId ||
      (roomState?.gameHostPlayerId !== null &&
        gameHostPlayer?.nickname === nickname.trim()));

  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(700px 520px at 60% 15%, rgba(10,132,255,0.24), transparent 62%), radial-gradient(620px 500px at 20% 85%, rgba(255,59,107,0.22), transparent 64%), #08080d",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 430,
          minHeight: "80vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 24,
          padding: "32px 24px",
          borderRadius: 24,
          background: "rgba(255,255,255,0.035)",
          border: "1px solid rgba(255,255,255,0.08)",
          color: "white",
          boxSizing: "border-box",
          boxShadow: "0 24px 80px rgba(0,0,0,0.35)",
        }}
      >
        {!joined ? (
          <>
            <div style={{ textAlign: "center" }}>
              <p
                style={{
                  color: "rgba(255,255,255,0.42)",
                  fontSize: 13,
                  margin: "0 0 6px",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  fontWeight: 700,
                }}
              >
                Код комнаты
              </p>
              <p style={{ fontSize: 28, fontWeight: 850, letterSpacing: "0.15em", margin: 0 }}>
                {code}
              </p>
            </div>

            <input
              autoFocus
              value={nickname}
              onChange={(event) => {
                setNickname(event.target.value.slice(0, 20));
                setError(null);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" && nickname.trim()) handleJoin();
              }}
              placeholder="Твоё имя"
              maxLength={20}
              style={{
                width: "100%",
                fontSize: 20,
                fontWeight: 650,
                padding: "14px 18px",
                borderRadius: 14,
                border: "1.5px solid rgba(255,255,255,0.15)",
                background: "rgba(255,255,255,0.06)",
                color: "white",
                outline: "none",
                textAlign: "center",
                boxSizing: "border-box",
                fontFamily: "inherit",
              }}
            />

            {error && (
              <p style={{ color: "#ef4444", fontSize: 14, textAlign: "center", margin: 0 }}>
                {error}
              </p>
            )}

            <button
              type="button"
              onClick={handleJoin}
              disabled={!nickname.trim() || isJoining || !isConnected || !playerId}
              style={{
                width: "100%",
                padding: "16px 24px",
                borderRadius: 14,
                background: nickname.trim() && isConnected ? "white" : "rgba(255,255,255,0.1)",
                color: nickname.trim() && isConnected ? "#08080d" : "rgba(255,255,255,0.35)",
                fontWeight: 850,
                fontSize: 18,
                border: "none",
                cursor: nickname.trim() && isConnected ? "pointer" : "not-allowed",
                fontFamily: "inherit",
              }}
            >
              {isJoining ? "Подключение..." : "Войти в игру"}
            </button>

            {!isConnected && (
              <p style={{ color: "rgba(255,255,255,0.34)", fontSize: 13, margin: 0 }}>
                Подключение к серверу...
              </p>
            )}
          </>
        ) : (
          <>
            {roomState?.currentGame && (
              <p
                style={{
                  color: "rgba(255,255,255,0.44)",
                  fontSize: 13,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  margin: 0,
                  fontWeight: 700,
                }}
              >
                {roomState.currentGame}
              </p>
            )}

            <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 8 }}>
              {visiblePlayers.map((player) => (
                <div
                  key={player.id}
                  style={{
                    padding: "10px 16px",
                    borderRadius: 12,
                    background: player.isConnected ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.03)",
                    color: player.isConnected ? "white" : "rgba(255,255,255,0.34)",
                    fontWeight: 650,
                    fontSize: 16,
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: player.isConnected ? "#22c55e" : "rgba(255,255,255,0.22)",
                      flexShrink: 0,
                    }}
                  />
                  {player.nickname}
                  {roomState?.gameHostPlayerId === player.id && (
                    <span style={{ marginLeft: "auto", fontSize: 12, color: "rgba(255,255,255,0.42)" }}>
                      ведущий
                    </span>
                  )}
                </div>
              ))}
            </div>

            {canStartGame ? (
              <button
                type="button"
                onClick={handleStartGame}
                style={{
                  width: "100%",
                  padding: "18px 24px",
                  borderRadius: 16,
                  background: "white",
                  color: "#08080d",
                  fontWeight: 900,
                  fontSize: 20,
                  border: "none",
                  cursor: "pointer",
                  letterSpacing: "0.02em",
                  boxShadow: "0 0 40px rgba(255,255,255,0.15)",
                  fontFamily: "inherit",
                }}
              >
                НАЧАТЬ ИГРУ
              </button>
            ) : (
              <p style={{ color: "rgba(255,255,255,0.42)", fontSize: 16, textAlign: "center", margin: 0 }}>
                Ожидание ведущего...
              </p>
            )}
          </>
        )}
      </div>
    </main>
  );
}
