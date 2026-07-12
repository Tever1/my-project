# TASK-341: Шпион (режим «Угадывай») — не повторять адресата вопроса, пока не закончится полный круг

> **Метаданные** (заполняет Claude перед стартом)
> - **Дата создания:** 2026-07-12
> - **Сложность:** simple
> - **Запуск:** auto by Claude
> - **Ожидаемое время Codex:** ~10 минут
> - **Зависит от тасков:** TASK-340

---

## Цель

В TASK-340 адресат следующего вопроса выбирался полностью случайно
(исключая только текущего спрашивающего) — это позволяло повторно
адресовать вопрос игроку, который уже отвечал в этом же «круге».
Пользователь уточнил правило: пока не ответят ВСЕ игроки в текущем
круге (при 6 игроках — все 6), нельзя повторно адресовать вопрос тому,
кто уже отвечал в этом круге. Как только круг завершается (все
ответили) — начинается новый круг, и повторы снова разрешены.

---

## Контекст

Продолжение TASK-340 (уже реализовано и провалидировано: явный
асkер/таргет `guessAskerId`/`guessTargetId`, передача хода по цепочке
«кого спросили — тот теперь спрашивает», отображение на мобильном и
TV). Это уточнение касается ТОЛЬКО функции выбора случайного адресата
(`pickRandomOther`) и мест, где она вызывается в режиме «Угадывай» —
логика TV и общая цепочка ходов не меняются.

---

## Файлы к изменению (whitelist)

- `src/app/game/[roomId]/spy/page.tsx`

### НЕ ТРОГАТЬ

- `src/app/tv/[roomId]/[gameType]/page.tsx` — TV только отображает
  `guessAskerId`/`guessTargetId`, которые ему присылает хост; выбор
  адресата происходит исключительно на клиенте хоста в
  `spy/page.tsx` — TV трогать не нужно.
- Логику режима рисования (`draw`) — не менять.
- `CLAUDE.md`, `AGENTS.md` — обновляет только Claude.

---

## Шаги реализации

### 1. Новое поле состояния — учёт круга

В `interface SpyGameState` (рядом с `guessAskerId`/`guessTargetId`,
добавленными в TASK-340) добавить:
```ts
guessCycleAnswered: string[];
```
(список id игроков, которые уже были адресатом вопроса в ТЕКУЩЕМ
круге).

В `mkInitial()` — рядом с `guessAskerId: ''`, `guessTargetId: ''` —
добавить `guessCycleAnswered: []`.

### 2. Обновить выбор адресата (`pickRandomOther`)

Заменить сигнатуру и логику `pickRandomOther` (строка ~299-303) так,
чтобы она учитывала уже отвечавших в круге:
```ts
const pickNextTarget = (
  players: GamePlayer[],
  askerId: string,
  answeredThisCycle: string[],
): { targetId: string; cycleAnswered: string[] } => {
  const notAsker = players.filter(p => p.id !== askerId);
  let candidates = notAsker.filter(p => !answeredThisCycle.includes(p.id));
  let nextCycleAnswered = answeredThisCycle;
  if (candidates.length === 0) {
    // Круг завершён — все (кроме текущего спрашивающего) уже отвечали.
    // Начинаем новый круг.
    candidates = notAsker;
    nextCycleAnswered = [];
  }
  if (candidates.length === 0) return { targetId: '', cycleAnswered: nextCycleAnswered };
  const chosen = candidates[Math.floor(Math.random() * candidates.length)].id;
  return { targetId: chosen, cycleAnswered: [...nextCycleAnswered, chosen] };
};
```
Удалить старую `pickRandomOther`, если она после этого нигде больше не
используется (проверить — в TASK-340 она вызывалась в двух местах,
`startPlaying()` и `passTurn()`, см. ниже — оба переводятся на новую
функцию).

### 3. `startPlaying()` — старт нового раунда начинает новый круг

Там, где раньше было (TASK-340):
```ts
const asker = s.playerOrder[0] ?? '';
patch.guessAskerId = asker;
patch.guessTargetId = pickRandomOther(s.players, asker);
```
Заменить на:
```ts
const asker = s.playerOrder[0] ?? '';
const { targetId, cycleAnswered } = pickNextTarget(s.players, asker, []);
patch.guessAskerId = asker;
patch.guessTargetId = targetId;
patch.guessCycleAnswered = cycleAnswered;
```
(новый раунд — новый круг, стартуем с пустого `answeredThisCycle`).

### 4. `passTurn()` — учитывать текущий круг

Там, где раньше было (TASK-340):
```ts
if (s.mode === 'guess') {
  const newAsker = s.guessTargetId || s.playerOrder[(s.playerOrderIdx + 1) % Math.max(s.playerOrder.length, 1)] || '';
  const newTarget = pickRandomOther(s.players, newAsker);
  update({ guessAskerId: newAsker, guessTargetId: newTarget });
  return;
}
```
Заменить на:
```ts
if (s.mode === 'guess') {
  const newAsker = s.guessTargetId || s.playerOrder[(s.playerOrderIdx + 1) % Math.max(s.playerOrder.length, 1)] || '';
  const { targetId, cycleAnswered } = pickNextTarget(s.players, newAsker, s.guessCycleAnswered);
  update({ guessAskerId: newAsker, guessTargetId: targetId, guessCycleAnswered: cycleAnswered });
  return;
}
```

### 5. Сброс на новый раунд/рестарт

Во всех местах, где по TASK-340 уже добавлен сброс
`guessAskerId: '', guessTargetId: '',` (при `nextWord`, начале новой
игры и т.п. — ищи по вхождениям) — добавить рядом
`guessCycleAnswered: [],`.

> Если по ходу выясняется, что нужен дополнительный шаг или другой файл
> — остановиться, написать в отчёт, вернуть управление Claude.

---

## Acceptance criteria

- [ ] `npm run lint` без новых ошибок
- [ ] `npx tsc --noEmit` без новых ошибок
- [ ] При 6 игроках адресат вопроса не повторяется, пока не ответят все
      (или почти все — см. открытый вопрос ниже) игроки текущего круга
- [ ] После того как круг исчерпан — начинается новый круг, повторы
      снова возможны
- [ ] Режим рисования не затронут

---

## Контрольные точки для самопроверки Codex

1. Прочитать diff (`git diff --stat` + `git diff`).
2. Убедиться что изменён только 1 файл из whitelist.
3. Запустить `npm run lint` и `npm run build` (если Turbopack падает
   из-за sandbox — прогнать `npx next build --webpack` дополнительно).
4. Заполнить отчёт `codex-reports/341-spy-question-cycle-no-repeat.md`.
5. **Не коммитить.**

---

## Открытые вопросы для Codex

- Обязательно ли, чтобы САМ ПЕРВЫЙ спрашивающий раунда (`playerOrder[0]`,
  который никогда не был адресатом) тоже гарантированно стал адресатом
  вопроса ровно один раз до завершения круга? — **Не обязательно
  гарантировать явно** — на практике он с высокой вероятностью попадёт
  в число адресатов в течение круга (так как исключается только как
  ТЕКУЩИЙ спрашивающий, а не навсегда), но специальную логику для
  форсирования этого добавлять не нужно — усложнение не требуется,
  пользователь просил только «не повторять, пока не ответят все» — это
  реализовано через `guessCycleAnswered`.
- Что если игроков всего 2? — `pickNextTarget` с одним кандидатом
  (кроме спрашивающего) всегда будет возвращать его же — круг
  фактически из одного человека, это нормально, специально обрабатывать
  не нужно.
