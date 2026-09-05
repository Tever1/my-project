# TASK-359: «100 к 1» mobile — экран title: «Тема: {название}» вдвое крупнее

**Тип:** simple (1 файл, 1 строка)
**Whitelist:** `src/app/game/[roomId]/hundred-to-one/page.tsx`

## Что сделать

В фазе `s.phase === 'title'` (строка ~1014):
```tsx
<p className="mb-2 mt-3 font-mono text-[12px] uppercase tracking-[4px] text-white/45">{topicName(topic.id, topic.name)}</p>
```
Заменить на строку в формате «Тема: {название}» (слева подпись «Тема:»,
справа название темы), с шрифтом в 2 раза больше текущего (`text-[12px]` →
`text-[24px]`). Локализация подписи через `l('Тема:', 'Topic:')`. Пример:
```tsx
<p className="mb-2 mt-3 font-mono text-[24px] uppercase tracking-[4px] text-white/45">
  {l('Тема:', 'Topic:')} {topicName(topic.id, topic.name)}
</p>
```
Если после увеличения шрифта строка визуально не помещается по ширине
на маленьких экранах — можно чуть уменьшить `tracking` (например `tracking-[2px]`),
но не размер шрифта.

## Acceptance

- `npm run lint` и `npx tsc --noEmit` — чисто.
- На экране `title` (мобильный) видно «Тема: {название}» вдвое крупнее
  прежнего текста.
- НЕ коммитить. Отчёт в `codex-reports/359-h2o-mobile-title-topic-label.md`.
