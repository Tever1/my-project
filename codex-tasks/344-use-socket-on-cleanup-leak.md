# TASK-344: use-socket — утечка слушателя в cleanup `on()` (корень бага счётчика «Да» 2/3 в «Кто я?»)

**Тип:** simple (1 файл, механическая правка)
**Whitelist:** `src/lib/use-socket.ts`
**НЕ трогать:** все остальные файлы, включая `src/app/game/**`, `server.mts`, `src/server/**`.

---

## Контекст / root cause (диагноз Claude, подтверждён чтением кода)

Баг TASK-329 («один клик „Да" → счётчик сразу 2/3») НЕ был вылечен guard'ом
на отправку — дубль происходит на ПРИЁМЕ:

1. В dev активен React StrictMode (дефолт Next.js App Router): каждый эффект
   проходит цикл mount → cleanup → mount.
2. Cleanup mount-эффекта `useSocket` (`use-socket.ts:33-38`) делает
   `socketRef.current = null`.
3. Cleanup'ы эффектов выполняются в порядке объявления. В игровых страницах
   `useSocket()` вызывается РАНЬШЕ, чем объявлен эффект-слушатель
   `on('game:action', ...)` (пример: `who-am-i/page.tsx:136` vs `:224`).
   Поэтому в StrictMode-цикле сначала обнуляется `socketRef`, и только потом
   вызывается cleanup слушателя.
4. Cleanup, который возвращает `on()` (`use-socket.ts:71-73`), читает ref в
   момент вызова: `socketRef.current?.off(event, handler)` → ref уже `null` →
   off молча пропускается → первый обработчик НАВСЕГДА остаётся на
   singleton-сокете (`src/lib/socket.ts` держит один инстанс на вкладку).
5. StrictMode перезапускает эффекты → регистрируется второй обработчик.
   Оба — живые замыкания одного и того же смонтированного компонента →
   каждый broadcast применяется ДВАЖДЫ.

Видимый симптом только в «Кто я?», потому что она единственная применяет
инкрементальные дельты (`consecutiveYesAnswers + 1`, `questionsAsked + 1`);
остальные игры шлют полные патчи состояния — двойное применение идемпотентно.
Утечка также воспроизводится при реальной навигации между страницами
(там она безвредна лишь потому, что setState на размонтированном компоненте —
no-op, но обработчики копятся).

## Задача

В `src/lib/use-socket.ts` починить `on()` (и заодно `off()`): захватывать
инстанс сокета в момент подписки, а не читать `socketRef.current` в момент
cleanup.

Требуемое поведение `on()`:

```ts
const on = useCallback((event: string, handler: (...args: unknown[]) => void) => {
  const socket = socketRef.current;
  if (!socket) return () => {};
  socket.on(event, handler);
  return () => {
    socket.off(event, handler);
  };
}, []);
```

Для `off()` аналогично можно оставить чтение ref (он вызывается только пока
компонент жив), НО добавь комментарий на английском в `on()` cleanup, почему
захватывается инстанс (StrictMode cleanup ordering: `useSocket`'s own cleanup
nulls the ref before dependent effects clean up, which silently skipped
`off()` and leaked duplicate handlers on the singleton socket).

Ничего больше в файле не менять (emit, visibilitychange, connect/disconnect —
не трогать).

## Acceptance

- `npm run lint` и `npx tsc --noEmit` чисто.
- (Если `npm run build` падает с `Operation not permitted` — известное
  ограничение среды, использовать `npx next build --webpack`.)
- Поведенчески (проверит Claude/юзер live): в dev один клик «Да» в «Кто я?»
  двигает счётчик ровно на +1.
- НЕ коммитить. Отчёт в `codex-reports/344-use-socket-on-cleanup-leak.md`.
