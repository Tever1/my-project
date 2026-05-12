# TASK-070: fix avatar pill clipped off-screen on mobile when room is created

> **Метаданные**
> - **Дата создания:** 2026-05-11
> - **Сложность:** simple
> - **Запуск:** manual by user (Codex Desktop)
> - **Ожидаемое время Codex:** ~10 минут
> - **Зависит от тасков:** —

---

## Цель

Аватар-пилл в правом углу топбара не должен уезжать за экран на мобильном,
когда создана комната и кнопка «КОМНАТА · XXXXXX» становится широкой.

---

## Контекст

На мобильном (`isMobile = true`) хедер — `flex` + `justifyContent: space-between`.
Правая секция содержит `RoomButton` + `AvatarPill`. Когда `roomCode` установлен,
`RoomButton` показывает «КОМНАТА · U6RPE8 🔲» и становится широкой. У правой
секции нет `flexShrink: 0`, поэтому AvatarPill выдавливается за правый край экрана.

Файл: `src/components/lobby/Lobby.tsx`.

Структура хедера (упрощённо):
```
<header style={{ display:"flex", justifyContent:"space-between", padding:"12px 16px", gap:12 }}>
  {/* Left: brand + nav */}
  <div style={{ display:"flex", alignItems:"center", gap:24 }}>
    <BrandMark />
    <nav>...</nav>          {/* скрыт на mobile */}
  </div>

  {/* Right: room button + avatar — ВОТ ЗДЕСЬ ПРОБЛЕМА */}
  <div style={{ display:"flex", alignItems:"center", gap: isMobile ? 8 : ... }}>
    {!isMobile && <FriendsOnlinePill />}
    <RoomButton ... />
    <div style={{ position:"relative" }}>
      <AvatarPill ... />
      ...dropdowns...
    </div>
  </div>
</header>
```

---

## Файлы к изменению (whitelist)

- `src/components/lobby/Lobby.tsx` — правки стилей в `TopBar`

### НЕ ТРОГАТЬ

- `CLAUDE.md`, `AGENTS.md` — обновляет только Claude
- Любые другие файлы

---

## Шаги реализации

### Шаг 1 — правая секция: запретить сжатие

Найти в `TopBar` div правой секции (комментарий `{/* Right: friends online + room button + avatar */}`).

Добавить `flexShrink: 0` в его стиль:
```tsx
<div style={{
  display: "flex",
  alignItems: "center",
  gap: isMobile ? 8 : compact ? 8 : 12,
  flexShrink: 0,        // ← добавить
}}>
```

### Шаг 2 — левая секция: разрешить сжатие

Найти div левой секции (комментарий `{/* Left: brand + nav */}`).

Добавить `minWidth: 0` и `flexShrink: 1` (уже стоит по умолчанию, но явно):
```tsx
<div style={{
  display: "flex",
  alignItems: "center",
  gap: 24,
  minWidth: 0,          // ← добавить
  overflow: "hidden",   // ← добавить (обрезать бренд-марк если совсем тесно)
}}>
```

### Шаг 3 — RoomButton: ограничить ширину на мобильном

Найти компонент `RoomButton` (функция, ~строка 1024). Внутри найти корневой
`<button>` и добавить `maxWidth` на mobile:

```tsx
// В стиле кнопки RoomButton найти или добавить:
maxWidth: isMobile ? 180 : undefined,
overflow: "hidden",
textOverflow: "ellipsis",
whiteSpace: "nowrap",
```

> Если у кнопки уже есть `whiteSpace: "nowrap"` — не дублировать, только
> добавить `maxWidth` и `overflow: "hidden"`.

---

## Acceptance criteria

- [ ] `npm run lint` без новых ошибок
- [ ] `npm run build` успешен (или те же ошибки что были до таска — не новые)
- [ ] В коде `flexShrink: 0` на правой секции топбара
- [ ] В коде `minWidth: 0` на левой секции топбара
- [ ] В RoomButton есть `maxWidth` ограничение для мобильного

---

## Ограничения и подводные камни

- **Не ломать дропдауны** — `AuthDropdown` и `AccountDropdown` рендерятся внутри
  `position: relative` div внутри правой секции. `overflow: hidden` на самой
  правой секции нельзя — дропдауны обрежутся. `overflow: hidden` только на
  левой секции.
- **Desktop не трогать** — все изменения либо явно `isMobile ?` условные, либо
  безвредны для десктопа (flexShrink: 0 на правой секции нормален везде).
- **Комментарии в коде** — английский.

---

## Контрольные точки для самопроверки Codex

1. `git diff --name-only` — убедиться что только `src/components/lobby/Lobby.tsx`.
2. Проверить что `CLAUDE.md` и `AGENTS.md` не в diff.
3. `npm run lint` и `npm run build`.
4. Заполнить `codex-reports/070-fix-avatar-overflow-mobile.md`.
5. **Не коммитить.**
