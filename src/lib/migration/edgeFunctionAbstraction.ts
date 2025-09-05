// Edge Function abstraction layer for easier migration

export interface FunctionResponse<T = any> {
  data: T | null;
  error: string | null;
  status: number;
}

export interface FunctionConfig {
  type: 'supabase' | 'vercel' | 'netlify' | 'aws-lambda' | 'custom';
  baseUrl?: string;
  apiKey?: string;
  headers?: Record<string, string>;
}

export abstract class FunctionAdapter {
  protected config: FunctionConfig;
  
  constructor(config: FunctionConfig) {
    this.config = config;
  }

  abstract invoke<T>(functionName: string, payload?: any, headers?: Record<string, string>): Promise<FunctionResponse<T>>;
}

// Supabase Functions Adapter
import { supabaseEnhanced } from '@/lib/supabaseClient';

export class SupabaseFunctionAdapter extends FunctionAdapter {
  private supabase = supabaseEnhanced;

  async invoke<T>(functionName: string, payload?: any, headers?: Record<string, string>): Promise<FunctionResponse<T>> {
    try {
      const { data, error } = await this.supabase.functions.invoke(functionName, {
        body: payload,
        headers
      });

      return {
        data: data as T,
        error: error?.message || null,
        status: error ? 500 : 200
      };
    } catch (err) {
      return {
        data: null,
        error: err instanceof Error ? err.message : 'Unknown error',
        status: 500
      };
    }
  }
}

// Generic HTTP Function Adapter (for other providers)
export class HttpFunctionAdapter extends FunctionAdapter {
  async invoke<T>(functionName: string, payload?: any, headers?: Record<string, string>): Promise<FunctionResponse<T>> {
    try {
      const url = `${this.config.baseUrl}/${functionName}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.config.apiKey && { 'Authorization': `Bearer ${this.config.apiKey}` }),
          ...this.config.headers,
          ...headers
        },
        body: payload ? JSON.stringify(payload) : undefined
      });

      const data = await response.json();

      return {
        data: data as T,
        error: response.ok ? null : data.error || 'Request failed',
        status: response.status
      };
    } catch (err) {
      return {
        data: null,
        error: err instanceof Error ? err.message : 'Network error',
        status: 500
      };
    }
  }
}

// Function service that abstracts all edge function calls
export class FunctionService {
  constructor(private adapter: FunctionAdapter) {}

  // AI and Chat functions
  async sendChatMessage(payload: { message: string; conversationId?: string }) {
    return this.adapter.invoke('chat-api', payload);
  }

  async routeAIRequest(payload: { input: string; context?: any }) {
    return this.adapter.invoke('ai-router', payload);
  }

  async generateAIAdvice(payload: { query: string; agentId: string }) {
    return this.adapter.invoke('ultaai-advice', payload);
  }

  // Agent functions
  async deployAgent(payload: { agentId: string; config: any }) {
    return this.adapter.invoke('agent-deploy', payload);
  }

  async controlAgent(payload: { agentId: string; action: string }) {
    return this.adapter.invoke('agent-control', payload);
  }

  async reportAgentHeartbeat(payload: { agentId: string; metrics: any }) {
    return this.adapter.invoke('agent-heartbeat', payload);
  }

  // Batch and Script functions
  async validateBatch(payload: { batchId: string; config: any }) {
    return this.adapter.invoke('validate-batch', payload);
  }

  async runBatch(payload: { batchId: string; params: any }) {
    return this.adapter.invoke('script-batches', payload);
  }

  async getBatchDetails(payload: { batchId: string }) {
    return this.adapter.invoke('batch-details', payload);
  }

  // Email functions
  async sendEmail(payload: { to: string; subject: string; template?: string }) {
    return this.adapter.invoke('sendgrid-email', payload);
  }

  async sendDynamicEmail(payload: { templateId: string; to: string; variables: any }) {
    return this.adapter.invoke('dynamic-email-send', payload);
  }

  // Authentication and Security
  async enhancedAuth(payload: { email: string; password: string }) {
    return this.adapter.invoke('auth-security-enhanced', payload);
  }

  async checkPermissions(payload: { userId: string; resource: string }) {
    return this.adapter.invoke('check-permissions', payload);
  }

  async resetPassword(payload: { email?: string; token?: string; newPassword?: string }) {
    return this.adapter.invoke('password-reset', payload);
  }

  // Team and Invite functions
  async sendTeamInvite(payload: { email: string; teamId: string; role: string }) {
    return this.adapter.invoke('team-invites', payload);
  }

  async bulkInviteUsers(payload: { teamId: string; invites: any[] }) {
    return this.adapter.invoke('console-invites', payload);
  }

  // Widget functions
  async handleWidgetApi(payload: any) {
    return this.adapter.invoke('widget-api', payload);
  }

  async getWidgetAnalytics(payload: { widgetId: string; dateRange?: any }) {
    return this.adapter.invoke('widget-analytics', payload);
  }

  // Notification functions
  async sendNotificationEvent(payload: { type: string; data: any }) {
    return this.adapter.invoke('api-notify-events', payload);
  }

  async testNotificationProvider(payload: { providerId: string; testData: any }) {
    return this.adapter.invoke('test-notification-providers', payload);
  }

  // Health and monitoring
  async checkHealth() {
    return this.adapter.invoke('health');
  }

  async checkDomainHealth(payload: { domain: string }) {
    return this.adapter.invoke('check-domain-health', payload);
  }

  // Utility functions
  async classifyCommand(payload: { command: string; context?: any }) {
    return this.adapter.invoke('classify-command', payload);
  }

  async validateCommand(payload: { command: string; params?: any }) {
    return this.adapter.invoke('validate-command', payload);
  }
}

// Migration helper to switch between different function providers
export class FunctionMigrationService {
  private currentService: FunctionService;
  private newService?: FunctionService;

  constructor(currentAdapter: FunctionAdapter, newAdapter?: FunctionAdapter) {
    this.currentService = new FunctionService(currentAdapter);
    if (newAdapter) {
      this.newService = new FunctionService(newAdapter);
    }
  }

  // Dual invoke - calls both old and new services for testing
  async dualInvoke<T>(
    functionCall: (service: FunctionService) => Promise<FunctionResponse<T>>,
    useFallback = true
  ): Promise<FunctionResponse<T>> {
    try {
      // Try new service first if available
      if (this.newService) {
        const result = await functionCall(this.newService);
        if (result.error && useFallback) {
          console.warn('New service failed, falling back to current:', result.error);
          return await functionCall(this.currentService);
        }
        return result;
      }
      
      return await functionCall(this.currentService);
    } catch (error) {
      console.error('Function invocation failed:', error);
      if (useFallback && this.newService) {
        return await functionCall(this.currentService);
      }
      throw error;
    }
  }

  switchToNew() {
    if (this.newService) {
      this.currentService = this.newService;
      this.newService = undefined;
    }
  }
}

// Global function service instance
export const functions = new FunctionService(
  new SupabaseFunctionAdapter({
    type: 'supabase'
  })
);