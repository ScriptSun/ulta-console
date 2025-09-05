import { DatabaseAdapter, DatabaseConfig, DatabaseService } from './databaseAbstraction';
import { SupabaseAdapter } from './databaseAbstraction';
import { PostgreSQLAdapter } from './postgresqlAdapter';

export type DatabaseProvider = 'supabase' | 'postgresql';

export interface DatabaseSwitchConfig {
  provider: DatabaseProvider;
  config: DatabaseConfig;
}

export class DatabaseSwitcher {
  private static instance: DatabaseSwitcher;
  private currentAdapter: DatabaseAdapter | null = null;
  private currentService: DatabaseService | null = null;
  private currentProvider: DatabaseProvider = 'supabase';

  private constructor() {
    // Initialize with Supabase by default
    this.switchTo('supabase', {
      type: 'supabase',
      config: {}
    });
  }

  static getInstance(): DatabaseSwitcher {
    if (!DatabaseSwitcher.instance) {
      DatabaseSwitcher.instance = new DatabaseSwitcher();
    }
    return DatabaseSwitcher.instance;
  }

  async switchTo(provider: DatabaseProvider, config: DatabaseConfig): Promise<{ success: boolean; error?: string }> {
    try {
      // Disconnect current adapter
      if (this.currentAdapter) {
        await this.currentAdapter.disconnect();
      }

      // Create new adapter
      let newAdapter: DatabaseAdapter;
      
      switch (provider) {
        case 'supabase':
          newAdapter = new SupabaseAdapter();
          break;
        case 'postgresql':
          newAdapter = new PostgreSQLAdapter();
          break;
        default:
          throw new Error(`Unsupported provider: ${provider}`);
      }

      // Connect to new database
      await newAdapter.connect(config);

      // Update current instances
      this.currentAdapter = newAdapter;
      this.currentService = new DatabaseService(newAdapter);
      this.currentProvider = provider;

      // Store configuration in localStorage for persistence
      localStorage.setItem('database_config', JSON.stringify({ provider, config }));

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  getCurrentProvider(): DatabaseProvider {
    return this.currentProvider;
  }

  getCurrentService(): DatabaseService | null {
    return this.currentService;
  }

  getCurrentAdapter(): DatabaseAdapter | null {
    return this.currentAdapter;
  }

  // Test connection to a database without switching
  async testConnection(provider: DatabaseProvider, config: DatabaseConfig): Promise<{ success: boolean; error?: string }> {
    try {
      let testAdapter: DatabaseAdapter;
      
      switch (provider) {
        case 'supabase':
          testAdapter = new SupabaseAdapter();
          break;
        case 'postgresql':
          testAdapter = new PostgreSQLAdapter();
          break;
        default:
          throw new Error(`Unsupported provider: ${provider}`);
      }

      await testAdapter.connect(config);
      
      // Test with a simple query
      const result = await testAdapter.executeRawSQL('SELECT 1 as test');
      if (result.error) {
        throw new Error(result.error);
      }

      await testAdapter.disconnect();
      
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Load configuration from localStorage on app start
  async loadPersistedConfig(): Promise<void> {
    try {
      const savedConfig = localStorage.getItem('database_config');
      if (savedConfig) {
        const { provider, config } = JSON.parse(savedConfig) as DatabaseSwitchConfig;
        await this.switchTo(provider, config);
      }
    } catch (error) {
      console.warn('Failed to load persisted database config:', error);
      // Fall back to default Supabase
    }
  }

  // Get available providers
  getAvailableProviders(): { value: DatabaseProvider; label: string }[] {
    return [
      { value: 'supabase', label: 'Supabase (Cloud)' },
      { value: 'postgresql', label: 'PostgreSQL (Local/Self-hosted)' }
    ];
  }
}

// Create global instance
export const databaseSwitcher = DatabaseSwitcher.getInstance();

// Export updated global database service that uses the switcher
export const db = new Proxy({} as DatabaseService, {
  get(target, prop) {
    const service = databaseSwitcher.getCurrentService();
    if (!service) {
      throw new Error('No database service available. Please configure a database connection.');
    }
    return (service as any)[prop];
  }
});