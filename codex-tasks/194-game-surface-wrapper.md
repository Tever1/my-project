# TASK-194: Вынести фон + isolate в общий компонент GameSurface

## Зачем
Баг TASK-190: фон (`-z-10` img) прятался за непрозрачным `bg-gradient-main`, потому что
у родителя не было `isolate`. На TV `isolate` был, в GameLayout — нет. Чтобы баг не
повторялся в других играх, связываем `isolate` + фоновый `<img>` в один компонент —
использовать их порознь станет невозможно.

## Файлы (whitelist)
- `src/components/games/GameSurface.tsx` (НОВЫЙ)
- `src/components/games/GameLayout.tsx`
- `src/app/tv/[roomId]/[gameType]/page.tsx`

---

## 1. Создать `src/components/games/GameSurface.tsx`

```tsx
'use client';

import { ReactNode } from 'react';

interface GameSurfaceProps {
  /** Optional background image URL, rendered behind content with correct stacking. */
  backgroundUrl?: string;
  /** Extra classes for the root element (layout, sizing, bg-gradient-main, etc.). */
  className?: string;
  children: ReactNode;
}

/**
 * Root surface for game screens. Bundles the background <img> together with
 * `isolate` so the negative-z-index image always paints ABOVE the opaque
 * `bg-gradient-main` parent background. Using `isolate` and the <img> separately
 * caused the special-quiz background to render behind the gradient (TASK-190).
 * Always use this wrapper for any game screen that may show a background.
 */
export function GameSurface({ backgroundUrl, className = '', children }: GameSurfaceProps) {
  return (
    <div
      className={`relative isolate ${backgroundUrl ? '[text-shadow:_0_2px_8px_rgb(0_0_0_/_80%)]' : ''} ${className}`}
    >
      {backgroundUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={backgroundUrl}
          alt=""
          fetchPriority="high"
          className="absolute inset-0 w-full h-full object-cover -z-10"
          aria-hidden="true"
        />
      )}
      {children}
    </div>
  );
}
```

---

## 2. Рефактор `src/components/games/GameLayout.tsx`

Добавь импорт (рядом с другими импортами вверху файла):
```tsx
import { GameSurface } from './GameSurface';
```

Найди начало return (около строк 43-57):
```tsx
  return (
    <div
      className={`bg-gradient-main min-h-[100dvh] text-white flex flex-col relative isolate ${backgroundUrl ? '[text-shadow:_0_2px_8px_rgb(0_0_0_/_80%)]' : ''}`}
    >
      {backgroundUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={backgroundUrl}
          alt=""
          fetchPriority="high"
          className="absolute inset-0 w-full h-full object-cover -z-10"
          aria-hidden="true"
        />
      )}
      {/* Header */}
```

Замени на:
```tsx
  return (
    <GameSurface backgroundUrl={backgroundUrl} className="bg-gradient-main min-h-[100dvh] text-white flex flex-col">
      {/* Header */}
```

Затем найди ЗАКРЫВАЮЩИЙ тег корневого div — это `</div>`, за которым идёт `  );` и `}`
в самом конце компонента (около строки 187):
```tsx
          </div>
        </div>
      )}
    </div>
  );
}
```
Замени ТОЛЬКО последний `</div>` (тот что прямо перед `  );`) на `</GameSurface>`:
```tsx
          </div>
        </div>
      )}
    </GameSurface>
  );
}
```

---

## 3. Рефактор `src/app/tv/[roomId]/[gameType]/page.tsx` (только quiz-блок)

Добавь импорт GameSurface (рядом с другими импортами вверху файла):
```tsx
import { GameSurface } from '@/components/games/GameSurface';
```

Найди начало quiz-return (около строк 510-524):
```tsx
    return (
      <div
        className={`h-screen bg-gradient-main text-white flex flex-col overflow-hidden relative isolate ${backgroundUrl ? '[text-shadow:_0_2px_8px_rgb(0_0_0_/_80%)]' : ''}`}
      >
        {backgroundUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={backgroundUrl}
            alt=""
            fetchPriority="high"
            className="absolute inset-0 w-full h-full object-cover -z-10"
            aria-hidden="true"
          />
        )}
        {/* Top bar */}
```

Замени на:
```tsx
    return (
      <GameSurface backgroundUrl={backgroundUrl} className="h-screen bg-gradient-main text-white flex flex-col overflow-hidden">
        {/* Top bar */}
```

Затем найди ЗАКРЫВАЮЩИЙ тег корневого div этого quiz-блока (около строк 785-788).
Это место где идёт `</div>` `</div>` `);` `}` прямо перед комментарием
`// ===================== 100 к 1 TV RENDER =====================`:
```tsx
        </div>
      </div>
    );
  }

  // ===================== 100 к 1 TV RENDER =====================
```
Замени ВТОРОЙ `</div>` (тот что прямо перед `    );`) на `</GameSurface>`:
```tsx
        </div>
      </GameSurface>
    );
  }

  // ===================== 100 к 1 TV RENDER =====================
```

ВАЖНО: трогаем ТОЛЬКО quiz-блок (return на ~510). Остальные игровые блоки в TV
(мафия, крокодил, 100к1 и т.д.) НЕ трогаем — у них нет фона.

---

## Не трогать
- Другие игровые блоки TV, логику, сокеты
- CLAUDE.md, AGENTS.md, codex-tasks/

## Acceptance criteria
- `npm run lint` — чистый
- `npm run build`/`tsc` без новых ошибок (если build падает на sandbox — ок, главное tsc)
- GameLayout и quiz-TV используют `<GameSurface>`, прямых `<img ... -z-10>` + `isolate` в них больше нет
- Визуально ничего не меняется: фон, text-shadow, layout идентичны прежним

## Отчёт
Сохрани в `codex-reports/194-game-surface-wrapper.md`
