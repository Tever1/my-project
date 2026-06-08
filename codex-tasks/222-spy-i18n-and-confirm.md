# TASK-222: Шпион — двуязычность (i18n) + убрать двойной confirm

> **Метаданные**
> - **Дата создания:** 2026-06-07
> - **Сложность:** complex
> - **Запуск:** auto by Claude (codex exec)
> - **Ожидаемое время Codex:** ~15 минут
> - **Зависит от тасков:** TASK-220 (identity уже сделана)

---

## Цель

1. Сделать экран Шпиона двуязычным (ru/en) — сейчас все строки моноязычные
   (русский), что нарушает immutable-правило №1 проекта.
2. Убрать нативный `confirm('Завершить игру?')` — `GameLayout` уже показывает
   свою glass-модалку подтверждения через проп `onEnd` (сейчас двойное
   подтверждение).

---

## Контекст

`spy/page.tsx` не импортирует `useTranslation` вообще. Конвенция проекта (см.
`who-am-i/page.tsx`, `mafia/page.tsx`) — хелпер
`const l = useCallback((ru: string, en: string) => (locale === 'ru' ? ru : en), [locale]);`
и оборачивание каждой видимой строки в `l('...', '...')`.

`GameLayout` (см. `src/components/games/GameLayout.tsx`) при наличии `onEnd`
сам открывает модалку подтверждения и вызывает `onEnd()` только после
согласия. Значит `endGame` должен СРАЗУ завершать игру, без своего confirm.

---

## Файлы к изменению (whitelist)

- `src/app/game/[roomId]/spy/page.tsx` — единственный файл.

### НЕ ТРОГАТЬ

- `src/components/games/GameLayout.tsx`, `DrawCanvas` — не трогать.
- raw `<button>` таймера (Стоп/Старт/↺) — оставить как есть (кастомные цветные
  контролы; только перевести их ТЕКСТ через `l`).
- сервер, другие игры, защищённые файлы.

---

## Шаги реализации

1. Импортировать `useTranslation` из `@/lib/i18n`, добавить
   `const { locale } = useTranslation();` и хелпер `l` (как в mafia/who-am-i).
2. Обернуть ВСЕ видимые русские строки в `l(ru, en)`. Таблица переводов ниже —
   использовать её дословно (эмодзи оставлять как есть, переводить только текст).
3. `endGame` (строки 350-352) → убрать `confirm()`, оставить:
   ```ts
   const endGame = () => {
     emit('game:end', { code: roomId });
     router.push(user ? `/lobby/${roomId}` : `/join/${roomId}`);
   };
   ```
   (`useRouter`/`router`/`user` уже подключены из TASK-220.)
4. `title="Шпион"` → `title={l('Шпион', 'Spy')}`.

### Таблица переводов (ru → en)

- `Шпион` → `Spy`
- `Один из вас — шпион. Остальные знают слово.` → `One of you is the spy. Everyone else knows the word.`
- `📖 Как играть` → `📖 How to play`
- `🎭 Роли` → `🎭 Roles`
- `— все видят секретное слово, кроме одного игрока: шпиона. Он должен это скрыть.` → `— everyone sees the secret word except one player: the spy. They must hide it.`
- `💬 Вопросы` → `💬 Questions`
- `— игроки задают друг другу вопросы, связанные со словом. Отвечай убедительно, не раскрывая слово — шпион слушает и пытается понять, что загадано.` → `— players ask each other questions about the word. Answer convincingly without revealing it — the spy listens and tries to figure out the word.`
- `🕵️ Задача шпиона` → `🕵️ The spy's goal`
- `— отвечать уклончиво, не выдавая незнания. Если угадает слово до разоблачения — победа!` → `— answer evasively without showing ignorance. Guess the word before being exposed to win!`
- `🗳️ Голосование` → `🗳️ Voting`
- `— в конце все голосуют: кто шпион? Ошиблись — шпион победил!` → `— at the end everyone votes: who is the spy? Vote wrong and the spy wins!`
- `🎨 В режиме ` / `«Нарисуй»` / ` каждый по очереди рисует слово. Шпион не знает что рисовать и старается скопировать других.` → `🎨 In ` / `“Draw”` / ` mode each player draws the word in turn. The spy doesn't know what to draw and tries to copy others.`
- `Выберите режим:` → `Choose a mode:`
- `Угадай слово` → `Guess the Word`
- `Нарисуй` → `Draw`
- `Хост выбирает режим...` → `Host is choosing a mode...`
- `💬 Угадай слово` → `💬 Guess the Word`
- `🎨 Нарисуй` → `🎨 Draw`
- `● ИДЁТ` → `● LIVE`
- `на паузе` → `paused`
- `Время вышло!` → `Time's up!`
- `⏸ Стоп` → `⏸ Stop`
- `▶ Старт` → `▶ Start`
- `ТЫ ШПИОН` → `YOU ARE THE SPY`
- `Ты не знаешь слово. Притворяйся убедительно!` → `You don't know the word. Bluff convincingly!`
- `СЕКРЕТНОЕ СЛОВО` → `SECRET WORD`
- `Один из игроков — шпион и не знает это слово` → `One of the players is the spy and doesn't know this word`
- `🎤 Твой ход — задавай вопрос!` → `🎤 Your turn — ask a question!`
- `🎨 Твой ход — рисуй!` → `🎨 Your turn — draw!`
- `🎤 Вопрос задаёт: ` → `🎤 Asking: `
- `🎨 Рисует: ` → `🎨 Drawing: `
- `➡ Передать слово следующему` → `➡ Pass the word on`
- `➡ Передать ход` → `➡ Pass turn`
- `🔄 Следующее слово` → `🔄 Next word`
- `Порядок ходов` → `Turn order`
- `Слушайте вопросы и ответы — вычислите шпиона!` → `Listen to the questions and answers — find the spy!`
- `Хост нажмёт «Следующее слово» когда будете готовы` → `The host will tap “Next word” when you're ready`
- `ШПИОН` (большой заголовок modeSelect, строка 366) → `SPY`

> Если найдёшь строку, которой нет в таблице — перевести по смыслу и отметить в
> отчёте. Если нужен ещё файл/сервер — стоп, в отчёт.

---

## Acceptance criteria

- [ ] `npm run lint` без новых ошибок.
- [ ] `npx tsc --noEmit` чисто.
- [ ] В `spy/page.tsx` нет голых кириллических строковых литералов в JSX/пропсах
      (кроме первого аргумента `l('ru', 'en')`).
- [ ] Нет `confirm(` в файле; завершение игры идёт через модалку GameLayout.
- [ ] Переключение языка (locale) меняет все надписи.

---

## Ограничения и подводные камни

- **Не трогать identity-логику** из TASK-220 — только строки и endGame.
- **DrawCanvas** — отдельный компонент, его строки (если есть) вне scope.
- **Host-authoritative** — сервер не трогать.
- **Комментарии** — английские.

---

## Контрольные точки самопроверки Codex

1. `git diff --stat` — изменён только spy/page.tsx.
2. `grep -nE "[А-Яа-яЁё]" spy/page.tsx` — кириллица только внутри `l(...)`
   первым аргументом.
3. `npm run lint` + `npx tsc --noEmit`.
4. Отчёт `codex-reports/222-spy-i18n-and-confirm.md`.
5. **Не коммитить.**

---

## Открытые вопросы для Codex

- Менять сервер/GameLayout? — **нет**.
- Конвертировать raw-кнопки таймера в GlassButton? — **нет**, только перевести
  их текст.
