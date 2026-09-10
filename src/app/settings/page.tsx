'use client';

import React, { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import { Mail, Bell, Clock, Check, Save, AlertCircle, ChevronDown, Send, Loader2 } from 'lucide-react';
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

const SETTINGS_KEY = 'rootline_email_settings';

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
      setTimeout(() => setReminderSendStatus('idle'), 4000);
    } catch {
      setReminderSendStatus('error');
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
      setTimeout(() => setDigestSendStatus('idle'), 4000);
    } catch {
      setDigestSendStatus('error');
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
                <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
                  Sends a gentle nudge if you haven't written an entry that day. Arrives at the time you set below.
                </p>

                {/* Toggle */}
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-sm font-medium text-foreground">Enable reminder</p>
                    <p className="text-xs text-muted-foreground">Receive a daily email prompt to journal</p>
                  </div>
                  <button
                    onClick={() => update('reminderEnabled', !settings.reminderEnabled)}
                    className="relative rounded-full transition-all duration-200 flex-shrink-0"
                    style={{
                      backgroundColor: settings.reminderEnabled ? 'var(--primary)' : 'var(--muted)',
                      width: '40px',
                      height: '22px',
                    }}
                    aria-label="Toggle daily reminder"
                  >
                    <span
                      className="absolute top-0.5 rounded-full transition-all duration-200"
                      style={{
                        width: '18px',
                        height: '18px',
                        backgroundColor: 'white',
                        left: settings.reminderEnabled ? '20px' : '2px',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                      }}
                    />
                  </button>
                </div>

                {/* Time picker + test button */}
                <div className={`transition-opacity duration-200 ${settings.reminderEnabled ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
                  <label className="block text-xs font-medium text-foreground mb-1.5">
                    <Clock size={11} className="inline mr-1 text-muted-foreground" />
                    Reminder time
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="time"
                      value={settings.reminderTime}
                      onChange={(e) => update('reminderTime', e.target.value)}
                      className="px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-1 focus:ring-ring transition-all"
                      style={{ backgroundColor: 'var(--input)', color: 'var(--foreground)' }}
                    />
                    <SendButton
                      status={reminderSendStatus}
                      onClick={sendTestReminder}
                      label="Send test email"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1.5">Default: 9:00 PM</p>
                </div>
              </div>
            </div>
          </section>

          {/* Plan digest section */}
          <section className="notebook-card mb-5">
            <div
              className="flex items-center px-4 py-2 border-b border-border/40"
              style={{ backgroundColor: 'rgba(92,61,46,0.04)' }}
            >
              <div className="flex items-center gap-2">
                <AlertCircle size={13} className="text-primary" />
                <span className="text-xs font-semibold text-foreground">Plan Digest Email</span>
              </div>
              <span className="ml-auto text-xs text-muted-foreground font-serif italic">Rootline</span>
            </div>

            <div className="flex">
              <div
                className="flex-shrink-0"
                style={{ width: '40px', borderRight: '2px solid rgba(192,57,43,0.35)', backgroundColor: 'rgba(250,247,240,0.5)' }}
              />
              <div className="flex-1 p-5">
                <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
                  A daily summary of plan entries that are overdue or due within the next 24 hours. Keeps your commitments visible.
                </p>

                {/* Toggle */}
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-sm font-medium text-foreground">Enable digest</p>
                    <p className="text-xs text-muted-foreground">Daily email of overdue and upcoming plans</p>
                  </div>
                  <button
                    onClick={() => update('digestEnabled', !settings.digestEnabled)}
                    className="relative rounded-full transition-all duration-200 flex-shrink-0"
                    style={{
                      backgroundColor: settings.digestEnabled ? 'var(--primary)' : 'var(--muted)',
                      width: '40px',
                      height: '22px',
                    }}
                    aria-label="Toggle plan digest"
                  >
                    <span
                      className="absolute top-0.5 rounded-full transition-all duration-200"
                      style={{
                        width: '18px',
                        height: '18px',
                        backgroundColor: 'white',
                        left: settings.digestEnabled ? '20px' : '2px',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                      }}
                    />
                  </button>
                </div>

                {/* Digest time + test button */}
                <div className={`transition-opacity duration-200 ${settings.digestEnabled ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
                  <label className="block text-xs font-medium text-foreground mb-1.5">
                    <Clock size={11} className="inline mr-1 text-muted-foreground" />
                    Digest delivery time
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="time"
                      value={settings.digestTime}
                      onChange={(e) => update('digestTime', e.target.value)}
                      className="px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-1 focus:ring-ring transition-all"
                      style={{ backgroundColor: 'var(--input)', color: 'var(--foreground)' }}
                    />
                    <SendButton
                      status={digestSendStatus}
                      onClick={sendTestDigest}
                      label="Send test digest"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1.5">Default: 8:00 AM</p>
                </div>
              </div>
            </div>
          </section>

          {/* Timezone section */}
          <section className="notebook-card mb-8">
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
                  All reminder and digest emails will be sent at the times above, adjusted for this timezone.
                </p>
                <div className="relative" ref={tzRef}>
                  <button
                    onClick={() => setTzDropdownOpen(!tzDropdownOpen)}
                    className="flex items-center justify-between w-full px-3 py-2.5 rounded-lg border border-border text-sm transition-all hover:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
                    style={{ backgroundColor: 'var(--input)', color: 'var(--foreground)' }}
                  >
                    <span>{settings.timezone}</span>
                    <ChevronDown size={13} className="text-muted-foreground" />
                  </button>
                  {tzDropdownOpen && (
                    <div
                      className="absolute top-full left-0 right-0 mt-1 rounded-xl border border-border shadow-card-md z-20 fade-in overflow-hidden"
                      style={{ backgroundColor: 'var(--card)' }}
                    >
                      {TIMEZONES.map((tz) => (
                        <button
                          key={tz}
                          onClick={() => { update('timezone', tz); setTzDropdownOpen(false); }}
                          className="w-full flex items-center justify-between px-3 py-2.5 text-sm text-left hover:bg-muted/60 transition-all"
                          style={settings.timezone === tz ? { backgroundColor: 'rgba(92,61,46,0.07)', color: 'var(--primary)' } : { color: 'var(--foreground)' }}
                        >
                          {tz}
                          {settings.timezone === tz && <Check size={12} className="text-primary" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* Save button */}
          <div className="flex items-center justify-between">
            <div className="text-xs text-muted-foreground">
              {saveStatus === 'saved' && (
                <span className="flex items-center gap-1 text-success fade-in">
                  <Check size={12} />
                  Settings saved
                </span>
              )}
              {saveStatus === 'error' && (
                <span className="flex items-center gap-1 fade-in" style={{ color: 'var(--overdue)' }}>
                  <AlertCircle size={12} />
                  Failed to save
                </span>
              )}
            </div>
            <button
              onClick={handleSave}
              disabled={saveStatus === 'saving'}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 hover:opacity-90 active:scale-95 disabled:opacity-60"
              style={{ backgroundColor: 'var(--primary)', color: 'var(--primary-foreground)' }}
            >
              <Save size={13} />
              {saveStatus === 'saving' ? 'Saving…' : 'Save settings'}
            </button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
