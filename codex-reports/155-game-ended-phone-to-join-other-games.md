# REPORT TASK-155: game:ended -> /join for other games

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-05-27 20:08
> - **Финиш:** 2026-05-27 20:10
> - **Длительность:** 2 минуты
> - **Статус:** ✅ done

---

## Резюме (TL;DR)

Обработчик `game:ended` на телефонах теперь ведет на `/join/${roomId}` во всех 6 играх из whitelist. В `mafia` и `who-am-i` добавлены отсутствующие подписки на `game:ended`, при этом cleanup для `game:action` сохранен.

---

## Что сделано

### Изменённые файлы

- `src/app/game/[roomId]/spy/page.tsx:207` — `game:ended` редиректит на `/join/${roomId}`.
- `src/app/game/[roomId]/alias/page.tsx:178` — `game:ended` редиректит на `/join/${roomId}`.
- `src/app/game/[roomId]/crocodile/page.tsx:159` — `game:ended` редиректит на `/join/${roomId}`.
- `src/app/game/[roomId]/hundred-to-one/page.tsx:158` — `game:ended` редиректит на `/join/${roomId}`.
- `src/app/game/[roomId]/mafia/page.tsx:4` — добавлен `useRouter`; `:132` — инициализирован `router`; `:316` — добавлен `game:ended` listener с редиректом на `/join/${roomId}`; `:319` — cleanup вызывает оба unsubscribe.
- `src/app/game/[roomId]/who-am-i/page.tsx:4` — добавлен `useRouter`; `:86` — инициализирован `router`; `:239` — добавлен `game:ended` listener с редиректом на `/join/${roomId}`; `:242` — cleanup вызывает оба unsubscribe.

### Новые файлы

- `codex-reports/155-game-ended-phone-to-join-other-games.md` — отчет по задаче.

### Удалённые файлы

- (нет)

---

## Diff stat

```
 src/app/game/[roomId]/alias/page.tsx          |  2 +-
 src/app/game/[roomId]/crocodile/page.tsx      |  2 +-
 src/app/game/[roomId]/hundred-to-one/page.tsx |  2 +-
 src/app/game/[roomId]/mafia/page.tsx          | 13 ++++++++++---
 src/app/game/[roomId]/spy/page.tsx            |  2 +-
 src/app/game/[roomId]/who-am-i/page.tsx       | 13 ++++++++++---
 6 files changed, 24 insertions(+), 10 deletions(-)
```

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `npm run lint` | ✅ | без ошибок и новых предупреждений |
| `npx tsc --noEmit` | ✅ | без ошибок |
| Acceptance: 6 игр ведут на `/join/${roomId}` | ✅ | проверено grep по `game:ended` |
| Acceptance: `mafia` и `who-am-i` используют `useRouter` | ✅ | импорт и `const router = useRouter()` добавлены |
| Acceptance: cleanup не потерян | ✅ | `cleanup()` и `unsubEnded()` вызываются в общей функции очистки |

---

## Отклонения от ТЗ

`git pull` не запускался: network access в среде ограничен, approval policy `never`, поэтому запросить расширение нельзя.

---

## Открытые вопросы для Claude

нет.

---

## Что НЕ сделано (если статус ⚠️ или ❌)

Не применимо.

---

## Подсказки для ревью

- Проверить только навигационную семантику: TV route не трогался, изменения ограничены телефонными game pages.
