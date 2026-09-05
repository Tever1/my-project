# TASK-360: «100 к 1» mobile — убрать лишний зазор между «Тема:» и названием темы

**Тип:** simple (1 файл, 1 блок)
**Whitelist:** `src/app/game/[roomId]/hundred-to-one/page.tsx`

## Причина

TASK-359 добавил текст «Тема:» перед названием темы (строка ~1014-1016):
```tsx
<p className="mb-2 mt-3 font-mono text-[24px] uppercase tracking-[4px] text-white/45">
  {l('Тема:', 'Topic:')} {topicName(topic.id, topic.name)}
</p>
```
`tracking-[4px]` (letter-spacing) применяется ко ВСЕЙ строке, включая пробел
между «Тема:» и названием — из-за этого визуально образуется слишком
большой зазор (ширина самого пробела + добавленный tracking с обеих сторон
от него). Пользователь пожаловался на этот зазор.

## Фикс

Раздели подпись и значение на два `<span>` внутри флекс-контейнера с явным
контролируемым отступом вместо letter-spacing на пробельном символе:
```tsx
<p className="mb-2 mt-3 flex items-center justify-center gap-1.5 font-mono text-[24px] uppercase text-white/45">
  <span className="tracking-[4px]">{l('Тема:', 'Topic:')}</span>
  <span className="tracking-[4px]">{topicName(topic.id, topic.name)}</span>
</p>
```
(`gap-1.5` — отправная точка, подбери значение так, чтобы зазор между
«Тема:» и названием темы визуально соответствовал обычному межсловному
пробелу, не больше). `tracking-[4px]` оставь внутри каждого `span`
отдельно, чтобы буквы внутри «Тема:» и внутри названия темы сохраняли
разрядку, но зазор МЕЖДУ ними не удваивался.

## Acceptance

- `npm run lint` и `npx tsc --noEmit` — чисто.
- Зазор между «Тема:» и названием темы визуально нормальный (не увеличенный
  letter-spacing'ом).
- НЕ коммитить. Отчёт в `codex-reports/360-h2o-mobile-title-topic-gap-fix.md`.
