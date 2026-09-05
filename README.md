# Party Games Hub

Realtime-хаб вечериночных игр: общий TV создаёт комнату, игроки подключаются с
телефонов по коду/QR и получают персональные экраны.

## Current games

Quiz, 100 к 1, Crocodile, Spy, Mafia, Who Am I и Alias («Угадай слово»).

## Development

```bash
npm install
npm run dev
```

Приложение и Socket.io запускаются custom server на
`http://localhost:3000`. Для независимых тестовых телефонов:

```bash
npm run phones -- ROOM_CODE 4
```

Основные проверки:

```bash
npx tsc --noEmit
npm run lint
npm run build
```

Не запускайте build одновременно с dev-server: оба используют `.next`.

## Project context

Перед разработкой прочитайте:

1. [`AGENTS.md`](./AGENTS.md) — обязательные правила репозитория;
2. [`PROJECT_CONTEXT.md`](./PROJECT_CONTEXT.md) — актуальная архитектура и
   принятые продуктовые решения;
3. [`TASKS.md`](./TASKS.md) — текущая работа;
4. [`docs/decisions/`](./docs/decisions/) — причины важных решений.

История предыдущих чатов не требуется. Git хранит историю изменений, а эти
документы описывают только текущее состояние.

## Important runtime facts

- Комнаты хранятся только в памяти Node-процесса и исчезают при рестарте.
- Базы данных и production auth сейчас нет.
- Для production нужен долгоживущий Node runtime с Socket.io.
- `mobile/` — отдельный Expo prototype, не основной актуальный клиент.
