import React from 'react';
import { Battery, BatteryMedium, BatteryFull } from 'lucide-react';
import { EnergyLevel, ENERGY_LEVELS } from '@/types';
import { cn } from '@/lib/utils';

interface EnergyFilterProps {
  currentLevel: EnergyLevel;
  onChange: (level: EnergyLevel) => void;
}

export function EnergyFilter({ currentLevel, onChange }: EnergyFilterProps) {
  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-sm font-bold text-zinc-400 uppercase tracking-wider">Current Energy Level</h2>
      <div className="flex bg-zinc-900 rounded-xl p-1 border border-zinc-800">
        {ENERGY_LEVELS.map((level) => {
          const isActive = currentLevel === level;
          let Icon = Battery;
          let colorClass = '';
          
          if (level === 'brain dead') {
            Icon = Battery;
            colorClass = isActive ? 'bg-red-500/20 text-red-400' : 'text-zinc-500 hover:text-red-400';
          } else if (level === 'functional') {
            Icon = BatteryMedium;
            colorClass = isActive ? 'bg-yellow-500/20 text-yellow-400' : 'text-zinc-500 hover:text-yellow-400';
          } else {
            Icon = BatteryFull;
            colorClass = isActive ? 'bg-green-500/20 text-green-400' : 'text-zinc-500 hover:text-green-400';
          }

          return (
            <button
              key={level}
              onClick={() => onChange(level)}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-bold text-sm transition-all capitalize',
                colorClass
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="hidden sm:inline">{level}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
