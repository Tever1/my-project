# TASK-320: Alias mobile waiting-экран — убрать карточки команд/игроков

## Контекст

На мобильном экране Alias, фаза `waiting` (перед началом хода — экран с
кнопкой "Начать ход!" / "Ожидание: X начинает ход"), сверху сейчас
показывается ряд карточек команд с именами игроков и значками. Юзер
подтвердил: логика показа кнопки "Начать ход!" только активному игроку
УЖЕ работает правильно, баг не нужен. Единственная правка — убрать этот
верхний ряд карточек с мобильного экрана целиком. Он дублирует то, что
уже показывается на TV ("игровое поле", `tv/[roomId]/[gameType]/page.tsx`,
блок `aliasState.phase === 'waiting' && aliasState.teams.length > 0` —
этот блок НЕ трогать, он остаётся источником этой информации).

## Whitelist файлов (СТРОГО)

- `src/app/game/[roomId]/alias/page.tsx`

## Изменение

Файл `src/app/game/[roomId]/alias/page.tsx`, блок
`{/* ---- WAITING FOR EXPLAINER TO START ---- */}` (~строки 931-991).

Текущая структура:
```tsx
{gameState?.phase === 'waiting' && (
  <div className="flex-1 flex flex-col items-center justify-center gap-4">
    {/* Team cards */}
    <div className="w-full max-w-md flex gap-3">
      {gameState.teams.map((team, ti) => {
        ...
      })}
    </div>

    {/* Start button for explainer */}
    {isExplainer ? (
      <button ...>Начать ход!</button>
    ) : (
      <GlassCard ...>Ожидание: ...</GlassCard>
    )}
  </div>
)}
```

Удалить ТОЛЬКО блок `{/* Team cards */}` целиком (весь `<div className="w-full max-w-md flex gap-3">...</div>` с вложенным `.map`). Оставить как есть: `{/* Start button for explainer */}` и весь тернарник `isExplainer ? <button>...</button> : <GlassCard>...</GlassCard>`.

Итоговая структура блока `waiting`:
```tsx
{gameState?.phase === 'waiting' && (
  <div className="flex-1 flex flex-col items-center justify-center gap-4">
    {/* Start button for explainer */}
    {isExplainer ? (
      <button
        type="button"
        className="min-h-[96px] w-full max-w-md rounded-[30px] border border-white/20 bg-white px-10 text-3xl font-black text-[#9d174d] shadow-[0_18px_44px_rgba(0,0,0,.25)] transition active:scale-[0.98]"
        onClick={() => (isHost ? beginTurn() : emitAction('alias:begin-turn'))}
      >
        {locale === 'ru' ? 'Начать ход!' : 'Start Turn!'}
      </button>
    ) : (
      <GlassCard className="w-full max-w-md p-4 text-center">
        <p style={{ color: 'var(--text-secondary)' }}>
          {locale === 'ru'
            ? `Ожидание: ${explainer?.nickname ?? '...'} начинает ход`
            : `Waiting: ${explainer?.nickname ?? '...'} starts the turn`}
        </p>
      </GlassCard>
    )}
  </div>
)}
```

Если после удаления блока переменная `teamExplainerIdx` (была объявлена
только внутри `.map` колбэка удаляемого блока) больше нигде в файле не
используется — это ожидаемо, она удаляется вместе с блоком, ничего
дополнительно чистить не нужно. Не удалять и не менять `isExplainer`,
`explainer`, `activeTeam`, `explainerIndices` — они объявлены раньше в
файле (~строка 140-155) и используются в других местах, НЕ трогать.

## Acceptance

- `npx tsc --noEmit` — чисто (никаких unused-vars ошибок).
- `npm run lint` — чисто.
- `git diff --stat` — изменения только в
  `src/app/game/[roomId]/alias/page.tsx`.
- Блок карточек команд убран из мобильного waiting-экрана; кнопка
  "Начать ход!" / текст "Ожидание: X начинает ход" остаются как были.

Не коммитить. Отчёт в
`codex-reports/320-alias-mobile-waiting-remove-team-cards.md`.
