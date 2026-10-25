import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { FlowMark } from './primitives';
import { repositoryUrl } from '@/lib/site';
export function FlowFooter() {
  return (
    <footer lang="en" className="tf-footer">
      <div className="tf-footer-brand">
        <Link href="/" aria-label="TikFlow home">
          <FlowMark />
          tikflow®
        </Link>
        <span>GO OUT. FEEL MORE.</span>
      </div>
      <nav aria-label="Footer navigation">
        <Link href="/events">
          Explore events <ArrowUpRight />
        </Link>
        <Link href="/organizer">
          For organizers <ArrowUpRight />
        </Link>
        <Link href="/guide">
          Booking guide <ArrowUpRight />
        </Link>
        <Link href="/about">
          About us <ArrowUpRight />
        </Link>
        <Link href="/artists">
          Artists <ArrowUpRight />
        </Link>
        <Link href="/community">
          Community <ArrowUpRight />
        </Link>
        <Link href="/my-tickets">
          My tickets <ArrowUpRight />
        </Link>
        <Link href="/system">
          System status <ArrowUpRight />
        </Link>
      </nav>
      <div className="tf-footer-bottom">
        <span>© {new Date().getFullYear()} TikFlow · Local development project</span>
        <Link href="/guide#faq">Help & FAQ ↗</Link>
        <Link href="/contributors">Meet the team ↗</Link>
        <a href={repositoryUrl} target="_blank" rel="noopener noreferrer">
          GitHub ↗
        </a>
      </div>
    </footer>
  );
}
