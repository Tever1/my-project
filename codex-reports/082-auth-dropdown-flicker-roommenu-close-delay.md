# REPORT TASK-082: Fix AuthDropdown flicker + RoomMenu close delay on mobile

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-05-14 19:00
> - **Финиш:** 2026-05-14 19:16
> - **Длительность:** 16 минут
> - **Статус:** ⚠️ partial

---

## Резюме (TL;DR)

Кодовые изменения по TASK-082 выполнены в `src/components/lobby/Lobby.tsx`: мобильные auth/account overlay больше не масштабируют fixed viewport, blur с AuthDropdown mobile overlay удалён, RoomMenu mobile sheet переведён с Framer Motion exit на CSS transition. `npm run lint` прошёл, `npx next build --webpack` прошёл, но обязательный `npm run build` упал на Turbopack sandbox error до проверки приложения.

---

## Что сделано

### Изменённые файлы

- `src/components/lobby/Lobby.tsx` — убран `backdropFilter: 'blur(4px)'` с mobile AuthDropdown overlay; AuthDropdown переведён на opacity-only animation; AccountDropdown получил opacity-only animation на mobile и прежнюю desktop-анимацию; mobile RoomMenu sheet заменён на CSS `transform` transition без `AnimatePresence`/`motion.div`.

### Новые файлы

- `codex-reports/082-auth-dropdown-flicker-roommenu-close-delay.md` — отчёт по задаче.

### Удалённые файлы

- (нет)

---

## Diff stat

```
src/components/lobby/Lobby.tsx | 92 ++++++++++++++++++++----------------------
1 file changed, 43 insertions(+), 49 deletions(-)
```

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `git pull` | ❌ | Sandbox denied writing `.git/FETCH_HEAD`: `Operation not permitted` |
| `npm run lint` | ✅ | ESLint прошёл без ошибок |
| `npm run build` | ❌ | Turbopack internal error: `creating new process - binding to a port - Operation not permitted (os error 1)` |
| `npx next build --webpack` | ✅ | Webpack build + TypeScript прошли, exit 0 |
| Acceptance #1 | ✅ | AuthDropdown mobile overlay без `backdropFilter`; animation opacity-only |
| Acceptance #2 | ✅ | AccountDropdown mobile animation opacity-only, без `scale` |
| Acceptance #3 | ✅ | Mobile RoomMenu sheet использует plain `div` + CSS `transform` transition |
| Acceptance #4 | ⚠️ | Exact `npm run build` не прошёл из-за sandbox/Turbopack, webpack build прошёл |
| Acceptance #5 | ✅ | Desktop RoomMenu block с `AnimatePresence mode="wait"` не изменён |

---

## Отклонения от ТЗ

Кодовые отклонения отсутствуют. Проверка `npm run build` не подтверждена из-за ограничения окружения на Turbopack process/port binding; дополнительная проверка `npx next build --webpack` прошла успешно.

---

## Открытые вопросы для Claude

нет

---

## Что НЕ сделано (если статус ⚠️ или ❌)

- Не удалось подтвердить exact `npm run build` в текущем sandbox из-за Turbopack internal error, связанного с `Operation not permitted`.

---

## Подсказки для ревью

- Проверь mobile RoomMenu в `src/components/lobby/Lobby.tsx` около блока `Mobile room menu overlay`: панель теперь присутствует в DOM при наличии `roomCode`, а интерактивность backdrop контролируется `pointerEvents`.
- Проверь AuthDropdown и AccountDropdown animation props: AuthDropdown везде opacity-only, AccountDropdown сохраняет прежний `y/scale` только для desktop.
