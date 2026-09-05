# TASK-028: Унификация дизайна лобби — `/` и `/lobby/[roomId]` рендерят один компонент

> **Метаданные**
> - **Дата создания:** 2026-05-07
> - **Сложность:** complex
> - **Запуск:** manual by user (Codex Desktop)
> - **Ожидаемое время Codex:** ~25–40 минут
> - **Зависит от тасков:** TASK-022 (host controls + lobby promoted to root)

---

## Цель

Хост и гость видят **один и тот же** PS5-дизайн лобби, независимо от точки
входа. Старый дизайн в `src/app/lobby/[roomId]/page.tsx` (GlassCard /
GlassButton / games-config) удаляется. Маршрут `/lobby/[roomId]` начинает
рендерить тот же компонент, что и `/`, бутстрапясь от `roomId` из URL.

---

## Контекст

Сейчас в проекте **два разных лобби**:
- `/` (`src/app/page.tsx`, 2280 строк) — Phase D PS5 × iOS Liquid Glass дизайн
  (TASK-020/021/022). Хост создаёт комнату → `router.push('/lobby/${code}?game=...')`.
- `/lobby/[roomId]/page.tsx` (356 строк) — **старый** дизайн. Гости попадают
  сюда по QR-коду; 7 игровых страниц редиректят сюда после `game:ended`.

Это рассинхронизация UX: хост и гость в одной комнате видят разный
интерфейс. Пользователь хочет, чтобы все участники видели новый дизайн.

Решение: extract новый дизайн в shared-компонент `<Lobby roomCode={...} />`.
Root `/` использует его в режиме «без комнаты» (create flow доступен).
`/lobby/[roomId]` использует его в режиме «уже в комнате» (`roomCode` из
URL params, create flow скрыт). Старый файл удаляется целиком.

---

## Файлы к изменению (whitelist)

### Изменяем
- `src/app/page.tsx` — превращается в **тонкий route-wrapper**: `export default function Home() { return <Lobby />; }`. Вся текущая логика (TopBar, Hero, TiltedPreview, TileStrip и пр.) переезжает в новый компонент.
- `src/app/lobby/[roomId]/page.tsx` — **полностью переписывается**. Удаляются все импорты старого дизайна (GlassCard, GlassButton, games-config). Файл становится: читает `roomId` из `useParams`, рендерит `<Lobby initialRoomCode={roomId} />`.

### Создаём
- `src/components/lobby/Lobby.tsx` — shared-компонент, принимает `initialRoomCode?: string`. Если задан — пропускает create-flow и сразу подписывается на `room:state` для этой комнаты. Если не задан — обычное поведение root (showcase + create button).
- `src/components/lobby/index.ts` (опционально) — barrel-export.

### Можно править при необходимости
- `src/app/lobby/[roomId]/page.tsx` импорты — если что-то реально нужно из старой страницы (например, `LanguageToggle` логика) — перенести в `<Lobby />`. Если старая страница дёргала server endpoints, которых нет в новом дизайне — список открытых вопросов в отчёт, не угадывать.

### НЕ ТРОГАТЬ
- `server.mts` — никаких socket-протоколов не меняем.
- `src/app/game/[roomId]/**` — игровые страницы и их `router.push('/lobby/${roomId}')` после `game:ended` остаются как есть (они теперь попадают на новый дизайн автоматически).
- `src/components/glass/**` — Phase B компоненты не трогаем.
- `src/components/ui/GlassCard.tsx`, `GlassButton.tsx`, `LanguageToggle.tsx`, `QRCode.tsx` — могут стать unused после удаления старой страницы. **Не удалять в этом таске** — это отдельный cleanup-таск (TASK-029). Просто оставить как есть.
- `CLAUDE.md`, `AGENTS.md`, `.codex/STATUS.md` — обновляет только Claude.

---

## Шаги реализации

1. **Создать `src/components/lobby/Lobby.tsx`** — перенести в него **всю**
   текущую логику и JSX из `src/app/page.tsx` без функциональных изменений.
   Компонент принимает props:
   ```ts
   interface LobbyProps {
     /** Если задан — лобби стартует в режиме "уже в комнате",
      *  пропускает create flow, подписывается на room:state. */
     initialRoomCode?: string;
   }
   ```

2. **Адаптировать стартовое состояние:**
   - Если `initialRoomCode` задан: установить `roomCode = initialRoomCode`
     при mount, эмитнуть `room:join` или эквивалентное событие, которое
     текущий код использует для подписки на `room:state` существующей
     комнаты. Если нужного события нет — найти как `/lobby/[roomId]` это
     делал раньше (см. удаляемый файл) и **вынести только этот socket-call**
     в `<Lobby />`.
   - Если `initialRoomCode` нет: текущее поведение (toggle «Создать комнату»
     в TopBar активирует create flow).

3. **Скрыть/показать UI элементы по режиму:**
   - В режиме `initialRoomCode` кнопка-toggle «Создать комнату» в TopBar
     **не показывает create-toggle**, сразу показывает chip-комнату
     `КОМНАТА · CODE`. Логика «leave room» и `setRoomCode(null)` в этом
     режиме либо отключается, либо делает `router.push('/')`.
   - Нет дублирования inline join-code input (он не нужен когда уже в комнате).
     Решение принять самостоятельно — главное, чтобы UX не ломался.

4. **Превратить `src/app/page.tsx` в thin wrapper:**
   ```tsx
   "use client";
   import { Lobby } from "@/components/lobby/Lobby";
   export default function Home() { return <Lobby />; }
   ```

5. **Переписать `src/app/lobby/[roomId]/page.tsx`:**
   ```tsx
   "use client";
   import { useParams } from "next/navigation";
   import { Lobby } from "@/components/lobby/Lobby";
   export default function LobbyRoute() {
     const { roomId } = useParams<{ roomId: string }>();
     return <Lobby initialRoomCode={roomId} />;
   }
   ```
   Все старые импорты (GlassCard, GlassButton, games-config, LanguageToggle,
   QRCodeCanvas, useTranslation, useAuth-redirect-loop) — **удалить**.
   Если auth-redirect нужен — перенести его в `<Lobby />` под условие
   `initialRoomCode`.

6. **Хост-flow при создании комнаты:** в новом `<Lobby />` после успешного
   `room:create` вместо текущего `setRoomCode(code)` сделать
   `router.push('/lobby/' + code)` — теперь URL отражает состояние, и при
   рефреше пользователь не теряет комнату. **Существующий `router.push` с
   `?game=...` после Start в Hero остаётся как есть** (он в `src/app/page.tsx:371`,
   после переноса будет в `Lobby.tsx`).

7. **Проверить mobile-ветку:** `useIsMobile` хук и mobile-layout рендерится
   внутри текущего `page.tsx`. Перенести вместе со всем JSX, ничего не
   ломать.

---

## Acceptance criteria

- [ ] `npm run lint` — 0 problems (как сейчас).
- [ ] `npm run build` — успешен.
- [ ] `tsc --noEmit` — без ошибок.
- [ ] `/` рендерит PS5-дизайн в режиме showcase (как сейчас).
- [ ] Хост на `/` нажимает «Создать комнату» → URL меняется на `/lobby/CODE`,
      дизайн остаётся тем же, в TopBar chip `КОМНАТА · CODE` активен.
- [ ] Открытие `/lobby/ABCXYZ` напрямую (как делает гость по QR) — рендерит
      тот же PS5-дизайн, не редиректит на старую страницу, не показывает
      GlassCard / старый layout.
- [ ] Хост и гость в одной комнате видят **одинаковый** интерфейс лобби.
- [ ] При `game:ended` игрок возвращается на `/lobby/${roomId}` и видит
      новый дизайн (никакой регрессии).
- [ ] `src/app/lobby/[roomId]/page.tsx` содержит ≤20 строк (тонкий wrapper).
- [ ] `src/app/page.tsx` содержит ≤20 строк (тонкий wrapper).
- [ ] Старый файл лобби больше не импортирует `GlassCard`, `GlassButton`,
      `games-config`, `useTranslation`.
- [ ] **Не коммитить.** Отчёт в `codex-reports/028-unify-lobby-design.md`.

---

## Открытые вопросы / эскалация

Если по ходу работы:
- Найдётся socket-событие, которого нет в `<Lobby />` но было в старой
  странице (например, как именно гость подписывается на `room:state` по
  roomId) — **вынести в отчёт**, описать что делал старый файл, и какой
  минимальный socket-call достаточно перенести.
- `useAuth` redirect (`/auth?redirect=/lobby/...`) в старой странице нужен
  для unauth-пользователей — решить, переносить ли в `<Lobby />` или
  оставить только в `[roomId]`-варианте. **По умолчанию: переносим, активен
  только при `initialRoomCode` задан**.
- Если выяснится, что нельзя сделать без правки `server.mts` — **СТОП**,
  отчёт, вернуть управление Claude.

---

## Что НЕ входит в этот таск

- Удаление unused `src/components/ui/GlassCard.tsx`, `GlassButton.tsx`,
  `LanguageToggle.tsx`, `QRCode.tsx`, `games-config.ts` — отдельный
  cleanup-таск TASK-029.
- Любые визуальные правки нового дизайна.
- Любые изменения в `src/app/game/[roomId]/**`.
- Любые изменения в `server.mts`.
