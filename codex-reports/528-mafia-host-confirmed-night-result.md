# TASK-528 — Отдельный итог ночи с продолжением ведущим

2026-09-13. Заменяет временное уведомление TASK-526 по новому запросу пользователя.

- После night-result сервер сохраняет phase=day, morningPending=true. Phone/TV показывают отдельный экран итогов ночи, имена погибших без ролей, или спокойную ночь. Только ведущий видит «Продолжить».
- Host-only morning-continue снимает ожидание и начинает полные60секунд обсуждения. Таймер в ожидании не убывает, start-voting и ранний game-over запрещены. Совместимый sync-state не может убрать ожидание. Snapshot/reconnect/TV сохраняют экран; он не исчезает автоматически.
- Если ночной результат завершает партию, финал появляется после продолжения ведущим. Серверная задержка завершения не обходится поверх pending экрана.
- Файлы: Mafia phone, общий TV (Mafia-only), game-security.mts, socket-handlers.mts, mafia-buttons.integration.test.mts, mafia-h2o-clock.integration.test.mts, новый mafia-morning-result.test.mts. Существующие dirty изменения сохранены; управляющие документы не правились.
- Автоматический прогон:10/10tests (morning,nightcompletion,clock,integration),127checkpoints,failures[]. Scope lint:4existing Mafia legacy warnings. TypeScript исправлен добавлением optional morningPending в TV snapshot type. Diff-check passed.
- TypeScript passed; после sync-state guard повторно прошли2morning tests и scoped lint. Сервер перезапущен по standing разрешению пользователя; PUBX9H потеряна. /admin HTTP200 подтверждён после запуска. Browser gameplay QA/build/commit/push не выполнялись. Fresh review server/privacy/TV перед публикацией pending.
- Следующий фактический номер529. TASK-526 — историческая итерация, временное уведомление больше не применяется в production phone/TV.

## Уточнение после пользовательского скриншота

Повторная карточка «Никто не покинул город / Ночь прошла спокойно» (включая вариант спасения Доктором) удалена из phone-экрана обсуждения после нажатия «Продолжить». Отдельный итог ночи и TV не изменены. Это UI-only правка, restart не требуется. Выполнены TypeScript, scoped ESLint и diff-check; browser QA не запускался.
