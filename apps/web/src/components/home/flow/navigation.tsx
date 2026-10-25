'use client';
import { useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Search, ArrowUpRight, Bell } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import { useAuthState } from '@/stores/auth';
import { roleHome } from '@/lib/auth-session';
import { FlowMark } from './primitives';
import { useNavigationMotion } from './navigation-motion';
import { NavigationMenu } from './navigation-menu';
import { publicNavigation as siteNavigation } from '@/lib/site';
const englishLabels: Record<string, string> = {
  '/events': 'Discover',
  '/artists': 'Artists',
  '/community': 'Community',
  '/about': 'About TikFlow',
};
const publicNavigation = siteNavigation.map((link) => ({
  ...link,
  label: englishLabels[link.href] || link.label,
}));
const links = [
  ...publicNavigation,
  { href: '/guide', label: 'Guide' },
  { href: '/my-tickets', label: 'My tickets' },
];
export function FlowNavigation({ interior = false }: { interior?: boolean }) {
  const pathname = usePathname();
  const active = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  const user = useAuthState((s) => s.user);
  const [menu, setMenu] = useState(false);
  const groups = [
    { title: 'Discover', items: publicNavigation },
    {
      title: 'Your experience',
      items: [
        { href: '/my-tickets', label: 'My tickets' },
        { href: '/guide', label: 'Booking guide' },
        { href: '/contributors', label: 'Contributors' },
        { href: '/organizer', label: 'For organizers' },
      ],
    },
    {
      title: 'Account',
      items: user
        ? [
            { href: '/profile', label: 'My profile' },
            { href: '/notifications', label: 'Notifications' },
            ...(user.role !== 'CUSTOMER'
              ? [
                  {
                    href: roleHome(user.role),
                    label:
                      user.role === 'ADMIN'
                        ? 'Admin dashboard'
                        : user.role === 'STAFF'
                          ? 'Ticket check-in'
                          : 'Manage events',
                  },
                ]
              : []),
          ]
        : [
            { href: '/login', label: 'Log in' },
            { href: '/register', label: 'Sign up' },
          ],
    },
  ];
  const [query, setQuery] = useState('');
  const nav = useRef<HTMLElement>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const reveal = useNavigationMotion(nav, menu, searchOpen);
  return (
    <header
      lang="en"
      ref={nav}
      className="tf-nav tf-motion-nav"
      data-variant={interior ? 'interior' : 'home'}
      onFocusCapture={reveal}
    >
      <div className="tf-nav-shell">
        <Link className="tf-brand" href="/" aria-label="TikFlow — Home">
          <span className="tf-nav-emblem">
            <FlowMark />
          </span>
          <span className="tf-nav-wordmark">
            tikflow<sup>®</sup>
            <small>LIVE EXPERIENCES</small>
          </span>
        </Link>
        <nav aria-label="Main navigation" className="tf-nav-links">
          <span className="tf-nav-hover" aria-hidden="true" />
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              aria-label={l.label}
              aria-current={active(l.href) ? 'page' : undefined}
              data-nav-link
            >
              <span className="tf-nav-window" aria-hidden="true">
                <span className="tf-nav-roll">
                  <span>{l.label}</span>
                  <span>{l.label}</span>
                </span>
              </span>
            </Link>
          ))}
        </nav>
        <div className="tf-nav-actions">
          {user && (
            <Link
              href="/notifications"
              aria-label="Notifications"
              className="tf-icon tf-notifications"
            >
              <Bell size={19} />
            </Link>
          )}
          <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
            <DialogTrigger asChild>
              <button className="tf-icon" aria-label="Search events" data-nav-magnetic>
                <Search size={19} />
              </button>
            </DialogTrigger>
            <DialogContent lang="en" closeLabel="Close" className="tf-search-dialog">
              <DialogTitle>Find your next great night.</DialogTitle>
              <DialogDescription>Search by event name or explore a category.</DialogDescription>
              <form action="/events">
                <label htmlFor="tf-search" className="sr-only">
                  Event name
                </label>
                <input
                  id="tf-search"
                  name="q"
                  type="search"
                  placeholder="Where do you want to go?"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  maxLength={120}
                />
                <button type="submit" className="tf-button">
                  Search <ArrowUpRight />
                </button>
              </form>
              <div className="tf-search-suggestions">
                {['Music', 'Workshop', 'Sports']
                  .filter((s) => !query || s.toLowerCase().includes(query.toLowerCase()))
                  .map((s) => (
                    <DialogClose asChild key={s}>
                      <Link
                        href={`/events?category=${s === 'Music' ? 'MUSIC' : s === 'Workshop' ? 'WORKSHOP' : 'SPORTS'}`}
                      >
                        {s} ↗
                      </Link>
                    </DialogClose>
                  ))}
              </div>
            </DialogContent>
          </Dialog>
          <Link
            className="tf-account"
            data-nav-magnetic
            href={user ? roleHome(user.role) : '/login'}
          >
            {user ? 'Account' : 'Log in'} <ArrowUpRight size={15} />
          </Link>
          <Dialog open={menu} onOpenChange={setMenu}>
            <DialogTrigger asChild>
              <button
                className="tf-icon tf-menu-trigger tf-site-menu-trigger"
                aria-label="Open menu"
                data-nav-magnetic
              >
                <span className="tf-menu-button-label">MENU</span>
                <span className="tf-menu-lines" aria-hidden="true">
                  <span />
                  <span />
                </span>
              </button>
            </DialogTrigger>
            <DialogContent lang="en" closeLabel="Close" className="tf-mobile-dialog tf-site-menu">
              <NavigationMenu groups={groups} />
            </DialogContent>
          </Dialog>
        </div>
        <span className="tf-nav-travel" aria-hidden="true" />
      </div>
    </header>
  );
}
