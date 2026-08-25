'use client';

import { motion } from 'framer-motion';

import { ANSWERS, cinematic, PhoneFrame, TvFrame } from './ConceptPrimitives';

function SplitCounter({ value, className = '', reduced }: { value: string; className?: string; reduced: boolean }) {
  return (
    <span className={`inline-flex tabular-nums ${className}`}>
      {[...value].map((digit, index) => (
        <span key={`${digit}-${index}`} className="relative inline-block h-[1em] w-[.64em] overflow-hidden">
          <motion.span
            className="absolute inset-x-0 top-0 flex flex-col"
            initial={reduced ? false : { top: 0 }}
            animate={{ top: `-${Number(digit)}em` }}
            transition={{ duration: 0.8, delay: 0.22 + index * 0.1, ease: cinematic }}
          >
            {Array.from({ length: 10 }, (_, number) => (
              <i key={number} className="block h-[1em] not-italic leading-[1em]">{number}</i>
            ))}
          </motion.span>
        </span>
      ))}
    </span>
  );
}

export function BigScreenConcept({ reduced }: { reduced: boolean }) {
  const rowInitial = (index: number) => reduced ? false : {
    rotateX: 88,
    opacity: 0,
    y: -8,
    transformOrigin: '50% 0%',
    transition: { duration: 0.55, delay: 0.18 + index * 0.13, ease: cinematic },
  };

  return (
    <div className="mt-10 grid items-start gap-8 lg:grid-cols-[326px_1fr]">
      <PhoneFrame className="bg-[#eef4fc] font-sans text-[#071b46]">
        <div className="absolute inset-x-0 top-0 h-36 bg-[linear-gradient(145deg,#fff_5%,#d9e8fb_55%,#b8d2f2)]" />
        <div className="absolute -right-16 top-10 h-36 w-72 -rotate-12 rounded-full border-[18px] border-white/55" />

        <div className="relative mt-5 flex items-center justify-between">
          <b className="text-[19px] font-black tracking-[-0.07em] text-[#0647b8]">100 К 1</b>
          <span className="flex items-center gap-1.5 rounded-full bg-[#e52d3e] px-3 py-1 text-[8px] font-black uppercase tracking-[0.16em] text-white">
            <motion.i
              animate={reduced ? undefined : { opacity: [1, 0.25, 1] }}
              transition={{ duration: 1.1, repeat: Infinity }}
              className="h-1.5 w-1.5 rounded-full bg-white"
            />
            Прямой эфир
          </span>
        </div>

        <div className="relative mt-6 grid grid-cols-[1fr_auto_1fr] items-center rounded-2xl bg-white/85 p-2.5 shadow-[0_14px_38px_-24px_#315b92] ring-1 ring-[#b6cbe5]">
          <div>
            <small className="block text-[7px] font-black uppercase tracking-[.13em] text-[#6e83a0]">Синие</small>
            <SplitCounter value="240" reduced={reduced} className="mt-1 text-xl font-black text-[#0647b8]" />
          </div>
          <div className="rounded-xl bg-[#071b46] px-3 py-1.5 text-center text-white">
            <small className="block text-[6px] uppercase tracking-[.14em] text-white/55">Банк</small>
            <SplitCounter value="120" reduced={reduced} className="text-base font-black" />
          </div>
          <div className="text-right">
            <small className="block text-[7px] font-black uppercase tracking-[.13em] text-[#6e83a0]">Красные</small>
            <SplitCounter value="180" reduced={reduced} className="mt-1 text-xl font-black text-[#e52d3e]" />
          </div>
        </div>

        <div className="relative mt-5">
          <span className="text-[8px] font-black uppercase tracking-[.2em] text-[#e52d3e]">Раунд 2 · двойная игра</span>
          <h4 className="mt-2 text-[20px] font-black leading-[1.05] tracking-[-.045em]">
            Что люди чаще всего забывают дома?
          </h4>
        </div>

        <div className="relative mt-5 overflow-hidden rounded-[18px] bg-[#0647b8] p-2 shadow-[0_20px_45px_-24px_#0647b8]">
          <div className="mb-2 flex items-center justify-between px-2 pt-1 text-[7px] font-black uppercase tracking-[.15em] text-white/55">
            <span>Популярные ответы</span><span>100 голосов</span>
          </div>
          <div className="space-y-1.5 [perspective:700px]">
            {ANSWERS.map(([answer, points], index) => (
              <motion.div
                key={answer}
                initial={rowInitial(index)}
                animate={{ rotateX: 0, opacity: 1, y: 0 }}
                transition={{ duration: 0.55, delay: 0.18 + index * 0.13, ease: cinematic }}
                className="relative overflow-hidden rounded-[9px] bg-white px-2.5 py-2 text-[#071b46]"
              >
                <motion.i
                  initial={reduced ? false : { width: 0 }}
                  animate={{ width: `${Math.max(Number(points) * 2.35, 18)}%` }}
                  transition={{ duration: 0.9, delay: 0.45 + index * 0.13, ease: cinematic }}
                  className="absolute inset-y-0 left-0 bg-[#d8e8ff]"
                />
                <motion.i
                  animate={reduced ? undefined : { x: ['-120%', '500%'] }}
                  transition={{ duration: 2.8, delay: index * 0.25, repeat: Infinity, ease: 'linear' }}
                  className="absolute inset-y-0 left-0 w-9 skew-x-[-18deg] bg-white/55 blur-sm"
                />
                <div className="relative flex items-center">
                  <b className="w-5 text-[9px] text-[#e52d3e]">0{index + 1}</b>
                  <b className="text-[11px] tracking-[.02em]">{answer}</b>
                  <SplitCounter value={points} reduced={reduced} className="ml-auto text-base font-black text-[#0647b8]" />
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="relative mt-auto">
          <div className="mb-2 flex items-center justify-between text-[8px] font-bold text-[#6e83a0]">
            <span>ОТКРЫТО 4 ИЗ 6</span><span className="text-[#e52d3e]">✕ ✕ ○</span>
          </div>
          <motion.button
            whileTap={reduced ? undefined : { scale: 0.97 }}
            className="h-14 w-full rounded-[13px] bg-[#e52d3e] text-xs font-black uppercase tracking-[.1em] text-white shadow-[0_12px_28px_-12px_#e52d3e]"
          >
            Открыть следующий ответ
          </motion.button>
        </div>
      </PhoneFrame>

      <TvFrame className="bg-[#eaf1f9] font-sans text-[#071b46]">
        <div className="absolute inset-0 bg-[linear-gradient(125deg,#fff_0%,#e7f0fa_46%,#c9dcef_100%)]" />
        <div className="absolute inset-x-0 bottom-0 h-[21%] bg-[linear-gradient(180deg,#dfe9f4,#b8cce1)] [clip-path:polygon(0_36%,100%_0,100%_100%,0_100%)]" />
        <div className="absolute -left-[8%] top-[13%] h-[52%] w-[31%] rounded-[50%] border-[2vw] border-white/55" />
        <div className="absolute -right-[8%] top-[7%] h-[58%] w-[34%] rounded-[50%] border-[2vw] border-white/55" />
        <motion.div
          animate={reduced ? undefined : { x: ['-18%', '118%'] }}
          transition={{ duration: 7, repeat: Infinity, ease: 'linear' }}
          className="absolute top-0 h-full w-[16%] -skew-x-12 bg-gradient-to-r from-transparent via-white/45 to-transparent"
        />

        <div className="relative flex h-full flex-col px-[4.5%] py-[3.5%]">
          <div className="flex items-center justify-between">
            <b className="text-[clamp(18px,3vw,44px)] font-black tracking-[-.075em] text-[#0647b8]">100 К 1</b>
            <div className="rounded-full bg-white/80 px-[3%] py-[1%] text-[clamp(7px,.9vw,12px)] font-black uppercase tracking-[.18em] text-[#506b8c] shadow-sm">
              Раунд 2 · двойная игра
            </div>
            <span className="flex items-center gap-2 rounded-full bg-[#e52d3e] px-[2.5%] py-[.9%] text-[clamp(7px,.9vw,12px)] font-black uppercase tracking-[.15em] text-white">
              <motion.i
                animate={reduced ? undefined : { opacity: [1, 0.2, 1] }}
                transition={{ duration: 1.1, repeat: Infinity }}
                className="h-2 w-2 rounded-full bg-white"
              />
              Прямой эфир
            </span>
          </div>

          <h4 className="mx-auto mt-[2.5%] max-w-[78%] text-center text-[clamp(16px,2.5vw,36px)] font-black leading-tight tracking-[-.035em]">
            Что люди чаще всего забывают дома?
          </h4>

          <div className="relative mx-auto mt-[2.5%] w-[82%] flex-1 overflow-hidden rounded-[2vw] bg-[#0647b8] p-[2.2%] shadow-[0_2vw_5vw_-2vw_#315d91] ring-[.45vw] ring-white">
            <div className="flex items-center justify-between px-[1%] text-[clamp(7px,.8vw,11px)] font-black uppercase tracking-[.18em] text-white/55">
              <span>Панорамное табло</span><span>Результаты 100 опрошенных</span>
            </div>
            <div className="mt-[1.8%] grid h-[82%] grid-cols-2 gap-[3%] [perspective:1100px]">
              {ANSWERS.map(([answer, points], index) => (
                <motion.div
                  key={answer}
                  initial={rowInitial(index)}
                  animate={{ rotateX: 0, opacity: 1, y: 0 }}
                  transition={{ duration: 0.58, delay: 0.2 + index * 0.14, ease: cinematic }}
                  className="relative flex items-center overflow-hidden rounded-[.75vw] bg-white px-[5%] text-[#071b46] shadow-[inset_0_-3px_0_#bfd3ec]"
                >
                  <motion.i
                    initial={reduced ? false : { width: 0 }}
                    animate={{ width: `${Math.max(Number(points) * 2.35, 18)}%` }}
                    transition={{ duration: 1, delay: 0.45 + index * 0.14, ease: cinematic }}
                    className="absolute inset-y-0 left-0 bg-[#dceaff]"
                  />
                  <motion.i
                    animate={reduced ? undefined : { x: ['-160%', '700%'] }}
                    transition={{ duration: 3.4, delay: index * 0.3, repeat: Infinity, ease: 'linear' }}
                    className="absolute inset-y-0 left-0 w-[12%] -skew-x-12 bg-white/65 blur-md"
                  />
                  <div className="relative flex w-full items-center">
                    <b className="text-[clamp(8px,1vw,14px)] text-[#e52d3e]">0{index + 1}</b>
                    <span className="ml-[7%] text-[clamp(11px,1.55vw,22px)] font-black">{answer}</span>
                    <SplitCounter value={points} reduced={reduced} className="ml-auto text-[clamp(20px,3vw,44px)] font-black text-[#0647b8]" />
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          <div className="mt-[2.7%] grid grid-cols-[1fr_auto_1fr] items-center gap-[4%]">
            <div className="flex items-end gap-[6%] rounded-[1vw] bg-white/85 px-[6%] py-[2.5%] shadow-sm">
              <div>
                <small className="block text-[clamp(7px,.8vw,11px)] font-black uppercase tracking-[.14em] text-[#6e83a0]">Команда Синие</small>
                <SplitCounter value="240" reduced={reduced} className="text-[clamp(26px,4vw,58px)] font-black text-[#0647b8]" />
              </div>
              <span className="mb-[2%] text-[clamp(10px,1.6vw,24px)] font-black text-[#e52d3e]">✕ ✕ ○</span>
            </div>
            <div className="rounded-[1vw] bg-[#071b46] px-[2.8vw] py-[1vw] text-center text-white shadow-[0_1vw_2vw_-1vw_#071b46]">
              <small className="block text-[clamp(6px,.75vw,10px)] uppercase tracking-[.18em] text-white/55">Банк</small>
              <SplitCounter value="120" reduced={reduced} className="text-[clamp(22px,3.4vw,50px)] font-black" />
            </div>
            <div className="rounded-[1vw] bg-white/85 px-[6%] py-[2.5%] text-right shadow-sm">
              <small className="block text-[clamp(7px,.8vw,11px)] font-black uppercase tracking-[.14em] text-[#6e83a0]">Команда Красные</small>
              <SplitCounter value="180" reduced={reduced} className="text-[clamp(26px,4vw,58px)] font-black text-[#e52d3e]" />
            </div>
          </div>
        </div>
      </TvFrame>
    </div>
  );
}
