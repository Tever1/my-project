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
          { id: 'citizen',   icon: '👤', nameRu: 'Мирный',   nameEn: 'Citizen',    team: 'citizens', condition: 'всегда' },
          { id: 'mafia',     icon: '🔫', nameRu: 'Мафия',    nameEn: 'Mafia',      team: 'mafia',    condition: '1 при 4–5 игр., 2 при 6+' },
          { id: 'detective', icon: '🔍', nameRu: 'Детектив', nameEn: 'Detective',  team: 'citizens', condition: 'при 5+ игроках' },
          { id: 'doctor',    icon: '💉', nameRu: 'Доктор',   nameEn: 'Doctor',     team: 'citizens', condition: 'при 6+ игроках' },
        ],
        roleTable: [
          { players: 4,  mafia: 1, detective: false, doctor: false, citizens: 3 },
          { players: 5,  mafia: 1, detective: true,  doctor: false, citizens: 3 },
          { players: 6,  mafia: 2, detective: true,  doctor: true,  citizens: 3 },
          { players: 7,  mafia: 2, detective: true,  doctor: true,  citizens: 4 },
          { players: 8,  mafia: 2, detective: true,  doctor: true,  citizens: 5 },
          { players: 10, mafia: 3, detective: true,  doctor: true,  citizens: 6 },
        ],
      });

    default:
      return NextResponse.json({ error: 'Unknown game' }, { status: 400 });
  }
}
