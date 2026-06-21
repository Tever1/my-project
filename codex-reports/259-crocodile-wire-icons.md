# REPORT TASK-259: Крокодил — заменить эмодзи на иконки

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-06-17 20:49
> - **Финиш:** 2026-06-17 20:53
> - **Длительность:** 4 минуты
> - **Статус:** ✅ done

---

## Резюме (TL;DR)

Эмодзи Крокодила в мобильном экране и в CROCODILE TV RENDER заменены на PNG-иконки из `public/icons/crocodile/`. Добавлен локальный `CrocIcon` helper в оба whitelisted файла; build не запускался по ТЗ.

---

## Что сделано

### Изменённые файлы

- `src/app/game/[roomId]/crocodile/page.tsx` — добавлен `CrocIcon`; заменены crocodile/mic/talk/trophy эмодзи и `GameLayout icon` переведён на PNG path.
- `src/app/tv/[roomId]/[gameType]/page.tsx` — добавлен `CrocIcon`; в блоке CROCODILE TV RENDER заменены crocodile/crown/trophy/medal эмодзи на иконки.

### Новые файлы

- `codex-reports/259-crocodile-wire-icons.md` — отчёт по задаче.

### Удалённые файлы

- (нет)

---

## Diff stat

```
src/app/game/[roomId]/crocodile/page.tsx | 371 ++++++++++++++++++-------------
src/app/tv/[roomId]/[gameType]/page.tsx  | 223 ++++++++++++++-----
2 files changed, 388 insertions(+), 206 deletions(-)
```

Примечание: stat включает уже существующие незакоммиченные изменения в этих файлах до TASK-259; мои правки ограничены добавлением `CrocIcon` и заменами эмодзи из ТЗ.

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `npm run lint` | ✅ | — |
| `npx tsc --noEmit` | ✅ | — |
| `npm run build` | ⏭️ | Не запускал по ТЗ |
| Acceptance: только whitelisted production files | ✅ | Production-правки только в двух whitelisted файлах |
| Acceptance: эмодзи Крокодила заменены | ✅ | `grep` по мобильному файлу и CROCODILE TV RENDER не нашёл перечисленных эмодзи |

---

## Отклонения от ТЗ

нет отклонений.

---

## Открытые вопросы для Claude

нет.

---

## Что НЕ сделано (если статус ⚠️ или ❌)

—

---

## Подсказки для ревью

- В рабочем дереве до старта уже были незакоммиченные изменения вне TASK-259: `src/app/design-tokens/page.tsx`, `src/app/globals.css`, `src/components/ui/PlayerAvatar.tsx`, а также большие текущие изменения в двух whitelisted файлах.
- В TV-файле намеренно не трогал эмодзи в других игровых блоках.
