# REPORT TASK-367: «100 к 1» раунд 4 — скрыть продолжение таймера на нуле

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-07-20 21:52
> - **Финиш:** 2026-07-20 21:52
> - **Длительность:** <1 минуты
> - **Статус:** ✅ done

---

## Резюме (TL;DR)

Сделана точечная правка рендера кнопок таймера обсуждения в 4-м раунде «100 к 1». При `r4Time === 0` кнопка `СТАРТ`/`ПРОДОЛЖИТЬ`/`ПАУЗА` больше не показывается, reset `↺` остаётся видимым.

---

## Что сделано

### Изменённые файлы

- `src/app/game/[roomId]/hundred-to-one/page.tsx` — в блоке Round 4 discussion timer добавлена проверка `s.r4Time === 0 ? null : (...)` вокруг кнопки управления таймером.

### Новые файлы

- `codex-reports/367-h2o-round4-timer-hide-continue-at-zero.md` — отчёт по задаче.

### Удалённые файлы

- (нет)

---

## Diff по строкам

`src/app/game/[roomId]/hundred-to-one/page.tsx:1325`

```diff
-              {!s.r4Running
-                ? <GlassButton size="sm" onClick={r4Start}>{s.r4Time < 60 ? `▶ ${l('ПРОДОЛЖИТЬ', 'CONTINUE')}` : `▶ ${l('СТАРТ', 'START')}`}</GlassButton>
-                : <GlassButton size="sm" onClick={r4Pause}>⏸ {l('ПАУЗА', 'PAUSE')}</GlassButton>}
+              {s.r4Time === 0 ? null : (
+                !s.r4Running
+                  ? <GlassButton size="sm" onClick={r4Start}>{s.r4Time < 60 ? `▶ ${l('ПРОДОЛЖИТЬ', 'CONTINUE')}` : `▶ ${l('СТАРТ', 'START')}`}</GlassButton>
+                  : <GlassButton size="sm" onClick={r4Pause}>⏸ {l('ПАУЗА', 'PAUSE')}</GlassButton>
+              )}
               <GlassButton size="sm" onClick={r4Reset}>↺</GlassButton>
```

---

## Diff stat

```
src/app/game/[roomId]/hundred-to-one/page.tsx | 897 +++++++++++++++-----------
1 file changed, 531 insertions(+), 366 deletions(-)
```

Примечание: общий stat большой, потому что в целевом файле уже были незакоммиченные изменения до старта TASK-367. Мой фактический ханк в этом таске — только блок строк 1325-1329 выше.

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `npx tsc --noEmit` | ✅ | без ошибок |
| `npm run lint` | ✅ | без warnings/errors |
| `r4Time > 0` | ✅ | прежняя ветка `СТАРТ`/`ПРОДОЛЖИТЬ`/`ПАУЗА` сохранена |
| `r4Time === 0` | ✅ | кнопка управления скрыта, `↺` остаётся |
| `↺` после нуля | ✅ | `r4Reset` не менялся, существующий сброс на 60 сек сохранён |

---

## Отклонения от ТЗ

Нет отклонений.

---

## Открытые вопросы для Claude

Нет.

---

## Что НЕ сделано

Ничего.

---

## Подсказки для ревью

- Проверить только `src/app/game/[roomId]/hundred-to-one/page.tsx:1325`: условие `s.r4Time === 0 ? null : (...)` не затрагивает reset-кнопку.
