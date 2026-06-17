# REPORT TASK-226: Spy — полный редизайн

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-06-09 20:05
> - **Финиш:** 2026-06-09 21:09
> - **Длительность:** 64 минуты
> - **Статус:** ✅ done

---

## Резюме (TL;DR)

Шпион переведён на новую механику локаций: раздача слова/роли, обсуждение, голосование, итог раунда, очки и финальная таблица. Draw mode удалён из phone и TV, добавлены `spy:ready`, `spy:vote`, `spy:request-state` и новый TV-рендер под дизайн-референсы.

---

## Что сделано

### Изменённые файлы

- `src/lib/game-data.ts` — добавлены `SpyLocation` и `SPY_LOCATIONS` после существующего `SPY_WORDS` (`lines 370-415`).
- `src/app/game/[roomId]/spy/page.tsx` — заменён старый guess/draw flow на state с 5 фазами, локациями, ready/vote action-ами, vote resolver, игровым и voting таймерами, peek bar, roundResult и gameOver UI (`lines 17-785`).
- `src/app/tv/[roomId]/[gameType]/page.tsx` — добавлен `spy:request-state`, расширен `spyState`, удалён canvas-sync, полностью заменён TV Spy render на dealing/playing/voting/roundResult/gameOver (`lines 22-28`, `171-216`, `1080-1356`).

### Новые файлы

- `codex-reports/226-spy-full-redesign.md` — этот отчёт.

### Удалённые файлы

- (нет)

---

## Diff stat

```
src/app/game/[roomId]/spy/page.tsx      | 1031 +++++++++++++++++++------------
src/app/tv/[roomId]/[gameType]/page.tsx |  404 ++++++++----
src/lib/game-data.ts                    |   47 ++
3 files changed, 961 insertions(+), 521 deletions(-)
```

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `npm run lint` | ✅ | ESLint чистый |
| `npx tsc --noEmit` | ✅ | TypeScript чистый |
| `npm run build` | ⚠️ | Turbopack упал в sandbox: `creating new process - binding to a port - Operation not permitted` |
| `npx next build --webpack` | ✅ | Webpack build exit 0; во время prerender `/profile` печатает существующий `ReferenceError: location is not defined` |
| Draw remnants grep | ✅ | В целевых Spy-файлах нет `DrawCanvas`, `DrawStroke`, `spy:stroke`, `spy:clear`, `drawerId`, `spyCanvas` |
| Acceptance #2 | ✅ | `SpyLocation` и `SPY_LOCATIONS` экспортируются |
| Acceptance #3 | ✅ | Phone рендерит `modeSelect`, `dealing`, `playing`, `voting`, `roundResult`, `gameOver` |
| Acceptance #4 | ✅ | TV рендерит `modeSelect`, `dealing`, `playing`, `voting`, `roundResult`, `gameOver` |
| Acceptance #6 | ✅ | Host обрабатывает `spy:ready` и `spy:vote`; TV запрашивает state через `spy:request-state` |

---

## Отклонения от ТЗ

- `npm run build` не прошёл из-за Turbopack sandbox/permission panic, не из-за ошибок кода. Проверочный fallback `npx next build --webpack` прошёл с exit 0.
- В рабочем дереве до старта уже были изменения вне моих файлов: `.codex/STATUS.md`, `codex-tasks/226-spy-full-redesign.md`, `public/design-ref/`. Я их не редактировал.

---

## Открытые вопросы для Claude

нет

---

## Что НЕ сделано (если статус ⚠️ или ❌)

Не применимо.

---

## Подсказки для ревью

- Проверь `src/app/game/[roomId]/spy/page.tsx:113` — pure `resolveVoting`, включая scoring: мирные +1 если шпион пойман, шпион +2 если не пойман.
- Проверь `src/app/game/[roomId]/spy/page.tsx:198` — host socket handling для `spy:request-state`, `spy:ready`, `spy:vote`.
- Проверь `src/app/tv/[roomId]/[gameType]/page.tsx:1080` — новый TV Spy render не должен затрагивать блоки других игр ниже.
