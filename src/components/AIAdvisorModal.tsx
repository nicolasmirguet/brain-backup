import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Loader2, Sparkles } from 'lucide-react';
import { Task } from '@/types';
import { callLlm } from '@/lib/callLlm';

interface AIAdvisorModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task;
  onApply?: (subSteps: string[], requiredItems: string[]) => void;
}

export function AIAdvisorModal({ isOpen, onClose, task, onApply }: AIAdvisorModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [suggestion, setSuggestion] = useState<{ subSteps: string[], requiredItems: string[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleBreakItDown = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const text = await callLlm(
        'You are a supportive ADHD coach. You MUST respond with ONLY a valid JSON object — no markdown, no backticks, no explanation, nothing else. Just the raw JSON.',
        `Break down this task into 4-6 funny and encouraging 5-minute sub-steps, and list any physical items needed: "${task.title}"

Respond with ONLY this JSON, nothing else:
{"subSteps":["step 1","step 2"],"requiredItems":["item 1"]}`,
      );

      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON in response');
      const parsed = JSON.parse(jsonMatch[0]);
      setSuggestion(parsed);
    } catch (err) {
      console.error(err);
      setError('Failed to get AI suggestions. Maybe the AI is also taking a break.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApply = () => {
    if (suggestion && onApply) {
      onApply(suggestion.subSteps, suggestion.requiredItems);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-md shadow-2xl relative"
        >
          <button onClick={onClose} className="absolute top-4 right-4 text-zinc-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-indigo-500/20 rounded-lg">
              <Sparkles className="w-6 h-6 text-indigo-400" />
            </div>
            <h2 className="text-xl font-bold text-white">AI Advisor</h2>
          </div>

          {!suggestion && !isLoading && !error && (
            <div className="text-center py-8">
              <p className="text-zinc-400 mb-6">
                Need help breaking down "{task.title}"? The AI Advisor can suggest 5-minute steps and what you need.
              </p>
              <button
                onClick={handleBreakItDown}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-6 rounded-xl transition-colors"
              >
                Break It Down For Me
              </button>
            </div>
          )}

          {isLoading && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mb-4" />
              <p className="text-zinc-400 animate-pulse">Consulting the ADHD oracle...</p>
            </div>
          )}

          {error && (
            <div className="text-center py-8">
              <p className="text-red-400 mb-4">{error}</p>
              <button onClick={handleBreakItDown} className="text-indigo-400 hover:underline">Try Again</button>
            </div>
          )}

          {suggestion && (
            <div className="space-y-6">
              {suggestion.requiredItems?.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-wider mb-2">Required Items</h3>
                  <ul className="list-disc list-inside text-zinc-300 space-y-1">
                    {suggestion.requiredItems.map((item, i) => <li key={i}>{item}</li>)}
                  </ul>
                </div>
              )}
              <div>
                <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-wider mb-2">5-Minute Steps</h3>
                <ol className="list-decimal list-inside text-zinc-300 space-y-2">
                  {suggestion.subSteps.map((step, i) => <li key={i}>{step}</li>)}
                </ol>
              </div>
              <button
                onClick={handleApply}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-6 rounded-xl transition-colors mt-4"
              >
                Apply to Task
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
