import type { ReactNode } from 'react';
import { HundredToOneIcon, type HundredToOneIconName } from '@/components/games/HundredToOneIcon';
import { HundredToOneConceptGallery } from './HundredToOneConceptGallery';

const phoneScreens = [
  { id: 'roles', number: '01', title: 'Выбор роли', role: 'Игрок' },
  { id: 'buzzer', number: '02', title: 'Буззер', role: 'Капитан' },
  { id: 'round-host', number: '03', title: 'Раунд', role: 'Ведущий' },
  { id: 'round-player', number: '04', title: 'Раунд', role: 'Игрок' },
  { id: 'big-input', number: '05', title: 'Большая игра', role: 'Игрок 2' },
  { id: 'big-check', number: '06', title: 'Большая игра', role: 'Проверка ведущего' },
  { id: 'results', number: '07', title: 'Итоги', role: 'Ведущий' },
] as const;

const tvScreens = [
  { id: 'setup', number: '01', title: 'Подготовка' },
  { id: 'title', number: '02', title: 'Заставка' },
  { id: 'buzzer', number: '03', title: 'Буззер' },
  { id: 'round', number: '04', title: 'Раунд' },
  { id: 'big-game', number: '05', title: 'Большая игра' },
  { id: 'final', number: '06', title: 'Финал' },
] as const;

type PhoneScreenId = (typeof phoneScreens)[number]['id'];
type TvScreenId = (typeof tvScreens)[number]['id'];
type Team = 1 | 2;

const players = ['Катя', 'Аня', 'Лёша', 'Света'];
const rivals = ['Рома', 'Дима', 'Вика', 'Маша'];
const answers = [
  ['Телефон', 34],
  ['Ключи', 26],
  ['Кошелёк', 15],
  ['Зонт', 9],
  ['Документы', 7],
  ['Зарядку', 4],
] as const;

const surface =
  'relative overflow-hidden bg-[radial-gradient(75%_55%_at_20%_4%,rgba(245,158,11,.25),transparent_70%),radial-gradient(65%_50%_at_86%_8%,rgba(251,191,36,.14),transparent_70%),linear-gradient(145deg,#170f08_0%,#2b1807_38%,#120c08_72%,#080606_100%)] text-white';
const glass = 'border border-white/10 bg-white/[.06] shadow-[0_20px_60px_-30px_rgba(0,0,0,.9)] backdrop-blur-xl';
const glassStrong = 'border border-white/[.16] bg-white/[.10] shadow-[0_24px_70px_-30px_rgba(0,0,0,.95)] backdrop-blur-2xl';
const accent =
  'bg-[radial-gradient(110%_70%_at_50%_-5%,rgba(255,255,255,.38),transparent_56%),linear-gradient(165deg,#fbbf24_0%,#f59e0b_56%,#b45309_100%)] text-[#341f02] shadow-[0_20px_52px_-16px_rgba(245,158,11,.72),inset_0_1px_0_rgba(255,255,255,.45)]';

function Icon({ name, className = 'h-5 w-5', strokeWidth }: { name: HundredToOneIconName; className?: string; strokeWidth?: number }) {
  return <HundredToOneIcon name={name} className={className} strokeWidth={strokeWidth} />;
}

function Ambient() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute -left-[18%] top-[14%] h-[38%] w-[75%] rotate-[18deg] bg-gradient-to-r from-transparent via-amber-400/[.10] to-transparent blur-2xl" />
      <div className="absolute -right-[25%] top-[5%] h-[42%] w-[80%] -rotate-[17deg] bg-gradient-to-r from-transparent via-yellow-300/[.08] to-transparent blur-2xl" />
      <div className="absolute left-1/2 top-[16%] h-52 w-52 -translate-x-1/2 rounded-full bg-amber-400/[.09] blur-3xl" />
    </div>
  );
}

function Mark({ large = false }: { large?: boolean }) {
  return (
    <span className={`${accent} inline-flex items-center justify-center ${large ? 'h-24 w-24 rounded-[28px]' : 'h-9 w-9 rounded-[11px]'}`}>
      <Icon name="bell" className={large ? 'h-14 w-14' : 'h-6 w-6'} strokeWidth={1.7} />
    </span>
  );
}

function Brand({ tv = false, host = false }: { tv?: boolean; host?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <Mark />
      <div className={`${tv ? 'text-xl' : 'text-[15px]'} font-extrabold leading-none tracking-[-.02em]`}>
        100 к 1
        <span className="mt-1 block font-mono text-[8px] font-semibold uppercase tracking-[.18em] text-white/35">{host ? 'Ведущий' : 'Party Hub'}</span>
      </div>
    </div>
  );
}

function TeamDot({ team, size = 'h-2.5 w-2.5' }: { team: Team; size?: string }) {
  return <span className={`${size} rounded-full ${team === 1 ? 'bg-[#ffe155] shadow-[0_0_12px_rgba(255,225,85,.6)]' : 'bg-[#ff7a70] shadow-[0_0_12px_rgba(255,122,112,.55)]'}`} />;
}

function Avatar({ name, selected = false, large = false }: { name: string; selected?: boolean; large?: boolean }) {
  return (
    <span className={`inline-flex ${large ? 'h-11 w-11 text-base' : 'h-7 w-7 text-[11px]'} flex-none items-center justify-center rounded-full border font-extrabold ${selected ? 'border-amber-300/55 bg-amber-500/20 text-amber-100' : 'border-white/10 bg-white/[.10] text-white/80'}`}>
      {name[0]}
    </span>
  );
}

function PhoneHeader({ host = false }: { host?: boolean }) {
  return (
    <>
      <div className="flex items-center justify-between px-1 text-[10px] font-bold text-white/80">
        <span>9:41</span>
        <span className="tracking-[.12em]">● ◒ ▰</span>
      </div>
      <div className="mt-5 flex items-center justify-between">
        <Brand host={host} />
        <span className={`${glass} rounded-full px-3 py-1.5 font-mono text-[10px] font-bold tracking-[.12em] text-white/70`}>A7QX</span>
      </div>
    </>
  );
}

function TeamScore({ team, name, score, active = false, compact = false }: { team: Team; name: string; score: number; active?: boolean; compact?: boolean }) {
  return (
    <div className={`${glassStrong} relative flex min-w-0 items-center gap-2 rounded-[15px] border px-3 ${compact ? 'py-2' : 'py-3'} ${team === 1 ? 'border-yellow-200/25 bg-yellow-300/[.10]' : 'border-red-300/25 bg-red-400/[.10]'} ${active ? 'ring-2 ring-amber-300/55 shadow-[0_0_24px_-6px_rgba(245,158,11,.5)]' : ''}`}>
      <TeamDot team={team} />
      <span className="truncate text-[11px] font-extrabold">{name}</span>
      <b className={`ml-auto text-lg tabular-nums ${team === 1 ? 'text-[#ffe155]' : 'text-[#ff7a70]'}`}>{score}</b>
    </div>
  );
}

function AnswerBoard({ host = false, tv = false }: { host?: boolean; tv?: boolean }) {
  return (
    <div className={`grid min-h-0 ${tv ? 'flex-1 grid-rows-6 gap-2' : 'gap-2'}`}>
      {answers.map(([answer, points], index) => {
        const open = host || index < 2;
        return (
          <div key={answer} className={`flex min-h-0 items-center rounded-[12px] border ${tv ? 'gap-4 pr-5' : 'h-10 gap-2 pr-3'} ${open ? 'border-amber-300/45 bg-amber-300/[.17]' : 'border-white/10 bg-white/[.045] text-white/20'}`}>
            <span className={`flex h-full ${tv ? 'w-14 text-lg' : 'w-9 text-xs'} flex-none items-center justify-center rounded-l-[11px] font-mono font-bold ${open ? 'bg-amber-500 text-[#341f02]' : 'bg-black/20 text-white/30'}`}>{index + 1}</span>
            <span className={`min-w-0 flex-1 truncate font-bold ${tv ? 'text-xl' : 'text-[13px]'} ${open ? '' : 'tracking-[.25em]'}`}>{open ? answer : '? ? ? ? ?'}</span>
            <b className={tv ? 'text-xl' : 'text-[13px]'}>{open ? points : '··'}</b>
          </div>
        );
      })}
    </div>
  );
}

function PrimaryButton({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`${accent} flex h-12 items-center justify-center rounded-[15px] px-5 text-sm font-extrabold ${className}`}>{children}</div>;
}

function PhoneShell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-[390px]">
      <div className="mb-3 flex items-end justify-between font-mono text-[10px] uppercase tracking-[.16em] text-white/45">
        <b className="text-white/70">{title}</b>
        <span>390 × 844</span>
      </div>
      <div className="rounded-[48px] border border-white/15 bg-[#050505] p-[9px] shadow-[0_32px_90px_-34px_rgba(0,0,0,.9)]">
        <div className={`${surface} aspect-[390/844] rounded-[40px]`}>
          <Ambient />
          <div className="absolute left-1/2 top-3 z-20 h-7 w-28 -translate-x-1/2 rounded-full bg-black" />
          <div className="relative z-10 flex h-full flex-col px-[18px] pb-[18px] pt-[18px]">{children}</div>
          <div className="absolute bottom-2.5 left-1/2 z-20 h-1 w-28 -translate-x-1/2 rounded-full bg-white/65" />
        </div>
      </div>
    </div>
  );
}

function RolesPhone() {
  const role = (team: Team, names: string[], mine = false) => (
    <div className={`${glassStrong} relative rounded-[18px] border p-3 ${team === 1 ? 'border-yellow-200/25 bg-yellow-300/[.10]' : 'border-red-300/25 bg-red-400/[.10]'} ${mine ? 'ring-2 ring-amber-300/60' : ''}`}>
      <div className="flex items-center gap-2 text-sm font-extrabold"><TeamDot team={team} /><span>Команда {team}</span><span className="ml-auto font-mono text-[9px] font-medium text-white/40">4 игрока</span></div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {names.map((name, index) => <span key={name} className={`${glass} flex items-center gap-1.5 rounded-full py-1 pl-1 pr-2 text-[10px] font-bold ${mine && index === 0 ? 'border-amber-300/50 text-amber-100' : ''}`}><Avatar name={name} selected={mine && index === 0} />{name}{mine && index === 0 ? ' · ты' : ''}</span>)}
      </div>
    </div>
  );

  return <><PhoneHeader /><div className="mt-5 flex items-center gap-2 text-[11px] text-white/55"><Icon name="users" />Выбери свою роль — тапни по карточке</div><div className="mt-4 space-y-3">{role(1, players, true)}{role(2, rivals)}<div className={`${glassStrong} rounded-[18px] p-3`}><div className="flex items-center gap-2 text-sm font-extrabold"><span className="flex h-7 w-7 items-center justify-center rounded-[9px] border border-amber-300/35 bg-amber-500/[.12] text-amber-200"><Icon name="mic" className="h-4 w-4" /></span>Ведущий<span className="ml-auto font-mono text-[9px] text-white/40">1 место</span></div><div className={`${glass} mt-2 inline-flex items-center gap-1.5 rounded-full py-1 pl-1 pr-3 text-[10px] font-bold`}><Avatar name="Оля" />Оля</div></div></div><div className="mt-auto"><PrimaryButton>Далее →</PrimaryButton></div></>;
}

function BuzzerPhone() {
  return <><PhoneHeader /><div className="mt-7 text-center"><div className="font-mono text-[10px] font-bold uppercase tracking-[.18em] text-amber-200/70">Раунд 2 · Двойная игра</div><h3 className="mt-2 text-3xl font-extrabold">Кто начинает?</h3></div><div className={`${glassStrong} mx-auto mt-8 flex items-center gap-3 rounded-full px-4 py-2.5`}><Avatar name="Катя" large /><span className="text-left"><b className="block text-sm">Катя · капитан</b><small className="text-white/45">«Акулы»</small></span></div><div className={`${accent} mx-auto mt-10 flex aspect-square w-[205px] flex-col items-center justify-center rounded-full border-[8px] border-amber-100/15 shadow-[0_32px_80px_-20px_rgba(245,158,11,.75)]`}><span className="text-5xl font-black">2</span><b className="mt-3 text-2xl">ЖМИ!</b><span className="mt-2 font-mono text-[10px] font-bold tracking-[.2em]">ПО НУЛЮ</span></div><p className="mx-auto mt-auto max-w-[290px] text-center text-[11px] leading-relaxed text-white/48">Кто первым нажмёт после отсчёта — та команда атакует раунд. Фальстарт не считается.</p></>;
}

function RoundPhone({ host }: { host: boolean }) {
  return <><PhoneHeader host={host} /><div className="mt-4 grid grid-cols-2 gap-2"><TeamScore team={1} name="АКУЛЫ" score={240} active /><TeamScore team={2} name="ЗУБРЫ" score={180} /></div><div className="mt-3 flex items-center justify-between"><span className={`${glass} rounded-full px-3 py-2 font-mono text-[9px] font-bold uppercase tracking-[.12em] text-amber-100`}>Раунд 2 · ×2</span>{host && <span className="text-[9px] text-white/40">сменить атаку</span>}<span className="text-right"><small className="block font-mono text-[8px] uppercase tracking-[.12em] text-white/35">Банк раунда</small><b className="text-xl text-amber-100">120</b></span></div><div className={`${glassStrong} my-3 flex items-center gap-3 rounded-[16px] px-3 py-3`}><span className="flex h-8 w-8 flex-none items-center justify-center rounded-[10px] border border-amber-300/35 bg-amber-500/[.12] text-amber-200"><Icon name="question" className="h-5 w-5" /></span><b className="text-[13px] leading-snug">Что люди чаще всего забывают, выходя из дома?</b></div><AnswerBoard host={host} /><div className="mt-auto pt-3">{host ? <><p className="mb-3 text-center text-[9px] leading-relaxed text-white/40">Тап по ответу — открыть на игровом поле · тап по кресту — страйк</p><div className="grid grid-cols-3 gap-2"><div className={`${glass} flex items-center justify-center rounded-[13px] text-[10px] font-bold`}>Назад</div><div className={`${glass} flex items-center justify-center rounded-[13px] text-[10px] font-bold text-red-200`}>Сброс</div><PrimaryButton className="!h-10 !px-2 !text-[10px]">Далее</PrimaryButton></div></> : <div className={`${glass} rounded-full px-4 py-3 text-center text-[10px] text-white/55`}>Отвечает <b className="text-[#ffe155]">ваша команда</b> — говорите вслух</div>}</div></>;
}

function BigInputPhone() {
  const rows = ['Самый популярный домашний питомец?', 'Что берут с собой на пляж?', 'Профессия, о которой мечтают дети?', 'Что есть в каждой кухне?', 'Куда опаздывают чаще всего?'];
  return <><PhoneHeader /><div className="mt-5 flex items-center justify-between"><span><small className="font-mono text-[9px] uppercase tracking-[.15em] text-amber-200/65">Большая игра · Игрок 2</small><b className="mt-1 block text-lg">Аня, отвечай быстро</b></span><span className={`${glassStrong} rounded-[14px] px-3 py-2 text-xl font-extrabold text-amber-100`}>0:23</span></div><div className={`${glassStrong} mt-5 rounded-[20px] p-4`}><span className="font-mono text-[9px] uppercase tracking-[.14em] text-white/35">Вопрос 3 из 5</span><h3 className="mt-2 text-xl font-extrabold leading-tight">Профессия, о которой мечтают дети?</h3><div className={`${glass} mt-4 rounded-[14px] px-4 py-3 text-sm text-white/35`}>Ответить</div></div><div className="mt-4 space-y-2">{rows.map((q, index) => <div key={q} className={`${glass} flex items-center gap-2 rounded-[13px] px-3 py-2.5 ${index === 2 ? 'border-amber-300/45 bg-amber-500/[.08]' : ''}`}><span className="font-mono text-[10px] text-white/30">{index + 1}</span><span className="min-w-0 flex-1 truncate text-[11px] font-bold">{q}</span><span className="text-[10px] text-white/35">{index === 0 ? 'Кошка' : index === 1 ? 'Полотенце' : '···'}</span></div>)}</div><p className="mt-auto text-center text-[9px] leading-relaxed text-white/38">Ответы игрока 1 скрыты. Очки покажем в конце.</p></>;
}

function BigCheckPhone() {
  const options = [['Космонавт', 30], ['Врач', 24], ['Пожарный', 18], ['Артист', 14], ['Полицейский', 9], ['Нет в таблице', 0]] as const;
  return <><PhoneHeader host /><div className="mt-5 flex items-start justify-between"><span><small className="font-mono text-[9px] uppercase tracking-[.15em] text-amber-200/65">Большая игра · Проверка</small><b className="mt-1 block text-lg">Сопоставь ответ Ани</b></span><span className={`${accent} rounded-[14px] px-3 py-2 text-center`}><small className="block font-mono text-[7px] uppercase">Фонд</small><b className="text-lg">154</b></span></div><div className={`${glassStrong} mt-4 rounded-[18px] p-4`}><span className="font-mono text-[9px] text-white/35">Вопрос 3 из 5</span><h3 className="mt-1.5 text-[17px] font-extrabold">Профессия, о которой мечтают дети?</h3><div className="mt-3 rounded-[13px] border border-white/10 bg-black/20 px-3 py-2"><small className="text-[8px] text-white/35">Ответ Ани</small><b className="block text-sm">«Космонавт»</b></div></div><div className="mt-3 grid gap-1.5">{options.map(([name, points], index) => <div key={name} className={`flex items-center rounded-[12px] border px-3 py-2 text-[11px] ${index === 0 ? 'border-green-300/40 bg-green-500/[.12] text-green-200' : 'border-white/10 bg-white/[.05]'}`}><span className="font-bold">{name}</span><b className="ml-auto">+{points}</b></div>)}</div><div className="mt-auto grid grid-cols-[1fr_1.2fr] gap-2"><div className={`${glass} flex items-center justify-center rounded-[14px] px-2 text-center text-[10px] font-bold`}>Другой ответ</div><PrimaryButton className="!px-2 !text-[11px]">Засчитать +30</PrimaryButton></div></>;
}

function ResultsPhone() {
  return <><PhoneHeader host /><div className="mt-7 text-center"><span className={`${accent} mx-auto flex h-20 w-20 items-center justify-center rounded-[24px]`}><Icon name="trophy" className="h-11 w-11" /></span><h2 className="mt-4 bg-gradient-to-b from-amber-100 to-amber-500 bg-clip-text text-4xl font-black text-transparent">ПОБЕДА!</h2><p className="mt-1 text-sm"><b className="text-[#ffe155]">АКУЛЫ</b> забирают игру</p></div><div className="mt-6 grid grid-cols-2 gap-2"><TeamScore team={1} name="АКУЛЫ" score={240} active /><TeamScore team={2} name="ЗУБРЫ" score={180} /></div><div className={`${glassStrong} mt-5 rounded-[20px] p-4`}><div className="grid grid-cols-[1fr_auto_1fr_auto_1.2fr] items-center gap-1 text-center"><span><small className="block text-[8px] text-white/35">Катя · И1</small><b className="text-lg">118</b></span><b className="text-white/25">+</b><span><small className="block text-[8px] text-white/35">Аня · И2</small><b className="text-lg">108</b></span><b className="text-white/25">=</b><span className="rounded-[12px] border border-green-300/30 bg-green-500/[.10] py-2 text-green-200"><small className="block text-[7px]">Фонд · 200</small><b className="text-xl">226</b></span></div></div><div className="mt-auto space-y-2"><PrimaryButton>Сыграть ещё раз</PrimaryButton><div className="grid grid-cols-2 gap-2"><div className={`${glass} rounded-[14px] py-3 text-center text-[10px] font-bold`}>Поменять команды</div><div className={`${glass} rounded-[14px] py-3 text-center text-[10px] font-bold`}>В лобби</div></div></div></>;
}

function PhoneScreen({ id }: { id: PhoneScreenId }) {
  if (id === 'roles') return <RolesPhone />;
  if (id === 'buzzer') return <BuzzerPhone />;
  if (id === 'round-host') return <RoundPhone host />;
  if (id === 'round-player') return <RoundPhone host={false} />;
  if (id === 'big-input') return <BigInputPhone />;
  if (id === 'big-check') return <BigCheckPhone />;
  return <ResultsPhone />;
}

function TvBrand() {
  return <Brand tv />;
}

function LivePill({ children = '9 в игре' }: { children?: ReactNode }) {
  return <div className={`${glass} inline-flex items-center gap-2 rounded-full px-4 py-2 font-mono text-[10px] font-bold uppercase tracking-[.12em] text-white/55`}><span className="h-2 w-2 rounded-full bg-green-300 shadow-[0_0_12px_rgba(74,222,128,.8)]" />{children}</div>;
}

function RemoteHint({ children }: { children: ReactNode }) {
  return <div className={`${glass} inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-xs font-semibold text-white/55`}><Icon name="phone" className="h-4 w-4 text-amber-200" />{children}</div>;
}

function TvShell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="w-full">
      <div className="mb-3 flex items-end justify-between font-mono text-[10px] uppercase tracking-[.16em] text-white/45"><b className="text-white/70">{title}</b><span>1920 × 1080</span></div>
      <div className="rounded-[28px] border border-white/15 bg-[#050505] p-2.5 shadow-[0_34px_100px_-38px_rgba(0,0,0,.95)]">
        <div className={`${surface} aspect-video rounded-[20px]`}><Ambient /><div className="relative z-10 flex h-full flex-col px-[3.4%] py-[2.5%]">{children}</div></div>
      </div>
    </div>
  );
}

function TvSetup() {
  const team = (number: Team, names: string[]) => <div className={`${glassStrong} flex h-full flex-col rounded-[22px] border p-5 ${number === 1 ? 'border-yellow-200/25 bg-yellow-300/[.10]' : 'border-red-300/25 bg-red-400/[.10]'}`}><div className="flex items-center gap-3"><TeamDot team={number} size="h-3.5 w-3.5" /><b className="text-2xl">Команда {number}</b><span className="ml-auto font-mono text-[10px] text-white/35">4 игрока</span></div><small className="mt-1 font-mono text-[9px] uppercase tracking-[.12em] text-white/35">{number === 1 ? 'Название — выберут после капитана' : 'Капитан — голосование идёт'}</small><div className="mt-4 grid grid-cols-2 gap-2">{names.map(name => <div key={name} className={`${glass} flex items-center gap-2 rounded-full p-1.5 pr-3 text-sm font-bold`}><Avatar name={name} />{name}</div>)}</div></div>;
  return <><div className="grid grid-cols-[1fr_auto_1fr] items-center"><TvBrand /><div className={`${glass} flex items-center gap-5 rounded-full px-6 py-3`}>{['Тема', 'Роли', 'Капитаны', 'Названия', 'Старт'].map((item, index) => <span key={item} className={`flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[.1em] ${index === 2 ? 'font-bold text-amber-200' : 'text-white/30'}`}><i className={`h-2 w-2 rounded-full ${index < 2 ? 'bg-amber-500/50' : index === 2 ? 'bg-amber-400 shadow-[0_0_10px_rgba(245,158,11,.8)]' : 'bg-white/15'}`} />{item}</span>)}</div><div className="flex justify-end"><LivePill /></div></div><div className="mt-7 grid min-h-0 flex-1 grid-cols-[1fr_280px_1fr] gap-6">{team(1, players)}<div className={`${glassStrong} flex flex-col items-center justify-center rounded-[22px] p-5 text-center`}><div className="mb-4 rounded-[18px] border border-white/10 bg-white p-3 text-[#211406]"><div className="grid h-24 w-24 place-items-center rounded-[8px] bg-[repeating-linear-gradient(45deg,#111_0_5px,#fff_5px_10px)]"><span className="rounded bg-white px-2 py-1 font-mono text-[10px] font-black">A7QX</span></div></div><small className="text-[10px] text-white/40">Сканируй, чтобы присоединиться</small><div className={`${glass} mt-4 flex items-center gap-2 rounded-full p-2 pr-4 text-sm font-bold`}><Avatar name="Оля" />Оля · Ведущий</div></div>{team(2, rivals)}</div><div className="mt-5 flex justify-center"><RemoteHint>Выбор капитанов — <b className="text-white/85">на телефонах команд</b></RemoteHint></div></>;
}

function TvTitle() {
  return <><div className="flex items-center justify-between"><TvBrand /><LivePill /></div><div className="flex flex-1 flex-col items-center justify-center text-center"><Mark large /><h2 className="mt-5 bg-gradient-to-b from-amber-100 via-amber-400 to-amber-700 bg-clip-text text-[92px] font-black leading-none tracking-[-.055em] text-transparent drop-shadow-[0_14px_44px_rgba(245,158,11,.35)]">100 к 1</h2><p className="mt-3 font-mono text-[12px] uppercase tracking-[.4em] text-white/32">Телеигра · Тема: Общие вопросы</p><div className="mt-8 flex items-center gap-6"><div className={`${glassStrong} flex items-center gap-3 rounded-[18px] border-yellow-200/25 bg-yellow-300/[.10] px-7 py-4`}><TeamDot team={1} size="h-3.5 w-3.5" /><b className="text-2xl">АКУЛЫ</b></div><b className="text-xl text-amber-400">VS</b><div className={`${glassStrong} flex items-center gap-3 rounded-[18px] border-red-300/25 bg-red-400/[.10] px-7 py-4`}><TeamDot team={2} size="h-3.5 w-3.5" /><b className="text-2xl">ЗУБРЫ</b></div></div><div className={`${glass} mt-7 flex items-center gap-2 rounded-full px-5 py-3 text-sm text-white/55`}><Icon name="mic" className="h-5 w-5 text-amber-200" />Ведущий <b className="text-amber-200">Оля</b> начнёт игру со своего телефона</div></div><div className="flex justify-center"><RemoteHint>4 раунда + Большая игра · <b className="text-white/85">фонд 200 — победа</b></RemoteHint></div></>;
}

function TvBuzzer() {
  const captain = (name: string, team: Team, side: string) => <div className={`${glassStrong} flex flex-col items-center rounded-[24px] border p-6 text-center ${team === 1 ? 'border-yellow-200/25 bg-yellow-300/[.10]' : 'border-red-300/25 bg-red-400/[.10]'}`}><Avatar name={name} large /><b className="mt-3 text-2xl">{name}</b><span className="mt-1 text-sm text-white/42">Капитан · {side}</span><small className="mt-5 font-mono text-[10px] uppercase tracking-[.14em] text-white/30">рука на кнопке…</small></div>;
  return <><div className="flex items-center justify-between"><TvBrand /><div className={`${glass} rounded-full px-6 py-3 text-lg font-extrabold uppercase tracking-[.08em] text-amber-100`}>Раунд 2 · Кто начинает?</div><LivePill /></div><div className="mx-auto mt-8 grid min-h-0 w-[78%] flex-1 grid-cols-[1fr_210px_1fr] items-center gap-8">{captain('Катя', 1, 'АКУЛЫ')}<div className={`${accent} flex aspect-square flex-col items-center justify-center rounded-full border-[7px] border-amber-100/15`}><b className="text-6xl">2</b><span className="mt-2 text-xl font-black">ЖМИТЕ</span><small className="mt-1 font-mono text-[8px] tracking-[.18em]">ПО НУЛЮ</small></div>{captain('Рома', 2, 'ЗУБРЫ')}</div><div className="flex justify-center"><RemoteHint>Кто первым нажмёт буззер — <b className="text-white/85">та команда атакует раунд</b></RemoteHint></div></>;
}

function TvRound() {
  return <><div className="grid grid-cols-[1fr_auto_1fr] items-center"><TvBrand /><div className={`${glass} flex items-center gap-3 rounded-full px-6 py-3`}><Icon name="board" className="h-5 w-5 text-amber-300" /><b className="text-lg uppercase tracking-[.08em] text-amber-100">Раунд 2 · Двойная игра</b><span className="rounded-full border border-amber-300/35 bg-amber-500/[.12] px-2 py-1 font-mono text-sm text-amber-300">×2</span></div><div className="flex justify-end"><LivePill /></div></div><div className="mt-5 grid grid-cols-[1fr_180px_1fr] gap-5"><div className={`${glassStrong} flex items-center rounded-[18px] border-yellow-200/25 bg-yellow-300/[.10] px-5 py-3 ring-2 ring-amber-300/45`}><TeamDot team={1} size="h-3.5 w-3.5" /><span className="ml-3"><b className="block text-xl">АКУЛЫ</b><small className="font-mono text-[8px] uppercase tracking-[.14em] text-white/35">атакуют</small></span><b className="ml-auto text-4xl text-[#ffe155]">240</b></div><div className={`${glassStrong} rounded-[20px] px-5 py-3 text-center`}><small className="font-mono text-[9px] uppercase tracking-[.16em] text-white/35">Банк раунда</small><b className="block text-4xl text-amber-100">120</b></div><div className={`${glassStrong} flex flex-row-reverse items-center rounded-[18px] border-red-300/25 bg-red-400/[.10] px-5 py-3 text-right`}><TeamDot team={2} size="h-3.5 w-3.5" /><span className="mr-3"><b className="block text-xl">ЗУБРЫ</b><small className="font-mono text-[8px] uppercase tracking-[.14em] text-white/35">ждут хода</small></span><b className="mr-auto text-4xl text-[#ff7a70]">180</b></div></div><div className={`${glassStrong} mx-auto mt-4 flex w-[76%] items-center gap-4 rounded-[18px] px-6 py-4`}><span className="flex h-10 w-10 items-center justify-center rounded-[12px] border border-amber-300/35 bg-amber-500/[.12] text-amber-200"><Icon name="question" className="h-6 w-6" /></span><b className="text-xl">Что люди чаще всего забывают, выходя из дома?</b></div><div className="mx-auto mt-3 flex min-h-0 w-[76%] flex-1 gap-3"><div className="flex w-12 flex-col gap-2">{[0, 1, 2].map(i => <span key={i} className={`flex flex-1 items-center justify-center rounded-[10px] border ${i === 0 ? 'border-red-300/50 bg-red-500/[.14] text-red-300' : 'border-white/10 bg-white/[.04] text-white/15'}`}><Icon name="cross" /></span>)}</div><AnswerBoard tv /><div className="flex w-12 flex-col gap-2">{[0, 1, 2].map(i => <span key={i} className="flex flex-1 items-center justify-center rounded-[10px] border border-white/10 bg-white/[.04] text-white/15"><Icon name="cross" /></span>)}</div></div><div className="mt-3 flex justify-center"><RemoteHint>Отвечает команда <b className="text-[#ffe155]">АКУЛЫ</b> — ведущий открывает ответы</RemoteHint></div></>;
}

function TvBigGame() {
  const questions = ['Самый популярный домашний питомец?', 'Что берут с собой на пляж?', 'Профессия, о которой мечтают дети?', 'Что есть в каждой кухне?', 'Куда опаздывают чаще всего?'];
  return <><div className="grid grid-cols-[1fr_auto_1fr] items-center"><TvBrand /><div className={`${glass} flex items-center gap-3 rounded-full px-6 py-3`}><Icon name="shuffle" className="h-5 w-5 text-amber-300" /><b className="text-lg uppercase tracking-[.08em] text-amber-100">Большая игра · Игрок 2 — 40 сек</b></div><div className="flex justify-end"><LivePill>АКУЛЫ играют</LivePill></div></div><div className="mt-6 grid min-h-0 flex-1 grid-cols-[1fr_245px] gap-6"><div className="grid min-h-0 grid-rows-5 gap-2.5">{questions.map((q, index) => <div key={q} className={`${glass} flex min-h-0 items-center gap-4 rounded-[16px] px-4 py-2 ${index === 2 ? 'border-amber-300/45 bg-amber-500/[.09]' : ''}`}><span className="font-mono text-sm text-white/28">{index + 1}</span><b className="min-w-0 flex-1 text-base">{q}</b><span className={`rounded-full border px-3 py-1.5 text-xs font-bold ${index < 2 ? 'border-green-300/35 bg-green-500/[.12] text-green-200' : 'border-white/10 bg-white/[.05] text-white/30'}`}>{index === 0 ? 'Кошка +34' : index === 1 ? 'Полотенце +31' : index === 2 ? 'Аня печатает…' : '···'}</span></div>)}</div><div className="flex flex-col gap-4"><div className={`${glassStrong} flex flex-1 flex-col items-center justify-center rounded-[22px] text-center`}><small className="font-mono text-[9px] uppercase tracking-[.18em] text-white/35">Осталось</small><b className="mt-1 text-6xl text-amber-50">0:23</b><div className="mt-4 flex items-center gap-2"><Avatar name="Аня" /><b className="text-sm">Аня · Игрок 2</b></div></div><div className={`${accent} rounded-[22px] px-5 py-5 text-center`}><small className="font-mono text-[9px] uppercase tracking-[.18em] opacity-65">Фонд</small><b className="block text-5xl">154</b><span className="text-[10px] font-semibold opacity-65">цель — 200 очков</span></div></div></div></>;
}

function TvFinal() {
  return <><div className="flex items-center justify-between"><TvBrand /><LivePill>Большая игра завершена</LivePill></div><div className="flex flex-1 flex-col items-center justify-center text-center"><span className={`${accent} flex h-28 w-28 items-center justify-center rounded-[32px]`}><Icon name="trophy" className="h-16 w-16" strokeWidth={1.6} /></span><h2 className="mt-5 bg-gradient-to-b from-amber-100 via-amber-400 to-amber-700 bg-clip-text text-[78px] font-black leading-none tracking-[-.04em] text-transparent">ПОБЕДА!</h2><div className={`${glassStrong} mt-5 flex items-center gap-3 rounded-full border-yellow-200/25 bg-yellow-300/[.10] px-7 py-3`}><TeamDot team={1} size="h-3.5 w-3.5" /><b className="text-2xl">АКУЛЫ</b><span className="text-base text-white/38">забирают игру</span></div><div className="mt-6 flex items-center gap-4"><div className={`${glass} rounded-[16px] px-7 py-3`}><small className="block text-[9px] text-white/35">Катя · Игрок 1</small><b className="text-3xl">118</b></div><b className="text-2xl text-white/22">+</b><div className={`${glass} rounded-[16px] px-7 py-3`}><small className="block text-[9px] text-white/35">Аня · Игрок 2</small><b className="text-3xl">108</b></div><b className="text-2xl text-white/22">=</b><div className="rounded-[16px] border border-green-300/35 bg-green-500/[.10] px-8 py-3 text-green-200"><small className="block text-[9px]">Фонд · цель 200</small><b className="text-4xl">226</b></div></div></div><div className="flex justify-center"><RemoteHint>Ведущий вернёт всех <b className="text-white/85">в лобби</b></RemoteHint></div></>;
}

function TvScreen({ id }: { id: TvScreenId }) {
  if (id === 'setup') return <TvSetup />;
  if (id === 'title') return <TvTitle />;
  if (id === 'buzzer') return <TvBuzzer />;
  if (id === 'round') return <TvRound />;
  if (id === 'big-game') return <TvBigGame />;
  return <TvFinal />;
}

function SectionHeader({ eyebrow, title, copy }: { eyebrow: string; title: string; copy: string }) {
  return <div className="mb-10 max-w-3xl"><p className="font-mono text-xs font-bold uppercase tracking-[.24em] text-amber-300/70">{eyebrow}</p><h2 className="mt-3 text-4xl font-extrabold tracking-[-.035em] text-white sm:text-5xl">{title}</h2><p className="mt-4 text-base leading-relaxed text-white/48 sm:text-lg">{copy}</p></div>;
}

export default function HundredToOneDesignPreviewPage() {
  return (
    <main className="min-h-screen bg-[#080706] text-white">
      <section className="relative overflow-hidden border-b border-white/8 px-5 pb-20 pt-16 sm:px-10 lg:px-16">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(55%_80%_at_85%_0%,rgba(245,158,11,.18),transparent_70%),radial-gradient(45%_70%_at_10%_10%,rgba(180,83,9,.15),transparent_75%)]" />
        <div className="relative mx-auto max-w-[1500px]">
          <div className="flex flex-wrap items-center gap-3 font-mono text-[11px] uppercase tracking-[.18em] text-white/42"><span className="rounded-full border border-amber-300/25 bg-amber-400/[.08] px-4 py-2 text-amber-200">Design baseline</span><span>13 исходных состояний</span><span>·</span><span>без игровой логики</span></div>
          <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_420px] lg:items-end">
            <div><p className="font-mono text-sm font-bold uppercase tracking-[.24em] text-amber-300/75">100 к 1 · Старый дизайн</p><h1 className="mt-4 max-w-5xl text-5xl font-black leading-[.94] tracking-[-.055em] sm:text-7xl lg:text-[92px]">Отправная точка<br /><span className="bg-gradient-to-r from-amber-200 via-amber-400 to-amber-700 bg-clip-text text-transparent">перед редизайном</span></h1><p className="mt-7 max-w-3xl text-lg leading-relaxed text-white/52">Здесь собран текущий визуальный язык игры: тёмная телеигра, янтарное стекло, две цветовые команды и полный путь от выбора ролей до Большой игры. Страница фиксирует то, от чего мы будем осознанно уходить или что решим сохранить.</p></div>
            <div className={`${glassStrong} rounded-[24px] p-6`}><div className="grid grid-cols-2 gap-5"><div><b className="block text-4xl text-amber-200">4</b><span className="text-sm text-white/40">новых направления</span></div><div><b className="block text-4xl text-amber-200">13</b><span className="text-sm text-white/40">экранов baseline</span></div></div><div className="mt-6 flex gap-2"><a href="#directions" className={`${accent} flex-1 rounded-[14px] px-4 py-3 text-center text-sm font-extrabold`}>4 направления</a><a href="#phone" className={`${glass} flex-1 rounded-[14px] px-4 py-3 text-center text-sm font-bold text-white/70`}>Старый дизайн</a></div></div>
          </div>
        </div>
      </section>

      <HundredToOneConceptGallery />

      <section id="phone" className="px-5 py-20 sm:px-10 lg:px-16">
        <div className="mx-auto max-w-[1500px]"><SectionHeader eyebrow="Mobile baseline · 390 × 844" title="Телефоны игроков и ведущего" copy="Семь ключевых состояний старого mobile-flow. Макеты статичны, чтобы композицию, плотность и иерархию можно было сравнивать без влияния игровой логики." /><div className="grid items-start gap-x-8 gap-y-14 md:grid-cols-2 xl:grid-cols-3">{phoneScreens.map(screen => <article key={screen.id}><div className="mb-4 flex items-center gap-3"><span className="font-mono text-xs font-bold text-amber-300/70">{screen.number}</span><span className="h-px flex-1 bg-white/10" /><span className="text-xs text-white/35">{screen.title} · {screen.role}</span></div><PhoneShell title={`${screen.title} · ${screen.role}`}><PhoneScreen id={screen.id} /></PhoneShell></article>)}</div></div>
      </section>

      <section id="tv" className="border-t border-white/8 bg-white/[.018] px-5 py-20 sm:px-10 lg:px-16">
        <div className="mx-auto max-w-[1500px]"><SectionHeader eyebrow="TV baseline · 1920 × 1080" title="Общий игровой экран" copy="Шесть TV-состояний фиксируют старую сценографию: подготовку команд, заставку, буззер, основной раунд, Большую игру и финал." /><div className="space-y-16">{tvScreens.map(screen => <article key={screen.id}><div className="mb-4 flex items-center gap-3"><span className="font-mono text-xs font-bold text-amber-300/70">TV {screen.number}</span><span className="h-px flex-1 bg-white/10" /><span className="text-xs text-white/35">{screen.title}</span></div><TvShell title={screen.title}><TvScreen id={screen.id} /></TvShell></article>)}</div></div>
      </section>

      <footer className="border-t border-white/8 px-5 py-10 text-center font-mono text-[11px] uppercase tracking-[.17em] text-white/28">100 к 1 · исходный визуальный baseline · preview only</footer>
    </main>
  );
}
