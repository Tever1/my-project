# TASK-340: Шпион (режим «Угадывай») — показывать КОМУ задан вопрос + передача хода по цепочке «спросили → теперь сам спрашивает»

> **Метаданные** (заполняет Claude перед стартом)
> - **Дата создания:** 2026-07-12
> - **Сложность:** complex
> - **Запуск:** manual by user (Codex Desktop)
> - **Ожидаемое время Codex:** ~25 минут
> - **Зависит от тасков:** TASK-338, TASK-339

---

## Цель

1. В режиме «Угадывай» (`s.mode === 'guess'`) помимо того, КТО сейчас
   задаёт вопрос, показывать КОМУ он адресован — и мобильным игрокам, и
   на TV.
2. Ход передаётся не по фиксированному заранее перемешанному кругу, а
   по цепочке: тот, кому задали вопрос в текущем ходу, в следующем ходу
   сам становится задающим вопрос (и адресует его новому, случайно
   выбранному игроку). Это касается **только** режима «Угадывай» — в
   режиме рисования (`s.mode === 'draw'`) порядок хода остаётся прежним
   (по кругу, без изменений).
3. Дополнительно: на TV убрать слово «вслух» из текста фазы обсуждения.

---

## Контекст

Сейчас в режиме «Угадывай» активный игрок (тот, чей ход) определяется
через `s.playerOrder[s.playerOrderIdx % s.playerOrder.length]` — то есть
по заранее перемешанному кругу, без понятия «кому именно адресован
вопрос». Пользователь хочет живую цепочку вопросов: A спрашивает B
(B выбирается случайно), затем B (тот, кого спросили) сам становится
спрашивающим и обращается к следующему, случайно выбранному игроку
(не обязательно следующему по кругу).

**Важно: режим рисования (`s.mode === 'draw'`) использует ТЕ ЖЕ поля**
(`playerOrder`/`playerOrderIdx`, функцию `passTurn()`) для порядка
рисования — там никакого «кому адресован» нет и не нужно, очередь
рисования должна остаться как есть (последовательный круг). Менять
логику для `draw` **нельзя** — только для `guess`.

---

## Файлы к изменению (whitelist)

- `src/app/game/[roomId]/spy/page.tsx`
- `src/app/tv/[roomId]/[gameType]/page.tsx`

### НЕ ТРОГАТЬ

- Логику `draw`-режима (`isDrawer`, `drawerId`, ветки `if (s.mode === 'draw')`
  внутри `passTurn`/`startPlaying`) — не менять.
- Другие игры, сервер (`server.mts`, `src/server/socket-handlers.mts`) —
  не требуется, всё клиентское.
- `CLAUDE.md`, `AGENTS.md` — обновляет только Claude.

---

## Шаги реализации

### 1. `src/app/game/[roomId]/spy/page.tsx` — новые поля состояния

В `interface SpyGameState` (рядом с `playerOrder`/`playerOrderIdx`,
строки ~215-216) добавить:
```ts
guessAskerId: string;
guessTargetId: string;
```
В `mkInitial()` (там же, где `playerOrder: []`, `playerOrderIdx: 0`)
добавить:
```ts
guessAskerId: '',
guessTargetId: '',
```

Добавить рядом с `shufflePlayers` (строка ~281-288) вспомогательную
функцию:
```ts
const pickRandomOther = (players: GamePlayer[], excludeId: string): string => {
  const candidates = players.filter(p => p.id !== excludeId);
  if (candidates.length === 0) return '';
  return candidates[Math.floor(Math.random() * candidates.length)].id;
};
```

### 2. Определение активного игрока (строка ~410)

Сейчас:
```ts
const activePlayerId = s.playerOrder[s.playerOrderIdx % Math.max(s.playerOrder.length, 1)] ?? '';
```
Заменить на (draw-режим — без изменений, guess-режим — новое поле с
фолбэком на старое поведение пока `guessAskerId` не проинициализирован):
```ts
const activePlayerId = s.mode === 'guess'
  ? (s.guessAskerId || s.playerOrder[s.playerOrderIdx % Math.max(s.playerOrder.length, 1)] || '')
  : (s.playerOrder[s.playerOrderIdx % Math.max(s.playerOrder.length, 1)] ?? '');
```
Строкой ниже добавить:
```ts
const targetPlayerName = s.players.find(p => p.id === s.guessTargetId)?.nickname ?? '???';
const isTargetPlayer = s.guessTargetId === effectivePlayerId;
```

### 3. Инициализация первого вопроса при старте раунда

В `startPlaying()` (строка ~724-729) — когда `s.mode === 'guess'`,
проинициализировать асkera/таргет:
```ts
const startPlaying = () => {
  if (!isGameHost) return;
  const patch: Partial<SpyGameState> = { phase: 'playing', timerRunning: true };
  if (s.mode === 'draw') {
    patch.drawerId = s.playerOrder[0] ?? '';
  } else {
    const asker = s.playerOrder[0] ?? '';
    patch.guessAskerId = asker;
    patch.guessTargetId = pickRandomOther(s.players, asker);
  }
  update(patch);
};
```

### 4. Передача хода (`passTurn`, строки ~738-746)

Сейчас `passTurn` используется и рисованием, и угадыванием одинаково
(последовательный `playerOrderIdx`). Разделить по режиму:
```ts
const passTurn = () => {
  if (!isActivePlayer) return;
  if (s.mode === 'guess') {
    const newAsker = s.guessTargetId || s.playerOrder[(s.playerOrderIdx + 1) % Math.max(s.playerOrder.length, 1)] || '';
    const newTarget = pickRandomOther(s.players, newAsker);
    update({ guessAskerId: newAsker, guessTargetId: newTarget });
    return;
  }
  const nextIdx = (s.playerOrderIdx + 1) % Math.max(s.playerOrder.length, 1);
  const nextPlayerId = s.playerOrder[nextIdx] ?? '';
  update({
    playerOrderIdx: nextIdx,
    drawerId: nextPlayerId,
  });
};
```
(вторая ветка — старое поведение `draw`-режима, скопировано без
изменений логики, кроме удаления теперь неиспользуемого в этой ветке
условия `s.mode === 'draw' ? ... : s.drawerId` — оставить как было,
если проще).

### 5. Сброс полей на новый раунд/новую игру

Во всех местах, где уже сбрасываются `playerOrder`/`playerOrderIdx` на
новый раунд (`nextWord`, начало новой игры, restart и т.п. — их
несколько, ищи по вхождениям `playerOrderIdx: 0` в файле) — рядом
добавить сброс:
```ts
guessAskerId: '',
guessTargetId: '',
```
(не обязательно инициализировать сразу конкретным игроком в этих
местах — первая пара asker/target проставляется в `startPlaying()`,
здесь просто на всякий случай очистить старые значения, чтобы не
осталось «протухших» id от прошлого раунда).

### 6. Отображение на мобильном экране (строки ~1135-1149)

Сейчас:
```tsx
{s.mode === 'guess' && (
  <div className="space-y-4">
    {isActivePlayer ? (
      <GlassCard className="spy-card p-4 text-center">
        <h2 className="text-2xl font-black text-teal-200">{l('Твой ход', 'Your turn')}</h2>
        <p className="mt-1 text-sm text-white/60">{l('Опиши слово одним предложением — но не называй его.', 'Describe the word in one sentence, but do not name it.')}</p>
      </GlassCard>
    ) : (
      <GlassCard className="spy-card p-4 text-center">
        <p className="text-white/40">{l('Задаёт вопрос', 'Asking a question')}</p>
        <p className="mt-1 text-2xl font-black text-white">{activePlayerName}</p>
      </GlassCard>
    )}
  </div>
)}
```
Заменить на вариант с явным указанием цели вопроса:
```tsx
{s.mode === 'guess' && (
  <div className="space-y-4">
    {isActivePlayer ? (
      <GlassCard className="spy-card p-4 text-center">
        <h2 className="text-2xl font-black text-teal-200">{l('Твой ход', 'Your turn')}</h2>
        <p className="mt-1 text-sm text-white/60">
          {l(`Задай вопрос игроку ${targetPlayerName}`, `Ask a question to ${targetPlayerName}`)}
        </p>
      </GlassCard>
    ) : (
      <GlassCard className={`spy-card p-4 text-center ${isTargetPlayer ? 'border-teal-400/40 bg-teal-500/10' : ''}`}>
        <p className="text-white/40">{l('Задаёт вопрос', 'Asking a question')}</p>
        <p className="mt-1 text-2xl font-black text-white">{activePlayerName}</p>
        <p className="mt-2 text-white/40 text-sm">
          {isTargetPlayer
            ? l('Вопрос адресован тебе', 'The question is for you')
            : l(`Спрашивает: ${targetPlayerName}`, `Asking: ${targetPlayerName}`)}
        </p>
      </GlassCard>
    )}
  </div>
)}
```
(текст можно чуть скорректировать по месту, если не помещается — суть:
всегда видно и кто спрашивает, и кому адресован вопрос; если сам
пользователь — тот, кому адресован, выделить его карточку и явно
написать «Вопрос адресован тебе»).

### 7. TV — отображение цели вопроса

`src/app/tv/[roomId]/[gameType]/page.tsx`:
- В локальный тип spy-стейта (там же, где `playerOrder`/`playerOrderIdx`,
  строки ~256-257) добавить `guessAskerId: string; guessTargetId: string;`,
  в начальное значение — пустые строки.
- Derive `activePlayerId`/`activePlayerName` (строки ~1391-1392) —
  аналогично мобильному файлу, с веткой по `sp.mode`:
  ```ts
  const activePlayerId = sp.mode === 'guess'
    ? (sp.guessAskerId || sp.playerOrder[sp.playerOrderIdx % Math.max(sp.playerOrder.length, 1)] || '')
    : (sp.playerOrder[sp.playerOrderIdx % Math.max(sp.playerOrder.length, 1)] ?? '');
  const activePlayerName = spyGetName(activePlayerId);
  const targetPlayerName = spyGetName(sp.guessTargetId);
  ```
- В экране `sp.phase === 'playing' && sp.mode !== 'draw'` (строки
  ~1515-1553, тот же блок где заголовок «Задаёт вопрос») — добавить
  под именем спрашивающего строку с адресатом:
  ```tsx
  <p className="text-lg text-teal-300 uppercase tracking-widest mb-2">Задаёт вопрос</p>
  <span className="text-5xl font-black">{activePlayerName}</span>
  <p className="text-2xl text-white/60 mt-2">→ {targetPlayerName}</p>
  ```
  (заменить/дополнить существующий блок; текст
  «Опиши слово одним предложением — но не называй его» ниже — оставить
  как есть, он относится к общей инструкции игры, не трогать).
- Блок «Порядок хода» (строки ~1660-1679, футер с пилюлями
  `sp.playerOrder.map(...)`) — для `sp.mode === 'guess'` этот
  прогресс-бар по индексу больше не отражает реальный текущий вопрос
  (порядок теперь не последовательный). Изменить условие `isActive`
  так, чтобы для guess-режима подсвечивался игрок по id, а не по
  индексу:
  ```ts
  const isActive = sp.mode === 'guess'
    ? id === activePlayerId
    : i === sp.playerOrderIdx % sp.playerOrder.length;
  const isDone = sp.mode === 'guess'
    ? false
    : i < sp.playerOrderIdx % sp.playerOrder.length;
  ```
  (для guess-режима не выделять «пройденных» — цепочка больше не
  линейна, оставить только активного подсвеченным, остальных — как
  «не пройденных»).

### 8. Убрать «вслух» на TV (фаза обсуждения)

`src/app/tv/[roomId]/[gameType]/page.tsx:1580` — сейчас:
```tsx
Обсудите вслух, кто кажется подозрительным
```
Заменить на:
```tsx
Обсудите, кто кажется подозрительным
```

> Если по ходу выясняется, что нужен дополнительный шаг или другой файл
> — остановиться, написать в отчёт, вернуть управление Claude.

---

## Acceptance criteria

- [ ] `npm run lint` без новых ошибок
- [ ] `npx tsc --noEmit` без новых ошибок
- [ ] В режиме «Угадывай» и мобильный, и TV показывают и того, кто
      спрашивает, и того, кому адресован вопрос
- [ ] После передачи хода в режиме «Угадывай» новым спрашивающим
      становится именно тот, кому был адресован предыдущий вопрос
- [ ] Режим рисования (`draw`) ведёт себя ровно как раньше — очередь
      рисования не изменилась
- [ ] На TV фраза «вслух» убрана из текста фазы обсуждения
- [ ] Остальные фазы/игры не затронуты

---

## Контрольные точки для самопроверки Codex

Перед тем как считать таск выполненным, Codex должен:

1. Прочитать diff (`git diff --stat` + `git diff`).
2. Убедиться что не вышел за whitelist файлов.
3. Запустить `npm run lint` и `npm run build` (если Turbopack падает
   из-за sandbox — прогнать `npx next build --webpack` дополнительно,
   как в предыдущих тасках сессии).
4. Заполнить отчёт `codex-reports/340-spy-question-target-chain.md` по
   шаблону `_TEMPLATE.md`.
5. **Не коммитить.** Коммит делает Claude после ревью (или пользователь).

---

## Открытые вопросы для Codex

- Может ли новый таргет случайно совпасть с предыдущим спрашивающим
  (вопрос вернётся тому, кто только что спрашивал)? — **Да, это
  нормально**, не нужно специально исключать предыдущего спрашивающего
  из выбора цели — пользователь этого не просил, случайный «пинг-понг»
  между двумя игроками допустим.
- Нужно ли хосту вручную выбирать, кому адресован вопрос (вместо
  случайного выбора)? — **Нет**, выбор цели — случайный, без ручного
  контроля хоста.
- Что если в комнате всего 2 игрока (значит таргет всегда один и тот
  же)? — Это нормально, `pickRandomOther` со списком из одного
  кандидата просто всегда вернёт его — не нужно обрабатывать отдельно.
