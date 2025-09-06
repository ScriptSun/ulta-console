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

// Query builder class for chaining
class QueryBuilder {
  private table: string;
  private query: any;
  private apiWrapper: APIWrapper;

  constructor(table: string, apiWrapper: APIWrapper) {
    this.table = table;
    this.apiWrapper = apiWrapper;
    this.query = (supabase as any).from(table);
  }

  select(columns: string = '*') {
    this.query = this.query.select(columns);
    return this;
  }

  eq(column: string, value: any) {
    this.query = this.query.eq(column, value);
    return this;
  }

  neq(column: string, value: any) {
    this.query = this.query.neq(column, value);
    return this;
  }

  gt(column: string, value: any) {
    this.query = this.query.gt(column, value);
    return this;
  }

  gte(column: string, value: any) {
    this.query = this.query.gte(column, value);
    return this;
  }

  lt(column: string, value: any) {
    this.query = this.query.lt(column, value);
    return this;
  }

  lte(column: string, value: any) {
    this.query = this.query.lte(column, value);
    return this;
  }

  like(column: string, pattern: string) {
    this.query = this.query.like(column, pattern);
    return this;
  }

  ilike(column: string, pattern: string) {
    this.query = this.query.ilike(column, pattern);
    return this;
  }

  in(column: string, values: any[]) {
    this.query = this.query.in(column, values);
    return this;
  }

  is(column: string, value: any) {
    this.query = this.query.is(column, value);
    return this;
  }

  order(column: string, options?: { ascending?: boolean }) {
    this.query = this.query.order(column, options);
    return this;
  }

  limit(count: number) {
    this.query = this.query.limit(count);
    return this;
  }

  range(from: number, to: number) {
    this.query = this.query.range(from, to);
    return this;
  }

  single() {
    this.query = this.query.single();
    return this;
  }

  maybeSingle() {
    this.query = this.query.maybeSingle();
    return this;
  }

  insert(data: InsertData | InsertData[]) {
    this.query = this.query.insert(data);
    return this;
  }

  update(data: UpdateData) {
    this.query = this.query.update(data);
    return this;
  }

  upsert(data: InsertData | InsertData[], options?: { onConflict?: string }) {
    this.query = this.query.upsert(data, options);
    return this;
  }

  count(): QueryBuilder {
    this.query = this.query.select('*', { count: 'exact', head: true });
    return this;
  }

  delete() {
    this.query = this.query.delete();
    return this;
  }

  // Execute the query and return standardized response
  async execute() {
    try {
      if (!(await this.apiWrapper.isAuthenticatedInternal())) {
        return { success: false, error: 'Authentication required' };
      }

      const { data, error } = await this.query;
      
      if (error) {
        return this.apiWrapper.handleErrorInternal(error);
      }
      
      return { success: true, data };
    } catch (error) {
      return this.apiWrapper.handleErrorInternal(error);
    }
  }

  // Make QueryBuilder thenable/awaitable
  then<TResult1 = any, TResult2 = never>(
    onfulfilled?: ((value: any) => TResult1 | PromiseLike<TResult1>) | undefined | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null
  ): Promise<TResult1 | TResult2> {
    return this.execute().then(onfulfilled, onrejected);
  }

  catch<TResult = never>(
    onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null
  ): Promise<any | TResult> {
    return this.execute().catch(onrejected);
  }

  finally(onfinally?: (() => void) | undefined | null): Promise<any> {
    return this.execute().finally(onfinally);
  }
}

class APIWrapper {
  private supabase = supabase;
  /**
   * Handle and format errors consistently (internal version for QueryBuilder)
   */
  handleErrorInternal(error: any): { success: false; error: string } {
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
   * Handle and format errors consistently
   */
  private handleError(error: any): { success: false; error: string } {
    return this.handleErrorInternal(error);
  }

  /**
   * Check if user is authenticated (internal version for QueryBuilder)
   */
  async isAuthenticatedInternal(): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    return !!user;
  }

  /**
   * Check if user is authenticated
   */
  private async checkAuth(): Promise<boolean> {
    return this.isAuthenticatedInternal();
  }

  /**
   * Create a query builder for Supabase-like chaining
   */
  from(table: string): QueryBuilder {
    return new QueryBuilder(table, this);
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
  async getCurrentUser(): Promise<any> {
    const { data: { user } } = await this.supabase.auth.getUser();
    return user;
  }

  /**
   * Sign out current user
   */
  async signOut(): Promise<ApiResponse<void>> {
    try {
      const { error } = await this.supabase.auth.signOut();
      
      if (error) {
        return this.handleError(error);
      }
      
      return { success: true };
    } catch (error) {
      return this.handleError(error);
    }
  }

  async getCurrentSession() {
    const { data: { session } } = await this.supabase.auth.getSession();
    return session;
  }

  async invokeFunction(functionName: string, params?: any): Promise<{ data?: any; error?: any }> {
    const { data, error } = await this.supabase.functions.invoke(functionName, {
      body: params
    });
    return { data, error };
  }

  async signInWithOAuth(provider: string, options?: any): Promise<{ data?: any; error?: any }> {
    const { data, error } = await this.supabase.auth.signInWithOAuth({
      provider: provider as any,
      options
    });
    return { data, error };
  }
}

// Export a singleton instance
export const api = new APIWrapper();

// Export types for convenience
export { type FilterConditions, type UpdateData, type InsertData };