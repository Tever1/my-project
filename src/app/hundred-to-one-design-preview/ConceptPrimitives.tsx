'use client';

import type { ReactNode } from 'react';

export const ANSWERS = [
  ['ТЕЛЕФОН', '34'],
  ['КЛЮЧИ', '26'],
  ['КОШЕЛЁК', '15'],
  ['ЗОНТ', '09'],
] as const;

export const spring = { type: 'spring' as const, stiffness: 180, damping: 22 };
export const cinematic = [0.22, 1, 0.36, 1] as const;

function DeviceLabel({ tv = false }: { tv?: boolean }) {
  return (
    <div className="mb-3 flex items-end justify-between font-mono text-[10px] uppercase tracking-[0.18em] text-white/40">
      <b className="text-white/70">{tv ? 'Общий экран' : 'Телефон ведущего'}</b>
      <span>{tv ? '1920 × 1080' : '390 × 844'}</span>
    </div>
  );
}

export function PhoneFrame({ children, className }: { children: ReactNode; className: string }) {
  return (
    <div className="mx-auto w-full max-w-[326px]">
      <DeviceLabel />
      <div className="rounded-[44px] border border-white/15 bg-[#030303] p-2 shadow-[0_34px_90px_-34px_rgba(0,0,0,.95)]">
        <div className={`relative aspect-[390/844] overflow-hidden rounded-[37px] ${className}`}>
          <div className="absolute left-1/2 top-2.5 z-30 h-6 w-24 -translate-x-1/2 rounded-full bg-black" />
          <div className="relative z-10 flex h-full flex-col px-4 pb-5 pt-5">{children}</div>
          <div className="absolute bottom-2 left-1/2 z-30 h-1 w-24 -translate-x-1/2 rounded-full bg-current opacity-45" />
        </div>
      </div>
    </div>
  );
}

export function TvFrame({ children, className }: { children: ReactNode; className: string }) {
  return (
    <div className="min-w-0">
      <DeviceLabel tv />
      <div className="rounded-[24px] border border-white/15 bg-[#030303] p-2 shadow-[0_40px_110px_-40px_rgba(0,0,0,.98)]">
        <div className={`relative aspect-video overflow-hidden rounded-[17px] ${className}`}>
          <div className="relative z-10 h-full">{children}</div>
        </div>
      </div>
    </div>
  );
}
