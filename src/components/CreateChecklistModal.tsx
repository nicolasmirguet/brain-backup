import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Plus, ListTodo } from 'lucide-react';
import { Checklist } from '@/types';
import { v4 as uuidv4 } from 'uuid';

interface CreateChecklistModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (checklist: Checklist) => void;
}

export function CreateChecklistModal({ isOpen, onClose, onCreate }: CreateChecklistModalProps) {
  const [title, setTitle] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const newChecklist: Checklist = {
      id: uuidv4(),
      title: title.trim(),
      items: []
    };

    onCreate(newChecklist);
    setTitle('');
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl"
          >
            <div className="p-6 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50">
              <div className="flex items-center gap-3">
                <div className="bg-indigo-500/20 p-2 rounded-xl">
                  <ListTodo className="w-6 h-6 text-indigo-400" />
                </div>
                <h2 className="text-xl font-black uppercase tracking-tight">New Launchpad</h2>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-zinc-800 rounded-full transition-colors text-zinc-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest">
                  List Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Gym Bag, Work Trip..."
                  className="w-full bg-black border-2 border-zinc-800 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500 transition-colors font-medium"
                  autoFocus
                />
              </div>

              <button
                type="submit"
                disabled={!title.trim()}
                className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-white font-black uppercase tracking-widest py-4 rounded-xl transition-colors flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(79,70,229,0.3)] disabled:shadow-none"
              >
                <Plus className="w-5 h-5" />
                Create Launchpad
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
