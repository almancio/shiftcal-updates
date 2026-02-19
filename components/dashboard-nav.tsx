'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BarChart3, Rocket, Settings2 } from 'lucide-react';

import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const links = [
  { href: '/dashboard', label: 'Overview', icon: BarChart3 },
  { href: '/dashboard/updates', label: 'Updates OTA', icon: Rocket },
  { href: '/dashboard/config', label: 'Remote Config', icon: Settings2 }
];

export function DashboardNav() {
  const pathname = usePathname();

  return (
    <nav className="grid gap-2">
      {links.map((link) => {
        const active = pathname === link.href;
        const Icon = link.icon;

        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              buttonVariants({ variant: active ? 'default' : 'ghost' }),
              'h-11 w-full justify-start gap-2 rounded-lg text-sm'
            )}
          >
            <Icon className="size-4" />
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
