import React, { useState, useEffect, useLayoutEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ChevronRight, ChevronLeft } from 'lucide-react';

export type TourTab = 'tasks' | 'launchpads' | 'essentials' | 'history';

type TourStep = {
  title: string;
  body: string;
  /** `data-tour` attribute on a real element; omit for centered intro only */
  target?: string;
  tab?: TourTab;
};

const STEPS: TourStep[] = [
  {
    title: 'Welcome',
    body: 'This quick tour points at the real buttons in Brain Backup — an ADHD-friendly place to offload memory before you forget tasks, habits, and worries.',
    tab: 'tasks',
  },
  {
    title: 'Tasks',
    body: 'This tab is your main to-do list. Switch here anytime you want to see what you committed to doing.',
    target: 'tab-tasks',
    tab: 'tasks',
  },
  {
    title: 'Energy level',
    body: 'Pick how much gas you have: Brain Dead, Functional, or Superhero. Only tasks that fit that energy show up — so you are not staring at impossible stuff.',
    target: 'energy-filter',
    tab: 'tasks',
  },
  {
    title: 'Add a task',
    body: 'Tap here to create a task. You can set schedule, repeat, and edit later with the pencil on each card.',
    target: 'add-task',
    tab: 'tasks',
  },
  {
    title: 'Brain Dump',
    body: 'Pour thoughts in anytime. When you are ready, Organise with AI turns the wall of text into bullets — pick what becomes tasks or open an email draft.',
    target: 'brain-dump',
    tab: 'tasks',
  },
  {
    title: 'Brain Points',
    body: 'Tiny wins add up. Complete tasks and essentials to rack up points; the arrow resets the counter if you want a fresh start.',
    target: 'brain-points',
    tab: 'tasks',
  },
  {
    title: 'Essentials',
    body: 'Repeating needs (water, stretch, meds rhythm…) with timers. Open this tab to tune reminders, alarm sound, and optional Spotify link per card.',
    target: 'tab-essentials',
    tab: 'essentials',
  },
  {
    title: 'Essential alarms',
    body: 'Choose how reminders sound, test them, and turn on desktop notifications so you get pinged even when the tab is in the background.',
    target: 'essentials-alarm',
    tab: 'essentials',
  },
  {
    title: 'Launchpads',
    body: 'Checklists for leaving the house or desk — keys, stove, bags. Each list can use AI suggest items after you describe what the list is for.',
    target: 'tab-launchpads',
    tab: 'launchpads',
  },
  {
    title: 'Launchpads lists',
    body: 'Your checklists live here. Use Add List for a new pad, or open an existing card and try AI suggest items to brainstorm what you might need.',
    target: 'launchpads-section',
    tab: 'launchpads',
  },
  {
    title: 'History',
    body: 'End-of-day review and your thought dump archive live here. Same bar always sits at the bottom so you can jump in with one tap.',
    target: 'history-bar',
    tab: 'history',
  },
  {
    title: 'Replay anytime',
    body: 'Tap the ? in the header whenever you want this tour again. You are set — close with Done and start using the app.',
    target: 'tour-help',
    tab: 'tasks',
  },
];

const PAD = 10;

interface AppTourProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  /** Current app tab — used to re-measure spotlight after parent switches tab */
  activeTab: TourTab;
  navigateToTab: (tab: TourTab) => void;
}

export function AppTour({ isOpen, onClose, onComplete, activeTab, navigateToTab }: AppTourProps) {
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<{ top: number; left: number; width: number; height: number } | null>(
    null,
  );

  const step = STEPS[index];
  const isLast = index === STEPS.length - 1;

  useEffect(() => {
    if (isOpen) {
      setIndex(0);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const t = STEPS[index].tab;
    if (t) navigateToTab(t);
  }, [isOpen, index, navigateToTab]);

  const measure = useCallback(() => {
    if (!isOpen) return;
    const target = STEPS[index].target;
    if (!target) {
      setRect(null);
      return;
    }
    const el = document.querySelector<HTMLElement>(`[data-tour="${target}"]`);
    if (!el) {
      setRect(null);
      return;
    }
    // Avoid smooth scrolling here: it can cause us to measure mid-animation and place
    // the tooltip off-screen (looks like a "blackout").
    el.scrollIntoView({ block: 'center', behavior: 'auto' });
    const r = el.getBoundingClientRect();
    const width = r.width + PAD * 2;
    const height = r.height + PAD * 2;
    setRect({ top: r.top - PAD, left: r.left - PAD, width, height });
  }, [isOpen, index]);

  useLayoutEffect(() => {
    if (!isOpen) return;
    const id = window.setTimeout(() => {
      requestAnimationFrame(() => requestAnimationFrame(measure));
    }, 80);
    return () => window.clearTimeout(id);
  }, [isOpen, index, activeTab, measure]);

  useEffect(() => {
    if (!isOpen) return;
    const onResize = () => measure();
    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', onResize, true);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', onResize, true);
    };
  }, [isOpen, measure]);

  const handleNext = () => {
    if (isLast) {
      onComplete();
      onClose();
      return;
    }
    setIndex((i) => i + 1);
  };

  const handlePrev = () => {
    setIndex((i) => Math.max(0, i - 1));
  };

  if (!isOpen) return null;

  const hasTarget = Boolean(step.target && rect && rect.width > 0 && rect.height > 0);

  const tooltipStyle = useMemo(() => {
    if (!hasTarget || !rect) return undefined;
    const gap = 14;
    const estH = 270;
    const style: React.CSSProperties = {
      left: '50%',
      transform: 'translateX(-50%)',
      width: 'min(92vw, 22rem)',
    };
    // Prefer below target; otherwise above; then clamp inside viewport.
    const belowTop = rect.top + rect.height + gap;
    const aboveTop = rect.top - estH - gap;
    let top = belowTop;
    if (belowTop + estH > window.innerHeight && aboveTop >= gap) {
      top = aboveTop;
    }
    top = Math.max(gap, Math.min(top, window.innerHeight - estH - gap));
    style.top = top;
    return style;
  }, [hasTarget, rect]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="tour-title"
        >
          {hasTarget ? (
            <>
              <div
                className="fixed z-[100] rounded-2xl ring-2 ring-indigo-400 ring-offset-2 ring-offset-transparent shadow-[0_0_0_9999px_rgba(0,0,0,0.78)] pointer-events-none transition-all duration-300 ease-out"
                style={{
                  top: rect!.top,
                  left: rect!.left,
                  width: rect!.width,
                  height: rect!.height,
                }}
              />
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="fixed z-[101] rounded-2xl border border-zinc-700 bg-zinc-950/95 p-5 shadow-2xl backdrop-blur-md pointer-events-auto"
                style={tooltipStyle}
              >
                <TourCardContent
                  step={step}
                  index={index}
                  isLast={isLast}
                  onClose={() => {
                    onComplete();
                    onClose();
                  }}
                  onPrev={handlePrev}
                  onNext={handleNext}
                  canPrev={index > 0}
                />
              </motion.div>
            </>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 pointer-events-auto"
            >
              <motion.div
                initial={{ scale: 0.96, y: 10 }}
                animate={{ scale: 1, y: 0 }}
                className="relative w-full max-w-md rounded-3xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl"
              >
                <TourCardContent
                  step={step}
                  index={index}
                  isLast={isLast}
                  onClose={() => {
                    onComplete();
                    onClose();
                  }}
                  onPrev={handlePrev}
                  onNext={handleNext}
                  canPrev={index > 0}
                />
              </motion.div>
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function TourCardContent({
  step,
  index,
  isLast,
  onClose,
  onPrev,
  onNext,
  canPrev,
}: {
  step: TourStep;
  index: number;
  isLast: boolean;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  canPrev: boolean;
}) {
  return (
    <>
      <button
        type="button"
        onClick={onClose}
        className="absolute right-3 top-3 rounded-full p-2 text-zinc-500 hover:bg-zinc-800 hover:text-white"
        aria-label="Close tutorial"
      >
        <X className="h-5 w-5" />
      </button>

      <p className="mb-2 text-xs font-black uppercase tracking-widest text-indigo-400">
        Tour · {index + 1} / {STEPS.length}
      </p>
      <h3 id="tour-title" className="mb-2 pr-8 text-lg font-black uppercase tracking-tight text-white sm:text-xl">
        {step.title}
      </h3>
      <p className="mb-5 text-sm leading-relaxed text-zinc-400">{step.body}</p>

      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-1 overflow-x-auto max-w-[40%] sm:max-w-none">
          {STEPS.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${i === index ? 'bg-indigo-500' : 'bg-zinc-700'}`}
            />
          ))}
        </div>
        <div className="flex items-center gap-2">
          {canPrev && (
            <button
              type="button"
              onClick={onPrev}
              className="flex items-center gap-1 rounded-xl border border-zinc-600 px-3 py-2 text-xs font-black uppercase tracking-wider text-zinc-300 hover:bg-zinc-800 sm:text-sm"
            >
              <ChevronLeft className="h-4 w-4" /> Back
            </button>
          )}
          <button
            type="button"
            onClick={onNext}
            className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-black uppercase tracking-wider text-white hover:bg-indigo-500 sm:text-sm"
          >
            {isLast ? 'Done' : 'Next'}
            {!isLast && <ChevronRight className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </>
  );
}
