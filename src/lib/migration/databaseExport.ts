import { supabaseEnhanced } from '@/lib/supabaseClient';

export interface TableSchema {
  tableName: string;
  columns: Array<{
    name: string;
    type: string;
    nullable: boolean;
    defaultValue?: string;
  }>;
  foreignKeys: Array<{
    column: string;
    referencedTable: string;
    referencedColumn: string;
  }>;
  indexes: Array<{
    name: string;
    columns: string[];
    unique: boolean;
  }>;
}

export interface DatabaseExport {
  schema: TableSchema[];
  data: Record<string, any[]>;
  functions: string[];
  policies: Array<{
    tableName: string;
    policyName: string;
    command: string;
    definition: string;
  }>;
}

export class DatabaseExporter {
  private supabase = supabaseEnhanced;

  async exportDatabase(): Promise<DatabaseExport> {
    console.log('Starting database export...');
    
    const [schema, data, functions, policies] = await Promise.all([
      this.exportSchema(),
      this.exportData(),
      this.exportFunctions(),
      this.exportPolicies()
    ]);

    return {
      schema,
      data,
      functions,
      policies
    };
  }

  private async exportSchema(): Promise<TableSchema[]> {
    try {
      // Since we can't access information_schema directly, return known tables from context
      const knownTables = [
        'admin_profiles', 'agents', 'api_keys', 'audit_logs', 'batch_runs',
        'chat_conversations', 'chat_messages', 'command_policies', 'company_themes',
        'email_templates', 'script_batches', 'subscription_plans', 'user_roles',
        'widget_metrics', 'system_settings', 'agent_usage', 'agent_tasks',
        'allowlist_commands', 'batch_dependencies', 'certificates', 'channel_providers'
      ];

      const schemas: TableSchema[] = [];
      
      for (const tableName of knownTables) {
        try {
          // Try to get a sample record to infer schema
          const { data: sample } = await (this.supabase as any)
            .from(tableName)
            .select('*')
            .limit(1);

          const columns = sample && sample.length > 0 
            ? Object.keys(sample[0]).map(key => ({
                name: key,
                type: typeof sample[0][key] === 'string' ? 'text' : 
                      typeof sample[0][key] === 'number' ? 'integer' : 
                      typeof sample[0][key] === 'boolean' ? 'boolean' : 
                      'jsonb',
                nullable: true, // Default assumption
                defaultValue: undefined
              }))
            : [];

          schemas.push({
            tableName,
            columns,
            foreignKeys: [], // Would need manual mapping
            indexes: []
          });
        } catch (tableError) {
          console.warn(`Could not analyze table ${tableName}:`, tableError);
        }
      }

      return schemas;
    } catch (error) {
      console.error('Error exporting schema:', error);
      return [];
    }
  }

  private async exportData(): Promise<Record<string, any[]>> {
    const data: Record<string, any[]> = {};
    
    try {
      // List of tables to export (you may want to customize this)
      const tables = [
        'admin_profiles', 'agents', 'api_keys', 'audit_logs', 'batch_runs',
        'chat_conversations', 'chat_messages', 'command_policies', 'company_themes',
        'email_templates', 'script_batches', 'subscription_plans', 'user_roles',
        'widget_metrics', 'system_settings'
      ];

      for (const tableName of tables) {
        try {
          const { data: tableData, error } = await (this.supabase as any)
            .from(tableName)
            .select('*')
            .limit(10000); // Adjust limit as needed

          if (!error && tableData) {
            data[tableName] = tableData;
            console.log(`Exported ${tableData.length} rows from ${tableName}`);
          }
        } catch (tableError) {
          console.warn(`Could not export table ${tableName}:`, tableError);
        }
      }
    } catch (error) {
      console.error('Error exporting data:', error);
    }

    return data;
  }

  private async exportFunctions(): Promise<string[]> {
    // This would require admin access to pg_proc
    // For now, return a list of known functions from the schema
    return [
      'handle_new_admin_user',
      'get_user_primary_customer_id',
      'ensure_user_customer_setup',
      'validate_batch_dependencies',
      'apply_role_template_permissions',
      'increment_agent_usage',
      'render_email_template',
      'check_batch_concurrency',
      'start_batch_run',
      'complete_batch_run'
    ];
  }

  private async exportPolicies(): Promise<Array<{
    tableName: string;
    policyName: string;
    command: string;
    definition: string;
  }>> {
    // This would require access to pg_policies system table
    // Return empty for now, but could be implemented with proper permissions
    return [];
  }

  async downloadExport(filename = 'database_export.json'): Promise<void> {
    const exportData = await this.exportDatabase();
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json'
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async generateSQLScript(): Promise<string> {
    const { schema, data } = await this.exportDatabase();
    let sql = '';

    // Generate CREATE TABLE statements
    for (const table of schema) {
      sql += `-- Table: ${table.tableName}\n`;
      sql += `CREATE TABLE ${table.tableName} (\n`;
      
      const columnDefs = table.columns.map(col => {
        let def = `  ${col.name} ${col.type}`;
        if (!col.nullable) def += ' NOT NULL';
        if (col.defaultValue) def += ` DEFAULT ${col.defaultValue}`;
        return def;
      });
      
      sql += columnDefs.join(',\n');
      sql += '\n);\n\n';
    }

    // Generate INSERT statements
    for (const [tableName, rows] of Object.entries(data)) {
      if (rows.length === 0) continue;
      
      sql += `-- Data for table: ${tableName}\n`;
      const columns = Object.keys(rows[0]);
      
      for (const row of rows) {
        const values = columns.map(col => {
          const val = row[col];
          if (val === null) return 'NULL';
          if (typeof val === 'string') return `'${val.replace(/'/g, "''")}'`;
          if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
          return val;
        });
        
        sql += `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${values.join(', ')});\n`;
      }
      sql += '\n';
    }

    return sql;
  }
}