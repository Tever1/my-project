# TASK-192: Вернуть цветную точку сложности в бейдж сложности (general waiting)

## Контекст
В TASK-191 из бейджа сложности убрали `DifficultyIcon` (цветная точка
зелёная/жёлтая/красная). Нужно вернуть её ТОЛЬКО в бейдж сложности.
Стиль `rounded-md ...` оставить. Бейдж темы — без иконки (не трогать).

`DifficultyIcon` уже определён и импортирован в обоих файлах (используется в final-фазе).

---

### 1. `src/app/game/[roomId]/quiz/page.tsx` (мобильный waiting)

Найди бейдж сложности (около строки 687):
```tsx
                {diffInfo && (
                  <span className="rounded-md border border-white/10 bg-white/5 backdrop-blur-xl px-5 py-2.5 text-lg font-semibold inline-flex items-center">
                    {locale === 'ru' ? diffInfo.titleRu : diffInfo.titleEn}
                  </span>
                )}
```

Замени на (добавлены `gap-2` и точка):
```tsx
                {diffInfo && (
                  <span className="rounded-md border border-white/10 bg-white/5 backdrop-blur-xl px-5 py-2.5 text-lg font-semibold inline-flex items-center gap-2">
                    <DifficultyIcon difficulty={diffInfo.id} size={16} />
                    {locale === 'ru' ? diffInfo.titleRu : diffInfo.titleEn}
                  </span>
                )}
```

---

### 2. `src/app/tv/[roomId]/[gameType]/page.tsx` (TV waiting)

Найди бейдж сложности (около строки 621):
```tsx
                  {diffInfo && (
                    <span className="rounded-md border border-white/10 bg-white/5 backdrop-blur-xl px-4 py-2 text-lg font-semibold inline-flex items-center">
                      {locale === 'ru' ? diffInfo.titleRu : diffInfo.titleEn}
                    </span>
                  )}
```

Замени на:
```tsx
                  {diffInfo && (
                    <span className="rounded-md border border-white/10 bg-white/5 backdrop-blur-xl px-4 py-2 text-lg font-semibold inline-flex items-center gap-2">
                      <DifficultyIcon difficulty={diffInfo.id} size={16} />
                      {locale === 'ru' ? diffInfo.titleRu : diffInfo.titleEn}
                    </span>
                  )}
```

---

## Whitelist файлов
- `src/app/game/[roomId]/quiz/page.tsx`
- `src/app/tv/[roomId]/[gameType]/page.tsx`

## Не трогать
- Бейдж темы (topicInfo) — без иконки, как сейчас
- specialQuizInfo/specialThemeInfo/final ветки
- Другие игры, CLAUDE.md, AGENTS.md, codex-tasks/

## Acceptance criteria
- `npm run lint` — чистый
- Бейдж сложности содержит `<DifficultyIcon difficulty={diffInfo.id} size={16} />` и `gap-2`
- Бейдж темы остаётся без иконки

## Отчёт
Сохрани в `codex-reports/192-difficulty-color-dot-back.md`
