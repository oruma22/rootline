'use client';

import React, { useState } from 'react';
import { Search, X, Plus } from 'lucide-react';
import StatusBadge from '@/components/ui/StatusBadge';
import type { JournalEntry } from '../page';

interface EntryListSidebarProps {
  entries: JournalEntry[];
  selectedEntryId: string;
  onSelectEntry: (id: string) => void;
  onNewEntry: () => void;
}

const tagFilters = [
  { id: 'filter-all', label: 'All', value: 'all' },
  { id: 'filter-idea', label: 'Ideas', value: 'idea' },
  { id: 'filter-thought', label: 'Thoughts', value: 'thought' },
  { id: 'filter-plan', label: 'Plans', value: 'plan' },
];

export default function EntryListSidebar({ entries, selectedEntryId, onSelectEntry, onNewEntry }: EntryListSidebarProps) {
  const [search, setSearch] = useState('');
  const [tagFilter, setTagFilter] = useState('all');

  const filtered = entries.filter((e) => {
    const matchesTag = tagFilter === 'all' || e.tag === tagFilter;
    const matchesSearch =
      !search ||
      e.title.toLowerCase().includes(search.toLowerCase()) ||
      e.body.toLowerCase().includes(search.toLowerCase());
    return matchesTag && matchesSearch;
  });

  return (
    <aside
      className="flex flex-col border-r border-border custom-scroll overflow-y-auto"
      style={{ width: '260px', flexShrink: 0, backgroundColor: 'var(--card)' }}
    >
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-foreground">Entries</h2>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground text-tabular">{entries.length} total</span>
            <button
              onClick={onNewEntry}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-all duration-150 hover:opacity-90 active:scale-95"
              style={{ backgroundColor: 'var(--primary)', color: 'var(--primary-foreground)' }}
              title="New entry"
            >
              <Plus size={11} />
              New
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search entries..."
            className="w-full pl-7 pr-7 py-1.5 text-sm rounded-lg border border-border focus:outline-none focus:ring-1 focus:ring-ring transition-all"
            style={{ backgroundColor: 'var(--input)', color: 'var(--foreground)' }}
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X size={12} />
            </button>
          )}
        </div>

        {/* Tag filter chips */}
        <div className="flex gap-1 mt-2 flex-wrap">
          {tagFilters.map((f) => (
            <button
              key={f.id}
              onClick={() => setTagFilter(f.value)}
              className={`px-2 py-0.5 rounded-full text-xs font-medium transition-all duration-150 ${
                tagFilter === f.value
                  ? 'text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              style={
                tagFilter === f.value
                  ? { backgroundColor: 'var(--primary)' }
                  : { backgroundColor: 'var(--muted)' }
              }
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Entry list */}
      <div className="flex-1">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <Search size={20} className="text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">No entries match your search</p>
          </div>
        ) : (
          filtered.map((entry) => (
            <button
              key={entry.id}
              onClick={() => onSelectEntry(entry.id)}
              className={`w-full text-left px-4 py-3 border-b border-border/60 transition-all duration-150 ${
                selectedEntryId === entry.id
                  ? '' : 'hover:bg-muted/40'
              }`}
              style={
                selectedEntryId === entry.id
                  ? { backgroundColor: 'rgba(92,61,46,0.07)', borderLeft: '3px solid var(--primary)' }
                  : {}
              }
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-muted-foreground">{entry.dateLabel}</span>
                <StatusBadge status={entry.tag} />
              </div>
              <p className="text-sm font-medium text-foreground truncate mb-0.5">
                {entry.title || <span className="italic text-muted-foreground">Untitled</span>}
              </p>
              <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                {entry.body || 'Empty entry…'}
              </p>
            </button>
          ))
        )}
      </div>
    </aside>
  );
}