# TASK-248 — Spy peek-bar: ещё ниже (~30%), на нажатии «твоё слово» пропадает, размер неизменен

## Whitelist (трогать ТОЛЬКО этот файл)
- `src/app/game/[roomId]/spy/page.tsx`

## ЗАПРЕЩЕНО трогать
- `CLAUDE.md`, `AGENTS.md`, `.codex/**`, `codex-tasks/**`, `codex-reports/**`
- серверный код, `globals.css`, любые другие файлы

## Правила
- Минимальный diff, НЕ переформатировать. НЕ запускать `npm run build`.
- Валидация: `npm run lint` + `npx tsc --noEmit`. Двуязычность `l(ru,en)`. codex-reports не трогать.

## Контекст
`renderPeekBar()` (~строки 797-831). Сейчас контент = ВСЕГДА строка «твоё слово» +
вторая строка (Зажми / секрет) = 2 строки. Нужно: высоту ещё уменьшить (~30%) и сделать
контент ОДНОЙ строкой в обоих состояниях. Логика: пока НЕ нажато — показываем «твоё
слово · 👁 Зажми». Когда нажато — «твоё слово» пропадает, на его месте секрет (слово /
«ТЫ ШПИОН»). Так высота одинаковая → размер кнопки при нажатии не меняется.

## Правка
1. Внешний div (строка 799): уменьшить padding:
```
className="glass-card w-full px-4 py-1.5 select-none border-teal-400/20"
```
→
```
className="glass-card w-full px-4 py-1 select-none border-teal-400/20"
```
`style={{ transform: 'none' }}` оставить.

2. Заменить весь внутренний контент-блок (строки 807-826) — убрать постоянную метку
«твоё слово» как отдельную строку и сделать одну строку с переключением:
```tsx
        <div className="min-h-[32px]">
          <p className="text-xs text-white/40">{l('твоё слово', 'your word')}</p>
          {peeking ? (
            isSpy ? (
              <p className="text-base font-black leading-tight text-red-500">
                {l('ТЫ ШПИОН', 'YOU ARE THE SPY')}
                {s.category && (
                  <span className="ml-2 text-xs font-normal text-teal-300">{s.category}</span>
                )}
              </p>
            ) : (
              <FitWord text={s.word} max={20} className="font-bold text-white" />
            )
          ) : (
            <p className="text-white/40">
              <SpyIcon name="eye" className="inline-block h-[1em] w-[1em] align-[-0.15em] mr-1" />
              {l('Зажми', 'Hold')}
            </p>
          )}
        </div>
```
→
```tsx
        <div className="flex min-h-[22px] items-center">
          {peeking ? (
            isSpy ? (
              <p className="text-sm font-black leading-tight text-red-500">
                {l('ТЫ ШПИОН', 'YOU ARE THE SPY')}
                {s.category && (
                  <span className="ml-2 text-xs font-normal text-teal-300">{s.category}</span>
                )}
              </p>
            ) : (
              <FitWord text={s.word} max={18} className="font-bold text-white" />
            )
          ) : (
            <p className="text-xs text-white/40">
              {l('твоё слово', 'your word')}
              <span className="mx-1">·</span>
              <SpyIcon name="eye" className="inline-block h-[1em] w-[1em] align-[-0.15em] mr-1" />
              {l('Зажми', 'Hold')}
            </p>
          )}
        </div>
```

3. Пилюлю «секретно» (строки 827-829): уменьшить вертикальный padding `py-1` → `py-0.5`,
чтобы не была выше контента:
```
className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/50"
```
→
```
className="rounded-full border border-white/10 bg-white/5 px-3 py-0.5 text-xs text-white/50"
```

## Acceptance
- `npm run lint` чисто, `npx tsc --noEmit` чисто.
- diff только в `src/app/game/[roomId]/spy/page.tsx`.
- peek-bar заметно ниже; контент — одна строка; при нажатии «твоё слово» исчезает и
  показывается секрет, высота/ширина карточки НЕ меняется.
