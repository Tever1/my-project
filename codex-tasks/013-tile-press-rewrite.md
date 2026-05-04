# TASK-013: Переписать Tile motion — press на parent (НЕ на детях)

> **Сложность:** simple
> **Запуск:** auto by Claude

## Проблема

Press-effect на тайле не виден. `whileTap` на внутреннем `motion.div`
не работает корректно потому что:
1. Tap-gesture регистрируется на `motion.button` (parent), не на child div.
2. Parent имеет `animate={isActive ? "active" : "rest"}` → variants
   propagation в children → children не реагируют на tap.

## Цель

Полностью убрать variants и нагромождение motion на детях. Все анимации
на ОДНОМ `motion.button` (parent). Дети — обычные `<div>`.

## Файлы

- `src/app/lobby-preview/page.tsx` — только `function Tile`.

## Шаги

Заменить тело `function Tile` на упрощённую версию:

```tsx
function Tile({
  game,
  isActive,
  onClick,
  onFocus,
  isMobile = false,
}: {
  game: GameInfo;
  isActive: boolean;
  onClick: () => void;
  onFocus: () => void;
  isMobile?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const accent = gameColors[game.id].accent;
  const deep = gameColors[game.id].deep;
  const highlighted = isActive || focused;

  // Single source of truth for animation
  const tileAnimate = isActive
    ? { y: -3, scale: 1.02 }
    : hovered
      ? { y: -5, scale: 1.04 }
      : { y: 0, scale: 1 };

  return (
    <motion.button
      onClick={onClick}
      data-game-id={game.id}
      onFocus={() => {
        setFocused(true);
        onFocus();
      }}
      onBlur={() => setFocused(false)}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      animate={tileAnimate}
      whileTap={{ scale: 0.92 }}
      transition={spring.soft}
      style={{
        position: "relative",
        cursor: "pointer",
        background: "transparent",
        border: "none",
        outline: "none",
        padding: 0,
        fontFamily: "inherit",
        color: "inherit",
        scrollSnapAlign: isMobile ? "start" : undefined,
      }}
    >
      {/* Halo (plain div, opacity controlled by CSS) */}
      <div
        style={{
          position: "absolute",
          inset: -12,
          background: `radial-gradient(circle at center, ${accent}50, transparent 70%)`,
          borderRadius: radius.xl,
          pointerEvents: "none",
          zIndex: 0,
          opacity: isActive ? 0.6 : hovered ? 1 : 0,
          transition: "opacity 400ms ease-out",
        }}
      />

      {/* Tile frame (plain div) */}
      <div
        style={{
          position: "relative",
          aspectRatio: "1",
          borderRadius: radius.md,
          background: `linear-gradient(135deg, ${deep}66, ${accent}22)`,
          backdropFilter: "blur(16px)",
          border: `1px solid ${highlighted ? accent : `${accent}40`}`,
          boxShadow: highlighted
            ? `0 12px 36px ${accent}55, 0 0 0 2px ${accent}80`
            : `0 10px 24px rgba(0,0,0,0.35), 0 0 0 1px ${accent}25`,
          overflow: "hidden",
          zIndex: 1,
        }}
      >
        {/* Icon fills the entire tile */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
          }}
        >
          <GameIcon
            gameId={game.id}
            style={{ width: "100%", height: "100%" }}
          />
        </div>

        {/* Bottom label with dark gradient mask for readability */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            padding: "18px 8px 10px",
            textAlign: "center",
            background:
              "linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.5) 50%, transparent 100%)",
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "white",
              letterSpacing: "-0.01em",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              textShadow: "0 1px 4px rgba(0,0,0,0.6)",
            }}
          >
            {game.name}
          </div>
        </div>
      </div>
    </motion.button>
  );
}
```

**Ключевое:** ВСЯ анимация на parent `motion.button`. Дети — обычные
`<div>` (никакого motion). `whileTap={{ scale: 0.92 }}` поверх
`animate={tileAnimate}` даёт чистый press-effect.

## Acceptance criteria

- [ ] `npm run build` успешен.
- [ ] Mouse-клик на тайле — заметная компрессия (scale 0.92).
- [ ] Hover работает (scale 1.04).
- [ ] Active tile поднят (scale 1.02).
- [ ] Focus ring виден (через highlighted border + boxShadow).
- [ ] Halo viseen на active (opacity 0.6) и hover (opacity 1).

## Контрольные точки

1. Diff в одной функции `Tile`.
2. `npm run build`.
3. Заполнить `codex-reports/013-tile-press-rewrite.md`.
4. Не коммитить.
