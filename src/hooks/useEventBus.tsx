import { useEffect, useRef, useCallback } from 'react';
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

  // Typed router event subscriptions - FIXED: removed eventBus dependency
  const onRouter = useCallback((callback: (eventType: string, payload: any) => void) => {
    console.log('🔧 useEventBus: Setting up onRouter callback');
    const routerEvents = ['router.start', 'router.token', 'router.retrieved', 'router.selected', 'router.done', 'router.connected', 'router.disconnected', 'router.error'];
    const unsubscribers = routerEvents.map(eventType => {
      return on(eventType, (payload) => callback(eventType, payload));
    });
    return () => {
      console.log('🧹 useEventBus: Cleaning up onRouter subscriptions');
      unsubscribers.forEach(unsub => unsub());
    };
  }, []); // REMOVED eventBus dependency to prevent re-subscriptions

  // Typed preflight event subscriptions
  const onPreflight = useCallback((callback: (eventType: string, payload: any) => void) => {
    const preflightEvents = ['preflight.start', 'preflight.item', 'preflight.done', 'preflight.error', 'preflight.timeout'];
    const unsubscribers = preflightEvents.map(eventType => {
      return on(eventType, (payload) => callback(eventType, payload));
    });
    return () => unsubscribers.forEach(unsub => unsub());
  }, [eventBus]);

  // Typed exec event subscriptions
  const onExec = useCallback((callback: (eventType: string, payload: any) => void) => {
    const execEvents = ['exec.queued', 'exec.started', 'exec.progress', 'exec.stdout', 'exec.finished', 'exec.error', 'exec.timeout'];
    const unsubscribers = execEvents.map(eventType => {
      return on(eventType, (payload) => callback(eventType, payload));
    });
    return () => unsubscribers.forEach(unsub => unsub());
  }, [eventBus]);

  return { emit, on, onRouter, onPreflight, onExec };
};