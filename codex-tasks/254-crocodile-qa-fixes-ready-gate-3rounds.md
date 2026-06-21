# TASK-254 — Крокодил: 6 правок по QA (фаза «Готов», 3 круга, чистка мобильного)

## Контекст

Продолжение TASK-253 (красный Вариант 2). Пользователь прогнал live-QA и дал 6
правок. Это смесь UI-чистки мобильного экрана и двух логических изменений
(старт хода по кнопке + конец игры после 3 кругов). Логика host-authoritative:
источник правды — объясняющий-хост, рассылает через `broadcast('croc:state', ...)`.

## Whitelist файлов (править ТОЛЬКО эти)

- `src/app/game/[roomId]/crocodile/page.tsx` — мобильный экран + игровая логика/стейт.
- `src/app/tv/[roomId]/[gameType]/page.tsx` — блок CROCODILE TV RENDER (~1434–1614)
  + тип/инициализация `crocState` (~237–241).

**ЗАПРЕЩЕНО трогать:** `CLAUDE.md`, `AGENTS.md`, `.codex/**`, `codex-tasks/**`,
`codex-reports/**`, `src/lib/game-data.ts`, `server.mts`, `src/app/globals.css`,
другие игры в TV-файле.

## Immutable-правила
- Двуязычность ru/en у всех видимых строк (через `locale`).
- Схема очков НЕ меняется: очки объясняющему по «Угадали» (+1), «Пропустить» — без
  очков, инкремент `wordsSkipped`. Не-объясняющий видит «Угадывайте вслух!».
- Фон только через GameSurface/GameLayout. Красная тема (#ef4444) сохраняется.

---

## ПРАВКА 1 — Стартовый экран Крокодила: текст правил ярче (мобильный)

Файл: `crocodile/page.tsx`, блок `waiting` (`{(!gameState || gameState.phase === 'waiting') && ...}`).
Описание правил («Объясняйте слова, не называя их! …») сейчас идёт цветом
`var(--text-secondary)` (серый). Сделать его таким же ярким, как заголовок
«Крокодил» над ним — т.е. `var(--text-primary)`. (Заголовок использует
`var(--text-primary)`.) Менять ТОЛЬКО цвет текста описания правил. Остальное на
этом экране не трогать.

---

## ПРАВКА 2 — Ход начинается по кнопке «НАЧАТЬ» (новая фаза `ready`)

Сейчас при истечении времени ход сразу переходит к следующему игроку и слово
показывается мгновенно. Нужно: после перехода хода новый объясняющий видит вместо
слова на красном фоне кнопку **«НАЧАТЬ»**, и только по нажатию запускается таймер
и показывается слово. Это касается КАЖДОГО старта хода (в т.ч. первого после
«Начать игру»).

### Изменения стейта (`CrocodileGameState`)
- Расширить `phase`: `'waiting' | 'ready' | 'explaining' | 'finished'`.
- Добавить поле `turnNumber: number` (1-based номер текущего хода во всей игре).
- **Удалить** поле `completedExplainers: string[]` (заменяется логикой `turnNumber`,
  см. правку 6). Убрать все его использования.

### `startGame` (host)
Вместо `phase: 'explaining'` ставить `phase: 'ready'`, `turnNumber: 1`,
`explainerIndex: 0`, `explainerId: order[0]`, первое слово выбрано,
`timeLeft: TURN_DURATION`. Таймер НЕ запускается (он работает только в `explaining`).

### Новый старт хода — событие `croc:start-turn`
- Объясняющий (`isExplainer`) в фазе `ready` жмёт «НАЧАТЬ»:
  - если `isGameHost` → вызвать `startTurn()` напрямую;
  - иначе → `emitAction('croc:start-turn')`.
- `startTurn()` (host): гард `phase === 'ready'`; ставит `phase: 'explaining'`,
  `timeLeft: TURN_DURATION`, рассылает `croc:state`. Таймер-эффект подхватит
  (он завязан на `phase === 'explaining'`).
- В host-listener (`useEffect` где слушаются `croc:guessed`/`croc:skip`/`croc:next-player`)
  добавить: `if (action === 'croc:start-turn') startTurn();` и добавить `startTurn`
  в deps.

### `advanceToNextExplainer` (host) — переход хода
Переводить НЕ в `explaining`, а в `ready`: `phase: 'ready'`, новый
`explainerIndex`/`explainerId`, новое слово, `timeLeft: TURN_DURATION`,
`wordsGuessed: 0`, `wordsSkipped: 0`, увеличенный `turnNumber` (см. правку 6).
Таймер при этом остановлен (clearInterval уже есть в местах вызова).

### Таймер-эффект
Гард уже `phase !== 'explaining' → return`, так что в `ready` тик не идёт —
оставить как есть. Убедиться, что deps включают `gameState?.phase` (есть) —
переход `ready → explaining` перезапустит эффект и стартует отсчёт.

### Рендер мобильного — фаза `ready`
Объединить условие внешнего блока: рендерить контент для
`phase === 'explaining' || phase === 'ready'`. Внутри по фазе:
- **`ready` + `isExplainer`:** красная карточка (тот же градиент, что у карточки
  слова) с крупной кнопкой **«НАЧАТЬ»** (en: `START`) по центру + подсказка
  «Нажми, когда готов показывать» (en: `Tap when you're ready`). Слово НЕ показывать.
- **`ready` + `!isExplainer`:** красная карточка «{explainer} готовится начать…»
  (en: `{explainer} is getting ready…`).
- **`explaining`:** как в TASK-253 (карточка слова для объясняющего / «Угадывайте
  вслух» для остальных).
- Кнопки «Пропустить»/«Угадали» показывать ТОЛЬКО в `explaining` && `isExplainer`.
- В `ready` кнопок Пропустить/Угадали нет (только «НАЧАТЬ» в карточке).
- Верхний статус-бар (Раунд/таймер/прогресс, см. правку 6) показывать в обеих
  фазах; в `ready` таймер показывает полное время статично (без отсчёта).

### Рендер TV — фаза `ready`
Внешнее условие центр-блока: `explaining || ready`. В `ready`:
- кольцо таймера полное (timeLeft=TURN_DURATION — выходит само);
- лейбл над именем «Готовится начать» (en: `Getting ready`) вместо «Показывает слово»;
- таблицу очков и шапку оставить.
Слово на TV по-прежнему не показывается.

---

## ПРАВКА 3 — Убрать верхнюю карточку со статусом объясняющего (мобильный)

Удалить GlassCard «🎤 {explainer} … ✅ Угадано: X ❌ Пропущено: Y» (карточка
«Explainer name + stats» в фазе explaining). Полностью убрать с мобильного.
(На TV счётчики остаются — это игровое поле.)

---

## ПРАВКА 4 — Убрать кнопку «Передать ход» (мобильный)

Удалить full-width кнопку «Передать ход» / `Pass turn` и её обработчик
(`croc:next-player` через неё). Хостовую кнопку «Следующий игрок →»
(`isGameHost && !isExplainer`) ОСТАВИТЬ как есть. Событие `croc:next-player` в
host-listener оставить (им пользуется «Следующий игрок»).

---

## ПРАВКА 5 — Убрать таблицу лидеров с мобильного

Удалить нижнюю GlassCard «Счёт» со списком игроков и очками (мобильный экран).
Таблица очков есть на TV (игровое поле). Убрать связанные с ней использования
(в т.ч. бывшие ссылки на `completedExplainers`).

---

## ПРАВКА 6 — Игра заканчивается после 3 кругов (каждый показал по 3 раза)

Сейчас игра завершается, когда каждый сходил 1 раз. Нужно: завершать, когда каждый
игрок объяснял **3 раза**.

- Добавить константу `ROUNDS_PER_PLAYER = 3`.
- В `advanceToNextExplainer`: пусть `N = playersOrder.length`,
  `totalTurns = N * ROUNDS_PER_PLAYER`.
  - Если завершённый ход `prev.turnNumber >= totalTurns` → `phase: 'finished'`.
  - Иначе: `turnNumber = prev.turnNumber + 1`,
    `explainerIndex = (prev.explainerIndex + 1) % N`,
    `explainerId = playersOrder[nextIndex]`, новое слово, `phase: 'ready'`.
- Отображение круга (для шапок):
  - `totalRounds = ROUNDS_PER_PLAYER` (= 3).
  - `currentRound (cycle) = clamp(Math.floor((turnNumber - 1) / N) + 1, 1, 3)`;
    в `finished` показывать 3.
  - Везде, где раньше считалось через `completedExplainers.length`, использовать
    этот `currentRound`/`turnNumber`. Подпись остаётся «Раунд N / 3» (TV) и
    «Раунд N / 3» в верхнем статус-баре мобильного (заменить прежнее «Ход N / M»
    на «Раунд N / 3», en: `Round N / 3`).
- GameLayout (мобильный): `round={currentRound}` `totalRounds={3}`.
  `phaseKey={`${gameState?.phase}-${gameState?.turnNumber ?? 0}`}` чтобы переходы
  между ходами/фазами анимировались.

### TV-стейт (`crocState`)
Обновить тип и инициализацию (~237–241): добавить `turnNumber: number`, убрать
`completedExplainers: string[]`. Инициализация: `turnNumber: 1` (и убрать
`completedExplainers: []`). Пересчёт `currentRound` в TV-рендере (сейчас
`crocState.completedExplainers.length + 1`) — на формулу выше через `turnNumber`
и `playersOrder.length`. `totalRounds = 3`.

---

## Acceptance
- `npm run lint` — без новых ошибок.
- `npx tsc --noEmit` — чисто.
- НЕ запускать `npm run build`.
- Никаких изменений вне whitelist.
- Логика: первый ход и каждый последующий стартуют по «НАЧАТЬ»; время вышло →
  следующий игрок в `ready`; игра кончается после 3 кругов на каждого.
- Мобильный: нет карточки-статуса объясняющего, нет «Передать ход», нет таблицы
  очков; текст правил на старте — яркий как заголовок.
- TV: счётчики и таблица очков на месте; фаза `ready` показывает «Готовится начать».
- ru/en везде. Красная тема сохранена.

Отчёт — `codex-reports/254-crocodile-qa-fixes-ready-gate-3rounds.md`. НЕ коммитить.
