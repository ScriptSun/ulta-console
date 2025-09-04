import { supabase } from "@/integrations/supabase/client";

interface AISettings {
  enabled_models: string[];
  default_models: string[];
  max_tokens: number;
  temperature: number;
}

interface APILimitSettings {
  requests_per_minute: number;
  requests_per_hour: number;
  requests_per_day: number;
  connection_timeout: number;
  read_timeout: number;
  write_timeout: number;
  max_concurrent_requests: number;
  max_concurrent_per_user: number;
  enable_rate_limiting: boolean;
  enable_request_logging: boolean;
  enable_circuit_breaker: boolean;
  failure_threshold: number;
  recovery_timeout: number;
}

interface SystemSettings {
  ai_models: AISettings;
  rate_limits: APILimitSettings;
  security: any;
  notifications: any;
  upgrade_url: string;
}

class SystemSettingsService {
  private static instance: SystemSettingsService;
  private settingsCache: Partial<SystemSettings> = {};
  private lastCacheUpdate = 0;
  private cacheTimeout = 5 * 60 * 1000; // 5 minutes

  private constructor() {}

  public static getInstance(): SystemSettingsService {
    if (!SystemSettingsService.instance) {
      SystemSettingsService.instance = new SystemSettingsService();
    }
    return SystemSettingsService.instance;
  }

  private async loadSettings(): Promise<void> {
    const now = Date.now();
    if (now - this.lastCacheUpdate < this.cacheTimeout) {
      return; // Use cached settings
    }

    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('setting_key, setting_value');

      if (error) {
        console.warn('Failed to load system settings:', error);
        return;
      }

      if (data) {
        // Parse settings into cache
        data.forEach(setting => {
          this.settingsCache[setting.setting_key as keyof SystemSettings] = setting.setting_value;
        });
        this.lastCacheUpdate = now;
      }
    } catch (error) {
      console.error('Error loading system settings:', error);
    }
  }

  public async getTemperature(): Promise<number> {
    await this.loadSettings();
    
    const aiSettings = this.settingsCache.ai_models;
    if (aiSettings && typeof aiSettings === 'object' && aiSettings.temperature !== undefined) {
      return aiSettings.temperature;
    }
    
    // Default fallback temperature
    return 0.7;
  }

  public async getAISettings(): Promise<AISettings> {
    await this.loadSettings();
    
    const aiSettings = this.settingsCache.ai_models;
    if (aiSettings && typeof aiSettings === 'object') {
      return {
        enabled_models: aiSettings.enabled_models || ['gpt-4o-mini'],
        default_models: aiSettings.default_models || ['gpt-4o-mini', 'gpt-4o', 'claude-3-5-sonnet'],
        max_tokens: aiSettings.max_tokens || 4000,
        temperature: aiSettings.temperature || 0.7,
      };
    }
    
    // Default fallback settings
    return {
      enabled_models: ['gpt-4o-mini'],
      default_models: ['gpt-4o-mini', 'gpt-4o', 'claude-3-5-sonnet'],
      max_tokens: 4000,
      temperature: 0.7,
    };
  }

  public async getMaxTokens(): Promise<number> {
    await this.loadSettings();
    
    const aiSettings = this.settingsCache.ai_models;
    if (aiSettings && typeof aiSettings === 'object' && aiSettings.max_tokens !== undefined) {
      return aiSettings.max_tokens;
    }
    
    return 4000;
  }

  public async clearCache(): Promise<void> {
    this.lastCacheUpdate = 0;
    this.settingsCache = {};
  }

  public async getUpgradeUrl(): Promise<string> {
    await this.loadSettings();
    
    const upgradeUrl = this.settingsCache.upgrade_url;
    if (upgradeUrl && typeof upgradeUrl === 'string') {
      return upgradeUrl;
    }
    
    // Default fallback URL
    return '/subscription-plans';
  }

  public async setUpgradeUrl(url: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('system_settings')
        .upsert({ 
          setting_key: 'upgrade_url',
          setting_value: url
        });

      if (error) {
        throw error;
      }

      // Update cache
      this.settingsCache.upgrade_url = url;
    } catch (error) {
      console.error('Error setting upgrade URL:', error);
      throw error;
    }
  }

  public async getAPILimits(): Promise<APILimitSettings> {
    await this.loadSettings();
    
    const rateLimits = this.settingsCache.rate_limits;
    if (rateLimits && typeof rateLimits === 'object') {
      return {
        requests_per_minute: rateLimits.requests_per_minute || 100,
        requests_per_hour: rateLimits.requests_per_hour || 1000,
        requests_per_day: rateLimits.requests_per_day || 10000,
        connection_timeout: rateLimits.connection_timeout || 30,
        read_timeout: rateLimits.read_timeout || 60,
        write_timeout: rateLimits.write_timeout || 60,
        max_concurrent_requests: rateLimits.max_concurrent_requests || 50,
        max_concurrent_per_user: rateLimits.max_concurrent_per_user || 10,
        enable_rate_limiting: rateLimits.enable_rate_limiting !== false,
        enable_request_logging: rateLimits.enable_request_logging !== false,
        enable_circuit_breaker: rateLimits.enable_circuit_breaker || false,
        failure_threshold: rateLimits.failure_threshold || 5,
        recovery_timeout: rateLimits.recovery_timeout || 60,
      };
    }
    
    // Default fallback settings
    return {
      requests_per_minute: 100,
      requests_per_hour: 1000,
      requests_per_day: 10000,
      connection_timeout: 30,
      read_timeout: 60,
      write_timeout: 60,
      max_concurrent_requests: 50,
      max_concurrent_per_user: 10,
      enable_rate_limiting: true,
      enable_request_logging: true,
      enable_circuit_breaker: false,
      failure_threshold: 5,
      recovery_timeout: 60,
    };
  }

  public async setAPILimits(settings: APILimitSettings): Promise<void> {
    try {
      const { error } = await supabase
        .from('system_settings')
        .upsert({ 
          setting_key: 'rate_limits',
          setting_value: settings as any
        });

      if (error) {
        throw error;
      }

      // Update cache
      this.settingsCache.rate_limits = settings;
      this.lastCacheUpdate = Date.now();
    } catch (error) {
      console.error('Error setting API limits:', error);
      throw error;
    }
  }
}

export const systemSettingsService = SystemSettingsService.getInstance();