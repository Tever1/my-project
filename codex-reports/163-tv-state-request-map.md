# REPORT TASK-163: TV state request map

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-05-27 21:04
> - **Финиш:** 2026-05-27 21:05
> - **Длительность:** 1 минута
> - **Статус:** ✅ done

---

## Резюме (TL;DR)

В TV-странице заменена if-else цепочка выбора `request-state` action на константный маппинг `TV_STATE_REQUEST`. Логика отправки запроса после `tv:join` сохранена, game-страницы не трогались.

---

## Что сделано

### Изменённые файлы

- `src/app/tv/[roomId]/[gameType]/page.tsx` — добавлен `TV_STATE_REQUEST`, callback `tv:join` теперь берёт action из маппинга и отправляет его через `sendAction`.

### Новые файлы

- `codex-reports/163-tv-state-request-map.md` — отчёт по задаче.

### Удалённые файлы

- (нет)

---

## Diff stat

```
 src/app/tv/[roomId]/[gameType]/page.tsx | 21 +++++++++++----------
 1 file changed, 11 insertions(+), 10 deletions(-)
```

## Diff

```diff
diff --git a/src/app/tv/[roomId]/[gameType]/page.tsx b/src/app/tv/[roomId]/[gameType]/page.tsx
index 0cb1582..ed30340 100644
--- a/src/app/tv/[roomId]/[gameType]/page.tsx
+++ b/src/app/tv/[roomId]/[gameType]/page.tsx
@@ -12,6 +12,14 @@ import { QUIZ_TOPICS, QUIZ_DIFFICULTIES, SPECIAL_QUIZZES, SPECIAL_QUIZ_THEMES, g
 import { ROUNDS as H2O_ROUNDS, ROUND_NAMES as H2O_ROUND_NAMES, BIG_Q as H2O_BIG_Q, TOPICS as H2O_TOPICS, getDisplayPts as h2oGetDisplayPts } from '@/lib/hundred-to-one/questions';
 import type { QuizDifficulty, QuizTopic } from '@/types/game';
 
+/** Maps gameType to the action that requests a full state broadcast from the host. */
+const TV_STATE_REQUEST: Partial<Record<string, string>> = {
+  'hundred-to-one': 'h2o:request-state',
+  crocodile: 'croc:request-state',
+  alias: 'alias:request-state',
+  quiz: 'quiz:request-state',
+};
+
 // ---------------------------------------------------------------------------
 // Types
 // ---------------------------------------------------------------------------
@@ -190,15 +198,8 @@ export default function TVGamePage() {
     emit('tv:join', { code: roomId }, () => {
       // Request full game state only after the socket has joined the room,
       // otherwise the h2o:sync response won't be delivered to this socket yet.
-      if (gameType === 'hundred-to-one') {
-        sendAction('h2o:request-state');
-      } else if (gameType === 'crocodile') {
-        sendAction('croc:request-state');
-      } else if (gameType === 'alias') {
-        sendAction('alias:request-state');
-      } else if (gameType === 'quiz') {
-        sendAction('quiz:request-state');
-      }
+      const requestAction = TV_STATE_REQUEST[gameType];
+      if (requestAction) sendAction(requestAction);
     });
   }, [isConnected, roomId, emit, gameType, sendAction]);
 
@@ -391,7 +392,7 @@ export default function TVGamePage() {
       setGenericState((prev) => ({ ...prev, lastAction: action, ...payload }));
     });
 
-    // Note: game state request (h2o:request-state etc.) is sent in the tv:join
+    // Note: the full-state request is sent in the tv:join
     // callback above, after the socket has confirmed it joined the room.
 
     return unsub2;
```

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `grep -n "request-state" src/app/tv/[roomId]/[gameType]/page.tsx` | ✅ | Только записи `TV_STATE_REQUEST` |
| `npm run lint` | ✅ | exit 0 |
| `npx tsc --noEmit` | ✅ | exit 0 |
| `npm run build` | ⚪ | Не запускался: в acceptance для задачи указан `npx tsc --noEmit` |

### grep output

```text
17:  'hundred-to-one': 'h2o:request-state',
18:  crocodile: 'croc:request-state',
19:  alias: 'alias:request-state',
20:  quiz: 'quiz:request-state',
```

---

## Отклонения от ТЗ

Нет отклонений. Дополнительно переформулирован старый комментарий в этом же файле, чтобы acceptance `grep` не находил лишний `request-state`.

---

## Открытые вопросы для Claude

Нет.

---

## Что НЕ сделано (если статус ⚠️ или ❌)

Не применимо.

---

## Подсказки для ревью

- Проверь, что набор ключей `TV_STATE_REQUEST` совпадает с текущими game-side handlers для full-state sync.
