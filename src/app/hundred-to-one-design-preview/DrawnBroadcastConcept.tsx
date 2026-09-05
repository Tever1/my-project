'use client';

import { motion } from 'framer-motion';
import {
  ANSWERS,
  cinematic,
  PhoneFrame,
  spring,
  TvFrame,
} from './ConceptPrimitives';

export function DrawnBroadcastConcept({ reduced }: { reduced: boolean }) {
  const draw = (delay: number) => ({
    initial: reduced ? false : { clipPath: 'inset(0 100% 0 0)', opacity: 0 },
    animate: { clipPath: 'inset(0 0% 0 0)', opacity: 1 },
    transition: { duration: reduced ? 0.01 : 0.68, delay, ease: cinematic },
  });

  const scoreBounce = reduced
    ? undefined
    : { y: [0, -5, 1, 0], rotate: [-2, 2, -1, -2] };

  return (
    <div className="mt-10 grid items-start gap-8 lg:grid-cols-[326px_1fr]">
      <PhoneFrame className="bg-[#315f58] font-sans text-[#20242a]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_16%,#f7d451_0_2px,transparent_3px),radial-gradient(circle_at_80%_34%,#f6efd9_0_1px,transparent_2px)] bg-[size:31px_31px,23px_23px] opacity-35" />
        <div className="absolute -left-9 top-28 h-16 w-36 -rotate-6 bg-[#ef4f45]/85 [clip-path:polygon(3%_12%,96%_0,100%_82%,7%_100%)]" />
        <div className="absolute -right-8 bottom-32 h-20 w-32 rotate-6 bg-[#f2bd3f]/90 [clip-path:polygon(0_8%,92%_0,100%_92%,8%_100%)]" />

        <div className="relative mt-5 flex items-center justify-between text-[#f6efd9]">
          <b className="-rotate-2 text-lg font-black tracking-[-0.08em]">100 к 1</b>
          <span className="rotate-2 border-2 border-[#f6efd9] px-2 py-1 text-[8px] font-black">
            ЭФИР · РАУНД 2
          </span>
        </div>

        <motion.div
          initial={reduced ? false : { rotate: -7, y: 24, opacity: 0 }}
          animate={{ rotate: -2, y: 0, opacity: 1 }}
          transition={{ ...spring, delay: 0.08 }}
          className="relative mt-6 bg-[#f6efd9] p-4 shadow-[7px_8px_0_#173c37] [clip-path:polygon(2%_1%,98%_0,100%_94%,94%_100%,3%_97%,0_9%)]"
        >
          <span className="text-[8px] font-black uppercase tracking-[0.18em] text-[#ef4f45]">
            Карточка ведущего
          </span>
          <h4 className="mt-2 text-[20px] font-black leading-[1.02] tracking-[-0.045em]">
            Что люди чаще всего забывают дома?
          </h4>
          <motion.i
            animate={reduced ? undefined : { rotate: [-3, 2, -3] }}
            transition={{ duration: 2.6, repeat: Infinity }}
            className="absolute -bottom-2 right-5 h-3 w-20 bg-[#f2bd3f]/75"
          />
        </motion.div>

        <div className="relative mt-4 space-y-2.5">
          {ANSWERS.map(([answer, points], index) => (
            <motion.div
              key={answer}
              {...draw(0.22 + index * 0.13)}
              className={`flex h-12 items-center px-3 shadow-[4px_5px_0_#183f3a] ${
                index % 2
                  ? 'rotate-[1.5deg] bg-[#f1c64a]'
                  : '-rotate-[1deg] bg-[#f6efd9]'
              } [clip-path:polygon(1%_8%,98%_0,100%_91%,3%_100%)]`}
            >
              <span className="mr-3 text-xs font-black text-[#ef4f45]">{index + 1}.</span>
              <b className="relative text-xs tracking-[0.025em]">
                {answer}
                <motion.i
                  {...draw(0.52 + index * 0.13)}
                  className="absolute -bottom-1 left-0 h-[3px] w-full bg-[#2d8f83]"
                />
              </b>
              <motion.b
                animate={scoreBounce}
                transition={{ duration: 1.8, repeat: Infinity, delay: index * 0.18 }}
                className="ml-auto -rotate-3 text-2xl font-black text-[#ef4f45]"
              >
                {points}
              </motion.b>
            </motion.div>
          ))}
        </div>

        <div className="relative mt-auto grid grid-cols-[0.9fr_1.1fr] gap-3">
          <motion.button
            whileTap={reduced ? undefined : { scale: 0.9, rotate: -5 }}
            className="relative h-14 -rotate-2 border-[3px] border-[#8e201d] bg-[#ef4f45] text-xs font-black text-[#f6efd9] shadow-[4px_5px_0_#7c211f]"
          >
            <span className="absolute inset-1 border-2 border-[#f6efd9]/65" />
            <span className="relative">СТРАЙК ×</span>
          </motion.button>
          <motion.button
            whileTap={reduced ? undefined : { y: 4, rotate: 1 }}
            className="h-14 rotate-1 bg-[#f6efd9] text-xs font-black shadow-[5px_6px_0_#173c37] [clip-path:polygon(2%_0,100%_6%,97%_96%,0_100%)]"
          >
            НАРИСОВАТЬ ОТВЕТ
          </motion.button>
        </div>
      </PhoneFrame>

      <TvFrame className="bg-[#2d8f83] font-sans text-[#20242a]">
        <div className="absolute inset-0 bg-[repeating-linear-gradient(0deg,transparent_0_18px,#173c37_19px_20px)] opacity-20" />
        <div className="absolute -left-[3%] top-[9%] h-[18%] w-[25%] -rotate-6 bg-[#ef4f45] [clip-path:polygon(0_9%,98%_0,100%_81%,5%_100%)]" />
        <div className="absolute -right-[4%] bottom-[8%] h-[20%] w-[27%] rotate-3 bg-[#f2bd3f] [clip-path:polygon(2%_0,100%_11%,91%_100%,0_85%)]" />

        <div className="relative flex h-full flex-col px-[5%] py-[4%]">
          <div className="flex items-center justify-between text-[#f6efd9]">
            <b className="-rotate-2 text-[clamp(18px,3vw,42px)] font-black tracking-[-0.08em]">
              100 к 1
            </b>
            <span className="rotate-1 border-[3px] border-[#f6efd9] px-[3%] py-[1%] text-[clamp(8px,1vw,14px)] font-black">
              РИСОВАННЫЙ ЭФИР · РАУНД 02
            </span>
          </div>

          <div className="mt-[3%] grid min-h-0 flex-1 grid-cols-[0.72fr_1.7fr_0.72fr] items-center gap-[4%]">
            <div className="-rotate-2 text-center text-[#f6efd9]">
              <span className="block text-[clamp(9px,1.1vw,15px)] font-black">АКУЛЫ</span>
              <motion.b
                animate={scoreBounce}
                transition={{ duration: 1.7, repeat: Infinity }}
                className="block text-[clamp(38px,6vw,86px)] font-black"
              >
                240
              </motion.b>
              <div className="mt-[10%] flex justify-center gap-2">
                <motion.span
                  initial={reduced ? false : { scale: 2.3, rotate: -24, opacity: 0 }}
                  animate={{ scale: 1, rotate: -7, opacity: 1 }}
                  transition={{ ...spring, delay: 1.05 }}
                  className="grid aspect-square w-[28%] place-items-center border-[4px] border-[#7e1e1b] bg-[#ef4f45] text-[clamp(14px,2vw,28px)] font-black"
                >
                  ×
                </motion.span>
              </div>
            </div>

            <motion.div
              initial={reduced ? false : { y: 30, rotate: 2, opacity: 0 }}
              animate={{ y: 0, rotate: -1, opacity: 1 }}
              transition={{ ...spring, delay: 0.08 }}
              className="relative flex h-[94%] flex-col bg-[#f6efd9] p-[5%] shadow-[12px_14px_0_#173c37] [clip-path:polygon(1%_2%,98%_0,100%_96%,93%_100%,3%_98%,0_7%)]"
            >
              <span className="text-[clamp(7px,.8vw,11px)] font-black uppercase tracking-[0.2em] text-[#ef4f45]">
                Карточка ведущего № 07
              </span>
              <h4 className="mt-[2%] text-[clamp(17px,2.5vw,36px)] font-black leading-[0.98] tracking-[-0.045em]">
                Что люди чаще всего забывают дома?
              </h4>

              <div className="mt-[5%] grid flex-1 grid-cols-2 gap-[4%]">
                {ANSWERS.map(([answer, points], index) => (
                  <motion.div
                    key={answer}
                    {...draw(0.24 + index * 0.16)}
                    className={`relative flex items-center px-[6%] ${
                      index % 3 === 1 ? 'rotate-[1.5deg]' : '-rotate-[1deg]'
                    } ${
                      index % 2 ? 'bg-[#f1c64a]' : 'bg-white/70'
                    } [clip-path:polygon(1%_7%,98%_0,100%_92%,3%_100%)]`}
                  >
                    <span className="text-[clamp(9px,1vw,14px)] font-black text-[#2d8f83]">
                      {index + 1}.
                    </span>
                    <b className="ml-[6%] text-[clamp(10px,1.45vw,21px)]">{answer}</b>
                    <motion.b
                      initial={reduced ? false : { scale: 0, rotate: -18 }}
                      animate={{ scale: 1, rotate: index % 2 ? 3 : -4 }}
                      transition={{ ...spring, delay: 0.62 + index * 0.16 }}
                      className="ml-auto text-[clamp(21px,3vw,42px)] font-black text-[#ef4f45]"
                    >
                      {points}
                    </motion.b>
                    <motion.i
                      {...draw(0.48 + index * 0.16)}
                      className="absolute bottom-[18%] left-[19%] h-[4px] w-[44%] bg-[#2d8f83]"
                    />
                  </motion.div>
                ))}
              </div>
            </motion.div>

            <div className="rotate-2 text-center text-[#f6efd9]">
              <span className="block text-[clamp(9px,1.1vw,15px)] font-black">ЗУБРЫ</span>
              <motion.b
                animate={scoreBounce}
                transition={{ duration: 1.9, repeat: Infinity, delay: 0.25 }}
                className="block text-[clamp(38px,6vw,86px)] font-black"
              >
                180
              </motion.b>
              <small className="mt-[8%] block text-[clamp(7px,.9vw,12px)] font-bold">
                ждут ответа
              </small>
            </div>
          </div>

          <motion.div
            initial={reduced ? false : { scale: 0.65, rotate: -8 }}
            animate={{ scale: 1, rotate: 1 }}
            transition={{ ...spring, delay: 0.9 }}
            className="mx-auto mt-[2%] bg-[#f2bd3f] px-[7%] py-[1.5%] text-[clamp(10px,1.5vw,21px)] font-black shadow-[6px_7px_0_#173c37] [clip-path:polygon(2%_0,100%_8%,96%_100%,0_91%)]"
          >
            БАНК <span className="ml-3 text-[#ef4f45]">120</span>
          </motion.div>
        </div>
      </TvFrame>
    </div>
  );
}
