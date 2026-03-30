import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ChevronRight } from 'lucide-react';

const STEPS = [
  {
    title: 'Brain Backup',
    body:
      'A gentle ADHD partner: capture what’s in your head before you forget it. Tasks, reminders, and brain dumps live in one place so your working memory gets a break.',
  },
  {
    title: 'Tasks & energy',
    body:
      'Pick how much gas you have: Brain Dead, Functional, or Superhero. Tasks match your filter so you only see what fits right now.',
  },
  {
    title: 'Brain dump + AI',
    body:
      'Spew thoughts in Brain Dump. When you’re ready, tap Organise with AI to turn the mess into bullets. Add some as tasks, keep the rest, or email yourself a copy.',
  },
  {
    title: 'Essentials',
    body:
      'Repeating needs (water, stretch…) nudge you on a timer. Pick an alarm vibe, optional desktop notifications, and you’re covered between tasks.',
  },
  {
    title: 'Launchpads',
    body:
      'Checklists for leaving the house or desk—tick items so you don’t double back for keys, water, or “did I turn the stove off?”',
  },
  {
    title: 'History & Brain Points',
    body:
      'History is your end-of-day review. Completing tasks and essentials earns Brain Points—tiny wins, reset anytime. No guilt, just momentum.',
  },
  {
    title: 'You’re ready',
    body: 'Use Brain Backup whenever your brain feels loud. Finish the tour with Done. Replay anytime from the ? button in the header.',
  },
] as const;

interface AppTourProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export function AppTour({ isOpen, onClose, onComplete }: AppTourProps) {
  const [index, setIndex] = useState(0);

  const step = STEPS[index];
  const isLast = index === STEPS.length - 1;

  React.useEffect(() => {
    if (isOpen) setIndex(0);
  }, [isOpen]);

  const handleNext = () => {
    if (isLast) {
      onComplete();
      onClose();
      return;
    }
    setIndex((i) => i + 1);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
          aria-labelledby="tour-title"
        >
          <motion.div
            initial={{ scale: 0.95, y: 10 }}
            animate={{ scale: 1, y: 0 }}
            className="relative w-full max-w-md rounded-3xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl"
          >
            <button
              type="button"
              onClick={() => {
                onComplete();
                onClose();
              }}
              className="absolute right-4 top-4 rounded-full p-2 text-zinc-500 hover:bg-zinc-800 hover:text-white"
              aria-label="Close tutorial"
            >
              <X className="h-5 w-5" />
            </button>

            <p className="mb-2 text-xs font-black uppercase tracking-widest text-indigo-400">
              Quick tour · {index + 1} / {STEPS.length}
            </p>
            <h3 id="tour-title" className="mb-3 text-xl font-black uppercase tracking-tight text-white">
              {step.title}
            </h3>
            <p className="mb-6 whitespace-pre-line text-sm leading-relaxed text-zinc-400">{step.body}</p>

            <div className="flex items-center justify-between gap-3">
              <div className="flex gap-1">
                {STEPS.map((_, i) => (
                  <span
                    key={i}
                    className={`h-1.5 w-1.5 rounded-full ${i === index ? 'bg-indigo-500' : 'bg-zinc-700'}`}
                  />
                ))}
              </div>
              <button
                type="button"
                onClick={handleNext}
                className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-black uppercase tracking-wider text-white hover:bg-indigo-500"
              >
                {isLast ? 'Done' : 'Next'}
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
