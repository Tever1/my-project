'use client';

import { motion } from 'framer-motion';
import { ANSWERS, cinematic, PhoneFrame, spring, SpecialBackdrop, TvFrame } from './QuizConceptPrimitives';

function AtlasDiagram({ reduced, tv = false }: { reduced: boolean; tv?: boolean }) {
  const points = tv
    ? [[18, 42], [58, 19], [105, 48], [144, 20], [176, 62]]
    : [[12, 36], [40, 15], [72, 41], [102, 18], [126, 52]];
  const path = tv ? 'M18 42 L58 19 L105 48 L144 20 L176 62' : 'M12 36 L40 15 L72 41 L102 18 L126 52';

  return (
    <svg viewBox={tv ? '0 0 194 78' : '0 0 140 66'} className="h-full w-full overflow-visible" aria-hidden="true">
      <motion.path
        d={path}
        fill="none"
        stroke="currentColor"
        strokeWidth={tv ? 1.5 : 1.2}
        strokeDasharray="3 3"
        initial={reduced ? false : { pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 0.72 }}
        transition={{ duration: 1.45, delay: 0.28, ease: cinematic }}
      />
      {points.map(([cx, cy], index) => (
        <motion.circle
          key={`${cx}-${cy}`}
          cx={cx}
          cy={cy}
          r={index === 2 ? 4 : 2.5}
          fill="currentColor"
          initial={reduced ? false : { scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ ...spring, delay: 0.42 + index * 0.12 }}
        />
      ))}
    </svg>
  );
}

function AnswerStamp({ reduced, tv = false }: { reduced: boolean; tv?: boolean }) {
  return (
    <motion.span
      initial={reduced ? false : { scale: 1.8, rotate: -18, opacity: 0 }}
      animate={{ scale: 1, rotate: -7, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 260, damping: 17, delay: 0.9 }}
      className={`absolute z-10 border-2 border-[#a73532] font-black uppercase tracking-[0.13em] text-[#a73532] ${
        tv ? 'right-[5%] top-[18%] px-[3%] py-[1.2%] text-[clamp(7px,.9vw,12px)]' : 'right-3 top-2 px-2 py-1 text-[7px]'
      }`}
    >
      Выбрано
    </motion.span>
  );
}

export function QuizAtlasConcept({ reduced, special }: { reduced: boolean; special: boolean }) {
  const paper = special ? 'bg-[#f7f1df]/94 shadow-[0_18px_55px_rgba(5,12,28,.34)] backdrop-blur-sm' : 'bg-[#f7f1df] shadow-[8px_10px_0_#c9bea5]';
  const answerPaper = special ? 'bg-[#fbf7eb]/95 backdrop-blur-sm' : 'bg-[#fbf7eb]';

  return (
    <div className="mt-10 grid items-start gap-8 lg:grid-cols-[326px_1fr]">
      <PhoneFrame className={`${special ? 'bg-[#111a2c]' : 'bg-[#e8dcc0]'} font-serif text-[#172847]`}>
        <SpecialBackdrop special={special} />
        {special && <div className="absolute inset-0 bg-[#10192a]/28" />}
        {!special && (
          <div className="absolute inset-0 opacity-45 [background-image:linear-gradient(#233b6420_1px,transparent_1px),linear-gradient(90deg,#233b6420_1px,transparent_1px)] [background-size:28px_28px]" />
        )}

        <div className="relative mt-5 flex items-center justify-between">
          <div>
            <span className={`block font-mono text-[7px] font-bold uppercase tracking-[0.2em] ${special ? 'text-white/65' : 'text-[#a73532]'}`}>
              {special ? 'Тематическая экспедиция' : 'Атлас знаний'}
            </span>
            <b className={`text-lg font-black tracking-[-0.04em] ${special ? 'text-white' : 'text-[#172847]'}`}>КВИЗ · 100</b>
          </div>
          <div className="rotate-2 bg-[#a73532] px-3 py-2 font-mono text-[8px] font-black text-[#fff8e8] shadow-[4px_4px_0_#6e2425]">12 / 20</div>
        </div>

        <motion.section
          initial={reduced ? false : { rotateY: -72, x: -46, opacity: 0 }}
          animate={{ rotateY: 0, x: 0, opacity: 1 }}
          transition={{ duration: 0.78, ease: cinematic }}
          className={`relative mt-6 origin-left overflow-hidden p-4 [transform-style:preserve-3d] ${paper}`}
        >
          <div className="flex items-start justify-between gap-3">
            <span className="font-mono text-[8px] font-bold uppercase tracking-[0.17em] text-[#a73532]">Глава 04 · Космос</span>
            <span className="font-mono text-[8px] text-[#172847]/45">00:18</span>
          </div>
          <h4 className="mt-3 text-[21px] font-black leading-[1.04] tracking-[-0.035em]">Какая планета ближе всего к Солнцу?</h4>
          <div className="mt-4 h-14 text-[#244f85]"><AtlasDiagram reduced={reduced} /></div>
          <div className="absolute -bottom-7 -right-5 h-20 w-20 rounded-full border border-[#a73532]/25" />
          <div className="absolute -bottom-3 right-4 h-11 w-11 rounded-full border border-[#a73532]/20" />
        </motion.section>

        <div className="relative mt-4 grid gap-2.5 font-sans">
          {ANSWERS.map(([letter, answer], index) => {
            const selected = letter === 'D';
            return (
              <motion.div
                key={letter}
                initial={reduced ? false : { x: index % 2 ? 44 : -44, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ ...spring, delay: 0.2 + index * 0.1 }}
                className={`relative flex h-12 items-center border border-[#172847]/18 px-3 ${answerPaper} ${selected ? 'ring-2 ring-[#a73532]/65' : ''}`}
              >
                <span className={`grid h-7 w-7 place-items-center font-mono text-xs font-black ${selected ? 'bg-[#a73532] text-white' : 'bg-[#172847] text-[#f7f1df]'}`}>{letter}</span>
                <b className="ml-3 text-xs text-[#172847]">{answer}</b>
                {selected && <AnswerStamp reduced={reduced} />}
              </motion.div>
            );
          })}
        </div>

        <div className="relative mt-auto">
          <div className={`mb-3 flex justify-between font-mono text-[8px] ${special ? 'text-white/65' : 'text-[#172847]/50'}`}>
            <span>НАУКА · СРЕДНИЙ</span><span>СЕРИЯ 4</span>
          </div>
          <motion.button
            whileTap={reduced ? undefined : { y: 5, boxShadow: '0 0 0 #8c2828' }}
            className="h-14 w-full bg-[#a73532] font-sans text-xs font-black uppercase tracking-[0.13em] text-white shadow-[0_6px_0_#762629]"
          >
            Зафиксировать ответ
          </motion.button>
        </div>
      </PhoneFrame>

      <TvFrame className={`${special ? 'bg-[#101827]' : 'bg-[#e8dcc0]'} font-serif text-[#172847]`}>
        <SpecialBackdrop special={special} />
        {special && <div className="absolute inset-0 bg-[#0c1424]/25" />}
        {!special && (
          <>
            <div className="absolute inset-0 opacity-35 [background-image:linear-gradient(#233b641c_1px,transparent_1px),linear-gradient(90deg,#233b641c_1px,transparent_1px)] [background-size:4%_7%]" />
            <div className="absolute -left-[8%] top-[8%] h-[82%] w-[35%] rotate-6 rounded-full border border-[#244f85]/18" />
            <div className="absolute -right-[4%] -top-[18%] h-[74%] w-[31%] rounded-full border border-[#a73532]/18" />
          </>
        )}

        <div className="relative flex h-full flex-col px-[5%] py-[4%]">
          <header className="flex items-center justify-between">
            <div className={`font-mono text-[clamp(8px,1vw,14px)] font-bold uppercase tracking-[0.18em] ${special ? 'text-white' : 'text-[#172847]'}`}>
              <b className="mr-4 bg-[#172847] px-3 py-2 text-[#f7f1df]">КВИЗ · 100</b>
              {special ? 'Тематическая экспедиция' : 'Атлас знаний'}
            </div>
            <div className="rotate-1 bg-[#a73532] px-[3%] py-[1.2%] font-mono text-[clamp(7px,.9vw,12px)] font-black text-white shadow-[6px_6px_0_#762629]">ВОПРОС 12 / 20</div>
          </header>

          <div className="mt-[4%] grid min-h-0 flex-1 grid-cols-[1.18fr_.82fr] gap-[4%]">
            <motion.section
              initial={reduced ? false : { rotateY: -68, x: -90, opacity: 0 }}
              animate={{ rotateY: 0, x: 0, opacity: 1 }}
              transition={{ duration: 0.84, ease: cinematic }}
              className={`relative flex min-h-0 origin-left flex-col overflow-hidden p-[6%] [transform-style:preserve-3d] ${paper}`}
            >
              <div className="flex items-center justify-between font-mono text-[clamp(7px,.8vw,11px)] font-bold uppercase tracking-[0.16em] text-[#a73532]">
                <span>Глава 04 · Космос</span><span className="text-[#172847]/45">Сложность · Средняя</span>
              </div>
              <h4 className="mt-[5%] max-w-[85%] text-[clamp(22px,4vw,58px)] font-black leading-[0.94] tracking-[-0.05em]">Какая планета ближе всего к Солнцу?</h4>
              <div className="mt-auto h-[28%] w-[68%] text-[#244f85]"><AtlasDiagram reduced={reduced} tv /></div>
              <motion.div
                initial={reduced ? false : { scale: 1.8, rotate: 16, opacity: 0 }}
                animate={{ scale: 1, rotate: -8, opacity: 0.82 }}
                transition={{ ...spring, delay: 0.65 }}
                className="absolute bottom-[8%] right-[7%] grid aspect-square w-[18%] place-items-center rounded-full border-[3px] border-[#a73532] text-center font-mono text-[clamp(7px,.9vw,12px)] font-black uppercase text-[#a73532]"
              >
                Архив<br />№ 04
              </motion.div>
            </motion.section>

            <div className="flex min-h-0 flex-col">
              <div className="grid flex-1 grid-rows-4 gap-[3%] font-sans">
                {ANSWERS.map(([letter, answer], index) => {
                  const selected = letter === 'D';
                  return (
                    <motion.div
                      key={letter}
                      initial={reduced ? false : { x: 85, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ ...spring, delay: 0.22 + index * 0.11 }}
                      className={`relative grid min-h-0 grid-cols-[18%_1fr] items-stretch border border-[#172847]/18 ${answerPaper} ${selected ? 'ring-[3px] ring-[#a73532]/65' : ''}`}
                    >
                      <span className={`grid place-items-center font-mono text-[clamp(12px,2vw,28px)] font-black ${selected ? 'bg-[#a73532] text-white' : 'bg-[#172847] text-[#f7f1df]'}`}>{letter}</span>
                      <b className="flex items-center px-[7%] text-[clamp(11px,1.7vw,24px)] text-[#172847]">{answer}</b>
                      {selected && <AnswerStamp reduced={reduced} tv />}
                    </motion.div>
                  );
                })}
              </div>
              <div className={`mt-[5%] flex items-center justify-between font-mono text-[clamp(7px,.8vw,11px)] ${special ? 'text-white' : 'text-[#172847]/55'}`}>
                <span>ОТВЕЧАЮТ · 8 ИГРОКОВ</span>
                <b className="bg-[#172847] px-[4%] py-[2%] text-[#f7f1df]">00:18</b>
              </div>
            </div>
          </div>
        </div>
      </TvFrame>
    </div>
  );
}
