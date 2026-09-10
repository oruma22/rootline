'use client';

import React from 'react';
import { BookOpen, Clock, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { PlanStatus } from './PlansDashboardContent';
import Icon from '@/components/ui/AppIcon';


interface PlanStatsGridProps {
  total: number;
  open: number;
  overdue: number;
  completed: number;
  activeFilter: 'all' | PlanStatus;
  onFilter: (filter: 'all' | PlanStatus) => void;
}

export default function PlanStatsGrid({ total, open, overdue, completed, activeFilter, onFilter }: PlanStatsGridProps) {
  const stats: {
    id: string;
    label: string;
    value: number;
    icon: React.ElementType;
    trendLabel: string;
    variant: 'neutral' | 'alert' | 'success';
    filter: 'all' | PlanStatus;
  }[] = [
    {
      id: 'stat-total',
      label: 'Total Plans',
      value: total,
      icon: BookOpen,
      trendLabel: 'All time',
      variant: 'neutral',
      filter: 'all',
    },
    {
      id: 'stat-open',
      label: 'Open Plans',
      value: open,
      icon: Clock,
      trendLabel: 'Pending + In Progress',
      variant: 'neutral',
      filter: 'pending',
    },
    {
      id: 'stat-overdue',
      label: 'Overdue',
      value: overdue,
      icon: AlertTriangle,
      trendLabel: 'Past target date',
      variant: 'alert',
      filter: 'overdue',
    },
    {
      id: 'stat-completed',
      label: 'Completed',
      value: completed,
      icon: CheckCircle2,
      trendLabel: 'Total finished',
      variant: 'success',
      filter: 'completed',
    },
  ];

  const variantStyles = {
    neutral: {
      bg: 'var(--card)',
      iconBg: 'var(--muted)',
      iconColor: 'var(--muted-foreground)',
      valueColor: 'var(--foreground)',
    },
    alert: {
      bg: 'var(--overdue-bg)',
      iconBg: 'rgba(192,57,43,0.12)',
      iconColor: 'var(--overdue)',
      valueColor: 'var(--overdue)',
    },
    success: {
      bg: 'var(--success-bg)',
      iconBg: 'rgba(45,122,79,0.12)',
      iconColor: 'var(--success)',
      valueColor: 'var(--success)',
    },
  };

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-4 gap-4 mb-6">
      {stats.map((stat) => {
        const Icon = stat.icon;
        const styles = variantStyles[stat.variant];
        const isActive = activeFilter === stat.filter;
        return (
          <button
            key={stat.id}
            onClick={() => onFilter(stat.filter)}
            className="rounded-xl border text-left p-4 transition-all duration-150 hover:shadow-card-sm active:scale-95 cursor-pointer focus:outline-none"
            style={{
              backgroundColor: styles.bg,
              borderColor: isActive ? 'var(--primary)' : 'var(--border)',
              boxShadow: isActive ? '0 0 0 2px var(--primary)' : undefined,
            }}
          >
            <div className="flex items-start justify-between mb-3">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: styles.iconBg }}
              >
                <Icon size={15} style={{ color: styles.iconColor }} />
              </div>
            </div>
            <p
              className="text-3xl font-bold text-tabular mb-1"
              style={{ color: styles.valueColor }}
            >
              {stat.value}
            </p>
            <p className="text-xs font-medium text-foreground mb-0.5">{stat.label}</p>
            <p className="text-xs text-muted-foreground">{stat.trendLabel}</p>
          </button>
        );
      })}
    </div>
  );
}