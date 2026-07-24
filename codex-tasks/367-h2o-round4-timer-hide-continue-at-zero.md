# TASK-367: «100 к 1» раунд 4 (наоборот) — убрать кнопку ПРОДОЛЖИТЬ после истечения таймера

## Контекст

В файле `src/app/game/[roomId]/hundred-to-one/page.tsx`, блок таймера
обсуждения раунда 4 («наоборот») у хоста (строки ~1319-1330):

```tsx
{/* Round 4 discussion timer */}
{isGameHost && s.curQ === 3 && (
  <div className="mb-3 flex items-center justify-center gap-3">
    <span className={`min-w-[60px] text-center text-2xl font-bold ${s.r4Time <= 10 && s.r4Time > 0 ? 'animate-pulse text-red-400' : 'text-yellow-300'}`}>
      {Math.floor(s.r4Time / 60)}:{(s.r4Time % 60).toString().padStart(2, '0')}
    </span>
    {!s.r4Running
      ? <GlassButton size="sm" onClick={r4Start}>{s.r4Time < 60 ? `▶ ${l('ПРОДОЛЖИТЬ', 'CONTINUE')}` : `▶ ${l('СТАРТ', 'START')}`}</GlassButton>
      : <GlassButton size="sm" onClick={r4Pause}>⏸ {l('ПАУЗА', 'PAUSE')}</GlassButton>}
    <GlassButton size="sm" onClick={r4Reset}>↺</GlassButton>
  </div>
)}
```

Таймер обсуждения — 60 секунд (`r4Time` считает вниз до 0, `r4Running`
становится `false` когда доходит до нуля — см. `r4Start()` строка ~631).

Сейчас, когда таймер истёк (`r4Time === 0`, `r4Running === false`), кнопка
слева от «↺» показывает «ПРОДОЛЖИТЬ» (т.к. `s.r4Time < 60` истинно) — но
продолжать с 0 секунд бессмысленно, кнопка не нужна в этом состоянии.

## Что сделать

Когда `s.r4Time === 0` — не показывать кнопку СТАРТ/ПРОДОЛЖИТЬ/ПАУЗА вообще,
оставить только кнопку сброса «↺» (`r4Reset`). После клика на «↺» таймер
сбрасывается на 60 секунд и `r4Running: false` (это уже делает существующая
функция `r4Reset` — не менять её), то есть после сброса кнопка СТАРТ снова
появится (т.к. `s.r4Time` снова станет 60, не 0).

Логика рендера кнопок должна стать:

```tsx
{s.r4Time === 0 ? null : (
  !s.r4Running
    ? <GlassButton size="sm" onClick={r4Start}>{s.r4Time < 60 ? `▶ ${l('ПРОДОЛЖИТЬ', 'CONTINUE')}` : `▶ ${l('СТАРТ', 'START')}`}</GlassButton>
    : <GlassButton size="sm" onClick={r4Pause}>⏸ {l('ПАУЗА', 'PAUSE')}</GlassButton>
)}
<GlassButton size="sm" onClick={r4Reset}>↺</GlassButton>
```

Кнопка «↺» (reset) остаётся видимой всегда (в т.ч. при `r4Time === 0`) —
это уже так, не менять.

## Whitelist файлов

- `src/app/game/[roomId]/hundred-to-one/page.tsx` — ЕДИНСТВЕННЫЙ файл для правки.

## Acceptance

- `npx tsc --noEmit` без новых ошибок.
- `npm run lint` без новых warnings/errors.
- Пока `r4Time > 0` — поведение кнопок СТАРТ/ПРОДОЛЖИТЬ/ПАУЗА не изменилось.
- Когда `r4Time === 0` — видна только кнопка «↺», кнопки СТАРТ/ПРОДОЛЖИТЬ/ПАУЗА
  скрыты.
- Клик на «↺» при `r4Time === 0` сбрасывает таймер на 60 сек, после чего
  снова появляется кнопка «СТАРТ».

## Отчёт

Записать в `codex-reports/367-h2o-round4-timer-hide-continue-at-zero.md`:
что изменено, diff по строкам, результат tsc/lint.
