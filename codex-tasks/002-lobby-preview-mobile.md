# TASK-002: Mobile layout для /lobby-preview

> **Метаданные**
> - **Дата создания:** 2026-05-02
> - **Сложность:** complex
> - **Запуск:** manual by user (Codex Desktop)
> - **Ожидаемое время Codex:** ~15–25 минут
> - **Зависит от тасков:** —

---

## Цель

Адаптировать страницу `/lobby-preview` под мобильные экраны (≤ 768px). Сейчас
двухколоночный hero (1fr 1fr) ломается на узких экранах. Нужен stacked-layout
для мобилы с сохранением «вау-эффекта». Десктопный layout (≥ 769px) НЕ должен
измениться визуально.

---

## Контекст

`/lobby-preview` — это прототип нового PS5 × Liquid Glass лобби (Phase D из
дизайн-плана). Десктопный вариант утверждён и работает. Сейчас файл —
1313 строк, использует **inline styles** (не Tailwind, не styled-components).
Задача — добавить mobile-вариант теми же inline styles, через хук `useIsMobile`.

Важно: `/lobby-preview` — это dev/preview-страница, **только русский**, без i18n.

---

## Файлы к изменению (whitelist)

- `src/app/lobby-preview/page.tsx` — единственный файл

### НЕ ТРОГАТЬ

- Никакие другие файлы. В частности:
  - `src/components/glass/*` — не править glass-компоненты
  - `src/lib/design/tokens.ts` — токены не трогать
  - `src/components/GameIcon.tsx` — иконки уже работают в fill-mode
  - **Все остальное** в `src/`
- `CLAUDE.md`, `AGENTS.md`, `.codex/*.md` — не трогать
- НЕ создавать новые файлы (хук пишем inline в этом же файле, не отдельным
  файлом — иначе придётся просить расширить whitelist)

---

## Шаги реализации

### 1. Добавить inline `useIsMobile` хук в начале файла

После импортов, перед `LobbyPreviewPage`:

```tsx
function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(false); // SSR-safe default
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint}px)`);
    const onChange = () => setIsMobile(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [breakpoint]);
  return isMobile;
}
```

**Важно:** initial state `false` (десктоп). Это гарантирует SSR-консистентность
(сервер всегда отдаёт десктоп-разметку, на клиенте matchMedia переключит).

### 2. Использовать в `LobbyPreviewPage`

```tsx
const isMobile = useIsMobile();
```

И прокинуть в нужные секции через props или применить inline.

### 3. Адаптация hero-секции (главное изменение)

Текущая сетка `gridTemplateColumns: "1fr 1fr"` на мобиле должна стать:
- `gridTemplateColumns: "1fr"` (одна колонка)
- `gap: 32` (вместо `120`)
- `padding: "16px 16px"` (вместо `"32px 32px"`)
- `<TiltedPreview>` **полностью скрыть на мобиле** (либо `display: none`,
  либо условный рендер) — он бесполезен в узкой колонке и ломает композицию.

Проверь строки ~160-180 (там именно `gridTemplateColumns`).

### 4. Адаптация TopBar

На мобиле:
- Скрыть nav-кнопки (или схлопнуть в hamburger — но проще скрыть).
  Только `<BrandMark>` слева + `<RoomButton>` справа.
- `<FriendsOnlinePill>` скрыть на мобиле (мало места).
- `<AvatarPill>` оставить, но без имени (только аватар-кружок).
- Padding TopBar уменьшить с `24px 32px` до `12px 16px` (или близко).
- Если nav обернёт — лучше вообще `display: none` для nav на мобиле.

### 5. Адаптация HeroLeft (заголовок и описание)

Внутри `HeroLeft` найди:
- Big title — на мобиле уменьшить fontSize. Десктоп вероятно `64-80px`,
  мобила — `40-44px`.
- Description — fontSize `~14px` (десктоп) → `~13px` (мобила) или оставить.
- Meta-pills row — должен переноситься (`flexWrap: "wrap"`), gap уменьшить.
- CTA-row («Начать партию» + «Правила» + inline join input) — на мобиле
  стэкать вертикально (`flexDirection: "column"`, `alignItems: "stretch"`),
  кнопки и input на всю ширину.

### 6. Tile strip (внизу)

Tile-strip уже скроллится горизонтально — оставь этот паттерн.
- Tile size на мобиле уменьшить (например с `width: 144` до `width: 110`).
- Padding контейнера уменьшить.
- Скролл должен оставаться `overflow-x: auto` с `scroll-snap-type` если он
  был.

Если sizes тайлов прописаны жёстко в компоненте `<Tile>` — **не меняй сам
Tile**, переопредели через obёртку или прокинь проп. Проще всего: в
секции tile-strip-контейнера задать `gap: 12` (вместо ~24) и `overflow-x:
auto`. Размеры самой плитки можно не уменьшать если уже compact.

### 7. Floating badges над TiltedPreview

Если TiltedPreview скрыт на мобиле — badges тоже скрыть.

---

## Acceptance criteria

- [ ] При ширине окна `375px` (iPhone SE) ничего не выходит за viewport (нет
      горизонтального скролла, кроме намеренного scroll-snap у tile-strip).
- [ ] При ширине `768px` ещё мобильный layout, при `769px` — десктопный.
- [ ] `<TiltedPreview>` и floating badges не видны на мобиле.
- [ ] Nav-кнопки и FriendsOnlinePill не видны на мобиле.
- [ ] CTA-кнопки и join-input на мобиле занимают полную ширину, стэкаются.
- [ ] Десктопный layout (≥ 769px) визуально **идентичен** тому что было
      до таска. Открой `/lobby-preview` в Chrome широком окне и сравни.
- [ ] Нет hydration warning в console (`useIsMobile` initial = false
      гарантирует SSR-консистентность).
- [ ] `npm run lint` не показывает новых проблем.
- [ ] Build пускает Claude вне sandbox — ты сам не пытайся.

---

## Ограничения и подводные камни

- **i18n:** строки на этой странице остаются только русские (правило проекта
  для preview-страниц).
- **Никаких новых зависимостей.** Не ставь react-responsive, useMediaQuery
  пакеты — пишем inline хук.
- **Inline styles, не Tailwind.** Файл выдержан в одном стиле, не ломай его.
- **Не добавляй CSS-файлы** и не используй `<style jsx>` блоки — оставайся
  в inline.
- **SSR-консистентность:** initial state `useIsMobile` ОБЯЗАТЕЛЬНО `false`,
  иначе будет hydration mismatch.
- **Не трогай <GameIcon>** — он уже работает в fill-mode, любые правки сломают
  десктоп.

---

## Контрольные точки для самопроверки Codex

1. `git diff --stat` — должен показать только `src/app/lobby-preview/page.tsx`.
2. `npm run lint` — не должно появиться новых warnings/errors относительно
   состояния до таска (можно сравнить `npm run lint 2>&1 | tail -1` до и после).
3. Загляни в финальный код хука и убедись что cleanup в useEffect есть
   (`removeEventListener`).
4. Заполнить отчёт в `codex-reports/002-lobby-preview-mobile.md` по шаблону
   `codex-reports/_TEMPLATE.md`.
5. Не коммитить.

---

## Открытые вопросы для Codex

- Если в коде уже есть какая-то responsive-логика (Tailwind-классы вроде
  `md:` или CSS-media в `<style>`) — **не дублируй**, расширь существующую и
  отметь это в отчёте.
- Если решишь что nav на мобиле лучше схлопнуть в hamburger а не скрыть —
  **не делай**, это вне scope. Отметь как «возможное улучшение» в отчёте.
- Если breakpoint 768px явно мал/велик для контента — выбери своё значение
  (между 640px и 900px) и обоснуй в отчёте.
