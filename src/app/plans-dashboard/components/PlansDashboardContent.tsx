'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Filter, Search, X, RefreshCw, Plus } from 'lucide-react';
import PlanStatsGrid from './PlanStatsGrid';
import PlansTable from './PlansTable';
import OverdueAlertBanner from './OverdueAlertBanner';
import Modal from '@/components/ui/Modal';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type PlanStatus = 'pending' | 'inprogress' | 'completed' | 'overdue';

export interface Plan {
  id: string;
  title: string;
  createdDate: string;
  targetDate: string;
  daysOverdue: number;
  status: PlanStatus;
  linkedCount: number;
  preview: string;
  entryDate: string;
}

export default function PlansDashboardContent() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | PlanStatus>('all');
  const [search, setSearch] = useState('');

  // New plan modal state
  const [newPlanModalOpen, setNewPlanModalOpen] = useState(false);
  const [newPlanTitle, setNewPlanTitle] = useState('');
  const [newPlanPreview, setNewPlanPreview] = useState('');
  const [newPlanTargetDate, setNewPlanTargetDate] = useState('');
  const [newPlanSaving, setNewPlanSaving] = useState(false);
  const [newPlanError, setNewPlanError] = useState('');

  const { user } = useAuth();
  const supabase = createClient();

  const fetchPlans = useCallback(async () => {
    if (!user) {
      setPlans([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from('plans')
      .select('*')
      .eq('user_id', user.id)
      .eq('archived', false)
      .order('created_at', { ascending: false });

    if (!error && data) {
      const mapped: Plan[] = data.map((row) => ({
        id: row.id,
        title: row.title,
        preview: row.preview,
        status: row.status as PlanStatus,
        targetDate: row.target_date,
        daysOverdue: row.days_overdue,
        linkedCount: row.linked_count,
        createdDate: new Date(row.created_at).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }),
        entryDate: new Date(row.created_at).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        }),
      }));
      setPlans(mapped);
    } else {
      setPlans([]);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  const overduePlans = plans.filter((p) => p.status === 'overdue');
  const openPlans = plans.filter((p) => p.status !== 'completed');
  const completedPlans = plans.filter((p) => p.status === 'completed');

  const filtered = plans
    .filter((p) => {
      const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
      const matchesSearch =
        !search ||
        p.title.toLowerCase().includes(search.toLowerCase()) ||
        p.preview.toLowerCase().includes(search.toLowerCase());
      return matchesStatus && matchesSearch;
    })
    .sort((a, b) => b.daysOverdue - a.daysOverdue);

  const handleRefresh = () => {
    setStatusFilter('all');
    setSearch('');
    fetchPlans();
  };

  const handlePlanUpdated = (updatedPlan: Plan) => {
    setPlans((prev) => prev.map((p) => (p.id === updatedPlan.id ? updatedPlan : p)));
  };

  const handlePlanDeleted = (planId: string) => {
    setPlans((prev) => prev.filter((p) => p.id !== planId));
  };

  const openNewPlanModal = () => {
    setNewPlanTitle('');
    setNewPlanPreview('');
    setNewPlanTargetDate('');
    setNewPlanError('');
    setNewPlanModalOpen(true);
  };

  const handleCreatePlan = async () => {
    if (!newPlanTitle.trim()) {
      setNewPlanError('Plan title is required.');
      return;
    }
    if (!user) return;
    setNewPlanSaving(true);
    setNewPlanError('');

    const { data, error } = await supabase
      .from('plans')
      .insert({
        user_id: user.id,
        title: newPlanTitle.trim(),
        preview: newPlanPreview.trim() || '',
        status: 'pending',
        target_date: newPlanTargetDate || null,
        days_overdue: 0,
        linked_count: 0,
      })
      .select()
      .single();

    setNewPlanSaving(false);

    if (error) {
      setNewPlanError('Failed to create plan. Please try again.');
    } else if (data) {
      const newPlan: Plan = {
        id: data.id,
        title: data.title,
        preview: data.preview,
        status: data.status as PlanStatus,
        targetDate: data.target_date,
        daysOverdue: data.days_overdue,
        linkedCount: data.linked_count,
        createdDate: new Date(data.created_at).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }),
        entryDate: new Date(data.created_at).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        }),
      };
      setPlans((prev) => [newPlan, ...prev]);
      setNewPlanModalOpen(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="px-6 py-6 max-w-screen-2xl mx-auto">
        {/* Page header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-semibold font-serif text-foreground">Plans</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Track your intentions.{' '}
              {overduePlans.length > 0 && (
                <span style={{ color: 'var(--overdue)' }}>
                  {overduePlans.length} plan{overduePlans.length > 1 ? 's' : ''} overdue.
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border border-border transition-all duration-150 hover:bg-muted/60 active:scale-95"
              style={{ color: 'var(--muted-foreground)' }}
            >
              <RefreshCw size={13} />
              Refresh
            </button>
            <button
              onClick={openNewPlanModal}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 hover:opacity-90 active:scale-95"
              style={{ backgroundColor: 'var(--primary)', color: 'var(--primary-foreground)' }}
            >
              <Plus size={14} />
              New Plan
            </button>
          </div>
        </div>

        {/* Overdue alert banner */}
        {overduePlans.length > 0 && <OverdueAlertBanner count={overduePlans.length} plans={overduePlans} />}

        {/* Stats grid — clicking a card filters the list */}
        <PlanStatsGrid
          total={plans.length}
          open={openPlans.length}
          overdue={overduePlans.length}
          completed={completedPlans.length}
          activeFilter={statusFilter}
          onFilter={(f) => {
            setStatusFilter(f);
            setSearch('');
          }}
        />

        {/* Filters */}
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <div className="relative flex-1 min-w-48 max-w-72">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search plans…"
              className="w-full pl-7 pr-7 py-2 text-sm rounded-lg border border-border focus:outline-none focus:ring-1 focus:ring-ring transition-all"
              style={{ backgroundColor: 'var(--card)', color: 'var(--foreground)' }}
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

          <div className="flex items-center gap-1">
            <Filter size={13} className="text-muted-foreground" />
            {(['all', 'pending', 'inprogress', 'overdue', 'completed'] as const).map((s) => {
              const labels: Record<string, string> = {
                all: 'All',
                pending: 'Pending',
                inprogress: 'In Progress',
                overdue: 'Overdue',
                completed: 'Completed',
              };
              const counts: Record<string, number> = {
                all: plans.length,
                pending: plans.filter((p) => p.status === 'pending').length,
                inprogress: plans.filter((p) => p.status === 'inprogress').length,
                overdue: overduePlans.length,
                completed: completedPlans.length,
              };
              return (
                <button
                  key={`status-filter-${s}`}
                  onClick={() => setStatusFilter(s)}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 active:scale-95"
                  style={
                    statusFilter === s
                      ? { backgroundColor: 'var(--primary)', color: 'var(--primary-foreground)' }
                      : { backgroundColor: 'var(--muted)', color: 'var(--muted-foreground)' }
                  }
                >
                  {labels[s]}
                  <span
                    className="ml-0.5 text-tabular"
                    style={{
                      opacity: statusFilter === s ? 0.8 : 0.7,
                      fontSize: '10px',
                    }}
                  >
                    {counts[s]}
                  </span>
                </button>
              );
            })}
          </div>

          <span className="ml-auto text-xs text-muted-foreground text-tabular">
            {filtered.length} of {plans.length} plans
          </span>
        </div>

        {/* Table */}
        <PlansTable
          plans={filtered}
          loading={loading}
          onPlanUpdated={handlePlanUpdated}
          onPlanDeleted={handlePlanDeleted}
        />
      </div>

      {/* New Plan Modal */}
      <Modal
        open={newPlanModalOpen}
        onClose={() => setNewPlanModalOpen(false)}
        title="Create new plan"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
              Plan title <span style={{ color: 'var(--overdue)' }}>*</span>
            </label>
            <input
              type="text"
              value={newPlanTitle}
              onChange={(e) => { setNewPlanTitle(e.target.value); setNewPlanError(''); }}
              placeholder="e.g. Launch side project by Q4"
              className="w-full px-3 py-2 text-sm rounded-lg border border-border focus:outline-none focus:ring-1 focus:ring-ring transition-all"
              style={{ backgroundColor: 'var(--input)', color: 'var(--foreground)' }}
              autoFocus
              onKeyDown={(e) => { if (e.key === 'Enter') handleCreatePlan(); }}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
              Description <span className="font-normal normal-case">(optional)</span>
            </label>
            <textarea
              value={newPlanPreview}
              onChange={(e) => setNewPlanPreview(e.target.value)}
              placeholder="Brief description or intention for this plan…"
              rows={3}
              className="w-full px-3 py-2 text-sm rounded-lg border border-border focus:outline-none focus:ring-1 focus:ring-ring transition-all resize-none"
              style={{ backgroundColor: 'var(--input)', color: 'var(--foreground)' }}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
              Target date <span className="font-normal normal-case">(optional)</span>
            </label>
            <input
              type="date"
              value={newPlanTargetDate}
              onChange={(e) => setNewPlanTargetDate(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-border focus:outline-none focus:ring-1 focus:ring-ring transition-all"
              style={{ backgroundColor: 'var(--input)', color: 'var(--foreground)' }}
            />
          </div>

          {newPlanError && (
            <p className="text-xs font-medium" style={{ color: 'var(--overdue)' }}>
              {newPlanError}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button
              onClick={() => setNewPlanModalOpen(false)}
              className="px-4 py-2 rounded-lg text-sm font-medium border border-border transition-all duration-150 hover:bg-muted/60 active:scale-95"
              style={{ color: 'var(--muted-foreground)' }}
            >
              Cancel
            </button>
            <button
              onClick={handleCreatePlan}
              disabled={newPlanSaving}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 hover:opacity-90 active:scale-95 disabled:opacity-60"
              style={{ backgroundColor: 'var(--primary)', color: 'var(--primary-foreground)' }}
            >
              {newPlanSaving ? 'Creating…' : (
                <>
                  <Plus size={14} />
                  Create plan
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}