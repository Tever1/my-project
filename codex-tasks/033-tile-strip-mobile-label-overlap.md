# TASK-033 — Фикс: надпись «Все игры» налезает на иконки на мобильном

**Статус:** active
**Автор:** Claude (orchestrator)
**Назначено:** Codex

---

## Проблема

На мобильном экране надпись «Все игры» перекрывается иконками игр в нижней плашке.
Причина: `marginBottom: 12` у `<p>` недостаточно — иконки с анимацией/размером
вылезают выше и накрывают лейбл.

---

## Whitelist файлов

- `src/components/lobby/Lobby.tsx` — только одно место

**Не трогать никакие другие файлы.**

---

## Что сделать

В компоненте `TileStrip` (около строки 2507) найти `<p>` с текстом «Все игры»:

```tsx
<p
  style={{
    fontSize: 11,
    color: "rgba(255, 255, 255, 0.4)",
    letterSpacing: "0.16em",
    textTransform: "uppercase",
    marginBottom: 12,
    textAlign: "center",
    fontFamily: "var(--font-mono)",
    fontWeight: 700,
  }}
>
  Все игры
</p>
```

Заменить `marginBottom: 12` на `marginBottom: isMobile ? 20 : 12`.

Итоговый `<p>` style:

```tsx
style={{
  fontSize: 11,
  color: "rgba(255, 255, 255, 0.4)",
  letterSpacing: "0.16em",
  textTransform: "uppercase",
  marginBottom: isMobile ? 20 : 12,
  textAlign: "center",
  fontFamily: "var(--font-mono)",
  fontWeight: 700,
}}
```

---

## Acceptance criteria

- `npm run lint` — 0 problems.
- `npx tsc --noEmit` — 0 errors.
- На мобильном (`isMobile === true`) надпись «Все игры» не перекрывается иконками.

---

## Не делать

- Не трогать десктопный layout.
- Не менять размеры иконок или анимации.
- Не коммитить.

---

## Отчёт

После выполнения создать `codex-reports/033-tile-strip-mobile-label-overlap.md`.
