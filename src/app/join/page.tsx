"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Locale = "ru" | "en";

const t = {
  roomCode: { ru: "Код комнаты", en: "Room code" },
  enterCode: { ru: "Введите 6-значный код", en: "Enter the 6-digit code" },
  join: { ru: "Войти", en: "Join" },
} satisfies Record<string, Record<Locale, string>>;

export default function JoinIndexPage() {
  const router = useRouter();
  const [locale, setLocale] = useState<Locale>("ru");
  const [code, setCode] = useState("");

  useEffect(() => {
    if (typeof navigator !== "undefined" && navigator.language.startsWith("en")) {
      queueMicrotask(() => setLocale("en"));
    }
  }, []);

  const handleSubmit = useCallback(() => {
    const normalized = code.trim().toUpperCase();
    if (normalized.length !== 6) return;
    router.push(`/join/${normalized}`);
  }, [code, router]);

  const canSubmit = code.trim().length === 6;

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
          minHeight: "70vh",
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
            {t.roomCode[locale]}
          </p>
          <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 15, margin: 0 }}>
            {t.enterCode[locale]}
          </p>
        </div>

        <input
          autoFocus
          value={code}
          onChange={(event) => setCode(event.target.value.toUpperCase().slice(0, 6))}
          onKeyDown={(event) => {
            if (event.key === "Enter" && canSubmit) handleSubmit();
          }}
          placeholder="ABC123"
          maxLength={6}
          inputMode="text"
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
          style={{
            width: "100%",
            fontSize: 28,
            fontWeight: 800,
            letterSpacing: "0.18em",
            padding: "14px 18px",
            borderRadius: 14,
            border: "1.5px solid rgba(255,255,255,0.15)",
            background: "rgba(255,255,255,0.06)",
            color: "white",
            outline: "none",
            textAlign: "center",
            boxSizing: "border-box",
            fontFamily: "var(--font-mono), monospace",
            textTransform: "uppercase",
          }}
        />

        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit}
          style={{
            width: "100%",
            padding: "16px 24px",
            borderRadius: 14,
            background: canSubmit ? "white" : "rgba(255,255,255,0.1)",
            color: canSubmit ? "#08080d" : "rgba(255,255,255,0.35)",
            fontWeight: 850,
            fontSize: 18,
            border: "none",
            cursor: canSubmit ? "pointer" : "not-allowed",
            fontFamily: "inherit",
          }}
        >
          {t.join[locale]}
        </button>
      </div>
    </main>
  );
}
