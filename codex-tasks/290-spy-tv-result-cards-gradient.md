# TASK-290 — Шпион TV: карточки результата раунда на градиент (как на телефоне)

## Контекст
На игровом поле (TV) Шпиона экран результата раунда (`phase === 'roundResult'`)
показывает две карточки — «Шпионом был(а)» и «Загаданное слово» — на матовом
стекле (`glass-card`). На мобильном экране те же две карточки используют
бирюзовый градиент `spy-card` (см. `.glass-card.spy-card` в `src/app/globals.css`).
Нужно, чтобы TV выглядел так же, как телефон: обе карточки — `spy-card`.

## Что сделать
В файле `src/app/tv/[roomId]/[gameType]/page.tsx`, в блоке Spy roundResult
(около строк 1380 и 1394), у двух карточек заменить className:

- `className="glass-card flex-1 flex flex-col items-center justify-center gap-4 p-8"`
  → `className="glass-card spy-card flex-1 flex flex-col items-center justify-center gap-4 p-8"`

Обе карточки (и «Шпионом был(а)», и «Загаданное слово») получают `spy-card`.

НИЧЕГО больше не трогать: баннер «Шпион победил! / Мирные вычислили шпиона»
(`bg-red-500/20` / `bg-green-500/20`) оставить как есть, текст/структуру/иконки
не менять. Только добавить класс `spy-card` к двум div'ам.

## Whitelist (только эти файлы)
- `src/app/tv/[roomId]/[gameType]/page.tsx`
- `codex-reports/**` (отчёт)

НЕ трогать: `CLAUDE.md`, `AGENTS.md`, `.codex/**`, `codex-tasks/**`, `globals.css`,
мобильный `spy/page.tsx`.

## Acceptance
- Две карточки результата раунда Spy на TV имеют класс `spy-card`.
- `npx tsc --noEmit` — без новых ошибок.
- `npm run lint` — без новых ошибок.
- Отчёт в `codex-reports/290-spy-tv-result-cards-gradient.md`. Не коммитить.
