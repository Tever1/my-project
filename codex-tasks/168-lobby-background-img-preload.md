# TASK-168 — Lobby: фикс медленной загрузки фона тайла игры

## Контекст

В `src/components/lobby/Lobby.tsx` ~строка 2819-2828 есть компонент тайла
(предположительно `GameTile` или inline-компонент), который рендерит фоновое
изображение через CSS `backgroundImage`:

```tsx
{backgroundUrl && (
  <div
    style={{
      position: "absolute",
      inset: 0,
      backgroundImage: `url(${backgroundUrl})`,
      backgroundSize: "cover",
      backgroundPosition: "center",
    }}
  />
)}
```

CSS `backgroundImage` не даёт браузеру hint на preload — изображение грузится
рывками по мере прихода байтов. Аналогичный баг уже исправлен в
`GameLayout.tsx` и `tv/[roomId]/[gameType]/page.tsx` в TASK-166.

## Whitelist файлов

**Изменить:**
- `src/components/lobby/Lobby.tsx`

**Создать:**
- `codex-reports/168-lobby-background-img-preload.md`

**НЕЛЬЗЯ трогать:** всё остальное.

---

## Что сделать

Найти в `src/components/lobby/Lobby.tsx` (~строка 2819-2828) блок:

```tsx
{backgroundUrl && (
  <div
    style={{
      position: "absolute",
      inset: 0,
      backgroundImage: `url(${backgroundUrl})`,
      backgroundSize: "cover",
      backgroundPosition: "center",
    }}
  />
)}
```

Заменить на:

```tsx
{backgroundUrl && (
  // eslint-disable-next-line @next/next/no-img-element
  <img
    src={backgroundUrl}
    alt=""
    fetchPriority="high"
    style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
    aria-hidden="true"
  />
)}
```

**Важно:** родительский контейнер уже имеет `position: "relative"` и
`overflow: "hidden"` — img позиционируется корректно без дополнительных изменений.

---

## Acceptance

```bash
# Убедиться что backgroundImage с url() исчезло
grep -n "backgroundImage.*url" src/components/lobby/Lobby.tsx
# → пусто (только gradient backgroundImage — те оставить)

# fetchPriority присутствует рядом с backgroundUrl
grep -n "fetchPriority\|backgroundUrl" src/components/lobby/Lobby.tsx
# → строки с fetchPriority="high" и img src={backgroundUrl}

npm run lint     # ✅
npx tsc --noEmit # ✅
```

## Отчёт

В `codex-reports/168-lobby-background-img-preload.md`:
- Номер строки где была замена
- Результаты grep + lint/tsc

Не коммить, не пушить.
