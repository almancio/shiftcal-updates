'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const links = [
  { href: '/dashboard', label: 'Overview' },
  { href: '/dashboard/updates', label: 'Updates OTA' },
  { href: '/dashboard/config', label: 'Remote Config' }
];

export function DashboardNav() {
  const pathname = usePathname();

  return (
    <nav className="nav-links">
      {links.map((link) => {
        const active = pathname === link.href;
        return (
          <Link key={link.href} href={link.href} className={`nav-link ${active ? 'active' : ''}`}>
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
