'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Calendar, ChevronDown, Check, X, Pencil, BookOpen, Clock } from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import StatusBadge from '@/components/ui/StatusBadge';
import EmptyState from '@/components/ui/EmptyState';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { PlanStatus } from '../components/PlansDashboardContent';
import { toast } from 'sonner';

interface JournalEntry {
  id: string;
  title: string;
  body: string;
  tag: string;
  date: string;
  createdAt: string;
}

interface PlanDetail {
  id: string;
  title: string;
  preview: string;
  status: PlanStatus;
  targetDate: string | null;
  createdAt: string;
  linkedCount: number;
}

const statusOptions: { value: PlanStatus; label: string }[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'inprogress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'overdue', label: 'Overdue' },
];

export default function PlanDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const supabase = createClient();
  const planId = params?.planId as string;

  const [plan, setPlan] = useState<PlanDetail | null>(null);
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Inline edit state
  const [editingDate, setEditingDate] = useState(false);
  const [dateValue, setDateValue] = useState('');
  const [savingDate, setSavingDate] = useState(false);
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const [savingStatus, setSavingStatus] = useState(false);

  const fetchPlan = useCallback(async () => {
    if (!user || !planId) return;
    setLoading(true);

    const { data: planData, error: planError } = await supabase
      .from('plans')
      .select('*')
      .eq('id', planId)
      .eq('user_id', user.id)
      .single();

    if (planError || !planData) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    const mapped: PlanDetail = {
      id: planData.id,
      title: planData.title,
      preview: planData.preview,
      status: planData.status as PlanStatus,
      targetDate: planData.target_date ?? null,
      createdAt: new Date(planData.created_at).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      }),
      linkedCount: planData.linked_count ?? 0,
    };
    setPlan(mapped);
    setDateValue(planData.target_date ?? '');

    // Fetch linked journal entries
    const { data: entryData } = await supabase
      .from('journal_entries')
      .select('id, title, body, tag, date, created_at')
      .eq('plan_id', planId)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (entryData) {
      setEntries(
        entryData.map((e) => ({
          id: e.id,
          title: e.title,
          body: e.body,
          tag: e.tag,
          date: e.date,
          createdAt: new Date(e.created_at).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          }),
        }))
      );
    }

    setLoading(false);
  }, [user, planId]);

  useEffect(() => {
    fetchPlan();
  }, [fetchPlan]);

  const handleStatusChange = async (newStatus: PlanStatus) => {
    if (!plan) return;
    setStatusDropdownOpen(false);
    setSavingStatus(true);
    const { error } = await supabase
      .from('plans')
      .update({ status: newStatus })
      .eq('id', plan.id);

    if (error) {
      toast.error('Failed to update status.');
    } else {
      setPlan((prev) => prev ? { ...prev, status: newStatus } : prev);
      toast.success('Status updated.');
    }
    setSavingStatus(false);
  };

  const handleSaveDate = async () => {
    if (!plan) return;
    setSavingDate(true);
    const { error } = await supabase
      .from('plans')
      .update({ target_date: dateValue || null })
      .eq('id', plan.id);

    if (error) {
      toast.error('Failed to update target date.');
    } else {
      setPlan((prev) => prev ? { ...prev, targetDate: dateValue || null } : prev);
      toast.success('Target date updated.');
      setEditingDate(false);
    }
    setSavingDate(false);
  };

  const handleCancelDate = () => {
    setDateValue(plan?.targetDate ?? '');
    setEditingDate(false);
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="h-full flex items-center justify-center">
          <p className="text-sm text-muted-foreground">Loading plan…</p>
        </div>
      </AppLayout>
    );
  }

  if (notFound || !plan) {
    return (
      <AppLayout>
        <div className="h-full flex flex-col items-center justify-center gap-4">
          <p className="text-sm text-muted-foreground">Plan not found.</p>
          <Link
            href="/plans-dashboard"
            className="text-sm font-medium transition-colors hover:opacity-80"
            style={{ color: 'var(--primary)' }}
          >
            ← Back to Plans
          </Link>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="h-full overflow-y-auto">
        <div className="px-6 py-6 max-w-3xl mx-auto">

          {/* Back navigation */}
          <Link
            href="/plans-dashboard"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
          >
            <ArrowLeft size={14} />
            Back to Plans
          </Link>

          {/* Plan header card */}
          <div
            className="rounded-xl border border-border p-6 mb-6"
            style={{ backgroundColor: 'var(--card)' }}
          >
            {/* Title */}
            <h1 className="text-2xl font-semibold font-serif text-foreground mb-4 leading-snug">
              {plan.title}
            </h1>

            {/* Meta row */}
            <div className="flex flex-wrap items-center gap-5">

              {/* Status — inline dropdown */}
              <div className="flex flex-col gap-1">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Status</span>
                <div className="relative">
                  <button
                    onClick={() => setStatusDropdownOpen((o) => !o)}
                    disabled={savingStatus}
                    className="flex items-center gap-1.5 transition-all duration-150 hover:opacity-80 active:scale-95 disabled:opacity-50"
                    aria-label="Change plan status"
                  >
                    <StatusBadge status={plan.status} size="md" />
                    <ChevronDown size={12} className="text-muted-foreground" />
                  </button>

                  {statusDropdownOpen && (
                    <div
                      className="absolute top-full left-0 mt-1.5 w-44 rounded-xl border border-border shadow-lg z-30"
                      style={{ backgroundColor: 'var(--card)' }}
                    >
                      {statusOptions.map((opt) => (
                        <button
                          key={`status-opt-${opt.value}`}
                          onClick={() => handleStatusChange(opt.value)}
                          className={`w-full flex items-center gap-2 px-3 py-2.5 text-left text-sm transition-all duration-150 first:rounded-t-xl last:rounded-b-xl ${
                            plan.status === opt.value ? '' : 'hover:bg-muted/60'
                          }`}
                          style={plan.status === opt.value ? { backgroundColor: 'rgba(92,61,46,0.07)' } : {}}
                        >
                          <StatusBadge status={opt.value} />
                          {plan.status === opt.value && (
                            <Check size={12} className="ml-auto" style={{ color: 'var(--primary)' }} />
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Divider */}
              <div className="w-px h-10 bg-border" />

              {/* Target date — inline edit */}
              <div className="flex flex-col gap-1">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Target date</span>
                {editingDate ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="date"
                      value={dateValue}
                      onChange={(e) => setDateValue(e.target.value)}
                      className="text-sm rounded-lg border border-border px-2 py-1 focus:outline-none focus:ring-1 focus:ring-ring transition-all"
                      style={{ backgroundColor: 'var(--input)', color: 'var(--foreground)' }}
                      autoFocus
                    />
                    <button
                      onClick={handleSaveDate}
                      disabled={savingDate}
                      className="p-1.5 rounded-lg transition-all duration-150 hover:opacity-80 active:scale-95 disabled:opacity-50"
                      style={{ backgroundColor: 'var(--primary)', color: 'var(--primary-foreground)' }}
                      aria-label="Save date"
                    >
                      <Check size={13} />
                    </button>
                    <button
                      onClick={handleCancelDate}
                      className="p-1.5 rounded-lg border border-border transition-all duration-150 hover:bg-muted/60 active:scale-95"
                      aria-label="Cancel date edit"
                    >
                      <X size={13} className="text-muted-foreground" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setEditingDate(true)}
                    className="flex items-center gap-1.5 group transition-all duration-150 hover:opacity-80"
                    aria-label="Edit target date"
                  >
                    <Calendar size={14} className="text-muted-foreground" />
                    <span className="text-sm text-foreground">
                      {plan.targetDate || <span className="text-muted-foreground italic">No date set</span>}
                    </span>
                    <Pencil
                      size={11}
                      className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                    />
                  </button>
                )}
              </div>

              {/* Divider */}
              <div className="w-px h-10 bg-border" />

              {/* Created */}
              <div className="flex flex-col gap-1">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Created</span>
                <div className="flex items-center gap-1.5">
                  <Clock size={14} className="text-muted-foreground" />
                  <span className="text-sm text-foreground">{plan.createdAt}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Linked journal entries */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold text-foreground font-serif">
                Linked journal entries
              </h2>
              <span className="text-xs text-muted-foreground text-tabular">
                {entries.length} {entries.length === 1 ? 'entry' : 'entries'}
              </span>
            </div>

            {entries.length === 0 ? (
              <div
                className="rounded-xl border border-border"
                style={{ backgroundColor: 'var(--card)' }}
              >
                <EmptyState
                  icon={BookOpen}
                  title="No linked entries"
                  description="Link journal entries to this plan using the Link Plan button in the editor."
                />
              </div>
            ) : (
              <div className="space-y-3">
                {entries.map((entry) => (
                  <div
                    key={entry.id}
                    className="rounded-xl border border-border p-4 transition-all duration-150 hover:border-border/80"
                    style={{ backgroundColor: 'var(--card)' }}
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <h3 className="text-sm font-semibold text-foreground leading-snug">
                        {entry.title || 'Untitled entry'}
                      </h3>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {entry.tag && (
                          <StatusBadge status={entry.tag as 'idea' | 'thought' | 'plan'} />
                        )}
                        <span className="text-xs text-muted-foreground text-tabular whitespace-nowrap">
                          {entry.createdAt}
                        </span>
                      </div>
                    </div>
                    {entry.body && (
                      <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">
                        {entry.body}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </AppLayout>
  );
}
