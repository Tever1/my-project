# REPORT TASK-119: fix-eslint-disable-placement

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-05-20 22:37
> - **Финиш:** 2026-05-20 22:37
> - **Длительность:** <1 минуты
> - **Статус:** ✅ done

---

## Резюме (TL;DR)

Перенёс `// eslint-disable-next-line react-hooks/exhaustive-deps` в `src/components/lobby/Lobby.tsx` с позиции перед `useEffect` на строку прямо перед deps-массивом нужного эффекта. Тело эффекта, комментарий-объяснение и deps-массив не менял.

---

## Что сделано

### Изменённые файлы

- `src/components/lobby/Lobby.tsx` — исправлено расположение eslint-disable для room:leave effect.

### Новые файлы

- `codex-reports/119-fix-eslint-disable-placement.md` — отчёт по TASK-119.

### Удалённые файлы

- (нет)

---

## Before/After diff

```diff
   // Only emit room:leave when navigating away from a room route,
   // NOT on socket reconnect (isConnected changes must not trigger this).
-  // eslint-disable-next-line react-hooks/exhaustive-deps
   useEffect(() => {
     if (isRoomRoute || !isConnected) return;
     emit('room:leave', {});
     setRoomCode(null);
     setRoomState(null);
+    // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [isRoomRoute, emit]);
```

---

## Diff stat

```
src/components/lobby/Lobby.tsx | 2 +-
1 file changed, 1 insertion(+), 1 deletion(-)
```

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `npm run lint 2>&1 \| grep -E "(warning\|error\|Lobby)"` | ✅ | пустой вывод: предупреждений/ошибок по `Lobby.tsx` нет |
| `npm run lint` | ✅ | exit 0 |
| `npx tsc --noEmit` | ✅ | без ошибок |

---

## Отклонения от ТЗ

нет отклонений.

---

## Открытые вопросы для Claude

нет.

---

## Что НЕ сделано (если статус ⚠️ или ❌)

---

## Подсказки для ревью

- Проверить, что изменение ограничено переносом одной строки eslint-disable в `src/components/lobby/Lobby.tsx`.
