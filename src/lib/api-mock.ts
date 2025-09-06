// Mock/LocalStorage Implementation - For testing and offline development
import { ApiResponse, FilterObject, UpdateData, InsertData } from './api';

interface MockTable {
  [key: string]: any[];
}

class MockDatabaseAPI {
  private storage: MockTable = {};
  private currentUser: any = null;

  constructor() {
    this.loadFromStorage();
    this.initializeDefaultData();
  }

  private loadFromStorage(): void {
    const stored = localStorage.getItem('mock_database');
    if (stored) {
      try {
        this.storage = JSON.parse(stored);
      } catch (error) {
        console.warn('Failed to load mock database from localStorage');
      }
    }
  }

  private saveToStorage(): void {
    localStorage.setItem('mock_database', JSON.stringify(this.storage));
  }

  private initializeDefaultData(): void {
    // Initialize with some default tables and data
    if (!this.storage.users) {
      this.storage.users = [
        { id: 1, email: 'admin@example.com', name: 'Admin User', created_at: new Date().toISOString() },
        { id: 2, email: 'user@example.com', name: 'Regular User', created_at: new Date().toISOString() }
      ];
    }
    
    if (!this.storage.auth_users) {
      this.storage.auth_users = [
        { id: 1, email: 'admin@example.com', password: 'password123' },
        { id: 2, email: 'user@example.com', password: 'password123' }
      ];
    }
    
    this.saveToStorage();
  }

  private generateId(): number {
    return Date.now() + Math.floor(Math.random() * 1000);
  }

  private async handleError(error: any): Promise<{ success: false; error: string }> {
    console.error('Mock API Error:', error);
    return { 
      success: false, 
      error: error.message || 'Mock database error occurred' 
    };
  }

  private async checkAuth(): Promise<boolean> {
    return !!this.currentUser;
  }

  private matchesFilter(record: any, filters?: FilterObject): boolean {
    if (!filters) return true;
    
    return Object.entries(filters).every(([key, value]) => {
      if (value === undefined || value === null) return true;
      
      const recordValue = record[key];
      
      // Handle array filters (for 'in' operations)
      if (Array.isArray(value)) {
        return value.includes(recordValue);
      }
      
      // Handle object filters (for complex operations)
      if (typeof value === 'object' && !Array.isArray(value)) {
        if (value.eq !== undefined) return recordValue === value.eq;
        if (value.neq !== undefined) return recordValue !== value.neq;
        if (value.gt !== undefined) return recordValue > value.gt;
        if (value.gte !== undefined) return recordValue >= value.gte;
        if (value.lt !== undefined) return recordValue < value.lt;
        if (value.lte !== undefined) return recordValue <= value.lte;
        if (value.like !== undefined) return String(recordValue).includes(String(value.like));
        if (value.ilike !== undefined) return String(recordValue).toLowerCase().includes(String(value.ilike).toLowerCase());
      }
      
      return recordValue === value;
    });
  }

  private selectColumns(record: any, columns: string): any {
    if (columns === '*') return record;
    
    const columnList = columns.split(',').map(col => col.trim());
    const result: any = {};
    
    columnList.forEach(col => {
      if (record.hasOwnProperty(col)) {
        result[col] = record[col];
      }
    });
    
    return result;
  }

  async select<T = any>(
    table: string, 
    columns: string = '*', 
    filters?: FilterObject
  ): Promise<ApiResponse<T[]>> {
    try {
      await new Promise(resolve => setTimeout(resolve, 50)); // Simulate network delay
      
      if (!this.storage[table]) {
        this.storage[table] = [];
      }

      const results = this.storage[table]
        .filter(record => this.matchesFilter(record, filters))
        .map(record => this.selectColumns(record, columns));

      return { success: true, data: results };
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
      const result = await this.select<T>(table, columns, filters);
      if (!result.success) return { success: false, error: result.error };
      
      return { success: true, data: result.data[0] || null };
    } catch (error) {
      return this.handleError(error);
    }
  }

  async insert<T = any>(table: string, data: InsertData | InsertData[]): Promise<ApiResponse<T>> {
    try {
      await new Promise(resolve => setTimeout(resolve, 100)); // Simulate network delay
      
      if (!this.storage[table]) {
        this.storage[table] = [];
      }

      const records = Array.isArray(data) ? data : [data];
      const insertedRecords: any[] = [];

      records.forEach(record => {
        const newRecord = {
          ...record,
          id: record.id || this.generateId(),
          created_at: record.created_at || new Date().toISOString(),
          updated_at: record.updated_at || new Date().toISOString()
        };
        
        this.storage[table].push(newRecord);
        insertedRecords.push(newRecord);
      });

      this.saveToStorage();
      
      return { 
        success: true, 
        data: (Array.isArray(data) ? insertedRecords : insertedRecords[0]) as T
      };
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
      await new Promise(resolve => setTimeout(resolve, 100)); // Simulate network delay
      
      if (!this.storage[table]) {
        return { success: false, error: `Table ${table} does not exist` };
      }

      const updatedRecords: any[] = [];
      
      this.storage[table] = this.storage[table].map(record => {
        if (this.matchesFilter(record, filters)) {
          const updatedRecord = {
            ...record,
            ...data,
            updated_at: new Date().toISOString()
          };
          updatedRecords.push(updatedRecord);
          return updatedRecord;
        }
        return record;
      });

      this.saveToStorage();
      
      return { success: true, data: updatedRecords };
    } catch (error) {
      return this.handleError(error);
    }
  }

  async delete<T = any>(table: string, filters: FilterObject): Promise<ApiResponse<T[]>> {
    try {
      await new Promise(resolve => setTimeout(resolve, 100)); // Simulate network delay
      
      if (!this.storage[table]) {
        return { success: false, error: `Table ${table} does not exist` };
      }

      const deletedRecords: any[] = [];
      
      this.storage[table] = this.storage[table].filter(record => {
        if (this.matchesFilter(record, filters)) {
          deletedRecords.push(record);
          return false; // Remove from array
        }
        return true; // Keep in array
      });

      this.saveToStorage();
      
      return { success: true, data: deletedRecords };
    } catch (error) {
      return this.handleError(error);
    }
  }

  async count(table: string, filters?: FilterObject): Promise<ApiResponse<number>> {
    try {
      if (!this.storage[table]) {
        return { success: true, data: 0 };
      }

      const count = this.storage[table]
        .filter(record => this.matchesFilter(record, filters))
        .length;

      return { success: true, data: count };
    } catch (error) {
      return this.handleError(error);
    }
  }

  async rpc<T = any>(functionName: string, params?: Record<string, any>): Promise<ApiResponse<T>> {
    try {
      await new Promise(resolve => setTimeout(resolve, 100)); // Simulate network delay
      
      // Mock RPC functions
      switch (functionName) {
        case 'get_user_profile':
          return { success: true, data: this.currentUser };
        
        case 'update_user_profile':
          if (this.currentUser && params) {
            this.currentUser = { ...this.currentUser, ...params };
            return { success: true, data: this.currentUser };
          }
          return { success: false, error: 'Not authenticated' };
        
        default:
          console.warn(`Mock RPC function '${functionName}' not implemented`);
          return { success: true, data: null };
      }
    } catch (error) {
      return this.handleError(error);
    }
  }

  // Authentication methods
  async signIn(email: string, password: string): Promise<ApiResponse<any>> {
    try {
      await new Promise(resolve => setTimeout(resolve, 200)); // Simulate network delay
      
      const authUser = this.storage.auth_users?.find(
        (user: any) => user.email === email && user.password === password
      );

      if (!authUser) {
        return { success: false, error: 'Invalid email or password' };
      }

      // Find corresponding user profile
      const userProfile = this.storage.users?.find(
        (user: any) => user.email === email
      );

      this.currentUser = userProfile || { id: authUser.id, email: authUser.email };
      localStorage.setItem('mock_current_user', JSON.stringify(this.currentUser));
      
      return { success: true, data: this.currentUser };
    } catch (error) {
      return this.handleError(error);
    }
  }

  async signUp(email: string, password: string): Promise<ApiResponse<any>> {
    try {
      await new Promise(resolve => setTimeout(resolve, 200)); // Simulate network delay
      
      // Check if user already exists
      const existingUser = this.storage.auth_users?.find(
        (user: any) => user.email === email
      );

      if (existingUser) {
        return { success: false, error: 'User already exists' };
      }

      const newUserId = this.generateId();
      const newAuthUser = { id: newUserId, email, password };
      const newUserProfile = { 
        id: newUserId, 
        email, 
        name: email.split('@')[0], 
        created_at: new Date().toISOString() 
      };

      this.storage.auth_users.push(newAuthUser);
      this.storage.users.push(newUserProfile);
      this.saveToStorage();

      return { success: true, data: newUserProfile };
    } catch (error) {
      return this.handleError(error);
    }
  }

  async signOut(): Promise<ApiResponse<void>> {
    this.currentUser = null;
    localStorage.removeItem('mock_current_user');
    return { success: true };
  }

  async getCurrentUser(): Promise<ApiResponse<any>> {
    if (!this.currentUser) {
      // Try to restore from localStorage
      const stored = localStorage.getItem('mock_current_user');
      if (stored) {
        try {
          this.currentUser = JSON.parse(stored);
        } catch {
          // Ignore parse errors
        }
      }
    }

    if (!this.currentUser) {
      return { success: false, error: 'Not authenticated' };
    }

    return { success: true, data: this.currentUser };
  }

  async isAuthenticated(): Promise<ApiResponse<boolean>> {
    const userResult = await this.getCurrentUser();
    return { success: true, data: userResult.success };
  }

  // Additional utility methods for testing
  clearDatabase(): void {
    this.storage = {};
    localStorage.removeItem('mock_database');
    this.initializeDefaultData();
  }

  exportDatabase(): string {
    return JSON.stringify(this.storage, null, 2);
  }

  importDatabase(data: string): void {
    try {
      this.storage = JSON.parse(data);
      this.saveToStorage();
    } catch (error) {
      console.error('Failed to import database:', error);
    }
  }
}

export const api = new MockDatabaseAPI();