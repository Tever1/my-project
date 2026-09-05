# TASK-179: Quiz — фриз при выходе в лобби, фон при выборе, плашка, плавный таймер

## Whitelist файлов
- `src/app/game/[roomId]/quiz/page.tsx`
- `src/app/tv/[roomId]/[gameType]/page.tsx`

---

## Bug 1: Выход «В лобби» из setup на мобилке морозит игровое поле (TV)

### Причина
Кнопка «В лобби» в setup-mode (строки ~686-691) делает только `router.push` на клиенте хоста. Сервер не получает `game:end`, поэтому TV остаётся на игровом поле (зависает).

### Фикс (`src/app/game/[roomId]/quiz/page.tsx`)
Кнопка на строке ~686-687:
```tsx
// Было:
<button
  onClick={() => router.push(user ? `/lobby/${roomId}` : `/join/${roomId}`)}
// Стало (использовать confirmEndGame — он эмитит game:end → TV уходит в лобби, и навигирует этого клиента):
<button
  onClick={confirmEndGame}
```
`confirmEndGame` уже определён выше (эмитит `game:end` и делает `router.push` с user-aware target). Менять только onClick, остальное у кнопки не трогать.

---

## Bug 2: Фон гарри-поттера показывается до выбора квиза

### Причина
`backgroundUrl` падает на `specialThemeInfo.backgroundUrl`, поэтому на шаге выбора номера (и темы) фон уже = картинке темы, хотя конкретный квиз ещё не выбран.

### Фикс — убрать fallback на тему в ОБОИХ файлах

`src/app/game/[roomId]/quiz/page.tsx`, строка ~669:
```tsx
// Было:
const backgroundUrl = specialQuizInfo?.backgroundUrl ?? specialThemeInfo?.backgroundUrl ?? topicInfo?.backgroundUrl;
// Стало:
const backgroundUrl = specialQuizInfo?.backgroundUrl ?? topicInfo?.backgroundUrl;
```

`src/app/tv/[roomId]/[gameType]/page.tsx`, строка ~476:
```tsx
// Было:
const backgroundUrl = specialQuizInfo?.backgroundUrl ?? specialThemeInfo?.backgroundUrl ?? topicInfo?.backgroundUrl;
// Стало:
const backgroundUrl = specialQuizInfo?.backgroundUrl ?? topicInfo?.backgroundUrl;
```

Теперь фон нейтральный на всех setup-шагах; картинка появляется только после фактического выбора квиза (specialQuizId установлен → фаза waiting).

(`specialThemeInfo` переменная остаётся — она используется для бейджей/заголовков. Убираем только из цепочки backgroundUrl.)

---

## Bug 3: Плашка «#номер + название» на выборе квиза — фиксированная ширина, перенос вниз

### Файл `src/app/game/[roomId]/quiz/page.tsx`, кнопки setup-special-quiz (строки ~888-893)

Сейчас внутренний flex-ряд не переносит длинное название (нет `min-w-0`), из-за чего ширина «гуляет». Кнопка `w-full` (фиксированная), но название должно переноситься вниз.

```tsx
// Было:
<div className="flex items-center gap-4">
  <span className="text-3xl font-black text-white">#{q.number}</span>
  <p className="text-lg font-semibold text-white">
    {locale === 'ru' ? specialThemeInfo.titleRu : specialThemeInfo.titleEn}
  </p>
</div>
// Стало:
<div className="flex items-center gap-4 min-w-0">
  <span className="text-3xl font-black text-white flex-shrink-0">#{q.number}</span>
  <p className="text-lg font-semibold text-white min-w-0 break-words">
    {locale === 'ru' ? specialThemeInfo.titleRu : specialThemeInfo.titleEn}
  </p>
</div>
```
Кнопка остаётся `w-full` (фиксированная ширина в пределах max-w-lg), название переносится на новую строку при нехватке места — кнопка растёт вниз.

---

## Bug 4: Таймер на мобилке должен убывать плавно (как на TV)

### Причина
Мобильная полоса использует `<motion.div>` со `style={{ width }}` + проп `transition`, но motion не анимирует изменение через `style` — отсюда рывки. На TV используется обычный div с CSS `transition-all duration-1000 ease-linear`, что даёт плавность.

### Фикс (`src/app/game/[roomId]/quiz/page.tsx`), строки ~1050-1058
```tsx
// Было:
<div className="w-full h-2 rounded-full bg-white/10 overflow-hidden mb-4">
  <motion.div
    className={`h-full rounded-full ${
      gameState.timeLeft <= 5 ? 'bg-red-500' : 'bg-purple-500'
    }`}
    style={{ width: `${(gameState.timeLeft / timePerQuestion) * 100}%` }}
    transition={{ duration: 1, ease: 'linear' }}
  />
</div>
// Стало (как на TV — обычный div + CSS transition):
<div className="w-full h-2 rounded-full bg-white/10 overflow-hidden mb-4">
  <div
    className={`h-full rounded-full transition-all duration-1000 ease-linear ${
      gameState.timeLeft <= 5 ? 'bg-red-500' : 'bg-purple-500'
    }`}
    style={{ width: `${(gameState.timeLeft / timePerQuestion) * 100}%` }}
  />
</div>
```

---

## Acceptance criteria
- [ ] Кнопка «В лобби» из setup квиза возвращает в лобби И мобилку И игровое поле (TV) — TV не зависает
- [ ] Фон во время выбора темы/номера квиза нейтральный; картинка появляется только после выбора квиза
- [ ] Плашки выбора номера квиза одинаковой (фиксированной) ширины, длинное название переносится вниз
- [ ] Полоса таймера на мобилке убывает плавно (CSS transition), без рывков
- [ ] `npm run lint` и `npx tsc --noEmit` проходят

## Не трогать
- Другие игры
- CLAUDE.md, AGENTS.md, .codex/STATUS.md

## Отчёт
`codex-reports/179-quiz-setup-bg-timer-fixes.md`
