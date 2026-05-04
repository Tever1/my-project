# REPORT TASK-005: Удалить белый фон с иконок игр

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-05-03 11:20
> - **Финиш:** 2026-05-03 11:27
> - **Длительность:** 7 минут
> - **Статус:** ✅ done

---

## Резюме (TL;DR)

Создан `scripts/strip-bg.mjs`: он находит PNG в `public/icons/games/`, исключает `*.bak.png`, через `sharp` переводит изображение в RGBA raw-buffer и делает пиксели с `R/G/B >= 240` прозрачными. В `package.json` добавлен script `strip-bg`; PNG, зависимости и другие файлы не менялись.

---

## Что сделано

### Изменённые файлы

- `package.json` — добавлен script `"strip-bg": "node scripts/strip-bg.mjs"` в секцию `"scripts"`.

### Новые файлы

- `scripts/strip-bg.mjs` — ESM-скрипт для in-place обработки game icon PNG через `sharp`, с логом `<filename>: <NxM> RGB -> RGBA, X pixels stripped` и финальным `Done. N files processed.`

### Удалённые файлы

- (нет)

---

## Diff stat

```
 package.json | 3 ++-
 1 file changed, 2 insertions(+), 1 deletion(-)
 /dev/null => scripts/strip-bg.mjs | 63 +++++++++++++++++++++++++++++++++++++++
 1 file changed, 63 insertions(+)
```

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `git pull` | ❌ | Sandbox blocked `.git/FETCH_HEAD`: `Operation not permitted`. |
| `npm run lint` | ⚠️ | Запуск выполнен; ESLint завершился с 73 уже существующими проблемами вне whitelist. Новых сообщений по `package.json` или `scripts/strip-bg.mjs` нет. |
| `node --check scripts/strip-bg.mjs` | ✅ | Синтаксис OK; скрипт не выполнялся. |
| `npm run build` | ⏭️ | Не запускался по ТЗ: "npm run build не запускать". |
| `node scripts/strip-bg.mjs` | ⏭️ | Не запускался по прямому запрету пользователя и ТЗ. |
| Acceptance #1: `npm run lint` без новых ошибок | ⚠️ | Общий lint падает на существующих файлах; новые/изменённые файлы в ошибках не фигурируют. |
| Acceptance #2: script запускается без ошибок | ⏭️ | Должен проверить Claude после установки `sharp`; Codex скрипт не запускал. |
| Acceptance #3/#4: `mafia.png`/`quiz.png` становятся RGBA | ⏭️ | Не проверялось, потому что скрипт не запускался и PNG нельзя менять руками. |
| Acceptance #5: визуально иконки сохранились | ⏭️ | Проверит Claude через preview-сервер после запуска скрипта. |
| Acceptance #6: package script добавлен | ✅ | `"strip-bg": "node scripts/strip-bg.mjs"` добавлен, остальные scripts сохранены. |

---

## Отклонения от ТЗ

- `git pull` был выполнен, но не смог завершиться из-за sandbox-ограничения на запись/доступ к `.git/FETCH_HEAD`.
- `npm run lint` запущен по ТЗ, но общий lint сейчас падает на существующих ошибках вне whitelist; в новых изменениях ошибок не найдено.

---

## Открытые вопросы для Claude

нет

---

## Что НЕ сделано (если статус ⚠️ или ❌)

---

## Подсказки для ревью

- Обрати внимание на `scripts/strip-bg.mjs`: запись сделана через `readFile` -> `sharp(buffer)` -> `toBuffer()` -> `writeFile(file)`, чтобы избежать проблем `sharp` с одинаковым input/output path.
- Порог белого захардкожен как `240`, как указано в ТЗ.
