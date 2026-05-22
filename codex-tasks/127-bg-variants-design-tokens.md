# TASK-127: Background variants — секция в /design-tokens

> **Метаданные**
> - **Дата создания:** 2026-05-21
> - **Сложность:** simple
> - **Запуск:** manual by user (Codex Desktop)
> - **Ожидаемое время Codex:** ~15 минут
> - **Зависит от тасков:** —

---

## Цель

Добавить в `src/app/design-tokens/page.tsx` секцию «Game Backgrounds»
с тремя вариантами фона на реалистичном примере (заглушка игрового экрана).

---

## Файлы к изменению (whitelist)

- `src/app/design-tokens/page.tsx`

### НЕ ТРОГАТЬ

- все остальные файлы
- `CLAUDE.md`, `AGENTS.md`

---

## Шаги реализации

Добавить в конец страницы (перед закрывающим `</main>`) новую секцию через
`<Section>` компонент.

### Структура секции

```tsx
<Section title="Game Backgrounds" subtitle="Варианты фона игровых экранов — выбор атмосферы">
  {/* 3 карточки рядом */}
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
    {/* Вариант A, B, C */}
  </div>
</Section>
```

### Каждая карточка — макет игрового экрана (320×480px)

```tsx
<div style={{ position: 'relative', width: '100%', aspectRatio: '2/3', borderRadius: 20, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)' }}>
  {/* Фон — задаётся индивидуально для каждого варианта */}
  <div style={{ position: 'absolute', inset: 0, background: '<ВОТ ФОНЫ>' }} />

  {/* Контент-заглушка (одинаковый для всех вариантов) */}
  {/* Хедер */}
  <div style={{ position: 'relative', padding: '16px 20px 12px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
    <span style={{ color: 'white', fontWeight: 700, fontSize: 16 }}>Квиз</span>
    <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>Раунд 3/10</span>
  </div>

  {/* Вопрос */}
  <div style={{ position: 'relative', margin: '20px 16px 16px', background: 'rgba(255,255,255,0.06)', borderRadius: 14, padding: '16px 18px', border: '1px solid rgba(255,255,255,0.1)' }}>
    <p style={{ color: 'white', fontWeight: 600, fontSize: 14, lineHeight: 1.5, margin: 0 }}>
      Какая планета самая большая в Солнечной системе?
    </p>
  </div>

  {/* 4 кнопки ответов */}
  {['Юпитер', 'Сатурн', 'Нептун', 'Марс'].map((answer, i) => (
    <div key={i} style={{ margin: '0 16px 8px', background: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: '10px 14px', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', gap: 10 }}>
      <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: 700, width: 20 }}>{i + 1}</span>
      <span style={{ color: 'white', fontSize: 13, fontWeight: 500 }}>{answer}</span>
    </div>
  ))}

  {/* Лейбл варианта */}
  <div style={{ position: 'absolute', bottom: 16, left: 0, right: 0, textAlign: 'center' }}>
    <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.35)' }}>
      ВАРИАНТ {A/B/C}
    </span>
  </div>
</div>
```

### Фон для каждого варианта

**Вариант A — Per-game radial glow** (текущий + жёлтый glow сверху):
```
background: 'radial-gradient(ellipse at 50% -10%, rgba(250,204,21,0.12) 0%, transparent 55%), linear-gradient(135deg, #0c0a15 0%, #1a1035 30%, #0f172a 60%, #0c0a15 100%)'
```

**Вариант B — Нейтральный премиум** (чистый почти-чёрный без фиолетового):
```
background: 'radial-gradient(ellipse at 50% 100%, rgba(255,255,255,0.03) 0%, transparent 60%), #08080f'
```

**Вариант C — Шумовая текстура** (нейтральный тёмный + SVG-шум):

Для шума использовать CSS `filter` + pseudo-element через inline `<style>`:
```tsx
<>
  <style>{`
    .bg-noise::before {
      content: '';
      position: absolute;
      inset: 0;
      background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.035'/%3E%3C/svg%3E");
      background-size: 200px 200px;
      pointer-events: none;
      z-index: 1;
    }
  `}</style>
  <div
    className="bg-noise"
    style={{
      position: 'absolute',
      inset: 0,
      background: '#09090f',
    }}
  />
</>
```
Контент-заглушка для Варианта C должна иметь `position: 'relative', zIndex: 2` на всех дочерних элементах.

---

## Acceptance criteria

- [ ] `npm run lint` без ошибок
- [ ] Страница `/design-tokens` открывается, секция «Game Backgrounds» видна
- [ ] Три карточки расположены в ряд (grid 3 колонки), каждая — игровой экран-заглушка с фоном
- [ ] Лейблы «ВАРИАНТ A/B/C» видны

---

## Ограничения и подводные камни

- **Не добавлять** интерактивность — карточки статичные (не нужны кнопки/state).
- **Не импортировать** ничего нового — все нужные инструменты уже в файле.
- **Вариант C с шумом**: inline `<style>` тег внутри JSX валиден в Next.js `"use client"` файлах.
- **Комментарии в коде** — английский.

---

## Контрольные точки для самопроверки Codex

1. `git diff --name-only` — только `src/app/design-tokens/page.tsx`.
2. `npm run lint` — чисто.
3. Отчёт в `codex-reports/127-bg-variants-design-tokens.md`.
4. **Не коммитить.**
