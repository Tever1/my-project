'use client';
import { useState } from 'react';
import type { ContentQuestion } from '@/lib/content/catalog';

export function QuestionPreview({ question, onClose }: { question: ContentQuestion; onClose: () => void }) {
  const [mode, setMode] = useState<'phone' | 'tv' | 'trial'>('phone'); const [selected, setSelected] = useState<number | null>(null);
  return <dialog open className="fixed inset-0 z-50 m-auto max-h-[94vh] w-[min(1100px,calc(100%-2rem))] overflow-auto rounded-3xl border border-white/15 bg-slate-950 p-5 text-white backdrop:bg-black/80">
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-semibold">Предварительный просмотр</h2><p className="text-xs text-slate-400">Данные не сохраняются и комната не создаётся.</p></div><div className="flex gap-2">{(['phone', 'tv', 'trial'] as const).map(value => <button key={value} onClick={() => { setMode(value); setSelected(null); }} className={`rounded-xl border px-3 py-2 text-xs ${mode === value ? 'border-cyan-300/40 bg-cyan-300/10 text-cyan-100' : 'border-white/10 text-slate-400'}`}>{value === 'phone' ? 'Телефон' : value === 'tv' ? 'TV' : 'Пробный вопрос'}</button>)}<button onClick={onClose} className="rounded-xl border border-white/15 px-3 py-2 text-xs">Закрыть</button></div></div>
    <div className={`mx-auto rounded-[2rem] border border-white/15 bg-gradient-to-br from-blue-950 to-slate-950 p-6 ${mode === 'phone' ? 'min-h-[640px] max-w-[390px]' : 'min-h-[520px] max-w-[960px]'}`}>
      <p className="text-[10px] uppercase tracking-[.25em] text-cyan-200/60">Квиз · preview</p><h3 className={`${mode === 'phone' ? 'mt-16 text-2xl' : 'mt-20 text-center text-4xl'} font-semibold leading-tight`}>{question.questionRu}</h3>
      <div className={`${mode === 'phone' ? 'mt-10 grid gap-3' : 'mt-16 grid grid-cols-2 gap-4'}`}>{question.options.map((option, index) => <button key={index} disabled={mode !== 'trial'} onClick={() => setSelected(index)} className={`rounded-2xl border p-4 text-left text-sm ${selected === index ? index === question.correctIndex ? 'border-emerald-300 bg-emerald-300/15' : 'border-red-300 bg-red-300/15' : 'border-white/15 bg-white/5'}`}><span className="mr-2 text-cyan-200">{String.fromCharCode(65 + index)}</span>{option.ru}</button>)}</div>
      {mode === 'trial' && selected !== null && <p className={`mt-5 text-center text-sm ${selected === question.correctIndex ? 'text-emerald-200' : 'text-red-200'}`}>{selected === question.correctIndex ? 'Верный ответ' : `Правильный ответ: ${question.options[question.correctIndex].ru}`}</p>}
    </div>
  </dialog>;
}
