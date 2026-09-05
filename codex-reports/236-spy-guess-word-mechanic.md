# REPORT TASK-236: Spy — авто-голосование по таймеру + угадывание слова шпионом

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-06-11 21:20 PDT
> - **Финиш:** 2026-06-11 21:40 PDT
> - **Длительность:** 20 минут
> - **Статус:** ✅ done

---

## Резюме (TL;DR)

Сделан переход основного таймера Spy в авто-голосование и добавлен host-authoritative flow `spyGuess`: шпион может попытаться угадать слово, авто-проверка сравнивает нормализованный ввод, спорный ответ уходит случайному мирному судье. Mobile и TV отображают новую фазу и viaGuess-результаты.

---

## Что сделано

### Изменённые файлы

- `src/app/game/[roomId]/spy/page.tsx` — добавлена фаза `spyGuess`, state-поля `spyGuess*`, `normalizeWord`, `resolveSpyGuess`, socket-события `spy:guess-start/try/confirm/verdict`, авто-переход таймера в voting, mobile UI шпиона/судьи и подпись viaGuess в результатах.
- `src/app/tv/[roomId]/[gameType]/page.tsx` — расширен TV `spyState`, добавлен рендер фазы `spyGuess` и подписи результата для попытки угадывания.

### Новые файлы

- `codex-reports/236-spy-guess-word-mechanic.md` — отчёт по задаче.

### Удалённые файлы

- (нет)

---

## Diff stat

```
src/app/game/[roomId]/spy/page.tsx      | 1455 ++++++++++++++++++++++++-------
src/app/tv/[roomId]/[gameType]/page.tsx |  424 +++++++--
2 files changed, 1469 insertions(+), 410 deletions(-)
```

Примечание: stat выше по двум whitelisted исходникам включает уже существовавшие незакоммиченные изменения предыдущих Spy/TV задач.

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `git pull` | ✅ | Already up to date |
| `npm run lint` | ✅ | без ошибок |
| `npx tsc --noEmit` | ✅ | без ошибок |
| `npm run build` | ❌ | Turbopack internal error: PostCSS loader не смог создать процесс / bind to a port в sandbox (`Operation not permitted`) |
| `git diff --check -- src/app/game/[roomId]/spy/page.tsx src/app/tv/[roomId]/[gameType]/page.tsx` | ✅ | без whitespace errors |
| Acceptance #1 | ✅ | host-таймер `playing` при `newLeft <= 0` переводит в `voting`, сбрасывает `votes`, запускает vote-таймер |
| Acceptance #2/#3 | ✅ | добавлен flow угадывания слова, авто-совпадение, подтверждение через судью, начисление `+2` шпиону или `+1` мирным |

---

## Отклонения от ТЗ

Нет отклонений по реализации. Отчёт создан вне whitelist, потому что он явно требовался в ТЗ и проектном workflow.

---

## Открытые вопросы для Claude

Нет.

---

## Что НЕ сделано

Ничего.

---

## Подсказки для ревью

- Проверить `src/app/game/[roomId]/spy/page.tsx`: новые host-only ветки `spy:guess-*` рядом с `spy:vote`.
- Проверить `src/app/game/[roomId]/spy/page.tsx`: ветка основного timer effect при `newLeft <= 0` теперь стартует voting.
- Проверить `src/app/tv/[roomId]/[gameType]/page.tsx`: новый TV блок `sp.phase === 'spyGuess'` и viaGuess-подписи в `roundResult`.
