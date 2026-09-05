# TASK-298 — Alias редизайн, шаг 1: фон игры + плоские иконки + классы карточек

## Контекст
Начинаем редизайн «Угадай слово» (alias) по образцу Крокодила/Шпиона. Это ШАГ 1
из нескольких: (1) фон экрана + классы розовых карточек в globals + замена эмодзи
на `AliasIcon`. Карточки-поля перекрасим в розовый и кнопки переделаем по
Крокодилу — это СЛЕДУЮЩИЕ шаги, СЕЙЧАС НЕ ДЕЛАЕМ.

**ВИЗУАЛ ТОЛЬКО.** Не трогать игровую логику, хендлеры, socket-события, scoring,
фазы, classic/letter режимы (classic mode неприкосновенен — правило №3).

## Файл 1 — `src/app/globals.css`

### 1a) После `.bg-gradient-crocodile { ... }` (около стр. 738) ДОБАВИТЬ:
```css
.bg-gradient-alias {
  background: linear-gradient(135deg, #2a0a1f 0%, #3b0a2f 30%, #2a0a24 60%, #2a0a1f 100%);
  color: #f0eef6;
}
```

### 1b) После блока `.glass-card.spy-card-purple { ... }` (около стр. 284)
ДОБАВИТЬ классы розовых карточек Alias (по аналогии со spy-card):
```css
.glass-card.alias-card,
.glass-card.alias-card-green,
.glass-card.alias-card-red {
  color: #fdf2f8;
  border-color: rgba(255, 255, 255, 0.18);
}

.glass-card.alias-card {
  background: radial-gradient(110% 70% at 50% -5%, rgba(255,255,255,.22), transparent 55%), linear-gradient(165deg, #ec4899 0%, #9d174d 100%);
}

.glass-card.alias-card-green {
  background: radial-gradient(110% 70% at 50% -5%, rgba(255,255,255,.22), transparent 55%), linear-gradient(165deg, #22c55e 0%, #15803d 100%);
}

.glass-card.alias-card-red {
  background: radial-gradient(110% 70% at 50% -5%, rgba(255,255,255,.22), transparent 55%), linear-gradient(165deg, #ef4444 0%, #991b1b 100%);
}
```

## Файл 2 — `src/app/game/[roomId]/alias/page.tsx`

### 2a) Импорт
Добавить рядом с другими `@/components/games` импортами:
```
import { AliasIcon } from '@/components/games/AliasIcon';
```

### 2b) GameLayout (стр. 569–578)
- Добавить проп `gradientClass="bg-gradient-alias"` (как у Крокодила
  `gradientClass="bg-gradient-crocodile"`).
- Заменить `icon="💬"` на `icon={<AliasIcon name="speech" className="h-7 w-7" />}`.

### 2c) Замена ДЕКОРАТИВНЫХ эмодзи на `<AliasIcon>` по таблице:
| эмодзи | name | где |
|--------|------|-----|
| 💬 (заголовок стр. 583) | speech | inline перед текстом |
| 📖 (стр. 599) | book | карточка classic |
| 🔤 (стр. 627) | letters | карточка letter |
| 🎤 (стр. 803, 885) | mic | маркер ведущего |
| 🗣️ (стр. 929) | talk | «Угадывайте вслух» |
| ⏳ (стр. 950) | hourglass | ожидание |
| 🏆 (стр. 1054) | trophy | финал |
| ✅ (стр. 988, 998, 1017) | check | статистика угадано |
| ❌ (стр. 989, 999, 1017) | cross | статистика пропущено |
| 🥇 / 🥈 (стр. 1068) | medal | места команд |

Правила размеров/вёрстки:
- Крупные одиночные (🗣️ 929, 🏆 1054, ⏳ 950): обернуть в
  `<div className="mb-3 flex justify-center"><AliasIcon name="..." className="h-12 w-12" /></div>`
  (по образцу Крокодила — `CrocIcon name="talk" className="h-14 w-14"`).
- Иконки карточек режима (📖/🔤, заменяя `<span className="text-3xl">…</span>`):
  `<AliasIcon name="book|letters" className="h-8 w-8 shrink-0" />`.
- Инлайновые маркеры (🎤 в бейджах, ✅/❌ в строках статистики, 💬 в заголовке):
  `<AliasIcon name="..." className="inline-block h-[1em] w-[1em] align-[-0.15em]" />`
  (с `mr-1` где идёт перед текстом).
- Иконки наследуют `currentColor` — цвет берётся от текста, ничего доп. не задавать.

### НЕ ТРОГАТЬ в этом таске (следующие шаги):
- 🔀 в кнопке «Случайное распределение» (стр. 749).
- Символы внутри кнопок действий: «Угадали! ✓» (963), «Пропустить →» (971),
  «Начать игру →» (761), «Следующий ход →» (1044), «Начать ход!» — кнопки
  переделаем по Крокодилу отдельным шагом.
- Фон самих карточек (GlassCard) — пока матовый, перекрасим в `alias-card` отдельно.

## Whitelist (только эти файлы)
- `src/app/globals.css`
- `src/app/game/[roomId]/alias/page.tsx`
- `codex-reports/**` (отчёт)

НЕ трогать: TV, `AliasIcon.tsx`, другие игры, `CLAUDE.md`, `AGENTS.md`, `.codex/**`,
`codex-tasks/**`. **`npm run build` НЕ запускать** (Turbopack EPERM в sandbox) —
достаточно tsc + lint.

## Acceptance
- Экран Alias на тёмно-розовом фоне `bg-gradient-alias`.
- Декоративные эмодзи заменены на плоские `AliasIcon`; эмодзи действий-кнопок и
  🔀 пока на месте (следующий шаг).
- Классы `.alias-card{,-green,-red}` и `.bg-gradient-alias` есть в globals.
- Classic/letter логика не изменена.
- `npx tsc --noEmit` — без новых ошибок.
- `npm run lint` — без новых ошибок.
- Отчёт в `codex-reports/298-alias-redesign-bg-icons.md`. Не коммитить.
