import { supabase } from '@/integrations/supabase/client';

interface RateLimitSettings {
  requests_per_minute: number;
  requests_per_hour: number;
  max_concurrent_requests: number;
  timeout_seconds: number;
}

class RateLimitService {
  private settings: RateLimitSettings = {
    requests_per_minute: 60,
    requests_per_hour: 1000,
    max_concurrent_requests: 50,
    timeout_seconds: 30,
  };

  private requestCounts = {
    minute: new Map<string, { count: number; resetTime: number }>(),
    hour: new Map<string, { count: number; resetTime: number }>(),
  };

  private activeRequests = new Map<string, number>();

  async refreshSettings() {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('setting_value')
        .eq('setting_key', 'rate_limits')
        .single();

      if (error) throw error;

      if (data?.setting_value) {
        const settings = data.setting_value as any; // Type assertion for JSON data
        this.settings = {
          requests_per_minute: settings.requests_per_minute || 60,
          requests_per_hour: settings.requests_per_hour || 1000,
          max_concurrent_requests: settings.max_concurrent_requests || 50,
          timeout_seconds: settings.timeout_seconds || 30,
        };
      }
    } catch (error) {
      console.error('Failed to load rate limit settings:', error);
    }
  }

  async checkRateLimit(identifier: string = 'global'): Promise<{ allowed: boolean; reason?: string }> {
    const now = Date.now();
    
    // Check concurrent requests
    const concurrent = this.activeRequests.get(identifier) || 0;
    if (concurrent >= this.settings.max_concurrent_requests) {
      return { allowed: false, reason: 'Too many concurrent requests' };
    }

    // Check per-minute rate limit
    const minuteKey = `${identifier}:${Math.floor(now / 60000)}`;
    const minuteData = this.requestCounts.minute.get(minuteKey);
    if (minuteData && minuteData.count >= this.settings.requests_per_minute) {
      return { allowed: false, reason: 'Rate limit exceeded (per minute)' };
    }

    // Check per-hour rate limit
    const hourKey = `${identifier}:${Math.floor(now / 3600000)}`;
    const hourData = this.requestCounts.hour.get(hourKey);
    if (hourData && hourData.count >= this.settings.requests_per_hour) {
      return { allowed: false, reason: 'Rate limit exceeded (per hour)' };
    }

    return { allowed: true };
  }

  async startRequest(identifier: string = 'global'): Promise<() => void> {
    const now = Date.now();
    
    // Increment concurrent requests
    const concurrent = this.activeRequests.get(identifier) || 0;
    this.activeRequests.set(identifier, concurrent + 1);

    // Update minute counter
    const minuteKey = `${identifier}:${Math.floor(now / 60000)}`;
    const minuteData = this.requestCounts.minute.get(minuteKey) || { count: 0, resetTime: now + 60000 };
    minuteData.count++;
    this.requestCounts.minute.set(minuteKey, minuteData);

    // Update hour counter
    const hourKey = `${identifier}:${Math.floor(now / 3600000)}`;
    const hourData = this.requestCounts.hour.get(hourKey) || { count: 0, resetTime: now + 3600000 };
    hourData.count++;
    this.requestCounts.hour.set(hourKey, hourData);

    // Clean up expired entries
    this.cleanup();

    // Return cleanup function
    return () => {
      const current = this.activeRequests.get(identifier) || 0;
      if (current > 0) {
        this.activeRequests.set(identifier, current - 1);
      }
    };
  }

  private cleanup() {
    const now = Date.now();

    // Clean up expired minute entries
    for (const [key, data] of this.requestCounts.minute.entries()) {
      if (data.resetTime <= now) {
        this.requestCounts.minute.delete(key);
      }
    }

    // Clean up expired hour entries
    for (const [key, data] of this.requestCounts.hour.entries()) {
      if (data.resetTime <= now) {
        this.requestCounts.hour.delete(key);
      }
    }
  }

  getSettings(): RateLimitSettings {
    return { ...this.settings };
  }
}

export const rateLimitService = new RateLimitService();

// Initialize settings on first import
rateLimitService.refreshSettings();