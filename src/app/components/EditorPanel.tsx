'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Save, Clock, Tag, Calendar, ChevronDown, Loader2, Check, Link2 } from 'lucide-react';
import StatusBadge from '@/components/ui/StatusBadge';
import LinkToPlanModal from './LinkToPlanModal';
import type { JournalEntry, EntryTag } from '../page';

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

const tagOptions: { id: string; value: EntryTag; label: string; description: string }[] = [
  { id: 'tag-idea', value: 'idea', label: 'Idea', description: 'A new concept or spark' },
  { id: 'tag-thought', value: 'thought', label: 'Thought', description: 'Reflection or observation' },
  { id: 'tag-plan', value: 'plan', label: 'Plan', description: 'Something to do or track' },
];

interface EditorPanelProps {
  entry: JournalEntry;
  onUpdate: (updated: Partial<JournalEntry>) => void;
}

export default function EditorPanel({ entry, onUpdate }: EditorPanelProps) {
  const [tagDropdownOpen, setTagDropdownOpen] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>('saved');
  const [wordCount, setWordCount] = useState(0);
  const [currentTime, setCurrentTime] = useState('');
  const [linkPlanModalOpen, setLinkPlanModalOpen] = useState(false);
  const [linkedPlanTitle, setLinkedPlanTitle] = useState<string | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tagDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const h = now.getHours().toString().padStart(2, '0');
      const m = now.getMinutes().toString().padStart(2, '0');
      setCurrentTime(`${h}:${m}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const words = entry.body.trim().split(/\s+/).filter(Boolean).length;
    setWordCount(words);
  }, [entry.body]);

  useEffect(() => {
    setSaveState('saved');
  }, [entry.id]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (tagDropdownRef.current && !tagDropdownRef.current.contains(e.target as Node)) {
        setTagDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const triggerAutosave = useCallback((updates: Partial<JournalEntry>) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setSaveState('saving');
    debounceRef.current = setTimeout(() => {
      onUpdate(updates);
      setSaveState('saved');
    }, 1200);
  }, [onUpdate]);

  const handleBodyChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newBody = e.target.value;
    onUpdate({ body: newBody });
    setSaveState('saving');
    triggerAutosave({ body: newBody });
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    onUpdate({ title: newTitle });
    triggerAutosave({ title: newTitle });
  };

  const handleManualSave = () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setSaveState('saving');
    setTimeout(() => setSaveState('saved'), 600);
  };

  const handleTagSelect = (value: EntryTag) => {
    onUpdate({ tag: value, ...(value !== 'plan' ? { targetDate: '' } : {}) });
    setTagDropdownOpen(false);
  };

  const handleTargetDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdate({ targetDate: e.target.value });
  };

  const handlePlanLinked = (planId: string, planTitle: string) => {
    setLinkedPlanTitle(planTitle);
    setLinkPlanModalOpen(false);
  };

  // Format date label for display
  const displayDate = entry.dateLabel || entry.date;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Toolbar */}
      <div
        className="flex items-center justify-between px-6 py-3 border-b border-border"
        style={{ backgroundColor: 'var(--card)' }}
      >
        <div className="flex items-center gap-3">
          {/* Tag selector */}
          <div className="relative" ref={tagDropdownRef}>
            <button
              onClick={() => setTagDropdownOpen(!tagDropdownOpen)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border text-sm font-medium transition-all duration-150 hover:bg-muted/60 active:scale-95"
              style={{ backgroundColor: 'var(--input)' }}
            >
              <StatusBadge status={entry.tag} />
              <ChevronDown size={12} className="text-muted-foreground" />
            </button>

            {tagDropdownOpen && (
              <div
                className="absolute top-full left-0 mt-1 w-52 rounded-xl border border-border shadow-card-md z-20 fade-in"
                style={{ backgroundColor: 'var(--card)' }}
              >
                {tagOptions.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => handleTagSelect(opt.value)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-all duration-150 first:rounded-t-xl last:rounded-b-xl ${
                      entry.tag === opt.value ? '' : 'hover:bg-muted/60'
                    }`}
                    style={entry.tag === opt.value ? { backgroundColor: 'rgba(92,61,46,0.07)' } : {}}
                  >
                    <StatusBadge status={opt.value} />
                    <div>
                      <p className="text-xs font-medium text-foreground">{opt.label}</p>
                      <p className="text-xs text-muted-foreground">{opt.description}</p>
                    </div>
                    {entry.tag === opt.value && <Check size={12} className="ml-auto text-primary" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Target date — only for plan */}
          {entry.tag === 'plan' && (
            <div className="flex items-center gap-1.5">
              <Calendar size={13} className="text-muted-foreground" />
              <input
                type="date"
                value={entry.targetDate ?? ''}
                onChange={handleTargetDateChange}
                className="text-xs border border-border rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-ring transition-all"
                style={{ backgroundColor: 'var(--input)', color: 'var(--foreground)' }}
              />
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground text-tabular">{wordCount} words</span>

          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock size={12} />
            <span>{displayDate}{currentTime ? ` · ${currentTime}` : ''}</span>
          </div>

          <div className="flex items-center gap-1.5">
            {saveState === 'saving' && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Loader2 size={11} className="animate-spin" />
                Saving…
              </span>
            )}
            {saveState === 'saved' && (
              <span className="flex items-center gap-1 text-xs text-success">
                <Check size={11} />
                Saved
              </span>
            )}
            {saveState === 'error' && (
              <span className="text-xs text-overdue">Save failed</span>
            )}
          </div>

          {/* Link to Plan button */}
          <button
            onClick={() => setLinkPlanModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-border transition-all duration-150 hover:bg-muted/60 active:scale-95"
            style={linkedPlanTitle ? { borderColor: 'var(--primary)', color: 'var(--primary)' } : { color: 'var(--muted-foreground)' }}
            title={linkedPlanTitle ? `Linked to: ${linkedPlanTitle}` : 'Link to a plan'}
          >
            <Link2 size={11} />
            {linkedPlanTitle ? (
              <span className="max-w-[80px] truncate">{linkedPlanTitle}</span>
            ) : (
              'Link Plan'
            )}
          </button>

          <button
            onClick={handleManualSave}
            disabled={saveState === 'saving'}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 hover:opacity-90 active:scale-95 disabled:opacity-50"
            style={{ backgroundColor: 'var(--primary)', color: 'var(--primary-foreground)' }}
          >
            {saveState === 'saving' ? (
              <Loader2 size={11} className="animate-spin" />
            ) : (
              <Save size={11} />
            )}
            Save
          </button>
        </div>
      </div>

      {/* Notebook page */}
      <div className="flex-1 overflow-auto custom-scroll px-6 py-6">
        <div
          className="notebook-card mx-auto"
          style={{ maxWidth: '680px' }}
        >
          {/* Notebook binding dots */}
          <div
            className="flex items-center gap-0 px-4 py-2 border-b border-border/40"
            style={{ backgroundColor: 'rgba(92,61,46,0.04)' }}
          >
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={`binding-${i}`}
                className="w-3 h-3 rounded-full border-2 border-border mx-2"
                style={{ backgroundColor: 'var(--background)' }}
              />
            ))}
            <span className="ml-auto text-xs text-muted-foreground font-serif italic">Rootline</span>
          </div>

          {/* Editor area with margin line */}
          <div className="flex">
            {/* Margin */}
            <div
              className="flex-shrink-0"
              style={{
                width: '52px',
                borderRight: '2px solid rgba(192,57,43,0.35)',
                backgroundColor: 'rgba(250,247,240,0.5)',
              }}
            />

            {/* Writing area — lined background only on body section */}
            <div className="flex-1 flex flex-col">
              {/* Title — no lines, fixed height */}
              <div className="px-5 pt-4 pb-2" style={{ borderBottom: '1px solid var(--paper-line)' }}>
                <input
                  type="text"
                  value={entry.title}
                  onChange={handleTitleChange}
                  placeholder="Entry title (optional)"
                  className="w-full text-xl font-semibold font-serif bg-transparent border-none outline-none focus:outline-none placeholder:text-muted-foreground/50"
                  style={{ color: 'var(--foreground)', lineHeight: '32px', height: '36px' }}
                />
              </div>

              {/* Body textarea — lined background aligned to line-height */}
              <div
                className="px-5 pb-8 pt-0"
                style={{
                  backgroundImage: 'repeating-linear-gradient(to bottom, transparent, transparent 31px, var(--paper-line) 31px, var(--paper-line) 32px)',
                  backgroundSize: '100% 32px',
                  backgroundPositionY: '0px',
                }}
              >
                <textarea
                  value={entry.body}
                  onChange={handleBodyChange}
                  placeholder="Write freely… your thoughts, ideas, and plans for tomorrow."
                  className="w-full bg-transparent border-none outline-none resize-none font-serif text-base placeholder:text-muted-foreground/40"
                  style={{
                    color: 'var(--foreground)',
                    minHeight: '480px',
                    lineHeight: '32px',
                    paddingTop: '8px',
                    display: 'block',
                  }}
                />
              </div>
            </div>
          </div>

          {/* Page footer */}
          <div
            className="flex items-center justify-between px-5 py-2 border-t border-border/40"
            style={{ backgroundColor: 'rgba(92,61,46,0.03)' }}
          >
            <span className="text-xs text-muted-foreground font-serif italic">{displayDate}</span>
            <span className="text-xs text-muted-foreground text-tabular">{wordCount} words</span>
          </div>
        </div>
      </div>

      {linkPlanModalOpen && (
        <LinkToPlanModal
          entry={entry}
          onClose={() => setLinkPlanModalOpen(false)}
          onLinked={handlePlanLinked}
        />
      )}
    </div>
  );
}