import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Essential } from '@/types';
import { Check, Clock, Trash2, BellOff, Moon, Zap, Power } from 'lucide-react';
import { getEssentialIntervalMs } from '@/lib/essentialInterval';
import type { EssentialMusicTheme } from '@/lib/essentialMusic';

const RINGTONE_OPTIONS: { value: EssentialMusicTheme; label: string }[] = [
  { value: 'calm', label: 'Calm' },
  { value: 'rock', label: 'Rock' },
  { value: 'techno', label: 'Techno' },
  { value: 'zen', label: 'Zen' },
];

/** Distinct card colours when the reminder is On (off = black). */
const VARIANT_STYLES = [
  {
    label: 'violet',
    active:
      'bg-gradient-to-br from-violet-950/80 via-violet-950/30 to-zinc-950 border-violet-500/55 shadow-[0_0_20px_rgba(139,92,246,0.15)]',
    accent: 'text-violet-300',
    ring: 'ring-violet-500/30',
  },
  {
    label: 'teal',
    active:
      'bg-gradient-to-br from-teal-950/80 via-teal-950/25 to-zinc-950 border-teal-500/55 shadow-[0_0_20px_rgba(20,184,166,0.12)]',
    accent: 'text-teal-300',
    ring: 'ring-teal-500/30',
  },
  {
    label: 'amber',
    active:
      'bg-gradient-to-br from-amber-950/70 via-amber-950/20 to-zinc-950 border-amber-500/50 shadow-[0_0_20px_rgba(245,158,11,0.12)]',
    accent: 'text-amber-200',
    ring: 'ring-amber-500/30',
  },
  {
    label: 'rose',
    active:
      'bg-gradient-to-br from-rose-950/75 via-rose-950/25 to-zinc-950 border-rose-500/50 shadow-[0_0_20px_rgba(244,63,94,0.12)]',
    accent: 'text-rose-300',
    ring: 'ring-rose-500/30',
  },
  {
    label: 'sky',
    active:
      'bg-gradient-to-br from-sky-950/80 via-sky-950/25 to-zinc-950 border-sky-500/50 shadow-[0_0_20px_rgba(14,165,233,0.12)]',
    accent: 'text-sky-300',
    ring: 'ring-sky-500/30',
  },
  {
    label: 'emerald',
    active:
      'bg-gradient-to-br from-emerald-950/80 via-emerald-950/25 to-zinc-950 border-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.12)]',
    accent: 'text-emerald-300',
    ring: 'ring-emerald-500/30',
  },
];

interface EssentialCardProps {
  essential: Essential;
  colorIndex: number;
  defaultMusicTheme: EssentialMusicTheme;
  onUpdate: (updated: Essential) => void;
  onDelete: (id: string) => void;
  onRestart: (id: string) => void;
}

export function EssentialCard({
  essential,
  colorIndex,
  defaultMusicTheme,
  onUpdate,
  onDelete,
  onRestart,
}: EssentialCardProps) {
  const [timeLeft, setTimeLeft] = useState(Math.max(0, essential.nextDue - Date.now()));
  const isActive = essential.isActive !== false;
  const isSilent = !!essential.silent;
  const triggerMode = essential.triggerMode ?? 'alarm';
  const musicTheme = essential.musicTheme ?? defaultMusicTheme;

  const variant = VARIANT_STYLES[colorIndex % VARIANT_STYLES.length];

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(Math.max(0, essential.nextDue - Date.now()));
    }, 1000);
    return () => clearInterval(interval);
  }, [essential.nextDue]);

  const isSecondsTest = typeof essential.intervalSeconds === 'number';

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newInterval = parseInt(e.target.value, 10);
    onUpdate({
      ...essential,
      intervalMinutes: newInterval,
      intervalSeconds: undefined,
      nextDue: Date.now() + newInterval * 60000,
      hasNotified: false,
    });
  };

  const formatInterval = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h > 0 && m > 0) return `${h}h ${m}m`;
    if (h > 0) return `${h}h`;
    return `${m}m`;
  };

  const formatEveryLabel = () => {
    if (isSecondsTest) return `Every ${essential.intervalSeconds}s`;
    return `Every ${formatInterval(essential.intervalMinutes)}`;
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

  const offShell = 'bg-black border-zinc-800 ring-1 ring-zinc-900';
  const dueShell = isDue
    ? `${variant.active} ring-2 ${variant.ring} border-white/20`
    : isActive
      ? variant.active
      : offShell;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className={`p-5 rounded-2xl border-2 transition-colors ${dueShell}`}
    >
      {/* Status strip */}
      <div className="flex flex-col items-center mb-4 -mt-1">
        <div
          className={`flex h-16 w-16 items-center justify-center rounded-2xl border-2 transition-colors ${
            isActive
              ? `bg-white/10 ${variant.accent} border-white/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]`
              : 'border-zinc-800 bg-zinc-950 text-zinc-600'
          }`}
        >
          {isActive ? (
            <Zap className="h-8 w-8" strokeWidth={2.5} aria-hidden />
          ) : (
            <Moon className="h-8 w-8 opacity-80" strokeWidth={2} aria-hidden />
          )}
        </div>
        <p className={`mt-2 text-[10px] font-black uppercase tracking-[0.2em] ${isActive ? variant.accent : 'text-zinc-600'}`}>
          {isActive ? 'On — timer running' : 'Off — sleeping'}
        </p>
      </div>

      <div className="flex justify-between items-start mb-4 gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="text-xl font-black uppercase tracking-tight text-white truncate">{essential.title}</h3>
          <div className="flex items-center gap-2 text-xs font-bold mt-1 flex-wrap">
            <span
              className={`flex items-center gap-1 ${isDue ? `${variant.accent} animate-pulse` : isActive ? variant.accent : 'text-zinc-500'}`}
            >
              <Clock className="w-4 h-4 flex-shrink-0" />
              {isActive ? formatTimeLeft(timeLeft) : 'Paused'}
            </span>
            {isSilent && (
              <span className="px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 uppercase tracking-widest text-[10px]">
                Silent
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
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

      {isSecondsTest && (
        <div className="mb-4 rounded-xl border border-zinc-800 bg-zinc-950/80 px-3 py-2.5">
          <p className="text-[11px] font-bold text-zinc-300 leading-snug">
            <span className="text-white">How it works:</span> Turn <span className="text-indigo-400">On</span> → wait 20
            seconds → you hear the name, then the ringtone → when the music ends, the countdown starts again. Use{' '}
            <span className="text-zinc-200">Off</span> or <span className="text-zinc-200">Turn off test</span> to stop.
          </p>
        </div>
      )}

      <div className="mb-6">
        <div className="flex justify-between text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">
          <span>How often</span>
          <span className={isActive ? variant.accent : 'text-zinc-500'}>{formatEveryLabel()}</span>
        </div>
        {isSecondsTest ? (
          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Fixed 20s test interval</p>
        ) : (
          <>
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
          </>
        )}
      </div>

      <div className="mb-4">
        <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Trigger</label>
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

        {triggerMode === 'alarm' && (
          <>
            <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1.5">Ringtone</label>
            <select
              value={musicTheme}
              onChange={(e) =>
                onUpdate({
                  ...essential,
                  musicTheme: e.target.value as EssentialMusicTheme,
                })
              }
              className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-sm font-bold text-white focus:outline-none focus:border-indigo-500 mb-3"
            >
              {RINGTONE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </>
        )}

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
          type="button"
          onClick={() =>
            onUpdate({
              ...essential,
              isActive: !isActive,
              reminderCount: 0,
              nextDue: Date.now() + getEssentialIntervalMs(essential),
              ringingUntil: undefined,
            })
          }
          className={`w-full py-3 px-4 rounded-xl font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${
            isActive
              ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-[0_0_16px_rgba(79,70,229,0.4)]'
              : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
          }`}
        >
          <Power className="w-5 h-5" />
          {isActive ? 'Off' : 'On'}
        </button>

        {isSecondsTest && isActive && (
          <button
            type="button"
            onClick={() =>
              onUpdate({
                ...essential,
                isActive: false,
                reminderCount: 0,
                nextDue: Date.now() + getEssentialIntervalMs(essential),
                ringingUntil: undefined,
              })
            }
            className="w-full py-2.5 px-4 rounded-xl font-black uppercase tracking-widest text-xs bg-zinc-950 border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500 transition-colors"
          >
            Turn off test
          </button>
        )}

        <button
          type="button"
          onClick={() => onRestart(essential.id)}
          className="w-full py-3 px-4 rounded-xl font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
        >
          <Check className="w-5 h-5" /> Restart
        </button>
      </div>
    </motion.div>
  );
}
