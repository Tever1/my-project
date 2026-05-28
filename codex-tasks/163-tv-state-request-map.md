# TASK-163 — Заменить if-else цепочку в TV на маппинг gameType → requestAction

## Контекст

Аудит TASK-158 (кандидат 3 — TV reconnect). В TV-странице после `tv:join`
идёт if-else цепочка (~строки 193-201), которая выбирает `request-state`
action по `gameType`:

```ts
if (gameType === 'hundred-to-one') {
  sendAction('h2o:request-state');
} else if (gameType === 'crocodile') {
  sendAction('croc:request-state');
} else if (gameType === 'alias') {
  sendAction('alias:request-state');
} else if (gameType === 'quiz') {
  sendAction('quiz:request-state');
}
```

Добавление новой игры с TV state sync — правка в двух местах: здесь и в
соответствующей game-странице. Вынесем маппинг в константу, чтобы TV-сторона
правилась в одном месте.

На game-странице `request-state` обрабатывается внутри каждого
`game:action` switch — это игроспецифичная логика, трогать не нужно.

## Whitelist файлов

**Изменить:**
- `src/app/tv/[roomId]/[gameType]/page.tsx`

**Создать:**
- `codex-reports/163-tv-state-request-map.md`

**НЕЛЬЗЯ трогать:** всё остальное.

---

## Что сделать

В `src/app/tv/[roomId]/[gameType]/page.tsx`:

**1. Добавить константу в топ файла** (после импортов, до компонента):

```ts
/** Maps gameType to the action that requests a full state broadcast from the host. */
const TV_STATE_REQUEST: Partial<Record<string, string>> = {
  'hundred-to-one': 'h2o:request-state',
  crocodile: 'croc:request-state',
  alias: 'alias:request-state',
  quiz: 'quiz:request-state',
};
```

**2. Заменить if-else** (~строки 193-201) на:
```ts
const requestAction = TV_STATE_REQUEST[gameType];
if (requestAction) sendAction(requestAction);
```

Это полная замена 8 строк на 2.

---

## Acceptance

```bash
# Ноль if-else цепочек с request-state в TV
grep -n "request-state" src/app/tv/[roomId]/[gameType]/page.tsx
# → только строки с TV_STATE_REQUEST записями и sendAction(requestAction)

npm run lint     # ✅
npx tsc --noEmit # ✅
```

## Отчёт

В `codex-reports/163-tv-state-request-map.md`:
- diff изменения
- результаты grep и lint/tsc

Не коммить, не пушить.
