import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Repeat } from 'lucide-react';
import { Task, EnergyLevel, TaskCategory, ScheduleType, LooseTimeframe, RecurrenceInterval } from '@/types';
import { cn } from '@/lib/utils';

function isoToDateAndTime(iso?: string): { date: string; time: string } {
  if (!iso) return { date: '', time: '' };
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { date: '', time: '' };
  const pad = (n: number) => String(n).padStart(2, '0');
  const date = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const time = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  return { date, time };
}

export interface EditTaskSavePayload {
  id: string;
  title: string;
  energyLevel: EnergyLevel;
  category: TaskCategory;
  durationMinutes: number;
  scheduleType: ScheduleType;
  looseTimeframe?: LooseTimeframe;
  scheduledDate?: string;
  recurrence?: { frequency: number; interval: RecurrenceInterval };
}

interface EditTaskModalProps {
  isOpen: boolean;
  task: Task | null;
  existingTasks: Task[];
  onClose: () => void;
  onSave: (payload: EditTaskSavePayload) => void;
}

export function EditTaskModal({ isOpen, task, existingTasks, onClose, onSave }: EditTaskModalProps) {
  const [title, setTitle] = useState('');
  const [duplicateError, setDuplicateError] = useState(false);
  const [energyLevel, setEnergyLevel] = useState<EnergyLevel>('functional');
  const [category, setCategory] = useState<TaskCategory>('urgent');
  const [durationMinutes, setDurationMinutes] = useState<number>(15);
  const [scheduleType, setScheduleType] = useState<ScheduleType>('loose');
  const [looseTimeframe, setLooseTimeframe] = useState<LooseTimeframe>('today');
  const [scheduledDate, setScheduledDate] = useState<string>('');
  const [scheduledTime, setScheduledTime] = useState<string>('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceFrequency, setRecurrenceFrequency] = useState<number>(1);
  const [recurrenceInterval, setRecurrenceInterval] = useState<RecurrenceInterval>('weeks');

  useEffect(() => {
    if (!task) return;
    setTitle(task.title);
    setEnergyLevel(task.energyLevel);
    setCategory(task.category);
    setDurationMinutes(task.durationMinutes);
    const st = task.scheduleType ?? 'loose';
    setScheduleType(st);
    setLooseTimeframe(task.looseTimeframe ?? 'today');
    const { date, time } = isoToDateAndTime(task.scheduledDate);
    setScheduledDate(date);
    setScheduledTime(time || '12:00');
    setIsRecurring(!!task.recurrence);
    setRecurrenceFrequency(task.recurrence?.frequency ?? 1);
    setRecurrenceInterval(task.recurrence?.interval ?? 'weeks');
    setDuplicateError(false);
  }, [task]);

  if (!isOpen || !task) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const dup = existingTasks.some(
      t =>
        t.id !== task.id &&
        t.title.trim().toLowerCase() === title.trim().toLowerCase() &&
        t.status === 'pending',
    );
    if (dup) {
      setDuplicateError(true);
      return;
    }

    let finalScheduledDate: string | undefined;
    if (scheduleType === 'precise' && scheduledDate) {
      const timeStr = scheduledTime || '12:00';
      finalScheduledDate = new Date(`${scheduledDate}T${timeStr}`).toISOString();
    }

    onSave({
      id: task.id,
      title: title.trim(),
      energyLevel,
      category,
      durationMinutes,
      scheduleType,
      looseTimeframe: scheduleType === 'loose' ? looseTimeframe : undefined,
      scheduledDate: finalScheduledDate,
      recurrence: isRecurring
        ? { frequency: recurrenceFrequency, interval: recurrenceInterval }
        : undefined,
    });
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && task && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-md shadow-2xl relative my-8 max-h-[90vh] overflow-y-auto"
          >
            <button onClick={onClose} className="absolute top-4 right-4 text-zinc-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-2xl font-black text-white mb-6 uppercase tracking-tight">Edit Task</h2>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-zinc-500 uppercase tracking-wider mb-2">
                  Task name
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    setDuplicateError(false);
                  }}
                  className={`w-full bg-zinc-800 border rounded-xl px-4 py-3 text-white focus:outline-none transition-colors ${
                    duplicateError ? 'border-red-500' : 'border-zinc-700 focus:border-indigo-500'
                  }`}
                  autoFocus
                />
                {duplicateError && (
                  <p className="text-red-400 text-xs font-bold uppercase tracking-wider mt-2">
                    Another pending task already uses this name
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-bold text-zinc-500 uppercase tracking-wider mb-2">When?</label>
                <div className="flex bg-zinc-800 rounded-xl p-1 border border-zinc-700 mb-3">
                  <button
                    type="button"
                    onClick={() => setScheduleType('loose')}
                    className={cn(
                      'flex-1 py-2 px-4 rounded-lg font-bold text-sm transition-all',
                      scheduleType === 'loose' ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:text-white',
                    )}
                  >
                    Loosely
                  </button>
                  <button
                    type="button"
                    onClick={() => setScheduleType('precise')}
                    className={cn(
                      'flex-1 py-2 px-4 rounded-lg font-bold text-sm transition-all',
                      scheduleType === 'precise' ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:text-white',
                    )}
                  >
                    Precisely
                  </button>
                </div>

                {scheduleType === 'loose' ? (
                  <div className="flex gap-2">
                    {(['today', 'this_week', 'someday'] as LooseTimeframe[]).map((tf) => (
                      <button
                        key={tf}
                        type="button"
                        onClick={() => setLooseTimeframe(tf)}
                        className={cn(
                          'flex-1 py-2 px-2 rounded-lg font-bold text-xs uppercase tracking-wider border transition-colors',
                          looseTimeframe === tf
                            ? 'bg-zinc-700 border-zinc-500 text-white'
                            : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-600',
                        )}
                      >
                        {tf.replace('_', ' ')}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <input
                        type="date"
                        value={scheduledDate}
                        onChange={(e) => setScheduledDate(e.target.value)}
                        className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 [color-scheme:dark]"
                        required={scheduleType === 'precise'}
                      />
                    </div>
                    <div className="flex-1">
                      <input
                        type="time"
                        value={scheduledTime}
                        onChange={(e) => setScheduledTime(e.target.value)}
                        className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 [color-scheme:dark]"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-bold text-zinc-500 uppercase tracking-wider mb-2">Repeat?</label>
                <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-4">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isRecurring}
                      onChange={(e) => setIsRecurring(e.target.checked)}
                      className="w-5 h-5 rounded border-zinc-600 text-indigo-600 focus:ring-indigo-500 bg-zinc-900"
                    />
                    <span className="text-white font-medium flex items-center gap-2">
                      <Repeat className="w-4 h-4 text-zinc-400" />
                      Recurring task
                    </span>
                  </label>

                  <AnimatePresence>
                    {isRecurring && (
                      <motion.div
                        initial={{ height: 0, opacity: 0, marginTop: 0 }}
                        animate={{ height: 'auto', opacity: 1, marginTop: 16 }}
                        exit={{ height: 0, opacity: 0, marginTop: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="flex items-center gap-3 pt-4 border-t border-zinc-700">
                          <span className="text-zinc-400">Every</span>
                          <input
                            type="number"
                            min={1}
                            max={99}
                            value={recurrenceFrequency}
                            onChange={(e) => setRecurrenceFrequency(parseInt(e.target.value, 10) || 1)}
                            className="w-20 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:outline-none text-center"
                          />
                          <select
                            value={recurrenceInterval}
                            onChange={(e) => setRecurrenceInterval(e.target.value as RecurrenceInterval)}
                            className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:outline-none appearance-none"
                          >
                            <option value="days">Days</option>
                            <option value="weeks">Weeks</option>
                            <option value="months">Months</option>
                          </select>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-zinc-500 uppercase tracking-wider mb-2">
                  Energy required
                </label>
                <div className="flex gap-2">
                  {(['brain dead', 'functional', 'superhero'] as EnergyLevel[]).map((level) => (
                    <button
                      key={level}
                      type="button"
                      onClick={() => setEnergyLevel(level)}
                      className={cn(
                        'flex-1 py-2 px-2 rounded-lg font-bold text-xs uppercase tracking-wider border transition-colors',
                        energyLevel === level
                          ? level === 'brain dead'
                            ? 'bg-red-500/20 border-red-500 text-red-400'
                            : level === 'functional'
                              ? 'bg-yellow-500/20 border-yellow-500 text-yellow-400'
                              : 'bg-green-500/20 border-green-500 text-green-400'
                          : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-600',
                      )}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-bold text-zinc-500 uppercase tracking-wider mb-2">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as TaskCategory)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:outline-none appearance-none"
                  >
                    <option value="urgent">Urgent</option>
                    <option value="work">Work</option>
                    <option value="health">Health</option>
                    <option value="exercise">Exercise</option>
                    <option value="chores">Chores</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-bold text-zinc-500 uppercase tracking-wider mb-2">Minutes</label>
                  <input
                    type="number"
                    min={1}
                    max={240}
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(parseInt(e.target.value, 10) || 15)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-sm font-bold uppercase tracking-wider border border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-sm font-bold uppercase tracking-wider bg-indigo-600 hover:bg-indigo-500 text-white"
                >
                  Save
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
