# Codex Status

## Active (2026-06-12): TASK-231

TASK-231: Шпион — фон в цвет игры, таймеры, peek-бар, кнопка «Завершить» (complex, 4 файла)
File: codex-tasks/231-spy-polish-bg-timers-peek-end.md
Whitelist: src/app/globals.css, src/components/games/GameLayout.tsx,
  src/app/game/[roomId]/spy/page.tsx, src/app/tv/[roomId]/[gameType]/page.tsx
Пункты: #1 bg-gradient-spy (mobile+TV), #2 убрать текст-таймер, #3 круг всем,
  #4 peek «ТЫ ШПИОН»+тема, #5 «был(а)» на TV, #6 убрать нижнюю end-кнопку.

## Прошлый active (2026-06-11): TASK-230

TASK-230: Скрипт «виртуальные телефоны» для локального QA (simple)
File: codex-tasks/230-dev-phones-script.md
Whitelist: scripts/dev-phones.sh (новый), package.json
QA: dev-phones проверен живьём (2 окна = 2 игрока) ✅

## Выполнены, не закоммичены (2026-06-09): TASK-228 + TASK-229

TASK-228: ЗАВЕРШИТЬ кнопка в контентной области GameLayout (1 файл, simple)
File: codex-tasks/228-gamelayout-end-button-in-content.md
Whitelist: src/components/games/GameLayout.tsx

TASK-229: Spy draw mode — dealing/voting/roundResult фазы (complex)
File: codex-tasks/229-spy-draw-mode-new-phases.md
Whitelist: src/app/game/[roomId]/spy/page.tsx

## Ожидает коммита: TASK-226 + TASK-227
Spy full redesign (TASK-226) + restore draw mode (TASK-227) — выполнены, не закоммичены.

## Completed (2026-06-07): аудит игр vs Квиз — серия P0 «гость = game-host» ✅ ГОТОВО (ждёт коммита)
Создан хук src/lib/use-game-identity.ts (effectivePlayerId/isGameHost/guest-reconnect).
TASK-217: Крокодил — гость как game-host (+ хук). ✅ lint+tsc
TASK-218: Кто я? — гостевая идентичность + game-host. ✅
TASK-219: Мафия — гостевая идентичность (роли/голоса) + game-host. ✅
TASK-220: Шпион — гостевая идентичность + game-host (только identity). ✅
TASK-221: 100 к 1 — гостевая идентичность (ролевой host сохранён). ✅
Все 5 валидированы Claude: lint+tsc чисто, whitelist соблюдён, сервер не тронут.

## Аудит игр vs Квиз — ЗАВЕРШЁН ✅ (2026-06-07), всё закоммичено
TASK-222: spy i18n + убран двойной confirm. ✅ закоммичен d775492
TASK-223: h2o i18n + убран двойной confirm. ✅ закоммичен 691919a
TASK-224: BreathingPlaceholder в waiting-экранах 6 игр. ✅ закоммичен 4436750

### Итоги аудита (что было / что сделано):
- P0 гость=game-host: исправлено во всех 6 играх + хук useGameIdentity (217-221).
- i18n spy/h2o (был ноль): исправлено (222, 223).
- Двойной confirm (нативный поверх модалки GameLayout): убран в spy/h2o (222, 223).
- BreathingPlaceholder в waiting: унифицировано (224).
- Скругления: НЕ дефект — карточки через GlassCard (общий radius); inline rounded-* = точки/бары/пиллы.
- raw <button>: НЕ дефект — цветные контролы таймера (spy) / текст-ссылки и сетки (h2o).
- Фон в игре: НЕ дефект — нейтральный bg-gradient-main консистентен с эталоном (квиз general
  тоже нейтральный; per-game цвет — отдельный экран /join, TASK-216).

### Опционально на будущее (не в этом аудите):
- Перевести квиз на useGameIdentity (сейчас инлайн-копия того же паттерна) — убрать дубль.

## Прошлое (2026-06-04, вечер): /join двуязычность + фон комнаты
TASK-215: /join — двуязычность ru/en
File: codex-tasks/215-join-pages-bilingual.md
TASK-216: фон комнаты на телефоне в цвете игры
File: codex-tasks/216-join-room-bg-per-game-color.md

## Прошлые (баги QR-экрана и сброса игры 2026-06-04)
TASK-208: Подсветить хоста (корона) на QR-экране сбора комнаты
File: codex-tasks/208-tv-qr-highlight-host.md
TASK-209: Сброс currentGame при «← Назад к лобби»
File: codex-tasks/209-deselect-game-on-back-to-lobby.md
TASK-210: Прервать игру → лобби, когда вышли все игроки
File: codex-tasks/210-abandon-game-when-no-players.md
TASK-211: Away-подсветка игрока в верхнем баре TV
File: codex-tasks/211-tv-hud-away-state.md
TASK-212: Единый фон спец-квиза (плашка = ожидание = игра)
File: codex-tasks/212-special-quiz-bg-consistent.md
TASK-213: «Добавить игрока» в меню пустой комнаты
File: codex-tasks/213-room-menu-add-player-empty-room.md
Started: 2026-06-04

## Recently Completed
TASK-184…195: Quiz socket-config, фон спец-квиза, GameSurface — HEAD bfd2dcd
TASK-169: Удаление поля ввода кода + правила игр — коммит 0b470a9
TASK-168: fetchPriority img для тайла лобби — коммит 0c33387
TASK-167: Quiz fixes — коммит 8fa3cbd
