# Codex Status

## Active (2026-07-12): TASK-341

TASK-341: Шпион (режим «Угадывай») — не повторять адресата вопроса, пока
  не ответят все игроки текущего круга (уточнение TASK-340, было —
  чисто случайный выбор). Только `spy/page.tsx`, TV не трогать (simple,
  1 файл). Запущен Claude сама.
File: codex-tasks/341-spy-question-cycle-no-repeat.md
Whitelist: src/app/game/[roomId]/spy/page.tsx

## Ожидает пользователя в Codex Desktop (2026-07-12): TASK-340

TASK-340: Шпион (режим «Угадывай») — показывать КОМУ адресован вопрос
  (mobile+TV) + передача хода по цепочке «кого спросили — тот теперь
  сам спрашивает» вместо фиксированного круга. Draw-режим не трогать.
  Плюс убрать «вслух» на TV (complex, 2 файла, меняет турн-механику) —
  юзер запускает в Codex Desktop.
File: codex-tasks/340-spy-question-target-chain.md
Whitelist: src/app/game/[roomId]/spy/page.tsx,
  src/app/tv/[roomId]/[gameType]/page.tsx (только блок spy)

## Ожидает пользователя в Codex Desktop (2026-07-12): TASK-338

TASK-338: Шпион — новый этап «Обсуждение» (2 минуты) между окончанием
  таймера раунда и голосованием. Новая фаза + таймер-эффект (по образцу
  уже существующего voteTimer) + экраны mobile/TV (complex, 2 файла) —
  юзер запускает в Codex Desktop.
File: codex-tasks/338-spy-discussion-phase.md
Whitelist: src/app/game/[roomId]/spy/page.tsx,
  src/app/tv/[roomId]/[gameType]/page.tsx (только блок spy)

## Прошлый active (2026-07-12): TASK-337

TASK-337: Шпион — 4 live-QA фикса: надпись «Задаёт вопрос» вместо
  «Сейчас отвечает», баг «Понятно, спрятать» не прячет слово, кнопка
  отмены последнего мазка в рисовании, скрыть кто-за-кого во время
  живого голосования на TV (simple, 2 файла). Запущен Claude сама.
File: codex-tasks/337-spy-live-qa-fixes.md
Whitelist: src/app/game/[roomId]/spy/page.tsx,
  src/app/tv/[roomId]/[gameType]/page.tsx (только блок spy)

## Прошлый active (2026-07-12): TASK-335

TASK-335: Квиз/Крокодил/Alias/Шпион/100 к 1 — тот же баг зависания
  телефонов, что чинили в «Кто я?» (TASK-333). У всех 5 игр host-ответчик
  на request-state УЖЕ существует (был добавлен раньше для TV) — не
  хватает только стороны запроса на телефоне. Мехапический повтор
  паттерна в 5 файлах (simple). Запущен Claude сама.
File: codex-tasks/335-five-games-mobile-resync-request.md
Whitelist: src/app/game/[roomId]/quiz/page.tsx,
  src/app/game/[roomId]/crocodile/page.tsx,
  src/app/game/[roomId]/alias/page.tsx,
  src/app/game/[roomId]/spy/page.tsx,
  src/app/game/[roomId]/hundred-to-one/page.tsx

## Ожидает пользователя в Codex Desktop (2026-07-12): TASK-336

TASK-336: Мафия — тот же баг зависания, но Мафия — единственная игра без
  вообще какой-либо ресинхронизации (ни TV, ни телефон). Заготовка
  (sync-state case) уже существует как мёртвый код, как и было в «Кто
  я?» до TASK-333. Нужно добавить request-state + host-ответчик +
  инициаторов на телефоне и TV (complex, 2 файла) — юзер запускает в
  Codex Desktop.
File: codex-tasks/336-mafia-mobile-tv-freeze-fix.md
Whitelist: src/app/game/[roomId]/mafia/page.tsx,
  src/app/tv/[roomId]/[gameType]/page.tsx (только блок mafia)

## Прошлый active (2026-07-11): TASK-334

TASK-334: «Кто я?» — +100 персонажей в пул (30→130) + анти-повтор между
  раундами (simple, 2 файла). Запущен Claude сама.
File: codex-tasks/334-whoami-more-characters-and-no-repeat.md
Whitelist: src/lib/game-data.ts, src/app/game/[roomId]/who-am-i/page.tsx

## Ожидает пользователя в Codex Desktop (2026-07-11): TASK-333

TASK-333: «Кто я?» — баг «зависает после пары кругов» на телефонах.
  Корневая причина найдена: who-am-i — единственная из 7 игр без
  механизма ресинхронизации состояния (нет request-state/sync-state
  паттерна, который есть у quiz/crocodile/alias/spy/100к1). Пропущенный
  broadcast (телефон свернули/разлочили) навсегда рассинхронивает
  локальное состояние клиента. Fix: добавить request-state/sync-state
  по образцу quiz (complex, 2 файла) — юзер запускает в Codex Desktop.
File: codex-tasks/333-whoami-mobile-tv-freeze-fix.md
Whitelist: src/app/game/[roomId]/who-am-i/page.tsx,
  src/app/tv/[roomId]/[gameType]/page.tsx (только блок who-am-i)

## Прошлый active (2026-07-10): TASK-332

TASK-332: «Кто я?» — буквальный порт дизайна из public/design-ref (13
  файлов от Claude Design) + отдельные полноэкранные состояния для ввода
  ответа/оспаривания/судьи (правка TASK-331 по фидбеку продакта: дизайн
  не совпадал буквально, экраны были встроены как карточки а не отдельные
  состояния). Запущен Claude сама по прямой просьбе пользователя.
File: codex-tasks/332-whoami-literal-design-port-and-separate-guess-screens.md
Whitelist: src/app/game/[roomId]/who-am-i/page.tsx,
  src/app/tv/[roomId]/[gameType]/page.tsx (только блок who-am-i),
  src/components/games/WhoAmIIcon.tsx

## Прошлый active (2026-07-10): TASK-331

TASK-331: «Кто я?» — полный визуальный редизайн mobile+TV по утверждённому
  макету «Вариант 1» + референс-файлам от Claude Design (complex, 2 файла
  + 1 новый). Запущен Claude сама по прямой просьбе пользователя.
File: codex-tasks/331-whoami-full-visual-redesign.md
Whitelist: src/app/game/[roomId]/who-am-i/page.tsx,
  src/app/tv/[roomId]/[gameType]/page.tsx (только блок who-am-i),
  src/components/games/WhoAmIIcon.tsx (новый)

## Прошлый active (2026-07-10): TASK-330

TASK-330: «Кто я?» — убрать бейдж «Вопросов задано» + убрать индикатор
  угаданных с мобильного (оставить только на TV) (simple, 1 файл)
File: codex-tasks/330-whoami-remove-questions-badge-and-mobile-guessed-indicator.md
Whitelist: src/app/game/[roomId]/who-am-i/page.tsx

## Выполнен, не закоммичен (2026-07-10): TASK-329

TASK-329: «Кто я?» — баг счётчика «Да» (guard-фикс) + оспаривание ответа
  по образцу Spy. lint+tsc чисто, provalidировано Claude вручную (diff read).
File: codex-tasks/329-whoami-yes-counter-bug-and-dispute-guess.md

## Прошлый active (2026-07-10): TASK-329

TASK-329: «Кто я?» — баг счётчика «Да» подряд (+2 вместо +1) + механика
  оспаривания угаданного персонажа по образцу Spy (complex, 2 файла)
File: codex-tasks/329-whoami-yes-counter-bug-and-dispute-guess.md
Whitelist: src/app/game/[roomId]/who-am-i/page.tsx, src/app/tv/[roomId]/[gameType]/page.tsx

## Выполнены, не закоммичены (2026-07-03): TASK-323…328

TASK-323…328: «Кто я?» — механика «Да»/«Нет», черновой TV-экран, live-QA правки.
Все 6 выполнены, провалидированы (lint+tsc чисто), ждут финального прогона
и команды коммитить. Файлы: codex-tasks/323..328-*.md, codex-reports/323..328-*.md.

## Прошлый active (2026-07-02): TASK-323

TASK-323: «Кто я?» — механика передачи хода «Да»/«Нет» вместо «Дальше» (simple, 1 файл)
File: codex-tasks/323-whoami-yesno-turn-logic.md
Whitelist: src/app/game/[roomId]/who-am-i/page.tsx
Суть: кнопка «Дальше» → «Да»/«Нет». «Нет» = передать ход (как раньше).
  «Да» = засчитать вопрос, ход остаётся, счётчик серии; на 3-м «Да» подряд —
  автопередача хода, сброс счётчика. Только логика, без редизайна кнопок
  (финальный визуал — отдельная задача после макетов от «Claude Design»,
  см. docs/who-am-i-design-brief.md).

## Прошлый active (2026-06-12): TASK-231

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
