import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Sparkles, Loader2, Check } from 'lucide-react';
import { Checklist, ChecklistItem } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { callLlm } from '@/lib/callLlm';

const COUNTS = [5, 10, 15, 20] as const;

interface ChecklistItemSuggestModalProps {
  isOpen: boolean;
  checklist: Checklist | null;
  onClose: () => void;
  /** Replace checklist with merged items */
  onApply: (updated: Checklist) => void;
}

export function ChecklistItemSuggestModal({
  isOpen,
  checklist,
  onClose,
  onApply,
}: ChecklistItemSuggestModalProps) {
  const [context, setContext] = useState('');
  const [count, setCount] = useState<(typeof COUNTS)[number]>(5);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState<'form' | 'pick'>('form');
  const [suggestions, setSuggestions] = useState<{ text: string; selected: boolean }[]>([]);

  useEffect(() => {
    if (isOpen) {
      setContext('');
      setCount(5);
      setLoading(false);
      setError('');
      setStep('form');
      setSuggestions([]);
    }
  }, [isOpen, checklist?.id]);

  if (!isOpen || !checklist) return null;

  const handleGenerate = async () => {
    if (!context.trim()) {
      setError('Describe what this list is for and your aim.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const system = `You suggest checklist items. Reply with ONLY valid JSON (no markdown): {"items":["..."]}. Each item: short, concrete, max 8 words. No numbering.`;
      const existing = checklist.items.map((i) => i.text).join('; ') || '(none)';
      const prompt = `Launchpad title: "${checklist.title}"
Existing items: ${existing}

User context — what this list is for and the aim:
${context.trim()}

Return exactly ${count} NEW items not duplicating existing. Helpful for ADHD / routine / leaving the house.`;
      const raw = await callLlm(system, prompt);
      let parsed: { items?: string[] };
      try {
        parsed = JSON.parse(raw);
      } catch {
        const m = raw.match(/\{[\s\S]*\}/);
        if (!m) throw new Error('parse');
        parsed = JSON.parse(m[0]);
      }
      const items = (parsed.items ?? [])
        .filter((t): t is string => typeof t === 'string' && !!t.trim())
        .map((t) => t.trim())
        .slice(0, count);
      if (items.length === 0) throw new Error('empty');
      setSuggestions(items.map((text) => ({ text, selected: true })));
      setStep('pick');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      // Surface actionable errors (auth / rate-limit / provider errors), otherwise keep a friendly fallback.
      if (
        /auth|token|sign in|unauthorized|rate limit|429|model|overloaded|timeout|API key|configured/i.test(msg)
      ) {
        setError(msg);
      } else {
        setError('AI could not suggest items. Try again or shorten your context.');
      }
    } finally {
      setLoading(false);
    }
  };

  const toggle = (idx: number) => {
    setSuggestions((prev) =>
      prev.map((s, i) => (i === idx ? { ...s, selected: !s.selected } : s)),
    );
  };

  const handleAddSelected = () => {
    const picked = suggestions.filter((s) => s.selected);
    if (picked.length === 0) return;
    const newItems: ChecklistItem[] = picked.map((s) => ({
      id: uuidv4(),
      text: s.text,
      isChecked: false,
    }));
    onApply({ ...checklist, items: [...checklist.items, ...newItems] });
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          className="relative w-full max-w-lg rounded-3xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl max-h-[90vh] overflow-y-auto"
        >
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 rounded-full p-2 text-zinc-500 hover:bg-zinc-800 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>

          <h3 className="mb-1 text-lg font-black uppercase tracking-tight text-white flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-indigo-400" />
            AI item ideas
          </h3>
          <p className="mb-4 text-xs text-zinc-500 font-bold uppercase tracking-wider">{checklist.title}</p>

          {step === 'form' ? (
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-xs font-black uppercase tracking-wider text-zinc-500">
                  What&apos;s this list for? What&apos;s the aim?
                </label>
                <textarea
                  value={context}
                  onChange={(e) => setContext(e.target.value)}
                  placeholder="e.g. Leaving for work — I always forget lunch and headphones..."
                  rows={4}
                  className="w-full resize-none rounded-2xl border border-zinc-700 bg-zinc-900 p-4 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                />
              </div>
              <div>
                <label className="mb-2 block text-xs font-black uppercase tracking-wider text-zinc-500">
                  How many suggestions?
                </label>
                <div className="flex flex-wrap gap-2">
                  {COUNTS.map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setCount(n)}
                      className={`rounded-xl px-4 py-2 text-sm font-black uppercase tracking-wider border ${
                        count === n
                          ? 'border-indigo-500 bg-indigo-600/30 text-indigo-200'
                          : 'border-zinc-700 bg-zinc-900 text-zinc-400 hover:border-zinc-600'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
              {error && <p className="text-sm font-bold text-red-400">{error}</p>}
              <button
                type="button"
                disabled={loading}
                onClick={() => void handleGenerate()}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 py-4 text-sm font-black uppercase tracking-widest text-white hover:bg-indigo-500 disabled:opacity-50"
              >
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />}
                {loading ? 'Thinking…' : 'Get suggestions'}
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs font-bold uppercase tracking-wider text-zinc-500">Tap to include</p>
              <div className="max-h-60 space-y-2 overflow-y-auto">
                {suggestions.map((s, idx) => (
                  <button
                    key={`${s.text}-${idx}`}
                    type="button"
                    onClick={() => toggle(idx)}
                    className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left text-sm transition-colors ${
                      s.selected
                        ? 'border-indigo-500/60 bg-indigo-600/20 text-white'
                        : 'border-zinc-700 bg-zinc-900 text-zinc-400'
                    }`}
                  >
                    <span
                      className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded border-2 ${
                        s.selected ? 'border-indigo-500 bg-indigo-500' : 'border-zinc-600'
                      }`}
                    >
                      {s.selected && <Check className="h-3 w-3 text-white" />}
                    </span>
                    {s.text}
                  </button>
                ))}
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setStep('form')}
                  className="flex-1 rounded-xl border border-zinc-700 py-3 text-sm font-black uppercase tracking-wider text-zinc-400 hover:bg-zinc-800"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleAddSelected}
                  disabled={suggestions.filter((x) => x.selected).length === 0}
                  className="flex-1 rounded-xl bg-white py-3 text-sm font-black uppercase tracking-wider text-black hover:bg-zinc-200 disabled:opacity-40"
                >
                  Add {suggestions.filter((x) => x.selected).length} to list
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
