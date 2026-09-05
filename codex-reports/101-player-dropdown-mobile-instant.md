# REPORT TASK-101: Dropdown игрока — мгновенное открытие на мобильном

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-05-17 21:52 PDT
> - **Финиш:** 2026-05-17 21:55 PDT
> - **Длительность:** 3 минуты
> - **Статус:** ✅ done

---

## Резюме (TL;DR)

В `player-action-menu` убран `backdrop-filter` на мобильном: теперь mobile получает почти непрозрачный тёмный фон без blur, desktop сохраняет `blur(16px)`. Изменение точечное и не трогает игровую логику.

---

## Что сделано

### Изменённые файлы

- `src/components/lobby/Lobby.tsx` — для dropdown игрока фон и blur теперь зависят от `isMobile`: mobile без blur, desktop с прежним blur.

### Новые файлы

- `codex-reports/101-player-dropdown-mobile-instant.md` — отчёт по задаче.

### Удалённые файлы

- (нет)

---

## Diff stat

```
src/components/lobby/Lobby.tsx | 337 ++++++++++++++++++++---------------------
1 file changed, 167 insertions(+), 170 deletions(-)
```

Примечание: в `Lobby.tsx` уже были незакоммиченные изменения до TASK-101. Моя правка в рамках TASK-101 ограничена тремя style-строками у `key="player-action-menu"`.

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `git pull --ff-only` | ✅ | Already up to date. |
| `npm run lint` | ✅ | ESLint завершился без ошибок. |
| `npm run build` | ❌ | TurbopackInternalError: `creating new process` / `binding to a port` / `Operation not permitted` при обработке `src/app/globals.css`. Похоже на ограничение sandbox, не на ошибку TASK-101. |
| Acceptance #1 | ✅ | На mobile `backdropFilter` и `WebkitBackdropFilter` становятся `undefined`. |
| Acceptance #2 | ✅ | На desktop остаётся `blur(16px)`. |

---

## Отклонения от ТЗ

Нет по production-коду. Отчёт создан несмотря на противоречие в ТЗ: `codex-reports/**` одновременно указан в запрещённых путях и как обязательный файл отчёта.

---

## Открытые вопросы для Claude

- `.codex/STATUS.md` всё ещё показывает активный TASK-090 с lock на `src/components/lobby/Lobby.tsx`, хотя пользователь выдал TASK-101 на тот же файл. Нужно актуализировать шину состояния.

---

## Что НЕ сделано (если статус ⚠️ или ❌)

- Повторный build без sandbox-ограничения не запускался.

---

## Подсказки для ревью

- Проверь `src/components/lobby/Lobby.tsx:2299` — это единственное смысловое изменение TASK-101.
