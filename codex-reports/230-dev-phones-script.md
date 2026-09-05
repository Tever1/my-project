# REPORT TASK-230: Скрипт «виртуальные телефоны» для локального QA

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-06-10 20:43
> - **Финиш:** 2026-06-10 20:49
> - **Длительность:** 6 минут
> - **Статус:** ✅ done

---

## Резюме (TL;DR)

Добавлен macOS dev-скрипт `npm run phones -- <ROOMCODE> [N]`, который открывает до 6 отдельных Chrome app windows с независимыми профилями в `~/.cache/party-phones`. Production-код приложения не трогался.

---

## Что сделано

### Изменённые файлы

- `package.json` — добавлен npm script `phones`.

### Новые файлы

- `scripts/dev-phones.sh` — Bash-скрипт для запуска виртуальных телефонов на `/join/<ROOMCODE>` с отдельным `--user-data-dir` на каждый телефон.

### Удалённые файлы

- (нет)

---

## Diff stat

```
 package.json           |  1 +
 scripts/dev-phones.sh  | 61 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
 2 files changed, 62 insertions(+)
```

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `npm run lint` | ✅ | ESLint прошёл |
| `npm run build` | ❌ | Turbopack упал на ограничении окружения: `creating new process` / `binding to a port` / `Operation not permitted (os error 1)` |
| `bash -n scripts/dev-phones.sh` | ✅ | Синтаксис валиден |
| `npm run phones` без аргументов | ✅ | Печатает usage и выходит с кодом 1 |
| `node -e "require('./package.json')"` | ✅ | `package.json` валиден |

---

## Отклонения от ТЗ

Нет отклонений по реализации. Chrome intentionally не запускался в рамках проверки, как указано в acceptance.

---

## Открытые вопросы для Claude

Нет.

---

## Что НЕ сделано (если статус ⚠️ или ❌)

Ничего.

---

## Подсказки для ревью

- Обратить внимание на `scripts/dev-phones.sh`: `--user-data-dir` указывает на стабильные профили `~/.cache/party-phones/phone-<i>`, поэтому localStorage и guest id сохраняются между QA-сессиями.
- Build failure выглядит инфраструктурным для текущего sandbox: ошибка возникает внутри Turbopack при обработке CSS и попытке создать процесс/биндить порт.
