# TASK-232: strip-bg.mjs — принимать папку аргументом

## Контекст

`scripts/strip-bg.mjs` хардкодит `iconsDir = '../public/icons/games'`. Нужно
обработать новый набор иконок в `public/icons/spy/`. Сделать папку
настраиваемой через CLI-аргумент, не ломая текущее поведение по умолчанию.

## Whitelist (трогать ТОЛЬКО это)

- `scripts/strip-bg.mjs`

ЗАПРЕЩЕНО: всё остальное (`package.json`, `CLAUDE.md`, `src/**`, и т.д.).

## Что сделать

В `scripts/strip-bg.mjs` заменить хардкод папки на опциональный CLI-аргумент:

```js
const argDir = process.argv[2];
const iconsDir = argDir
  ? path.resolve(process.cwd(), argDir)
  : path.resolve(__dirname, '../public/icons/games');
```

Поведение:
- `node scripts/strip-bg.mjs` → как раньше, `public/icons/games`.
- `node scripts/strip-bg.mjs public/icons/spy` → обрабатывает указанную папку
  (путь резолвится от cwd).

Больше НИЧЕГО не менять: алгоритм flood-fill, пороги, логи, формат вывода —
как есть. **Минимальный diff: не переформатировать и не переупорядочивать
нетронутые строки.**

## Acceptance

- `node -c scripts/strip-bg.mjs` (синтаксис) или запуск без аргумента работает.
- `node scripts/strip-bg.mjs public/icons/spy` обрабатывает spy-папку.

## Отчёт

`codex-reports/232-strip-bg-dir-arg.md`. Не коммитить.
