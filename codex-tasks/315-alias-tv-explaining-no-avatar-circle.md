# TASK-315: Alias TV "Объясняет" — убрать аватар-кружок, оставить только имя

## Контекст

На TV-экране Alias в фазе `explaining` (игровое поле) рядом с подписью
"Объясняет" стоит `<PlayerAvatar>` (цветной кружок с первой буквой/цифрой
ника) и сразу справа — крупным шрифтом полное имя игрока. У тестового игрока
с ником `"2"` это выглядит как одно и то же значение, написанное дважды
(кружок "2" + текст "2"). Юзер попросил оставить только один вариант —
крупное имя текстом (правый элемент), убрать аватар-кружок слева.

**Важно: правка только для этого одного блока.** `PlayerAvatar` — общий
компонент, используется по всему TV (crocodile explainer и т.д.) и в лобби —
их не трогать, юзер явно ограничил скоуп этим экраном.

## Файл (whitelist — только один)

- `src/app/tv/[roomId]/[gameType]/page.tsx`

Конкретно блок "Explainer + letter" в фазе `explaining` Alias TV, строки
~1857–1873:

```tsx
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
  ...
</div>
```

## Что сделать

- Убрать `<PlayerAvatar nickname={explainerName} sizePx={88} ring="#ec4899" />`
  из этого блока.
- Оставить только `<p>` с крупным именем `explainerName`.
- Поправить обёртку (`<div className="flex min-w-0 items-center gap-6">`) —
  раз там теперь один элемент, `flex`/`gap-6` можно убрать или оставить, на
  усмотрение, главное чтобы не осталось лишнего пустого отступа слева от имени.
- Не трогать остальной JSX этого блока (таймер слева, буква режима letter,
  scoreboard ниже) и не трогать `PlayerAvatar` в других местах файла
  (crocodile explainer ~1576, любые другие игры).
- Не трогать сам компонент `src/components/ui/PlayerAvatar.tsx`.

## Запрещено трогать

- `src/components/ui/PlayerAvatar.tsx` и любые другие использования
  `<PlayerAvatar>` в `tv/[roomId]/[gameType]/page.tsx` (например crocodile).
- Мобильный экран Alias (`src/app/game/[roomId]/alias/page.tsx`).
- `CLAUDE.md`, `AGENTS.md`, `.codex/**`, `codex-tasks/**` (кроме этого файла).

## Acceptance

- `npx tsc --noEmit` чисто.
- `npm run lint` чисто.
- На TV-экране Alias в фазе "Объясняет" виден только текст с именем игрока,
  без кружка-аватара слева от него.
- Остальные использования `PlayerAvatar` в файле (crocodile и др.) не задеты —
  проверь diff scope перед коммитом отчёта.

Отчёт — `codex-reports/315-alias-tv-explaining-no-avatar-circle.md`. Не коммитить.
