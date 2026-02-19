import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { FredSeriesData } from '@fred/shared';

interface UIState {
  showRightPanel: boolean;
  isMobileMenuOpen: boolean;
  overlayData: FredSeriesData | null;
  isOverlayLoading: boolean;
  rightPanelTab: 'indicators' | 'stocks';
  watchedIndicators: string[];
  favoritedIndicators: string[];

  toggleRightPanel: () => void;
  toggleMobileMenu: () => void;
  setOverlayData: (data: FredSeriesData | null) => void;
  setOverlayLoading: (loading: boolean) => void;
  closeOverlay: () => void;
  setRightPanelTab: (tab: 'indicators' | 'stocks') => void;
  addWatchIndicator: (id: string) => void;
  removeWatchIndicator: (id: string) => void;
  setWatchedIndicators: (ids: string[]) => void;
  toggleFavorite: (id: string) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      showRightPanel: true,
      isMobileMenuOpen: false,
      overlayData: null,
      isOverlayLoading: false,
      rightPanelTab: 'indicators',
      watchedIndicators: [],
      favoritedIndicators: [],

      toggleRightPanel: () =>
        set((state) => ({ showRightPanel: !state.showRightPanel })),

      toggleMobileMenu: () =>
        set((state) => ({ isMobileMenuOpen: !state.isMobileMenuOpen })),

      setOverlayData: (overlayData) => set({ overlayData }),

      setOverlayLoading: (isOverlayLoading) => set({ isOverlayLoading }),

      closeOverlay: () => set({ overlayData: null, isOverlayLoading: false }),

      setRightPanelTab: (rightPanelTab) => set({ rightPanelTab }),

      addWatchIndicator: (id) =>
        set((state) => {
          if (state.watchedIndicators.includes(id) || state.watchedIndicators.length >= 5) return state;
          return { watchedIndicators: [...state.watchedIndicators, id] };
        }),

      removeWatchIndicator: (id) =>
        set((state) => ({ watchedIndicators: state.watchedIndicators.filter((w) => w !== id) })),

      setWatchedIndicators: (ids) =>
        set({ watchedIndicators: ids.slice(0, 5) }),

      toggleFavorite: (id) =>
        set((state) => ({
          favoritedIndicators: state.favoritedIndicators.includes(id)
            ? state.favoritedIndicators.filter((f) => f !== id)
            : [...state.favoritedIndicators, id],
        })),
    }),
    {
      name: 'fred-os-ui',
      partialize: (state) => ({
        showRightPanel: state.showRightPanel,
        rightPanelTab: state.rightPanelTab,
        watchedIndicators: state.watchedIndicators,
        favoritedIndicators: state.favoritedIndicators,
      }),
    }
  )
);
