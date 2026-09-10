'use client';

import React, { useState, useEffect, useCallback } from 'react';
import AppLayout from '@/components/AppLayout';
import { Search, X, FileText, LayoutDashboard, Tag, Clock, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import StatusBadge from '@/components/ui/StatusBadge';

type ResultType = 'journal' | 'plan';
type FilterType = 'all' | 'journal' | 'plan';
type TagFilter = 'all' | 'idea' | 'thought' | 'plan' | 'pending' | 'inprogress' | 'completed' | 'overdue';

interface SearchResult {
  id: string;
  type: ResultType;
  title: string;
  preview: string;
  tag: string;
  date: string;
  href: string;
}

const TYPE_FILTERS: { id: string; label: string; value: FilterType }[] = [
  { id: 'tf-all', label: 'All', value: 'all' },
  { id: 'tf-journal', label: 'Journal', value: 'journal' },
  { id: 'tf-plan', label: 'Plans', value: 'plan' },
];

const TAG_FILTERS: { id: string; label: string; value: TagFilter }[] = [
  { id: 'tag-all', label: 'Any tag', value: 'all' },
  { id: 'tag-idea', label: 'Idea', value: 'idea' },
  { id: 'tag-thought', label: 'Thought', value: 'thought' },
  { id: 'tag-plan', label: 'Plan', value: 'plan' },
  { id: 'tag-pending', label: 'Pending', value: 'pending' },
  { id: 'tag-inprogress', label: 'In Progress', value: 'inprogress' },
  { id: 'tag-completed', label: 'Completed', value: 'completed' },
  { id: 'tag-overdue', label: 'Overdue', value: 'overdue' },
];

function highlight(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text;
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);
  return parts.map((part, i) =>
    regex.test(part) ? (
      <mark key={i} className="rounded px-0.5" style={{ backgroundColor: 'rgba(92,61,46,0.18)', color: 'var(--primary)' }}>
        {part}
      </mark>
    ) : (
      part
    )
  );
}

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<FilterType>('all');
  const [tagFilter, setTagFilter] = useState<TagFilter>('all');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const supabase = createClient();

  const runSearch = useCallback(async (q: string, type: FilterType, tag: TagFilter) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setLoading(true);
    setSearched(true);

    const allResults: SearchResult[] = [];

    // Search journal entries
    if (type === 'all' || type === 'journal') {
      let journalQuery = supabase
        .from('journal_entries')
        .select('id, title, body, tag, date, date_label')
        .eq('user_id', user.id);

      if (q.trim()) {
        journalQuery = journalQuery.or(`title.ilike.%${q}%,body.ilike.%${q}%`);
      }

      // Tag filter for journal: idea, thought, plan
      if (tag !== 'all' && ['idea', 'thought', 'plan'].includes(tag)) {
        journalQuery = journalQuery.eq('tag', tag);
      }

      const { data: journalData } = await journalQuery
        .order('date', { ascending: false })
        .limit(50);

      if (journalData) {
        journalData.forEach((row) => {
          allResults.push({
            id: row.id,
            type: 'journal',
            title: row.title || 'Untitled',
            preview: row.body ? row.body.slice(0, 160) : '',
            tag: row.tag,
            date: row.date_label || row.date,
            href: '/',
          });
        });
      }
    }

    // Search plans
    if (type === 'all' || type === 'plan') {
      let plansQuery = supabase
        .from('plans')
        .select('id, title, preview, status, target_date, created_at')
        .eq('user_id', user.id)
        .eq('archived', false);

      if (q.trim()) {
        plansQuery = plansQuery.or(`title.ilike.%${q}%,preview.ilike.%${q}%`);
      }

      // Tag filter for plans: pending, inprogress, completed, overdue
      if (tag !== 'all' && ['pending', 'inprogress', 'completed', 'overdue'].includes(tag)) {
        plansQuery = plansQuery.eq('status', tag);
      }

      const { data: plansData } = await plansQuery
        .order('created_at', { ascending: false })
        .limit(50);

      if (plansData) {
        plansData.forEach((row) => {
          allResults.push({
            id: row.id,
            type: 'plan',
            title: row.title,
            preview: row.preview || '',
            tag: row.status,
            date: row.target_date || new Date(row.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            href: `/plans-dashboard/${row.id}`,
          });
        });
      }
    }

    // If tag filter is cross-type, filter client-side
    if (tag !== 'all') {
      const journalTags = ['idea', 'thought', 'plan'];
      const planTags = ['pending', 'inprogress', 'completed', 'overdue'];
      const filtered = allResults.filter((r) => {
        if (r.type === 'journal' && journalTags.includes(tag)) return r.tag === tag;
        if (r.type === 'plan' && planTags.includes(tag)) return r.tag === tag;
        // If tag belongs to other type, exclude
        if (r.type === 'journal' && planTags.includes(tag)) return false;
        if (r.type === 'plan' && journalTags.includes(tag)) return false;
        return true;
      });
      setResults(filtered);
    } else {
      setResults(allResults);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.trim().length >= 1 || tagFilter !== 'all') {
        runSearch(query, typeFilter, tagFilter);
      } else {
        setResults([]);
        setSearched(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query, typeFilter, tagFilter, runSearch]);

  const journalCount = results.filter((r) => r.type === 'journal').length;
  const planCount = results.filter((r) => r.type === 'plan').length;

  return (
    <AppLayout>
      <div className="flex-1 overflow-y-auto custom-scroll px-6 py-8">
        <div className="mx-auto" style={{ maxWidth: '720px' }}>

          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-semibold font-serif text-foreground mb-1">Search</h1>
            <p className="text-sm text-muted-foreground">Find journal entries and plans by keyword, tag, or status.</p>
          </div>

          {/* Search input */}
          <div className="relative mb-4">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by keyword…"
              autoFocus
              className="w-full pl-10 pr-10 py-3 text-sm rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-ring transition-all"
              style={{ backgroundColor: 'var(--card)', color: 'var(--foreground)', fontSize: '15px' }}
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Filters row */}
          <div className="flex flex-wrap items-center gap-3 mb-6">
            {/* Type filter */}
            <div className="flex items-center gap-1 p-1 rounded-lg border border-border" style={{ backgroundColor: 'var(--card)' }}>
              {TYPE_FILTERS.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setTypeFilter(f.value)}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-all duration-150 ${
                    typeFilter === f.value ? 'text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                  }`}
                  style={typeFilter === f.value ? { backgroundColor: 'var(--primary)' } : {}}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Tag/status filter */}
            <div className="flex items-center gap-1 flex-wrap">
              <Tag size={12} className="text-muted-foreground" />
              {TAG_FILTERS.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setTagFilter(f.value)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all duration-150 ${
                    tagFilter === f.value ? 'text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
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

          {/* Results */}
          {loading && (
            <div className="flex items-center justify-center py-16">
              <p className="text-sm text-muted-foreground">Searching…</p>
            </div>
          )}

          {!loading && searched && results.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Search size={28} className="text-muted-foreground mb-3 opacity-40" />
              <p className="text-sm font-medium text-foreground mb-1">No results found</p>
              <p className="text-xs text-muted-foreground">Try a different keyword, tag, or filter.</p>
            </div>
          )}

          {!loading && !searched && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Search size={28} className="text-muted-foreground mb-3 opacity-30" />
              <p className="text-sm text-muted-foreground">Type a keyword or select a filter to search.</p>
            </div>
          )}

          {!loading && results.length > 0 && (
            <div className="space-y-1">
              {/* Result count */}
              <div className="flex items-center gap-3 mb-3">
                <p className="text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground">{results.length}</span> result{results.length !== 1 ? 's' : ''}
                  {journalCount > 0 && planCount > 0 && (
                    <span> — {journalCount} journal, {planCount} plan{planCount !== 1 ? 's' : ''}</span>
                  )}
                </p>
              </div>

              {results.map((result) => (
                <Link
                  key={`${result.type}-${result.id}`}
                  href={result.href}
                  className="flex items-start gap-3 px-4 py-3.5 rounded-xl border border-border/60 transition-all duration-150 hover:border-border group"
                  style={{ backgroundColor: 'var(--card)' }}
                >
                  {/* Icon */}
                  <div
                    className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center mt-0.5"
                    style={{
                      backgroundColor: result.type === 'journal' ? 'rgba(92,61,46,0.10)' : 'rgba(192,57,43,0.08)',
                    }}
                  >
                    {result.type === 'journal' ? (
                      <FileText size={14} style={{ color: 'var(--primary)' }} />
                    ) : (
                      <LayoutDashboard size={14} style={{ color: 'var(--accent)' }} />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        {result.type === 'journal' ? 'Journal' : 'Plan'}
                      </span>
                      <StatusBadge status={result.tag as any} />
                    </div>
                    <p className="text-sm font-medium text-foreground truncate mb-0.5">
                      {highlight(result.title, query)}
                    </p>
                    {result.preview && (
                      <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                        {highlight(result.preview, query)}
                      </p>
                    )}
                  </div>

                  {/* Date + arrow */}
                  <div className="flex-shrink-0 flex flex-col items-end gap-1 ml-2">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock size={10} />
                      <span>{result.date}</span>
                    </div>
                    <ChevronRight size={14} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
