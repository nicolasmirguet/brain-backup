import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Plus, Activity } from 'lucide-react';
import { Essential } from '@/types';
import { v4 as uuidv4 } from 'uuid';

interface CreateEssentialModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (essential: Essential) => void;
}

export function CreateEssentialModal({ isOpen, onClose, onCreate }: CreateEssentialModalProps) {
  const [title, setTitle] = useState('');
  const [intervalMinutes, setIntervalMinutes] = useState(90);
  const [mediaUrl, setMediaUrl] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const url = mediaUrl.trim();
    const newEssential: Essential = {
      id: uuidv4(),
      title: title.trim(),
      intervalMinutes,
      nextDue: Date.now() + intervalMinutes * 60000,
      hasNotified: false,
      ...(url ? { spotifyUrl: url } : {}),
    };

    onCreate(newEssential);
    setTitle('');
    setIntervalMinutes(90);
    setMediaUrl('');
    onClose();
  };

  const formatInterval = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h > 0 && m > 0) return `${h}h ${m}m`;
    if (h > 0) return `${h}h`;
    return `${m}m`;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 w-full max-w-md shadow-2xl overflow-y-auto max-h-[90vh]"
          >
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <div className="bg-indigo-600/20 p-2 rounded-xl">
                  <Activity className="w-6 h-6 text-indigo-400" />
                </div>
                <h2 className="text-2xl font-black uppercase tracking-tight text-white">New Essential</h2>
              </div>
              <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors p-2 bg-zinc-800 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-zinc-400 uppercase tracking-widest mb-2">What is it?</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Drink Water, Stretch..."
                  className="w-full bg-zinc-800 border-2 border-zinc-700 rounded-xl px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition-colors font-bold"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-zinc-400 uppercase tracking-widest mb-2">
                  YouTube link (optional)
                </label>
                <input
                  type="url"
                  value={mediaUrl}
                  onChange={(e) => setMediaUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="w-full bg-zinc-800 border-2 border-zinc-700 rounded-xl px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 text-sm"
                />
                <p className="text-[10px] text-zinc-500 mt-1 uppercase font-bold tracking-wider">
                  Shown when this essential is due
                </p>
              </div>

              <div>
                <label className="block text-sm font-bold text-zinc-400 uppercase tracking-widest mb-2">
                  Intensity: <span className="text-indigo-400">Every {formatInterval(intervalMinutes)}</span>
                </label>
                <input 
                  type="range" 
                  min="5" 
                  max="300" 
                  step="5"
                  value={intervalMinutes}
                  onChange={(e) => setIntervalMinutes(parseInt(e.target.value, 10))}
                  className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
                <div className="flex justify-between text-[10px] font-bold text-zinc-600 uppercase mt-2">
                  <span>High (5m)</span>
                  <span>Low (5h)</span>
                </div>
              </div>

              <button
                type="submit"
                disabled={!title.trim()}
                className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white font-black uppercase tracking-widest py-4 px-6 rounded-xl transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(79,70,229,0.3)] disabled:shadow-none"
              >
                <Plus className="w-5 h-5" /> Add Essential
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
