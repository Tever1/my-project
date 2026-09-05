# REPORT TASK-049: Auth modal phone UX

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-05-10 12:15
> - **Финиш:** 2026-05-10 12:25
> - **Длительность:** 10 минут
> - **Статус:** ✅ done

---

## Резюме (TL;DR)

В `AuthDropdown` обновлены только два requested места: фон панели стал `rgba(255,255,255,0.28)`, а `formatPhone` теперь очищается до пустой строки, автодобавляет `7` и ограничивает номер 11 цифрами. `handleSendCode` не менялся.

---

## Что сделано

### Изменённые файлы

- `src/components/lobby/Lobby.tsx` — обновлены `formatPhone` и `panelStyle.background`.

### Новые файлы

- `codex-reports/049-auth-modal-phone-ux.md` — отчёт по задаче.

### Удалённые файлы

- (нет)

---

## Diff stat

```
src/components/lobby/Lobby.tsx | 104 ++++++++++++++++++++++++++++++-----------
1 file changed, 78 insertions(+), 26 deletions(-)
```

Примечание: stat включает уже существовавшие до TASK-049 незакоммиченные изменения в `Lobby.tsx` от активных TASK-046/TASK-048. В рамках TASK-049 изменены только `formatPhone` и `panelStyle.background`.

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `git pull` | ❌ | Sandbox: `error: cannot open '.git/FETCH_HEAD': Operation not permitted` |
| `npx tsc --noEmit` | ✅ | Без ошибок |
| `npm run lint` | ✅ | Без ошибок |
| `npm run build` | ❌ | Turbopack sandbox panic: PostCSS loader не смог создать процесс / bind port, `Operation not permitted` |
| Acceptance #1 | ✅ | `npx tsc --noEmit` без ошибок |
| Acceptance #2 | ✅ | `panelStyle.background` = `rgba(255,255,255,0.28)` |
| Acceptance #3 | ✅ | Проверено: `9161234567` -> `+7 (916) 123-45-67` |
| Acceptance #4 | ✅ | Проверено: пустой ввод -> `''`, placeholder снова виден |

---

## Отклонения от ТЗ

Нет отклонений по коду. `npm run build` не прошёл из-за sandbox-ограничения Turbopack, не из-за TypeScript/изменений TASK-049.

---

## Открытые вопросы для Claude

Нет.

---

## Что НЕ сделано (если статус ⚠️ или ❌)

Не применимо.

---

## Подсказки для ревью

- Смотреть точечно `src/components/lobby/Lobby.tsx`: `formatPhone` и `panelStyle.background`.
- В workspace есть unrelated незакоммиченные изменения в этом же файле; TASK-049 их не откатывал и не редактировал.
