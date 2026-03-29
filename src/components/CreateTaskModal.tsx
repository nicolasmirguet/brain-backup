import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Repeat } from 'lucide-react';
import { Task, TaskCategory, EnergyLevel, ScheduleType, LooseTimeframe, RecurrenceInterval } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { cn } from '@/lib/utils';

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (task: Task) => void;
  existingTasks: Task[];
}

export function CreateTaskModal({ isOpen, onClose, onCreate, existingTasks }: CreateTaskModalProps) {
  const [title, setTitle] = useState('');
  const [duplicateError, setDuplicateError] = useState(false);
  const [category, setCategory] = useState<TaskCategory>('other');
  const [energyLevel, setEnergyLevel] = useState<EnergyLevel>('functional');
  const [durationMinutes, setDurationMinutes] = useState<number>(15);
  const [scheduleType, setScheduleType] = useState<ScheduleType>('loose');
  const [looseTimeframe, setLooseTimeframe] = useState<LooseTimeframe>('today');
  const [scheduledDate, setScheduledDate] = useState<string>('');
  const [scheduledTime, setScheduledTime] = useState<string>('');
  
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceFrequency, setRecurrenceFrequency] = useState<number>(1);
  const [recurrenceInterval, setRecurrenceInterval] = useState<RecurrenceInterval>('weeks');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const isDuplicate = existingTasks.some(
      t => t.title.trim().toLowerCase() === title.trim().toLowerCase() && t.status === 'pending'
    );
    if (isDuplicate) {
      setDuplicateError(true);
      return;
    }

    let finalScheduledDate = undefined;
    if (scheduleType === 'precise' && scheduledDate) {
      const timeStr = scheduledTime || '12:00';
      finalScheduledDate = new Date(`${scheduledDate}T${timeStr}`).toISOString();
    }

    const newTask: Task = {
      id: uuidv4(),
      title: title.trim(),
      category,
      cycle: 'none',
      energyLevel,
      durationMinutes,
      status: 'pending',
      createdAt: Date.now(),
      scheduleType,
      looseTimeframe: scheduleType === 'loose' ? looseTimeframe : undefined,
      scheduledDate: finalScheduledDate,
      recurrence: isRecurring ? {
        frequency: recurrenceFrequency,
        interval: recurrenceInterval
      } : undefined
    };

    onCreate(newTask);
    
    // Reset form
    setTitle('');
    setDuplicateError(false);
    setCategory('other');
    setEnergyLevel('functional');
    setDurationMinutes(15);
    setScheduleType('loose');
    setLooseTimeframe('today');
    setScheduledDate('');
    setScheduledTime('');
    setIsRecurring(false);
    setRecurrenceFrequency(1);
    setRecurrenceInterval('weeks');
    
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-md shadow-2xl relative my-8"
          >
            <button onClick={onClose} className="absolute top-4 right-4 text-zinc-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-2xl font-black text-white mb-6 uppercase tracking-tight">New Task</h2>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-zinc-500 uppercase tracking-wider mb-2">What needs doing?</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => { setTitle(e.target.value); setDuplicateError(false); }}
                  placeholder="e.g. Do the dishes"
                  className={`w-full bg-zinc-800 border rounded-xl px-4 py-3 text-white focus:outline-none transition-colors ${duplicateError ? 'border-red-500 focus:border-red-500' : 'border-zinc-700 focus:border-indigo-500'}`}
                  autoFocus
                />
                {duplicateError && (
                  <p className="text-red-400 text-xs font-bold uppercase tracking-wider mt-2">
                    ⚠ A pending task with this name already exists
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
                    "flex-1 py-2 px-4 rounded-lg font-bold text-sm transition-all",
                    scheduleType === 'loose' ? "bg-indigo-600 text-white" : "text-zinc-400 hover:text-white"
                  )}
                >
                  Loosely
                </button>
                <button
                  type="button"
                  onClick={() => setScheduleType('precise')}
                  className={cn(
                    "flex-1 py-2 px-4 rounded-lg font-bold text-sm transition-all",
                    scheduleType === 'precise' ? "bg-indigo-600 text-white" : "text-zinc-400 hover:text-white"
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
                        "flex-1 py-2 px-2 rounded-lg font-bold text-xs uppercase tracking-wider border transition-colors",
                        looseTimeframe === tf 
                          ? "bg-zinc-700 border-zinc-500 text-white" 
                          : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-600"
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
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-colors [color-scheme:dark]"
                      required={scheduleType === 'precise'}
                    />
                  </div>
                  <div className="flex-1">
                    <input
                      type="time"
                      value={scheduledTime}
                      onChange={(e) => setScheduledTime(e.target.value)}
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-colors [color-scheme:dark]"
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
                    Make this a recurring task
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
                          min="1"
                          max="99"
                          value={recurrenceFrequency}
                          onChange={(e) => setRecurrenceFrequency(parseInt(e.target.value) || 1)}
                          className="w-20 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500 text-center"
                        />
                        <select
                          value={recurrenceInterval}
                          onChange={(e) => setRecurrenceInterval(e.target.value as RecurrenceInterval)}
                          className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500 appearance-none"
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
              <label className="block text-sm font-bold text-zinc-500 uppercase tracking-wider mb-2">Energy Required</label>
              <div className="flex gap-2">
                {(['brain dead', 'functional', 'superhero'] as EnergyLevel[]).map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setEnergyLevel(level)}
                    className={cn(
                      "flex-1 py-2 px-2 rounded-lg font-bold text-xs uppercase tracking-wider border transition-colors",
                      energyLevel === level 
                        ? (level === 'brain dead' ? 'bg-red-500/20 border-red-500 text-red-400' : 
                           level === 'functional' ? 'bg-yellow-500/20 border-yellow-500 text-yellow-400' : 
                           'bg-green-500/20 border-green-500 text-green-400')
                        : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-600"
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
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-colors appearance-none"
                >
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
                  min="1"
                  max="240"
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(parseInt(e.target.value) || 15)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
            </div>

              <button
                type="submit"
                disabled={!title.trim()}
                className="w-full bg-white hover:bg-zinc-200 text-black font-black uppercase tracking-widest py-4 px-6 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-4"
              >
                Create Task
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
