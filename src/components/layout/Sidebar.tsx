'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface NavItem {
  href: string;
  label: string;
  icon: string;
}

const NAV_ITEMS: NavItem[] = [
  { href: '/', label: 'Dashboard', icon: '▣' },
  { href: '/environment', label: 'Environment', icon: '◈' },
  { href: '/waveforms', label: 'Waveform Analysis', icon: '∿' },
  { href: '/hardware', label: 'Hardware Status', icon: '⬡' },
  { href: '/history', label: 'Ping History', icon: '☰' },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="app-sidebar" role="navigation" aria-label="Main navigation">
      <nav className="app-sidebar__nav">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`app-sidebar__link ${isActive ? 'app-sidebar__link--active' : ''}`}
              aria-current={isActive ? 'page' : undefined}
            >
              <span className="app-sidebar__icon" aria-hidden="true">
                {item.icon}
              </span>
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
