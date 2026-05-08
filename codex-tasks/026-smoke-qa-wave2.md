# TASK-026: Smoke QA после Волн 1 и 2

> **Метаданные**
> - **Дата создания:** 2026-05-07
> - **Сложность:** complex (нужен запущенный сервер)
> - **Запуск:** manual by user (Codex Desktop)
> - **Ожидаемое время Codex:** ~15 минут
> - **Зависит от тасков:** TASK-024 (`3e00efd`), TASK-025 (`c92cd96`)

---

## Цель

Убедиться, что после lint-правок Волн 1 и 2 приложение не сломалось:
все game-routes отдают 200, сервер стартует без ошибок, socket.io endpoint
работает. Это smoke-тест — **не геймплей, только HTTP/process-level**.

Геймплей (mafia day timer, quiz auto-reveal) проверит Claude отдельно через
browser-automation. Твоя задача — поймать грубые регрессии (import error,
compile crash, missing module, server crash on startup).

---

## Файлы к изменению (whitelist)

**Codex не правит код в этом таске.** Только читает, запускает, собирает
доказательства.

Единственный writable файл:
- `codex-reports/026-smoke-qa-wave2.md` — отчёт.

---

## Шаги

### 1. Build + type-check (быстрая проверка)

```bash
npx tsc --noEmit 2>&1 | tail -5
npm run build 2>&1 | tail -10
```

Ожидание: оба без errors (warnings из Next.js ok).

### 2. Запустить dev-сервер в фоне

```bash
npm run dev > /tmp/dev-server.log 2>&1 &
DEV_PID=$!
echo "Server PID: $DEV_PID"
sleep 8  # ждём пока Turbopack соберётся
```

### 3. Проверить логи запуска

```bash
cat /tmp/dev-server.log
```

Ожидание:
- Строки вида `✓ Ready in ...ms` или `▲ Next.js`.
- **Нет** `Error:`, `Cannot find module`, `SyntaxError`, `ReferenceError` при
  старте (кроме известного `location is not defined` — это SSG-время, не runtime).

### 4. Smoke HTTP-запросы

Дёрнуть все ключевые routes. Для каждого: записать статус (200/404/500/другой).

```bash
BASE="http://localhost:3000"

for path in \
  "/ru" \
  "/en" \
  "/ru/design-tokens" \
  "/socket.io/?EIO=4&transport=polling"; do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE$path")
  echo "$STATUS  $path"
done
```

Ожидание: `/ru` и `/en` → 200, `/socket.io/...` → 200 (socket.io handshake),
`/design-tokens` → 200.

### 5. Game pages — статический рендер (SSR/SSG smoke)

```bash
BASE="http://localhost:3000"

ROOM="testroom"
for game in alias crocodile mafia quiz hundred-to-one spy who-am-i; do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/ru/game/$ROOM/$game")
  echo "$STATUS  /game/$ROOM/$game"
done

# TV routes
for game in alias crocodile mafia quiz hundred-to-one spy who-am-i; do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/ru/tv/$ROOM/$game")
  echo "$STATUS  /tv/$ROOM/$game"
done

# Lobby
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/ru/lobby/$ROOM")
echo "$STATUS  /lobby/$ROOM"
```

Ожидание: все 200 (Next.js рендерит страницу, даже если room не существует —
это клиентское состояние).

**Допустимо:** 200 с пустым roomId redirect или 404 если Next.js не нашёл route.
**Недопустимо:** 500 (server error), process crash, timeout > 5s.

### 6. Проверить логи сервера после запросов

```bash
cat /tmp/dev-server.log | grep -i "error\|exception\|crash\|fatal" | grep -v "Proxy error"
```

Ожидание: пустой вывод (нет ошибок).

### 7. Остановить сервер

```bash
kill $DEV_PID 2>/dev/null || pkill -f "tsx server.mts" 2>/dev/null
echo "Server stopped"
```

### 8. Итоговый lint-счётчик (для протокола)

```bash
npm run lint 2>&1 | tail -3
```

Записать в отчёт.

---

## Acceptance criteria

- [ ] `tsc --noEmit` без errors.
- [ ] `npm run build` успешен (exit 0).
- [ ] Dev-сервер стартует без ошибок в логах.
- [ ] `/ru` и `/en` → 200.
- [ ] `/socket.io/?EIO=4&transport=polling` → 200.
- [ ] Все 7 game-routes (`/game/testroom/<game>`) → 200 (не 500).
- [ ] Все 7 TV-routes → 200 (не 500).
- [ ] В логах сервера нет `Error:` / `SyntaxError` / `Cannot find module`
      (кроме known `location is not defined`).
- [ ] `npm run lint` → 11 problems (не больше).

---

## Ограничения

- **Не правь код.** Если что-то сломано — зафиксируй в отчёте и оставь
  Claude/юзеру.
- Порт 3000 может быть занят с прошлой сессии. Если `npm run dev` не стартует:
  ```bash
  lsof -ti:3000 | xargs kill -9 2>/dev/null
  sleep 2
  npm run dev > /tmp/dev-server.log 2>&1 &
  ```
- `ReferenceError: location is not defined` в build/dev логах — **known issue**,
  не считается ошибкой. Фиксируй как «known» в отчёте.
- Если тест для конкретного route даёт 404 (не 500) — это скорее
  routing-особенность Next.js, не регрессия. Зафиксируй, не блокирует.

---

## Контрольные точки для самопроверки Codex

1. Таблица статусов для всех 16 routes (7 game + 7 TV + `/ru` + `/socket.io`).
2. Скриншот / вывод `cat /tmp/dev-server.log` с первыми 30 строками.
3. Вывод `npm run lint 2>&1 | tail -3`.
4. Сервер **остановлен** после тестов (kill).
5. Заполнить отчёт `codex-reports/026-smoke-qa-wave2.md`.
6. **Не коммить.** Claude проверяет и коммитит.
