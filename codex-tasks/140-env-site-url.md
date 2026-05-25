# TASK-140: Добавить NEXT_PUBLIC_SITE_URL в .env.local.example

> **Метаданные**
> - **Дата создания:** 2026-05-24
> - **Сложность:** simple
> - **Запуск:** manual by user (Codex Desktop)
> - **Ожидаемое время Codex:** ~2 минуты
> - **Зависит от тасков:** 138

---

## Цель

Добавить переменную `NEXT_PUBLIC_SITE_URL` в `.env.local.example`, чтобы
при смене домена достаточно было изменить одну строку в `.env.local`.
Код в `Lobby.tsx` уже читает эту переменную (TASK-138).

---

## Файлы к изменению (whitelist)

- `.env.local.example` — единственный файл.

---

## Что добавить

В конец файла добавить блок:

```
# Public site URL — used for QR code join links.
# Change to your real domain when you buy one (e.g. https://partyge.me).
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

---

## Acceptance criteria

- [ ] `.env.local.example` содержит `NEXT_PUBLIC_SITE_URL=http://localhost:3000`
- [ ] Есть комментарий про смену домена

---

## Контрольные точки

1. `git diff --name-only` — только `.env.local.example`.
2. Заполнить отчёт `codex-reports/140-env-site-url.md`.
3. **Не коммитить.**
