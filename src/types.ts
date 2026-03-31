export type TaskCategory = 'urgent' | 'work' | 'health' | 'exercise' | 'chores' | 'other';
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
  intervalMinutes: number; // 5 to 300
  nextDue: number; // timestamp
  hasNotified: boolean;
  /** Optional external media URL (e.g. YouTube) shown when this essential is due */
  mediaUrl?: string;
  /** Legacy field kept for backward compatibility with already-saved data */
  spotifyUrl?: string;
  /** When false, timer is effectively paused */
  isActive?: boolean;
  /** When true, no sound/link auto-open; only visual due state */
  silent?: boolean;
  /** How many reminder pings since last full cycle */
  reminderCount?: number;
}

export const CATEGORY_COLORS: Record<TaskCategory, string> = {
  urgent: 'bg-[#EF4444] text-white', // Red
  work: 'bg-[#3B82F6] text-white', // Blue
  health: 'bg-[#22C55E] text-black', // Green
  exercise: 'bg-[#F97316] text-black', // Orange
  chores: 'bg-[#A855F7] text-white', // Purple
  other: 'bg-[#14B8A6] text-black', // Teal
};

export const CATEGORY_HEX_COLORS: Record<TaskCategory, string> = {
  urgent: '#EF4444',
  work: '#3B82F6',
  health: '#22C55E',
  exercise: '#F97316',
  chores: '#A855F7',
  other: '#14B8A6',
};

export const CATEGORY_BORDER_COLORS: Record<TaskCategory, string> = {
  urgent: 'border-[#EF4444]',
  work: 'border-[#3B82F6]',
  health: 'border-[#22C55E]',
  exercise: 'border-[#F97316]',
  chores: 'border-[#A855F7]',
  other: 'border-[#14B8A6]',
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
