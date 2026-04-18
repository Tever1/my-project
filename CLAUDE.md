# Party Games Hub — Project Context

Этот файл автоматически читается Claude Code в начале каждой сессии. Он содержит
долговременный контекст проекта, который не должен теряться при переключении
между сессиями/окружениями (облако ↔ локальный Mac).

Если ты — Claude, запущенный в этом репозитории: **прочитай этот файл целиком до
начала работы**. Он объясняет, что это за проект, что уже сделано, что в процессе
и каких граблей избегать.

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

2. **Host-authoritative.** Вся игровая логика живёт на сервере (`server.mts` и
   хэндлеры сокетов). Клиенты только отправляют action'ы и рендерят состояние.
   Не добавляй клиентскую логику, которая может разойтись с сервером.

3. **Alias: classic mode НЕПРИКОСНОВЕНЕН.** Недавний рефакторинг начисления очков
   (c6b8057) затронул **только letter mode**. Classic mode должен работать как
   работал. Если правишь Alias — сначала убедись, что не трогаешь classic.

4. **Crocodile/Alias letter mode — новая схема очков:**
   - Explainer **не получает** очки по кнопкам «Guessed» / «Skip».
   - Не-explainer видит поле ввода и печатает свою догадку.
   - Первый, кто правильно напишет слово, получает +1.
   - На уровне сокетов: action `croc:guess-attempt` / `alias:guess-attempt`
     отправляется клиентом → сервер матчит со словом → эмитит `croc:correct`
     для фидбэка.
   - В letter mode Alias каждый игрок — сам себе «команда» (individual scoring).
   - `finishTurn` в letter mode **не обновляет счёт** (он уже начислен по ходу).

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

### В работе — валидация UI и тематические вопросы

1. ✅ Код интеграции фонов и рестракт setup-флоу запушены в `claude/party-games-hub-etqfF`.
2. 🟡 Визуальная проверка в браузере (localhost:3000) — создать комнату, пройти
   флоу Special → Harry Potter #1 / Marvel #1, убедиться что фон виден и бейджи корректны.
3. ⬜ Создать отдельные наборы тематических вопросов
   (`src/lib/quiz/themed/harry-potter.ts`, `marvel.ts`) и заменить fallback
   в `getSpecialQuizQuestions`.
4. ⬜ UI превью фона в setup-экране выбора темы (опционально).

---

## Рабочий процесс в этом чате (договорённость от 2026-04-17)

После каждого выполненного шага:
1. **Обновлять этот `CLAUDE.md`** — фиксировать что сделано, в каком коммите,
   какие файлы затронуты.
2. **Комментировать в issue #3** (`tever1/my-project`) — чтобы облачный Claude
   был в курсе прогресса.

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
