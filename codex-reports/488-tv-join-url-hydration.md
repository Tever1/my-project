# TASK-488 — TV join URL hydration

## Результат

Исправлено подтверждённое расхождение HTML в `WhoAmIClayTvLayout`: на сервере
адрес под кодом комнаты был `/join`, на первом клиентском render —
`http://localhost:3000/join`. Причина: чтение `window.location` непосредственно
при вычислении `siteUrl` в общей TV-странице.

## Scope

- `src/app/tv/[roomId]/[gameType]/page.tsx`: `siteUrl` теперь state с одинаковым
  пустым начальным значением для SSR и клиента. После mount существующий
  `/api/local-ip` заполняет адрес с актуальным портом; отсутствие IP или ошибка
  запроса возвращают browser origin. Текст и QR используют тот же адрес.
- `src/lib/tv-join-url.test.ts`: исполнение реальных URL declarations/effect
  из TV page в Node VM; SSR и первый client render, LAN/custom port,
  отсутствие IP и ошибка запроса.
- Дизайн, игровой flow, backend и чужие изменения сохранены.

## Проверки

- До исправления тест воспроизвёл `http://localhost:3000 !== ''`.
- После исправления 4 URL-теста и 6 Who Am I flow-тестов — 10/10 PASS.
- `npx tsc --noEmit`, scoped ESLint, `git diff --check` — PASS.
- Это изолированный регрессионный тест вычисления адреса, не browser hydration
  или multiplayer QA. Браузер, production build, commit/push не запускались.
- Dev-server не перезапускался; изменение frontend подхватывается dev-режимом.

## Осталось

По разрешению проверить hard reload TV в браузере; перед публикацией — отдельный
review общей TV-страницы. Следующий фактический номер 489; общие документы
этим игровым чатом не изменялись и требуют синхронизации общим чатом.
