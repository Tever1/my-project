# TASK-235: Spy — убрать эмодзи категории рядом с темой

## Контекст

Рядом с названием темы/категории Шпиона показывается эмодзи (`categoryIcon`,
напр. 📍 / 🏢). Пользователь хочет убрать эти эмодзи. Убираем ТОЛЬКО отображение
`{...categoryIcon}` в JSX. Поле `categoryIcon` в state/данных НЕ трогать
(оно из game-data, вне whitelist, на UI больше не влияет).

## Whitelist

- `src/app/game/[roomId]/spy/page.tsx`
- `src/app/tv/[roomId]/[gameType]/page.tsx`

ЗАПРЕЩЕНО: всё остальное (включая `src/lib/game-data.ts`, типы/стейт categoryIcon).
**Минимальный diff: не переформатировать нетронутые строки.**

## Правки в `spy/page.tsx` (4 места)

| Строка | Было | Стало |
|--------|------|-------|
| ~875 | `<p className="text-white/55">{l('Категория:', 'Category:')} {s.categoryIcon} {s.category}</p>` | `<p className="text-white/55">{l('Категория:', 'Category:')} {s.category}</p>` |
| ~887 | `<p className="mt-2 text-white/55">{s.categoryIcon} {s.category}</p>` | `<p className="mt-2 text-white/55">{s.category}</p>` |
| ~932 | `<p className="text-sm text-white/70">{s.categoryIcon} {s.category}</p>` | `<p className="text-sm text-white/70">{s.category}</p>` |
| ~1139 | `<p className="mt-2 text-sm text-white/55">{s.categoryIcon} {s.category}</p>` | `<p className="mt-2 text-sm text-white/55">{s.category}</p>` |

## Правки в `tv/[roomId]/[gameType]/page.tsx` (4 места, spy-блок)

| Строка | Было | Стало |
|--------|------|-------|
| ~1159 | `{sp.category && <span>{sp.categoryIcon} {sp.category}</span>}` | `{sp.category && <span>{sp.category}</span>}` |
| ~1210 | `<span className="text-6xl">{sp.categoryIcon}</span>` | удалить эту строку целиком (большой эмодзи над названием категории на экране dealing) |
| ~1289 | `<p className="text-2xl font-bold mt-1">{sp.categoryIcon} {sp.category}</p>` | `<p className="text-2xl font-bold mt-1">{sp.category}</p>` |
| ~1364 | `<p className="text-white/60 text-lg">{sp.categoryIcon} Категория · {sp.category}</p>` | `<p className="text-white/60 text-lg">Категория · {sp.category}</p>` |

Номера строк ориентировочные — искать по `categoryIcon` в JSX. НЕ трогать
объявления типа/стейта/инициализации/присваивания `categoryIcon` (строки где
`categoryIcon:` — это данные, оставить).

## Acceptance

- `npm run lint` без новых ошибок, `npx tsc --noEmit` чисто.
- В UI Шпиона (mobile + TV) рядом с названием темы нет эмодзи; само название темы
  и слово отображаются.
- Поле `categoryIcon` в state осталось (только рендер убран).

## Отчёт

`codex-reports/235-spy-remove-category-emoji.md`. Не коммитить.
