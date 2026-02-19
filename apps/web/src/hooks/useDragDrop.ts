import { useCallback, useState } from 'react';

export function useDragDrop(onDrop: (seriesId: string) => void) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const seriesId = e.dataTransfer.getData('text/plain');
    if (seriesId) {
      onDrop(seriesId);
    }
  }, [onDrop]);

  return {
    isDragging,
    handleDragOver,
    handleDragLeave,
    handleDrop,
  };
}
