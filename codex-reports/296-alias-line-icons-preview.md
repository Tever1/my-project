# REPORT TASK-296: Угадай слово (Alias): плоские line-иконки + превью на /design-tokens

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-06-25 21:42
> - **Финиш:** 2026-06-25 21:44
> - **Длительность:** 2 минуты
> - **Статус:** ✅ done

---

## Резюме (TL;DR)

Создан общий SVG-компонент `AliasIcon` с 12 line-иконками и добавлен preview-блок на `/design-tokens` после блока Шпиона. В игру Alias, TV и CSS ничего не внедрялось.

---

## Что сделано

### Изменённые файлы

- `src/app/design-tokens/page.tsx` — добавлены inline-renderers для 12 Alias-иконок, розовые preview-панели и вызов `<AliasIconPreview />` после `SpyIconPreview`.

### Новые файлы

- `src/components/games/AliasIcon.tsx` — новый общий компонент, экспортирует `AliasIcon` и `AliasIconName`.
- `codex-reports/296-alias-line-icons-preview.md` — отчёт по задаче.

### Удалённые файлы

- (нет)

---

## Diff stat

```
 src/app/design-tokens/page.tsx             | 145 +++++++++++++++++++++++++++++++++++++++++
 src/components/games/AliasIcon.tsx         |  94 +++++++++++++++++++++++++
 codex-reports/296-alias-line-icons-preview.md | created
```

Примечание: в worktree до старта уже были изменения `src/app/game/[roomId]/alias/page.tsx` и файлы TASK-295. Я их не трогал.

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `npx tsc --noEmit` | ✅ | без ошибок |
| `npm run lint` | ✅ | без ошибок |
| `npm run build` | ⚠️ | Turbopack упал из-за sandbox: `creating new process` / `binding to a port` / `Operation not permitted` при обработке `src/app/globals.css` |
| Acceptance #1 | ✅ | блок «Угадай слово · плоские иконки (превью)» добавлен на `/design-tokens` |
| Acceptance #2 | ✅ | `AliasIcon` + `AliasIconName` экспортируются из нового файла |
| Acceptance #3 | ✅ | `alias/page.tsx`, TV и игровые эмодзи не изменялись |

---

## Отклонения от ТЗ

Нет отклонений по реализации. `npm run build` дополнительно запускался по workflow, но не завершился из-за ограничения окружения, не из-за кода задачи.

---

## Открытые вопросы для Claude

Нет.

---

## Что НЕ сделано (если статус ⚠️ или ❌)

Не применимо.

---

## Подсказки для ревью

- `src/app/design-tokens/page.tsx:342` — массив `ALIAS_SAMPLE_ICONS` и inline SVG-рендереры.
- `src/app/design-tokens/page.tsx:1140` — preview-блок подключён сразу после `SpyIconPreview`.
- `src/app/design-tokens/page.tsx:1321` — функция `AliasIconPreview`.
- `src/components/games/AliasIcon.tsx:80` — экспорт компонента для будущего внедрения в игру.
