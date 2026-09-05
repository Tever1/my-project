# TASK-242 — Spy live-QA fixes (волна 6)

## Контекст
Live-QA Шпиона. 2 правки. Только клиент.

## Whitelist (трогать ТОЛЬКО этот файл)
- `src/app/game/[roomId]/spy/page.tsx`

## ЗАПРЕЩЕНО трогать
- `CLAUDE.md`, `AGENTS.md`, `.codex/**`, `codex-tasks/**`, `codex-reports/**`
- серверный код (`server.mts`, `src/server/**`), `globals.css`, любые другие файлы

## Правила
- Минимальный diff, НЕ переформатировать файл.
- НЕ запускать `npm run build`. Валидация: `npm run lint` + `npx tsc --noEmit`.
- Двуязычность ru/en (`l(ru, en)`).
- codex-reports не трогать (отчёт в выводе).

---

## #1 — peek-bar «твоё слово»: не должен дёргаться/менять размер при нажатии
Файл `spy/page.tsx`, функция `renderPeekBar()` (~строки 794-826). Причина «дёрганья»:
`.glass-card` имеет `transform` на `:hover/:active` (приподнимание/оседание), плюс высота
растёт, когда раскрывается слово/«ТЫ ШПИОН». Зафиксировать размер и убрать движение.

1. На внешнем `<div className="glass-card w-full p-4 select-none border-teal-400/20" ...>`
   добавить inline-стиль, отключающий transform (inline-стиль перебивает `:hover/:active`):
```tsx
style={{ transform: 'none' }}
```
   (Добавить проп `style={{ transform: 'none' }}` к этому div, остальные пропы/классы оставить.)

2. Зарезервировать стабильную высоту контента, чтобы карточка не росла при раскрытии.
   Внутренний контент-блок (сейчас просто `<div>`, внутри `<p>твоё слово</p>` + ветка peeking):
```tsx
<div>
  <p className="text-xs text-white/40">{l('твоё слово', 'your word')}</p>
  ...
</div>
```
   заменить открывающий тег на:
```tsx
<div className="min-h-[60px]">
```
   Так высота не прыгает между состояниями (свёрнуто / слово / «ТЫ ШПИОН»). Ширина уже
   `w-full` — не трогать. Внутреннюю логику peeking не менять.

---

## #2 — «К выбору режима»: подтверждение перехода (inline ✓/✗ справа)
Файл `spy/page.tsx`. Сейчас кнопка `← К выбору режима` вызывает `backToModeSelect`
сразу, в трёх местах (фазы `dealing`, `playing`, `roundResult`). Нужно: первый тап
«взводит», справа появляются маленькие зелёная ✓ (подтвердить переход) и красная ✗
(отмена). Сам переход — только по ✓.

1. Добавить локальный стейт рядом с `confirmPlay`:
```tsx
const [confirmBack, setConfirmBack] = useState(false);
```

2. В функции `backToModeSelect` добавить сброс `confirmBack`:
```tsx
const backToModeSelect = () => {
  if (!isGameHost) return;
  setConfirmPlay(null);
  setConfirmBack(false);
  update({ phase: 'modeSelect' });
};
```

3. Добавить хелпер-рендер (рядом с `renderHostAction`):
```tsx
const renderBackButton = () => {
  if (!isGameHost) return null;
  return (
    <div className="flex items-center gap-2 self-start">
      <button
        type="button"
        disabled={confirmBack}
        onClick={() => setConfirmBack(true)}
        className="text-sm text-white/50 hover:text-white/80 disabled:opacity-100"
      >
        {l('← К выбору режима', '← Back to mode select')}
      </button>
      {confirmBack && (
        <>
          <button
            type="button"
            aria-label="confirm-back"
            onClick={backToModeSelect}
            className="flex h-7 w-7 items-center justify-center rounded-full border border-green-400/50 bg-green-500/25 text-green-300"
          >
            <SpyIcon name="check" className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label="cancel-back"
            onClick={() => setConfirmBack(false)}
            className="flex h-7 w-7 items-center justify-center rounded-full border border-red-400/50 bg-red-500/25 text-red-300"
          >
            <SpyIcon name="cross" className="h-4 w-4" />
          </button>
        </>
      )}
    </div>
  );
};
```

4. Заменить ВСЕ три инлайновых блока кнопки «← К выбору режима» (в фазах `dealing`,
   `playing`, `roundResult`) — сейчас каждый выглядит так:
```tsx
{isGameHost && (
  <button
    type="button"
    onClick={backToModeSelect}
    className="self-start text-sm text-white/50 hover:text-white/80"
  >
    {l('← К выбору режима', '← Back to mode select')}
  </button>
)}
```
   на вызов хелпера:
```tsx
{renderBackButton()}
```

---

## Acceptance
- `npm run lint` без новых ошибок, `npx tsc --noEmit` чисто.
- diff только в `src/app/game/[roomId]/spy/page.tsx`.
- #1 peek-bar не двигается и не меняет высоту/ширину при нажатии (только раскрывает слово).
  #2 «К выбору режима» требует подтверждения ✓/✗ во всех трёх фазах.
