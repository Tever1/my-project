'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useState } from 'react';
import { QuizArcadeConcept } from './QuizArcadeConcept';
import { QuizAtlasConcept } from './QuizAtlasConcept';
import { QuizKineticConcept } from './QuizKineticConcept';
import { QuizPulseConcept } from './QuizPulseConcept';

type ConceptId = 'pulse' | 'atlas' | 'arcade' | 'kinetic';
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
    id: 'pulse',
    number: 'A',
    name: 'Пульс эфира',
    subtitle: 'Прайм-тайм · Световые титры · Цветовой захват',
    description:
      'Квиз превращается в динамичный прямой эфир: крупная синяя сцена, белые информационные панели и коралловые импульсы. Таймер ведёт взгляд, а правильный ответ становится главным телевизионным событием.',
    palette: ['#061a3a', '#0878ff', '#ff5d55', '#f4f8ff'],
    tags: ['эфирные титры', 'световая волна', 'панорамный вопрос'],
  },
  {
    id: 'atlas',
    number: 'B',
    name: 'Атлас знаний',
    subtitle: 'Бумага · Схемы · Созвездия · Печатный ритм',
    description:
      'Тёплая интеллектуальная игра, похожая на оживший кабинет исследователя. Вопросы разворачиваются как страницы, связи дорисовываются чернилами, а результат фиксируется уверенным красным штампом.',
    palette: ['#eee4ca', '#123b61', '#b63b32', '#d5aa48'],
    tags: ['карта знаний', 'линии чернил', 'печатный штамп'],
  },
  {
    id: 'arcade',
    number: 'C',
    name: 'Аркадный клуб',
    subtitle: 'Игровые слоты · Energy bar · Пиксельный драйв',
    description:
      'Самый соревновательный вариант: чёрный игровой автомат, кислотные цвета и ответы-слоты. Каждый выбор ощущается как ход в аркаде, а таблица результатов собирается из пиксельных блоков.',
    palette: ['#07080a', '#e8ff3b', '#20e6a6', '#ff3da8'],
    tags: ['answer slots', 'energy timer', 'pixel reveal'],
  },
  {
    id: 'kinetic',
    number: 'D',
    name: 'Кинетическая студия',
    subtitle: 'Модульные панели · Большой вопрос · Физические переходы',
    description:
      'Светлая сценография из кобальтовых и оранжевых плоскостей. Вопрос занимает центр сцены, ответы собираются из физических модулей, а интерфейс движется как настоящие телевизионные декорации.',
    palette: ['#f1eee4', '#1e4bd8', '#ff6b2c', '#111827'],
    tags: ['сценические модули', 'большая типографика', 'spring motion'],
  },
];

const spring = { type: 'spring' as const, stiffness: 180, damping: 22 };
const cinematic = [0.22, 1, 0.36, 1] as const;

function ConceptCanvas({ id, reduced, special }: { id: ConceptId; reduced: boolean; special: boolean }) {
  if (id === 'pulse') return <QuizPulseConcept reduced={reduced} special={special} />;
  if (id === 'atlas') return <QuizAtlasConcept reduced={reduced} special={special} />;
  if (id === 'arcade') return <QuizArcadeConcept reduced={reduced} special={special} />;
  return <QuizKineticConcept reduced={reduced} special={special} />;
}

function ConceptHeader({ concept }: { concept: Concept }) {
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
      <div>
        <div className="flex flex-wrap items-center gap-3 font-mono text-[11px] uppercase tracking-[.2em] text-white/38">
          <span className="rounded-full border border-white/12 px-3 py-1.5 text-white/70">Концепция {concept.number}</span>
          <span>{concept.subtitle}</span>
        </div>
        <h3 className="mt-4 text-4xl font-black tracking-[-.045em] text-white sm:text-6xl">{concept.name}</h3>
        <p className="mt-4 max-w-3xl text-base leading-relaxed text-white/48 sm:text-lg">{concept.description}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2 lg:max-w-[380px] lg:justify-end">
        {concept.palette.map(color => <span key={color} className="h-9 w-9 rounded-full border border-white/15 shadow-lg" style={{ background: color }} title={color} />)}
        {concept.tags.map(tag => <span key={tag} className="rounded-full border border-white/10 bg-white/[.05] px-3 py-2 text-[11px] text-white/48">{tag}</span>)}
      </div>
    </div>
  );
}

export function QuizConceptGallery() {
  const [selected, setSelected] = useState<ConceptId>('pulse');
  const [special, setSpecial] = useState(false);
  const reduced = Boolean(useReducedMotion());
  const concept = CONCEPTS.find(item => item.id === selected) ?? CONCEPTS[0];

  return (
    <section id="directions" className="border-b border-white/8 bg-[#0c0913] px-5 py-20 sm:px-10 lg:px-16">
      <div className="mx-auto max-w-[1500px]">
        <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
          <div className="max-w-4xl">
            <p className="font-mono text-xs font-bold uppercase tracking-[.24em] text-purple-300/70">Design exploration · 4 направления</p>
            <h2 className="mt-3 text-4xl font-extrabold tracking-[-.04em] text-white sm:text-6xl">Новый характер Квиза</h2>
            <p className="mt-5 text-base leading-relaxed text-white/48 sm:text-lg">Четыре независимые дизайн-системы для телефона и TV. Переключатель фона показывает обязательное различие между общими и специальными квизами.</p>
          </div>

          <div className="rounded-[18px] border border-white/10 bg-white/[.05] p-1.5">
            <div className="grid grid-cols-2 gap-1">
              <button type="button" onClick={() => setSpecial(false)} className={`rounded-[13px] px-5 py-3 text-left transition-colors ${!special ? 'bg-white text-[#17111e]' : 'text-white/55 hover:bg-white/[.05]'}`}><b className="block text-sm">Общий квиз</b><small className="text-[10px] opacity-60">новый фон концепта</small></button>
              <button type="button" onClick={() => setSpecial(true)} className={`rounded-[13px] px-5 py-3 text-left transition-colors ${special ? 'bg-white text-[#17111e]' : 'text-white/55 hover:bg-white/[.05]'}`}><b className="block text-sm">Специальный</b><small className="text-[10px] opacity-60">фон темы сохранён</small></button>
            </div>
          </div>
        </div>

        <div className="mt-10 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {CONCEPTS.map(item => {
            const active = item.id === selected;
            return (
              <motion.button key={item.id} type="button" onClick={() => setSelected(item.id)} whileHover={reduced ? undefined : { y: -5 }} whileTap={reduced ? undefined : { scale: .98 }} transition={spring} className={`relative overflow-hidden rounded-[22px] border p-5 text-left transition-colors ${active ? 'border-white/28 bg-white/[.11]' : 'border-white/9 bg-white/[.035] hover:bg-white/[.06]'}`}>
                <motion.span layoutId="quiz-concept-active" className={`absolute inset-x-0 top-0 h-1 ${active ? 'opacity-100' : 'opacity-0'}`} style={{ background: `linear-gradient(90deg, ${item.palette.join(',')})` }} />
                <div className="flex items-center justify-between"><span className="font-mono text-xs font-bold text-white/35">{item.number}</span><div className="flex -space-x-1.5">{item.palette.map(color => <i key={color} className="h-5 w-5 rounded-full border-2 border-[#151210]" style={{ background: color }} />)}</div></div>
                <b className="mt-5 block text-xl font-extrabold text-white">{item.name}</b>
                <span className="mt-2 block text-xs leading-relaxed text-white/38">{item.subtitle}</span>
              </motion.button>
            );
          })}
        </div>

        <div className="mt-10 rounded-[30px] border border-white/10 bg-white/[.025] p-5 sm:p-8 lg:p-10">
          <AnimatePresence mode="wait">
            <motion.div key={`${concept.id}-${special ? 'special' : 'general'}`} initial={reduced ? false : { opacity: 0, y: 24, filter: 'blur(10px)' }} animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }} exit={reduced ? undefined : { opacity: 0, y: -18, filter: 'blur(8px)' }} transition={{ duration: .55, ease: cinematic }}>
              <ConceptHeader concept={concept} />
              <div className={`mt-7 flex items-center gap-3 rounded-[14px] border px-4 py-3 text-xs ${special ? 'border-amber-300/25 bg-amber-300/[.08] text-amber-100' : 'border-blue-300/20 bg-blue-300/[.07] text-blue-100'}`}><span className={`h-2.5 w-2.5 rounded-full ${special ? 'bg-amber-300' : 'bg-blue-300'}`} /><b>{special ? 'Специальный квиз: фон «Гарри Поттер» сохранён без перекрашивания' : 'Общий квиз: используется новый фон выбранного направления'}</b></div>
              <ConceptCanvas id={concept.id} reduced={reduced} special={special} />
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-[18px] border border-white/8 bg-white/[.025] px-5 py-4 text-xs text-white/38">
          <span>Общие квизы меняют фон. Специальные всегда используют изображение выбранной темы.</span>
          <div className="flex flex-wrap gap-4"><a className="text-white/62 underline decoration-white/20 underline-offset-4 hover:text-white" href="https://kahoot.com/library/kahoot-logo/" target="_blank" rel="noreferrer">Kahoot brand</a><a className="text-white/62 underline decoration-white/20 underline-offset-4 hover:text-white" href="https://www.jackboxgames.com/blog/behind-the-scenes-of-pp10-art" target="_blank" rel="noreferrer">Jackbox art direction</a></div>
        </div>
      </div>
    </section>
  );
}
