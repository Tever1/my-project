'use client';

import { motion } from 'framer-motion';
import { ANSWERS, cinematic, PhoneFrame, spring, TvFrame } from './ConceptPrimitives';

function BankCube({ reduced, tv = false }: { reduced: boolean; tv?: boolean }) {
  return (
    <motion.div
      initial={reduced ? false : { x: tv ? 180 : 80, rotate: 48, rotateY: 38, scale: 0.72, opacity: 0 }}
      animate={{ x: 0, rotate: 0, rotateY: 0, scale: 1, opacity: 1 }}
      transition={{ ...spring, delay: tv ? 0.82 : 0.68 }}
      className={`relative [transform-style:preserve-3d] ${
        tv ? 'h-[clamp(66px,8vw,112px)] w-[clamp(66px,8vw,112px)]' : 'h-[70px] w-[70px]'
      }`}
    >
      <i className="absolute -top-3 left-2 h-3 w-full origin-bottom skew-x-[-45deg] bg-[#ff9b68]" />
      <i className="absolute -right-3 top-2 h-full w-3 origin-left skew-y-[-45deg] bg-[#bd3d16]" />
      <div className="relative flex h-full flex-col items-center justify-center bg-[#ff6828] text-[#fff8e8] shadow-[12px_14px_0_rgba(23,29,53,.18)]">
        <small className={`font-black uppercase tracking-[0.13em] ${tv ? 'text-[clamp(6px,.7vw,10px)]' : 'text-[7px]'}`}>
          Банк
        </small>
        <b className={tv ? 'text-[clamp(22px,3.2vw,46px)] leading-none' : 'text-2xl leading-none'}>120</b>
      </div>
    </motion.div>
  );
}

export function ConstructorConcept({ reduced }: { reduced: boolean }) {
  const moduleInitial = (index: number) =>
    reduced
      ? false
      : {
          x: index % 2 ? 80 : -80,
          y: index < 2 ? -22 : 22,
          rotate: index % 2 ? 3 : -3,
          opacity: 0,
        };

  return (
    <div className="mt-10 grid items-start gap-8 lg:grid-cols-[326px_1fr]">
      <PhoneFrame className="bg-[#f4eedc] font-sans text-[#171d35]">
        <motion.div
          initial={reduced ? false : { x: 82 }}
          animate={{ x: 0 }}
          transition={{ duration: 0.9, ease: cinematic }}
          className="absolute -left-20 top-24 h-44 w-48 -rotate-6 bg-[#2146c7]"
        />
        <motion.div
          initial={reduced ? false : { x: -76 }}
          animate={{ x: 0 }}
          transition={{ duration: 0.9, ease: cinematic }}
          className="absolute -right-20 top-44 h-40 w-40 rotate-6 bg-[#ff6828]"
        />

        <div className="relative mt-5 flex items-center justify-between">
          <b className="bg-[#171d35] px-3 py-2 text-xs font-black tracking-[0.12em] text-[#f4eedc]">100 К 1</b>
          <span className="bg-[#2146c7] px-3 py-2 font-mono text-[8px] font-bold text-white">РАУНД 02 · ×2</span>
        </div>

        <motion.div
          initial={reduced ? false : { y: -45, rotateX: -18, opacity: 0 }}
          animate={{ y: 0, rotateX: 0, opacity: 1 }}
          transition={{ ...spring, delay: 0.15 }}
          className="relative mt-6 bg-[#2146c7] p-4 text-[#fff8e8] shadow-[9px_9px_0_#7891ee]"
        >
          <span className="font-mono text-[8px] font-bold uppercase tracking-[0.16em] text-white/60">Вопрос раунда</span>
          <h4 className="mt-2 text-[19px] font-black leading-tight">Что люди чаще всего забывают, выходя из дома?</h4>
        </motion.div>

        <div className="relative mt-5 grid gap-2.5">
          {ANSWERS.map(([answer, points], index) => (
            <motion.div
              key={answer}
              initial={moduleInitial(index)}
              animate={{ x: 0, y: 0, rotate: 0, opacity: 1 }}
              transition={{ ...spring, delay: 0.28 + index * 0.11 }}
              className="grid h-12 grid-cols-[36px_1fr_48px] items-stretch bg-[#fffaf0] shadow-[6px_6px_0_#2146c7]"
            >
              <span className="grid place-items-center bg-[#171d35] font-mono text-xs font-black text-white">{index + 1}</span>
              <b className="flex items-center px-3 text-xs tracking-[0.04em]">{answer}</b>
              <b className="grid place-items-center bg-[#ff6828] text-lg text-white">{points}</b>
            </motion.div>
          ))}
        </div>

        <div className="relative mt-auto flex items-end justify-between gap-3">
          <div className="grid flex-1 grid-cols-2 gap-2">
            <div className="bg-[#2146c7] px-3 py-2 text-white shadow-[5px_5px_0_#7891ee]">
              <small className="block text-[7px] opacity-60">АКУЛЫ</small>
              <b className="text-xl">240</b>
            </div>
            <div className="bg-[#fffaf0] px-3 py-2 text-right shadow-[5px_5px_0_#ff6828]">
              <small className="block text-[7px] opacity-50">ЗУБРЫ</small>
              <b className="text-xl">180</b>
            </div>
          </div>
          <BankCube reduced={reduced} />
        </div>

        <motion.button
          whileTap={reduced ? undefined : { y: 7, boxShadow: '0 0 0 #bd3d16' }}
          className="relative mt-5 h-13 bg-[#ff6828] text-xs font-black uppercase tracking-[0.13em] text-white shadow-[0_7px_0_#bd3d16]"
        >
          Собрать ответ
        </motion.button>
      </PhoneFrame>

      <TvFrame className="bg-[#f4eedc] font-sans text-[#171d35]">
        <div className="absolute inset-x-0 bottom-0 h-[27%] bg-[#e7dfc9] [clip-path:polygon(9%_0,91%_0,100%_100%,0_100%)]" />

        <motion.div
          initial={reduced ? false : { x: '42%' }}
          animate={{ x: 0 }}
          transition={{ duration: 1.05, ease: cinematic }}
          className="absolute -left-[8%] top-[8%] h-[78%] w-[30%] -rotate-3 bg-[#2146c7] shadow-[22px_20px_0_#7891ee]"
        />
        <motion.div
          initial={reduced ? false : { x: '-42%' }}
          animate={{ x: 0 }}
          transition={{ duration: 1.05, ease: cinematic }}
          className="absolute -right-[8%] top-[13%] h-[72%] w-[29%] rotate-3 bg-[#ff6828] shadow-[-22px_20px_0_#c54218]"
        />

        <div className="relative flex h-full flex-col px-[5%] py-[4%]">
          <div className="flex items-center justify-between">
            <b className="bg-[#171d35] px-[3%] py-[1.2%] text-[clamp(10px,1.6vw,23px)] font-black tracking-[0.12em] text-white">100 К 1</b>
            <span className="bg-[#fffaf0] px-[3%] py-[1.2%] font-mono text-[clamp(7px,.9vw,12px)] font-bold shadow-[7px_7px_0_#7891ee]">
              СЦЕНА 02 · ДВОЙНАЯ ИГРА
            </span>
          </div>

          <div className="relative mt-[4%] flex min-h-0 flex-1 items-center justify-center">
            <div className="absolute bottom-[4%] left-0 w-[19%] -rotate-2 bg-[#fffaf0] p-[3%] shadow-[12px_14px_0_#7891ee]">
              <small className="text-[clamp(6px,.8vw,11px)] font-black text-[#2146c7]">КОМАНДА</small>
              <b className="block text-[clamp(13px,2vw,29px)]">АКУЛЫ</b>
              <strong className="text-[clamp(28px,5vw,72px)] leading-none text-[#2146c7]">240</strong>
            </div>

            <div className="relative z-10 w-[58%] [perspective:900px]">
              <motion.div
                initial={reduced ? false : { y: -70, rotateX: -24, opacity: 0 }}
                animate={{ y: 0, rotateX: 0, opacity: 1 }}
                transition={{ ...spring, delay: 0.18 }}
                className="bg-[#171d35] px-[6%] py-[3.2%] text-center text-[#fff8e8] shadow-[12px_12px_0_#2146c7]"
              >
                <h4 className="text-[clamp(12px,2vw,29px)] font-black">Что люди чаще всего забывают, выходя из дома?</h4>
              </motion.div>

              <div className="mt-[5%] grid grid-cols-2 gap-[4%]">
                {ANSWERS.map(([answer, points], index) => (
                  <motion.div
                    key={answer}
                    initial={moduleInitial(index)}
                    animate={{ x: 0, y: 0, rotate: 0, opacity: 1 }}
                    transition={{ ...spring, delay: 0.34 + index * 0.12 }}
                    className="grid grid-cols-[15%_1fr_22%] items-stretch bg-[#fffaf0] shadow-[9px_10px_0_#7891ee]"
                  >
                    <span className="grid place-items-center bg-[#2146c7] py-[12%] font-mono text-[clamp(7px,.9vw,12px)] font-black text-white">{index + 1}</span>
                    <b className="flex items-center px-[7%] text-[clamp(8px,1.2vw,17px)]">{answer}</b>
                    <b className="grid place-items-center bg-[#ff6828] text-[clamp(14px,2vw,28px)] text-white">{points}</b>
                  </motion.div>
                ))}
              </div>
            </div>

            <div className="absolute bottom-[4%] right-0 w-[19%] rotate-2 bg-[#171d35] p-[3%] text-right text-white shadow-[-12px_14px_0_#c54218]">
              <small className="text-[clamp(6px,.8vw,11px)] font-black text-[#ff8b58]">КОМАНДА</small>
              <b className="block text-[clamp(13px,2vw,29px)]">ЗУБРЫ</b>
              <strong className="text-[clamp(28px,5vw,72px)] leading-none text-[#ff7a42]">180</strong>
            </div>

            <div className="absolute bottom-[-4%] left-1/2 z-20 -translate-x-1/2">
              <BankCube reduced={reduced} tv />
            </div>
          </div>
        </div>
      </TvFrame>
    </div>
  );
}
