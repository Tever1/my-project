# TASK-245 — Spy draw canvas: fit на TV (игровое поле), откат мобильного

## Контекст
В TASK-244 #2 «холст уходит за нижний край» относилось к TV-экрану («игровое поле»),
а правка ушла в мобильный по ошибке. Чиним TV, мобильный возвращаем как было.

## Whitelist (трогать ТОЛЬКО эти файлы)
- `src/app/game/[roomId]/spy/page.tsx` — откат мобильного холста
- `src/app/tv/[roomId]/[gameType]/page.tsx` — фикс TV-холста

## ЗАПРЕЩЕНО трогать
- `CLAUDE.md`, `AGENTS.md`, `.codex/**`, `codex-tasks/**`, `codex-reports/**`
- серверный код, `globals.css`, любые другие файлы

## Правила
- Минимальный diff, НЕ переформатировать.
- НЕ запускать `npm run build`. Валидация: `npm run lint` + `npx tsc --noEmit`.
- codex-reports не трогать (отчёт в выводе).

---

## #1 — Откат мобильного холста (spy/page.tsx)
Компонент `DrawCanvas`, элемент `<canvas>` (~строка 107). Сейчас:
```
className={`mx-auto w-full max-w-[45vh] aspect-square rounded-xl bg-black/30 border transition-all touch-none ${canDraw ? 'border-amber-400/40' : 'border-white/10'}`}
```
Вернуть как было (убрать `mx-auto ` и `max-w-[45vh] `):
```
className={`w-full aspect-square rounded-xl bg-black/30 border transition-all touch-none ${canDraw ? 'border-amber-400/40' : 'border-white/10'}`}
```

---

## #2 — Фикс TV-холста: вписывать в доступную область (tv/[roomId]/[gameType]/page.tsx)
Блок draw (~строки 1241-1247). Сейчас холст:
```tsx
<div className="flex-1 min-h-0 w-full flex items-center justify-center">
  <canvas
    ref={initSpyCanvas}
    className="rounded-2xl bg-black/30 border-2 border-white/10"
    style={{ width: 'min(100%, calc(100vh - 10rem))', aspectRatio: '1' }}
  />
</div>
```
Проблема: ширина считается от `100vh - 10rem`, без учёта TV-шапки (HUD), строки
«Рисует:» и нижнего бара «Порядок хода» → квадрат вылезает за нижний край.
Родитель `flex-1 min-h-0 ... flex items-center justify-center` уже даёт реальную
доступную высоту — пусть холст вписывается в неё по обеим осям, сохраняя квадрат.
Заменить `style` на:
```tsx
style={{ height: '100%', maxWidth: '100%', maxHeight: '100%', aspectRatio: '1' }}
```
Так квадрат ограничен и высотой контейнера (`height: 100%` + `maxHeight: 100%`), и его
шириной (`maxWidth: 100%`) — не вылезает снизу. `ref={initSpyCanvas}` и className не трогать.
Логику `initSpyCanvas`/`spy:stroke` не трогать (читает фактический размер через
`getBoundingClientRect`).

---

## Acceptance
- `npm run lint` чисто, `npx tsc --noEmit` чисто.
- diff только в двух whitelisted-файлах.
- Мобильный холст — снова `w-full aspect-square` (как до TASK-244). TV-холст
  вписывается в окно, не уходит за нижний край, остаётся квадратным.
