# REPORT TASK-264: Крокодил — иконка из референса как CSS-маска

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-06-20 19:27
> - **Финиш:** 2026-06-20 19:35
> - **Длительность:** 8 минут
> - **Статус:** ✅ done

---

## Резюме (TL;DR)

Создан `scripts/icon-mask.mjs`, который конвертирует `croc-source.jpg` в прозрачный
бежевый `croc-face.png` 256×256. `CrocIcon name="croc"` теперь рендерится как
`<span>` с CSS-маской `/icons/crocodile/croc-face.png`; остальные inline-SVG
иконки не менялись.

---

## Что сделано

### Изменённые файлы

- `src/components/games/CrocIcon.tsx` — `croc` вынесен из `RENDERERS`; добавлен
  ранний возврат `<span>` с `maskImage`/`WebkitMaskImage`, `backgroundColor:
  currentColor` и дефолтным цветом `#f5efe6`.

### Новые файлы

- `scripts/icon-mask.mjs` — конвертер JPG line-art в tinted-alpha PNG через `sharp`.
- `public/icons/crocodile/croc-face.png` — сгенерированная маска 256×256 с альфа-каналом.
- `codex-reports/264-croc-face-mask-icon.md` — этот отчёт.

### Удалённые файлы

- (нет)

---

## Diff stat

```
Scoped TASK-264 status:
?? public/icons/crocodile/croc-face.png
?? scripts/icon-mask.mjs
?? src/components/games/CrocIcon.tsx
?? codex-reports/264-croc-face-mask-icon.md
```

Примечание: в рабочем дереве уже были незакоммиченные/неотслеживаемые изменения
вне TASK-264, поэтому полный `git diff --stat` не является чистым отчётом только
по этой задаче.

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `git pull` | ✅ | Already up to date |
| `node scripts/icon-mask.mjs` | ✅ | `wrote public/icons/crocodile/croc-face.png (source 512x512, bbox 512x394)` |
| PNG metadata | ✅ | 256×256, PNG, 4 channels, `hasAlpha: true` |
| `npx tsc --noEmit` | ✅ | без ошибок |
| `npm run lint` | ✅ | без ошибок |
| Acceptance: CSS-mask croc | ✅ | `name === 'croc'` возвращает `<span>` с `croc-face.png` |
| Acceptance: остальные иконки | ✅ | `mic/talk/trophy/crown/check/medal` остались inline-SVG |
| Acceptance: запрещённые файлы | ✅ | `croc-source.jpg`, `croc.png`, TV-файл, `design-tokens`, `package.json` не редактировал |

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

- Проверь `src/components/games/CrocIcon.tsx`: `croc` теперь отдельная ветка,
  поэтому `RENDERERS[name]` типизирован только для остальных иконок.
- В дереве есть pre-existing изменения вне whitelist TASK-264; я их не трогал.
