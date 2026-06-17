# TASK-247 — Spy peek-bar: ширина обратно w-full, высота меньше ~30%, без скачка при нажатии

## Whitelist (трогать ТОЛЬКО этот файл)
- `src/app/game/[roomId]/spy/page.tsx`

## ЗАПРЕЩЕНО трогать
- `CLAUDE.md`, `AGENTS.md`, `.codex/**`, `codex-tasks/**`, `codex-reports/**`
- серверный код, `globals.css`, любые другие файлы

## Правила
- Минимальный diff, НЕ переформатировать. НЕ запускать `npm run build`.
- Валидация: `npm run lint` + `npx tsc --noEmit`. Двуязычность `l(ru,en)`. codex-reports не трогать.

## Контекст
`renderPeekBar()` (~строки 797-826). Сейчас высота держится `min-h-[44px]` + `py-2`, а
у шпиона раскрытие занимает 3 строки (label + «ТЫ ШПИОН» + «Тема»), поэтому при нажатии
карточка вырастает. Нужно: ширину вернуть на всю (`w-full`), высоту уменьшить (~30%) И
чтобы при нажатии размер НЕ менялся. Для этого ужать раскрытие шпиона до одной строки,
чтобы все состояния были одинаково низкими.

## Правки

1. Внешний div (строка 799): вернуть полную ширину и уменьшить вертикальный padding:
```
className="glass-card mx-auto w-4/5 px-4 py-2 select-none border-teal-400/20"
```
→
```
className="glass-card w-full px-4 py-1.5 select-none border-teal-400/20"
```
`style={{ transform: 'none' }}` оставить.

2. Внутренний контент-блок (строка 807): уменьшить зарезервированную высоту:
```
<div className="min-h-[44px]">
```
→
```
<div className="min-h-[32px]">
```

3. Ужать раскрытие шпиона до ОДНОЙ строки (строки 810-816). Сейчас:
```tsx
isSpy ? (
  <div>
    <p className="text-xl font-black text-red-500">{l('ТЫ ШПИОН', 'YOU ARE THE SPY')}</p>
    {s.category && (
      <p className="mt-0.5 text-sm text-teal-300">{l('Тема:', 'Theme:')} {s.category}</p>
    )}
  </div>
) : (
```
заменить на (одна строка: «ТЫ ШПИОН» + тема инлайн мелким текстом):
```tsx
isSpy ? (
  <p className="text-base font-black leading-tight text-red-500">
    {l('ТЫ ШПИОН', 'YOU ARE THE SPY')}
    {s.category && (
      <span className="ml-2 text-xs font-normal text-teal-300">{s.category}</span>
    )}
  </p>
) : (
```
Так раскрытие шпиона занимает одну строку, как и остальные состояния → высота не
меняется при нажатии. Метку «твоё слово», ветку `Зажми`, FitWord и пилюлю «секретно»
НЕ трогать.

## Acceptance
- `npm run lint` чисто, `npx tsc --noEmit` чисто.
- diff только в `src/app/game/[roomId]/spy/page.tsx`.
- peek-bar снова на всю ширину (`w-full`), заметно ниже по высоте, и при нажатии
  (в т.ч. у шпиона) размер карточки не меняется.
