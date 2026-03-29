import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Task } from '@/types';
import { Sparkles, CheckCircle2, XCircle, Plus, Loader2, CalendarClock, Target, CheckSquare, Square, Mail } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

interface HistoryTabProps {
  tasks: Task[];
  dumpThoughts?: string;
  onAddTasks: (tasks: Task[]) => void;
}

const FOCUS_OPTIONS = [
  'Healthy Habits',
  'Essentials',
  'A Challenge',
  'Chill Day',
  'Productivity'
];

export function HistoryTab({ tasks, dumpThoughts, onAddTasks }: HistoryTabProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [wrapUp, setWrapUp] = useState<any>(null);
  const [selectedFocuses, setSelectedFocuses] = useState<string[]>([]);
  const [selectedTaskIndices, setSelectedTaskIndices] = useState<number[]>([]);

  const completedTasks = tasks.filter(t => t.status === 'done');
  const givenUpTasks = tasks.filter(t => t.status === 'given_up');

  const toggleFocus = (focus: string) => {
    setSelectedFocuses(prev => 
      prev.includes(focus) 
        ? prev.filter(f => f !== focus)
        : [...prev, focus]
    );
  };

  const handleGenerateWrapUp = async () => {
    setIsGenerating(true);
    try {
      const focusText = selectedFocuses.length > 0 
        ? `For tomorrow's suggested tasks, focus recommendations on: ${selectedFocuses.join(', ')}.` 
        : '';

      const prompt = `I am an ADHD user. Here is my day:
Completed tasks: ${completedTasks.map(t => t.title).join(', ') || 'None'}
Tasks I gave up on: ${givenUpTasks.map(t => t.title).join(', ') || 'None'}
${focusText}
Dumped thoughts from today: ${dumpThoughts || 'None'}

Please provide a daily wrap-up.

Respond with ONLY valid JSON, no markdown, no extra text:
{
  "celebration": "short encouraging message about their wins",
  "recommendation": "1-2 gentle recommendations",
  "tidiedThoughts": "dumped thoughts organized into bullet points, or empty string if none",
  "suggestedTasks": [
    {
      "title": "task name",
      "category": "health|exercise|chores|other",
      "durationMinutes": 15,
      "energyLevel": "brain dead|functional|superhero"
    }
  ]
}`;

      const res = await fetch('/api/claude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system: 'You are a supportive ADHD coach. You MUST respond with ONLY a valid JSON object — no markdown, no backticks, no explanation, nothing else. Just the raw JSON.',
          prompt: `I am an ADHD user. Here is my day:
Completed tasks: ${completedTasks.map(t => t.title).join(', ') || 'None'}
Tasks I gave up on: ${givenUpTasks.map(t => t.title).join(', ') || 'None'}
${focusText}
Dumped thoughts from today: ${dumpThoughts || 'None'}

Respond with ONLY this JSON structure, nothing else:
{"celebration":"short encouraging message","recommendation":"1-2 gentle recommendations","tidiedThoughts":"organized thoughts or empty string","suggestedTasks":[{"title":"task name","category":"health","durationMinutes":15,"energyLevel":"functional"}]}`
        })
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error);

      const jsonMatch = data.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON found in response');
      const parsed = JSON.parse(jsonMatch[0]);
      setWrapUp(parsed);
      if (parsed.suggestedTasks) {
        setSelectedTaskIndices(parsed.suggestedTasks.map((_: any, i: number) => i));
      }
    } catch (error) {
      console.error("Failed to generate wrap-up:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const toggleTaskSelection = (index: number) => {
    setSelectedTaskIndices(prev => 
      prev.includes(index)
        ? prev.filter(i => i !== index)
        : [...prev, index]
    );
  };

  const handleAddSuggested = () => {
    if (!wrapUp?.suggestedTasks || selectedTaskIndices.length === 0) return;
    
    const newTasks: Task[] = wrapUp.suggestedTasks
      .filter((_: any, i: number) => selectedTaskIndices.includes(i))
      .map((st: any) => ({
        id: uuidv4(),
        title: st.title,
        category: st.category as any,
        cycle: 'none',
        energyLevel: st.energyLevel as any,
        durationMinutes: st.durationMinutes,
        status: 'pending',
        createdAt: Date.now()
      }));
    
    onAddTasks(newTasks);
    setWrapUp({ ...wrapUp, added: true });
  };

  const handleEmail = () => {
    if (!wrapUp) return;
    const subject = encodeURIComponent("My Daily Wrap-up");
    const body = encodeURIComponent(`
Celebration:
${wrapUp.celebration}

Recommendations:
${wrapUp.recommendation}

${wrapUp.tidiedThoughts ? `Tidied Thoughts:\n${wrapUp.tidiedThoughts}\n\n` : ''}
Suggested Tasks for Tomorrow:
${wrapUp.suggestedTasks.map((st: any) => `- ${st.title} (${st.durationMinutes}m)`).join('\n')}
    `.trim());
    window.open(`mailto:?subject=${subject}&body=${body}`);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.2 }}
      className="space-y-6"
    >
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6">
        <h2 className="text-xl font-black uppercase tracking-tight text-white mb-6 flex items-center gap-2">
          <CalendarClock className="w-6 h-6 text-indigo-400" /> Today's History
        </h2>
        
        <div className="space-y-4 mb-8">
          <div>
            <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-widest mb-3 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Completed ({completedTasks.length})
            </h3>
            {completedTasks.length > 0 ? (
              <ul className="space-y-2">
                {completedTasks.map(t => (
                  <li key={t.id} className="text-zinc-300 font-medium bg-zinc-800/50 px-4 py-2 rounded-xl border border-zinc-800/50">
                    {t.title}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-zinc-600 text-sm italic">Nothing completed yet.</p>
            )}
          </div>

          <div>
            <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-widest mb-3 flex items-center gap-2">
              <XCircle className="w-4 h-4 text-red-500" /> Given Up ({givenUpTasks.length})
            </h3>
            {givenUpTasks.length > 0 ? (
              <ul className="space-y-2">
                {givenUpTasks.map(t => (
                  <li key={t.id} className="text-zinc-400 font-medium bg-zinc-800/30 px-4 py-2 rounded-xl border border-zinc-800/30 line-through">
                    {t.title}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-zinc-600 text-sm italic">Nothing given up today.</p>
            )}
          </div>
        </div>

        {!wrapUp && (
          <div className="flex justify-end mb-6">
            <button
              onClick={() => {
                const subject = encodeURIComponent("My Daily History");
                const body = encodeURIComponent(`
Completed Tasks:
${completedTasks.map(t => `- ${t.title}`).join('\n') || 'None'}

Given Up Tasks:
${givenUpTasks.map(t => `- ${t.title}`).join('\n') || 'None'}

Dumped Thoughts:
${dumpThoughts || 'None'}
                `.trim());
                window.open(`mailto:?subject=${subject}&body=${body}`);
              }}
              className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-black uppercase tracking-widest py-3 px-6 rounded-xl transition-all flex items-center justify-center gap-2 text-sm"
            >
              <Mail className="w-4 h-4" /> Email Raw History
            </button>
          </div>
        )}

        {!wrapUp && (
          <div className="space-y-6">
            <div className="bg-zinc-800/30 border border-zinc-800 rounded-2xl p-5">
              <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <Target className="w-4 h-4 text-indigo-400" /> Tomorrow's Focus
              </h3>
              <p className="text-xs text-zinc-500 mb-4">Select what you'd like the AI to suggest for tomorrow:</p>
              <div className="flex flex-wrap gap-2">
                {FOCUS_OPTIONS.map(focus => {
                  const isSelected = selectedFocuses.includes(focus);
                  return (
                    <button
                      key={focus}
                      onClick={() => toggleFocus(focus)}
                      className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                        isSelected 
                          ? 'bg-indigo-500 text-white shadow-[0_0_15px_rgba(99,102,241,0.4)]' 
                          : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-300'
                      }`}
                    >
                      {focus}
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              onClick={handleGenerateWrapUp}
              disabled={isGenerating}
              className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white font-black uppercase tracking-widest py-4 px-6 rounded-xl transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(79,70,229,0.3)] disabled:shadow-none"
            >
              {isGenerating ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> Analyzing Day...</>
              ) : (
                <><Sparkles className="w-5 h-5" /> Generate End of Day Wrap-up</>
              )}
            </button>
          </div>
        )}

        <AnimatePresence>
          {wrapUp && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-8 space-y-6 border-t border-zinc-800 pt-8"
            >
              <div className="bg-indigo-900/20 border border-indigo-500/30 rounded-2xl p-6">
                <h3 className="text-lg font-black uppercase tracking-tight text-indigo-400 mb-2">Celebration</h3>
                <p className="text-indigo-100 leading-relaxed">{wrapUp.celebration}</p>
              </div>

              <div className="bg-zinc-800/50 border border-zinc-700 rounded-2xl p-6">
                <h3 className="text-lg font-black uppercase tracking-tight text-zinc-300 mb-2">Recommendations</h3>
                <p className="text-zinc-400 leading-relaxed">{wrapUp.recommendation}</p>
              </div>

              {wrapUp.tidiedThoughts && (
                <div className="bg-zinc-800/30 border border-zinc-700/50 rounded-2xl p-6">
                  <h3 className="text-lg font-black uppercase tracking-tight text-zinc-300 mb-4">Tidied Thoughts</h3>
                  <div className="text-zinc-400 leading-relaxed whitespace-pre-wrap font-medium">
                    {wrapUp.tidiedThoughts}
                  </div>
                </div>
              )}

              <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6">
                <h3 className="text-lg font-black uppercase tracking-tight text-white mb-4">Suggested for Tomorrow</h3>
                <ul className="space-y-3 mb-6">
                  {wrapUp.suggestedTasks.map((st: any, i: number) => {
                    const isSelected = selectedTaskIndices.includes(i);
                    return (
                      <li key={i}>
                        <button
                          onClick={() => !wrapUp.added && toggleTaskSelection(i)}
                          disabled={wrapUp.added}
                          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all ${
                            isSelected 
                              ? 'bg-zinc-800 text-zinc-200 border border-indigo-500/50' 
                              : 'bg-zinc-800/50 text-zinc-500 border border-transparent'
                          } ${wrapUp.added ? 'opacity-50 cursor-not-allowed' : 'hover:bg-zinc-700'}`}
                        >
                          {isSelected ? (
                            <CheckSquare className="w-5 h-5 text-indigo-400 flex-shrink-0" />
                          ) : (
                            <Square className="w-5 h-5 text-zinc-600 flex-shrink-0" />
                          )}
                          <span className="font-medium flex-1">{st.title}</span>
                          <span className={`text-xs uppercase tracking-wider ${isSelected ? 'text-zinc-400' : 'text-zinc-600'}`}>
                            {st.durationMinutes}m
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
                
                <div className="flex gap-3">
                  <button
                    onClick={handleEmail}
                    className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-black uppercase tracking-widest py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2"
                  >
                    <Mail className="w-5 h-5" /> Email Wrap-up
                  </button>
                  <button
                    onClick={handleAddSuggested}
                    disabled={wrapUp.added || selectedTaskIndices.length === 0}
                    className="flex-[2] bg-white hover:bg-zinc-200 disabled:bg-zinc-800 disabled:text-zinc-600 text-black font-black uppercase tracking-widest py-3 px-6 rounded-xl transition-all flex items-center justify-center gap-2"
                  >
                    {wrapUp.added ? (
                      <><CheckCircle2 className="w-5 h-5" /> Added to Tasks</>
                    ) : (
                      <><Plus className="w-5 h-5" /> Add {selectedTaskIndices.length === wrapUp.suggestedTasks.length ? 'All' : `Selected (${selectedTaskIndices.length})`}</>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
