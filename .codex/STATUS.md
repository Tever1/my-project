# Codex Status

## Active (2026-06-07): аудит игр vs Квиз — серия P0 «гость = game-host» ✅ ГОТОВО (ждёт коммита)
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
