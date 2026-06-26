# TASK-294 — Крокодил: слово в одну строку (без разрыва внутри), фраза — по словам

## Контекст
Сейчас слово в карточке объясняющего масштабируется до ВЫСОТЫ и ломается посреди
слова («Све/тоф/ор»). Причина — `overflowWrap: 'anywhere'` в `FitText`, который
разрешает перенос внутри слова.

Нужно:
- Одно слово — одна строка во всю ширину поля (НИКОГДА не рвать слово посередине;
  шрифт уменьшается, пока слово целиком влезает по ширине в одну строку).
- Если загадана фраза из нескольких слов — переносить по словам: каждое слово на
  своей строке.

`FitText` используется ТОЛЬКО в крокодиле (`src/app/game/[roomId]/crocodile/page.tsx`),
поэтому правка компонента безопасна.

## Что сделать

### 1) `src/components/games/FitText.tsx`
У `<p>` заменить inline-style. Сейчас:
```
        style={{ fontSize, overflowWrap: 'anywhere', ...style }}
```
на:
```
        style={{ fontSize, overflowWrap: 'normal', wordBreak: 'normal', whiteSpace: 'pre-line', ...style }}
```
Это: (а) запрещает перенос ВНУТРИ слова; (б) `whiteSpace: 'pre-line'` заставляет
явные `\n` в тексте давать перенос строки. Больше в файле ничего не менять.

### 2) `src/app/game/[roomId]/crocodile/page.tsx` (explainer-карточка, ~стр. 563)
В `<FitText>` у prop `text` заменить пробелы на переносы строк, чтобы каждое слово
шло на своей строке. Сейчас:
```
                    text={locale === 'ru' ? currentWord.ru : currentWord.en}
```
на:
```
                    text={(locale === 'ru' ? currentWord.ru : currentWord.en).replace(/\s+/g, '\n')}
```
Остальные props (`max={128}`, `min={22}`, className, style) и обёртку
(`relative` / `absolute inset-0 ...` из TASK-293) НЕ трогать.

## Whitelist (только эти файлы)
- `src/components/games/FitText.tsx`
- `src/app/game/[roomId]/crocodile/page.tsx`
- `codex-reports/**` (отчёт)

НЕ трогать: `CLAUDE.md`, `AGENTS.md`, `.codex/**`, `codex-tasks/**`, globals.css,
TV-файл, мобильные экраны других игр.

## Acceptance
- Одно слово («Светофор») — одна строка во всю ширину, без разрыва посередине.
- Фраза из двух слов — каждое слово на отдельной строке, по центру.
- `npx tsc --noEmit` — без новых ошибок.
- `npm run lint` — без новых ошибок.
- Отчёт в `codex-reports/294-croc-word-no-midbreak-perword-lines.md`. Не коммитить.
