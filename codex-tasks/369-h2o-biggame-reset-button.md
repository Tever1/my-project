# TASK-369: «100 к 1» Большая игра — добавить кнопку сброса раунда (мобильный, хост)

## Контекст

В обычных раундах (0-3) у хоста есть кнопка «Сброс» (`resetRound`, файл
`src/app/game/[roomId]/hundred-to-one/page.tsx`, строка ~574 — функция,
строка ~1338 — кнопка в host controls):

```tsx
const resetRound = () => {
  if (!isGameHost) return;
  const ri = s.curQ;
  // ... откат очков за раунд, сброс qState/strikes/roundBusted/roundActiveTeam/
  // roundFund/roundWonBy/roundPhase текущего раунда до начального состояния,
  // возврат фазы на 'buzzer' (или 'playing' для раунда 4)
};
```

```tsx
<button type="button" className={`${H2O_SECONDARY_BUTTON} !border-red-300/45 !text-red-200`} onClick={resetRound}>{l('Сброс', 'Reset')}</button>
```

У «Большой игры» (`s.phase === 'bigGame'`, блок ~1412-1620) такой кнопки НЕТ —
если что-то пошло не так (неверно выбраны игроки, сбились ответы), хост не
может откатить раунд Большой игры к началу.

## Что сделать

### 1. Добавить функцию `resetBigGame`

Разместить рядом с другими `bg*`-функциями (после `bgShowResult`, ~строка 760,
до `bgPauseTimer`). Сбрасывает состояние Большой игры к начальному
(`bgPhase: 0`), НЕ трогая счёт команд (`t1s`/`t2s` не участвуют в Большой
игре — очки идут через отдельный `bgFund`) и НЕ трогая `winTeam` (какая
команда играет Большую игру — это определено результатами обычных раундов,
пересчитывать не нужно):

```tsx
const resetBigGame = () => {
  if (!isGameHost) return;
  if (bgTimerRef.current) { clearInterval(bgTimerRef.current); bgTimerRef.current = null; }
  update({
    phase: 'bigGame',
    bgPhase: 0,
    bgP1Ans: [], bgP2Ans: [],
    bgP1Matched: [], bgP2Matched: [],
    bgFund: 0, bgCurQ: 0,
    bgP1Id: '', bgP2Id: '',
    bgTimeLeft: 0, bgTimerTotal: 0, bgTimerPaused: false,
  });
};
```

(Используй существующий `bgTimerRef` — он уже объявлен строкой ~257 и
используется в `bgStartPlayer`/`bgGoToCheck`.)

### 2. Добавить кнопку «Сброс» в UI Большой игры

В блоке `{s.phase === 'bigGame' && ( ... )}` (строка ~1413), сразу под
заголовком `<h2>...БОЛЬШАЯ ИГРА...</h2>` (строка ~1415), добавить кнопку,
видимую только хосту и только когда раунд уже начался (`s.bgPhase >= 1` —
пока капитан ещё выбирает игроков на `bgPhase === 0`, сбрасывать нечего,
там уже есть свой способ поменять выбор игроков повторным кликом):

```tsx
{isGameHost && s.bgPhase >= 1 && (
  <div className="mb-3 flex justify-center">
    <button type="button" className={`${H2O_SECONDARY_BUTTON} !border-red-300/45 !text-red-200`} onClick={resetBigGame}>{l('Сброс раунда', 'Reset round')}</button>
  </div>
)}
```

Стилистически кнопка должна быть идентична кнопке «Сброс» обычных раундов
(тот же `H2O_SECONDARY_BUTTON` + красные модификаторы).

## Whitelist файлов

- `src/app/game/[roomId]/hundred-to-one/page.tsx` — ЕДИНСТВЕННЫЙ файл для правки.

TV-файл не трогать — это чисто мобильная (host-controls) фича, TV просто
получит новый `broadcast`-патч через существующий механизм `update()`/`h2o:sync`
и автоматически отрендерит `bgPhase === 0` (уже добавлено в TASK-368).

## Acceptance

- `npx tsc --noEmit` без новых ошибок.
- `npm run lint` без новых warnings/errors.
- На `bgPhase === 0` кнопки сброса нет.
- На `bgPhase >= 1` хост видит кнопку «Сброс раунда»; клик возвращает
  Большую игру в состояние `bgPhase: 0` (интро с выбором игроков), очищает
  ответы/совпадения/фонд/выбранных игроков/таймер, не трогая `winTeam` и
  счёт команд обычных раундов.
- Не-хост кнопку не видит.
- Обычные раунды (0-3) и их кнопка «Сброс» не затронуты.

## Отчёт

Записать в `codex-reports/369-h2o-biggame-reset-button.md`:
что изменено, diff по строкам, результат tsc/lint.
