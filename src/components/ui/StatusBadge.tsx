import React from 'react';

type StatusType = 'pending' | 'inprogress' | 'completed' | 'overdue' | 'idea' | 'thought' | 'plan';

interface StatusBadgeProps {
  status: StatusType;
  label?: string;
  size?: 'sm' | 'md';
}

const statusMap: Record<StatusType, { label: string; className: string }> = {
  pending: { label: 'Pending', className: 'badge-pending' },
  inprogress: { label: 'In Progress', className: 'badge-inprogress' },
  completed: { label: 'Completed', className: 'badge-completed' },
  overdue: { label: 'Overdue', className: 'badge-overdue' },
  idea: { label: 'Idea', className: 'badge-idea' },
  thought: { label: 'Thought', className: 'badge-thought' },
  plan: { label: 'Plan', className: 'badge-plan' },
};

export default function StatusBadge({ status, label, size = 'sm' }: StatusBadgeProps) {
  const config = statusMap[status];
  const sizeClass = size === 'sm' ?'text-xs px-2 py-0.5' :'text-sm px-2.5 py-1';

  return (
    <span className={`inline-flex items-center rounded-full font-medium ${sizeClass} ${config.className}`}>
      {label ?? config.label}
    </span>
  );
}