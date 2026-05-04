# REPORT TASK-016: AvatarPill -> button + focus ring + keyboard order

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-05-03 23:29
> - **Финиш:** 2026-05-03 23:31
> - **Длительность:** 2 минуты
> - **Статус:** ✅ done

---

## Резюме (TL;DR)

`AvatarPill` переведён с `div` на `motion.button`, получил `data-topbar="avatar"`, focus ring 3px и hover/tap animation. Keyboard order TopBar расширен так, что стрелки переходят `room -> avatar` и обратно.

---

## Что сделано

### Изменённые файлы

- `src/app/lobby-preview/page.tsx` - `AvatarPill` стал focusable `motion.button` с focus state, click-заглушкой и сохранением прежней визуальной раскладки.
- `src/app/lobby-preview/page.tsx` - в `TopBar` прокинут `topbarId="avatar"`, а keyboard order получил элемент `avatar` после `room`.

### Новые файлы

- `codex-reports/016-avatar-pill-button.md` - отчёт по TASK-016.

### Удалённые файлы

- (нет)

---

## Diff stat

```
src/app/lobby-preview/page.tsx | 23 +++++++++++++++++++----
1 file changed, 19 insertions(+), 4 deletions(-)
```

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `git pull` | ❌ | Заблокирован окружением: `cannot open '.git/FETCH_HEAD': Operation not permitted`. |
| `npx eslint src/app/lobby-preview/page.tsx` | ✅ | Без ошибок. |
| `npm run lint` | ❌ | Падает на существующих ошибках вне whitelist (`.agents`, `mobile`, `src/app/admin`, игровые страницы, `src/lib/*`). В `src/app/lobby-preview/page.tsx` ошибок нет. |
| `npm run build` | ❌ | Turbopack internal error: `creating new process - binding to a port - Operation not permitted` при обработке `node_modules/geist/...module.css`. |
| Acceptance: `room` → `avatar` | ✅ | Логика order array: `avatar` добавлен сразу после `room`. |
| Acceptance: `avatar` ← `room` | ✅ | Та же order array поддерживает обратный переход. |
| Acceptance: `avatar` → стопит | ✅ | `next >= order.length` оставляет focus на правом краю. |
| Acceptance: focus ring | ✅ | `boxShadow: focused ? '0 0 0 3px rgba(255,255,255,0.6)' : 'none'`. |
| Acceptance: hover/tap | ✅ | Добавлены `whileHover={{ scale: 1.03 }}` и `whileTap={{ scale: 0.97 }}`. |
| Acceptance: mobile no regression | ✅ | Существующая mobile-логика `isMobile` сохранена: текст имени не рендерится, padding/gap прежние. |

---

## Отклонения от ТЗ

Нет отклонений в коде. Обязательные `git pull`, общий `npm run lint` и `npm run build` не смогли пройти из-за ограничений/существующих ошибок вне whitelist, детали указаны в проверках.

---

## Открытые вопросы для Claude

Нет.

---

## Что НЕ сделано (если статус ⚠️ или ❌)

- (нет)

---

## Подсказки для ревью

- Проверь `src/app/lobby-preview/page.tsx`: order array теперь заканчивается на `avatar`, а `AvatarPill` использует тот же focus-ring паттерн, что и соседние TopBar buttons.
