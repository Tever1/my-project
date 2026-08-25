import Image from 'next/image';
import type { ReactNode } from 'react';
import { QuizConceptGallery } from './QuizConceptGallery';
import { QuizPulseScreenGallery } from './QuizPulseScreenGallery';

const phoneScreens = [
  { id: 'waiting', number: '01', title: 'Ожидание', role: 'Ведущий' },
  { id: 'countdown', number: '02', title: 'Отсчёт', role: 'Все игроки' },
  { id: 'question', number: '03', title: 'Вопрос', role: 'Игрок' },
  { id: 'answered', number: '04', title: 'Ответ принят', role: 'Игрок' },
  { id: 'reveal', number: '05', title: 'Разбор ответа', role: 'Ведущий' },
  { id: 'leaderboard', number: '06', title: 'Промежуточные итоги', role: 'Все игроки' },
  { id: 'final', number: '07', title: 'Финал', role: 'Ведущий' },
] as const;

const tvScreens = [
  { id: 'waiting', number: '01', title: 'Ожидание' },
  { id: 'countdown', number: '02', title: 'Отсчёт' },
  { id: 'question', number: '03', title: 'Вопрос' },
  { id: 'reveal', number: '04', title: 'Правильный ответ' },
  { id: 'leaderboard', number: '05', title: 'Промежуточные итоги' },
  { id: 'final', number: '06', title: 'Финал' },
] as const;

type PhoneScreenId = (typeof phoneScreens)[number]['id'];
type TvScreenId = (typeof tvScreens)[number]['id'];

const options = ['Венера', 'Марс', 'Юпитер', 'Меркурий'];
const scores = [
  { name: 'Катя', score: 7 },
  { name: 'Лёша', score: 6 },
  { name: 'Аня', score: 5 },
  { name: 'Рома', score: 3 },
];

const surface =
  'relative overflow-hidden bg-[radial-gradient(70%_55%_at_20%_5%,rgba(126,34,206,.42),transparent_72%),radial-gradient(60%_55%_at_88%_12%,rgba(59,130,246,.24),transparent_70%),linear-gradient(145deg,#17102d_0%,#21143d_42%,#11162d_100%)] text-white';
const glass = 'border border-white/10 bg-white/[.06] backdrop-blur-xl';
const glassStrong = 'border border-white/15 bg-white/[.09] shadow-[0_24px_70px_-34px_rgba(0,0,0,.9)] backdrop-blur-2xl';
const primary = 'bg-gradient-to-r from-purple-600 to-violet-500 shadow-[0_16px_40px_-16px_rgba(147,51,234,.8)]';

function Ambient() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute -left-[14%] top-[4%] h-[42%] w-[62%] rounded-full bg-purple-500/[.12] blur-3xl" />
      <div className="absolute -right-[18%] top-[18%] h-[48%] w-[64%] rounded-full bg-blue-500/[.10] blur-3xl" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.018)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.018)_1px,transparent_1px)] bg-[size:32px_32px]" />
    </div>
  );
}

function QuizMark({ large = false }: { large?: boolean }) {
  return (
    <span className={`${primary} inline-flex items-center justify-center ${large ? 'h-24 w-24 rounded-[26px]' : 'h-10 w-10 rounded-[12px]'}`}>
      <Image src="/icons/games/quiz.png" alt="" width={large ? 62 : 28} height={large ? 62 : 28} className="object-contain" />
    </span>
  );
}

function Brand({ tv = false }: { tv?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <QuizMark />
      <div className={`${tv ? 'text-2xl' : 'text-base'} font-extrabold leading-none`}>
        Квиз
        <span className="mt-1 block font-mono text-[8px] font-medium uppercase tracking-[.18em] text-white/35">Party Hub</span>
      </div>
    </div>
  );
}

function Avatar({ name }: { name: string }) {
  return <span className="flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-white/10 text-[10px] font-black">{name[0]}</span>;
}

function StatusChip({ children }: { children: ReactNode }) {
  return <span className={`${glass} rounded-full px-3 py-1.5 font-mono text-[9px] font-bold uppercase tracking-[.12em] text-white/55`}>{children}</span>;
}

function PhoneHeader() {
  return (
    <>
      <div className="flex items-center justify-between px-1 text-[10px] font-bold text-white/75"><span>9:41</span><span>● ◒ ▰</span></div>
      <div className="mt-5 flex items-center justify-between"><Brand /><StatusChip>A7QX</StatusChip></div>
    </>
  );
}

function PrimaryButton({ children }: { children: ReactNode }) {
  return <div className={`${primary} flex h-13 items-center justify-center rounded-[14px] text-sm font-extrabold`}>{children}</div>;
}

function PhoneShell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-[390px]">
      <div className="mb-3 flex items-end justify-between font-mono text-[10px] uppercase tracking-[.16em] text-white/45"><b className="text-white/70">{title}</b><span>390 × 844</span></div>
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

function ConfigBadges() {
  return (
    <div className="flex justify-center gap-2">
      <span className={`${glass} inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-[10px] font-semibold`}>◆ Средняя</span>
      <span className={`${glass} rounded-md px-3 py-2 text-[10px] font-semibold`}>🔬 Наука</span>
    </div>
  );
}

function QuestionOptions({ selected, reveal, tv = false }: { selected?: number; reveal?: boolean; tv?: boolean }) {
  return (
    <div className={`grid ${tv ? 'grid-cols-2 gap-3' : 'grid-cols-1 gap-2.5'}`}>
      {options.map((option, index) => {
        const correct = reveal && index === 1;
        const wrong = reveal && selected === index && index !== 1;
        const chosen = selected === index && !reveal;
        return (
          <div
            key={option}
            className={`relative flex items-center overflow-hidden rounded-md border ${tv ? 'min-h-16 px-5 py-3' : 'min-h-13 px-3 py-2.5'} ${
              correct ? 'border-green-400/35 bg-green-500/[.12]' : wrong ? 'border-red-400/35 bg-red-500/[.12]' : chosen ? 'border-yellow-300/45 bg-yellow-400/[.12]' : 'border-white/10 bg-white/[.055]'
            }`}
          >
            {(correct || wrong || chosen) && <span className={`absolute inset-y-0 left-0 w-1.5 ${correct ? 'bg-green-400' : wrong ? 'bg-red-400' : 'bg-yellow-300'}`} />}
            <span className={`flex flex-none items-center justify-center rounded-lg font-black ${tv ? 'h-10 w-10 text-base' : 'h-8 w-8 text-xs'} ${correct ? 'bg-green-500/20 text-green-300' : wrong ? 'bg-red-500/20 text-red-300' : chosen ? 'bg-yellow-500/20 text-yellow-200' : 'bg-white/[.08] text-white/45'}`}>{correct ? '✓' : index + 1}</span>
            <b className={`${tv ? 'ml-4 text-lg' : 'ml-3 text-sm'} ${correct ? 'text-green-100' : wrong ? 'text-red-100' : ''}`}>{option}</b>
            {wrong && <span className="ml-auto text-lg text-red-300">×</span>}
          </div>
        );
      })}
    </div>
  );
}

function Scoreboard({ final = false, tv = false }: { final?: boolean; tv?: boolean }) {
  return (
    <div className={`mx-auto w-full ${tv ? 'max-w-3xl space-y-3' : 'space-y-2.5'}`}>
      {scores.map((entry, index) => (
        <div key={entry.name} className={`${glassStrong} flex items-center justify-between rounded-md ${tv ? 'px-7 py-4' : 'px-4 py-3'} ${index === 0 ? 'border-yellow-300/40 bg-yellow-400/[.14]' : ''}`}>
          <div className="flex items-center gap-3"><span className={tv ? 'text-2xl' : 'text-lg'}>{index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '4.'}</span><Avatar name={entry.name} /><b className={tv ? 'text-xl' : 'text-sm'}>{entry.name}</b>{final && index === 0 && <span className="text-[9px] text-yellow-200">ПОБЕДИТЕЛЬ</span>}</div>
          <b className={`${tv ? 'text-3xl' : 'text-xl'} text-purple-300`}>{entry.score}</b>
        </div>
      ))}
    </div>
  );
}

function WaitingPhone() {
  return <><PhoneHeader /><div className="flex flex-1 flex-col items-center justify-center text-center"><QuizMark large /><h2 className="mt-5 text-4xl font-black">Квиз</h2><div className="mt-5"><ConfigBadges /></div><p className="mt-6 text-sm text-white/80">10 вопросов. 1 очко за правильный ответ!</p><p className="mt-2 text-xs text-white/45">Игроков: 4</p></div><PrimaryButton>Начать игру</PrimaryButton></>;
}

function CountdownPhone() {
  return <><PhoneHeader /><div className="flex flex-1 flex-col items-center justify-center text-center"><span className="text-sm text-white/45">Вопрос 3</span><b className="mt-4 text-[118px] font-black leading-none text-yellow-300 drop-shadow-[0_0_36px_rgba(250,204,21,.55)]">2</b><p className="mt-5 font-mono text-[10px] uppercase tracking-[.22em] text-white/35">Приготовьтесь</p></div></>;
}

function QuestionPhone({ selected, reveal }: { selected?: number; reveal?: boolean }) {
  return <><PhoneHeader /><div className="mt-5 h-2 overflow-hidden rounded-full bg-white/10"><div className={`h-full w-[62%] rounded-full ${reveal ? 'bg-green-400' : 'bg-purple-500'}`} /></div><div className="mt-4 flex justify-between text-[10px] text-white/40"><span>Вопрос 3 / 10</span><span>{reveal ? '4/4 ответили' : selected === undefined ? '1/4 ответили' : '3/4 ответили'} · 12 сек</span></div><div className={`${glassStrong} my-5 rounded-[17px] p-4`}><small className="font-mono text-[8px] uppercase tracking-[.16em] text-purple-200/65">Наука · Средняя</small><h3 className="mt-2 text-xl font-extrabold leading-tight">Какая планета Солнечной системы известна как Красная планета?</h3></div><QuestionOptions selected={selected} reveal={reveal} /><div className="mt-auto pt-5 text-center text-[10px] text-white/40">{reveal ? <b className="text-green-300">Правильный ответ: Марс</b> : selected === undefined ? 'Выберите один вариант' : <span>Ответ принят · <b className="text-yellow-200">ждём остальных</b></span>}</div>{reveal && <div className="mt-4"><PrimaryButton>Следующий вопрос</PrimaryButton></div>}</>;
}

function LeaderboardPhone({ final = false }: { final?: boolean }) {
  return <><PhoneHeader /><div className="mt-7 text-center"><div className="text-5xl">{final ? '🏆' : '📊'}</div><h2 className="mt-3 text-2xl font-black">{final ? 'Итоги' : 'Промежуточные результаты'}</h2><p className="mt-2 text-xs text-white/45">{final ? 'Наука · Средняя' : 'После 5 из 10 вопросов'}</p></div><div className="mt-6"><Scoreboard final={final} /></div><div className="mt-auto">{final ? <div className="space-y-2"><PrimaryButton>Играть снова</PrimaryButton><div className={`${glass} rounded-[14px] py-3 text-center text-xs font-bold`}>В лобби</div></div> : <PrimaryButton>Продолжить</PrimaryButton>}</div></>;
}

function PhoneScreen({ id }: { id: PhoneScreenId }) {
  if (id === 'waiting') return <WaitingPhone />;
  if (id === 'countdown') return <CountdownPhone />;
  if (id === 'question') return <QuestionPhone />;
  if (id === 'answered') return <QuestionPhone selected={2} />;
  if (id === 'reveal') return <QuestionPhone selected={2} reveal />;
  if (id === 'leaderboard') return <LeaderboardPhone />;
  return <LeaderboardPhone final />;
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

function TvHeader({ question = false, reveal = false }: { question?: boolean; reveal?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-5">
      <Brand tv />
      {question && <div className="flex items-center gap-2">{scores.map((entry, index) => <div key={entry.name} className={`${glass} flex items-center gap-2 rounded-md px-3 py-2 ${reveal ? index < 2 ? 'border-green-400/35 bg-green-500/[.10]' : 'border-red-400/25 bg-red-500/[.08]' : ''}`}><span className="text-[10px]">{index + 1}.</span><b className="text-xs">{entry.name}</b><strong className="text-sm text-purple-300">{entry.score}</strong></div>)}</div>}
      <div className="flex items-center gap-5 text-white/55">{question && <><span className="text-sm">Ответили: {reveal ? '4/4' : '1/4'}</span><span className="text-sm">3 / 10</span><b className="text-3xl text-white">12</b></>} {!question && <StatusChip>4 игрока</StatusChip>}</div>
    </div>
  );
}

function WaitingTv() {
  return <><TvHeader /><div className="flex flex-1 flex-col items-center justify-center text-center"><QuizMark large /><h2 className="mt-5 text-6xl font-black">Квиз</h2><p className="mt-3 text-xl text-white/45">Ожидаем начала игры</p><div className="mt-7 scale-125"><ConfigBadges /></div><p className="mt-8 text-xl text-white/80">10 вопросов · 1 очко за правильный ответ · Игроков: 4</p></div><div className="text-center text-sm text-white/40">Ведущий начнёт игру со своего телефона</div></>;
}

function CountdownTv() {
  return <><TvHeader question /><div className="flex flex-1 flex-col items-center justify-center text-center"><span className="text-xl text-white/45">Вопрос 3</span><b className="mt-3 text-[180px] font-black leading-none text-yellow-300 drop-shadow-[0_0_50px_rgba(250,204,21,.55)]">2</b></div></>;
}

function QuestionTv({ reveal = false }: { reveal?: boolean }) {
  return <><TvHeader question reveal={reveal} /><div className="flex flex-1 flex-col justify-end"><div className={`${glassStrong} mx-auto w-[82%] rounded-[18px] px-8 py-5 text-center`}><small className="font-mono text-[9px] uppercase tracking-[.16em] text-purple-200/60">Наука · Средняя</small><h3 className="mt-2 text-3xl font-black">Какая планета Солнечной системы известна как Красная планета?</h3></div><div className="mx-auto mt-4 h-3 w-[82%] overflow-hidden rounded-full bg-white/10"><div className={`h-full w-[62%] rounded-full ${reveal ? 'bg-green-400' : 'bg-purple-500'}`} /></div><div className="mx-auto mt-4 w-[82%]"><QuestionOptions reveal={reveal} tv /></div></div><div className="mt-5 text-center text-sm text-white/40">{reveal ? <b className="text-green-300">Правильный ответ: Марс · ответили верно: Катя и Лёша</b> : 'Игроки отвечают на своих телефонах'}</div></>;
}

function LeaderboardTv({ final = false }: { final?: boolean }) {
  return <><TvHeader /><div className="flex flex-1 flex-col items-center justify-center text-center"><div className="text-7xl">{final ? '🏆' : '📊'}</div><h2 className="mt-3 text-5xl font-black">{final ? 'Итоги' : 'Промежуточные результаты'}</h2><p className="mt-2 text-lg text-white/45">{final ? 'Квиз завершён · Наука · Средняя' : 'После 5 из 10 вопросов'}</p><div className="mt-7 w-full"><Scoreboard final={final} tv /></div></div></>;
}

function TvScreen({ id }: { id: TvScreenId }) {
  if (id === 'waiting') return <WaitingTv />;
  if (id === 'countdown') return <CountdownTv />;
  if (id === 'question') return <QuestionTv />;
  if (id === 'reveal') return <QuestionTv reveal />;
  if (id === 'leaderboard') return <LeaderboardTv />;
  return <LeaderboardTv final />;
}

function SectionIntro({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return <div className="max-w-4xl"><p className="font-mono text-xs font-bold uppercase tracking-[.22em] text-purple-300/70">{eyebrow}</p><h2 className="mt-3 text-4xl font-black tracking-[-.04em] sm:text-6xl">{title}</h2><p className="mt-5 text-base leading-relaxed text-white/45 sm:text-lg">{description}</p></div>;
}

export default function QuizDesignPreviewPage() {
  return (
    <main className="min-h-screen bg-[#090711] text-white">
      <section className="relative overflow-hidden border-b border-white/8 px-5 pb-20 pt-16 sm:px-10 lg:px-16">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(50%_80%_at_85%_0%,rgba(126,34,206,.22),transparent_72%),radial-gradient(45%_70%_at_8%_8%,rgba(59,130,246,.14),transparent_76%)]" />
        <div className="relative mx-auto max-w-[1500px]">
          <div className="flex flex-wrap items-center gap-3 font-mono text-[11px] uppercase tracking-[.18em] text-white/40"><span className="rounded-full border border-purple-300/25 bg-purple-400/[.08] px-4 py-2 text-purple-200">Old design baseline</span><span>13 исходных состояний</span><span>·</span><span>без игровой логики</span></div>
          <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_420px] lg:items-end">
            <div><p className="font-mono text-sm font-bold uppercase tracking-[.24em] text-purple-300/70">Квиз · Старый дизайн</p><h1 className="mt-4 max-w-5xl text-5xl font-black leading-[.94] tracking-[-.055em] sm:text-7xl lg:text-[92px]">Отправная точка<br /><span className="bg-gradient-to-r from-purple-200 via-violet-400 to-blue-400 bg-clip-text text-transparent">перед редизайном</span></h1><p className="mt-7 max-w-3xl text-lg leading-relaxed text-white/50">Фиксируем текущий язык Квиза: тёмный фиолетовый фон, glass-карточки, цветовые состояния ответа, общий таймер и классическую таблицу лидеров.</p></div>
            <div className={`${glassStrong} rounded-[24px] p-6`}><div className="grid grid-cols-2 gap-5"><div><b className="block text-4xl text-purple-200">1</b><span className="text-sm text-white/40">выбранный дизайн</span></div><div><b className="block text-4xl text-purple-200">13</b><span className="text-sm text-white/40">новых экранов</span></div></div><div className="mt-6 flex gap-2"><a href="#pulse-screens" className={`${primary} flex-1 rounded-[13px] py-3 text-center text-sm font-bold`}>Все экраны</a><a href="#phone" className={`${glass} flex-1 rounded-[13px] py-3 text-center text-sm font-bold`}>Старый UI</a></div></div>
          </div>
        </div>
      </section>

      <QuizConceptGallery />

      <QuizPulseScreenGallery />

      <section id="phone" className="border-b border-white/8 px-5 py-20 sm:px-10 lg:px-16">
        <div className="mx-auto max-w-[1500px]"><SectionIntro eyebrow="Mobile baseline · 390 × 844" title="Телефон игрока и ведущего" description="Семь ключевых состояний: от старта и выбора ответа до раскрытия правильного варианта и финальной таблицы." /><div className="mt-14 grid gap-x-8 gap-y-16 md:grid-cols-2 xl:grid-cols-3">{phoneScreens.map(screen => <article key={screen.id}><div className="mb-5 flex items-start justify-between"><div><span className="font-mono text-[10px] text-purple-300/55">{screen.number}</span><h3 className="mt-1 text-xl font-extrabold">{screen.title}</h3><p className="mt-1 text-xs text-white/35">{screen.role}</p></div><span className="rounded-full border border-white/8 bg-white/[.035] px-3 py-1.5 font-mono text-[9px] uppercase tracking-[.14em] text-white/35">old UI</span></div><PhoneShell title={`${screen.number} · ${screen.title}`}><PhoneScreen id={screen.id} /></PhoneShell></article>)}</div></div>
      </section>

      <section id="tv" className="px-5 py-20 sm:px-10 lg:px-16">
        <div className="mx-auto max-w-[1500px]"><SectionIntro eyebrow="TV baseline · 1920 × 1080" title="Общий экран" description="Шесть состояний общего экрана фиксируют старую сценографию Квиза: header со счётом, вопрос, варианты, раскрытие и рейтинги." /><div className="mt-14 grid gap-14 xl:grid-cols-2">{tvScreens.map(screen => <article key={screen.id}><div className="mb-5 flex items-start justify-between"><div><span className="font-mono text-[10px] text-purple-300/55">{screen.number}</span><h3 className="mt-1 text-2xl font-extrabold">{screen.title}</h3></div><span className="rounded-full border border-white/8 bg-white/[.035] px-3 py-1.5 font-mono text-[9px] uppercase tracking-[.14em] text-white/35">old UI</span></div><TvShell title={`${screen.number} · ${screen.title}`}><TvScreen id={screen.id} /></TvShell></article>)}</div></div>
      </section>
    </main>
  );
}
