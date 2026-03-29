import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Check, CalendarClock, Frown, Sparkles, ChevronDown, ChevronUp, Repeat, Trash2 } from 'lucide-react';
import { Task, CATEGORY_COLORS, CATEGORY_BORDER_COLORS, CATEGORY_HEX_COLORS, FUNNY_GIVE_UP_MESSAGES } from '@/types';
import { VisualTimer } from './VisualTimer';
import { cn } from '@/lib/utils';
import { AIAdvisorModal } from './AIAdvisorModal';

interface TaskCardProps {
  task: Task;
  onComplete: (id: string) => void;
  onReschedule: (id: string) => void;
  onGiveUp: (id: string, message: string) => void;
  onDelete: (id: string) => void;
  onApplyAI: (id: string, subSteps: string[], requiredItems: string[]) => void;
  onTimerComplete?: (title: string) => void;
}

export function TaskCard({ task, onComplete, onReschedule, onGiveUp, onDelete, onApplyAI, onTimerComplete }: TaskCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);

  const handleGiveUp = () => {
    const randomMessage = FUNNY_GIVE_UP_MESSAGES[Math.floor(Math.random() * FUNNY_GIVE_UP_MESSAGES.length)];
    onGiveUp(task.id, randomMessage);
  };

  return (
    <>
      <motion.div
        layout
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className={cn(
          'bg-zinc-900 border-l-4 rounded-xl p-4 shadow-lg flex flex-col gap-4',
          CATEGORY_BORDER_COLORS[task.category]
        )}
      >
        <div className="flex justify-between items-start gap-4">
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className={cn('text-xs font-bold px-2 py-0.5 rounded-full uppercase tracking-wider', CATEGORY_COLORS[task.category])}>
                {task.category}
              </span>
              {task.scheduleType === 'precise' && task.scheduledDate && (
                <span className="text-xs text-zinc-300 bg-zinc-800 px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                  <CalendarClock className="w-3 h-3" />
                  {new Date(task.scheduledDate).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                </span>
              )}
              {task.scheduleType === 'loose' && task.looseTimeframe && (
                <span className="text-xs text-zinc-300 bg-zinc-800 px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                  <CalendarClock className="w-3 h-3" />
                  {task.looseTimeframe.replace('_', ' ')}
                </span>
              )}
              {task.cycle !== 'none' && (
                <span className="text-xs text-zinc-400 uppercase tracking-wider border border-zinc-700 px-2 py-0.5 rounded-full">{task.cycle}</span>
              )}
              {task.recurrence && (
                <span className="text-xs text-zinc-300 bg-indigo-500/20 border border-indigo-500/30 px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                  <Repeat className="w-3 h-3" />
                  {task.recurrence.frequency === 1 
                    ? `Every ${task.recurrence.interval.slice(0, -1)}` 
                    : `Every ${task.recurrence.frequency} ${task.recurrence.interval}`}
                </span>
              )}
            </div>
            <h3 className="text-xl font-bold text-white">{task.title}</h3>
            
            {(task.subSteps?.length || task.requiredItems?.length) ? (
              <button 
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-sm text-zinc-400 hover:text-white flex items-center gap-1 mt-2"
              >
                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                {isExpanded ? 'Hide Details' : 'Show Details'}
              </button>
            ) : null}

            <AnimatePresence>
              {isExpanded && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden mt-3"
                >
                  {task.requiredItems && task.requiredItems.length > 0 && (
                    <div className="mb-3">
                      <h4 className="text-xs font-bold text-zinc-500 uppercase mb-1">Required Items</h4>
                      <ul className="list-disc list-inside text-sm text-zinc-300">
                        {task.requiredItems.map((item, i) => <li key={i}>{item}</li>)}
                      </ul>
                    </div>
                  )}
                  {task.subSteps && task.subSteps.length > 0 && (
                    <div>
                      <h4 className="text-xs font-bold text-zinc-500 uppercase mb-1">Sub-steps</h4>
                      <ol className="list-decimal list-inside text-sm text-zinc-300">
                        {task.subSteps.map((step, i) => <li key={i}>{step}</li>)}
                      </ol>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="flex-shrink-0 flex flex-col items-end gap-2">
            <button
              onClick={() => onDelete(task.id)}
              className="text-zinc-700 hover:text-red-500 transition-colors p-1"
              title="Delete task"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <VisualTimer 
              durationMinutes={task.durationMinutes} 
              hexColor={CATEGORY_HEX_COLORS[task.category]} 
              onComplete={() => onTimerComplete?.(task.title)}
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mt-2">
          <button
            onClick={() => onComplete(task.id)}
            className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white py-2 px-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-colors border border-zinc-700"
          >
            <Check className="w-4 h-4 text-green-400" /> Done
          </button>
          <button
            onClick={() => onReschedule(task.id)}
            className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white py-2 px-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-colors border border-zinc-700"
          >
            <CalendarClock className="w-4 h-4 text-blue-400" /> Tomorrow
          </button>
          <button
            onClick={handleGiveUp}
            className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white py-2 px-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-colors border border-zinc-700"
          >
            <Frown className="w-4 h-4 text-red-400" /> I Give Up
          </button>
        </div>

        {(!task.subSteps?.length && !task.requiredItems?.length) && (
          <button
            onClick={() => setIsAIModalOpen(true)}
            className="w-full mt-2 bg-indigo-900/30 hover:bg-indigo-900/50 text-indigo-300 py-2 px-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-colors border border-indigo-500/30"
          >
            <Sparkles className="w-4 h-4" /> Break it Down (AI)
          </button>
        )}
      </motion.div>

      <AIAdvisorModal 
        isOpen={isAIModalOpen} 
        onClose={() => setIsAIModalOpen(false)} 
        task={task} 
        onApply={(subSteps, requiredItems) => onApplyAI(task.id, subSteps, requiredItems)}
      />
    </>
  );
}
