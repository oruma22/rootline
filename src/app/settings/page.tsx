'use client';

import React, { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import { Mail, Bell, Clock, Check, Save, AlertCircle, ChevronDown, Send, Loader2, History, Inbox } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';
type SendStatus = 'idle' | 'sending' | 'sent' | 'error';

interface SettingsState {
  email: string;
  reminderEnabled: boolean;
  reminderTime: string;
  digestEnabled: boolean;
  digestTime: string;
  timezone: string;
}

interface EmailHistoryEntry {
  id: string;
  type: 'journal_reminder' | 'overdue_digest';
  to: string;
  sentAt: string;
  status: 'sent' | 'failed';
}

const SETTINGS_KEY = 'rootline_email_settings';
const EMAIL_HISTORY_KEY = 'rootline_email_history';

const TIMEZONES = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Australia/Sydney',
];

const DEFAULT_SETTINGS: SettingsState = {
  email: '',
  reminderEnabled: true,
  reminderTime: '21:00',
  digestEnabled: true,
  digestTime: '08:00',
  timezone: 'America/New_York',
};

export default function SettingsPage() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<SettingsState>(DEFAULT_SETTINGS);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [reminderSendStatus, setReminderSendStatus] = useState<SendStatus>('idle');
  const [digestSendStatus, setDigestSendStatus] = useState<SendStatus>('idle');
  const [tzDropdownOpen, setTzDropdownOpen] = useState(false);
  const [emailHistory, setEmailHistory] = useState<EmailHistoryEntry[]>([]);
  const tzRef = React.useRef<HTMLDivElement>(null);

  // Load persisted settings
  useEffect(() => {
    try {
      const stored = localStorage.getItem(SETTINGS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<SettingsState>;
        setSettings((prev) => ({ ...prev, ...parsed }));
      } else if (user?.email) {
        setSettings((prev) => ({ ...prev, email: user.email! }));
      }
    } catch {
      // ignore
    }
  }, [user]);

  // Load email history
  useEffect(() => {
    try {
      const stored = localStorage.getItem(EMAIL_HISTORY_KEY);
      if (stored) {
        setEmailHistory(JSON.parse(stored) as EmailHistoryEntry[]);
      }
    } catch {
      // ignore
    }
  }, []);

  const addEmailHistory = (entry: Omit<EmailHistoryEntry, 'id'>) => {
    const newEntry: EmailHistoryEntry = { ...entry, id: `email-${Date.now()}` };
    setEmailHistory((prev) => {
      const updated = [newEntry, ...prev].slice(0, 50); // keep last 50
      try { localStorage.setItem(EMAIL_HISTORY_KEY, JSON.stringify(updated)); } catch { /* ignore */ }
      return updated;
    });
  };

  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (tzRef.current && !tzRef.current.contains(e.target as Node)) {
        setTzDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSave = () => {
    setSaveStatus('saving');
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
      setTimeout(() => setSaveStatus('saved'), 400);
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch {
      setSaveStatus('error');
    }
  };

  const update = (key: keyof SettingsState, value: string | boolean) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setSaveStatus('idle');
  };

  const sendTestReminder = async () => {
    if (!settings.email) return;
    setReminderSendStatus('sending');
    try {
      const res = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'journal_reminder',
          to: settings.email,
          userName: user?.email?.split('@')[0] || '',
          reminderTime: settings.reminderTime,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setReminderSendStatus('sent');
      addEmailHistory({ type: 'journal_reminder', to: settings.email, sentAt: new Date().toISOString(), status: 'sent' });
      setTimeout(() => setReminderSendStatus('idle'), 4000);
    } catch {
      setReminderSendStatus('error');
      addEmailHistory({ type: 'journal_reminder', to: settings.email, sentAt: new Date().toISOString(), status: 'failed' });
      setTimeout(() => setReminderSendStatus('idle'), 4000);
    }
  };

  const sendTestDigest = async () => {
    if (!settings.email) return;
    setDigestSendStatus('sending');
    try {
      const mockPlans = [
        { title: 'Finish project proposal', daysOverdue: 3, targetDate: 'Sep 7, 2026' },
        { title: 'Review quarterly goals', daysOverdue: 1, targetDate: 'Sep 9, 2026' },
      ];
      const res = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'overdue_digest',
          to: settings.email,
          overduePlans: mockPlans,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setDigestSendStatus('sent');
      addEmailHistory({ type: 'overdue_digest', to: settings.email, sentAt: new Date().toISOString(), status: 'sent' });
      setTimeout(() => setDigestSendStatus('idle'), 4000);
    } catch {
      setDigestSendStatus('error');
      addEmailHistory({ type: 'overdue_digest', to: settings.email, sentAt: new Date().toISOString(), status: 'failed' });
      setTimeout(() => setDigestSendStatus('idle'), 4000);
    }
  };

  const SendButton = ({
    status,
    onClick,
    label,
  }: {
    status: SendStatus;
    onClick: () => void;
    label: string;
  }) => (
    <button
      onClick={onClick}
      disabled={status === 'sending' || !settings.email}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 hover:opacity-90 active:scale-95 disabled:opacity-50"
      style={{
        backgroundColor:
          status === 'sent' ?'rgba(34,197,94,0.12)'
            : status === 'error' ?'rgba(192,57,43,0.1)' :'rgba(92,61,46,0.08)',
        color:
          status === 'sent' ?'#16a34a'
            : status === 'error' ?'var(--overdue)' :'var(--foreground)',
        border: '1px solid',
        borderColor:
          status === 'sent' ?'rgba(34,197,94,0.3)'
            : status === 'error' ?'rgba(192,57,43,0.3)' :'var(--border)',
      }}
    >
      {status === 'sending' ? (
        <Loader2 size={11} className="animate-spin" />
      ) : status === 'sent' ? (
        <Check size={11} />
      ) : (
        <Send size={11} />
      )}
      {status === 'sending' ?'Sending…'
        : status === 'sent' ?'Sent!'
        : status === 'error' ?'Failed — retry'
        : label}
    </button>
  );

  const formatHistoryDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
      ' at ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  return (
    <AppLayout>
      <div className="flex-1 overflow-y-auto custom-scroll px-6 py-8">
        <div className="mx-auto" style={{ maxWidth: '600px' }}>

          {/* Page header */}
          <div className="mb-8">
            <h1 className="text-2xl font-semibold font-serif text-foreground mb-1">Settings</h1>
            <p className="text-sm text-muted-foreground">Manage your email address and notification preferences.</p>
          </div>

          {/* Email section */}
          <section className="notebook-card mb-5">
            <div
              className="flex items-center px-4 py-2 border-b border-border/40"
              style={{ backgroundColor: 'rgba(92,61,46,0.04)' }}
            >
              <div className="flex items-center gap-2">
                <Mail size={13} className="text-primary" />
                <span className="text-xs font-semibold text-foreground">Email Address</span>
              </div>
              <span className="ml-auto text-xs text-muted-foreground font-serif italic">Rootline</span>
            </div>

            <div className="flex">
              <div
                className="flex-shrink-0"
                style={{ width: '40px', borderRight: '2px solid rgba(192,57,43,0.35)', backgroundColor: 'rgba(250,247,240,0.5)' }}
              />
              <div className="flex-1 p-5">
                <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
                  This is where daily reminders and plan digests will be sent. Make sure it's an address you check regularly.
                </p>
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1.5">Email address</label>
                  <input
                    type="email"
                    value={settings.email}
                    onChange={(e) => update('email', e.target.value)}
                    placeholder="you@example.com"
                    className="w-full px-3 py-2.5 rounded-lg border border-border text-sm focus:outline-none focus:ring-1 focus:ring-ring transition-all"
                    style={{ backgroundColor: 'var(--input)', color: 'var(--foreground)' }}
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Daily reminder section */}
          <section className="notebook-card mb-5">
            <div
              className="flex items-center px-4 py-2 border-b border-border/40"
              style={{ backgroundColor: 'rgba(92,61,46,0.04)' }}
            >
              <div className="flex items-center gap-2">
                <Bell size={13} className="text-primary" />
                <span className="text-xs font-semibold text-foreground">Daily Journal Reminder</span>
              </div>
              <span className="ml-auto text-xs text-muted-foreground font-serif italic">Rootline</span>
            </div>

            <div className="flex">
              <div
                className="flex-shrink-0"
                style={{ width: '40px', borderRight: '2px solid rgba(192,57,43,0.35)', backgroundColor: 'rgba(250,247,240,0.5)' }}
              />
              <div className="flex-1 p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-sm font-medium text-foreground">Enable daily reminder</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Get a nudge to write in your journal each day.</p>
                  </div>
                  <button
                    onClick={() => update('reminderEnabled', !settings.reminderEnabled)}
                    className={`relative w-10 h-5.5 rounded-full transition-all duration-200 ${settings.reminderEnabled ? '' : ''}`}
                    style={{
                      backgroundColor: settings.reminderEnabled ? 'var(--primary)' : 'var(--muted)',
                      width: '40px', height: '22px',
                    }}
                    aria-label="Toggle daily reminder"
                  >
                    <span
                      className="absolute top-0.5 left-0.5 w-4.5 h-4.5 rounded-full bg-white shadow transition-all duration-200"
                      style={{
                        width: '18px', height: '18px',
                        transform: settings.reminderEnabled ? 'translateX(18px)' : 'translateX(0)',
                      }}
                    />
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-foreground mb-1.5">Send time</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="time"
                        value={settings.reminderTime}
                        onChange={(e) => update('reminderTime', e.target.value)}
                        disabled={!settings.reminderEnabled}
                        className="px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-1 focus:ring-ring transition-all disabled:opacity-50"
                        style={{ backgroundColor: 'var(--input)', color: 'var(--foreground)' }}
                      />
                      <SendButton status={reminderSendStatus} onClick={sendTestReminder} label="Send test" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Overdue digest */}
          <section className="notebook-card mb-5">
            <div
              className="flex items-center px-4 py-2 border-b border-border/40"
              style={{ backgroundColor: 'rgba(92,61,46,0.04)' }}
            >
              <div className="flex items-center gap-2">
                <Clock size={13} className="text-primary" />
                <span className="text-xs font-semibold text-foreground">Overdue Plan Digest</span>
              </div>
              <span className="ml-auto text-xs text-muted-foreground font-serif italic">Rootline</span>
            </div>
            <div className="flex">
              <div
                className="flex-shrink-0"
                style={{ width: '40px', borderRight: '2px solid rgba(192,57,43,0.35)', backgroundColor: 'rgba(250,247,240,0.5)' }}
              />
              <div className="flex-1 p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-sm font-medium text-foreground">Enable overdue digest</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Receive a morning summary of overdue plans.</p>
                  </div>
                  <button
                    onClick={() => update('digestEnabled', !settings.digestEnabled)}
                    style={{
                      backgroundColor: settings.digestEnabled ? 'var(--primary)' : 'var(--muted)',
                      width: '40px', height: '22px',
                    }}
                    className="relative rounded-full transition-all duration-200"
                    aria-label="Toggle overdue digest"
                  >
                    <span
                      className="absolute top-0.5 left-0.5 rounded-full bg-white shadow transition-all duration-200"
                      style={{
                        width: '18px', height: '18px',
                        transform: settings.digestEnabled ? 'translateX(18px)' : 'translateX(0)',
                      }}
                    />
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-foreground mb-1.5">Send time</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="time"
                        value={settings.digestTime}
                        onChange={(e) => update('digestTime', e.target.value)}
                        disabled={!settings.digestEnabled}
                        className="px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-1 focus:ring-ring transition-all disabled:opacity-50"
                        style={{ backgroundColor: 'var(--input)', color: 'var(--foreground)' }}
                      />
                      <SendButton status={digestSendStatus} onClick={sendTestDigest} label="Send test digest" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Timezone */}
          <section className="notebook-card mb-6">
            <div
              className="flex items-center px-4 py-2 border-b border-border/40"
              style={{ backgroundColor: 'rgba(92,61,46,0.04)' }}
            >
              <div className="flex items-center gap-2">
                <Clock size={13} className="text-primary" />
                <span className="text-xs font-semibold text-foreground">Timezone</span>
              </div>
              <span className="ml-auto text-xs text-muted-foreground font-serif italic">Rootline</span>
            </div>
            <div className="flex">
              <div
                className="flex-shrink-0"
                style={{ width: '40px', borderRight: '2px solid rgba(192,57,43,0.35)', backgroundColor: 'rgba(250,247,240,0.5)' }}
              />
              <div className="flex-1 p-5">
                <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
                  Used to schedule your reminders and digests at the right local time.
                </p>
                <div ref={tzRef} className="relative">
                  <button
                    onClick={() => setTzDropdownOpen(!tzDropdownOpen)}
                    className="flex items-center justify-between w-full px-3 py-2.5 rounded-lg border border-border text-sm transition-all focus:outline-none focus:ring-1 focus:ring-ring"
                    style={{ backgroundColor: 'var(--input)', color: 'var(--foreground)' }}
                  >
                    <span>{settings.timezone}</span>
                    <ChevronDown size={14} className={`text-muted-foreground transition-transform ${tzDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {tzDropdownOpen && (
                    <div
                      className="absolute z-20 mt-1 w-full rounded-lg border border-border shadow-lg overflow-hidden"
                      style={{ backgroundColor: 'var(--card)' }}
                    >
                      {TIMEZONES.map((tz) => (
                        <button
                          key={tz}
                          onClick={() => { update('timezone', tz); setTzDropdownOpen(false); }}
                          className={`w-full text-left px-3 py-2 text-sm transition-colors hover:bg-muted/60 ${settings.timezone === tz ? 'font-medium' : ''}`}
                          style={{ color: settings.timezone === tz ? 'var(--primary)' : 'var(--foreground)' }}
                        >
                          {tz}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* Save button */}
          <div className="flex justify-end mb-8">
            <button
              onClick={handleSave}
              disabled={saveStatus === 'saving'}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 hover:opacity-90 active:scale-95 disabled:opacity-60"
              style={{ backgroundColor: 'var(--primary)', color: 'var(--primary-foreground)' }}
            >
              {saveStatus === 'saving' ? (
                <Loader2 size={14} className="animate-spin" />
              ) : saveStatus === 'saved' ? (
                <Check size={14} />
              ) : saveStatus === 'error' ? (
                <AlertCircle size={14} />
              ) : (
                <Save size={14} />
              )}
              {saveStatus === 'saving' ? 'Saving…' : saveStatus === 'saved' ? 'Saved!' : saveStatus === 'error' ? 'Error saving' : 'Save settings'}
            </button>
          </div>

          {/* Email History section */}
          <section className="notebook-card mb-5">
            <div
              className="flex items-center px-4 py-2 border-b border-border/40"
              style={{ backgroundColor: 'rgba(92,61,46,0.04)' }}
            >
              <div className="flex items-center gap-2">
                <History size={13} className="text-primary" />
                <span className="text-xs font-semibold text-foreground">Email History</span>
              </div>
              <span className="ml-auto text-xs text-muted-foreground font-serif italic">Last 50 emails</span>
            </div>
            <div className="flex">
              <div
                className="flex-shrink-0"
                style={{ width: '40px', borderRight: '2px solid rgba(192,57,43,0.35)', backgroundColor: 'rgba(250,247,240,0.5)' }}
              />
              <div className="flex-1">
                {emailHistory.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 px-5 text-center">
                    <Inbox size={22} className="text-muted-foreground mb-2 opacity-40" />
                    <p className="text-sm text-muted-foreground">No emails sent yet.</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Use the test buttons above to send your first email.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border/60">
                    {emailHistory.map((entry) => (
                      <div key={entry.id} className="flex items-center gap-3 px-5 py-3">
                        {/* Status dot */}
                        <div
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: entry.status === 'sent' ? '#16a34a' : 'var(--overdue)' }}
                        />
                        {/* Type label */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground">
                            {entry.type === 'journal_reminder' ? 'Journal Reminder' : 'Overdue Digest'}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">To: {entry.to}</p>
                        </div>
                        {/* Date + status */}
                        <div className="flex-shrink-0 text-right">
                          <p className="text-xs text-muted-foreground">{formatHistoryDate(entry.sentAt)}</p>
                          <span
                            className="text-xs font-medium"
                            style={{ color: entry.status === 'sent' ? '#16a34a' : 'var(--overdue)' }}
                          >
                            {entry.status === 'sent' ? 'Sent' : 'Failed'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>

        </div>
      </div>
    </AppLayout>
  );
}
