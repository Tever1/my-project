# TASK-152: создать страницу `/join` с полем ввода кода комнаты

> **Метаданные**
> - **Дата создания:** 2026-05-26
> - **Сложность:** simple
> - **Запуск:** manual by user (Codex Desktop)
> - **Ожидаемое время Codex:** ~3 минуты
> - **Зависит от тасков:** —

---

## Цель

По адресу `/join` (без кода) показывать минимальный экран с полем ввода 6-символьного кода комнаты. После ввода и сабмита — редирект на `/join/<CODE>`, где уже работает существующая логика подключения.

---

## Контекст

Сейчас существует только динамический route `/join/[code]` (`src/app/join/[code]/page.tsx`). Если зайти на `/join` без кода — 404.

Пользователь хочет: на телефоне открыть `http://192.168.0.91:3000/join` и сразу увидеть поле ввода кода. Это нужно как fallback, когда QR недоступен (например, телефон без камеры или с проблемами сканирования).

Никакие другие файлы и поведение не трогаем — это **отдельная новая страница**, не вмешивается в существующие flows.

---

## Файлы к изменению (whitelist)

- `src/app/join/page.tsx` — **создать**. Минимальная страница: один input + кнопка «Войти», редирект на `/join/<CODE>`.

### НЕ ТРОГАТЬ

- `src/app/join/[code]/page.tsx` — существующая логика подключения остаётся как есть.
- `src/app/page.tsx` (`/`) — не трогать.
- `src/components/lobby/Lobby.tsx`, `src/components/Splash.tsx`, `src/components/ModeGate.tsx` — не трогать.
- Любые server/auth файлы — не трогать.
- `CLAUDE.md`, `AGENTS.md`, `.codex/**`, `codex-tasks/**`.

---

## Шаги реализации

### Шаг 1: создать `src/app/join/page.tsx`

```tsx
"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";

export default function JoinIndexPage() {
  const router = useRouter();
  const [code, setCode] = useState("");

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
            Код комнаты
          </p>
          <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 15, margin: 0 }}>
            Введите 6-значный код
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
          Войти
        </button>
      </div>
    </main>
  );
}
```

### Шаг 2: проверки

- `npm run lint` без новых ошибок.
- `npx tsc --noEmit` успешен.
- `npm run build` успешен (опционально).

---

## Acceptance criteria

- [ ] `npm run lint` без новых ошибок
- [ ] `npx tsc --noEmit` успешен
- [ ] `/join` (без кода) рендерит страницу с полем ввода
- [ ] После ввода 6 символов + клик «Войти» (или Enter) → редирект на `/join/<CODE>`
- [ ] Существующая страница `/join/[code]` не тронута
- [ ] Никаких изменений вне whitelist

---

## Открытые вопросы

Нет.

---

## Отчёт

Codex пишет отчёт в `codex-reports/152-join-index-page-with-code-input.md`:
- diff-сводка (новый файл)
- результаты lint/tsc
