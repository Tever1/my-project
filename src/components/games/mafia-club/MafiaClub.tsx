'use client';

import Image from 'next/image';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import type { MafiaRole } from '@/types/game';
import styles from './MafiaClub.module.css';

const ROLE_IMAGE: Record<MafiaRole, string> = {
  citizen: 'citizen',
  mafia: 'mafia',
  don: 'don',
  maniac: 'maniac',
  detective: 'sheriff',
  doctor: 'doctor',
  lover: 'lover',
};

export function playerInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] ?? '')
    .join('')
    .toUpperCase() || '—';
}

export function MafiaRoleCard({ role, alt, priority = false }: { role: MafiaRole; alt: string; priority?: boolean }) {
  return (
    <div className={styles.roleCard}>
      <Image
        src={`/icons/mafia-roles/${ROLE_IMAGE[role]}.png`}
        alt={alt}
        fill
        priority={priority}
        sizes="(max-width: 520px) 88vw, 330px"
      />
    </div>
  );
}

const RolePreviewContext = createContext<{
  open: (role: MafiaRole, alt: string) => void;
  label: string;
} | null>(null);

export function MafiaOwnRoleBack({ role, locale }: { role: MafiaRole; locale: 'ru' | 'en' }) {
  const preview = useContext(RolePreviewContext);
  const label = locale === 'ru' ? 'Посмотреть свою роль' : 'View your role';
  return (
    <button type="button" className={styles.ownRoleBack} aria-label={label} onClick={() => preview?.open(role, label)}>
      <svg viewBox="0 0 90 120" fill="none" aria-hidden="true">
        <rect x="1" y="1" width="88" height="118" rx="9" fill="#1b0c24" stroke="#d6b46a" />
        <rect x="6" y="6" width="78" height="108" rx="5" stroke="#d6b46a" strokeOpacity=".5" />
        <path d="M45 10 80 60 45 110 10 60Z M45 21 72 60 45 99 18 60Z" stroke="#d6b46a" strokeOpacity=".45" />
        <path d="m14 14 9 9m-9 0 9-9m44 0 9 9m-9 0 9-9m-62 83 9-9m-9 0 9 9m44 0 9-9m-9 0 9 9" stroke="#d6b46a" />
        <circle cx="45" cy="60" r="20" fill="#1b0c24" stroke="#d6b46a" />
        <text x="45" y="69" textAnchor="middle" fill="#f0d795" fontFamily="Georgia, serif" fontSize="27">M</text>
      </svg>
    </button>
  );
}

export function MafiaRoleThumb({ role, alt = '' }: { role: MafiaRole; alt?: string }) {
  const preview = useContext(RolePreviewContext);
  const thumbnail = (
    <span className={styles.roleThumb}>
      <Image src={`/icons/mafia-roles/${ROLE_IMAGE[role]}.png`} alt={alt} fill sizes="42px" />
    </span>
  );
  return preview ? (
    <button type="button" className={styles.rolePreviewButton} aria-label={`${preview.label}${alt ? `: ${alt}` : ''}`} onClick={() => preview.open(role, alt)}>
      {thumbnail}
    </button>
  ) : thumbnail;
}

function RolePreview({ role, alt, locale, onClose }: { role: MafiaRole; alt: string; locale: 'ru' | 'en'; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const closeRef = useRef(onClose);
  useEffect(() => { closeRef.current = onClose; }, [onClose]);
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    const hide = () => closeRef.current();
    const visibilityChanged = () => { if (document.hidden) hide(); };
    window.addEventListener('blur', hide);
    document.addEventListener('visibilitychange', visibilityChanged);
    return () => {
      element?.close();
      window.removeEventListener('blur', hide);
      document.removeEventListener('visibilitychange', visibilityChanged);
    };
  }, []);
  return (
    <dialog ref={dialog} className={styles.rolePreviewDialog} aria-label={alt || (locale === 'ru' ? 'Карточка роли' : 'Role card')} onCancel={onClose} onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <MafiaRoleCard role={role} alt={alt || (locale === 'ru' ? 'Карточка роли' : 'Role card')} />
      <button type="button" autoFocus className={styles.secondaryButton} onClick={onClose}>{locale === 'ru' ? 'Закрыть' : 'Close'}</button>
    </dialog>
  );
}

export function MafiaOrnament() {
  return <div className={styles.ornament} aria-hidden="true"><span /></div>;
}

export function MafiaNightDeathNotice({ names, timeLeft, locale, tv = false }: { names: string[]; timeLeft: number; locale: 'ru' | 'en'; tv?: boolean }) {
  if (!names.length || timeLeft <= 52) return null;
  return (
    <aside role="status" aria-live="polite" className={`${styles.nightDeathNotice} ${tv ? styles.nightDeathNoticeTv : ''}`}>
      <span className={styles.kicker}>{locale === 'ru' ? 'ЭТОЙ НОЧЬЮ ПОГИБЛИ' : 'DIED TONIGHT'}</span>
      <p>{names.join(', ')}</p>
    </aside>
  );
}

export function MafiaPlayerToken({ name }: { name: string }) {
  return <span className={styles.playerToken} aria-hidden="true">{playerInitials(name)}</span>;
}

export function MafiaClubMobileLayout({
  children,
  phase,
  round,
  phaseKey,
  onEnd,
  locale,
}: {
  children: ReactNode;
  phase: string;
  round?: number;
  phaseKey: string;
  onEnd?: () => void;
  locale: 'ru' | 'en';
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [rolePreview, setRolePreview] = useState<{ role: MafiaRole; alt: string; phaseKey: string } | null>(null);
  const reduceMotion = useReducedMotion();
  useEffect(() => { queueMicrotask(() => setRolePreview(null)); }, [phaseKey, round]);

  return (
    <div className={styles.surface}>
      <div className={styles.grain} aria-hidden="true" />
      <div className={styles.frame} aria-hidden="true" />
      <header className={styles.mobileHeader}>
        <span className={styles.monogram}>M</span>
        <div className={styles.headerCopy}>
          <strong>{locale === 'ru' ? 'ЗАКРЫТЫЙ КЛУБ' : 'THE PRIVATE CLUB'}</strong>
          <span>{phase}</span>
        </div>
        <div className={styles.headerActions}>
          {round != null && <span className={styles.roundPill}>{locale === 'ru' ? `Раунд ${round}` : `Round ${round}`}</span>}
          {onEnd && (
            <button type="button" className={styles.endButton} onClick={() => setConfirmOpen(true)}>
              {locale === 'ru' ? 'Выйти' : 'Exit'}
            </button>
          )}
        </div>
      </header>
      <main className={styles.mobileMain}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={phaseKey}
            className={styles.phaseContent}
            initial={reduceMotion ? false : { opacity: 0, y: 10, filter: 'blur(4px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -5, filter: 'blur(2px)' }}
            transition={{ duration: reduceMotion ? 0.01 : 0.32, ease: [0.16, 1, 0.3, 1] }}
          >
            <RolePreviewContext.Provider value={{ open: (role, alt) => setRolePreview({ role, alt, phaseKey }), label: locale === 'ru' ? 'Увеличить карточку роли' : 'Enlarge role card' }}>
              {children}
            </RolePreviewContext.Provider>
          </motion.div>
        </AnimatePresence>
      </main>

      {rolePreview && rolePreview.phaseKey === phaseKey && <RolePreview role={rolePreview.role} alt={rolePreview.alt} locale={locale} onClose={() => setRolePreview(null)} />}

      <AnimatePresence>
        {confirmOpen && onEnd && (
          <motion.div className={styles.modalOverlay} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setConfirmOpen(false)}>
            <motion.div className={styles.modal} initial={reduceMotion ? false : { opacity: 0, y: 10, scale: .98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: .985 }} onClick={(event) => event.stopPropagation()}>
              <span className={styles.kicker}>{locale === 'ru' ? 'ЗАВЕРШЕНИЕ ВЕЧЕРА' : 'END THE EVENING'}</span>
              <h3>{locale === 'ru' ? 'Покинуть закрытый клуб?' : 'Leave the private club?'}</h3>
              <p>{locale === 'ru' ? 'Все игроки вернутся в лобби, текущий прогресс будет потерян.' : 'Every player will return to the lobby and current progress will be lost.'}</p>
              <div className={styles.modalActions}>
                <button type="button" className={styles.secondaryButton} onClick={() => setConfirmOpen(false)}>{locale === 'ru' ? 'Остаться' : 'Stay'}</button>
                <button type="button" className={styles.dangerButton} onClick={onEnd}>{locale === 'ru' ? 'Завершить' : 'End game'}</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function MafiaClubTvLayout({
  children,
  phase,
  playerCount,
  footer,
}: {
  children: ReactNode;
  phase: string;
  playerCount: string;
  footer: string;
}) {
  return (
    <div className={`${styles.surface} ${styles.tvSurface}`}>
      <div className={styles.grain} aria-hidden="true" />
      <div className={`${styles.frame} ${styles.tvFrame}`} aria-hidden="true" />
      <header className={styles.tvHeader}>
        <div className={styles.tvBrand}><span className={styles.monogram}>M</span><b>THE PURPLE ROOM</b></div>
        <span className={styles.tvPhase}>{phase}</span>
        <span className={styles.tvMeta}>{playerCount}</span>
      </header>
      <main className={styles.tvMain}>{children}</main>
      <footer className={styles.tvFooter}><span>{footer}</span></footer>
    </div>
  );
}

export { styles as mafiaClubStyles };
