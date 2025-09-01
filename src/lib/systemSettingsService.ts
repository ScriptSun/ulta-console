import { supabase } from "@/integrations/supabase/client";

interface AISettings {
  enabled_models: string[];
  default_models: string[];
  max_tokens: number;
  temperature: number;
}

interface SystemSettings {
  ai_models: AISettings;
  rate_limits: any;
  security: any;
  notifications: any;
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

  public async refreshSettings(): Promise<void> {
    await this.clearCache();
    await this.loadSettings();
  }
}

export const systemSettingsService = SystemSettingsService.getInstance();