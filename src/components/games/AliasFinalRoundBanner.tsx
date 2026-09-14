import styles from './AliasFinalRoundBanner.module.css';

type AliasFinalRoundBannerProps = {
  locale: 'ru' | 'en';
  variant: 'phone' | 'tv';
};

export function AliasFinalRoundBanner({ locale, variant }: AliasFinalRoundBannerProps) {
  return (
    <div className={`${styles.banner} ${styles[variant]}`} role="status">
      <span>{locale === 'ru' ? 'ФИНАЛЬНЫЙ РАУНД' : 'FINAL ROUND'}</span>
    </div>
  );
}
