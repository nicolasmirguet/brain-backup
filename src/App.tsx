import React, { useState, useEffect, useRef } from 'react';
import { loadFromFirestore, saveToFirestore, auth, migrateLegacyUserData } from '@/lib/firebase';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { motion, AnimatePresence } from 'motion/react';
import { v4 as uuidv4 } from 'uuid';
import { Task, Checklist, EnergyLevel, Essential, type BrainDumpAiSnapshot } from '@/types';
import { TaskCard } from '@/components/TaskCard';
import { ChecklistCard } from '@/components/ChecklistCard';
import { EssentialCard } from '@/components/EssentialCard';
import { EnergyFilter } from '@/components/EnergyFilter';
import { DopamineCounter } from '@/components/DopamineCounter';
import { CreateTaskModal } from '@/components/CreateTaskModal';
import { EditTaskModal, type EditTaskSavePayload } from '@/components/EditTaskModal';
import { CreateEssentialModal } from '@/components/CreateEssentialModal';
import { CreateChecklistModal } from '@/components/CreateChecklistModal';
import { HistoryTab } from '@/components/HistoryTab';
import { DumpThoughtsModal } from '@/components/DumpThoughtsModal';
import { AppTour } from '@/components/AppTour';
import { AuthScreen } from '@/components/AuthScreen';
import { Plus, LayoutList, CheckSquare, BrainCircuit, Frown, Bell, Activity, CalendarClock, MessageSquare, Moon, RotateCcw, HelpCircle, LogOut, Brain, MoreHorizontal } from 'lucide-react';
import { playTimerAlert, primeAlertAudio } from '@/lib/alerts';
import { getEssentialIntervalMs } from '@/lib/essentialInterval';
import {
  ESSENTIAL_MUSIC_TRACKS,
  LINK_SESSION_MS,
  MIN_ALARM_MUSIC_MS,
  SILENT_ALARM_SESSION_MS,
  migrateEssentialMusicTheme,
  previewEssentialMusicTheme,
  type EssentialMusicTheme,
} from '@/lib/essentialMusic';

const INITIAL_TASKS: Task[] = [
  {
    id: uuidv4(),
    title: 'Take Meds',
    category: 'health',
    cycle: 'daily',
    energyLevel: 'brain dead',
    durationMinutes: 5,
    status: 'pending',
    createdAt: Date.now(),
  },
  {
    id: uuidv4(),
    title: 'Do a 15-minute stretch',
    category: 'exercise',
    cycle: 'daily',
    energyLevel: 'functional',
    durationMinutes: 15,
    status: 'pending',
    createdAt: Date.now(),
  },
  {
    id: uuidv4(),
    title: 'Deep Clean the Kitchen',
    category: 'chores',
    cycle: 'weekly',
    energyLevel: 'superhero',
    durationMinutes: 60,
    status: 'pending',
    createdAt: Date.now(),
  },
];

const INITIAL_CHECKLISTS: Checklist[] = [
  {
    id: 'desk-check',
    title: 'Desk Check',
    items: [
      { id: uuidv4(), text: 'Phone', isChecked: false },
      { id: uuidv4(), text: 'Water', isChecked: false },
      { id: uuidv4(), text: 'Buds', isChecked: false },
    ],
  },
  {
    id: 'exit-strategy',
    title: 'Exit Strategy',
    items: [
      { id: uuidv4(), text: 'Keys', isChecked: false },
      { id: uuidv4(), text: 'Stove Off', isChecked: false },
      { id: uuidv4(), text: 'Windows Locked', isChecked: false },
    ],
  },
  {
    id: 'kid-logistics',
    title: 'Kid Logistics',
    items: [
      { id: uuidv4(), text: 'Backpack', isChecked: false },
      { id: uuidv4(), text: 'Lunchbox', isChecked: false },
      { id: uuidv4(), text: 'Shoes (Both of them)', isChecked: false },
    ],
  },
];

const INITIAL_ESSENTIALS: Essential[] = [
  {
    id: uuidv4(),
    title: 'Drink Water',
    intervalMinutes: 90,
    nextDue: Date.now() + 90 * 60000,
    hasNotified: false,
    isActive: false,
    silent: false,
    reminderCount: 0,
  },
  {
    id: uuidv4(),
    title: 'Stretch / Stand',
    intervalMinutes: 60,
    nextDue: Date.now() + 60 * 60000,
    hasNotified: false,
    isActive: false,
    silent: false,
    reminderCount: 0,
  },
  {
    id: 'essential-test-20s',
    title: 'Test (20s provisional)',
    intervalMinutes: 5,
    intervalSeconds: 20,
    nextDue: Date.now() + 20_000,
    hasNotified: false,
    isActive: false,
    silent: false,
    reminderCount: 0,
  },
];

function parseBrainDumpAi(raw: unknown): BrainDumpAiSnapshot | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const summary = typeof o.summary === 'string' ? o.summary : '';
  const arr = Array.isArray(o.items) ? o.items : [];
  const items = arr
    .filter((x): x is Record<string, unknown> => !!x && typeof x === 'object')
    .map((i) => ({
      text: typeof i.text === 'string' ? i.text : '',
      isTask: Boolean(i.isTask),
      selected: i.selected !== false,
    }))
    .filter((i) => i.text.length > 0);
  if (!summary.trim() && items.length === 0) return null;
  return { summary, items };
}

function normalizeExternalUrl(raw?: string): string | undefined {
  const trimmed = raw?.trim();
  if (!trimmed) return undefined;
  const withProtocol = /^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const parsed = new URL(withProtocol);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return undefined;
    return parsed.toString();
  } catch {
    return undefined;
  }
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [tasks, setTasks] = useState<Task[]>(INITIAL_TASKS);
  const [checklists, setChecklists] = useState<Checklist[]>(INITIAL_CHECKLISTS);
  const [essentials, setEssentials] = useState<Essential[]>(INITIAL_ESSENTIALS);
  const [brainPoints, setBrainPoints] = useState<number>(0);
  const [essentialAlarmTheme, setEssentialAlarmTheme] = useState<EssentialMusicTheme>('calm');
  const loadedRef = useRef(false);
  const essentialAlarmThemeRef = useRef<EssentialMusicTheme>('calm');
  const autoOpenedDueLinkRef = useRef<Set<string>>(new Set());
  const essentialMusicAudioRef = useRef<HTMLAudioElement | null>(null);
  const essentialAlarmBatchIdsRef = useRef<string[] | null>(null);

  const [energyLevel, setEnergyLevel] = useState<EnergyLevel>('functional');
  const [activeTab, setActiveTab] = useState<'tasks' | 'launchpads' | 'essentials' | 'history'>('tasks');
  const [funnyMessage, setFunnyMessage] = useState<string | null>(null);
  const [timerAlert, setTimerAlert] = useState<string | null>(null);
  // No more "dismiss / open link" popups — triggers happen immediately.
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCreateEssentialModalOpen, setIsCreateEssentialModalOpen] = useState(false);
  const [isCreateChecklistModalOpen, setIsCreateChecklistModalOpen] = useState(false);
  const [isDumpThoughtsOpen, setIsDumpThoughtsOpen] = useState(false);
  const [dumpThoughts, setDumpThoughts] = useState('');
  const [dumpAiSnapshot, setDumpAiSnapshot] = useState<BrainDumpAiSnapshot | null>(null);
  const [brainDumpEmail, setBrainDumpEmail] = useState('');
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [tourOpen, setTourOpen] = useState(false);
  const [tourPromptOpen, setTourPromptOpen] = useState(false);
  const [headerMenuOpen, setHeaderMenuOpen] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (u) {
        await migrateLegacyUserData(u.uid);
      }
      setUser(u);
      setAuthReady(true);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!user) return;
    loadedRef.current = false;
    const uid = user.uid;
    Promise.all([
      loadFromFirestore<Task[]>('bb_tasks', INITIAL_TASKS, uid),
      loadFromFirestore<Checklist[]>('bb_checklists', INITIAL_CHECKLISTS, uid),
      loadFromFirestore<Essential[]>('bb_essentials', INITIAL_ESSENTIALS, uid),
      loadFromFirestore<number>('bb_points', 0, uid),
      loadFromFirestore<EssentialMusicTheme>('bb_essential_alarm_theme', 'calm', uid),
      loadFromFirestore<string>('bb_brain_dump_email', '', uid),
      loadFromFirestore<string>('bb_brain_dump_text', '', uid),
      loadFromFirestore<unknown>('bb_brain_dump_ai', null, uid),
      loadFromFirestore<boolean>('bb_tutorial_seen', false, uid),
    ]).then(([t, c, e, p, theme, email, dumpText, dumpAiRaw, seenTutorial]) => {
      const now = Date.now();
      const baseList = e ?? INITIAL_ESSENTIALS;
      const testTemplate = INITIAL_ESSENTIALS.find((x) => x.id === 'essential-test-20s');
      const merged =
        testTemplate && !baseList.some((x) => x.id === 'essential-test-20s')
          ? [...baseList, testTemplate]
          : baseList;
      const hydratedEssentials = merged.map((ess) => ({
        ...ess,
        isActive: false,
        reminderCount: 0,
        hasNotified: false,
        nextDue: now + getEssentialIntervalMs(ess),
        ringingUntil: undefined,
      }));
      setTasks(t);
      setChecklists(c);
      setEssentials(hydratedEssentials);
      setBrainPoints(p);
      const migratedTheme = migrateEssentialMusicTheme(theme);
      setEssentialAlarmTheme(migratedTheme);
      essentialAlarmThemeRef.current = migratedTheme;
      setBrainDumpEmail(typeof email === 'string' ? email : '');
      setDumpThoughts(typeof dumpText === 'string' ? dumpText : '');
      setDumpAiSnapshot(parseBrainDumpAi(dumpAiRaw));
      if (!seenTutorial) {
        setTourPromptOpen(true);
      }
      loadedRef.current = true;
    });
  }, [user]);

  useEffect(() => {
    if (!loadedRef.current || !user) return;
    void saveToFirestore('bb_tasks', tasks, user.uid);
  }, [tasks, user]);
  useEffect(() => {
    if (!loadedRef.current || !user) return;
    void saveToFirestore('bb_checklists', checklists, user.uid);
  }, [checklists, user]);
  useEffect(() => {
    if (!loadedRef.current || !user) return;
    void saveToFirestore('bb_essentials', essentials, user.uid);
  }, [essentials, user]);
  useEffect(() => {
    if (!loadedRef.current || !user) return;
    void saveToFirestore('bb_points', brainPoints, user.uid);
  }, [brainPoints, user]);
  useEffect(() => {
    if (!loadedRef.current || !user) return;
    void saveToFirestore('bb_essential_alarm_theme', essentialAlarmTheme, user.uid);
  }, [essentialAlarmTheme, user]);

  useEffect(() => {
    if (!loadedRef.current || !user) return;
    const t = window.setTimeout(() => {
      void saveToFirestore('bb_brain_dump_text', dumpThoughts, user.uid);
    }, 500);
    return () => window.clearTimeout(t);
  }, [dumpThoughts, user]);

  useEffect(() => {
    if (!loadedRef.current || !user) return;
    void saveToFirestore('bb_brain_dump_ai', dumpAiSnapshot, user.uid);
  }, [dumpAiSnapshot, user]);

  // Unlock audio on first tap — browsers block sound until user gesture.
  useEffect(() => {
    const warm = () => void primeAlertAudio();
    window.addEventListener('pointerdown', warm, { once: true });
    return () => window.removeEventListener('pointerdown', warm);
  }, []);

  useEffect(() => {
    essentialAlarmThemeRef.current = essentialAlarmTheme;
  }, [essentialAlarmTheme]);

  useEffect(() => {
    const stopEssentialMusicPlayback = () => {
      const a = essentialMusicAudioRef.current;
      if (a) {
        a.pause();
        a.src = '';
        essentialMusicAudioRef.current = null;
      }
    };

    const finishAlarmBatchFromAudio = (ids: string[]) => {
      stopEssentialMusicPlayback();
      essentialAlarmBatchIdsRef.current = null;
      setEssentials(prev =>
        prev.map(e => {
          if (!ids.includes(e.id) || !e.ringingUntil) return e;
          return {
            ...e,
            ringingUntil: undefined,
            nextDue: Date.now() + getEssentialIntervalMs(e),
            hasNotified: false,
            reminderCount: 0,
          };
        }),
      );
    };

    const runEssentialCheck = () => {
      if (!loadedRef.current) return;
      setEssentials(prev => {
        const now = Date.now();
        const toStart = prev.filter(
          e => e.isActive !== false && now >= e.nextDue && !e.ringingUntil,
        );

        if (toStart.length > 0) {
          const alarmNonSilent = toStart.filter(
            e => (e.triggerMode ?? 'alarm') === 'alarm' && !e.silent,
          );
          queueMicrotask(() => {
            if (alarmNonSilent.length > 0) {
              essentialAlarmBatchIdsRef.current = alarmNonSilent.map(e => e.id);
              const theme = essentialAlarmThemeRef.current;
              const { url } = ESSENTIAL_MUSIC_TRACKS[theme];
              const audio = new Audio(url);
              essentialMusicAudioRef.current = audio;

              const applySessionMs = (sessionMs: number) => {
                const end = Date.now() + sessionMs;
                setEssentials(p =>
                  p.map(e =>
                    essentialAlarmBatchIdsRef.current?.includes(e.id)
                      ? { ...e, ringingUntil: end, nextDue: end, hasNotified: true }
                      : e,
                  ),
                );
              };

              audio.addEventListener('loadedmetadata', () => {
                const sec = Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : 120;
                const sessionMs = Math.max(sec * 1000, MIN_ALARM_MUSIC_MS);
                applySessionMs(sessionMs);
              });
              audio.addEventListener('ended', () => {
                const ids = essentialAlarmBatchIdsRef.current;
                if (!ids?.length) return;
                finishAlarmBatchFromAudio(ids);
              });
              audio.addEventListener('error', () => {
                applySessionMs(MIN_ALARM_MUSIC_MS);
              });
              void audio.play().catch(() => {
                applySessionMs(MIN_ALARM_MUSIC_MS);
              });

              const msg =
                alarmNonSilent.length === 1
                  ? `Essential Due: ${alarmNonSilent[0].title}!`
                  : `Essentials Due: ${alarmNonSilent.map(e => e.title).join(', ')}!`;
              setTimerAlert(msg);
              setTimeout(() => setTimerAlert(null), 12_000);
            }

            const linkItems = toStart.filter(
              e => (e.triggerMode ?? 'alarm') === 'link' && !e.silent,
            );
            for (const linked of linkItems) {
              const openUrl = normalizeExternalUrl(linked.mediaUrl ?? linked.spotifyUrl);
              if (openUrl) {
                const openKey = `${linked.id}:${linked.nextDue}`;
                if (!autoOpenedDueLinkRef.current.has(openKey)) {
                  autoOpenedDueLinkRef.current.add(openKey);
                  window.open(openUrl, '_blank', 'noopener,noreferrer');
                }
              }
            }
          });
        }

        let stoppedBatchAudio = false;
        return prev.map(e => {
          if (e.isActive === false) {
            return { ...e, ringingUntil: undefined };
          }

          if (e.ringingUntil && now >= e.ringingUntil) {
            const batch = essentialAlarmBatchIdsRef.current;
            if (batch?.includes(e.id) && !stoppedBatchAudio) {
              stoppedBatchAudio = true;
              stopEssentialMusicPlayback();
              essentialAlarmBatchIdsRef.current = null;
            }
            return {
              ...e,
              ringingUntil: undefined,
              nextDue: now + getEssentialIntervalMs(e),
              hasNotified: false,
              reminderCount: 0,
            };
          }

          if (!e.ringingUntil && now >= e.nextDue) {
            if ((e.triggerMode ?? 'alarm') === 'alarm' && e.silent) {
              const end = now + SILENT_ALARM_SESSION_MS;
              return { ...e, ringingUntil: end, nextDue: end, hasNotified: true };
            }
            if ((e.triggerMode ?? 'alarm') === 'link') {
              const end = now + LINK_SESSION_MS;
              return { ...e, ringingUntil: end, nextDue: end, hasNotified: true };
            }
            if ((e.triggerMode ?? 'alarm') === 'alarm' && !e.silent) {
              const end = now + MIN_ALARM_MUSIC_MS;
              return { ...e, ringingUntil: end, nextDue: end, hasNotified: true };
            }
          }

          return e;
        });
      });
    };

    const interval = setInterval(runEssentialCheck, 1000);
    const onVis = () => {
      if (document.visibilityState === 'visible') runEssentialCheck();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVis);
      stopEssentialMusicPlayback();
    };
  }, []);

  // Filter tasks based on energy level
  const visibleTasks = tasks.filter(task => {
    if (task.status !== 'pending') return false;
    if (energyLevel === 'brain dead') {
      return task.energyLevel === 'brain dead';
    }
    if (energyLevel === 'functional') {
      return task.energyLevel === 'brain dead' || task.energyLevel === 'functional';
    }
    return true; // superhero sees all
  });

  const handleTimerComplete = (title: string) => {
    setTimerAlert(`Time's up for: ${title}!`);
    setTimeout(() => setTimerAlert(null), 5000);
  };

  const handleResetBrainPoints = () => {
    const ok = window.confirm('Reset Brain Points back to 0?');
    if (!ok) return;
    setBrainPoints(0);
  };

  const handleCompleteTask = (id: string) => {
    setTasks(prevTasks => {
      const task = prevTasks.find(t => t.id === id);
      if (!task) return prevTasks;

      const updatedTasks = prevTasks.map(t => t.id === id ? { ...t, status: 'done' as const } : t);

      if (task.recurrence) {
        // Guard: don't spawn if a pending task with the same title already exists
        const alreadyExists = prevTasks.some(
          t => t.id !== id && t.title === task.title && t.status === 'pending'
        );
        if (alreadyExists) return updatedTasks;

        const nextDate = new Date();
        if (task.scheduledDate) {
          nextDate.setTime(new Date(task.scheduledDate).getTime());
        }
        
        switch (task.recurrence.interval) {
          case 'days':
            nextDate.setDate(nextDate.getDate() + task.recurrence.frequency);
            break;
          case 'weeks':
            nextDate.setDate(nextDate.getDate() + (task.recurrence.frequency * 7));
            break;
          case 'months':
            nextDate.setMonth(nextDate.getMonth() + task.recurrence.frequency);
            break;
        }

        const nextTask: Task = {
          ...task,
          id: uuidv4(),
          status: 'pending',
          createdAt: Date.now(),
          scheduledDate: task.scheduleType === 'precise' ? nextDate.toISOString() : undefined,
        };

        return [nextTask, ...updatedTasks];
      }

      return updatedTasks;
    });
    setBrainPoints(prev => prev + 10);
  };

  const handleDeleteTask = (id: string) => {
    setTasks(tasks.filter(t => t.id !== id));
  };

  const handleRescheduleTask = (id: string) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, status: 'rescheduled' } : t));
  };

  const handleGiveUpTask = (id: string, message: string) => {
    setFunnyMessage(message);
    setTasks(tasks.map(t => t.id === id ? { ...t, status: 'given_up' } : t));
  };

  const handleApplyAI = (id: string, subSteps: string[], requiredItems: string[]) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, subSteps, requiredItems } : t));
  };

  const handleUpdateChecklist = (updatedChecklist: Checklist) => {
    setChecklists(checklists.map(c => c.id === updatedChecklist.id ? updatedChecklist : c));
  };

  const handleCreateChecklist = (newChecklist: Checklist) => {
    setChecklists([newChecklist, ...checklists]);
  };

  const handleDeleteChecklist = (id: string) => {
    setChecklists(checklists.filter(c => c.id !== id));
  };

  const handleCreateTask = (newTask: Task) => {
    setTasks([newTask, ...tasks]);
  };

  const handleSaveTaskEdits = (payload: EditTaskSavePayload) => {
    setTasks(prev =>
      prev.map(t =>
        t.id === payload.id
          ? {
              ...t,
              title: payload.title,
              energyLevel: payload.energyLevel,
              category: payload.category,
              durationMinutes: payload.durationMinutes,
              scheduleType: payload.scheduleType,
              looseTimeframe: payload.looseTimeframe,
              scheduledDate: payload.scheduledDate,
              recurrence: payload.recurrence,
            }
          : t,
      ),
    );
  };

  const handleCreateEssential = (newEssential: Essential) => {
    setEssentials([
      {
        ...newEssential,
        mediaUrl: normalizeExternalUrl(newEssential.mediaUrl ?? newEssential.spotifyUrl),
        spotifyUrl: undefined,
        triggerMode: newEssential.triggerMode ?? 'alarm',
      },
      ...essentials,
    ]);
  };

  const handleUpdateEssential = (updated: Essential) => {
    setEssentials(
      essentials.map(e =>
        e.id === updated.id
          ? {
              ...updated,
              mediaUrl: normalizeExternalUrl(updated.mediaUrl ?? updated.spotifyUrl),
              spotifyUrl: undefined,
              triggerMode: updated.triggerMode ?? 'alarm',
            }
          : e,
      ),
    );
  };

  const handleDeleteEssential = (id: string) => {
    setEssentials(essentials.filter(e => e.id !== id));
  };

  const handlePersistBrainDumpEmail = (email: string) => {
    setBrainDumpEmail(email);
    if (loadedRef.current && user) void saveToFirestore('bb_brain_dump_email', email, user.uid);
  };

  const handleFreshBrainDump = () => {
    setDumpThoughts('');
    setDumpAiSnapshot(null);
  };

  const handleTourComplete = () => {
    if (loadedRef.current && user) void saveToFirestore('bb_tutorial_seen', true, user.uid);
  };

  const handleStartTour = () => {
    setTourPromptOpen(false);
    setTourOpen(true);
  };

  const handleSkipTour = () => {
    setTourPromptOpen(false);
    if (loadedRef.current && user) void saveToFirestore('bb_tutorial_seen', true, user.uid);
  };

  const handleRestartEssential = (id: string) => {
    setEssentials(essentials.map(e => {
      if (e.id === id) {
        return {
          ...e,
          nextDue: Date.now() + getEssentialIntervalMs(e),
          hasNotified: false,
          reminderCount: 0,
          ringingUntil: undefined,
        };
      }
      return e;
    }));
  };

  useEffect(() => {
    if (!headerMenuOpen) return;
    const close = () => setHeaderMenuOpen(false);
    window.addEventListener('pointerdown', close);
    return () => window.removeEventListener('pointerdown', close);
  }, [headerMenuOpen]);

  if (!authReady) {
    return (
      <div className="min-h-screen bg-black text-zinc-500 flex items-center justify-center font-bold uppercase tracking-widest text-sm">
        Loading…
      </div>
    );
  }

  if (!user) {
    return <AuthScreen />;
  }

  return (
    <div className="min-h-screen bg-black text-white font-sans pb-24">
      <header className="pt-12 pb-6 px-6 sticky top-0 bg-black/80 backdrop-blur-md z-40 border-b border-zinc-900">
        <div className="max-w-3xl mx-auto flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0" data-tour="header-title">
            <div className="bg-indigo-600 p-2 rounded-xl hidden sm:block flex-shrink-0">
              <BrainCircuit className="w-8 h-8 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight uppercase leading-tight">Brain Backup</h1>
              <p className="text-zinc-500 text-xs sm:text-sm font-bold tracking-widest uppercase mt-1">ADHD Assistant</p>
            </div>
          </div>
          <div className="flex items-center flex-wrap justify-end gap-2">
            <button
              type="button"
              data-tour="tour-help"
              onClick={() => setTourOpen(true)}
              className="h-10 w-10 bg-zinc-900 hover:bg-zinc-800 rounded-full text-zinc-400 hover:text-indigo-400 transition-colors border border-zinc-800 flex items-center justify-center"
              title="Quick tutorial (~45s)"
            >
              <HelpCircle className="w-5 h-5" />
            </button>
            <button
              type="button"
              data-tour="brain-dump"
              onClick={() => setIsDumpThoughtsOpen(true)}
              className="h-10 px-3.5 rounded-xl bg-indigo-600/20 border border-indigo-500/45 text-indigo-200 hover:bg-indigo-600/30 hover:text-white transition-colors shadow-[0_0_14px_rgba(99,102,241,0.3)] flex items-center gap-2"
              title="Brain Dump"
            >
              <Brain className="w-5 h-5" />
              <span className="text-xs font-black uppercase tracking-wider">Brain Dump</span>
            </button>
            <div className="flex items-center gap-2" data-tour="brain-points">
              <DopamineCounter points={brainPoints} />
              <div className="relative">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setHeaderMenuOpen(v => !v);
                  }}
                  className="h-10 w-10 bg-zinc-900 hover:bg-zinc-800 rounded-full text-zinc-500 hover:text-zinc-300 transition-colors border border-zinc-800 flex items-center justify-center"
                  title="More actions"
                >
                  <MoreHorizontal className="w-4 h-4" />
                </button>
                {headerMenuOpen && (
                  <div
                    className="absolute right-0 mt-2 w-48 rounded-xl border border-zinc-800 bg-zinc-950/95 shadow-2xl p-1 z-50"
                    onPointerDown={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        void playTimerAlert();
                        setHeaderMenuOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg text-sm font-bold text-zinc-300 hover:bg-zinc-800 flex items-center gap-2"
                    >
                      <Bell className="w-4 h-4" /> Test timer alert
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        handleResetBrainPoints();
                        setHeaderMenuOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg text-sm font-bold text-zinc-300 hover:bg-zinc-800 flex items-center gap-2"
                    >
                      <RotateCcw className="w-4 h-4" /> Reset brain points
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setHeaderMenuOpen(false);
                        void signOut(auth);
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg text-sm font-bold text-red-300 hover:bg-zinc-800 flex items-center gap-2"
                    >
                      <LogOut className="w-4 h-4" /> Sign out
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8">
        <AnimatePresence>
          {timerAlert && (
            <motion.div
              initial={{ opacity: 0, y: -20, x: '-50%' }}
              animate={{ opacity: 1, y: 0, x: '-50%' }}
              exit={{ opacity: 0, y: -20, x: '-50%' }}
              className="fixed top-24 left-1/2 z-50 bg-indigo-600 text-white px-6 py-4 rounded-2xl shadow-[0_0_30px_rgba(79,70,229,0.5)] font-black uppercase tracking-widest flex items-center gap-3"
            >
              <Bell className="w-6 h-6 animate-bounce" />
              {timerAlert}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Link triggers open immediately; no dismissable popup needed. */}

        <AnimatePresence>
          {funnyMessage && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="bg-zinc-900 border-2 border-red-500 rounded-2xl p-8 max-w-sm w-full text-center shadow-[0_0_30px_rgba(239,68,68,0.2)]"
              >
                <div className="flex justify-center mb-4">
                  <div className="bg-red-500/20 p-4 rounded-full">
                    <Frown className="w-12 h-12 text-red-500" />
                  </div>
                </div>
                <h2 className="text-2xl font-black text-white mb-2 uppercase tracking-tight">Task Abandoned</h2>
                <p className="text-zinc-400 mb-6 font-medium">{funnyMessage}</p>
                <button
                  onClick={() => setFunnyMessage(null)}
                  className="w-full bg-red-500 hover:bg-red-400 text-black font-black uppercase tracking-widest py-3 px-6 rounded-xl transition-colors"
                >
                  Fair Enough
                </button>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <CreateTaskModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onCreate={handleCreateTask}
          existingTasks={tasks}
        />

        <EditTaskModal
          isOpen={!!editingTask}
          task={editingTask}
          existingTasks={tasks}
          onClose={() => setEditingTask(null)}
          onSave={handleSaveTaskEdits}
        />

        <CreateEssentialModal
          isOpen={isCreateEssentialModalOpen}
          onClose={() => setIsCreateEssentialModalOpen(false)}
          onCreate={handleCreateEssential}
        />

        <CreateChecklistModal
          isOpen={isCreateChecklistModalOpen}
          onClose={() => setIsCreateChecklistModalOpen(false)}
          onCreate={handleCreateChecklist}
        />

        <AppTour
          isOpen={tourOpen}
          onClose={() => setTourOpen(false)}
          onComplete={handleTourComplete}
          activeTab={activeTab}
          navigateToTab={setActiveTab}
        />

        <AnimatePresence>
          {tourPromptOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[95] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
            >
              <motion.div
                initial={{ y: 12, opacity: 0, scale: 0.98 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ y: 8, opacity: 0, scale: 0.98 }}
                className="w-full max-w-md rounded-2xl border border-zinc-700 bg-zinc-950 p-5 shadow-2xl"
              >
                <p className="text-xs font-black uppercase tracking-widest text-indigo-400 mb-2">Quick setup</p>
                <h3 className="text-lg font-black uppercase tracking-tight text-white">Start the 45s app tour?</h3>
                <p className="mt-2 text-sm text-zinc-400">
                  It points at real buttons so you can learn the app fast.
                </p>
                <div className="mt-5 flex gap-2">
                  <button
                    type="button"
                    onClick={handleSkipTour}
                    className="flex-1 rounded-xl border border-zinc-700 bg-zinc-900 py-2.5 text-sm font-black uppercase tracking-wider text-zinc-300 hover:bg-zinc-800"
                  >
                    No thanks
                  </button>
                  <button
                    type="button"
                    onClick={handleStartTour}
                    className="flex-1 rounded-xl bg-indigo-600 py-2.5 text-sm font-black uppercase tracking-wider text-white hover:bg-indigo-500"
                  >
                    Yes, start
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <DumpThoughtsModal
          isOpen={isDumpThoughtsOpen}
          onClose={() => setIsDumpThoughtsOpen(false)}
          thoughts={dumpThoughts}
          onChange={setDumpThoughts}
          aiSnapshot={dumpAiSnapshot}
          onPersistAi={setDumpAiSnapshot}
          onClearAi={() => setDumpAiSnapshot(null)}
          onFreshStart={handleFreshBrainDump}
          onCreateTasks={(newTasks) => setTasks(prev => [...newTasks, ...prev])}
          savedEmail={brainDumpEmail}
          onPersistEmail={handlePersistBrainDumpEmail}
        />

        <div className="flex gap-2 mb-8 overflow-x-auto pb-2 hide-scrollbar" data-tour="main-tabs">
          <button
            type="button"
            data-tour="tab-tasks"
            onClick={() => setActiveTab('tasks')}
            className={`flex-1 min-w-[120px] py-4 px-4 rounded-2xl font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
              activeTab === 'tasks' 
                ? 'bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.2)]' 
                : 'bg-zinc-900 text-zinc-500 hover:bg-zinc-800'
            }`}
          >
            <LayoutList className="w-5 h-5" /> Tasks
          </button>
          <button
            type="button"
            data-tour="tab-launchpads"
            onClick={() => setActiveTab('launchpads')}
            className={`flex-1 min-w-[140px] py-4 px-4 rounded-2xl font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
              activeTab === 'launchpads' 
                ? 'bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.2)]' 
                : 'bg-zinc-900 text-zinc-500 hover:bg-zinc-800'
            }`}
          >
            <CheckSquare className="w-5 h-5" /> Launchpads
          </button>
          <button
            type="button"
            data-tour="tab-essentials"
            onClick={() => setActiveTab('essentials')}
            className={`flex-1 min-w-[140px] py-4 px-4 rounded-2xl font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
              activeTab === 'essentials' 
                ? 'bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.2)]' 
                : 'bg-zinc-900 text-zinc-500 hover:bg-zinc-800'
            }`}
          >
            <Activity className="w-5 h-5" /> Essentials
          </button>
        </div>

        <AnimatePresence mode="wait">
          {activeTab === 'tasks' ? (
            <motion.div
              key="tasks"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
            >
              <div className="flex items-end justify-between mb-6 gap-4">
                <div className="flex-1" data-tour="energy-filter">
                  <EnergyFilter currentLevel={energyLevel} onChange={setEnergyLevel} />
                </div>
                <button
                  type="button"
                  data-tour="add-task"
                  onClick={() => setIsCreateModalOpen(true)}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 rounded-xl transition-colors shadow-[0_0_15px_rgba(79,70,229,0.3)] flex items-center justify-center gap-2 h-[54px]"
                >
                  <Plus className="w-5 h-5" />
                  <span className="font-black uppercase tracking-wider text-sm whitespace-nowrap">Add Task</span>
                </button>
              </div>
              
              <div className="space-y-4">
                <AnimatePresence>
                  {visibleTasks.length === 0 ? (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-center py-12 bg-zinc-900/50 rounded-2xl border border-zinc-800 border-dashed"
                    >
                      <p className="text-zinc-500 font-bold uppercase tracking-widest">No tasks for this energy level.</p>
                      <p className="text-zinc-600 text-sm mt-2">Go take a nap or something.</p>
                    </motion.div>
                  ) : (
                    visibleTasks.map(task => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        onComplete={handleCompleteTask}
                        onReschedule={handleRescheduleTask}
                        onGiveUp={handleGiveUpTask}
                        onDelete={handleDeleteTask}
                        onApplyAI={handleApplyAI}
                        onTimerComplete={handleTimerComplete}
                        onEdit={setEditingTask}
                      />
                    ))
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          ) : activeTab === 'launchpads' ? (
            <motion.div
              key="launchpads"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              data-tour="launchpads-section"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="text-zinc-400 font-bold uppercase tracking-widest text-sm">
                  Your Launchpads
                </div>
                <button
                  onClick={() => setIsCreateChecklistModalOpen(true)}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-3 rounded-xl transition-colors shadow-[0_0_15px_rgba(79,70,229,0.3)] flex items-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  <span className="font-black uppercase tracking-wider text-sm whitespace-nowrap">Add List</span>
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {checklists.map(checklist => (
                  <ChecklistCard
                    key={checklist.id}
                    checklist={checklist}
                    onUpdate={handleUpdateChecklist}
                    onDelete={handleDeleteChecklist}
                  />
                ))}
              </div>
            </motion.div>
          ) : activeTab === 'essentials' ? (
            <motion.div
              key="essentials"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <div className="flex items-center justify-between mb-6">
                <div className="text-zinc-400 font-bold uppercase tracking-widest text-sm">
                  Recurring daily needs
                </div>
                <button
                  type="button"
                  onClick={() => setIsCreateEssentialModalOpen(true)}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-3 rounded-xl transition-colors shadow-[0_0_15px_rgba(79,70,229,0.3)] flex items-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  <span className="font-black uppercase tracking-wider text-sm whitespace-nowrap">Add Essential</span>
                </button>
              </div>
              <div className="mb-4 rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4" data-tour="essentials-alarm">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-black uppercase tracking-wider text-zinc-200">Alarm music</p>
                    <p className="text-xs text-zinc-500 mt-1">
                      Calm, rock, techno, and zen use real genre-matched tracks (about 3+ min). When the track ends, the timer restarts. Link mode uses a 5-minute estimate for YouTube.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={essentialAlarmTheme}
                      onChange={(e) => setEssentialAlarmTheme(e.target.value as EssentialMusicTheme)}
                      className="bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-sm font-bold text-white focus:outline-none focus:border-indigo-500"
                    >
                      <option value="calm">Calm</option>
                      <option value="rock">Rock</option>
                      <option value="techno">Techno</option>
                      <option value="zen">Zen</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => previewEssentialMusicTheme(essentialAlarmTheme)}
                      className="rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 px-3 py-2 text-sm font-black uppercase tracking-wider text-zinc-200"
                      title="Test essential alarm"
                    >
                      Test
                    </button>
                  </div>
                </div>
                <p className="text-[10px] text-zinc-600 mt-3 border-t border-zinc-800/80 pt-2 leading-relaxed">
                  {ESSENTIAL_MUSIC_TRACKS[essentialAlarmTheme].description}: {ESSENTIAL_MUSIC_TRACKS[essentialAlarmTheme].credit}
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <AnimatePresence>
                  {essentials.map(essential => (
                    <EssentialCard
                      key={essential.id}
                      essential={essential}
                      onUpdate={handleUpdateEssential}
                      onDelete={handleDeleteEssential}
                      onRestart={handleRestartEssential}
                    />
                  ))}
                </AnimatePresence>
              </div>
            </motion.div>
          ) : (
            <HistoryTab
              key="history"
              tasks={tasks}
              dumpThoughts={dumpThoughts}
              onAddTasks={(newTasks) => setTasks([...newTasks, ...tasks])}
            />
          )}
        </AnimatePresence>
      </main>

      <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black via-black/90 to-transparent z-40 pointer-events-none">
        <div className="max-w-3xl mx-auto pointer-events-auto">
          <button
            type="button"
            data-tour="history-bar"
            onClick={() => setActiveTab('history')}
            className={`w-full py-4 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-3 transition-all shadow-2xl ${
              activeTab === 'history'
                ? 'bg-white text-black shadow-[0_0_30px_rgba(255,255,255,0.3)]'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-[0_0_20px_rgba(79,70,229,0.4)]'
            }`}
          >
            {activeTab === 'history' ? (
              <><CalendarClock className="w-6 h-6" /> History View Active</>
            ) : (
              <><Moon className="w-6 h-6" /> End of Day / History</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
