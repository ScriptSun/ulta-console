import { useEffect, useRef } from 'react';
import { useEventBus as useEventBusContext } from '@/contexts/EventBusContext';

export const useEventBus = () => {
  const eventBus = useEventBusContext();
  const unsubscribersRef = useRef<(() => void)[]>([]);

  // Auto-cleanup on unmount
  useEffect(() => {
    return () => {
      unsubscribersRef.current.forEach(unsubscribe => unsubscribe());
      unsubscribersRef.current = [];
    };
  }, []);

  const emit = eventBus.emit;

  const on = (type: string, callback: (payload: any) => void) => {
    const unsubscribe = eventBus.on(type, callback);
    unsubscribersRef.current.push(unsubscribe);
    return unsubscribe;
  };

  return { emit, on };
};