# TASK-311 — Alias classic: шаг выбора имени команды после распределения

## Цель
После распределения команд (classic) добавить фазу `teamName`: первый ПОДКЛЮЧЁННЫЙ
игрок каждой команды вводит её название. Когда ОБЕ команды подтвердили имя —
авто-переход к игре (`waiting`). У хоста всегда есть кнопка «Продолжить →» (фолбэк
на случай афк-игрока: неподтверждённая команда остаётся с дефолтным именем).
Остальные игроки видят обе команды + статус (кто выбирает / имя готово).

Only classic. Letter mode (через teamSelect/finalizeTeams НЕ проходит) — не трогать.

## Whitelist файлов
- `src/app/game/[roomId]/alias/page.tsx`        (мобильный)
- `src/app/tv/[roomId]/[gameType]/page.tsx`     (TV / игровое поле)
- `codex-reports/311-alias-team-name-step.md`

НЕ трогать: CLAUDE.md, AGENTS.md, .codex/**, codex-tasks/**, server.mts,
socket-handlers.mts, types вне указанных файлов, другие файлы.

================================================================
## ЧАСТЬ A — мобильный `src/app/game/[roomId]/alias/page.tsx`
================================================================

### A1. Тип `AliasGameState` (~стр.33-49)
- В union `phase` добавить `'teamName'`:
  `phase: 'modeSelect' | 'teamSelect' | 'teamName' | 'waiting' | 'explaining' | 'turnResult' | 'finished';`
- Добавить поле (опционально, чтобы не править все конструкторы состояния):
  `teamNameConfirmed?: boolean[];`

### A2. `finalizeTeams` (~стр.272-276)
Сейчас:
```
const next: AliasGameState = { ...prev, phase: 'waiting', teams: updatedTeams };
```
Заменить на:
```
const next: AliasGameState = {
  ...prev,
  phase: 'teamName',
  teams: updatedTeams,
  teamNameConfirmed: updatedTeams.map(() => false),
};
```

### A3. Host-колбэки (добавить рядом с finalizeTeams, ВНУТРИ компонента)
```
const setTeamName = useCallback((teamIndex: number, rawName: string) => {
  setGameState((prev) => {
    if (!prev) return prev;
    const fallback = locale === 'ru' ? `Команда ${teamIndex + 1}` : `Team ${teamIndex + 1}`;
    const name = rawName.trim() || prev.teams[teamIndex]?.name || fallback;
    const updatedTeams = prev.teams.map((t, i) => (i === teamIndex ? { ...t, name } : t));
    const confirmed = [...(prev.teamNameConfirmed ?? prev.teams.map(() => false))];
    confirmed[teamIndex] = true;
    const allConfirmed = updatedTeams.every((_, i) => confirmed[i]);
    const next: AliasGameState = {
      ...prev,
      teams: updatedTeams,
      teamNameConfirmed: confirmed,
      phase: allConfirmed ? 'waiting' : prev.phase,
    };
    broadcast('alias:state', next);
    return next;
  });
}, [broadcast, locale]);

const continueFromTeamNames = useCallback(() => {
  setGameState((prev) => {
    if (!prev) return prev;
    const next: AliasGameState = { ...prev, phase: 'waiting' };
    broadcast('alias:state', next);
    return next;
  });
}, [broadcast]);
```

### A4. Host-обработчик game:action (~стр.531-545) — добавить ветки
Внутри `on('game:action', …)` host-effect добавить:
```
if (action === 'alias:set-team-name') {
  setTeamName(payload.teamIndex as number, (payload.name as string) ?? '');
}
if (action === 'alias:continue-teamnames') {
  continueFromTeamNames();
}
```
И добавить `setTeamName, continueFromTeamNames` в массив зависимостей этого
useEffect (там же, где `handleJoinTeam, finalizeTeams` и т.д.).

### A5. Derived-значения (добавить в теле компонента рядом с прочими derived,
после блока `aliasGuessers`/`currentWord`, ~стр.131)
```
// Derived: team-name step (classic)
const myTeamIndex = gameState ? gameState.teams.findIndex((t) => t.playerIds.includes(myId)) : -1;
const teamNameConfirmed = gameState?.teamNameConfirmed ?? gameState?.teams.map(() => false) ?? [];
const firstConnectedInTeam = (team?: Team): string | null =>
  team ? (team.playerIds.find((id) => players.find((p) => p.id === id)?.isConnected) ?? team.playerIds[0] ?? null) : null;
const myTeamNamerId = myTeamIndex >= 0 ? firstConnectedInTeam(gameState?.teams[myTeamIndex]) : null;
const isTeamNamer = !!myTeamNamerId && myId === myTeamNamerId;
```

### A6. Маленький компонент ввода (добавить на уровне файла, рядом с AliasPage)
```
function TeamNameInput({
  defaultValue, onSubmit, locale,
}: { defaultValue: string; onSubmit: (name: string) => void; locale: string }) {
  const [value, setValue] = useState(defaultValue);
  return (
    <div className="w-full max-w-md flex flex-col gap-3">
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        maxLength={20}
        placeholder={locale === 'ru' ? 'Название команды' : 'Team name'}
        className="w-full rounded-[20px] border border-white/20 bg-white/[0.1] px-5 py-4 text-center text-xl font-bold text-white placeholder-white/40 outline-none focus:border-pink-300"
      />
      <GlassButton variant="primary" size="lg" className="w-full" onClick={() => onSubmit(value)} disabled={!value.trim()}>
        {locale === 'ru' ? 'Готово' : 'Done'}
      </GlassButton>
    </div>
  );
}
```
(`useState` уже импортирован; `GlassButton` уже импортирован.)

### A7. Рендер фазы `teamName` (вставить МЕЖДУ блоком teamSelect и блоком
`{gameState?.phase === 'waiting' && (…)}`, т.е. примерно перед ~стр.788)
```
{gameState?.phase === 'teamName' && (
  <div className="flex-1 flex flex-col items-center justify-center gap-5">
    <div className="w-full max-w-md flex gap-3">
      {gameState.teams.map((team, ti) => {
        const namerId = firstConnectedInTeam(team);
        const namerName = players.find((p) => p.id === namerId)?.nickname ?? '...';
        const done = teamNameConfirmed[ti];
        return (
          <GlassCard
            key={team.id}
            className={`alias-card flex-1 p-4 text-center ${ti === myTeamIndex ? 'outline outline-2 outline-pink-400' : 'opacity-70'}`}
          >
            <p className="text-lg font-bold text-white">{team.name}</p>
            <p className="mt-1 text-xs text-white/75">
              {done
                ? (locale === 'ru' ? 'Имя выбрано' : 'Name set')
                : (locale === 'ru' ? `${namerName} выбирает имя…` : `${namerName} is naming…`)}
            </p>
          </GlassCard>
        );
      })}
    </div>

    {isTeamNamer && myTeamIndex >= 0 && !teamNameConfirmed[myTeamIndex] ? (
      <TeamNameInput
        defaultValue={gameState.teams[myTeamIndex].name}
        locale={locale}
        onSubmit={(name) =>
          isHost
            ? setTeamName(myTeamIndex, name)
            : broadcast('alias:set-team-name', { teamIndex: myTeamIndex, name })
        }
      />
    ) : (
      <p className="text-sm text-white/75 text-center">
        {myTeamIndex >= 0 && teamNameConfirmed[myTeamIndex]
          ? (locale === 'ru' ? 'Ждём вторую команду…' : 'Waiting for the other team…')
          : (locale === 'ru' ? 'Капитан команды выбирает имя…' : 'Your captain is naming the team…')}
      </p>
    )}

    {isHost && (
      <button
        type="button"
        className="w-full max-w-md rounded-[24px] border border-white/20 bg-white/[0.12] px-6 py-4 text-base font-black text-white transition active:scale-[0.98]"
        onClick={() => (isHost ? continueFromTeamNames() : emitAction('alias:continue-teamnames'))}
      >
        {locale === 'ru' ? 'Продолжить →' : 'Continue →'}
      </button>
    )}
  </div>
)}
```

================================================================
## ЧАСТЬ B — TV `src/app/tv/[roomId]/[gameType]/page.tsx`
================================================================

### B1. Inline-тип alias state (~стр.246-251) — добавить поле
В объект-тип `useState<{ … }>` добавить:
`teamNameConfirmed?: boolean[];`
(в начальное значение можно ничего не добавлять — поле опционально.)

### B2. Рендер фазы `teamName` (вставить МЕЖДУ блоком
`{aliasState.phase === 'teamSelect' && (…)}` и блоком
`{aliasState.phase === 'waiting' && …}`, ~стр.1764)
```
{aliasState.phase === 'teamName' && (
  <>
    <h2 className="text-4xl font-bold mb-2">
      {locale === 'ru' ? 'Команды выбирают названия' : 'Teams are choosing names'}
    </h2>
    <div className="flex gap-8 w-full max-w-4xl">
      {aliasState.teams.map((team, ti) => {
        const namerId = team.playerIds.find((id) => players.find((p) => p.id === id)?.isConnected) ?? team.playerIds[0];
        const done = (aliasState.teamNameConfirmed ?? [])[ti];
        return (
          <div key={team.id} className="flex-1 glass-card px-8 py-6 text-center">
            <p className="text-3xl font-bold text-amber-400 mb-3">{team.name}</p>
            <p className="text-lg text-white/60">
              {done
                ? (locale === 'ru' ? 'Имя выбрано ✓' : 'Name set ✓')
                : (locale === 'ru' ? `${getPlayerName(namerId)} выбирает имя…` : `${getPlayerName(namerId)} is naming…`)}
            </p>
          </div>
        );
      })}
    </div>
  </>
)}
```
(Если на TV `players` не содержит `isConnected` — `?.isConnected` даст undefined и
сработает фолбэк `team.playerIds[0]`, это нормально. `getPlayerName` уже есть.)

================================================================
## Чего НЕ делать
- НЕ трогать letter mode, очки, остальные фазы и действия.
- НЕ менять сервер.
- Classic игровую механику (раунды/explainer/очки) НЕ менять — только добавить
  шаг между распределением и стартом.

## Acceptance
- `npx tsc --noEmit` чисто.
- `npm run lint` без новых ошибок.
- НЕ запускать `npm run build`.
- Сценарий classic: распределение → фаза `teamName` (намер каждой команды вводит
  имя) → после обеих подтверждений авто-переход к игре; кнопка хоста «Продолжить →»
  форсит переход. Остальные видят обе команды + статус. TV показывает обе команды
  и кто выбирает.
- diff строго в пределах whitelist.

## Отчёт
`codex-reports/311-alias-team-name-step.md` — что/где изменено, tsc/lint.
