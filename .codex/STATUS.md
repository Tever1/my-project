# Codex ↔ Claude — Шина состояния

Кто что делает прямо сейчас. Перед стартом любой работы — проверить этот файл.
После завершения — обновить.

---

## Активные таски

### TASK-053: Auth buttons glass 20%
- **Статус:** in-progress
- **Исполнитель:** Codex (manual by user)
- **Запущено:** 2026-05-10
- **Файлы (locked):** src/components/lobby/Lobby.tsx
- **Task spec:** `codex-tasks/053-auth-buttons-glass.md`
- **Report:** _(ожидается)_

<!--
Формат записи активного таска:

### TASK-NNN: <короткое название>
- **Статус:** in-progress | review | blocked
- **Исполнитель:** Codex (auto by Claude) | Codex (manual by user) | Claude
- **Запущено:** 2026-05-01 23:45
- **Файлы (locked):** src/foo/bar.ts, src/foo/baz.ts
- **Task spec:** `codex-tasks/NNN-name.md`
- **Report:** `codex-reports/NNN-name.md` (если есть)
-->

---

## Правила работы с шиной

1. **Один таск = эксклюзивная блокировка файлов.** Если в активном таске стоит
   `src/foo/bar.ts`, никто другой этот файл не трогает до завершения.
2. **Codex перед стартом** делает `git pull` и сверяется с STATUS.md.
3. **Claude никогда не правит файлы**, которые залочены за активным Codex-таском.
4. **После завершения** — переносим запись в раздел «История» ниже + удаляем
   из «Активных».
5. **Если таск заблокирован** (нужно решение от Claude/пользователя) — статус
   `blocked` + причина в комментарии.

---

## История (последние 10 завершённых)

### TASK-031: Встроить авторизацию в лобби, удалить /auth страницы — ✅ done
- Завершено: 2026-05-08
- Коммит: `8cf3527`
- Резюме: AuthDropdown (телефон→код→никнейм) встроен в TopBar. /auth и /auth/verify удалены. AvatarPill показывает «Вход» для гостей, аватар для залогиненных.

### TASK-030: Фикс QR-кода — реальный IP вместо localhost — ✅ done
- Завершено: 2026-05-08
- Коммит: `8b213a4`
- Резюме: новый `GET /api/local-ip` (os.networkInterfaces → первый non-internal IPv4). RoomMenu фетчит при монте, подставляет `http://192.168.x.x:PORT` в joinUrl. Fallback на window.location.origin.

### TASK-029: Кнопка «ТВ-режим» в TopBar — ✅ done
- Завершено: 2026-05-08
- Коммит: `8b213a4`
- Резюме: «История» заменена на «ТВ-режим». NavButton расширен onClick/disabled. Disabled без roomCode, активна — открывает /tv/{code} в новой вкладке. Keyboard order: history → tv.

### TASK-028: Унификация дизайна лобби — ✅ done
- Завершено: 2026-05-07
- Коммит: `b5e67f6`
- Резюме: `<Lobby initialRoomCode?>` вынесен в `src/components/lobby/Lobby.tsx`. `/` и `/lobby/[roomId]` стали тонкими wrapper'ами (7 и 9 строк). Хост после create → `router.push('/lobby/CODE')`. Гость по QR видит новый PS5-дизайн. Lint 0, tsc 0, build OK.

### TASK-027: Lint cleanup Волна 3 — ✅ done
- Завершено: 2026-05-07
- Коммит: _(pending)_
- Резюме: 11 react-hooks/* errors закрыты в 7 файлах. queueMicrotask-обёртки для setState в init effects (i18n-provider, auth-context, admin). use-socket: добавлен `socketInstance` state (потребители socket не используют). mafia: nicknameCache ref→state с grow-only merge. quiz: countdownRef + isHostRef/gameStateRef в useEffect, runCountdown plain fn. tv: initSpyCanvas вынесен на top level (rules-of-hooks fix). Lint 11 → 0 problems. Build/tsc clean.

### TASK-026: Smoke QA после Волн 1 и 2 — ✅ done
- Завершено: 2026-05-07
- Коммит: `470cdea`
- Резюме: все 16 фактических routes (без `/ru`-префикса) → 200. `/api/socketio` → 200 (socket handshake OK). `tsc --noEmit` без ошибок. `npm run build` exit 0. `npm run lint` → 11 problems (все Wave 3, зарезервированы). Сервер стартует без ошибок. Путь `/ru/...` в ТЗ был неверен — это ошибка спека, не регрессия.

### TASK-025: Lint cleanup Волна 2 — ✅ done
- Завершено: 2026-05-07
- Коммит: `c92cd96`
- Резюме: 8 exhaustive-deps проблем закрыты в 5 файлах (alias, crocodile, mafia, quiz, tv). `isDayTimerActive` extract в mafia предотвращает параллельные таймеры. `revealResults` поднят выше useEffect в quiz (TDZ fix) + `timeLeft` удалён из его deps. `locale` добавлен в tv deps. Lint 19 → 11 problems.

### TASK-024: Lint cleanup Волна 1 — ✅ done
- Завершено: 2026-05-07
- Коммит: `3e00efd`
- Резюме: eslint.config.mjs игнорирует `.agents/**` и `mobile/**`, удалены unused vars/imports в 5 src-файлах, удалён `factCheckSingle`, заменён `any` на тип в admin. Lint 73 → 19 problems; оставшиеся 19 — react-hooks/* (Волны 2/3).

### TASK-018.1: Join-submit icon-only + arrow-nav из input — ✅ done
- Завершено: 2026-05-04
- Резюме: «Присоединиться» заменена на icon-only (SVG enter/login), ширина
  60px — теперь умещается в той же строке справа от join-code wrapper
  (sameRow=true, submitToRight=true). В editing input при курсоре в
  конце value и 6 chars, ArrowRight фокусирует join-submit напрямую
  (без необходимости Esc).

### TASK-018: Join-code Esc + «Присоединиться» при 6 chars — ✅ done
- Завершено: 2026-05-03
- Резюме: wrapper вокруг join-code input стал button (data-lobby-cta="join-code"),
  input получил "join-code-input". Two-stage focus: ArrowRight с rules
  → editing input → Esc → selected wrapper (per-game accent ring 3px) →
  ArrowLeft → rules / Enter → editing / ArrowRight → join-submit.
  Кнопка «Присоединиться» (data-lobby-cta="join-submit") появляется при
  joinCode.length===6, добавлена в CTA order условно.

### TASK-017: ArrowRight from «Правила» → join-code input — ✅ done
- Завершено: 2026-05-03
- Резюме: Hero CTA order стал `[start, rules, join-code]`. Стрелка → с
  «Правила» фокусирует input «Код комнаты». В input стрелки работают
  нативно (handler пропускает событие в INPUT/TEXTAREA).

### TASK-016: AvatarPill → button + keyboard order — ✅ done
- Завершено: 2026-05-03
- Резюме: AvatarPill переведён с `<div>` на `motion.button` с
  `data-topbar="avatar"` и 3px focus ring (заготовка под popup аккаунта).
  Order: `[play, friends-nav, history, friends-online, room, avatar]`.

### TASK-015 + 015.1: TopBar — FriendsPill как button + visual order + focus rings — ✅ done
- Завершено: 2026-05-03
- Резюме: FriendsOnlinePill переведён с `<div>` на `motion.button` с
  `data-topbar="friends-online"` и 3px focus ring. NavButton «Друзья»
  получил `topbarId="friends-nav"`. Order array обновлён до
  `['play', 'friends-nav', 'history', 'friends-online', 'room']` — natural
  left-to-right. RoomButton focus ring увеличен до 3px и пофикшен баг с
  невалидным CSS `boxShadow: 'X, none'` — теперь корректно показывается.

### TASK-014: Sync DOM focus with activeGame on ←/→ — ✅ done
- Завершено: 2026-05-03
- Резюме: после mouse-клика на тайле фокус оставался на body — ←/→ меняли
  activeGame, но focus не переезжал, и Enter не находил «inTileStrip».
  Также при ↓ → tile, ← → next-from-activeGame вместо next-from-focused.
  Исправлено: в ←/→ handler берём curId из focused.dataset.gameId если
  focus в strip, иначе из activeGame; после setActiveGame явно фокусируем
  новый тайл через querySelector. QA подтвердило press effect на правильном
  тайле во всех сценариях.

### TASK-010..013.2: Lobby keyboard navigation + tile press effect — ✅ done
- Завершено: 2026-05-03
- Резюме: серия итераций (010, 010.1-.4, 011-011.1, 012, 013-013.2):
  полный keyboard flow в /lobby-preview (←/→/↑/↓/Enter/Escape по
  TopBar / hero CTA / tile-strip), focus-ring на всех интерактивных
  элементах, рабочий press-effect на тайлах (mouse + Enter) через
  явный `pressed` state. QA через Claude Preview MCP — все 7 тайлов
  показывают scale ~0.90 на mouse pointerdown и keyboard Enter.

### TASK-009: Remove floating badges from TiltedPreview — ✅ done
- Завершено: 2026-05-03
- Резюме: удалены оба декоративных бейджа («8 онлайн» и «2 480 лучший рекорд»),
  которые перекрывали ответы и таймер в карточке предпросмотра. Удалён сам
  компонент `FloatingBadge`. QA через Claude Preview MCP — на 1100px все
  ответы и таймер теперь полностью видны.

### TASK-008: TopBar polish 1025-1100px (narrow desktop) — ✅ done
- Завершено: 2026-05-03
- Резюме: добавлен SSR-safe хук `useIsNarrowDesktop()` (matchMedia
  `(min-width:1025px) and (max-width:1100px)`). В этом диапазоне ужаты
  padding/gap/fontSize у `<header>`, `NavButton`, `FriendsOnlinePill`,
  `RoomButton`, `AvatarPill`. Wide desktop (>1100px) и mobile (≤1024)
  не тронуты. QA через Claude Preview MCP — на 800/1025/1080/1100/1101/1200
  всё корректно, нет overflow.

### TASK-007: Rename UI label "Alias" → "Угадай слово" — ✅ done
- Завершено: 2026-05-03
- Резюме: заменён видимый текст "Alias" на "Угадай слово" в 4 файлах
  (lobby-preview, admin, design-tokens, game-stats route). Внутренний id
  `'alias'`, маршруты, socket-события, типы — не тронуты.

### TASK-006: Tile variants section in /design-tokens — ✅ done
- Завершено: 2026-05-03
- Резюме: новая секция «Тайл игры — варианты» в `/design-tokens` с двумя
  под-блоками: TileFramed (frosted-glass рамка как в lobby-preview) и
  TileNaked (только иконка + лейбл, без рамки). Все 7 игр в каждом варианте.

### TASK-005.3: Drop achromatic pass from strip-bg.mjs — ✅ done
- Завершено: 2026-05-03
- Резюме: ахроматический проход съедал внутренние glassy-блики на
  стеклянных иконках (e.g. циферблат секундомера в alias.png). Удалён —
  flood-fill от углов сам справляется и с шахматкой, и с halo, не трогая
  внутренние блики.

### TASK-005.2: Flood-fill from corners — ✅ done
- Завершено: 2026-05-03
- Резюме: 4-связный BFS от 4 углов с порогом `min(R,G,B) ≥ 180` для
  «light gate». Убирает светлый halo вокруг субъекта (например бледно-жёлтый
  ореол вокруг мозга в quiz.png), который ахроматический фильтр не цеплял.

### TASK-005.1: Achromatic background detection — ✅ done (потом удалено в 005.3)
- Завершено: 2026-05-03
- Резюме: расширил логику стрипа — `min ≥ 220 && max-min ≤ 15` ловило
  и серые клетки шахматки (R≈G≈B). Логика убрана в TASK-005.3 как
  слишком агрессивная.

### TASK-005: Strip white background from icons (RGB → RGBA) — ✅ done
- Завершено: 2026-05-03
- Резюме: новый скрипт `scripts/strip-bg.mjs` + `npm run strip-bg`,
  использует `sharp`. ChatGPT image gen экспортирует PNG без альфа-канала,
  скрипт обрабатывает все PNG в `public/icons/games/` и делает фон
  прозрачным.

### TASK-004: Fix GameIcon cached-image loaded — ✅ done
- Завершено: 2026-05-03
- Резюме: cached PNG не показывались (opacity:0) потому что onLoad
  срабатывал синхронно до навешивания React listener'а. Добавлен
  useRef + useEffect с проверкой `complete && naturalWidth > 0` +
  `queueMicrotask(setLoaded)` для обхода set-state-in-effect lint.

### TASK-003.1: Breakpoint 900 → 1024 — ✅ done
- Завершено: 2026-05-03
- Резюме: при breakpoint=900 на 901-1023 header overflowал на ~42px
  даже с nowrap. Поднят до 1024 — реальный desktop layout требует
  ≥1025px чтобы все TopBar-элементы поместились на одной строке.

### TASK-003: TopBar nowrap (FriendsOnlinePill + RoomButton) — ✅ done
- Завершено: 2026-05-03
- Резюме: добавлен `whiteSpace: nowrap` для текстов "4 друзей онлайн"
  и "Создать комнату", чтобы они не переносились на 2 строки в узком
  desktop. Diff: 2 строки.

### TASK-002.1: Mobile polish (breakpoint 768→900, brand nowrap) — ✅ done
- Завершено: 2026-05-03
- Коммит: _(вместе с TASK-002)_
- Резюме: breakpoint поднят до 900px (имя Аня больше не обрезается на
  769-900). Brand "Party Hub" получил `whiteSpace: nowrap` (не переносится
  на 375px). Diff: ровно 2 строки изменений.

### TASK-002: Mobile layout для /lobby-preview — ✅ done
- Завершено: 2026-05-02
- Коммит: _(pending)_
- Резюме: добавлен SSR-safe `useIsMobile` (breakpoint 768px), hero
  стэкается в одну колонку, TiltedPreview/floating badges/nav/
  FriendsOnlinePill/имя в Avatar скрыты на мобиле, CTA-row
  стэкается вертикально с full-width кнопками, tile-strip получил
  scroll-snap. Desktop layout не изменился. Build OK, lint без новых.

### TASK-001: Убрать unused variables — ✅ done
- Завершено: 2026-05-02
- Коммит: _(pending — ждёт ревью пользователя)_
- Резюме: lint 82 → 73 problems, все 9 целевых warnings/errors убраны.
  Build OK. Diff в 5 whitelisted файлах (+12 -14). Codex использовал
  `void` pattern для сохранения сигнатур `_totalTime` и `socketId`
  вместо удаления (правильное решение — не ломает callers).

<!--
Формат истории:

### TASK-NNN: <название> — ✅ done | ❌ failed | 🔄 reverted
- Завершено: 2026-05-01 23:55
- Коммит: `abc1234`
- Резюме: что вышло, какие были отклонения
-->
