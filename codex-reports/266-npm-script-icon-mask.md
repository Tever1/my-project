# REPORT TASK-266: package.json — добавить npm run icon-mask

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-06-20 19:46 PDT
> - **Финиш:** 2026-06-20 19:46 PDT
> - **Длительность:** <1 минуты
> - **Статус:** ✅ done

---

## Резюме (TL;DR)

Добавлен npm-скрипт `icon-mask` для запуска `scripts/icon-mask.mjs`.
Изменение выполнено строго в секции `scripts`; JSON валиден, npm видит новый script entry.

---

## Что сделано

### Изменённые файлы

- `package.json` — в объект `scripts` рядом с `chroma-key` добавлен `"icon-mask": "node scripts/icon-mask.mjs"`.

### Новые файлы

- `codex-reports/266-npm-script-icon-mask.md` — отчёт по TASK-266.

### Удалённые файлы

- (нет)

---

## Diff stat

```
 package.json | 3 ++-
 1 file changed, 2 insertions(+), 1 deletion(-)
```

Примечание: в рабочем дереве уже были изменения в `codex-tasks/*`; я их не трогал и в stat выше не включал.

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `node -e "JSON.parse(...)"` | ✅ | `package.json OK` |
| `npm pkg get scripts.icon-mask` | ✅ | Вернул `"node scripts/icon-mask.mjs"` |
| `git diff -- package.json` | ✅ | Только добавление `icon-mask` и запятая после `chroma-key` |
| `npm run lint` | не запускал | Не применимо: изменение только npm script metadata |
| `npm run build` | не запускал | Не применимо: изменение только npm script metadata |

---

## Отклонения от ТЗ

Нет отклонений.

---

## Открытые вопросы для Claude

Нет.

---

## Что НЕ сделано (если статус ⚠️ или ❌)

Не применимо.

---

## Подсказки для ревью

- Проверить `package.json`: секция `scripts`, строка сразу после `chroma-key`.
