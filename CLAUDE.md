# Party Games Hub — Project Context

Этот файл автоматически читается Claude Code в начале каждой сессии. Он содержит
долговременный контекст проекта, который не должен теряться при переключении
между сессиями/окружениями (облако ↔ локальный Mac).

Если ты — Claude, запущенный в этом репозитории: **прочитай этот файл целиком до
начала работы**. Он объясняет, что это за проект, что уже сделано, что в процессе
и каких граблей избегать.

**ЯЗЫК ОБЩЕНИЯ: всегда отвечай пользователю на русском языке.** Комментарии в коде
остаются на английском (техническая конвенция), но весь чат — только по-русски.

---

## Что это за проект

**Party Games Hub** — мультиплеерный веб-хаб вечериночных игр с host-authoritative
архитектурой. Один игрок (host) запускает комнату, остальные подключаются по QR-коду
с телефона. На экране host'а показывается «TV mode» (общий экран), а у каждого
игрока — свой мобильный интерфейс.

### Поддерживаемые игры

| Game         | Id              | Статус                          |
|--------------|-----------------|---------------------------------|
| Quiz         | `quiz`          | Работает, 500+ вопросов на ru/en |
| 100 to 1     | `hundred-to-one`| Работает                        |
| Crocodile    | `crocodile`     | Работает (новая схема очков)    |
| Spy          | `spy`           | Работает                        |
| Mafia        | `mafia`         | Работает                        |
| Who Am I     | `who-am-i`      | Работает                        |
| Alias        | `alias`         | Работает (classic + letter mode)|

Все типы в `src/types/game.ts`.

---

## Стек

- **Next.js 16** (App Router, Turbopack) + **TypeScript** + **Tailwind CSS v4**
- **Socket.io** (кастомный сервер `server.mts`, host-authoritative pattern)
- **next-intl** для двуязычного интерфейса (ru/en)
- **React 19**, `tsx` как dev-runner
- **OpenRouter** → Google Gemini 2.5 Flash Image (Nano Banana) для генерации фонов

### Структура

```
src/
  app/
    [locale]/           # i18n routes
    game/[roomId]/
      crocodile/page.tsx
      alias/page.tsx
      quiz/page.tsx
      ...
    tv/[roomId]/        # TV-режим для host'а
  components/
  lib/
    quiz/               # Вопросы квиза по темам
      index.ts
      science.ts
      history.ts
      pop-culture.ts
  types/
    game.ts             # Все игровые типы
scripts/
  generate-image.mjs    # Генерация фонов через OpenRouter
public/
  backgrounds/          # Сгенерированные фоны для тем квизов
server.mts              # Socket.io сервер
mobile/                 # ??? (проверить назначение)
```

---

## Команды

| Команда                                      | Что делает                               |
|----------------------------------------------|------------------------------------------|
| `npm run dev`                                | Dev-сервер (`tsx server.mts`) на :3000  |
| `npm run build`                              | Production build                         |
| `npm run start`                              | Запуск прод-сборки                       |
| `npm run lint`                               | ESLint                                   |
| `npm run gen-image -- --theme "harry potter"`| Генерация фона через OpenRouter → Nano Banana |
| `npm run gen-image -- --prompt "..." --name foo` | Кастомный промпт, своё имя файла   |

### Генерация картинок — доступные пресет-темы

`harry potter`, `marvel`, `star wars`, `lord of the rings`, `game of thrones`,
`disney`, `anime`, `cyberpunk`, `sci-fi`, `nature`, `history`, `sports`, `music`,
`food`, `space`, `halloween`, `christmas`. Любая другая тема тоже работает —
script просто возьмёт её как есть и обернёт в стандартный style prompt.

Все сохраняются в `public/backgrounds/<slug>.png`. Стоимость ~$0.039 за картинку.

---

## Соглашения и правила проекта

1. **Двуязычность.** Вся видимая пользователю строка существует в паре `ru`/`en`.
   Никогда не добавляй монолингвальный текст в UI. Смотри как это сделано в
   существующих типах (`{ ru: string; en: string }` и поля вида `titleRu`/`titleEn`).
   **Исключение:** preview/dev-страницы (`/design-tokens` и подобные) — только
   русский, без i18n. Эти страницы внутренние, не для конечного пользователя.
   Комментарии в коде остаются на английском (техническая конвенция).

2. **Host-authoritative.** Вся игровая логика живёт на сервере (`server.mts` и
   хэндлеры сокетов). Клиенты только отправляют action'ы и рендерят состояние.
   Не добавляй клиентскую логику, которая может разойтись с сервером.

3. **Alias: classic mode НЕПРИКОСНОВЕНЕН.** Недавний рефакторинг начисления очков
   (c6b8057) затронул **только letter mode**. Classic mode должен работать как
   работал. Если правишь Alias — сначала убедись, что не трогаешь classic.

4. **Crocodile/Alias letter mode — новая схема очков (актуальная):**
   - **Explainer получает очки** по кнопкам «Угадали! ✓» (+1 за каждое слово).
   - Кнопка «Пропустить →» не даёт и не снимает очки, но увеличивает `wordsSkipped`.
   - Не-explainer видит «Угадывайте вслух! 🗣️» — никакого текстового ввода нет.
   - `croc:guess-attempt` / `alias:guess-attempt` / `croc:correct` / `alias:correct` **удалены**.
   - В letter mode Alias каждый игрок — сам себе «команда» (individual scoring).
   - `finishTurn` в letter mode **не обновляет счёт** (он уже начислен по ходу через `handleGuessed`).

5. **`.env.local` в `.gitignore`.** Это правильно. Но это означает, что он
   **не переносится через git между окружениями** — его нужно создавать
   вручную в каждой среде (облачный sandbox, локальный Mac, VS Code и т.д.).
   Шаблон лежит в `.env.local.example` (force-added в git).

6. **Не добавляй фичи/рефакторинги сверх запроса.** Если задача — пофиксить
   баг в X, не трогай Y «заодно», даже если видишь что там можно улучшить.

---

## Над чем работаем сейчас (ветка `claude/party-games-hub-etqfF`)

### Сделано
- [x] Рефакторинг начисления очков в **Crocodile** — guessers получают очки
      через ввод текста (`src/app/game/[roomId]/crocodile/page.tsx`).
- [x] Рефакторинг начисления очков в **Alias letter mode** — individual scoring,
      guessers печатают слово (`src/app/game/[roomId]/alias/page.tsx`, classic
      не тронут).
- [x] Скрипт `scripts/generate-image.mjs` для генерации фонов через OpenRouter →
      Nano Banana, с 17 пресет-темами.
- [x] `.env.local.example` с шаблоном переменных окружения.
- [x] `npm run gen-image` в `package.json`.
- [x] **Обновлена модель image gen** на `google/gemini-3.1-flash-image-preview`
      (Nano Banana 2), старая `gemini-2.5-flash-image-preview` снята с OpenRouter
      (коммит `5fd7960`). Цена ~$0.068/картинка.
- [x] **Реальный cost tracking** через `GET /api/v1/generation?id=<id>` (3 retry,
      2s delay). При неудаче — fallback на ссылку дашборда. Лог генераций
      в `public/backgrounds/.generation-log.jsonl` (gitignored).
- [x] Сгенерированы и закоммичены два тематических фона:
      `public/backgrounds/harry-potter.png` и `public/backgrounds/marvel.png`.
      Промпт marvel несколько раз переписан из-за `IMAGE_PROHIBITED_CONTENT` —
      финальный без имён персонажей и торговых марок (коммит `e7af1bf`).
- [x] **Интеграция фонов в UI квиза** (коммит `2223965`):
      - `QuizTopic` расширен: `'harry-potter' | 'marvel'` (`src/types/game.ts`)
      - `QuizTopicInfo` получил `backgroundUrl?: string`
      - В `QUIZ_TOPICS` (`src/lib/quiz/index.ts`) добавлены две темы с фонами
      - В `getQuizQuestions` добавлен fallback: если у тематической темы 0 вопросов
        (пока их нет) — берём общий пул по сложности
      - `GameLayout` получил проп `backgroundUrl?`, рендерит картинку + overlay
        `bg-black/60` для читаемости текста
      - TV-режим (`src/app/tv/[roomId]/[gameType]/page.tsx`) — своя реализация
        поверх корневого `<div>` квизового блока (TV НЕ использует `GameLayout`)
- [x] **Двухшаговый спец-флоу + читаемость текста** (коммит `7e3b288`):
      - Special → Тема (Harry Potter / Marvel) → Квиз (#1, #2, …) → Waiting.
      - Добавлен `SpecialQuizThemeInfo` и реестр `SPECIAL_QUIZ_THEMES`, хелпер
        `getSpecialQuizzesByTheme(themeId)`.
      - `QuizConfig` получил `specialTheme`; фазы `setup-special-theme` /
        `setup-special-quiz` (вместо единой `setup-special`).
      - `backgroundUrl` теперь резолвится цепочкой `specialQuiz → specialTheme →
        topic` — фон темы показывается уже на шаге выбора номера.
      - Убран `bg-black/60` overlay на страницах с фоном. Вместо затемнения —
        `text-shadow` на корневом элементе (наследуется всеми потомками).
      - Белёсая копия `text-white/50` поднята до `text-white/80` в сетапе/ожидании.
- [x] **Реструктуризация setup-флоу квиза** (коммит `994217d`):
      - Новый порядок: выбор режима (general/special) → для general: сложность → тема;
        для special: выбор квиза (без сложности).
      - Добавлен тип `SpecialQuizInfo` (`src/types/game.ts`) с полями
        `id/theme/number/titleRu/titleEn/icon/backgroundUrl`.
      - `QuizTopic` откатан к `'science' | 'history' | 'pop-culture' | 'random'` —
        harry-potter/marvel убраны из общих тем.
      - Добавлен реестр `SPECIAL_QUIZZES` с `harry-potter-1` и `marvel-1`
        (подпись `#1` в названии — заготовка под будущие `#2`, `#3`).
      - Функция `getSpecialQuizQuestions()` + константа `SPECIAL_QUIZ_TIME_LIMIT = 20`
        (пока фолбэк на пул medium-вопросов; заменится на тематические банки).
      - `QuizConfig` получил поле `specialQuizId: string | null`.
      - Обе страницы (`src/app/game/.../quiz/page.tsx`, `src/app/tv/.../page.tsx`):
        фазы `setup-mode | setup-difficulty | setup-topic | setup-special`,
        бейджи условно показывают `specialQuizInfo` либо `diffInfo + topicInfo`,
        `backgroundUrl = specialQuizInfo?.backgroundUrl ?? topicInfo?.backgroundUrl`.

- [x] **Spy — полный оверхол** (коммит `c62bb8b`):
      - Новый порядок хода: случайный (Fisher-Yates shuffle), `playerOrder[]` + `playerOrderIdx`.
      - Таймер на стороне host'а: `timerLeft` (300с), `timerRunning`, broadcast каждую секунду через `spy:sync`.
      - `passTurn()` — доступна активному игроку и host'у.
      - `nextWord()` рассылает полный state-патч (фикс рассинхрона слова у игроков).
      - TV Spy: показывает таймер в хедере, активного игрока, порядок ходов пиллами.
      - Карточка правил в modeSelect: 4 секции — Роли, Вопросы, Задача шпиона, Голосование.

- [x] **Admin: вкладка Tools перенесена в Games** (коммит `f9b9215`):
      - Убрана отдельная вкладка `'tools'` из `Tab` type и массива вкладок.
      - `WordGeneratorPanel` и `LocationGeneratorPanel` встроены прямо в `GamesTab`.
      - Layout: `flex-col`, данные игры (`flex-[3]`) + инструмент (`flex-[2]`).
      - Игры с инструментом помечены бейджем ✨.

- [x] **Все 7 PNG-иконок игр + pipeline стрипа фона** (сессия 2026-05-03):
      - **`scripts/strip-bg.mjs`** + `npm run strip-bg` (использует `sharp`).
        Алгоритм: 4-связный flood-fill от 4 углов канваса, порог
        `min(R,G,B) ≥ 180` для «light gate». Убирает зашитый ChatGPT-ом
        фон (RGB без альфы — белый/шахматка) и светлый halo вокруг субъекта.
        **Не трогает внутренние glassy-блики** (они окружены цветом субъекта,
        flood-fill туда не доходит). См. TASK-005, 005.1, 005.2, 005.3 в
        `codex-tasks/`.
      - **Все 7 иконок** в `public/icons/games/` сгенерированы через
        ChatGPT image gen в стиле **frosted matte 3D glass** в цвете игры,
        обработаны strip-bg и закоммичены как RGBA-PNG:
        `mafia.png` (фиолетовый), `quiz.png` (жёлтый, мозг), `crocodile.png`
        (красный, кавайный крокодил с фуросики), `spy.png` (бирюзовый,
        детектив с лупой), `alias.png` (розовый, секундомер-облако),
        `who-am-i.png` (голубой, силуэт с вопросом), `hundred-to-one.png`
        (янтарный, стопка ответов).
      - Промпт-шаблон выработан и зафиксирован: subject из референса +
        наш 3D frosted-glass стиль + per-game палитра из CLAUDE.md +
        строгие требования к RGBA / прозрачному фону / отсутствию белого halo.
      - **Phase C закрыта.**

- [x] **TASK-006: секция «Тайл игры — варианты» в `/design-tokens`** (сессия 2026-05-03):
      - Два варианта рендера для всех 7 игр side-by-side:
        - `TileFramed` — копия визуала `<Tile>` из `/lobby-preview` (frosted-glass
          рамка, gradient background, dark-gradient label).
        - `TileNaked` — только `<GameIcon>` + подпись под иконкой, без рамки/фона.
      - Inline-копия стилей, не выносим в shared компонент.
      - Цель — выбрать финальный визуальный язык лобби.

- [x] **TASK-007: «Alias» → «Угадай слово»** (сессия 2026-05-03):
      - Заменена видимая UI-надпись в 4 файлах: `lobby-preview/page.tsx`,
        `admin/page.tsx`, `design-tokens/page.tsx`, `api/admin/game-stats/route.ts`.
      - **Внутренний id `'alias'`, маршруты `/game/[roomId]/alias`,
        socket-события `alias:*`, тип `GameType` — НЕ ТРОНУТЫ.**
        Это технические идентификаторы.

- [x] **Tile redesign в `/lobby-preview`** (сессия 2026-05-01, ещё не закоммичено):
      - Картинка из `public/icons/games/<id>.png` теперь **полностью заполняет тайл**
        (`objectFit: cover`, `inset: 0`), а не висит над верхней рамкой.
      - Удалён overflow-блок (картинка торчала на ~38% над тайлом + scale-on-hover).
      - Tile frame получил `overflow: hidden` — картинка обрезается по border-radius.
      - Убран `marginTop: 28` (резерв под overflow).
      - Подпись игры внизу: dark gradient mask (`rgba(0,0,0,0.85) → transparent`)
        + `text-shadow` для читаемости поверх произвольной картинки.
      - `<GameIcon>` починен под fill-mode: внутренний `<img>` теперь `width/height: 100%`
        + `objectFit: cover` (раньше было фиксированное `size` + `contain`).
      - Сгенерированы 2 финальные иконки: `public/icons/games/mafia.png`,
        `public/icons/games/quiz.png`. Остальные 5 (crocodile/spy/alias/who-am-i/
        hundred-to-one) пока на SVG-placeholder.
      - Файлы: `src/components/GameIcon.tsx`, `src/app/lobby-preview/page.tsx`.

- [x] **Установлен gstack + Claude Code post-commit hook** (коммит `c42fb01`, сессия 2026-04-22):
      - `~/.claude/skills/gstack/` — полный gstack (33 скилла, Chrome Headless для QA).
      - Learnings перенесены из CLAUDE.md в `~/.gstack/projects/Tever1-my-project/learnings.jsonl`.
      - `.claude/hooks/post-commit.sh` — после каждого коммита создаёт маркер `.claude/pending-doc-update.md`.
      - `.claude/settings.json` — PostToolUse хук на Bash → запускает post-commit.sh.

- [x] **Крокодил и Alias letter mode — рефакторинг схемы очков** (сессия 2026-04-19):
      - `src/app/game/[roomId]/crocodile/page.tsx`: очки теперь зарабатывает **explainer**
        через кнопку «Угадали! ✓» (+1 к его счёту). Кнопка «Пропустить →» не даёт очков,
        но увеличивает `wordsSkipped`. Гессеры видят «Угадывайте вслух! 🗣️» — поле ввода удалено.
        Удалены `handleCorrectGuess`, `submitGuess`, `croc:guess-attempt`, `croc:correct`.
        Добавлен `wordsSkipped` в state.
      - `src/app/game/[roomId]/alias/page.tsx`: letter mode — та же схема: explainer
        зарабатывает +1 за каждое «Угадали!», не-explainer видит «Угадывайте вслух!».
        Удалены `handleCorrectGuess`, `submitGuess`, `alias:guess-attempt`, `alias:correct`.
        Classic mode не тронут.
      - `src/app/tv/[roomId]/[gameType]/page.tsx`: TV crocodile теперь показывает
        и `wordsGuessed` и `wordsSkipped`.

### В работе

1. ✅ Крокодил и Alias letter mode переписаны.
2. ✅ Визуальная проверка в браузере — полный QA sweep всех 7 игр (сессии 2026-04-24/25, завершено).
3. ✅ **Мафия P0 баги исправлены** (коммиты `10bd715` + `0c2fb54`, сессия 2026-04-25):
   - Коммит `10bd715`: broadcast() всегда ставит action:'mafia', добавлен `cast-vote` для дневного голосования, детектив-result доставляется только детективу.
   - Коммит `0c2fb54`: **stale closure fix** — `useEffect` dep array `[on]` → `[on, isHost, user]`. Handler захватывал `isHost=false` при монте и никогда не обновлялся. Исправлено путём добавления `isHost` и `user` в deps.
   - **QA подтверждено** в production mode (6 игроков): `mafiaVotes` получает оба голоса мафии, `doctorSave` работает, ночь резолвится правильно («Доктор спас жертву! Никто не погиб.»).
- [x] **Все оставшиеся P2 баги и TV улучшения** (коммиты `b78612b`, `0d3ba1d`, сессия 2026-04-26):
      - **Bug #1** (Крокодил round 5/4): TV-страница теперь тоже капает `currentRound` на `totalRounds` когда `phase === 'finished'`.
      - **Bug #3** (Шпион TV raw ID): добавлен `players` в `spyState` — lookup берёт из `spy:sync` payload, а не из внешнего `players` (который может быть пустым в race window).
      - **Bug #4** (TV mid-turn reconnect): добавлен `xxx:request-state` паттерн для Crocodile, Alias, Quiz — хост получает запрос и re-broadcasts полный state. TV emit-ит запрос при mount.
      - **Bug #10** (Мафия TV статичный): добавлен полноценный Mafia TV render с фазой, живыми игроками, баннером событий и winner-экраном.
      - **Bug #11** (Мафия raw user_xxxx): добавлен `nicknameCacheRef` — накапливает id→nickname и не удаляет при дисконнекте.
      - **Bug #12** (Кто я? TV застрял): `handleEndGame` в Mafia и Who Am I теперь emit-ит `game:end` → сервер шлёт `game:ended` → TV навигирует прочь.

- [x] **`detectiveCheck` на хосте исправлен** (коммит `1d0425b`, сессия 2026-04-25):
   - Убран `if (isHost)` guard из `case 'detective-check'` — теперь все клиенты сохраняют значение, хост получает его для `handleResolveNight`.
   - Удалён дублирующий мёртвый `case 'cast-vote'` (lines 285-287).
   - **QA подтверждено** в production mode: `detectiveCheck: "user_kolya_qa"` появился на fiber-стейте хоста сразу после хода детектива, ночь резолвится корректно.
4. ⬜ Создать отдельные наборы тематических вопросов
   (`src/lib/quiz/themed/harry-potter.ts`, `marvel.ts`) и заменить fallback
   в `getSpecialQuizQuestions`.
5. ⬜ UI превью фона в setup-экране выбора темы (опционально).
6. ✅ **Все 12 багов из QA исправлены** (сессии 2026-04-25/26, см. реестр ниже).
7. ✅ **100 к 1** — QA прогон завершён (сессия 2026-04-26), оценка 9/10, найден 1 P2 баг TV mode.
8. ⬜ **TiltedPreview справа в `/lobby-preview` — заменить на реальные in-game скриншоты.**
   Сейчас правая карточка превью показывает те же иконки что и нижний tile-strip
   (mock-content из 7 случаев). После того как UI всех 7 игр будет финализирован
   (Phase F-H), нужно сделать скриншоты реального gameplay каждой игры (фаза `playing`,
   характерный момент игры) и подставить их в TiltedPreview по `activeGame`. Это
   станет визуальной фишкой лобби — игрок реально видит **что происходит в игре**,
   а не повторение иконки.

---

## QA Сессия 2026-04-24/25 — ЗАВЕРШЕНА ✅

**Протестировано:** все 7 игр. Найдено 12 багов (4×P0, 2×P1, 6×P2).

### Результаты по играм

| Игра | Оценка | Статус |
|------|--------|--------|
| Alias (Classic) | 10/10 | ✅ Ship-ready |
| Alias (Letter) | 9/10 | ✅ Ship-ready |
| Квиз | 8/10 | ✅ Ship-ready |
| Шпион | 8/10 | ✅ Ship-ready |
| Кто я? | 8/10 | ✅ Ship-ready |
| Крокодил | 9/10 | ✅ Ship-ready (P1+P2 исправлены) |
| 100 к 1 | 9/10 | ✅ Ship-ready |
| Мафия | 9/10 | ✅ Ship-ready (все P0 исправлены + TV улучшен) |

### Полный реестр багов

| # | Игра | Баг | Серьёзность |
|---|------|-----|-------------|
| 1 | Крокодил | Счётчик "Раунд 5/4" после конца игры (off-by-one) | P2 ✅ FIXED `0d3ba1d` |
| 2 | Крокодил | Пустой экран у не-хостов после финала | P1 ✅ FIXED `f621b9a` |
| 3 | Шпион TV | Raw player ID вместо имени хоста в таблице ходов | P2 ✅ FIXED `b78612b` |
| 4 | TV (все) | Не подхватывает текущее состояние при подключении mid-turn | P2 ✅ FIXED `0d3ba1d` |
| 5 | Сервер | `room.hostId` ≠ `player.isHost` после реконнектов (lobby vs game расхождение) | P1 ✅ FIXED `9d5ee3d` |
| 6 | Мафия | Silent socket emit при дисконнекте (`use-socket.ts:32` — `if (!connected) return`) | P0 ✅ FIXED `10bd715` |
| 7 | Мафия | Detective check result никогда не доставляется — `gs.detectiveCheck` null на host | P0 ✅ FIXED `1d0425b` |
| 8 | Мафия | Голоса Мафии не синхронизируются с host — считается только голос самого host'а | P0 ✅ FIXED `10bd715` |
| 9 | Мафия | Дневное голосование сломано — `mafia-day-vote` не проходит фильтр `action !== 'mafia'` | P0 ✅ FIXED `10bd715` |
| 10 | Мафия TV | TV показывает статичное "Игра идёт" всю игру, фазы не обновляются | P2 ✅ FIXED `b78612b` |
| 11 | Мафия | Отключившийся игрок показывается как raw `user_xxxx` на экране итогов | P2 ✅ FIXED `b78612b` |
| 12 | Кто я? TV | TV показывает "Game in progress" даже после окончания игры | P2 ✅ FIXED `b78612b` |

### Мафия — P0 баги (все исправлены, коммиты `10bd715`, `0c2fb54`, `1d0425b`)
- `broadcast()` всегда выставлял `action:'mafia'` → фильтр `action !== 'mafia'` дропал дневные голоса (исправлено — `cast-vote` получил собственный action-код)
- `mafiaVotes` обновлялись только у хоста, остальные игроки дропали → добавлена серверная агрегация
- Stale closure: `useEffect` с dep array `[on]` захватывал `isHost=false` → добавлен `isHost` и `user` в deps (`0c2fb54`)
- `detectiveCheck` хранился только на том клиенте, кто его отправил → убран `if (isHost)` guard (`1d0425b`)

### Важные технические находки
- `socket.io` недоступен из `window` — нельзя emit события через devtools
- React fiber state читается через `.__reactFiber` на DOM-элементах (помогло дебажить состояние)
- Timing trick: set `party-hub-user` в localStorage → сразу navigate вкладку (React монтируется с нужной идентичностью до следующей перезаписи)
- HMR/server restart уничтожает все комнаты в памяти — после рестарта сервера нужно создавать комнату заново

---

## QA Сессия 2026-04-26 — 100 к 1 ✅

**Протестировано:** полный game flow игры "100 к 1" (hundred-to-one) в production mode.
4 игрока: Хост (Ведущий), Аня (Команда 1), Боря (Команда 2), Вера (Команда 1).
Команды: Орлы (Команда 1) vs Соколы (Команда 2).

### Результат: **9/10 — Ship-ready**

### Что протестировано и работает ✅

| Фаза | Описание | Статус |
|------|----------|--------|
| topicSelect | Хост выбирает тему, игроки ждут | ✅ |
| roleSelect | Все 4 игрока выбирают роли, синхронизация | ✅ |
| captainSelect | Каждая команда выбирает капитана через голосование | ✅ |
| teamNames | Капитаны вводят названия команд (nativeInputValueSetter работает) | ✅ |
| title | Игроки видят "Ожидание ведущего...", хост — "НАЧАТЬ ИГРУ" | ✅ |
| buzzer | Отсчёт 3-2-1-ЖМИТЕ!, капитан нажимает кнопку | ✅ |
| playing Round 1 (ПРОСТАЯ) | Хост открывает ответы, БАНК накапливается | ✅ |
| strike mechanic | 3 страйка → "Ход → [команда]", передача хода | ✅ |
| switched phase | Открытый ответ в switched → активная команда выигрывает банк | ✅ |
| Round 2 (ДВОЙНАЯ) | Двойные очки работают | ✅ |
| Round 3 (ТРОЙНАЯ) | Тройные очки работают (300 за 100 base) | ✅ |
| Round 4 rules (r4rules) | Экран правил НАОБОРОТ с инвертированными очками (15,30,60,120,180,240) | ✅ |
| Round 4 gameplay | Хост открывает ответы → modal назначения очков команде | ✅ |
| "Никому" в Round 4 | Очки сбрасываются, не начисляются никому | ✅ |
| results | Итоги 4 раундов, победитель, "БОЛЬШАЯ ИГРА →" | ✅ |
| bigGame player selection | Капитан выбирает 2 игроков (Player 1 и Player 2) | ✅ |
| bigGame Player 1 timer | 30-секундный таймер, авто-истечение | ✅ |
| bigGame Player 2 timer | 40-секундный таймер, авто-истечение | ✅ |
| bigGame answer input | ввод ответа через React input (nativeInputValueSetter + Enter) | ✅ |
| bigGame auto-check | Автоматическое сравнение ответов P1 vs P2 | ✅ |
| final phase | "ИГРА ОКОНЧЕНА", фонд, порог 200 очков | ✅ |
| TV mode live updates | TV обновляется при каждом broadcast от хоста | ✅ |
| Player views | Игроки видят скрытые ответы, правильный счёт | ✅ |

### Найденный баг

| # | Компонент | Баг | Серьёзность |
|---|-----------|-----|-------------|
| 13 | 100 к 1 TV | Начальное состояние TV показывает default имена команд ("Команда 1/2") и 0 очков при подключении к идущей игре. `h2o:request-state` отправляется до того, как TV socket присоединился к socket.io room (`tv:join` async race). Фиксируется само при первом broadcast от хоста. | P2 ✅ FIXED `f17efda` |

**Fix:** перемещены все `request-state` emit'ы (`h2o:request-state`, `croc:request-state`, `alias:request-state`, `quiz:request-state`) из отдельного useEffect в callback от `emit('tv:join', ..., callback)` — гарантирует что socket уже в комнате перед запросом состояния. Файл: `src/app/tv/[roomId]/[gameType]/page.tsx`, коммит `f17efda`.

### Технические находки (100 к 1 QA)
- `nativeInputValueSetter` + `dispatchEvent('input')` + `KeyboardEvent('keydown', {key:'Enter'})` корректно триггерит React onChange и onKeyDown для bigGame answer input
- `bgSelectPlayer` works via direct click on button elements (React controlled)
- "Далее →" в switched phase позволяет хосту пропустить к следующему раунду, не разыгрывая банк — это is intentional (хост контролирует темп игры)
- Авто-проверка bigGame корректно исключает ответы P1 из засчёта P2 (предотвращает двойной зачёт одинаковых ответов)

---

## 🎨 Дизайн-направление (план от 2026-04-26)

### Design DNA — главное в одном абзаце

**PS5 Home Screen × iOS 26 Liquid Glass.** Плиточный лобби с иконками игр внизу,
выбранная игра «всплывает» в центр с инфо-карточкой (игроки, длительность),
фон меняется под тематику игры. Эстетика — матовое стекло, скруглённые углы,
soft-shadows, приглушённый премиум поверх ярких per-game акцентов. Анимации
spring 400–600ms — должны выглядеть **дорого и плавно**. Никаких стандартных
эмодзи — только кастомные иконки, генерируем через Nano Banana (OpenRouter).

### Референсы
- **PS5 Home Screen** — главная парадигма лобби (плитки игр + dynamic background)
- **iOS 26 Liquid Glass** — frosted glass surfaces, large rounded corners, depth
- Spring physics а-ля Apple (не Linear-style быстро, не Jackbox bouncy)

### Правила (immutable)
1. **Ни одного стандартного эмодзи в финальном UI** — все иконки/иллюстрации генерируем
2. **Каждая игра — свой визуальный мир** (Mafia ≠ Crocodile ≠ Quiz)
3. Анимации обязаны быть плавными и spring-based (400–600ms), не резкими
4. Phone и TV должны оба выглядеть «вау» — ни один не second-class
5. iOS-26 frosted-glass surfaces везде где есть наложение информации

### План работы — 10 фаз

**Сводный статус** (обновлён 2026-05-01):

| Фаза | Статус | Что сделано / что осталось |
|---|---|---|
| **A** Foundation | ✅ DONE | Geist + per-game palette + motion + radius/duration/easing токены |
| **B** Liquid Glass | ✅ DONE | `<GlassPanel>` (5 вариантов) + `<GlassSheet>` (vaul) + `<GlassToaster>` (sonner) + depth/blur/shadow токены |
| **C** Icon pipeline | ✅ DONE (icons) | Все 7 PNG-иконок сгенерированы и обработаны через `npm run strip-bg` (flood-fill от углов, RGBA): mafia, quiz, crocodile, spy, alias, who-am-i, hundred-to-one. Стиль — frosted matte 3D glass в цвете игры, прозрачный фон. |
| **D** PS5 Lobby | 🟡 IN PROGRESS | `/lobby-preview` визуально готов, socket.io подключён (TASK-020/021): `room:create`, `room:join`, presence, Enter-join, popup-меню комнаты с QR. **Осталось:** keyboard nav, перенос в production `/lobby/[roomId]`. **TODO: TiltedPreview справа сейчас показывает те же иконки что и в нижнем tile-strip — заменить на реальные in-game скриншоты после финализации UI игр.** |
| **E** Core components | ⏳ TODO | Buttons / inputs / modals / avatars / badges / skeletons |
| **F** Game flow transitions | ⏳ TODO | setup → playing → results unified transitions |
| **G** In-game polish | ⏳ TODO | Таймеры, очки, celebrations, attention-grabbers |
| **H** TV mode glow-up | ⏳ TODO | Большой шрифт, эффектные phase wipes, host visual |
| **I** Per-game theming | ⏳ TODO | Атмосфера каждой игры (Mafia mystic, Crocodile playful…) |
| **J** Audit & iteration | ⏳ TODO | Прогон через design-motion-principles + ui-ux-pro-max |
| **K** Нейроведущий | ⏳ TODO | TTS + LLM + per-game personalities (отдельная большая фича) |

**Палитра по играм** (актуальная, утверждена):
- 🟣 Мафия `#8b5cf6`
- 🟡 Квиз `#facc15` (жёлтый)
- 🔴 Крокодил `#ef4444` (красный)
- 🟢 Шпион `#14b8a6` (бирюзовый)
- 🩷 Alias `#ec4899`
- 🔵 Кто я? `#38bdf8` (голубой)
- 🟠 100 к 1 `#f59e0b` (янтарь)

**Превью-страницы** (живая документация):
- `/design-tokens` — все токены Phase A + B
- `/icon-compare` — выбор стиля иконок (v1/v2/v3)
- `/lobby-preview` — гибрид-лобби PS5 × Spotlight (Phase D прототип)

**Фаза A — Foundation (design tokens + motion tokens)** ✅ DONE
- ✅ Geist 1.7.0 подключен через `next/font` (Sans + Mono)
- ✅ Per-game accent palette (7 цветов) — `--color-game-{quiz,mafia,...}`
- ✅ Radius scale 6→40px + full
- ✅ Motion tokens: durations (`micro/fast/base/slow/cinema`) + iOS-easings
- ✅ Spring presets для Framer Motion (`spring.soft/medium/snappy/bouncy/stiff`)
- ✅ Готовые motion variants (`fadeInUp`, `pop`, `stagger`, `hover.lift` и др.)
- ✅ Reduced-motion fallback (auto через media query)
- ✅ Force-dark utility (`class="dark"` на `<html>`)
- ✅ Документация `docs/design-tokens.md`

**Файлы:**
- `src/app/layout.tsx` — Geist подключен
- `src/app/globals.css` — все CSS токены
- `src/lib/design/tokens.ts` — TS токены (spring/easing/duration/gameColors)
- `src/lib/design/motion.ts` — переиспользуемые variants
- `docs/design-tokens.md` — справочник

**Фаза B — Liquid Glass system** ✅ DONE
- ✅ Установлены `vaul` 1.1.2 (drawers) + `sonner` 2.0.7 (toasts) — оба от Emil Kowalski
- ✅ Depth tokens: `z.{base,elevated,floating,overlay,toast}` (1→60)
- ✅ Blur scale: `blur.{subtle,default,strong,intense}` (8→40px)
- ✅ Shadow scale: `shadow.{xs,sm,md,lg,xl}`
- ✅ `<GlassPanel>` — 5 вариантов (subtle/card/floating/hero/elevated),
  per-game accent border glow, interactive (hover.lift + tap.press)
- ✅ `<GlassSheet>` — обёртка vaul, bottom + side directions, title/description,
  drag handle, frosted backdrop
- ✅ `<GlassToaster>` — обёртка sonner, glass-стилизация, success/error/default,
  per-game accent на border
- ✅ Demo всех компонентов добавлено в `/design-tokens` превью
- ✅ Документация обновлена в `docs/design-tokens.md`

**Файлы:**
- `src/components/glass/GlassPanel.tsx`
- `src/components/glass/GlassSheet.tsx`
- `src/components/glass/GlassToaster.tsx`
- `src/components/glass/index.ts` — barrel
- `src/lib/design/tokens.ts` — новые `z`, `blur`, `shadow` экспорты
- `src/app/globals.css` — соответствующие CSS-переменные
- `src/app/design-tokens/page.tsx` — расширено секциями Phase B

**Фаза C — Custom icon pipeline** (частично готова)
- ✅ `scripts/generate-icon.mjs` написан (стили: flat-3d / glassy / glassy-glow /
  glassy-noglow / illustrative / mixed-3d). Команда `npm run gen-icon`.
- ✅ `<GameIcon>` компонент с auto-fallback на SVG-заглушку
  (`src/components/GameIcon.tsx`). Если PNG нет — рендерит градиентный круг
  с инициалом цветом игры.
- ✅ `/lobby-preview` страница — показывает все 7 тайлов с overflow + hover
  spec из Фазы D, использует `<GameIcon>` (placeholder'ы видно сразу).
- ✅ Папка `public/icons/games/` + README.md с инструкциями куда класть PNG.
- ⏳ Стиль выбирается на `/icon-compare` (v3 — Glassy 4 варианта).
- ⏳ Финальная генерация всех 7 игр в выбранном стиле — пользователь сделает
  сам позже, файлы упадут в `public/icons/games/<gameId>.png` и подхватятся
  автоматически без правок кода.
- ⏳ Аудит эмодзи в остальных местах UI (action buttons, статусы) — после лобби.

**Имена файлов для финальных иконок** (точное совпадение):
`quiz.png` `mafia.png` `crocodile.png` `spy.png` `alias.png` `who-am-i.png`
`hundred-to-one.png` — все в `public/icons/games/`. 1024×1024 PNG, прозрачный
фон, subject 75–85% канваса.

**Фаза D — PS5-style Lobby (флагман)** 🟡 IN PROGRESS
- ✅ Layout (гибрид PS5 × Spotlight, прототип в `/lobby-preview`):
  - Top bar: brand-mark + nav (Играть/Друзья/История) + "Друзей онлайн" +
    Кнопка комнаты (toggle: «Создать комнату» → `КОМНАТА · ABXY7K`) +
    Avatar pill «А Аня»
  - Hero (2-col): big title с per-game gradient на втором слове + meta-pills
    с SVG-иконками + описание + CTA-row (Начать партию + Правила + inline
    «Код комнаты» input для join)
  - Tilted preview-card справа (rotate -2°) с уникальным mock-content для
    каждой игры (quiz: вопрос+таймер+4 ответа; mafia: «Город засыпает»+
    ДОКТОР+чипы; и т.д.) + 2 floating badges («8 онлайн», «2 480 рекорд»)
  - Bottom: tile-strip всех 7 игр, smaller radii (`md`)
- ✅ **Tile spec:** иконка выходит за верх рамки на ~40%, при hover тайл
  поднимается (`y: -5, scale: 1.04`), иконка ещё выше (`y: -7, scale: 1.12`),
  radial-glow halo. Spring `spring.soft`.
- ✅ Динамический фон: radial-gradient в цветах активной игры, cross-fade
  при переключении (duration 0.8s, ease iOS).
- ✅ AnimatePresence на title/meta/desc/preview — мягкая перерисовка.
- ✅ Палитра по играм согласована с пользователем (см. DNA-секцию выше).
- ✅ **TASK-020** Socket.io flow: `room:create` (RoomButton → server → сохранение кода),
  `room:join` (6-char input submit → переход в `/lobby/<code>`), Start CTA → `/lobby/<code>?game=<activeGame>`,
  `presence:subscribe` / `presence:count` для FriendsOnlinePill. `GlassToaster` для ошибок.
- ✅ **TASK-021** Enter + popup меню комнаты:
  - Enter в join-code input при 6 символах → `onJoinRoom()`.
  - Клик по «КОМНАТА · ...» → popup занимает правую колонку hero (TiltedPreview скрывается).
  - Popup: glass look, заголовок с gradient, список подключённых игроков (хост помечен),
    QR-код `react-qrcode-logo` на `${origin}/lobby/${roomCode}`, AnimatePresence.
  - Закрытие: повторный клик, Escape, клик вне popup.
  - Подписка на `room:state` → `roomState: { players, hostId }`.
- ✅ Keyboard navigation (TASK-010–015): arrow keys между тайлами, TopBar nav,
  Enter = «Начать партию», Escape = возврат.
- ✅ Mobile layout (TASK-002, breakpoint 1024px, `useIsMobile` hook SSR-safe).
- ✅ **TASK-028** Перенос дизайна в production `/lobby/[roomId]` (коммит `b5e67f6`):
  `<Lobby initialRoomCode?>` в `src/components/lobby/Lobby.tsx`. `/` и `/lobby/[roomId]`
  — тонкие wrapper'ы. Хост после create → `router.push('/lobby/CODE')`. Гость по QR
  видит тот же PS5-дизайн.
- ⏳ TiltedPreview справа: заменить mock-content на реальные in-game скриншоты каждой
  игры (после финализации UI всех игр).

**Фаза E — Core component library**
- Buttons (primary/secondary/ghost/destructive) — все с press-spring
- Inputs / forms — focused glass border + smooth label
- Modals / sheets (`vaul`) — drag-to-dismiss
- Toasts (`sonner`) — стилизация под glass
- Avatars игроков, badges, chips
- Skeleton loaders (для async подгрузки)
- Часть тащим/адаптируем из 21st.dev MCP

**Фаза F — Game flow transitions**
- Унификация переходов `setup → playing → round → results → next`
- Shared layout animations (`layoutId`) для общих элементов
- Cross-fade фонов, slide для контента, spring для CTA
- Loading states между фазами (скелетоны, не спиннеры)

**Фаза G — In-game polish**
- Таймеры с visual urgency (цвет/ring fill, shake в последние 5с)
- Score animations (count-up + pop при изменении)
- Celebration moments (правильный ответ — particles из glass)
- "Твой ход" attention-grabbers (pulse + glow)
- Состояния ожидания (subtle breathing animation вместо "Loading...")

**Фаза H — TV mode glow-up**
- Большие читаемые шрифты (с дивана 2.5м)
- Эффектные phase-transitions (full-screen wipes)
- Player avatars/nicknames на экране постоянно
- Live score updates с анимацией
- Атмосферный фон (slow-moving gradient + per-game theming)

**Фаза I — Per-game theming** (палитра см. сводный статус выше)
- Mafia — тёмная мистика (фиолетовый `#8b5cf6` + smoke), serif accents
- Crocodile — playful карнавал (красный `#ef4444`), крупные формы
- Quiz — энергичный шоу-стиль (жёлтый `#facc15`), sharp typography
- Spy — intrigue (бирюзовый `#14b8a6`), reveal-style transitions
- Alias — energetic (розовый `#ec4899`), fast pulses
- Who Am I? — curious (голубой `#38bdf8`), soft fades
- 100 to 1 — premium ТВ-шоу (янтарь `#f59e0b`), dramatic spotlight

**Фаза J — Audit & iteration**
- Прогон через `/skill design-motion-principles` (Emil Kowalski lens)
- Прогон через `/skill ui-ux-pro-max`
- Визуальный QA на phone + TV
- Финальная документация design system (`docs/design-system.md`)

**Фаза K — Нейроведущий (AI Host)**
Большая отдельная фича — AI ведущий для каждой игры. Голос + (опционально)
визуальный аватар. Реагирует на события игры, нагнетает интригу, объявляет
победителей, шутит между раундами.

- **Архитектура:** event-driven подписка на game state changes на сервере →
  генерация реплики (LLM) → TTS → проигрывание на TV
- **TTS provider** — ElevenLabs (премиум-голоса) / OpenAI TTS / Google Cloud TTS
  (определить в начале фазы — открытый вопрос #5)
- **LLM для реплик** — Gemini 2.5 Flash через тот же OpenRouter (cheap & fast),
  prompt-инжиниринг персон под каждую игру
- **Per-game персонажи:**
  - Mafia — мрачный narrator («В этом городе снова неспокойно…»)
  - Quiz — энергичный host шоу («Внимание, вопрос!»)
  - Crocodile — задорный аниматор («Ну что же ты, давай угадывай!»)
  - Spy — таинственный agent handler
  - Alias — спортивный комментатор
  - Who Am I? — любопытный детектив
  - 100 to 1 — драматичный premium-ведущий ТВ-шоу
- **Визуальное представление** — определить в начале фазы (открытый вопрос #6):
  - voice-only (никакого аватара)
  - статичный аватар + waveform animation при речи
  - анимированный аватар (lip-sync, реакции)
- **Триггерные события:** phase transition, новый раунд, правильный/неправильный
  ответ, победа, dramatic pause, idle filler
- **Управление:** хост может в админке отключить ведущего / сменить голос /
  сменить громкость / скипнуть реплику
- **Кеширование:** часто повторяющиеся реплики ("начинаем!", "правильно!")
  кешируются как mp3 в `public/voice-cache/`, динамические — генерируются
  на лету
- **Связки с другими фазами:**
  - Фаза B — sound infrastructure (резолвит вопрос #2 — звук однозначно YES)
  - Фаза H — место на TV для host visual + lipsync overlay
  - Фаза I — каждая per-game theme включает host personality

### Открытые вопросы (с триггер-фазой)

| # | Вопрос | Триггер-фаза | Блокирует |
|---|--------|--------------|-----------|
| 1 | Шрифты — закупаем (SF Pro Display) или free (Geist / Inter Display)? | **Фаза A** | Typography tokens |
| 2 | ~~Звуковой дизайн~~ — **РЕЗОЛВНУТО: YES** (нейроведущий = TTS обязателен) | — | — |
| 3 | Стиль иконок — flat 3D / glassy / illustrative / other? | **Фаза C** | Style brief для Nano Banana pipeline |
| 4 | Логотип / brand для "Party Games Hub" — нужен? какой? | **Фаза D** | Шапка лобби и TV header |
| 5 | TTS provider для нейроведущего — ElevenLabs / OpenAI / Google? | **Фаза K** | Архитектура голоса, бюджет |
| 6 | Визуальное представление ведущего — voice-only / статичный + waveform / анимированный аватар? | **Фаза K** | TV layout, генерация ассетов |
| 7 | Язык ведущего — RU / EN / оба (с переключением)? | **Фаза K** | Prompt engineering, voice selection |

**Правило:** в первом сообщении каждой фазы Claude обязан напомнить про
соответствующий вопрос и дождаться решения, прежде чем кодить.

### Установленные инструменты для дизайн-работы
- **Framer Motion 12.38.0** — все анимации
- **21st.dev Magic MCP** — готовые компоненты по описанию
- **design-motion-principles** скилл — аудит motion (Emil Kowalski + 2 других)
- **ui-ux-pro-max** + 6 ckm-* скиллов — UX-аудит, brand, design-system
- **Nano Banana** через OpenRouter — генерация иконок и фонов
  (`scripts/generate-image.mjs` уже работает)

---

## Рабочий процесс в этом чате (договорённость от 2026-04-17)

После каждого выполненного шага:
1. **Обновлять этот `CLAUDE.md`** — фиксировать что сделано, в каком коммите,
   какие файлы затронуты.
2. **Комментировать в issue #3** (`tever1/my-project`) — чтобы облачный Claude
   был в курсе прогресса.

---

## 📝 Протокол ошибок (договорённость от 2026-05-06)

**Каждый раз, когда Claude совершает ошибку или нарушает правило — обязан
зафиксировать урок в ДВУХ местах:**

1. **CLAUDE.md** — добавить запись с датой и контекстом ошибки в соответствующую
   секцию (или создать новую, если тема новая). Описать: что произошло, почему
   это ошибка, как делать правильно. Пример: блок «Урок 2026-05-06» в секции
   «Работа с Codex».

2. **gstack learnings** — выполнить команду:
   ```bash
   ~/.claude/skills/gstack/bin/gstack-learnings-log '{"skill":"<skill-name>","type":"operational","key":"<short-key>","insight":"<описание правила>","confidence":10,"source":"user-stated"}'
   ```
   Это запишет урок в `~/.gstack/projects/Tever1-my-project/learnings.jsonl` —
   он будет автоматически подгружаться в начало каждой будущей сессии через
   preamble gstack-скиллов.

**Что считается ошибкой:**
- Нарушение явного правила из CLAUDE.md (например, Claude правит production-код).
- Сделал что-то, что пользователь поправил/откатил/раскритиковал.
- Пошёл не тем путём, потратил время впустую, потом переделал.
- Не задал уточняющий вопрос и угадал неверно.
- Любое «надо было сделать по-другому».

**Зачем дублирование:** CLAUDE.md = долгая память проекта (читается выборочно),
learnings = краткая память (подгружается в каждую сессию автоматически). Урок
живёт и там и там, чтобы не забылся при компакции/новой сессии/переключении
окружения.

**Не нужно фиксировать:** транзиентные сбои (network blip, rate limit), очевидные
вещи, единоразовые опечатки. Тест: «сэкономит ли это 5+ минут в будущей сессии»?
Если да — фиксируй.

---

## Работа с Codex (договорённость от 2026-05-01, ужесточено 2026-05-06)

В команду добавлен **Codex** как исполнитель черновой работы. **Гибридный режим:**
- **Claude:** планирует, пишет ТЗ, ревьюит, общается с пользователем.
- **Codex:** выполняет таски строго по whitelist файлов из ТЗ.
- **Пользователь:** ставит задачи, мерджит, пушит.

### 🚫 ЖЁСТКОЕ ПРАВИЛО: Claude НИКОГДА не пишет production-код

**Любое** изменение файлов внутри `src/`, `public/`, `scripts/`, `server.mts`,
`package.json`, конфигов сборки и т.п. — идёт **только через Codex**, без
исключений. Это касается:

- Edit / Write / `sed` / любая правка `.tsx`, `.ts`, `.mts`, `.js`, `.css`, `.json` в production-путях.
- `git mv`, `git rm`, `mv`, `rm`, `mkdir`, `rmdir` для production-файлов и директорий.
- Переименования, удаления, создания файлов в `src/` — даже «механические».
- Однострочные правки. **Размер изменения не оправдывает обход правила.**

**Что Claude писать руками МОЖЕТ:**
- `CLAUDE.md`, `AGENTS.md`, `.codex/STATUS.md`, `codex-tasks/*.md`, `codex-reports/*.md` (только если Codex не дописал).
- Файлы вне production-кода (документация, заметки в `docs/`, learnings).
- `git add` / `git commit` / `git push` после ревью отчёта Codex.
- Чтение/grep/lint/build/tsc — без ограничений.

**Если поймал себя на Edit/Write по production-файлу — СТОП**. Откатить не нужно
(если уже сделал), но в следующий раз — ТЗ для Codex даже на тривиальную правку.

**Урок 2026-05-06:** при переносе `/lobby-preview` → `/` Claude сам сделал
`git mv`, удалил директорию, отредактировал `page.tsx` и `design-tokens/page.tsx`
напрямую. Это нарушение, даже несмотря на корректный результат. Правильно было —
ТЗ TASK-023 с whitelist на 3 файла, Codex выполняет, Claude валидирует.

### Цикл работы

1. Пользователь → Claude: «сделай X»
2. Claude пишет `codex-tasks/NNN-X.md` (ТЗ + whitelist файлов)
3. Claude обновляет `.codex/STATUS.md` (активный таск)
4. **Simple-таск** → Claude сам запускает `codex exec` (с индикацией 🤖 в чате)
   **Complex-таск** → Claude говорит пользователю «переходи в Codex Desktop» 🖥️
   **и ВСЕГДА даёт готовый короткий промпт** (1–3 строки) для копипасты
   в Codex. Без этого юзер не может запустить таск, не открывая ТЗ руками.
   Формат промпта: ссылка на файл ТЗ + явная команда «прочитай и выполни» +
   (если уместно) acceptance-критерий одной фразой.

   Пример:
   > Прочитай `codex-tasks/024-lint-cleanup-wave-1.md` и выполни. Whitelist
   > файлов и acceptance в ТЗ. Цель: `npm run lint` 73 → ≤14 problems.
   > Не коммить, отчёт в `codex-reports/024-lint-cleanup-wave-1.md`.
5. Codex делает работу → `codex-reports/NNN-X.md`
6. Claude читает отчёт + git diff → валидирует
7. ОК → говорит пользователю готово, тот коммитит
   Не ОК → Claude пишет `NNN.1` с правками, возврат к шагу 4

### Критерии simple vs complex

- **Simple** (Claude запускает сам): 1-2 файла, механическое изменение,
  нет архитектурных решений, не трогает `server.mts`, < 5 минут.
- **Complex** (юзер в Codex Desktop): 3+ файла, игровая логика, socket.io,
  архитектурные решения, > 5 минут.

### Структура

```
AGENTS.md            ← правила для Codex (mirror CLAUDE.md, корень репо)
.codex/              ← read-only для Codex
  WORKFLOW.md        ← подробное описание процесса
  STATUS.md          ← шина состояния (активные/завершённые таски)
  config.toml        ← Codex sandbox config
codex-tasks/         ← writable: ТЗ от Claude → читает Codex
  _TEMPLATE.md
codex-reports/       ← writable: отчёты от Codex
  _TEMPLATE.md
```

`.codex/**` hard-protected sandbox'ом Codex — поэтому writable папки вне.

Подробности — `.codex/WORKFLOW.md`.

---

## Известные подводные камни

- **Облачный sandbox Claude Code без интернета.** API-вызовы к внешним сервисам
  (OpenRouter, Google, любые `fetch('https://...')`) из этой среды **упадут по
  таймауту**. Запускать их можно только из локальной среды (Mac local mode,
  VS Code, CLI, или одним кликом из Finder). Из sandbox'а — только код, git,
  линтеры, тесты.

- **Локальный `localhost:3000` на Mac не виден из облачного sandbox'а.**
  Если пользователь говорит «я запустил dev-сервер, проверь» — из облака
  проверить нельзя. Только в локальной сессии.

- **Между сессиями sandbox эфемерен.** Рабочая папка может быть пустой в начале
  новой облачной сессии — тогда нужно `git pull` восстановить ветку. Ничто за
  пределами git не переживает сессию.

- **`.env.local` не в git.** При переходе между окружениями его нужно создавать
  заново. Шаблон в `.env.local.example`.

- **Проверка UI-изменений.** Type-check и lint НЕ означают, что фича работает.
  Для UI-изменений нужно открыть в браузере и прокликать. Если не можешь — скажи
  об этом явно, не утверждай что «всё работает».

---

## Ветки и рабочий процесс

- **Основная ветка разработки:** `claude/party-games-hub-etqfF`.
- Пуш всегда через `git push -u origin claude/party-games-hub-etqfF`.
- Коммиты — короткие, в стиле уже существующих (смотри `git log --oneline`):
  `crocodile: fix timer overflow`, `feat(alias): add letter mode`, и т.п.
- PR в `main` создаём только когда фича полностью готова и протестирована.

---

## Мультиокружение (важно!)

Пользователь работает с этим проектом из **нескольких сред одновременно**:

1. **Claude Code on web / облачный sandbox** — откуда угодно (телефон, работа),
   нет интернета, нет доступа к Mac. Хорошо для планирования, чтения, правок
   через git.
2. **Claude Code Desktop app в Local mode** (Mac дома) — полный доступ к файлам,
   интернет, можно дёргать API. Здесь тестируем, генерируем картинки, запускаем
   dev-сервер.
3. (Потенциально) VS Code + расширение, CLI — не используются сейчас.

**Git — единственный мост.** Всё, что должно переноситься между средами, должно
лежать в git. Этот `CLAUDE.md` — один из таких артефактов: он гарантирует, что
любой Claude в любой среде получит одинаковый контекст.
