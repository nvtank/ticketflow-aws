import type { z } from 'zod';
import type { eventListSchema } from '@/lib/api-client';
export type FlowEvent = z.infer<typeof eventListSchema>['items'][number];
export const media = {
  crowd: '/images/Concert-Quoc-Gia.jpg',
  arena: '/images/atsh-concert-1753259796-8984-1753260121-2839-4949.jpg',
  stage: '/images/083A0326-Web.jpg',
  artist: '/images/1storyanhtraipc_1.jpg',
  lights: '/images/live-stage.jpg',
};
export const vibes = [
  { name: 'CONCERT', label: 'Live music', category: 'MUSIC', image: media.stage },
  { name: 'FESTIVAL', label: 'Find your crowd', category: 'MUSIC', image: media.crowd },
  {
    name: 'WORKSHOP',
    label: 'Try something new',
    category: 'WORKSHOP',
    image: '/images/microphone.jpg',
  },
  {
    name: 'SPORT',
    label: 'Feel the game',
    category: 'SPORTS',
    image: '/images/flow-sport.jpg',
  },
  { name: 'CULTURE', label: 'Discover new perspectives', category: 'OTHER', image: media.artist },
  {
    name: 'CONNECT',
    label: 'Connect and share',
    category: 'CONFERENCE',
    image: '/images/live-crowd.jpg',
  },
];
