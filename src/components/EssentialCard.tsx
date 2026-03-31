import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Essential } from '@/types';
import { Check, Clock, Trash2 } from 'lucide-react';

interface EssentialCardProps {
  essential: Essential;
  onUpdate: (updated: Essential) => void;
  onDelete: (id: string) => void;
  onDone: (id: string) => void;
}

export function EssentialCard({ essential, onUpdate, onDelete, onDone }: EssentialCardProps) {
  const [timeLeft, setTimeLeft] = useState(Math.max(0, essential.nextDue - Date.now()));
  const openUrl = (() => {
    const raw = essential.spotifyUrl?.trim();
    if (!raw) return undefined;
    const withProtocol = /^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(raw) ? raw : `https://${raw}`;
    try {
      const parsed = new URL(withProtocol);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return undefined;
      return parsed.toString();
    } catch {
      return undefined;
    }
  })();

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(Math.max(0, essential.nextDue - Date.now()));
    }, 1000);
    return () => clearInterval(interval);
  }, [essential.nextDue]);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newInterval = parseInt(e.target.value, 10);
    // If we change the interval, let's just update the interval. 
    // We won't reset nextDue immediately unless it's already due, 
    // or we could just reset nextDue to now + newInterval to be safe.
    onUpdate({
      ...essential,
      intervalMinutes: newInterval,
      nextDue: Date.now() + newInterval * 60000,
      hasNotified: false
    });
  };

  const formatInterval = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h > 0 && m > 0) return `${h}h ${m}m`;
    if (h > 0) return `${h}h`;
    return `${m}m`;
  };

  const formatTimeLeft = (ms: number) => {
    if (ms <= 0) return 'DUE NOW';
    const totalMins = Math.floor(ms / 60000);
    const h = Math.floor(totalMins / 60);
    const m = totalMins % 60;
    const s = Math.floor((ms % 60000) / 1000);
    if (h > 0) return `${h}h ${m}m left`;
    if (m > 0) return `${m}m ${s}s left`;
    return `${s}s left`;
  };

  const isDue = timeLeft <= 0;

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className={`p-5 rounded-2xl border-2 transition-colors ${
        isDue 
          ? 'bg-indigo-900/40 border-indigo-500 shadow-[0_0_15px_rgba(79,70,229,0.3)]' 
          : 'bg-zinc-900 border-zinc-800'
      }`}
    >
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-xl font-black uppercase tracking-tight text-white">{essential.title}</h3>
          <div className={`flex items-center gap-1 text-sm font-bold mt-1 ${isDue ? 'text-indigo-300 animate-pulse' : 'text-zinc-500'}`}>
            <Clock className="w-4 h-4" />
            {formatTimeLeft(timeLeft)}
          </div>
        </div>
        <button 
          onClick={() => onDelete(essential.id)}
          className="text-zinc-600 hover:text-red-400 transition-colors p-2"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </div>

      <div className="mb-6">
        <div className="flex justify-between text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">
          <span>Intensity</span>
          <span className="text-indigo-400">Every {formatInterval(essential.intervalMinutes)}</span>
        </div>
        <input 
          type="range" 
          min="5" 
          max="300" 
          step="5"
          value={essential.intervalMinutes}
          onChange={handleSliderChange}
          className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
        />
        <div className="flex justify-between text-[10px] font-bold text-zinc-600 uppercase mt-1">
          <span>High (5m)</span>
          <span>Low (5h)</span>
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">YouTube when due (optional)</label>
        <input
          type="url"
          value={essential.spotifyUrl ?? ''}
          onChange={(e) =>
            onUpdate({
              ...essential,
              spotifyUrl: e.target.value.trim() || undefined,
            })
          }
          placeholder="https://www.youtube.com/watch?v=..."
          className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500"
        />
      </div>

      <button
        onClick={() => onDone(essential.id)}
        className={`w-full py-3 px-4 rounded-xl font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${
          isDue 
            ? 'bg-indigo-500 hover:bg-indigo-400 text-white shadow-[0_0_20px_rgba(79,70,229,0.4)]' 
            : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
        }`}
      >
        <Check className="w-5 h-5" /> {isDue ? "Do It Now!" : "Did It Early"}
      </button>

      {isDue && openUrl && (
        <a
          href={openUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 w-full py-3 px-4 rounded-xl font-black uppercase tracking-widest flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 text-white transition-all shadow-[0_0_18px_rgba(34,197,94,0.35)]"
        >
          Open Link
        </a>
      )}
    </motion.div>
  );
}
