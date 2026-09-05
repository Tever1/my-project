# TASK-356: «100 к 1» TV — убрать подсказку и увеличить шрифт темы

**Тип:** simple (1 файл, 2 точечные правки, точный код дан)
**Whitelist:** `src/app/tv/[roomId]/[gameType]/page.tsx` (только блок `gameType === 'hundred-to-one'`)

## 1. Убрать подсказку «Тема появится на экране после выбора.»

В блоке `h.phase === 'topicSelect'` (около строки 1233-1235):
```tsx
<p className="text-[24px] font-semibold text-white/45">
  {l('Тема появится на экране после выбора.', 'The topic will appear here after selection.')}
</p>
```
Удалить этот `<p>` целиком. Оставить только заголовок «Хост выбирает тему для
игры…» внутри той же карточки.

## 2. Увеличить в 2 раза шрифт названия темы на экране подготовки

На следующем экране (steps-screen, блок `h.phase === 'roleSelect' ||
'captainSelect' || 'teamNames'`), около строки 1295-1297:
```tsx
<div className="font-mono text-[14px] font-semibold uppercase tracking-[2px] text-white/38">
  {l('Тема:', 'Topic:')} <span className="text-amber-200/80">{h2oTopicName}</span>
</div>
```
Увеличь размер шрифта этого блока вдвое: `text-[14px]` → `text-[28px]`.
Остальные классы (цвет, tracking, uppercase) не менять. Если после увеличения
шрифта верстка (отступы/центрирование в колонке над шапкой) выглядит криво —
поправь только отступы (`gap`/`mt`) вокруг этого блока, не трогая остальные
элементы шапки.

## Acceptance

- `npm run lint` и `npx tsc --noEmit` — чисто.
- Подсказка «Тема появится...» больше не отображается на экране ожидания
  выбора темы.
- Название темы на экране подготовки — вдвое крупнее прежнего.
- НЕ коммитить. Отчёт в `codex-reports/356-h2o-topicselect-text-tweaks.md`.
