# TASK-335: Квиз/Крокодил/Alias/Шпион/100 к 1 — телефон запрашивает ресинк состояния (тот же баг зависания, что чинили в «Кто я?»)

> **Метаданные** (заполняет Claude перед стартом)
> - **Дата создания:** 2026-07-12
> - **Сложность:** simple (мехпанический повтор одного и того же паттерна в 5 файлах)
> - **Запуск:** auto by Claude
> - **Ожидаемое время Codex:** ~15 минут
> - **Зависит от тасков:** TASK-333 (тот же паттерн, уже реализован для «Кто я?»)

---

## Цель

В каждой из 5 игр (Квиз, Крокодил, Alias, Шпион, 100 к 1) мобильный экран
игрока при возврате из фона/разблокировки телефона (и при первом монтировании,
если игра уже идёт) сам запрашивает у хоста полное текущее состояние —
вместо того чтобы молча оставаться в устаревшем виде до следующего
случайного broadcast.

---

## Контекст

Тот же баг, что только что починили в «Кто я?» (TASK-333): игра работает
по модели «дельта-broadcast без источника истины» — состояние на клиенте
обновляется через `setState(prev => ...)`, применяя только изменения. Если
телефон на секунду отвалился от сокета (свернули приложение / заблокировали
экран — нормальное поведение мобильных браузеров), он **пропускает** один
broadcast и дальше применяет все следующие дельты поверх уже неверной базы —
рассинхрон необратим до конца раунда/игры.

**Хорошая новость:** у всех 5 этих игр (в отличие от «Кто я?» на момент
TASK-333) **уже есть готовый host-side ответчик** на запрос состояния — он
был добавлен раньше для поддержки переподключения TV (см. `TV_STATE_REQUEST`
в `src/app/tv/[roomId]/[gameType]/page.tsx`). Никто из мобильных клиентов
просто никогда не пользуется этим существующим ответчиком — вот и всё,
чего не хватает. Задача **только** добавить сторону "запроса" на телефоне,
ответчик трогать не нужно.

Проверено чтением кода — для каждой игры конкретно:

| Игра | Экшен запроса (уже работает, отвечает host) | Хелпер для отправки, который уже импортирован в файле |
|---|---|---|
| Квиз | `'quiz:request-state'` → отвечает `sendAction('quiz:sync', gameStateRef.current)` | `sendAction = useGameAction(roomId)` (уже есть) |
| Крокодил | `'croc:request-state'` → отвечает `broadcast('croc:state', gameStateRef.current)` | `broadcast = useGameAction(roomId)` (уже есть, это generic emitter несмотря на имя) |
| Alias | `'alias:request-state'` → отвечает `broadcast('alias:state', gameStateRef.current)` | `broadcast = useGameAction(roomId)` (уже есть) |
| Шпион | `'spy:request-state'` → отвечает `broadcast(sRef.current)` (где `broadcast = useGameBroadcast(roomId, 'spy:sync')`) | `sendAction = useGameAction(roomId)` (уже импортирован и используется для `spy:stroke`/`spy:clear`) |
| 100 к 1 | `'h2o:request-state'` → отвечает `broadcast(cur)` (где `cur = sRef.current`, `broadcast = useGameBroadcast(roomId, 'h2o:sync')`) | **нет generic emitter'а — нужно добавить** `useGameAction` (см. шаг 5 ниже) |

---

## Файлы к изменению (whitelist)

- `src/app/game/[roomId]/quiz/page.tsx`
- `src/app/game/[roomId]/crocodile/page.tsx`
- `src/app/game/[roomId]/alias/page.tsx`
- `src/app/game/[roomId]/spy/page.tsx`
- `src/app/game/[roomId]/hundred-to-one/page.tsx`

### НЕ ТРОГАТЬ

- `src/app/tv/[roomId]/[gameType]/page.tsx` — TV-сторона уже всё умеет,
  не трогать.
- `src/app/game/[roomId]/who-am-i/page.tsx`, `src/app/game/[roomId]/mafia/page.tsx` —
  «Кто я?» уже починена (TASK-333), Мафия — отдельный таск (TASK-336),
  не в этом whitelist.
- Хендлеры `case '*:request-state'` / `case 'croc:request-state'` и т.п.
  внутри каждой из 5 игр — они уже правильно отвечают, **не менять их
  логику**, только добавить НОВЫЙ эффект который САМ шлёт запрос.
- `CLAUDE.md`, `AGENTS.md` — обновляет только Claude.

---

## Шаги реализации

Для КАЖДОЙ из 4 игр — Квиз, Крокодил, Alias, Шпион — сделать одно и то же:
добавить `useEffect`, который:
1. Срабатывает один раз при монтировании компонента.
2. Слушает `document.visibilitychange` и при возврате видимости
   (`!document.hidden`) снова шлёт запрос.
3. Отправляет соответствующий `*:request-state` экшен через уже
   существующий в файле хелпер (`sendAction(...)` или `broadcast(...)` —
   см. таблицу выше, у каждой игры своё имя переменной).

Общий шаблон (адаптировать имя экшена и имя хелпера под конкретную игру):

```ts
useEffect(() => {
  sendAction('<prefix>:request-state'); // однократно при монтировании
  const handleVisibilityChange = () => {
    if (!document.hidden) sendAction('<prefix>:request-state');
  };
  document.addEventListener('visibilitychange', handleVisibilityChange);
  return () => {
    document.removeEventListener('visibilitychange', handleVisibilityChange);
  };
}, [sendAction]);
```

Разместить рядом с остальными `useEffect`, которые слушают `game:action`
(сразу после них — по одному месту вставки на файл, не разбрасывать).

### 1. Квиз (`src/app/game/[roomId]/quiz/page.tsx`)
- Хелпер: `sendAction` (уже есть, `useGameAction(roomId)`, строка ~127).
- Экшен: `sendAction('quiz:request-state')`.

### 2. Крокодил (`src/app/game/[roomId]/crocodile/page.tsx`)
- Хелпер: `broadcast` (уже есть, это на самом деле `useGameAction(roomId)`
  несмотря на имя переменной — сигнатура `(action, payload?)`, строка ~116).
- Экшен: `broadcast('croc:request-state')`.

### 3. Alias (`src/app/game/[roomId]/alias/page.tsx`)
- Хелпер: `broadcast` (то же самое — `useGameAction(roomId)`, строка ~190).
- Экшен: `broadcast('alias:request-state')`.

### 4. Шпион (`src/app/game/[roomId]/spy/page.tsx`)
- Хелпер: `sendAction` (уже есть, `useGameAction(roomId)`, строка ~308,
  используется для `spy:stroke`/`spy:clear`).
- Экшен: `sendAction('spy:request-state')`.

### 5. 100 к 1 (`src/app/game/[roomId]/hundred-to-one/page.tsx`) — отличается

Здесь **нет** готового generic-эмиттера — есть только
`broadcast = useGameBroadcast(roomId, 'h2o:sync')`, который всегда шлёт
ФИКСИРОВАННЫЙ экшен `'h2o:sync'`, а нужен экшен `'h2o:request-state'`.

- Добавить импорт `useGameAction` рядом с существующим импортом
  `useGameBroadcast` из `@/lib/use-game-action` (строка ~7).
- Добавить `const sendAction = useGameAction(roomId);` рядом с
  объявлением `broadcast` (строка ~124).
- Тот же `useEffect`-шаблон, что и выше, но с
  `sendAction('h2o:request-state')` вместо `broadcast(...)`.

> Если по ходу выясняется, что в какой-то игре что-то не совпадает с
> описанным выше (например, хелпер называется иначе или отсутствует) —
> остановиться на этой ОДНОЙ игре, задокументировать расхождение в отчёте,
> продолжить с остальными.

---

## Acceptance criteria

- [ ] `npm run lint` без новых ошибок
- [ ] `npx tsc --noEmit` без новых ошибок
- [ ] Во всех 5 файлах есть новый `useEffect` с request-state при
      монтировании + при `visibilitychange`
- [ ] Существующие `case '*:request-state'` хендлеры (host-ответчики) не
      изменены
- [ ] Не затронуты TV-файл, «Кто я?», Мафия, другие production-файлы

---

## Контрольные точки для самопроверки Codex

Перед тем как считать таск выполненным, Codex должен:

1. Прочитать diff (`git diff --stat` + `git diff`).
2. Убедиться что не вышел за whitelist файлов (ровно 5 файлов).
3. Запустить `npm run lint` и `npm run build` (если Turbopack падает
   из-за sandbox — как в TASK-333/334, дополнительно прогнать
   `npx next build --webpack`, зафиксировать оба результата в отчёте).
4. Заполнить отчёт `codex-reports/335-five-games-mobile-resync-request.md`
   по шаблону `_TEMPLATE.md`.
5. **Не коммитить.** Коммит делает Claude после ревью (или пользователь).

---

## Открытые вопросы для Codex

- Нужен ли phase-гейт (не слать запрос пока игра в лобби/ожидании)? —
  **Нет, не нужно усложнять.** Запрос в лобби безвреден — хост просто
  эхом пришлёт то же самое состояние ожидания. Простота важнее
  микрооптимизации одного лишнего сообщения.
- Что если `sendAction`/`broadcast` ещё не готов при первом рендере
  (сокет не подключился)? — Хелперы уже сами no-op'ят если сокет не
  подключён (см. `emit` в `src/lib/use-socket.ts` — возвращает `false`
  без ошибки), поэтому дополнительных проверок готовности не нужно.
