# TASK-271 — Шпион: градиентный фон карточек вместо матового стекла (смысл сохранён)

## Цель

Заменить матовое стекло карточек моб-Шпиона на красивый градиент (как в превью
`/design-tokens`). Смысловые цвета сохраняем: нейтральные/бирюзовые → бирюзовый
градиент, шпион/опасность → красный, итог-успех → зелёный, слово для рисования →
фиолетовый. Текст на карточках — кремовый (через color класса); иконки внутри
карточек наследуют кремовый автоматически (`currentColor`). Hero-иконки на тёмном
фоне — бирюзовые.

## Whitelist файлов

- `src/app/globals.css` — добавить 4 класса `.glass-card.spy-card*`
- `src/app/game/[roomId]/spy/page.tsx` — заменить tint-классы карточек
- `codex-reports/271-spy-card-gradients.md` — **отчёт (писать СЮДА разрешено)**

**НЕ трогать:** GlassCard-компонент, TV, design-tokens, другие игры, `public/icons/**`,
server.mts, package.json.

---

## Шаг 1 — globals.css (добавить после блока `.glass-card` / `.glass-card:active`)

Используем селектор `.glass-card.spy-card*` (специфичность 0,2,0), чтобы
перебивать `.glass-card:hover/:active` (0,1,1) — иначе фон будет слетать на hover.

```css
.glass-card.spy-card,
.glass-card.spy-card-red,
.glass-card.spy-card-green,
.glass-card.spy-card-purple {
  color: #f5efe6;
  border-color: rgba(255, 255, 255, 0.18);
}
.glass-card.spy-card {
  background: radial-gradient(110% 70% at 50% -5%, rgba(255,255,255,.22), transparent 55%), linear-gradient(165deg, #14b8a6 0%, #0f766e 100%);
}
.glass-card.spy-card-red {
  background: radial-gradient(110% 70% at 50% -5%, rgba(255,255,255,.22), transparent 55%), linear-gradient(165deg, #ef4444 0%, #991b1b 100%);
}
.glass-card.spy-card-green {
  background: radial-gradient(110% 70% at 50% -5%, rgba(255,255,255,.22), transparent 55%), linear-gradient(165deg, #22c55e 0%, #15803d 100%);
}
.glass-card.spy-card-purple {
  background: radial-gradient(110% 70% at 50% -5%, rgba(255,255,255,.22), transparent 55%), linear-gradient(165deg, #a855f7 0%, #6b21a8 100%);
}
```

> `GlassCard` всегда добавляет класс `glass-card`; наши классы идут в `className`
> того же элемента → селектор `.glass-card.spy-card` срабатывает.

---

## Шаг 2 — spy/page.tsx: точечные замены className

Делать как точные строковые замены. Где указано «(все N)» — заменить все
вхождения (они идентичны и все целевые).

1. Peek-bar (1 шт):
   - НАЙТИ: `className="glass-card w-full px-4 py-1 select-none border-teal-400/20"`
   - НА:    `className="glass-card spy-card w-full px-4 py-1 select-none"`

2. Правила modeSelect (1 шт):
   - НАЙТИ: `className="p-4 space-y-3"`
   - НА:    `className="spy-card p-4 space-y-3"`

3. Карточки «ты ШПИОН» p-6 (все 2):
   - НАЙТИ: `className="p-6 text-center space-y-4 border-red-400/30 bg-red-500/10"`
   - НА:    `className="spy-card-red p-6 text-center space-y-4"`

4. Слово для рисования, фиолетовая (1 шт):
   - НАЙТИ: `className="p-6 text-center space-y-4 border-purple-400/30 bg-purple-500/10"`
   - НА:    `className="spy-card-purple p-6 text-center space-y-4"`

5. Твоё секретное слово, бирюзовая p-6 (1 шт):
   - НАЙТИ: `className="p-6 text-center space-y-4 border-teal-400/30 bg-teal-500/10"`
   - НА:    `className="spy-card p-6 text-center space-y-4"`

6. Шапка раунда playing (1 шт):
   - НАЙТИ: `className="p-4 flex items-center justify-between gap-3"`
   - НА:    `className="spy-card p-4 flex items-center justify-between gap-3"`

7. «Твой ход», бирюзовая (1 шт):
   - НАЙТИ: `className="p-4 text-center border-teal-400/25 bg-teal-500/10"`
   - НА:    `className="spy-card p-4 text-center"`

8. Нейтральные `p-4 text-center` (все 3):
   - НАЙТИ: `className="p-4 text-center"`
   - НА:    `className="spy-card p-4 text-center"`

9. «Угадай слово» шпион, красная p-5 (1 шт):
   - НАЙТИ: `className="p-5 space-y-4 border-red-400/30 bg-red-500/10"`
   - НА:    `className="spy-card-red p-5 space-y-4"`

10. Судья проверяет, бирюзовая p-5 (1 шт):
    - НАЙТИ: `className="p-5 space-y-4 border-teal-400/30 bg-teal-500/10"`
    - НА:    `className="spy-card p-5 space-y-4"`

11. «Голос принят» (1 шт):
    - НАЙТИ: `className="p-4 text-center text-sm text-white/60"`
    - НА:    `className="spy-card p-4 text-center text-sm text-white/60"`

12. Итог раунда (условный, 1 шт):
    - НАЙТИ: ``className={`p-4 ${s.roundResult.spyCaught ? 'border-green-400/35 bg-green-500/15' : 'border-red-400/35 bg-red-500/15'}`}``
    - НА:    ``className={`p-4 ${s.roundResult.spyCaught ? 'spy-card-green' : 'spy-card-red'}`}``

13. Hero-обёртки (gameOver + modeSelect, тёмный фон → бирюзовые иконки) (все 2):
    - НАЙТИ: `className="text-center space-y-2"`
    - НА:    `className="text-center space-y-2 text-teal-300"`
    (h2-заголовки внутри имеют явный `text-white` — останутся белыми; бирюзовым
    станут только иконки через currentColor.)

**НЕ трогать:** кнопки голосования (строка с `glass-card flex w-full items-center
gap-3 ...` + `selected ? 'border-teal-400/50 bg-teal-500/15' : 'border-white/10'`)
— оставляем матовыми, чтобы сохранить различие выбран/не выбран. Вложенные
под-панели `rounded-xl bg-white/5 p-3` — тоже не трогаем.

---

## Acceptance

- `npx tsc --noEmit` / `npm run lint` — без новых ошибок.
- В моб-Шпионе карточки имеют градиентный фон (бирюзовый/красный/зелёный/
  фиолетовый по смыслу), не матовое стекло. Текст читается.
- Кнопки голосования по-прежнему различают выбранную (не трогали).
- `.glass-card` других игр не изменён (правили только новые `.spy-card*` классы).
- НЕ коммитить. Отчёт → `codex-reports/271-spy-card-gradients.md`.
