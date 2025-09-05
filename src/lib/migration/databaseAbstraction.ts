// Database abstraction layer to ease migration from Supabase

export interface QueryResult<T = any> {
  data: T | null;
  error: string | null;
  count?: number;
}

export interface DatabaseConfig {
  type: 'supabase' | 'postgresql' | 'mysql' | 'firebase' | 'mongodb';
  connectionString?: string;
  config?: Record<string, any>;
}

export abstract class DatabaseAdapter {
  abstract connect(config: DatabaseConfig): Promise<void>;
  abstract disconnect(): Promise<void>;
  
  // Basic CRUD operations
  abstract select<T>(table: string, options?: SelectOptions): Promise<QueryResult<T[]>>;
  abstract insert<T>(table: string, data: Partial<T> | Partial<T>[]): Promise<QueryResult<T>>;
  abstract update<T>(table: string, data: Partial<T>, where: WhereCondition): Promise<QueryResult<T>>;
  abstract delete(table: string, where: WhereCondition): Promise<QueryResult<void>>;
  
  // Advanced operations
  abstract executeRPC(functionName: string, params?: Record<string, any>): Promise<QueryResult>;
  abstract executeRawSQL(sql: string, params?: any[]): Promise<QueryResult>;
  
  // Real-time subscriptions (optional)
  abstract subscribe?(table: string, callback: (payload: any) => void): () => void;
}

export interface SelectOptions {
  columns?: string[];
  where?: WhereCondition[];
  orderBy?: { column: string; ascending?: boolean }[];
  limit?: number;
  offset?: number;
}

export interface WhereCondition {
  column: string;
  operator: '=' | '!=' | '>' | '<' | '>=' | '<=' | 'IN' | 'LIKE' | 'IS NULL' | 'IS NOT NULL';
  value?: any;
}

// Supabase adapter (current implementation)
import { supabaseEnhanced } from '@/lib/supabaseClient';

export class SupabaseAdapter extends DatabaseAdapter {
  private supabase = supabaseEnhanced;

  async connect(config: DatabaseConfig): Promise<void> {
    // Supabase client is already initialized
  }

  async disconnect(): Promise<void> {
    // No explicit disconnect needed for Supabase
  }

  async select<T>(table: string, options: SelectOptions = {}): Promise<QueryResult<T[]>> {
    try {
      // Use any to bypass TypeScript table name restrictions for abstraction layer
      let query = (this.supabase as any).from(table).select(options.columns?.join(',') || '*');
      
      // Apply where conditions
      if (options.where) {
        for (const condition of options.where) {
          switch (condition.operator) {
            case '=':
              query = query.eq(condition.column, condition.value);
              break;
            case '!=':
              query = query.neq(condition.column, condition.value);
              break;
            case '>':
              query = query.gt(condition.column, condition.value);
              break;
            case '<':
              query = query.lt(condition.column, condition.value);
              break;
            case '>=':
              query = query.gte(condition.column, condition.value);
              break;
            case '<=':
              query = query.lte(condition.column, condition.value);
              break;
            case 'IN':
              query = query.in(condition.column, condition.value);
              break;
            case 'LIKE':
              query = query.like(condition.column, condition.value);
              break;
            case 'IS NULL':
              query = query.is(condition.column, null);
              break;
            case 'IS NOT NULL':
              query = query.not(condition.column, 'is', null);
              break;
          }
        }
      }
      
      // Apply ordering
      if (options.orderBy) {
        for (const order of options.orderBy) {
          query = query.order(order.column, { ascending: order.ascending ?? true });
        }
      }
      
      // Apply pagination
      if (options.limit) {
        query = query.limit(options.limit);
      }
      if (options.offset) {
        query = query.range(options.offset, (options.offset + (options.limit || 1000)) - 1);
      }

      const { data, error, count } = await query;
      
      return {
        data: data as T[],
        error: error?.message || null,
        count
      };
    } catch (err) {
      return {
        data: null,
        error: err instanceof Error ? err.message : 'Unknown error'
      };
    }
  }

  async insert<T>(table: string, data: Partial<T> | Partial<T>[]): Promise<QueryResult<T>> {
    try {
      const { data: result, error } = await (this.supabase as any)
        .from(table)
        .insert(data)
        .select();

      return {
        data: Array.isArray(result) ? result[0] as T : result as T,
        error: error?.message || null
      };
    } catch (err) {
      return {
        data: null,
        error: err instanceof Error ? err.message : 'Unknown error'
      };
    }
  }

  async update<T>(table: string, data: Partial<T>, where: WhereCondition): Promise<QueryResult<T>> {
    try {
      let query = (this.supabase as any).from(table).update(data);
      
      // Apply where condition
      switch (where.operator) {
        case '=':
          query = query.eq(where.column, where.value);
          break;
        case '!=':
          query = query.neq(where.column, where.value);
          break;
        // Add other operators as needed
      }

      const { data: result, error } = await query.select();

      return {
        data: Array.isArray(result) ? result[0] as T : result as T,
        error: error?.message || null
      };
    } catch (err) {
      return {
        data: null,
        error: err instanceof Error ? err.message : 'Unknown error'
      };
    }
  }

  async delete(table: string, where: WhereCondition): Promise<QueryResult<void>> {
    try {
      let query = (this.supabase as any).from(table).delete();
      
      // Apply where condition
      switch (where.operator) {
        case '=':
          query = query.eq(where.column, where.value);
          break;
        // Add other operators as needed
      }

      const { error } = await query;

      return {
        data: null,
        error: error?.message || null
      };
    } catch (err) {
      return {
        data: null,
        error: err instanceof Error ? err.message : 'Unknown error'
      };
    }
  }

  async executeRPC(functionName: string, params: Record<string, any> = {}): Promise<QueryResult> {
    try {
      const { data, error } = await (this.supabase as any).rpc(functionName, params);

      return {
        data,
        error: error?.message || null
      };
    } catch (err) {
      return {
        data: null,
        error: err instanceof Error ? err.message : 'Unknown error'
      };
    }
  }

  async executeRawSQL(sql: string, params: any[] = []): Promise<QueryResult> {
    // Supabase doesn't support raw SQL from client
    return {
      data: null,
      error: 'Raw SQL not supported in Supabase client'
    };
  }

  subscribe(table: string, callback: (payload: any) => void): () => void {
    const channel = this.supabase
      .channel(`${table}_changes`)
      .on('postgres_changes', { event: '*', schema: 'public', table }, callback)
      .subscribe();

    return () => {
      this.supabase.removeChannel(channel);
    };
  }
}

// Database service that uses the abstraction
export class DatabaseService {
  constructor(private adapter: DatabaseAdapter) {}

  // Wrapper methods that use the adapter
  async getUsers(filters?: SelectOptions) {
    return this.adapter.select('admin_profiles', filters);
  }

  async createUser(userData: any) {
    return this.adapter.insert('admin_profiles', userData);
  }

  async getAgents(customerId: string) {
    return this.adapter.select('agents', {
      where: [{ column: 'customer_id', operator: '=', value: customerId }]
    });
  }

  async getAuditLogs(customerId: string, limit = 100) {
    return this.adapter.select('audit_logs', {
      where: [{ column: 'customer_id', operator: '=', value: customerId }],
      orderBy: [{ column: 'created_at', ascending: false }],
      limit
    });
  }

  // Add more domain-specific methods as needed
}

// Global database service instance
export const db = new DatabaseService(new SupabaseAdapter());