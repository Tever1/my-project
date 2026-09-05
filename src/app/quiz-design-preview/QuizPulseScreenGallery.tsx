'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { useState, type ReactNode } from 'react';

import {
  ANSWERS,
  PhoneFrame,
  TvFrame,
  SpecialBackdrop,
  spring,
} from './QuizConceptPrimitives';

const PHONE_SCREENS = [
  { id: 'waiting', number: '01', title: 'Ожидание', role: 'Ведущий' },
  { id: 'countdown', number: '02', title: 'Отсчёт', role: 'Все игроки' },
  { id: 'question', number: '03', title: 'Вопрос', role: 'Игрок' },
  { id: 'answered', number: '04', title: 'Ответ зафиксирован', role: 'Игрок' },
  { id: 'reveal', number: '05', title: 'Итог · правильно', role: 'Игрок' },
  { id: 'incorrect', number: '06', title: 'Итог · неверно', role: 'Игрок' },
  { id: 'leaderboard', number: '07', title: 'Промежуточные итоги', role: 'Все игроки' },
  { id: 'final', number: '08', title: 'Финал', role: 'Ведущий' },
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
type AnswerState = 'idle' | 'selected' | 'reveal-correct' | 'reveal-wrong';
type TvPlayerMode = 'room' | 'answering' | 'reveal';

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

type ScoreEntry = (typeof SCORES)[number];

const RANKING_PREVIEWS = [
  { id: 'large', range: '2–4 игрока', title: 'Крупные строки', scores: SCORES.slice(0, 4) },
  { id: 'medium', range: '5–7 игроков', title: 'Средние строки', scores: SCORES.slice(0, 7) },
] as const;

const ROOM_PLAYERS = [
  { name: 'Анастасия', correct: true },
  { name: 'Лёша', correct: false },
  { name: 'Катя', correct: true },
  { name: 'Рома', correct: false },
  { name: 'Маша', correct: true },
  { name: 'Дима', correct: true },
  { name: 'Оля', correct: false },
  { name: 'Никита', correct: true },
  { name: 'Вера', correct: false },
  { name: 'Саша', correct: true },
] as const;

function playerCountLabel(count: number) {
  return `${count} ${count >= 2 && count <= 4 ? 'игрока' : 'игроков'}`;
}

function PulseBackdrop({ special }: { special: boolean }) {
  return (
    <>
      <SpecialBackdrop special={special} />
      {!special && (
        <>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_12%,#1859a855,transparent_35%),radial-gradient(circle_at_15%_78%,#0878ff22,transparent_38%),linear-gradient(155deg,#0b2950,#051329_68%)]" />
          <div aria-hidden className="quiz-pulse-glow absolute -left-[18%] top-[44%] h-[48%] w-[70%] rounded-full bg-[#0878ff]/14 blur-[70px]" />
        </>
      )}
      <div className="absolute inset-0 bg-[linear-gradient(105deg,transparent_0_58%,#2d7fc314_58%_59%,transparent_59%_100%)]" />
    </>
  );
}

function Sweep({ reduced, tv = false }: { reduced: boolean; tv?: boolean }) {
  return (
    <div
      aria-hidden
      className={`quiz-pulse-sweep pointer-events-none absolute inset-y-0 left-0 bg-gradient-to-r from-transparent via-[#67c7ff]/10 to-transparent ${tv ? 'w-[13%]' : 'w-20'} ${reduced ? 'motion-reduce:hidden' : ''}`}
    />
  );
}

function PhoneHeader({ special, reduced }: { special: boolean; reduced: boolean }) {
  return (
    <div className="relative mt-5 flex items-center justify-between">
      <b className="text-[27px] font-black tracking-[-.055em]">КВИЗ</b>
      <span className="flex items-center gap-1.5 rounded-full border border-white/15 bg-black/20 px-3 py-1.5 text-[10px] font-black uppercase tracking-[.14em]">
        <motion.i animate={reduced ? undefined : { opacity: [1, .2, 1] }} transition={{ duration: 1, repeat: Infinity }} className="h-1.5 w-1.5 rounded-full bg-[#f13e55]" />
        {special ? 'Гарри Поттер' : 'Космос'}
      </span>
    </div>
  );
}

function TvHeader({ special, playerMode }: { special: boolean; playerMode?: TvPlayerMode }) {
  return (
    <div className={playerMode ? 'grid grid-cols-[max-content_minmax(0,1fr)_max-content] items-center gap-[2%]' : 'flex items-center justify-between'}>
      <b className="text-[clamp(17px,2.5vw,35px)] font-black tracking-[-.06em]">КВИЗ</b>
      {playerMode && <TvPlayersPanel mode={playerMode} />}
      <div className="relative w-fit min-w-max justify-self-end overflow-hidden whitespace-nowrap rounded-[.6vw] border border-white/20 bg-[#111827]/82 px-[clamp(9px,1.05vw,15px)] py-[clamp(4.5px,.41vw,6px)] backdrop-blur-md">
        <i className="absolute inset-y-0 left-0 w-[.26vw] bg-[#f13e55]" />
        <span className="text-[clamp(6px,.64vw,9px)] font-black uppercase tracking-[.18em]">{special ? 'Гарри Поттер' : 'Космос'}</span>
      </div>
    </div>
  );
}

function Timer({ reduced, compact = false, finished = false }: { reduced: boolean; compact?: boolean; finished?: boolean }) {
  return (
    <div className="relative overflow-hidden rounded-full bg-white/10">
      <motion.div
        initial={reduced ? false : { scaleX: 1 }}
        animate={{ scaleX: finished ? .18 : .62 }}
        transition={{ duration: reduced ? 0 : 1.4, ease: 'linear' }}
        className={`relative origin-left overflow-hidden rounded-full will-change-transform ${finished ? 'bg-[#f13e55]' : 'bg-[linear-gradient(90deg,#26a7ff,#61d8ff)]'} ${compact ? 'h-[7px]' : 'h-[.6vw] min-h-1.5'}`}
      >
        {!finished && <motion.i animate={reduced ? undefined : { x: ['-100%', '650%'] }} transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }} className="absolute inset-y-0 left-0 w-[18%] bg-white/70 blur-[2px]" />}
      </motion.div>
    </div>
  );
}

function AnswerGrid({ state, compact = false, reduced, special, selectedIndex, onSelect }: { state: AnswerState; compact?: boolean; reduced: boolean; special: boolean; selectedIndex?: number; onSelect?: (index: number) => void }) {
  const revealed = state === 'reveal-correct' || state === 'reveal-wrong';
  const activeSelectedIndex = selectedIndex ?? (state === 'reveal-wrong' ? 1 : 2);
  const editable = state === 'selected' && Boolean(onSelect);

  return (
    <div className={compact ? 'grid gap-2' : 'grid grid-cols-2 gap-[2.2%]'}>
      {ANSWERS.map(([letter, answer], index) => {
        const selected = index === activeSelectedIndex && state !== 'idle';
        const correct = index === 2 && revealed;
        const wrong = selected && state === 'reveal-wrong';
        return (
          <motion.button
            key={letter}
            type="button"
            disabled={!editable}
            aria-pressed={editable ? selected : undefined}
            aria-label={editable ? `Выбрать ответ ${letter}: ${answer}` : undefined}
            onClick={() => onSelect?.(index)}
            initial={reduced ? false : { opacity: 0, x: compact ? 18 : index % 2 ? 22 : -22 }}
            animate={{ opacity: 1, x: 0, scale: correct && !reduced ? [1, 1.025, 1] : selected && !reduced ? [1, .975, 1.012, 1] : 1 }}
            transition={{ opacity: { duration: .25, delay: index * .045 }, x: { ...spring, delay: index * .05 }, scale: correct ? { duration: 1.6, repeat: Infinity } : { duration: .24 } }}
            data-selected={selected}
            data-correct={correct}
            className={`quiz-pulse-answer relative flex w-full items-center overflow-hidden border text-left text-white ${editable ? 'cursor-pointer touch-manipulation' : 'cursor-default'} ${compact ? 'min-h-[53px] rounded-xl px-3 py-2' : 'min-h-[3.1vw] rounded-[1vw] px-[3.5%] py-[1.7%]'} ${correct ? 'border-[#4de19d]/70 bg-[#126b50]/92 shadow-[0_0_28px_rgba(77,225,157,.24)]' : wrong ? 'border-[#ff6d80]/70 bg-[#7f2032]/92 shadow-[0_0_26px_rgba(241,62,85,.2)]' : selected ? 'border-[#61d8ff]/65 bg-[#164a72]/92 shadow-[0_0_24px_rgba(97,216,255,.18)]' : special ? 'border-white/20 bg-[#111827]/82 backdrop-blur-md' : 'border-[#5d85bb]/35 bg-[#102c54]/92'}`}
          >
            <span className={`relative z-10 flex shrink-0 items-center justify-center rounded-lg bg-white/10 font-black ${compact ? 'h-[34px] w-[34px] text-xs' : 'h-[2vw] w-[2vw] text-[clamp(8px,.85vw,12px)]'} ${selected ? 'text-white' : 'text-[#8fbfff]'}`}>{letter}</span>
            <b className={`relative z-10 ml-[4%] leading-tight ${compact ? 'text-[14px]' : 'text-[clamp(9px,1.1vw,16px)]'}`}>{answer}</b>
            {correct && <span className={`relative z-10 ml-auto font-black text-[#8effc8] ${compact ? 'text-[8px]' : 'text-[clamp(7px,.8vw,11px)]'}`}>ВЕРНО</span>}
            {wrong && <span className={`relative z-10 ml-auto font-black text-[#ffb0ba] ${compact ? 'text-[8px]' : 'text-[clamp(7px,.8vw,11px)]'}`}>ВАШ ОТВЕТ</span>}
          </motion.button>
        );
      })}
    </div>
  );
}

function PhoneQuestion({ state, reduced, special, selectedIndex, onSelect }: { state: AnswerState; reduced: boolean; special: boolean; selectedIndex?: number; onSelect?: (index: number) => void }) {
  const panel = special ? 'border-white/20 bg-[#111827]/82 backdrop-blur-md' : 'border-[#4e7db7]/28 bg-[#0b2345]/88';
  const revealed = state === 'reveal-correct' || state === 'reveal-wrong';
  return (
    <>
      <PhoneHeader special={special} reduced={reduced} />
      <section className={`relative mt-3.5 rounded-[18px] border p-3.5 ${panel}`}>
        <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-[.14em] text-[#8fbfff]"><span>Вопрос 07</span><span className="text-white">12 сек</span></div>
        <div className="mt-2"><Timer reduced={reduced} compact finished={revealed} /></div>
        <h4 className="mt-3.5 text-[22px] font-black leading-[1.05] tracking-[-.04em]">Какая планета самая большая в Солнечной системе?</h4>
      </section>
      <section className={`relative mt-2 rounded-[18px] border p-1.5 ${special ? 'border-white/15 bg-[#070d19]/48' : 'border-[#4e7db7]/25 bg-[#071a35]/72'}`}><AnswerGrid state={state} compact reduced={reduced} special={special} selectedIndex={selectedIndex} onSelect={onSelect} /></section>
      <div className="absolute inset-x-4 bottom-8 z-20">
        {state === 'idle' && <p className="text-center text-[12px] font-bold uppercase tracking-[.12em] text-white/45">Выберите один ответ</p>}
        {state === 'selected' && <div className="flex min-h-[51px] items-center justify-between rounded-[14px] bg-[#164a72] px-4 py-3.5"><span className="text-[11px] font-black uppercase tracking-[.12em]">Ответ принят</span><b className="text-[11px] uppercase tracking-[.08em] text-[#a9dcff]">Можно изменить</b></div>}
        {state === 'reveal-correct' && <motion.div initial={reduced ? false : { y: 14, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="flex min-h-[51px] items-center justify-between rounded-[14px] bg-[#126b50] px-4 py-3.5"><span className="text-[11px] font-black uppercase tracking-[.12em]">Правильно</span><b className="text-[15px]">+ 1 ОЧКО</b></motion.div>}
        {state === 'reveal-wrong' && <motion.div initial={reduced ? false : { y: 14, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="flex min-h-[51px] items-center justify-between rounded-[14px] bg-[#7f2032] px-4 py-3.5"><span className="text-[11px] font-black uppercase tracking-[.12em]">Неверно</span><b className="text-[11px] uppercase tracking-[.08em] text-[#ffbdc5]">Очки не начислены</b></motion.div>}
      </div>
    </>
  );
}

function PhoneEditableAnswer({ reduced, special }: { reduced: boolean; special: boolean }) {
  const [selectedIndex, setSelectedIndex] = useState(2);

  return <PhoneQuestion state="selected" reduced={reduced} special={special} selectedIndex={selectedIndex} onSelect={setSelectedIndex} />;
}

function RankRows({ final = false, compact = false, scores = SCORES }: { final?: boolean; compact?: boolean; scores?: readonly ScoreEntry[] }) {
  const density = scores.length <= 4 ? 'large' : scores.length <= 7 ? 'medium' : 'compact';
  const useTwoColumns = !compact && scores.length >= 5;
  const rowCount = Math.ceil(scores.length / 2);
  const gridClass = compact
    ? density === 'large'
      ? 'grid grid-cols-1 gap-3'
      : density === 'medium'
        ? 'grid grid-cols-1 gap-2'
        : 'grid grid-cols-1 gap-1.5'
    : useTwoColumns
      ? density === 'medium'
        ? 'mx-auto grid h-full w-[74%] grid-flow-col grid-cols-2 gap-x-[2.5%] gap-y-[clamp(5px,.5vw,7px)]'
        : 'mx-auto grid h-full w-[88%] grid-flow-col grid-cols-2 gap-x-[2%] gap-y-[clamp(3px,.35vw,5px)]'
      : 'mx-auto grid h-[75%] w-[52%] grid-cols-1 gap-[clamp(6px,.6vw,9px)]';

  return (
    <div
      className={gridClass}
      style={useTwoColumns ? { gridTemplateRows: `repeat(${rowCount}, minmax(0, 1fr))` } : undefined}
    >
      {scores.map((entry, index) => (
        <div
          key={entry.name}
          className={`flex min-w-0 items-center overflow-hidden border ${compact ? density === 'large' ? 'rounded-[14px] px-4 py-4' : density === 'medium' ? 'rounded-[12px] px-3.5 py-2.5' : 'rounded-[10px] px-3 py-1.5' : density === 'large' ? 'rounded-[1vw] px-[5%] py-[1.8%]' : density === 'medium' ? 'rounded-[.85vw] px-[4.5%] py-[1%]' : 'rounded-[.75vw] px-[4%] py-[.65%]'} ${index === 0 ? 'border-[#61d8ff]/55 bg-[#164a72]/92 shadow-[0_0_28px_rgba(38,167,255,.16)]' : 'border-white/15 bg-[#111827]/82 backdrop-blur-md'}`}
        >
          <span className={`mr-1 shrink-0 font-black text-[#8fbfff] ${compact ? density === 'large' ? 'w-7 text-[12px]' : density === 'medium' ? 'w-6 text-[10px]' : 'w-5 text-[9px]' : density === 'large' ? 'w-[10%] text-[clamp(11px,1.15vw,17px)]' : density === 'medium' ? 'w-[9%] text-[clamp(9px,.95vw,14px)]' : 'w-[8%] text-[clamp(8px,.85vw,12px)]'}`}>{index + 1}</span>
          <b className={`truncate ${compact ? density === 'large' ? 'text-[17px]' : density === 'medium' ? 'text-[14px]' : 'text-[12px]' : density === 'large' ? 'text-[clamp(13px,1.45vw,21px)]' : density === 'medium' ? 'text-[clamp(11px,1.15vw,17px)]' : 'text-[clamp(9px,1vw,14px)]'}`}>{entry.name}</b>
          {final && index === 0 && !compact && <span className="ml-3 rounded-full bg-[#f13e55] px-[1.5%] py-[.5%] text-[clamp(6px,.6vw,8px)] font-black uppercase">Победитель</span>}
          <strong className={`ml-auto pl-1 text-[#65c8ff] ${compact ? density === 'large' ? 'text-[24px]' : density === 'medium' ? 'text-[20px]' : 'text-[17px]' : density === 'large' ? 'text-[clamp(18px,1.8vw,26px)]' : density === 'medium' ? 'text-[clamp(16px,1.5vw,22px)]' : 'text-[clamp(14px,1.3vw,19px)]'}`}>{entry.score}</strong>
        </div>
      ))}
    </div>
  );
}

function PhoneWaiting({ reduced, special }: { reduced: boolean; special: boolean }) {
  return <><PhoneHeader special={special} reduced={reduced} /><div className="relative flex flex-1 flex-col items-center justify-center text-center"><h3 className="text-6xl font-black tracking-[-.05em]">Квиз</h3><div className="mt-7 flex flex-wrap justify-center gap-2"><span className="rounded-xl border border-white/15 bg-white/[.08] px-4 py-2.5 text-[14px] font-bold">Средняя</span><span className="rounded-xl border border-white/15 bg-white/[.08] px-4 py-2.5 text-[14px] font-bold">{special ? 'Гарри Поттер' : 'Космос'}</span></div><p className="mt-9 text-xl font-bold leading-snug text-white/85">10 вопросов. 1 очко<br />за правильный ответ!</p><p className="mt-4 text-lg text-white/48">Игроков: 10</p></div><div className="relative rounded-[16px] bg-[#f13e55] py-4 text-center text-lg font-black shadow-[0_12px_30px_-15px_#f13e55]">НАЧАТЬ ИГРУ</div></>;
}

function PhoneCountdown({ reduced, special }: { reduced: boolean; special: boolean }) {
  return <><PhoneHeader special={special} reduced={reduced} /><div className="flex flex-1 flex-col items-center justify-center"><span className="text-[15px] font-black uppercase tracking-[.18em] text-[#8fbfff]">Вопрос 07</span><motion.b initial={reduced ? false : { scale: .72, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={spring} className="mt-5 text-[176px] font-black leading-none text-white drop-shadow-[0_0_40px_rgba(38,167,255,.6)]">3</motion.b><p className="mt-6 text-[14px] font-black uppercase tracking-[.2em] text-white/45">Приготовьтесь</p></div></>;
}

function PhoneLeaderboard({ final, reduced, special, scores = SCORES }: { final: boolean; reduced: boolean; special: boolean; scores?: readonly ScoreEntry[] }) {
  return <><PhoneHeader special={special} reduced={reduced} /><div className="relative mt-2 text-center"><h3 className="text-3xl font-black leading-none">{final ? 'Победа!' : 'Таблица лидеров'}</h3><p className="mt-1 text-[9px] uppercase tracking-[.11em] text-white/45">{final ? `Квиз завершён · ${playerCountLabel(scores.length)}` : `После 7 из 10 вопросов · ${playerCountLabel(scores.length)}`}</p></div><div className="relative mt-2 min-h-0 flex-1"><RankRows final={final} compact scores={scores} /></div><div className="relative mt-2 shrink-0 rounded-[14px] bg-[#f13e55] py-3 text-center text-base font-black">{final ? 'ИГРАТЬ СНОВА' : 'ПРОДОЛЖИТЬ'}</div></>;
}

function PhoneScreen({ id, reduced, special }: { id: PhoneScreenId; reduced: boolean; special: boolean }) {
  if (id === 'waiting') return <PhoneWaiting reduced={reduced} special={special} />;
  if (id === 'countdown') return <PhoneCountdown reduced={reduced} special={special} />;
  if (id === 'question') return <PhoneQuestion state="idle" reduced={reduced} special={special} />;
  if (id === 'answered') return <PhoneEditableAnswer reduced={reduced} special={special} />;
  if (id === 'reveal') return <PhoneQuestion state="reveal-correct" reduced={reduced} special={special} />;
  if (id === 'incorrect') return <PhoneQuestion state="reveal-wrong" reduced={reduced} special={special} />;
  return <PhoneLeaderboard final={id === 'final'} reduced={reduced} special={special} />;
}

function TvPlayersPanel({ mode }: { mode: TvPlayerMode }) {
  const reveal = mode === 'reveal';

  return (
    <section className="min-w-0 rounded-[.85vw] border border-[#5d85bb]/30 bg-[#071a35]/78 px-[1.2%] py-[.7%] backdrop-blur-md">
      <div className="mb-[.45%] flex items-center justify-between text-[clamp(6px,.58vw,8px)] font-black uppercase tracking-[.14em] text-[#8fbfff]">
        <span>{reveal ? 'Итоги вопроса' : mode === 'answering' ? 'Ответы игроков' : 'Игроки комнаты'}</span>
        <span className="text-white/60">{reveal ? '10 из 10 ответили' : mode === 'answering' ? '6 из 10 ответили' : '10 игроков'}</span>
      </div>
      <div className="grid grid-cols-5 gap-[.55%]">
        {ROOM_PLAYERS.map((player, index) => {
          const answered = mode === 'answering' && index < 6;
          const status = reveal
            ? player.correct
              ? 'border-[#4de19d]/65 bg-[#126b50]/88 text-white'
              : 'border-[#ff6d80]/60 bg-[#7f2032]/84 text-white'
            : answered
              ? 'border-[#61d8ff]/45 bg-[#164a72]/78 text-white'
              : mode === 'room'
                ? 'border-white/15 bg-white/[.07] text-white/75'
                : 'border-white/10 bg-white/[.04] text-white/48';

          return (
            <motion.div
              key={player.name}
              initial={reveal ? { opacity: .45, y: -3 } : false}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: reveal ? index * .035 : 0, duration: .2 }}
              className={`flex min-w-0 items-center gap-[4%] rounded-[.48vw] border px-[5%] py-[3%] ${status}`}
            >
              <i className={`h-[.48vw] min-h-1.5 w-[.48vw] min-w-1.5 shrink-0 rounded-full ${reveal ? player.correct ? 'bg-[#8effc8]' : 'bg-[#ff9caa]' : answered ? 'bg-[#61d8ff]' : mode === 'room' ? 'bg-white/45' : 'bg-white/20'}`} />
              <b className="truncate text-[clamp(7px,.72vw,10px)]">{player.name}</b>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}

function TvQuestion({ reveal, reduced, special }: { reveal: boolean; reduced: boolean; special: boolean }) {
  const panel = special ? 'border-white/20 bg-[#111827]/82 backdrop-blur-md' : 'border-[#4e7db7]/28 bg-[#0b2345]/88';
  return <><TvHeader special={special} playerMode={reveal ? 'reveal' : 'answering'} /><div className="mt-[1.2%] flex min-h-0 flex-1 flex-col gap-[1.2%]"><section className={`flex min-h-0 flex-1 flex-col rounded-[1.35vw] border px-[2.5%] py-[1.5%] ${panel}`}><div className="flex items-center justify-between text-[clamp(8px,.9vw,13px)] font-black uppercase tracking-[.18em] text-[#8fbfff]"><span>Вопрос 07</span><span className="text-white">{reveal ? 'Все ответили' : '12 секунд'}</span></div><div className="mt-[.8%]"><Timer reduced={reduced} finished={reveal} /></div><div className="flex min-h-0 flex-1 items-center justify-center text-center"><h4 className="w-full text-[clamp(18px,2vw,30px)] font-black leading-[1.02] tracking-[-.04em]">Какая планета самая большая в Солнечной системе?</h4></div></section><section className={`mt-auto shrink-0 rounded-[1.35vw] border p-[1.15%] ${special ? 'border-white/15 bg-[#070d19]/48 backdrop-blur-md' : 'border-[#4e7db7]/25 bg-[#071a35]/72'}`}><AnswerGrid state={reveal ? 'reveal-correct' : 'idle'} reduced={reduced} special={special} /></section></div></>;
}

function TvWaiting({ special }: { special: boolean }) {
  return <><TvHeader special={special} playerMode="room" /><div className="flex flex-1 flex-col items-center justify-center text-center"><h3 className="text-[clamp(22px,2.5vw,36px)] font-black">Игра скоро начнётся</h3><p className="mt-[1.2%] text-[clamp(9px,1vw,14px)] text-white/55">10 вопросов · 10 игроков · {special ? 'Гарри Поттер' : 'Космос'}</p></div><p className="text-center text-[clamp(7px,.8vw,12px)] uppercase tracking-[.16em] text-white/40">Ведущий запускает игру</p></>;
}

function TvCountdown({ reduced, special }: { reduced: boolean; special: boolean }) {
  return <><TvHeader special={special} playerMode="room" /><div className="flex flex-1 flex-col items-center justify-center"><span className="text-[clamp(9px,1vw,14px)] font-black uppercase tracking-[.2em] text-[#8fbfff]">Вопрос 07</span><motion.b initial={reduced ? false : { scale: .45, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={spring} className="mt-[.5%] text-[clamp(68px,7.2vw,104px)] font-black leading-none drop-shadow-[0_0_4vw_rgba(38,167,255,.65)]">3</motion.b><p className="mt-[.5%] text-[clamp(7px,.8vw,12px)] font-black uppercase tracking-[.22em] text-white/42">Приготовьтесь</p></div></>;
}

function TvLeaderboard({ final, reduced, special, scores = SCORES }: { final: boolean; reduced: boolean; special: boolean; scores?: readonly ScoreEntry[] }) {
  return <><TvHeader special={special} /><div className="mt-[.4%] flex min-h-0 flex-1 flex-col items-center"><motion.h3 initial={reduced ? false : { y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={spring} className="text-[clamp(18px,1.65vw,24px)] font-black">{final ? 'Победитель определён' : 'Таблица лидеров'}</motion.h3><p className="mt-[.1%] text-[clamp(7px,.72vw,10px)] uppercase tracking-[.16em] text-white/42">{final ? `Квиз завершён · ${playerCountLabel(scores.length)}` : `После 7 из 10 вопросов · ${playerCountLabel(scores.length)}`}</p><div className="mt-[.45%] min-h-0 w-full flex-1"><RankRows final={final} scores={scores} /></div></div></>;
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
          <div className="max-w-4xl"><p className="font-mono text-xs font-bold uppercase tracking-[.24em] text-[#65c8ff]/70">Выбранный дизайн · Полный сценарий</p><h2 className="mt-3 text-4xl font-black tracking-[-.04em] text-white sm:text-6xl">Пульс эфира — все экраны</h2><p className="mt-5 text-base leading-relaxed text-white/48 sm:text-lg">Четырнадцать ключевых состояний для телефона и общего TV-экрана. Выбор сначала только фиксируется; правильность и очки раскрываются одновременно после ответа всех игроков. Общий квиз использует новый фон, специальный сохраняет изображение своей темы.</p></div>
          <div className="rounded-[18px] border border-white/10 bg-white/[.05] p-1.5"><div className="grid grid-cols-2 gap-1"><button type="button" onClick={() => setSpecial(false)} className={`rounded-[13px] px-5 py-3 text-left transition-colors ${!special ? 'bg-white text-[#07111f]' : 'text-white/55 hover:bg-white/[.05]'}`}><b className="block text-sm">Общий квиз</b><small className="text-[10px] opacity-60">тема «Космос»</small></button><button type="button" onClick={() => setSpecial(true)} className={`rounded-[13px] px-5 py-3 text-left transition-colors ${special ? 'bg-white text-[#07111f]' : 'text-white/55 hover:bg-white/[.05]'}`}><b className="block text-sm">Специальный</b><small className="text-[10px] opacity-60">«Гарри Поттер»</small></button></div></div>
        </div>

        <div className="mt-14"><div className="mb-10"><p className="font-mono text-[11px] font-bold uppercase tracking-[.22em] text-[#65c8ff]/65">Mobile · 390 × 844</p><h3 className="mt-2 text-3xl font-black text-white">Телефон игрока и ведущего</h3></div><div className="grid gap-x-8 gap-y-16 md:grid-cols-2 xl:grid-cols-3">{PHONE_SCREENS.map(screen => <article key={screen.id}><ScreenLabel number={screen.number} title={screen.title} role={screen.role} /><PulsePhoneFrame special={special} reduced={reduced}><PhoneScreen id={screen.id} special={special} reduced={reduced} /></PulsePhoneFrame></article>)}</div></div>

        <div className="mt-24"><div className="mb-10"><p className="font-mono text-[11px] font-bold uppercase tracking-[.22em] text-[#65c8ff]/65">TV · 1920 × 1080</p><h3 className="mt-2 text-3xl font-black text-white">Общий экран</h3></div><div className="grid gap-14 xl:grid-cols-2">{TV_SCREENS.map(screen => <article key={screen.id}><ScreenLabel number={screen.number} title={screen.title} /><PulseTvFrame special={special} reduced={reduced}><TvScreen id={screen.id} special={special} reduced={reduced} /></PulseTvFrame></article>)}</div></div>

        <div className="mt-24 border-t border-white/10 pt-20">
          <div className="max-w-3xl"><p className="font-mono text-[11px] font-bold uppercase tracking-[.22em] text-[#65c8ff]/65">Адаптивная плотность · Сводные таблицы</p><h3 className="mt-2 text-3xl font-black text-white">Размер строк по числу игроков</h3><p className="mt-4 text-base leading-relaxed text-white/45">Основные экраны выше показывают компактный режим для 8–10 игроков. Ниже — дополнительные примеры крупного режима для 2–4 и среднего режима для 5–7 игроков.</p></div>

          <div className="mt-12"><div className="mb-8"><p className="font-mono text-[11px] font-bold uppercase tracking-[.22em] text-[#65c8ff]/65">Mobile · 390 × 844</p><h4 className="mt-2 text-2xl font-black text-white">Телефон</h4></div><div className="grid gap-x-8 gap-y-16 md:grid-cols-2">{RANKING_PREVIEWS.map(preview => <article key={`phone-${preview.id}`}><ScreenLabel number={preview.range} title={preview.title} role={playerCountLabel(preview.scores.length)} /><PulsePhoneFrame special={special} reduced={reduced}><PhoneLeaderboard final={false} reduced={reduced} special={special} scores={preview.scores} /></PulsePhoneFrame></article>)}</div></div>

          <div className="mt-20"><div className="mb-8"><p className="font-mono text-[11px] font-bold uppercase tracking-[.22em] text-[#65c8ff]/65">TV · 1920 × 1080</p><h4 className="mt-2 text-2xl font-black text-white">Общий экран</h4></div><div className="grid gap-14 xl:grid-cols-2">{RANKING_PREVIEWS.map(preview => <article key={`tv-${preview.id}`}><ScreenLabel number={preview.range} title={preview.title} /><PulseTvFrame special={special} reduced={reduced}><TvLeaderboard final={false} reduced={reduced} special={special} scores={preview.scores} /></PulseTvFrame></article>)}</div></div>
        </div>
      </div>
    </section>
  );
}
