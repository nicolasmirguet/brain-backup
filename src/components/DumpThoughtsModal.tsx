import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, MessageSquare, Sparkles, Plus, Mail, BookOpen, Loader2, ChevronRight, Check, Save } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { Task, TaskCategory, EnergyLevel } from '../types';
import { callLlm } from '@/lib/callLlm';

interface DumpThoughtsModalProps {
  isOpen: boolean;
  onClose: () => void;
  thoughts: string;
  onChange: (thoughts: string) => void;
  onCreateTasks?: (tasks: Task[]) => void;
  /** Last used email for brain-dump copies (persisted in Firestore by parent). */
  savedEmail?: string;
  onPersistEmail?: (email: string) => void;
}

type ModalStage = 'dump' | 'processing' | 'results';

interface ParsedItem {
  id: string;
  text: string;
  isTask: boolean;
  selected: boolean;
}

export function DumpThoughtsModal({
  isOpen,
  onClose,
  thoughts,
  onChange,
  onCreateTasks,
  savedEmail = '',
  onPersistEmail,
}: DumpThoughtsModalProps) {
  const [localThoughts, setLocalThoughts] = useState(thoughts);
  const [stage, setStage] = useState<ModalStage>('dump');
  const [savedConfirm, setSavedConfirm] = useState(false);
  const [polishedSummary, setPolishedSummary] = useState('');
  const [parsedItems, setParsedItems] = useState<ParsedItem[]>([]);
  const [emailAddress, setEmailAddress] = useState('');
  const [showEmailInput, setShowEmailInput] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [emailCopied, setEmailCopied] = useState(false);
  const [tasksSaved, setTasksSaved] = useState(false);
  const [keptLocally, setKeptLocally] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setLocalThoughts(thoughts);
      setStage('dump');
      setSavedConfirm(false);
      setPolishedSummary('');
      setParsedItems([]);
      setEmailAddress(savedEmail || '');
      setShowEmailInput(false);
      setEmailSent(false);
      setEmailError('');
      setEmailCopied(false);
      setTasksSaved(false);
      setKeptLocally(false);
      setError('');
    }
  }, [isOpen, savedEmail]);

  // Save just persists text and closes — no AI
  const handleSave = () => {
    onChange(localThoughts);
    setSavedConfirm(true);
    setTimeout(() => {
      setSavedConfirm(false);
      onClose();
    }, 800);
  };

  // AI button: process the full saved dump
  const handleAI = async () => {
    if (!localThoughts.trim()) return;
    // Save first so nothing is lost
    onChange(localThoughts);
    setStage('processing');
    setError('');

    try {
      const system = `You are a compassionate ADHD brain organiser. Take raw, unfiltered brain dumps and turn them into clear, actionable insights.

Respond with ONLY valid JSON (no markdown, no backticks, no preamble) in this exact shape:
{
  "summary": "A warm, encouraging 2-3 sentence summary of what is on their mind. Plain language. Supportive, not clinical.",
  "items": [
    { "text": "Clear, specific item (max 10 words)", "isTask": true }
  ]
}

Rules:
- Extract every distinct thought, to-do, worry, idea, or reminder
- isTask = true if it is something actionable
- isTask = false if it is a thought, feeling, or observation
- Rephrase vague items into clear, specific ones
- Max 10 words per item
- Return 3 to 15 items`;

      const raw = await callLlm(system, `Here is my brain dump:\n\n${localThoughts}`);

      let parsed;
      try {
        parsed = JSON.parse(raw);
      } catch {
        const match = raw.match(/\{[\s\S]*\}/);
        if (!match) throw new Error('Could not parse AI response');
        parsed = JSON.parse(match[0]);
      }

      setPolishedSummary(parsed.summary || '');
      setParsedItems(
        (parsed.items || []).map((item: { text: string; isTask: boolean }) => ({
          id: uuidv4(),
          text: item.text,
          isTask: item.isTask,
          selected: item.isTask,
        }))
      );
      setStage('results');
    } catch (err) {
      setError('AI is having a moment. Try again?');
      setStage('dump');
    }
  };

  const toggleItem = (id: string) => {
    setParsedItems(items =>
      items.map(item => (item.id === id ? { ...item, selected: !item.selected } : item))
    );
  };

  const handleCreateTasks = () => {
    const selectedItems = parsedItems.filter(i => i.selected && i.isTask);
    if (selectedItems.length === 0) return;
    const newTasks: Task[] = selectedItems.map(item => ({
      id: uuidv4(),
      title: item.text,
      category: 'urgent' as TaskCategory,
      cycle: 'none' as const,
      energyLevel: 'functional' as EnergyLevel,
      durationMinutes: 30,
      status: 'pending' as const,
      createdAt: Date.now(),
    }));
    onCreateTasks?.(newTasks);
    setTasksSaved(true);
  };

  const handleKeepHere = () => {
    const allText = parsedItems.map(i => `• ${i.text}`).join('\n');
    onChange(polishedSummary + '\n\n' + allText);
    setKeptLocally(true);
  };

  const buildEmailPayload = () => {
    const trimmed = emailAddress.trim();
    const subjectText = 'Brain Backup - Thought Dump';
    const bodyText = `Summary:\n${polishedSummary}\n\nItems:\n${parsedItems.map(i => `• ${i.text}`).join('\n')}\n\n---\nOriginal dump:\n${localThoughts}`;
    return { trimmed, subjectText, bodyText };
  };

  const handleSendEmail = () => {
    const { trimmed, subjectText, bodyText } = buildEmailPayload();
    if (!trimmed) return;
    setEmailError('');
    const subject = encodeURIComponent(subjectText);
    const body = encodeURIComponent(bodyText);
    const mailtoHref = `mailto:${trimmed}?subject=${subject}&body=${body}`;
    // If no default mail app is configured, browser may still open a blank tab.
    // We keep this option for users who do have a desktop mail client.
    window.location.href = mailtoHref;
    setEmailSent(true);
    onPersistEmail?.(trimmed);
    setShowEmailInput(false);
  };

  const handleSendGmail = () => {
    const { trimmed, subjectText, bodyText } = buildEmailPayload();
    if (!trimmed) return;
    setEmailError('');
    const gmailHref = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(trimmed)}&su=${encodeURIComponent(subjectText)}&body=${encodeURIComponent(bodyText)}`;
    try {
      window.open(gmailHref, '_blank', 'noopener,noreferrer');
      setEmailSent(true);
      onPersistEmail?.(trimmed);
      setShowEmailInput(false);
    } catch {
      setEmailError('Could not open Gmail compose. Use copy option below.');
    }
  };

  const handleCopyEmailText = async () => {
    const { subjectText, bodyText } = buildEmailPayload();
    try {
      await navigator.clipboard.writeText(`Subject: ${subjectText}\n\n${bodyText}`);
      setEmailCopied(true);
      setTimeout(() => setEmailCopied(false), 1800);
    } catch {
      setEmailError('Copy failed. You can still use Gmail compose.');
    }
  };

  const isDirty = localThoughts !== thoughts;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col"
            style={{ maxHeight: '90vh' }}
          >
            {/* Header */}
            <div className="flex justify-between items-center p-6 border-b border-zinc-800/60 flex-shrink-0">
              <h2 className="text-xl font-black uppercase tracking-tight text-white flex items-center gap-2">
                <div className="bg-indigo-600/20 p-1.5 rounded-lg">
                  <MessageSquare className="w-5 h-5 text-indigo-400" />
                </div>
                {stage === 'dump' ? 'Brain Dump' : stage === 'processing' ? 'Organising…' : 'Your Thoughts, Sorted'}
              </h2>
              <button
                onClick={() => { onChange(localThoughts); onClose(); }}
                className="p-2 hover:bg-zinc-800 rounded-full text-zinc-400 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              <AnimatePresence mode="wait">

                {/* ── DUMP STAGE ── */}
                {stage === 'dump' && (
                  <motion.div
                    key="dump"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="p-6 space-y-4"
                  >
                    <p className="text-sm text-zinc-400 leading-relaxed">
                      Dump everything here throughout your day. Tap <span className="text-white font-bold">Save</span> to keep adding later. When you're ready to process it all, hit <span className="text-indigo-400 font-bold">Organise with AI</span>.
                    </p>

                    <div className="relative">
                      <textarea
                        value={localThoughts}
                        onChange={(e) => setLocalThoughts(e.target.value)}
                        placeholder={"- Need to call mum back\n- Buy groceries (milk, bread, that sauce)\n- That idea about reorganising the garage...\n- Worried about the dentist appointment\n- Email Mark about Friday\n- My brain feels like soup today"}
                        className="w-full bg-zinc-900 border border-zinc-700/60 rounded-2xl p-5 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/60 resize-none text-base leading-relaxed transition-all"
                        style={{ height: '340px' }}
                        autoFocus
                      />
                      <div className="absolute bottom-3 right-4 text-zinc-600 text-xs font-mono">
                        {localThoughts.length} chars
                      </div>
                    </div>

                    {error && (
                      <p className="text-red-400 text-sm font-bold text-center">{error}</p>
                    )}

                    {/* Two separate buttons */}
                    <div className="flex gap-3">
                      {/* Save — plain, always available */}
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleSave}
                        className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl font-black uppercase tracking-widest text-sm border transition-all ${
                          savedConfirm
                            ? 'bg-green-600/20 border-green-500/30 text-green-400'
                            : isDirty
                            ? 'bg-zinc-800 border-zinc-600 text-white hover:bg-zinc-700'
                            : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:bg-zinc-800'
                        }`}
                      >
                        {savedConfirm ? (
                          <><Check className="w-4 h-4" /> Saved!</>
                        ) : (
                          <><Save className="w-4 h-4" /> Save</>
                        )}
                      </motion.button>

                      {/* Organise with AI — highlighted, needs content */}
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleAI}
                        disabled={!localThoughts.trim()}
                        className="flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl font-black uppercase tracking-widest text-sm bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-all shadow-[0_0_20px_rgba(79,70,229,0.3)]"
                      >
                        <Sparkles className="w-4 h-4" /> Organise with AI
                      </motion.button>
                    </div>

                    {thoughts.trim() && (
                      <p className="text-center text-zinc-600 text-xs">
                        {thoughts.length} chars already saved · keep adding or hit AI when ready
                      </p>
                    )}
                  </motion.div>
                )}

                {/* ── PROCESSING STAGE ── */}
                {stage === 'processing' && (
                  <motion.div
                    key="processing"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="p-12 flex flex-col items-center justify-center gap-6"
                    style={{ minHeight: '300px' }}
                  >
                    <div className="relative">
                      <div className="w-16 h-16 rounded-full border-2 border-indigo-500/30 flex items-center justify-center">
                        <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
                      </div>
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-indigo-500 rounded-full animate-pulse" />
                    </div>
                    <div className="text-center space-y-2">
                      <p className="text-white font-black uppercase tracking-widest">Reading your mind…</p>
                      <p className="text-zinc-500 text-sm">Turning your whole day's dump into bullet points</p>
                    </div>
                  </motion.div>
                )}

                {/* ── RESULTS STAGE ── */}
                {stage === 'results' && (
                  <motion.div
                    key="results"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="p-6 space-y-6"
                  >
                    {/* AI Summary */}
                    <div className="bg-indigo-950/40 border border-indigo-500/20 rounded-2xl p-4">
                      <div className="flex items-center gap-2 text-indigo-400 font-black uppercase tracking-widest text-xs mb-2">
                        <Sparkles className="w-3.5 h-3.5" /> AI Summary
                      </div>
                      <p className="text-zinc-200 text-sm leading-relaxed">{polishedSummary}</p>
                    </div>

                    {/* Items list */}
                    <div className="space-y-2">
                      <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">
                        Tap tasks to select · thoughts are read-only
                      </p>
                      <div className="space-y-2">
                        {parsedItems.map((item) => (
                          <motion.button
                            key={item.id}
                            onClick={() => item.isTask && toggleItem(item.id)}
                            whileHover={item.isTask ? { x: 2 } : {}}
                            className={`w-full flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all ${
                              item.isTask
                                ? item.selected
                                  ? 'bg-indigo-600/20 border-indigo-500/50 cursor-pointer'
                                  : 'bg-zinc-900 border-zinc-700/50 cursor-pointer hover:border-zinc-600'
                                : 'bg-zinc-900/50 border-zinc-800 cursor-default opacity-60'
                            }`}
                          >
                            <div className={`flex-shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                              item.isTask
                                ? item.selected ? 'bg-indigo-500 border-indigo-500' : 'border-zinc-600'
                                : 'border-zinc-700 opacity-50'
                            }`}>
                              {item.selected && item.isTask && <Check className="w-3 h-3 text-white" />}
                            </div>
                            <span className={`text-sm flex-1 ${item.isTask ? 'text-white' : 'text-zinc-400'}`}>
                              {item.text}
                            </span>
                            <span className={`text-xs font-bold uppercase tracking-wider ${item.isTask ? 'text-indigo-400/70' : 'text-zinc-600'}`}>
                              {item.isTask ? 'task' : 'thought'}
                            </span>
                          </motion.button>
                        ))}
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="space-y-3 pt-2">
                      <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">What do you want to do?</p>

                      <motion.button
                        whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
                        onClick={handleCreateTasks}
                        disabled={tasksSaved || parsedItems.filter(i => i.selected && i.isTask).length === 0}
                        className={`w-full flex items-center gap-3 py-4 px-5 rounded-2xl font-black uppercase tracking-wider text-sm transition-all ${
                          tasksSaved
                            ? 'bg-green-600/20 border border-green-500/30 text-green-400 cursor-default'
                            : 'bg-white text-black hover:bg-zinc-100 shadow-[0_0_20px_rgba(255,255,255,0.1)] disabled:opacity-40 disabled:cursor-not-allowed'
                        }`}
                      >
                        {tasksSaved ? (
                          <><Check className="w-5 h-5" /> Tasks Added!</>
                        ) : (
                          <>
                            <Plus className="w-5 h-5" />
                            Add {parsedItems.filter(i => i.selected && i.isTask).length} Selected as Tasks
                            <ChevronRight className="w-4 h-4 ml-auto opacity-50" />
                          </>
                        )}
                      </motion.button>

                      <motion.button
                        whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
                        onClick={handleKeepHere}
                        disabled={keptLocally}
                        className={`w-full flex items-center gap-3 py-4 px-5 rounded-2xl font-black uppercase tracking-wider text-sm border transition-all ${
                          keptLocally
                            ? 'bg-purple-600/20 border-purple-500/30 text-purple-400 cursor-default'
                            : 'bg-zinc-900 border-zinc-700 text-white hover:bg-zinc-800 hover:border-zinc-600'
                        }`}
                      >
                        {keptLocally ? (
                          <><Check className="w-5 h-5" /> Saved Here</>
                        ) : (
                          <>
                            <BookOpen className="w-5 h-5" />
                            Keep in Brain Dump
                            <ChevronRight className="w-4 h-4 ml-auto opacity-50" />
                          </>
                        )}
                      </motion.button>

                      <AnimatePresence>
                        {!showEmailInput && !emailSent && (
                          <motion.button
                            initial={{ opacity: 1 }} exit={{ opacity: 0 }}
                            whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
                            onClick={() => setShowEmailInput(true)}
                            className="w-full flex items-center gap-3 py-4 px-5 rounded-2xl font-black uppercase tracking-wider text-sm bg-zinc-900 border border-zinc-700 text-white hover:bg-zinc-800 hover:border-zinc-600 transition-all"
                          >
                            <Mail className="w-5 h-5" />
                            Send to Email
                            <ChevronRight className="w-4 h-4 ml-auto opacity-50" />
                          </motion.button>
                        )}
                        {showEmailInput && (
                          <motion.div
                            initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }}
                            className="space-y-2"
                          >
                            <input
                              type="email"
                              value={emailAddress}
                              onChange={(e) => setEmailAddress(e.target.value)}
                              placeholder="your@email.com"
                              autoFocus
                              className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-4 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                              onKeyDown={(e) => e.key === 'Enter' && handleSendEmail()}
                            />
                            <div className="flex gap-2">
                              <button onClick={() => setShowEmailInput(false)} className="flex-1 py-3 rounded-xl bg-zinc-800 text-zinc-400 font-black uppercase text-sm hover:bg-zinc-700 transition-colors">Cancel</button>
                              <button onClick={handleSendEmail} disabled={!emailAddress.trim()} className="flex-1 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-black uppercase text-sm flex items-center justify-center gap-2 transition-colors">
                                <Mail className="w-4 h-4" /> Mail App
                              </button>
                            </div>
                            <div className="flex gap-2">
                              <button onClick={handleSendGmail} disabled={!emailAddress.trim()} className="flex-1 py-3 rounded-xl bg-zinc-900 border border-zinc-700 hover:bg-zinc-800 disabled:opacity-40 text-white font-black uppercase text-sm transition-colors">
                                Open Gmail
                              </button>
                              <button onClick={handleCopyEmailText} className="flex-1 py-3 rounded-xl bg-zinc-900 border border-zinc-700 hover:bg-zinc-800 text-white font-black uppercase text-sm transition-colors">
                                {emailCopied ? 'Copied' : 'Copy Text'}
                              </button>
                            </div>
                            {emailError && <p className="text-red-400 text-xs font-bold">{emailError}</p>}
                          </motion.div>
                        )}
                        {emailSent && (
                          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full flex items-center gap-3 py-4 px-5 rounded-2xl bg-blue-600/20 border border-blue-500/30 text-blue-400 font-black uppercase tracking-wider text-sm">
                            <Check className="w-5 h-5" /> Open your email app — tap Send there
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    <div className="flex gap-3 pt-2">
                      <button
                        onClick={() => setStage('dump')}
                        className="flex-1 py-3 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-500 hover:text-zinc-300 hover:border-zinc-700 font-bold uppercase tracking-widest text-sm transition-colors"
                      >
                        ← Back to Dump
                      </button>
                      <button
                        onClick={onClose}
                        className="flex-1 py-3 rounded-xl text-zinc-500 hover:text-zinc-300 font-bold uppercase tracking-widest text-sm transition-colors"
                      >
                        Done
                      </button>
                    </div>
                  </motion.div>
                )}

              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
