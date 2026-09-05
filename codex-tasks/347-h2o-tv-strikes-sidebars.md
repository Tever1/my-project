# TASK-347: «100 к 1» — игровое поле (TV): счётчики ошибок слева/справа от ответов

**Тип:** simple (1 файл, JSX-реструктуризация одного блока, точный целевой код дан)
**Whitelist:** `src/app/tv/[roomId]/[gameType]/page.tsx`
**НЕ трогать:** любой другой блок TV (другие игры), мобильный экран, server.mts.

---

## Контекст

Продолжение серии правок «100 к 1» (после TASK-346, одностолбцовые ответы).
Сейчас счётчики ошибок («крестики», 3 шт. на команду) рендерятся ГОРИЗОНТАЛЬНО
в нижней панели под сеткой ответов (~строки 1255-1274). Нужно перенести их
по бокам от колонки ответов: команда 1 (жёлтая) — слева, команда 2 (красная) —
справа. Каждый крестик должен быть высотой в 2 ячейки ответов (6 ответов ÷ 3
крестика = 2:1, совпадает математически при одинаковом `gap`).

## Точная замена

### 1. Заменить блок «Answers grid» (сейчас примерно строки 1232-1253):

СТАРЫЙ КОД:
```tsx
              {/* Answers grid */}
              <div className="grid grid-cols-1 gap-3 w-full mb-4">
                {q.answers.map((a, idx) => {
                  const revealed = h.qState[h.curQ]?.[idx]?.pub;
                  const pts = h2oGetDisplayPts(h.curQ, idx, a.p);
                  return (
                    <div key={idx} className={`rounded-xl border-2 p-3 flex items-center justify-between transition-all ${revealed ? 'bg-yellow-400/25 border-yellow-400/60' : 'bg-white/5 border-white/10'}`}>
                      <div className="flex items-center gap-3 min-w-0">
                        <span className={`w-10 h-10 flex-shrink-0 rounded-full flex items-center justify-center text-xl font-bold ${revealed ? 'bg-amber-500 text-black' : 'bg-white/10 text-white/30'}`}>
                          {idx + 1}
                        </span>
                        {revealed
                          ? <span className="text-xl font-bold uppercase tracking-wide line-clamp-1">{a.t}</span>
                          : <span className="text-2xl text-white/15 tracking-[8px]">? ? ?</span>}
                      </div>
                      {revealed
                        ? <span className="bg-amber-600 rounded-lg px-3 py-1.5 text-xl font-bold flex-shrink-0">{pts}</span>
                        : <span className="text-white/10 text-xl flex-shrink-0">?</span>}
                    </div>
                  );
                })}
              </div>
```

НОВЫЙ КОД:
```tsx
              {/* Answers row: team1 strikes | answers column | team2 strikes */}
              <div className="flex w-full items-stretch gap-4 mb-4">
                {h.curQ <= 2 && (
                  <div className="relative flex w-28 flex-shrink-0 flex-col gap-3">
                    <span className="absolute -top-6 left-0 right-0 text-center text-xs font-bold uppercase tracking-wide text-yellow-300/70">
                      {h.t1n}
                    </span>
                    {[0, 1, 2].map((i) => (
                      <div
                        key={i}
                        className={`flex-1 rounded-xl border-2 flex items-center justify-center text-3xl font-bold transition-all ${
                          i < h.strikes[h.curQ][0]
                            ? 'bg-red-500/40 border-red-400/60 text-red-300 scale-[1.03]'
                            : 'bg-white/5 border-white/10 text-white/15'
                        }`}
                      >
                        ✕
                      </div>
                    ))}
                  </div>
                )}

                <div className="grid flex-1 grid-cols-1 gap-3">
                  {q.answers.map((a, idx) => {
                    const revealed = h.qState[h.curQ]?.[idx]?.pub;
                    const pts = h2oGetDisplayPts(h.curQ, idx, a.p);
                    return (
                      <div key={idx} className={`rounded-xl border-2 p-3 flex items-center justify-between transition-all ${revealed ? 'bg-yellow-400/25 border-yellow-400/60' : 'bg-white/5 border-white/10'}`}>
                        <div className="flex items-center gap-3 min-w-0">
                          <span className={`w-10 h-10 flex-shrink-0 rounded-full flex items-center justify-center text-xl font-bold ${revealed ? 'bg-amber-500 text-black' : 'bg-white/10 text-white/30'}`}>
                            {idx + 1}
                          </span>
                          {revealed
                            ? <span className="text-xl font-bold uppercase tracking-wide line-clamp-1">{a.t}</span>
                            : <span className="text-2xl text-white/15 tracking-[8px]">? ? ?</span>}
                        </div>
                        {revealed
                          ? <span className="bg-amber-600 rounded-lg px-3 py-1.5 text-xl font-bold flex-shrink-0">{pts}</span>
                          : <span className="text-white/10 text-xl flex-shrink-0">?</span>}
                      </div>
                    );
                  })}
                </div>

                {h.curQ <= 2 && (
                  <div className="relative flex w-28 flex-shrink-0 flex-col gap-3">
                    <span className="absolute -top-6 left-0 right-0 text-center text-xs font-bold uppercase tracking-wide text-red-300/70">
                      {h.t2n}
                    </span>
                    {[0, 1, 2].map((i) => (
                      <div
                        key={i}
                        className={`flex-1 rounded-xl border-2 flex items-center justify-center text-3xl font-bold transition-all ${
                          i < h.strikes[h.curQ][1]
                            ? 'bg-red-500/40 border-red-400/60 text-red-300 scale-[1.03]'
                            : 'bg-white/5 border-white/10 text-white/15'
                        }`}
                      >
                        ✕
                      </div>
                    ))}
                  </div>
                )}
              </div>
```

### 2. Заменить блок «Bottom bar: strikes, fund, timer» (сейчас примерно строки 1255-1289):

СТАРЫЙ КОД:
```tsx
              {/* Bottom bar: strikes, fund, timer */}
              <div className="w-full flex items-center justify-between gap-4">
                {h.curQ <= 2 && (
                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-yellow-300/70 font-bold">{h.t1n}</span>
                      {[0, 1, 2].map(i => (
                        <div key={i} className={`w-8 h-8 rounded-full flex items-center justify-center text-lg font-bold transition-all
                          ${i < h.strikes[h.curQ][0] ? 'bg-red-500/40 text-red-300 scale-110' : 'bg-white/5 text-white/15'}`}>✕</div>
                      ))}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-red-300/70 font-bold">{h.t2n}</span>
                      {[0, 1, 2].map(i => (
                        <div key={i} className={`w-8 h-8 rounded-full flex items-center justify-center text-lg font-bold transition-all
                          ${i < h.strikes[h.curQ][1] ? 'bg-red-500/40 text-red-300 scale-110' : 'bg-white/5 text-white/15'}`}>✕</div>
                      ))}
                    </div>
                  </div>
                )}
                {h.curQ <= 2 && (
                  <div className="text-center">
                    <span className="text-xs text-white/40 font-bold">БАНК: </span>
                    <span className="font-black text-3xl text-yellow-300">{h.roundFund[h.curQ]}</span>
                  </div>
                )}
                {h.curQ === 3 && (
                  <div className="mx-auto text-center">
                    <span className="text-xs text-white/40 font-bold">ОБСУЖДЕНИЕ: </span>
                    <span className={`font-black text-4xl ${h.r4Time <= 10 && h.r4Time > 0 ? 'text-red-400 animate-pulse' : 'text-yellow-300'}`}>
                      {Math.floor(h.r4Time / 60)}:{(h.r4Time % 60).toString().padStart(2, '0')}
                    </span>
                  </div>
                )}
              </div>
```

НОВЫЙ КОД (крестики убраны — переехали в боковые колонки, банк/таймер остаются):
```tsx
              {/* Bottom bar: fund, discussion timer */}
              <div className="w-full flex items-center justify-center gap-4">
                {h.curQ <= 2 && (
                  <div className="text-center">
                    <span className="text-xs text-white/40 font-bold">БАНК: </span>
                    <span className="font-black text-3xl text-yellow-300">{h.roundFund[h.curQ]}</span>
                  </div>
                )}
                {h.curQ === 3 && (
                  <div className="mx-auto text-center">
                    <span className="text-xs text-white/40 font-bold">ОБСУЖДЕНИЕ: </span>
                    <span className={`font-black text-4xl ${h.r4Time <= 10 && h.r4Time > 0 ? 'text-red-400 animate-pulse' : 'text-yellow-300'}`}>
                      {Math.floor(h.r4Time / 60)}:{(h.r4Time % 60).toString().padStart(2, '0')}
                    </span>
                  </div>
                )}
              </div>
```

## Acceptance

- `npm run lint` и `npx tsc --noEmit` чисто.
- Крестики ошибок больше не в нижней панели — только слева/справа от колонки ответов.
- Раунд 4 (`h.curQ === 3`) — без крестиков, без боковых колонок (условие `h.curQ <= 2` уже это обеспечивает), центр экрана занят колонкой ответов на всю ширину `flex-1`.
- Логика подсчёта `h.strikes[h.curQ][0/1]` не менялась, только расположение.
- НЕ коммитить. Отчёт в `codex-reports/347-h2o-tv-strikes-sidebars.md`.
