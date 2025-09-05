import { Pool, PoolClient } from 'pg';
import { DatabaseAdapter, DatabaseConfig, QueryResult, SelectOptions, WhereCondition } from './databaseAbstraction';

export class PostgreSQLAdapter extends DatabaseAdapter {
  private pool: Pool | null = null;
  private client: PoolClient | null = null;

  async connect(config: DatabaseConfig): Promise<void> {
    try {
      if (config.connectionString) {
        this.pool = new Pool({
          connectionString: config.connectionString,
          ssl: config.config?.ssl ? { rejectUnauthorized: false } : false
        });
      } else {
        this.pool = new Pool(config.config || {});
      }
      
      // Test connection
      this.client = await this.pool.connect();
    } catch (error) {
      throw new Error(`Failed to connect to PostgreSQL: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async disconnect(): Promise<void> {
    try {
      if (this.client) {
        this.client.release();
        this.client = null;
      }
      if (this.pool) {
        await this.pool.end();
        this.pool = null;
      }
    } catch (error) {
      console.error('Error disconnecting from PostgreSQL:', error);
    }
  }

  subscribe(table: string, callback: (payload: any) => void): () => void {
    // PostgreSQL doesn't have built-in real-time subscriptions like Supabase
    // This would require additional setup with LISTEN/NOTIFY or external tools
    console.warn('PostgreSQL adapter: Real-time subscriptions not implemented');
    return () => {}; // Return empty cleanup function
  }

  async select<T>(table: string, options: SelectOptions = {}): Promise<QueryResult<T[]>> {
    if (!this.pool) {
      return { data: null, error: 'Not connected to database' };
    }

    try {
      const columns = options.columns?.join(', ') || '*';
      let sql = `SELECT ${columns} FROM ${table}`;
      const params: any[] = [];
      let paramIndex = 1;

      // Build WHERE clause
      if (options.where && options.where.length > 0) {
        const whereClause = options.where.map(condition => {
          switch (condition.operator) {
            case '=':
              params.push(condition.value);
              return `${condition.column} = $${paramIndex++}`;
            case '!=':
              params.push(condition.value);
              return `${condition.column} != $${paramIndex++}`;
            case '>':
              params.push(condition.value);
              return `${condition.column} > $${paramIndex++}`;
            case '<':
              params.push(condition.value);
              return `${condition.column} < $${paramIndex++}`;
            case '>=':
              params.push(condition.value);
              return `${condition.column} >= $${paramIndex++}`;
            case '<=':
              params.push(condition.value);
              return `${condition.column} <= $${paramIndex++}`;
            case 'IN':
              params.push(condition.value);
              return `${condition.column} = ANY($${paramIndex++})`;
            case 'LIKE':
              params.push(condition.value);
              return `${condition.column} ILIKE $${paramIndex++}`;
            case 'IS NULL':
              return `${condition.column} IS NULL`;
            case 'IS NOT NULL':
              return `${condition.column} IS NOT NULL`;
            default:
              return '';
          }
        }).filter(Boolean);
        
        if (whereClause.length > 0) {
          sql += ` WHERE ${whereClause.join(' AND ')}`;
        }
      }

      // Add ORDER BY
      if (options.orderBy && options.orderBy.length > 0) {
        const orderClause = options.orderBy.map(order => 
          `${order.column} ${order.ascending !== false ? 'ASC' : 'DESC'}`
        );
        sql += ` ORDER BY ${orderClause.join(', ')}`;
      }

      // Add LIMIT and OFFSET
      if (options.limit) {
        sql += ` LIMIT ${options.limit}`;
      }
      if (options.offset) {
        sql += ` OFFSET ${options.offset}`;
      }

      const result = await this.pool.query(sql, params);
      
      return {
        data: result.rows as T[],
        error: null,
        count: result.rowCount || 0
      };
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async insert<T>(table: string, data: Partial<T> | Partial<T>[]): Promise<QueryResult<T>> {
    if (!this.pool) {
      return { data: null, error: 'Not connected to database' };
    }

    try {
      const records = Array.isArray(data) ? data : [data];
      const firstRecord = records[0];
      
      if (!firstRecord || Object.keys(firstRecord).length === 0) {
        return { data: null, error: 'No data provided for insert' };
      }

      const columns = Object.keys(firstRecord);
      const values = records.map((record, recordIndex) => 
        columns.map((_, colIndex) => `$${recordIndex * columns.length + colIndex + 1}`)
      );
      
      const params = records.flatMap(record => 
        columns.map(col => (record as any)[col])
      );

      const sql = `
        INSERT INTO ${table} (${columns.join(', ')}) 
        VALUES ${values.map(v => `(${v.join(', ')})`).join(', ')} 
        RETURNING *
      `;

      const result = await this.pool.query(sql, params);
      
      return {
        data: result.rows[0] as T,
        error: null
      };
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async update<T>(table: string, data: Partial<T>, where: WhereCondition): Promise<QueryResult<T>> {
    if (!this.pool) {
      return { data: null, error: 'Not connected to database' };
    }

    try {
      const updateColumns = Object.keys(data);
      const updateValues = Object.values(data);
      
      const setClause = updateColumns.map((col, index) => 
        `${col} = $${index + 1}`
      ).join(', ');
      
      let whereClause = '';
      const params = [...updateValues];
      
      if (where.operator === '=' && where.value !== undefined) {
        whereClause = `WHERE ${where.column} = $${params.length + 1}`;
        params.push(where.value);
      }

      const sql = `UPDATE ${table} SET ${setClause} ${whereClause} RETURNING *`;
      
      const result = await this.pool.query(sql, params);
      
      return {
        data: result.rows[0] as T,
        error: null
      };
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async delete(table: string, where: WhereCondition): Promise<QueryResult<void>> {
    if (!this.pool) {
      return { data: null, error: 'Not connected to database' };
    }

    try {
      let whereClause = '';
      const params: any[] = [];
      
      if (where.operator === '=' && where.value !== undefined) {
        whereClause = `WHERE ${where.column} = $1`;
        params.push(where.value);
      }

      const sql = `DELETE FROM ${table} ${whereClause}`;
      
      await this.pool.query(sql, params);
      
      return {
        data: null,
        error: null
      };
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async executeRPC(functionName: string, params: Record<string, any> = {}): Promise<QueryResult> {
    if (!this.pool) {
      return { data: null, error: 'Not connected to database' };
    }

    try {
      const paramKeys = Object.keys(params);
      const paramValues = Object.values(params);
      const paramPlaceholders = paramKeys.map((_, index) => `$${index + 1}`).join(', ');
      
      const sql = `SELECT * FROM ${functionName}(${paramPlaceholders})`;
      
      const result = await this.pool.query(sql, paramValues);
      
      return {
        data: result.rows,
        error: null
      };
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async executeRawSQL(sql: string, params: any[] = []): Promise<QueryResult> {
    if (!this.pool) {
      return { data: null, error: 'Not connected to database' };
    }

    try {
      const result = await this.pool.query(sql, params);
      
      return {
        data: result.rows,
        error: null,
        count: result.rowCount || 0
      };
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}