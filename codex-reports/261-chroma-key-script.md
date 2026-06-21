# REPORT TASK-261: Скрипт chroma-key

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-06-17 21:30
> - **Финиш:** 2026-06-17 21:37
> - **Длительность:** 7 минут
> - **Статус:** ✅ done

---

## Резюме (TL;DR)

Создан `scripts/chroma-key.mjs`: CLI-скрипт на `sharp`, который обрабатывает PNG-файлы или все `*.png` в директории, убирает зелёный фон через alpha chroma-key и делает despill зелёного канала. В `package.json` добавлен npm-скрипт `chroma-key`. PNG в рамках таска не запускались и не изменялись.

---

## Что сделано

### Изменённые файлы

- `package.json` — добавлен npm-скрипт `"chroma-key": "node scripts/chroma-key.mjs"`.

### Новые файлы

- `scripts/chroma-key.mjs` — ESM CLI для in-place RGBA chroma-key обработки PNG с флагами `--low` и `--high`.
- `codex-reports/261-chroma-key-script.md` — отчёт по задаче.

### Удалённые файлы

- (нет)

---

## Diff stat

```
 package.json             |   4 +++-
 scripts/chroma-key.mjs   | 169 +++++++++++++++++++++++++++++++++++++++++++++++
 2 files changed, 172 insertions(+), 1 deletion(-)
```

Примечание: `package.json` уже был изменён до старта TASK-261 строкой `strip-bg-cream`; в рамках этой задачи я добавил только `chroma-key`.

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `git pull` | ✅ | Already up to date |
| `node -c scripts/chroma-key.mjs` | ✅ | Синтаксис OK |
| `node scripts/chroma-key.mjs --help` | ✅ | Показывает подсказку, exit 0 |
| `node scripts/chroma-key.mjs` | ✅ | Показывает подсказку, exit 0 |
| `npm run lint` | ✅ | ESLint прошёл |
| `npm run build` | — | Не запускался: acceptance требует lint; изменение касается CLI-скрипта |

---

## Отклонения от ТЗ

Нет отклонений. PNG не трогались.

---

## Открытые вопросы для Claude

Нет.

---

## Что НЕ сделано (если статус ⚠️ или ❌)

Не применимо.

---

## Подсказки для ревью

- Проверь `scripts/chroma-key.mjs`: математика chroma-key/despill сохранена по ТЗ, добавлена только CLI-обвязка, сбор PNG из директории и валидация `--low < --high`.
- Общий рабочий tree содержит несвязанные изменения предыдущих задач; для TASK-261 relevant scope: `scripts/chroma-key.mjs`, новая строка `chroma-key` в `package.json`, этот отчёт.
