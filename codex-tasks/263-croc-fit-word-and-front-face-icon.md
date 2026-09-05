# TASK-263 — Крокодил: (1) слово влезает в карточку (fit-to-card), (2) новая иконка крокодила (морда анфас)

## Контекст

Два независимых фикса по моб-Крокодилу (`game/[roomId]/crocodile/page.tsx`):

1. **Слово вылезает за карточку.** Сейчас слово рендерится с
   `text-[clamp(3rem,15vw,4.25rem)]` — размер зависит только от ширины вьюпорта,
   не от длины слова. Длинные слова («Стиральная машина») вылезают за края
   красной карточки. Нужно ужимать шрифт так, чтобы слово влезало в карточку
   по **ширине И высоте** (с переносом).
2. **Иконка `croc` плохая** — не похожа на крокодила. Заменить на фронтальную
   морду крокодила (line-стиль, как остальные иконки).

## Whitelist файлов

- `src/components/games/FitText.tsx` — **создать** (общий fit-to-box компонент)
- `src/components/games/CrocIcon.tsx` — перерисовать `croc` + поддержать per-icon viewBox
- `src/app/game/[roomId]/crocodile/page.tsx` — применить `FitText` к слову
- `codex-reports/263-croc-fit-word-and-front-face-icon.md` — **отчёт (писать СЮДА разрешено)**

**НЕ трогать:** `public/icons/**`, `design-tokens/page.tsx`, TV-файл, другие игры,
socket-логику, server.mts.

---

## Шаг 1 — создать `src/components/games/FitText.tsx`

Компонент ужимает шрифт текста, пока он не влезет в контейнер по ширине И высоте.
Контейнер занимает всю доступную область (`h-full w-full`), родитель должен дать
ему высоту (см. шаг 3). Перенос разрешён, очень длинные слова ломаются
(`overflowWrap: 'anywhere'`).

```tsx
'use client';

import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react';

export function FitText({
  text,
  max,
  min = 18,
  className = '',
  style,
}: {
  text: string;
  max: number;
  min?: number;
  className?: string;
  style?: CSSProperties;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLParagraphElement>(null);
  const [fontSize, setFontSize] = useState(max);

  useLayoutEffect(() => {
    const container = containerRef.current;
    const el = textRef.current;
    if (!container || !el) return;

    let size = max;
    el.style.fontSize = `${size}px`;
    const fits = () =>
      el.scrollWidth <= container.clientWidth &&
      el.scrollHeight <= container.clientHeight;

    while (size > min && !fits()) {
      size -= 1;
      el.style.fontSize = `${size}px`;
    }

    const frame = requestAnimationFrame(() => setFontSize(size));
    return () => cancelAnimationFrame(frame);
  }, [text, max, min]);

  return (
    <div
      ref={containerRef}
      className="flex h-full w-full items-center justify-center overflow-hidden"
    >
      <p
        ref={textRef}
        className={className}
        style={{ fontSize, overflowWrap: 'anywhere', ...style }}
      >
        {text}
      </p>
    </div>
  );
}
```

---

## Шаг 2 — `src/components/games/CrocIcon.tsx`: новый `croc` + per-icon viewBox

Сейчас компонент использует единый `viewBox="0 0 20 20"`. Новая морда крокодила
рисуется в `viewBox="0 0 24 24"`, поэтому **храним renderer'ы как объект
`{ viewBox, content }`** и подставляем нужный viewBox.

Переписать файл так (5 функциональных и medal — те же пути, что были, просто в
новой структуре; меняется только `croc`):

```tsx
import type { CSSProperties, ReactNode } from 'react';

export type CrocIconName =
  | 'croc'
  | 'mic'
  | 'talk'
  | 'trophy'
  | 'crown'
  | 'check'
  | 'medal';

const RENDERERS: Record<CrocIconName, { viewBox: string; content: ReactNode }> = {
  mic: {
    viewBox: '0 0 20 20',
    content: (
      <>
        <rect x="7" y="2" width="6" height="10" rx="3" stroke="currentColor" strokeWidth="1.8" />
        <path d="M4 9a6 6 0 0012 0M10 15v3M7 18h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </>
    ),
  },
  trophy: {
    viewBox: '0 0 20 20',
    content: (
      <>
        <path d="M5 3h10v4a5 5 0 01-10 0V3z" stroke="currentColor" strokeWidth="1.8" />
        <path d="M5 4H3v2a2 2 0 002 2M15 4h2v2a2 2 0 01-2 2M10 12v3M7 17h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </>
    ),
  },
  crown: {
    viewBox: '0 0 20 20',
    content: (
      <path d="M3 7l3 3 4-6 4 6 3-3-1.5 9h-11L3 7z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
    ),
  },
  talk: {
    viewBox: '0 0 20 20',
    content: (
      <>
        <path d="M3 5h10v7H7l-4 3V5z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
        <path d="M15 8c1.5.5 2 2 0 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </>
    ),
  },
  check: {
    viewBox: '0 0 20 20',
    content: (
      <path d="M4 10.5l4 4 8-9" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    ),
  },
  medal: {
    viewBox: '0 0 20 20',
    content: (
      <>
        <path d="M7 2l2 5M13 2l-2 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        <circle cx="10" cy="13" r="5" stroke="currentColor" strokeWidth="1.6" />
        <path d="M10 10.4l.9 1.9 2 .2-1.5 1.4.5 2-1.9-1.1-1.9 1.1.5-2L7.1 12.5l2-.2z" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round" />
      </>
    ),
  },
  // НОВАЯ: фронтальная морда крокодила (анфас) — голова, 2 глаза сверху,
  // гребни-ноздри, рот-дуга с зубами.
  croc: {
    viewBox: '0 0 24 24',
    content: (
      <>
        {/* голова (контур) */}
        <path
          d="M12 3C9 3 7.2 3.8 6 5.6 4.6 7.6 4 10.2 4 12.6 4 16.8 7.6 21 12 21s8-4.2 8-8.4c0-2.4-.6-5-2-7C16.8 3.8 15 3 12 3Z"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
        {/* глаза */}
        <ellipse cx="9" cy="8" rx="1.05" ry="1.7" fill="currentColor" />
        <ellipse cx="15" cy="8" rx="1.05" ry="1.7" fill="currentColor" />
        {/* гребни / ноздри */}
        <path d="M9.3 12h5.4M8.8 14h6.4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        {/* рот */}
        <path d="M7 16.4c2.6 2.3 7.4 2.3 10 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        {/* зубы */}
        <path d="M9 17.5l.7 1.2.7-1.2M13.6 17.5l.7 1.2.7-1.2" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
      </>
    ),
  },
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
  const { viewBox, content } = RENDERERS[name];
  return (
    <svg
      viewBox={viewBox}
      fill="none"
      aria-hidden
      className={className}
      style={{ color: '#f5efe6', ...style }}
    >
      {content}
    </svg>
  );
}
```

---

## Шаг 3 — применить `FitText` к слову в моб-Крокодиле

Файл `src/app/game/[roomId]/crocodile/page.tsx`.

1. Добавить импорт `import { FitText } from '@/components/games/FitText';`.
2. Блок слова (≈ строки 560–570). Сейчас:

```tsx
<div className="flex flex-1 items-center justify-center py-8">
  <p
    className="text-center text-[clamp(3rem,15vw,4.25rem)] font-black leading-[0.95]"
    style={{
      letterSpacing: '-1.5px',
      textShadow: '0 3px 16px rgba(0,0,0,.35)',
    }}
  >
    {locale === 'ru' ? currentWord.ru : currentWord.en}
  </p>
</div>
```

Заменить на (контейнер даёт высоту через `flex-1 min-h-0`, FitText заполняет её):

```tsx
<div className="flex-1 min-h-0 py-8">
  <FitText
    text={locale === 'ru' ? currentWord.ru : currentWord.en}
    max={68}
    min={22}
    className="text-center font-black leading-[0.95]"
    style={{
      letterSpacing: '-1.5px',
      textShadow: '0 3px 16px rgba(0,0,0,.35)',
    }}
  />
</div>
```

> `max={68}` ≈ прежний потолок 4.25rem, `min={22}` — нижняя граница для очень
> длинных слов. Перенос на 2 строки работает; если и так не лезет — шрифт
> уменьшается до min.

---

## Acceptance

- `npx tsc --noEmit` — без новых ошибок.
- `npm run lint` — без новых ошибок.
- Слово любой длины (проверить «Стиральная машина», «Достопримечательность»)
  визуально не вылезает за красную карточку (это юзер проверит в браузере; код —
  fit по width+height с переносом).
- `croc` рендерится новой мордой анфас; остальные иконки не изменены.
- `public/icons/crocodile/*.png` — не тронуты. `design-tokens` — не тронут.
- НЕ коммитить. Отчёт → `codex-reports/263-croc-fit-word-and-front-face-icon.md`.
