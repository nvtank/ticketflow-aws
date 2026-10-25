import { z } from 'zod';
import { eventListSchema } from './api-client';

export const artistSchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  genre: z.string(),
  tagline: z.string(),
  biography: z.string(),
  color: z.string(),
  isDemo: z.boolean(),
});
export const artistListSchema = z.object({
  items: z.array(artistSchema.extend({ upcomingEvents: z.number() })),
  genres: z.array(z.string()),
  pagination: eventListSchema.shape.pagination,
});
export const artistDetailSchema = artistSchema.extend({ events: eventListSchema.shape.items });
export type Artist = z.infer<typeof artistSchema>;
export const reviewSchema = z.object({
  id: z.string(),
  eventId: z.string(),
  rating: z.number(),
  comment: z.string(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  author: z.object({ id: z.string(), name: z.string() }),
  event: z.object({ slug: z.string(), title: z.string() }),
});
export const reviewsSchema = z.object({
  items: z.array(reviewSchema),
  pagination: eventListSchema.shape.pagination,
  summary: z.object({
    count: z.number(),
    average: z.number().nullable(),
    distribution: z.array(z.object({ rating: z.number(), count: z.number() })),
  }),
});
export const reviewContextSchema = z.object({
  eligible: z.boolean(),
  review: reviewSchema.nullable(),
});
