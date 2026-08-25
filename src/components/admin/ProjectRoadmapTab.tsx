'use client';

import { useState } from 'react';
import {
  APPROVED_GAME_DESIGNS,
  PROJECT_PHASES,
  PROJECT_ROADMAP_UPDATED_AT,
  type ProjectPhase,
  type ProjectPhaseStatus,
  type ProjectPhaseTrack,
} from '@/lib/project-roadmap';

type RoadmapFilter = 'all' | ProjectPhaseStatus;

const STATUS_COPY: Record<ProjectPhaseStatus, { label: string; dot: string; badge: string }> = {
  complete: {
    label: 'Завершено',
    dot: 'bg-emerald-400',
    badge: 'border-emerald-400/25 bg-emerald-400/10 text-emerald-200',
  },
  active: {
    label: 'В работе',
    dot: 'bg-amber-300',
    badge: 'border-amber-300/30 bg-amber-300/10 text-amber-100',
  },
  planned: {
    label: 'Запланировано',
    dot: 'bg-sky-300',
    badge: 'border-sky-300/20 bg-sky-300/10 text-sky-100',
  },
};

const TRACK_COPY: Record<ProjectPhaseTrack, string> = {
  foundation: 'Система',
  experience: 'Игровой опыт',
  growth: 'Развитие продукта',
};

const FILTERS: { id: RoadmapFilter; label: string }[] = [
  { id: 'all', label: 'Все фазы' },
  { id: 'complete', label: 'Завершённые' },
  { id: 'active', label: 'Текущая' },
  { id: 'planned', label: 'Следующие' },
];

function formatHours(minHours: number, maxHours: number) {
  return minHours === maxHours ? `${minHours} ч` : `${minHours}–${maxHours} ч`;
}

function PhaseCard({ phase, expanded, onToggle }: { phase: ProjectPhase; expanded: boolean; onToggle: () => void }) {
  const status = STATUS_COPY[phase.status];

  return (
    <article
      className={`group relative overflow-hidden rounded-[28px] border transition-all duration-300 ${
        phase.status === 'active'
          ? 'border-amber-300/35 bg-gradient-to-br from-amber-300/[0.12] via-white/[0.06] to-violet-400/[0.08] shadow-[0_24px_80px_rgba(251,191,36,0.09)]'
          : phase.status === 'complete'
            ? 'border-emerald-300/15 bg-white/[0.045] hover:border-emerald-300/30 hover:bg-white/[0.065]'
            : 'border-white/10 bg-white/[0.035] hover:border-sky-300/25 hover:bg-white/[0.055]'
      }`}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="w-full p-5 text-left sm:p-6"
      >
        <div className="flex items-start gap-4">
          <div
            className={`flex h-14 w-14 flex-none items-center justify-center rounded-2xl border text-xl font-black ${
              phase.status === 'active'
                ? 'border-amber-200/35 bg-amber-200/15 text-amber-100'
                : phase.status === 'complete'
                  ? 'border-emerald-300/20 bg-emerald-300/10 text-emerald-200'
                  : 'border-white/10 bg-white/5 text-white/60'
            }`}
          >
            {phase.id}
          </div>

          <div className="min-w-0 flex-1">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] ${status.badge}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
                {status.label}
              </span>
              <span className="rounded-full border border-white/10 bg-black/15 px-2.5 py-1 text-[10px] font-bold tracking-wide text-white/50">
                {phase.effort.basis === 'historical-estimate' ? 'Затрачено' : 'Оценка'} · {formatHours(phase.effort.minHours, phase.effort.maxHours)}
              </span>
              <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/25">{TRACK_COPY[phase.track]}</span>
            </div>
            <div className="flex items-end justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold tracking-tight text-white sm:text-xl">{phase.title}</h3>
                <p className="mt-0.5 text-xs text-white/40">{phase.subtitle}</p>
              </div>
              <span className={`text-lg text-white/35 transition-transform duration-300 ${expanded ? 'rotate-45' : ''}`} aria-hidden="true">+</span>
            </div>
            <p className="mt-4 text-sm leading-6 text-white/62">{phase.summary}</p>
          </div>
        </div>
      </button>

      <div className={`grid transition-all duration-300 ${expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
        <div className="overflow-hidden">
          <div className="mx-5 border-t border-white/10 pb-6 pt-5 sm:mx-6">
            <div className="grid gap-5 lg:grid-cols-[1fr_0.9fr]">
              <div>
                <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-white/30">Результаты фазы</p>
                <ul className="space-y-2.5">
                  {phase.outcomes.map((outcome) => (
                    <li key={outcome} className="flex gap-3 text-sm leading-5 text-white/65">
                      <span className={`mt-2 h-1.5 w-1.5 flex-none rounded-full ${status.dot}`} />
                      {outcome}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/15 p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/30">Критерий завершения</p>
                <p className="mt-2 text-sm leading-5 text-white/65">{phase.exitCriteria}</p>
                {phase.nextAction && (
                  <>
                    <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.18em] text-amber-200/55">Следующий шаг</p>
                    <p className="mt-2 text-sm leading-5 text-amber-50/75">{phase.nextAction}</p>
                  </>
                )}
                <p className="mt-4 border-t border-white/10 pt-3 text-[11px] leading-4 text-white/30">
                  {phase.effort.basis === 'historical-estimate'
                    ? 'Ретроспективная оценка по отчётам, рабочим сессиям и объёму изменений.'
                    : 'Прогноз для текущего scope, включая реализацию, ревью, исправления и проверки.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

export function ProjectRoadmapTab() {
  const [filter, setFilter] = useState<RoadmapFilter>('all');
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(['J']));
  const completed = PROJECT_PHASES.filter((phase) => phase.status === 'complete').length;
  const progress = Math.round((completed / PROJECT_PHASES.length) * 100);
  const spentHours = PROJECT_PHASES
    .filter((phase) => phase.effort.basis === 'historical-estimate')
    .reduce((total, phase) => ({
      min: total.min + phase.effort.minHours,
      max: total.max + phase.effort.maxHours,
    }), { min: 0, max: 0 });
  const forecastHours = PROJECT_PHASES
    .filter((phase) => phase.effort.basis === 'forecast')
    .reduce((total, phase) => ({
      min: total.min + phase.effort.minHours,
      max: total.max + phase.effort.maxHours,
    }), { min: 0, max: 0 });
  const visiblePhases = PROJECT_PHASES.filter((phase) => filter === 'all' || phase.status === filter);

  function togglePhase(id: string) {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="space-y-6 pb-12">
      <section className="relative overflow-hidden rounded-[32px] border border-violet-300/15 bg-[radial-gradient(circle_at_top_left,rgba(139,92,246,0.22),transparent_42%),radial-gradient(circle_at_85%_25%,rgba(56,189,248,0.13),transparent_35%),rgba(255,255,255,0.035)] p-6 sm:p-8">
        <div className="absolute -right-12 -top-14 h-52 w-52 rounded-full border border-white/5 bg-white/[0.025]" />
        <div className="relative grid gap-7 xl:grid-cols-[1fr_360px] xl:items-end">
          <div>
            <div className="mb-5 flex flex-wrap items-center gap-3">
              <span className="rounded-full border border-violet-300/20 bg-violet-300/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-violet-100">Roadmap A–M</span>
              <span className="text-xs text-white/30">Обновлено {PROJECT_ROADMAP_UPDATED_AT}</span>
            </div>
            <h2 className="max-w-3xl text-3xl font-black leading-tight tracking-[-0.04em] text-white sm:text-5xl">
              Дизайн утверждён.<br />Двигаемся к продукту.
            </h2>
            <p className="mt-5 max-w-2xl text-sm leading-6 text-white/55 sm:text-base sm:leading-7">
              Визуальный фундамент и игровые миры завершены. Текущая задача — закрепить систему аудитом, затем перейти к нейроведущему, аккаунтам и монетизации.
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-black/20 p-5 backdrop-blur-xl">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-white/35">Общий прогресс</p>
                <p className="mt-2 text-4xl font-black tracking-tight text-white">{progress}%</p>
              </div>
              <p className="text-right text-sm text-white/45"><span className="font-bold text-emerald-200">{completed}</span> из {PROJECT_PHASES.length}<br />фаз завершено</p>
            </div>
            <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-cyan-300 to-violet-400 transition-all duration-700" style={{ width: `${progress}%` }} />
            </div>
            <div className="mt-4 flex items-center justify-between text-xs">
              <span className="text-white/35">Текущая фаза</span>
              <span className="font-bold text-amber-200">J · Audit & Consolidation</span>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-2 border-t border-white/10 pt-4">
              <div className="rounded-2xl bg-white/[0.04] px-3 py-3">
                <p className="text-[10px] uppercase tracking-wider text-white/30">Уже затрачено</p>
                <p className="mt-1 text-lg font-black text-emerald-200">{formatHours(spentHours.min, spentHours.max)}</p>
              </div>
              <div className="rounded-2xl bg-white/[0.04] px-3 py-3">
                <p className="text-[10px] uppercase tracking-wider text-white/30">Осталось по плану</p>
                <p className="mt-1 text-lg font-black text-sky-200">{formatHours(forecastHours.min, forecastHours.max)}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-[28px] border border-emerald-300/15 bg-emerald-300/[0.045] p-5 sm:p-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="max-w-xl">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-200/60">Фаза I закрыта</p>
            <h3 className="mt-2 text-xl font-bold text-white">Утверждённые игровые миры</h3>
            <p className="mt-2 text-sm leading-6 text-white/45">Редизайн «100 к 1» остаётся архивной паузой и не блокирует переход к следующим фазам.</p>
          </div>
          <div className="grid flex-1 grid-cols-2 gap-2 sm:grid-cols-3">
            {APPROVED_GAME_DESIGNS.map((item) => (
              <div key={item.game} className="rounded-2xl border border-white/10 bg-black/15 px-3 py-3">
                <p className="text-[10px] uppercase tracking-wider text-white/30">{item.game}</p>
                <p className="mt-1 text-xs font-bold leading-4 text-white/75">{item.design}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section>
        <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/25">План проекта</p>
            <h3 className="mt-2 text-2xl font-bold tracking-tight text-white">13 фаз развития</h3>
          </div>
          <div className="flex flex-wrap gap-2" aria-label="Фильтр фаз">
            {FILTERS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setFilter(item.id)}
                className={`rounded-full border px-3 py-1.5 text-xs font-bold transition-colors ${
                  filter === item.id
                    ? 'border-violet-300/35 bg-violet-300/15 text-violet-100'
                    : 'border-white/10 bg-white/[0.035] text-white/40 hover:border-white/20 hover:text-white/70'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {visiblePhases.map((phase) => (
            <PhaseCard key={phase.id} phase={phase} expanded={expanded.has(phase.id)} onToggle={() => togglePhase(phase.id)} />
          ))}
        </div>
      </section>

      <section className="rounded-[28px] border border-sky-300/15 bg-gradient-to-r from-sky-300/[0.06] to-violet-300/[0.06] p-5 sm:p-6">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-sky-200/55">Правило обновления</p>
        <p className="mt-3 max-w-4xl text-sm leading-6 text-white/60">
          После закрытия крупной фазы общий системный чат обновляет её статус, результаты и дату roadmap вместе с PROJECT_CONTEXT, TASKS и handoff. Следующая фаза становится текущей только после подтверждения критериев завершения.
        </p>
        <p className="mt-3 max-w-4xl text-xs leading-5 text-white/35">
          Часы показаны диапазонами: точный time tracking исторически не вёлся. Для завершённых фаз это восстановленная оценка, для J–M — прогноз при текущем объёме требований.
        </p>
      </section>
    </div>
  );
}
