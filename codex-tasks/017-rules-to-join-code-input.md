# TASK-017: Стрелкой → с «Правила» переходить на «Код комнаты» input

> **Сложность:** simple
> **Запуск:** auto by Claude

## Цель

В hero-row CTA сейчас три элемента слева направо:
`Начать партию` → `Правила` → `[Код комнаты input]`.

Сейчас стрелка → / ← внутри CTA переключает только между «Начать партию»
и «Правила» (через `data-lobby-cta="start"` и `data-lobby-cta="rules"`).

Нужно: стрелкой → с «Правила» фокус идёт на input «Код комнаты». Стрелкой
← из input — обратно на «Правила». Внутри input стрелки ←/→ обычно
двигают курсор, но в нашем случае — это OK, потому что keyboard handler
уже игнорирует фокус в `INPUT` (`if (tag === "INPUT" || tag === "TEXTAREA"
|| editable) return;`). Значит из input стрелки работают как обычно
(перемещение каретки), и наш handler не вмешивается. Из input выйти
можно через Tab или Escape.

Поэтому **главное**: стрелка → с «Правила» должна попасть на input.
Обратное направление обеспечит браузерный Tab.

## Файлы

- `src/app/lobby-preview/page.tsx` — только.

## Шаги

1. На `<input>` (Код комнаты, ~строка 852) добавить `data-lobby-cta="join-code"`.

2. В keyboard handler, в ветке `if (e.key === "ArrowRight" || e.key === "ArrowLeft")`,
   найти блок:
   ```ts
   if (focusedCta) {
     e.preventDefault();
     const next = focusedCta === "start" ? "rules" : "start";
     document.querySelector<HTMLElement>(`[data-lobby-cta="${next}"]`)?.focus();
     return;
   }
   ```
   Заменить на расширенную логику с тремя элементами:
   ```ts
   if (focusedCta) {
     e.preventDefault();
     const ctaOrder = ["start", "rules", "join-code"];
     const idx = ctaOrder.indexOf(focusedCta);
     if (idx === -1) return;
     const dir = e.key === "ArrowRight" ? 1 : -1;
     const next = idx + dir;
     if (next < 0 || next >= ctaOrder.length) return; // без wrap
     document.querySelector<HTMLElement>(`[data-lobby-cta="${ctaOrder[next]}"]`)?.focus();
     return;
   }
   ```
   
   Wait — `focusedCta` сейчас в коде получается через
   `focused?.dataset?.lobbyCta` (строка 164). Если фокус на input —
   `focusedCta` будет "join-code", но handler НЕ дойдёт до этой ветки,
   потому что `if (tag === "INPUT") return;` срабатывает раньше.

   Значит если пользователь в input и жмёт ←/→, наш handler сразу
   возвращает (не вмешивается) — input получает событие нативно
   (курсор в инпуте перемещается). Это desired.

   Поэтому переход BACK с input на «Правила» через нашу стрелку ← НЕ
   нужен — вместо этого пользователь использует Tab/Shift+Tab или
   мышью.

3. **Скрытый момент**: если пользователь жмёт ↑ из input, current
   handler пропускает. Это OK. Но пользователь может потерять navigation
   возможность. Acceptance ниже это не требует — focus exit из input
   остаётся через Tab/Escape, не через стрелки.

## Acceptance criteria

- [ ] `npm run build` ОК.
- [ ] От «Правила» → → focus на input `[data-lobby-cta="join-code"]`.
- [ ] От «Начать партию» → → «Правила» → → input.
- [ ] От «Начать партию» ← → ничего (left edge).
- [ ] Внутри input ←/→ — двигают курсор (работает по умолчанию, наш
      handler не вмешивается).

## QA через preview MCP

Claude проверит:
- Focus from `[data-lobby-cta="rules"]`, dispatch ArrowRight on window,
  затем `document.activeElement?.dataset?.lobbyCta` должен быть
  "join-code".

## Контрольные точки

1. Diff минимальный — input получает data-attr, в handler добавляется
   3-элементный CTA order.
2. `npm run build`.
3. Заполнить `codex-reports/017-rules-to-join-code-input.md`.
4. Не коммитить.
