import { create } from 'zustand';

interface NavigationState {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

// UI state only; server entities and credentials never live here.
export const useNavigation = create<NavigationState>((set) => ({
  sidebarOpen: false,
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
}));
