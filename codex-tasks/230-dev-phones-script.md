# TASK-230: Скрипт «виртуальные телефоны» для локального QA

## Контекст

Пользователь тестирует мультиплеерные игры с реального телефона (сканирует QR,
подключается к комнате) — это медленно. Нужен dev-инструмент: одна команда
открывает N окон Chrome размером с iPhone, каждое — **отдельный игрок**
(отдельный браузерный профиль = отдельный localStorage = отдельный guest id),
все сразу на странице join комнаты. Пользователь прокликивает игры мышкой
с MacBook.

Ключевое требование: идентичность гостя живёт в `localStorage`
(`party-hub-join-guest-id`), поэтому каждое окно ДОЛЖНО иметь свой
`--user-data-dir`. Вкладки/iframe одного профиля не подходят.

## Что сделать

### 1. Новый файл `scripts/dev-phones.sh`

Bash-скрипт для macOS. Использование:

```
npm run phones -- <ROOMCODE> [N]
```

- `<ROOMCODE>` — обязательный, код комнаты (6 символов). Если не передан —
  напечатать usage и выйти с кодом 1.
- `[N]` — количество телефонов, по умолчанию `2`, максимум `6` (если больше —
  clamp до 6 с предупреждением).

Поведение:

- `BASE_URL` — `http://localhost:3000`, переопределяется env-переменной
  `PHONES_BASE_URL` (на случай другого порта).
- Код комнаты привести к UPPERCASE (`tr '[:lower:]' '[:upper:]'`).
- Chrome binary: `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`.
  Если не существует — понятная ошибка («Google Chrome not found») и exit 1.
- Профили: `$HOME/.cache/party-phones/phone-<i>` (mkdir -p). Профили
  ПЕРЕИСПОЛЬЗУЮТСЯ между запусками — это фича: у каждого «телефона» стабильный
  guest id и никнейм между сессиями QA.
- Для каждого i из 1..N запустить Chrome напрямую (не через `open`), в фоне:

```bash
"$CHROME" \
  --user-data-dir="$PROFILE_DIR" \
  --no-first-run --no-default-browser-check \
  --window-size=390,844 \
  --window-position=$X,$Y \
  --app="$BASE_URL/join/$CODE" \
  >/dev/null 2>&1 &
```

  - `--app=` даёт окно без табов/адресной строки — выглядит как телефон.
  - Раскладка сеткой: `X = 20 + (i-1) % 4 * 410`, `Y = 40 + (i-1) / 4 * 880`
    (целочисленная арифметика bash).
- После запуска напечатать сводку: сколько окон открыто, URL, подсказку
  «Закрыть все: pkill -f party-phones».
- `disown` фоновые процессы, чтобы скрипт сразу завершался, а окна жили.

### 2. `package.json`

Добавить в `scripts`:

```json
"phones": "bash scripts/dev-phones.sh"
```

## Whitelist файлов (трогать ТОЛЬКО эти)

- `scripts/dev-phones.sh` (новый)
- `package.json` (одна строка в scripts)

ЗАПРЕЩЕНО трогать: `CLAUDE.md`, `AGENTS.md`, `.codex/**`, `codex-tasks/**`,
`src/**`, `server.mts` — задача НЕ требует изменений production-кода приложения.

## Acceptance

- `bash -n scripts/dev-phones.sh` проходит (синтаксис валиден).
- `npm run phones` без аргументов печатает usage и выходит с кодом 1.
- Скрипт исполняемый по логике (запускать Chrome в рамках проверки НЕ нужно).
- `package.json` остаётся валидным JSON (`node -e "require('./package.json')"`).

## Отчёт

`codex-reports/230-dev-phones-script.md`: что сделано, как проверено. Не коммитить.
