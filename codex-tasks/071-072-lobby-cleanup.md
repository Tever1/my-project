# TASK-071 + TASK-072: Lobby cleanup — remove debug logs + fix useSearchParams Suspense

## Context

Two small cleanup tasks in the Lobby component, no logic changes.

---

## TASK-071: Remove debug console.logs from Lobby.tsx

Four debug logs were added in TASK-068 for diagnosing an auth bug (now fixed in 3b790f7).
They must be removed.

**File:** `src/components/lobby/Lobby.tsx`

Remove these exact lines (and only these — do NOT touch line 987 `console.log("friends panel — TODO")`):

- Line ~1234: `console.log('[AuthDropdown] mousedown OUTSIDE → onClose called. target:', ...)`
- Line ~1277: `console.log('[AuthDropdown] handleVerifyCode start, step:', ...)`
- Line ~1287: `console.log('[AuthDropdown] verifyCode OK → setStep nickname');`
- Line ~1296: `console.log('[AuthDropdown] handleSetNickname called, nickname length:', ...)`

These are the only lines that start with `[AuthDropdown]`. Remove the full line in each case.

---

## TASK-072: Fix useSearchParams() Suspense boundary

**Problem:** `npm run build` fails with:
```
useSearchParams() should be wrapped in a suspense boundary at page "/"
```

`src/components/lobby/Lobby.tsx` calls `useSearchParams()` at line ~177.
Next.js requires any component using `useSearchParams()` to be wrapped in `<Suspense>` in the page tree.

**Fix:** In both page files, wrap `<Lobby>` with `<Suspense fallback={null}>`.

### File 1: `src/app/page.tsx`

Before:
```tsx
"use client";

import { Lobby } from "@/components/lobby";

export default function Home() {
  return <Lobby />;
}
```

After:
```tsx
"use client";

import { Suspense } from "react";
import { Lobby } from "@/components/lobby";

export default function Home() {
  return (
    <Suspense fallback={null}>
      <Lobby />
    </Suspense>
  );
}
```

### File 2: `src/app/lobby/[roomId]/page.tsx`

Before:
```tsx
"use client";

import { Lobby } from "@/components/lobby";
import { useParams } from "next/navigation";

export default function LobbyRoute() {
  const { roomId } = useParams<{ roomId: string }>();
  return <Lobby initialRoomCode={roomId} />;
}
```

After:
```tsx
"use client";

import { Suspense } from "react";
import { Lobby } from "@/components/lobby";
import { useParams } from "next/navigation";

export default function LobbyRoute() {
  const { roomId } = useParams<{ roomId: string }>();
  return (
    <Suspense fallback={null}>
      <Lobby initialRoomCode={roomId} />
    </Suspense>
  );
}
```

---

## Whitelist

Only these 3 files may be modified:
- `src/components/lobby/Lobby.tsx`
- `src/app/page.tsx`
- `src/app/lobby/[roomId]/page.tsx`

Do NOT touch: `CLAUDE.md`, `AGENTS.md`, `.codex/**`, `codex-tasks/**`, `server.mts`, or any other file.

## Acceptance criteria

1. `npm run lint` passes with no new errors.
2. `npm run build` completes without the `useSearchParams` suspense error.
3. The 4 `[AuthDropdown]` console.logs are gone from `Lobby.tsx`.
4. Line 987 (`console.log("friends panel — TODO")`) is untouched.

## Report

Write report to `codex-reports/071-072-lobby-cleanup.md`.
Do NOT commit.
