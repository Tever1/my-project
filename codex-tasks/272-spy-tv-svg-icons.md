# TASK-272 — Шпион TV (игровое поле): плоские SVG-иконки вместо PNG

## Цель

На TV-экране Шпион использует локальный компонент `SpyImg` (PNG). Перевести его
на общий SVG-`SpyIcon` (TASK-270), цвет бирюзовый (`#5eead4`) — тёмный фон
игрового поля. API не меняем, все вызовы `<SpyImg name=... className=... />`
остаются. PNG не удаляем.

Используемые на TV имена: `mask, check, cross, palette` — все есть в `SpyIcon`.

## Whitelist файлов

- `src/app/tv/[roomId]/[gameType]/page.tsx` — импорт + тело `SpyImg`
- `codex-reports/272-spy-tv-svg-icons.md` — **отчёт (писать СЮДА разрешено)**

**НЕ трогать:** мобильный Шпион, design-tokens, `public/icons/**`, другие игры,
socket, server.mts, package.json. Эмодзи ⏱ (таймер голосования) НЕ трогать —
оно не из набора иконок.

---

## Изменение

1. Добавить импорт (рядом с другими импортами вверху файла):

```tsx
import { SpyIcon, type SpyIconName } from '@/components/games/SpyIcon';
```

2. Заменить тело локальной функции `SpyImg` (≈ строки 62–65):

Было:
```tsx
function SpyImg({ name, className }: { name: string; className?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={`/icons/spy/${name}.png`} alt="" aria-hidden className={className} />;
}
```

Стало:
```tsx
function SpyImg({ name, className }: { name: string; className?: string }) {
  return <SpyIcon name={name as SpyIconName} className={className} style={{ color: '#5eead4' }} />;
}
```

> Цвет форсим бирюзовым (тёмный фон TV). `SpyIcon` сам рисует SVG для line-иконок
> и CSS-маску для `mask`. Все существующие вызовы `SpyImg` продолжают работать —
> сигнатура (`name`, `className`) не изменилась.

---

## Acceptance

- `npx tsc --noEmit` / `npm run lint` — без новых ошибок.
- grep: в TV-файле в функции `SpyImg` больше нет `/icons/spy/` и нет `<img`.
- На игровом поле (TV) Шпиона иконки (mask в шапке/modeSelect/dealing, check у
  готовых игроков, palette в draw, cross) рендерятся как бирюзовые SVG.
- Мобильный Шпион, design-tokens, PNG — не тронуты.
- НЕ коммитить. Отчёт → `codex-reports/272-spy-tv-svg-icons.md`.
