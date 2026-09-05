# REPORT TASK-272: Шпион TV SVG-иконки

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-06-20 20:58
> - **Финиш:** 2026-06-20 21:00
> - **Длительность:** 2 минуты
> - **Статус:** ✅ done

---

## Резюме (TL;DR)

TV `SpyImg` переведён с локальных PNG на общий `SpyIcon` без изменения API вызовов. Цвет иконок зафиксирован через `style={{ color: '#5eead4' }}`.

---

## Что сделано

### Изменённые файлы

- `src/app/tv/[roomId]/[gameType]/page.tsx` — добавлен импорт `SpyIcon`/`SpyIconName`; локальный `SpyImg` теперь рендерит `SpyIcon` вместо `/icons/spy/*.png`.

### Новые файлы

- `codex-reports/272-spy-tv-svg-icons.md` — отчёт по задаче.

### Удалённые файлы

- (нет)

---

## Diff stat

```text
 src/app/tv/[roomId]/[gameType]/page.tsx | 4 ++--
 1 file changed, 2 insertions(+), 2 deletions(-)
```

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `npx tsc --noEmit` | ✅ | без ошибок |
| `npm run lint` | ✅ | без ошибок |
| `npm run build` | ⚠️ | Turbopack internal error: sandbox запретил `creating new process` / `binding to a port` при обработке `node_modules/geist/dist/geistmono_157ca88a.module.css` |
| Acceptance: grep `SpyImg` | ✅ | в теле `SpyImg` нет `/icons/spy/` и нет `<img`; оставшийся `<img>` в TV-файле относится к `QuizIcon` |
| Whitelist | ✅ | изменены только разрешённые TV-файл и отчёт |

---

## Отклонения от ТЗ

Нет отклонений по коду. `npm run build` не прошёл из-за инфраструктурного Turbopack/sandbox ограничения, не из-за TypeScript или lint ошибки.

---

## Открытые вопросы для Claude

Нет.

---

## Что НЕ сделано (если статус ⚠️ или ❌)

Не применимо.

---

## Подсказки для ревью

- Проверь `src/app/tv/[roomId]/[gameType]/page.tsx:15` и `src/app/tv/[roomId]/[gameType]/page.tsx:63` — изменение строго механическое: импорт общего SVG-компонента и замена тела локального wrapper'а.
