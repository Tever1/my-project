# TASK-215 — Двуязычность страниц /join (ru/en)

## Контекст / требование

Страницы входа игрока сейчас монолингвальны (только русский), что нарушает
правило проекта №1 (вся видимая строка — пара ru/en). Нужно сделать обе
страницы двуязычными:
- `src/app/join/page.tsx` (ввод кода)
- `src/app/join/[code]/page.tsx` (экран комнаты)

## Подход к локали (SSR-safe)

Эти страницы — `"use client"`, но `navigator` недоступен при SSR. Чтобы не было
hydration mismatch:
```ts
const [locale, setLocale] = useState<'ru' | 'en'>('ru');
useEffect(() => {
  if (typeof navigator !== 'undefined' && navigator.language.startsWith('en')) {
    setLocale('en');
  }
}, []);
```
(дефолт `ru`, после маунта переключается на `en` если язык браузера английский —
как в `getBrowserLocale` в Lobby.tsx). Строки хранить в объекте `{ ru, en }` и
читать `t.something[locale]` или тернарником `locale === 'en' ? '…' : '…'`.
Выбери единый аккуратный стиль, не плоди дубли разметки.

## Что сделать

### Файл 1: `src/app/join/page.tsx`

Перевести видимые строки (значения en — на твоё усмотрение, корректный перевод):
- «Код комнаты» → "Room code"
- «Введите 6-значный код» → "Enter the 6-digit code"
- «Войти» → "Join"
- placeholder `ABC123` — оставить как есть (нейтральный).

### Файл 2: `src/app/join/[code]/page.tsx`

Перевести все видимые строки:
- «Код комнаты» → "Room code"
- placeholder «Твоё имя» → "Your name"
- «Подключение...» → "Connecting...", «Войти в игру» → "Join the game"
- «Подключение к серверу...» → "Connecting to server..."
- fallback ошибки «Не удалось подключиться» → "Could not connect"
- «ведущий» → "host"
- «Передать хост» → "Make host", «Удалить игрока» → "Remove player"
- gameError fallback «В комнате нет игроков» → "No players in the room"
  (ВНИМАНИЕ: серверная ошибка приходит как `messageRu`; для en можно оставить
  серверный текст как есть ИЛИ показывать локальный fallback по locale —
  достаточно локализовать только локальный дефолт, серверные строки не трогать)
- «Выберите игру на большом экране…» → "Pick a game on the big screen…"
- «Ожидание ведущего...» → "Waiting for the host..."
- «+ Добавить игрока» → "+ Add player"
- «Выйти» → "Leave"
- «Выйти из комнаты?» → "Leave the room?"
- «Отмена» → "Cancel"
- Бейдж `roomState.currentGame` (raw id, верхним регистром) — НЕ трогать (это
  технический идентификатор).

## Чего НЕ трогать

- Логику (join/reconnect/leave/kick/transfer), стили, роутинг.
- Серверные строки/`messageRu` (только локальные дефолты).
- Другие файлы.

## Whitelist файлов (трогать ТОЛЬКО эти два)

- `src/app/join/page.tsx`
- `src/app/join/[code]/page.tsx`

**ЗАПРЕЩЕНО:** `CLAUDE.md`, `AGENTS.md`, `.codex/**`, `codex-tasks/**`,
прочие файлы вне whitelist.

## Acceptance

- `npx tsc --noEmit` — 0 ошибок.
- `npm run lint` — без новых ошибок.
- Нет hydration warning (дефолт `ru`, en применяется после маунта).
- Все перечисленные видимые строки имеют ru/en вариант и переключаются по
  языку браузера.

## Отчёт

`codex-reports/215-join-pages-bilingual.md`. Не коммить.
