# REPORT TASK-124: fix-quiz-timer-zero

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-05-21 20:38
> - **Финиш:** 2026-05-21 20:38
> - **Длительность:** ~5 минут
> - **Статус:** ✅ done

---

## Резюме (TL;DR)

В host timer logic квиза добавлен `emit('game:action', ... timeLeft: 0)` в ветку `next <= 0` перед возвратом `timeLeft: 0`. Это гарантирует, что гости получат финальное значение таймера и не застрянут на `1`.

---

## Что сделано

### Изменённые файлы

- `src/app/game/[roomId]/quiz/page.tsx` — добавлен emit `quiz:timer` с `payload: { timeLeft: 0 }` перед завершением интервала.

### Новые файлы

- `codex-reports/124-fix-quiz-timer-zero.md` — отчёт по TASK-124.

### Удалённые файлы

- (нет)

---

## Diff stat

```
src/app/game/[roomId]/quiz/page.tsx | 91 ++++++++++++++++++++-----------------
1 file changed, 49 insertions(+), 42 deletions(-)
```

Примечание: stat cumulative из-за незакоммиченных TASK-122/123. Изменение TASK-124 само по себе:

```diff
 if (next <= 0) {
   if (timerRef.current) clearInterval(timerRef.current);
+  emit('game:action', {
+    code: roomId,
+    action: 'quiz:timer',
+    payload: { timeLeft: 0 },
+  });
   return { ...prev, timeLeft: 0 };
 }
```

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `npm run lint` | ✅ | exit 0 |

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

- Проверить только host timer logic: `quiz:timer` с `timeLeft: 0` должен эмититься до возврата `{ ...prev, timeLeft: 0 }`.
