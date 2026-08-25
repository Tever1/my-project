'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { useState, type ReactNode } from 'react';

import {
  ANSWERS,
  PhoneFrame,
  TvFrame,
  SpecialBackdrop,
  cinematic,
  spring,
} from './QuizConceptPrimitives';

const PHONE_SCREENS = [
  { id: 'waiting', number: '01', title: 'Ожидание', role: 'Ведущий' },
  { id: 'countdown', number: '02', title: 'Отсчёт', role: 'Все игроки' },
  { id: 'question', number: '03', title: 'Вопрос', role: 'Игрок' },
  { id: 'answered', number: '04', title: 'Ответ принят', role: 'Игрок' },
  { id: 'reveal', number: '05', title: 'Разбор ответа', role: 'Ведущий' },
  { id: 'leaderboard', number: '06', title: 'Промежуточные итоги', role: 'Все игроки' },
  { id: 'final', number: '07', title: 'Финал', role: 'Ведущий' },
] as const;

const TV_SCREENS = [
  { id: 'waiting', number: '01', title: 'Ожидание' },
  { id: 'countdown', number: '02', title: 'Отсчёт' },
  { id: 'question', number: '03', title: 'Вопрос' },
  { id: 'reveal', number: '04', title: 'Правильный ответ' },
  { id: 'leaderboard', number: '05', title: 'Промежуточные итоги' },
  { id: 'final', number: '06', title: 'Финал' },
] as const;

type PhoneScreenId = (typeof PHONE_SCREENS)[number]['id'];
type TvScreenId = (typeof TV_SCREENS)[number]['id'];
type AnswerState = 'idle' | 'selected' | 'reveal';

const SCORES = [
  { name: 'Анастасия', score: 7 },
  { name: 'Лёша', score: 6 },
  { name: 'Катя', score: 6 },
  { name: 'Рома', score: 5 },
  { name: 'Маша', score: 4 },
  { name: 'Дима', score: 4 },
  { name: 'Оля', score: 3 },
  { name: 'Никита', score: 3 },
  { name: 'Вера', score: 2 },
  { name: 'Саша', score: 1 },
] as const;

function PulseBackdrop({ special }: { special: boolean }) {
  return (
    <>
      <SpecialBackdrop special={special} />
      {!special && (
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_12%,#1859a855,transparent_35%),radial-gradient(circle_at_15%_78%,#0878ff22,transparent_38%),linear-gradient(155deg,#0b2950,#051329_68%)]" />
      )}
      <div className="absolute inset-0 bg-[linear-gradient(105deg,transparent_0_58%,#2d7fc314_58%_59%,transparent_59%_100%)]" />
    </>
  );
}

function Sweep({ reduced, tv = false }: { reduced: boolean; tv?: boolean }) {
  return (
    <motion.div
      aria-hidden
      animate={reduced ? undefined : { x: tv ? ['-120%', '760%'] : ['-150%', '420%'] }}
      transition={{ duration: tv ? 8 : 6, repeat: Infinity, ease: 'linear' }}
      className={`pointer-events-none absolute inset-y-0 left-0 -skew-x-12 bg-gradient-to-r from-transparent via-[#67c7ff]/10 to-transparent ${tv ? 'w-[13%]' : 'w-20'}`}
    />
  );
}

function PhoneHeader({ special, reduced }: { special: boolean; reduced: boolean }) {
  return (
    <div className="relative mt-5 flex items-center justify-between">
      <b className="text-[18px] font-black tracking-[-.055em]">КВИЗ</b>
      <span className="flex items-center gap-1.5 rounded-full border border-white/15 bg-black/20 px-2.5 py-1 text-[7px] font-black uppercase tracking-[.16em]">
        <motion.i animate={reduced ? undefined : { opacity: [1, .2, 1] }} transition={{ duration: 1, repeat: Infinity }} className="h-1.5 w-1.5 rounded-full bg-[#f13e55]" />
        {special ? 'Гарри Поттер' : 'Космос'}
      </span>
    </div>
  );
}

function TvHeader({ special }: { special: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <b className="text-[clamp(17px,2.5vw,35px)] font-black tracking-[-.06em]">КВИЗ</b>
      <div className="relative overflow-hidden rounded-[.8vw] border border-white/20 bg-[#111827]/82 px-[3%] py-[1%] backdrop-blur-md">
        <i className="absolute inset-y-0 left-0 w-[.35vw] bg-[#f13e55]" />
        <span className="text-[clamp(7px,.85vw,12px)] font-black uppercase tracking-[.18em]">{special ? 'Гарри Поттер' : 'Космос'}</span>
      </div>
    </div>
  );
}

function Timer({ reduced, compact = false, finished = false }: { reduced: boolean; compact?: boolean; finished?: boolean }) {
  return (
    <div className="relative overflow-hidden rounded-full bg-white/10">
      <motion.div
        initial={reduced ? false : { width: '100%' }}
        animate={{ width: finished ? '18%' : '62%' }}
        transition={{ duration: reduced ? 0 : 1.4, ease: cinematic }}
        className={`relative overflow-hidden rounded-full ${finished ? 'bg-[#f13e55]' : 'bg-[linear-gradient(90deg,#26a7ff,#61d8ff)]'} ${compact ? 'h-1.5' : 'h-[.6vw] min-h-1.5'}`}
      >
        {!finished && <motion.i animate={reduced ? undefined : { x: ['-100%', '650%'] }} transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }} className="absolute inset-y-0 left-0 w-[18%] bg-white/70 blur-[2px]" />}
      </motion.div>
    </div>
  );
}

function AnswerGrid({ state, compact = false, reduced, special }: { state: AnswerState; compact?: boolean; reduced: boolean; special: boolean }) {
  return (
    <div className={compact ? 'grid gap-2' : 'grid grid-cols-2 gap-[2.2%]'}>
      {ANSWERS.map(([letter, answer], index) => {
        const selected = index === 2 && state !== 'idle';
        const correct = index === 2 && state === 'reveal';
        return (
          <motion.div
            key={letter}
            initial={reduced ? false : { opacity: 0, x: compact ? 18 : index % 2 ? 22 : -22 }}
            animate={{ opacity: 1, x: 0, scale: correct && !reduced ? [1, 1.025, 1] : 1 }}
            transition={{ opacity: { duration: .35, delay: index * .06 }, x: { ...spring, delay: index * .06 }, scale: { duration: 1.6, repeat: correct ? Infinity : 0 } }}
            className={`relative flex items-center overflow-hidden border text-white ${compact ? 'min-h-12 rounded-xl px-3 py-2' : 'min-h-[3.1vw] rounded-[1vw] px-[3.5%] py-[1.7%]'} ${correct ? 'border-[#4de19d]/70 bg-[#126b50]/92 shadow-[0_0_28px_rgba(77,225,157,.24)]' : selected ? 'border-[#61d8ff]/65 bg-[#164a72]/92' : special ? 'border-white/20 bg-[#111827]/82 backdrop-blur-md' : 'border-[#5d85bb]/35 bg-[#102c54]/92'}`}
          >
            <span className={`flex shrink-0 items-center justify-center rounded-lg bg-white/10 font-black ${compact ? 'h-8 w-8 text-xs' : 'h-[2vw] w-[2vw] text-[clamp(8px,.85vw,12px)]'} ${selected ? 'text-white' : 'text-[#8fbfff]'}`}>{letter}</span>
            <b className={`ml-[4%] leading-tight ${compact ? 'text-xs' : 'text-[clamp(9px,1.1vw,16px)]'}`}>{answer}</b>
            {correct && <span className={`ml-auto font-black text-[#8effc8] ${compact ? 'text-[9px]' : 'text-[clamp(7px,.8vw,11px)]'}`}>ВЕРНО</span>}
          </motion.div>
        );
      })}
    </div>
  );
}

function PhoneQuestion({ state, reduced, special }: { state: AnswerState; reduced: boolean; special: boolean }) {
  const panel = special ? 'border-white/20 bg-[#111827]/82 backdrop-blur-md' : 'border-[#4e7db7]/28 bg-[#0b2345]/88';
  return (
    <>
      <PhoneHeader special={special} reduced={reduced} />
      <div className={`relative mt-5 rounded-[18px] border p-4 ${panel}`}>
        <div className="flex items-center justify-between text-[8px] font-black uppercase tracking-[.15em] text-[#8fbfff]"><span>Вопрос 07</span><span className="text-white">12 сек</span></div>
        <div className="mt-2"><Timer reduced={reduced} compact finished={state === 'reveal'} /></div>
        <h4 className="mt-4 text-[19px] font-black leading-[1.08] tracking-[-.035em]">Какая планета самая большая в Солнечной системе?</h4>
      </div>
      <div className="relative mt-3"><AnswerGrid state={state} compact reduced={reduced} special={special} /></div>
      <div className="absolute inset-x-4 bottom-8 z-20">
        {state === 'idle' && <p className="text-center text-[9px] font-bold uppercase tracking-[.13em] text-white/45">Выберите один ответ</p>}
        {state === 'selected' && <div className="flex items-center justify-between rounded-[13px] bg-[#f13e55] px-3 py-2.5 shadow-[0_12px_30px_-15px_#f13e55]"><span className="text-[8px] font-black uppercase tracking-[.13em]">Ответ принят</span><b className="text-[11px]">+ 1 ОЧКО</b></div>}
        {state === 'reveal' && <motion.div initial={reduced ? false : { y: 14, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="flex items-center justify-between rounded-[13px] bg-[#126b50] px-3 py-2.5"><span className="text-[8px] font-black uppercase tracking-[.13em]">Правильно</span><b className="text-[11px]">+ 1 ОЧКО</b></motion.div>}
      </div>
    </>
  );
}

function RankRows({ final = false, compact = false }: { final?: boolean; compact?: boolean }) {
  return (
    <div className={compact ? 'grid grid-cols-1 gap-1.5' : 'mx-auto grid w-[86%] grid-cols-2 gap-x-[2%] gap-y-[1.1%]'}>
      {SCORES.map((entry, index) => (
        <div
          key={entry.name}
          className={`flex min-w-0 items-center border ${compact ? 'rounded-lg px-2.5 py-1.5' : 'rounded-[.8vw] px-[3%] py-[.55%]'} ${index === 0 ? 'border-[#61d8ff]/55 bg-[#164a72]/92 shadow-[0_0_28px_rgba(38,167,255,.16)]' : 'border-white/15 bg-[#111827]/82 backdrop-blur-md'}`}
        >
          <span className={`mr-1 shrink-0 font-black text-[#8fbfff] ${compact ? 'w-5 text-[9px]' : 'w-[8%] text-[clamp(9px,1vw,14px)]'}`}>{index + 1}</span>
          <b className={`truncate ${compact ? 'text-[9px]' : 'text-[clamp(9px,1.05vw,15px)]'}`}>{entry.name}</b>
          {final && index === 0 && !compact && <span className="ml-3 rounded-full bg-[#f13e55] px-[1.5%] py-[.5%] text-[clamp(6px,.6vw,8px)] font-black uppercase">Победитель</span>}
          <strong className={`ml-auto pl-1 text-[#65c8ff] ${compact ? 'text-base' : 'text-[clamp(15px,1.45vw,21px)]'}`}>{entry.score}</strong>
        </div>
      ))}
    </div>
  );
}

function PhoneWaiting({ reduced, special }: { reduced: boolean; special: boolean }) {
  return <><PhoneHeader special={special} reduced={reduced} /><div className="relative flex flex-1 flex-col items-center justify-center text-center"><h3 className="text-4xl font-black">Квиз</h3><div className="mt-5 flex flex-wrap justify-center gap-2"><span className="rounded-lg border border-white/15 bg-white/[.08] px-3 py-2 text-[10px] font-bold">Средняя</span><span className="rounded-lg border border-white/15 bg-white/[.08] px-3 py-2 text-[10px] font-bold">{special ? 'Гарри Поттер' : 'Космос'}</span></div><p className="mt-7 text-sm font-bold text-white/85">10 вопросов. 1 очко<br />за правильный ответ!</p><p className="mt-3 text-xs text-white/48">Игроков: 10</p></div><div className="relative rounded-[14px] bg-[#f13e55] py-3 text-center text-sm font-black shadow-[0_12px_30px_-15px_#f13e55]">НАЧАТЬ ИГРУ</div></>;
}

function PhoneCountdown({ reduced, special }: { reduced: boolean; special: boolean }) {
  return <><PhoneHeader special={special} reduced={reduced} /><div className="flex flex-1 flex-col items-center justify-center"><span className="text-[10px] font-black uppercase tracking-[.18em] text-[#8fbfff]">Вопрос 07</span><motion.b initial={reduced ? false : { scale: .5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={spring} className="mt-4 text-[132px] font-black leading-none text-white drop-shadow-[0_0_40px_rgba(38,167,255,.6)]">3</motion.b><p className="mt-5 text-[10px] font-black uppercase tracking-[.2em] text-white/45">Приготовьтесь</p></div></>;
}

function PhoneLeaderboard({ final, reduced, special }: { final: boolean; reduced: boolean; special: boolean }) {
  return <><PhoneHeader special={special} reduced={reduced} /><div className="relative mt-6 text-center"><h3 className="text-2xl font-black">{final ? 'Победа!' : 'Таблица лидеров'}</h3><p className="mt-2 text-[10px] uppercase tracking-[.12em] text-white/45">{final ? 'Квиз завершён · 10 игроков' : 'После 7 из 10 вопросов · 10 игроков'}</p></div><div className="relative mt-5"><RankRows final={final} compact /></div><div className="relative mt-auto rounded-[14px] bg-[#f13e55] py-3 text-center text-sm font-black">{final ? 'ИГРАТЬ СНОВА' : 'ПРОДОЛЖИТЬ'}</div></>;
}

function PhoneScreen({ id, reduced, special }: { id: PhoneScreenId; reduced: boolean; special: boolean }) {
  if (id === 'waiting') return <PhoneWaiting reduced={reduced} special={special} />;
  if (id === 'countdown') return <PhoneCountdown reduced={reduced} special={special} />;
  if (id === 'question') return <PhoneQuestion state="idle" reduced={reduced} special={special} />;
  if (id === 'answered') return <PhoneQuestion state="selected" reduced={reduced} special={special} />;
  if (id === 'reveal') return <PhoneQuestion state="reveal" reduced={reduced} special={special} />;
  return <PhoneLeaderboard final={id === 'final'} reduced={reduced} special={special} />;
}

function TvQuestion({ reveal, reduced, special }: { reveal: boolean; reduced: boolean; special: boolean }) {
  const panel = special ? 'border-white/20 bg-[#111827]/82 backdrop-blur-md' : 'border-[#4e7db7]/28 bg-[#0b2345]/88';
  return <><TvHeader special={special} /><div className={`mt-[2%] flex min-h-0 flex-1 flex-col rounded-[1.5vw] border p-[2.5%] ${panel}`}><div className="flex items-center justify-between text-[clamp(8px,.9vw,13px)] font-black uppercase tracking-[.18em] text-[#8fbfff]"><span>Вопрос 07</span><span className="text-white">{reveal ? 'Все ответили' : '12 секунд'}</span></div><div className="mt-[1%]"><Timer reduced={reduced} finished={reveal} /></div><h4 className="mt-[1.7%] max-w-[86%] text-[clamp(17px,2vw,28px)] font-black leading-[1.02] tracking-[-.04em]">Какая планета самая большая в Солнечной системе?</h4><div className="mt-auto"><AnswerGrid state={reveal ? 'reveal' : 'idle'} reduced={reduced} special={special} /></div></div></>;
}

function TvWaiting({ special }: { special: boolean }) {
  return <><TvHeader special={special} /><div className="flex flex-1 flex-col items-center justify-center text-center"><h3 className="text-[clamp(22px,2.5vw,36px)] font-black">Игра скоро начнётся</h3><p className="mt-[1.2%] text-[clamp(9px,1vw,14px)] text-white/55">10 вопросов · 10 игроков · {special ? 'Гарри Поттер' : 'Космос'}</p></div><p className="text-center text-[clamp(7px,.8vw,12px)] uppercase tracking-[.16em] text-white/40">Ведущий запускает игру</p></>;
}

function TvCountdown({ reduced, special }: { reduced: boolean; special: boolean }) {
  return <><TvHeader special={special} /><div className="flex flex-1 flex-col items-center justify-center"><span className="text-[clamp(9px,1vw,14px)] font-black uppercase tracking-[.2em] text-[#8fbfff]">Вопрос 07</span><motion.b initial={reduced ? false : { scale: .45, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={spring} className="mt-[.5%] text-[clamp(82px,9vw,128px)] font-black leading-none drop-shadow-[0_0_4vw_rgba(38,167,255,.65)]">3</motion.b><p className="mt-[.5%] text-[clamp(7px,.8vw,12px)] font-black uppercase tracking-[.22em] text-white/42">Приготовьтесь</p></div></>;
}

function TvLeaderboard({ final, reduced, special }: { final: boolean; reduced: boolean; special: boolean }) {
  return <><TvHeader special={special} /><div className="mt-[2%] flex min-h-0 flex-1 flex-col items-center"><motion.h3 initial={reduced ? false : { y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={spring} className="text-[clamp(20px,1.9vw,27px)] font-black">{final ? 'Победитель определён' : 'Таблица лидеров'}</motion.h3><p className="mt-[.3%] text-[clamp(7px,.8vw,11px)] uppercase tracking-[.16em] text-white/42">{final ? 'Квиз завершён' : 'После 7 из 10 вопросов'}</p><div className="mt-[1.2%] w-full"><RankRows final={final} /></div></div></>;
}

function TvScreen({ id, reduced, special }: { id: TvScreenId; reduced: boolean; special: boolean }) {
  if (id === 'waiting') return <TvWaiting special={special} />;
  if (id === 'countdown') return <TvCountdown reduced={reduced} special={special} />;
  if (id === 'question') return <TvQuestion reveal={false} reduced={reduced} special={special} />;
  if (id === 'reveal') return <TvQuestion reveal reduced={reduced} special={special} />;
  return <TvLeaderboard final={id === 'final'} reduced={reduced} special={special} />;
}

function ScreenLabel({ number, title, role }: { number: string; title: string; role?: string }) {
  return <div className="mb-5 flex items-start justify-between"><div><span className="font-mono text-[10px] text-[#65c8ff]/65">{number}</span><h3 className="mt-1 text-xl font-extrabold text-white">{title}</h3>{role && <p className="mt-1 text-xs text-white/35">{role}</p>}</div><span className="rounded-full border border-[#65c8ff]/20 bg-[#0878ff]/10 px-3 py-1.5 font-mono text-[9px] uppercase tracking-[.14em] text-[#8fd6ff]">Пульс эфира</span></div>;
}

function PulsePhoneFrame({ children, special, reduced }: { children: ReactNode; special: boolean; reduced: boolean }) {
  return <PhoneFrame className={`${special ? 'bg-[#111827]' : 'bg-[#06172e]'} font-sans text-white`}><PulseBackdrop special={special} /><Sweep reduced={reduced} />{children}</PhoneFrame>;
}

function PulseTvFrame({ children, special, reduced }: { children: ReactNode; special: boolean; reduced: boolean }) {
  return <TvFrame className={`${special ? 'bg-[#111827]' : 'bg-[#06172e]'} font-sans text-white`}><PulseBackdrop special={special} /><Sweep reduced={reduced} tv /><div className="relative flex h-full flex-col px-[3.5%] py-[2.5%]">{children}</div></TvFrame>;
}

export function QuizPulseScreenGallery() {
  const [special, setSpecial] = useState(false);
  const reduced = Boolean(useReducedMotion());

  return (
    <section id="pulse-screens" className="border-b border-white/8 bg-[#070d19] px-5 py-20 sm:px-10 lg:px-16">
      <div className="mx-auto max-w-[1500px]">
        <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
          <div className="max-w-4xl"><p className="font-mono text-xs font-bold uppercase tracking-[.24em] text-[#65c8ff]/70">Выбранный дизайн · Полный сценарий</p><h2 className="mt-3 text-4xl font-black tracking-[-.04em] text-white sm:text-6xl">Пульс эфира — все экраны</h2><p className="mt-5 text-base leading-relaxed text-white/48 sm:text-lg">Тринадцать ключевых состояний для телефона и общего TV-экрана. Общий квиз использует новый фон, специальный сохраняет изображение своей темы.</p></div>
          <div className="rounded-[18px] border border-white/10 bg-white/[.05] p-1.5"><div className="grid grid-cols-2 gap-1"><button type="button" onClick={() => setSpecial(false)} className={`rounded-[13px] px-5 py-3 text-left transition-colors ${!special ? 'bg-white text-[#07111f]' : 'text-white/55 hover:bg-white/[.05]'}`}><b className="block text-sm">Общий квиз</b><small className="text-[10px] opacity-60">тема «Космос»</small></button><button type="button" onClick={() => setSpecial(true)} className={`rounded-[13px] px-5 py-3 text-left transition-colors ${special ? 'bg-white text-[#07111f]' : 'text-white/55 hover:bg-white/[.05]'}`}><b className="block text-sm">Специальный</b><small className="text-[10px] opacity-60">«Гарри Поттер»</small></button></div></div>
        </div>

        <div className="mt-14"><div className="mb-10"><p className="font-mono text-[11px] font-bold uppercase tracking-[.22em] text-[#65c8ff]/65">Mobile · 390 × 844</p><h3 className="mt-2 text-3xl font-black text-white">Телефон игрока и ведущего</h3></div><div className="grid gap-x-8 gap-y-16 md:grid-cols-2 xl:grid-cols-3">{PHONE_SCREENS.map(screen => <article key={screen.id}><ScreenLabel number={screen.number} title={screen.title} role={screen.role} /><PulsePhoneFrame special={special} reduced={reduced}><PhoneScreen id={screen.id} special={special} reduced={reduced} /></PulsePhoneFrame></article>)}</div></div>

        <div className="mt-24"><div className="mb-10"><p className="font-mono text-[11px] font-bold uppercase tracking-[.22em] text-[#65c8ff]/65">TV · 1920 × 1080</p><h3 className="mt-2 text-3xl font-black text-white">Общий экран</h3></div><div className="grid gap-14 xl:grid-cols-2">{TV_SCREENS.map(screen => <article key={screen.id}><ScreenLabel number={screen.number} title={screen.title} /><PulseTvFrame special={special} reduced={reduced}><TvScreen id={screen.id} special={special} reduced={reduced} /></PulseTvFrame></article>)}</div></div>
      </div>
    </section>
  );
}
