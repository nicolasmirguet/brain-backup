import React, { useState, useEffect, useRef } from 'react';
import { loadFromFirestore, saveToFirestore, auth, migrateLegacyUserData } from '@/lib/firebase';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { motion, AnimatePresence } from 'motion/react';
import { v4 as uuidv4 } from 'uuid';
import { Task, Checklist, EnergyLevel, Essential } from '@/types';
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
import { Plus, LayoutList, CheckSquare, BrainCircuit, Frown, Bell, Activity, CalendarClock, MessageSquare, Moon, RotateCcw, HelpCircle, LogOut, Brain } from 'lucide-react';
import { playTimerAlert, playEssentialAlarm, primeAlertAudio, type EssentialAlarmTheme } from '@/lib/alerts';
import {
  notificationsSupported,
  requestEssentialNotificationPermission,
  showEssentialDueNotification,
} from '@/lib/notifications';

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
    hasNotified: false
  },
  {
    id: uuidv4(),
    title: 'Stretch / Stand',
    intervalMinutes: 60,
    nextDue: Date.now() + 60 * 60000,
    hasNotified: false
  }
];

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
  const [essentialAlarmTheme, setEssentialAlarmTheme] = useState<EssentialAlarmTheme>('alarm');
  const loadedRef = useRef(false);
  const essentialAlarmThemeRef = useRef<EssentialAlarmTheme>('alarm');

  const [energyLevel, setEnergyLevel] = useState<EnergyLevel>('functional');
  const [activeTab, setActiveTab] = useState<'tasks' | 'launchpads' | 'essentials' | 'history'>('tasks');
  const [funnyMessage, setFunnyMessage] = useState<string | null>(null);
  const [timerAlert, setTimerAlert] = useState<string | null>(null);
  const [spotifyAlarm, setSpotifyAlarm] = useState<{ url: string; title: string } | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCreateEssentialModalOpen, setIsCreateEssentialModalOpen] = useState(false);
  const [isCreateChecklistModalOpen, setIsCreateChecklistModalOpen] = useState(false);
  const [isDumpThoughtsOpen, setIsDumpThoughtsOpen] = useState(false);
  const [dumpThoughts, setDumpThoughts] = useState('');
  const [brainDumpEmail, setBrainDumpEmail] = useState('');
  const [, setNotifBump] = useState(0);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [tourOpen, setTourOpen] = useState(false);
  const [tourPromptOpen, setTourPromptOpen] = useState(false);

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
      loadFromFirestore<EssentialAlarmTheme>('bb_essential_alarm_theme', 'alarm', uid),
      loadFromFirestore<string>('bb_brain_dump_email', '', uid),
      loadFromFirestore<boolean>('bb_tutorial_seen', false, uid),
    ]).then(([t, c, e, p, theme, email, seenTutorial]) => {
      setTasks(t);
      setChecklists(c);
      setEssentials(e);
      setBrainPoints(p);
      setEssentialAlarmTheme(theme);
      essentialAlarmThemeRef.current = theme;
      setBrainDumpEmail(typeof email === 'string' ? email : '');
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
    const runEssentialCheck = () => {
      if (!loadedRef.current) return;
      setEssentials(prev => {
        const now = Date.now();
        const dueItems = prev.filter(e => now >= e.nextDue && !e.hasNotified);
        if (dueItems.length === 0) return prev;
        const ids = new Set(dueItems.map(e => e.id));
        queueMicrotask(() => {
          void playEssentialAlarm(essentialAlarmThemeRef.current);
          showEssentialDueNotification(dueItems.map(e => e.title));
          const msg =
            dueItems.length === 1
              ? `Essential Due: ${dueItems[0].title}!`
              : `Essentials Due: ${dueItems.map(e => e.title).join(', ')}!`;
          setTimerAlert(msg);
          setTimeout(() => setTimerAlert(null), 12000);
          const linked = dueItems.find((e) => normalizeExternalUrl(e.spotifyUrl));
          if (linked) {
            const openUrl = normalizeExternalUrl(linked.spotifyUrl);
            if (openUrl) setSpotifyAlarm({ url: openUrl, title: linked.title });
            setTimeout(() => setSpotifyAlarm(null), 90_000);
          }
        });
        return prev.map(e => (ids.has(e.id) ? { ...e, hasNotified: true } : e));
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
        spotifyUrl: normalizeExternalUrl(newEssential.spotifyUrl),
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
              spotifyUrl: normalizeExternalUrl(updated.spotifyUrl),
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

  const handleDoneEssential = (id: string) => {
    setEssentials(essentials.map(e => {
      if (e.id === id) {
        return {
          ...e,
          nextDue: Date.now() + e.intervalMinutes * 60000,
          hasNotified: false
        };
      }
      return e;
    }));
    setBrainPoints(prev => prev + 5); // Small dopamine hit for essentials
  };

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
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-xl hidden sm:block">
              <BrainCircuit className="w-8 h-8 text-white" />
            </div>
            <div data-tour="header-title">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight uppercase">Brain Backup</h1>
                <div className="flex items-center gap-2">
                  <button 
                    type="button"
                    data-tour="tour-help"
                    onClick={() => setTourOpen(true)}
                    className="p-2 bg-zinc-900 hover:bg-zinc-800 rounded-full text-zinc-400 hover:text-indigo-400 transition-colors border border-zinc-800"
                    title="Quick tutorial (~45s)"
                  >
                    <HelpCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>
                  <button
                    type="button"
                    data-tour="brain-dump"
                    onClick={() => setIsDumpThoughtsOpen(true)}
                    className="h-9 sm:h-10 px-3 sm:px-3.5 rounded-xl bg-indigo-600/20 border border-indigo-500/45 text-indigo-200 hover:bg-indigo-600/30 hover:text-white transition-colors shadow-[0_0_14px_rgba(99,102,241,0.3)] flex items-center gap-2"
                    title="Brain Dump"
                  >
                    <Brain className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider">Brain Dump</span>
                  </button>
                  <button 
                    type="button"
                    onClick={() => void playTimerAlert()}
                    className="p-2 bg-zinc-900 hover:bg-zinc-800 rounded-full text-zinc-400 hover:text-indigo-400 transition-colors border border-zinc-800"
                    title="Test Timer Alert"
                  >
                    <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>
                </div>
              </div>
              <p className="text-zinc-500 text-xs sm:text-sm font-bold tracking-widest uppercase mt-1">ADHD Assistant</p>
            </div>
          </div>
          <div className="flex items-center">
            <div className="flex items-center gap-2" data-tour="brain-points">
              <DopamineCounter points={brainPoints} />
              <button
                type="button"
                onClick={handleResetBrainPoints}
                className="p-2 bg-zinc-900 hover:bg-zinc-800 rounded-full text-zinc-500 hover:text-yellow-300 transition-colors border border-zinc-800"
                title="Reset Brain Points"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => void signOut(auth)}
                className="p-2 bg-zinc-900 hover:bg-zinc-800 rounded-full text-zinc-500 hover:text-red-400 transition-colors border border-zinc-800"
                title="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
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

        <AnimatePresence>
          {spotifyAlarm && (
            <motion.div
              initial={{ opacity: 0, y: 16, x: '-50%' }}
              animate={{ opacity: 1, y: 0, x: '-50%' }}
              exit={{ opacity: 0, y: 16, x: '-50%' }}
              className="fixed bottom-28 left-1/2 z-[55] flex flex-col items-center gap-2 rounded-2xl border border-green-500/40 bg-zinc-900/95 px-5 py-4 shadow-[0_0_30px_rgba(34,197,94,0.25)] max-w-[90vw]"
            >
              <p className="text-xs font-black uppercase tracking-widest text-green-400">Essential playlist</p>
              <p className="text-sm font-bold text-white text-center">{spotifyAlarm.title}</p>
              <a
                href={spotifyAlarm.url}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-xl bg-green-600 px-4 py-2 text-sm font-black uppercase tracking-wider text-white hover:bg-green-500"
              >
                Open in Spotify
              </a>
              <button
                type="button"
                onClick={() => setSpotifyAlarm(null)}
                className="text-xs text-zinc-500 hover:text-zinc-300 font-bold uppercase"
              >
                Dismiss
              </button>
            </motion.div>
          )}
        </AnimatePresence>

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
                    <p className="text-sm font-black uppercase tracking-wider text-zinc-200">Alarm sound</p>
                    <p className="text-xs text-zinc-500 mt-1">Pick a vibe for essential reminders.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={essentialAlarmTheme}
                      onChange={(e) => setEssentialAlarmTheme(e.target.value as EssentialAlarmTheme)}
                      className="bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-sm font-bold text-white focus:outline-none focus:border-indigo-500"
                    >
                      <option value="alarm">Alarm</option>
                      <option value="chill">Chill</option>
                      <option value="funny">Funny</option>
                      <option value="scifi">Sci‑fi</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => void playEssentialAlarm(essentialAlarmTheme)}
                      className="rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 px-3 py-2 text-sm font-black uppercase tracking-wider text-zinc-200"
                      title="Test essential alarm"
                    >
                      Test
                    </button>
                  </div>
                </div>
                <p className="mt-3 text-xs leading-relaxed text-zinc-500">
                  Note: we can’t include copyrighted themes (like the Star Wars melody), but the “Sci‑fi” option is a similar vibe without copying a song.
                </p>
              </div>
              {notificationsSupported() ? (
                <div className="mb-6 rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4 text-sm text-zinc-300">
                  {Notification.permission === 'granted' ? (
                    <p className="font-medium text-zinc-200">
                      Desktop notifications are enabled. When an essential is due you get sound (after any tap in the app once), vibration if your device supports it, and a system notification if the tab is in the background.
                    </p>
                  ) : Notification.permission === 'denied' ? (
                    <p className="font-medium text-amber-200/90">
                      Pop-up notifications are blocked for this site. To get alerts when you are not looking at the tab, allow notifications in your browser settings for this page.
                    </p>
                  ) : (
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <p className="font-medium text-zinc-200">
                        Enable desktop alerts so essentials can ping you even when this tab is behind other windows.
                      </p>
                      <button
                        type="button"
                        onClick={async () => {
                          await requestEssentialNotificationPermission();
                          setNotifBump(n => n + 1);
                        }}
                        className="shrink-0 rounded-xl bg-indigo-600 px-4 py-2.5 font-black uppercase tracking-wider text-white hover:bg-indigo-500"
                      >
                        Enable alerts
                      </button>
                    </div>
                  )}
                  <p className="mt-3 text-xs leading-relaxed text-zinc-500">
                    This app cannot send email by itself—email needs a mail server. What works here is in-browser sound plus optional system notifications while the app stays installed or open.
                  </p>
                </div>
              ) : null}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <AnimatePresence>
                  {essentials.map(essential => (
                    <EssentialCard
                      key={essential.id}
                      essential={essential}
                      onUpdate={handleUpdateEssential}
                      onDelete={handleDeleteEssential}
                      onDone={handleDoneEssential}
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
