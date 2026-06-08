# Codex Status

## Active (2026-06-07): аудит игр vs Квиз — серия P0 «гость = game-host» ✅ ГОТОВО (ждёт коммита)
Создан хук src/lib/use-game-identity.ts (effectivePlayerId/isGameHost/guest-reconnect).
TASK-217: Крокодил — гость как game-host (+ хук). ✅ lint+tsc
TASK-218: Кто я? — гостевая идентичность + game-host. ✅
TASK-219: Мафия — гостевая идентичность (роли/голоса) + game-host. ✅
TASK-220: Шпион — гостевая идентичность + game-host (только identity). ✅
TASK-221: 100 к 1 — гостевая идентичность (ролевой host сохранён). ✅
Все 5 валидированы Claude: lint+tsc чисто, whitelist соблюдён, сервер не тронут.

## Очередь аудита (по убыванию значимости, ещё не начато):
P0/P1: i18n для spy + hundred-to-one (сейчас ноль двуязычности).
P1: confirm() → glass-модалка в spy + h2o.
P2: raw <button> → GlassButton (spy, h2o); per-game фон в игре.
P3: унификация скруглений (rounded-md), BreathingPlaceholder в waiting-экранах.

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
