# TASK-069: fix room:join fires with empty nickname on re-login

> **Метаданные**
> - **Дата создания:** 2026-05-11
> - **Сложность:** simple
> - **Запуск:** manual by user (Codex Desktop)
> - **Ожидаемое время Codex:** ~5 минут
> - **Зависит от тасков:** TASK-066, TASK-067

---

## Цель

Предотвратить вызов `room:join` пока у пользователя не установлен nickname,
чтобы дропдаун авторизации не закрывался преждевременно при повторном входе.

---

## Контекст

Баг re-login: после logout без обновления страницы повторный вход пропускает
шаг ввода nickname — дропдаун закрывается после `verifyCode` до того, как
пользователь успевает ввести имя.

**Root cause** (подтверждено трейсом консоли):
1. TASK-066 намеренно очищает `nickname` в `useAuth` на шаге `verifyCode` —
   чтобы шаг nickname всегда показывался.
2. После `verifyCode` объект `user` меняется (null → user с пустым nickname).
3. Это изменение триггерит `useEffect` в `Lobby.tsx` (строка 272) с зависимостью
   `user` в deps array.
4. Если пользователь находится на `/lobby/CODE` → `initialCode` есть →
   `room:join` вызывается с пустым `nickname`.
5. Сервер отклоняет join → `router.push('/')` → Lobby размонтируется →
   `authMenuOpen` сбрасывается в `false` (начальное состояние) → дропдаун исчезает.

**Диагностика:** логи показали `verifyCode OK → setStep nickname`, но ни
`mousedown OUTSIDE → onClose`, ни `handleSetNickname` — значит компонент был
размонтирован, а не закрыт через `onClose`.

---

## Файлы к изменению (whitelist)

- `src/components/lobby/Lobby.tsx` — добавить `!user.nickname` в guard useEffect

### НЕ ТРОГАТЬ

- `server.mts` — серверная логика не меняется
- `CLAUDE.md`, `AGENTS.md` — обновляет только Claude
- Любые другие файлы

---

## Шаги реализации

1. Открыть `src/components/lobby/Lobby.tsx`, найти строку ~273:
   ```ts
   if (!initialCode || !user || !isConnected) return;
   ```

2. Заменить на:
   ```ts
   if (!initialCode || !user || !user.nickname || !isConnected) return;
   ```

3. Больше ничего не менять.

> Это единственное изменение. Если видишь что нужно что-то ещё — остановись,
> напиши в отчёт, не делай.

---

## Acceptance criteria

- [ ] `npm run lint` без новых ошибок
- [ ] `npm run build` успешен
- [ ] В `Lobby.tsx` строка 273 содержит `!user.nickname` в guard
- [ ] Никаких других изменений в diff

---

## Ограничения и подводные камни

- **Не трогать логику `handleSetNickname`** — там всё правильно после TASK-067.
- **Не трогать эффект на строке 236** (`setAuthMenuOpen(true)` для room route) —
  это отдельная логика, она не связана с багом.
- **Одна строка, один файл.** Любое расширение scope — стоп и отчёт.

---

## Контрольные точки для самопроверки Codex

1. Прочитать diff (`git diff --stat` + `git diff`).
2. Убедиться что изменён только `src/components/lobby/Lobby.tsx`.
3. Запустить `npm run lint` и `npm run build`.
4. Заполнить отчёт `codex-reports/069-fix-room-join-empty-nickname.md`.
5. **Не коммитить.**

---

## Открытые вопросы для Codex

- Нужно ли убирать debug-логи TASK-068? — **нет**, это отдельный TASK-070.
- Нужно ли менять логику на сервере? — **нет**, фикс только на клиенте.
