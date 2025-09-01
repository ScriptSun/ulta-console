import React, { createContext, useContext, useRef, ReactNode } from 'react';

interface EventBusContextType {
  emit: (type: string, payload: any) => void;
  on: (type: string, callback: (payload: any) => void) => () => void;
}

const EventBusContext = createContext<EventBusContextType | null>(null);

interface EventBusProviderProps {
  children: ReactNode;
}

export const EventBusProvider: React.FC<EventBusProviderProps> = ({ children }) => {
  const listenersRef = useRef<Map<string, Set<(payload: any) => void>>>(new Map());

  const emit = (type: string, payload: any) => {
    const listeners = listenersRef.current.get(type);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(payload);
        } catch (error) {
          console.error(`Error in event listener for ${type}:`, error);
        }
      });
    }
  };

  const on = (type: string, callback: (payload: any) => void) => {
    if (!listenersRef.current.has(type)) {
      listenersRef.current.set(type, new Set());
    }
    
    const listeners = listenersRef.current.get(type)!;
    listeners.add(callback);

    // Return unsubscribe function
    return () => {
      listeners.delete(callback);
      if (listeners.size === 0) {
        listenersRef.current.delete(type);
      }
    };
  };

  const value = {
    emit,
    on
  };

  return (
    <EventBusContext.Provider value={value}>
      {children}
    </EventBusContext.Provider>
  );
};

export const useEventBus = () => {
  const context = useContext(EventBusContext);
  if (!context) {
    throw new Error('useEventBus must be used within an EventBusProvider');
  }
  return context;
};