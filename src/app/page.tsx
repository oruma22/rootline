'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import AppLayout from '@/components/AppLayout';
import EntryListSidebar from './components/EntryListSidebar';
import EditorPanel from './components/EditorPanel';
import LinkPanel from './components/LinkPanel';
import { createClient } from '../lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type EntryTag = 'idea' | 'thought' | 'plan';

export interface JournalEntry {
  id: string;
  title: string;
  body: string;
  tag: EntryTag;
  date: string;
  dateLabel: string;
  targetDate?: string;
  isToday?: boolean;
}

function formatDateLabel(dateStr: string): string {
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  if (dateStr === todayStr) return 'Today';
  if (dateStr === yesterdayStr) return 'Yesterday';

  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function JournalEntryPage() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = useMemo(() => createClient(), []);
  const { user } = useAuth();

  // Load entries from Supabase
  const loadEntries = useCallback(async (currentSelectedId?: string | null) => {
    if (!user) {
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('journal_entries')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to load entries:', error.message);
      setLoading(false);
      return;
    }

    const mapped: JournalEntry[] = (data || []).map((row) => ({
      id: row.id,
      title: row.title,
      body: row.body,
      tag: row.tag as EntryTag,
      date: row.date,
      dateLabel: row.date_label || formatDateLabel(row.date),
      targetDate: row.target_date ?? undefined,
      isToday: row.is_today ?? false,
    }));

    setEntries(mapped);
    if (mapped.length > 0 && !currentSelectedId) {
      setSelectedEntryId(mapped[0].id);
    }
    setLoading(false);
  }, [supabase, user]);

  useEffect(() => {
    loadEntries(null);
  }, [loadEntries]);

  const selectedEntry = entries.find((e) => e.id === selectedEntryId) ?? entries[0] ?? null;

  const handleNewEntry = useCallback(async () => {
    if (!user) return;

    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const id = `entry-${Date.now()}`;
    const newEntry: JournalEntry = {
      id,
      title: '',
      body: '',
      tag: 'thought',
      date: dateStr,
      dateLabel: 'Today',
      isToday: true,
    };

    const { error } = await supabase.from('journal_entries').insert({
      id: newEntry.id,
      user_id: user.id,
      title: newEntry.title,
      body: newEntry.body,
      tag: newEntry.tag,
      date: newEntry.date,
      date_label: newEntry.dateLabel,
      target_date: null,
      is_today: true,
    });

    if (error) {
      console.error('Failed to create entry:', error.message);
      return;
    }

    setEntries((prev) => [newEntry, ...prev]);
    setSelectedEntryId(id);
  }, [supabase, user]);

  const handleUpdateEntry = useCallback(async (updated: Partial<JournalEntry>) => {
    if (!selectedEntryId) return;

    // Optimistic update
    setEntries((prev) =>
      prev.map((e) => (e.id === selectedEntryId ? { ...e, ...updated } : e))
    );

    if (!user) return;

    const dbUpdate: Record<string, unknown> = {};
    if (updated.title !== undefined) dbUpdate.title = updated.title;
    if (updated.body !== undefined) dbUpdate.body = updated.body;
    if (updated.tag !== undefined) dbUpdate.tag = updated.tag;
    if (updated.targetDate !== undefined) dbUpdate.target_date = updated.targetDate || null;
    if (updated.dateLabel !== undefined) dbUpdate.date_label = updated.dateLabel;

    const { error } = await supabase
      .from('journal_entries')
      .update(dbUpdate)
      .eq('id', selectedEntryId)
      .eq('user_id', user.id);

    if (error) {
      console.error('Failed to update entry:', error.message);
    }
  }, [supabase, selectedEntryId, user]);

  if (loading) {
    return (
      <AppLayout onNewEntry={handleNewEntry}>
        <div className="flex h-full items-center justify-center">
          <p className="text-sm text-muted-foreground">Loading entries…</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout onNewEntry={handleNewEntry}>
      <div className="flex h-full overflow-hidden">
        <EntryListSidebar
          entries={entries}
          selectedEntryId={selectedEntryId ?? ''}
          onSelectEntry={setSelectedEntryId}
          onNewEntry={handleNewEntry}
        />
        {selectedEntry ? (
          <>
            <EditorPanel
              entry={selectedEntry}
              onUpdate={handleUpdateEntry}
            />
            <LinkPanel entries={entries} currentEntryId={selectedEntryId ?? ''} />
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <p className="text-muted-foreground text-sm mb-3">No entries yet</p>
              <button
                onClick={handleNewEntry}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-90"
                style={{ backgroundColor: 'var(--primary)', color: 'var(--primary-foreground)' }}
              >
                Create your first entry
              </button>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}