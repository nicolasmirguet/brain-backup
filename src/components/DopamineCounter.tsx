import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DopamineCounterProps {
  points: number;
}

export function DopamineCounter({ points }: DopamineCounterProps) {
  const [pop, setPop] = useState(false);

  useEffect(() => {
    if (points > 0) {
      setPop(true);
      const timer = setTimeout(() => setPop(false), 300);
      return () => clearTimeout(timer);
    }
  }, [points]);

  return (
    <div className="h-10 flex items-center gap-1.5 bg-zinc-900 border border-yellow-500/45 rounded-full px-3 shadow-[0_0_14px_rgba(234,179,8,0.25)]">
      <Zap className="w-4.5 h-4.5 text-yellow-400 fill-yellow-400 animate-pulse" />
      <div className="flex flex-col">
        <span className="text-[9px] font-black uppercase tracking-widest text-yellow-500/80 leading-none">Brain Points</span>
        <motion.span
          key={points}
          initial={{ scale: 1.5, color: '#fef08a' }}
          animate={{ scale: 1, color: '#eab308' }}
          className={cn(
            "text-xl font-black leading-none",
            pop ? "text-yellow-200" : "text-yellow-400"
          )}
        >
          {points}
        </motion.span>
      </div>
    </div>
  );
}
