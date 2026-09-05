# TASK-305 — Join-лобби (телефон): дубликат имени, бейдж «ВЫ», корона ведущего

## Контекст
Экран `/join/[code]` — мобильное лобби комнаты на телефоне. Сейчас в строке
игрока справа показывается текст `ведущий` для того, у кого
`gameHostPlayerId === player.id`. Нужно три изменения.

## Whitelist файлов (трогать ТОЛЬКО их)
- `src/server/socket-handlers.mts`
- `src/app/join/[code]/page.tsx`
- `codex-reports/305-join-dup-name-you-badge-crown.md` (отчёт)

НЕ трогать: CLAUDE.md, AGENTS.md, .codex/**, codex-tasks/**, любые другие файлы.

## Изменение 1 — Проверка дубликата имени при входе

### 1a. Сервер (`src/server/socket-handlers.mts`, хэндлер `room:join`, ~строка 250)
В ветке создания НОВОГО игрока (блок `else {` после `if (existingPlayer)`,
~строка 287) — ДО создания `player` добавить guard:

- Собрать имена уже существующих игроков комнаты с `role !== 'tv'`.
- Сравнение: `nickname.trim().toLowerCase()`.
- Если `data.nickname` после trim/lowercase совпадает с именем любого
  существующего игрока → `callback({ success: false, error: 'name-taken' });
  return;` (НЕ создавать игрока, НЕ broadcast'ить).
- Reconnect (ветка `if (existingPlayer)` по playerId) и TV — не затрагиваются.
- Возвращаем именно код `'name-taken'` (строкой), без русского текста — клиент
  локализует сам (см. 1b).

### 1b. Клиент (`src/app/join/[code]/page.tsx`)
- В словарь `t` (~строка 33) добавить ключ:
  `nameTaken: { ru: "Это имя уже занято", en: "This name is already taken" }`.
- В `handleJoin` (~строка 159) ПЕРЕД `emit("room:join", …)` добавить
  клиентскую предпроверку (мгновенный локализованный фидбэк):
  - `const taken = (roomState?.players ?? []).some((p) => p.role !== "tv" &&
     p.id !== playerId &&
     p.nickname.trim().toLowerCase() === trimmedNickname.toLowerCase());`
  - если `taken` → `setError(t.nameTaken[locale]); setIsJoining(false); return;`
    (важно: до `setIsJoining(true)` или сбросить обратно — не оставлять кнопку
    залипшей; проверку поставить сразу после вычисления `trimmedNickname` и
    guard'а на пустоту, до `setIsJoining(true)`).
- В колбэке `room:join` (~строка 175): если `result.error === 'name-taken'` →
  `setError(t.nameTaken[locale])`, иначе текущая логика
  (`setError(result.error ?? t.couldNotConnect[locale])`).
- Тип `JoinPlayer` (или как называется элемент `roomState.players`) должен иметь
  `role`. Если поля нет в локальном типе — добавить `role?: string` минимально,
  не расширяя ничего лишнего.

## Изменение 2 + 3 — Бейдж «ВЫ» + корона ведущего в строке игрока

В рендере строки игрока (~строки 386–393), блок:
```
{roomState?.gameHostPlayerId === player.id && (
  <span style={{ marginLeft: "auto", … }}>{t.host[locale]}</span>
)}
```
заменить на правый контейнер с двумя метками:

- Добавить i18n ключ: `you: { ru: "Вы", en: "You" }`.
- Логика:
  - `const isRowHost = roomState?.gameHostPlayerId === player.id;`
  - `const isMe = player.id === playerId;`
- Рендер (правый край строки, `marginLeft: "auto"`, flex-row, `gap: 6`,
  `alignItems: "center"`):
  - если `isRowHost` → корона (см. ниже), muted-цвет `rgba(255,255,255,0.6)`,
    размер ~15px.
  - если `isMe` → `<span style={{ fontSize: 12, fontWeight: 700,
    letterSpacing: 0.4, color: "rgba(255,255,255,0.55)" }}>{t.you[locale]}</span>`.
  - если ни то ни другое → ничего.
- Если игрок одновременно ведущий и «ты» → показываются ОБЕ метки (корона + Вы),
  в порядке: корона, затем Вы.

### Корона (переиспользовать существующую line-иконку)
НЕ рисовать новую. Использовать готовый `CrocIcon` — это та же line-корона, что
на игровом поле (TV Крокодил):
- Импорт: `import { CrocIcon } from "@/components/games/CrocIcon";`
  (проверь актуальный alias/относительный путь в этом файле; в проекте есть
  `@/` alias на `src/`).
- Рендер: `<CrocIcon name="crown" style={{ width: 15, height: 15,
  color: "rgba(255,255,255,0.6)" }} />`.
  (У `CrocIcon` svg в style стоит `color:'#f5efe6'` ПЕРЕД `...style`, поэтому
  переданный `color` корректно переопределяет цвет; размер задаётся width/height.)

## Чего НЕ делать
- НЕ менять classic/letter логику, никакие игры, никакие другие экраны.
- НЕ удалять функциональность (правило проекта).
- НЕ менять формат прочих ошибок сервера.
- Текст `t.host` можно оставить в словаре (даже если больше не используется) или
  убрать — на усмотрение, но лучше оставить, чтобы не плодить diff.

## Acceptance
- `npx tsc --noEmit` чисто.
- `npm run lint` без новых ошибок.
- НЕ запускать `npm run build` (Turbopack EPERM).
- В строке игрока: ведущий → корона (`CrocIcon name="crown"`); текущий игрок →
  «Вы»; совпадение → обе метки.
- Вход с занятым именем (другой регистр/пробелы тоже) → ошибка, игрок не входит.
- diff строго в пределах whitelist.

## Отчёт
`codex-reports/305-join-dup-name-you-badge-crown.md` — что сделано, какие строки,
результаты tsc/lint.
