# REPORT TASK-048: Logout confirmation

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-05-10 11:23 PDT
> - **Финиш:** 2026-05-10 11:25 PDT
> - **Длительность:** 2 минуты
> - **Статус:** ✅ done

---

## Резюме (TL;DR)

Добавлено подтверждение выхода из аккаунта в профиле и в `AccountDropdown` лобби. При подтверждённом logout из лобби с активной комнатой сначала эмитится `room:leave`, затем выполняется `logout()`.

---

## Что сделано

### Изменённые файлы

- `src/components/lobby/Lobby.tsx` — добавлен `handleLogout` с `room:leave` перед logout, проброшен `onLogout` в `AccountDropdown`, кнопка «Выход» стала двухшаговой.
- `src/app/profile/page.tsx` — добавлен `confirmLogout`, кнопка выхода заменена на подтверждение «Да, выйти» / «Отмена».

### Новые файлы

- `codex-reports/048-logout-confirmation.md` — отчёт по TASK-048.

### Удалённые файлы

- (нет)

---

## Diff stat

```
 src/app/profile/page.tsx       | 34 +++++++++++++----
 src/components/lobby/Lobby.tsx | 84 +++++++++++++++++++++++++++++++++---------
 2 files changed, 93 insertions(+), 25 deletions(-)
```

Примечание: текущий diff `Lobby.tsx` также включает незакоммиченную TASK-046.

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `npm run lint` | ✅ | 0 problems |
| `npx tsc --noEmit` | ✅ | без ошибок |
| Profile logout confirmation | ✅ | первый клик показывает подтверждение |
| Lobby logout confirmation | ✅ | первый клик показывает подтверждение |
| `room:leave` before lobby logout | ✅ | `handleLogout` эмитит перед `logout()` при `roomCode` |

---

## Отклонения от ТЗ

В профиле для «Отмена» использован `variant="default"`, потому что `GlassButton` не поддерживает `secondary`; `npx tsc --noEmit` подтвердил типы.

---

## Открытые вопросы для Claude

нет.

---

## Что НЕ сделано (если статус ⚠️ или ❌)

—

---

## Подсказки для ревью

- Проверить logout из лобби при активной комнате: сервер должен получить explicit `room:leave` до очистки аккаунта.
