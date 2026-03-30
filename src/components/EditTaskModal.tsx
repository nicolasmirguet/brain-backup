import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import { Task, EnergyLevel } from '@/types';
import { cn } from '@/lib/utils';

interface EditTaskModalProps {
  isOpen: boolean;
  task: Task | null;
  onClose: () => void;
  onSave: (id: string, title: string, energyLevel: EnergyLevel) => void;
}

export function EditTaskModal({ isOpen, task, onClose, onSave }: EditTaskModalProps) {
  const [title, setTitle] = useState('');
  const [energyLevel, setEnergyLevel] = useState<EnergyLevel>('functional');

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setEnergyLevel(task.energyLevel);
    }
  }, [task]);

  if (!isOpen || !task) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onSave(task.id, title.trim(), energyLevel);
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
            className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-md shadow-2xl relative my-8"
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
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-colors"
                  autoFocus
                />
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

