# TASK-266 — package.json: добавить `npm run icon-mask`

## Цель

Добавить npm-скрипт для запуска `scripts/icon-mask.mjs` (генерация бежевой
альфа-маски из line-art референса), чтобы перегенерация была командой, а не
`node scripts/...` вручную.

## Whitelist файлов

- `package.json` — только секция `scripts`
- `codex-reports/266-npm-script-icon-mask.md` — **отчёт (писать СЮДА разрешено)**

## Изменение

В `package.json` в объект `scripts`, рядом с `chroma-key`, добавить строку:

```json
"icon-mask": "node scripts/icon-mask.mjs"
```

Сохранить корректный JSON (запятые). Остальное не трогать.

## Acceptance

- `npm run icon-mask` существует и валиден (JSON не сломан).
- `git diff package.json` — только добавление строки `icon-mask`.
- НЕ коммитить. Отчёт → `codex-reports/266-npm-script-icon-mask.md`.
