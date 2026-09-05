# TASK-195: Перевести все TV-блоки игр на GameSurface

## Зачем
quiz-блок TV уже использует `<GameSurface>` (TASK-194). Для единообразия и чтобы
добавление фона в Фазе I (per-game theming) было тривиальным — переводим остальные
6 TV-блоков на `GameSurface`. У них пока нет фона, поэтому `backgroundUrl` не передаём
(GameSurface отрендерит `relative isolate` + `bg-gradient-main`, без картинки).
Проверено: в TV-файле нет отрицательных/высоких z-index — `isolate` ничего не ломает.

## Файл (whitelist)
- `src/app/tv/[roomId]/[gameType]/page.tsx`

`GameSurface` уже импортирован в этом файле (от TASK-194). Новый импорт НЕ нужен.

---

## Что делать

У всех 6 блоков корневой div одинаковый:
`<div className="h-screen bg-gradient-main text-white flex flex-col overflow-hidden">`

Нужно:
1. Заменить открывающий `<div className="h-screen bg-gradient-main text-white flex flex-col overflow-hidden">`
   на `<GameSurface className="h-screen bg-gradient-main text-white flex flex-col overflow-hidden">`
2. Заменить соответствующий закрывающий `</div>` на `</GameSurface>`.

ВНИМАНИЕ: className открывающего тега идентичен у 5 блоков (отступ 6 пробелов) и
у generic-блока (отступ 4 пробела). Закрывающие теги привязаны к комментариям-заголовкам
следующих блоков для однозначности.

---

### Блок 1 — 100 к 1 (hundred-to-one)

Открытие (отступ 6 пробелов) — это первое вхождение после `if (gameType === 'hundred-to-one') {`:
найди и замени:
```tsx
      <div className="h-screen bg-gradient-main text-white flex flex-col overflow-hidden">
```
→
```tsx
      <GameSurface className="h-screen bg-gradient-main text-white flex flex-col overflow-hidden">
```
(если таких строк несколько — это разные блоки; делай по очереди ниже, каждый со своим
закрывающим тегом по якорю)

Закрытие — найди:
```tsx
      </div>
    );
  }

  // ===================== SPY TV RENDER =====================
```
→
```tsx
      </GameSurface>
    );
  }

  // ===================== SPY TV RENDER =====================
```

### Блок 2 — Spy

Закрытие — найди:
```tsx
      </div>
    );
  }

  // ===================== CROCODILE TV RENDER =====================
```
→
```tsx
      </GameSurface>
    );
  }

  // ===================== CROCODILE TV RENDER =====================
```

### Блок 3 — Crocodile

Закрытие — найди:
```tsx
      </div>
    );
  }

  // ===================== ALIAS TV RENDER =====================
```
→
```tsx
      </GameSurface>
    );
  }

  // ===================== ALIAS TV RENDER =====================
```

### Блок 4 — Alias

Закрытие — найди:
```tsx
      </div>
    );
  }

  // ===================== MAFIA TV RENDER =====================
```
→
```tsx
      </GameSurface>
    );
  }

  // ===================== MAFIA TV RENDER =====================
```

### Блок 5 — Mafia

Закрытие — найди:
```tsx
      </div>
    );
  }

  // ===================== GENERIC TV RENDER =====================
```
→
```tsx
      </GameSurface>
    );
  }

  // ===================== GENERIC TV RENDER =====================
```

### Блок 6 — Generic (последний return компонента)

Открытие (отступ 4 пробела):
```tsx
  return (
    <div className="h-screen bg-gradient-main text-white flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-8 py-4 bg-black/20 backdrop-blur-sm border-b border-white/10 flex-shrink-0">
```
→
```tsx
  return (
    <GameSurface className="h-screen bg-gradient-main text-white flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-8 py-4 bg-black/20 backdrop-blur-sm border-b border-white/10 flex-shrink-0">
```

Закрытие — самый конец компонента (отступ 4 пробела `</div>` перед `  );` `}`):
```tsx
        </div>
      </div>
    </div>
  );
}
```
Замени ПОСЛЕДНИЙ `    </div>` (4 пробела, прямо перед `  );`) на `    </GameSurface>`:
```tsx
        </div>
      </div>
    </GameSurface>
  );
}
```

---

## ВАЖНО про открывающие теги 5 одинаковых блоков
Открывающий `      <div className="h-screen bg-gradient-main text-white flex flex-col overflow-hidden">`
(6 пробелов) встречается 5 раз (100к1, spy, crocodile, alias, mafia). Замени ВСЕ 5 на
`      <GameSurface className="h-screen bg-gradient-main text-white flex flex-col overflow-hidden">`.
Каждый закрывается своим `</div>→</GameSurface>` по якорям выше. Quiz-блок уже на
GameSurface — его не трогаем.

## Проверка баланса
После правок ОБЯЗАТЕЛЬНО `npx tsc --noEmit` — должен быть чистым (это докажет, что все
теги сбалансированы). Если tsc ругается на JSX — значит закрывающий тег попал не туда,
исправь.

## Не трогать
- quiz-блок (уже GameSurface), логику, контент игр
- CLAUDE.md, AGENTS.md, codex-tasks/

## Acceptance criteria
- `npm run lint` чистый
- `npx tsc --noEmit` чистый
- Все 7 TV-блоков (включая quiz) используют `<GameSurface>`, нет `<div className="h-screen bg-gradient-main..."`
- Контент игр визуально не изменился

## Отчёт
Сохрани в `codex-reports/195-tv-all-blocks-gamesurface.md`
