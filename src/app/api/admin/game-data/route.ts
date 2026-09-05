import { NextRequest, NextResponse } from 'next/server';
import {
  ALIAS_WORDS,
  CROCODILE_WORDS,
  SPY_WORDS,
  WHO_AM_I_CHARACTERS,
} from '@/lib/game-data';
import { TOPICS } from '@/lib/hundred-to-one/questions';
import { readOverrides, applyOverridesBilingual, applyOverridesSimple } from '@/lib/game-overrides';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const game = searchParams.get('game');

  switch (game) {
    case 'alias': {
      const ovs = await readOverrides();
      return NextResponse.json({ type: 'words-bilingual', items: applyOverridesBilingual(ALIAS_WORDS, ovs['alias']) });
    }

    case 'crocodile': {
      const ovs = await readOverrides();
      return NextResponse.json({ type: 'words-bilingual', items: applyOverridesBilingual(CROCODILE_WORDS, ovs['crocodile']) });
    }

    case 'spy': {
      const ovs = await readOverrides();
      return NextResponse.json({ type: 'words-simple', items: applyOverridesSimple(SPY_WORDS, ovs['spy']) });
    }

    case 'who-am-i': {
      const ovs = await readOverrides();
      return NextResponse.json({ type: 'words-bilingual', items: applyOverridesBilingual(WHO_AM_I_CHARACTERS, ovs['who-am-i']) });
    }

    case 'hundred-to-one': {
      const ovs = await readOverrides();
      const deletedSet = new Set(ovs['hundred-to-one']?.deleted ?? []);
      const filteredTopics = TOPICS.map((t) => ({
        ...t,
        rounds: t.rounds.filter((q) => !deletedSet.has(q.q)),
        bigQ: t.bigQ.filter((q) => !deletedSet.has(q.q)),
      }));
      return NextResponse.json({ type: 'hundred-to-one-topics', topics: filteredTopics });
    }

    case 'mafia':
      return NextResponse.json({
        type: 'mafia',
        roles: [
          { id: 'citizen', icon: '👤', nameRu: 'Мирный', nameEn: 'Citizen', team: 'citizens', condition: 'всегда', description: 'Без способностей. Голосует днём вместе с остальными.' },
          { id: 'mafia', icon: '🔫', nameRu: 'Мафия', nameEn: 'Mafia', team: 'mafia', condition: '≈1/3 от общего числа игроков', description: 'Ночью вся мафия вместе выбирает жертву — при разногласиях решает большинство.' },
          { id: 'don', icon: '🎩', nameRu: 'Дон', nameEn: 'Don', team: 'mafia', condition: 'при 10+ участниках с ведущим', description: 'Глава мафии. Каждую ночь сначала выбирает жертву вместе с мафией (решающий голос за ним), затем отдельно проверяет одного игрока — не Шериф ли это.' },
          { id: 'maniac', icon: '🔪', nameRu: 'Маньяк', nameEn: 'Maniac', team: 'neutral', condition: 'при 13+ участниках с ведущим, играет сам за себя', description: 'Играет сам за себя. Ночью убивает любого — мафию или мирного, независимо от мафии. Не обязан убивать каждую ночь.' },
          { id: 'sheriff', icon: '🔍', nameRu: 'Шериф', nameEn: 'Sheriff', team: 'citizens', condition: 'при 7+ участниках с ведущим', description: 'Ночью проверяет одного игрока и узнаёт, мафия он или мирный. Днём пытается убедить город, не раскрывая себя.' },
          { id: 'doctor', icon: '💉', nameRu: 'Доктор', nameEn: 'Doctor', team: 'citizens', condition: 'при 8+ участниках с ведущим', description: 'Ночью лечит одного игрока от выстрела мафии или маньяка. Не может лечить себя и того же игрока две ночи подряд.' },
          { id: 'lover', icon: '💋', nameRu: 'Любовница', nameEn: 'Lover', team: 'citizens', condition: 'при 11+ участниках с ведущим', description: 'Ночью блокирует способность одного игрока (доктор не лечит, шериф не проверяет, маньяк не убивает, Дон не проверяет на шерифа). Даёт цели алиби — она не выбывает по итогам дневного голосования. Если Любовницу убивают, погибает и тот, к кому она ходила.' },
        ],
        roleTable: [
          { players: 5,  host: 1, mafia: 1, don: 0, maniac: 0, sheriff: 0, doctor: 0, lover: 0, citizens: 3 },
          { players: 6,  host: 1, mafia: 1, don: 0, maniac: 0, sheriff: 0, doctor: 0, lover: 0, citizens: 4 },
          { players: 7,  host: 1, mafia: 2, don: 0, maniac: 0, sheriff: 1, doctor: 0, lover: 0, citizens: 3 },
          { players: 8,  host: 1, mafia: 2, don: 0, maniac: 0, sheriff: 1, doctor: 1, lover: 0, citizens: 3 },
          { players: 9,  host: 1, mafia: 2, don: 0, maniac: 0, sheriff: 1, doctor: 1, lover: 0, citizens: 4 },
          { players: 10, host: 1, mafia: 2, don: 1, maniac: 0, sheriff: 1, doctor: 1, lover: 0, citizens: 4 },
          { players: 11, host: 1, mafia: 2, don: 1, maniac: 0, sheriff: 1, doctor: 1, lover: 1, citizens: 4 },
          { players: 12, host: 1, mafia: 2, don: 1, maniac: 0, sheriff: 1, doctor: 1, lover: 1, citizens: 5 },
          { players: 13, host: 1, mafia: 2, don: 1, maniac: 1, sheriff: 1, doctor: 1, lover: 1, citizens: 5 },
          { players: 14, host: 1, mafia: 2, don: 1, maniac: 1, sheriff: 1, doctor: 1, lover: 1, citizens: 6 },
          { players: 15, host: 1, mafia: 2, don: 1, maniac: 1, sheriff: 1, doctor: 1, lover: 1, citizens: 7 },
          { players: 16, host: 1, mafia: 3, don: 1, maniac: 1, sheriff: 1, doctor: 1, lover: 1, citizens: 7 },
          { players: 17, host: 1, mafia: 3, don: 1, maniac: 1, sheriff: 1, doctor: 1, lover: 1, citizens: 8 },
        ],
      });

    default:
      return NextResponse.json({ error: 'Unknown game' }, { status: 400 });
  }
}
