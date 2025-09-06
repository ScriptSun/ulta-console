import { supabase } from "@/integrations/supabase/client";

// Types for our API wrapper
interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

interface FilterObject {
  [key: string]: any;
}

interface UpdateData {
  [key: string]: any;
}

interface InsertData {
  [key: string]: any;
}

class DatabaseAPI {
  private async handleError(error: any): Promise<{ success: false; error: string }> {
    console.error('Database operation failed:', error);
    
    // Handle different types of errors
    if (error?.message) {
      return { success: false, error: error.message };
    }
    
    if (typeof error === 'string') {
      return { success: false, error };
    }
    
    return { success: false, error: 'An unknown database error occurred' };
  }

  private async checkAuth(): Promise<boolean> {
    const { data: { session } } = await supabase.auth.getSession();
    return !!session;
  }

  private applyFilters(query: any, filters?: FilterObject) {
    if (!filters || typeof filters !== 'object') {
      return query;
    }

    Object.entries(filters).forEach(([key, value]) => {
      if (value === null) {
        query = query.is(key, null);
      } else if (Array.isArray(value)) {
        query = query.in(key, value);
      } else if (typeof value === 'object' && value !== null) {
        // Handle complex filters like { gte: 10 }, { ilike: '%search%' }
        Object.entries(value).forEach(([operator, operatorValue]) => {
          switch (operator) {
            case 'eq':
              query = query.eq(key, operatorValue);
              break;
            case 'neq':
              query = query.neq(key, operatorValue);
              break;
            case 'gt':
              query = query.gt(key, operatorValue);
              break;
            case 'gte':
              query = query.gte(key, operatorValue);
              break;
            case 'lt':
              query = query.lt(key, operatorValue);
              break;
            case 'lte':
              query = query.lte(key, operatorValue);
              break;
            case 'like':
              query = query.like(key, operatorValue);
              break;
            case 'ilike':
              query = query.ilike(key, operatorValue);
              break;
            case 'in':
              query = query.in(key, operatorValue);
              break;
            default:
              query = query.eq(key, operatorValue);
          }
        });
      } else {
        query = query.eq(key, value);
      }
    });

    return query;
  }

  /**
   * Select data from a table with optional columns and filters
   * @param table - Table name
   * @param columns - Columns to select (default: '*')
   * @param filters - Filter conditions
   * @returns Promise with standardized response format
   * 
   * @example
   * // Basic select
   * const users = await api.select('users');
   * 
   * // Select specific columns
   * const users = await api.select('users', 'id, name, email');
   * 
   * // Select with filters
   * const activeUsers = await api.select('users', '*', { active: true });
   * 
   * // Complex filters
   * const users = await api.select('users', '*', { 
   *   age: { gte: 18 }, 
   *   name: { ilike: '%john%' } 
   * });
   */
  async select<T = any>(
    table: string, 
    columns: string = '*', 
    filters?: FilterObject
  ): Promise<ApiResponse<T[]>> {
    try {
      let query = (supabase as any).from(table).select(columns);
      query = this.applyFilters(query, filters);
      
      const { data, error } = await query;
      
      if (error) {
        return this.handleError(error);
      }
      
      return {
        success: true,
        data: data || []
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Select a single row from a table (alias for selectOne)
   * @param table - Table name
   * @param columns - Columns to select (default: '*')
   * @param filters - Filter conditions
   * @returns Promise with standardized response format
   */
  async selectSingle<T = any>(
    table: string, 
    columns: string = '*', 
    filters?: FilterObject
  ): Promise<ApiResponse<T | null>> {
    return this.selectOne<T>(table, columns, filters);
  }

  /**
   * Select a single row from a table
   * @param table - Table name
   * @param columns - Columns to select (default: '*')
   * @param filters - Filter conditions
   * @returns Promise with standardized response format
   */
  async selectOne<T = any>(
    table: string, 
    columns: string = '*', 
    filters?: FilterObject
  ): Promise<ApiResponse<T | null>> {
    try {
      let query = (supabase as any).from(table).select(columns);
      query = this.applyFilters(query, filters);
      
      const { data, error } = await query.maybeSingle();
      
      if (error) {
        return this.handleError(error);
      }
      
      return {
        success: true,
        data: data || null
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Insert data into a table
   * @param table - Table name
   * @param data - Data to insert
   * @returns Promise with standardized response format
   * 
   * @example
   * const newUser = await api.insert('users', { 
   *   name: 'John Doe', 
   *   email: 'john@example.com' 
   * });
   */
  async insert<T = any>(
    table: string, 
    data: InsertData | InsertData[]
  ): Promise<ApiResponse<T>> {
    try {
      const { data: result, error } = await (supabase as any)
        .from(table)
        .insert(data)
        .select()
        .maybeSingle();
      
      if (error) {
        return this.handleError(error);
      }
      
      return {
        success: true,
        data: result
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Insert multiple rows and return all inserted data
   * @param table - Table name
   * @param data - Array of data to insert
   * @returns Promise with standardized response format
   */
  async insertMany<T = any>(
    table: string, 
    data: InsertData[]
  ): Promise<ApiResponse<T[]>> {
    try {
      const { data: result, error } = await (supabase as any)
        .from(table)
        .insert(data)
        .select();
      
      if (error) {
        return this.handleError(error);
      }
      
      return {
        success: true,
        data: result || []
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Update data in a table
   * @param table - Table name
   * @param filters - Filter conditions for rows to update
   * @param data - Data to update
   * @returns Promise with standardized response format
   * 
   * @example
   * const updated = await api.update('users', { id: 1 }, { name: 'Jane Doe' });
   */
  async update<T = any>(
    table: string, 
    filters: FilterObject, 
    data: UpdateData
  ): Promise<ApiResponse<T[]>> {
    try {
      let query = (supabase as any).from(table).update(data);
      query = this.applyFilters(query, filters);
      
      const { data: result, error } = await query.select();
      
      if (error) {
        return this.handleError(error);
      }
      
      return {
        success: true,
        data: result || []
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Delete data from a table
   * @param table - Table name
   * @param filters - Filter conditions for rows to delete
   * @returns Promise with standardized response format
   * 
   * @example
   * const deleted = await api.delete('users', { id: 1 });
   */
  async delete<T = any>(
    table: string, 
    filters: FilterObject
  ): Promise<ApiResponse<T[]>> {
    try {
      let query = (supabase as any).from(table).delete();
      query = this.applyFilters(query, filters);
      
      const { data: result, error } = await query.select();
      
      if (error) {
        return this.handleError(error);
      }
      
      return {
        success: true,
        data: result || []
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Upsert (insert or update) data in a table
   * @param table - Table name
   * @param data - Data to upsert
   * @returns Promise with standardized response format
   * 
   * @example
   * const user = await api.upsert('users', { 
   *   id: 1,
   *   name: 'John Doe', 
   *   email: 'john@example.com' 
   * });
   */
  async upsert<T = any>(
    table: string, 
    data: InsertData | InsertData[]
  ): Promise<ApiResponse<T>> {
    try {
      const { data: result, error } = await (supabase as any)
        .from(table)
        .upsert(data)
        .select()
        .maybeSingle();
      
      if (error) {
        return this.handleError(error);
      }
      
      return {
        success: true,
        data: result
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Complex query with ordering, limits, and other options
   * @param table - Table name
   * @param options - Query options including select, filters, orderBy, limit, etc.
   * @returns Promise with standardized response format
   */
  async query<T = any>(
    table: string,
    options: {
      select?: string;
      filters?: FilterObject;
      orderBy?: { column: string; ascending?: boolean };
      limit?: number;
      offset?: number;
      single?: boolean;
    }
  ): Promise<ApiResponse<T[] | T>> {
    try {
      let query = (supabase as any).from(table).select(options.select || '*');
      
      // Apply filters
      if (options.filters) {
        query = this.applyFilters(query, options.filters);
      }
      
      // Apply ordering
      if (options.orderBy) {
        query = query.order(options.orderBy.column, { 
          ascending: options.orderBy.ascending ?? true 
        });
      }
      
      // Apply limit
      if (options.limit) {
        query = query.limit(options.limit);
      }
      
      // Apply offset
      if (options.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
      }
      
      // Execute query
      const { data, error } = options.single ? 
        await query.maybeSingle() : 
        await query;
      
      if (error) {
        return this.handleError(error);
      }
      
      return { 
        success: true, 
        data: data as T[] | T 
      };
    } catch (err) {
      return this.handleError(err);
    }
  }

  /**
   * Count rows in a table with optional filters
   * @param table - Table name
   * @param filters - Filter conditions
   * @returns Promise with count result
   */
  async count(
    table: string, 
    filters?: FilterObject
  ): Promise<ApiResponse<number>> {
    try {
      let query = (supabase as any).from(table).select('*', { count: 'exact', head: true });
      query = this.applyFilters(query, filters);
      
      const { count, error } = await query;
      
      if (error) {
        return this.handleError(error);
      }
      
      return {
        success: true,
        data: count || 0
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Execute a stored procedure/RPC function
   * @param functionName - Name of the function
   * @param params - Parameters to pass to the function
   * @returns Promise with standardized response format
   */
  async rpc<T = any>(
    functionName: string, 
    params?: Record<string, any>
  ): Promise<ApiResponse<T>> {
    try {
      const { data, error } = await supabase.rpc(functionName as any, params);
      
      if (error) {
        return this.handleError(error);
      }
      
      return {
        success: true,
        data
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Get current authenticated user
   * @returns Promise with user data or null
   */
  async getCurrentUser(): Promise<ApiResponse<any>> {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error) {
        return this.handleError(error);
      }
      
      return {
        success: true,
        data: user
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Check if user is authenticated
   * @returns Promise with authentication status
   */
  async isAuthenticated(): Promise<ApiResponse<boolean>> {
    try {
      const isAuth = await this.checkAuth();
      return {
        success: true,
        data: isAuth
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Sign in with email and password
   * @param email - User's email
   * @param password - User's password
   * @returns Promise with authentication result
   */
  async signIn(email: string, password: string): Promise<ApiResponse<any>> {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) {
        return this.handleError(error);
      }
      
      return {
        success: true,
        data: data.user
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Sign up with email and password
   * @param email - User's email
   * @param password - User's password
   * @returns Promise with authentication result
   */
  async signUp(email: string, password: string): Promise<ApiResponse<any>> {
    try {
      const redirectUrl = `${window.location.origin}/`;
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl
        }
      });
      
      if (error) {
        return this.handleError(error);
      }
      
      return {
        success: true,
        data: data.user
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Sign out current user
   * @returns Promise with sign out result
   */
  async signOut(): Promise<ApiResponse<void>> {
    try {
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        return this.handleError(error);
      }
      
      return {
        success: true
      };
    } catch (error) {
      return this.handleError(error);
    }
  }
}

// Export a singleton instance
export const api = new DatabaseAPI();

// Export types for use in other files
export type { ApiResponse, FilterObject, UpdateData, InsertData };