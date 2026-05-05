# REPORT TASK-019: Уменьшить CTA row на 15%

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-05-04 20:08
> - **Финиш:** 2026-05-04 20:11
> - **Длительность:** 3 минуты
> - **Статус:** ✅ done

---

## Резюме (TL;DR)

Desktop CTA row в `/lobby-preview` уменьшен примерно на 15% по заданным числам.
Mobile-значения сохранены: для общих значений добавлены явные ветки `isMobile ? старое : новое`.

---

## Что сделано

### Изменённые файлы

- `src/app/lobby-preview/page.tsx` — уменьшены desktop height/padding/fontSize/width для кнопок «Начать партию», «Правила», join-code wrapper/input и join-submit icon button.

### Новые файлы

- `codex-reports/019-cta-row-shrink-15.md` — отчёт по задаче.

### Удалённые файлы

- (нет)

---

## Diff stat

```
 src/app/lobby-preview/page.tsx | 30 +++++++++++++++---------------
 1 file changed, 15 insertions(+), 15 deletions(-)
```

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `npm run lint` | ❌ | Падает на существующих ошибках вне whitelist (`.agents`, `mobile`, `src/app/admin`, `src/app/game`, `src/lib` и др.). В `src/app/lobby-preview/page.tsx` новых сообщений нет. |
| `npm run build` | ⚠️ | Default Turbopack build упал из-за sandbox: `creating new process`, `binding to a port`, `Operation not permitted`. |
| `npm run build -- --webpack` | ✅ | Exit 0, production build собрался. Во время prerender был существующий `ReferenceError: location is not defined` на `/profile`, но команда завершилась успешно. |
| Acceptance #1 | ⚠️ | Код проходит webpack production build; default `npm run build` заблокирован окружением/Turbopack. |
| Acceptance #2 | ✅ | Все 4 CTA-элемента на desktop уменьшены по значениям из ТЗ, mobile ветки оставлены прежними. |

---

## Отклонения от ТЗ

- `git pull` не смог выполниться из-за sandbox: `cannot open '.git/FETCH_HEAD': Operation not permitted`.
- Default `npm run build` не подтвердился из-за Turbopack sandbox panic, поэтому дополнительно проверен `npm run build -- --webpack`.

---

## Открытые вопросы для Claude

нет

---

## Что НЕ сделано (если статус ⚠️ или ❌)

не применимо

---

## Подсказки для ревью

- Проверь `src/app/lobby-preview/page.tsx` в блоке `HeroLeft` CTA row: изменения только числовые, для mobile сохранены прежние значения через `isMobile` branches.
