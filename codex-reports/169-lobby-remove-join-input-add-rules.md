# REPORT TASK-169: Лобби — удалить поле ввода кода комнаты + правила игр

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-05-27 22:00 PDT
> - **Финиш:** 2026-05-27 22:18 PDT
> - **Длительность:** 18 минут
> - **Статус:** ✅ done

---

## Резюме (TL;DR)

Удалён desktop-only блок ввода кода комнаты из `HeroLeft`; мобильный `PlayerJoinView` не тронут. Добавлены правила для всех 7 игр и модальный overlay, который открывается по кнопке «Правила».

---

## Что сделано

### Изменённые файлы

- `src/components/lobby/Lobby.tsx` — добавлено поле `rules` в `GameInfo`, заполнены правила для 7 игр, добавлен `rulesOpen` state и modal overlay.
- `src/components/lobby/Lobby.tsx` — удалены `showJoinRoom` JSX-блок, join-specific props/state/refs/handlers из `HeroLeft`; CTA keyboard order упрощён до `["start", "rules"]`.
- `src/components/lobby/Lobby.tsx` — на кнопку «Правила» добавлен `onClick={onRules}`, вызов `HeroLeft` обновлён без desktop join-пропсов.

### Новые файлы

- `codex-reports/169-lobby-remove-join-input-add-rules.md` — отчёт по TASK-169.

### Удалённые файлы

- (нет)

---

## Diff stat

```
src/components/lobby/Lobby.tsx | 515 ++++++++++++++++++++++++-----------------
1 file changed, 302 insertions(+), 213 deletions(-)
```

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `git pull --ff-only` | ✅ | Already up to date. |
| Acceptance #1 grep | ✅ | `0` совпадений для desktop join markers: `showJoinRoom`, `join-code`, `join-submit`, `handleJoinWrapperFocus`, `joinWrapperRef`, `joinInputRef`, `joinSelectedByEsc`. |
| Acceptance #2 grep | ✅ | `11` строк для `rules.*sections\|section\.title\|section\.items`. |
| Acceptance #3 grep | ✅ | `8` строк для `rulesOpen\|setRulesOpen\|onRules`. |
| `npm run lint` | ✅ | Без ошибок. |
| `npx tsc --noEmit` | ✅ | Без ошибок. |
| `npm run build` | ⚠️ | Turbopack panic: `Operation not permitted (os error 1)` при `creating new process` / `binding to a port` во время обработки `src/app/globals.css`. Похоже на ограничение окружения, не на ошибку TypeScript/React. |

---

## Отклонения от ТЗ

Нет по production-коду. Дополнительно запущен `npm run build` по проектному workflow; он упал на инфраструктурном ограничении Turbopack в текущем окружении.

---

## Открытые вопросы для Claude

- В `.codex/STATUS.md` остаются старые active/ready lock'и на `src/components/lobby/Lobby.tsx` для TASK-106/108/109/110/135/136/137/138. Пользователь явно выдал TASK-169 в этом чате, поэтому работа выполнена по актуальному whitelist.

---

## Что НЕ сделано (если статус ⚠️ или ❌)

- Ничего по TASK-169.

---

## Подсказки для ревью

- Посмотреть `GameInfo.rules` и тексты правил: все строки сейчас русские, как и остальной lobby UI.
- Проверить modal overlay после `<GlassToaster />`: закрытие по backdrop и кнопке `✕`, клик внутри панели не закрывает.
