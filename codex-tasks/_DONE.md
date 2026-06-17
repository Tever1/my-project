# Codex Tasks — индекс закрытых задач

_Последняя синхронизация: 2026-06-16_

Одна строка на каждый TASK. Источник правды — файлы `codex-tasks/NNN-*.md`
(ТЗ) и `codex-reports/NNN-*.md` (отчёты). Этот индекс — быстрый обзор, чтобы
не дублировать историю работ в CLAUDE.md.

**Регенерация** (из заголовков H1 всех тасков):

```bash
bash codex-tasks/_regen-done.sh
```

Дата выше обновляется автоматически только при изменении списка тасков.

| TASK | Файл | Заголовок |
|------|------|-----------|
| 001 | `001-lint-unused-vars.md` | Убрать unused variables и unused eslint-disable |
| 002 | `002-lobby-preview-mobile.md` | Mobile layout для /lobby-preview |
| 002.1 | `002.1-mobile-polish.md` | Полировка mobile-layout (breakpoint + brand wrap) |
| 003 | `003-topbar-nowrap.md` | TopBar polish — nowrap для FriendsOnlinePill и RoomButton |
| 003.1 | `003.1-breakpoint-1024.md` | Поднять breakpoint 900 → 1024 |
| 004 | `004-gameicon-cached-load.md` | Fix GameIcon — cached image не показывается |
| 005 | `005-strip-icon-bg.md` | Удалить белый фон с иконок игр (RGB → RGBA) |
| 005.1 | `005.1-strip-bg-checkered.md` | Расширить strip-bg.mjs — убирать серые клетки шахматки |
| 005.2 | `005.2-strip-bg-floodfill.md` | Flood-fill в strip-bg.mjs — убрать светлый halo вокруг субъекта |
| 005.3 | `005.3-strip-bg-drop-achromatic.md` | Убрать ахроматический проход из strip-bg.mjs |
| 006 | `006-design-tokens-tile-variants.md` | Добавить секцию «Варианты тайла игры» в /design-tokens |
| 007 | `007-rename-alias-display.md` | Переименовать UI-надпись «Alias» → «Угадай слово» |
| 008 | `008-topbar-narrow-desktop.md` | TopBar polish для узкого десктопа (1025-1100px) |
| 009 | `009-remove-floating-badges.md` | Удалить floating-бейджи «8 онлайн» и «2 480 лучший рекорд» |
| 010 | `010-tile-keyboard-nav.md` | Keyboard navigation для tile-strip в /lobby-preview |
| 010.1 | `010.1-tile-vertical-nav.md` | Вертикальная навигация ↑/↓ между tile-strip и hero CTA |
| 010.2 | `010.2-arrowup-from-anywhere.md` | ArrowUp работает из любого места (не только когда фокус на тайле) |
| 010.3 | `010.3-topbar-keyboard-nav.md` | ↑/↓ навигация между TopBar, hero CTA и tile-strip |
| 010.4 | `010.4-enter-tile-focus-cta.md` | Enter на тайле → фокус на «Начать партию» |
| 011 | `011-tile-press-effect.md` | Press-effect на тайлах игр (как у CTA) |
| 011.1 | `011.1-tile-tap-variant.md` | Press-effect на тайле через variant (фикс TASK-011) |
| 012 | `012-fix-focus-rings-tile-press.md` | Видимые focus-ring везде + рабочий press-effect на тайлах |
| 013 | `013-tile-press-rewrite.md` | Переписать Tile motion — press на parent (НЕ на детях) |
| 013.1 | `013.1-tile-press-snappy.md` | Snappy transition для whileTap на тайле |
| 013.2 | `013.2-tile-press-state.md` | Press effect через явное state (mouse + Enter) |
| 014 | `014-tile-arrow-sync-focus.md` | Sync DOM focus с activeGame при ←/→ |
| 015 | `015-friends-pill-button-focus.md` | FriendsOnlinePill → button + проверить focus ring на RoomButton |
| 015.1 | `015.1-topbar-order-fix.md` | Visual left-to-right keyboard order в TopBar |
| 016 | `016-avatar-pill-button.md` | AvatarPill → button + focus ring + keyboard order |
| 017 | `017-rules-to-join-code-input.md` | Стрелкой → с «Правила» переходить на «Код комнаты» input |
| 018 | `018-joincode-esc-and-join-button.md` | Join-code — Esc для выхода + «Присоединиться» при 6 символах |
| 018.1 | `018.1-joincode-icon-button.md` | Join-submit как icon-only button + arrow-nav из input |
| 019 | `019-cta-row-shrink-15.md` | Уменьшить CTA row на 15% |
| 020 | `020-lobby-preview-socket-flow.md` | Socket.io flow в /lobby-preview |
| 021 | `021-room-menu-and-enter-join.md` | Enter для join + popup меню комнаты с QR |
| 022 | `022-host-controls-and-guest-wait.md` | Управление игроками хостом + гость остаётся в лобби |
| 024 | `024-lint-cleanup-wave-1.md` | Lint cleanup Волна 1 — ignores + автофикс + unused/any |
| 025 | `025-lint-cleanup-wave-2.md` | Lint cleanup Волна 2 — react-hooks/exhaustive-deps |
| 026 | `026-smoke-qa-wave2.md` | Smoke QA после Волн 1 и 2 |
| 027 | `027-lint-cleanup-wave-3.md` | Lint cleanup Wave 3 — react-hooks/* (11 errors → 0) |
| 028 | `028-unify-lobby-design.md` | Унификация дизайна лобби — `/` и `/lobby/[roomId]` рендерят один компонент |
| 029 | `029-replace-history-with-tv-mode-button.md` | Заменить кнопку «История» в лобби на «ТВ-режим» |
| 030 | `030-local-ip-qr-fix.md` | Фикс QR-кода: использовать реальный IP вместо localhost |
| 031 | `031-inline-auth-in-lobby.md` | Встроить авторизацию в лобби, удалить /auth страницы |
| 032 | `032-account-dropdown.md` | Выпадающее меню аккаунта в TopBar |
| 033 | `033-tile-strip-mobile-label-overlap.md` | Фикс: надпись «Все игры» налезает на иконки на мобильном |
| 034 | `034-tile-strip-mobile-fixes.md` | Мобильный tile-strip: фикс overlap и вертикального дрейфа |
| 035 | `035-phantom-player-and-touch-fix.md` | Фантом-игрок и вертикальный дрейф тайлов |
| 036 | `036-tile-strip-touch-block.md` | Жёстко заблокировать вертикальный скролл в tile-strip |
| 037 | `037-tile-hover-mobile-fix.md` | Отключить hover-анимацию тайлов на мобайле |
| 038 | `038-tile-y-and-title-flash.md` | Убрать y-движение тайлов на мобайле + фикс мерцания заголовка |
| 039 | `039-mobile-vertical-drift-final.md` | Окончательно убить вертикальный дрейф тайлов на мобайле |
| 040 | `040-leave-room-button.md` | Кнопка «Выйти из комнаты» в popup-меню комнаты |
| 041 | `041-room-menu-mobile-overlay.md` | Room menu как overlay на мобайле |
| 042 | `042-room-button-qr-hint.md` | Иконка QR в кнопке «КОМНАТА · CODE» |
| 043 | `043-room-menu-auto-open-and-close.md` | Авто-открытие меню комнаты + кнопка-крестик закрытия |
| 044 | `044-room-menu-stays-open-after-create.md` | Room menu stays open after room creation |
| 045 | `045-leave-room-confirmation.md` | Confirm before leaving room |
| 046 | `046-auth-modal-accent-background.md` | Auth modal background — per-game accent colors |
| 046.1 | `046.1-auth-modal-glass-panel.md` | AuthDropdown — frosted glass как RoomMenu |
| 047 | `047-room-close-on-disconnect.md` | Мгновенное закрытие комнаты / передача хоста при выходе |
| 048 | `048-logout-confirmation.md` | Подтверждение выхода из аккаунта + room:leave перед logout |
| 049 | `049-auth-modal-phone-ux.md` | Auth modal — фон менее прозрачный + авто +7 + плейсхолдер при очистке |
| 050 | `050-preserve-active-game-on-room-create.md` | Сохранять выбранную игру при создании комнаты |
| 051 | `051-back-button-bg-close-align.md` | Кнопка назад — фон + выравнивание кнопки ✕ |
| 052 | `052-auth-back-button-visible.md` | Auth modal — кнопка «Назад» более заметная |
| 053 | `053-auth-buttons-glass.md` | Auth modal — кнопки чуть прозрачнее |
| 054 | `054-auth-back-button-075.md` | Auth modal — кнопка «Назад» фон 0.75 |
| 055 | `055-auth-back-button-030.md` | Auth modal — кнопка «Назад» фон 0.30 |
| 056 | `056-auth-phone-validation-back-dark.md` | Auth modal — валидация 11 цифр + тёмный фон кнопки «Назад» |
| 057 | `057-auth-inputs-dark-nickname-back.md` | Auth modal — тёмный мат для полей ввода + кнопка «Назад» в шаге никнейма |
| 058 | `058-account-dropdown-glass.md` | AccountDropdown — frosted glass фон как у RoomMenu |
| 059 | `059-auth-small-back-button.md` | Auth modal — маленькая круглая кнопка «назад» в хедере |
| 060 | `060-auth-back-btn-no-circle.md` | Auth back button — без круга, иконка x2 |
| 061 | `061-fix-stale-room-on-mount.md` | Fix — стейл-комната при монте после возврата браузером |
| 062 | `062-fix-stale-room-not-found.md` | Fix — комната не найдена при room:get-state |
| 063 | `063-fix-join-input-and-auth-relogin.md` | Fix — join input после logout + повторный вход без refresh |
| 064 | `064-fix-logout-relogin.md` | Fix — корректный повторный вход после logout без refresh |
| 065 | `065-always-show-nickname-step.md` | Fix — всегда показывать шаг nickname при входе |
| 066 | `066-verifycode-clear-nickname.md` | Fix — verifyCode всегда очищает nickname при входе |
| 067 | `067-auth-self-close.md` | AuthDropdown сам управляет своим закрытием |
| 068 | `068-debug-auth-dropdown-close.md` | Debug — добавить логи в AuthDropdown для трассировки закрытия |
| 069 | `069-fix-room-join-empty-nickname.md` | fix room:join fires with empty nickname on re-login |
| 070 | `070-fix-avatar-overflow-mobile.md` | fix avatar pill clipped off-screen on mobile when room is created |
| 071 | `071-072-lobby-cleanup.md` | TASK-071 + TASK-072: Lobby cleanup — remove debug logs + fix useSearchParams Suspense |
| 073 | `073-topbar-mobile-brand-room.md` | TopBar mobile — hide brand text + fix QR icon clipping |
| 074 | `074-flicker-fix.md` | Fix flickering/flashing during animations (mobile + desktop) |
| 075 | `075-flicker-deep-fix.md` | Deep flicker fix — kill router remounts + stabilize compositing |
| 076 | `076-mobile-backdrop-no-blur.md` | Remove backdrop-filter from mobile room menu backdrop |
| 077 | `077-mobile-disable-nested-animation.md` | Disable nested RoomMenu animation on mobile (fix iPhone 15 flicker) |
| 078 | `078-mobile-panel-timing.md` | Fix mobile menu see-through on open + QR flash on close |
| 079 | `079-flicker-final-pass.md` | Fix HeroLeft description flicker + backdrop dim oscillation |
| 080 | `080-hero-mode-wait-revert-mobile-wrapper.md` | HeroLeft mode="wait" + revert mobile menu structure to TASK-078 state |
| 081 | `081-hero-no-opacity-css-backdrop.md` | Remove opacity from HeroLeft initial + replace mobile backdrop with CSS-only |
| 082 | `082-auth-dropdown-flicker-roommenu-close-delay.md` | Fix AuthDropdown flicker + RoomMenu close delay on mobile |
| 083 | `083-auth-account-dropdown-panel-blur.md` | Remove backdrop-blur from AuthDropdown / AccountDropdown panels on mobile |
| 084 | `084-dropdown-instant-mount-and-keys.md` | Instant mount + AnimatePresence keys for Auth/AccountDropdown |
| 085 | `085-authdropdown-no-exit-on-mobile.md` | AuthDropdown: instant disappear on mobile (no exit animation) |
| 086 | `086-accountdropdown-no-exit-on-mobile.md` | AccountDropdown: instant disappear on mobile (no exit animation) |
| 087 | `087-auth-context-memo.md` | AuthProvider: memoize value + narrow selectors |
| 088 | `088-mobile-helpers.md` | Extract mobile helpers: motionPropsInstant + glassMobileSolid |
| 089 | `089-authdropdown-use-auth-actions.md` | AuthDropdown: switch to useAuthActions() |
| 090 | `090-logout-no-auto-rejoin.md` | Fix logout: navigate to / to prevent auto-rejoin |
| 091 | `091-glass-mobile-blur12.md` | glassMobileSolid: lighter blur(12px) on mobile |
| 092 | `092-roommenu-glass-mobile.md` | RoomMenu panel: use glassMobileSolid on mobile |
| 093 | `093-roommenu-header-layout.md` | RoomMenu header layout: stable title + repositioned buttons |
| 094 | `094-roommenu-revert-093-stable-size.md` | RoomMenu: revert TASK-093 + stable panel size |
| 095 | `095-roommenu-title-nowrap.md` | Строка «Комната · КОД» в RoomMenu всегда в одну строку |
| 096 | `096-roommenu-ux-fixes.md` | RoomMenu UX — три правки |
| 097 | `097-roommenu-overlay-fix.md` | RoomMenu — три правки после TASK-096 |
| 098 | `098-player-dropdown-chip-relative.md` | Меню игрока — маленький dropdown под чипом |
| 099 | `099-dropdown-close-and-exit-stable.md` | Dropdown закрывается по любому клику + стабильный header при confirmLeave |
| 100 | `100-exit-height-stable-mobile-flicker.md` | Стабильная высота кнопок + мерцание dropdown на мобильном |
| 101 | `101-player-dropdown-mobile-instant.md` | Dropdown игрока — мгновенное открытие на мобильном (убрать blur) |
| 102 | `102-player-dropdown-pointerdown-race.md` | Фикс race condition — dropdown закрывается до onClick кнопок |
| 103 | `103-topbar-cleanup-nav-overflow.md` | TopBar: убрать Друзья/FriendsOnline, починить overflow кнопки |
| 104 | `104-glassbutton-glassinput-upgrade.md` | GlassButton upgrade + GlassInput focus animation |
| 105 | `105-new-ui-components.md` | New UI components: PlayerAvatar, Badge, Chip, Skeleton |
| 106 | `106-lobby-use-new-ui-components.md` | Lobby: use PlayerAvatar + Badge in AvatarPill and RoomMenu |
| 107 | `107-phase-f-game-transitions.md` | Phase F: Game flow transitions via GameLayout phaseKey |
| 108 | `108-lobby-game-start-flow.md` | Lobby: fix game start flow (emit game:select + game:start, listen game:started) |
| 109 | `109-leave-room-on-home.md` | Lobby: emit room:leave when on `/` (not in a room route) |
| 110 | `110-away-state-visibility.md` | Away state: visibility-based away/back + grayscale avatar |
| 111 | `111-extend-disconnect-grace-period.md` | Extend disconnect grace period (mobile reconnect fix) |
| 112 | `112-mobile-reconnect-fix.md` | Fix mobile reconnect — player leaves room on socket reconnect |
| 113 | `113-fix-single-player-grace-period.md` | Fix single-player disconnect — remove immediate delete for last player |
| 114 | `114-fix-connected-players-filter.md` | Fix connectedPlayers filter — show disconnected players as grayscale |
| 115 | `115-fix-reconnect-and-timer.md` | Fix reconnect restore + stale timer cancellation |
| 116 | `116-mobile-menu-pointer-and-reconnect.md` | Fix mobile menu pointer events + reconnect room:join |
| 117 | `117-permanent-kick-after-grace.md` | Permanent kick after grace period — no auto-rejoin |
| 118 | `118-remove-debug-logs.md` | Remove debug console.log lines from socket-handlers |
| 119 | `119-fix-eslint-disable-placement.md` | Fix eslint-disable placement in Lobby room:leave effect |
| 120 | `120-ingame-polish-components.md` | In-game polish — shared components + /ingame-preview страница |
| 121 | `121-fix-animated-score-spring-keyframes.md` | Fix AnimatedScore — spring не поддерживает 3 кадра |
| 122 | `122-quiz-ingame-polish.md` | Quiz — интеграция in-game polish компонентов |
| 123 | `123-remove-celebration-burst-quiz.md` | Убрать CelebrationBurst из квиза |
| 124 | `124-fix-quiz-timer-zero.md` | Fix quiz timer — десктоп застревает на 1 |
| 125 | `125-quiz-design-preview.md` | Quiz design variants — секция в /design-tokens |
| 126 | `126-quiz-new-design.md` | Quiz — применить выбранный дизайн |
| 127 | `127-bg-variants-design-tokens.md` | Background variants — секция в /design-tokens |
| 128 | `128-quiz-polish-fixes.md` | Quiz polish — 5 fixes |
| 129 | `129-quiz-scoreboard-strip.md` | Quiz scoreboard strip + smaller button radius |
| 129.1 | `129.1-quiz-answer-radius-6px.md` | Quiz answer button radius → 6px (rounded-md) |
| 130 | `130-quiz-answer-strip-full-height.md` | Quiz answer — left accent strip full height |
| 131 | `131-quiz-reconnect-host-fix.md` | Quiz mid-game reconnect + host role fix |
| 132 | `132-splash-mobile-detect.md` | Splash-экран выбора режима (desktop / mobile) + persistence |
| 132.1 | `132.1-splash-fix-layout-and-single-button.md` | Splash — фикс layout + одна кнопка по auto-detect |
| 132.2 | `132.2-usePlayMode-cross-instance-sync.md` | usePlayMode — синхронизация между инстансами хука |
| 133 | `133-tv-phone-badges-on-tiles.md` | TV/phone бейджи на тайлах игр в лобби |
| 134 | `134-player-role-tv-player.md` | Player.role — поле 'tv' | 'player' на сервере и клиенте |
| 135 | `135-mobile-join-only-lobby.md` | Мобильный лобби — только join, без create |
| 136 | `136-tv-game-start-navigation.md` | TV навигация при старте игры |
| 137 | `137-remove-topbar-buttons.md` | Убрать кнопки «ТВ-режим» и «Создать комнату» из лобби |
| 138 | `138-desktop-qr-waiting-screen.md` | QR-экран ожидания на десктопе |
| 139 | `139-join-page-and-game-host.md` | Страница /join/[code] + gameHostPlayerId на сервере |
| 140 | `140-env-site-url.md` | Добавить NEXT_PUBLIC_SITE_URL в .env.local.example |
| 141 | `141-add-invite-button-room-menu.md` | Кнопка "Добавить игрока" в меню комнаты |
| 142 | `142-fix-game-start-flow.md` | Игра не запускается после нажатия "Начать партию" |
| 143 | `143-room-panel-redesign.md` | Редизайн панели комнаты — кнопка в топ-баре для всех ролей |
| 144 | `144-quiz-lobby-config.md` | Выбор квиза в лобби до QR-экрана |
| 145 | `145-fix-start-and-quiz-tiles.md` | Фикс кнопки «НАЧАТЬ ИГРУ» + плиточный выбор квиза |
| 146 | `146-qr-screen-polish.md` | QR-экран — убрать кнопку старта, разделить URL |
| 147 | `147-room-menu-cleanup.md` | Чистка меню комнаты — убрать QR, пригласить, показать хоста |
| 148 | `148-fix-join-page-host-visibility.md` | Показывать хоста на экране подключения /join/[code] |
| 149 | `149-fix-quiz-start-tv-pivot.md` | Фикс запуска квиза в TV-pivot режиме |
| 150 | `150-fix-quiz-guest-host-and-tv-in-join-list.md` | фикс — квиз не запускается у гостя + десктоп виден в списке игроков на join-странице |
| 151 | `151-server-hide-tv-role-from-players-broadcast.md` | сервер — скрыть TV-роль из broadcasted players (десктоп не игрок) |
| 152 | `152-join-index-page-with-code-input.md` | создать страницу `/join` с полем ввода кода комнаты |
| 153 | `153-quiz-end-flow-tv-lobby-phone-room-menu.md` | завершение квиза — TV → `/lobby/CODE`, телефон → `/join/CODE` waiting |
| 154 | `154-add-player-from-room-menu-shows-qr-on-tv.md` | «Добавить игрока» в меню комнаты — переключает TV на экран QR |
| 155 | `155-game-ended-phone-to-join-other-games.md` | `game:ended` → `/join/${roomId}` для остальных 6 игр |
| 156 | `156-extract-game-end-navigation-hook.md` | Вынести post-game навигацию в общий хук |
| 157 | `157-extend-game-end-hook-for-tv.md` | Расширить `useNavigateOnGameEnd` для TV-страницы |
| 158 | `158-socket-listener-refactor-audit.md` | Аудит socket-listener'ов: кандидаты на вынос в хуки |
| 159 | `159-use-game-action-hook.md` | Вынести `emit('game:action', ...)` в хук `useGameAction` |
| 160 | `160-use-navigate-on-game-start-hook.md` | Вынести `game:started` навигацию в хук `useNavigateOnGameStart` |
| 160.1 | `160.1-game-started-tv-lobby-page.md` | Подключить `useNavigateOnGameStart` в TV-лобби страницу |
| 161 | `161-use-room-state-hook.md` | Вынести `room:state` + `room:get-state` в хук `useRoomState` |
| 162 | `162-use-room-state-quiz-and-tv.md` | Применить `useRoomState` к quiz и TV-странице |
| 163 | `163-tv-state-request-map.md` | Заменить if-else цепочку в TV на маппинг gameType → requestAction |
| 164 | `164-delete-truth-or-dare.md` | Удалить ghost-страницу truth-or-dare |
| 165 | `165-lobby-guest-game-host.md` | Кнопка «+ Добавить игрока» для гостя-game-host в Lobby |
| 166 | `166-quiz-visual-bugs.md` | Квиз: фон / отсчёт / дизайн ответов |
| 167 | `167-quiz-end-button-fix.md` | Квиз: кнопка ЗАВЕРШИТЬ не работает |
| 168 | `168-lobby-background-img-preload.md` | Lobby: фикс медленной загрузки фона тайла игры |
| 169 | `169-lobby-remove-join-input-add-rules.md` | Лобби: удалить поле ввода кода комнаты + правила игр |
| 171 | `171-tv-quiz-4-bugs.md` | TV Quiz — 4 визуальных и поведенческих бага |
| 172 | `172-quiz-ux-5-bugs.md` | Quiz — 5 UX багов (TV + мобилка) |
| 173 | `173-quiz-layout-and-bugs.md` | Quiz — Layout TV, UX мобилки, хост-бейдж, таймер |
| 174 | `174-game-end-redirect-lobby.md` | После завершения игры → лобби, не на страницу ввода имени |
| 175 | `175-tv-quiz-layout-fixes.md` | TV Quiz — layout (счёт в шапку, фикс центровки, единый дизайн итогов) |
| 176 | `176-game-end-routing-guests.md` | После завершения игры — гость в /join (комната), хост в /lobby |
| 177 | `177-quiz-design-consistency.md` | Quiz — единый дизайн, счётчик ответов, цветные рамки, хост-бейдж |
| 178 | `178-quiz-mobile-cleanup.md` | Quiz мобилка — убрать статус-текст, убрать scoreboard-бар, унифицировать спец-кнопку |
| 179 | `179-quiz-setup-bg-timer-fixes.md` | Quiz — фриз при выходе в лобби, фон при выборе, плашка, плавный таймер |
| 180 | `180-host-transfer-fix.md` | Передача роли хоста — не предлагать хосту, перемещать правильный бейдж |
| 181 | `181-quiz-neutral-bg.md` | Quiz — фон полностью нейтральный (пока что) |
| 182 | `182-button-radius-and-width.md` | Скругления кнопок + ширина кнопки спец-квиза |
| 183 | `183-quiz-icons-integration.md` | Интеграция кастомных иконок квиза (заменить эмодзи на <img>) |
| 184 | `184-fix-qr-local-ip.md` | Fix QR code URL — always use server's local network IP |
| 185 | `185-quiz-config-via-socket.md` | Quiz pre-config through socket, not localStorage |
| 186 | `186-quiz-cleanup-setup-screens.md` | Quiz — удалить setup-экраны, включить фоны для спец-квизов |
| 187 | `187-quiz-bg-fix-and-badge-bigger.md` | Quiz — fix background timing + make quiz badge 3x bigger |
| 188 | `188-quiz-bg-all-screens-and-tv-badge.md` | Quiz — background on all screens + TV badge 3x bigger |
| 189 | `189-quiz-bg-everyone-and-tile-style.md` | Quiz — фон для всех клиентов + стиль плашек выбора квиза |
| 190 | `190-quiz-bg-stacking-and-badge-cleanup.md` | Quiz — РЕАЛЬНЫЙ фикс фона (stacking context) + чистка бейджей ожидания |
| 191 | `191-general-quiz-badges-cleanup.md` | Обычные квизы — бейджи сложности и темы как в спец-квизах |
| 192 | `192-difficulty-color-dot-back.md` | Вернуть цветную точку сложности в бейдж сложности (general waiting) |
| 193 | `193-tv-remove-header-badges-add-info.md` | Игровое поле (TV) — убрать дубль плашек в шапке + добавить инфо вопросов/игроков |
| 194 | `194-game-surface-wrapper.md` | Вынести фон + isolate в общий компонент GameSurface |
| 195 | `195-tv-all-blocks-gamesurface.md` | Перевести все TV-блоки игр на GameSurface |
| 196 | `196-bg-webp-lqip.md` | Фоны игр — WebP + blur-плейсхолдер (LQIP) |
| 196.1 | `196.1-gamesurface-cached-img.md` | GameSurface — фикс невидимого фона при кешированной картинке |
| 197 | `197-host-leave-destroys-room.md` | Выход хоста закрывает комнату для всех |
| 198 | `198-add-player-qr-fix.md` | Кнопка «Добавить игрока» + QR на TV и в лобби |
| 199 | `199-special-quiz-alt-backgrounds.md` | Альтернативные фоны для спец-квизов (#1 → *1.webp) |
| 200 | `200-room-lifecycle-rework.md` | Жизненный цикл комнаты — убрать «Выйти», таймер всех-неактивных |
| 201 | `201-add-player-button-on-join-page.md` | Кнопка «Добавить игрока» на экране телефона (/join) |
| 202 | `202-room-role-model.md` | Ролевая модель комнаты — создатель ≠ хост ≠ игрок |
| 203 | `203-phone-host-controls.md` | Управление игроками хостом на телефоне (/join) |
| 204 | `204-tv-lobby-game-select-ungate.md` | TV-лобби: разгейтить выбор игры (баг «Ожидание хоста» после игры) |
| 205 | `205-auto-transfer-host-on-leave.md` | Авто-передача хоста случайному игроку при выходе хоста |
| 206 | `206-host-eligible-predicate.md` | Вынести предикат `isHostEligible(player)` (DRY host-роль) |
| 207 | `207-join-screen-buttons-leave.md` | Экран комнаты на телефоне: НАЧАТЬ ИГРУ по выбору игры, Добавить игрока для всех, кнопка ВЫЙТИ |
| 208 | `208-tv-qr-highlight-host.md` | Подсветить хоста на QR-экране сбора комнаты (TV) |
| 209 | `209-deselect-game-on-back-to-lobby.md` | Сброс выбранной игры при возврате в лобби («← Назад к лобби») |
| 210 | `210-abandon-game-when-no-players.md` | Прервать игру и вернуть в лобби, когда вышли ВСЕ игроки |
| 211 | `211-tv-hud-away-state.md` | Подсветка away-игрока в верхнем баре TV (свернул/заблокировал телефон) |
| 212 | `212-special-quiz-bg-consistent.md` | Единый фон спец-квиза (плашка = ожидание = игра) |
| 213 | `213-room-menu-add-player-empty-room.md` | Кнопка «Добавить игрока» в меню комнаты, когда игроков нет |
| 214 | `214-leave-redirect-to-join.md` | «ВЫЙТИ» на экране комнаты ведёт на /join, а не на / |
| 215 | `215-join-pages-bilingual.md` | Двуязычность страниц /join (ru/en) |
| 216 | `216-join-room-bg-per-game-color.md` | Фон комнаты на телефоне в цвете выбранной игры (как в лобби) |
| 217 | `217-crocodile-guest-game-host.md` | useGameIdentity хук + Крокодил — гость как game-host |
| 218 | `218-who-am-i-guest-game-host.md` | Кто я? — гость как game-host + гостевая идентичность |
| 219 | `219-mafia-guest-game-host.md` | Мафия — гость как game-host + гостевая идентичность |
| 220 | `220-spy-guest-game-host.md` | Шпион — гость как game-host + гостевая идентичность (ТОЛЬКО identity) |
| 221 | `221-hundred-to-one-guest-identity.md` | 100 к 1 — гостевая идентичность (роли/команды/капитаны) |
| 222 | `222-spy-i18n-and-confirm.md` | Шпион — двуязычность (i18n) + убрать двойной confirm |
| 223 | `223-h2o-i18n-and-confirm.md` | 100 к 1 — двуязычность (i18n) + убрать двойной confirm |
| 224 | `224-waiting-breathing-placeholder.md` | Унификация waiting-плейсхолдеров (BreathingPlaceholder) в 6 играх |
| 225 | `225-quiz-use-game-identity.md` | Квиз — миграция на useGameIdentity (убрать инлайн-дубль) |
| 226 | `226-spy-full-redesign.md` | Spy: полный редизайн (локации + voting + round flow) |
| 227 | `227-spy-restore-draw-mode.md` | Spy: вернуть draw mode поверх TASK-226 |
| 228 | `228-gamelayout-end-button-in-content.md` | ЗАВЕРШИТЬ кнопка в контентной области GameLayout |
| 229 | `229-spy-draw-mode-new-phases.md` | Spy draw mode: добавить dealing / voting / roundResult фазы |
| 230 | `230-dev-phones-script.md` | Скрипт «виртуальные телефоны» для локального QA |
| 231 | `231-spy-polish-bg-timers-peek-end.md` | Шпион — фон в цвет игры, таймеры, peek-бар, кнопка «Завершить» |
| 232 | `232-strip-bg-dir-arg.md` | strip-bg.mjs — принимать папку аргументом |
| 233 | `233-spy-tv-name-dedup.md` | Spy TV — убрать дублирование имени игрока |
| 234 | `234-spy-fit-word.md` | Spy — авто-ужимающийся шрифт слова (fit-to-width) |
| 235 | `235-spy-remove-category-emoji.md` | Spy — убрать эмодзи категории рядом с темой |
| 236 | `236-spy-guess-word-mechanic.md` | Spy — авто-голосование по таймеру + механика «Шпион угадывает слово» |
| 237 | `237-spy-qa-fixes.md` | Spy: 8 правок по live-QA |
| 238 | `238-spy-qa-fixes-2.md` | Spy: вторая волна правок по live-QA |
| 239 | `239-spy-qa-fixes-3.md` | Spy live-QA fixes (волна 3) |
| 240 | `240-spy-qa-fixes-4.md` | Spy live-QA fixes (волна 4) |
| 241 | `241-spy-qa-fixes-5.md` | Spy live-QA fixes (волна 5) |
| 242 | `242-spy-qa-fixes-6.md` | Spy live-QA fixes (волна 6) |
| 243 | `243-spy-qa-fixes-7.md` | Spy live-QA fixes (волна 7) |
| 244 | `244-spy-qa-fixes-8.md` | Spy live-QA fixes (волна 8) |
| 245 | `245-spy-draw-canvas-tv-fit.md` | Spy draw canvas: fit на TV (игровое поле), откат мобильного |
| 246 | `246-spy-peek-narrower.md` | Spy peek-bar уже на 20% |
| 247 | `247-spy-peek-shorter.md` | Spy peek-bar: ширина обратно w-full, высота меньше ~30%, без скачка при нажатии |
| 248 | `248-spy-peek-shorter-2.md` | Spy peek-bar: ещё ниже (~30%), на нажатии «твоё слово» пропадает, размер неизменен |
| 249 | `249-spy-peek-hold-pill-fixed-h.md` | Spy peek-bar: пилюля «ЗАЖМИ», убрать «Зажми» слева, жёстко зафиксировать высоту |
| 250 | `250-spy-tv-draw-timer.md` | Spy TV (игровое поле): таймер в режиме рисования |
| 251 | `251-spy-tv-draw-timer-round.md` | Spy TV: таймер рисования сделать круглым (как в угадывании) |
