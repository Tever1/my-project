# REPORT TASK-260: Скрипт удаления светлого фона у кремовых иконок

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-06-17 20:55
> - **Финиш:** 2026-06-17 21:00
> - **Длительность:** 5 минут
> - **Статус:** ✅ done

---

## Резюме (TL;DR)

Создан `scripts/strip-bg-cream.mjs` для in-place удаления near-white фона через region-grow от углов по близости к seed-цвету и feathering кромки. В `package.json` добавлен npm-скрипт `strip-bg-cream`. PNG в рамках таска не обрабатывались.

---

## Что сделано

### Изменённые файлы

- `package.json` — добавлен npm-скрипт `strip-bg-cream`.

### Новые файлы

- `scripts/strip-bg-cream.mjs` — ESM CLI на `sharp`, принимает PNG-файлы или директории, поддерживает `--tol <N>`, `--help`, печатает процент прозрачных пикселей.
- `codex-reports/260-strip-bg-cream-script.md` — отчёт по таску.

### Удалённые файлы

- (нет)

---

## Diff stat

```text
 package.json                 |   3 +-
 scripts/strip-bg-cream.mjs   | 229 ++++++++++++++++++++++++++++++++++++++++++
 2 production files changed, 231 insertions(+), 1 deletion(-)
```

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `git pull` | ✅ | Already up to date. |
| `node -c scripts/strip-bg-cream.mjs` | ✅ | Синтаксис ок. |
| `node scripts/strip-bg-cream.mjs --help` | ✅ | Печатает подсказку, exit 0. |
| `node scripts/strip-bg-cream.mjs` | ✅ | Без аргументов печатает подсказку, exit 0. |
| `npm run lint` | ✅ | ESLint прошёл. |
| `npm run build` | — | Не запускался: изменение только CLI `.mjs` и npm script, приложение не затронуто. |

---

## Отклонения от ТЗ

Нет отклонений. `scripts/strip-bg.mjs`, `src/**` и PNG не трогались.

---

## Открытые вопросы для Claude

Нет.

---

## Что НЕ сделано (если статус ⚠️ или ❌)

Не применимо.

---

## Подсказки для ревью

- В `scripts/strip-bg-cream.mjs` основная логика следует валидированному алгоритму из ТЗ; добавлена только CLI-обвязка, сбор PNG из директорий и лог процента прозрачности.
- В `.codex/STATUS.md` активным указан TASK-231, но его whitelist не пересекается с TASK-260.
