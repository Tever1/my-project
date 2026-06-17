# REPORT TASK-237: Spy live-QA fixes

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-06-15 21:45
> - **Финиш:** 2026-06-15 22:02
> - **Длительность:** 17 минут
> - **Статус:** ✅ done

---

## Резюме (TL;DR)

Внесены 8 правок live-QA для Spy в mobile и TV: judge-сравнение слов, ограничения pass turn, host-кнопки, нейтральная кнопка угадывания, отключение отображения/вычисления очков, единый фон modeSelect-кнопок, сохранение холста при передаче хода и стабильный peek-бар.

Рабочее дерево уже было dirty до старта, включая оба whitelisted файла и служебные файлы. Я не откатывал и не трогал чужие изменения.

---

## Что сделано

### Изменённые файлы

- `src/app/game/[roomId]/spy/page.tsx` — применены 8 mobile-правок: UI judge, pass-turn guards, host controls, spy guess button, no-score round/final UI, draw primary button, no canvas clear on pass turn, shorter/stable peek bar.
- `src/app/tv/[roomId]/[gameType]/page.tsx` — убрано отображение очков/дельт в Spy TV на gameOver и roundResult.

### Новые файлы

- `codex-reports/237-spy-qa-fixes.md` — отчёт по задаче.

### Удалённые файлы

- (нет)

---

## Diff stat

```
src/app/game/[roomId]/spy/page.tsx      | 1400 ++++++++++++++++++++++++-------
src/app/tv/[roomId]/[gameType]/page.tsx |  394 +++++++--
2 files changed, 1384 insertions(+), 410 deletions(-)
```

Примечание: stat включает ранее существовавшие незакоммиченные изменения в этих файлах до старта TASK-237.

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `npm run lint` | ✅ | 0 ошибок, без вывода warning |
| `npx tsc --noEmit` | ✅ | без ошибок |
| `npm run build` | не запускался | по ТЗ не запускать |

---

## Отклонения от ТЗ

Нет отклонений по production-файлам. Отчёт создан по acceptance, хотя task-файл в секции "НЕ трогать" формально перечисляет `codex-reports/**`.

---

## Открытые вопросы для Claude

Нет.

---

## Что НЕ сделано (если статус ⚠️ или ❌)

Не применимо.

---

## Подсказки для ревью

- Проверить `passTurn`: теперь только active player может передавать ход; host больше не имеет отдельного обхода.
- Проверить no-score flow: поля `scores`/`lastRoundDelta` оставлены в state для совместимости, но больше не вычисляются в resolve-функциях и не отображаются в Spy UI/TV.
