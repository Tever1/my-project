# Decision records

Эти ADR объясняют только долговременные решения, которые нельзя безопасно
восстановить по одному коду:

1. [`001-room-state-and-game-host-authority.md`](./001-room-state-and-game-host-authority.md)
   — граница server room-state и client game-host state.
2. [`002-owner-game-host-and-mafia-moderator.md`](./002-owner-game-host-and-mafia-moderator.md)
   — разные управляющие роли.
3. [`003-preview-first-visual-baselines.md`](./003-preview-first-visual-baselines.md)
   — процесс редизайна и принятые baselines.
4. [`004-mafia-moderated-sequential-night.md`](./004-mafia-moderated-sequential-night.md)
   — обязательный ведущий и последовательная ночь.
5. [`005-independent-guest-browser-identity.md`](./005-independent-guest-browser-identity.md)
   — session-scoped guest ID и независимые тестовые окна.

Не добавляйте сюда bugfix/changelog. Новый ADR нужен только при важном
долговременном решении.
