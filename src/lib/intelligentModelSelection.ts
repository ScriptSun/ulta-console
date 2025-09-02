import { supabase } from "@/integrations/supabase/client";

interface PatternRule {
  id: string;
  name: string;
  pattern: string;
  patternType: 'regex' | 'keyword' | 'contains';
  modelType: 'fast' | 'smart';
  priority: number;
  enabled: boolean;
  description: string;
}

interface ModelMapping {
  fast: string[];
  smart: string[];
}

interface IntelligentSelectionSettings {
  enabled: boolean;
  rules: PatternRule[];
  modelMapping: ModelMapping;
  defaultModel: 'fast' | 'smart';
  fallbackEnabled: boolean;
}

class IntelligentModelSelection {
  private static instance: IntelligentModelSelection;
  private settingsCache: IntelligentSelectionSettings | null = null;
  private lastCacheUpdate = 0;
  private cacheTimeout = 5 * 60 * 1000; // 5 minutes

  private constructor() {}

  public static getInstance(): IntelligentModelSelection {
    if (!IntelligentModelSelection.instance) {
      IntelligentModelSelection.instance = new IntelligentModelSelection();
    }
    return IntelligentModelSelection.instance;
  }

  private async loadSettings(): Promise<IntelligentSelectionSettings> {
    const now = Date.now();
    if (this.settingsCache && (now - this.lastCacheUpdate) < this.cacheTimeout) {
      return this.settingsCache;
    }

    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('setting_value')
        .eq('setting_key', 'ai.intelligent_selection')
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.warn('Failed to load intelligent selection settings:', error);
      }

      // Default settings if none found
      const defaultSettings: IntelligentSelectionSettings = {
        enabled: false, // Disabled by default until configured
        rules: [],
        modelMapping: {
          fast: ['gpt-5-nano-2025-08-07', 'gpt-5-mini-2025-08-07', 'claude-3-5-haiku-20241022'],
          smart: ['gpt-5-2025-08-07', 'claude-opus-4-20250514', 'claude-sonnet-4-20250514']
        },
        defaultModel: 'fast',
        fallbackEnabled: true
      };

      this.settingsCache = data?.setting_value ? 
        { ...defaultSettings, ...(data.setting_value as Partial<IntelligentSelectionSettings>) } : 
        defaultSettings;
      this.lastCacheUpdate = now;

      return this.settingsCache;
    } catch (error) {
      console.error('Error loading intelligent selection settings:', error);
      // Return safe defaults
      return {
        enabled: false,
        rules: [],
        modelMapping: {
          fast: ['gpt-5-nano-2025-08-07'],
          smart: ['gpt-5-2025-08-07']
        },
        defaultModel: 'fast',
        fallbackEnabled: true
      };
    }
  }

  public async selectModel(userRequest: string): Promise<{ 
    modelType: 'fast' | 'smart'; 
    models: string[]; 
    rule?: PatternRule;
    reason: string;
  }> {
    const settings = await this.loadSettings();

    // If intelligent selection is disabled, use default
    if (!settings.enabled) {
      return {
        modelType: settings.defaultModel,
        models: settings.modelMapping[settings.defaultModel],
        reason: 'Intelligent selection disabled, using default model type'
      };
    }

    // Sort rules by priority and filter enabled ones
    const activeRules = settings.rules
      .filter(rule => rule.enabled)
      .sort((a, b) => a.priority - b.priority);

    // Test each rule in priority order
    for (const rule of activeRules) {
      if (this.testPattern(userRequest, rule)) {
        return {
          modelType: rule.modelType,
          models: settings.modelMapping[rule.modelType],
          rule,
          reason: `Matched rule: ${rule.name}`
        };
      }
    }

    // No rules matched, use default
    return {
      modelType: settings.defaultModel,
      models: settings.modelMapping[settings.defaultModel],
      reason: 'No rules matched, using default model type'
    };
  }

  private testPattern(text: string, rule: PatternRule): boolean {
    try {
      switch (rule.patternType) {
        case 'regex':
          const regex = new RegExp(rule.pattern, 'i');
          return regex.test(text);
        
        case 'keyword':
          return text.toLowerCase() === rule.pattern.toLowerCase();
        
        case 'contains':
          return text.toLowerCase().includes(rule.pattern.toLowerCase());
        
        default:
          console.warn(`Unknown pattern type: ${rule.patternType}`);
          return false;
      }
    } catch (error) {
      console.warn(`Error testing pattern "${rule.pattern}" for rule "${rule.name}":`, error);
      return false;
    }
  }

  public async refreshSettings(): Promise<void> {
    this.lastCacheUpdate = 0;
    this.settingsCache = null;
    await this.loadSettings();
  }

  public async isEnabled(): Promise<boolean> {
    const settings = await this.loadSettings();
    return settings.enabled;
  }

  // Convenience method for simple pattern matching similar to the user's example
  public static createSimplePatterns(): PatternRule[] {
    return [
      {
        id: 'greetings',
        name: 'Greetings',
        pattern: '^(hi|hey|hello)',
        patternType: 'regex',
        modelType: 'fast',
        priority: 1,
        enabled: true,
        description: 'Simple greetings'
      },
      {
        id: 'simple-commands',
        name: 'Simple Commands',
        pattern: '^(check|show|list)\\s+(disk|memory|cpu|processes)',
        patternType: 'regex',
        modelType: 'fast',
        priority: 2,
        enabled: true,
        description: 'Basic system commands'
      },
      {
        id: 'installations',
        name: 'Common Installations',
        pattern: '^install\\s+(wordpress|docker|nodejs|nginx)',
        patternType: 'regex',
        modelType: 'fast',
        priority: 3,
        enabled: true,
        description: 'Predefined software installations'
      }
    ];
  }
}

export const intelligentModelSelection = IntelligentModelSelection.getInstance();