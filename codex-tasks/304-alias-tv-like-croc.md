# TASK-304 — Alias TV (игровое поле) как у Крокодила

## Контекст
Привести explaining-экран TV «Угадай слово» к виду TV Крокодила: круглый
SVG-таймер + аватар ведущего + «Таблица очков», в шапке — pill раунда и счётчики
«Угадано/Пропущено». **ВИЗУАЛ ТОЛЬКО**, state/socket/логику не трогать. Менять
ТОЛЬКО секцию Alias TV (около стр. 1662–1890), другие игры не трогать.

Файл: `src/app/tv/[roomId]/[gameType]/page.tsx`.

## Правка 1 — derived-переменные
После строки `const explainerName = getPlayerName(explainerId);` (~стр. 1671)
ДОБАВИТЬ:
```
    const aliasDuration = aliasState.mode === 'letter' ? 90 : 60;
    const aliasTimerRadius = 118;
    const aliasTimerCirc = 2 * Math.PI * aliasTimerRadius;
    const aliasTimerRatio = Math.max(0, Math.min(1, aliasState.timeLeft / aliasDuration));
    const aliasTimerOffset = aliasTimerCirc * (1 - aliasTimerRatio);
    const aliasCounters: { label: string; value: number; name: 'check' | 'cross'; color: string }[] = [
      { label: locale === 'ru' ? 'Угадано' : 'Guessed', value: aliasState.wordsGuessed, name: 'check', color: '#22c55e' },
      { label: locale === 'ru' ? 'Пропущено' : 'Skipped', value: aliasState.wordsSkipped, name: 'cross', color: '#f59e0b' },
    ];
```

## Правка 2 — шапка
ЗАМЕНИТЬ блок шапки (от `{/* Header */}` до закрывающего `</div>` перед
`<div className="flex-1 flex flex-col items-center justify-center px-8 gap-3 ...">`),
сейчас это:
```
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-4 bg-black/20 backdrop-blur-sm border-b border-white/10 flex-shrink-0">
          <div className="flex items-center gap-4">
            <AliasIcon name="speech" className="h-10 w-10" />
            <h1 className="text-3xl font-bold">
              {locale === 'ru' ? 'Угадай слово' : 'Guess the Word'}
              {aliasState.mode === 'letter' && (
                <span className="text-lg text-pink-300 ml-3">
                  {locale === 'ru' ? '(на букву)' : '(letter mode)'}
                </span>
              )}
            </h1>
          </div>
          {aliasState.phase === 'explaining' && (
            <span className="text-white/50 text-lg">
              {locale === 'ru' ? 'Раунд' : 'Round'} {aliasState.round} / {aliasState.totalRounds}
            </span>
          )}
        </div>
```
на:
```
        {/* Header */}
        <div className="flex items-center justify-between gap-8 px-8 py-4 bg-black/20 backdrop-blur-sm border-b border-white/10 flex-shrink-0">
          <div className="flex items-center gap-4">
            <AliasIcon name="speech" className="h-10 w-10" />
            <h1 className="text-3xl font-bold">
              {locale === 'ru' ? 'Угадай слово' : 'Guess the Word'}
              {aliasState.mode === 'letter' && (
                <span className="text-lg text-pink-300 ml-3">
                  {locale === 'ru' ? '(на букву)' : '(letter mode)'}
                </span>
              )}
            </h1>
            {aliasState.phase === 'explaining' && (
              <span className="rounded-full border border-pink-300/30 bg-pink-500/20 px-4 py-1.5 font-mono text-sm font-bold uppercase tracking-[0.18em] text-pink-100">
                {locale === 'ru' ? 'Раунд' : 'Round'} {aliasState.round} / {aliasState.totalRounds}
              </span>
            )}
          </div>
          {aliasState.phase === 'explaining' && (
            <div className="flex items-center gap-3">
              {aliasCounters.map((stat) => (
                <div
                  key={stat.label}
                  className="flex min-w-[150px] items-center gap-3 rounded-3xl border border-white/10 bg-white/[0.06] px-4 py-3 shadow-[0_14px_38px_rgba(0,0,0,.22)]"
                >
                  <span
                    className="flex h-11 w-11 items-center justify-center rounded-2xl"
                    style={{ backgroundColor: `${stat.color}22`, color: stat.color }}
                  >
                    <AliasIcon name={stat.name} className="h-6 w-6" />
                  </span>
                  <span className="flex flex-col leading-none">
                    <span className="font-mono text-[42px] font-black tabular-nums leading-none" style={{ color: stat.color }}>
                      {stat.value}
                    </span>
                    <span className="mt-1 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-white/45">
                      {stat.label}
                    </span>
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
```

## Правка 3 — блок EXPLAINING
ЗАМЕНИТЬ весь блок (от `{/* EXPLAINING */}` и `{aliasState.phase === 'explaining' && (`
до его закрывающего `)}` перед `{/* TURN RESULT */}`) на:
```
          {/* EXPLAINING */}
          {aliasState.phase === 'explaining' && (
            <>
              <div className="flex flex-1 min-h-0 w-full items-center justify-center gap-[clamp(2rem,6vw,4rem)]">
                {/* Circular timer */}
                <div className="relative h-[280px] w-[280px] flex-shrink-0">
                  <svg viewBox="0 0 260 260" width="280" height="280">
                    <circle cx="130" cy="130" r={aliasTimerRadius} stroke="rgba(255,255,255,.08)" strokeWidth="14" fill="none" />
                    <circle
                      cx="130"
                      cy="130"
                      r={aliasTimerRadius}
                      stroke={aliasState.timeLeft <= 10 ? '#ef4444' : '#ec4899'}
                      strokeWidth="14"
                      fill="none"
                      strokeLinecap="round"
                      strokeDasharray={aliasTimerCirc}
                      strokeDashoffset={aliasTimerOffset}
                      transform="rotate(-90 130 130)"
                      style={{ filter: 'drop-shadow(0 0 12px #ec489988)', transition: 'stroke-dashoffset 1s linear' }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className={`font-mono text-7xl font-black tabular-nums leading-none ${aliasState.timeLeft <= 10 ? 'text-red-200 animate-pulse' : 'text-white'}`}>
                      {aliasState.timeLeft}
                    </span>
                    <span className="mt-2 font-mono text-sm font-bold uppercase tracking-[0.28em] text-white/40">
                      {locale === 'ru' ? 'сек' : 'sec'}
                    </span>
                  </div>
                </div>

                {/* Explainer + letter */}
                <div className="min-w-0 max-w-[48vw] flex-1">
                  <p className="mb-4 font-mono text-lg font-bold uppercase tracking-[0.22em] text-white/45">
                    {locale === 'ru' ? 'Объясняет' : 'Explaining'}
                  </p>
                  <div className="flex min-w-0 items-center gap-6">
                    <PlayerAvatar nickname={explainerName} sizePx={88} ring="#ec4899" />
                    <p className="min-w-0 truncate text-[clamp(3rem,6vw,4.5rem)] font-black leading-none" style={{ letterSpacing: '-1.5px' }}>
                      {explainerName}
                    </p>
                  </div>
                  {aliasState.mode === 'letter' && aliasState.currentLetter && (
                    <p className="mt-5 font-mono text-lg uppercase tracking-[0.22em] text-white/45">
                      {locale === 'ru' ? 'Буква' : 'Letter'}: <span className="font-black text-pink-300">{aliasState.currentLetter}</span>
                    </p>
                  )}
                </div>
              </div>

              {/* Scoreboard (teams) */}
              <div className="w-full flex-shrink-0 rounded-[24px] border border-white/10 bg-white/[0.05] p-4 shadow-[0_18px_54px_rgba(0,0,0,.25)]">
                <div className="mb-3 flex items-center gap-2">
                  <AliasIcon name="trophy" className="h-7 w-7" />
                  <h2 className="text-xl font-black">{locale === 'ru' ? 'Таблица очков' : 'Scoreboard'}</h2>
                </div>
                <div
                  className="grid gap-3"
                  style={{ gridTemplateColumns: `repeat(${Math.max(1, Math.min(aliasState.teams.length, 8))}, minmax(0, 1fr))` }}
                >
                  {aliasState.teams.map((team, ti) => {
                    const active = ti === aliasState.activeTeamIndex;
                    return (
                      <div
                        key={team.id}
                        className="min-w-0 rounded-[20px] px-3 py-3 text-center"
                        style={{
                          background: active ? 'linear-gradient(180deg, #ec48992e, rgba(255,255,255,.04))' : 'rgba(255,255,255,.04)',
                          border: active ? '1px solid #ec489966' : '1px solid rgba(255,255,255,.08)',
                        }}
                      >
                        <p className="truncate text-[15px] font-bold text-white">{team.name}</p>
                        <p className="mt-1 font-mono text-[26px] font-black leading-none text-white tabular-nums">{team.score}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
```

## Whitelist (только эти файлы)
- `src/app/tv/[roomId]/[gameType]/page.tsx`
- `codex-reports/**` (отчёт)

НЕ трогать: мобильный alias, globals.css, ДРУГИЕ игры в TV-файле (только секция
alias!), фазы alias modeSelect/teamSelect/waiting/turnResult/finished,
`CLAUDE.md`, `AGENTS.md`, `.codex/**`, `codex-tasks/**`.
**`npm run build` НЕ запускать** — tsc + lint достаточно.

## Acceptance
- TV Alias в explaining: круглый розовый таймер слева, аватар+имя ведущего справа,
  «Таблица очков» (команды, активная подсвечена) снизу. В шапке — pill раунда и
  счётчики «Угадано/Пропущено».
- Другие игры в TV-файле не затронуты.
- `npx tsc --noEmit` и `npm run lint` — без новых ошибок.
- Отчёт в `codex-reports/304-alias-tv-like-croc.md`. Не коммитить.
