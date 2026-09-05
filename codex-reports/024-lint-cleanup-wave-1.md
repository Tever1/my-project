# REPORT TASK-024: Lint cleanup Волна 1

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-05-07 18:45 PDT
> - **Финиш:** 2026-05-07 19:18 PDT
> - **Длительность:** 33 минуты
> - **Статус:** ⚠️ partial

---

## Резюме (TL;DR)

Выполнена чистка Wave 1: добавлены ignores для vendored/mobile, убраны listed unused vars/imports, удалён unused `factCheckSingle`, заменён `any` в admin viewer на структурный тип. `npx tsc --noEmit` и `npm run build` проходят, но `npm run lint` остаётся на 19 problems: все оставшиеся проблемы относятся к запрещённым в этой волне `react-hooks/*` / `Cannot access variable before it is declared`.

---

## Что сделано

### Изменённые файлы

- `eslint.config.mjs` — добавлены `.agents/**` и `mobile/**` в `globalIgnores`.
- `scripts/generate-questions.mjs` — удалён unused параметр `lang` из `buildPrompt`.
- `src/app/admin/page.tsx` — удалены unused `useRef`, `setRefreshKey`/`refreshKey`, `rowSel`; заменён `any` у game data на структурный тип и безопасные fallback-массивы.
- `src/app/api/admin/quiz-item/route.ts` — удалён unused `factCheckSingle`.
- `src/app/game/[roomId]/alias/page.tsx` — автофикс `let updatedTeams` → `const updatedTeams`.
- `src/app/game/[roomId]/hundred-to-one/page.tsx` — удалены unused imports/vars `ROUND_MULT`, `REVERSE_PTS`, `H2OQuestion`, `locale`, `ri`.
- `src/app/game/[roomId]/mafia/page.tsx` — удалён unused `t`, оставлен `locale`.

### Новые файлы

- `codex-reports/024-lint-cleanup-wave-1.md` — отчёт по задаче.

### Удалённые файлы

- (нет)

---

## Diff stat

Scoped stat по файлам, которые менял Codex:

```text
 eslint.config.mjs                             |  2 ++
 scripts/generate-questions.mjs                |  6 ++--
 src/app/admin/page.tsx                        | 40 ++++++++++++++++++---------
 src/app/api/admin/quiz-item/route.ts          | 39 --------------------------
 src/app/game/[roomId]/alias/page.tsx          |  2 +-
 src/app/game/[roomId]/hundred-to-one/page.tsx |  7 ++---
 src/app/game/[roomId]/mafia/page.tsx          |  2 +-
 7 files changed, 36 insertions(+), 62 deletions(-)
```

Полный `git diff --stat` также показывает уже существующие до старта изменения в `.codex/STATUS.md` и `CLAUDE.md`; я их не редактировал.

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `git pull` | ✅ | `Already up to date` после разрешения sandbox-доступа к git fetch state. |
| `npm run lint` | ❌ | `✖ 19 problems (12 errors, 7 warnings)`. Все оставшиеся — `react-hooks/*` или `Cannot access variable before it is declared`, что ТЗ запрещает трогать в Wave 1. |
| `npm run build` | ✅ | В sandbox упал на Turbopack `Operation not permitted`; повтор вне sandbox успешен, exit code 0. Во время SSG напечатал существующий `ReferenceError: location is not defined`, но build завершился успешно. |
| `npx tsc --noEmit` | ✅ | Без ошибок. |
| Acceptance #1 | ✅ | `.agents/**` и `mobile/**` добавлены в `globalIgnores`. |
| Acceptance #2 | ❌ | Числовая цель `≤14 problems` не достигнута без правки запрещённых hooks-правил. |
| Acceptance #3 | ✅ | Build успешен. |
| Acceptance #4 | ✅ | TypeScript чистый. |
| Acceptance #5 | ⚠️ | Мои изменения ограничены whitelist; полный diff дополнительно содержит pre-existing `.codex/STATUS.md` и `CLAUDE.md`. |

---

## Отклонения от ТЗ

Числовой lint acceptance не достигнут: после выполнения всех разрешённых Wave 1 пунктов осталось 19 problems, и дальнейшее снижение требует трогать `react-hooks/exhaustive-deps`, `react-hooks/set-state-in-effect`, `react-hooks/refs`, `react-hooks/rules-of-hooks` или `react-hooks/immutability` в quiz, что противоречит запрету в ТЗ.

---

## Открытые вопросы для Claude

- Подтвердить, что Wave 1 можно принять с 19 lint problems, потому что оставшиеся проблемы относятся к hooks/immutability rules, зарезервированным для Wave 2/3.
- Уточнить, относится ли `react-hooks/immutability` в `src/app/game/[roomId]/quiz/page.tsx` к Wave 2/3 вместе с перечисленными hooks-правилами.

---

## Что НЕ сделано (если статус ⚠️ или ❌)

- Не исправлял оставшиеся hooks-проблемы в admin, alias, crocodile, mafia, quiz, tv, auth/i18n и `use-socket.ts`.
- Не трогал `src/lib/use-socket.ts`, `mobile/**`, `.agents/**`, `server.mts`, protected docs.

---

## Подсказки для ревью

- Проверь `src/app/admin/page.tsx`: единственная содержательная ручная замена — типизация `GameDataResponse` вместо `any` и fallback `?? []` при рендере admin data.
- Проверь `src/app/api/admin/quiz-item/route.ts`: удалён только локальный unused helper `factCheckSingle`, route handler не менялся.
