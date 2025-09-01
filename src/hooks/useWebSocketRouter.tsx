import { useRef, useCallback, useEffect } from 'react';
import { useEventBus } from '@/hooks/useEventBus';

interface RouterMessage {
  type: string;
  rid: string;
  ts: number;
  data: any;
}

interface RouterRequest {
  agent_id: string;
  user_request: string;
}

export const useWebSocketRouter = () => {
  const wsRef = useRef<WebSocket | null>(null);
  const { emit } = useEventBus();

  const connect = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      return; // Already connected
    }

    // Use full URL to avoid env variables
    const wsUrl = `wss://lfsdqyvvboapsyeauchm.functions.supabase.co/ws-router`;
    
    try {
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log('Router WebSocket connected');
        emit('router.connected', {});
      };

      wsRef.current.onmessage = (event) => {
        try {
          const message: RouterMessage = JSON.parse(event.data);
          console.log('Router message received:', message);
          
          // Emit the event through the event bus
          emit(message.type, {
            ...message.data,
            rid: message.rid,
            ts: message.ts
          });
        } catch (error) {
          console.error('Failed to parse router message:', error);
        }
      };

      wsRef.current.onclose = (event) => {
        console.log('Router WebSocket disconnected:', event.code, event.reason);
        emit('router.disconnected', { code: event.code, reason: event.reason });
      };

      wsRef.current.onerror = (error) => {
        console.error('Router WebSocket error:', error);
        emit('router.error', { error: 'WebSocket connection failed' });
      };
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      emit('router.error', { error: 'Failed to create connection' });
    }
  }, [emit]);

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  const sendRequest = useCallback((request: RouterRequest) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(request));
    } else {
      console.error('WebSocket is not connected');
      emit('router.error', { error: 'WebSocket not connected' });
    }
  }, [emit]);

  // Auto-cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    connect,
    disconnect,
    sendRequest,
    isConnected: wsRef.current?.readyState === WebSocket.OPEN
  };
};