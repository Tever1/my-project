# TASK-262 — Крокодил: минималистичные line-SVG иконки вместо кремовых PNG

## Цель

Заменить кремовые **PNG**-иконки Крокодила на минималистичные **line-SVG**
иконки в бежевом цвете (как в матрице на `/design-tokens`). Стиль — тонкая
обводка `currentColor`, бежевый `#f5efe6` по умолчанию.

**PNG НЕ УДАЛЯТЬ.** Файлы `public/icons/crocodile/*.png` остаются на диске
нетронутыми (бэкап/возможный откат). Меняем только то, ЧТО рендерится в UI.

## Whitelist файлов (трогать ТОЛЬКО их)

- `src/components/games/CrocIcon.tsx` — **создать** (новый общий компонент)
- `src/components/games/GameLayout.tsx` — аддитивно расширить проп `icon`
- `src/app/game/[roomId]/crocodile/page.tsx` — заменить локальный `CrocIcon`
- `src/app/tv/[roomId]/[gameType]/page.tsx` — заменить локальный `CrocIcon`
- `codex-reports/262-crocodile-line-svg-icons.md` — **отчёт (писать СЮДА разрешено)**

**НЕ трогать:** `public/icons/**` (PNG оставить как есть), `src/app/design-tokens/page.tsx`
(матрица-превью остаётся), любые другие игры, socket-логику, server.mts.

---

## Шаг 1 — создать `src/components/games/CrocIcon.tsx`

Общий компонент. Рендерит inline-SVG по `name`. `viewBox="0 0 20 20"`,
`fill="none"`, цвет по умолчанию бежевый `#f5efe6` через `style.color`
(обводки используют `currentColor`). `className` пробрасывается на `<svg>`
(сайзинг идёт Tailwind-классами `h-* w-*`). `style` мёрджится поверх
дефолтного цвета — это нужно для тинта медалей. `aria-hidden`.

```tsx
import type { CSSProperties } from 'react';

export type CrocIconName =
  | 'croc'
  | 'mic'
  | 'talk'
  | 'trophy'
  | 'crown'
  | 'check'
  | 'medal';

const RENDERERS: Record<CrocIconName, React.ReactNode> = {
  // Микрофон (1-в-1 из /design-tokens матрицы)
  mic: (
    <>
      <rect x="7" y="2" width="6" height="10" rx="3" stroke="currentColor" strokeWidth="1.8" />
      <path d="M4 9a6 6 0 0012 0M10 15v3M7 18h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </>
  ),
  // Трофей (1-в-1)
  trophy: (
    <>
      <path d="M5 3h10v4a5 5 0 01-10 0V3z" stroke="currentColor" strokeWidth="1.8" />
      <path d="M5 4H3v2a2 2 0 002 2M15 4h2v2a2 2 0 01-2 2M10 12v3M7 17h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </>
  ),
  // Корона (1-в-1)
  crown: (
    <path d="M3 7l3 3 4-6 4 6 3-3-1.5 9h-11L3 7z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
  ),
  // Речь (1-в-1)
  talk: (
    <>
      <path d="M3 5h10v7H7l-4 3V5z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M15 8c1.5.5 2 2 0 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </>
  ),
  // Галочка (1-в-1)
  check: (
    <path d="M4 10.5l4 4 8-9" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
  ),
  // Крокодил (НОВАЯ минимал line-иконка): снаут + бугор-глаз + спина + брюхо + зубцы
  croc: (
    <>
      <path d="M2 11.5h6l1.5-1 1.5 1h6" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" />
      <path d="M3 12.8c3 1 9 1 14 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M12 10.5l1-1.3 1 1.3 1-1.3 1 1.3" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <circle cx="9.5" cy="9.6" r="0.85" fill="currentColor" />
      <path d="M5 11.6v1M7 11.6v1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </>
  ),
  // Медаль (НОВАЯ): лента + диск + звезда. Цвет тинтуется caller'ом через style.color.
  medal: (
    <>
      <path d="M7 2l2 5M13 2l-2 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="10" cy="13" r="5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M10 10.4l.9 1.9 2 .2-1.5 1.4.5 2-1.9-1.1-1.9 1.1.5-2L7.1 12.5l2-.2z" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round" />
    </>
  ),
};

export function CrocIcon({
  name,
  className = '',
  style,
}: {
  name: CrocIconName;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden
      className={className}
      style={{ color: '#f5efe6', ...style }}
    >
      {RENDERERS[name]}
    </svg>
  );
}
```

> Примечание: `React.ReactNode` в типе `RENDERERS` — если линтер ругается на
> отсутствие импорта React-namespace, импортируй `import type { ReactNode } from 'react'`
> и используй `Record<CrocIconName, ReactNode>`.

---

## Шаг 2 — `GameLayout.tsx`: аддитивно разрешить ReactNode в `icon`

Сейчас (≈ строки 14, 52–57):

```tsx
icon?: string;
...
{icon && (icon.startsWith('/') ? (
  // eslint-disable-next-line @next/next/no-img-element
  <img src={icon} alt="" aria-hidden className="h-7 w-7 flex-shrink-0 object-contain" />
) : (
  <span className="text-2xl flex-shrink-0">{icon}</span>
))}
```

Заменить тип на `icon?: string | React.ReactNode;` и логику рендера на:

```tsx
{icon && (typeof icon === 'string' ? (
  icon.startsWith('/') ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={icon} alt="" aria-hidden className="h-7 w-7 flex-shrink-0 object-contain" />
  ) : (
    <span className="text-2xl flex-shrink-0">{icon}</span>
  )
) : (
  <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center">{icon}</span>
))}
```

**Критично:** для строковых значений поведение НЕ меняется (другие 6 игр
передают `icon` строкой — их шапки должны выглядеть идентично).

---

## Шаг 3 — моб `src/app/game/[roomId]/crocodile/page.tsx`

1. Удалить локальный хелпер `CrocIcon` (≈ строки 44–49, тот что рендерит `<img src=.../png>`).
2. Добавить импорт: `import { CrocIcon } from '@/components/games/CrocIcon';`
   (проверь алиас `@/` в проекте; если используется относительный — взять как у соседних импортов в файле).
3. Шапка GameLayout (≈ строка 411): `icon="/icons/crocodile/croc.png"` →
   `icon={<CrocIcon name="croc" className="h-7 w-7" />}`.
4. Все вызовы `<CrocIcon name="mic|croc|talk|trophy" className="..." />` остаются
   как есть по API (name + className) — теперь они резолвятся в SVG. Классы
   сайзинга (`h-14 w-14`, `h-9 w-9`, `h-12 w-12` и т.п.) сохранить.

---

## Шаг 4 — TV `src/app/tv/[roomId]/[gameType]/page.tsx`

1. Удалить локальный хелпер `CrocIcon` (≈ строки 66–71, `<img>`-версия).
2. Добавить импорт `import { CrocIcon } from '@/components/games/CrocIcon';`.
3. Вызовы `croc`, `crown`, `trophy` (строки ~1479/1525/1532/1590/1634) —
   оставить по API, классы сохранить.
4. Медали (строки ~1641–1645): заменить три имени на один `medal` + тинт.
   `medalColors` уже объявлен рядом (`['#ffd60a', '#c7cdd6', '#cd8e54']`,
   ≈ строка 1459). Стало:

```tsx
{idx < 3 ? (
  <CrocIcon
    name="medal"
    className="h-9 w-9"
    style={{ color: medalColors[idx] ?? '#f5efe6' }}
  />
) : (
  <span className="text-3xl">{idx + 1}.</span>
)}
```

---

## Acceptance

- `npx tsc --noEmit` — без новых ошибок.
- `npm run lint` — без новых ошибок (eslint-disable для `<img>` остаётся только
  в GameLayout, где `<img>` ещё используется для строковых icon).
- `public/icons/crocodile/*.png` — **на месте, не удалены, не изменены**.
- `design-tokens/page.tsx` — **не тронут**.
- Шапки остальных 6 игр (`icon` строкой) — рендер не изменился.
- grep: ни в одном из двух page-файлов больше нет `/icons/crocodile/` и нет
  локального `function CrocIcon` (используется импорт из общего компонента).
- НЕ коммитить. Отчёт → `codex-reports/262-crocodile-line-svg-icons.md`.
