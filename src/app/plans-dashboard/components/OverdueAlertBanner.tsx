'use client';

import React, { useState } from 'react';
import { AlertTriangle, X, ChevronDown, ChevronUp } from 'lucide-react';
import { Plan } from './PlansDashboardContent';

interface OverdueAlertBannerProps {
  count: number;
  plans: Plan[];
}

export default function OverdueAlertBanner({ count, plans }: OverdueAlertBannerProps) {
  const [dismissed, setDismissed] = useState(false);
  const [expanded, setExpanded] = useState(false);

  if (dismissed) return null;

  const mostOverdue = [...plans].sort((a, b) => b.daysOverdue - a.daysOverdue)[0];

  return (
    <div
      className="mb-5 rounded-xl border p-4 fade-in"
      style={{
        backgroundColor: 'var(--overdue-bg)',
        borderColor: 'rgba(192,57,43,0.3)',
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" style={{ color: 'var(--overdue)' }} />
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--overdue)' }}>
              {count} plan{count > 1 ? 's are' : ' is'} overdue
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'rgba(192,57,43,0.8)' }}>
              Most overdue: <strong>{mostOverdue.title}</strong> — {mostOverdue.daysOverdue} day{mostOverdue.daysOverdue > 1 ? 's' : ''} past target date.
              Update the status or adjust the target date.
            </p>

            {expanded && (
              <div className="mt-3 space-y-1.5 fade-in">
                {plans.map((p) => (
                  <div key={`overdue-banner-${p.id}`} className="flex items-center gap-3">
                    <span
                      className="text-xs font-medium px-2 py-0.5 rounded-full text-tabular"
                      style={{ backgroundColor: 'rgba(192,57,43,0.15)', color: 'var(--overdue)' }}
                    >
                      {p.daysOverdue}d
                    </span>
                    <span className="text-xs font-medium" style={{ color: 'var(--overdue)' }}>{p.title}</span>
                    <span className="text-xs" style={{ color: 'rgba(192,57,43,0.7)' }}>due {p.targetDate}</span>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1 mt-2 text-xs font-medium transition-opacity hover:opacity-80"
              style={{ color: 'var(--overdue)' }}
            >
              {expanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
              {expanded ? 'Show less' : `See all ${count} overdue plans`}
            </button>
          </div>
        </div>

        <button
          onClick={() => setDismissed(true)}
          className="flex-shrink-0 p-1 rounded transition-all duration-150 hover:bg-overdue/10"
          aria-label="Dismiss overdue alert"
        >
          <X size={14} style={{ color: 'var(--overdue)' }} />
        </button>
      </div>
    </div>
  );
}