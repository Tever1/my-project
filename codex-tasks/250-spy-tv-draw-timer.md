# TASK-250 — Spy TV (игровое поле): таймер в режиме рисования

## Whitelist (трогать ТОЛЬКО этот файл)
- `src/app/tv/[roomId]/[gameType]/page.tsx`

## ЗАПРЕЩЕНО трогать
- `CLAUDE.md`, `AGENTS.md`, `.codex/**`, `codex-tasks/**`, `codex-reports/**`
- серверный код, `globals.css`, мобильный `spy/page.tsx`, любые другие файлы

## Правила
- Минимальный diff, НЕ переформатировать. НЕ запускать `npm run build`.
- Валидация: `npm run lint` + `npx tsc --noEmit`. Двуязычность `l(ru,en)`. codex-reports не трогать.

## Контекст
На TV-экране в режиме рисования (`sp.mode === 'draw'`, фаза `playing`) нет таймера.
Нужно добавить таймер в ЛЕВЫЙ ВЕРХНИЙ угол игрового поля, НЕ меняя размер холста.
Таймер уже есть в стейте: `sp.timerLeft` (дефолт 300с), тикает на хосте и приходит через
`spy:sync`. В scope этого рендера уже определены хелперы `formatSec(sec)` (mm:ss) и
`timerColor` (строки ~1147-1153) — переиспользовать их.

## Правка
Блок draw (~строки 1234-1249):
```tsx
          {!sp.gameOver && sp.phase === 'playing' && sp.mode === 'draw' && (
            <div className="h-full flex flex-col items-center justify-center gap-4 px-12 py-6">
              <p className="text-2xl text-white/50">
                <SpyImg name="palette" className="inline-block h-[1em] w-[1em] align-[-0.15em] mr-1" />
                {l('Рисует: ', 'Drawing: ')}
                <span className="font-bold text-amber-400">{activePlayerName}</span>
              </p>
              <div className="flex-1 min-h-0 w-full flex items-center justify-center">
                <canvas
                  ref={initSpyCanvas}
                  className="rounded-2xl bg-black/30 border-2 border-white/10"
                  style={{ height: '100%', maxWidth: '100%', maxHeight: '100%', aspectRatio: '1' }}
                />
              </div>
            </div>
          )}
```
Заменить на (добавлен `relative` на контейнер + абсолютный таймер в левом верхнем углу;
холст и его style НЕ трогать):
```tsx
          {!sp.gameOver && sp.phase === 'playing' && sp.mode === 'draw' && (
            <div className="relative h-full flex flex-col items-center justify-center gap-4 px-12 py-6">
              <div className="absolute top-6 left-6 z-10 rounded-2xl bg-black/40 px-5 py-3 backdrop-blur-md">
                <span className="font-mono text-5xl font-black tabular-nums" style={{ color: timerColor }}>
                  {formatSec(sp.timerLeft)}
                </span>
              </div>
              <p className="text-2xl text-white/50">
                <SpyImg name="palette" className="inline-block h-[1em] w-[1em] align-[-0.15em] mr-1" />
                {l('Рисует: ', 'Drawing: ')}
                <span className="font-bold text-amber-400">{activePlayerName}</span>
              </p>
              <div className="flex-1 min-h-0 w-full flex items-center justify-center">
                <canvas
                  ref={initSpyCanvas}
                  className="rounded-2xl bg-black/30 border-2 border-white/10"
                  style={{ height: '100%', maxWidth: '100%', maxHeight: '100%', aspectRatio: '1' }}
                />
              </div>
            </div>
          )}
```

## Acceptance
- `npm run lint` чисто, `npx tsc --noEmit` чисто.
- diff только в `src/app/tv/[roomId]/[gameType]/page.tsx`.
- В режиме рисования на TV в левом верхнем углу виден таймер (mm:ss от `sp.timerLeft`,
  300с), цвет меняется через `timerColor`. Размер холста НЕ изменился.
