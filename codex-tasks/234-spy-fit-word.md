# TASK-234: Spy — авто-ужимающийся шрифт слова (fit-to-width)

## Контекст

На мобильном экране Шпиона длинное слово (напр. «Лаборатория») вылезает за
рамку карточки. Нужно: если слово не влезает по ширине — шрифт уменьшается,
пока не влезет. Размер карточек НЕ менять. Слово показывается крупно в 4 местах
(`s.word`), все подвержены одному багу — чиним везде для консистентности.

Файл: `src/app/game/[roomId]/spy/page.tsx` (только он).

## Whitelist

- `src/app/game/[roomId]/spy/page.tsx`

ЗАПРЕЩЕНО: всё остальное. **Минимальный diff: не переформатировать и не
переупорядочивать нетронутые строки.**

## Что сделать

### 1. Импорт

В импорте из `'react'` добавить `useLayoutEffect` к существующим
(`useCallback, useEffect, useMemo, useRef, useState`).

### 2. Компонент `FitWord` (top-level, рядом с другими функциями вне компонента)

```tsx
function FitWord({ text, className, max, min = 14 }: { text: string; className?: string; max: number; min?: number }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const [fontSize, setFontSize] = useState(max);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    let size = max;
    el.style.fontSize = `${size}px`;
    while (size > min && el.scrollWidth > el.clientWidth) {
      size -= 1;
      el.style.fontSize = `${size}px`;
    }
    setFontSize(size);
  }, [text, max, min]);
  return (
    <p ref={ref} className={className} style={{ fontSize, whiteSpace: 'nowrap', overflow: 'hidden' }}>
      {text}
    </p>
  );
}
```

Идея: `whiteSpace: nowrap` → если контент шире контейнера (`scrollWidth >
clientWidth`), уменьшаем px-шрифт по 1, пока не влезет или не дойдём до `min`.

### 3. Заменить 4 крупных показа `s.word` на `<FitWord>`

ВАЖНО: убрать из className tailwind-класс размера (`text-xl`/`text-4xl`) —
размер задаёт `max`. Остальные классы (font-*, text-white, mt-*) сохранить.

| Строка | Было | Стало |
|--------|------|-------|
| 709 (peek-бар) | `<p className="text-xl font-bold text-white">{s.word}</p>` | `<FitWord text={s.word} max={20} className="font-bold text-white" />` |
| 840 (dealing, draw) | `<h3 className="mt-3 text-4xl font-black text-white">{s.word}</h3>` | `<FitWord text={s.word} max={36} className="mt-3 font-black text-white" />` |
| 866 (dealing, guess) | `<h3 className="mt-2 text-4xl font-black text-white">{s.word}</h3>` | `<FitWord text={s.word} max={36} className="mt-2 font-black text-white" />` |
| 1118 (roundResult) | `<p className="mt-1 text-xl font-black text-white">{s.word}</p>` | `<FitWord text={s.word} max={20} className="mt-1 font-black text-white" />` |

Номера строк ориентировочные — искать по тексту. Это единственные места с
крупным `{s.word}`. Категорию/прочий текст не трогать.

## Acceptance

- `npm run lint` без новых ошибок, `npx tsc --noEmit` чисто.
- Длинное слово (напр. «Лаборатория») ужимается и помещается в карточку на
  экранах выдачи слова, peek-баре и итогах; короткое слово остаётся крупным.
- Размеры карточек не изменились.

## Отчёт

`codex-reports/234-spy-fit-word.md`. Не коммитить.
