'use client';

import { motion } from 'framer-motion';

import {
  ANSWERS,
  PhoneFrame,
  TvFrame,
  spring,
  cinematic,
  SpecialBackdrop,
} from './QuizConceptPrimitives';

function AnswerRows({ reduced, compact = false, special }: { reduced: boolean; compact?: boolean; special: boolean }) {
  return (
    <div className={compact ? 'grid gap-2' : 'grid grid-cols-2 gap-[2.2%]'}>
      {ANSWERS.map(([letter, answer], index) => {
        const correct = index === 2;
        return (
          <motion.div
            key={letter}
            initial={reduced ? false : { opacity: 0, x: index % 2 ? 24 : -24 }}
            animate={{
              opacity: 1,
              x: 0,
              scale: correct && !reduced ? [1, 1.025, 1] : 1,
              rotateX: correct && !reduced ? [0, -8, 0] : 0,
              boxShadow: correct && !reduced
                ? ['0 0 0 rgba(77,225,157,0)', '0 0 28px rgba(77,225,157,.48)', '0 0 0 rgba(77,225,157,0)']
                : '0 0 0 rgba(77,225,157,0)',
            }}
            transition={{
              opacity: { duration: 0.4, delay: 0.22 + index * 0.09 },
              x: { ...spring, delay: 0.22 + index * 0.09 },
              scale: { duration: 1.6, delay: 0.9, repeat: correct ? Infinity : 0 },
              rotateX: { duration: 0.7, delay: 0.82, ease: cinematic },
              boxShadow: { duration: 1.6, delay: 0.9, repeat: correct ? Infinity : 0 },
            }}
            className={`relative flex items-center overflow-hidden border text-white ${compact ? 'min-h-12 rounded-xl px-3 py-2' : 'min-h-[4.4vw] rounded-[1vw] px-[5%] py-[3%]'} ${correct ? 'border-[#4de19d]/65 bg-[#126b50]/90' : special ? 'border-white/20 bg-[#111827]/82 backdrop-blur-md' : 'border-[#5d85bb]/35 bg-[#102c54]/92'}`}
          >
            {correct && (
              <motion.i
                initial={reduced ? false : { x: '-130%' }}
                animate={{ x: reduced ? '450%' : ['-130%', '450%'] }}
                transition={{ duration: 1.35, delay: 0.75, repeat: reduced ? 0 : Infinity, repeatDelay: 1.1, ease: 'easeInOut' }}
                className="absolute inset-y-0 left-0 w-12 -skew-x-12 bg-white/22 blur-sm"
              />
            )}
            <span className={`relative flex shrink-0 items-center justify-center rounded-lg bg-white/10 font-black text-[#8fbfff] ${compact ? 'h-8 w-8 text-xs' : 'h-[2.4vw] w-[2.4vw] text-[clamp(8px,1vw,14px)]'} ${correct ? '!bg-white/18 !text-white' : ''}`}>{letter}</span>
            <b className={`relative ml-[4%] leading-tight ${compact ? 'text-xs' : 'text-[clamp(9px,1.35vw,19px)]'}`}>{answer}</b>
            {correct && <span className={`relative ml-auto font-black text-[#8effc8] ${compact ? 'text-[9px]' : 'text-[clamp(7px,.85vw,12px)]'}`}>ВЕРНО</span>}
          </motion.div>
        );
      })}
    </div>
  );
}

function TimerWave({ reduced, compact = false }: { reduced: boolean; compact?: boolean }) {
  return (
    <div className="relative overflow-hidden rounded-full bg-white/10">
      <motion.div
        initial={reduced ? false : { width: '100%' }}
        animate={{ width: '62%' }}
        transition={{ duration: reduced ? 0 : 1.4, ease: cinematic }}
        className={`relative overflow-hidden rounded-full bg-[linear-gradient(90deg,#26a7ff,#61d8ff)] ${compact ? 'h-1.5' : 'h-[.6vw] min-h-1.5'}`}
      >
        <motion.i
          animate={reduced ? undefined : { x: ['-100%', '600%'] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
          className="absolute inset-y-0 left-0 w-[18%] bg-white/70 blur-[2px]"
        />
      </motion.div>
    </div>
  );
}

export function QuizPulseConcept({ reduced, special }: { reduced: boolean; special: boolean }) {
  const panel = special
    ? 'border-white/20 bg-[#111827]/82 shadow-[0_18px_55px_-25px_#000] backdrop-blur-md'
    : 'border-[#4e7db7]/28 bg-[#0b2345]/88 shadow-[0_18px_55px_-25px_#020b18]';

  return (
    <div className="mt-10 grid items-start gap-8 lg:grid-cols-[326px_1fr]">
      <PhoneFrame className={`${special ? 'bg-[#111827]' : 'bg-[#06172e]'} font-sans text-white`}>
        <SpecialBackdrop special={special} />
        {!special && <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_12%,#1859a855,transparent_35%),linear-gradient(160deg,#0b2950,#051329_66%)]" />}
        <motion.div
          animate={reduced ? undefined : { x: ['-120%', '150%'] }}
          transition={{ duration: 6.5, repeat: Infinity, ease: 'linear' }}
          className="absolute top-0 h-full w-24 -skew-x-12 bg-gradient-to-r from-transparent via-[#50b9ff]/10 to-transparent"
        />

        <div className="relative mt-5 flex items-center justify-between">
          <b className="text-[18px] font-black tracking-[-.055em]">КВИЗ</b>
          <span className="flex items-center gap-1.5 rounded-full border border-white/15 bg-black/20 px-2.5 py-1 text-[7px] font-black uppercase tracking-[.16em]">
            <motion.i animate={reduced ? undefined : { opacity: [1, 0.2, 1] }} transition={{ duration: 1, repeat: Infinity }} className="h-1.5 w-1.5 rounded-full bg-[#f13e55]" />
            В эфире
          </span>
        </div>

        <div className={`relative mt-5 rounded-[18px] border p-4 ${panel}`}>
          <div className="flex items-center justify-between text-[8px] font-black uppercase tracking-[.15em] text-[#8fbfff]"><span>Вопрос 07</span><span className="text-white">12 сек</span></div>
          <TimerWave reduced={reduced} compact />
          <h4 className="mt-4 text-[19px] font-black leading-[1.08] tracking-[-.035em]">Какая планета самая большая в Солнечной системе?</h4>
        </div>

        <div className="relative mt-3"><AnswerRows reduced={reduced} compact special={special} /></div>

        <motion.div
          initial={reduced ? false : { y: 18, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ ...spring, delay: 0.92 }}
          className="relative mt-auto flex items-center justify-between rounded-[13px] bg-[#f13e55] px-3 py-2.5 shadow-[0_12px_30px_-15px_#f13e55]"
        >
          <span className="text-[8px] font-black uppercase tracking-[.13em]">Ответ принят</span><b className="text-[11px]">+ 1 ОЧКО</b>
        </motion.div>
      </PhoneFrame>

      <TvFrame className={`${special ? 'bg-[#111827]' : 'bg-[#06172e]'} font-sans text-white`}>
        <SpecialBackdrop special={special} />
        {!special && <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_42%,#17569777,transparent_34%),linear-gradient(120deg,#081d39,#041126_70%)]" />}
        <div className="absolute inset-0 bg-[linear-gradient(105deg,transparent_0_58%,#2d7fc317_58%_59%,transparent_59%_100%)]" />
        <motion.div
          animate={reduced ? undefined : { x: ['-110%', '680%'] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
          className="absolute inset-y-0 left-0 w-[13%] -skew-x-12 bg-gradient-to-r from-transparent via-[#67c7ff]/10 to-transparent"
        />

        <div className="relative flex h-full flex-col px-[3.5%] py-[2.5%]">
          <div className="flex items-center justify-between">
            <b className="text-[clamp(17px,2.6vw,36px)] font-black tracking-[-.06em]">КВИЗ</b>
            <motion.div
              initial={reduced ? false : { x: 80, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ ...spring, delay: 0.08 }}
              className={`relative overflow-hidden rounded-[.8vw] border px-[3%] py-[1%] ${panel}`}
            >
              <motion.i initial={reduced ? false : { scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 0.7, ease: cinematic }} className="absolute inset-y-0 left-0 w-[.35vw] origin-top bg-[#f13e55]" />
              <span className="text-[clamp(7px,.85vw,12px)] font-black uppercase tracking-[.18em]">{special ? 'Космос' : 'Наука'}</span>
            </motion.div>
          </div>

          <div className="mt-[2%] flex min-h-0 flex-1">
            <div className={`flex min-h-0 flex-1 flex-col rounded-[1.5vw] border p-[3%] ${panel}`}>
              <div className="flex items-center justify-between text-[clamp(8px,1vw,14px)] font-black uppercase tracking-[.18em] text-[#8fbfff]"><span>Вопрос 07</span><span className="text-white">12 секунд</span></div>
              <div className="mt-[1.2%]"><TimerWave reduced={reduced} /></div>
              <h4 className="mt-[2.5%] max-w-[78%] text-[clamp(18px,2.85vw,40px)] font-black leading-[1.01] tracking-[-.045em]">Какая планета самая большая в Солнечной системе?</h4>
              <div className="mt-auto"><AnswerRows reduced={reduced} special={special} /></div>
            </div>
          </div>
        </div>
      </TvFrame>
    </div>
  );
}
