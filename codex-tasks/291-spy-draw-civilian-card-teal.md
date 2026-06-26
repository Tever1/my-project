# TASK-291 — Шпион (мобильный): карточка слова в режиме «Нарисуй» — бирюзовая, как в «Угадай»

## Контекст
В мобильном Шпионе на экране раздачи (`phase === 'dealing'`) у мирного жителя
карточка со словом отличается фоном между режимами:
- Режим «Нарисуй» (draw): карточка `spy-card-purple` (фиолетовый) — стр. ~1028.
- Режим «Угадай» (guess): карточка `spy-card` (бирюзовый) — стр. ~1053.

Фон не должен отличаться между режимами. Привести draw-карточку к бирюзовому,
как в guess.

## Что сделать
Файл `src/app/game/[roomId]/spy/page.tsx`, блок draw-режима для НЕ-шпиона
(около стр. 1028–1037):

1. `<GlassCard className="spy-card-purple p-6 text-center space-y-4">`
   → `<GlassCard className="spy-card p-6 text-center space-y-4">`
2. Подпись «слово для рисования» (около стр. 1030):
   `className="text-xs font-bold uppercase tracking-widest text-purple-200/70"`
   → `... text-teal-200/70` (заменить только `text-purple-200/70` на `text-teal-200/70`).

Остальное в карточке (текст, FitWord, разделитель, описание) НЕ менять.
Карточку ШПИОНА в draw (`spy-card-red`, стр. ~1013) НЕ трогать.

## Whitelist (только эти файлы)
- `src/app/game/[roomId]/spy/page.tsx`
- `codex-reports/**` (отчёт)

НЕ трогать: `CLAUDE.md`, `AGENTS.md`, `.codex/**`, `codex-tasks/**`, `globals.css`, TV-файл.

## Acceptance
- Карточка слова draw-режима для мирного жителя использует `spy-card` и `text-teal-200/70`.
- `npx tsc --noEmit` — без новых ошибок.
- `npm run lint` — без новых ошибок.
- Отчёт в `codex-reports/291-spy-draw-civilian-card-teal.md`. Не коммитить.
