'use client';

import { motion } from 'framer-motion';
import {
  ANSWERS,
  cinematic,
  PhoneFrame,
  SpecialBackdrop,
  spring,
  TvFrame,
} from './QuizConceptPrimitives';

type QuizArcadeConceptProps = {
  reduced: boolean;
  special: boolean;
};

const pixelColors = ['#eaff36', '#32f49b', '#ff3db8'];

function PixelBlocks({ reduced, special = false }: { reduced: boolean; special?: boolean }) {
  if (special) return null;

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {Array.from({ length: 10 }, (_, index) => (
        <motion.i
          key={index}
          animate={
            reduced
              ? undefined
              : {
                  y: [0, index % 2 ? 18 : -18, 0],
                  opacity: [0.18, 0.5, 0.18],
                }
          }
          transition={{ duration: 3.2 + (index % 4), repeat: Infinity, delay: index * 0.17 }}
          className="absolute h-2.5 w-2.5"
          style={{
            left: `${7 + ((index * 19) % 88)}%`,
            top: `${12 + ((index * 23) % 76)}%`,
            backgroundColor: pixelColors[index % pixelColors.length],
            boxShadow: `10px 0 0 ${pixelColors[(index + 1) % pixelColors.length]}`,
          }}
        />
      ))}
    </div>
  );
}

function EnergyBar({ reduced, compact = false }: { reduced: boolean; compact?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <span className="font-mono text-[8px] font-black uppercase tracking-[0.14em] text-[#eaff36]">
        Energy
      </span>
      <div className={`overflow-hidden border border-[#eaff36]/50 bg-black/70 ${compact ? 'h-2 flex-1' : 'h-3 w-32'}`}>
        <motion.i
          className="block h-full origin-left bg-[linear-gradient(90deg,#32f49b,#eaff36)] shadow-[0_0_14px_#eaff36]"
          initial={reduced ? false : { scaleX: 0 }}
          animate={reduced ? { scaleX: 0.72 } : { scaleX: [0.18, 0.88, 0.72] }}
          transition={{ duration: reduced ? 0 : 2.8, ease: cinematic }}
        />
      </div>
      <b className="font-mono text-[9px] text-white">18</b>
    </div>
  );
}

function AnswerSlots({ reduced, tv = false, special = false }: { reduced: boolean; tv?: boolean; special?: boolean }) {
  return (
    <div className={tv ? 'grid grid-cols-2 gap-[3%]' : 'grid gap-2.5'}>
      {ANSWERS.map(([letter, text], index) => (
        <motion.div
          key={letter}
          initial={reduced ? false : { clipPath: 'inset(50% 0 50% 0)', opacity: 0 }}
          animate={{ clipPath: 'inset(0% 0 0% 0)', opacity: 1 }}
          transition={{ duration: reduced ? 0.01 : 0.42, delay: 0.18 + index * 0.1, ease: cinematic }}
          className={`relative flex items-center overflow-hidden border font-mono ${
            tv ? 'min-h-0 px-[5%] py-[4%]' : 'h-12 px-3'
          } ${
            special
              ? 'border-white/30 bg-black/70 text-white backdrop-blur-sm'
              : 'border-white/20 bg-[#111318] text-white shadow-[5px_5px_0_#050607]'
          }`}
        >
          <motion.i
            initial={reduced ? false : { scaleY: 0 }}
            animate={{ scaleY: 1 }}
            transition={{ ...spring, delay: 0.28 + index * 0.1 }}
            className={`absolute inset-y-0 left-0 w-1 origin-bottom ${index === 2 ? 'bg-[#ff3db8]' : 'bg-[#32f49b]'}`}
          />
          <b className={`grid place-items-center bg-[#eaff36] text-black ${tv ? 'h-8 w-8 text-sm' : 'h-7 w-7 text-xs'}`}>
            {letter}
          </b>
          <span className={`ml-[6%] font-black uppercase tracking-[0.04em] ${tv ? 'text-[clamp(10px,1.45vw,21px)]' : 'text-xs'}`}>
            {text}
          </span>
          <span className="ml-auto h-2 w-2 bg-white/20" />
        </motion.div>
      ))}
    </div>
  );
}

export function QuizArcadeConcept({ reduced, special }: QuizArcadeConceptProps) {
  return (
    <div className="mt-10 grid items-start gap-8 lg:grid-cols-[326px_1fr]">
      <PhoneFrame className={`${special ? 'bg-black' : 'bg-[#050607]'} font-sans text-white`}>
        <SpecialBackdrop special={special} />
        <PixelBlocks reduced={reduced} special={special} />
        {!special && <div className="absolute inset-0 bg-[linear-gradient(#32f49b0e_1px,transparent_1px),linear-gradient(90deg,#32f49b0e_1px,transparent_1px)] bg-[size:22px_22px]" />}

        <div className={`relative mt-5 flex items-center justify-between font-mono ${special ? 'border-x-2 border-t-2 border-[#eaff36] bg-black/72 px-3 py-2 backdrop-blur-sm' : ''}`}>
          <b className="text-sm font-black tracking-[-0.04em] text-[#eaff36]">QUIZ//CLUB</b>
          <span className="bg-[#ff3db8] px-2 py-1 text-[8px] font-black text-black">R02 · x3</span>
        </div>

        <div className={`${special ? 'relative mt-auto border-x-2 border-[#eaff36] bg-black/72 px-3 pt-3 backdrop-blur-sm' : 'relative mt-7'}`}>
          <div className="mb-3 flex items-center justify-between font-mono text-[8px] uppercase tracking-[0.16em] text-white/55">
            <span>{special ? 'Спецквиз · Harry Potter' : 'Наука · Средний'}</span>
            <span>3 / 10</span>
          </div>
          <motion.div
            initial={reduced ? false : { x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ ...spring, delay: 0.08 }}
            className={`${special ? 'border border-white/25 bg-black/78' : 'border-l-4 border-[#eaff36] bg-[#111318] shadow-[7px_7px_0_#ff3db8]'} p-4`}
          >
            <span className="font-mono text-[8px] font-black uppercase tracking-[0.2em] text-[#32f49b]">Mission 03</span>
            <h4 className="mt-2 text-[19px] font-black leading-[1.05] tracking-[-0.035em]">
              Какая планета самая большая в Солнечной системе?
            </h4>
          </motion.div>
          <div className="mt-4">
            <AnswerSlots reduced={reduced} special={special} />
          </div>
          <div className={`${special ? 'mt-4 border-t border-white/20 py-3' : 'mt-5'} `}>
            <EnergyBar reduced={reduced} compact />
          </div>
        </div>

        <div className={`relative ${special ? 'border-x-2 border-b-2 border-[#eaff36] bg-black/72 px-3 pb-3 backdrop-blur-sm' : 'mt-auto'} flex items-end justify-between font-mono`}>
          <div><small className="block text-[7px] text-white/45">PLAYER 01</small><b className="text-lg text-[#32f49b]">2 400</b></div>
          <motion.div
            animate={reduced ? undefined : { boxShadow: ['0 0 0 #eaff3600', '0 0 20px #eaff3699', '0 0 0 #eaff3600'] }}
            transition={{ duration: 1.8, repeat: Infinity }}
            className="bg-[#eaff36] px-3 py-2 text-[9px] font-black text-black"
          >
            LOCK ANSWER
          </motion.div>
        </div>
      </PhoneFrame>

      <TvFrame className={`${special ? 'bg-black' : 'bg-[#050607]'} font-sans text-white`}>
        <SpecialBackdrop special={special} />
        <PixelBlocks reduced={reduced} special={special} />
        {!special && <div className="absolute inset-0 bg-[linear-gradient(#32f49b0c_1px,transparent_1px),linear-gradient(90deg,#32f49b0c_1px,transparent_1px)] bg-[size:4%_8%]" />}

        {special && <><div className="absolute inset-x-[3%] top-[4%] h-[3px] bg-[#eaff36] shadow-[0_0_15px_#eaff36]" /><div className="absolute inset-y-[8%] left-[3%] w-[3px] bg-[#32f49b]" /><div className="absolute inset-y-[8%] right-[3%] w-[3px] bg-[#ff3db8]" /></>}

        <div className="relative flex h-full flex-col px-[5%] py-[4%]">
          <div className={`flex items-center justify-between font-mono ${special ? 'bg-black/68 px-[2%] py-[1%] backdrop-blur-sm' : ''}`}>
            <b className="text-[clamp(15px,2.2vw,32px)] font-black tracking-[-0.05em] text-[#eaff36]">QUIZ//ARCADE CLUB</b>
            <div className="flex items-center gap-4"><EnergyBar reduced={reduced} /><span className="bg-[#ff3db8] px-3 py-1.5 text-[clamp(7px,.9vw,12px)] font-black text-black">LIVE · Q03</span></div>
          </div>

          <div className={`mt-[3%] grid min-h-0 flex-1 ${special ? 'grid-cols-[1fr_1.18fr] items-end gap-[5%]' : 'grid-cols-[0.72fr_1.55fr_0.72fr] items-center gap-[4%]'}`}>
            {!special && <div className="font-mono"><span className="text-[clamp(8px,1vw,14px)] text-white/48">LEADER</span><motion.b animate={reduced ? undefined : { y: [0, -5, 0] }} transition={{ duration: 1.7, repeat: Infinity }} className="block text-[clamp(34px,5vw,72px)] font-black text-[#32f49b]">2400</motion.b><small className="text-white/35">КАТЯ · 3 COMBO</small></div>}

            <motion.div
              initial={reduced ? false : { scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ ...spring, delay: 0.06 }}
              className={`${special ? 'col-span-2 grid grid-cols-[1fr_1.25fr] gap-[4%] border-x-2 border-t-2 border-[#eaff36] bg-black/74 p-[3%] backdrop-blur-sm' : 'border border-white/15 bg-[#0f1116] p-[5%] shadow-[12px_12px_0_#ff3db8]'}`}
            >
              <div className={special ? 'self-center' : ''}>
                <span className="font-mono text-[clamp(7px,.9vw,12px)] font-black uppercase tracking-[0.2em] text-[#32f49b]">Mission 03 · {special ? 'Special' : 'Science'}</span>
                <h4 className="mt-[2%] text-[clamp(18px,2.8vw,40px)] font-black leading-[1.02] tracking-[-0.04em]">Какая планета самая большая в Солнечной системе?</h4>
              </div>
              <div className={special ? '' : 'mt-[6%]'}><AnswerSlots reduced={reduced} tv special={special} /></div>
            </motion.div>

            {!special && <div className="text-right font-mono"><span className="text-[clamp(8px,1vw,14px)] text-white/48">RUNNER</span><motion.b animate={reduced ? undefined : { y: [0, -4, 0] }} transition={{ duration: 1.9, repeat: Infinity, delay: 0.2 }} className="block text-[clamp(34px,5vw,72px)] font-black text-[#ff3db8]">2100</motion.b><small className="text-white/35">МИША · 2 COMBO</small></div>}
          </div>

          <div className={`${special ? 'border-x-2 border-b-2 border-[#eaff36] bg-black/74 px-[3%] py-[1.5%] backdrop-blur-sm' : 'mt-[3%]'} flex items-center justify-between font-mono`}>
            <span className="text-[clamp(7px,.9vw,12px)] text-white/55">8 PLAYERS · ANSWERS LOCKED 5/8</span>
            <motion.div
              animate={reduced ? undefined : { opacity: [0.55, 1, 0.55] }}
              transition={{ duration: 1.2, repeat: Infinity }}
              className="flex items-center gap-2 text-[clamp(8px,1vw,14px)] font-black text-[#eaff36]"
            >
              <i className="h-2.5 w-2.5 bg-[#eaff36]" /> ENERGY WINDOW · 18 SEC
            </motion.div>
          </div>
        </div>
      </TvFrame>
    </div>
  );
}
