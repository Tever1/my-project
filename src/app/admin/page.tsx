'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';

// ─── Types ────────────────────────────────────────────────────────────────────

interface BgFile {
  name: string;
  filename: string;
  url: string;
  sizeKb: number;
  createdAt: number;
}

interface GeneralStat {
  topic: string;
  titleRu: string;
  total: number;
  easy: number;
  medium: number;
  hard: number;
}

interface SpecialStat {
  id: string;
  theme: string;
  number: number;
  titleRu: string;
  icon: string;
  count: number;
  hasDedicatedBank: boolean;
  backgroundUrl: string | null;
  backgroundFile: string | null;
}

interface RoomPlayer {
  nickname: string;
  isHost: boolean;
  isConnected: boolean;
}

interface RoomInfo {
  code: string;
  status: 'lobby' | 'in-game' | 'finished';
  currentGame: string | null;
  playerCount: number;
  players: RoomPlayer[];
  createdAt: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const THEMES = [
  { id: 'harry-potter',     label: 'Harry Potter',     icon: '⚡' },
  { id: 'marvel',           label: 'Marvel',           icon: '🦸' },
  { id: 'star-wars',        label: 'Star Wars',        icon: '🌌' },
  { id: 'lord-of-the-rings',label: 'Lord of the Rings',icon: '💍' },
  { id: 'game-of-thrones',  label: 'Game of Thrones',  icon: '🐉' },
  { id: 'disney',           label: 'Disney',           icon: '🏰' },
  { id: 'friends',          label: 'Friends',          icon: '☕' },
  { id: 'breaking-bad',     label: 'Breaking Bad',     icon: '🧪' },
  { id: 'the-office',       label: 'The Office',       icon: '📋' },
  { id: 'geography',        label: 'География',        icon: '🌍' },
  { id: 'history',          label: 'История',          icon: '📜' },
  { id: 'sports',           label: 'Спорт',            icon: '⚽' },
  { id: 'music',            label: 'Музыка',           icon: '🎵' },
];

const GAME_LABELS: Record<string, string> = {
  quiz: 'Квиз',
  'hundred-to-one': '100 к 1',
  crocodile: 'Крокодил',
  spy: 'Шпион',
  mafia: 'Мафия',
  'who-am-i': 'Кто я?',
  alias: 'Alias',
};

// ─── Tab type ─────────────────────────────────────────────────────────────────

type Tab = 'backgrounds' | 'quizzes' | 'games' | 'rooms';

// ═══════════════════════════════════════════════════════════════════════════════
// BACKGROUNDS TAB
// ═══════════════════════════════════════════════════════════════════════════════

function BackgroundsTab() {
  const [files, setFiles] = useState<BgFile[]>([]);
  const [usedFiles, setUsedFiles] = useState<Map<string, SpecialStat[]>>(new Map());
  const [loadingFiles, setLoadingFiles] = useState(true);
  const [deletingName, setDeletingName] = useState<string | null>(null);

  // Generate state
  const [theme, setTheme] = useState('harry-potter');
  const [customName, setCustomName] = useState('');
  const [customThemeInput, setCustomThemeInput] = useState('');
  const [customPromptText, setCustomPromptText] = useState('');
  const [promptLoading, setPromptLoading] = useState(false);
  type GenStep = 'idle' | 'generating' | 'preview' | 'saving' | 'saved' | 'error';
  const [lightbox, setLightbox] = useState<BgFile | null>(null);
  const [step, setStep] = useState<GenStep>('idle');
  const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(null);
  const [saveName, setSaveName] = useState('');
  const [savedPath, setSavedPath] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const fetchFiles = useCallback(async () => {
    setLoadingFiles(true);
    const [bgRes, statsRes] = await Promise.all([
      fetch('/api/admin/backgrounds'),
      fetch('/api/admin/quiz-stats'),
    ]);
    const bgData = await bgRes.json();
    const statsData = await statsRes.json();

    // Build map: backgroundFile → list of quizzes that use it
    const usageMap = new Map<string, SpecialStat[]>();
    for (const quiz of (statsData.special ?? []) as SpecialStat[]) {
      if (quiz.backgroundFile) {
        const existing = usageMap.get(quiz.backgroundFile) ?? [];
        usageMap.set(quiz.backgroundFile, [...existing, quiz]);
      }
    }

    setFiles(bgData.files ?? []);
    setUsedFiles(usageMap);
    setLoadingFiles(false);
  }, []);

  useEffect(() => { queueMicrotask(fetchFiles); }, [fetchFiles]);

  useEffect(() => {
    if (!lightbox) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setLightbox(null); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [lightbox]);

  async function handleDelete(name: string) {
    if (!confirm(`Удалить ${name}.png?`)) return;
    setDeletingName(name);
    await fetch('/api/admin/backgrounds', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', name }),
    });
    setDeletingName(null);
    fetchFiles();
  }

  async function handleGeneratePrompt() {
    if (!customThemeInput.trim()) return;
    setPromptLoading(true);
    setCustomPromptText('');
    const res = await fetch('/api/admin/generate-bg-prompt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ theme: customThemeInput }),
    });
    const data = await res.json();
    setCustomPromptText(data.prompt ?? '');
    setPromptLoading(false);
  }

  async function handleGenerate() {
    setStep('generating');
    setPreviewDataUrl(null);
    setErrorMsg('');
    try {
      const body = customPromptText.trim()
        ? { customPrompt: customPromptText }
        : { theme };
      const res = await fetch('/api/admin/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok || !data.dataUrl) { setErrorMsg(data.error ?? 'Ошибка'); setStep('error'); return; }
      setPreviewDataUrl(data.dataUrl);
      setSaveName(customName.trim() || theme);
      setStep('preview');
    } catch (err) {
      setErrorMsg((err as Error).message);
      setStep('error');
    }
  }

  async function handleSave() {
    if (!previewDataUrl) return;
    setStep('saving');
    try {
      const res = await fetch('/api/admin/save-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dataUrl: previewDataUrl, name: saveName }),
      });
      const data = await res.json();
      if (!res.ok) { setErrorMsg(data.error ?? 'Ошибка при сохранении'); setStep('error'); return; }
      setSavedPath(data.path);
      setStep('saved');
      fetchFiles();
    } catch (err) {
      setErrorMsg((err as Error).message);
      setStep('error');
    }
  }

  function resetGen() {
    setStep('idle');
    setPreviewDataUrl(null);
    setErrorMsg('');
    setSavedPath('');
  }

  const themeLabel = THEMES.find((t) => t.id === theme)?.label ?? theme;

  const assignedFiles = files.filter((f) => usedFiles.has(f.name));
  const freeFiles     = files.filter((f) => !usedFiles.has(f.name));

  function BgCard({ f }: { f: BgFile }) {
    const quizzes = usedFiles.get(f.name) ?? [];
    return (
      <div
        className="relative group rounded-xl overflow-hidden border border-white/10 aspect-video bg-white/5 cursor-zoom-in"
        onClick={() => setLightbox(f)}
      >
        <Image src={f.url} alt={f.name} fill className="object-cover transition-transform duration-300 group-hover:scale-105" unoptimized />
        {/* Quiz badge (always visible) */}
        {quizzes.length > 0 && (
          <div className="absolute top-2 left-2 flex flex-wrap gap-1">
            {quizzes.map((q) => (
              <span key={q.id} className="bg-black/70 text-white text-[10px] px-2 py-0.5 rounded-lg font-bold">
                {q.icon} {q.titleRu}
              </span>
            ))}
          </div>
        )}
        {/* Zoom hint */}
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <span className="bg-black/70 text-white text-[10px] px-2 py-1 rounded-lg">🔍</span>
        </div>
        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex flex-col justify-end p-3 opacity-0 group-hover:opacity-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-xs font-bold truncate">{f.name}</p>
              <p className="text-white/50 text-[10px]">{f.sizeKb} KB</p>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); handleDelete(f.name); }}
              disabled={deletingName === f.name}
              className="bg-red-600/80 hover:bg-red-500 text-white text-xs px-2 py-1 rounded-lg transition-colors disabled:opacity-50 flex-shrink-0"
            >
              {deletingName === f.name ? '...' : 'Удалить'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">

      {/* ── Gallery ── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-white/50 uppercase tracking-widest">Галерея фонов</h2>
          <button onClick={fetchFiles} className="text-xs text-white/30 hover:text-white/60 transition-colors">обновить</button>
        </div>

        {loadingFiles ? (
          <p className="text-white/30 text-sm">Загрузка...</p>
        ) : files.length === 0 ? (
          <p className="text-white/30 text-sm">Нет сохранённых фонов</p>
        ) : (
          <div className="space-y-6">

            {/* Used in quizzes */}
            {assignedFiles.length > 0 && (
              <div>
                <p className="text-xs text-green-400/70 font-bold uppercase tracking-widest mb-3">
                  Используются в квизах ({assignedFiles.length})
                </p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {assignedFiles.map((f) => <BgCard key={f.name} f={f} />)}
                </div>
              </div>
            )}

            {/* Free (not linked to any quiz) */}
            {freeFiles.length > 0 && (
              <div>
                <p className="text-xs text-white/30 font-bold uppercase tracking-widest mb-3">
                  Не привязаны к квизу ({freeFiles.length})
                </p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {freeFiles.map((f) => <BgCard key={f.name} f={f} />)}
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* ── Lightbox ── */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm"
          onClick={() => setLightbox(null)}
        >
          <div
            className="relative max-w-5xl w-full mx-6"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Image */}
            <div className="relative w-full aspect-video rounded-2xl overflow-hidden shadow-2xl border border-white/10">
              <Image src={lightbox.url} alt={lightbox.name} fill className="object-cover" unoptimized />
            </div>
            {/* Footer */}
            <div className="flex items-center justify-between mt-3 px-1">
              <div>
                <p className="text-white font-bold text-sm">{lightbox.name}</p>
                <p className="text-white/40 text-xs">{lightbox.sizeKb} KB</p>
              </div>
              <button
                onClick={() => setLightbox(null)}
                className="text-white/50 hover:text-white text-sm transition-colors bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg"
              >
                ✕ Закрыть
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Generate new ── */}
      <section>
        <h2 className="text-sm font-bold text-white/50 uppercase tracking-widest mb-4">Сгенерировать новый фон</h2>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
          <div>
            <label className="block text-xs text-white/50 mb-2">Тема</label>
            <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
              {THEMES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => { setTheme(t.id); resetGen(); }}
                  disabled={step === 'generating' || step === 'saving'}
                  className={`rounded-xl border px-2 py-2 text-xs transition-all text-left disabled:cursor-not-allowed ${
                    theme === t.id
                      ? 'bg-amber-600/40 border-amber-400/60 text-white'
                      : 'bg-white/5 border-white/10 text-white/60 hover:border-white/30'
                  }`}
                >
                  {t.icon} {t.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs text-white/50 mb-1">Имя файла (необязательно)</label>
            <input
              type="text"
              placeholder={`${theme} (по умолчанию)`}
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              disabled={step === 'generating' || step === 'saving'}
              className="w-full bg-white/10 border border-white/15 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-amber-400/60 placeholder:text-white/20 disabled:opacity-50"
            />
          </div>

          {/* Custom theme → LLM prompt generator */}
          <div className="border-t border-white/10 pt-4">
            <label className="block text-xs text-white/50 mb-2">
              Или введи свою тему — LLM придумает промпт
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Minecraft, Cyberpunk, Ведьмак..."
                value={customThemeInput}
                onChange={(e) => { setCustomThemeInput(e.target.value); setCustomPromptText(''); }}
                onKeyDown={(e) => e.key === 'Enter' && handleGeneratePrompt()}
                disabled={promptLoading}
                className="flex-1 bg-white/10 border border-white/15 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-amber-400/60 placeholder:text-white/20 disabled:opacity-50"
              />
              <button
                onClick={handleGeneratePrompt}
                disabled={promptLoading || !customThemeInput.trim()}
                className="flex-shrink-0 px-3 py-2 rounded-lg text-xs font-bold bg-white/10 hover:bg-white/20 border border-white/15 transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-white/70"
              >
                {promptLoading ? '...' : '✨ Промпт'}
              </button>
            </div>
            {customPromptText && (
              <div className="mt-2">
                <textarea
                  value={customPromptText}
                  onChange={(e) => setCustomPromptText(e.target.value)}
                  rows={3}
                  className="w-full bg-white/10 border border-amber-400/30 rounded-lg px-3 py-2 text-white/80 text-xs outline-none focus:border-amber-400/60 resize-none leading-relaxed"
                />
                <p className="text-[10px] text-amber-300/50 mt-1">Можно редактировать перед генерацией</p>
              </div>
            )}
          </div>

          <p className="text-xs text-amber-300/60 bg-amber-900/20 border border-amber-500/20 rounded-xl px-3 py-2">
            ⚠️ Стоит ~$0.07 за изображение. Существующие файлы не перезаписываются.
          </p>

          {(step === 'idle' || step === 'error') && (
            <button onClick={handleGenerate} className="w-full py-3 rounded-xl font-bold text-sm bg-amber-600 hover:bg-amber-500 transition-colors">
              {customPromptText ? 'Сгенерировать по своему промпту' : 'Сгенерировать предпросмотр'}
            </button>
          )}

          {step === 'generating' && (
            <div className="w-full py-3 rounded-xl bg-amber-600/20 border border-amber-500/30 text-center text-sm text-amber-300 animate-pulse">
              Генерирую... (~15 сек)
            </div>
          )}

          {step === 'error' && (
            <p className="text-xs text-red-300 bg-red-900/30 border border-red-500/30 rounded-xl px-3 py-2">❌ {errorMsg}</p>
          )}
        </div>

        {/* Preview */}
        {(step === 'preview' || step === 'saving' || step === 'saved') && previewDataUrl && (
          <div className="mt-4 bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
            <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-white/10">
              <Image src={previewDataUrl} alt="preview" fill className="object-cover" unoptimized />
              <div className="absolute top-2 left-2 bg-black/60 text-white/70 text-xs px-2 py-1 rounded-lg">{themeLabel}</div>
            </div>

            {step === 'saved' ? (
              <div className="space-y-3">
                <p className="text-sm text-green-300 bg-green-900/30 border border-green-500/30 rounded-xl px-3 py-2">✅ Сохранено: {savedPath}</p>
                <button onClick={resetGen} className="w-full py-3 rounded-xl font-bold text-sm bg-white/10 hover:bg-white/20 transition-colors">
                  Сгенерировать ещё
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-white/50 mb-1">Имя файла</label>
                  <input
                    type="text"
                    value={saveName}
                    onChange={(e) => setSaveName(e.target.value)}
                    disabled={step === 'saving'}
                    className="w-full bg-white/10 border border-white/15 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-green-400/60 disabled:opacity-50"
                  />
                  <p className="text-xs text-white/30 mt-1">→ public/backgrounds/{saveName.toLowerCase().replace(/[^a-z0-9-]/g, '-')}.png</p>
                </div>
                <div className="flex gap-3">
                  <button onClick={handleGenerate} disabled={step === 'saving'} className="flex-1 py-3 rounded-xl font-bold text-sm bg-white/10 hover:bg-white/20 transition-colors disabled:opacity-40">
                    Перегенерировать
                  </button>
                  <button onClick={handleSave} disabled={step === 'saving' || !saveName.trim()} className="flex-1 py-3 rounded-xl font-bold text-sm bg-green-600 hover:bg-green-500 transition-colors disabled:opacity-40">
                    {step === 'saving' ? 'Сохраняю...' : 'Сохранить'}
                  </button>
                </div>
                <button onClick={resetGen} className="w-full text-xs text-white/30 hover:text-white/50 py-1 transition-colors">Отмена</button>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// QUIZZES TAB
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Question types ───────────────────────────────────────────────────────────

interface QuizQuestionRaw {
  id: string;
  questionRu: string;
  questionEn: string;
  options: { ru: string; en: string }[];
  correctIndex: number;
  difficulty?: string;
}

type Selection =
  | { type: 'general'; topic: string; difficulty: string; label: string }
  | { type: 'special'; id: string; label: string }
  | null;

// ─── Question viewer panel ────────────────────────────────────────────────────

function QuestionViewer({ selection }: { selection: Selection }) {
  const [questions, setQuestions] = useState<QuizQuestionRaw[]>([]);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [report, setReport] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [replacingId, setReplacingId] = useState<string | null>(null);
  const [replaceError, setReplaceError] = useState<string | null>(null);
  const [checkingId, setCheckingId] = useState<string | null>(null);
  const [factCheckResults, setFactCheckResults] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!selection) return;
    setLoading(true);
    setQuestions([]);
    setReport(null);

    const url = selection.type === 'special'
      ? `/api/admin/quiz-questions?specialId=${selection.id}`
      : `/api/admin/quiz-questions?topic=${selection.topic}&difficulty=${selection.difficulty}`;

    fetch(url)
      .then((r) => r.json())
      .then((d) => { setQuestions(d.questions ?? []); setLoading(false); });
  }, [selection]);

  async function handleFactCheck() {
    setChecking(true);
    setReport(null);
    const res = await fetch('/api/admin/fact-check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ questions }),
    });
    const data = await res.json();
    setReport(data.report ?? data.error ?? 'Нет ответа');
    setChecking(false);
  }

  async function handleDeleteQuestion(q: QuizQuestionRaw) {
    setDeletingId(q.id);
    // Optimistic remove
    setQuestions((prev) => prev.filter((x) => x.id !== q.id));
    await fetch('/api/admin/quiz-item', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'delete',
        quizType: selection?.type ?? 'general',
        specialId: selection?.type === 'special' ? selection.id : undefined,
        question: q,
      }),
    });
    setDeletingId(null);
  }

  async function handleReplaceQuestion(q: QuizQuestionRaw) {
    if (selection?.type !== 'special') return;
    setReplacingId(q.id);
    setReplaceError(null);
    try {
      const res = await fetch('/api/admin/quiz-item', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'replace',
          quizType: 'special',
          specialId: selection.id,
          question: q,
          existingQuestions: questions.map((x) => x.questionRu),
        }),
      });
      const text = await res.text();
      if (!text) {
        setReplaceError(`Пустой ответ от сервера (HTTP ${res.status}). Возможно, таймаут — попробуй ещё раз.`);
        return;
      }
      let data: { ok?: boolean; replacement?: QuizQuestionRaw; error?: string };
      try {
        data = JSON.parse(text);
      } catch {
        setReplaceError(`Невалидный JSON от сервера: ${text.slice(0, 200)}`);
        return;
      }
      if (data.ok && data.replacement) {
        const newQ: QuizQuestionRaw = data.replacement;
        setQuestions((prev) => {
          const idx = prev.findIndex((x) => x.id === q.id);
          const next = prev.filter((x) => x.id !== q.id);
          if (idx >= 0) next.splice(idx, 0, newQ);
          else next.push(newQ);
          return next;
        });
        // Факт-чекинг запускаем отдельно, уже после отображения вопроса
        setFactCheckResults((prev) => ({ ...prev, [newQ.id]: '⏳ Проверяю...' }));
        fetch('/api/admin/fact-check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ questions: [newQ] }),
        })
          .then((r) => r.json())
          .then((d) => {
            const result = d.report ?? d.error ?? '⚠️ Нет ответа';
            setFactCheckResults((prev) => ({ ...prev, [newQ.id]: result }));
          })
          .catch(() => {
            setFactCheckResults((prev) => ({ ...prev, [newQ.id]: '⚠️ Не удалось проверить' }));
          });
      } else {
        setReplaceError(data.error ?? 'Неизвестная ошибка');
      }
    } catch (err) {
      setReplaceError((err as Error).message ?? 'Ошибка запроса');
    } finally {
      setReplacingId(null);
    }
  }

  async function handleFactCheckOne(q: QuizQuestionRaw) {
    setCheckingId(q.id);
    setFactCheckResults((prev) => ({ ...prev, [q.id]: '⏳ Проверяю...' }));
    try {
      const res = await fetch('/api/admin/fact-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questions: [q] }),
      });
      const data = await res.json();
      setFactCheckResults((prev) => ({ ...prev, [q.id]: data.report ?? data.error ?? '⚠️ Нет ответа' }));
    } catch {
      setFactCheckResults((prev) => ({ ...prev, [q.id]: '⚠️ Не удалось проверить' }));
    } finally {
      setCheckingId(null);
    }
  }

  if (!selection) {
    return (
      <div className="h-full flex items-center justify-center text-center px-8">
        <div>
          <p className="text-4xl mb-3 opacity-30">👆</p>
          <p className="text-white/30 text-sm">Нажми на количество вопросов<br />или на тематический квиз</p>
        </div>
      </div>
    );
  }

  const diffColor: Record<string, string> = {
    easy: 'text-green-400 bg-green-900/20 border-green-500/30',
    medium: 'text-yellow-400 bg-yellow-900/20 border-yellow-500/30',
    hard: 'text-red-400 bg-red-900/20 border-red-500/30',
  };
  const diffLabel: Record<string, string> = { easy: 'Лёгкий', medium: 'Средний', hard: 'Сложный' };
  const optionLetters = ['A', 'B', 'C', 'D'];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <h3 className="text-sm font-bold text-white/70 uppercase tracking-widest">{selection.label}</h3>
        <div className="flex items-center gap-3">
          {!loading && <span className="text-xs text-white/30">{questions.length} вопросов</span>}
          {!loading && questions.length > 0 && (
            <button
              onClick={handleFactCheck}
              disabled={checking}
              className="text-xs bg-blue-600/30 hover:bg-blue-600/50 border border-blue-500/40 text-blue-300 hover:text-blue-200 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {checking ? '⏳ Проверяю...' : '🔍 Проверить достоверность'}
            </button>
          )}
        </div>
      </div>

      {/* Replace error */}
      {replaceError && (
        <div className="mb-4 flex-shrink-0 bg-red-900/20 border border-red-500/30 rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-red-300 uppercase tracking-widest">Ошибка замены</span>
            <button onClick={() => setReplaceError(null)} className="text-xs text-white/30 hover:text-white/60">✕</button>
          </div>
          <p className="text-xs text-red-300/80 mt-1">{replaceError}</p>
        </div>
      )}

      {/* Fact-check report */}
      {report && (
        <div className="mb-4 flex-shrink-0 bg-blue-900/20 border border-blue-500/30 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-blue-300 uppercase tracking-widest">Отчёт о достоверности</span>
            <button onClick={() => setReport(null)} className="text-xs text-white/30 hover:text-white/60">✕</button>
          </div>
          <pre className="text-xs text-white/80 whitespace-pre-wrap leading-relaxed font-sans">{report}</pre>
        </div>
      )}

      {/* List */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
        {loading && (
          <p className="text-white/30 text-sm">Загрузка...</p>
        )}
        {!loading && questions.map((q, idx) => {
          const isDeleting  = deletingId  === q.id;
          const isReplacing = replacingId === q.id;
          const isChecking  = checkingId  === q.id;
          const isBusy      = isDeleting || isReplacing || isChecking;
          return (
          <div key={q.id} className={`bg-white/5 border border-white/10 rounded-2xl p-4 transition-opacity ${isBusy ? 'opacity-40 pointer-events-none' : ''}`}>
            {/* Question header */}
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <span className="text-white/30 text-xs font-bold">#{idx + 1}</span>
                {q.difficulty && (
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border ${diffColor[q.difficulty] ?? 'text-white/40 bg-white/5 border-white/10'}`}>
                    {diffLabel[q.difficulty] ?? q.difficulty}
                  </span>
                )}
              </div>
              {/* Action buttons */}
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {isReplacing && <span className="text-xs text-white/30 animate-pulse">генерирую...</span>}
                {isChecking  && <span className="text-xs text-white/30 animate-pulse">проверяю...</span>}
                <button
                  onClick={() => handleFactCheckOne(q)}
                  disabled={isBusy}
                  title="Проверить достоверность"
                  className="text-[11px] px-2 py-1 rounded-lg bg-blue-600/20 hover:bg-blue-600/40 border border-blue-500/30 text-blue-300 hover:text-blue-200 transition-colors disabled:opacity-40"
                >
                  🔍
                </button>
                {selection?.type === 'special' && (
                  <button
                    onClick={() => handleReplaceQuestion(q)}
                    disabled={isBusy}
                    title="Заменить (AI)"
                    className="text-[11px] px-2 py-1 rounded-lg bg-purple-600/20 hover:bg-purple-600/40 border border-purple-500/30 text-purple-300 hover:text-purple-200 transition-colors disabled:opacity-40"
                  >
                    🔄
                  </button>
                )}
                <button
                  onClick={() => handleDeleteQuestion(q)}
                  disabled={isBusy}
                  title="Удалить"
                  className="text-[11px] px-2 py-1 rounded-lg bg-red-600/10 hover:bg-red-600/30 border border-red-500/20 text-red-400 hover:text-red-300 transition-colors disabled:opacity-40"
                >
                  🗑
                </button>
              </div>
            </div>

            {/* Question text */}
            <p className="text-white text-sm font-medium mb-1">{q.questionRu}</p>
            <p className="text-white/40 text-xs mb-3">{q.questionEn}</p>

            {/* Fact-check result (shown after AI replacement) */}
            {factCheckResults[q.id] && (
              <div className={`mb-3 px-3 py-1.5 rounded-lg text-xs border ${
                factCheckResults[q.id].startsWith('✅')
                  ? 'bg-green-900/20 border-green-500/30 text-green-300'
                  : factCheckResults[q.id].startsWith('❌')
                  ? 'bg-red-900/20 border-red-500/30 text-red-300'
                  : 'bg-yellow-900/20 border-yellow-500/30 text-yellow-300'
              }`}>
                {factCheckResults[q.id]}
              </div>
            )}

            {/* Options */}
            <div className="space-y-1.5">
              {q.options.map((opt, i) => (
                <div
                  key={i}
                  className={`flex items-start gap-2 rounded-xl px-3 py-2 text-xs transition-colors ${
                    i === q.correctIndex
                      ? 'bg-green-900/40 border border-green-500/40 text-green-300'
                      : 'bg-white/5 border border-white/5 text-white/50'
                  }`}
                >
                  <span className={`font-bold flex-shrink-0 ${i === q.correctIndex ? 'text-green-400' : 'text-white/30'}`}>
                    {optionLetters[i]}
                  </span>
                  <div>
                    <p>{opt.ru}</p>
                    <p className="opacity-60">{opt.en}</p>
                  </div>
                  {i === q.correctIndex && (
                    <span className="ml-auto flex-shrink-0 text-green-400">✓</span>
                  )}
                </div>
              ))}
            </div>
          </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Quizzes tab ──────────────────────────────────────────────────────────────

function QuizzesTab() {
  const [general, setGeneral] = useState<GeneralStat[]>([]);
  const [special, setSpecial] = useState<SpecialStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);
  const [selection, setSelection] = useState<Selection>(null);

  useEffect(() => {
    fetch('/api/admin/quiz-stats')
      .then((r) => r.json())
      .then((d) => { setGeneral(d.general ?? []); setSpecial(d.special ?? []); setLoading(false); });
  }, []);

  function selectGeneral(topic: string, difficulty: string, titleRu: string) {
    const diffLabel = difficulty === 'all' ? 'все' : difficulty === 'easy' ? 'лёгкие' : difficulty === 'medium' ? 'средние' : 'сложные';
    setSelection({ type: 'general', topic, difficulty, label: `${titleRu} — ${diffLabel}` });
  }

  function selectSpecial(q: SpecialStat) {
    setSelection({ type: 'special', id: q.id, label: q.titleRu });
  }

  function buildPrompt(quiz: SpecialStat): string {
    const nextNum = quiz.number + 1;
    const themeLabel = THEMES.find((t) => t.id === quiz.theme)?.label ?? quiz.theme;
    return `Придумай 10 вопросов средней сложности для квиза «${themeLabel} #${nextNum}».\n\nТребования:\n- Не повторять темы, которые уже покрыты в квизе #${quiz.number}\n- 4 варианта ответа (A, B, C, D), один правильный\n- Вопросы и варианты — на русском и английском\n- Средняя сложность: не слишком очевидные, но проверяемые факты\n- Все факты точные и соответствуют канону`;
  }

  async function copyPrompt(quiz: SpecialStat, e: React.MouseEvent) {
    e.stopPropagation();
    await navigator.clipboard.writeText(buildPrompt(quiz));
    setCopied(quiz.id);
    setTimeout(() => setCopied(null), 2000);
  }

  const isSelected = (s: Selection) => {
    if (!selection || !s) return false;
    if (selection.type !== s.type) return false;
    if (selection.type === 'special' && s.type === 'special') return selection.id === s.id;
    if (selection.type === 'general' && s.type === 'general') return selection.topic === s.topic && selection.difficulty === s.difficulty;
    return false;
  };

  if (loading) return <p className="text-white/30 text-sm">Загрузка...</p>;

  return (
    <div className="flex gap-6 h-[calc(100vh-220px)] min-h-[500px]">

      {/* ── Left: quiz list ── */}
      <div className="w-[420px] flex-shrink-0 overflow-y-auto space-y-6 pr-1">

        {/* General quizzes */}
        <section>
          <h2 className="text-xs font-bold text-white/40 uppercase tracking-widest mb-3">Общие квизы</h2>
          <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-white/30 text-[10px] uppercase tracking-widest">
                  <th className="text-left px-4 py-2.5">Тема</th>
                  <th className="text-center px-3 py-2.5">Все</th>
                  <th className="text-center px-3 py-2.5 text-green-400/60">Лёг</th>
                  <th className="text-center px-3 py-2.5 text-yellow-400/60">Сред</th>
                  <th className="text-center px-3 py-2.5 text-red-400/60">Слож</th>
                </tr>
              </thead>
              <tbody>
                {general.map((g, i) => {
                  const isRowSel = selection?.type === 'general' && selection.topic === g.topic && selection.difficulty === 'all';
                  return (
                    <tr key={g.topic} className={`${i < general.length - 1 ? 'border-b border-white/5' : ''} group`}>
                      <td
                        onClick={() => selectGeneral(g.topic, 'all', g.titleRu)}
                        className={`px-4 py-3 font-medium cursor-pointer transition-colors ${isRowSel ? 'text-purple-300' : 'text-white hover:text-purple-300'}`}
                      >
                        {g.titleRu}
                      </td>
                      <td
                        onClick={() => selectGeneral(g.topic, 'all', g.titleRu)}
                        className={`px-3 py-3 text-center font-bold cursor-pointer transition-colors ${isRowSel ? 'text-purple-300' : 'text-white/80 hover:text-purple-300'}`}
                      >
                        {g.total}
                      </td>
                      <td
                        onClick={() => selectGeneral(g.topic, 'easy', g.titleRu)}
                        className={`px-3 py-3 text-center cursor-pointer transition-opacity ${isSelected({ type: 'general', topic: g.topic, difficulty: 'easy', label: '' }) ? 'opacity-100 underline' : 'opacity-80 hover:opacity-100'} text-green-400`}
                      >
                        {g.easy}
                      </td>
                      <td
                        onClick={() => selectGeneral(g.topic, 'medium', g.titleRu)}
                        className={`px-3 py-3 text-center cursor-pointer transition-opacity ${isSelected({ type: 'general', topic: g.topic, difficulty: 'medium', label: '' }) ? 'opacity-100 underline' : 'opacity-80 hover:opacity-100'} text-yellow-400`}
                      >
                        {g.medium}
                      </td>
                      <td
                        onClick={() => selectGeneral(g.topic, 'hard', g.titleRu)}
                        className={`px-3 py-3 text-center cursor-pointer transition-opacity ${isSelected({ type: 'general', topic: g.topic, difficulty: 'hard', label: '' }) ? 'opacity-100 underline' : 'opacity-80 hover:opacity-100'} text-red-400`}
                      >
                        {g.hard}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* Special quizzes */}
        <section>
          <h2 className="text-xs font-bold text-white/40 uppercase tracking-widest mb-3">Тематические квизы</h2>
          <div className="space-y-2">
            {special.map((q) => {
              const isSel = selection?.type === 'special' && selection.id === q.id;
              return (
                <div
                  key={q.id}
                  onClick={() => selectSpecial(q)}
                  className={`rounded-2xl px-4 py-3 flex items-center justify-between gap-3 cursor-pointer transition-all border ${
                    isSel
                      ? 'bg-purple-600/20 border-purple-400/40'
                      : 'bg-white/5 border-white/10 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-xl flex-shrink-0">{q.icon}</span>
                    <div className="min-w-0">
                      <p className={`font-bold text-sm truncate ${isSel ? 'text-purple-200' : 'text-white'}`}>{q.titleRu}</p>
                      <p className={`text-xs mt-0.5 ${q.hasDedicatedBank ? 'text-green-400' : 'text-amber-400'}`}>
                        {q.hasDedicatedBank ? `✅ ${q.count} вопросов` : `⚠️ fallback (${q.count})`}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={(e) => copyPrompt(q, e)}
                    className="flex-shrink-0 text-[10px] bg-white/10 hover:bg-white/20 border border-white/10 rounded-lg px-2 py-1 transition-colors text-white/50 hover:text-white"
                  >
                    {copied === q.id ? '✅' : `📋 #${q.number + 1}`}
                  </button>
                </div>
              );
            })}
          </div>

          <div className="mt-3 p-3 bg-purple-900/20 border border-purple-500/20 rounded-2xl text-xs text-purple-300/60 leading-relaxed">
            <strong className="text-purple-300">Добавить квиз:</strong> нажми 📋 → вставь промпт в чат с Claude → одобри → готово.
          </div>
        </section>
      </div>

      {/* ── Right: question viewer ── */}
      <div className="flex-1 bg-white/5 border border-white/10 rounded-2xl p-5 overflow-hidden">
        <QuestionViewer selection={selection} />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ROOMS TAB
// ═══════════════════════════════════════════════════════════════════════════════

function RoomsTab() {
  const [rooms, setRooms] = useState<RoomInfo[]>([]);
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchRooms = useCallback(async () => {
    const res = await fetch('/api/admin/rooms');
    const data = await res.json();
    setRooms(data.rooms ?? []);
    setUpdatedAt(data.updatedAt ?? Date.now());
    setLoading(false);
  }, []);

  useEffect(() => { queueMicrotask(fetchRooms); }, [fetchRooms]);

  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(fetchRooms, 5000);
    return () => clearInterval(id);
  }, [autoRefresh, fetchRooms]);

  const statusColor = (s: RoomInfo['status']) =>
    s === 'in-game' ? 'text-green-400' : s === 'lobby' ? 'text-yellow-400' : 'text-white/30';

  const statusLabel = (s: RoomInfo['status']) =>
    s === 'in-game' ? 'В игре' : s === 'lobby' ? 'Лобби' : 'Завершена';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-sm font-bold text-white/50 uppercase tracking-widest">
            Активных комнат: <span className="text-white">{rooms.length}</span>
          </h2>
          {updatedAt && (
            <span className="text-xs text-white/20">
              обновлено {new Date(updatedAt).toLocaleTimeString('ru')}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-white/40 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="accent-purple-500"
            />
            Авто (5 сек)
          </label>
          <button onClick={fetchRooms} className="text-xs text-white/30 hover:text-white/60 transition-colors">
            Обновить
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-white/30 text-sm">Загрузка...</p>
      ) : rooms.length === 0 ? (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center text-white/30 text-sm">
          Нет активных комнат
        </div>
      ) : (
        <div className="space-y-3">
          {rooms.map((room) => (
            <div key={room.code} className="bg-white/5 border border-white/10 rounded-2xl p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="font-bold text-white text-lg tracking-widest">{room.code}</span>
                  <span className={`text-xs font-bold ${statusColor(room.status)}`}>{statusLabel(room.status)}</span>
                  {room.currentGame && (
                    <span className="text-xs bg-white/10 text-white/60 px-2 py-0.5 rounded-lg">
                      {GAME_LABELS[room.currentGame] ?? room.currentGame}
                    </span>
                  )}
                </div>
                <span className="text-xs text-white/30">
                  {room.playerCount} игрок{room.playerCount === 1 ? '' : room.playerCount < 5 ? 'а' : 'ов'}
                </span>
              </div>

              <div className="flex flex-wrap gap-2">
                {room.players.map((p) => (
                  <span
                    key={p.nickname}
                    className={`text-xs px-2 py-1 rounded-lg border ${
                      p.isHost
                        ? 'bg-purple-600/30 border-purple-400/40 text-purple-200'
                        : p.isConnected
                        ? 'bg-white/10 border-white/10 text-white/70'
                        : 'bg-white/5 border-white/5 text-white/30 line-through'
                    }`}
                  >
                    {p.isHost ? '👑 ' : ''}{p.nickname}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// WORD GENERATOR PANEL (встроен в игры Alias / Крокодил)
// ═══════════════════════════════════════════════════════════════════════════════

function WordGeneratorPanel({ defaultGame }: { defaultGame: 'alias' | 'crocodile' }) {
  const [wordTheme, setWordTheme]   = useState('');
  const [wordGame, setWordGame]     = useState<'alias' | 'crocodile'>(defaultGame);
  const [wordDiff, setWordDiff]     = useState('medium');
  const [wordCount, setWordCount]   = useState(20);
  const [words, setWords]           = useState<string[]>([]);
  const [wordLoading, setWordLoading] = useState(false);
  const [wordError, setWordError]   = useState('');
  const [wordCopied, setWordCopied] = useState(false);

  const diffOptions = [
    { id: 'easy',   label: 'Простые' },
    { id: 'medium', label: 'Средние' },
    { id: 'hard',   label: 'Сложные' },
  ];

  async function generateWords() {
    if (!wordTheme.trim()) return;
    setWordLoading(true); setWords([]); setWordError('');
    const res = await fetch('/api/admin/generate-words', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ theme: wordTheme, difficulty: wordDiff, count: wordCount, game: wordGame }),
    });
    const data = await res.json();
    if (!res.ok) { setWordError(data.error ?? 'Ошибка'); }
    else { setWords(data.words ?? []); }
    setWordLoading(false);
  }

  async function copyWords() {
    await navigator.clipboard.writeText(words.join('\n'));
    setWordCopied(true);
    setTimeout(() => setWordCopied(false), 2000);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 pb-3 border-b border-white/10">
        <span className="text-base">✨</span>
        <div>
          <p className="text-sm font-bold text-white">Генератор слов</p>
          <p className="text-xs text-white/40">AI генерирует слова по теме для банка игры</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {(['alias', 'crocodile'] as const).map((g) => (
          <button
            key={g}
            onClick={() => setWordGame(g)}
            className={`py-1.5 rounded-xl text-xs font-bold border transition-all ${
              wordGame === g
                ? 'bg-purple-600/40 border-purple-400/60 text-white'
                : 'bg-white/5 border-white/10 text-white/50 hover:border-white/30'
            }`}
          >
            {g === 'alias' ? '🗣 Угадай слово' : '🤸 Крокодил'}
          </button>
        ))}
      </div>

      <div>
        <label className="block text-xs text-white/50 mb-1">Тема</label>
        <input
          type="text"
          placeholder="Marvel, Еда, Спорт, Природа..."
          value={wordTheme}
          onChange={(e) => setWordTheme(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && generateWords()}
          className="w-full bg-white/10 border border-white/15 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-purple-400/60 placeholder:text-white/20"
        />
      </div>

      <div className="flex gap-2">
        {diffOptions.map((d) => (
          <button
            key={d.id}
            onClick={() => setWordDiff(d.id)}
            className={`flex-1 py-1 rounded-lg text-xs font-bold border transition-all ${
              wordDiff === d.id
                ? 'bg-white/20 border-white/30 text-white'
                : 'bg-white/5 border-white/10 text-white/40 hover:border-white/20'
            }`}
          >
            {d.label}
          </button>
        ))}
        <div className="flex items-center gap-2 ml-2">
          <label className="text-xs text-white/40 flex-shrink-0">шт:</label>
          <input
            type="number"
            min={5} max={50}
            value={wordCount}
            onChange={(e) => setWordCount(Number(e.target.value))}
            className="w-14 bg-white/10 border border-white/15 rounded-lg px-2 py-1 text-white text-xs outline-none focus:border-purple-400/60"
          />
        </div>
      </div>

      <button
        onClick={generateWords}
        disabled={wordLoading || !wordTheme.trim()}
        className="w-full py-2 rounded-xl font-bold text-sm bg-purple-600 hover:bg-purple-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {wordLoading ? '⏳ Генерирую...' : 'Сгенерировать'}
      </button>

      {wordError && <p className="text-xs text-red-300">❌ {wordError}</p>}

      {words.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-white/40">{words.length} слов</span>
            <button onClick={copyWords} className="text-xs text-white/50 hover:text-white transition-colors">
              {wordCopied ? '✅ Скопировано' : '📋 Копировать всё'}
            </button>
          </div>
          <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto">
            {words.map((w, i) => (
              <span key={i} className="bg-white/10 border border-white/10 text-white/80 text-xs px-2.5 py-1 rounded-lg">
                {w}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOCATION GENERATOR PANEL (встроен в игру Шпион)
// ═══════════════════════════════════════════════════════════════════════════════

interface SpyLocation { nameRu: string; nameEn: string; roles: string[]; }

function LocationGeneratorPanel() {
  const [locCount, setLocCount]     = useState(5);
  const [locations, setLocations]   = useState<SpyLocation[]>([]);
  const [locLoading, setLocLoading] = useState(false);
  const [locError, setLocError]     = useState('');
  const [locCopied, setLocCopied]   = useState(false);

  async function generateLocations() {
    setLocLoading(true); setLocations([]); setLocError('');
    const res = await fetch('/api/admin/generate-locations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ count: locCount }),
    });
    const data = await res.json();
    if (!res.ok) { setLocError(data.error ?? 'Ошибка'); }
    else { setLocations(data.locations ?? []); }
    setLocLoading(false);
  }

  async function copyLocations() {
    const text = locations.map((l) =>
      `${l.nameRu} / ${l.nameEn}\nРоли: ${l.roles.join(', ')}`
    ).join('\n\n');
    await navigator.clipboard.writeText(text);
    setLocCopied(true);
    setTimeout(() => setLocCopied(false), 2000);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 pb-3 border-b border-white/10">
        <span className="text-base">✨</span>
        <div>
          <p className="text-sm font-bold text-white">Генератор локаций</p>
          <p className="text-xs text-white/40">AI придумывает новые места и роли для игры</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <label className="text-xs text-white/50 flex-shrink-0">Кол-во:</label>
        <input
          type="number"
          min={1} max={20}
          value={locCount}
          onChange={(e) => setLocCount(Number(e.target.value))}
          className="w-16 bg-white/10 border border-white/15 rounded-lg px-3 py-1.5 text-white text-sm outline-none focus:border-purple-400/60"
        />
      </div>

      <button
        onClick={generateLocations}
        disabled={locLoading}
        className="w-full py-2 rounded-xl font-bold text-sm bg-purple-600 hover:bg-purple-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {locLoading ? '⏳ Генерирую...' : 'Сгенерировать локации'}
      </button>

      {locError && <p className="text-xs text-red-300">❌ {locError}</p>}

      {locations.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-white/40">{locations.length} локаций</span>
            <button onClick={copyLocations} className="text-xs text-white/50 hover:text-white transition-colors">
              {locCopied ? '✅ Скопировано' : '📋 Копировать'}
            </button>
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {locations.map((loc, i) => (
              <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-3">
                <p className="text-white text-sm font-bold mb-0.5">{loc.nameRu}</p>
                <p className="text-white/40 text-xs mb-2">{loc.nameEn}</p>
                <div className="flex flex-wrap gap-1">
                  {loc.roles.map((r, j) => (
                    <span key={j} className="bg-purple-900/30 border border-purple-500/20 text-purple-300 text-[10px] px-2 py-0.5 rounded-lg">
                      {r}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// GAMES TAB
// ═══════════════════════════════════════════════════════════════════════════════

interface GameStat {
  id: string;
  titleRu: string;
  icon: string;
  description: string;
  count: number;
  unit: string;
  breakdown: Record<string, unknown> | null;
}

interface HundredToOneTopicPreview {
  id: string;
  name: string;
  icon: string;
  rounds: { q: string; answers: { t: string; p: number }[] }[];
  bigQ: { q: string; answers: { t: string; p: number }[] }[];
}

interface GameDataResponse {
  type?: string;
  items?: unknown[];
  topics?: HundredToOneTopicPreview[];
  roles?: { id: string; icon: string; nameRu: string; nameEn: string; team: string; condition: string; description: string }[];
  roleTable?: { players: number; mafia: number; don: number; maniac: number; sheriff: number; doctor: number; lover: number; citizens: number }[];
}

function GameDataViewer({ game }: { game: GameStat | null }) {
  const [data, setData] = useState<GameDataResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<string>('all');
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [replacing, setReplacing] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!game) return;
    queueMicrotask(() => {
      setLoading(true);
      setData(null);
      setFilter('all');
    });
    fetch(`/api/admin/game-data?game=${game.id}`)
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); });
  }, [game, refreshKey]);

  useEffect(() => {
    if (!activeMenu) return;
    const close = () => setActiveMenu(null);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, [activeMenu]);

  async function handleDelete(itemId: string, item: unknown) {
    setActiveMenu(null);
    await fetch('/api/admin/game-item', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', game: game!.id, item }),
    });
    setRefreshKey((k) => k + 1);
  }

  async function handleReplace(itemId: string, item: unknown) {
    setActiveMenu(null);
    setReplacing(itemId);
    await fetch('/api/admin/game-item', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'replace', game: game!.id, item }),
    });
    setReplacing(null);
    setRefreshKey((k) => k + 1);
  }

  function EditMenu({ itemId, item, canReplace }: { itemId: string; item: unknown; canReplace: boolean }) {
    const isMenuOpen = activeMenu === itemId;
    const isReplacing = replacing === itemId;

    return (
      <div className="relative flex-shrink-0">
        <button
          onClick={(e) => { e.stopPropagation(); setActiveMenu(isMenuOpen ? null : itemId); }}
          className="opacity-0 group-hover:opacity-100 transition-opacity text-white/40 hover:text-white text-xs px-1.5 py-0.5 rounded hover:bg-white/10"
        >
          ✏️
        </button>
        {isMenuOpen && (
          <div className="absolute right-0 top-full mt-1 z-10 bg-[#1a1a2e] border border-white/20 rounded-xl shadow-xl overflow-hidden min-w-[120px]">
            {canReplace && (
              <button
                onClick={() => handleReplace(itemId, item)}
                disabled={isReplacing}
                className="w-full text-left px-3 py-2 text-xs text-white/70 hover:bg-white/10 hover:text-white transition-colors flex items-center gap-2"
              >
                🔄 Заменить
              </button>
            )}
            <button
              onClick={() => handleDelete(itemId, item)}
              className="w-full text-left px-3 py-2 text-xs text-red-400 hover:bg-red-900/30 hover:text-red-300 transition-colors flex items-center gap-2"
            >
              🗑 Удалить
            </button>
          </div>
        )}
      </div>
    );
  }

  if (!game) {
    return (
      <div className="h-full flex items-center justify-center text-center px-8">
        <div>
          <p className="text-4xl mb-3 opacity-30">👈</p>
          <p className="text-white/30 text-sm">Выбери игру слева<br />чтобы посмотреть данные</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-xl">{game.icon}</span>
          <h3 className="text-sm font-bold text-white/70 uppercase tracking-widest">{game.titleRu}</h3>
        </div>
        {!loading && data && <span className="text-xs text-white/30">{game.count} {game.unit}</span>}
      </div>

      {loading && <p className="text-white/30 text-sm">Загрузка...</p>}

      {/* ── Words (bilingual) ── */}
      {!loading && data?.type === 'words-bilingual' && (
        <div className="flex-1 overflow-y-auto">
          <div className="flex flex-wrap gap-2">
            {(data.items ?? []).map((item, i: number) => {
              const w = item as { ru: string; en: string };
              const itemId = w.ru;
              const isReplacing = replacing === itemId;
              return (
                <div key={i} className={`relative group bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs flex items-center gap-1 transition-opacity ${isReplacing ? 'opacity-40' : ''}`}>
                  {isReplacing && <span className="animate-spin text-[10px]">⟳</span>}
                  <span className="text-white">{w.ru}</span>
                  <span className="text-white/30">/ {w.en}</span>
                  <EditMenu itemId={itemId} item={w} canReplace={true} />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Words (simple, Russian only) ── */}
      {!loading && data?.type === 'words-simple' && (
        <div className="flex-1 overflow-y-auto">
          <div className="flex flex-wrap gap-2">
            {(data.items ?? []).map((item, i: number) => {
              const w = String(item);
              const isReplacing = replacing === w;
              return (
                <div key={i} className={`relative group bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs flex items-center gap-1 transition-opacity ${isReplacing ? 'opacity-40' : ''}`}>
                  {isReplacing && <span className="animate-spin text-[10px]">⟳</span>}
                  <span className="text-white">{w}</span>
                  <EditMenu itemId={w} item={w} canReplace={true} />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── 100 to 1 (topics) ── */}
      {!loading && data?.type === 'hundred-to-one-topics' && (() => {
        const ROUND_NAMES = ['ПРОСТАЯ ИГРА', 'ДВОЙНАЯ ИГРА', 'ТРОЙНАЯ ИГРА', 'ИГРА НАОБОРОТ'];
        const topics = data.topics ?? [];
        const activeTopic = topics.find((t) => t.id === filter) ?? topics[0];

        function QuestionCard({ q, label, labelColor }: { q: { q: string; answers: { t: string; p: number }[] }; label: string; labelColor: string }) {
          const maxPts = Math.max(...q.answers.map((a) => a.p));
          return (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
              <p className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${labelColor}`}>{label}</p>
              <p className="text-white font-bold text-sm mb-3">{q.q}</p>
              <div className="space-y-1.5">
                {q.answers.map((a, j) => (
                  <div key={j} className="flex items-center gap-3 text-xs">
                    <span className="w-8 text-right font-bold text-amber-400 flex-shrink-0">{a.p}</span>
                    <div className="flex-1 bg-white/5 rounded-lg px-3 py-1.5 relative overflow-hidden">
                      <div
                        className="absolute inset-0 bg-amber-500/10 rounded-lg"
                        style={{ width: `${(a.p / maxPts) * 100}%` }}
                      />
                      <span className="relative text-white">{a.t}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        }

        return (
          <div className="flex flex-col h-full">
            {/* Topic tabs */}
            <div className="flex gap-2 mb-4 flex-shrink-0">
              {topics.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setFilter(t.id)}
                  className={`text-xs px-3 py-1.5 rounded-xl border transition-all font-bold ${
                    activeTopic.id === t.id
                      ? 'bg-amber-600/40 border-amber-400/60 text-white'
                      : 'bg-white/5 border-white/10 text-white/50 hover:border-white/30'
                  }`}
                >
                  {t.icon} {t.name}
                </button>
              ))}
            </div>

            {/* Questions */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              {/* Round questions */}
              <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Раунды ({activeTopic.rounds.length})</p>
              {activeTopic.rounds.map((q, i) => (
                <QuestionCard key={i} q={q} label={ROUND_NAMES[i] ?? `Раунд ${i + 1}`} labelColor="text-amber-400/70" />
              ))}

              {/* Big game questions */}
              <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest mt-2">Большая игра ({activeTopic.bigQ.length})</p>
              {activeTopic.bigQ.map((q, i) => (
                <QuestionCard key={i} q={q} label={`Большая игра #${i + 1}`} labelColor="text-purple-400/70" />
              ))}
            </div>
          </div>
        );
      })()}

      {/* ── Mafia ── */}
      {!loading && data?.type === 'mafia' && (
        <div className="flex-1 overflow-y-auto space-y-5">
          {/* Roles */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(data.roles ?? []).map((r) => (
              <div key={r.id} className={`rounded-2xl p-5 border ${
                r.team === 'mafia'
                  ? 'bg-red-900/20 border-red-500/30'
                  : r.team === 'neutral'
                    ? 'bg-purple-900/20 border-purple-500/30'
                    : 'bg-blue-900/20 border-blue-500/30'
              }`}>
                <div className="flex items-start gap-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/icons/mafia-roles/${r.id}.png`}
                    alt={`${r.nameRu} ${r.icon}`}
                    className="w-16 h-16 object-contain shrink-0"
                  />
                  <div className="min-w-0">
                    <p className="text-white font-bold text-sm">{r.nameRu}</p>
                    <p className="text-white/40 text-xs">{r.nameEn}</p>
                    <p className="text-xs text-white/50 mt-2">{r.condition}</p>
                    <p className="text-xs text-white/60 mt-2 leading-relaxed">{r.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Role distribution table */}
          <div>
            <p className="text-xs font-bold text-white/40 uppercase tracking-widest mb-2">Распределение ролей</p>
            <div className="bg-white/5 border border-white/10 rounded-2xl overflow-x-auto">
              <table className="w-full min-w-[680px] text-xs">
                <thead>
                  <tr className="border-b border-white/10 text-white/30">
                    <th className="text-left px-4 py-2">Игроков</th>
                    <th className="text-center px-3 py-2 text-red-400/70">Мафия</th>
                    <th className="text-center px-3 py-2 text-red-300/70">Дон</th>
                    <th className="text-center px-3 py-2 text-purple-400/70">Маньяк</th>
                    <th className="text-center px-3 py-2 text-blue-400/70">Шериф</th>
                    <th className="text-center px-3 py-2 text-green-400/70">Доктор</th>
                    <th className="text-center px-3 py-2 text-pink-400/70">Любовница</th>
                    <th className="text-center px-3 py-2 text-white/50">Мирных</th>
                  </tr>
                </thead>
                <tbody>
                  {(data.roleTable ?? []).map((row, i: number) => (
                    <tr key={i} className={i < (data.roleTable ?? []).length - 1 ? 'border-b border-white/5' : ''}>
                      <td className="px-4 py-2 text-white font-bold">{row.players}</td>
                      <td className="px-3 py-2 text-center text-red-400 font-bold">{row.mafia}</td>
                      <td className="px-3 py-2 text-center">{row.don ? <span className="text-red-300 font-bold">{row.don}</span> : <span className="text-white/20">—</span>}</td>
                      <td className="px-3 py-2 text-center">{row.maniac ? <span className="text-purple-400 font-bold">{row.maniac}</span> : <span className="text-white/20">—</span>}</td>
                      <td className="px-3 py-2 text-center">{row.sheriff ? <span className="text-blue-400 font-bold">{row.sheriff}</span> : <span className="text-white/20">—</span>}</td>
                      <td className="px-3 py-2 text-center">{row.doctor ? <span className="text-green-400 font-bold">{row.doctor}</span> : <span className="text-white/20">—</span>}</td>
                      <td className="px-3 py-2 text-center">{row.lover ? <span className="text-pink-400 font-bold">{row.lover}</span> : <span className="text-white/20">—</span>}</td>
                      <td className="px-3 py-2 text-center text-white/60">{row.citizens}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function GamesTab() {
  const [stats, setStats] = useState<GameStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<GameStat | null>(null);

  useEffect(() => {
    fetch('/api/admin/game-stats')
      .then((r) => r.json())
      .then((d) => { setStats(d.stats ?? []); setLoading(false); });
  }, []);

  const hasWordTool = selected?.id === 'alias' || selected?.id === 'crocodile';
  const hasLocTool  = selected?.id === 'spy';
  const hasTool     = hasWordTool || hasLocTool;

  return (
    <div className="flex gap-6 h-[calc(100vh-220px)] min-h-[500px]">

      {/* ── Left: game list ── */}
      <div className="w-72 flex-shrink-0 overflow-y-auto space-y-2 pr-1">
        <h2 className="text-xs font-bold text-white/40 uppercase tracking-widest mb-3">Игры</h2>
        {loading && <p className="text-white/30 text-sm">Загрузка...</p>}
        {stats.map((game) => {
          const isSel = selected?.id === game.id;
          const gameHasTool = game.id === 'alias' || game.id === 'crocodile' || game.id === 'spy';
          return (
            <button
              key={game.id}
              onClick={() => setSelected(game)}
              className={`w-full text-left rounded-2xl px-4 py-3 border transition-all ${
                isSel
                  ? 'bg-purple-600/20 border-purple-400/40'
                  : 'bg-white/5 border-white/10 hover:border-white/20'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{game.icon}</span>
                  <span className={`font-bold text-sm ${isSel ? 'text-purple-200' : 'text-white'}`}>{game.titleRu}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {gameHasTool && (
                    <span className="text-[10px] text-purple-400/60" title="Есть генератор">✨</span>
                  )}
                  <span className={`text-xs font-bold ${isSel ? 'text-purple-300' : 'text-white/50'}`}>
                    {game.count}
                  </span>
                </div>
              </div>
              <p className="text-[11px] text-white/30 pl-8">{game.unit} · {game.description}</p>

              {/* Breakdown badges */}
              {game.id === 'hundred-to-one' && game.breakdown && (
                <div className="flex flex-col gap-1 mt-2 pl-8">
                  {Object.values(game.breakdown).map((v, i) => (
                    <span key={i} className="text-[10px] text-amber-300/60">{v as string}</span>
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Right: data viewer + optional tool ── */}
      <div className="flex-1 flex flex-col gap-4 overflow-hidden min-h-0">

        {/* Data panel — shrinks when tool is present */}
        <div className={`${hasTool ? 'flex-[3]' : 'flex-1'} bg-white/5 border border-white/10 rounded-2xl p-5 overflow-hidden min-h-0`}>
          <GameDataViewer game={selected} />
        </div>

        {/* Tool panel — shown only for alias/crocodile/spy */}
        {hasTool && (
          <div className="flex-[2] bg-white/5 border border-purple-500/20 rounded-2xl p-5 overflow-y-auto flex-shrink-0 min-h-0">
            {hasWordTool && (
              <WordGeneratorPanel defaultGame={selected!.id as 'alias' | 'crocodile'} />
            )}
            {hasLocTool && <LocationGeneratorPanel />}
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════════

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>('backgrounds');

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'backgrounds', label: 'Фоны',    icon: '🖼️' },
    { id: 'quizzes',     label: 'Квизы',   icon: '📊' },
    { id: 'games',       label: 'Игры',    icon: '🎲' },
    { id: 'rooms',       label: 'Комнаты', icon: '🎮' },
  ];

  return (
    <div className="min-h-screen bg-[#0f0f1a] text-white font-mono p-8">
      <h1 className="text-3xl font-bold mb-1 text-purple-400">⚙️ Admin Dashboard</h1>
      <p className="text-white/40 text-sm mb-8">Party Games Hub — внутренние инструменты</p>

      {/* Tab bar */}
      <div className="flex gap-2 mb-8 border-b border-white/10 pb-0">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-5 py-2.5 text-sm font-bold rounded-t-xl transition-all -mb-px border-b-2 ${
              tab === t.id
                ? 'text-white border-purple-400 bg-white/5'
                : 'text-white/40 border-transparent hover:text-white/70'
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className={tab === 'quizzes' || tab === 'games' ? 'w-full' : 'max-w-3xl'}>
        {tab === 'backgrounds' && <BackgroundsTab />}
        {tab === 'quizzes'     && <QuizzesTab />}
        {tab === 'games'       && <GamesTab />}
        {tab === 'rooms'       && <RoomsTab />}
      </div>
    </div>
  );
}
