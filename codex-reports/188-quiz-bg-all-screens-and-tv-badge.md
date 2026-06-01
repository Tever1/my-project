# REPORT TASK-188: Quiz — background on all screens + TV badge 3x bigger

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-05-31 20:35
> - **Финиш:** 2026-05-31 20:39
> - **Длительность:** 4 минуты
> - **Статус:** ✅ done

---

## Резюме (TL;DR)

Исправлено применение preconfigured special quiz config на первом `useRoomState` callback без ожидания `isGameHostRef`. QR waiting screen лобби теперь рендерит фон выбранного спец-квиза, а TV waiting badge спец-квиза увеличен по ТЗ.

---

## Что сделано

### Изменённые файлы

- `src/app/game/[roomId]/quiz/page.tsx` — host определяется напрямую через `user?.id ?? getGuestPlayerId()` и `nextGameHostPlayerId` перед вызовом `applyPreconfiguredQuiz`.
- `src/components/lobby/Lobby.tsx` — добавлен lookup `SPECIAL_QUIZZES` для `pendingQuizConfig.specialQuizId` и фоновое изображение в QR waiting screen.
- `src/app/tv/[roomId]/[gameType]/page.tsx` — badge спец-квиза в waiting phase увеличен до `text-5xl px-12 py-8`, иконка до 72px.

### Новые файлы

- `codex-reports/188-quiz-bg-all-screens-and-tv-badge.md` — отчёт по задаче.

### Удалённые файлы

- (нет)

---

## Diff stat

```
 src/app/game/[roomId]/quiz/page.tsx     |  8 +++++++-
 src/app/tv/[roomId]/[gameType]/page.tsx |  4 ++--
 src/components/lobby/Lobby.tsx          | 16 ++++++++++++++++
 3 files changed, 25 insertions(+), 3 deletions(-)
```

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `npm run lint` | ✅ | Чисто |
| `npm run build` | ❌ | Turbopack internal error: sandbox запретил `creating new process` / `binding to a port` при обработке `node_modules/geist/dist/geistsans_d5a4f12f.module.css`; panic log: `/tmp/claude-501/next-panic-d799cf7d868d38ff02053739e121c1e8.log` |
| `git diff --check` | ✅ | Чисто |
| Acceptance #1 | ✅ | `npm run lint` чистый |
| Acceptance #2 | ✅ | В `useRoomState` используется прямое чтение `user?.id ?? getGuestPlayerId()` |
| Acceptance #3 | ✅ | QR-экран лобби добавляет фон для выбранного спец-квиза |
| Acceptance #4 | ✅ | TV waiting badge: `text-5xl px-12 py-8`, icon 72px |

---

## Отклонения от ТЗ

Добавлен `isolation: 'isolate'` к QR `<main>`, чтобы заданный в ТЗ `zIndex: -1` у фоновой картинки оставался внутри stacking context и фон не проваливался за страницу.

---

## Открытые вопросы для Claude

нет

---

## Что НЕ сделано (если статус ⚠️ или ❌)

Не применимо. Кодовые изменения выполнены; build не прошёл из-за ограничения sandbox/Turbopack, не из-за TypeScript или lint ошибки.

---

## Подсказки для ревью

- Проверь `src/components/lobby/Lobby.tsx` в QR waiting screen: `isolation: 'isolate'` добавлен специально под `zIndex: -1` у фонового `<img>`.
