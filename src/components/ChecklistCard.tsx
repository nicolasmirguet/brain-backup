import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Check, Plus, Trash2, Sparkles } from 'lucide-react';
import { ChecklistItemSuggestModal } from './ChecklistItemSuggestModal';
import { Checklist, ChecklistItem } from '@/types';
import { cn } from '@/lib/utils';
import { v4 as uuidv4 } from 'uuid';

interface ChecklistCardProps {
  checklist: Checklist;
  onUpdate: (checklist: Checklist) => void;
  onDelete?: (id: string) => void;
}

export function ChecklistCard({ checklist, onUpdate, onDelete }: ChecklistCardProps) {
  const [newItemText, setNewItemText] = useState('');
  const [suggestOpen, setSuggestOpen] = useState(false);

  const toggleItem = (id: string) => {
    const updatedItems = checklist.items.map(item => 
      item.id === id ? { ...item, isChecked: !item.isChecked } : item
    );
    onUpdate({ ...checklist, items: updatedItems });
  };

  const addItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemText.trim()) return;
    
    const newItem: ChecklistItem = {
      id: uuidv4(),
      text: newItemText.trim(),
      isChecked: false,
    };
    
    onUpdate({ ...checklist, items: [...checklist.items, newItem] });
    setNewItemText('');
  };

  const removeItem = (id: string) => {
    const updatedItems = checklist.items.filter(item => item.id !== id);
    onUpdate({ ...checklist, items: updatedItems });
  };

  const allChecked = checklist.items.length > 0 && checklist.items.every(i => i.isChecked);

  return (
    <>
    <ChecklistItemSuggestModal
      isOpen={suggestOpen}
      checklist={checklist}
      onClose={() => setSuggestOpen(false)}
      onApply={onUpdate}
    />
    <div className={cn(
      "bg-zinc-900 rounded-xl p-5 border-2 transition-colors",
      allChecked ? "border-green-500/50 shadow-[0_0_15px_rgba(34,197,94,0.2)]" : "border-zinc-800"
    )}>
      <h3 className="text-xl font-black text-white mb-4 uppercase tracking-tight flex items-center justify-between">
        <div className="flex items-center gap-2">
          {checklist.title}
          {allChecked && <span className="text-xs bg-green-500 text-black px-2 py-1 rounded-full">Ready!</span>}
        </div>
        {onDelete && (
          <button
            onClick={() => onDelete(checklist.id)}
            className="p-2 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
            title="Delete Launchpad"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </h3>
      
      <div className="space-y-2 mb-4">
        {checklist.items.map(item => (
          <div key={item.id} className="flex items-center gap-3 group">
            <button
              onClick={() => toggleItem(item.id)}
              className={cn(
                "w-6 h-6 rounded-md flex items-center justify-center border-2 transition-colors flex-shrink-0",
                item.isChecked 
                  ? "bg-green-500 border-green-500 text-black" 
                  : "border-zinc-600 hover:border-zinc-400 text-transparent"
              )}
            >
              <Check className="w-4 h-4" />
            </button>
            <span className={cn(
              "flex-1 text-sm transition-colors",
              item.isChecked ? "text-zinc-500 line-through" : "text-zinc-200"
            )}>
              {item.text}
            </span>
            <button 
              onClick={() => removeItem(item.id)}
              className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-400 transition-all"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={() => setSuggestOpen(true)}
          className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-indigo-500/40 bg-indigo-600/15 px-3 py-2 text-sm font-black uppercase tracking-wider text-indigo-300 hover:bg-indigo-600/25"
        >
          <Sparkles className="h-4 w-4" /> AI suggest items
        </button>
      </div>

      <form onSubmit={addItem} className="flex gap-2">
        <input
          type="text"
          value={newItemText}
          onChange={(e) => setNewItemText(e.target.value)}
          placeholder="Add item..."
          className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
        />
        <button 
          type="submit"
          disabled={!newItemText.trim()}
          className="bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-white p-2 rounded-lg border border-zinc-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
        </button>
      </form>
    </div>
    </>
  );
}
