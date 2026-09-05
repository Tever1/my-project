# TASK-251 — Spy TV: таймер рисования сделать круглым (как в угадывании)

## Whitelist (трогать ТОЛЬКО этот файл)
- `src/app/tv/[roomId]/[gameType]/page.tsx`

## ЗАПРЕЩЕНО трогать
- `CLAUDE.md`, `AGENTS.md`, `.codex/**`, `codex-tasks/**`, `codex-reports/**`
- серверный код, `globals.css`, мобильный `spy/page.tsx`, любые другие файлы

## Правила
- Минимальный diff, НЕ переформатировать. НЕ запускать `npm run build`.
- Валидация: `npm run lint` + `npx tsc --noEmit`. codex-reports не трогать.

## Контекст
В TASK-250 в режиме рисования (TV) добавлен ТЕКСТОВЫЙ таймер в левом верхнем углу.
Нужно: сделать его КРУГЛЫМ, как в режиме угадывания (guess, `sp.mode !== 'draw'`,
круговой SVG со `CIRC`/`timerOffset`/`timerColor`). Размер холста НЕ менять — таймер
остаётся абсолютным в левом верхнем углу, просто компактный круг (~120px) через `viewBox`
(переиспользуем ту же математику круга, что и в guess: `CIRC`, `timerOffset`, `timerColor`
уже в scope).

## Правка
В draw-блоке заменить текстовый бейдж (добавленный в TASK-250):
```tsx
              <div className="absolute top-6 left-6 z-10 rounded-2xl bg-black/40 px-5 py-3 backdrop-blur-md">
                <span className="font-mono text-5xl font-black tabular-nums" style={{ color: timerColor }}>
                  {formatSec(sp.timerLeft)}
                </span>
              </div>
```
на круглый таймер (тот же SVG-круг, что в guess, масштабированный до 120px через viewBox):
```tsx
              <div className="absolute top-6 left-6 z-10 h-[120px] w-[120px]">
                <svg viewBox="0 0 260 260" width="120" height="120">
                  <circle cx="130" cy="130" r="118" stroke="rgba(255,255,255,.08)" strokeWidth="14" fill="none" />
                  <circle
                    cx="130"
                    cy="130"
                    r="118"
                    stroke={timerColor}
                    strokeWidth="14"
                    fill="none"
                    strokeLinecap="round"
                    strokeDasharray={CIRC}
                    strokeDashoffset={timerOffset}
                    style={{ filter: `drop-shadow(0 0 14px ${timerColor}80)`, transition: 'stroke-dashoffset 1s linear' }}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="font-mono text-3xl font-black tabular-nums">{sp.timerLeft}</span>
                </div>
              </div>
```
`relative` на контейнере draw-блока (из TASK-250) оставить. Холст и его style НЕ трогать.
`formatSec` после этой замены может остаться неиспользуемым в draw-ветке — это нормально,
он используется в других местах (voteTimer и т.д.); НЕ удалять его.

## Acceptance
- `npm run lint` чисто, `npx tsc --noEmit` чисто.
- diff только в `src/app/tv/[roomId]/[gameType]/page.tsx`.
- В режиме рисования на TV таймер в левом верхнем углу — круглый (как в угадывании),
  компактный (~120px), с тем же цветом/прогрессом. Размер холста не изменился.
