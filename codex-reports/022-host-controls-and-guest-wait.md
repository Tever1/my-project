# REPORT TASK-022: Управление игроками хостом + гость остаётся в лобби

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-05-06 20:55
> - **Финиш:** 2026-05-06 21:09
> - **Длительность:** 14 минут
> - **Статус:** ✅ done

---

## Резюме (TL;DR)

В `/lobby-preview` гость после успешного `room:join` теперь остаётся на preview-странице, а стартовая CTA для гостя в комнате становится disabled «Ожидание хоста». В `RoomMenu` добавлено host-only inline-меню управления игроками: удалить из комнаты или передать роль хоста.

---

## Что сделано

### Изменённые файлы

- `src/app/lobby-preview/page.tsx` — добавлен `room:kicked` listener, host-only `room:kick` / `room:transfer-host`, guest wait-state для start CTA, join success без redirect, inline mini-menu в `RoomMenu`.

### Новые файлы

- `codex-reports/022-host-controls-and-guest-wait.md` — отчёт по TASK-022.

### Удалённые файлы

- (нет)

---

## Diff stat

```
 src/app/lobby-preview/page.tsx | 270 +++++++++++++++++++++++++++++++++--------
 1 file changed, 222 insertions(+), 48 deletions(-)
```

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `git pull` | ✅ | `Already up to date` после sandbox escalation на `.git/FETCH_HEAD`. |
| `npx tsc --noEmit` | ✅ | Exit code 0. |
| `npx eslint src/app/lobby-preview/page.tsx` | ✅ | Exit code 0. |
| `npx next build --webpack` | ✅ | Exit code 0. В выводе остаётся существующий `ReferenceError: location is not defined` при prerender `/profile`, но build завершается успешно. |
| Acceptance #1 | ✅ | TypeScript check прошёл. |
| Acceptance #2 | ✅ | Targeted eslint по whitelisted file прошёл. |
| Acceptance #3 | ✅ | Webpack build прошёл с exit code 0. |
| Acceptance #4 | ✅ | Host-only клик по чужому игроку открывает inline mini-menu с двумя кнопками. |
| Acceptance #5 | ✅ | Свой pill не открывает меню, потому что `canManagePlayer` false. |
| Acceptance #6 | ✅ | Guest clicks ignored, потому что `currentUserId !== roomState.hostId`. |
| Acceptance #7 | ✅ | «Удалить» вызывает `room:kick` и закрывает menu. |
| Acceptance #8 | ✅ | «Передать роль» вызывает `room:transfer-host` и закрывает menu. |
| Acceptance #9 | ✅ | `room:join` success сохраняет `roomCode`, очищает input и не делает redirect. |
| Acceptance #10 | ✅ | Guest видит disabled «Ожидание хоста» со серым стилем. |
| Acceptance #11 | ✅ | `room:kicked` сбрасывает `roomCode`, `roomState`, закрывает меню и показывает toast. |

---

## Отклонения от ТЗ

нет отклонений

---

## Открытые вопросы для Claude

нет

---

## Что НЕ сделано (если статус ⚠️ или ❌)

- Browser click-QA не запускал; acceptance проверен кодом и обязательными командами из ТЗ.

---

## Подсказки для ревью

- Проверь блок `RoomMenu`: player pill стал button, а action menu рендерится inline под выбранным игроком, не absolute popup.
- Проверь `isCurrentUserHost`: логика намеренно не блокирует start CTA до получения `roomState`, как указано в ТЗ.
