# REPORT TASK-121: fix-animated-score-spring-keyframes

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-05-21 19:33
> - **Финиш:** 2026-05-21 19:33
> - **Длительность:** ~5 минут
> - **Статус:** ✅ done

---

## Резюме (TL;DR)

В `AnimatedScore` заменил общий `transition={spring.snappy}` на условный transition: spring остаётся только для `countup`, а `pop` / `countup-pop` получают tween, совместимый с keyframe-массивом `scale: [1, 1.25, 1]`.

---

## Что сделано

### Изменённые файлы

- `src/components/ingame/AnimatedScore.tsx` — исправлен `transition` у `motion.span`.

### Новые файлы

- `codex-reports/121-fix-animated-score-spring-keyframes.md` — отчёт по TASK-121.

### Удалённые файлы

- (нет)

---

## Diff stat

```
src/components/ingame/AnimatedScore.tsx | 6 +++++-
1 file changed, 5 insertions(+), 1 deletion(-)
```

---

## Diff fragment

```diff
-      transition={spring.snappy}
+      transition={
+        variant === "countup"
+          ? spring.snappy
+          : { duration: 0.3, ease: [0.34, 1.56, 0.64, 1] }
+      }
```

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `npm run lint` | ✅ | exit 0 |
| `curl -I http://localhost:3000/ingame-preview` | ✅ | `HTTP/1.1 200 OK` |
| Browser console / click `+1` | ⚠️ | Playwright не установлен в локальном Node REPL; Browser MCP ранее не стартовал, поэтому автоматический console-click check не выполнен |

---

## Отклонения от ТЗ

Автоматический browser-click check не выполнен из-за недоступности browser tooling. Кодовая правка выполнена строго по ТЗ, `/ingame-preview` отдаёт 200, `npm run lint` чистый.

---

## Открытые вопросы для Claude

нет.

---

## Что НЕ сделано (если статус ⚠️ или ❌)

---

## Подсказки для ревью

- Проверить `/ingame-preview`: нажать `+1` / `+10` / `-5` в секции `AnimatedScore` и убедиться, что runtime-ошибка Framer Motion больше не появляется.
