# AGENTS.md update proposal

> Текущий корневой `AGENTS.md` защищён собственными правилами и принадлежит
> Claude. Codex не имеет права применить этот текст самостоятельно. Владелец
> должен использовать этот документ как замену/сжатие долговременной части
> `AGENTS.md`, сохранив необходимые правила командного workflow.

## Project overview

Party Games Hub — realtime web-хаб вечериночных игр. Общий TV создаёт комнату,
игроки подключаются телефонами по QR/коду. Основные части: lobby/room,
мобильные игровые экраны, общий TV, Socket.io server, локальная admin-панель и
preview-страницы дизайна.

## Tech stack

- Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4.
- Custom Node HTTP server + Socket.io 4 (`server.mts`).
- Локальный i18n ru/en, Geist, Framer Motion, собственные UI-компоненты.
- Базы данных нет; комнаты находятся в памяти процесса.
- Production deployment не настроен; требуется долгоживущий Node runtime.
- `mobile/` — отдельный отстающий Expo prototype, не основной клиент.

## Repository structure

- `src/app/game/[roomId]/*` — mobile game flow и host-side game logic.
- `src/app/tv/[roomId]/[gameType]` — TV всех игр.
- `src/components/lobby` — room/lobby UX.
- `src/server`, `server.mts` — realtime room server.
- `src/lib`, `src/types` — hooks, identity, data, shared types.
- `src/app/*-design-preview` — визуальные эталоны, не production logic.
- `src/app/admin`, `src/app/api/admin` — local admin tools.
- `PROJECT_CONTEXT.md`, `TASKS.md`, `docs/decisions` — канонический текущий
  контекст. Git — история.

## Development principles

- Перед изменением существующего flow изучить его реализацию и события.
- Предпочитать минимальные точечные изменения; не переписывать рабочую
  подсистему без необходимости.
- Сохранять совместимость протокола, reconnect и privacy.
- Не добавлять зависимость, если достаточно существующих компонентов/utilities.
- Не дублировать существующую abstraction или реализацию.
- Исправлять первопричину, а не маскировать симптом.
- Не менять unrelated code и не делать opportunistic refactor.
- Сохранять чужие незакоммиченные изменения; сначала смотреть `git status` и
  scoped diff.
- Не коммитить и не пушить без явной команды пользователя.
- Сохранять последовательные номера `TASK-NNN` и отдельные отчёты в
  `codex-reports/`; следующий номер брать из `TASKS.md`/handoff.

## UI / UX rules

- Принятые production designs не переосмысливать:
  - Mafia — «Закрытый клуб»;
  - Spy — «Оперативный центр» с production-deltas из `PROJECT_CONTEXT.md`;
  - Alias — «Карточная мастерская».
- Для нового редизайна: изучение → несколько preview-концепций → полный
  real-size mobile+TV flow → явное утверждение → production.
- Сохранять размеры, пропорции, композицию, privacy и утверждённые анимации.
- Mobile-first; TV проектировать отдельно под 1920×1080.
- Production UI всегда ru/en; internal preview может быть только ru.
- Не запускать browser QA без явного запроса пользователя.
- «КОД — N телефонов» означает N видимых отдельных Chrome-окон 390×844 с
  независимыми профилями.

## Game architecture rules

- Server authoritative для room membership, owner/host, start/end и permission
  checks; game host client ведёт большую часть game state и broadcast.
- Reconnect/TV обязаны использовать full-state request/sync; live-events
  недостаточны.
- Owner, phone game host, TV и Mafia moderator — разные роли; не объединять.
- TV не раскрывает приватные роли/слова/голоса.
- Mafia имеет обязательного moderator и последовательную ночь из ADR-004.
- При добавлении action проверять actor identity и host permissions на server.
- Рестарт сервера уничтожает комнаты; не обещать persistence.

## Safety rules for changes

- Не редактировать `CLAUDE.md`, `.codex/**`, `codex-tasks/**`; `AGENTS.md`
  меняет только владелец.
- Не трогать approved preview/design assets без явной задачи.
- Не менять Alias classic scoring при работе над letter mode и наоборот.
- Не раскрывать секретные game data на TV/DOM раньше положенного.
- Не запускать build параллельно с dev-server из-за общего `.next`.
- Admin/auth не считать production-secure.

## Verification

Для существенной задачи по возможности:

1. проверить scoped diff и `git diff --check`;
2. выполнить `npx tsc --noEmit`;
3. выполнить scoped ESLint или `npm run lint`;
4. выполнить build, если dev-server остановлен и это разумно;
5. проверить затронутый пользовательский сценарий, но browser/multiplayer QA
   запускать только по явному запросу пользователя;
6. точно сообщить, что выполнялось, а что нет.

Не заявлять о тесте, который не запускался.

## Context loading

Перед существенной задачей прочитать:

- `AGENTS.md`;
- `PROJECT_CONTEXT.md`;
- `TASKS.md`;
- релевантные файлы из `docs/`, прежде всего ADR.

История предыдущих Codex-чатов не является источником истины.

## Context maintenance

После существенной задачи:

1. обновить `PROJECT_CONTEXT.md`, только если существенно изменились product
   state, architecture, approved behavior или constraints;
2. обновить `TASKS.md`;
3. создать/обновить ADR только для важного долговременного решения;
4. удалить устаревшую информацию.

Не превращать документы в chronological changelog. Git хранит историю.
