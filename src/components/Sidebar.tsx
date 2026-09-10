'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import AppLogo from '@/components/ui/AppLogo';
import { LayoutDashboard, TreePine, Settings, ChevronLeft, ChevronRight, PenLine, LogOut, Search } from 'lucide-react';
import Icon from '@/components/ui/AppIcon';


interface NavItem {
  id: string;
  label: string;
  href: string;
  icon: React.ElementType;
  badge?: number;
}

interface SidebarProps {
  onNewEntry?: () => void;
}

const navItems: NavItem[] = [
  { id: 'nav-journal', label: 'Journal', href: '/', icon: PenLine },
  { id: 'nav-plans', label: 'Plans', href: '/plans-dashboard', icon: LayoutDashboard, badge: 3 },
  { id: 'nav-tree', label: 'Idea Tree', href: '/mind-map', icon: TreePine },
  { id: 'nav-search', label: 'Search', href: '/search', icon: Search },
];

const bottomItems: NavItem[] = [
  { id: 'nav-settings', label: 'Settings', href: '/settings', icon: Settings },
];

export default function Sidebar({ onNewEntry }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  const handleNewEntry = () => {
    if (onNewEntry) {
      onNewEntry();
    }
  };

  return (
    <aside
      className="relative flex flex-col h-screen border-r border-border transition-all duration-300 ease-in-out"
      style={{
        width: collapsed ? '64px' : '220px',
        backgroundColor: 'var(--card)',
        flexShrink: 0,
      }}
    >
      {/* Logo */}
      <div className="flex items-center gap-2 px-3 py-4 border-b border-border" style={{ minHeight: '60px' }}>
        <AppLogo size={32} />
        {!collapsed && (
          <span className="font-serif text-lg font-semibold text-primary tracking-tight truncate">
            Rootline
          </span>
        )}
      </div>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-16 z-10 w-6 h-6 rounded-full border border-border flex items-center justify-center transition-all duration-150 hover:scale-110 active:scale-95"
        style={{ backgroundColor: 'var(--card)', boxShadow: '0 1px 4px rgba(92,61,46,0.12)' }}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed
          ? <ChevronRight size={12} className="text-muted-foreground" />
          : <ChevronLeft size={12} className="text-muted-foreground" />
        }
      </button>

      {/* New Entry CTA */}
      {!collapsed && (
        <div className="px-3 py-3">
          <button
            onClick={handleNewEntry}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 hover:scale-[1.02] active:scale-95"
            style={{ backgroundColor: 'var(--primary)', color: 'var(--primary-foreground)' }}
          >
            <PenLine size={14} />
            New Entry
          </button>
        </div>
      )}
      {collapsed && (
        <div className="px-2 py-3">
          <button
            onClick={handleNewEntry}
            className="flex items-center justify-center w-full p-2 rounded-lg transition-all duration-150 hover:scale-110 active:scale-95"
            style={{ backgroundColor: 'var(--primary)', color: 'var(--primary-foreground)' }}
            title="New Entry"
          >
            <PenLine size={16} />
          </button>
        </div>
      )}

      {/* Nav items */}
      <nav className="flex-1 px-2 py-1 space-y-0.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.id}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group relative ${
                isActive
                  ? 'text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
              }`}
              style={isActive ? { backgroundColor: 'rgba(92,61,46,0.10)' } : {}}
            >
              <Icon size={16} className="flex-shrink-0" />
              {!collapsed && (
                <>
                  <span className="truncate">{item.label}</span>
                  {item.badge !== undefined && (
                    <span
                      className="ml-auto text-xs font-semibold px-1.5 py-0.5 rounded-full"
                      style={{
                        backgroundColor: item.badge > 0 ? 'rgba(192,57,43,0.12)' : 'var(--muted)',
                        color: item.badge > 0 ? 'var(--accent)' : 'var(--muted-foreground)',
                        minWidth: '20px',
                        textAlign: 'center',
                      }}
                    >
                      {item.badge}
                    </span>
                  )}
                </>
              )}
              {collapsed && item.badge !== undefined && item.badge > 0 && (
                <span
                  className="absolute top-1 right-1 w-2 h-2 rounded-full"
                  style={{ backgroundColor: 'var(--accent)' }}
                />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Divider */}
      <div className="mx-3 border-t border-border" />

      {/* Bottom items */}
      <div className="px-2 py-2 space-y-0.5">
        {bottomItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.id}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                isActive
                  ? 'text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
              }`}
              style={isActive ? { backgroundColor: 'rgba(92,61,46,0.10)' } : {}}
            >
              <Icon size={16} className="flex-shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}

        {/* User row */}
        <div
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-150 hover:bg-muted/60 ${collapsed ? 'justify-center' : ''}`}
          title={collapsed ? 'marcus@rootline.app' : undefined}
        >
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-semibold"
            style={{ backgroundColor: 'var(--primary)', color: 'var(--primary-foreground)' }}
          >
            M
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-foreground truncate">Marcus Webb</p>
              <p className="text-xs text-muted-foreground truncate">marcus@rootline.app</p>
            </div>
          )}
          {!collapsed && (
            <LogOut size={14} className="text-muted-foreground flex-shrink-0 hover:text-accent transition-colors" />
          )}
        </div>
      </div>
    </aside>
  );
}