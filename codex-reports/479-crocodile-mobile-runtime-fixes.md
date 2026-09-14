# TASK-479 — Crocodile mobile runtime fixes

## Goal

Fix four Crocodile runtime issues reported from the lobby and a physical phone:

- a themed Quiz background remaining after selecting Crocodile;
- the turn timer moving backwards when a word card is swiped;
- the initial minute rendering as `00:60` instead of `01:00`;
- the page scrolling together with the active swipe card.

## Changed files

- `src/components/lobby/Lobby.tsx`
  - shows the special Quiz background only while Quiz is the active selection.
- `src/app/game/[roomId]/crocodile/page.tsx`
  - uses the shared `MM:SS` formatter;
  - merges full state syncs without allowing an older same-turn value to reset the phone timer;
  - keeps `gameStateRef` synchronized with every local host tick so a swipe cannot restore the previous time;
  - disables native touch scrolling on the active draggable card;
  - locks the Crocodile game surface to the viewport during the explainer's active turn.
- `src/app/tv/[roomId]/[gameType]/page.tsx`
  - replaces the `00:${seconds}` Crocodile timer with the shared formatter;
  - enlarges and centers the active-player information and timer on large TV screens;
  - enlarges the one-column progress table while retaining all 10 player rows without overlap.
- `src/server/game-security.mts`
  - authorizes `croc:tick` as a controller state-sync action so every second reaches other phones and TV;
  - prevents a full Crocodile state sync from increasing `timeLeft` during the same active turn;
  - still allows a new turn to reset to 60 seconds.
- `src/server/game-security.test.mts`
  - adds regression coverage for same-turn timer rewind and new-turn reset.
- `src/lib/format-game-time.ts`
  - adds a shared zero-padded `MM:SS` formatter.
- `src/lib/format-game-time.test.ts`
  - verifies `60 -> 01:00`, `59 -> 00:59`, and negative input clamping.
- `src/lib/crocodile-state-sync.ts`
  - protects the phone's active-turn countdown while still accepting the next word, score changes, and a fresh minute for a new player turn.
- `src/lib/crocodile-state-sync.test.ts`
  - reproduces the exact `42 seconds -> swipe state with 60 seconds` reset and verifies that a different player may start at 60.
- `src/server/crocodile-timer.integration.test.mts`
  - starts a real local Socket.io room with a host, another phone, and TV;
  - verifies `59 -> stale swipe state with 60 -> 59 -> next tick 58` on both recipients.
## Checks

- `npx tsx --test src/server/crocodile-timer.integration.test.mts src/server/game-security.test.mts src/lib/crocodile-state-sync.test.ts src/lib/format-game-time.test.ts` — passed, 20 tests.
- `npx tsc --noEmit` — passed.
- scoped ESLint for all changed TypeScript and TSX files — passed.
- `git diff --check` — passed.

## Browser / runtime QA

- A real isolated Socket.io room verified timer delivery to a second phone client and TV independently of swipes.
- TV layout was checked in the browser with 10 players at 1280×720 and 1920×1080; no overlap or clipping was found.
- The touch-scroll behavior and timer continuity have not yet been rechecked on a physical phone.
- External Chrome phone windows could not be controlled because the Codex browser extension was unavailable in that browser profile.
- Production build was not run.

## Follow-up diagnosis

Two independent faults produced the reported behavior. The host's interval
updated React state but left `gameStateRef` at the old value, so a swipe could
restore the previous time. Separately, the server authorization list omitted
`croc:tick`, so other phones and TV received time changes only with the next
full swipe state. The focused Socket.io test was observed timing out before the
server fix and passing afterwards.

## Follow-up / risk

The change touches the shared lobby, TV renderer, and server snapshot reducer.
A separate review pass plus an explicit physical-phone and TV regression are
required before publication.

## 2026-09-08: Card word sizing follow-up

- User screenshots show single words and a two-word phrase rendered at the
  minimum font size despite abundant card space.
- `src/components/games/FitText.tsx`: replaced one-time measurement with
  resize/font-load-aware fitting. Each whitespace-delimited word is an
  unshrinkable, nonwrapping span; wrapping occurs only between words. The
  largest fitting size up to 58px is chosen for production cards. Extremely
  long tokens can shrink below the preferred minimum to avoid overflow.
- `src/app/game/[roomId]/crocodile/page.tsx`: the text area now has definite
  bounds inside the remaining card space, independent of text content.
- Code evidence: the old layout effect measured only on text/size changes
  and never retried after layout or font loading. The exact physical Safari
  timing that produced the screenshots has not been reproduced locally.
- TypeScript, scoped ESLint and diff whitespace checks passed. No browser or
  physical-phone QA was run for this follow-up; visual validation on the
  reported Safari device remains pending. Production build was not run.
- TV never renders the private word and is unaffected. No timer, scoring,
  server or swipe animation changes were made. Existing unrelated changes
  were preserved. This is an iteration of TASK-479, not a new numbered task.

## 2026-09-08: Host sleep and Safari sizing correction

The previous sizing follow-up was not sufficient on physical Safari: the user
reported nearly invisible words. FitText now tolerates the one-pixel difference
between rounded client/scroll dimensions, disables Safari text autosizing for
this component and retains the 18px minimum instead of shrinking to 1px.
Isolated WebKit 26.5 checks used the actual bundled React component with layout
styles at 245.5, 285.5 and 320.25px text-area widths. Russian single words,
two-word phrases and English phrases fit, with word-only wrapping. This is not
a physical iPhone check or a complete game-flow browser check.

Crocodile now participates in the existing server room clock. Server ticks
continue when the host disconnects or sleeps. Same-turn swipes preserve the
server time and fractional elapsed second; legacy browser ticks are ignored.
Starting a turn sets 60 seconds. Expiry advances to the next ready player or
finishes the final round and selects the highest score. Older turn snapshots
are rejected. The phone no longer runs a countdown interval. Recipient-specific
snapshot sanitization remains in use, including for TV.

Changed: FitText, Crocodile phone page, game-security.mts, socket-handlers.mts,
crocodile-timer.integration.test.mts. Unrelated Mafia changes in shared server
files were inspected and preserved.

Checks: 19 server/security tests passed, including no-tick delivery, a forged
zero tick, stale swipe state, disconnected host, full-minute expiry and final
round completion. Final TypeScript, scoped ESLint and diff checks passed.

Activation requires a server restart and new room. The currently running
GBP5F7 room was preserved. No build, commit or push. Separate server review
is required before publication. The next player's start/swipe actions still
use the existing game-host command flow; this task moves the clock and expiry,
not all game commands, to the server.

## 2026-09-11: Server-owned swipes and stable phone word sizing

The remaining 2–3 second word delay came from the command path rather than the
card animation: a non-host explainer sent the swipe to the game host, and only
the host selected and broadcast the next word. Start, guessed and skip commands
are now reduced against the canonical room snapshot on the server. The server
immediately publishes the next recipient-specific snapshot even when the host
is marked away. Commands carry the expected turn and word index; stale or
duplicate swipes are rejected before scoring. Same-turn host state syncs can no
longer overwrite server-owned Crocodile words, scores or final-round state.

The phone keeps the outgoing card until both its exit motion and the
authoritative next word are ready, so the lower card can reveal the new word
without a late replacement or jump. The fixed 620 ms reset no longer races the
network response.

For physical Safari, FitText now ignores transient nearly-collapsed geometry
during card promotion and remeasures on the next animation frame. Its box uses
definite absolute bounds, and the production word area is 32 px wider while
remaining inside the card. An isolated WebKit 26.5 pass measured the complete
Russian and English Crocodile word bank at the 390×844 phone geometry: all
words stayed within the card, wrapping only at spaces, with a minimum fitted
size of 35 px.

Checks:

- Crocodile Socket.io integration: 3/3 passed, including an away host,
  server-resolved start/swipe, phone/TV synchronization, TV word privacy and a
  rejected duplicate guess.
- game-security tests: 17/17 passed.
- `npx tsc --noEmit`, scoped ESLint and `git diff --check` passed.
- No production build, full browser multiplayer QA or physical-iPhone retest
  was run. The running server was not restarted, so activation still requires
  a restart and a new room. A separate server review remains required before
  publication.

## 2026-09-12: PLAY AGAIN after a multi-turn final

The PLAY AGAIN button builds a fresh ready snapshot with turnNumber 1. The
server's stale-turn guard rejected that lower number even after phase finished,
while the host had already optimistically shown the new party. Subsequent
start-turn requests were rejected against the old final snapshot, producing
the reported hang.

Changed only the Crocodile phase validator in game-security.mts: finished to
ready with turnNumber 1 is an explicit replay exception. Active-turn stale
snapshot protection, host authorization and private word filtering remain
unchanged. No UI, timer, scoring or final-round rule was changed.

Regression coverage in crocodile-timer.integration.test.mts first failed at
the same state-sync gate and passed after the fix. A real isolated Socket.io
scenario completes turn 8 and its final result, replays to turn 1, verifies
zero scores and cleared finishingRound on peer and TV, restores the canonical
host snapshot, starts a fresh 60-second turn and accepts a guessed word.

Checks: 22/22 Crocodile and game-security tests, TypeScript, scoped ESLint and
git diff --check passed. Browser/device QA, build, restart, commit and push were
not performed. Server restart is required to activate the backend change;
existing live rooms were preserved. Separate server review remains required
before publication. Existing unrelated dirty work was preserved.
