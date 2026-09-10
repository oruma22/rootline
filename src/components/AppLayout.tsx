import React from 'react';
import Sidebar from './Sidebar';

interface AppLayoutProps {
  children: React.ReactNode;
  onNewEntry?: () => void;
}

export default function AppLayout({ children, onNewEntry }: AppLayoutProps) {
  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: 'var(--background)' }}>
      <Sidebar onNewEntry={onNewEntry} />
      <main className="flex-1 overflow-hidden flex flex-col min-h-0">
        {children}
      </main>
    </div>
  );
}