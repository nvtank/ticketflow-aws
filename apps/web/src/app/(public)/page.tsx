import type { Metadata } from 'next';
import { FlowExperience } from '@/components/home/flow/motion';
import {
  HeroSection,
  MarqueeSection,
  CategoriesSection,
  FlowInterlude,
  ImmersiveSection,
  OrganizerSection,
  FinaleSection,
} from '@/components/home/flow/sections';
import { FeaturedEvents, TrendingEvents } from '@/components/home/flow/events';
import { TicketShowcase, BookingExperience } from '@/components/home/flow/tickets';
import 'lenis/dist/lenis.css';
export const metadata: Metadata = {
  title: 'TikFlow — Don’t just watch. Be part of it.',
  description:
    'Discover events and book your next experience with TikFlow. Live music, festivals, workshops and memories beyond the screen.',
};
export default function HomePage() {
  return (
    <FlowExperience>
      <link
        rel="preload"
        href="/assets/fonts/anton-regular.ttf"
        as="font"
        type="font/ttf"
        crossOrigin="anonymous"
      />
      <HeroSection />
      <MarqueeSection />
      <FeaturedEvents />
      <CategoriesSection />
      <FlowInterlude />
      <ImmersiveSection />
      <div id="ticket">
        <TicketShowcase />
      </div>
      <BookingExperience />
      <TrendingEvents />
      <OrganizerSection />
      <FinaleSection />
    </FlowExperience>
  );
}
