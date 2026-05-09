# TASK-029 — Заменить кнопку «История» в лобби на «ТВ-режим»

**Статус:** active
**Автор:** Claude (orchestrator)
**Назначено:** Codex

---

## Цель

В TopBar лобби заменить декоративную кнопку **«История»** на функциональную кнопку **«ТВ-режим»**, которая открывает страницу `/tv/{roomCode}` в новой вкладке. Это даёт хосту быстрый способ запустить TV-экран на втором мониторе/приставке без необходимости копировать URL вручную.

## Контекст

- Сейчас в TopBar три декоративных `NavButton`: «Играть» (active), «Друзья», «История». Ни у одной нет `onClick` — это плейсхолдеры.
- Кнопка «История» функционала не имеет и в ближайшем будущем не планируется.
- TV-режим существует и работает: маршруты `/tv/[roomId]/page.tsx` и `/tv/[roomId]/[gameType]/page.tsx`.
- `roomCode` хранится в state `Lobby`. `null` если комната ещё не создана/не присоединена.
- Кнопка `<NavButton>` сейчас не поддерживает `onClick` и `disabled` — нужно расширить.

## Whitelist файлов

- `src/components/lobby/Lobby.tsx` — единственный файл, который нужно править.

**Не трогать никакие другие файлы.**

## Что сделать

### 1. Расширить `NavButton` (lines 727–766)

Добавить два опциональных пропа:
- `onClick?: () => void`
- `disabled?: boolean`

Поведение:
- Если `disabled === true`: `cursor: 'not-allowed'`, `opacity: 0.4`, `whileHover`/`whileTap` отключены, `onClick` не срабатывает.
- В обычном состоянии — onClick передаётся в `motion.button`.

### 2. Заменить кнопку «История» на «ТВ-режим» (line 668)

Было:
```tsx
<NavButton topbarId="history" isNarrowDesktop={compact}>История</NavButton>
```

Стало:
```tsx
<NavButton
  topbarId="tv"
  isNarrowDesktop={compact}
  disabled={!roomCode}
  onClick={() => {
    if (!roomCode) return;
    window.open(`/tv/${roomCode}`, '_blank', 'noopener,noreferrer');
  }}
>
  ТВ-режим
</NavButton>
```

Логика:
- Если `roomCode === null` (нет активной комнаты) — кнопка disabled.
- Если `roomCode !== null` — клик открывает `/tv/{roomCode}` в новой вкладке.

### 3. Обновить keyboard navigation order (line 426)

Было:
```ts
const order = ["play", "friends-nav", "history", "friends-online", "room", "avatar"];
```

Стало:
```ts
const order = ["play", "friends-nav", "tv", "friends-online", "room", "avatar"];
```

### 4. Обновить JSDoc-комментарий (line 7)

Было:
```
*   Top bar:  brand + nav (Играть/Друзья/История/Комнаты)
```

Стало:
```
*   Top bar:  brand + nav (Играть/Друзья/ТВ-режим/Комнаты)
```

## Acceptance criteria

- `npm run lint` — 0 problems (или столько же как до правок).
- `npx tsc --noEmit` — без новых ошибок.
- Визуально на `/`:
  - При отсутствии комнаты («Создать комнату» в правом углу) — кнопка «ТВ-режим» видна, но disabled (тусклая, не реагирует на hover).
  - После клика «Создать комнату» — кнопка становится активной, при клике открывает `/tv/{CODE}` в новой вкладке.
- Визуально на `/lobby/{CODE}` (auth user, гость):
  - Кнопка «ТВ-режим» сразу активна, открывает `/tv/{CODE}` в новой вкладке.
- Keyboard navigation: ArrowRight/Left по TopBar по порядку `play → friends-nav → tv → friends-online → room → avatar`.
- Не сломались остальные `NavButton` («Играть», «Друзья») — они остаются декоративными.

## Не делать

- Не трогать `tv/[roomId]/page.tsx` или другие TV-страницы.
- Не менять стиль `NavButton` сверх добавления `disabled`-эффекта.
- Не делать i18n (всё лобби сейчас на русском).
- Не коммитить.

## Отчёт

После выполнения создать `codex-reports/029-replace-history-with-tv-mode-button.md` с:
- Список изменённых файлов и строк.
- Результаты `npm run lint` и `npx tsc --noEmit`.
- Любые отклонения от ТЗ (если пришлось).
