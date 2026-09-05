# TASK-303 — Alias мобильный: explaining как у Крокодила (убрать таблицу игроков)

## Контекст
Привести мобильный explaining-экран «Угадай слово» к виду Крокодила:
1. Убрать таблицу игроков/счёта с экрана.
2. Статус-бар (Раунд N/M + таймер M:SS + тонкий прогресс) вместо большого таймера.
3. Единая карта по образцу croc: шапка (метка + иконка), слово по центру (FitText),
   футер «Угадывают» с игроками. Не-explainer — розовая карта «Угадывайте вслух».

**ВИЗУАЛ + презентация. Логику/scoring/socket/фазы/classic не трогать.** Кнопки
«Угадали/Пропустить» уже croc-стиля — оставить как есть.

Файл: `src/app/game/[roomId]/alias/page.tsx`.

## Правка 1 — импорт (рядом со стр. 6, где `AliasIcon`)
Добавить:
```
import { FitText } from '@/components/games/FitText';
```

## Правка 2 — убрать scoreboard GameLayout (стр. ~576)
`showScoreboard={gameState?.phase === 'finished'}` → `showScoreboard={false}`

## Правка 3 — derived `aliasGuessers` (после строки
`const isMyTeamActive = activeTeam?.playerIds.includes(myId) ?? false;`, ~стр. 118)
Добавить:
```
  const aliasGuessers: Player[] = gameState
    ? gameState.mode === 'letter'
      ? players.filter((p) => p.id !== explainer?.id)
      : (activeTeam?.playerIds ?? [])
          .filter((id) => id !== explainer?.id)
          .map((id) => players.find((p) => p.id === id))
          .filter((p): p is Player => Boolean(p))
    : [];
```

## Правка 4 — перестроить explaining
В блоке `{gameState?.phase === 'explaining' && (`:
ЗАМЕНИТЬ всё от комментария `{/* Timer */}` (первый ребёнок контейнера фазы)
ДО закрывающего `)}` тернарника карточек слова (строка прямо ПЕРЕД комментарием
`{/* Action buttons for explainer */}`) на следующий код. То есть удаляются:
старый таймер, блок плиток счёта команд (`{/* Active team + scores */}`),
карточка «explainer info», три старые карточки слова. Кнопки действий
(`{/* Action buttons for explainer */}` и ниже) НЕ трогать.

Новый код:
```
          {/* Status bar: round + timer + progress */}
          <div className="w-full max-w-md">
            <div className="mb-2 flex items-center justify-between">
              <span className="font-mono text-xs font-bold uppercase tracking-[0.22em] text-white/65">
                {locale === 'ru' ? 'Раунд' : 'Round'} {gameState.round} / {gameState.totalRounds}
              </span>
              <span
                className={`font-mono text-2xl font-black tabular-nums ${
                  gameState.timeLeft <= 10 ? 'text-red-200 animate-pulse' : 'text-white'
                }`}
              >
                {Math.floor(gameState.timeLeft / 60)}:{String(gameState.timeLeft % 60).padStart(2, '0')}
              </span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-white/[0.12] overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-1000 linear ${
                  gameState.timeLeft <= 10 ? 'animate-pulse' : ''
                }`}
                style={{
                  width: `${(gameState.timeLeft / (gameState.mode === 'letter' ? TURN_DURATION_LETTER : TURN_DURATION_CLASSIC)) * 100}%`,
                  background:
                    gameState.timeLeft <= 10
                      ? 'linear-gradient(90deg, #f87171, #ef4444)'
                      : 'linear-gradient(90deg, #ec4899, #f472b6)',
                  boxShadow: '0 0 12px #ec4899',
                }}
              />
            </div>
          </div>

          {/* Word / guess card */}
          {isExplainer && currentWord ? (
            <div
              className="relative flex min-h-[320px] w-full max-w-md flex-1 flex-col overflow-hidden rounded-[36px] px-6 py-7 text-white"
              style={{
                background:
                  'radial-gradient(110% 70% at 50% -5%, rgba(255,255,255,.30), transparent 55%), linear-gradient(165deg, #ec4899 0%, #9d174d 100%)',
                boxShadow: '0 24px 60px -18px #ec4899cc',
              }}
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold uppercase tracking-[0.22em] text-white/65">
                  {gameState.mode === 'letter'
                    ? `${locale === 'ru' ? 'Слово · буква' : 'Word · letter'} ${gameState.currentLetter ?? ''}`
                    : locale === 'ru' ? 'Слово' : 'Word'}
                </span>
                <AliasIcon name="speech" className="h-9 w-9" />
              </div>

              <div className="relative flex-1 min-h-0 py-4">
                <div className="absolute inset-0 flex items-center justify-center px-2">
                  <FitText
                    text={locale === 'ru' ? currentWord.ru : currentWord.en}
                    max={96}
                    min={22}
                    className="text-center font-black leading-[0.95]"
                    style={{ letterSpacing: '-1px', textShadow: '0 3px 16px rgba(0,0,0,.35)' }}
                  />
                </div>
              </div>

              <div>
                <p className="mb-2 font-mono text-xs font-bold uppercase tracking-[0.2em] text-white/60">
                  {locale === 'ru' ? 'Угадывают' : 'Guessing'}
                </p>
                <div className="flex flex-wrap gap-2">
                  {aliasGuessers.map((p) => (
                    <span
                      key={p.id}
                      className="inline-flex items-center rounded-full bg-black/20 px-2.5 py-1.5 text-sm font-semibold text-white"
                    >
                      {p.nickname}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div
              className="relative flex min-h-[320px] w-full max-w-md flex-1 flex-col items-center justify-center overflow-hidden rounded-[36px] px-8 py-10 text-center text-white"
              style={{
                background:
                  'radial-gradient(110% 70% at 50% -5%, rgba(255,255,255,.25), transparent 55%), linear-gradient(165deg, #ec4899 0%, #9d174d 100%)',
                boxShadow: '0 20px 50px -22px #ec4899cc',
              }}
            >
              {gameState.mode === 'letter' && gameState.currentLetter && (
                <div className="mb-3">
                  <p className="text-xs uppercase tracking-wider text-white/70">
                    {locale === 'ru' ? 'Буква' : 'Letter'}
                  </p>
                  <p className="text-4xl font-black text-white">{gameState.currentLetter}</p>
                </div>
              )}
              <div className="mb-3 flex justify-center">
                <AliasIcon name="talk" className="h-14 w-14" />
              </div>
              <p className="text-2xl font-black" style={{ textShadow: '0 3px 14px rgba(0,0,0,.35)' }}>
                {gameState.mode === 'classic' && !isMyTeamActive
                  ? locale === 'ru' ? 'Ход другой команды...' : "Other team's turn..."
                  : locale === 'ru' ? 'Угадывайте вслух!' : 'Guess out loud!'}
              </p>
              <p className="mt-3 text-sm font-medium text-white/75">
                {locale === 'ru'
                  ? `${explainer?.nickname ?? '...'} объясняет слово`
                  : `${explainer?.nickname ?? '...'} is explaining`}
              </p>
            </div>
          )}
```

## Whitelist (только эти файлы)
- `src/app/game/[roomId]/alias/page.tsx`
- `codex-reports/**` (отчёт)

НЕ трогать: globals.css, TV, другие фазы (modeSelect/teamSelect/waiting/turnResult/
finished), кнопки действий, `CLAUDE.md`, `AGENTS.md`, `.codex/**`, `codex-tasks/**`.
**`npm run build` НЕ запускать** — tsc + lint достаточно.

## Acceptance
- На мобильном explaining нет таблицы игроков/плиток счёта/инфо-карточки.
- Статус-бар (Раунд + таймер M:SS + тонкий розовый прогресс) сверху.
- У explainer: одна розовая карта — шапка (метка+иконка), слово по центру (FitText),
  «Угадывают» с игроками внизу. У не-explainer: розовая карта «Угадывайте вслух».
- classic/letter логика не изменена; кнопки прежние.
- `npx tsc --noEmit` и `npm run lint` — без новых ошибок.
- Отчёт в `codex-reports/303-alias-mobile-like-croc.md`. Не коммитить.
