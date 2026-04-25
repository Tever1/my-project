import { NextResponse } from 'next/server';
import {
  ALIAS_WORDS,
  CROCODILE_WORDS,
  SPY_WORDS,
  WHO_AM_I_CHARACTERS,
} from '@/lib/game-data';
import { TOPICS } from '@/lib/hundred-to-one/questions';

export async function GET() {
  const stats = [
    {
      id: 'alias',
      titleRu: 'Alias',
      icon: '🗣',
      description: 'Объяснять словами',
      count: ALIAS_WORDS.length,
      unit: 'слов',
      breakdown: null,
    },
    {
      id: 'crocodile',
      titleRu: 'Крокодил',
      icon: '🤸',
      description: 'Объяснять жестами',
      count: CROCODILE_WORDS.length,
      unit: 'слов',
      breakdown: null,
    },
    {
      id: 'spy',
      titleRu: 'Шпион',
      icon: '🕵️',
      description: 'Угадать слово не будучи шпионом',
      count: SPY_WORDS.length,
      unit: 'слов',
      breakdown: null,
    },
    {
      id: 'who-am-i',
      titleRu: 'Кто я?',
      icon: '🎭',
      description: 'Угадать персонажа по вопросам',
      count: WHO_AM_I_CHARACTERS.length,
      unit: 'персонажей',
      breakdown: null,
    },
    {
      id: 'hundred-to-one',
      titleRu: '100 к 1',
      icon: '💯',
      description: 'Угадать популярные ответы',
      count: TOPICS.reduce((sum, t) => sum + t.rounds.length + t.bigQ.length, 0),
      unit: 'вопросов',
      breakdown: Object.fromEntries(
        TOPICS.map(t => [t.id, `${t.icon} ${t.name}: ${t.rounds.length} раундов + ${t.bigQ.length} б.игра`])
      ),
    },
    {
      id: 'mafia',
      titleRu: 'Мафия',
      icon: '🔫',
      description: 'Ролевая игра',
      count: 4,
      unit: 'роли',
      breakdown: {
        citizen: 'Мирный',
        mafia: 'Мафия',
        detective: 'Детектив',
        doctor: 'Доктор',
      },
    },
  ];

  return NextResponse.json({ stats });
}
