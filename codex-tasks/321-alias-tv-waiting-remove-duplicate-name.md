# TASK-321: Alias TV waiting-экран — убрать дубль имени игрока

## Контекст

На TV-экране ("игровое поле") Alias, фаза `waiting` (letter mode,
индивидуальная игра — team.name === nickname игрока), в карточке игрока
имя показывается ДВАЖДЫ: крупно сверху (`team.name`) и в пилюле снизу
рядом с иконкой микрофона. Юзер прислал скриншот, просит убрать верхнее,
оставить только нижнюю пилюлю с именем.

**КРИТИЧНО:** этот JSX-блок общий для classic И letter mode. В classic
mode `team.name` — это РЕАЛЬНОЕ название команды (например "Орлы"), а не
дубль ника игрока — там его удалять НЕЛЬЗЯ (правило проекта: Alias classic
mode неприкосновенен, см. CLAUDE.md п.3). Дубль имени возникает ТОЛЬКО в
letter mode, где `team.name === nickname` единственного игрока в команде
(см. `startGame` в `src/app/game/[roomId]/alias/page.tsx`, ветка
`mode === 'letter'`: `name: players.find(...)?.nickname`). Поэтому строку
с `team.name` нужно скрывать УСЛОВНО — только когда `aliasState.mode ===
'letter'`, а не удалять безусловно.

## Whitelist файлов (СТРОГО)

- `src/app/tv/[roomId]/[gameType]/page.tsx`

## Изменение

Блок `aliasState.phase === 'waiting' && aliasState.teams.length > 0`
(~строки 1793-1823), карточка команды/игрока (~строки 1798-1816).

Текущее:
```tsx
<div
  key={team.id}
  className={`flex-1 glass-card px-8 py-6 text-center ${
    ti === aliasState.activeTeamIndex ? 'outline outline-2 outline-pink-400' : 'opacity-50'
  }`}
>
  <p className="text-2xl font-bold mb-2">{team.name}</p>
  <p className="text-5xl font-bold text-amber-400 mb-3">{team.score}</p>
  <div className="flex flex-wrap gap-2 justify-center">
    {team.playerIds.map(id => {
      const isExp = ti === aliasState.activeTeamIndex && id === explainerId;
      return (
        <span key={id} className={`glass-badge text-lg px-3 py-1 ${isExp ? 'outline outline-1 outline-amber-400' : ''}`}>
          {getPlayerName(id)} {isExp && <AliasIcon name="mic" className="inline-block h-[1em] w-[1em] align-[-0.15em]" />}
        </span>
      );
    })}
  </div>
</div>
```

Заменить на (сделать показ `team.name` условным — только для classic,
letter mode его больше не показывает; ничего больше не менять):
```tsx
<div
  key={team.id}
  className={`flex-1 glass-card px-8 py-6 text-center ${
    ti === aliasState.activeTeamIndex ? 'outline outline-2 outline-pink-400' : 'opacity-50'
  }`}
>
  {aliasState.mode !== 'letter' && (
    <p className="text-2xl font-bold mb-2">{team.name}</p>
  )}
  <p className="text-5xl font-bold text-amber-400 mb-3">{team.score}</p>
  <div className="flex flex-wrap gap-2 justify-center">
    {team.playerIds.map(id => {
      const isExp = ti === aliasState.activeTeamIndex && id === explainerId;
      return (
        <span key={id} className={`glass-badge text-lg px-3 py-1 ${isExp ? 'outline outline-1 outline-amber-400' : ''}`}>
          {getPlayerName(id)} {isExp && <AliasIcon name="mic" className="inline-block h-[1em] w-[1em] align-[-0.15em]" />}
        </span>
      );
    })}
  </div>
</div>
```

Classic mode должен продолжать показывать `team.name` как раньше —
проверить визуально по diff, что условие `aliasState.mode !== 'letter'`
корректно это сохраняет. Ничего другого в файле не менять.

## Acceptance

- `npx tsc --noEmit` — чисто.
- `npm run lint` — чисто.
- `git diff --stat` — изменения только в
  `src/app/tv/[roomId]/[gameType]/page.tsx`.
- В TV waiting-карточке letter mode имя больше не дублируется — остаётся
  только пилюля снизу.
- В classic mode `team.name` (реальное название команды) продолжает
  показываться как раньше — НЕ регрессия.

Не коммитить. Отчёт в
`codex-reports/321-alias-tv-waiting-remove-duplicate-name.md`.
