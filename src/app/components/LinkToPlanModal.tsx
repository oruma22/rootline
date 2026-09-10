'use client';

import React, { useState, useEffect } from 'react';
import { X, Plus, Link2, Calendar, Check, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { JournalEntry } from '../page';

interface Plan {
  id: string;
  title: string;
  status: string;
  target_date: string | null;
}

interface LinkToPlanModalProps {
  entry: JournalEntry;
  onClose: () => void;
  onLinked: (planId: string, planTitle: string) => void;
}

export default function LinkToPlanModal({ entry, onClose, onLinked }: LinkToPlanModalProps) {
  const [mode, setMode] = useState<'choose' | 'create' | 'link'>('choose');
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [newPlanTitle, setNewPlanTitle] = useState(entry.title || '');
  const [targetDate, setTargetDate] = useState(entry.targetDate || '');
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const { user } = useAuth();
  const supabase = createClient();

  useEffect(() => {
    if (mode === 'link') {
      fetchPlans();
    }
  }, [mode]);

  const fetchPlans = async () => {
    if (!user) return;
    setLoadingPlans(true);
    const { data, error } = await supabase
      .from('plans')
      .select('id, title, status, target_date')
      .eq('user_id', user.id)
      .neq('status', 'completed')
      .order('created_at', { ascending: false });
    if (!error && data) setPlans(data);
    setLoadingPlans(false);
  };

  const handleCreatePlan = async () => {
    if (!newPlanTitle.trim()) {
      setError('Plan title is required.');
      return;
    }
    if (!user) return;
    setSaving(true);
    setError('');

    const preview = entry.body.trim().slice(0, 120) || newPlanTitle;
    const now = new Date();
    let daysOverdue = 0;
    if (targetDate) {
      const diff = Math.floor((now.getTime() - new Date(targetDate).getTime()) / 86400000);
      daysOverdue = diff > 0 ? diff : 0;
    }

    const { data, error: insertError } = await supabase
      .from('plans')
      .insert({
        user_id: user.id,
        title: newPlanTitle.trim(),
        preview,
        status: 'pending',
        target_date: targetDate || null,
        days_overdue: daysOverdue,
        linked_count: 1,
      })
      .select('id, title')
      .single();

    if (insertError || !data) {
      setError('Failed to create plan. Please try again.');
      setSaving(false);
      return;
    }

    // Link journal entry to plan
    await supabase
      .from('journal_entries')
      .update({ plan_id: data.id, target_date: targetDate || null })
      .eq('id', entry.id);

    setSaving(false);
    onLinked(data.id, data.title);
  };

  const handleLinkExisting = async () => {
    if (!selectedPlanId) {
      setError('Please select a plan.');
      return;
    }
    if (!user) return;
    setSaving(true);
    setError('');

    // Update journal entry with plan_id
    const { error: updateError } = await supabase
      .from('journal_entries')
      .update({ plan_id: selectedPlanId, target_date: targetDate || null })
      .eq('id', entry.id);

    if (updateError) {
      setError('Failed to link plan. Please try again.');
      setSaving(false);
      return;
    }

    // Increment linked_count on the plan
    const plan = plans.find((p) => p.id === selectedPlanId);
    if (plan) {
      await supabase.rpc('increment_linked_count', { plan_id: selectedPlanId }).catch(() => null);
    }

    setSaving(false);
    onLinked(selectedPlanId, plan?.title || '');
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-border shadow-card-md overflow-hidden"
        style={{ backgroundColor: 'var(--card)' }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 border-b border-border"
          style={{ backgroundColor: 'rgba(92,61,46,0.04)' }}
        >
          <div className="flex items-center gap-2">
            <Link2 size={15} style={{ color: 'var(--primary)' }} />
            <h2 className="text-sm font-semibold text-foreground">Link Entry to Plan</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-muted/60 transition-colors"
          >
            <X size={14} className="text-muted-foreground" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-5">
          {mode === 'choose' && (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground mb-4">
                Link <span className="font-medium text-foreground">"{entry.title || 'this entry'}"</span> to a plan.
              </p>
              <button
                onClick={() => setMode('create')}
                className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border border-border text-left transition-all duration-150 hover:bg-muted/40 active:scale-[0.99]"
                style={{ backgroundColor: 'var(--input)' }}
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: 'rgba(92,61,46,0.1)' }}
                >
                  <Plus size={14} style={{ color: 'var(--primary)' }} />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Create new plan</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Turn this entry into a new plan</p>
                </div>
              </button>
              <button
                onClick={() => setMode('link')}
                className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border border-border text-left transition-all duration-150 hover:bg-muted/40 active:scale-[0.99]"
                style={{ backgroundColor: 'var(--input)' }}
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: 'rgba(92,61,46,0.1)' }}
                >
                  <Link2 size={14} style={{ color: 'var(--primary)' }} />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Link to existing plan</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Connect this entry to a plan you already have</p>
                </div>
              </button>
            </div>
          )}

          {mode === 'create' && (
            <div className="space-y-4">
              <button
                onClick={() => { setMode('choose'); setError(''); }}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mb-1"
              >
                ← Back
              </button>
              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">Plan title</label>
                <input
                  type="text"
                  value={newPlanTitle}
                  onChange={(e) => setNewPlanTitle(e.target.value)}
                  placeholder="Name your plan…"
                  className="w-full px-3 py-2.5 text-sm rounded-lg border border-border focus:outline-none focus:ring-1 focus:ring-ring transition-all"
                  style={{ backgroundColor: 'var(--input)', color: 'var(--foreground)' }}
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">
                  Target date <span className="text-muted-foreground font-normal">(optional)</span>
                </label>
                <div className="flex items-center gap-2">
                  <Calendar size={13} className="text-muted-foreground flex-shrink-0" />
                  <input
                    type="date"
                    value={targetDate}
                    onChange={(e) => setTargetDate(e.target.value)}
                    className="flex-1 px-3 py-2.5 text-sm rounded-lg border border-border focus:outline-none focus:ring-1 focus:ring-ring transition-all"
                    style={{ backgroundColor: 'var(--input)', color: 'var(--foreground)' }}
                  />
                </div>
              </div>
              {error && <p className="text-xs" style={{ color: 'var(--overdue)' }}>{error}</p>}
            </div>
          )}

          {mode === 'link' && (
            <div className="space-y-4">
              <button
                onClick={() => { setMode('choose'); setError(''); setSelectedPlanId(null); }}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mb-1"
              >
                ← Back
              </button>
              <div>
                <label className="block text-xs font-medium text-foreground mb-2">Select a plan</label>
                {loadingPlans ? (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 size={16} className="animate-spin text-muted-foreground" />
                  </div>
                ) : plans.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-4 text-center">No active plans found. Create one instead.</p>
                ) : (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto custom-scroll">
                    {plans.map((plan) => (
                      <button
                        key={plan.id}
                        onClick={() => setSelectedPlanId(plan.id)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border text-left transition-all duration-150"
                        style={{
                          borderColor: selectedPlanId === plan.id ? 'var(--primary)' : 'var(--border)',
                          backgroundColor: selectedPlanId === plan.id ? 'rgba(92,61,46,0.07)' : 'var(--input)',
                        }}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{plan.title}</p>
                          {plan.target_date && (
                            <p className="text-xs text-muted-foreground mt-0.5">{plan.target_date}</p>
                          )}
                        </div>
                        {selectedPlanId === plan.id && (
                          <Check size={13} style={{ color: 'var(--primary)' }} className="flex-shrink-0" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">
                  Target date <span className="text-muted-foreground font-normal">(optional)</span>
                </label>
                <div className="flex items-center gap-2">
                  <Calendar size={13} className="text-muted-foreground flex-shrink-0" />
                  <input
                    type="date"
                    value={targetDate}
                    onChange={(e) => setTargetDate(e.target.value)}
                    className="flex-1 px-3 py-2.5 text-sm rounded-lg border border-border focus:outline-none focus:ring-1 focus:ring-ring transition-all"
                    style={{ backgroundColor: 'var(--input)', color: 'var(--foreground)' }}
                  />
                </div>
              </div>
              {error && <p className="text-xs" style={{ color: 'var(--overdue)' }}>{error}</p>}
            </div>
          )}
        </div>

        {/* Footer */}
        {mode !== 'choose' && (
          <div
            className="flex items-center justify-end gap-2 px-5 py-4 border-t border-border"
            style={{ backgroundColor: 'rgba(92,61,46,0.02)' }}
          >
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm font-medium border border-border transition-all duration-150 hover:bg-muted/60 active:scale-95"
              style={{ color: 'var(--muted-foreground)' }}
            >
              Cancel
            </button>
            <button
              onClick={mode === 'create' ? handleCreatePlan : handleLinkExisting}
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 hover:opacity-90 active:scale-95 disabled:opacity-50"
              style={{ backgroundColor: 'var(--primary)', color: 'var(--primary-foreground)' }}
            >
              {saving ? (
                <><Loader2 size={12} className="animate-spin" /> Saving…</>
              ) : mode === 'create' ? (
                <><Plus size={12} /> Create Plan</>
              ) : (
                <><Link2 size={12} /> Link Plan</>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
