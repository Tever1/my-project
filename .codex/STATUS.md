# Codex ↔ Claude — Шина состояния

Кто что делает прямо сейчас. Перед стартом любой работы — проверить этот файл.
После завершения — обновить.

---

## Активные таски

_Сейчас никто ничего не делает._

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
