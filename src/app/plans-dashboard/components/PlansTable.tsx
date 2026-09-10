'use client';

import React, { useState } from 'react';
import { ArrowUp, ArrowDown, ExternalLink, Pencil, Trash2, Link2, ChevronDown, Archive } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import StatusBadge from '@/components/ui/StatusBadge';
import EmptyState from '@/components/ui/EmptyState';
import Modal from '@/components/ui/Modal';
import { Plan, PlanStatus } from './PlansDashboardContent';
import { BookOpen } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface PlansTableProps {
  plans: Plan[];
  loading?: boolean;
  onPlanUpdated?: (plan: Plan) => void;
  onPlanDeleted?: (planId: string) => void;
}

type SortKey = 'title' | 'targetDate' | 'daysOverdue' | 'status' | 'createdDate';
type SortDir = 'asc' | 'desc';

const statusOptions: { id: string; value: PlanStatus; label: string }[] = [
  { id: 'status-opt-pending', value: 'pending', label: 'Pending' },
  { id: 'status-opt-inprogress', value: 'inprogress', label: 'In Progress' },
  { id: 'status-opt-completed', value: 'completed', label: 'Completed' },
  { id: 'status-opt-overdue', value: 'overdue', label: 'Overdue' },
];

export default function PlansTable({ plans, loading = false, onPlanUpdated, onPlanDeleted }: PlansTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('daysOverdue');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [openStatusDropdown, setOpenStatusDropdown] = useState<string | null>(null);
  const [deleteModalPlan, setDeleteModalPlan] = useState<Plan | null>(null);
  const [archiveModalPlan, setArchiveModalPlan] = useState<Plan | null>(null);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(8);
  const supabase = createClient();
  const router = useRouter();

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const sorted = [...plans].sort((a, b) => {
    let aVal: string | number = '';
    let bVal: string | number = '';
    if (sortKey === 'daysOverdue') { aVal = a.daysOverdue; bVal = b.daysOverdue; }
    else if (sortKey === 'title') { aVal = a.title; bVal = b.title; }
    else if (sortKey === 'status') { aVal = a.status; bVal = b.status; }
    else if (sortKey === 'targetDate') { aVal = a.targetDate; bVal = b.targetDate; }
    else if (sortKey === 'createdDate') { aVal = a.createdDate; bVal = b.createdDate; }

    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
    }
    return sortDir === 'asc'
      ? String(aVal).localeCompare(String(bVal))
      : String(bVal).localeCompare(String(aVal));
  });

  const totalPages = Math.ceil(sorted.length / perPage);
  const paginated = sorted.slice((page - 1) * perPage, page * perPage);

  const handleStatusChange = async (plan: Plan, newStatus: PlanStatus) => {
    setOpenStatusDropdown(null);
    const { error } = await supabase
      .from('plans')
      .update({ status: newStatus })
      .eq('id', plan.id);

    if (error) {
      toast.error('Failed to update status.');
    } else {
      toast.success(`Plan status updated to ${newStatus}.`);
      onPlanUpdated?.({ ...plan, status: newStatus });
    }
  };

  const handleDelete = async () => {
    if (!deleteModalPlan) return;
    const { error } = await supabase
      .from('plans')
      .delete()
      .eq('id', deleteModalPlan.id);

    if (error) {
      toast.error('Failed to delete plan.');
    } else {
      toast.success(`"${deleteModalPlan.title}" deleted.`);
      onPlanDeleted?.(deleteModalPlan.id);
    }
    setDeleteModalPlan(null);
  };

  const handleArchive = async () => {
    if (!archiveModalPlan) return;
    const { error } = await supabase
      .from('plans')
      .update({ archived: true })
      .eq('id', archiveModalPlan.id);

    if (error) {
      toast.error('Failed to archive plan.');
    } else {
      toast.success(`"${archiveModalPlan.title}" archived.`);
      onPlanDeleted?.(archiveModalPlan.id);
    }
    setArchiveModalPlan(null);
  };

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <ArrowUp size={11} className="text-muted-foreground/40" />;
    return sortDir === 'asc'
      ? <ArrowUp size={11} style={{ color: 'var(--primary)' }} />
      : <ArrowDown size={11} style={{ color: 'var(--primary)' }} />;
  };

  if (loading) {
    return (
      <div
        className="rounded-xl border border-border"
        style={{ backgroundColor: 'var(--card)' }}
      >
        <div className="flex items-center justify-center py-16">
          <p className="text-sm text-muted-foreground">Loading plans…</p>
        </div>
      </div>
    );
  }

  if (plans.length === 0) {
    return (
      <div
        className="rounded-xl border border-border"
        style={{ backgroundColor: 'var(--card)' }}
      >
        <EmptyState
          icon={BookOpen}
          title="No plans yet"
          description="Your plans will appear here once you create them."
        />
      </div>
    );
  }

  return (
    <>
      <div
        className="rounded-xl border border-border overflow-hidden"
        style={{ backgroundColor: 'var(--card)' }}
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead>
              <tr style={{ backgroundColor: 'rgba(92,61,46,0.04)', borderBottom: '1px solid var(--border)' }}>
                {[
                  { key: 'title' as SortKey, label: 'Plan title', width: '28%' },
                  { key: 'targetDate' as SortKey, label: 'Target date', width: '12%' },
                  { key: 'daysOverdue' as SortKey, label: 'Days overdue', width: '11%' },
                  { key: 'status' as SortKey, label: 'Status', width: '12%' },
                  { key: 'createdDate' as SortKey, label: 'Created', width: '11%' },
                ].map((col) => (
                  <th
                    key={`th-${col.key}`}
                    style={{ width: col.width }}
                    className="px-4 py-3 text-left"
                  >
                    <button
                      onClick={() => handleSort(col.key)}
                      className="flex items-center gap-1 text-xs font-semibold text-muted-foreground uppercase tracking-wide hover:text-foreground transition-colors"
                    >
                      {col.label}
                      <SortIcon col={col.key} />
                    </button>
                  </th>
                ))}
                <th className="px-4 py-3 text-left" style={{ width: '10%' }}>
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Links</span>
                </th>
                <th className="px-4 py-3 text-right" style={{ width: '16%' }}>
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((plan, idx) => {
                const isDropdownOpen = openStatusDropdown === plan.id;
                const isCompleted = plan.status === 'completed';

                return (
                  <tr
                    key={plan.id}
                    className="border-b border-border/60 transition-all duration-150 hover:bg-muted/30 group"
                    style={idx % 2 === 0 ? {} : { backgroundColor: 'rgba(92,61,46,0.02)' }}
                  >
                    {/* Title */}
                    <td className="px-4 py-3.5">
                      <div>
                        <p className="text-sm font-medium text-foreground truncate max-w-[220px]">
                          {plan.title}
                        </p>
                        <p className="text-xs text-muted-foreground truncate max-w-[220px] mt-0.5 leading-relaxed">
                          {plan.preview}
                        </p>
                      </div>
                    </td>

                    {/* Target date */}
                    <td className="px-4 py-3.5">
                      <span
                        className={`text-sm text-tabular ${
                          plan.status === 'overdue' ? 'font-medium' : ''
                        }`}
                        style={{ color: plan.status === 'overdue' ? 'var(--overdue)' : 'var(--foreground)' }}
                      >
                        {plan.targetDate || '—'}
                      </span>
                    </td>

                    {/* Days overdue */}
                    <td className="px-4 py-3.5">
                      {plan.daysOverdue > 0 ? (
                        <span
                          className="text-sm font-semibold text-tabular"
                          style={{ color: 'var(--overdue)' }}
                        >
                          +{plan.daysOverdue}d
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </td>

                    {/* Status — inline dropdown */}
                    <td className="px-4 py-3.5">
                      <div className="relative">
                        <button
                          onClick={() => setOpenStatusDropdown(isDropdownOpen ? null : plan.id)}
                          className="flex items-center gap-1 transition-all duration-150 hover:opacity-80 active:scale-95"
                          aria-label={`Change status for ${plan.title}`}
                        >
                          <StatusBadge status={plan.status} />
                          <ChevronDown size={10} className="text-muted-foreground" />
                        </button>

                        {isDropdownOpen && (
                          <div
                            className="absolute top-full left-0 mt-1 w-40 rounded-xl border border-border shadow-card-md z-30 fade-in"
                            style={{ backgroundColor: 'var(--card)' }}
                          >
                            {statusOptions.map((opt) => (
                              <button
                                key={opt.id}
                                onClick={() => handleStatusChange(plan, opt.value)}
                                className={`w-full flex items-center gap-2 px-3 py-2 text-left text-xs transition-all duration-150 first:rounded-t-xl last:rounded-b-xl ${
                                  plan.status === opt.value ? '' : 'hover:bg-muted/60'
                                }`}
                                style={plan.status === opt.value ? { backgroundColor: 'rgba(92,61,46,0.07)' } : {}}
                              >
                                <StatusBadge status={opt.value} />
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Created */}
                    <td className="px-4 py-3.5">
                      <span className="text-sm text-muted-foreground text-tabular">{plan.createdDate}</span>
                    </td>

                    {/* Linked count */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Link2 size={12} />
                        <span className="text-tabular">{plan.linkedCount}</span>
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                        <button
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all duration-150"
                          title="Open entry"
                          aria-label={`Open entry: ${plan.title}`}
                          onClick={() => router.push(`/plans-dashboard/${plan.id}`)}
                        >
                          <ExternalLink size={13} />
                        </button>
                        <button
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all duration-150"
                          title="Edit plan"
                          aria-label={`Edit plan: ${plan.title}`}
                        >
                          <Pencil size={13} />
                        </button>
                        {isCompleted && (
                          <button
                            onClick={() => setArchiveModalPlan(plan)}
                            className="p-1.5 rounded-lg text-muted-foreground hover:bg-green-50 transition-all duration-150"
                            title="Archive completed plan"
                            aria-label={`Archive plan: ${plan.title}`}
                          >
                            <Archive size={13} style={{ color: '#16A34A' }} />
                          </button>
                        )}
                        <button
                          onClick={() => setDeleteModalPlan(plan)}
                          className="p-1.5 rounded-lg text-muted-foreground hover:bg-overdue-bg transition-all duration-150"
                          title="Delete plan — this cannot be undone"
                          aria-label={`Delete plan: ${plan.title}`}
                          style={{ '--tw-text-opacity': '1' } as React.CSSProperties}
                        >
                          <Trash2 size={13} style={{ color: 'var(--overdue)' }} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div
          className="flex items-center justify-between px-4 py-3 border-t border-border"
          style={{ backgroundColor: 'rgba(92,61,46,0.03)' }}
        >
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Rows per page:</span>
            <select
              value={perPage}
              onChange={(e) => { setPerPage(Number(e.target.value)); setPage(1); }}
              className="text-xs border border-border rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-ring transition-all"
              style={{ backgroundColor: 'var(--input)', color: 'var(--foreground)' }}
            >
              {[5, 8, 10, 20].map((n) => (
                <option key={`perpage-${n}`} value={n}>{n}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground mr-2 text-tabular">
              {sorted.length === 0 ? '0' : `${(page - 1) * perPage + 1}–${Math.min(page * perPage, sorted.length)}`} of {sorted.length}
            </span>
            {Array.from({ length: totalPages }).map((_, i) => (
              <button
                key={`page-btn-${i + 1}`}
                onClick={() => setPage(i + 1)}
                className="w-7 h-7 rounded-lg text-xs font-medium transition-all duration-150 active:scale-95"
                style={
                  page === i + 1
                    ? { backgroundColor: 'var(--primary)', color: 'var(--primary-foreground)' }
                    : { color: 'var(--muted-foreground)' }
                }
              >
                {i + 1}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Archive confirmation modal */}
      <Modal
        open={!!archiveModalPlan}
        onClose={() => setArchiveModalPlan(null)}
        title="Archive completed plan"
      >
        {archiveModalPlan && (
          <div>
            <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
              Archive{' '}
              <strong className="text-foreground">"{archiveModalPlan.title}"</strong>?
              Archived plans are hidden from the dashboard but not deleted.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setArchiveModalPlan(null)}
                className="px-4 py-2 rounded-lg text-sm font-medium border border-border transition-all duration-150 hover:bg-muted/60 active:scale-95"
                style={{ color: 'var(--muted-foreground)' }}
              >
                Cancel
              </button>
              <button
                onClick={handleArchive}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 hover:opacity-90 active:scale-95"
                style={{ backgroundColor: '#16A34A', color: 'white' }}
              >
                <Archive size={14} />
                Archive plan
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete confirmation modal */}
      <Modal
        open={!!deleteModalPlan}
        onClose={() => setDeleteModalPlan(null)}
        title="Delete plan entry"
      >
        {deleteModalPlan && (
          <div>
            <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
              Are you sure you want to delete{' '}
              <strong className="text-foreground">"{deleteModalPlan.title}"</strong>?
              This will also remove all links to this entry. This cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDeleteModalPlan(null)}
                className="px-4 py-2 rounded-lg text-sm font-medium border border-border transition-all duration-150 hover:bg-muted/60 active:scale-95"
                style={{ color: 'var(--muted-foreground)' }}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 hover:opacity-90 active:scale-95"
                style={{ backgroundColor: 'var(--overdue)', color: 'white' }}
              >
                Delete plan
              </button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}