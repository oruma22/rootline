'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Link2, Plus, X, ChevronDown, ChevronUp, Sparkles, Search } from 'lucide-react';
import StatusBadge from '@/components/ui/StatusBadge';
import type { JournalEntry } from '../page';

interface LinkedEntry {
  id: string;
  title: string;
  tag: 'idea' | 'thought' | 'plan';
  date: string;
  relation: 'related' | 'branched';
}

interface SuggestedEntry {
  id: string;
  title: string;
  tag: 'idea' | 'thought' | 'plan';
  date: string;
  reason: string;
  score: number;
}

const mockLinkedEntries: LinkedEntry[] = [
  { id: 'link-entry-009', title: 'Analog vs digital', tag: 'idea', date: 'Sep 2', relation: 'related' },
  { id: 'link-entry-005', title: 'On solitude', tag: 'thought', date: 'Sep 6', relation: 'branched' },
];

const mockSuggestions: SuggestedEntry[] = [
  { id: 'sug-entry-008', title: 'Memory and narrative', tag: 'thought', date: 'Sep 3', reason: 'Shared themes: habits, introspection', score: 87 },
  { id: 'sug-entry-006', title: 'Side project: Mosaic', tag: 'idea', date: 'Sep 5', reason: 'Overlapping keywords: ritual, architecture', score: 72 },
  { id: 'sug-entry-003', title: 'The attention economy', tag: 'idea', date: 'Sep 8', reason: 'Related tag: thought; keyword: journaling', score: 65 },
];

interface LinkPanelProps {
  entries?: JournalEntry[];
  currentEntryId?: string;
}

export default function LinkPanel({ entries = [], currentEntryId }: LinkPanelProps) {
  const [linkedEntries, setLinkedEntries] = useState<LinkedEntry[]>(mockLinkedEntries);
  const [suggestions, setSuggestions] = useState<SuggestedEntry[]>(mockSuggestions);
  const [suggestionsExpanded, setSuggestionsExpanded] = useState(true);
  const [linkingMode, setLinkingMode] = useState<'related' | 'branched'>('related');
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [pendingRelation, setPendingRelation] = useState<'related' | 'branched'>('related');
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (addModalOpen) {
      setTimeout(() => searchRef.current?.focus(), 50);
    } else {
      setSearchQuery('');
    }
  }, [addModalOpen]);

  // Build searchable list from entries prop, excluding already linked and current
  const availableEntries = entries.filter(
    (e) =>
      e.id !== currentEntryId &&
      !linkedEntries.some((l) => l.id === e.id) &&
      (searchQuery === '' ||
        e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (e as any).body.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Fallback mock entries for when no entries prop provided
  const fallbackEntries: LinkedEntry[] = [
    { id: 'entry-003', title: 'The attention economy', tag: 'idea', date: 'Sep 8', relation: 'related' },
    { id: 'entry-007', title: 'Weekly review habit', tag: 'plan', date: 'Sep 4', relation: 'related' },
    { id: 'entry-008', title: 'Memory and narrative', tag: 'thought', date: 'Sep 3', relation: 'related' },
    { id: 'entry-004', title: 'Reading list overhaul', tag: 'plan', date: 'Sep 7', relation: 'related' },
    { id: 'entry-010', title: 'Walk more, sit less', tag: 'plan', date: 'Sep 1', relation: 'related' },
  ].filter(
    (e) =>
      !linkedEntries.some((l) => l.id === e.id) &&
      (searchQuery === '' || e.title.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const displayEntries = availableEntries.length > 0 || entries.length > 0 ? availableEntries : fallbackEntries;

  const addLink = (entry: { id: string; title: string; tag: 'idea' | 'thought' | 'plan'; date: string }) => {
    const newLink: LinkedEntry = {
      id: entry.id,
      title: entry.title,
      tag: entry.tag,
      date: entry.date,
      relation: pendingRelation,
    };
    setLinkedEntries((prev) => [...prev, newLink]);
    setAddModalOpen(false);
  };

  const removeLink = (id: string) => {
    setLinkedEntries((prev) => prev.filter((e) => e.id !== id));
  };

  const acceptSuggestion = (sug: SuggestedEntry) => {
    const newLink: LinkedEntry = { id: sug.id, title: sug.title, tag: sug.tag, date: sug.date, relation: linkingMode };
    setLinkedEntries((prev) => [...prev, newLink]);
    setSuggestions((prev) => prev.filter((s) => s.id !== sug.id));
  };

  const dismissSuggestion = (id: string) => {
    setSuggestions((prev) => prev.filter((s) => s.id !== id));
  };

  return (
    <>
      <aside
        className="flex flex-col border-l border-border overflow-y-auto custom-scroll"
        style={{ width: '260px', flexShrink: 0, backgroundColor: 'var(--card)' }}
      >
        {/* Header */}
        <div className="px-4 pt-4 pb-3 border-b border-border">
          <div className="flex items-center gap-2 mb-1">
            <Link2 size={14} className="text-primary" />
            <h2 className="text-sm font-semibold text-foreground">Entry Links</h2>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Connect this entry to related ideas to build your idea tree.
          </p>
        </div>

        {/* Link relation mode */}
        <div className="px-4 py-3 border-b border-border">
          <p className="text-xs font-medium text-muted-foreground mb-2">Link type</p>
          <div className="flex gap-1">
            {(['related', 'branched'] as const).map((mode) => (
              <button
                key={`mode-${mode}`}
                onClick={() => setLinkingMode(mode)}
                className="flex-1 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 active:scale-95"
                style={
                  linkingMode === mode
                    ? { backgroundColor: 'var(--primary)', color: 'var(--primary-foreground)' }
                    : { backgroundColor: 'var(--muted)', color: 'var(--muted-foreground)' }
                }
              >
                {mode === 'related' ? 'Related' : 'Branched from'}
              </button>
            ))}
          </div>
        </div>

        {/* Confirmed links */}
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-foreground">
              Linked entries
              <span className="ml-1.5 text-xs font-normal text-muted-foreground text-tabular">
                ({linkedEntries.length})
              </span>
            </p>
            <button
              onClick={() => { setPendingRelation(linkingMode); setAddModalOpen(true); }}
              className="flex items-center gap-1 text-xs font-medium transition-all duration-150 hover:opacity-80 active:scale-95"
              style={{ color: 'var(--primary)' }}
            >
              <Plus size={11} />
              Add
            </button>
          </div>

          {linkedEntries.length === 0 ? (
            <div className="text-center py-4">
              <Link2 size={16} className="text-muted-foreground mx-auto mb-1" />
              <p className="text-xs text-muted-foreground">No links yet. Accept a suggestion below or add manually.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {linkedEntries.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-start gap-2 p-2.5 rounded-lg border border-border/60 group transition-all duration-150 hover:border-border"
                  style={{ backgroundColor: 'var(--background)' }}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <StatusBadge status={entry.tag} />
                      <span
                        className="text-xs px-1.5 py-0.5 rounded text-tabular"
                        style={{
                          backgroundColor: entry.relation === 'branched' ? 'rgba(92,61,46,0.1)' : 'var(--muted)',
                          color: entry.relation === 'branched' ? 'var(--primary)' : 'var(--muted-foreground)',
                          fontSize: '10px',
                        }}
                      >
                        {entry.relation === 'branched' ? '↱ branched' : '↔ related'}
                      </span>
                    </div>
                    <p className="text-xs font-medium text-foreground truncate">{entry.title}</p>
                    <p className="text-xs text-muted-foreground">{entry.date}</p>
                  </div>
                  <button
                    onClick={() => removeLink(entry.id)}
                    className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-muted-foreground hover:text-overdue transition-all duration-150"
                    aria-label={`Remove link to ${entry.title}`}
                  >
                    <X size={11} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="mx-4 border-t border-border" />

        {/* AI Suggestions */}
        <div className="px-4 py-3">
          <button
            onClick={() => setSuggestionsExpanded(!suggestionsExpanded)}
            className="flex items-center justify-between w-full mb-2"
          >
            <div className="flex items-center gap-1.5">
              <Sparkles size={12} style={{ color: 'var(--warning)' }} />
              <p className="text-xs font-semibold text-foreground">Suggested links</p>
              <span
                className="text-xs px-1.5 py-0.5 rounded-full font-medium"
                style={{ backgroundColor: 'var(--warning-bg)', color: 'var(--warning)' }}
              >
                {suggestions.length}
              </span>
            </div>
            {suggestionsExpanded
              ? <ChevronUp size={13} className="text-muted-foreground" />
              : <ChevronDown size={13} className="text-muted-foreground" />
            }
          </button>

          {suggestionsExpanded && (
            <div className="space-y-2 fade-in">
              <p className="text-xs text-muted-foreground leading-relaxed mb-2">
                Based on shared tags and keywords. Always a suggestion — you decide.
              </p>
              {suggestions.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-3">No new suggestions</p>
              ) : (
                suggestions.map((sug) => (
                  <div
                    key={sug.id}
                    className="p-2.5 rounded-lg border border-dashed transition-all duration-150 hover:border-solid"
                    style={{ borderColor: 'var(--border)', backgroundColor: 'var(--background)' }}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <StatusBadge status={sug.tag} />
                      <span className="ml-auto text-xs font-medium text-tabular" style={{ color: 'var(--warning)' }}>
                        {sug.score}%
                      </span>
                    </div>
                    <p className="text-xs font-medium text-foreground truncate mb-0.5">{sug.title}</p>
                    <p className="text-xs text-muted-foreground mb-2 leading-relaxed">{sug.reason}</p>
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => acceptSuggestion(sug)}
                        className="flex-1 py-1 rounded text-xs font-medium transition-all duration-150 active:scale-95"
                        style={{ backgroundColor: 'var(--primary)', color: 'var(--primary-foreground)' }}
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => dismissSuggestion(sug.id)}
                        className="flex-1 py-1 rounded text-xs font-medium transition-all duration-150 active:scale-95"
                        style={{ backgroundColor: 'var(--muted)', color: 'var(--muted-foreground)' }}
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </aside>

      {/* Add Link Modal */}
      {addModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ backgroundColor: 'rgba(44,24,16,0.45)', backdropFilter: 'blur(2px)' }}
          onClick={() => setAddModalOpen(false)}
        >
          <div
            className="notebook-card w-full mx-4 fade-in"
            style={{ maxWidth: '440px', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Binding */}
            <div
              className="flex items-center px-4 py-2 border-b border-border/40 flex-shrink-0"
              style={{ backgroundColor: 'rgba(92,61,46,0.04)' }}
            >
              <div className="flex items-center gap-2">
                <Link2 size={12} className="text-primary" />
                <span className="text-xs font-semibold text-foreground">Link an Entry</span>
              </div>
              <button
                onClick={() => setAddModalOpen(false)}
                className="ml-auto p-1 rounded text-muted-foreground hover:text-foreground transition-all"
                aria-label="Close"
              >
                <X size={13} />
              </button>
            </div>

            <div className="flex overflow-hidden flex-1">
              {/* Margin */}
              <div
                className="flex-shrink-0"
                style={{ width: '36px', borderRight: '2px solid rgba(192,57,43,0.35)', backgroundColor: 'rgba(250,247,240,0.5)' }}
              />
              <div className="flex-1 flex flex-col overflow-hidden p-4">
                {/* Relation type */}
                <div className="mb-3">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Link as</p>
                  <div className="flex gap-1.5">
                    {(['related', 'branched'] as const).map((r) => (
                      <button
                        key={`modal-rel-${r}`}
                        onClick={() => setPendingRelation(r)}
                        className="flex-1 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 active:scale-95"
                        style={
                          pendingRelation === r
                            ? { backgroundColor: 'var(--primary)', color: 'var(--primary-foreground)' }
                            : { backgroundColor: 'var(--muted)', color: 'var(--muted-foreground)' }
                        }
                      >
                        {r === 'related' ? '↔ Related' : '↱ Branched from'}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                    {pendingRelation === 'related' ?'This entry shares themes or ideas with the selected entry.' :'This entry grew out of or was inspired by the selected entry.'}
                  </p>
                </div>

                {/* Search */}
                <div className="relative mb-3">
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    ref={searchRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search entries…"
                    className="w-full pl-8 pr-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-1 focus:ring-ring transition-all"
                    style={{ backgroundColor: 'var(--input)', color: 'var(--foreground)' }}
                  />
                </div>

                {/* Entry list */}
                <div className="flex-1 overflow-y-auto custom-scroll space-y-1.5">
                  {displayEntries.length === 0 ? (
                    <div className="text-center py-6">
                      <p className="text-xs text-muted-foreground">
                        {searchQuery ? 'No entries match your search.' : 'All entries are already linked.'}
                      </p>
                    </div>
                  ) : (
                    displayEntries.map((entry) => {
                      const e = 'body' in entry
                        ? { id: entry.id, title: entry.title, tag: entry.tag as 'idea' | 'thought' | 'plan', date: (entry as JournalEntry).dateLabel || (entry as JournalEntry).date }
                        : entry as LinkedEntry;
                      return (
                        <button
                          key={`add-${e.id}`}
                          onClick={() => addLink(e)}
                          className="w-full flex items-start gap-2.5 p-2.5 rounded-lg border border-border/60 hover:border-border text-left transition-all duration-150 group"
                          style={{ backgroundColor: 'var(--background)' }}
                        >
                          <StatusBadge status={e.tag} />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-foreground truncate">{e.title || 'Untitled entry'}</p>
                            <p className="text-xs text-muted-foreground">{e.date}</p>
                          </div>
                          <span
                            className="text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                            style={{ color: 'var(--primary)' }}
                          >
                            Link
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}