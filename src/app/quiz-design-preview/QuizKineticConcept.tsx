'use client';

import { motion } from 'framer-motion';
import {
  ANSWERS,
  PhoneFrame,
  SpecialBackdrop,
  TvFrame,
  cinematic,
  spring,
} from './QuizConceptPrimitives';

export function QuizKineticConcept({ reduced, special }: { reduced: boolean; special: boolean }) {
  const panelInitial = (index: number) =>
    reduced ? false : { x: index % 2 ? 65 : -65, rotate: index % 2 ? 4 : -4, opacity: 0 };

  return (
    <div className="mt-10 grid items-start gap-8 lg:grid-cols-[326px_1fr]">
      <PhoneFrame className={`${special ? 'bg-[#10151d]' : 'bg-[#f1eee4]'} font-sans text-[#111827]`}>
        <SpecialBackdrop special={special} />
        {!special && (
          <>
            <motion.div
              initial={reduced ? false : { x: -90 }}
              animate={{ x: 0 }}
              transition={{ duration: 0.8, ease: cinematic }}
              className="absolute -left-20 top-28 h-40 w-52 -rotate-6 bg-[#1e4bd8]"
            />
            <motion.div
              initial={reduced ? false : { x: 90 }}
              animate={{ x: 0 }}
              transition={{ duration: 0.8, ease: cinematic }}
              className="absolute -right-20 bottom-36 h-44 w-44 rotate-6 bg-[#ff6b2c]"
            />
          </>
        )}

        <div className={`relative mt-5 flex items-center justify-between ${special ? 'text-white' : ''}`}>
          <b className={`px-3 py-2 text-xs font-black tracking-[0.13em] ${special ? 'bg-white text-[#111827]' : 'bg-[#111827] text-white'}`}>КВИЗ</b>
          <span className={`${special ? 'bg-black/55 text-white backdrop-blur-md' : 'bg-[#1e4bd8] text-white'} px-3 py-2 font-mono text-[8px] font-bold`}>{special ? 'ГАРРИ ПОТТЕР #1' : 'НАУКА · 03/10'}</span>
        </div>

        <motion.div
          initial={reduced ? false : { y: -45, rotateX: -22, opacity: 0 }}
          animate={{ y: 0, rotateX: 0, opacity: 1 }}
          transition={{ ...spring, delay: 0.12 }}
          className={`relative mt-6 p-4 shadow-[9px_9px_0_rgba(17,24,39,.28)] ${special ? 'border border-white/30 bg-black/58 text-white backdrop-blur-xl' : 'bg-[#111827] text-white'}`}
        >
          <div className="mb-3 flex items-center justify-between font-mono text-[8px] font-bold uppercase tracking-[.14em] text-white/55"><span>Вопрос 3</span><span>12 секунд</span></div>
          <h4 className="text-[20px] font-black leading-[1.02] tracking-[-.04em]">Какая планета известна как Красная планета?</h4>
        </motion.div>

        <div className={`relative mt-4 h-2 overflow-hidden ${special ? 'bg-white/20' : 'bg-[#111827]/12'}`}>
          <motion.i
            initial={reduced ? false : { width: 0 }}
            animate={{ width: '62%' }}
            transition={{ duration: 1.1, ease: cinematic }}
            className="block h-full bg-[#ff6b2c]"
          />
        </div>

        <div className="relative mt-5 grid gap-2.5">
          {ANSWERS.map(([letter, answer], index) => (
            <motion.div
              key={letter}
              initial={panelInitial(index)}
              animate={{ x: 0, rotate: 0, opacity: 1 }}
              transition={{ ...spring, delay: 0.25 + index * 0.1 }}
              className={`grid h-13 grid-cols-[42px_1fr] items-stretch shadow-[6px_6px_0_rgba(17,24,39,.24)] ${
                index === 1
                  ? 'bg-[#ff6b2c] text-white'
                  : special
                    ? 'border border-white/25 bg-black/52 text-white backdrop-blur-xl'
                    : 'bg-white text-[#111827]'
              }`}
            >
              <span className={`grid place-items-center font-mono text-xs font-black ${index === 1 ? 'bg-[#111827]' : 'bg-[#1e4bd8] text-white'}`}>{letter}</span>
              <b className="flex items-center px-4 text-sm">{answer}</b>
            </motion.div>
          ))}
        </div>

        <div className="relative mt-auto">
          <div className={`mb-3 flex items-center justify-between px-3 py-2 text-[8px] font-bold ${special ? 'bg-black/55 text-white backdrop-blur-md' : 'bg-white/80'}`}><span>ОТВЕТИЛИ 3 / 4</span><span>СЧЁТ 5</span></div>
          <motion.button whileTap={reduced ? undefined : { y: 5 }} className="h-14 w-full bg-[#ff6b2c] text-xs font-black uppercase tracking-[.13em] text-white shadow-[0_7px_0_#bd3f16]">Ответить: Марс</motion.button>
        </div>
      </PhoneFrame>

      <TvFrame className={`${special ? 'bg-[#10151d]' : 'bg-[#f1eee4]'} font-sans text-[#111827]`}>
        <SpecialBackdrop special={special} />
        {!special && (
          <>
            <motion.div initial={reduced ? false : { x: '-35%' }} animate={{ x: 0 }} transition={{ duration: 1, ease: cinematic }} className="absolute -left-[8%] top-[7%] h-[78%] w-[31%] -rotate-3 bg-[#1e4bd8] shadow-[20px_20px_0_#88a2f2]" />
            <motion.div initial={reduced ? false : { x: '35%' }} animate={{ x: 0 }} transition={{ duration: 1, ease: cinematic }} className="absolute -right-[8%] top-[12%] h-[72%] w-[29%] rotate-3 bg-[#ff6b2c] shadow-[-20px_20px_0_#c64218]" />
            <div className="absolute inset-x-0 bottom-0 h-[24%] bg-[#dfd8c7] [clip-path:polygon(8%_0,92%_0,100%_100%,0_100%)]" />
          </>
        )}

        <div className="relative flex h-full flex-col px-[5%] py-[4%]">
          <div className={`flex items-center justify-between ${special ? 'text-white' : ''}`}>
            <b className={`px-[3%] py-[1.2%] text-[clamp(10px,1.5vw,22px)] font-black tracking-[.14em] ${special ? 'bg-white text-[#111827]' : 'bg-[#111827] text-white'}`}>КВИЗ</b>
            <span className={`${special ? 'border border-white/25 bg-black/50 text-white backdrop-blur-xl' : 'bg-white shadow-[7px_7px_0_#88a2f2]'} px-[3%] py-[1.2%] font-mono text-[clamp(7px,.9vw,12px)] font-bold`}>{special ? 'СПЕЦИАЛЬНЫЙ · ГАРРИ ПОТТЕР #1' : 'ОБЩИЙ · НАУКА · СРЕДНЯЯ'}</span>
          </div>

          <div className="relative mt-[4%] flex min-h-0 flex-1 items-center justify-center">
            <div className={`absolute bottom-[5%] left-0 w-[18%] p-[3%] ${special ? 'border border-white/25 bg-black/52 text-white backdrop-blur-xl' : 'bg-white shadow-[11px_13px_0_#88a2f2]'}`}><small className="font-mono text-[clamp(6px,.7vw,10px)]">ЛИДЕР</small><b className="block text-[clamp(14px,2vw,28px)]">КАТЯ</b><strong className="text-[clamp(30px,5vw,70px)] leading-none text-[#1e4bd8]">7</strong></div>

            <div className="relative z-10 w-[60%]">
              <motion.div initial={reduced ? false : { y: -60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ ...spring, delay: 0.16 }} className={`p-[4%] text-center ${special ? 'border border-white/25 bg-black/60 text-white backdrop-blur-xl' : 'bg-[#111827] text-white shadow-[12px_12px_0_#1e4bd8]'}`}><div className="flex justify-between font-mono text-[clamp(6px,.7vw,10px)] text-white/55"><span>ВОПРОС 03 / 10</span><span>12 СЕК · ОТВЕТИЛИ 3 / 4</span></div><h4 className="mt-[3%] text-[clamp(17px,2.6vw,38px)] font-black leading-tight">Какая планета известна как Красная планета?</h4></motion.div>
              <div className="mt-[5%] grid grid-cols-2 gap-[4%]">
                {ANSWERS.map(([letter, answer], index) => (
                  <motion.div key={letter} initial={panelInitial(index)} animate={{ x: 0, rotate: 0, opacity: 1 }} transition={{ ...spring, delay: 0.3 + index * 0.11 }} className={`grid grid-cols-[18%_1fr] items-stretch ${index === 1 ? 'bg-[#ff6b2c] text-white' : special ? 'border border-white/25 bg-black/52 text-white backdrop-blur-xl' : 'bg-white shadow-[8px_9px_0_#88a2f2]'}`}><span className="grid place-items-center bg-[#1e4bd8] py-[15%] font-mono text-[clamp(8px,1vw,14px)] font-black text-white">{letter}</span><b className="flex items-center px-[8%] text-[clamp(10px,1.5vw,21px)]">{answer}</b></motion.div>
                ))}
              </div>
              <div className={`mt-[5%] h-3 overflow-hidden ${special ? 'bg-white/20' : 'bg-[#111827]/15'}`}><motion.i initial={reduced ? false : { width: 0 }} animate={{ width: '62%' }} transition={{ duration: 1.1, ease: cinematic }} className="block h-full bg-[#ff6b2c]" /></div>
            </div>

            <div className={`absolute bottom-[5%] right-0 w-[18%] p-[3%] text-right ${special ? 'border border-white/25 bg-black/52 text-white backdrop-blur-xl' : 'bg-[#111827] text-white shadow-[-11px_13px_0_#c64218]'}`}><small className="font-mono text-[clamp(6px,.7vw,10px)]">ТВОЙ СЧЁТ</small><b className="block text-[clamp(14px,2vw,28px)]">АНЯ</b><strong className="text-[clamp(30px,5vw,70px)] leading-none text-[#ff7b43]">5</strong></div>
          </div>
        </div>
      </TvFrame>
    </div>
  );
}
