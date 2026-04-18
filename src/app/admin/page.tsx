'use client';

import { useState, useRef } from 'react';

const THEMES = [
  { id: 'harry-potter', label: 'Harry Potter', icon: '⚡' },
  { id: 'marvel', label: 'Marvel', icon: '🦸' },
  { id: 'star-wars', label: 'Star Wars', icon: '🌌' },
  { id: 'lord-of-the-rings', label: 'Lord of the Rings', icon: '💍' },
  { id: 'game-of-thrones', label: 'Game of Thrones', icon: '🐉' },
  { id: 'disney', label: 'Disney', icon: '🏰' },
  { id: 'friends', label: 'Friends', icon: '☕' },
  { id: 'breaking-bad', label: 'Breaking Bad', icon: '🧪' },
  { id: 'the-office', label: 'The Office', icon: '📋' },
  { id: 'geography', label: 'География', icon: '🌍' },
  { id: 'history', label: 'История', icon: '📜' },
  { id: 'sports', label: 'Спорт', icon: '⚽' },
  { id: 'music', label: 'Музыка', icon: '🎵' },
];

export default function AdminPage() {
  // Questions agent state
  const [qTheme, setQTheme] = useState('harry-potter');
  const [qQuiz, setQQuiz] = useState('2');
  const [qCount, setQCount] = useState('10');
  const [qDry, setQDry] = useState(false);

  // Image agent state
  const [iTheme, setITheme] = useState('star-wars');
  const [iName, setIName] = useState('');

  // Shared log
  const [log, setLog] = useState('');
  const [running, setRunning] = useState(false);
  const [activeAgent, setActiveAgent] = useState<string | null>(null);
  const logRef = useRef<HTMLPreElement>(null);

  async function runScript(script: string, args: string[]) {
    setLog('');
    setRunning(true);

    const res = await fetch('/api/admin/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ script, args }),
    });

    const reader = res.body!.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const text = decoder.decode(value);
      setLog((prev) => {
        const next = prev + text;
        setTimeout(() => {
          if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
        }, 0);
        return next;
      });
    }

    setRunning(false);
  }

  function runQuestions() {
    const args = ['--theme', qTheme, '--quiz', qQuiz, '--count', qCount];
    if (qDry) args.push('--dry');
    setActiveAgent('questions');
    runScript('generate-questions.mjs', args);
  }

  function runImage() {
    const args = ['--theme', iTheme];
    if (iName.trim()) args.push('--name', iName.trim());
    setActiveAgent('image');
    runScript('generate-image.mjs', args);
  }

  return (
    <div className="min-h-screen bg-[#0f0f1a] text-white font-mono p-8">
      <h1 className="text-3xl font-bold mb-1 text-purple-400">⚙️ Admin Dashboard</h1>
      <p className="text-white/40 text-sm mb-10">Party Games Hub — внутренние инструменты</p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">

        {/* ── Генератор вопросов ── */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <span className="text-3xl">🤖</span>
            <div>
              <h2 className="text-lg font-bold text-white">Генератор вопросов</h2>
              <p className="text-white/40 text-xs">OpenRouter → TypeScript файл</p>
            </div>
          </div>

          {/* Theme picker */}
          <label className="block text-xs text-white/50 mb-1">Тема</label>
          <div className="grid grid-cols-3 gap-2 mb-4">
            {THEMES.map((t) => (
              <button
                key={t.id}
                onClick={() => setQTheme(t.id)}
                className={`rounded-xl border px-2 py-2 text-xs transition-all text-left ${
                  qTheme === t.id
                    ? 'bg-purple-600/40 border-purple-400/60 text-white'
                    : 'bg-white/5 border-white/10 text-white/60 hover:border-white/30'
                }`}
              >
                {t.icon} {t.label}
              </button>
            ))}
          </div>

          <div className="flex gap-3 mb-4">
            <div className="flex-1">
              <label className="block text-xs text-white/50 mb-1">Квиз #</label>
              <input
                type="number"
                min="1"
                value={qQuiz}
                onChange={(e) => setQQuiz(e.target.value)}
                className="w-full bg-white/10 border border-white/15 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-purple-400/60"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs text-white/50 mb-1">Кол-во вопросов</label>
              <input
                type="number"
                min="5"
                max="30"
                value={qCount}
                onChange={(e) => setQCount(e.target.value)}
                className="w-full bg-white/10 border border-white/15 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-purple-400/60"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-white/60 mb-5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={qDry}
              onChange={(e) => setQDry(e.target.checked)}
              className="accent-purple-500"
            />
            Dry run (только показать, не сохранять)
          </label>

          <button
            onClick={runQuestions}
            disabled={running}
            className="w-full py-3 rounded-xl font-bold text-sm transition-all bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {running && activeAgent === 'questions' ? '⏳ Генерирую...' : '▶ Запустить'}
          </button>
        </div>

        {/* ── Генератор фонов ── */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <span className="text-3xl">🖼️</span>
            <div>
              <h2 className="text-lg font-bold text-white">Генератор фонов</h2>
              <p className="text-white/40 text-xs">OpenRouter → PNG в /public/backgrounds/</p>
            </div>
          </div>

          {/* Theme picker */}
          <label className="block text-xs text-white/50 mb-1">Тема</label>
          <div className="grid grid-cols-3 gap-2 mb-4">
            {THEMES.map((t) => (
              <button
                key={t.id}
                onClick={() => setITheme(t.id)}
                className={`rounded-xl border px-2 py-2 text-xs transition-all text-left ${
                  iTheme === t.id
                    ? 'bg-amber-600/40 border-amber-400/60 text-white'
                    : 'bg-white/5 border-white/10 text-white/60 hover:border-white/30'
                }`}
              >
                {t.icon} {t.label}
              </button>
            ))}
          </div>

          <div className="mb-5">
            <label className="block text-xs text-white/50 mb-1">Имя файла (необязательно)</label>
            <input
              type="text"
              placeholder={`${iTheme} (по умолчанию)`}
              value={iName}
              onChange={(e) => setIName(e.target.value)}
              className="w-full bg-white/10 border border-white/15 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-amber-400/60 placeholder:text-white/20"
            />
          </div>

          <div className="mb-5 p-3 bg-amber-900/20 border border-amber-500/20 rounded-xl text-xs text-amber-300/70">
            ⚠️ Стоит ~$0.07 за изображение. Убедись что интернет доступен.
          </div>

          <button
            onClick={runImage}
            disabled={running}
            className="w-full py-3 rounded-xl font-bold text-sm transition-all bg-amber-600 hover:bg-amber-500 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {running && activeAgent === 'image' ? '⏳ Генерирую...' : '▶ Запустить'}
          </button>
        </div>
      </div>

      {/* ── Console output ── */}
      <div className="bg-black/60 border border-white/10 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs text-white/40 font-bold uppercase tracking-widest">Вывод</span>
          {log && (
            <button
              onClick={() => setLog('')}
              className="text-xs text-white/30 hover:text-white/60 transition-colors"
            >
              очистить
            </button>
          )}
        </div>
        <pre
          ref={logRef}
          className="text-sm text-green-400 whitespace-pre-wrap min-h-[120px] max-h-[400px] overflow-y-auto leading-relaxed"
        >
          {log || <span className="text-white/20">Вывод скриптов появится здесь...</span>}
        </pre>
      </div>
    </div>
  );
}
