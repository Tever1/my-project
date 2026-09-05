# REPORT TASK-139: join-page-and-game-host

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-05-24 22:59
> - **Финиш:** 2026-05-24 23:05
> - **Длительность:** ~6 минут
> - **Статус:** ✅ done

---

## Резюме (TL;DR)

На сервер добавлен `gameHostPlayerId`: первый новый участник с `role: 'player'` становится телефонным ведущим и это поле приходит в `room:state`. Создана страница `/join/[code]` с узким телефонным UI: ввод имени, join комнаты, live список игроков, кнопка «НАЧАТЬ ИГРУ» для первого телефона.

---

## Что сделано

### Изменённые файлы

- `src/server/socket-handlers.mts` — добавлен `Room.gameHostPlayerId`, инициализация `null`, установка первому новому `role: 'player'`, поле добавлено в broadcast/direct `room:state`.

### Новые файлы

- `src/app/join/[code]/page.tsx` — новый client route для подключения телефона к комнате и старта игры первым подключившимся player.
- `codex-reports/139-join-page-and-game-host.md` — отчёт по TASK-139.

### Удалённые файлы

- (нет)

---

## Diff stat

```text
 src/server/socket-handlers.mts | 17 +++++++++++++++--
 src/app/join/[code]/page.tsx   | 315 new file
```

Примечание: полный worktree содержит pre-existing изменения TASK-134..138 и локальные `.claude/.codex` изменения. Для TASK-139 редактировались только whitelist-файлы.

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `npm run lint` | ✅ | exit 0 |
| `npx tsc --noEmit` | ✅ | exit 0 |
| `npm run build` | ✅ | exit 0 после запуска вне sandbox |
| `curl -I http://localhost:3000/join/TEST` | ✅ | HTTP 200 на уже запущенном локальном dev-сервере |
| Acceptance: `Room.gameHostPlayerId` | ✅ | interface/create/join/state обновлены |
| Acceptance: first `role:'player'` is game host | ✅ | устанавливается только при новом player join и `null` |
| Acceptance: `/join/[code]` route | ✅ | route появился в build output |
| Acceptance: start button | ✅ | первый player видит «НАЧАТЬ ИГРУ» и эмитит `game:start` |

Примечание по build: внутри sandbox Turbopack снова упал на `binding to a port / Operation not permitted`; вне sandbox сборка прошла. Во время успешной сборки Next по-прежнему выводит `ReferenceError: location is not defined`, но команда завершается с кодом 0.

---

## Отклонения от ТЗ

Импортировал `useAuth` из фактического файла проекта `src/lib/auth-context.tsx`, потому что `src/lib/use-auth.ts` в репозитории отсутствует.

---

## Открытые вопросы для Claude

нет.

---

## Что НЕ сделано (если статус ⚠️ или ❌)

---

## Подсказки для ревью

- Проверить, что `gameHostPlayerId` не меняется на reconnect и не сбрасывается на disconnect.
- Проверить `/join/[code]`: guest `playerId` сохраняется в localStorage, чтобы сравнение с `gameHostPlayerId` было стабильным.
- Проверить, что `game:start` остаётся на join-странице, а desktop Lobby ждёт broadcast и уходит на `/tv/...`.
