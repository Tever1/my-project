'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useState } from 'react';
import { BigScreenConcept } from './BigScreenConcept';
import { ConstructorConcept } from './ConstructorConcept';
import { DrawnBroadcastConcept } from './DrawnBroadcastConcept';
import { StudioConcept } from './StudioConcept';

type ConceptId = 'studio' | 'arena' | 'pop' | 'bureau';
type Concept = {
  id: ConceptId;
  number: string;
  name: string;
  subtitle: string;
  description: string;
  palette: string[];
  tags: string[];
};

const CONCEPTS: Concept[] = [
  {
    id: 'studio',
    number: 'A',
    name: 'Народная студия',
    subtitle: 'Тёплый эфир · Механическое табло · Большая сцена',
    description:
      'Знакомая семейная телеигра без ностальгического китча: бордовый бархат, молочные панели, латунные рамки и табло, которое ощущается настоящим объектом в студии.',
    palette: ['#6f1028', '#f6e8c9', '#d7a84a', '#17121a'],
    tags: ['сценическая арка', 'лампы накаливания', 'табло-перевёртыш'],
  },
  {
    id: 'arena',
    number: 'B',
    name: 'Большой экран',
    subtitle: 'Светлая студия · Панорамное табло · Динамика голосов',
    description:
      'Современный дневной эфир: белая телевизионная студия, огромное синее табло и красная графика прямого включения. Ответы раскрываются как строки информационного дисплея, а очки набираются на глазах у зрителей.',
    palette: ['#f4f8ff', '#0647b8', '#e52d3e', '#071b46'],
    tags: ['панорамное табло', 'шкала голосов', 'аэропортовый счётчик'],
  },
  {
    id: 'pop',
    number: 'C',
    name: 'Рисованный эфир',
    subtitle: 'Бумага · Маркер · Гуашь · Ответы в прямом эфире',
    description:
      'Шоу выглядит как живой альбом ведущего: вопрос написан маркером, ответы дорисовываются на бумажных карточках прямо в эфире, страйки ставятся красным штампом, а очки подпрыгивают рукописными цифрами.',
    palette: ['#f6efd9', '#20242a', '#ef4f45', '#2d8f83'],
    tags: ['карточки ведущего', 'гуашевые мазки', 'красный штамп'],
  },
  {
    id: 'bureau',
    number: 'D',
    name: 'Сцена-конструктор',
    subtitle: 'Модульные декорации · Физика блоков · Яркий эфир',
    description:
      'Светлая студия собрана из крупных сценических деталей: ультрамариновые и оранжевые панели раздвигаются, ответы защёлкиваются в единое табло, а банк выкатывается на сцену отдельным кубом.',
    palette: ['#f4eedc', '#2146c7', '#ff6828', '#171d35'],
    tags: ['сдвижные панели', 'модульное табло', 'банк-куб'],
  },
];

const spring = { type: 'spring' as const, stiffness: 180, damping: 22 };
const cinematic = [0.22, 1, 0.36, 1] as const;

function ConceptHeader({ concept }: { concept: Concept }) {
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
      <div>
        <div className="flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.2em] text-white/38">
          <span className="rounded-full border border-white/12 px-3 py-1.5 text-white/70">
            Концепция {concept.number}
          </span>
          <span>{concept.subtitle}</span>
        </div>
        <h3 className="mt-4 text-4xl font-black tracking-[-0.045em] text-white sm:text-6xl">
          {concept.name}
        </h3>
        <p className="mt-4 max-w-3xl text-base leading-relaxed text-white/48 sm:text-lg">
          {concept.description}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2 lg:max-w-[360px] lg:justify-end">
        {concept.palette.map(color => (
          <span
            key={color}
            className="h-9 w-9 rounded-full border border-white/15 shadow-lg"
            style={{ background: color }}
            title={color}
          />
        ))}
        {concept.tags.map(tag => (
          <span
            key={tag}
            className="rounded-full border border-white/10 bg-white/[.05] px-3 py-2 text-[11px] text-white/48"
          >
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
}

function ConceptCanvas({ id, reduced }: { id: ConceptId; reduced: boolean }) {
  if (id === 'studio') return <StudioConcept reduced={reduced} />;
  if (id === 'arena') return <BigScreenConcept reduced={reduced} />;
  if (id === 'pop') return <DrawnBroadcastConcept reduced={reduced} />;
  return <ConstructorConcept reduced={reduced} />;
}

export function HundredToOneConceptGallery() {
  const [selected, setSelected] = useState<ConceptId>('studio');
  const reduced = Boolean(useReducedMotion());
  const concept = CONCEPTS.find(item => item.id === selected) ?? CONCEPTS[0];

  return (
    <section id="directions" className="border-b border-white/8 bg-[#0b0908] px-5 py-20 sm:px-10 lg:px-16">
      <div className="mx-auto max-w-[1500px]">
        <div className="max-w-4xl">
          <p className="font-mono text-xs font-bold uppercase tracking-[0.24em] text-amber-300/70">
            Design exploration · 4 направления
          </p>
          <h2 className="mt-3 text-4xl font-extrabold tracking-[-0.04em] text-white sm:text-6xl">
            Какой может стать телеигра
          </h2>
          <p className="mt-5 text-base leading-relaxed text-white/48 sm:text-lg">
            Четыре независимые дизайн-системы. Переключай направления и сравнивай одну и ту же игровую
            ситуацию на телефоне ведущего и общем TV.
          </p>
        </div>

        <div className="mt-10 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {CONCEPTS.map(item => {
            const active = item.id === selected;
            return (
              <motion.button
                key={item.id}
                type="button"
                onClick={() => setSelected(item.id)}
                whileHover={reduced ? undefined : { y: -5 }}
                whileTap={reduced ? undefined : { scale: 0.98 }}
                transition={spring}
                className={`relative overflow-hidden rounded-[22px] border p-5 text-left transition-colors ${
                  active
                    ? 'border-white/28 bg-white/[.11]'
                    : 'border-white/9 bg-white/[.035] hover:bg-white/[.06]'
                }`}
              >
                <motion.span
                  layoutId="h2o-concept-active"
                  className={`absolute inset-x-0 top-0 h-1 ${active ? 'opacity-100' : 'opacity-0'}`}
                  style={{ background: `linear-gradient(90deg, ${item.palette.join(',')})` }}
                />
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-white/35">{item.number}</span>
                  <div className="flex -space-x-1.5">
                    {item.palette.map(color => (
                      <i
                        key={color}
                        className="h-5 w-5 rounded-full border-2 border-[#151210]"
                        style={{ background: color }}
                      />
                    ))}
                  </div>
                </div>
                <b className="mt-5 block text-xl font-extrabold text-white">{item.name}</b>
                <span className="mt-2 block text-xs leading-relaxed text-white/38">{item.subtitle}</span>
              </motion.button>
            );
          })}
        </div>

        <div className="mt-10 rounded-[30px] border border-white/10 bg-white/[.025] p-5 sm:p-8 lg:p-10">
          <AnimatePresence mode="wait">
            <motion.div
              key={concept.id}
              initial={reduced ? false : { opacity: 0, y: 24, filter: 'blur(10px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={reduced ? undefined : { opacity: 0, y: -18, filter: 'blur(8px)' }}
              transition={{ duration: 0.55, ease: cinematic }}
            >
              <ConceptHeader concept={concept} />
              <ConceptCanvas id={concept.id} reduced={reduced} />
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-[18px] border border-white/8 bg-white/[.025] px-5 py-4 text-xs text-white/38">
          <span>Референсный язык: центральное табло, две команды, ведущий и сценическое раскрытие ответов.</span>
          <div className="flex flex-wrap gap-4">
            <a className="text-white/62 underline decoration-white/20 underline-offset-4 hover:text-white" href="https://2vmedia.ru/proekty/sto-k-odnomu/" target="_blank" rel="noreferrer">«Сто к одному»</a>
            <a className="text-white/62 underline decoration-white/20 underline-offset-4 hover:text-white" href="https://inframedesigns.com/work/ff" target="_blank" rel="noreferrer">Family Feud Canada</a>
            <a className="text-white/62 underline decoration-white/20 underline-offset-4 hover:text-white" href="https://www.mossled.com/blogs/news/family-feud-canada-1" target="_blank" rel="noreferrer">LED game board</a>
          </div>
        </div>
      </div>
    </section>
  );
}
