export type ProjectPhaseStatus = 'complete' | 'active' | 'planned';

export type ProjectPhaseTrack = 'foundation' | 'experience' | 'growth';

export interface ProjectPhase {
  id: string;
  title: string;
  subtitle: string;
  track: ProjectPhaseTrack;
  status: ProjectPhaseStatus;
  summary: string;
  outcomes: string[];
  exitCriteria: string;
  nextAction?: string;
  effort: {
    minHours: number;
    maxHours: number;
    basis: 'historical-estimate' | 'forecast';
  };
}

export const PROJECT_ROADMAP_UPDATED_AT = '2026-08-24';

export const PROJECT_PHASES: ProjectPhase[] = [
  {
    id: 'A',
    title: 'Foundation',
    subtitle: 'Визуальный фундамент',
    track: 'foundation',
    status: 'complete',
    summary: 'Единые шрифты, палитра, размеры, радиусы и motion-токены для всех интерфейсов.',
    outcomes: ['Geist и типографическая шкала', 'Per-game палитра', 'Spring-анимации и reduced motion'],
    exitCriteria: 'Базовые токены документированы и используются в интерфейсе.',
    effort: { minHours: 6, maxHours: 10, basis: 'historical-estimate' },
  },
  {
    id: 'B',
    title: 'Liquid Glass',
    subtitle: 'Система стеклянных поверхностей',
    track: 'foundation',
    status: 'complete',
    summary: 'Сформирован общий язык глубины: стеклянные панели, листы, уведомления, blur и shadow.',
    outcomes: ['GlassPanel', 'GlassSheet', 'GlassToaster', 'Depth, blur и shadow tokens'],
    exitCriteria: 'Основные overlay-поверхности собираются из общих компонентов.',
    effort: { minHours: 8, maxHours: 12, basis: 'historical-estimate' },
  },
  {
    id: 'C',
    title: 'Icon Pipeline',
    subtitle: 'Иконки и визуальные активы',
    track: 'foundation',
    status: 'complete',
    summary: 'Настроена генерация игровых иконок и подготовлен полный набор активов для каталога.',
    outcomes: ['Генератор иконок', 'GameIcon с fallback', 'Семь игровых PNG-иконок'],
    exitCriteria: 'Каждая игра имеет собственную production-иконку и единый способ подключения.',
    effort: { minHours: 8, maxHours: 14, basis: 'historical-estimate' },
  },
  {
    id: 'D',
    title: 'PS5 Lobby',
    subtitle: 'Флагманское игровое лобби',
    track: 'foundation',
    status: 'complete',
    summary: 'PS5-style лобби перенесено из preview в общий production-flow создания и подключения к комнате.',
    outcomes: ['Динамический фон игр', 'Desktop и mobile layout', 'Комнаты, QR и keyboard navigation'],
    exitCriteria: 'Хост и гости используют единое production-лобби на всех целевых размерах.',
    effort: { minHours: 30, maxHours: 45, basis: 'historical-estimate' },
  },
  {
    id: 'E',
    title: 'Core Components',
    subtitle: 'Общая UI-библиотека',
    track: 'foundation',
    status: 'complete',
    summary: 'Создан набор переиспользуемых кнопок, полей, аватаров, бейджей и loading-состояний.',
    outcomes: ['GlassButton и GlassInput', 'PlayerAvatar, Badge и Chip', 'Skeleton и barrel exports'],
    exitCriteria: 'Основные интерфейсные примитивы доступны как общие компоненты.',
    effort: { minHours: 10, maxHours: 16, basis: 'historical-estimate' },
  },
  {
    id: 'F',
    title: 'Flow Transitions',
    subtitle: 'Переходы между фазами игр',
    track: 'experience',
    status: 'complete',
    summary: 'Игровые экраны получили единый механизм смены setup, раундов, результатов и финала.',
    outcomes: ['GameLayout phaseKey', 'AnimatePresence transitions', 'Подключение игровых экранов'],
    exitCriteria: 'Смена ключевых фаз не происходит резким визуальным скачком.',
    effort: { minHours: 4, maxHours: 8, basis: 'historical-estimate' },
  },
  {
    id: 'G',
    title: 'In-game Polish',
    subtitle: 'Темп, внимание и обратная связь',
    track: 'experience',
    status: 'complete',
    summary: 'Финальный polish выполнен внутри утверждённых игровых flow: таймеры, очки, ожидание и ключевые реакции.',
    outcomes: ['Urgency и waiting states', 'Анимации счёта и хода', 'Индивидуальный polish игровых flow'],
    exitCriteria: 'Все утверждённые production-дизайны имеют понятную обратную связь в ключевых состояниях.',
    effort: { minHours: 20, maxHours: 35, basis: 'historical-estimate' },
  },
  {
    id: 'H',
    title: 'TV Mode',
    subtitle: 'Большой экран как часть шоу',
    track: 'experience',
    status: 'complete',
    summary: 'TV стал отдельным полноценным интерфейсом: крупная композиция, синхронный state и игровые визуальные сцены.',
    outcomes: ['Полные TV-flow игр', 'Читаемость с расстояния', 'Resync и privacy-sensitive состояния'],
    exitCriteria: 'Утверждённые игровые дизайны имеют полноценные mobile- и TV-композиции.',
    effort: { minHours: 30, maxHours: 50, basis: 'historical-estimate' },
  },
  {
    id: 'I',
    title: 'Game Worlds',
    subtitle: 'Уникальная атмосфера каждой игры',
    track: 'experience',
    status: 'complete',
    summary: 'Игровые дизайны утверждены и перенесены в production. Проект переходит от редизайна к системному аудиту.',
    outcomes: ['Quiz — Пульс эфира', 'Mafia — Закрытый клуб', 'Spy, Alias, Who Am I и Crocodile — принятые миры'],
    exitCriteria: 'Активные production-игры имеют утверждённые визуальные baselines; пауза «100 к 1» не блокирует roadmap.',
    effort: { minHours: 100, maxHours: 160, basis: 'historical-estimate' },
  },
  {
    id: 'J',
    title: 'Audit & Consolidation',
    subtitle: 'Текущая фаза',
    track: 'experience',
    status: 'active',
    summary: 'Закрепить принятые решения, убрать системные расхождения и сформировать финальную документацию дизайн-системы.',
    outcomes: ['Общий UI/motion audit', 'Проверка phone и TV consistency', 'Финальный документ design system'],
    exitCriteria: 'Аудит закрыт, критичные расхождения устранены, дизайн-система документирована.',
    nextAction: 'Составить scope аудита без повторного редизайна утверждённых игр.',
    effort: { minHours: 24, maxHours: 40, basis: 'forecast' },
  },
  {
    id: 'K',
    title: 'AI Host',
    subtitle: 'Нейроведущий',
    track: 'growth',
    status: 'planned',
    summary: 'Event-driven ведущий с LLM-репликами, голосом и отдельной персоной для каждой игры.',
    outcomes: ['TTS и LLM pipeline', 'Per-game personalities', 'Управление голосом через host и TV'],
    exitCriteria: 'Нейроведущий безопасно реагирует на игровые события и может быть отключён хостом.',
    nextAction: 'До реализации выбрать TTS-провайдера, языки и формат визуального представления.',
    effort: { minHours: 140, maxHours: 220, basis: 'forecast' },
  },
  {
    id: 'L',
    title: 'Accounts',
    subtitle: 'Аккаунты и постоянная идентичность',
    track: 'growth',
    status: 'planned',
    summary: 'Production-аутентификация, единый профиль и устойчивая идентичность между комнатами и устройствами.',
    outcomes: ['Email и OAuth-провайдеры', 'Persistent profile', 'Привязка room identity к user ID'],
    exitCriteria: 'Пользователь безопасно входит, возвращается в комнату и управляет единым профилем.',
    nextAction: 'Выбрать БД, модель сессий и состав провайдеров входа.',
    effort: { minHours: 180, maxHours: 280, basis: 'forecast' },
  },
  {
    id: 'M',
    title: 'Monetization',
    subtitle: 'Платная модель продукта',
    track: 'growth',
    status: 'planned',
    summary: 'Оплата, подписки или разовые покупки с понятным paywall и безопасной биллинг-инфраструктурой.',
    outcomes: ['Платёжный провайдер', 'Тарифы и entitlement model', 'Webhooks и billing portal'],
    exitCriteria: 'Оплата привязана к аккаунту, а окончание подписки не ломает активную игру.',
    nextAction: 'После фазы L выбрать модель монетизации и платёжного провайдера.',
    effort: { minHours: 150, maxHours: 240, basis: 'forecast' },
  },
];

export const APPROVED_GAME_DESIGNS = [
  { game: 'Квиз', design: 'Пульс эфира' },
  { game: 'Мафия', design: 'Закрытый клуб' },
  { game: 'Шпион', design: 'Оперативный центр' },
  { game: 'Alias', design: 'Карточная мастерская' },
  { game: 'Кто я?', design: 'Голубая пластилиновая ночь' },
  { game: 'Крокодил', design: 'Свайп-протокол' },
];
