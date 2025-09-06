import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  count?: number;
}

export class EdgeFunctionApiWrapper {
  private supabase: any;

  constructor() {
    this.supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
  }

  // Get the raw Supabase client for special operations (auth, storage, etc.)
  getClient() {
    return this.supabase;
  }

  // SELECT operations
  async select<T = any>(
    table: string,
    columns = '*',
    options: {
      eq?: Record<string, any>;
      neq?: Record<string, any>;
      gt?: Record<string, any>;
      gte?: Record<string, any>;
      lt?: Record<string, any>;
      lte?: Record<string, any>;
      like?: Record<string, any>;
      ilike?: Record<string, any>;
      in?: Record<string, any[]>;
      order?: { column: string; ascending?: boolean };
      limit?: number;
      offset?: number;
      single?: boolean;
      maybeSingle?: boolean;
    } = {}
  ): Promise<ApiResponse<T>> {
    try {
      let query = this.supabase.from(table).select(columns, { count: 'exact' });

      // Apply filters
      if (options.eq) {
        Object.entries(options.eq).forEach(([key, value]) => {
          query = query.eq(key, value);
        });
      }

      if (options.neq) {
        Object.entries(options.neq).forEach(([key, value]) => {
          query = query.neq(key, value);
        });
      }

      if (options.gt) {
        Object.entries(options.gt).forEach(([key, value]) => {
          query = query.gt(key, value);
        });
      }

      if (options.gte) {
        Object.entries(options.gte).forEach(([key, value]) => {
          query = query.gte(key, value);
        });
      }

      if (options.lt) {
        Object.entries(options.lt).forEach(([key, value]) => {
          query = query.lt(key, value);
        });
      }

      if (options.lte) {
        Object.entries(options.lte).forEach(([key, value]) => {
          query = query.lte(key, value);
        });
      }

      if (options.like) {
        Object.entries(options.like).forEach(([key, value]) => {
          query = query.like(key, value);
        });
      }

      if (options.ilike) {
        Object.entries(options.ilike).forEach(([key, value]) => {
          query = query.ilike(key, value);
        });
      }

      if (options.in) {
        Object.entries(options.in).forEach(([key, values]) => {
          query = query.in(key, values);
        });
      }

      // Apply ordering
      if (options.order) {
        query = query.order(options.order.column, { ascending: options.order.ascending ?? true });
      }

      // Apply limit and offset
      if (options.limit) {
        query = query.limit(options.limit);
      }

      if (options.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 1000) - 1);
      }

      // Execute query
      let result;
      if (options.single) {
        result = await query.single();
      } else if (options.maybeSingle) {
        result = await query.maybeSingle();
      } else {
        result = await query;
      }

      const { data, error, count } = result;

      if (error) {
        console.error(`Database error in select from ${table}:`, error);
        return { success: false, error: error.message };
      }

      return { success: true, data, count };
    } catch (err) {
      console.error(`Unexpected error in select from ${table}:`, err);
      return { success: false, error: 'An unexpected error occurred' };
    }
  }

  // INSERT operations
  async insert<T = any>(
    table: string,
    data: any,
    options: {
      select?: string;
      upsert?: boolean;
      onConflict?: string;
    } = {}
  ): Promise<ApiResponse<T>> {
    try {
      let query = this.supabase.from(table).insert(data);

      if (options.upsert) {
        query = query.upsert(data, { onConflict: options.onConflict });
      }

      if (options.select) {
        query = query.select(options.select);
      }

      const { data: result, error } = await query;

      if (error) {
        console.error(`Database error in insert to ${table}:`, error);
        return { success: false, error: error.message };
      }

      return { success: true, data: result };
    } catch (err) {
      console.error(`Unexpected error in insert to ${table}:`, err);
      return { success: false, error: 'An unexpected error occurred' };
    }
  }

  // UPDATE operations
  async update<T = any>(
    table: string,
    data: any,
    options: {
      eq?: Record<string, any>;
      neq?: Record<string, any>;
      gt?: Record<string, any>;
      gte?: Record<string, any>;
      lt?: Record<string, any>;
      lte?: Record<string, any>;
      in?: Record<string, any[]>;
      select?: string;
    } = {}
  ): Promise<ApiResponse<T>> {
    try {
      let query = this.supabase.from(table).update(data);

      // Apply filters
      if (options.eq) {
        Object.entries(options.eq).forEach(([key, value]) => {
          query = query.eq(key, value);
        });
      }

      if (options.neq) {
        Object.entries(options.neq).forEach(([key, value]) => {
          query = query.neq(key, value);
        });
      }

      if (options.gt) {
        Object.entries(options.gt).forEach(([key, value]) => {
          query = query.gt(key, value);
        });
      }

      if (options.gte) {
        Object.entries(options.gte).forEach(([key, value]) => {
          query = query.gte(key, value);
        });
      }

      if (options.lt) {
        Object.entries(options.lt).forEach(([key, value]) => {
          query = query.lt(key, value);
        });
      }

      if (options.lte) {
        Object.entries(options.lte).forEach(([key, value]) => {
          query = query.lte(key, value);
        });
      }

      if (options.in) {
        Object.entries(options.in).forEach(([key, values]) => {
          query = query.in(key, values);
        });
      }

      if (options.select) {
        query = query.select(options.select);
      }

      const { data: result, error } = await query;

      if (error) {
        console.error(`Database error in update to ${table}:`, error);
        return { success: false, error: error.message };
      }

      return { success: true, data: result };
    } catch (err) {
      console.error(`Unexpected error in update to ${table}:`, err);
      return { success: false, error: 'An unexpected error occurred' };
    }
  }

  // DELETE operations
  async delete<T = any>(
    table: string,
    options: {
      eq?: Record<string, any>;
      neq?: Record<string, any>;
      gt?: Record<string, any>;
      gte?: Record<string, any>;
      lt?: Record<string, any>;
      lte?: Record<string, any>;
      in?: Record<string, any[]>;
      select?: string;
    } = {}
  ): Promise<ApiResponse<T>> {
    try {
      let query = this.supabase.from(table).delete();

      // Apply filters
      if (options.eq) {
        Object.entries(options.eq).forEach(([key, value]) => {
          query = query.eq(key, value);
        });
      }

      if (options.neq) {
        Object.entries(options.neq).forEach(([key, value]) => {
          query = query.neq(key, value);
        });
      }

      if (options.gt) {
        Object.entries(options.gt).forEach(([key, value]) => {
          query = query.gt(key, value);
        });
      }

      if (options.gte) {
        Object.entries(options.gte).forEach(([key, value]) => {
          query = query.gte(key, value);
        });
      }

      if (options.lt) {
        Object.entries(options.lt).forEach(([key, value]) => {
          query = query.lt(key, value);
        });
      }

      if (options.lte) {
        Object.entries(options.lte).forEach(([key, value]) => {
          query = query.lte(key, value);
        });
      }

      if (options.in) {
        Object.entries(options.in).forEach(([key, values]) => {
          query = query.in(key, values);
        });
      }

      if (options.select) {
        query = query.select(options.select);
      }

      const { data: result, error } = await query;

      if (error) {
        console.error(`Database error in delete from ${table}:`, error);
        return { success: false, error: error.message };
      }

      return { success: true, data: result };
    } catch (err) {
      console.error(`Unexpected error in delete from ${table}:`, err);
      return { success: false, error: 'An unexpected error occurred' };
    }
  }

  // RPC (Remote Procedure Call) operations
  async rpc<T = any>(
    functionName: string,
    params: Record<string, any> = {}
  ): Promise<ApiResponse<T>> {
    try {
      const { data, error } = await this.supabase.rpc(functionName, params);

      if (error) {
        console.error(`Database error in RPC ${functionName}:`, error);
        return { success: false, error: error.message };
      }

      return { success: true, data };
    } catch (err) {
      console.error(`Unexpected error in RPC ${functionName}:`, err);
      return { success: false, error: 'An unexpected error occurred' };
    }
  }

  // Upsert operations (convenience method)
  async upsert<T = any>(
    table: string,
    data: any,
    options: {
      onConflict?: string;
      select?: string;
    } = {}
  ): Promise<ApiResponse<T>> {
    return this.insert(table, data, { upsert: true, ...options });
  }
}

// Create and export a singleton instance
export const api = new EdgeFunctionApiWrapper();