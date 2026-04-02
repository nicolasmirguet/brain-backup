import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Essential } from '@/types';
import { Check, Clock, Trash2, BellOff } from 'lucide-react';

interface EssentialCardProps {
  essential: Essential;
  onUpdate: (updated: Essential) => void;
  onDelete: (id: string) => void;
  onRestart: (id: string) => void;
}

export function EssentialCard({ essential, onUpdate, onDelete, onRestart }: EssentialCardProps) {
  const [timeLeft, setTimeLeft] = useState(Math.max(0, essential.nextDue - Date.now()));
  const isActive = essential.isActive !== false;
  const isSilent = !!essential.silent;
  const triggerMode = essential.triggerMode ?? 'alarm';

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
          : isActive
            ? 'bg-indigo-950/40 border-indigo-500/60'
            : 'bg-black border-zinc-900'
      }`}
    >
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-xl font-black uppercase tracking-tight text-white">{essential.title}</h3>
          <div className={`flex items-center gap-2 text-xs font-bold mt-1`}>
            <span className={`flex items-center gap-1 ${isDue ? 'text-indigo-300 animate-pulse' : isActive ? 'text-indigo-300' : 'text-zinc-500'}`}>
              <Clock className="w-4 h-4" />
              {isActive ? formatTimeLeft(timeLeft) : 'Paused'}
            </span>
            {isSilent && <span className="px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 uppercase tracking-widest">Silent</span>}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() =>
              onUpdate({
                ...essential,
                silent: !isSilent,
              })
            }
            className="text-zinc-400 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-zinc-800"
            title={isSilent ? 'Disable silent mode' : 'Enable silent mode'}
          >
            <BellOff className={`w-4 h-4 ${isSilent ? 'text-zinc-200' : ''}`} />
          </button>
          <button
            type="button"
            onClick={() => onDelete(essential.id)}
            className="text-zinc-600 hover:text-red-400 transition-colors p-2"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
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
        <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Trigger mode</label>
        <div className="flex bg-zinc-800 rounded-xl p-1 border border-zinc-700 mb-3">
          <button
            type="button"
            onClick={() =>
              onUpdate({
                ...essential,
                triggerMode: 'alarm',
              })
            }
            className={`flex-1 py-2 rounded-lg font-black text-[11px] uppercase tracking-wider transition-colors ${
              triggerMode === 'alarm' ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:text-white'
            }`}
          >
            Alarm
          </button>
          <button
            type="button"
            onClick={() =>
              onUpdate({
                ...essential,
                triggerMode: 'link',
              })
            }
            className={`flex-1 py-2 rounded-lg font-black text-[11px] uppercase tracking-wider transition-colors ${
              triggerMode === 'link' ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:text-white'
            }`}
          >
            Link
          </button>
        </div>

        <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">YouTube when due (optional)</label>
        <input
          type="url"
          value={essential.mediaUrl ?? essential.spotifyUrl ?? ''}
          onChange={(e) =>
            onUpdate({
              ...essential,
              mediaUrl: e.target.value.trim() || undefined,
              spotifyUrl: undefined,
            })
          }
          placeholder="https://www.youtube.com/watch?v=..."
          className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500"
        />
      </div>

      <div className="flex flex-col gap-2">
        <button
          onClick={() =>
            onUpdate({
              ...essential,
              isActive: !isActive,
              reminderCount: 0,
              nextDue: Date.now() + essential.intervalMinutes * 60000,
              ringingUntil: undefined,
            })
          }
          className={`w-full py-3 px-4 rounded-xl font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${
            isActive
              ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-[0_0_16px_rgba(79,70,229,0.4)]'
              : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
          }`}
        >
          {isActive ? 'On' : 'Off'}
        </button>

        <button
          onClick={() => onRestart(essential.id)}
          className={`w-full py-3 px-4 rounded-xl font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${
            'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
          }`}
        >
          <Check className="w-5 h-5" /> Restart
        </button>
      </div>
    </motion.div>
  );
}
