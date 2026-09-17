import Image from 'next/image';

const assets: Record<string, string> = {
  roadmap: '/icons/crocodile/trophy.png',
  backgrounds: '/icons/quiz/harry-potter.png',
  quizzes: '/icons/games/quiz.png',
  games: '/icons/games/crocodile.png',
  rooms: '/icons/games/who-am-i.png',
  'harry-potter': '/icons/quiz/harry-potter.png',
  marvel: '/icons/quiz/marvel.png',
  science: '/icons/quiz/science.png',
  history: '/icons/quiz/history.png',
  'pop-culture': '/icons/quiz/pop-culture.png',
};

export function AdminIcon({ name, size = 28 }: { name: string; size?: number }) {
  const gameNames = ['quiz', 'mafia', 'alias', 'crocodile', 'spy', 'hundred-to-one', 'who-am-i'];
  const source = assets[name] ?? (gameNames.includes(name) ? `/icons/games/${name}.png` : '/icons/games/quiz.png');
  return <Image src={source} alt="" width={size} height={size} className="shrink-0 object-contain" />;
}
