# TASK-300 — Alias редизайн, шаг 3: кнопки в стиле Крокодила

## Контекст
Финальный шаг редизайна Alias. Приводим кнопки к виду Крокодила. **ВИЗУАЛ ТОЛЬКО**,
onClick-обработчики и условия сохранить дословно, логику/scoring/classic не трогать.
`AliasIcon` уже импортирован (TASK-298).

Файл: `src/app/game/[roomId]/alias/page.tsx`.

## Правка A — action-кнопки explainer (стр. ~967–988)
Было:
```
          {/* Action buttons for explainer */}
          {isExplainer && (
            <div className="w-full max-w-md flex gap-3">
              <GlassButton
                variant="primary"
                size="lg"
                className="flex-1"
                onClick={() => (isHost ? handleGuessed() : emitAction('alias:guessed'))}
              >
                {locale === 'ru' ? 'Угадали! ✓' : 'Guessed! ✓'}
              </GlassButton>
              <GlassButton
                size="lg"
                className="flex-1"
                onClick={() => (isHost ? handleSkip() : emitAction('alias:skip'))}
              >
                {gameState.mode === 'letter'
                  ? (locale === 'ru' ? 'Пропустить →' : 'Skip →')
                  : (locale === 'ru' ? 'Пропуск −1' : 'Skip −1')}
              </GlassButton>
            </div>
          )}
```
Стало (сетка как у Крокодила: «Пропустить» слева бело-стеклянная, «Угадали»
справа зелёный градиент, символ над подписью):
```
          {/* Action buttons for explainer */}
          {isExplainer && (
            <div className="w-full max-w-md">
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  className="h-[76px] rounded-[24px] border border-white/[0.12] bg-white/[0.12] px-3 text-base font-black text-white shadow-[0_12px_30px_rgba(0,0,0,.2)] backdrop-blur-md transition active:scale-[0.98]"
                  onClick={() => (isHost ? handleSkip() : emitAction('alias:skip'))}
                >
                  <span className="mb-1 block text-2xl leading-none">×</span>
                  {gameState.mode === 'letter'
                    ? (locale === 'ru' ? 'Пропустить' : 'Skip')
                    : (locale === 'ru' ? 'Пропуск −1' : 'Skip −1')}
                </button>
                <button
                  type="button"
                  className="h-[76px] rounded-[24px] px-3 text-base font-black shadow-[0_16px_34px_rgba(48,209,88,.28)] transition active:scale-[0.98]"
                  style={{ background: 'linear-gradient(180deg, #4bed7a, #30d158)', color: '#05210f' }}
                  onClick={() => (isHost ? handleGuessed() : emitAction('alias:guessed'))}
                >
                  <span className="mb-1 block text-2xl leading-none">✓</span>
                  {locale === 'ru' ? 'Угадали' : 'Guessed'}
                </button>
              </div>
            </div>
          )}
```

## Правка B — кнопка «Начать ход!» (стр. ~814–822)
Было:
```
          {isExplainer ? (
            <GlassButton
              variant="primary"
              size="lg"
              className="w-full max-w-md"
              onClick={() => (isHost ? beginTurn() : emitAction('alias:begin-turn'))}
            >
              {locale === 'ru' ? 'Начать ход!' : 'Start Turn!'}
            </GlassButton>
          ) : (
```
Стало (большая белая кнопка как START у Крокодила, текст в розовом):
```
          {isExplainer ? (
            <button
              type="button"
              className="min-h-[96px] w-full max-w-md rounded-[30px] border border-white/20 bg-white px-10 text-3xl font-black text-[#9d174d] shadow-[0_18px_44px_rgba(0,0,0,.25)] transition active:scale-[0.98]"
              onClick={() => (isHost ? beginTurn() : emitAction('alias:begin-turn'))}
            >
              {locale === 'ru' ? 'Начать ход!' : 'Start Turn!'}
            </button>
          ) : (
```

## Правка C — кнопка «Случайное распределение» (стр. ~744–750): 🔀 → иконка
Было:
```
              <GlassButton
                size="lg"
                className="w-full"
                onClick={handleRandomizeTeams}
              >
                {locale === 'ru' ? '🔀 Случайное распределение' : '🔀 Randomize Teams'}
              </GlassButton>
```
Стало:
```
              <GlassButton
                size="lg"
                className="w-full"
                onClick={handleRandomizeTeams}
              >
                <AliasIcon name="shuffle" className="mr-2 inline-block h-[1em] w-[1em] align-[-0.15em]" />
                {locale === 'ru' ? 'Случайное распределение' : 'Randomize Teams'}
              </GlassButton>
```

## НЕ ТРОГАТЬ
- Остальные кнопки (`Начать игру →` стр.~761, `Следующий ход →` ~1072,
  `Играть снова` ~1106) оставить как есть.
- Обработчики onClick, условия `isHost`/`isExplainer`/`gameState.mode`,
  socket-события — дословно как были.

## Whitelist (только эти файлы)
- `src/app/game/[roomId]/alias/page.tsx`
- `codex-reports/**` (отчёт)

НЕ трогать: globals.css, TV, другие игры, `CLAUDE.md`, `AGENTS.md`, `.codex/**`,
`codex-tasks/**`. **`npm run build` НЕ запускать** — tsc + lint достаточно.

## Acceptance
- Explaining: «Пропустить»/«Угадали» — croc-сетка (бело-стекло + зелёный градиент,
  символ сверху). «Начать ход!» — большая белая кнопка. 🔀 заменён на иконку shuffle.
- В alias-странице больше НЕТ эмодзи (проверить: ни 🔀, ни ✓ в подписях).
- Логика/обработчики не изменены.
- `npx tsc --noEmit` — без новых ошибок.
- `npm run lint` — без новых ошибок.
- Отчёт в `codex-reports/300-alias-redesign-croc-buttons.md`. Не коммитить.
