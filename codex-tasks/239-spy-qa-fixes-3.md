# TASK-239 — Spy live-QA fixes (волна 3)

## Контекст
Live-QA Шпиона на телефонах. Три правки по фидбеку юзера. Только клиент.

## Whitelist (трогать ТОЛЬКО эти файлы)
- `src/app/game/[roomId]/spy/page.tsx`

## ЗАПРЕЩЕНО трогать
- `CLAUDE.md`, `AGENTS.md`, `.codex/**`, `codex-tasks/**`, `codex-reports/**`
- любые другие файлы кроме whitelist
- серверный код (`server.mts`, `src/server/**`)

## Правила
- Минимальный diff. НЕ переформатировать файл, не менять несвязанные строки.
- НЕ запускать `npm run build` (падает в sandbox). Валидация: `npm run lint` + `npx tsc --noEmit`.
- Двуязычность ru/en сохранять (хелпер `l(ru, en)` уже есть).
- Отчёт в `codex-reports/239-spy-qa-fixes-3.md`. НЕ коммитить.

## Правки

### #1 — Кнопка «твоё слово» (peek-bar) на всю ширину, как карточка раунда
Функция `renderPeekBar()` (около строки 792-794). Сейчас:
```
className="glass-card mx-auto w-1/2 min-w-[200px] px-4 py-3 select-none border-teal-400/20"
```
Сделать на всю ширину контейнера, как верхняя карточка раунда (которая `<GlassCard className="p-4 flex items-center justify-between">`). Заменить на:
```
className="glass-card w-full p-4 select-none border-teal-400/20"
```
(убрать `mx-auto w-1/2 min-w-[200px]`, padding привести к `p-4`). Внутренняя верстка не меняется.

### #2 — Подтверждение для host-кнопок «Заменить слово» и «Начать голосование»
Чтобы игрок случайно не нажал. Добавить inline-подтверждение (НЕ нативный `confirm()`).

1. Добавить локальный React-стейт рядом с другими `useState` в компоненте:
```
const [confirmPlay, setConfirmPlay] = useState<null | 'replace' | 'voting'>(null);
```
(Это чисто UI-стейт клиента, НЕ в общий game state, НЕ в `update()`.)

2. В фазе `playing`:
   - guess-mode host-блок (около строк 1085-1096): кнопка «Заменить слово» теперь `onClick={() => setConfirmPlay('replace')}` вместо прямого `replaceWord`; кнопка «Начать голосование» — `onClick={() => setConfirmPlay('voting')}` вместо прямого `startVoting`.
   - draw-mode host-кнопка «Начать голосование» (около строк 1075-1083): тоже `onClick={() => setConfirmPlay('voting')}` вместо прямого `startVoting`.

3. Добавить рендер подтверждения в фазе `playing` (например в самом конце блока playing, после host-кнопок, ещё внутри его контейнера `space-y-4`), показывается когда `confirmPlay !== null`:
```
{confirmPlay && (
  <GlassCard className="p-4 space-y-3 border-amber-400/30 bg-amber-500/10">
    <p className="text-center text-white/85">
      {confirmPlay === 'replace'
        ? l('Заменить слово?', 'Replace word?')
        : l('Начать голосование?', 'Start voting?')}
    </p>
    <div className="grid grid-cols-2 gap-3">
      <GlassButton className="w-full" onClick={() => setConfirmPlay(null)}>
        {l('Отмена', 'Cancel')}
      </GlassButton>
      <GlassButton
        variant="primary"
        size="lg"
        className="w-full border-amber-400/30 bg-amber-500/15 text-amber-200"
        onClick={() => {
          if (confirmPlay === 'replace') replaceWord();
          else startVoting();
          setConfirmPlay(null);
        }}
      >
        {l('Подтвердить', 'Confirm')}
      </GlassButton>
    </div>
  </GlassCard>
)}
```
Сбрасывать `confirmPlay` в null после подтверждения (уже в onClick). `replaceWord`/`startVoting` уже сами меняют фазу, так что доп. сброс не нужен.

### #3 — Убрать лимит раундов: игра НЕ завершается автоматически
Сейчас игра кончается после `totalRounds` (3..кол-во игроков). Нужно: раунды НЕОГРАНИЧЕНЫ, игра завершается только когда host сам нажмёт кнопку завершения (она уже есть — top-end через `GameLayout onEnd`).

1. `nextRound()` (около строк 691-696): убрать ранний выход по лимиту:
```
if (s.currentRound >= s.totalRounds) {
  update({ gameOver: true });
  return;
}
```
— удалить целиком. `nextRound` всегда переходит к следующему раунду.

2. roundResult-рендер (около строк 1256-1266): host всегда видит «Новое слово» → `nextRound`. Убрать ветку с `s.currentRound < s.totalRounds ? (...) : (Завершить игру)`. Оставить просто:
```
{isGameHost ? (
  <GlassButton variant="primary" size="lg" className="w-full" onClick={nextRound}>
    {l('Новое слово', 'New word')}
  </GlassButton>
) : (
  <BreathingPlaceholder text={l('Ведущий запустит следующий раунд', 'The host will start the next round')} variant="breathing-text" />
)}
```
(host завершает игру кнопкой завершения в шапке GameLayout — она уже подключена.)

3. Убрать счётчик «/ totalRounds» из подписей раунда (лимита больше нет):
   - строка ~895 (фаза dealing): `{l('Раунд', 'Round')} {s.currentRound} / {s.totalRounds}` → `{l('Раунд', 'Round')} {s.currentRound}`
   - строка ~1001 (фаза playing): `{l('Раунд', 'Round')} {s.currentRound} / {s.totalRounds}` → `{l('Раунд', 'Round')} {s.currentRound}`

4. Поле `totalRounds` в стейте НЕ удалять (оставить как есть, просто перестаёт использоваться для лимита/подписи). Так же не трогать места где оно инициализируется (`Math.max(3, ...)`).

## Acceptance
- `npm run lint` без новых ошибок, `npx tsc --noEmit` чисто.
- diff только в `src/app/game/[roomId]/spy/page.tsx`.
- Peek-bar на всю ширину. Host-кнопки замена/голосование требуют подтверждения. Игра не кончается сама — счётчик раундов без «/ N».
