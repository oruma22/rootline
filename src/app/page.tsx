'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import AppLayout from '@/components/AppLayout';
import EntryListSidebar from './components/EntryListSidebar';
import EditorPanel from './components/EditorPanel';
import LinkPanel from './components/LinkPanel';
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
  planId?: string | null;
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
  const { supabase, user } = useAuth();

  // ─── Pending-edit buffer (single debounced write) ────────────────────────────
  // Holds the latest partial update that hasn't been flushed to DB yet
  const pendingEditRef = useRef<{ entryId: string; updates: Partial<JournalEntry> } | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Keep a ref to entries so flushPending can read current state without stale closure
  const entriesRef = useRef<JournalEntry[]>([]);
  useEffect(() => { entriesRef.current = entries; }, [entries]);

  /** Write the buffered edit to Supabase immediately. Returns a promise. */
  const flushPending = useCallback(async () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    const pending = pendingEditRef.current;
    if (!pending || !supabase) return;
    pendingEditRef.current = null;

    const { entryId, updates } = pending;

    const dbUpdate: Record<string, unknown> = {};
    if (updates.title !== undefined) dbUpdate.title = updates.title;
    if (updates.body !== undefined) dbUpdate.body = updates.body;
    if (updates.tag !== undefined) dbUpdate.tag = updates.tag;
    if (updates.targetDate !== undefined) dbUpdate.target_date = updates.targetDate || null;
    if (updates.dateLabel !== undefined) dbUpdate.date_label = updates.dateLabel;

    const { error } = await supabase
      .from('journal_entries')
      .update(dbUpdate)
      .eq('id', entryId);

    if (error) {
      console.error('Failed to flush entry update:', error.message);
      return;
    }

    // ── Sync idea_tree_nodes (never touch x/y) ──────────────────────────────
    const nodeUpdate: Record<string, unknown> = {};
    if (updates.title !== undefined) nodeUpdate.title = updates.title;
    if (updates.body !== undefined) nodeUpdate.body = updates.body;
    if (updates.tag !== undefined) nodeUpdate.tag = updates.tag;
    if (updates.dateLabel !== undefined) nodeUpdate.date_label = updates.dateLabel;

    if (Object.keys(nodeUpdate).length > 0) {
      await supabase
        .from('idea_tree_nodes')
        .update(nodeUpdate)
        .eq('id', entryId);
    }

    // ── Sync plans table ────────────────────────────────────────────────────
    await syncPlanForEntry(entryId);
  }, [supabase]); // eslint-disable-line react-hooks/exhaustive-deps

  /** Sync the plans table based on current tag for an entry */
  const syncPlanForEntry = useCallback(async (entryId: string) => {
    if (!supabase || !user) return;

    // Fetch the current full entry from DB to get accurate state after flush
    const { data: entryRow } = await supabase
      .from('journal_entries')
      .select('id, title, body, tag, target_date, plan_id')
      .eq('id', entryId)
      .single();

    if (!entryRow) return;

    const currentTag = entryRow.tag as EntryTag;
    const planId: string | null = entryRow.plan_id ?? null;

    if (currentTag === 'plan') {
      const preview = (entryRow.body || '').slice(0, 120);
      if (!planId) {
        // Create a new plan row
        const { data: newPlan, error: planErr } = await supabase
          .from('plans')
          .insert({
            user_id: user.id,
            title: entryRow.title || 'Untitled Plan',
            preview,
            status: 'pending',
            target_date: entryRow.target_date ?? '',
            archived: false,
          })
          .select('id')
          .single();

        if (!planErr && newPlan) {
          await supabase
            .from('journal_entries')
            .update({ plan_id: newPlan.id })
            .eq('id', entryId);

          setEntries((prev) =>
            prev.map((e) => (e.id === entryId ? { ...e, planId: newPlan.id } : e))
          );
        }
      } else {
        // Update existing plan — keep title, preview, target_date in sync
        await supabase
          .from('plans')
          .update({
            title: entryRow.title || 'Untitled Plan',
            preview,
            target_date: entryRow.target_date ?? '',
            archived: false,
          })
          .eq('id', planId);
      }
    } else {
      // Tag changed away from 'plan' — soft-archive the linked plan
      if (planId) {
        await supabase
          .from('plans')
          .update({ archived: true })
          .eq('id', planId);
      }
    }
  }, [supabase, user]);

  // Flush on unmount so navigating away never loses an in-progress edit
  useEffect(() => {
    return () => {
      // Fire-and-forget on unmount
      flushPending();
    };
  }, [flushPending]);

  // Load entries from Supabase
  const loadEntries = useCallback(async (currentSelectedId?: string | null) => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from('journal_entries')
      .select('*')
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
      planId: row.plan_id ?? null,
    }));

    setEntries(mapped);
    if (mapped.length > 0 && !currentSelectedId) {
      setSelectedEntryId(mapped[0].id);
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    loadEntries(null);
  }, [loadEntries]);

  const selectedEntry = entries.find((e) => e.id === selectedEntryId) ?? entries[0] ?? null;

  const handleNewEntry = useCallback(async () => {
    // Flush any pending edit before switching
    await flushPending();

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
      planId: null,
    };

    // Optimistically add to local state immediately so editor opens right away
    setEntries((prev) => [newEntry, ...prev]);
    setSelectedEntryId(id);

    // Persist to Supabase in the background
    if (!supabase) return;
    const { error } = await supabase.from('journal_entries').insert({
      id: newEntry.id,
      title: newEntry.title,
      body: newEntry.body,
      tag: newEntry.tag,
      date: newEntry.date,
      date_label: newEntry.dateLabel,
      target_date: null,
      is_today: true,
    });

    if (error) {
      console.error('Failed to persist entry:', error.message);
      setEntries((prev) => prev.filter((e) => e.id !== id));
      setSelectedEntryId(null);
      return;
    }

    // Insert matching idea_tree_nodes row — requires user_id
    if (user) {
      const existingCount = entriesRef.current.length;
      const defaultY = 40 + existingCount * 120;
      const { error: nodeErr } = await supabase.from('idea_tree_nodes').insert({
        id: newEntry.id,
        user_id: user.id,
        title: newEntry.title,
        body: newEntry.body,
        tag: newEntry.tag,
        date_label: newEntry.dateLabel,
        x: 80,
        y: defaultY,
      });
      if (nodeErr) console.error('Failed to insert idea_tree_node:', nodeErr.message);
    }
  }, [supabase, user, flushPending]);

  /** Called by EditorPanel on every keystroke — buffers the update and debounces the DB write */
  const handleUpdateEntry = useCallback((updated: Partial<JournalEntry>) => {
    if (!selectedEntryId) return;

    // Optimistic update — always apply immediately so UI reflects changes
    setEntries((prev) =>
      prev.map((e) => (e.id === selectedEntryId ? { ...e, ...updated } : e))
    );

    // Buffer the latest update (merge with any existing pending update for this entry)
    if (pendingEditRef.current && pendingEditRef.current.entryId === selectedEntryId) {
      pendingEditRef.current.updates = { ...pendingEditRef.current.updates, ...updated };
    } else {
      pendingEditRef.current = { entryId: selectedEntryId, updates: { ...updated } };
    }

    // Reset debounce timer — single write fires 800ms after the last keystroke
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      flushPending();
    }, 800);
  }, [selectedEntryId, flushPending]);

  /** Flush before switching entries so no edit is lost */
  const handleSelectEntry = useCallback(async (id: string) => {
    if (id === selectedEntryId) return;
    await flushPending();
    setSelectedEntryId(id);
  }, [selectedEntryId, flushPending]);

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
          onSelectEntry={handleSelectEntry}
          onNewEntry={handleNewEntry}
        />
        {selectedEntry ? (
          <>
            <EditorPanel
              entry={selectedEntry}
              onUpdate={handleUpdateEntry}
              onFlush={flushPending}
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