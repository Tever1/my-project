'use client';

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { CrocIcon } from '@/components/games/CrocIcon';
import { PlayerAvatar } from '@/components/ui/PlayerAvatar';

type PreviewState =
  | 'waiting-host'
  | 'waiting-player'
  | 'ready-explainer'
  | 'ready-player'
  | 'explaining-explainer'
  | 'explaining-player'
  | 'finished';

type PreviewStep = {
  id: PreviewState;
  number: string;
  title: string;
  phoneRole: string;
  tvState: 'waiting' | 'ready' | 'explaining' | 'finished';
  note: string;
};

type ConceptId = 'arena' | 'mocap' | 'street' | 'river' | 'director' | 'route' | 'floor' | 'totem';

type Concept = {
  id: ConceptId;
  number: string;
  name: string;
  subtitle: string;
  description: string;
  tags: string[];
  accent: string;
};

const CONCEPTS: Concept[] = [
  {
    id: 'arena',
    number: 'A',
    name: 'Жестовая рулетка',
    subtitle: 'Круговой пульт · Управление большим пальцем · Игровой стол',
    description: 'Слово находится в центре вращающегося диска, а решения вынесены на противоположные дуги. На TV игроки окружают общий круг вместо привычных колонок и карточек.',
    tags: ['радиальное управление', 'без нижней панели', 'игровой объект'],
    accent: '#ff6b57',
  },
  {
    id: 'mocap',
    number: 'B',
    name: 'Свайп-протокол',
    subtitle: 'Красная колода · Полный свайп · Гонка до 20',
    description: 'Выбранное направление: карточка уходит целиком и уступает место следующей, слово всегда остаётся внутри, а TV показывает прогресс каждого игрока к 20 угаданным словам.',
    tags: ['swipe-first', '7 состояний', 'цель 20 слов'],
    accent: '#ef3340',
  },
  {
    id: 'street',
    number: 'C',
    name: 'Уличный жест',
    subtitle: 'Плакат · Ритм · Наклейки и маркеры',
    description: 'Громкий городской постер, где слово — главный графический объект. Диагонали, крупные номера и кислотный лайм создают ощущение танцевального баттла.',
    tags: ['экспрессивный', 'типографический', 'молодёжный'],
    accent: '#ff3b30',
  },
  {
    id: 'river',
    number: 'D',
    name: 'Ночная река',
    subtitle: 'Вода · Светлячки · Тихая охота',
    description: 'Атмосферный мир тёмной реки: круги на воде показывают время, игроки становятся огнями на берегу, а красный остаётся редким сигналом действия.',
    tags: ['атмосферный', 'органический', 'мягкая глубина'],
    accent: '#ef4444',
  },
  {
    id: 'director', number: 'E', name: 'Режиссёрская',
    subtitle: 'Хлопушка · Таймлайн · Сцены',
    description: 'Ход собирается как съёмочная сцена: слово лежит на монтажной дорожке, а результат отмечается маркерами дубля. TV превращается в режиссёрский монитор.',
    tags: ['timeline', 'киноязык', 'контроль хода'], accent: '#ff4e36',
  },
  {
    id: 'route', number: 'F', name: 'Маршрут жеста',
    subtitle: 'Развилка · Станции · Движение команды',
    description: 'Каждое слово — станция маршрута. Угаданное ведёт вверх по красной ветке, пропуск — по короткому объезду; на TV виден общий путь игроков.',
    tags: ['branching choice', 'карта прогресса', 'пространственный flow'], accent: '#ff513f',
  },
  {
    id: 'floor', number: 'G', name: 'Световой пол',
    subtitle: 'Неоновые плитки · Углы · Физическое действие',
    description: 'Интерфейс похож на интерактивный танцпол: слово занимает центральную плитку, действия живут в углах, а TV показывает арену сверху.',
    tags: ['асимметрия', 'угловые действия', 'неоновая сцена'], accent: '#ff375f',
  },
  {
    id: 'totem', number: 'H', name: 'Жестовый тотем',
    subtitle: 'Модули · Боковые рычаги · Собираемый счёт',
    description: 'Слово заперто в центральном модуле, таймер и статистика физически наслаиваются сверху и снизу. Решения выглядят как два боковых рычага.',
    tags: ['модульный объект', 'side controls', 'тактильный'], accent: '#e9533f',
  },
];

const STEPS: PreviewStep[] = [
  {
    id: 'waiting-host',
    number: '01',
    title: 'Сбор игроков',
    phoneRole: 'Телефон игрового хоста',
    tvState: 'waiting',
    note: 'Хост видит правила, состав комнаты и кнопку запуска.',
  },
  {
    id: 'waiting-player',
    number: '02',
    title: 'Ожидание запуска',
    phoneRole: 'Телефон обычного игрока',
    tvState: 'waiting',
    note: 'Игрок видит тот же состав, но вместо действия — ожидание хоста.',
  },
  {
    id: 'ready-explainer',
    number: '03',
    title: 'Готовность объясняющего',
    phoneRole: 'Телефон объясняющего',
    tvState: 'ready',
    note: 'Секретное слово ещё скрыто. Ход начинается только после нажатия.',
  },
  {
    id: 'ready-player',
    number: '04',
    title: 'Ожидание первого жеста',
    phoneRole: 'Телефон угадывающего',
    tvState: 'ready',
    note: 'Остальные игроки знают, кто готовится, но не видят слово.',
  },
  {
    id: 'explaining-explainer',
    number: '05',
    title: 'Активный ход',
    phoneRole: 'Телефон объясняющего',
    tvState: 'explaining',
    note: 'Только объясняющий видит слово и управляет результатом карточки.',
  },
  {
    id: 'explaining-player',
    number: '06',
    title: 'Угадывание вслух',
    phoneRole: 'Телефон угадывающего',
    tvState: 'explaining',
    note: 'Слово остаётся приватным; на общем экране показан только ход.',
  },
  {
    id: 'finished',
    number: '07',
    title: 'Финал игры',
    phoneRole: 'Телефон игрока',
    tvState: 'finished',
    note: 'TV раскрывает итоговую таблицу, телефоны ожидают решение хоста.',
  },
];

const PLAYERS = [
  { name: 'Анна', score: 12 },
  { name: 'Миша', score: 9 },
  { name: 'Лена', score: 7 },
  { name: 'Саша', score: 5 },
];

const redCardStyle: CSSProperties = {
  background:
    'radial-gradient(110% 70% at 50% -5%, rgba(255,255,255,.35), transparent 55%), linear-gradient(165deg, #ef4444 0%, #991b1b 100%)',
  boxShadow: '0 24px 60px -18px #ef4444cc',
};

function DeviceLabel({ children, size }: { children: ReactNode; size: string }) {
  return (
    <div className="mb-3 flex items-end justify-between gap-4 font-mono text-[11px] uppercase tracking-[0.17em] text-white/50">
      <span className="font-bold text-white/75">{children}</span>
      <span>{size}</span>
    </div>
  );
}

function ScaledCanvas({ width, height, children }: { width: number; height: number; children: ReactNode }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    const update = () => setScale(Math.min(1, element.clientWidth / width));
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, [width]);

  return (
    <div ref={containerRef} className="w-full" style={{ maxWidth: width, height: height * scale }}>
      <div
        style={{
          width,
          height,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
        }}
      >
        {children}
      </div>
    </div>
  );
}

function PhoneHeader({ round = 0 }: { round?: number }) {
  return (
    <header className="flex h-[66px] flex-shrink-0 items-center justify-between border-b border-white/10 bg-black/20 px-5 backdrop-blur-xl">
      <div className="flex min-w-0 items-center gap-3">
        <CrocIcon name="croc" className="h-7 w-7" />
        <div className="min-w-0">
          <h2 className="truncate text-lg font-bold">Крокодил</h2>
          <p className="text-sm text-white/60">Раунд {round} / 3</p>
        </div>
      </div>
      <button
        type="button"
        className="rounded-xl border border-red-400/25 bg-red-500/25 px-3 py-2 text-sm font-bold text-red-100"
      >
        Завершить
      </button>
    </header>
  );
}

function TimeBar({ seconds = 42 }: { seconds?: number }) {
  return (
    <div className="w-full">
      <div className="mb-2 flex items-center justify-between">
        <span className="font-mono text-xs font-bold uppercase tracking-[0.22em] text-white/65">Раунд 1 / 3</span>
        <span className="font-mono text-2xl font-black tabular-nums text-white">0:{String(seconds).padStart(2, '0')}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.12]">
        <div
          className="h-full rounded-full"
          style={{
            width: `${Math.max(4, (seconds / 60) * 100)}%`,
            background: 'linear-gradient(90deg, #ef4444, #f87171)',
            boxShadow: '0 0 12px #ef4444',
          }}
        />
      </div>
    </div>
  );
}

function WaitingCard({ isHost }: { isHost: boolean }) {
  return (
    <div className="w-full rounded-[24px] border border-white/15 bg-white/[0.08] p-6 text-center shadow-[0_18px_50px_rgba(0,0,0,.22)] backdrop-blur-2xl">
      <h3 className="mb-2 text-xl font-semibold">Крокодил</h3>
      <p className="mb-6 text-sm leading-relaxed text-white">
        Объясняйте слова, не называя их! У каждого будет 60 секунд. Очки получает тот, кто объясняет.
      </p>
      <p className="mb-2 text-sm font-medium text-white/60">Игроки (4)</p>
      <div className="mb-6 flex flex-wrap justify-center gap-2">
        {PLAYERS.map((player) => (
          <span key={player.name} className="rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-xs font-semibold">
            {player.name}
          </span>
        ))}
      </div>
      {isHost ? (
        <button type="button" className="w-full rounded-2xl bg-white px-5 py-3.5 font-black text-red-700 shadow-xl">
          Начать игру
        </button>
      ) : (
        <div className="py-2 text-sm font-semibold text-white/65">Ожидание хоста...</div>
      )}
    </div>
  );
}

function RedRoleCard({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`flex min-h-[320px] w-full flex-1 flex-col overflow-hidden rounded-[36px] px-6 py-7 text-white ${className}`}
      style={redCardStyle}
    >
      {children}
    </div>
  );
}

function PhoneScreen({ state }: { state: PreviewState }) {
  const waiting = state === 'waiting-host' || state === 'waiting-player';
  const ready = state === 'ready-explainer' || state === 'ready-player';
  const explaining = state === 'explaining-explainer' || state === 'explaining-player';
  const explainer = state === 'ready-explainer' || state === 'explaining-explainer';

  return (
    <div className="h-[844px] w-[390px] overflow-hidden rounded-[42px] border-[8px] border-[#101114] bg-[#201017] text-white shadow-[0_35px_110px_rgba(0,0,0,.55)]">
      <div className="flex h-full flex-col bg-gradient-crocodile">
        <div className="flex h-[28px] flex-shrink-0 items-center justify-between bg-black/20 px-6 text-[11px] font-semibold text-white/70">
          <span>21:47</span><span>● ● ●</span>
        </div>
        <PhoneHeader round={waiting ? 0 : state === 'finished' ? 3 : 1} />
        <main className="flex min-h-0 flex-1 flex-col items-center justify-center px-5 py-4">
          {waiting && <WaitingCard isHost={state === 'waiting-host'} />}

          {(ready || explaining) && (
            <div className="flex h-full w-full flex-col items-center gap-4">
              <TimeBar seconds={explaining ? 42 : 60} />

              {ready && explainer && (
                <RedRoleCard className="items-center justify-center text-center">
                  <button type="button" className="min-h-[96px] rounded-[30px] border border-white/20 bg-white px-10 text-3xl font-black text-red-700 shadow-[0_18px_44px_rgba(0,0,0,.25)]">
                    НАЧАТЬ
                  </button>
                  <p className="mt-5 text-base font-semibold text-white/80">Нажми, когда готов показывать</p>
                </RedRoleCard>
              )}

              {ready && !explainer && (
                <RedRoleCard className="items-center justify-center text-center">
                  <CrocIcon name="mic" className="mb-3 h-14 w-14" />
                  <p className="text-2xl font-black [text-shadow:0_3px_14px_rgba(0,0,0,.35)]">Анна готовится начать…</p>
                </RedRoleCard>
              )}

              {explaining && explainer && (
                <>
                  <RedRoleCard>
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold uppercase tracking-[0.22em] text-white/65">Слово</span>
                      <CrocIcon name="croc" className="h-9 w-9" />
                    </div>
                    <div className="flex flex-1 items-center justify-center px-2 py-8 text-center">
                      <h3 className="text-[56px] font-black leading-[0.92] tracking-[-2px] [text-shadow:0_3px_16px_rgba(0,0,0,.35)]">ВОЗДУШНЫЙ<br />ШАР</h3>
                    </div>
                    <div>
                      <p className="mb-2 font-mono text-xs font-bold uppercase tracking-[0.2em] text-white/60">Угадывают</p>
                      <div className="flex gap-2">
                        {PLAYERS.slice(1).map((player) => (
                          <span key={player.name} className="inline-flex items-center gap-2 rounded-full bg-black/20 px-2.5 py-1.5 text-sm font-semibold">
                            <PlayerAvatar nickname={player.name} sizePx={26} />{player.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  </RedRoleCard>
                  <div className="grid h-[76px] w-full grid-cols-2 gap-3">
                    <button type="button" className="rounded-[24px] border border-white/[0.12] bg-white/[0.12] text-base font-black shadow-xl backdrop-blur-md">
                      <span className="mb-1 block text-2xl leading-none">×</span>Пропустить
                    </button>
                    <button type="button" className="rounded-[24px] bg-gradient-to-b from-[#4bed7a] to-[#30d158] text-base font-black text-[#05210f] shadow-[0_16px_34px_rgba(48,209,88,.28)]">
                      <span className="mb-1 block text-2xl leading-none">✓</span>Угадали
                    </button>
                  </div>
                </>
              )}

              {explaining && !explainer && (
                <>
                  <RedRoleCard className="items-center justify-center text-center">
                    <CrocIcon name="talk" className="mb-3 h-14 w-14" />
                    <p className="text-2xl font-black [text-shadow:0_3px_14px_rgba(0,0,0,.35)]">Угадывайте вслух!</p>
                    <p className="mt-3 text-sm font-medium text-white/75">Анна объясняет слово</p>
                  </RedRoleCard>
                  <div className="h-[76px] w-full" />
                </>
              )}
            </div>
          )}

          {state === 'finished' && (
            <div className="w-full rounded-[24px] border border-white/15 bg-white/[0.08] p-6 text-center shadow-xl backdrop-blur-2xl">
              <CrocIcon name="trophy" className="mx-auto mb-3 h-12 w-12" />
              <p className="mb-1 text-lg font-semibold">Игра окончена!</p>
              <p className="py-2 text-sm font-semibold text-white/65">Ожидание хоста...</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function TvHeader({ active, guessed, skipped }: { active: boolean; guessed: number; skipped: number }) {
  const stats = [
    { label: 'Угадано', value: guessed, icon: '✓', color: '#ef4444' },
    { label: 'Пропущено', value: skipped, icon: '›', color: '#ff9f0a' },
  ];
  return (
    <header className="flex h-[92px] flex-shrink-0 items-center justify-between gap-6 border-b border-white/10 bg-black/20 px-7 backdrop-blur-sm">
      <div className="flex items-center gap-4">
        <CrocIcon name="croc" className="h-10 w-10" />
        <h2 className="text-3xl font-bold">Крокодил</h2>
        {active && <span className="rounded-full border border-red-300/30 bg-red-500/20 px-4 py-1.5 font-mono text-sm font-bold uppercase tracking-[0.18em] text-red-100">Раунд 1 / 3</span>}
      </div>
      {active && (
        <div className="flex items-center gap-3">
          {stats.map((stat) => (
            <div key={stat.label} className="flex min-w-[138px] items-center gap-3 rounded-3xl border border-white/10 bg-white/[0.06] px-4 py-2 shadow-xl">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl text-2xl font-black" style={{ backgroundColor: `${stat.color}22`, color: stat.color }}>{stat.icon}</span>
              <span className="flex flex-col leading-none">
                <b className="font-mono text-[34px] font-black tabular-nums" style={{ color: stat.color }}>{stat.value}</b>
                <small className="font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-white/45">{stat.label}</small>
              </span>
            </div>
          ))}
        </div>
      )}
    </header>
  );
}

function TvScoreboard() {
  const medals = ['#ffd60a', '#c7cdd6', '#cd8e54', 'rgba(255,255,255,.42)'];
  return (
    <section className="w-full flex-shrink-0 rounded-[24px] border border-white/10 bg-white/[0.05] p-4 shadow-[0_18px_54px_rgba(0,0,0,.25)]">
      <div className="mb-3 flex items-center gap-2"><CrocIcon name="trophy" className="h-7 w-7" /><h3 className="text-xl font-black">Таблица очков</h3></div>
      <div className="grid grid-cols-4 gap-3">
        {PLAYERS.map((player, index) => (
          <div key={player.name} className={`rounded-[20px] border px-3 py-3 text-center ${index === 0 ? 'border-red-400/40 bg-red-500/15' : 'border-white/10 bg-white/[0.04]'}`}>
            <p className="mb-1 font-mono text-xs font-black" style={{ color: medals[index] }}>#{index + 1}</p>
            <PlayerAvatar nickname={player.name} sizePx={44} ring={index === 0 ? '#ef4444' : undefined} />
            <p className="mt-1 truncate text-sm font-bold">{player.name}</p>
            <p className="font-mono text-2xl font-black tabular-nums">{player.score}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function TvScreen({ state }: { state: PreviewStep['tvState'] }) {
  const active = state === 'ready' || state === 'explaining';
  return (
    <div className="aspect-video w-[960px] overflow-hidden rounded-[30px] border-[8px] border-[#101114] bg-[#201017] text-white shadow-[0_35px_110px_rgba(0,0,0,.55)]">
      <div className="flex h-full flex-col bg-gradient-crocodile">
        <TvHeader active={active} guessed={state === 'explaining' ? 4 : 0} skipped={state === 'explaining' ? 1 : 0} />
        <main className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 overflow-hidden px-8 py-5">
          {state === 'waiting' && (
            <div className="text-center">
              <CrocIcon name="croc" className="mx-auto mb-6 h-24 w-24" />
              <h3 className="mb-4 text-4xl font-bold">Ожидаем начала игры</h3>
              <div className="mt-6 flex justify-center gap-4">
                {PLAYERS.map((player, index) => (
                  <div key={player.name} className="flex items-center gap-2 rounded-[20px] border border-white/10 bg-white/[0.08] px-6 py-3 text-xl backdrop-blur-xl">
                    {player.name}{index === 0 && <CrocIcon name="crown" className="h-5 w-5 text-yellow-300" />}
                  </div>
                ))}
              </div>
            </div>
          )}

          {active && (
            <>
              <div className="flex min-h-0 w-full flex-1 items-center justify-center gap-14">
                <div
                  className="relative flex h-[250px] w-[250px] flex-shrink-0 items-center justify-center rounded-full"
                  style={{ background: `conic-gradient(#ef4444 ${state === 'explaining' ? 252 : 360}deg, rgba(255,255,255,.08) 0)`, boxShadow: '0 0 24px #ef444455' }}
                >
                  <div className="flex h-[218px] w-[218px] flex-col items-center justify-center rounded-full bg-[#36131a]">
                    <b className="font-mono text-7xl font-black tabular-nums">{state === 'explaining' ? 42 : 60}</b>
                    <span className="mt-2 font-mono text-sm font-bold uppercase tracking-[0.28em] text-white/40">сек</span>
                  </div>
                </div>
                <div className="min-w-0 max-w-[48%] flex-1">
                  <p className="mb-4 font-mono text-lg font-bold uppercase tracking-[0.22em] text-white/45">{state === 'ready' ? 'Готовится начать' : 'Показывает слово'}</p>
                  <div className="flex items-center gap-6">
                    <PlayerAvatar nickname="Анна" sizePx={88} ring="#ef4444" />
                    <p className="truncate text-6xl font-black leading-none tracking-[-1.5px]">Анна</p>
                  </div>
                </div>
              </div>
              <TvScoreboard />
            </>
          )}

          {state === 'finished' && (
            <div className="w-full max-w-[580px] text-center">
              <CrocIcon name="trophy" className="mx-auto mb-4 h-24 w-24" />
              <h3 className="mb-6 text-4xl font-bold text-amber-400">Игра окончена!</h3>
              <div className="space-y-3">
                {PLAYERS.map((player, index) => (
                  <div key={player.name} className={`flex items-center justify-between rounded-[20px] border px-7 py-3 ${index === 0 ? 'border-amber-400 bg-amber-500/10 outline outline-1 outline-amber-400' : 'border-white/10 bg-white/[0.08]'}`}>
                    <div className="flex items-center gap-3">
                      <CrocIcon name="medal" className="h-8 w-8" style={{ color: ['#ffd60a', '#c7cdd6', '#cd8e54'][index] ?? '#f5efe6' }} />
                      <span className="text-2xl font-bold">{player.name}</span>
                    </div>
                    <b className="text-3xl text-amber-400">{player.score}</b>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function LegacyArenaPhone() {
  return (
    <div className="relative h-[844px] w-[390px] overflow-hidden rounded-[42px] border-[8px] border-[#150709] bg-[#16070a] font-serif text-[#fff7ed] shadow-2xl">
      <div className="absolute inset-x-0 top-0 h-52 bg-[radial-gradient(circle_at_50%_0%,rgba(255,72,72,.48),transparent_67%)]" />
      <div className="absolute inset-y-0 left-0 w-12 bg-[repeating-linear-gradient(90deg,#5e0712_0_8px,#34050b_8px_16px)] shadow-[12px_0_35px_rgba(0,0,0,.55)]" />
      <div className="absolute inset-y-0 right-0 w-12 bg-[repeating-linear-gradient(90deg,#34050b_0_8px,#5e0712_8px_16px)] shadow-[-12px_0_35px_rgba(0,0,0,.55)]" />
      <div className="relative z-10 flex h-full flex-col px-14 pb-7 pt-5">
        <div className="flex items-center justify-between text-[11px] font-bold tracking-[.18em] text-[#d8b47b]"><span>КРОКОДИЛ</span><span>АКТ I · 00:42</span></div>
        <div className="mt-8 text-center"><span className="text-[10px] font-bold uppercase tracking-[.32em] text-[#d8b47b]">На сцене</span><h3 className="mt-2 text-3xl font-bold">Анна</h3></div>
        <div className="relative mt-7 flex flex-1 flex-col items-center justify-center overflow-hidden rounded-t-[150px] border border-[#ffd59b]/25 bg-[radial-gradient(circle_at_50%_35%,#a91d2e_0%,#5b0914_48%,#22070b_78%)] px-5 text-center shadow-[inset_0_0_70px_rgba(0,0,0,.55),0_24px_80px_rgba(239,68,68,.22)]">
          <div className="absolute left-1/2 top-7 h-44 w-44 -translate-x-1/2 rounded-full bg-[#ffdb9b]/10 blur-xl" />
          <CrocIcon name="croc" className="relative mb-7 h-12 w-12 text-[#f4ca8e]" />
          <span className="relative text-[10px] font-bold uppercase tracking-[.34em] text-[#f4ca8e]">Ваша роль</span>
          <h4 className="relative mt-4 text-[48px] font-bold leading-[.92] tracking-[-.04em]">Воздушный<br />шар</h4>
          <div className="relative mt-7 h-px w-24 bg-[#f4ca8e]/40" />
          <p className="relative mt-4 text-sm italic text-white/65">Покажите без единого слова</p>
        </div>
        <div className="mt-4 grid grid-cols-[1fr_1.25fr] gap-3 font-sans">
          <button className="h-[70px] rounded-full border border-white/15 bg-white/5 text-sm font-black uppercase tracking-[.08em]">Пропустить</button>
          <button className="h-[70px] rounded-full bg-[#ef334f] text-sm font-black uppercase tracking-[.08em] shadow-[0_14px_35px_rgba(239,51,79,.35)]">Угадали ✓</button>
        </div>
      </div>
    </div>
  );
}

function LegacyArenaTv() {
  return (
    <div className="relative h-[540px] w-[960px] overflow-hidden rounded-[30px] border-[8px] border-[#150709] bg-[#120508] font-serif text-[#fff7ed] shadow-2xl">
      <div className="absolute inset-x-0 top-0 h-[420px] bg-[radial-gradient(ellipse_at_50%_0%,rgba(239,51,79,.42),transparent_62%)]" />
      <div className="absolute inset-y-0 left-0 w-28 bg-[repeating-linear-gradient(90deg,#600916_0_14px,#35050b_14px_28px)] shadow-[20px_0_60px_rgba(0,0,0,.65)]" />
      <div className="absolute inset-y-0 right-0 w-28 bg-[repeating-linear-gradient(90deg,#35050b_0_14px,#600916_14px_28px)] shadow-[-20px_0_60px_rgba(0,0,0,.65)]" />
      <header className="relative z-10 flex items-center justify-between px-10 py-6 font-sans"><div className="flex items-center gap-3"><CrocIcon name="croc" className="h-9 w-9 text-[#f4ca8e]" /><b className="text-xl uppercase tracking-[.2em]">Красный манеж</b></div><span className="rounded-full border border-[#f4ca8e]/30 px-5 py-2 text-sm font-bold text-[#f4ca8e]">РАУНД 1 · АКТ 03</span></header>
      <main className="relative z-10 grid h-[350px] grid-cols-[260px_1fr_260px] items-center gap-8 px-20">
        <div className="text-center"><div className="mx-auto flex h-52 w-52 items-center justify-center rounded-full border-[10px] border-[#ef334f] bg-[#21080d] shadow-[0_0_65px_rgba(239,51,79,.32)]"><div><b className="font-sans text-7xl">42</b><span className="mt-1 block font-sans text-xs tracking-[.3em] text-white/45">СЕКУНД</span></div></div></div>
        <div className="text-center"><span className="text-xs font-bold uppercase tracking-[.38em] text-[#d8b47b]">На сцене</span><div className="mx-auto my-5 h-20 w-20"><PlayerAvatar nickname="Анна" sizePx={80} ring="#ef334f" /></div><h2 className="text-6xl font-bold">Анна</h2><p className="mt-3 italic text-white/55">Показывает слово</p></div>
        <div className="space-y-3 font-sans">{PLAYERS.slice(0,3).map((p,i)=><div key={p.name} className={`flex items-center justify-between border-b py-3 ${i===0?'border-[#ef334f] text-white':'border-white/10 text-white/55'}`}><span><small className="mr-3 text-[#d8b47b]">0{i+1}</small>{p.name}</span><b className="text-2xl">{p.score}</b></div>)}</div>
      </main>
      <footer className="relative z-10 mx-auto flex w-[72%] items-center justify-center border-t border-[#f4ca8e]/20 py-4 font-sans text-[11px] font-bold uppercase tracking-[.3em] text-[#d8b47b]">Секрет остаётся за кулисами</footer>
    </div>
  );
}

function LegacyMocapPhone() {
  return (
    <div className="relative h-[844px] w-[390px] overflow-hidden rounded-[42px] border-[8px] border-[#101820] bg-[#f4f7f7] font-mono text-[#101820] shadow-2xl">
      <div className="absolute inset-0 opacity-50 [background-image:linear-gradient(#9bb7bd33_1px,transparent_1px),linear-gradient(90deg,#9bb7bd33_1px,transparent_1px)] [background-size:24px_24px]" />
      <div className="relative flex h-full flex-col p-5">
        <header className="flex items-center justify-between border-b-2 border-[#101820] pb-4"><div><span className="text-[9px] font-bold tracking-[.24em] text-[#ef4444]">MOTION SESSION</span><h3 className="text-xl font-black">CROC / 01</h3></div><div className="text-right"><b className="text-2xl">00:42</b><small className="block text-[9px] tracking-[.2em]">LIVE CAPTURE</small></div></header>
        <div className="mt-5 grid grid-cols-[76px_1fr] gap-4"><div className="space-y-2">{['BODY','VOICE','TIME'].map((x,i)=><div key={x} className={`border-2 p-2 text-center ${i===0?'border-[#ef4444] bg-[#ef4444] text-white':'border-[#101820]/25 bg-white/50'}`}><b className="text-[9px]">{x}</b><span className="mt-1 block text-lg">{i===0?'ON':i===1?'OFF':'42'}</span></div>)}</div><div className="relative h-[260px] border-2 border-[#101820] bg-[#dfeaec]/65">
          <div className="absolute left-1/2 top-8 h-12 w-12 -translate-x-1/2 rounded-full border-2 border-[#ef4444]" /><div className="absolute left-1/2 top-20 h-28 w-0 -translate-x-1/2 border-l-2 border-[#101820]" /><div className="absolute left-[31%] top-[112px] w-[38%] rotate-[-12deg] border-t-2 border-[#101820]" /><div className="absolute left-[42%] top-[190px] h-16 rotate-[22deg] border-l-2 border-[#101820]" /><div className="absolute right-[42%] top-[190px] h-16 rotate-[-22deg] border-l-2 border-[#101820]" />
          {[[50,35],[34,44],[66,42],[44,70],[57,70]].map(([x,y],i)=><i key={i} className="absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#ef4444] shadow-[0_0_0_5px_rgba(239,68,68,.14)]" style={{left:`${x}%`,top:`${y}%`}} />)}
          <span className="absolute bottom-3 left-3 bg-[#101820] px-2 py-1 text-[9px] font-bold text-white">SUBJECT · АННА</span>
        </div></div>
        <section className="mt-4 border-2 border-[#101820] bg-white p-5"><span className="text-[9px] font-bold tracking-[.24em] text-[#ef4444]">TARGET OBJECT</span><h2 className="mt-3 text-[39px] font-black uppercase leading-[.92] tracking-[-.07em]">Воздушный<br />шар</h2><div className="mt-4 flex items-center gap-2 text-[10px]"><i className="h-2 w-2 rounded-full bg-[#00a9b7]" /> 3 НАБЛЮДАТЕЛЯ ПОДКЛЮЧЕНЫ</div></section>
        <div className="mt-auto grid grid-cols-2 gap-3"><button className="h-16 border-2 border-[#101820] bg-transparent text-xs font-black">SKIP ×</button><button className="h-16 border-2 border-[#101820] bg-[#ef4444] text-xs font-black text-white">MATCH ✓</button></div>
      </div>
    </div>
  );
}

function LegacyMocapTv() {
  return (
    <div className="relative h-[540px] w-[960px] overflow-hidden rounded-[30px] border-[8px] border-[#101820] bg-[#f4f7f7] font-mono text-[#101820] shadow-2xl">
      <div className="absolute inset-0 opacity-60 [background-image:linear-gradient(#9bb7bd33_1px,transparent_1px),linear-gradient(90deg,#9bb7bd33_1px,transparent_1px)] [background-size:28px_28px]" />
      <header className="relative flex h-[78px] items-center justify-between border-b-2 border-[#101820] px-8"><div className="flex items-center gap-4"><span className="flex h-10 w-10 items-center justify-center bg-[#ef4444] text-white"><CrocIcon name="croc" className="h-7 w-7" /></span><div><small className="font-bold tracking-[.22em] text-[#ef4444]">MOTION CAPTURE</small><h2 className="text-xl font-black">CROC_SESSION_01</h2></div></div><div className="flex gap-10 text-right"><span><small className="block text-[9px] tracking-[.2em]">ROUND</small><b className="text-xl">01/03</b></span><span><small className="block text-[9px] tracking-[.2em]">TIME</small><b className="text-3xl">00:42</b></span></div></header>
      <main className="relative grid h-[454px] grid-cols-[1.35fr_.9fr] gap-5 p-6"><section className="relative overflow-hidden border-2 border-[#101820] bg-[#dfeaec]/75"><div className="absolute inset-0 [background-image:linear-gradient(#7fa0a633_1px,transparent_1px),linear-gradient(90deg,#7fa0a633_1px,transparent_1px)] [background-size:40px_40px]" /><div className="absolute left-[43%] top-[16%] h-20 w-20 rounded-full border-[3px] border-[#ef4444]" /><div className="absolute left-[47%] top-[30%] h-48 border-l-[3px] border-[#101820]" /><div className="absolute left-[28%] top-[44%] w-[40%] rotate-[-10deg] border-t-[3px] border-[#101820]" />{[[47,20],[31,40],[69,34],[40,65],[58,67],[37,88],[61,88]].map(([x,y],i)=><i key={i} className="absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#ef4444] shadow-[0_0_0_7px_rgba(239,68,68,.12)]" style={{left:`${x}%`,top:`${y}%`}} />)}<span className="absolute bottom-4 left-4 bg-[#101820] px-3 py-2 text-xs font-bold text-white">TRACKING · АННА · CONF 98%</span></section>
        <aside className="flex flex-col gap-4"><div className="border-2 border-[#101820] bg-white p-5"><small className="font-bold tracking-[.2em] text-[#ef4444]">ACTIVE SUBJECT</small><div className="mt-4 flex items-center gap-4"><PlayerAvatar nickname="Анна" sizePx={62} ring="#ef4444" /><div><b className="text-3xl">АННА</b><span className="block text-xs text-[#101820]/50">GESTURE IN PROGRESS</span></div></div></div><div className="grid flex-1 grid-cols-2 gap-3">{PLAYERS.map((p,i)=><div key={p.name} className={`border-2 p-3 ${i===0?'border-[#ef4444] bg-[#ef4444] text-white':'border-[#101820] bg-white'}`}><small className="text-[9px]">0{i+1}</small><b className="mt-5 block text-lg">{p.name}</b><strong className="text-3xl">{p.score}</strong></div>)}</div></aside></main>
    </div>
  );
}

function StreetPhone() {
  return (
    <div className="croc-motion relative h-[844px] w-[390px] overflow-hidden rounded-[42px] border-[8px] border-black bg-[#f3eddf] font-sans text-black shadow-2xl">
      <div className="absolute -right-14 top-28 h-36 w-64 rotate-[-14deg] bg-[#d8ff3e]" /><div className="absolute -left-20 bottom-24 h-28 w-72 rotate-[18deg] bg-[#ff3b30]" />
      <div className="relative flex h-full flex-col p-5">
        <header className="flex items-center justify-between border-b-4 border-black pb-3"><div className="flex items-center gap-2"><CrocIcon name="croc" className="h-8 w-8 !text-black" /><b className="text-xl font-black uppercase italic">КРОК!</b></div><span className="border-2 border-black bg-[#d8ff3e] px-3 py-1 text-xs font-black">01 / 03</span></header>
        <div className="mt-4 flex items-center justify-between"><span className="rotate-[-3deg] bg-black px-3 py-2 text-xs font-black uppercase text-white">Твой выход, Анна</span><b className="text-4xl font-black tracking-[-.08em]">00:42</b></div>
        <section className="motion-poster-slam relative mt-5 flex flex-1 flex-col border-4 border-black bg-[#ff3b30] p-5 shadow-[10px_10px_0_#000]">
          <span className="self-start border-2 border-black bg-[#f3eddf] px-2 py-1 text-[10px] font-black uppercase">Слово №07</span>
          <div className="flex flex-1 items-center justify-center text-center"><h2 className="rotate-[-5deg] text-[63px] font-black uppercase leading-[.82] tracking-[-.09em] [text-shadow:5px_5px_0_#f3eddf]">Воздушный<br />шар</h2></div>
          <div className="flex items-center justify-between border-t-4 border-black pt-3 text-xs font-black uppercase"><span>Ни звука</span><span>Только жесты</span></div>
        </section>
        <div className="mt-5 grid grid-cols-[.85fr_1.15fr] gap-3"><button className="h-[72px] border-4 border-black bg-[#f3eddf] text-sm font-black uppercase shadow-[5px_5px_0_#000]">Мимо ×</button><button className="h-[72px] border-4 border-black bg-[#d8ff3e] text-sm font-black uppercase shadow-[5px_5px_0_#000]">Есть! +1</button></div>
        <div className="mt-5 flex justify-between text-[10px] font-black uppercase tracking-[.1em]"><span>Угадано 04</span><span>Пропущено 01</span></div>
      </div>
    </div>
  );
}

function StreetTv() {
  return (
    <div className="croc-motion relative h-[540px] w-[960px] overflow-hidden rounded-[30px] border-[8px] border-black bg-[#f3eddf] font-sans text-black shadow-2xl">
      <div className="motion-street-band absolute -left-24 top-28 h-36 w-[620px] rotate-[-8deg] bg-[#ff3b30]" /><div className="motion-street-band absolute -right-20 bottom-20 h-28 w-[520px] rotate-[9deg] bg-[#d8ff3e] [animation-delay:-1.2s]" />
      <header className="relative flex h-[82px] items-center justify-between border-b-4 border-black px-7"><div className="flex items-center gap-3"><CrocIcon name="croc" className="h-10 w-10 !text-black" /><b className="text-3xl font-black uppercase italic tracking-[-.06em]">КРОК! / ЖЕСТ-БАТТЛ</b></div><span className="border-4 border-black bg-[#d8ff3e] px-4 py-2 font-black">РАУНД 01</span></header>
      <main className="relative grid h-[380px] grid-cols-[1fr_330px] gap-6 p-7"><section className="flex flex-col justify-between border-4 border-black bg-[#ff3b30] p-6 shadow-[10px_10px_0_#000]"><span className="w-max -rotate-2 bg-black px-4 py-2 text-sm font-black uppercase text-white">Сейчас показывает</span><div className="flex items-center gap-6"><PlayerAvatar nickname="Анна" sizePx={92} ring="#000" /><div><h2 className="text-7xl font-black uppercase italic leading-none tracking-[-.08em]">АННА</h2><p className="mt-2 text-lg font-black uppercase">Не подсказывать словами!</p></div></div><div className="flex items-end justify-between border-t-4 border-black pt-4"><div><small className="font-black uppercase">Осталось</small><b className="block text-7xl leading-none tracking-[-.08em]">00:42</b></div><div className="rotate-3 border-4 border-black bg-[#f3eddf] px-5 py-3 text-right shadow-[5px_5px_0_#000]"><small className="font-black uppercase">За ход</small><b className="block text-4xl">+4</b></div></div></section><aside className="flex flex-col border-4 border-black bg-[#f3eddf] p-4 shadow-[10px_10px_0_#000]"><h3 className="border-b-4 border-black pb-3 text-xl font-black uppercase">Таблица шума</h3>{PLAYERS.map((p,i)=><div key={p.name} className="flex flex-1 items-center justify-between border-b-2 border-black last:border-b-0"><span className="text-lg font-black"><i className="mr-3 not-italic text-[#ff3b30]">0{i+1}</i>{p.name}</span><b className="text-3xl">{p.score}</b></div>)}</aside></main>
      <footer className="relative flex h-[70px] items-center justify-center border-t-4 border-black bg-black text-sm font-black uppercase tracking-[.24em] text-[#d8ff3e]">Секретное слово только у объясняющего</footer>
    </div>
  );
}

function RiverPhone() {
  return (
    <div className="croc-motion relative h-[844px] w-[390px] overflow-hidden rounded-[42px] border-[8px] border-[#071718] bg-[#06191a] font-[Trebuchet_MS] text-[#e7f6ee] shadow-2xl">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_18%,rgba(41,167,155,.25),transparent_34%),linear-gradient(180deg,#06191a_0%,#0b3030_55%,#071a21_100%)]" />
      {[12,31,57,79].map((x,i)=><i key={x} className="motion-firefly absolute h-1.5 w-1.5 rounded-full bg-[#d7ff9c] shadow-[0_0_14px_4px_rgba(215,255,156,.45)]" style={{left:`${x}%`,top:`${18+i*13}%`,animationDelay:`${i*-.7}s`}} />)}
      <div className="relative flex h-full flex-col px-6 py-5">
        <header className="flex items-center justify-between"><div className="flex items-center gap-3"><CrocIcon name="croc" className="h-9 w-9 text-[#d7ff9c]" /><div><small className="block text-[9px] uppercase tracking-[.24em] text-[#82cfc1]">Ночная река</small><b className="text-lg">Крокодил</b></div></div><span className="rounded-full border border-[#82cfc1]/30 bg-[#82cfc1]/10 px-3 py-2 text-xs">Раунд 1</span></header>
        <div className="motion-ripple relative mx-auto mt-8 flex h-44 w-44 items-center justify-center rounded-full border border-[#82cfc1]/20 shadow-[0_0_0_18px_rgba(41,167,155,.05),0_0_0_38px_rgba(41,167,155,.035)]"><div className="motion-timer-ring absolute inset-3 rounded-full border-[5px] border-[#ef4444] border-l-transparent" /><div className="text-center"><b className="text-5xl">42</b><span className="block text-[10px] uppercase tracking-[.24em] text-[#82cfc1]">секунд</span></div></div>
        <section className="mt-9 flex flex-1 flex-col justify-center rounded-[38px] border border-[#82cfc1]/20 bg-[#0a2729]/75 p-7 text-center shadow-[0_26px_70px_rgba(0,0,0,.3)] backdrop-blur-xl"><span className="text-[10px] font-bold uppercase tracking-[.3em] text-[#82cfc1]">Слово в глубине</span><h2 className="mt-7 text-[48px] font-bold leading-[.96] tracking-[-.04em]">Воздушный<br />шар</h2><div className="mx-auto mt-8 flex -space-x-2">{PLAYERS.slice(1).map(p=><PlayerAvatar key={p.name} nickname={p.name} sizePx={34} ring="#0a2729" />)}</div><p className="mt-3 text-xs text-white/50">Трое ждут ваш жест</p></section>
        <div className="mt-5 grid grid-cols-2 gap-3"><button className="h-[68px] rounded-[24px] border border-[#82cfc1]/25 bg-[#82cfc1]/10 text-sm font-bold">Пропустить</button><button className="h-[68px] rounded-[24px] bg-[#ef4444] text-sm font-bold shadow-[0_16px_40px_rgba(239,68,68,.28)]">Угадали</button></div>
      </div>
    </div>
  );
}

function RiverTv() {
  return (
    <div className="croc-motion relative h-[540px] w-[960px] overflow-hidden rounded-[30px] border-[8px] border-[#071718] bg-[#06191a] font-[Trebuchet_MS] text-[#e7f6ee] shadow-2xl">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_42%,rgba(41,167,155,.28),transparent_38%),linear-gradient(180deg,#06191a_0%,#0b3030_60%,#071a21_100%)]" />
      {[8,18,29,72,83,91].map((x,i)=><i key={x} className="motion-firefly absolute h-2 w-2 rounded-full bg-[#d7ff9c] shadow-[0_0_18px_5px_rgba(215,255,156,.45)]" style={{left:`${x}%`,top:`${15+(i%3)*23}%`,animationDelay:`${i*-.55}s`}} />)}
      <header className="relative flex h-[82px] items-center justify-between border-b border-[#82cfc1]/15 px-8"><div className="flex items-center gap-3"><CrocIcon name="croc" className="h-10 w-10 text-[#d7ff9c]" /><div><small className="block text-[9px] uppercase tracking-[.28em] text-[#82cfc1]">Ночная река</small><b className="text-2xl">Крокодил</b></div></div><span className="rounded-full border border-[#82cfc1]/25 bg-[#82cfc1]/10 px-5 py-2 text-sm">Раунд 1 из 3</span></header>
      <main className="relative grid h-[458px] grid-cols-[260px_1fr_270px] items-center gap-8 px-10"><div className="relative flex h-56 w-56 items-center justify-center rounded-full border border-[#82cfc1]/20 shadow-[0_0_0_24px_rgba(41,167,155,.045),0_0_0_50px_rgba(41,167,155,.025)]"><div className="absolute inset-3 rounded-full border-[8px] border-[#ef4444] border-l-transparent" /><div className="text-center"><b className="text-7xl">42</b><span className="block text-xs uppercase tracking-[.28em] text-[#82cfc1]">секунд</span></div></div><section className="text-center"><span className="text-[10px] font-bold uppercase tracking-[.34em] text-[#82cfc1]">Сейчас на воде</span><div className="mx-auto my-5 w-max rounded-full bg-[#0b3030] p-2 shadow-[0_0_50px_rgba(41,167,155,.3)]"><PlayerAvatar nickname="Анна" sizePx={92} ring="#d7ff9c" /></div><h2 className="text-6xl font-bold">Анна</h2><p className="mt-3 text-white/50">Показывает слово</p></section><aside className="rounded-[30px] border border-[#82cfc1]/20 bg-[#0a2729]/75 p-5 backdrop-blur-xl"><h3 className="mb-4 text-xs font-bold uppercase tracking-[.24em] text-[#82cfc1]">Огни на берегу</h3>{PLAYERS.map((p,i)=><div key={p.name} className="flex items-center justify-between border-b border-[#82cfc1]/10 py-3 last:border-0"><span className="flex items-center gap-3"><i className={`h-2.5 w-2.5 rounded-full ${i===0?'bg-[#ef4444] shadow-[0_0_12px_#ef4444]':'bg-[#d7ff9c]'}`} />{p.name}</span><b className="text-2xl">{p.score}</b></div>)}</aside></main>
    </div>
  );
}

function ArenaPhone() {
  return <div className="croc-motion relative h-[844px] w-[390px] overflow-hidden rounded-[42px] border-[8px] border-[#241217] bg-[#2a1019] font-[Georgia] text-[#fff4dd] shadow-2xl">
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_46%,#6e2130_0_31%,transparent_32%),radial-gradient(circle_at_50%_46%,transparent_0_44%,#170a10_45%)]" />
    <header className="relative flex items-center justify-between px-6 pt-6 text-[10px] font-bold uppercase tracking-[.24em]"><span>Жестовая рулетка</span><b className="rounded-full bg-[#ff6b57] px-3 py-2 font-sans text-[#250b12]">1 / 3</b></header>
    <div className="motion-roulette relative mx-auto mt-14 h-[530px] w-[530px] -translate-x-[70px] rounded-full border border-[#ffcf9b]/25 bg-[#170a10] shadow-[0_0_0_22px_#4b1722,0_0_80px_#ff6b5733]">
      <button className="absolute left-0 top-1/2 z-10 flex h-36 w-36 -translate-x-4 -translate-y-1/2 items-center justify-center rounded-full border-4 border-[#ffcf9b] bg-[#2a1019] font-sans text-xs font-black uppercase">←<br/>Пропуск</button>
      <button className="absolute right-0 top-1/2 z-10 flex h-40 w-40 translate-x-4 -translate-y-1/2 items-center justify-center rounded-full bg-[#ff6b57] font-sans text-sm font-black uppercase text-[#250b12] shadow-[0_0_35px_#ff6b5788]">Угадали<br/>+1 →</button>
      <div className="absolute inset-[118px] flex flex-col items-center justify-center rounded-full border border-[#ffcf9b]/30 bg-[#6e2130] text-center"><small className="uppercase tracking-[.28em] text-[#ffcf9b]">покажите</small><h2 className="mt-4 text-[42px] font-bold leading-[.9]">Воздушный<br/>шар</h2></div>
      <div className="absolute left-1/2 top-5 -translate-x-1/2 text-center font-sans"><b className="text-4xl">42</b><small className="block text-[9px] tracking-[.2em] text-white/45">СЕК</small></div>
    </div>
    <div className="absolute inset-x-6 bottom-6 flex items-center justify-between font-sans text-xs"><span>Анна · ход</span><span className="text-[#ffcf9b]">4 угадано · 1 мимо</span></div>
  </div>;
}

function ArenaTv() {
  return <div className="croc-motion relative h-[540px] w-[960px] overflow-hidden rounded-[30px] border-[8px] border-[#241217] bg-[#170a10] font-[Georgia] text-[#fff4dd] shadow-2xl">
    <div className="motion-roulette-tv absolute left-1/2 top-1/2 h-[430px] w-[430px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#ffcf9b]/20 bg-[#4b1722] shadow-[0_0_0_38px_#2a1019,0_0_0_39px_#ffcf9b33]" />
    <header className="relative flex justify-between px-8 py-6 font-sans text-xs font-black uppercase tracking-[.22em]"><span>Жестовая рулетка</span><span>Раунд 1 из 3</span></header>
    <div className="absolute left-1/2 top-1/2 flex h-[240px] w-[240px] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full border-[10px] border-[#ff6b57] text-center"><PlayerAvatar nickname="Анна" sizePx={70} ring="#ffcf9b"/><h2 className="mt-3 text-5xl">Анна</h2><span className="font-sans text-xs uppercase tracking-[.2em] text-white/45">показывает</span></div>
    <div className="absolute left-[115px] top-[148px] text-center font-sans"><b className="text-7xl">42</b><small className="block tracking-[.25em] text-white/40">СЕКУНД</small></div>
    {PLAYERS.map((p,i)=><div key={p.name} className="absolute flex h-24 w-24 flex-col items-center justify-center rounded-full border border-[#ffcf9b]/25 bg-[#2a1019] font-sans" style={{right:i<2?`${105+i*125}px`:undefined,left:i>=2?`${105+(i-2)*125}px`:undefined,bottom:i%2?48:86}}><small>{p.name}</small><b className="text-2xl text-[#ff6b57]">{p.score}</b></div>)}
  </div>;
}

function DiscardedSwipePhone() {
  return <div className="relative h-[844px] w-[390px] overflow-hidden rounded-[42px] border-[8px] border-[#101632] bg-[#f5f1e8] font-sans text-[#101632] shadow-2xl">
    <div className="absolute left-0 top-0 h-full w-3 bg-[#101632]"><i className="absolute bottom-0 left-0 w-full bg-[#4169ff]" style={{height:'68%'}} /></div>
    <div className="absolute right-5 top-5 rounded-full border border-[#101632] px-3 py-1 text-[10px] font-black">00:42</div>
    <div className="flex h-full flex-col pl-8">
      <header className="pt-7 text-[10px] font-black uppercase tracking-[.28em] text-[#4169ff]">Свайп-протокол / Анна</header>
      <section className="relative my-auto mr-0 flex h-[610px] flex-col justify-between overflow-hidden rounded-l-[44px] bg-[#4169ff] p-8 text-white shadow-[-18px_24px_0_#101632]">
        <div className="flex justify-between text-xs font-black uppercase"><span>← пропустить</span><span>угадали →</span></div>
        <div><small className="font-mono uppercase tracking-[.24em] text-white/60">карточка 07</small><h2 className="mt-5 text-[64px] font-black uppercase leading-[.82] tracking-[-.08em]">Воздушный<br/>шар</h2></div>
        <div className="flex items-center justify-center gap-4 text-sm"><span className="text-3xl">←</span><div className="h-px flex-1 bg-white/40"/><b>ТЯНИ КРАЙ</b><div className="h-px flex-1 bg-white/40"/><span className="text-3xl">→</span></div>
      </section>
      <footer className="pb-6 pr-6 text-center text-[10px] font-black uppercase tracking-[.18em]">Кнопок нет · решение одним жестом</footer>
    </div>
  </div>;
}

function DiscardedSwipeTv() {
  return <div className="relative h-[540px] w-[960px] overflow-hidden rounded-[30px] border-[8px] border-[#101632] bg-[#f5f1e8] font-sans text-[#101632] shadow-2xl">
    <div className="grid h-full grid-cols-[1fr_180px]">
      <main className="relative flex flex-col justify-between p-10"><span className="text-xs font-black uppercase tracking-[.28em] text-[#4169ff]">Свайп-протокол · прямой эфир</span><div className="flex items-end gap-7"><PlayerAvatar nickname="Анна" sizePx={120} ring="#4169ff"/><div><small className="font-black uppercase tracking-[.2em]">Сейчас показывает</small><h2 className="text-8xl font-black uppercase leading-none tracking-[-.08em]">Анна</h2></div></div><div className="grid grid-cols-4 border-t-4 border-[#101632] pt-4">{PLAYERS.map((p,i)=><div key={p.name} className="border-r border-[#101632]/25 px-3 last:border-0"><small>0{i+1} {p.name}</small><b className="block text-4xl">{p.score}</b></div>)}</div></main>
      <aside className="relative bg-[#101632] text-white"><div className="absolute inset-x-0 bottom-0 h-[68%] bg-[#4169ff]"/><div className="relative flex h-full flex-col items-center justify-between py-8"><b className="text-6xl">42</b><span className="[writing-mode:vertical-rl] rotate-180 text-xs font-black uppercase tracking-[.3em]">время хода</span><small>00</small></div></aside>
    </div>
  </div>;
}

function DiscardedDirectorPhone() {
  return <div className="h-[844px] w-[390px] overflow-hidden rounded-[42px] border-[8px] border-black bg-[#eee8da] font-mono text-[#141414] shadow-2xl"><header className="bg-black p-5 text-white"><div className="mb-4 h-14 -rotate-3 bg-[repeating-linear-gradient(135deg,#fff_0_24px,#111_24px_48px)]"/><div className="flex justify-between"><b>СЦЕНА 07 · АННА</b><b className="text-[#ff4e36]">00:42</b></div></header><main className="p-5"><div className="border-4 border-black bg-white p-5"><small className="font-bold text-[#ff4e36]">КАДР / СЕКРЕТНО</small><h2 className="my-10 text-5xl font-black uppercase leading-[.9] tracking-[-.07em]">Воздушный<br/>шар</h2><p className="border-t-2 border-black pt-3 text-xs">Покажите телом. Без слов и звуков.</p></div><div className="mt-7"><div className="flex justify-between text-[10px] font-bold"><span>СТАРТ</span><span>ФИНИШ</span></div><div className="relative mt-3 h-24 border-y-2 border-black bg-[repeating-linear-gradient(90deg,transparent_0_39px,#aaa_40px)]"><i className="absolute left-[62%] h-full w-1 bg-[#ff4e36]"/><button className="absolute -bottom-16 left-4 border-2 border-black bg-white px-4 py-3 font-bold">× МИМО</button><button className="absolute -bottom-16 right-4 bg-[#ff4e36] px-5 py-3 font-bold text-white">+ ДУБЛЬ УДАЛСЯ</button></div></div></main></div>;
}

function DiscardedDirectorTv() {
  return <div className="h-[540px] w-[960px] overflow-hidden rounded-[30px] border-[8px] border-black bg-[#151515] font-mono text-white shadow-2xl"><div className="grid h-full grid-cols-[1fr_260px]"><main className="p-6"><div className="flex h-[380px] flex-col justify-between border border-white/25 bg-[#282828] p-7 shadow-[inset_0_0_0_10px_#050505]"><span className="text-xs text-[#ff4e36]">CAM A · LIVE · TAKE 07</span><div className="flex items-center justify-center gap-8"><PlayerAvatar nickname="Анна" sizePx={118} ring="#ff4e36"/><h2 className="text-7xl font-black uppercase">Анна</h2></div><span className="text-center text-xs tracking-[.25em] text-white/45">ПОКАЗЫВАЕТ СЛЕДУЮЩИЙ КАДР</span></div><div className="mt-5 flex h-20 items-center bg-[#eee8da] px-5 text-black"><b>00:42</b><div className="mx-5 h-1 flex-1 bg-black"><i className="block h-3 w-[62%] -translate-y-1 bg-[#ff4e36]"/></div><b>СЦЕНА 01/03</b></div></main><aside className="border-l border-white/20 p-5"><b className="text-[#ff4e36]">CAST / SCORE</b>{PLAYERS.map((p,i)=><div key={p.name} className="mt-5 border-b border-white/20 pb-4"><small>0{i+1} {p.name}</small><b className="block text-4xl">{p.score}</b></div>)}</aside></div></div>;
}

function DiscardedRoutePhone() {
  return <div className="relative h-[844px] w-[390px] overflow-hidden rounded-[42px] border-[8px] border-[#10234c] bg-[#f4ecd8] font-sans text-[#10234c] shadow-2xl"><header className="flex justify-between p-6 text-xs font-black uppercase"><span>Маршрут жеста</span><span>42 сек</span></header><div className="absolute left-1/2 top-24 h-[650px] w-3 -translate-x-1/2 rounded-full bg-[#10234c]"/><div className="absolute left-1/2 top-56 h-3 w-44 -translate-x-full -rotate-[28deg] origin-right bg-[#8a97a8]"/><div className="absolute left-1/2 top-56 h-3 w-44 rotate-[28deg] origin-left bg-[#ff513f]"/><section className="absolute left-1/2 top-[105px] w-[260px] -translate-x-1/2 rounded-[34px] border-4 border-[#10234c] bg-white p-7 text-center shadow-[8px_8px_0_#10234c]"><small className="font-black uppercase tracking-[.2em]">Станция 07</small><h2 className="mt-4 text-4xl font-black leading-none">Воздушный<br/>шар</h2></section><button className="absolute left-4 top-[370px] h-32 w-32 rotate-[-8deg] rounded-full border-4 border-[#10234c] bg-[#d8dde2] font-black">ОБЪЕЗД<br/>ПРОПУСК</button><button className="absolute right-3 top-[370px] h-36 w-36 rotate-[8deg] rounded-full border-4 border-[#10234c] bg-[#ff513f] font-black text-white shadow-[8px_8px_0_#10234c]">ВПЕРЁД<br/>+1</button><div className="absolute bottom-8 left-1/2 -translate-x-1/2 rounded-full bg-[#10234c] px-5 py-3 text-sm font-black text-white">АННА · В ПУТИ</div></div>;
}

function DiscardedRouteTv() {
  return <div className="relative h-[540px] w-[960px] overflow-hidden rounded-[30px] border-[8px] border-[#10234c] bg-[#f4ecd8] font-sans text-[#10234c] shadow-2xl"><header className="flex justify-between p-7 text-sm font-black uppercase"><span>Маршрут жеста</span><span>Раунд 1 · 00:42</span></header><div className="absolute left-20 right-20 top-1/2 h-4 -translate-y-1/2 bg-[#10234c]"/>{PLAYERS.map((p,i)=><div key={p.name} className={`absolute top-1/2 flex h-28 w-28 -translate-y-1/2 flex-col items-center justify-center rounded-full border-4 border-[#10234c] ${i===0?'bg-[#ff513f] text-white shadow-[8px_8px_0_#10234c]':'bg-white'}`} style={{left:`${80+i*205}px`}}><small>{p.name}</small><b className="text-3xl">{p.score}</b></div>)}<div className="absolute left-[70px] top-[140px] rounded-full bg-[#10234c] px-5 py-2 text-white">СТАРТ</div><div className="absolute right-[60px] top-[350px] rounded-full bg-[#ff513f] px-5 py-2 font-black text-white">ФИНИШ</div><div className="absolute left-[92px] top-[360px] text-3xl font-black">АННА ДВИЖЕТСЯ →</div></div>;
}

function DiscardedFloorPhone() {
  return <div className="relative h-[844px] w-[390px] overflow-hidden rounded-[42px] border-[8px] border-black bg-[#08080b] font-sans text-white shadow-2xl"><div className="grid h-full grid-cols-2 grid-rows-[170px_1fr_210px] gap-2 p-2"><div className="flex flex-col justify-between bg-[#16d9e3] p-5 text-black"><b className="text-xs">РАУНД 01</b><strong className="text-5xl">42</strong></div><button className="bg-[#3a3a46] p-5 text-left font-black"><span className="text-4xl">↖</span><small className="block mt-8">ПРОПУСТИТЬ</small></button><section className="col-span-2 flex -skew-y-3 flex-col items-center justify-center border-2 border-[#ff375f] bg-[#17171d] p-7 text-center shadow-[0_0_40px_#ff375f55]"><small className="uppercase tracking-[.25em] text-[#ff375f]">центральная плитка</small><h2 className="mt-6 text-6xl font-black uppercase leading-[.82]">Воздушный<br/>шар</h2></section><div className="bg-[#ffe54b] p-5 text-black"><small className="font-black">АННА</small><b className="mt-20 block text-3xl">4 / 1</b></div><button className="flex flex-col items-end justify-between bg-[#ff375f] p-5 text-right font-black"><span className="text-5xl">↘</span><span>УГАДАЛИ<br/>+1</span></button></div></div>;
}

function DiscardedFloorTv() {
  return <div className="relative h-[540px] w-[960px] overflow-hidden rounded-[30px] border-[8px] border-black bg-[#08080b] font-sans text-white shadow-2xl"><div className="grid h-full grid-cols-[190px_1fr_190px] grid-rows-2 gap-3 p-3"><div className="bg-[#16d9e3] p-6 text-black"><small>ВРЕМЯ</small><b className="block text-7xl">42</b></div><section className="row-span-2 flex items-center justify-center border-2 border-[#ff375f] bg-[#17171d] shadow-[inset_0_0_70px_#ff375f22]"><div className="text-center"><PlayerAvatar nickname="Анна" sizePx={110} ring="#ff375f"/><h2 className="mt-5 text-6xl font-black uppercase">Анна</h2><small className="tracking-[.25em] text-white/45">НА СВЕТОВОМ ПОЛУ</small></div></section><div className="bg-[#ffe54b] p-5 text-black"><small>РАУНД</small><b className="block text-6xl">01</b></div><div className="bg-[#ff375f] p-5"><small>УГАДАНО</small><b className="block text-6xl">04</b></div><div className="grid grid-cols-2 bg-[#30303a] p-3">{PLAYERS.map(p=><div key={p.name} className="text-center"><small>{p.name}</small><b className="block text-2xl">{p.score}</b></div>)}</div></div></div>;
}

function DiscardedTotemPhone() {
  return <div className="relative h-[844px] w-[390px] overflow-hidden rounded-[42px] border-[8px] border-[#17120f] bg-[#c9ad7f] font-[Georgia] text-[#241810] shadow-2xl"><div className="absolute inset-0 opacity-20 [background-image:radial-gradient(#241810_1px,transparent_1px)] [background-size:9px_9px]"/><header className="relative flex justify-between p-6 text-xs font-bold uppercase tracking-[.16em]"><span>Жестовый тотем</span><span>01/03</span></header><div className="relative mx-auto mt-3 w-[240px]"><div className="mx-auto flex h-28 w-36 items-center justify-center rounded-t-[70px] border-4 border-[#241810] bg-[#e9533f] text-center text-white"><b className="text-4xl">42</b></div><section className="relative -mt-1 flex h-[330px] flex-col items-center justify-center border-4 border-[#241810] bg-[#eee2c5] p-6 text-center shadow-[10px_10px_0_#241810]"><small className="uppercase tracking-[.22em]">ядро слова</small><h2 className="mt-7 text-5xl font-bold leading-[.88]">Воздушный<br/>шар</h2><div className="mt-8 h-1 w-20 bg-[#e9533f]"/></section><div className="mx-auto -mt-1 w-44 border-4 border-[#241810] bg-[#574536] p-4 text-center text-sm font-bold text-white">АННА · 4 ОЧКА</div></div><button className="absolute left-0 top-[380px] h-36 w-20 rounded-r-[30px] border-4 border-l-0 border-[#241810] bg-[#806f5a] font-bold text-white [writing-mode:vertical-rl] rotate-180">ПРОПУСТИТЬ</button><button className="absolute right-0 top-[350px] h-44 w-24 rounded-l-[34px] border-4 border-r-0 border-[#241810] bg-[#e9533f] font-bold text-white [writing-mode:vertical-rl] rotate-180">УГАДАЛИ +1</button></div>;
}

function DiscardedTotemTv() {
  return <div className="relative h-[540px] w-[960px] overflow-hidden rounded-[30px] border-[8px] border-[#17120f] bg-[#c9ad7f] font-[Georgia] text-[#241810] shadow-2xl"><div className="absolute inset-0 opacity-20 [background-image:radial-gradient(#241810_1px,transparent_1px)] [background-size:10px_10px]"/><header className="relative flex justify-between p-7 text-sm font-bold uppercase tracking-[.18em]"><span>Жестовый тотем</span><span>Раунд 1 из 3</span></header><main className="relative flex items-center justify-center gap-0"><div className="flex h-56 w-48 flex-col items-center justify-center rounded-l-[90px] border-4 border-[#241810] bg-[#e9533f] text-white"><b className="text-7xl">42</b><small>секунд</small></div><div className="flex h-80 w-80 flex-col items-center justify-center border-y-4 border-[#241810] bg-[#eee2c5] text-center"><PlayerAvatar nickname="Анна" sizePx={88} ring="#e9533f"/><h2 className="mt-4 text-5xl font-bold">Анна</h2><small>держит слово</small></div><div className="grid h-56 w-72 grid-cols-2 rounded-r-[50px] border-4 border-[#241810] bg-[#574536] p-5 text-white">{PLAYERS.map(p=><div key={p.name} className="text-center"><small>{p.name}</small><b className="block text-3xl text-[#f2c66d]">{p.score}</b></div>)}</div></main></div>;
}

function MotionMocapPhoneV2() {
  return <div className="croc-motion relative h-[844px] w-[390px] overflow-hidden rounded-[42px] border-[8px] border-[#090b18] bg-[#0d1024] font-sans text-white shadow-2xl">
    <div className="absolute inset-0 opacity-40 [background-image:linear-gradient(#6f7cff22_1px,transparent_1px),linear-gradient(90deg,#6f7cff22_1px,transparent_1px)] [background-size:32px_32px]"/>
    <header className="relative flex items-center justify-between p-6"><div><small className="font-mono uppercase tracking-[.24em] text-[#8e98ff]">Свайп-протокол</small><h3 className="text-xl font-black">КОЛОДА 07</h3></div><b className="rounded-full bg-white px-4 py-2 text-[#0d1024]">00:42</b></header>
    <div className="relative mx-auto mt-12 h-[520px] w-[320px]">
      <div className="absolute inset-4 rotate-6 rounded-[36px] bg-[#20264c]"/><div className="absolute inset-2 -rotate-3 rounded-[36px] bg-[#323b78]"/>
      <section className="motion-swipe-card absolute inset-0 flex flex-col justify-between rounded-[36px] bg-[linear-gradient(145deg,#6d5dfc,#425ff5_50%,#ff496d)] p-7 shadow-[0_28px_70px_#0008]">
        <div className="flex justify-between text-[10px] font-black uppercase tracking-[.16em]"><span>← мимо</span><span>+1 →</span></div>
        <div><small className="font-mono uppercase tracking-[.25em] text-white/60">Покажите слово</small><h2 className="mt-5 text-[58px] font-black uppercase leading-[.82] tracking-[-.08em]">Воздушный<br/>шар</h2></div>
        <div className="motion-swipe-arrow flex items-center gap-3"><span>←</span><i className="h-px flex-1 bg-white/50"/><b className="text-xs">СДВИНЬ КАРТОЧКУ</b><i className="h-px flex-1 bg-white/50"/><span>→</span></div>
      </section>
    </div>
    <footer className="relative mt-9 flex justify-center gap-8 text-xs font-bold text-white/55"><span>АННА · ХОД</span><span>4 УГАДАНО</span></footer>
  </div>;
}

function MotionMocapTvV2() {
  return <div className="croc-motion relative h-[540px] w-[960px] overflow-hidden rounded-[30px] border-[8px] border-[#090b18] bg-[#0d1024] font-sans text-white shadow-2xl">
    <div className="absolute inset-0 opacity-35 [background-image:linear-gradient(#6f7cff22_1px,transparent_1px),linear-gradient(90deg,#6f7cff22_1px,transparent_1px)] [background-size:40px_40px]"/>
    <div className="motion-thrown-card absolute -left-16 top-40 h-56 w-40 -rotate-12 rounded-[24px] bg-[#ff496d]/25"/><div className="motion-thrown-card absolute right-20 top-16 h-48 w-36 rotate-12 rounded-[24px] bg-[#6d5dfc]/25 [animation-delay:-1.4s]"/>
    <main className="relative grid h-full grid-cols-[1fr_280px] p-8"><section className="flex flex-col justify-between"><span className="font-mono text-xs uppercase tracking-[.28em] text-[#8e98ff]">Свайп-протокол · общий экран</span><div className="flex items-center gap-8"><div className="motion-avatar-pulse rounded-full p-2"><PlayerAvatar nickname="Анна" sizePx={126} ring="#ff496d"/></div><div><small className="font-bold uppercase tracking-[.18em] text-white/45">Сейчас показывает</small><h2 className="text-8xl font-black uppercase tracking-[-.08em]">Анна</h2></div></div><div className="flex gap-3">{PLAYERS.map(p=><div key={p.name} className="flex-1 rounded-[18px] bg-white/[.07] p-4"><small>{p.name}</small><b className="block text-3xl">{p.score}</b></div>)}</div></section><aside className="flex flex-col items-center justify-center border-l border-white/10"><div className="motion-timer-ring flex h-48 w-48 items-center justify-center rounded-full border-[12px] border-[#6d5dfc] border-r-[#ff496d]"><b className="text-7xl">42</b></div><small className="mt-5 uppercase tracking-[.22em] text-white/45">секунд в колоде</small></aside></main>
  </div>;
}

const SWIPE_RACE = [
  { name: 'Анна', score: 12, color: '#ff584d' },
  { name: 'Макс', score: 9, color: '#ff8a52' },
  { name: 'Лена', score: 8, color: '#ffd166' },
  { name: 'Игорь', score: 7, color: '#f2eee5' },
  { name: 'Маша', score: 6, color: '#38d9a9' },
  { name: 'Дима', score: 5, color: '#4dabf7' },
  { name: 'Оля', score: 4, color: '#748ffc' },
  { name: 'Саша', score: 3, color: '#b197fc' },
  { name: 'Вика', score: 2, color: '#f783ac' },
  { name: 'Рома', score: 1, color: '#ced4da' },
];

function FittedWord({ text, maxSize = 64, minSize = 20, className = '' }: { text: string; maxSize?: number; minSize?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const fit = () => {
      let low = minSize;
      let high = maxSize;
      let best = minSize;
      while (low <= high) {
        const size = Math.floor((low + high) / 2);
        element.style.fontSize = `${size}px`;
        if (element.scrollWidth <= element.clientWidth + 1 && element.scrollHeight <= element.clientHeight + 1) {
          best = size;
          low = size + 1;
        } else {
          high = size - 1;
        }
      }
      element.style.fontSize = `${best}px`;
    };
    fit();
    document.fonts.ready.then(fit);
    const observer = new ResizeObserver(fit);
    observer.observe(element);
    return () => observer.disconnect();
  }, [maxSize, minSize, text]);
  return <div ref={ref} className={`flex h-full w-full flex-wrap content-center items-center justify-center gap-x-[.2em] overflow-hidden text-center font-black uppercase leading-[.88] tracking-[-.065em] ${className}`} style={{ fontSize: maxSize, wordBreak: 'keep-all', overflowWrap: 'normal', hyphens: 'none' }}>{text.split(/\s+/).map((word, index)=><span key={`${word}-${index}`} className="whitespace-nowrap">{word}</span>)}</div>;
}

function PlayerRace({ compact = false, finished = false }: { compact?: boolean; finished?: boolean }) {
  const rows = finished ? SWIPE_RACE.map((player, index) => ({ ...player, score: index === 0 ? 20 : player.score })) : SWIPE_RACE;
  return <div className={compact ? 'space-y-2' : 'grid grid-cols-2 gap-x-4 gap-y-3'}>{rows.map((player, index) => <div key={player.name} className={`grid items-center ${compact ? 'grid-cols-[56px_1fr_48px] gap-3' : 'grid-cols-[38px_1fr_34px] gap-2'}`}><span className={`${compact ? 'text-[11px]' : 'text-[10px]'} truncate font-bold`}>{player.name}</span><div className={`${compact ? 'h-2' : 'h-2'} overflow-hidden rounded-full bg-white/10`}><i className="motion-score-fill block h-full origin-left rounded-full" style={{ width: `${Math.min(100, player.score * 5)}%`, background: player.color, animationDelay: `${index * 70}ms` }} /></div><b className={`${compact ? 'text-xs' : 'text-xs'} text-right`}>{player.score}<small className="text-white/35">/20</small></b></div>)}</div>;
}

function SwipeCardFace({ word, compact, className }: { word: string; compact: boolean; className: string }) {
  return <section className={`${className} absolute inset-0 flex flex-col justify-between rounded-[34px] bg-[linear-gradient(145deg,#ff6a4d_0%,#ef3340_48%,#a90f2b_100%)] p-6 text-white shadow-[0_26px_65px_#0008]`}>
      <div className="flex justify-between text-[10px] font-black uppercase tracking-[.16em]"><span>← пропустить</span><span>угадали +1 →</span></div>
      <div className={`${compact ? 'h-[145px]' : 'h-[250px]'} px-1`}><FittedWord text={word} maxSize={compact ? 42 : 58} minSize={18}/></div>
      <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-[.14em]"><span>←</span><i className="h-px flex-1 bg-white/45"/><span>Свайпни карточку</span><i className="h-px flex-1 bg-white/45"/><span>→</span></div>
    </section>;
}

function SwipeDeck({ compact = false, replayLabel = true }: { compact?: boolean; replayLabel?: boolean }) {
  const [replay, setReplay] = useState(0);
  return <div className="relative h-full w-full">
    <div key={replay} className="absolute inset-0">
      <SwipeCardFace word="Горячий шоколад" compact={compact} className="motion-swipe-card-third" />
      <SwipeCardFace word="Пожарная машина" compact={compact} className="motion-swipe-card-second" />
      <SwipeCardFace word="Воздушный шар" compact={compact} className="motion-swipe-card-first" />
    </div>
    <span key={`success-${replay}`} className="motion-swipe-success absolute bottom-20 right-5 z-20 rounded-full bg-[#fff4da] px-5 py-3 text-sm font-black text-[#971124] shadow-xl">+1 УГАДАНО</span>
    <span key={`skip-${replay}`} className="motion-swipe-skip absolute bottom-20 left-5 z-20 rounded-full bg-[#24212a] px-5 py-3 text-sm font-black text-white shadow-xl">ПРОПУСК</span>
    {replayLabel && <button type="button" onClick={()=>setReplay(value=>value+1)} className="absolute -bottom-14 left-1/2 z-30 min-h-10 -translate-x-1/2 whitespace-nowrap rounded-full border border-white/20 bg-[#18151d] px-5 text-xs font-bold text-white">↻ Повторить полный свайп</button>}
  </div>;
}

function SwipeTimer({ seconds = 42 }: { seconds?: number }) {
  return <div className="rounded-[18px] bg-[#211b24] p-3 text-white"><div className="flex items-center justify-between"><small className="font-mono text-[9px] uppercase tracking-[.2em] text-white/45">Время хода</small><b className="text-2xl">00:{seconds}</b></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10"><i className="block h-full w-[70%] rounded-full bg-[#ef3340]"/></div></div>;
}

function MocapPhone() {
  return <div className="croc-motion relative h-[844px] w-[390px] overflow-hidden rounded-[42px] border-[8px] border-[#0d0a0d] bg-[#100d12] font-sans text-white shadow-2xl"><div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_0%,#ef334033,transparent_38%)]"/><header className="relative flex items-center justify-between px-5 pt-5"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#ef3340]"><CrocIcon name="croc" className="h-7 w-7 text-white"/></span><div><small className="font-mono text-[9px] uppercase tracking-[.2em] text-[#ff7966]">Свайп-протокол</small><b className="block">Ход Анны</b></div></div><b className="font-mono text-[10px] uppercase tracking-[.16em] text-white/45">Раунд 1</b></header><div className="relative mx-5 mt-5"><SwipeTimer /></div><div className="relative mx-auto mt-8 h-[540px] w-[320px]"><SwipeDeck /></div></div>;
}

function MocapTv() {
  return <div className="croc-motion relative h-[540px] w-[960px] overflow-hidden rounded-[30px] border-[8px] border-[#0d0a0d] bg-[#100d12] font-sans text-white shadow-2xl"><div className="absolute inset-0 bg-[radial-gradient(circle_at_22%_45%,#ef33402d,transparent_34%),radial-gradient(circle_at_90%_0%,#ff6a4d20,transparent_35%)]"/><header className="relative flex h-[84px] items-center justify-between border-b border-white/10 px-8"><div className="flex items-center gap-4"><span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#ef3340]"><CrocIcon name="croc" className="h-8 w-8 text-white"/></span><div><small className="font-mono text-[9px] uppercase tracking-[.22em] text-[#ff7966]">Свайп-протокол</small><b className="block text-xl">Гонка до 20 слов</b></div></div><div className="w-[250px]"><SwipeTimer /></div></header><main className="relative grid h-[448px] grid-cols-[1fr_380px] gap-8 p-8"><section className="flex items-center gap-7"><div className="motion-avatar-pulse rounded-full bg-[#ef3340]/10 p-3"><PlayerAvatar nickname="Анна" sizePx={128} ring="#ef3340"/></div><div><small className="font-bold uppercase tracking-[.2em] text-white/40">Сейчас показывает</small><h2 className="text-8xl font-black uppercase tracking-[-.08em]">Анна</h2><p className="mt-3 text-lg text-[#ff8b78]">Слово остаётся только на её телефоне</p></div></section><aside className="rounded-[28px] border border-white/10 bg-white/[.05] p-6"><div className="mb-6 flex items-center justify-between"><b className="text-lg">До финиша</b><span className="rounded-full bg-[#ef3340] px-3 py-1 text-xs font-bold">ЦЕЛЬ 20</span></div><PlayerRace /></aside></main></div>;
}

function SwipePhoneScreen({ state }: { state: PreviewState }) {
  const isHost = state === 'waiting-host';
  return <div className="croc-motion relative h-[844px] w-[390px] overflow-hidden rounded-[42px] border-[8px] border-[#0d0a0d] bg-[#100d12] font-sans text-white shadow-2xl"><div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_0%,#ef334033,transparent_40%)]"/><header className="relative flex items-center justify-between p-5"><div className="flex items-center gap-2"><CrocIcon name="croc" className="h-8 w-8 text-[#ef3340]"/><b>КРОКОДИЛ</b></div><span className="font-mono text-[10px] text-white/40">ЦЕЛЬ · 20 СЛОВ</span></header><main key={state} className="motion-screen-enter relative flex h-[755px] flex-col px-5 pb-5">
    {(state === 'waiting-host' || state === 'waiting-player') && <><div className="mt-5 flex flex-1 flex-col justify-center"><span className="mx-auto flex h-28 w-28 items-center justify-center rounded-full bg-[#ef3340]/15"><CrocIcon name="croc" className="h-20 w-20 text-[#ef3340]"/></span><h2 className="mt-7 text-center text-4xl font-black">Гонка до 20 слов</h2><p className="mt-3 text-center text-white/50">10 игроков готовы к первой карточке</p></div>{isHost?<button className="min-h-[72px] rounded-[24px] bg-[#ef3340] text-lg font-black">НАЧАТЬ ИГРУ</button>:<div className="motion-wait-pulse rounded-[24px] border border-white/10 p-5 text-center font-bold text-white/55">Ждём запуска хоста</div>}</>}
    {state === 'ready-explainer' && <><div className="mt-8 flex flex-1 flex-col items-center justify-center"><div className="motion-card-ready flex h-[390px] w-[285px] flex-col items-center justify-center rounded-[38px] bg-[linear-gradient(145deg,#ff6a4d,#ef3340,#a90f2b)] shadow-[0_30px_70px_#0008]"><CrocIcon name="croc" className="h-24 w-24 text-white"/><b className="mt-8 text-2xl">Колода слов</b><small className="mt-2 text-white/60">Слово откроется после старта</small></div></div><button className="min-h-[72px] rounded-[24px] bg-[#fff4da] text-lg font-black text-[#8f1224]">НАЧАТЬ</button><p className="mt-3 text-center text-sm text-white/55">Нажми, когда готов показывать</p></>}
    {state === 'ready-player' && <div className="flex flex-1 flex-col items-center justify-center text-center"><div className="motion-avatar-pulse rounded-full bg-[#ef3340]/15 p-4"><PlayerAvatar nickname="Анна" sizePx={120} ring="#ef3340"/></div><h2 className="mt-8 text-4xl font-black">Анна готовится</h2><p className="mt-3 text-white/50">Первая карточка уже у неё</p></div>}
    {state === 'explaining-explainer' && <><div className="mb-5"><SwipeTimer /></div><div className="mx-auto h-[520px] w-[310px]"><SwipeDeck compact /></div></>}
    {state === 'explaining-player' && <div className="flex flex-1 flex-col items-center justify-center text-center"><div className="motion-sound-ring flex h-48 w-48 items-center justify-center rounded-full border border-[#ef3340]/40 bg-[#ef3340]/10"><CrocIcon name="talk" className="h-20 w-20 text-[#ef3340]"/></div><h2 className="mt-9 text-4xl font-black">Угадывайте</h2><p className="mt-3 text-white/50">Анна показывает слово</p><div className="mt-10 w-full"><SwipeTimer/></div></div>}
    {state === 'finished' && <div className="flex flex-1 flex-col justify-center"><span className="font-mono text-xs font-bold uppercase tracking-[.25em] text-[#ff8b78]">Финиш · 20 слов</span><h2 className="mt-3 text-5xl font-black">Анна победила</h2><div className="motion-winner-card mt-8 rounded-[34px] bg-[#ef3340] p-7"><PlayerAvatar nickname="Анна" sizePx={88} ring="#fff4da"/><b className="mt-5 block text-6xl">20/20</b><span>Цель достигнута</span></div></div>}
  </main></div>;
}

function SwipeTvScreen({ state }: { state: PreviewState }) {
  const waiting = state === 'waiting-host' || state === 'waiting-player';
  const ready = state === 'ready-explainer' || state === 'ready-player';
  const explaining = state === 'explaining-explainer' || state === 'explaining-player';
  return <div className="croc-motion relative h-[540px] w-[960px] overflow-hidden rounded-[30px] border-[8px] border-[#0d0a0d] bg-[#100d12] font-sans text-white shadow-2xl"><div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_45%,#ef33402d,transparent_34%)]"/><header className="relative flex h-[80px] items-center justify-between border-b border-white/10 px-8"><div className="flex items-center gap-3"><CrocIcon name="croc" className="h-9 w-9 text-[#ef3340]"/><b className="text-xl">КРОКОДИЛ</b></div><span className="font-mono text-xs text-[#ff8b78]">ПЕРВЫЙ ДО 20 ПОБЕЖДАЕТ</span></header><main key={state} className="motion-screen-enter relative h-[452px] p-8">
    {waiting && <div className="grid h-full grid-cols-[1fr_390px] items-center gap-12"><div><small className="font-mono uppercase tracking-[.25em] text-[#ff8b78]">Комната готова</small><h2 className="mt-4 text-7xl font-black leading-none">Соберите<br/>20 слов</h2><p className="mt-5 text-xl text-white/45">Карточка вправо даёт +1, влево пропускает слово</p></div><aside className="rounded-[30px] bg-white/[.05] p-7"><PlayerRace/><div className="motion-wait-pulse mt-7 rounded-full bg-[#ef3340] px-5 py-3 text-center font-bold">ЖДЁМ СТАРТА</div></aside></div>}
    {ready && <div className="grid h-full grid-cols-[1fr_360px] items-center gap-10"><section className="flex items-center gap-8"><div className="motion-card-ready flex h-72 w-48 items-center justify-center rounded-[28px] bg-[linear-gradient(145deg,#ff6a4d,#ef3340,#a90f2b)]"><CrocIcon name="croc" className="h-24 w-24 text-white"/></div><div><small className="font-mono text-[#ff8b78]">ПЕРВАЯ КАРТОЧКА</small><h2 className="mt-3 text-7xl font-black">Анна</h2><p className="mt-3 text-xl text-white/45">готовится показать слово</p></div></section><aside className="rounded-[28px] bg-white/[.05] p-6"><PlayerRace/></aside></div>}
    {explaining && <div className="grid h-full grid-cols-[1fr_370px] gap-10"><section className="flex items-center gap-8"><div className="motion-avatar-pulse rounded-full bg-[#ef3340]/10 p-3"><PlayerAvatar nickname="Анна" sizePx={130} ring="#ef3340"/></div><div><small className="font-mono uppercase tracking-[.2em] text-[#ff8b78]">Сейчас показывает</small><h2 className="text-8xl font-black">Анна</h2><div className="mt-7 w-[280px]"><SwipeTimer/></div></div></section><aside className="rounded-[28px] bg-white/[.05] p-6"><div className="mb-6 flex justify-between"><b>До финиша</b><span className="rounded-full bg-[#ef3340] px-3 py-1 text-xs font-bold">20 СЛОВ</span></div><PlayerRace/></aside></div>}
    {state === 'finished' && <div className="grid h-full grid-cols-[1fr_390px] items-center gap-12"><section><small className="font-mono uppercase tracking-[.25em] text-[#ff8b78]">Игра окончена</small><h2 className="mt-4 text-8xl font-black">Анна<br/>20/20</h2><p className="mt-4 text-xl text-white/50">Первой достигла цели</p></section><aside className="motion-winner-card rounded-[30px] bg-[#ef3340] p-7"><b className="mb-6 block text-xl">Финальный прогресс</b><PlayerRace finished/></aside></div>}
  </main></div>;
}

function SwipeProtocolFlow() {
  const [state, setState] = useState<PreviewState>('waiting-host');
  const selectedStep = STEPS.find(step=>step.id===state) ?? STEPS[0];
  return <section className="mt-12 rounded-[32px] border border-[#ef3340]/25 bg-[#ef3340]/[.055] p-5 sm:p-7"><header className="mb-6 flex flex-wrap items-end justify-between gap-4"><div><span className="font-mono text-xs font-bold uppercase tracking-[.22em] text-[#ff7966]">Полный flow выбранного дизайна</span><h4 className="mt-2 text-3xl font-black">Все экраны «Свайп-протокола»</h4></div><p className="max-w-xl text-sm text-white/50">Правило 20 слов показано только визуально. Игровая логика не менялась.</p></header><nav className="mb-8 grid gap-2 sm:grid-cols-2 lg:grid-cols-7">{STEPS.map(step=><button key={step.id} type="button" onClick={()=>setState(step.id)} className={`min-h-16 rounded-[16px] border p-3 text-left text-xs font-bold transition ${state===step.id?'border-[#ef3340] bg-[#ef3340] text-white':'border-white/10 bg-black/20 text-white/55 hover:border-white/25'}`}><small className="block font-mono opacity-60">{step.number}</small>{step.title}</button>)}</nav><div className="mb-5 flex items-center justify-between"><b>{selectedStep.title}</b><span className="text-xs text-white/40">Телефон + TV</span></div><div className="grid gap-8 xl:grid-cols-[390px_minmax(0,1fr)]"><section><DeviceLabel size="390 × 844">Телефон</DeviceLabel><ScaledCanvas width={390} height={844}><SwipePhoneScreen state={state}/></ScaledCanvas></section><section className="min-w-0"><DeviceLabel size="1920 × 1080 · preview 50%">Общий экран · TV</DeviceLabel><ScaledCanvas width={960} height={540}><SwipeTvScreen state={state}/></ScaledCanvas></section></div></section>;
}

function DirectorPhone() {
  return <div className="croc-motion relative h-[844px] w-[390px] overflow-hidden rounded-[42px] border-[8px] border-[#17130f] bg-[#e8dfca] font-sans text-[#17130f] shadow-2xl">
    <div className="motion-filmstrip flex h-20 w-[780px] gap-3 bg-[#17130f] p-3">{Array.from({length:12}).map((_,i)=><i key={i} className="h-full w-12 shrink-0 bg-[#e8dfca] opacity-80"/>)}</div>
    <header className="flex items-end justify-between px-6 pt-6"><div><small className="font-mono font-bold text-[#d83b28]">SCENE 07 / TAKE 04</small><h3 className="text-2xl font-black uppercase">Режиссёрская</h3></div><b className="text-4xl">42</b></header>
    <section className="relative mx-5 mt-8 h-[430px] overflow-hidden bg-[#17130f] p-6 text-white shadow-[10px_10px_0_#d83b28]"><div className="motion-focus absolute inset-5 border border-white/35"><i className="absolute left-0 top-0 h-8 w-8 border-l-4 border-t-4 border-[#d83b28]"/><i className="absolute bottom-0 right-0 h-8 w-8 border-b-4 border-r-4 border-[#d83b28]"/></div><div className="relative flex h-full flex-col items-center justify-center text-center"><small className="font-mono uppercase tracking-[.26em] text-white/45">слово в кадре</small><h2 className="mt-8 text-6xl font-black uppercase leading-[.82]">Воздушный<br/>шар</h2><span className="mt-10 rounded-full border border-white/30 px-4 py-2 text-xs">АННА · CAMERA A</span></div></section>
    <div className="mt-8 grid grid-cols-[.8fr_1.2fr] gap-3 px-5"><button className="motion-action border-2 border-[#17130f] p-5 font-black">CUT · МИМО</button><button className="motion-action bg-[#d83b28] p-5 font-black text-white">СНЯТО · +1</button></div>
  </div>;
}

function DirectorTv() {
  return <div className="croc-motion relative h-[540px] w-[960px] overflow-hidden rounded-[30px] border-[8px] border-[#17130f] bg-[#17130f] font-sans text-white shadow-2xl">
    <div className="grid h-full grid-rows-[54px_1fr_92px]"><div className="motion-filmstrip flex w-[1600px] gap-3 bg-black p-2">{Array.from({length:18}).map((_,i)=><i key={i} className="h-full w-16 shrink-0 bg-[#e8dfca]/75"/>)}</div><main className="grid grid-cols-[1fr_250px] gap-5 p-5"><section className="relative flex items-center justify-center border border-white/20 bg-[#24211e]"><div className="motion-focus absolute inset-7 border border-white/25"/><div className="text-center"><small className="font-mono text-[#ff5a43]">REC ● CAMERA A</small><div className="mx-auto my-4 w-max"><PlayerAvatar nickname="Анна" sizePx={100} ring="#ff5a43"/></div><h2 className="text-6xl font-black uppercase">Анна</h2></div></section><aside className="bg-[#e8dfca] p-5 text-[#17130f]"><div className="flex justify-between"><b>MONITOR</b><b className="text-[#d83b28]">00:42</b></div>{PLAYERS.map(p=><div key={p.name} className="mt-4 border-t border-black/25 pt-3"><small>{p.name}</small><b className="float-right text-2xl">{p.score}</b></div>)}</aside></main><div className="motion-timeline relative mx-5 mb-5 overflow-hidden bg-[#e8dfca] text-[#17130f]"><div className="absolute inset-y-0 left-[62%] w-1 bg-[#d83b28]"/><div className="grid h-full grid-cols-6">{Array.from({length:6}).map((_,i)=><span key={i} className="border-r border-black/20 p-3 font-mono text-xs">0{i+1}:00</span>)}</div></div></div>
  </div>;
}

function RoutePhone() {
  return <div className="croc-motion relative h-[844px] w-[390px] overflow-hidden rounded-[42px] border-[8px] border-[#10213c] bg-[#edf3ef] font-sans text-[#10213c] shadow-2xl">
    <header className="flex justify-between p-6"><div><small className="font-mono uppercase tracking-[.2em] text-[#f04e3e]">Линия жестов</small><h3 className="text-2xl font-black">МАРШРУТ</h3></div><b className="rounded-full bg-[#10213c] px-4 py-3 text-white">42</b></header>
    <div className="relative mx-auto mt-4 h-[570px] w-[320px]"><svg viewBox="0 0 320 570" className="absolute inset-0 h-full w-full" aria-hidden="true"><path d="M160 20V140 C160 210 65 210 65 300 V390 C65 455 160 455 160 540" fill="none" stroke="#9facb4" strokeWidth="14" strokeLinecap="round"/><path d="M160 140 C160 210 255 210 255 300 V390 C255 455 160 455 160 540" fill="none" stroke="#f04e3e" strokeWidth="14" strokeLinecap="round"/></svg><i className="motion-route-token absolute left-[143px] top-1 h-9 w-9 rounded-full border-4 border-white bg-[#f04e3e] shadow-[0_4px_18px_#f04e3e88]"/>
      <section className="absolute left-1/2 top-10 w-[255px] -translate-x-1/2 rounded-[28px] bg-white p-6 text-center shadow-[0_12px_35px_#10213c22]"><small className="font-mono">СТАНЦИЯ 07</small><h2 className="mt-4 text-4xl font-black leading-none">Воздушный<br/>шар</h2></section>
      <button className="motion-action absolute left-0 top-[300px] w-32 rounded-[24px] bg-[#9facb4] p-5 font-black text-white">← ОБЪЕЗД<br/><small>пропустить</small></button><button className="motion-action absolute right-0 top-[300px] w-32 rounded-[24px] bg-[#f04e3e] p-5 font-black text-white shadow-[0_12px_30px_#f04e3e55]">ЭКСПРЕСС →<br/><small>+1 очко</small></button><span className="absolute bottom-0 left-1/2 -translate-x-1/2 rounded-full bg-[#10213c] px-5 py-3 text-xs font-bold text-white">АННА · СЛЕДУЮЩАЯ</span>
    </div>
  </div>;
}

function RouteTv() {
  return <div className="croc-motion relative h-[540px] w-[960px] overflow-hidden rounded-[30px] border-[8px] border-[#10213c] bg-[#edf3ef] font-sans text-[#10213c] shadow-2xl"><header className="flex justify-between p-7"><b className="text-2xl font-black">ЛИНИЯ ЖЕСТОВ</b><span className="font-mono">РАУНД 01 · 00:42</span></header><svg viewBox="0 0 900 360" className="absolute bottom-28 left-8 h-[360px] w-[900px]" aria-hidden="true"><path d="M30 230 C190 230 190 90 340 90 S520 300 680 230 S800 90 875 90" fill="none" stroke="#10213c" strokeWidth="18" strokeLinecap="round"/><path d="M340 90 C440 90 500 90 590 90" fill="none" stroke="#f04e3e" strokeWidth="18" strokeLinecap="round"/></svg><i className="motion-map-token absolute left-[53px] top-[277px] h-12 w-12 rounded-full border-4 border-white bg-[#f04e3e] shadow-[0_6px_24px_#f04e3e88]"/>{PLAYERS.map((p,i)=><div key={p.name} className="absolute z-10 rounded-[18px] bg-white px-4 py-3 shadow-[0_8px_24px_#10213c22]" style={{left:`${170+i*190}px`,top:i%2?330:145}}><small>{p.name}</small><b className="ml-3 text-2xl">{p.score}</b></div>)}<div className="absolute bottom-6 left-8 text-4xl font-black">АННА ВЫБИРАЕТ ВЕТКУ →</div></div>;
}

function FloorPhone() {
  return <div className="croc-motion relative h-[844px] w-[390px] overflow-hidden rounded-[42px] border-[8px] border-black bg-[#08090d] font-sans text-white shadow-2xl"><div className="motion-spotlight absolute -left-40 top-20 h-[650px] w-[650px] rounded-full bg-[radial-gradient(circle,#23efff33,transparent_62%)]"/><header className="relative flex justify-between p-6 font-mono text-xs"><span>СВЕТОВОЙ ПОЛ</span><span>ROUND 01 · 42</span></header><div className="relative mx-5 mt-5 grid h-[650px] grid-cols-3 grid-rows-4 gap-3 [transform:perspective(700px)_rotateX(10deg)]">{Array.from({length:12}).map((_,i)=><i key={i} className="motion-floor-tile rounded-[18px] bg-[#171922] shadow-[inset_0_0_0_1px_#ffffff18]" style={{animationDelay:`${i*-0.16}s`}}/>)}<section className="absolute inset-x-4 top-[150px] z-10 rounded-[34px] bg-[#ff3c6b] p-7 text-center shadow-[0_0_55px_#ff3c6b77]"><small className="font-mono uppercase tracking-[.22em]">активная плитка</small><h2 className="mt-5 text-5xl font-black uppercase leading-[.85]">Воздушный<br/>шар</h2></section><button className="motion-action absolute bottom-5 left-3 z-10 h-32 w-32 rounded-[30px] bg-[#242733] font-black">↙<br/>МИМО</button><button className="motion-action absolute bottom-5 right-3 z-10 h-32 w-32 rounded-[30px] bg-[#23efff] font-black text-black shadow-[0_0_35px_#23efff77]">+1<br/>↘</button></div></div>;
}

function FloorTv() {
  return <div className="croc-motion relative h-[540px] w-[960px] overflow-hidden rounded-[30px] border-[8px] border-black bg-[#08090d] font-sans text-white shadow-2xl"><div className="motion-spotlight absolute -left-80 -top-96 h-[1100px] w-[1100px] rounded-full bg-[radial-gradient(circle,#23efff26,transparent_62%)]"/><header className="relative flex justify-between p-7 font-mono"><span>СВЕТОВОЙ ПОЛ</span><span>РАУНД 01 · 00:42</span></header><div className="relative mx-auto grid h-[390px] w-[760px] grid-cols-5 grid-rows-3 gap-4 [transform:perspective(800px)_rotateX(14deg)]">{Array.from({length:15}).map((_,i)=><i key={i} className="motion-floor-tile rounded-[18px] bg-[#171922] shadow-[inset_0_0_0_1px_#ffffff18]" style={{animationDelay:`${i*-.13}s`}}/>)}<section className="absolute left-1/2 top-1/2 flex h-56 w-72 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-[36px] bg-[#ff3c6b] shadow-[0_0_70px_#ff3c6b77]"><div className="text-center"><PlayerAvatar nickname="Анна" sizePx={82} ring="#fff"/><h2 className="mt-3 text-5xl font-black">АННА</h2></div></section>{PLAYERS.map((p,i)=><span key={p.name} className="absolute rounded-full bg-[#23efff] px-4 py-2 text-sm font-bold text-black" style={{left:`${30+i*190}px`,bottom:15}}>{p.name} · {p.score}</span>)}</div></div>;
}

function TotemPhone() {
  return <div className="croc-motion relative h-[844px] w-[390px] overflow-hidden rounded-[42px] border-[8px] border-[#1b1110] bg-[#d9c7a1] font-[Georgia] text-[#251713] shadow-2xl"><div className="absolute inset-0 opacity-15 [background-image:radial-gradient(#251713_1px,transparent_1px)] [background-size:8px_8px]"/><header className="relative flex justify-between p-6 text-xs font-bold uppercase tracking-[.15em]"><span>Жестовый тотем</span><span>01 / 03</span></header><div className="relative mx-auto mt-2 flex w-[260px] flex-col items-center"><div className="motion-totem-piece z-30 flex h-24 w-36 items-center justify-center rounded-t-[70px] border-4 border-[#251713] bg-[#ed6048] text-4xl font-bold text-white">42</div><section className="motion-totem-core z-20 -mt-1 flex h-[330px] w-[250px] flex-col items-center justify-center border-4 border-[#251713] bg-[#fff1cf] text-center shadow-[10px_10px_0_#251713]"><small className="uppercase tracking-[.22em]">ядро слова</small><h2 className="mt-7 text-5xl font-bold leading-[.88]">Воздушный<br/>шар</h2><div className="motion-eye mt-8 h-4 w-20 rounded-full bg-[#251713]"/></section><div className="motion-totem-piece z-10 -mt-1 w-44 border-4 border-[#251713] bg-[#5e4639] p-4 text-center font-bold text-white [animation-delay:-1s]">АННА · 4</div></div><button className="motion-lever-left absolute left-0 top-[390px] h-40 w-24 rounded-r-[34px] border-4 border-l-0 border-[#251713] bg-[#78675b] font-bold text-white">←<br/>МИМО</button><button className="motion-lever-right absolute right-0 top-[360px] h-48 w-24 rounded-l-[34px] border-4 border-r-0 border-[#251713] bg-[#ed6048] font-bold text-white">+1<br/>→</button><p className="relative mt-10 text-center text-xs font-bold uppercase tracking-[.16em]">Потяните боковой рычаг</p></div>;
}

function TotemTv() {
  return <div className="croc-motion relative h-[540px] w-[960px] overflow-hidden rounded-[30px] border-[8px] border-[#1b1110] bg-[#d9c7a1] font-[Georgia] text-[#251713] shadow-2xl"><div className="absolute inset-0 opacity-15 [background-image:radial-gradient(#251713_1px,transparent_1px)] [background-size:9px_9px]"/><header className="relative flex justify-between p-7 text-sm font-bold uppercase tracking-[.18em]"><span>Жестовый тотем</span><span>Раунд 1 из 3</span></header><main className="relative flex h-[390px] items-center justify-center"><div className="motion-totem-piece flex h-60 w-44 items-center justify-center rounded-l-[90px] border-4 border-[#251713] bg-[#ed6048] text-7xl font-bold text-white">42</div><section className="motion-totem-core flex h-80 w-80 flex-col items-center justify-center border-y-4 border-[#251713] bg-[#fff1cf]"><PlayerAvatar nickname="Анна" sizePx={92} ring="#ed6048"/><h2 className="mt-4 text-5xl font-bold">Анна</h2><div className="motion-eye mt-4 h-3 w-20 rounded-full bg-[#251713]"/></section><div className="motion-totem-piece grid h-60 w-72 grid-cols-2 rounded-r-[60px] border-4 border-[#251713] bg-[#5e4639] p-5 text-white [animation-delay:-1s]">{PLAYERS.map(p=><div key={p.name} className="text-center"><small>{p.name}</small><b className="block text-3xl text-[#f5d16f]">{p.score}</b></div>)}</div></main></div>;
}

function ConceptDevices({ id }: { id: ConceptId }) {
  const devices = {
    arena: [<ArenaPhone key="p" />, <ArenaTv key="t" />], mocap: [<MocapPhone key="p" />, <MocapTv key="t" />],
    street: [<StreetPhone key="p" />, <StreetTv key="t" />], river: [<RiverPhone key="p" />, <RiverTv key="t" />],
    director: [<DirectorPhone key="p" />, <DirectorTv key="t" />], route: [<RoutePhone key="p" />, <RouteTv key="t" />],
    floor: [<FloorPhone key="p" />, <FloorTv key="t" />], totem: [<TotemPhone key="p" />, <TotemTv key="t" />],
  } satisfies Record<ConceptId, [ReactNode, ReactNode]>;
  const [phone, tv] = devices[id];
  void LegacyArenaPhone; void LegacyArenaTv; void LegacyMocapPhone; void LegacyMocapTv; void MotionMocapPhoneV2; void MotionMocapTvV2;
  void DiscardedSwipePhone; void DiscardedSwipeTv; void DiscardedDirectorPhone; void DiscardedDirectorTv;
  void DiscardedRoutePhone; void DiscardedRouteTv; void DiscardedFloorPhone; void DiscardedFloorTv; void DiscardedTotemPhone; void DiscardedTotemTv;
  return (
    <div className="grid gap-8 xl:grid-cols-[390px_minmax(0,1fr)] xl:items-start">
      <section><DeviceLabel size="390 × 844">Телефон объясняющего</DeviceLabel><ScaledCanvas width={390} height={844}>{phone}</ScaledCanvas></section>
      <section className="min-w-0"><DeviceLabel size="1920 × 1080 · preview 50%">Общий экран · TV</DeviceLabel><ScaledCanvas width={960} height={540}>{tv}</ScaledCanvas></section>
    </div>
  );
}

function ConceptMotionStyles() {
  return <style jsx global>{`
    .croc-motion button { transition: transform 180ms cubic-bezier(.2,.8,.2,1), filter 180ms cubic-bezier(.2,.8,.2,1); }
    .croc-motion button:hover { filter: brightness(1.08); }
    .croc-motion button:active { transform: scale(.97); }
    .motion-timer-ring { animation: croc-timer-spin 7s linear infinite; }
    .motion-roulette { animation: croc-roulette-breathe 2.8s cubic-bezier(.45,0,.2,1) infinite alternate; }
    .motion-roulette-tv { animation: croc-roulette-tv 3.2s cubic-bezier(.45,0,.2,1) infinite alternate; }
    .motion-poster-slam { animation: croc-poster 4.5s cubic-bezier(.16,1,.3,1) infinite; transform-origin: 45% 60%; }
    .motion-street-band { animation: croc-band 3.6s cubic-bezier(.45,0,.2,1) infinite alternate; }
    .motion-firefly { animation: croc-firefly 3.8s cubic-bezier(.45,0,.2,1) infinite; }
    .motion-ripple::after { content:""; position:absolute; inset:-2px; border:1px solid #82cfc166; border-radius:999px; animation:croc-ripple 2.8s cubic-bezier(.2,.7,.2,1) infinite; }
    .motion-swipe-card { animation: croc-swipe-card 3.8s cubic-bezier(.45,0,.2,1) infinite; transform-origin:50% 90%; }
    .motion-swipe-arrow { animation: croc-swipe-arrow 1.6s cubic-bezier(.45,0,.2,1) infinite alternate; }
    .motion-thrown-card { animation: croc-thrown 3.4s cubic-bezier(.45,0,.2,1) infinite alternate; }
    .motion-avatar-pulse { animation: croc-avatar 2.2s cubic-bezier(.45,0,.2,1) infinite alternate; }
    .motion-filmstrip { animation: croc-film 8s linear infinite; }
    .motion-focus { animation: croc-focus 2.4s cubic-bezier(.45,0,.2,1) infinite alternate; }
    .motion-timeline::after { content:""; position:absolute; inset:0; background:linear-gradient(90deg,transparent,#fff9,transparent); transform:translateX(-110%); animation:croc-glint 2.8s cubic-bezier(.45,0,.2,1) infinite; }
    .motion-route-token { animation: croc-route-phone 4s cubic-bezier(.65,0,.35,1) infinite; }
    .motion-map-token { animation: croc-route-tv 5s cubic-bezier(.65,0,.35,1) infinite; }
    .motion-spotlight { animation: croc-spotlight 5s cubic-bezier(.45,0,.2,1) infinite alternate; }
    .motion-floor-tile { animation: croc-floor 2.4s cubic-bezier(.45,0,.2,1) infinite; }
    .motion-totem-piece { animation: croc-totem-piece 2.8s cubic-bezier(.45,0,.2,1) infinite alternate; }
    .motion-totem-core { animation: croc-totem-core 2.8s cubic-bezier(.45,0,.2,1) infinite alternate; }
    .motion-eye { animation: croc-eye 3.2s cubic-bezier(.45,0,.2,1) infinite; transform-origin:center; }
    .motion-lever-left { animation: croc-lever-left 2.6s cubic-bezier(.45,0,.2,1) infinite alternate; transform-origin:left center; }
    .motion-lever-right { animation: croc-lever-right 2.6s cubic-bezier(.45,0,.2,1) infinite alternate; transform-origin:right center; }
    .motion-swipe-card-first { z-index:3; animation:croc-deck-first 8s cubic-bezier(.5,0,.2,1) infinite both; transform-origin:50% 85%; will-change:transform,opacity; }
    .motion-swipe-card-second { z-index:2; animation:croc-deck-second 8s cubic-bezier(.5,0,.2,1) infinite both; transform-origin:50% 85%; will-change:transform,opacity; }
    .motion-swipe-card-third { z-index:1; animation:croc-deck-third 8s cubic-bezier(.5,0,.2,1) infinite both; transform-origin:50% 85%; will-change:transform,opacity; }
    .motion-swipe-success { animation:croc-swipe-success 8s cubic-bezier(.16,1,.3,1) infinite both; }
    .motion-swipe-skip { animation:croc-swipe-skip 8s cubic-bezier(.16,1,.3,1) infinite both; }
    .motion-score-fill { animation:croc-score-in 700ms cubic-bezier(.16,1,.3,1) both; }
    .motion-screen-enter { animation:croc-screen-enter 420ms cubic-bezier(.16,1,.3,1) both; }
    .motion-card-ready { animation:croc-card-ready 2.8s cubic-bezier(.45,0,.2,1) infinite alternate; }
    .motion-wait-pulse { animation:croc-wait 1.8s cubic-bezier(.45,0,.2,1) infinite alternate; }
    .motion-sound-ring { animation:croc-sound 2.2s cubic-bezier(.45,0,.2,1) infinite; }
    .motion-winner-card { animation:croc-winner 650ms cubic-bezier(.16,1,.3,1) both; }
    @keyframes croc-timer-spin { to { transform:rotate(360deg); } }
    @keyframes croc-roulette-breathe { from { transform:translateX(-70px) scale(.985); } to { transform:translateX(-70px) scale(1.015); } }
    @keyframes croc-roulette-tv { from { transform:translate(-50%,-50%) scale(.98); opacity:.82; } to { transform:translate(-50%,-50%) scale(1.025); opacity:1; } }
    @keyframes croc-poster { 0%,88%,100% { transform:rotate(0) scale(1); } 92% { transform:rotate(-1.2deg) scale(1.018); } 96% { transform:rotate(.5deg) scale(.995); } }
    @keyframes croc-band { to { transform:translateX(28px) rotate(-5deg); } }
    @keyframes croc-firefly { 0%,100% { transform:translate(0,0) scale(.75); opacity:.35; } 45% { transform:translate(8px,-12px) scale(1.25); opacity:1; } 70% { transform:translate(-5px,-5px) scale(.9); opacity:.55; } }
    @keyframes croc-ripple { from { transform:scale(.82); opacity:.7; } to { transform:scale(1.55); opacity:0; } }
    @keyframes croc-swipe-card { 0%,18%,82%,100% { transform:translateX(0) rotate(0); } 35% { transform:translateX(-13px) rotate(-1.5deg); } 65% { transform:translateX(13px) rotate(1.5deg); } }
    @keyframes croc-swipe-arrow { from { transform:translateX(-5px); opacity:.55; } to { transform:translateX(5px); opacity:1; } }
    @keyframes croc-thrown { from { transform:translate3d(0,8px,0) rotate(-12deg); opacity:.2; } to { transform:translate3d(18px,-12px,0) rotate(-5deg); opacity:.5; } }
    @keyframes croc-avatar { to { transform:scale(1.035); filter:drop-shadow(0 0 18px #ff496d88); } }
    @keyframes croc-film { to { transform:translateX(-50%); } }
    @keyframes croc-focus { from { transform:scale(1.025); opacity:.45; } to { transform:scale(.97); opacity:1; } }
    @keyframes croc-glint { 55%,100% { transform:translateX(110%); } }
    @keyframes croc-route-phone { 0%,12% { transform:translate(0,0); } 48% { transform:translate(94px,190px); } 78%,100% { transform:translate(0,490px); } }
    @keyframes croc-route-tv { 0%,10% { transform:translate(0,0); } 45% { transform:translate(275px,-138px); } 72% { transform:translate(520px,-45px); } 100% { transform:translate(760px,-180px); } }
    @keyframes croc-spotlight { from { transform:translate3d(-8%,-4%,0); opacity:.55; } to { transform:translate3d(28%,10%,0); opacity:1; } }
    @keyframes croc-floor { 0%,100% { transform:translateY(0); background:#171922; } 42% { transform:translateY(-5px); background:#202b36; } 55% { transform:translateY(-3px); background:#23efff33; } }
    @keyframes croc-totem-piece { from { transform:translateY(-3px); } to { transform:translateY(4px); } }
    @keyframes croc-totem-core { from { transform:scale(.995); } to { transform:scale(1.012); box-shadow:12px 14px 0 #251713; } }
    @keyframes croc-eye { 0%,44%,52%,100% { transform:scaleY(1); } 48% { transform:scaleY(.08); } }
    @keyframes croc-lever-left { from { transform:rotate(0); } to { transform:rotate(-4deg); } }
    @keyframes croc-lever-right { from { transform:rotate(0); } to { transform:rotate(4deg); } }
    @keyframes croc-deck-first {
      0%,15% { transform:translate3d(0,0,0) rotate(0); opacity:1; }
      25%,100% { transform:translate3d(125%,8px,0) rotate(13deg); opacity:0; }
    }
    @keyframes croc-deck-second {
      0%,20% { transform:translateY(12px) scale(.96) rotate(-3deg); opacity:.9; }
      32%,55% { transform:translate3d(0,0,0) scale(1) rotate(0); opacity:1; }
      65%,100% { transform:translate3d(-125%,8px,0) scale(1) rotate(-13deg); opacity:0; }
    }
    @keyframes croc-deck-third {
      0%,58% { transform:translateY(20px) scale(.92) rotate(4deg); opacity:.78; }
      72%,100% { transform:translate3d(0,0,0) scale(1) rotate(0); opacity:1; }
    }
    @keyframes croc-swipe-success { 0%,17%,32%,100% { transform:translateX(16px) scale(.92); opacity:0; } 23%,28% { transform:translateX(0) scale(1); opacity:1; } }
    @keyframes croc-swipe-skip { 0%,57%,72%,100% { transform:translateX(-16px) scale(.92); opacity:0; } 63%,68% { transform:translateX(0) scale(1); opacity:1; } }
    @keyframes croc-score-in { from { transform:scaleX(0); opacity:.4; } to { transform:scaleX(1); opacity:1; } }
    @keyframes croc-screen-enter { from { transform:translateY(10px); opacity:0; filter:blur(4px); } to { transform:none; opacity:1; filter:none; } }
    @keyframes croc-card-ready { from { transform:translateY(2px) rotate(-1deg); } to { transform:translateY(-8px) rotate(1deg); } }
    @keyframes croc-wait { from { opacity:.55; } to { opacity:1; box-shadow:0 0 28px #ef334033; } }
    @keyframes croc-sound { 0%,100% { transform:scale(.96); box-shadow:0 0 0 0 #ef334055; } 55% { transform:scale(1.02); box-shadow:0 0 0 24px #ef334000; } }
    @keyframes croc-winner { from { transform:translateY(18px) scale(.96); opacity:0; filter:blur(5px); } to { transform:none; opacity:1; filter:none; } }
    .motion-paused .croc-motion *, .motion-paused .croc-motion *::before, .motion-paused .croc-motion *::after { animation-play-state:paused !important; }
    @media (prefers-reduced-motion: reduce) {
      .croc-motion *, .croc-motion *::before, .croc-motion *::after { animation-duration:.01ms !important; animation-iteration-count:1 !important; transition-duration:.01ms !important; }
    }
  `}</style>;
}

function ConceptsGallery() {
  const [motionPaused, setMotionPaused] = useState(false);
  return (
    <section id="concepts" className={`mt-24 border-t border-white/10 pt-12 ${motionPaused ? 'motion-paused' : ''}`}>
      <ConceptMotionStyles />
      <div className="mb-10 grid gap-5 lg:grid-cols-[1fr_420px] lg:items-end"><div><span className="font-mono text-xs font-bold uppercase tracking-[.22em] text-red-300">Третья итерация · дизайн в движении</span><h2 className="mt-3 text-4xl font-black tracking-[-.04em] sm:text-6xl">Куда может пойти «Крокодил»</h2><p className="mt-4 max-w-3xl text-lg leading-relaxed text-white/55">Пять направлений перерисованы, все восемь получили собственную motion-логику. Движение объясняет таймер, направление решения, активного игрока или прогресс хода.</p></div><div className="rounded-[24px] border border-white/10 bg-white/[.04] p-5 text-sm leading-relaxed text-white/55"><b className="mb-2 block text-white">Управление движением</b><p>Анимации спокойные, работают через transform и opacity и автоматически отключаются при reduced motion.</p><button type="button" aria-pressed={motionPaused} onClick={()=>setMotionPaused(value=>!value)} className="mt-4 min-h-11 rounded-full bg-white px-5 font-bold text-black transition active:scale-[.97]">{motionPaused ? '▶ Включить анимации' : 'Ⅱ Поставить на паузу'}</button></div></div>
      <nav className="sticky top-3 z-30 mb-12 grid gap-2 rounded-[26px] border border-white/10 bg-[#090a0d]/90 p-2 backdrop-blur-xl sm:grid-cols-2 lg:grid-cols-4">{CONCEPTS.map(c=><a key={c.id} href={`#concept-${c.id}`} className="rounded-[18px] border border-white/10 bg-white/[.04] p-3 transition hover:border-white/25 hover:bg-white/[.08]"><span className="font-mono text-[10px] font-black tracking-[.2em]" style={{color:c.accent}}>{c.number}</span><b className="ml-3 text-sm">{c.name}</b></a>)}</nav>
      <div className="space-y-24">{CONCEPTS.map(concept=><article key={concept.id} id={`concept-${concept.id}`} className="scroll-mt-28"><header className="mb-7 grid gap-5 border-b border-white/10 pb-6 lg:grid-cols-[1fr_1fr] lg:items-end"><div><span className="font-mono text-xs font-black uppercase tracking-[.25em]" style={{color:concept.accent}}>Направление {concept.number}</span><h3 className="mt-2 text-4xl font-black tracking-[-.04em] sm:text-5xl">{concept.name}</h3><p className="mt-2 text-sm font-bold uppercase tracking-[.16em] text-white/40">{concept.subtitle}</p></div><div><p className="leading-relaxed text-white/60">{concept.description}</p><div className="mt-4 flex flex-wrap gap-2">{concept.tags.map(tag=><span key={tag} className="rounded-full border border-white/10 bg-white/[.05] px-3 py-1.5 text-xs text-white/60">{tag}</span>)}</div></div></header><ConceptDevices id={concept.id} />{concept.id === 'mocap' && <SwipeProtocolFlow />}</article>)}</div>
      <aside className="mt-20 grid gap-3 rounded-[28px] border border-white/10 bg-white/[.035] p-6 md:grid-cols-2 lg:grid-cols-4">
        {[
          ['Nintendo · Everybody 1-2-Switch', 'Телефоны как личные контроллеры, TV как понятный общий ведущий.', 'https://www.nintendo.com/us/store/products/everybody-1-2-switch-110739/'],
          ['Jackbox · Talking Points', 'Один выступает, остальные участвуют со своих устройств в реальном времени.', 'https://www.jackboxgames.com/games/talking-points'],
          ['Material 3 · Expressive', 'Разные motion-характеры и ясная визуальная иерархия действий.', 'https://m3.material.io/'],
          ['Apple HIG · Motion', 'Короткая целевая анимация, понятная обратная связь и reduced motion.', 'https://developer.apple.com/design/human-interface-guidelines/motion'],
        ].map(([title, text, href]) => (
          <a key={title} href={href} target="_blank" rel="noreferrer" className="rounded-[20px] border border-white/10 bg-black/20 p-4 transition hover:border-red-300/35 hover:bg-white/[.055]">
            <b className="text-sm">{title}</b><span className="mt-2 block text-xs leading-relaxed text-white/45">{text}</span>
          </a>
        ))}
      </aside>
      <footer className="mt-6 rounded-[28px] border border-red-400/20 bg-red-500/[.07] p-7"><span className="font-mono text-xs font-bold uppercase tracking-[.2em] text-red-300">После выбора</span><p className="mt-3 max-w-4xl text-lg leading-relaxed text-white/65">Выбранное направление развернём во все реальные состояния телефона и TV. Только после отдельного утверждения полного flow его можно переносить в production.</p></footer>
    </section>
  );
}

export default function CrocodileDesignPreviewPage() {
  const [selected, setSelected] = useState<PreviewState>('waiting-host');
  const step = STEPS.find((item) => item.id === selected) ?? STEPS[0];

  return (
    <main id="current" className="min-h-screen bg-[#090a0d] px-5 py-10 text-white sm:px-8 lg:px-12">
      <div className="mx-auto max-w-[1540px]">
        <header className="mb-8 border-b border-white/10 pb-8">
          <div className="mb-4 flex items-center gap-3 font-mono text-xs font-bold uppercase tracking-[0.22em] text-red-300">
            <CrocIcon name="croc" className="h-8 w-8" />
            Визуальный инвентарь · текущий production
          </div>
          <div className="grid gap-5 lg:grid-cols-[1fr_440px] lg:items-end">
            <div>
              <h1 className="max-w-4xl text-4xl font-black tracking-[-0.04em] sm:text-6xl">Крокодил — текущий дизайн</h1>
              <p className="mt-4 max-w-3xl text-base leading-relaxed text-white/60 sm:text-lg">
                Статическая карта реальных состояний телефона и TV перед редизайном. Здесь нет новой концепции, игровой логики и Socket.io — только зафиксированная визуальная отправная точка.
              </p>
            </div>
            <aside className="rounded-[24px] border border-white/10 bg-white/[0.04] p-5 text-sm leading-relaxed text-white/60">
              <b className="mb-2 block font-mono text-xs uppercase tracking-[0.2em] text-white">Что сохраняем как поведение</b>
              Слово видно только объясняющему. TV показывает таймер, активного игрока, счёт и статистику хода, но никогда не раскрывает секрет.
            </aside>
          </div>
        </header>

        <nav aria-label="Состояния текущего дизайна" className="mb-8 grid gap-2 sm:grid-cols-2 lg:grid-cols-7">
          {STEPS.map((item) => {
            const active = item.id === selected;
            return (
              <button
                key={item.id}
                type="button"
                aria-pressed={active}
                onClick={() => setSelected(item.id)}
                className={`min-h-[84px] rounded-[20px] border p-3 text-left transition ${active ? 'border-red-400/70 bg-red-500/15 shadow-[0_0_30px_rgba(239,68,68,.15)]' : 'border-white/10 bg-white/[0.035] hover:border-white/25 hover:bg-white/[0.06]'}`}
              >
                <span className={`font-mono text-[10px] font-black tracking-[0.2em] ${active ? 'text-red-300' : 'text-white/35'}`}>{item.number}</span>
                <b className="mt-1 block text-sm leading-tight">{item.title}</b>
              </button>
            );
          })}
        </nav>

        <section className="mb-6 flex flex-wrap items-end justify-between gap-4 rounded-[24px] border border-white/10 bg-white/[0.035] px-5 py-4">
          <div>
            <span className="font-mono text-[10px] font-black uppercase tracking-[0.22em] text-red-300">Состояние {step.number}</span>
            <h2 className="mt-1 text-2xl font-black">{step.title}</h2>
          </div>
          <p className="max-w-2xl text-sm leading-relaxed text-white/55">{step.note}</p>
        </section>

        <div className="grid gap-8 xl:grid-cols-[390px_minmax(0,1fr)] xl:items-start">
          <section>
            <DeviceLabel size="390 × 844">{step.phoneRole}</DeviceLabel>
            <ScaledCanvas width={390} height={844}><PhoneScreen state={step.id} /></ScaledCanvas>
          </section>
          <section className="min-w-0">
            <DeviceLabel size="1920 × 1080 · preview 50%">Общий экран · TV</DeviceLabel>
            <ScaledCanvas width={960} height={540}><TvScreen state={step.tvState} /></ScaledCanvas>
          </section>
        </div>

        <footer className="mt-10 border-t border-white/10 pt-6 text-sm leading-relaxed text-white/45">
          Следующий этап — исследование внешних референсов и несколько визуально независимых концепций. Эта страница остаётся контрольным снимком старого решения; production-код игры не изменён.
        </footer>

        <ConceptsGallery />
      </div>
    </main>
  );
}
