# TASK-182: Скругления кнопок + ширина кнопки спец-квиза

## Whitelist
- `src/app/game/[roomId]/quiz/page.tsx`
- `src/app/game/[roomId]/spy/page.tsx`
- `src/app/game/[roomId]/alias/page.tsx`
- `src/app/game/[roomId]/who-am-i/page.tsx`
- `src/app/game/[roomId]/mafia/page.tsx`
- `src/app/game/[roomId]/hundred-to-one/page.tsx`
- `src/app/game/[roomId]/crocodile/page.tsx`

---

## Bug 4: Кнопка #1 Гарри Поттер / Marvel — фиксированная ширина и текст по центру

### `src/app/game/[roomId]/quiz/page.tsx`, строки ~882-895 (setup-special-quiz кнопки)

Сейчас:
```tsx
<button className="w-full rounded-md border p-5 text-left ...">
  <div className="flex items-center gap-4 min-w-0">
    <span className="text-3xl font-black text-white flex-shrink-0">#{q.number}</span>
    <p className="text-lg font-semibold text-white min-w-0 break-words">...</p>
  </div>
</button>
```

Нужно: кнопка на всю ширину, контент по центру, номер и название в одной строке по центру:
```tsx
<button className="w-full rounded-md border p-5 text-center ...">
  <div className="flex items-center justify-center gap-3">
    <span className="text-3xl font-black text-white">#{q.number}</span>
    <p className="text-lg font-semibold text-white">
      {locale === 'ru' ? specialThemeInfo.titleRu : specialThemeInfo.titleEn}
    </p>
  </div>
</button>
```
Убрать `min-w-0`, `flex-shrink-0`, `break-words` — они не нужны с `justify-center`.

---

## Bug 3: Скругления — унифицировать в `rounded-md` по всем играм

Эталон — варианты ответа в квизе: `rounded-md`.

Найти в каждом из 7 файлов кнопки-опции (выбор режима, темы, роли, команды — НЕ GlassButton, НЕ прогресс-бары, НЕ аватары) и заменить:
- `rounded-2xl` → `rounded-md`
- `rounded-xl` → `rounded-md` (только на кнопках-опциях)
- `rounded-lg` → `rounded-md` (только на кнопках-опциях)

**Что НЕ трогать:**
- `GlassButton`, `GlassCard`, `GlassPanel` — общие компоненты
- `rounded-full` — пилюли/аватары/прогресс-бары
- `rounded-2xl` / `rounded-xl` внутри модалов подтверждения (end game confirm)
- Компоненты UI в `src/components/`

Для каждого файла:
- **quiz/page.tsx:** уже `rounded-md` — проверить только mid/final leaderboard если ещё `rounded-2xl`
- **spy/page.tsx:** кнопки выбора режима (guess/draw), кнопки действий
- **alias/page.tsx:** кнопки выбора команды/режима
- **who-am-i/page.tsx:** кнопки действий
- **mafia/page.tsx:** кнопки выбора роли
- **hundred-to-one/page.tsx:** кнопки действий/ответов
- **crocodile/page.tsx:** кнопки действий

Подход: в каждом файле найти все `className` содержащие `rounded-2xl` или `rounded-xl` 
на элементах `<button` или кнопкообразных `<div`/`<motion.button` с `onClick` — и заменить на `rounded-md`.

## Acceptance criteria
- [ ] Кнопка #1 спец-квиза на всю ширину, текст по центру
- [ ] Во всех 7 игровых страницах нет `rounded-2xl`/`rounded-xl` на кнопках-опциях
- [ ] `npm run lint` и `npx tsc --noEmit` проходят

## Не трогать
- CLAUDE.md, AGENTS.md, .codex/STATUS.md

## Отчёт
`codex-reports/182-button-radius-and-width.md`
