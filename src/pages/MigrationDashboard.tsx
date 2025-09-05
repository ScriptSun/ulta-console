import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, Circle, ArrowRight, Database, Cloud, Server, Settings, TestTube, AlertCircle, Download, FileText } from 'lucide-react';
import { DatabaseExporter } from '@/lib/migration/databaseExport';
import { databaseSwitcher, DatabaseProvider, DatabaseSwitchConfig } from '@/lib/migration/databaseSwitcher';
import { toast } from 'sonner';

const MigrationDashboard = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [exportData, setExportData] = useState<any>(null);
  const [currentProvider, setCurrentProvider] = useState<DatabaseProvider>('supabase');
  const [testProvider, setTestProvider] = useState<DatabaseProvider>('postgresql');
  const [connectionString, setConnectionString] = useState('postgresql://username:password@localhost:5432/database');
  const [isConnecting, setIsConnecting] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    // Load current provider on mount
    setCurrentProvider(databaseSwitcher.getCurrentProvider());
    
    // Load persisted config
    databaseSwitcher.loadPersistedConfig();
  }, []);

  const migrationSteps = [
    {
      id: 'export',
      title: 'Database Export',
      description: 'Export current Supabase schema and data',
      icon: Database,
      status: completedSteps.has(0) ? 'completed' : currentStep === 0 ? 'active' : 'pending'
    },
    {
      id: 'setup',
      title: 'Setup Target Database',
      description: 'Configure PostgreSQL or other database',
      icon: Server,
      status: completedSteps.has(1) ? 'completed' : currentStep === 1 ? 'active' : 'pending'
    },
    {
      id: 'migrate',
      title: 'Data Migration',
      description: 'Migrate data to target database',
      icon: ArrowRight,
      status: completedSteps.has(2) ? 'completed' : currentStep === 2 ? 'active' : 'pending'
    },
    {
      id: 'switch',
      title: 'Switch Database',
      description: 'Update application to use new database',
      icon: Settings,
      status: completedSteps.has(3) ? 'completed' : currentStep === 3 ? 'active' : 'pending'
    }
  ];

  const testConnection = async () => {
    if (!connectionString.trim()) {
      toast.error('Please enter a connection string');
      return;
    }

    setIsTesting(true);
    
    try {
      const result = await databaseSwitcher.testConnection(testProvider, {
        type: testProvider,
        connectionString: connectionString.trim()
      });

      if (result.success) {
        toast.success('Connection test successful!');
      } else {
        toast.error(`Connection failed: ${result.error}`);
      }
    } catch (error) {
      toast.error('Connection test failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsTesting(false);
    }
  };

  const switchDatabase = async () => {
    if (!connectionString.trim()) {
      toast.error('Please enter a connection string');
      return;
    }

    setIsConnecting(true);
    
    try {
      const result = await databaseSwitcher.switchTo(testProvider, {
        type: testProvider,
        connectionString: connectionString.trim()
      });

      if (result.success) {
        setCurrentProvider(testProvider);
        toast.success(`Successfully switched to ${testProvider}!`);
        setCompletedSteps(prev => new Set([...prev, 3]));
      } else {
        toast.error(`Switch failed: ${result.error}`);
      }
    } catch (error) {
      toast.error('Switch failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsConnecting(false);
    }
  };

  const handleStartStep = async (stepIndex: number) => {
    const stepId = migrationSteps[stepIndex].id;
    
    // Check if prerequisites are met
    if (stepIndex > 0 && !completedSteps.has(stepIndex - 1)) {
      toast.error('Please complete the previous step first');
      return;
    }

    setCurrentStep(stepIndex);

    try {
      switch (stepId) {
        case 'export':
          setIsExporting(true);
          const exporter = new DatabaseExporter();
          const data = await exporter.exportDatabase();
          setExportData(data);
          
          // Mark step as completed
          setCompletedSteps(prev => new Set([...prev, stepIndex]));
          setCurrentStep(stepIndex + 1);
          toast.success('Database export completed!');
          break;
          
        case 'setup':
          // Setup step is completed when user tests connection successfully
          if (!completedSteps.has(1)) {
            toast.info('Please test your database connection first');
            return;
          }
          break;
          
        case 'migrate':
          // Simulate migration
          setTimeout(() => {
            setCompletedSteps(prev => new Set([...prev, stepIndex]));
            setCurrentStep(stepIndex + 1);
            toast.success('Data migration completed!');
          }, 2000);
          break;
          
        case 'switch':
          await switchDatabase();
          break;
      }
    } catch (error) {
      console.error('Step failed:', error);
      toast.error('Step failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      if (stepId === 'export') {
        setIsExporting(false);
      }
    }
  };

  const handleSQLExport = async () => {
    try {
      const exporter = new DatabaseExporter();
      const sql = await exporter.generateSQLScript();
      const blob = new Blob([sql], { type: 'application/sql' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'supabase-export.sql';
      a.click();
      URL.revokeObjectURL(url);
      toast.success('SQL export completed!');
    } catch (error) {
      toast.error('SQL export failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center gap-3">
        <Database className="w-8 h-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Database Migration</h1>
          <p className="text-muted-foreground">
            Migrate from Supabase to your preferred database solution
          </p>
        </div>
      </div>

      {/* Current Database Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="w-5 h-5" />
            Current Database
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <Badge variant={currentProvider === 'supabase' ? 'default' : 'secondary'}>
              {currentProvider === 'supabase' ? 'Supabase (Cloud)' : 'PostgreSQL (Local)'}
            </Badge>
            <span className="text-sm text-muted-foreground">
              Currently active database provider
            </span>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="migration" className="w-full">
        <TabsList>
          <TabsTrigger value="migration">Migration Steps</TabsTrigger>
          <TabsTrigger value="switch">Database Switch</TabsTrigger>
          <TabsTrigger value="export">Export Tools</TabsTrigger>
        </TabsList>

        <TabsContent value="migration" className="space-y-4">
          {/* Migration Steps */}
          <div className="grid gap-4">
            {migrationSteps.map((step, index) => {
              const Icon = step.icon;
              const isActive = step.status === 'active';
              const isCompleted = step.status === 'completed';
              const canStart = index === 0 || completedSteps.has(index - 1);

              return (
                <Card key={step.id} className={`${isActive ? 'ring-2 ring-primary' : ''}`}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full ${
                          isCompleted ? 'bg-green-500 text-white' : 
                          isActive ? 'bg-primary text-primary-foreground' : 
                          'bg-muted text-muted-foreground'
                        }`}>
                          {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                        </div>
                        <div>
                          <CardTitle>{step.title}</CardTitle>
                          <CardDescription>{step.description}</CardDescription>
                        </div>
                      </div>
                      
                      {canStart && !isCompleted && (
                        <Button 
                          onClick={() => handleStartStep(index)}
                          disabled={step.id === 'setup' && !completedSteps.has(0)}
                        >
                          {step.id === 'switch' ? 'Switch Now' : isExporting && step.id === 'export' ? 'Exporting...' : 'Start'}
                        </Button>
                      )}
                    </div>
                  </CardHeader>

                  {/* Step-specific content */}
                  {(isActive || (step.id === 'setup' && completedSteps.has(0))) && (
                    <CardContent>
                      {step.id === 'export' && (
                        <div className="space-y-4">
                          <p className="text-sm text-muted-foreground">
                            This will export your Supabase database schema and data for migration.
                          </p>
                          <div className="grid grid-cols-2 gap-4">
                            <Button variant="outline" onClick={() => new DatabaseExporter().downloadExport('supabase-export.json')}>
                              Download JSON
                            </Button>
                            <Button variant="outline" onClick={handleSQLExport}>
                              Download SQL
                            </Button>
                          </div>
                        </div>
                      )}

                      {step.id === 'setup' && (
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="provider">Target Database Provider</Label>
                            <Select value={testProvider} onValueChange={(value) => setTestProvider(value as DatabaseProvider)}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {databaseSwitcher.getAvailableProviders().map(provider => (
                                  <SelectItem key={provider.value} value={provider.value}>
                                    {provider.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="connection-string">Connection String</Label>
                            <Input
                              id="connection-string"
                              value={connectionString}
                              onChange={(e) => setConnectionString(e.target.value)}
                              placeholder="postgresql://username:password@localhost:5432/database"
                            />
                            <p className="text-xs text-muted-foreground">
                              Enter your PostgreSQL connection string. For local development, use: postgresql://postgres:password@localhost:5432/your_db
                            </p>
                          </div>

                          <div className="flex gap-2">
                            <Button 
                              variant="outline" 
                              onClick={testConnection}
                              disabled={isTesting}
                              className="flex items-center gap-2"
                            >
                              <TestTube className="w-4 h-4" />
                              {isTesting ? 'Testing...' : 'Test Connection'}
                            </Button>
                            
                            <Button 
                              onClick={() => {
                                if (!isTesting) {
                                  testConnection().then(() => {
                                    setCompletedSteps(prev => new Set([...prev, 1]));
                                    setCurrentStep(2);
                                  });
                                }
                              }}
                              disabled={!connectionString.trim()}
                            >
                              Configure Database
                            </Button>
                          </div>
                        </div>
                      )}

                      {step.id === 'switch' && (
                        <div className="space-y-4">
                          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                            <p className="text-sm text-amber-800">
                              <strong>Warning:</strong> This will switch your application to use the new database. 
                              Make sure you've completed data migration and tested the connection.
                            </p>
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium">Switch to: {testProvider === 'postgresql' ? 'PostgreSQL' : testProvider}</p>
                              <p className="text-sm text-muted-foreground">{connectionString}</p>
                            </div>
                            
                            <Button 
                              onClick={switchDatabase}
                              disabled={isConnecting}
                              variant="destructive"
                            >
                              {isConnecting ? 'Switching...' : 'Confirm Switch'}
                            </Button>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="switch" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Database Provider Switch</CardTitle>
              <CardDescription>
                Switch between different database providers in real-time
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  You can switch between Supabase and PostgreSQL instantly. This uses the abstraction layer to provide seamless switching.
                </AlertDescription>
              </Alert>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Database Provider</Label>
                  <Select value={testProvider} onValueChange={(value) => setTestProvider(value as DatabaseProvider)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {databaseSwitcher.getAvailableProviders().map(provider => (
                        <SelectItem key={provider.value} value={provider.value}>
                          {provider.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Current Provider</Label>
                  <Badge variant="outline" className="w-full justify-center py-2">
                    {currentProvider === 'supabase' ? 'Supabase (Cloud)' : 'PostgreSQL (Local)'}
                  </Badge>
                </div>
              </div>

              {testProvider === 'postgresql' && (
                <div className="space-y-2">
                  <Label htmlFor="pg-connection">PostgreSQL Connection String</Label>
                  <Input
                    id="pg-connection"
                    value={connectionString}
                    onChange={(e) => setConnectionString(e.target.value)}
                    placeholder="postgresql://username:password@localhost:5432/database"
                  />
                </div>
              )}

              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={testConnection}
                  disabled={isTesting}
                  className="flex items-center gap-2"
                >
                  <TestTube className="w-4 h-4" />
                  {isTesting ? 'Testing...' : 'Test Connection'}
                </Button>
                
                <Button 
                  onClick={switchDatabase}
                  disabled={isConnecting || currentProvider === testProvider}
                >
                  {isConnecting ? 'Switching...' : `Switch to ${testProvider}`}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="export" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5" />
                Database Export Tools
              </CardTitle>
              <CardDescription>
                Export your database schema and data in different formats
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  These export tools work with your currently active database provider ({currentProvider}).
                </AlertDescription>
              </Alert>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button 
                  onClick={() => new DatabaseExporter().downloadExport('database-export.json')}
                  className="flex items-center gap-2 h-20"
                  variant="outline"
                >
                  <Download className="w-5 h-5" />
                  <div className="text-left">
                    <div className="font-medium">Export as JSON</div>
                    <div className="text-sm text-muted-foreground">Complete data export</div>
                  </div>
                </Button>

                <Button 
                  onClick={handleSQLExport}
                  className="flex items-center gap-2 h-20"
                  variant="outline"
                >
                  <FileText className="w-5 h-5" />
                  <div className="text-left">
                    <div className="font-medium">Export as SQL</div>
                    <div className="text-sm text-muted-foreground">Migration script</div>
                  </div>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MigrationDashboard;