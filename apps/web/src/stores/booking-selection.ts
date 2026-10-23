'use client';
import { create } from 'zustand';
interface Selection {
  eventId: string | null;
  seatIds: string[];
  toggle: (eventId: string, id: string, max: number) => boolean;
  clear: (eventId: string) => void;
  prune: (eventId: string, available: string[]) => void;
}
export const useBookingSelection = create<Selection>((set, get) => ({
  eventId: null,
  seatIds: [],
  toggle: (eventId, id, max) => {
    const previous = get(),
      ids = previous.eventId === eventId ? previous.seatIds : [];
    if (!ids.includes(id) && ids.length >= max) return false;
    set({ eventId, seatIds: ids.includes(id) ? ids.filter((i) => i !== id) : [...ids, id] });
    return true;
  },
  clear: (eventId) => {
    if (get().eventId === eventId) set({ seatIds: [] });
  },
  prune: (eventId, available) => {
    const state = get();
    if (state.eventId !== eventId) return;
    const ids = state.seatIds.filter((id) => available.includes(id));
    if (ids.length !== state.seatIds.length) set({ seatIds: ids });
  },
}));
