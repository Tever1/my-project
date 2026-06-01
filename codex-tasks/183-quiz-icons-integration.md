# TASK-183: Интеграция кастомных иконок квиза (заменить эмодзи на <img>)

## Контекст
В `public/icons/quiz/` появились 6 RGBA PNG файлов:
- `random.png` (🎲 Случайные)
- `science.png` (🔬 Наука)
- `history.png` (📜 История)
- `pop-culture.png` (🎬 Поп-культура)
- `harry-potter.png` (⚡ Гарри Поттер тема)
- `marvel.png` (🦸 Marvel тема)

## Whitelist
- `src/lib/quiz/index.ts`
- `src/app/game/[roomId]/quiz/page.tsx`
- `src/app/tv/[roomId]/[gameType]/page.tsx`

---

## Fix 1: `src/lib/quiz/index.ts` — убрать emoji из icon полей

В `QUIZ_TOPICS` (строки ~17-20) и `QUIZ_DIFFICULTIES` (строки ~47-50) поля `icon` используются в JSX как `{topicInfo.icon}`. Нам нужно иметь путь к картинке вместо эмодзи.

**Добавить поле `iconUrl` в каждый элемент:**

Для `QUIZ_TOPICS` (тип пока `string` — TypeScript не сломается, так как мы добавляем поле):
```ts
{ id: 'random',      titleRu: 'Случайные вопросы', titleEn: 'Random Questions',  icon: '🎲', iconUrl: '/icons/quiz/random.png' },
{ id: 'science',     titleRu: 'Наука',              titleEn: 'Science',           icon: '🔬', iconUrl: '/icons/quiz/science.png' },
{ id: 'history',     titleRu: 'История',            titleEn: 'History',           icon: '📜', iconUrl: '/icons/quiz/history.png' },
{ id: 'pop-culture', titleRu: 'Поп-культура',       titleEn: 'Pop Culture',       icon: '🎬', iconUrl: '/icons/quiz/pop-culture.png' },
```

Для `SPECIAL_QUIZ_THEMES`:
```ts
{ id: 'harry-potter', ..., icon: '⚡', iconUrl: '/icons/quiz/harry-potter.png', backgroundUrl: '...' },
{ id: 'marvel',       ..., icon: '🦸', iconUrl: '/icons/quiz/marvel.png',       backgroundUrl: '...' },
```

Для `SPECIAL_QUIZZES`:
```ts
{ id: 'harry-potter-1', ..., icon: '⚡', iconUrl: '/icons/quiz/harry-potter.png', backgroundUrl: '...' },
{ id: 'marvel-1',       ..., icon: '🦸', iconUrl: '/icons/quiz/marvel.png',       backgroundUrl: '...' },
```

**ВАЖНО:** поля `icon` оставить (используются в других местах). Только ДОБАВИТЬ `iconUrl`.

Также в TypeScript-интерфейсах (`QuizTopicInfo`, `SpecialQuizThemeInfo`, `SpecialQuizInfo` в `src/types/game.ts`) нужно добавить `iconUrl?: string` — если тип там описан. Проверь файл.

---

## Fix 2: `src/app/game/[roomId]/quiz/page.tsx` — заменить эмодзи на картинки

Везде где рендерится `{topicInfo.icon}`, `{diffInfo.icon}`, `{specialQuizInfo.icon}`, `{specialThemeInfo.icon}` — заменить на:

```tsx
// Хелпер для иконки (добавить перед return):
function QuizIcon({ iconUrl, fallback, size = 32 }: { iconUrl?: string; fallback: string; size?: number }) {
  if (iconUrl) {
    return <img src={iconUrl} alt="" width={size} height={size} style={{ objectFit: 'contain', display: 'inline-block' }} />;
  }
  return <span>{fallback}</span>;
}
```

Или просто инлайново там где используется:
```tsx
// Было: {topicInfo.icon}
// Стало:
{topicInfo.iconUrl
  ? <img src={topicInfo.iconUrl} alt="" width={32} height={32} style={{objectFit:'contain',display:'inline-block',verticalAlign:'middle'}} />
  : topicInfo.icon}
```

Применить замену в СЛЕДУЮЩИХ местах:
1. Бейджи сложности/темы в waiting/playing состоянии (строки ~976-990 приблизительно)
2. Кнопки выбора темы в setup-topic (строки ~928-960)
3. Бейджи в setup экранах
4. В финальном/промежуточном leaderboard где показываются бейджи темы

**В кнопках выбора темы (setup-topic)** — иконка крупная (32-40px).
**В бейджах (glass-badge)** — иконка маленькая (20px).

---

## Fix 3: `src/app/tv/[roomId]/[gameType]/page.tsx` — то же самое для TV

Аналогично fix 2, в TV-рендере квиза заменить `{specialQuizInfo.icon}` и `{specialThemeInfo.icon}` и `{topicInfo.icon}` на `<img>` с iconUrl (если есть).

---

## Acceptance criteria
- [ ] В quiz setup нет стандартных эмодзи как иконок тем/сложности/спец-квизов
- [ ] На их месте кастомные PNG иконки из `/icons/quiz/`
- [ ] Старые поля `icon` сохранены (не сломали другие места)
- [ ] `npm run lint` и `npx tsc --noEmit` проходят

## Не трогать
- `🥇🥈🥉🏆✅❌` — функциональные индикаторы, не трогаем
- CLAUDE.md, AGENTS.md, .codex/STATUS.md
- QUIZ_DIFFICULTIES icon поле (оставить, но добавить iconUrl если нужно)

## Отчёт
`codex-reports/183-quiz-icons-integration.md`
