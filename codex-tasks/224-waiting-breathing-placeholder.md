# TASK-224: Унификация waiting-плейсхолдеров (BreathingPlaceholder) в 6 играх

> **Метаданные**
> - **Дата создания:** 2026-06-07
> - **Сложность:** simple
> - **Запуск:** auto by Claude (codex exec)
> - **Ожидаемое время Codex:** ~10 минут
> - **Зависит от тасков:** —

---

## Цель

Привести «экраны ожидания ведущего» в 6 играх к тому же виду, что в Квизе:
вместо статичного текста / `animate-pulse` использовать компонент
`<BreathingPlaceholder variant="breathing-text" />` (дыхательная анимация
прозрачности). Чисто визуальная унификация.

---

## Контекст

Квиз использует `BreathingPlaceholder` (`@/components/ingame`) для сообщений
не-ведущему («Ожидание ведущего...»). Остальные игры показывают обычный `<p>`
с текстом или `animate-pulse`. Компонент:
`<BreathingPlaceholder text={...} variant="breathing-text" />`
(см. `src/components/ingame/BreathingPlaceholder.tsx`).

---

## Файлы к изменению (whitelist)

- `src/app/game/[roomId]/crocodile/page.tsx`
- `src/app/game/[roomId]/spy/page.tsx`
- `src/app/game/[roomId]/who-am-i/page.tsx`
- `src/app/game/[roomId]/alias/page.tsx`
- `src/app/game/[roomId]/mafia/page.tsx`
- `src/app/game/[roomId]/hundred-to-one/page.tsx`

### НЕ ТРОГАТЬ

- `src/components/ingame/**` — компонент готов, только импортировать.
- `quiz/page.tsx` (эталон), сервер, защищённые файлы.

---

## Шаги реализации

Для КАЖДОГО файла:
1. Импортировать: `import { BreathingPlaceholder } from '@/components/ingame';`
   (проверить, что путь/barrel экспортит — как в `quiz/page.tsx`).
2. Заменить ТОЛЬКО основной плейсхолдер «ведущий выбирает / ожидание ведущего»
   на `<BreathingPlaceholder text={<двуязычная строка>} variant="breathing-text" />`,
   сохранив существующую двуязычную строку (через `l(...)` или `locale === 'ru'`).
   Конкретные места:
   - **crocodile** строка ~421 (waiting: «Ожидание хоста...»). Строку 608
     (finished «Ожидание хоста...») МОЖНО тоже заменить — на усмотрение, но
     единообразно.
   - **spy** строка ~412 («Хост выбирает режим...») — убрать `animate-pulse` у
     обёртки, поставить BreathingPlaceholder.
   - **who-am-i** строка ~330 («Ожидание ведущего...»).
   - **alias** строки ~672-673 (ожидание/«Хост выбирает режим...»).
   - **mafia** строка ~524 («Ожидание ведущего...»).
   - **hundred-to-one** строка ~630 («Хост выбирает тему...») — убрать
     `animate-pulse`.
3. НЕ трогать мелкие inline-статусы типа «Ждём вторую команду...»,
   «Ожидание...» внутри списков игроков — только ГЛАВНЫЙ экран ожидания
   ведущего/старта.

> Не менять текст, логику, identity. Только обёртка плейсхолдера. Если
> BreathingPlaceholder где-то не влезает по вёрстке — оставить как было и
> отметить в отчёте.

---

## Acceptance criteria

- [ ] `npm run lint` без новых ошибок.
- [ ] `npx tsc --noEmit` чисто.
- [ ] В 6 файлах основной waiting-плейсхолдер ведущего использует
      `BreathingPlaceholder variant="breathing-text"`.
- [ ] Строки остались двуязычными.
- [ ] Логика/identity не изменены.

---

## Ограничения и подводные камни

- **i18n:** сохранить двуязычные строки.
- **Scope:** только визуальная замена плейсхолдера; ничего больше.
- **Комментарии** — английские.

---

## Контрольные точки самопроверки Codex

1. `git diff --stat` — только 6 файлов из whitelist.
2. `npm run lint` + `npx tsc --noEmit`.
3. Отчёт `codex-reports/224-waiting-breathing-placeholder.md`.
4. **Не коммитить.**

---

## Открытые вопросы для Codex

- Трогать ли inline-статусы в списках? — **нет**, только главный waiting-экран.
