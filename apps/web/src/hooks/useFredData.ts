import { useCallback } from 'react';
import { useUIStore } from '@/stores/uiStore';
import { api } from '@/services/api';

export function useFredData() {
  const { setOverlayData, setOverlayLoading, closeOverlay } = useUIStore();

  const fetchQuickView = useCallback(async (seriesId: string) => {
    setOverlayData(null);
    setOverlayLoading(true);

    try {
      const data = await api.getFredData(seriesId);
      setOverlayData(data);
    } catch (error) {
      console.error('Failed to fetch FRED data:', error);
      closeOverlay();
    } finally {
      setOverlayLoading(false);
    }
  }, [setOverlayData, setOverlayLoading, closeOverlay]);

  return {
    fetchQuickView,
    closeOverlay,
  };
}
