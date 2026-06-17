# TASK-243 — Spy live-QA fixes (волна 7)

## Контекст
Live-QA Шпиона. 3 правки. Только клиент.

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

## #1 — peek-bar «твоё слово» уже на 20%
Файл `spy/page.tsx`, функция `renderPeekBar()` (~строка 799). Внешний div сейчас:
```
className="glass-card w-full p-4 select-none border-teal-400/20"
```
Сделать на 80% ширины, по центру:
```
className="glass-card mx-auto w-4/5 p-4 select-none border-teal-400/20"
```
(`w-full` → `mx-auto w-4/5`). Остальное (`style={{ transform: 'none' }}`, min-h контента,
внутреннюю верстку) НЕ трогать.

---

## #2 + #3 — кнопка «← К выбору режима»: подтверждение не двигает соседние кнопки + подтверждение только во время раунда (идёт таймер)
Файл `spy/page.tsx`, функция `renderBackButton()` (~строка 880).

Полностью заменить тело `renderBackButton` на версию ниже. Логика:
- подтверждение ✓/✗ нужно ТОЛЬКО когда идёт раунд с таймером: `s.phase === 'playing' && s.timerRunning`;
- в остальных случаях (dealing, roundResult, playing без таймера) — мгновенный переход
  (обычная кнопка, без ✓/✗);
- у версии с подтверждением контейнер имеет фиксированную высоту `min-h-[28px]` —
  появление ✓/✗ не меняет высоту строки и не сдвигает соседние кнопки.

```tsx
const renderBackButton = () => {
  if (!isGameHost) return null;

  const needConfirm = s.phase === 'playing' && s.timerRunning;

  if (!needConfirm) {
    return (
      <button
        type="button"
        onClick={backToModeSelect}
        className="self-start text-sm text-white/50 hover:text-white/80"
      >
        {l('← К выбору режима', '← Back to mode select')}
      </button>
    );
  }

  return (
    <div className="flex min-h-[28px] items-center gap-2 self-start">
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

Три вызова `{renderBackButton()}` (в dealing/playing/roundResult) НЕ трогать.
Стейт `confirmBack` и функцию `backToModeSelect` НЕ менять.

---

## Acceptance
- `npm run lint` без новых ошибок, `npx tsc --noEmit` чисто.
- diff только в `src/app/game/[roomId]/spy/page.tsx`.
- #1 peek-bar 80% ширины по центру. #2 появление ✓/✗ у «К выбору режима» не сдвигает
  соседние кнопки (высота строки зарезервирована). #3 подтверждение только в playing
  при идущем таймере; в dealing/roundResult — мгновенный переход без ✓/✗.
