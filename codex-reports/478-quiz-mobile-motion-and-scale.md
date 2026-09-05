# TASK-478 — Quiz mobile motion, scale and TV rankings

## Goal

Bring the approved Quiz «Пульс эфира» production UI and its design preview in
line with the latest product feedback:

- reliable ambient background motion on physical phones;
- a smooth timer and animated answer states;
- separate question and answer surfaces;
- one-column TV rankings for intermediate and final results;
- an approximately 50% larger mobile visual scale.

## Changed files

- `src/components/games/quiz-pulse/QuizPulse.tsx`
  - replaced the ambient sweep with a CSS/GPU transform animation;
  - changed the timer from animated width to a one-second linear `scaleX`
    transition between server ticks;
  - added staggered answer entry, press feedback and selected/correct glints;
  - separated question and answer panels on phone and TV;
  - enlarged phone typography, answer targets, status bars and controls;
  - reduced the phone question and answer panels by about 15% after live
    product feedback, without changing the surrounding phone states;
  - changed TV intermediate/final rankings to one compact vertical list.
  - made phone and TV ranking density responsive to 2–4, 5–7 and 8–10
    players; small rooms use larger rows while TV also narrows the list.
  - centered the TV question in the available stage and anchored the separate
    answer panel at the bottom.
- `src/app/quiz-design-preview/QuizPulseScreenGallery.tsx`
  - synchronized the approved preview with the production changes above;
  - preserved the ten-player phone and TV examples.
  - synchronized the centered-question / bottom-answers TV composition.
- `src/app/globals.css`
  - added Quiz-scoped transform/opacity keyframes;
  - limited continuous motion to `prefers-reduced-motion: no-preference`.

## Checks

- `npx tsc --noEmit` — passed.
- scoped ESLint for the two changed TSX files — passed.
- `git diff --check` — passed.

## Not run

- Browser/multiplayer QA was not run because it requires explicit product-owner
  authorization.
- The physical-phone behavior and exact 390×844 composition remain to be
  visually confirmed on a real device.
- Production build was not run.

## Follow-up / risk

The change affects Quiz rendering on the shared TV route. A separate review
pass and the explicit phone + TV regression remain required before publishing.
