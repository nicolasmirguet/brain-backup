export type TaskCategory = 'health' | 'exercise' | 'chores' | 'other';
export type TaskCycle = 'daily' | 'weekly' | 'monthly' | 'none';
export type EnergyLevel = 'brain dead' | 'functional' | 'superhero';
export type TaskStatus = 'pending' | 'done' | 'rescheduled' | 'given_up';
export type ScheduleType = 'precise' | 'loose';
export type LooseTimeframe = 'today' | 'this_week' | 'someday';
export type RecurrenceInterval = 'days' | 'weeks' | 'months';

export interface Recurrence {
  frequency: number;
  interval: RecurrenceInterval;
}

export interface Task {
  id: string;
  title: string;
  category: TaskCategory;
  cycle: TaskCycle;
  energyLevel: EnergyLevel;
  durationMinutes: number; // For the visual timer
  status: TaskStatus;
  subSteps?: string[];
  requiredItems?: string[];
  createdAt: number;
  scheduleType?: ScheduleType;
  looseTimeframe?: LooseTimeframe;
  scheduledDate?: string; // ISO string for precise
  recurrence?: Recurrence;
}

export interface ChecklistItem {
  id: string;
  text: string;
  isChecked: boolean;
}

export interface Checklist {
  id: string;
  title: string;
  items: ChecklistItem[];
}

export interface Essential {
  id: string;
  title: string;
  intervalMinutes: number; // 20 to 300
  nextDue: number; // timestamp
  hasNotified: boolean;
}

export const CATEGORY_COLORS: Record<TaskCategory, string> = {
  health: 'bg-[#39FF14] text-black', // Neon Green
  exercise: 'bg-[#00FFFF] text-black', // Electric Blue
  chores: 'bg-[#FF4500] text-white', // Sunset Orange
  other: 'bg-zinc-800 text-white',
};

export const CATEGORY_HEX_COLORS: Record<TaskCategory, string> = {
  health: '#39FF14',
  exercise: '#00FFFF',
  chores: '#FF4500',
  other: '#52525b', // zinc-600
};

export const CATEGORY_BORDER_COLORS: Record<TaskCategory, string> = {
  health: 'border-[#39FF14]',
  exercise: 'border-[#00FFFF]',
  chores: 'border-[#FF4500]',
  other: 'border-zinc-700',
};

export const ENERGY_LEVELS: EnergyLevel[] = ['brain dead', 'functional', 'superhero'];

export const FUNNY_GIVE_UP_MESSAGES = [
  "Not today, Satan.",
  "My brain has left the chat.",
  "I'll do it when I'm older and wiser.",
  "Error 404: Motivation not found.",
  "I'm allergic to this task.",
  "Nope. Just nope.",
  "Task failed successfully.",
  "I'd rather watch paint dry.",
];
