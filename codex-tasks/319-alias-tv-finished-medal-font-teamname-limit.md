# TASK-319: Alias TV finished — убрать медаль, -20% шрифт, лимит имени 9 симв.

## Контекст

На TV-экране ("игровое поле") Alias, экран "Игра окончена!", у имени
команды всё ещё стоит медаль-иконка — на мобильном её убрали в TASK-316,
но TV не трогали. Юзер прислал скриншот: длинное имя команды наезжает на
счёт. Просьба: убрать медаль, уменьшить шрифт имени/счёта на 20%,
ограничить длину имени команды до 9 символов (было 10).

## Whitelist файлов (СТРОГО, ничего другого не трогать)

- `src/app/tv/[roomId]/[gameType]/page.tsx`
- `src/app/game/[roomId]/alias/page.tsx`

## Изменения

### 1. `src/app/tv/[roomId]/[gameType]/page.tsx` (~строки 1959-1981, блок `aliasState.phase === 'finished'`)

Текущий фрагмент:
```tsx
<div
  key={team.id}
  className={`glass-card px-8 py-4 flex items-center justify-between ${
    idx === 0 ? 'outline outline-2 outline-amber-400 bg-amber-500/10' : ''
  }`}
>
  <div className="flex items-center gap-3">
    <AliasIcon name="medal" className="h-8 w-8" />
    <span className="text-2xl font-bold">{team.name}</span>
  </div>
  <span className="text-3xl font-bold text-amber-400">{team.score}</span>
</div>
```

Заменить на:
```tsx
<div
  key={team.id}
  className={`glass-card px-8 py-4 flex items-center justify-between gap-3 ${
    idx === 0 ? 'outline outline-2 outline-amber-400 bg-amber-500/10' : ''
  }`}
>
  <span className="min-w-0 truncate text-xl font-bold">{team.name}</span>
  <span className="shrink-0 text-2xl font-bold text-amber-400">{team.score}</span>
</div>
```

Изменения: убрана иконка `<AliasIcon name="medal">` и обёртка
`flex items-center gap-3` вокруг неё; `text-2xl` → `text-xl` (имя, ~-20%),
`text-3xl` → `text-2xl` (счёт, ~-20%); добавлены `min-w-0 truncate` на имя
и `shrink-0` на счёт (защита от переполнения при длинных именах), `gap-3`
перенесён на родительский flex-контейнер.

**Не трогать** остальные секции TV-файла (crocodile finished с медалями
на строке ~1642 — это ДРУГАЯ игра, не Alias, не трогать).

### 2. `src/app/game/[roomId]/alias/page.tsx` (строка ~102, компонент `TeamNameInput`)

Текущее:
```tsx
maxLength={10}
```

Заменить на:
```tsx
maxLength={9}
```

Это единственная правка в этом файле.

## Acceptance

- `npx tsc --noEmit` — чисто.
- `npm run lint` — чисто.
- `git diff --stat` показывает изменения ТОЛЬКО в 2 файлах из whitelist.
- Медаль-иконка убрана из TV finished-экрана Alias (не Crocodile).
- Имя команды и счёт в TV finished — уменьшенный шрифт, имя обрезается
  (`truncate`) вместо наезда на счёт.
- Максимальная длина имени команды при вводе — 9 символов.

Не коммитить. Отчёт в `codex-reports/319-alias-tv-finished-medal-font-teamname-limit.md`.
