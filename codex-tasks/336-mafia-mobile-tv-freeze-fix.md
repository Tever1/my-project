# TASK-336: Мафия — исправить зависание телефонов/TV (та же дыра, что была в «Кто я?», TASK-333)

> **Метаданные** (заполняет Claude перед стартом)
> - **Дата создания:** 2026-07-12
> - **Сложность:** complex
> - **Запуск:** manual by user (Codex Desktop)
> - **Ожидаемое время Codex:** ~15 минут
> - **Зависит от тасков:** TASK-333 (тот же паттерн, уже реализован для «Кто я?»)

---

## Цель

Мафия должна переживать пропущенный broadcast (телефон свернули/разлочили,
TV переподключился) так же, как теперь умеет «Кто я?» — любой клиент
(телефон или TV) запрашивает у хоста полное текущее состояние и получает
его.

---

## Контекст

Тот же класс бага, что чинили в TASK-333 для «Кто я?»: Мафия работает по
модели «дельта-broadcast без источника истины» через
`useGameBroadcast(roomId, 'mafia')`, каждое действие применяется как
инкремент поверх `prev`. Пропущенный broadcast (телефон свернули на
несколько секунд — нормальное поведение мобильных браузеров) навсегда
рассинхронивает клиента. Мафия — самая уязвимая из всех 7 игр: в отличие
от Квиза/Крокодила/Alias/Шпиона/100 к 1, у неё **нет вообще никакого**
механизма ресинхронизации — ни для TV (не входит в `TV_STATE_REQUEST` в
`src/app/tv/[roomId]/[gameType]/page.tsx`), ни для телефона.

**Хорошая новость:** заготовка уже наполовину есть, как и было в «Кто я?»
до TASK-333 — мёртвый код, который никто не вызывает:
- В `src/app/game/[roomId]/mafia/page.tsx` тип `GameAction` уже содержит
  `{ type: 'sync-state'; state: MafiaGameState }` (строка ~41), и
  обработчик `case 'sync-state': setGs(payload.state); ...` (строка ~193)
  **уже реализован и работает** — просто его никто никогда не вызывает.
  Не нужно ничего менять в этом кейсе, только добавить недостающую
  половину: тип `request-state` + host-ответчик + инициаторов запроса.

Референс реализации — TASK-333 (`codex-reports/333-whoami-mobile-tv-freeze-fix.md`
и diff в `src/app/game/[roomId]/who-am-i/page.tsx` /
`src/app/tv/[roomId]/[gameType]/page.tsx`) — Мафия использует ТОЧНО ТАКОЙ
ЖЕ паттерн единого action-канала (`useGameBroadcast(roomId, 'mafia')`,
`payload.type` вместо отдельных `mafia:xxx` экшенов), так что решение
почти дословно переносится.

---

## Файлы к изменению (whitelist)

- `src/app/game/[roomId]/mafia/page.tsx` — мобильный экран: добавить
  `request-state` в `GameAction`, `gsRef`, host-only ответчик, запрос при
  монтировании (если игра уже не в лобби) + при `visibilitychange`.
- `src/app/tv/[roomId]/[gameType]/page.tsx` — TV-экран: специальная ветка
  в `tv:join`-callback для `gameType === 'mafia'` (по образцу уже
  существующей ветки для `who-am-i`) + обработка входящего `sync-state`
  для перевода полного `MafiaGameState` в локальный узкий `mafiaState`.

### НЕ ТРОГАТЬ

- `server.mts` / `src/server/socket-handlers.mts` — общий relay уже
  универсален, ничего менять не нужно.
- Другие игры (`who-am-i`, `quiz`, `crocodile`, `alias`, `spy`,
  `hundred-to-one`) — не трогать, у них либо уже всё работает
  (`who-am-i` после TASK-333), либо это отдельный таск (TASK-335).
- `CLAUDE.md`, `AGENTS.md` — обновляет только Claude.

---

## Шаги реализации

### 1. `src/app/game/[roomId]/mafia/page.tsx`

- Добавить в `GameAction` (рядом с уже существующим `sync-state`, строка
  ~41) новый вариант: `{ type: 'request-state' }`.
- Завести `gsRef` (`useRef<MafiaGameState>`), синхронизировать с `gs` в
  отдельном `useEffect` (`gsRef.current = gs`) — точно как в `who-am-i/page.tsx`
  после TASK-333.
- В `switch (payload.type)` (там же, где уже есть `case 'sync-state'`)
  добавить:
  ```ts
  case 'request-state':
    if (isGameHost) {
      broadcast({ type: 'sync-state', state: gsRef.current });
    }
    break;
  ```
- Добавить `useEffect`, который вызывает `broadcast({ type: 'request-state' })`:
  - один раз при монтировании, если `gs.phase !== 'lobby'` (игра уже
    идёт — так же, как в `who-am-i`);
  - при возврате видимости вкладки (`document.visibilitychange`,
    `!document.hidden`), тоже с проверкой `gsRef.current.phase !== 'lobby'`.
- Убедиться, что зависимость `useEffect` со `switch (payload.type)`
  включает `isGameHost` и `broadcast` (в файле уже есть похожий фикс от
  прошлой сессии — deps `[on, isGameHost, effectivePlayerId]`, строка
  ~312 — добавить туда `broadcast`, если его там ещё нет, иначе
  `case 'request-state'` будет использовать протухший `isGameHost`/`broadcast`
  из первого рендера).

### 2. `src/app/tv/[roomId]/[gameType]/page.tsx`

- В блоке `tv:join` callback (там же, где уже есть специальная ветка
  `if (gameType === 'who-am-i') { sendAction('who-am-i', { type: 'request-state' }); }`
  после TASK-333) — добавить аналогичную ветку:
  ```ts
  } else if (gameType === 'mafia') {
    sendAction('mafia', { type: 'request-state' });
  }
  ```
- В обработчике `if (action === 'mafia') { const mp = ...; switch (mp.type) { ... } }`
  (строка ~546) добавить новый `case 'sync-state':`, который переводит
  полный `MafiaGameState` (`mp.state` — привести тип, там уже есть поля
  `phase, alive, eliminated, winner`, плюс приватные `roles`/`mafiaVotes`/
  `detectiveCheck`/`votes` которые TV-состоянию не нужны) в локальный
  `mafiaState`:
  ```ts
  case 'sync-state': {
    const state = mp.state as {
      phase: string;
      alive: string[];
      eliminated: { id: string; role: string }[];
      winner: string | null;
      round: number;
    };
    setMafiaState({
      phase: state.phase === 'voting' ? 'day' : state.phase,
      alive: state.alive,
      eliminated: state.eliminated.map((e) => ({ id: e.id })),
      lastEvent: '', // не проговариваем задним числом пропущенное событие
      winner: state.winner,
      round: state.round,
    });
    break;
  }
  ```
  Обновить деструктуризацию `mp` в начале блока (`const mp = payload as
  { type: string; ...; state?: unknown }`), чтобы включить `state`.

### 3. Sanity-check

- Приватные поля (`roles`, `mafiaVotes`, `detectiveCheck`, `votes`) уже и
  так уходят на все сокеты в комнате (включая TV) через существующий
  `assign-roles`/`mafia-vote` broadcast — это не новая утечка, TV просто
  исторически не сохраняет их в своём `mafiaState`. Ничего дополнительно
  скрывать не нужно, просто не копировать эти поля в TV-стейт (см. шаг 2).

> Если по ходу выясняется, что нужен дополнительный шаг или другой файл —
> остановиться, написать в отчёт, вернуть управление Claude.

---

## Acceptance criteria

- [ ] `npm run lint` без новых ошибок
- [ ] `npx tsc --noEmit` без новых ошибок
- [ ] Хост (`isGameHost === true`) отвечает на `request-state` полным
      `sync-state`
- [ ] Телефон, вернувшийся из фона во время идущей игры
      (`gs.phase !== 'lobby'`), сам запрашивает состояние
- [ ] TV при подключении к уже идущей игре «Мафия» получает актуальное
      состояние и корректно его отображает (без приватных полей ролей)
- [ ] Остальные 6 игр не затронуты (whitelist соблюдён)

---

## Контрольные точки для самопроверки Codex

Перед тем как считать таск выполненным, Codex должен:

1. Прочитать diff (`git diff --stat` + `git diff`).
2. Убедиться что не вышел за whitelist файлов.
3. Запустить `npm run lint` и `npm run build` (если Turbopack падает
   из-за sandbox — прогнать `npx next build --webpack` дополнительно,
   как в TASK-333/334/335).
4. Заполнить отчёт `codex-reports/336-mafia-mobile-tv-freeze-fix.md` по
   шаблону `_TEMPLATE.md`.
5. **Не коммитить.** Коммит делает Claude после ревью (или пользователь).

---

## Открытые вопросы для Codex

- Нужно ли восстанавливать `lastEvent` (человекочитаемое описание
  последнего события) при ресинке на TV? — **Нет**, оставить пустой
  строкой — это чисто косметическая подпись последнего события, не
  критичная часть состояния, и её реконструкция задним числом не нужна.
- Что если `isGameHost` сам пропустил broadcast? — Не блокирует этот
  таск, тот же ответ, что и в TASK-333 — edge case для отдельного тика
  при необходимости.
- Нужно ли трогать `TV_STATE_REQUEST` карту? — **Нет**, у Мафии (как и у
  «Кто я?») единый action-канал `'mafia'` с типом внутри `payload.type`,
  не подходит под схему этой карты — делать отдельную ветку, как описано
  в шаге 2.
