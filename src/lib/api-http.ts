// HTTP API Implementation - Replace Supabase with REST API calls
import { ApiResponse, FilterObject, UpdateData, InsertData } from './api';

const API_BASE_URL = process.env.VITE_API_BASE_URL || 'https://api.example.com';

class HttpDatabaseAPI {
  private authToken: string | null = null;

  private async handleError(error: any): Promise<{ success: false; error: string }> {
    console.error('API Error:', error);
    if (error.status === 401) {
      this.authToken = null;
      localStorage.removeItem('auth_token');
    }
    return { 
      success: false, 
      error: error.message || 'An unexpected error occurred' 
    };
  }

  private async checkAuth(): Promise<boolean> {
    this.authToken = localStorage.getItem('auth_token');
    return !!this.authToken;
  }

  private buildQueryParams(filters?: FilterObject): string {
    if (!filters) return '';
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, String(value));
      }
    });
    return params.toString() ? `?${params.toString()}` : '';
  }

  private async apiCall(endpoint: string, options: RequestInit = {}): Promise<any> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.authToken) {
      headers.Authorization = `Bearer ${this.authToken}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  async select<T = any>(
    table: string, 
    columns: string = '*', 
    filters?: FilterObject
  ): Promise<ApiResponse<T[]>> {
    try {
      const queryParams = this.buildQueryParams(filters);
      const columnsParam = columns !== '*' ? `&select=${columns}` : '';
      const data = await this.apiCall(`/${table}${queryParams}${columnsParam}`);
      return { success: true, data };
    } catch (error) {
      return this.handleError(error);
    }
  }

  async selectOne<T = any>(
    table: string, 
    columns: string = '*', 
    filters?: FilterObject
  ): Promise<ApiResponse<T | null>> {
    try {
      const queryParams = this.buildQueryParams({ ...filters, limit: 1 });
      const columnsParam = columns !== '*' ? `&select=${columns}` : '';
      const data = await this.apiCall(`/${table}${queryParams}${columnsParam}`);
      return { success: true, data: data[0] || null };
    } catch (error) {
      return this.handleError(error);
    }
  }

  async insert<T = any>(table: string, data: InsertData | InsertData[]): Promise<ApiResponse<T>> {
    try {
      const result = await this.apiCall(`/${table}`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
      return { success: true, data: result };
    } catch (error) {
      return this.handleError(error);
    }
  }

  async update<T = any>(
    table: string, 
    filters: FilterObject, 
    data: UpdateData
  ): Promise<ApiResponse<T[]>> {
    try {
      const queryParams = this.buildQueryParams(filters);
      const result = await this.apiCall(`/${table}${queryParams}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
      return { success: true, data: result };
    } catch (error) {
      return this.handleError(error);
    }
  }

  async delete<T = any>(table: string, filters: FilterObject): Promise<ApiResponse<T[]>> {
    try {
      const queryParams = this.buildQueryParams(filters);
      const result = await this.apiCall(`/${table}${queryParams}`, {
        method: 'DELETE',
      });
      return { success: true, data: result };
    } catch (error) {
      return this.handleError(error);
    }
  }

  async count(table: string, filters?: FilterObject): Promise<ApiResponse<number>> {
    try {
      const queryParams = this.buildQueryParams(filters);
      const result = await this.apiCall(`/${table}/count${queryParams}`);
      return { success: true, data: result.count };
    } catch (error) {
      return this.handleError(error);
    }
  }

  async rpc<T = any>(functionName: string, params?: Record<string, any>): Promise<ApiResponse<T>> {
    try {
      const result = await this.apiCall(`/rpc/${functionName}`, {
        method: 'POST',
        body: JSON.stringify(params || {}),
      });
      return { success: true, data: result };
    } catch (error) {
      return this.handleError(error);
    }
  }

  // Authentication methods
  async signIn(email: string, password: string): Promise<ApiResponse<any>> {
    try {
      const result = await this.apiCall('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      
      this.authToken = result.token;
      localStorage.setItem('auth_token', result.token);
      return { success: true, data: result.user };
    } catch (error) {
      return this.handleError(error);
    }
  }

  async signUp(email: string, password: string): Promise<ApiResponse<any>> {
    try {
      const result = await this.apiCall('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      return { success: true, data: result };
    } catch (error) {
      return this.handleError(error);
    }
  }

  async signOut(): Promise<ApiResponse<void>> {
    try {
      await this.apiCall('/auth/logout', { method: 'POST' });
      this.authToken = null;
      localStorage.removeItem('auth_token');
      return { success: true };
    } catch (error) {
      return this.handleError(error);
    }
  }

  async getCurrentUser(): Promise<ApiResponse<any>> {
    try {
      if (!await this.checkAuth()) {
        return { success: false, error: 'Not authenticated' };
      }
      const user = await this.apiCall('/auth/me');
      return { success: true, data: user };
    } catch (error) {
      return this.handleError(error);
    }
  }

  async isAuthenticated(): Promise<ApiResponse<boolean>> {
    const isAuth = await this.checkAuth();
    return { success: true, data: isAuth };
  }
}

export const api = new HttpDatabaseAPI();