import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Play, Pause, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { playTimerAlert } from '@/lib/alerts';

interface VisualTimerProps {
  durationMinutes: number;
  hexColor: string;
  onComplete?: () => void;
}

export function VisualTimer({ durationMinutes, hexColor, onComplete }: VisualTimerProps) {
  const totalSeconds = durationMinutes * 60;
  const [timeLeft, setTimeLeft] = useState(totalSeconds);
  const [isRunning, setIsRunning] = useState(false);
  const [isFinished, setIsFinished] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setIsRunning(false);
            setIsFinished(true);
            void playTimerAlert();
            onComplete?.();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning, timeLeft, onComplete]);

  const toggleTimer = () => {
    if (isFinished) {
      setIsFinished(false);
      setTimeLeft(totalSeconds);
      setIsRunning(true);
    } else {
      setIsRunning(!isRunning);
    }
  };
  
  const resetTimer = () => {
    setIsRunning(false);
    setIsFinished(false);
    setTimeLeft(totalSeconds);
  };

  const progress = timeLeft / totalSeconds;
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - progress * circumference;

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  return (
    <div className="flex flex-col items-center gap-2">
      <motion.div 
        className="relative w-24 h-24 flex items-center justify-center cursor-pointer group" 
        onClick={toggleTimer}
        animate={isFinished ? {
          scale: [1, 1.1, 1],
          rotate: [0, -5, 5, -5, 5, 0],
        } : {}}
        transition={isFinished ? {
          duration: 0.5,
          repeat: Infinity,
          repeatType: "reverse"
        } : {}}
      >
        {/* Background Circle */}
        <svg className="absolute inset-0 w-full h-full -rotate-90">
          <circle
            cx="48"
            cy="48"
            r={radius}
            stroke="currentColor"
            strokeWidth="8"
            fill="transparent"
            className={cn("transition-colors", isFinished ? "text-red-900/50" : "text-zinc-800")}
          />
          {/* Progress Circle */}
          <motion.circle
            cx="48"
            cy="48"
            r={radius}
            stroke={isFinished ? "#ef4444" : hexColor}
            strokeWidth="8"
            fill="transparent"
            strokeDasharray={circumference}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1, ease: 'linear' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-sm font-mono font-bold z-10 text-white">
           {isFinished ? (
             <RotateCcw className="w-5 h-5 text-red-400" />
           ) : isRunning ? (
             <Pause className="w-5 h-5 opacity-0 group-hover:opacity-100 transition-opacity absolute" />
           ) : (
             <Play className="w-5 h-5 opacity-0 group-hover:opacity-100 transition-opacity absolute ml-1" />
           )}
           {!isFinished && <span className="group-hover:opacity-0 transition-opacity">{String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}</span>}
        </div>
      </motion.div>
      <button onClick={resetTimer} className="text-xs text-zinc-500 hover:text-white flex items-center gap-1">
        <RotateCcw className="w-3 h-3" /> Reset
      </button>
    </div>
  );
}
