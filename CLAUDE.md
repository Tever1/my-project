# Party Games Hub — Project Context

Этот файл автоматически читается Claude Code в начале каждой сессии. Он содержит
долговременный контекст проекта, который не должен теряться при переключении
между сессиями/окружениями (облако ↔ локальный Mac).

Если ты — Claude, запущенный в этом репозитории: **прочитай этот файл целиком до
начала работы**. Он объясняет, что это за проект, что уже сделано, что в процессе
и каких граблей избегать.

**ЯЗЫК ОБЩЕНИЯ: всегда отвечай пользователю на русском языке.** Комментарии в коде
остаются на английском (техническая конвенция), но весь чат — только по-русски.

**QA В БРАУЗЕРЕ: никогда не запускай визуальную проверку (preview_screenshot,
preview_click, preview_snapshot и т.п.) без явной просьбы пользователя.** Когда
пользователь говорит «проверяй» — это означает проверить код и логику (прочитать
файлы, запустить lint/tsc). Визуальный QA в браузере — только когда пользователь
явно попросит («сделай QA», «открой в браузере», «проверь визуально»).

**НЕ УДАЛЯТЬ ЦЕЛЫЕ ФУНКЦИИ, РЕЖИМЫ ИЛИ ИГРЫ БЕЗ ЯВНОГО ПОДТВЕРЖДЕНИЯ.**
Это правило абсолютное — нарушение недопустимо ни под каким предлогом:

- Дизайн-референс не показывает механику → это НЕ значит что её нужно удалять.
- Задача говорит «переработать» → не равно «удалить всё что не упомянуто».
- «Упростить» или «рефакторить» → не трогать функциональность, только код.
- Перед удалением ЧЕГО УГОДНО существенного (режим игры, целый компонент,
  игровая механика, socket-событие, целый экран) — СТОП, задать вопрос явно.

Примеры того, что нельзя удалять без вопроса:
  - Игровой режим (draw mode, letter mode, classic mode)
  - Целый компонент с логикой (DrawCanvas, любой GameXxx)
  - Socket-события игры (spy:stroke, alias:correct и т.п.)
  - Игровую фазу (modeSelect, roundResult и т.п.)
  - Целую игру из списка поддерживаемых

Урок (2026-06-09, TASK-226): при редизайне Шпиона по дизайн-референсу draw mode
был удалён потому что его не было в референсных файлах. Пришлось делать TASK-227
чтобы вернуть. Потеряно время, нарушено доверие.

**ОСПАРИВАЙ РЕШЕНИЯ: если подход плохой — скажи прямо, до того как делать.**
Не соглашайся просто потому что пользователь попросил. Если видишь риск, конфликт
с существующими правилами или более простое решение — назови это в первом же ответе.

**СТРУКТУРА КАЖДОГО ОТВЕТА:** 1) Что сделано. 2) Что нужно от тебя (если есть).
3) Следующий шаг. Исключение — короткие вопросы/уточнения, где структура не нужна.

**ПОСЛЕ КАЖДОЙ ЗАДАЧИ:** предложи одно конкретное улучшение или автоматизацию,
вытекающую из только что сделанного. Кратко — одна строка, без давления.

**МАКСИМАЛЬНАЯ САМОСТОЯТЕЛЬНОСТЬ:** всё что не требует Codex — делай сам.
Планирование, ТЗ, git add/commit/push, grep/lint/build, обновление CLAUDE.md/AGENTS.md —
без вопросов. Production-код (`src/`, `server.mts` и т.п.) — только через Codex,
запускает пользователь.

**ТЕРМИНОЛОГИЯ ЭКРАНОВ (договорённость 2026-06-16):**
- **«Игровое поле»** = **TV-экран** (`src/app/tv/[roomId]/[gameType]/page.tsx`).
  Когда пользователь говорит «игровое поле» — правка идёт в TV-файл.
- **«Мобильный экран»** = телефон игрока (`src/app/game/[roomId]/<game>/page.tsx`).
  Пользователь явно скажет «мобильный экран», когда речь про него.
Не путать: фикс не на том экране = потеря времени (урок TASK-244 #2 — поправил
холст на мобильном, хотя «игровое поле» = TV).

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

7. **Фон игрового экрана — ТОЛЬКО через `<GameSurface>`.** Компонент
   `src/components/games/GameSurface.tsx` связывает фоновую `<img>` (`-z-10`) и
   `isolate` в одну обёртку. Это нужно потому, что `.bg-gradient-main` —
   НЕПРОЗРАЧНЫЙ градиент: без `isolate` на родителе картинка с `-z-10` уходит ЗА
   градиент и не видна (баг TASK-190, который мы ловили 3-4 итерации, думая что
   проблема в конфиге). Никогда не пиши `<img class="... -z-10">` + `isolate`
   руками в игровом экране — оборачивай корневой div в
   `<GameSurface backgroundUrl={...} className="bg-gradient-main ...">`.
   Все 7 TV-блоков и `GameLayout` (мобильные игры) уже на `GameSurface`
   (TASK-194, TASK-195). Для нового игрового экрана с фоном — тоже `GameSurface`.

8. **Каждый фон — обязательно облегчённая WebP-версия.** Исходные PNG-фоны были
   0.8–1.5 МБ и медленно грузились на телефоне (багрепорт 2026-06-02). После
   добавления нового `public/backgrounds/<name>.png` — запустить `npm run optimize-bg`
   (`scripts/optimize-bg.mjs`, TASK-196): генерит `<name>.webp` (q80, ~16× меньше)
   + LQIP-плейсхолдер в `public/backgrounds/lqip.json`. В реестрах (`src/lib/quiz/index.ts`
   и т.п.) ссылаться ТОЛЬКО на `.webp`, никогда на `.png`. `GameSurface` сам
   подхватывает LQIP и делает fade-in (с обработкой кешированной картинки, TASK-196.1).

9. **Передача хода со случайным выбором игрока — без повторов внутри круга.**
   Если механика игры выбирает следующего активного игрока (спрашивающего,
   отвечающего, ведущего и т.п.) **случайно** — нельзя повторно выбирать
   того, кто уже был в этой роли в текущем круге, пока не пройдут ВСЕ
   игроки. Как только круг завершается (все прошли) — начинается новый
   круг, повторы снова разрешены. Реализация: хранить список/множество
   уже прошедших в текущем круге (например `guessCycleAnswered` в Шпионе,
   TASK-341), при выборе кандидата исключать этот список; когда кандидатов
   не остаётся — сбросить список (новый круг) и выбирать из полного пула.
   **Это правило НЕ нужно применять**, если ротация уже идёт по
   фиксированному заранее перемешанному кругу (индекс `+1` по массиву
   `playerOrder`/`playersOrder` и т.п.) — там повторов и так структурно
   быть не может. Правило актуально только для **случайного** выбора
   (`Math.random()` без учёта истории круга).
   Пример реализации: `pickNextTarget()` в `src/app/game/[roomId]/spy/page.tsx`
   (режим «Угадывай», TASK-340/341) — асkер/таргет-цепочка с исключением
   уже отвечавших в круге.
   Аудит на 2026-07-12 (при введении правила): Крокодил (`explainerIndex`),
   Alias (`explainerIndex`), Кто я? (`turnOrder`/`currentTurnIndex`), Spy
   draw-режим (`playerOrder`/`playerOrderIdx`) — все уже используют
   фиксированную последовательную ротацию, правило для них уже
   соблюдается структурно, изменений не требовалось. Только Spy
   guess-режим использовал случайный выбор без учёта истории — исправлено
   TASK-340/341. Если в будущем добавляется НОВАЯ механика со случайным
   выбором активного игрока — применять это правило сразу при
   реализации, не дожидаться отдельного багрепорта.

---

## Над чем работаем сейчас (ветка `claude/party-games-hub-etqfF`)

### Сделано

> **Полный индекс закрытых Codex-тасков:** `codex-tasks/_DONE.md` — одна строка
> на каждый TASK (211+). Регенерация: `bash codex-tasks/_regen-done.sh`.
> Для новых тасков НЕ дублируй построчную историю здесь — добавляй строку в индекс.
> В этой секции оставляй только крупные содержательные блоки (архитектурные
> решения, найденные грабли), а не каждую механическую правку.

- [x] **Аудит всех игр против Квиза + исправления (TASK-217…224, сессия 2026-06-07)**.
      Сверка 6 игр с эталоном-квизом по 4 осям (логика кнопок, фон, скругления,
      общая логика комнаты/роли). Все фиксы через `codex exec` (запускал Claude),
      валидация tsc+lint, серия коммитов `b1e02a3`, `d775492`, `691919a`, `4436750`.
      - **Новый хук `src/lib/use-game-identity.ts`** — единый источник гибридной
        идентичности: `effectivePlayerId = user?.id ?? guestPlayerId`, `isGameHost`
        через `gameHostPlayerId` из `room:state`, оба guest/user reconnect-эффекта.
        Заменяет инлайн-копипасту квиза. **Грабля, которую он чинил:** все 6 игр
        гейтили управление и идентичность строго по `user?.id`, поэтому
        гость-ведущий (создатель комнаты без аккаунта — частый кейс после TV-pivot)
        не мог вести игру и (в who-am-i/mafia/h2o) даже играть. Сервер уже отдавал
        `gameHostPlayerId` — фикс чисто клиентский. Применён к crocodile, who-am-i,
        mafia, spy, hundred-to-one (217-221).
      - **i18n spy + hundred-to-one (222, 223):** обе игры были с НУЛЕВОЙ
        двуязычностью (нарушение immutable-правила №1) — добавлен `useTranslation`
        + хелпер `l(ru,en)`, переведены все строки.
      - **Двойной confirm (222, 223):** spy и h2o вызывали нативный
        `confirm('Завершить игру?')` ПОВЕРХ собственной glass-модалки `GameLayout`
        (она открывается из пропа `onEnd`). Нативный confirm убран — завершение
        идёт через модалку GameLayout (как в квизе).
      - **BreathingPlaceholder (224):** waiting-экраны «ожидание ведущего» в 6
        играх унифицированы с квизом (компонент вместо статичного текста/pulse).
      - **Что НЕ оказалось дефектом** (проверено, не трогали): скругления (карточки
        идут через `GlassCard` с общим radius; inline `rounded-*` = точки/бары/пиллы);
        raw `<button>` (цветные контролы таймера spy / текст-ссылки и сетки h2o —
        легитимны); нейтральный фон в игре (квиз general тоже нейтральный —
        консистентно; per-game цвет — отдельный экран `/join`, TASK-216).
      - **Квиз тоже переведён на `useGameIdentity` (TASK-225)** — убран инлайн-дубль
        (−49 строк). Из хука взяты только `{ user, effectivePlayerId }`; `isGameHost`
        и `gameState.gameHostPlayerId` оставлены как есть (вплетены в флоу
        спец-квиз-конфига, fallback-семантика). Теперь все 7 игр на одном хуке.

- [x] **Шпион — большой редизайн + live-QA (TASK-226…251, сессии 2026-06-09…16)**.
      Полный оверхол Шпиона: локации/voting/round-flow, возврат draw mode, новые фазы
      draw (dealing/voting/roundResult), скрипт `npm run phones` (виртуальные телефоны
      для локального QA, `scripts/dev-phones.sh`), fit-to-width слово, механика «шпион
      угадывает слово» + авто-голосование по таймеру. Затем многоволновый live-QA на
      реальных телефонах (237…251) — закоммичено одним блоком. Затронуты в основном
      `src/app/game/[roomId]/spy/page.tsx` (мобильный) и
      `src/app/tv/[roomId]/[gameType]/page.tsx` (TV). Ключевые решения:
      - **Очки убраны полностью** («раунды без цифр»): многораундовый флоу и результат
        раунда (кто шпион / слово) остались, но числа/дельты/таблица убраны (mobile+TV).
        Поля `scores`/`lastRoundDelta` в стейте оставлены, но не вычисляются.
      - **Лимит раундов убран** — игра не завершается сама; завершает только host
        кнопкой в шапке GameLayout. Счётчик «Раунд N» без «/ N».
      - **Подтверждения у host** (inline ✓/✗ внутри кнопки, без нативного confirm):
        «Заменить слово», «Голосование», «← К выбору режима» (последнее — только во
        время раунда, пока идёт таймер: `phase==='playing' && timerRunning`).
      - **Кнопка «← К выбору режима»** у host (dealing/playing/roundResult) — возврат
        на экран выбора Угадай/Нарисуй (`update({ phase: 'modeSelect' })`).
      - **Peek-bar «твоё слово»** долго тюнили (w-1/2↔w-full↔w-4/5, высота): итог —
        `w-full`, фикс-высота `h-6` (не меняется при нажатии, `style={{transform:'none'}}`
        против hover/active-сдвига glass-card), раскрытие шпиона в одну строку, справа
        пилюля «ЗАЖМИ».
      - **Draw mode**: статус «Твой ход / Рисует X» переехал в карточку раунда (отдельный
        блок убран); у шпиона кнопка «Угадать слово» теперь и в draw; холст
        `w-full aspect-square` (мобильный). На **TV** холст вписан в доступную область
        (`height:100% + maxW/maxH:100% + aspectRatio:1`, не вылезает за нижний край) +
        **круглый таймер** в левом верхнем углу (тот же SVG-круг, что в guess, через
        `viewBox` до 120px).
      - **TV roundResult**: карточки «Шпион/Слово» больше не на всю высоту — обёрнуты в
        центрирующий контейнер, высота по контенту.
      - **Грабли (urok, записан в правила выше + память):** «игровое поле» = TV-экран,
        «мобильный экран» = телефон. В TASK-244 поправил холст на мобильном, хотя баг
        был на TV — пришлось откатывать (TASK-245).

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

- [x] **Мобильный реконнект — серия TASK-111…119** (сессия 2026-05-20,
      коммиты `6e69d54` → `95bcf40`, всё запушено):
      - **Проблема:** при сворачивании браузера / блокировке телефона игроки
        пропадали из комнаты через 20-30с (мобильный OS убивает WebSocket за
        ~5-30с в фоне). На реконнекте — silent rejoin даже если был кикнут.
      - **Целевая UX:**
        - Свернул → аватар сразу серый, игрок в комнате.
        - Вернулся в течение 5 минут → аватар цветной.
        - 5 минут не вернулся → удалён навсегда, на главное меню без
          авто-возврата. Ручной повторный ввод кода — работает.
      - **Серверная архитектура** (`src/server/socket-handlers.mts`):
        - `Player.reconnectTimer?: ReturnType<typeof setTimeout>` — один
          таймер на игрока. Мобильный делает несколько disconnect/reconnect
          циклов в фоне; `clearTimeout(player.reconnectTimer)` перед новым +
          в `room:join` на reconnect. Без этого первый таймер срабатывал
          раньше срока (~4 мин вместо 5).
        - `Room.kickedPlayerIds: Set<string>` — playerIds удалённые grace
          timer-ом. На room:join: если `isReconnect=true` и в kicked-list →
          reject (`{ success: false, error: 'Player was removed due to
          inactivity' }`). Если `isReconnect=false` (ручной join) → clear
          из kicked-list и нормальный join. Memory очищается с самой
          комнатой (`rooms.delete(roomCode)`).
        - Grace period: `300000` (5 мин) вместо прежних 30с.
        - Убран `|| room.players.size === 1` из immediate-delete пути —
          одиночный игрок тоже идёт через grace period.
        - `broadcastRoomState` сразу после `isConnected = false` в grace
          path — чтобы другие клиенты видели серый аватар немедленно, а
          не через 5 минут.
      - **Клиентская архитектура** (`src/lib/use-socket.ts`,
        `src/components/lobby/Lobby.tsx`):
        - `useSocket().onConnect` дополнительно emit'ит `player:back` если
          `!document.hidden` — на случай когда сокет умер пока был в фоне.
        - Page Visibility API → `player:away` / `player:back` (живой сокет).
        - Auto-reconnect useEffect использует `initialCode || roomCode` —
          работает для обоих сценариев входа (URL `/lobby/CODE` и код-инпут
          на `/`). Передаёт `isReconnect: true`.
        - `handleJoinRoom` (ручной join) передаёт `isReconnect: false`.
        - room:leave effect: убран `isConnected` из deps (иначе срабатывал
          на каждый socket reconnect, удаляя игрока навсегда). Также чистит
          `roomCode` / `roomState` после leave чтобы не было stale state.
        - `connectedPlayers` фильтр (Lobby.tsx:1935) больше **не режет** по
          `isConnected !== false`. Disconnected игроки остаются в списке как
          серые (`away={!player.isConnected || player.isAway}`).
        - Mobile bottom-sheet (zIndex 41) получил
          `pointerEvents: roomMenuOpen ? "auto" : "none"` — иначе закрытое
          меню перехватывало тапы на топ-баре в iOS Safari.
      - **9 коммитов:** `6e69d54` (TASK-111+112+113+114), `6638224` (TASK-115),
        `5a82bb2` (TASK-116), `33f5652` (TASK-117), `09fba1d` (TASK-118
        cleanup debug-логов), `95bcf40` (TASK-119 eslint-disable placement).
      - **QA:** подтверждено пользователем на реальном мобильном — все 4
        сценария работают (свернуть/вернуться/5мин-вылет/после-вылета нет
        авто-возврата).

- [x] **TASK-164/165: Гость как game-host + удаление Truth-or-Dare** (коммит `8f6e15a`, сессия 2026-05-27):
      - `effectivePlayerId = user?.id ?? guestPlayerId` — гость-gameHost видит кнопку «+ Добавить игрока».
      - Удалена ghost-страница truth-or-dare (была пустой заглушкой).
      - Guest auto-reconnect в `quiz/page.tsx`: добавлены `guestNickname` state + отдельный
        useEffect для гостей (существующий reconnect имел guard `if (!user) return`).

- [x] **TASK-166/167: Quiz — фоны, таймер, TV анимация, кнопка ЗАВЕРШИТЬ** (коммит `8fa3cbd`, сессия 2026-05-27):
      - `fetchPriority="high"` img вместо CSS backgroundImage в GameLayout и TV.
      - `AnimatePresence mode="popLayout"` для обратного отсчёта — убирает мерцание на телефоне и TV.
      - **Критический баг:** `game:end` на сервере не имел `.toUpperCase()` — единственный хендлер
        без него. Кнопка «ЗАВЕРШИТЬ» не работала ни в одной игре. Серверный фикс покрывает все 7 игр.
      - `router.push` fallback в `confirmEndGame` только для квиза (гость-gameHost может потерять room при реконнекте).

- [x] **TASK-168: fetchPriority img для тайла лобби** (коммит `0c33387`, сессия 2026-05-27):
      - CSS `backgroundImage` в Lobby game tile заменён на `<img fetchPriority="high">`.
      - CSS-градиенты (три места в Lobby) оставлены — они не являются загружаемыми изображениями.

- [x] **TASK-169: Удаление поля ввода кода + правила игр** (коммит `0b470a9`, сессия 2026-05-27):
      - Поле ввода кода комнаты удалено из HeroLeft (устарело после TV-pivot — игроки заходят через `/join/[code]`).
        PlayerJoinView (мобильный) оставлен без изменений.
      - Модальный overlay с правилами для всех 7 игр: AnimatePresence, закрытие по backdrop/✕.
        Каждая игра — 2-3 секции правил.

- [x] **TASK-184…195: Quiz socket-config, фон спец-квиза, GameSurface-рефактор** (сессия 2026-05-31, HEAD `bfd2dcd`, всё запушено):
      - **TASK-184 (QR на реальный IP):** `GET /api/local-ip` отдаёт сетевой IPv4,
        `Lobby.tsx` строит QR-URL через него (был `localhost` → телефон не открывал).
      - **TASK-185 (quiz config через сокет):** конфиг квиза больше не через `localStorage`
        (он на десктопе, а квиз открывает телефон хоста — там пусто). Теперь
        `game:select` → `room.pendingQuizConfig` на сервере → payload в `game:started` +
        `room:state`. Все клиенты читают `specialQuizId` из `pendingQuizConfig` в
        `useRoomState` и патчат локальный config — фон у всех без ожидания хоста.
      - **TASK-186 (удаление setup-экранов):** после перехода на socket-config game-host
        сразу попадает в `waiting`; фазы `setup-*` в `quiz/page.tsx` удалены целиком.
      - **TASK-187/188/189 (попытки фикса фона):** правки конфига — чинили НЕ ту проблему
        (конфиг доходил корректно). См. TASK-190.
      - **TASK-190 (настоящий корень бага фона):** `.bg-gradient-main` — НЕПРОЗРАЧНЫЙ
        градиент. Родитель с `relative` БЕЗ `isolate` не создаёт stacking context, и
        фоновая `<img class="-z-10">` уходит ЗА градиент → невидима. На TV работало,
        потому что там был `isolate`. Урок записан в learnings и в правило №7 CLAUDE.md.
      - **TASK-191/192/193 (бейджи квиза):** на экранах ожидания убраны иконки тем
        (Marvel/HP) у спец-квиза и темы у general; скругление таблетка → `rounded-md`
        как у ответов. Цветная точка сложности (🟢🟡🔴) ВОЗВРАЩЕНА в бейдж сложности.
        Дубль бейджей в шапке игрового поля убран; добавлены «X вопросов» + «Игроков: N»
        в waiting-центр TV.
      - **TASK-194/195 (GameSurface):** `src/components/games/GameSurface.tsx` связывает
        фон-img (`-z-10`) + `isolate` в одну обёртку. На него переведены все 7 TV-блоков
        и `GameLayout` (мобильные игры). Это и есть правило №7. Проверено: в TV-файле нет
        отрицательных/высоких z-index — `isolate` безопасен.

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
8. ✅ **TASK-164..169 — Quiz & Lobby polish** (коммиты `8f6e15a`, `8fa3cbd`, `0c33387`, `0b470a9`, сессия 2026-05-27):
   - Гость как game-host, удалена ghost-страница truth-or-dare.
   - Критический баг: `game:end` без `.toUpperCase()` → кнопка ЗАВЕРШИТЬ не работала ни в одной игре. Исправлено на сервере.
   - fetchPriority img вместо CSS backgroundImage, AnimatePresence mode="popLayout" для таймера.
   - Поле ввода кода удалено из desktop hero (устарело после TV-pivot).
   - Правила игр: модальный overlay для всех 7 игр.
9. ⬜ **TiltedPreview справа в `/lobby-preview` — заменить на реальные in-game скриншоты.**
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

### План работы — 12 фаз

**Сводный статус** (обновлён 2026-05-01):

| Фаза | Статус | Что сделано / что осталось |
|---|---|---|
| **A** Foundation | ✅ DONE | Geist + per-game palette + motion + radius/duration/easing токены |
| **B** Liquid Glass | ✅ DONE | `<GlassPanel>` (5 вариантов) + `<GlassSheet>` (vaul) + `<GlassToaster>` (sonner) + depth/blur/shadow токены |
| **C** Icon pipeline | ✅ DONE (icons) | Все 7 PNG-иконок сгенерированы и обработаны через `npm run strip-bg` (flood-fill от углов, RGBA): mafia, quiz, crocodile, spy, alias, who-am-i, hundred-to-one. Стиль — frosted matte 3D glass в цвете игры, прозрачный фон. |
| **D** PS5 Lobby | 🟡 IN PROGRESS | `/lobby-preview` визуально готов, socket.io подключён (TASK-020/021): `room:create`, `room:join`, presence, Enter-join, popup-меню комнаты с QR. **Осталось:** keyboard nav, перенос в production `/lobby/[roomId]`. **TODO: TiltedPreview справа сейчас показывает те же иконки что и в нижнем tile-strip — заменить на реальные in-game скриншоты после финализации UI игр.** |
| **E** Core components | ✅ DONE | GlassButton (press-spring, secondary/ghost), GlassInput (focus ring), PlayerAvatar, Badge, Chip, Skeleton. Barrel `ui/index.ts`. Встроено в лобби (TASK-104/105/106, коммиты `a2ac210`, `3f222ce`). |
| **F** Game flow transitions | ⏳ TODO | setup → playing → results unified transitions |
| **G** In-game polish | ⏳ TODO | Таймеры, очки, celebrations, attention-grabbers |
| **H** TV mode glow-up | ⏳ TODO | Большой шрифт, эффектные phase wipes, host visual |
| **I** Per-game theming | ⏳ TODO | Атмосфера каждой игры (Mafia mystic, Crocodile playful…) |
| **J** Audit & iteration | ⏳ TODO | Прогон через design-motion-principles + ui-ux-pro-max |
| **K** Нейроведущий | ⏳ TODO | TTS + LLM + per-game personalities (отдельная большая фича) |
| **L** Аккаунты | ⏳ TODO | Email/пароль + VK ID + Яндекс ID, профиль, сессии, привязка к комнатам |
| **M** Монетизация | ⏳ TODO | Оплата, подписки, paywall, биллинг-инфраструктура |

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

### Продуктовая цель
Без ТВ все смотрят в свои телефоны — нет общего момента. С ТВ: телефон = пульт,
телевизор = игра. Задача Фазы H — сделать TV mode настолько очевидно крутым,
что игроки сами захотят его включить. Формулировка ценности: *«Включи на большом
экране — и это станет настоящим шоу»*.

### Дизайн: Вариант B — Full-screen с HUD-оверлеем (утверждён)
- **Архитектура экрана:** каждая фаза занимает весь экран. Очки и игроки —
  постоянный HUD сверху (тонкая glassMorphism-полоса), не мешает основному контенту.
- **Scoreboard наверху** (всегда виден): никнейм + очки всех игроков в одну строку,
  анимируется при изменении счёта (count-up + pop).
- **Основной контент** — огромный шрифт, читается с 3 метров.
- **Full-screen transitions** при смене фазы: cross-fade или dramatic slide.
- **Celebrations:** правильный ответ → весь экран вспыхивает, правильный вариант
  увеличивается, очки летят к нику в HUD.

### Как мотивировать игроков включить ТВ
1. **Переименовать кнопку** — не «ТВ-режим» (техническое), а «На большой экран» /
   «Режим вечеринки». Иконка — группа людей или экран с лучами, не монитор.
2. **Короткий URL в popup комнаты** — показывать крупно `partyge.me/tv · ABCD12`
   (домен + код комнаты). Два сценария использования:
   - **Smart TV браузер** (Samsung, LG, Sony) — вводят пультом прямо на телевизоре,
     без дополнительных устройств. Для 6 символов кода вполне терпимо.
   - **Ноутбук + HDMI** — вводят с клавиатуры, подключают к ТВ.
   QR для ТВ не делаем — с телевизора его не считать.
3. **Эксклюзивный контент для TV** — часть драматических моментов только на ТВ:
   - Reveal шпиона/роли мафии — анимированный, только на ТВ
   - Финальный счёт с конфетти и winner-экраном — только на ТВ
   - Countdown таймер на весь экран — создаёт общее напряжение
4. **Нейроведущий (Фаза K)** — голос идёт через ТВ, это само по себе убийственный
   аргумент. «Хочешь голосового ведущего — открывай ТВ».

### Технический рефакторинг
- Текущий `tv/[roomId]/[gameType]/page.tsx` — 1459 строк, все 7 игр в одном файле.
  Разбить на отдельные компоненты: `TVQuiz`, `TVMafia`, `TVSpy` и т.д., общий
  layout `TVLayout` с HUD-оверлеем.
- Перейти на design system токены (GlassPanel, Framer Motion spring) вместо
  Tailwind className strings.
- Убрать все эмодзи — заменить на `<GameIcon>` компоненты.

### Что делать в рамках фазы
- Переименовать «ТВ-режим» → «На большой экран» во всех точках UI
- Добавить второй QR/кнопку в RoomMenu popup
- Новый `TVLayout` компонент: top HUD (scoreboard) + full-screen content slot
- Большие шрифты (clamp, читается с 3м), атмосферный фон (slow gradient)
- Эффектные phase-transitions (Framer Motion AnimatePresence, full-screen wipes)
- Per-game celebration moments (correct answer flash, winner screen)

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

**Фаза L — Аккаунты: Email + VK ID + Яндекс ID**
Полноценная система аккаунтов: три способа входа, единый профиль пользователя.
Сейчас в лобби есть никнейм-based сессия (localStorage) — нужно заменить
реальными аккаунтами с персистентностью.

- **Способы входа (все три под одним `userId`):**
  - **Email + пароль** — классическая регистрация: email, пароль (bcrypt), верификация почты,
    восстановление пароля (ссылка на email). `next-auth` Credentials provider.
  - **VK ID** — OAuth 2.0 через `id.vk.com`, SDK `@vkontakte/vk-id-sdk`
  - **Яндекс ID** — OAuth 2.0 через `oauth.yandex.ru`, scope `login:info login:avatar`
  - Все три провайдера привязываются к одному аккаунту (account linking по email)
- **Архитектура:**
  - `next-auth` v5 (App Router native) — единый адаптер для всех трёх провайдеров
  - Сессия: JWT (edge-compatible) или Redis (если нужна server-side инвалидация) — открытый вопрос #8
  - `user.id` → привязывается к `room.players` в `server.mts`
  - Никнейм: из профиля OAuth-провайдера (VK: `first_name`, Яндекс: `display_name`) или
    задаётся при регистрации через email — пользователь может изменить в настройках (вопрос #9)
  - БД для хранения аккаунтов: PostgreSQL / PlanetScale / Supabase (открытый вопрос #12)
- **Что меняется в UI:**
  - `AuthDropdown` в лобби: три кнопки входа + форма email/пароль (register/login toggle)
  - `AvatarPill`: реальный аватар из OAuth или инициал для email-аккаунтов
  - Экран верификации email после регистрации
  - Форма восстановления пароля (отдельный route `/auth/reset-password`)
  - Профиль: никнейм, привязанные способы входа, смена пароля
- **Сессии и комнаты:**
  - Реконнект по `userId` вместо `socketId` — игрок возвращается в комнату после разрыва
  - Host transferability: если хост дисконнектится, можно передать права другому
- **Связки:**
  - Фаза M (Монетизация) — без реального аккаунта нельзя привязать оплату
  - Фаза D (Lobby) — `AvatarPill` получает реальный аватар
  - `server.mts` — `room.players` хранит `userId` вместо ephemeral socketId

**Фаза M — Монетизация**
Всё что связано с оплатой: платёжный провайдер, подписки/разовые покупки, paywall
на фичи, биллинг-портал, вебхуки, управление подписками.

- **Платёжный провайдер** — определить в начале фазы (открытый вопрос #8):
  Stripe / YooKassa / Paddle / иное
- **Модель монетизации** — определить в начале фазы (открытый вопрос #9):
  - Freemium (базовые игры бесплатно, нейроведущий / доп. игры / темы — платно)
  - Подписка (месяц/год)
  - Разовые покупки (пакеты комнат, темы, голоса)
  - Комбо
- **Что может быть за paywall (примеры):**
  - Нейроведущий (Фаза K)
  - Тематические квизы (Harry Potter, Marvel и т.д.)
  - Дополнительные голоса/персонажи ведущего
  - Повышенный лимит игроков в комнате
  - Кастомные аватары / темы оформления
- **Инфраструктура:**
  - Webhooks для событий оплаты → обновление `user.subscription` в БД/Redis
  - Биллинг-портал (управление подпиской, отмена)
  - Trial period
  - Graceful degradation при истечении подписки (не ломать игру, только убрать фичи)
- **Связки с другими фазами:**
  - Фаза K (Нейроведущий) — первый кандидат за paywall
  - Фаза I (per-game theming) — кастомные темы как платная фича
  - Фаза D (Lobby) — бейдж «Pro» на аватаре хоста

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
| 8 | Хранилище сессий — JWT (edge) или Redis (server-side инвалидация)? | **Фаза L** | Архитектура аутентификации, масштабирование |
| 9 | Никнейм — брать из провайдера/email как есть или предлагать переименовать при первом входе? | **Фаза L** | UX онбординга |
| 12 | БД для аккаунтов — PostgreSQL / PlanetScale / Supabase / иное? | **Фаза L** | Хранилище users + sessions + accounts |
| 10 | Платёжный провайдер — Stripe / YooKassa / Paddle / иное? | **Фаза M** | Биллинг-архитектура, регион |
| 11 | Модель монетизации — freemium / подписка / разовые покупки / комбо? | **Фаза M** | Что идёт за paywall, ценообразование |

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

**Claude обязан учиться на своих ошибках.** Повторение одной и той же ошибки —
признак того, что урок не был зафиксирован или не был прочитан. Если Claude
допускает ошибку, которую уже совершал раньше (есть в learnings или в CLAUDE.md) —
это двойное нарушение: сама ошибка + игнорирование урока.

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

### 🚫 ЖЁСТКОЕ ПРАВИЛО: Codex НИКОГДА не трогает системные файлы Claude

**Запрещённые для Codex файлы (абсолютный whitelist):**
- `CLAUDE.md` — только Claude
- `AGENTS.md` — только Claude
- `.codex/**` — read-only для Codex (`.codex/STATUS.md` — только Claude)
- `codex-tasks/**` — только Claude (Codex читает, не пишет)
- `codex-reports/**` — только Codex (Claude читает, не пишет)

**Как это обеспечивается:**
- Whitelist в ТЗ должен явно исключать эти файлы.
- Claude обязан проверять `git diff` после выполнения таска: если Codex затронул
  любой из этих файлов — немедленно `git checkout -- <файл>` и фиксировать нарушение.
- **Если Codex изменил `CLAUDE.md`** — откатить `git checkout -- CLAUDE.md` до коммита.

**Урок 2026-05-10 (TASK-062):** Codex добавил дубликат контента в `CLAUDE.md` несмотря
на то что файл не был в whitelist. Claude поймал нарушение через `git diff` и выполнил
`git checkout -- CLAUDE.md` до коммита. Правило: всегда проверять diff перед `git add`.

---

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

**Урок 2026-05-10:** Claude не запустил codex для simple-таска (TASK-046.1),
сославшись на «codex not in PATH». Правильно: сначала найти бинарник
(`/Applications/Codex.app/Contents/Resources/codex`), создать symlink в homebrew,
и только если это не помогло — сообщить пользователю. Не перекладывать на
пользователя то, что можно решить самому.

**Урок 2026-07-13:** во время live-QA сессии («Кто я?», TV-счётчик «Вопросов
задано» → «Да» подряд) Claude сама сделала `Edit` по
`src/app/tv/[roomId]/[gameType]/page.tsx` — однострочная замена текста и
источника значения (`ws.questionsAsked[...]` → `ws.consecutiveYesAnswers`).
Показалось «слишком тривиальным для ТЗ», но правило не делает исключений по
размеру правки. Поймала себя постфактум (следующим сообщением), не откатывала
(результат корректен), записала урок. Правильно было: даже для однострочной
правки текста/бинда в production-файле — короткое ТЗ (`codex-tasks/NNN.md`)
и `cat ... | codex exec -`, не Edit напрямую.

### Цикл работы

1. Пользователь → Claude: «сделай X»
2. Claude пишет `codex-tasks/NNN-X.md` (ТЗ + whitelist файлов)
3. Claude обновляет `.codex/STATUS.md` (активный таск)
4. **Simple-таск** → Claude сам запускает `codex exec` (с индикацией 🤖 в чате).
   Перед запуском убедиться что `codex` в PATH: `which codex`. Если не найден —
   добавить symlink: `ln -sf /Applications/Codex.app/Contents/Resources/codex /opt/homebrew/bin/codex`
   Запуск: `cat codex-tasks/NNN-X.md | codex exec -`
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
