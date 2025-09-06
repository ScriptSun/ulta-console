import { supabase } from "@/integrations/supabase/client";

// Standard API response format
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

// Type for filter conditions
type FilterConditions = {
  [key: string]: any;
}

// Type for update data  
type UpdateData = {
  [key: string]: any;
}

// Type for insert data
type InsertData = {
  [key: string]: any;
}

class APIWrapper {
  /**
   * Handle and format errors consistently
   */
  private handleError(error: any): { success: false; error: string } {
    console.error('API Error:', error);
    
    if (error?.message) {
      return { success: false, error: error.message };
    }
    
    if (typeof error === 'string') {
      return { success: false, error };
    }
    
    return { success: false, error: 'An unexpected error occurred' };
  }

  /**
   * Check if user is authenticated
   */
  private async checkAuth(): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    return !!user;
  }

  /**
   * Apply filter conditions to a Supabase query
   */
  private applyFilters(query: any, filters?: FilterConditions) {
    if (!filters) return query;
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value === null) {
        query = query.is(key, null);
      } else if (Array.isArray(value)) {
        query = query.in(key, value);
      } else if (typeof value === 'object' && value !== null) {
        // Handle range queries like { gte: 10, lt: 100 }
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
          }
        });
      } else {
        query = query.eq(key, value);
      }
    });
    
    return query;
  }

  /**
   * Select data from a table
   */
  async select<T = any>(
    table: string, 
    columns: string = '*', 
    filters?: FilterConditions
  ): Promise<ApiResponse<T[]>> {
    try {
      if (!(await this.checkAuth())) {
        return { success: false, error: 'Authentication required' };
      }

      let query = (supabase as any).from(table).select(columns);
      query = this.applyFilters(query, filters);
      
      const { data, error } = await query;
      
      if (error) {
        return this.handleError(error);
      }
      
      return { success: true, data: data as T[] };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Insert data into a table
   */
  async insert<T = any>(
    table: string, 
    data: InsertData | InsertData[]
  ): Promise<ApiResponse<T>> {
    try {
      if (!(await this.checkAuth())) {
        return { success: false, error: 'Authentication required' };
      }

      const { data: result, error } = await (supabase as any)
        .from(table)
        .insert(data as any)
        .select();
      
      if (error) {
        return this.handleError(error);
      }
      
      return { success: true, data: Array.isArray(data) ? result : result?.[0] };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Update data in a table
   */
  async update<T = any>(
    table: string, 
    filters: FilterConditions, 
    data: UpdateData
  ): Promise<ApiResponse<T[]>> {
    try {
      if (!(await this.checkAuth())) {
        return { success: false, error: 'Authentication required' };
      }

      let query = (supabase as any).from(table).update(data as any);
      query = this.applyFilters(query, filters);
      
      const { data: result, error } = await query.select();
      
      if (error) {
        return this.handleError(error);
      }
      
      return { success: true, data: result as T[] };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Delete data from a table
   */
  async delete<T = any>(
    table: string, 
    filters: FilterConditions
  ): Promise<ApiResponse<T[]>> {
    try {
      if (!(await this.checkAuth())) {
        return { success: false, error: 'Authentication required' };
      }

      if (!filters || Object.keys(filters).length === 0) {
        return { success: false, error: 'Delete filters are required for safety' };
      }

      let query = (supabase as any).from(table).delete();
      query = this.applyFilters(query, filters);
      
      const { data: result, error } = await query.select();
      
      if (error) {
        return this.handleError(error);
      }
      
      return { success: true, data: result as T[] };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Get a single record (convenience method)
   */
  async selectOne<T = any>(
    table: string, 
    columns: string = '*', 
    filters?: FilterConditions
  ): Promise<ApiResponse<T | null>> {
    try {
      const result = await this.select<T>(table, columns, filters);
      
      if (!result.success) {
        return { success: false, error: result.error };
      }
      
      const data = result.data?.[0] || null;
      return { success: true, data };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Count records in a table
   */
  async count(
    table: string, 
    filters?: FilterConditions
  ): Promise<ApiResponse<number>> {
    try {
      if (!(await this.checkAuth())) {
        return { success: false, error: 'Authentication required' };
      }

      let query = (supabase as any).from(table).select('*', { count: 'exact', head: true });
      query = this.applyFilters(query, filters);
      
      const { count, error } = await query;
      
      if (error) {
        return this.handleError(error);
      }
      
      return { success: true, data: count || 0 };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Execute a stored procedure/function
   */
  async rpc<T = any>(
    functionName: string, 
    params?: Record<string, any>
  ): Promise<ApiResponse<T>> {
    try {
      if (!(await this.checkAuth())) {
        return { success: false, error: 'Authentication required' };
      }

      const { data, error } = await (supabase as any).rpc(functionName, params || {});
      
      if (error) {
        return this.handleError(error);
      }
      
      return { success: true, data: data as T };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Get current authenticated user
   */
  async getCurrentUser(): Promise<ApiResponse<any>> {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error) {
        return this.handleError(error);
      }
      
      return { success: true, data: user };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Sign out current user
   */
  async signOut(): Promise<ApiResponse<void>> {
    try {
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        return this.handleError(error);
      }
      
      return { success: true };
    } catch (error) {
      return this.handleError(error);
    }
  }
}

// Export a singleton instance
export const api = new APIWrapper();

// Export types for convenience
export { type FilterConditions, type UpdateData, type InsertData };