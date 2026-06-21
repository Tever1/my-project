# TASK-255 — Крокодил: убрать host «Следующий игрок» + выровнять красные карточки

Продолжение TASK-253/254. Две мелкие правки мобильного экрана Крокодила.

## Whitelist (править ТОЛЬКО это)
- `src/app/game/[roomId]/crocodile/page.tsx`

ЗАПРЕЩЕНО: всё остальное (CLAUDE.md, AGENTS.md, .codex/**, codex-tasks/**,
codex-reports/**, server.mts, game-data.ts, globals.css, TV-файл, другие игры).
Минимальный diff: не переформатировать нетронутые строки.

## Immutable
- Двуязычность ru/en. Схема очков и socket-события НЕ трогать. Красная тема.

## Правка 1 — Убрать кнопку хоста «Следующий игрок →»
Удалить целиком блок:
```
{/* Host can force advance to next player */}
{isGameHost && !isExplainer && (
  <div className="w-full max-w-md">
    <GlassButton ... onClick={() => { clearInterval(timerRef.current); advanceToNextExplainer(gameState); }}>
      {locale === 'ru' ? 'Следующий игрок →' : 'Next Player →'}
    </GlassButton>
  </div>
)}
```
(Это последний блок внутри фазы ready/explaining, перед закрытием
`</div>` контейнера.) Функцию `advanceToNextExplainer` и обработчик таймаута НЕ
трогать — они вызываются из таймера и host-listener'а (`croc:next-player`).
Если после удаления `GlassButton` перестанет использоваться в файле — убрать его
import, иначе оставить. (Проверить: GlassButton ещё используется на стартовом
экране «Начать игру» и на finished «Играть снова» — значит import ОСТАЁТСЯ.)

## Правка 2 — Красные карточки одинакового размера
Сейчас карточка объясняющего больше карточек угадывающего. Сделать ВСЕ красные
карточки фазы ready/explaining одного размера (ширина и высота), как у
объясняющего.

Эталон (карточка объясняющего со словом): класс-обёртка содержит
`min-h-[320px] w-full max-w-md flex-1 ... rounded-[36px]`.

Привести к ТАКИМ ЖЕ габаритам две карточки не-объясняющего:
1. Карточка `ready && !isExplainer` («{explainer} готовится начать…») — сейчас
   `min-h-[260px] w-full max-w-md ... rounded-[32px]` (без `flex-1`).
2. Карточка `explaining && !isExplainer` («Угадывайте вслух!») — сейчас
   `min-h-[260px] w-full max-w-md ... rounded-[32px]` (без `flex-1`).

Для обеих: заменить `min-h-[260px]` → `min-h-[320px]`, `rounded-[32px]` →
`rounded-[36px]`, добавить `flex-1`. Сохранить центрирование контента
(`items-center justify-center`). Карточку `ready && isExplainer` (с кнопкой
НАЧАТЬ) тоже убедиться что `min-h-[320px] ... flex-1 rounded-[36px]` (если нет —
привести к тому же). Фон/тень/паддинги красных карточек не менять.

## Acceptance
- `npm run lint` без новых ошибок, `npx tsc --noEmit` чисто. НЕ запускать build.
- Изменения только в crocodile/page.tsx.
- У хоста нет кнопки «Следующий игрок». Все 4 красные карточки (ready/explaining ×
  explainer/non-explainer) одинаковой ширины и высоты.

## Отчёт
`codex-reports/255-crocodile-remove-next-equal-cards.md` (писать РАЗРЕШЕНО). Не коммитить.
