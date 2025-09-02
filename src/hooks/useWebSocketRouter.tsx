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
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;

  const connect = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      return; // Already connected
    }

    // Use correct Supabase WebSocket URL format
    const wsUrl = `wss://lfsdqyvvboapsyeauchm.functions.supabase.co/ws-router`;
    
    try {
      console.log('Attempting to connect to Router WebSocket...');
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log('Router WebSocket connected successfully');
        reconnectAttemptsRef.current = 0; // Reset attempts on successful connection
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
        
        // Attempt to reconnect if not a manual disconnect
        if (event.code !== 1000 && reconnectAttemptsRef.current < maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 10000);
          console.log(`Attempting to reconnect Router WebSocket in ${delay}ms...`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current++;
            connect();
          }, delay);
        } else if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
          console.error('Max reconnection attempts reached for Router WebSocket');
          emit('router.error', { error: 'Max reconnection attempts reached' });
        }
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
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    reconnectAttemptsRef.current = maxReconnectAttempts; // Prevent reconnection
    
    if (wsRef.current) {
      wsRef.current.close(1000); // Normal closure
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