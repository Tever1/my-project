# TASK-236: Spy — авто-голосование по таймеру + механика «Шпион угадывает слово»

## Контекст

Три связанных изменения в игре «Шпион» (host-authoritative). Все клиентские,
socket через существующий паттерн `game:action` (sendAction/broadcast).
НЕ трогать `server.mts` — сервер ретранслирует `game:action` как есть.

Файлы:
- `src/app/game/[roomId]/spy/page.tsx` (mobile — основная логика + UI)
- `src/app/tv/[roomId]/[gameType]/page.tsx` (TV — рендер новой фазы + итогов)

## Whitelist

- `src/app/game/[roomId]/spy/page.tsx`
- `src/app/tv/[roomId]/[gameType]/page.tsx`

ЗАПРЕЩЕНО: всё остальное (`server.mts`, game-data, прочее).
**Минимальный diff: не переформатировать/не переупорядочивать нетронутые строки.**
Все видимые строки — двуязычные через существующий хелпер `l(ru, en)`.
Существующие механики (guess/draw/voting/draw-canvas/синк) НЕ ломать.

---

## Пункт 1 — Когда основной таймер обсуждения кончился → авто-голосование

Файл: `spy/page.tsx`, host-таймер playing-фазы (эффект с `s.timerRunning`,
который декрементит `timerLeft` и шлёт patch каждую секунду).

Сейчас при достижении 0 таймер просто останавливается. Нужно: когда
`newLeft <= 0` — автоматически перейти в голосование (как кнопка «Начать
голосование»). По аналогии с уже существующим vote-таймер-эффектом, который при
`newLeft <= 0` вызывает `resolveVoting`.

В тик-функции основного таймера, ветка когда `newLeft <= 0`: вместо простого
`timerRunning: false` собрать patch перехода в голосование:
```ts
const patch = {
  timerLeft: 0,
  timerRunning: false,
  phase: 'voting' as Phase,
  votes: {},
  voteTimerLeft: VOTE_TIMER_TOTAL,
  voteTimerRunning: true,
};
setS(prev => ({ ...prev, ...patch }));
broadcast(patch);
clearInterval(id);
return;
```
(Локальные `localVote`/`hasVoted` сбросятся у клиентов в обработчике `spy:sync`
при `patch.phase === 'voting'` — он уже есть.) Логику обычного декремента
(`newLeft > 0`) не менять.

---

## Пункт 2 + 3 — Механика «Шпион угадывает слово»

### Идея потока (Spyfall-style, решающая ставка)

1. Во время `playing` у ШПИОНА на телефоне есть кнопка **«Угадать слово»**.
2. Нажал → фаза `spyGuess`, таймер стоп. На TV (и у всех) появляется
   «🎭 Шпион **{имя}** угадывает слово». Личность шпиона раскрыта.
3. Шпион вписывает слово в поле и жмёт **«Проверить»**.
   - Авто-сравнение (нормализованное) совпало → шпион **угадал** → итоги раунда.
   - Не совпало → у шпиона появляется кнопка **«Подтвердить»** (он настаивает,
     что ответ верный, несмотря на опечатку).
4. Шпион жмёт «Подтвердить» → host выбирает **случайного НЕ-шпиона судью** →
   у судьи на телефоне всплывает окно со словом, что вписал шпион, и кнопками
   **«Верно»** / **«Отклонить»**.
   - «Верно» → шпион **угадал** → итоги раунда.
   - «Отклонить» → шпион **не угадал** → итоги раунда.

### Исход (решение пользователя, вариант A)

- Угадал (авто-совпадение ИЛИ судья «Верно»): шпион побеждает, **+2 шпиону**,
  мирным 0. → `roundResult`.
- Не угадал (судья «Отклонить»): мирные побеждают, **+1 каждому мирному**,
  шпиону 0. → `roundResult`.

Использовать то же начисление, что в `resolveVoting`: «шпион победил» ⇔
`spyCaught=false`, «мирные победили» ⇔ `spyCaught=true`.

### Новая фаза

Добавить `'spyGuess'` в тип `Phase` (mobile) и в TV-типизацию фазы (там phase:
string — менять не нужно, но строку обрабатывать).

### Новые поля state (mobile `SpyGameState` + `mkInitial`; TV `spyState` тип + init)

- `spyGuessText: string` — слово, которое вписал шпион (для показа судье). init `''`.
- `spyGuessNeedsConfirm: boolean` — авто-проверка не совпала, показать шпиону
  «Подтвердить». init `false`.
- `spyGuessAwaitingJudge: boolean` — ушло на подтверждение судье. init `false`.
- `spyGuessJudgeId: string` — id выбранного судьи. init `''`.

Сбрасывать все 4 в `mkInitial` и при входе в `spyGuess` (на `spy:guess-start`).
В TV `spyState` добавить те же поля в тип и init (TV их только читает).

### Нормализация для авто-сравнения

```ts
const normalizeWord = (w: string) =>
  w.trim().toLowerCase().replace(/ё/g, 'е').replace(/\s+/g, ' ');
```
Совпадение: `normalizeWord(text) === normalizeWord(s.word)`.

### resolve-функция (рядом с `resolveVoting`)

```ts
function resolveSpyGuess(correct: boolean, s: SpyGameState): Partial<SpyGameState> {
  const delta: Record<string, number> = {};
  for (const p of s.players) {
    delta[p.id] = p.id === s.spyId ? (correct ? 2 : 0) : (correct ? 0 : 1);
  }
  const newScores: Record<string, number> = {};
  for (const p of s.players) newScores[p.id] = (s.scores[p.id] ?? 0) + (delta[p.id] ?? 0);
  return {
    phase: 'roundResult',
    spyGuessAwaitingJudge: false,
    spyGuessNeedsConfirm: false,
    roundResult: { spyCaught: !correct, exposedId: s.spyId, voteCount: 0, viaGuess: true, guessedRight: correct },
    scores: newScores,
    lastRoundDelta: delta,
  };
}
```
Добавить в тип `roundResult` опциональные поля `viaGuess?: boolean` и
`guessedRight?: boolean` (mobile и TV).

### Socket-события (обрабатывать в host-ветках эффекта `game:action`, как `spy:vote`)

Все только при `isGameHost` (host-authoritative), кроме самого emit со стороны игроков.

1. **`spy:guess-start`** (emit: шпион). Host:
   ```ts
   setS(prev => {
     const patch: Partial<SpyGameState> = {
       phase: 'spyGuess', timerRunning: false,
       spyGuessText: '', spyGuessNeedsConfirm: false,
       spyGuessAwaitingJudge: false, spyGuessJudgeId: '',
     };
     broadcast(patch); return { ...prev, ...patch };
   });
   ```
2. **`spy:guess-try`** `{ text }` (emit: шпион по кнопке «Проверить»). Host:
   ```ts
   const { text } = payload as { text: string };
   setS(prev => {
     const correct = normalizeWord(text) === normalizeWord(prev.word);
     const patch = correct
       ? resolveSpyGuess(true, prev)
       : { spyGuessText: text, spyGuessNeedsConfirm: true, spyGuessAwaitingJudge: false };
     broadcast(patch); return { ...prev, ...patch };
   });
   ```
3. **`spy:guess-confirm`** (emit: шпион по кнопке «Подтвердить»). Host выбирает
   случайного НЕ-шпиона судью:
   ```ts
   setS(prev => {
     const candidates = prev.players.filter(p => p.id !== prev.spyId);
     const judge = candidates[Math.floor(Math.random() * candidates.length)]?.id ?? '';
     const patch = { spyGuessNeedsConfirm: false, spyGuessAwaitingJudge: true, spyGuessJudgeId: judge };
     broadcast(patch); return { ...prev, ...patch };
   });
   ```
4. **`spy:guess-verdict`** `{ accept }` (emit: судья). Host:
   ```ts
   const { accept } = payload as { accept: boolean };
   setS(prev => {
     const patch = resolveSpyGuess(accept, prev);
     broadcast(patch); return { ...prev, ...patch };
   });
   ```

Со стороны игроков — обычные `sendAction('spy:guess-start')` и т.д.
Также: при `spy:sync` с `patch.phase === 'spyGuess'` сбрасывать локальный
`guessInput` (новый локальный state шпиона) в `''`.

### Локальный state (mobile-компонент)

- `const [guessInput, setGuessInput] = useState('')` — ввод шпиона.
- Производные: `isJudge = effectivePlayerId === s.spyGuessJudgeId`.

### UI mobile

**A) Кнопка «Угадать слово» в playing у шпиона.** В playing-фазе, рядом с
peek-баром (после `renderPeekBar()`), добавить ТОЛЬКО для `isSpy`:
```tsx
{isSpy && (
  <GlassButton variant="secondary" size="lg" className="w-full border-red-400/30 bg-red-500/10 text-red-200"
    onClick={() => sendAction('spy:guess-start')}>
    {l('Угадать слово', 'Guess the word')}
  </GlassButton>
)}
```

**B) Новый блок фазы `spyGuess`** (по аналогии с другими `s.phase === '...'` блоками):
```tsx
{!s.gameOver && s.phase === 'spyGuess' && (
  <div className="mx-auto w-full max-w-md py-4 animate-fade-in space-y-4">
    {isSpy ? (
      <GlassCard className="p-5 space-y-4 border-red-400/30 bg-red-500/10">
        <h2 className="text-2xl font-black text-red-300 text-center">{l('Угадай слово', 'Guess the word')}</h2>
        <p className="text-sm text-white/60 text-center">{l('Впиши слово, которое загадали остальные.', 'Type the word the others were given.')}</p>
        <input
          value={guessInput}
          onChange={(e) => setGuessInput(e.target.value)}
          placeholder={l('Твоя версия…', 'Your guess…')}
          className="w-full rounded-xl bg-black/30 border border-white/15 px-4 py-3 text-lg text-white outline-none focus:border-teal-400/50"
        />
        <GlassButton variant="primary" size="lg" className="w-full" disabled={!guessInput.trim()}
          onClick={() => sendAction('spy:guess-try', { text: guessInput })}>
          {l('Проверить', 'Check')}
        </GlassButton>
        {s.spyGuessNeedsConfirm && !s.spyGuessAwaitingJudge && (
          <div className="space-y-2">
            <p className="text-sm text-amber-300 text-center">{l('Не совпало автоматически. Настаиваешь, что верно?', 'No exact match. Insist it is correct?')}</p>
            <GlassButton size="lg" className="w-full border-amber-400/30 bg-amber-500/15 text-amber-200"
              onClick={() => sendAction('spy:guess-confirm')}>
              {l('Подтвердить', 'Confirm')}
            </GlassButton>
          </div>
        )}
        {s.spyGuessAwaitingJudge && (
          <p className="text-center text-sm text-white/60">{l('Ожидание подтверждения игрока…', 'Waiting for a player to confirm…')}</p>
        )}
      </GlassCard>
    ) : isJudge && s.spyGuessAwaitingJudge ? (
      <GlassCard className="p-5 space-y-4 border-teal-400/30 bg-teal-500/10">
        <p className="text-sm text-white/60 text-center">{l('Шпион вписал слово. Это правильное слово?', 'The spy typed a word. Is it correct?')}</p>
        <p className="text-3xl font-black text-white text-center">{s.spyGuessText}</p>
        <div className="grid grid-cols-2 gap-3">
          <GlassButton variant="primary" size="lg" onClick={() => sendAction('spy:guess-verdict', { accept: true })}>
            {l('Верно', 'Correct')}
          </GlassButton>
          <GlassButton variant="danger" size="lg" onClick={() => sendAction('spy:guess-verdict', { accept: false })}>
            {l('Отклонить', 'Reject')}
          </GlassButton>
        </div>
      </GlassCard>
    ) : (
      <BreathingPlaceholder text={l('Шпион угадывает слово…', 'The spy is guessing the word…')} variant="breathing-text" />
    )}
  </div>
)}
```

**C) roundResult — учесть viaGuess.** В мобильном roundResult-баннере, где сейчас
текст «Шпиона раскрыли…/Шпион победил…», если `s.roundResult.viaGuess` — заменить
строку «Больше всего голосов: …» на признак угадывания. Минимально: под баннером,
если `viaGuess`, показывать `{l('Шпион угадывал слово', 'Spy attempted to guess')}`
вместо «Больше всего голосов». Баннер-заголовок (победа/поражение) оставить
как есть (он завязан на `spyCaught`, который мы выставили правильно).

### UI TV (`tv/.../page.tsx`, spy-блок)

**A) Новый рендер фазы `spyGuess`** (добавить рядом с другими `sp.phase === '...'`):
```tsx
{!sp.gameOver && sp.phase === 'spyGuess' && (
  <div className="h-full flex flex-col items-center justify-center gap-6 px-12">
    <SpyImg name="mask" className="h-24 w-24" />
    <h2 className="text-6xl font-black text-center">Шпион <span className="text-red-300">{spyName}</span></h2>
    <p className="text-3xl text-white/60">угадывает слово…</p>
    {sp.spyGuessAwaitingJudge && (
      <p className="text-xl text-teal-300">{spyGetName(sp.spyGuessJudgeId)} проверяет ответ</p>
    )}
  </div>
)}
```
(`spyName` уже вычисляется в spy-блоке.)

**B) Хедер для `spyGuess`**: ничего обязательного; если в хедере есть условные
бейджи по фазам — `spyGuess` можно не добавлять (останется базовый хедер).

**C) roundResult на TV**: где сейчас «Шпионом был(а)» и слово — если
`sp.roundResult.viaGuess`, добавить мелкую подпись `Шпион пытался угадать слово`
рядом с блоком слова (не ломая верстку). Баннер победы/поражения завязан на
`spyCaught` — оставить.

---

## Acceptance

- `npm run lint` без новых ошибок, `npx tsc --noEmit` чисто.
- #1: когда основной таймер playing достигает 0 — автоматически начинается
  голосование (фаза voting, vote-таймер пошёл).
- #2/#3: у шпиона в playing есть кнопка «Угадать слово»; по нажатию — фаза
  spyGuess, TV показывает «Шпион {имя} угадывает слово»; шпион вводит слово;
  при авто-совпадении сразу итоги (шпион +2); при несовпадении — «Подтвердить»;
  после подтверждения у случайного НЕ-шпиона всплывает окно с word + «Верно/Отклонить»;
  «Верно» → шпион +2, «Отклонить» → мирные +1; оба → roundResult.
- Существующие guess/draw/voting/canvas-механики и синк не сломаны.
- Все новые строки двуязычны.

## Отчёт

`codex-reports/236-spy-guess-word-mechanic.md`: что сделано, какие события/поля
добавлены, как проверено. Не коммитить.
