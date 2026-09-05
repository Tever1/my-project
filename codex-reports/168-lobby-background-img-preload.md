# REPORT TASK-168: Lobby background img preload

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-05-27 22:00
> - **Финиш:** 2026-05-27 22:01
> - **Длительность:** 1 минута
> - **Статус:** ✅ done

---

## Резюме (TL;DR)

Фон тайла спец-квиза в Lobby заменён с CSS `backgroundImage: url(...)` на реальный `<img>` с `fetchPriority="high"`. Изменение сделано только в `src/components/lobby/Lobby.tsx`; отчёт создан отдельно.

---

## Что сделано

### Изменённые файлы

- `src/components/lobby/Lobby.tsx` — на строке 2819 блок `backgroundUrl` теперь рендерит `<img src={backgroundUrl} fetchPriority="high">` вместо absolute `<div>` с CSS `backgroundImage`.

### Новые файлы

- `codex-reports/168-lobby-background-img-preload.md` — отчёт по TASK-168.

### Удалённые файлы

- (нет)

---

## Diff stat

```
 src/components/lobby/Lobby.tsx | 15 +++++++--------
 1 file changed, 7 insertions(+), 8 deletions(-)
```

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `grep -n "backgroundImage.*url" src/components/lobby/Lobby.tsx` | ✅ | вывод пустой |
| `grep -n "fetchPriority\|backgroundUrl" src/components/lobby/Lobby.tsx` | ✅ | `src={backgroundUrl}` на 2822, `fetchPriority="high"` на 2824 |
| `npm run lint` | ✅ | без ошибок |
| `npx tsc --noEmit` | ✅ | без ошибок |

---

## Отклонения от ТЗ

нет отклонений.

---

## Открытые вопросы для Claude

нет.

---

## Что НЕ сделано (если статус ⚠️ или ❌)

не применимо.

---

## Подсказки для ревью

- Проверь `src/components/lobby/Lobby.tsx:2819` — это механическая замена CSS background на preload-friendly `<img>`.
