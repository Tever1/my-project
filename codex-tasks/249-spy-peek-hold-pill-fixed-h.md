# TASK-249 — Spy peek-bar: пилюля «ЗАЖМИ», убрать «Зажми» слева, жёстко зафиксировать высоту

## Whitelist (трогать ТОЛЬКО этот файл)
- `src/app/game/[roomId]/spy/page.tsx`

## ЗАПРЕЩЕНО трогать
- `CLAUDE.md`, `AGENTS.md`, `.codex/**`, `codex-tasks/**`, `codex-reports/**`
- серверный код, `globals.css`, любые другие файлы

## Правила
- Минимальный diff, НЕ переформатировать. НЕ запускать `npm run build`.
- Валидация: `npm run lint` + `npx tsc --noEmit`. Двуязычность `l(ru,en)`. codex-reports не трогать.

## Контекст
`renderPeekBar()` (~строки 806-830). Сейчас высота держится `min-h-[22px]` — она floor,
а не фикс, поэтому контент (FitWord/«ТЫ ШПИОН» vs «твоё слово») всё ещё чуть меняет высоту
строки при нажатии. Нужно: жёстко зафиксировать высоту, убрать «Зажми» из левого текста,
а правую пилюлю «секретно» переименовать в «ЗАЖМИ».

## Правка
Заменить блок (строки 806-830):
```tsx
      <div className="flex items-center justify-between gap-3">
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
        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-0.5 text-xs text-white/50">
          {l('секретно', 'secret')}
        </span>
```
на:
```tsx
      <div className="flex h-6 items-center justify-between gap-3">
        <div className="flex h-6 min-w-0 items-center overflow-hidden">
          {peeking ? (
            isSpy ? (
              <p className="truncate text-sm font-black leading-tight text-red-500">
                {l('ТЫ ШПИОН', 'YOU ARE THE SPY')}
                {s.category && (
                  <span className="ml-2 text-xs font-normal text-teal-300">{s.category}</span>
                )}
              </p>
            ) : (
              <FitWord text={s.word} max={16} className="font-bold text-white" />
            )
          ) : (
            <p className="text-xs text-white/40">
              {l('твоё слово', 'your word')}
            </p>
          )}
        </div>
        <span className="flex-shrink-0 rounded-full border border-white/10 bg-white/5 px-3 py-0.5 text-xs text-white/50">
          {l('ЗАЖМИ', 'HOLD')}
        </span>
```

Ключевое:
- внешняя строка и левый блок получили фиксированную высоту `h-6` (24px) → высота не
  зависит от контента, при нажатии не меняется;
- слева в свёрнутом состоянии теперь только «твоё слово» (без «· 👁 Зажми»);
- правая пилюля: «секретно» → «ЗАЖМИ»/«HOLD», добавлен `flex-shrink-0`;
- FitWord `max={18}` → `max={16}` (чтобы помещалось в 24px без переполнения);
- левый блок `min-w-0 overflow-hidden` + `truncate` у текста шпиона — без выталкивания.

`SpyIcon name="eye"` в peek-bar больше не используется — если из-за этого появится
неиспользуемый импорт/линт-ошибка, НЕ трогать импорт (SpyIcon используется в других
местах файла). Проверь, что других предупреждений нет.

## Acceptance
- `npm run lint` чисто, `npx tsc --noEmit` чисто.
- diff только в `src/app/game/[roomId]/spy/page.tsx`.
- Пилюля справа = «ЗАЖМИ». Слева в покое только «твоё слово». Высота карточки при
  нажатии (мирный/шпион) НЕ меняется (фиксированный `h-6`).
