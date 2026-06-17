# TASK-237 — Spy: 8 правок по live-QA

## Контекст
Live-QA Шпиона выявил 8 правок (фидбэк пользователя). Игра: режимы «Угадай слово»
(`guess`) и «Нарисуй» (`draw`). Host-authoritative, синк через `spy:sync`.

## Whitelist файлов (ТОЛЬКО эти)
- `src/app/game/[roomId]/spy/page.tsx`
- `src/app/tv/[roomId]/[gameType]/page.tsx`

НЕ трогать: `CLAUDE.md`, `AGENTS.md`, `.codex/**`, `codex-tasks/**`, `codex-reports/**`,
любые другие файлы. Минимальный diff — НЕ переформатировать файл, не переставлять
функции, менять только нужные строки.

## Правки

### 1. Меню судьи: показать правильное слово рядом со словом шпиона
Файл: `spy/page.tsx`, ветка `isJudge && s.spyGuessAwaitingJudge` (сейчас показывает
только `s.spyGuessText`). Судья — не-шпион, слово `s.word` ему известно. Показать
оба значения для сравнения:
- «Слово шпиона»: `s.spyGuessText`
- «Правильное слово»: `s.word`
Расположить друг под другом (две подписи + два значения), чтобы судья мог сравнить,
затем кнопки «Верно»/«Отклонить» как есть. Двуязычно через `l()`.

### 2. Передавать ход во время обсуждения — только активный игрок (не host)
Файл: `spy/page.tsx`.
- `passTurn`: guard `if (!isActivePlayer && !isGameHost) return;` → `if (!isActivePlayer) return;`
- Кнопка «→ Передать ход» (guess mode): условие `(isActivePlayer || isGameHost)` → `isActivePlayer`.
- Кнопка «➡ Передать ход» (draw mode): условие `(isActivePlayer || isGameHost)` → `isActivePlayer`.

### 3. Host (guess mode): убрать кнопку «Пропустить», «Заменить слово» того же размера, что «Начать голосование»
Файл: `spy/page.tsx`, блок `s.mode === 'guess' && isGameHost` (сейчас `grid grid-cols-2`
с тремя кнопками: Заменить / Пропустить / Начать голосование).
- Удалить кнопку «Пропустить» (`passTurn` у host).
- Сделать вертикальный стек (`space-y-2`) из двух кнопок на всю ширину одинакового
  размера: «Заменить слово» и «Начать голосование» (обе `w-full`, `size="lg"`).
  «Начать голосование» сохранить янтарный акцент (`border-amber-400/30 bg-amber-500/15 text-amber-200`).

### 4. Кнопка «Угадать слово» (spy, playing) — фон как у остальных кнопок
Файл: `spy/page.tsx`, кнопка spy `onClick={() => sendAction('spy:guess-start')}`.
Сейчас красная (`variant="secondary"` + `border-red-400/30 bg-red-500/10 text-red-200`).
Убрать красные классы → обычная стеклянная кнопка как соседние нейтральные
(дефолтный `GlassButton`, `size="lg"`, `className="w-full"`, без цветовых оверрайдов).

### 5. Убрать начисление очков (раунды без цифр)
Решение пользователя: многораундовый флоу и результат раунда ОСТАЮТСЯ, но все
ЧИСЛА очков/дельт/мест убираются. Финальный экран — без таблицы очков.

Файл: `spy/page.tsx`:
- `resolveVoting`: убрать вычисление `delta`/`newScores`; не возвращать `scores`/
  `lastRoundDelta`. Вернуть `phase: 'roundResult'`, `voteTimerRunning: false`,
  `roundResult: { spyCaught, exposedId, voteCount: maxVotes }`.
- `resolveSpyGuess`: аналогично убрать `delta`/`newScores`; вернуть только
  `phase`, сбросы `spyGuess*` и `roundResult: { spyCaught: !correct, exposedId: s.spyId, voteCount: 0, viaGuess: true, guessedRight: correct }`.
- Результат раунда (`s.phase === 'roundResult'`): в `<h2>` убрать «+1 очко мирным» /
  «+2 очка шпиону» → оставить «Шпиона раскрыли!» / «Шпион победил!» (двуязычно).
- Убрать целиком `GlassCard` с «N-е место / X очков (+delta)».
- Экран `s.gameOver`: убрать список очков (`sortedScores.map(...)`). Оставить
  иконку trophy + заголовок «Игра окончена!» + (host) кнопку «Завершить игру».
- Удалить ставшие неиспользуемыми `sortedScores`, `myPosition` и связанный код,
  чтобы `npm run lint` был чистым. Поля `scores`/`lastRoundDelta` в интерфейсе/
  `mkInitial` можно оставить (не обязательно удалять), но они НЕ должны вычисляться
  и НЕ отображаться. Если оставление вызывает unused-варнинги — убрать.

Файл: `tv/[roomId]/[gameType]/page.tsx` (блок `gameType === 'spy'`):
- `sp.gameOver`: убрать список с `sp.scores[p.id]`. Оставить заголовок «Игра окончена!».
- `roundResult`: убрать подпись `'+1 очко каждому мирному' / '+2 очка шпиону'`.
- Убрать строку дельт внизу roundResult (`spyPlayerList.map` с `sp.lastRoundDelta`).
- Поле `sp.scores`/`sp.lastRoundDelta` в типе TV можно оставить, но не отображать;
  убрать unused-варнинги если появятся.

### 6. Кнопка «Нарисуй» (modeSelect) — фон как у «Угадай слово»
Файл: `spy/page.tsx`, блок `modeSelect`, кнопки host. «Угадай слово» —
`variant="primary"`, «Нарисуй» — `variant="secondary"`. Сделать «Нарисуй»
тоже `variant="primary"` (одинаковый фон).

### 7. Draw mode: передача хода НЕ сбрасывает холст
Файл: `spy/page.tsx`, `passTurn`: убрать `if (s.mode === 'draw') sendClear();`.
Рисунок должен сохраняться у всех при передаче хода. (В `nextWord` `sendClear()`
ОСТАВИТЬ — новое слово = чистый холст.)

### 8. Peek-бар: «Зажми, чтобы увидеть» → «Зажми», размер кнопки не меняется при нажатии
Файл: `spy/page.tsx`, `renderPeekBar`.
- Текст «Зажми, чтобы увидеть» → «Зажми» (EN «Hold to reveal» → «Hold»).
- При зажатии содержимое меняется (слово vs плейсхолдер) и высота скачет. Задать
  стабильную высоту контентной области (например, фиксированный `min-h-*` на
  внутреннем блоке слева), чтобы размер бара не менялся между состояниями
  peek/не-peek.

## Acceptance
- `npm run lint` — чисто (0 ошибок, без новых варнингов).
- `npx tsc --noEmit` — без ошибок.
- НЕ запускать `npm run build` (Turbopack падает в sandbox — это не ошибка кода).
- Diff только в двух whitelisted файлах.
- Отчёт в `codex-reports/237-spy-qa-fixes.md`. Не коммитить.
