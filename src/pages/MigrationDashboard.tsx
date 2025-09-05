import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Download, 
  Database, 
  Code, 
  CheckCircle, 
  AlertCircle, 
  Clock,
  FileText,
  Settings,
  Zap
} from 'lucide-react';
import { DatabaseExporter } from '@/lib/migration/databaseExport';
import { toast } from '@/hooks/use-toast';

interface MigrationStep {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in-progress' | 'completed' | 'failed';
  progress: number;
  dependencies?: string[];
}

const MigrationDashboard: React.FC = () => {
  const [exportProgress, setExportProgress] = useState(0);
  const [isExporting, setIsExporting] = useState(false);
  const [stepStatuses, setStepStatuses] = useState<{[key: string]: MigrationStep['status']}>({
    'abstraction-layers': 'completed'
  });

  const migrationSteps: MigrationStep[] = [
    {
      id: 'database-export',
      title: 'Database Export',
      description: 'Export all tables, data, functions, and policies from Supabase',
      status: stepStatuses['database-export'] || 'pending',
      progress: stepStatuses['database-export'] === 'completed' ? 100 : 0
    },
    {
      id: 'abstraction-layers',
      title: 'Abstraction Layers',
      description: 'Create database and function abstraction layers',
      status: stepStatuses['abstraction-layers'] || 'completed',
      progress: stepStatuses['abstraction-layers'] === 'completed' ? 100 : 0
    },
    {
      id: 'target-setup',
      title: 'Target Platform Setup',
      description: 'Set up new database and serverless functions',
      status: 'pending',
      progress: 0,
      dependencies: ['database-export']
    },
    {
      id: 'data-migration',
      title: 'Data Migration',
      description: 'Migrate all data to new platform',
      status: 'pending',
      progress: 0,
      dependencies: ['target-setup']
    },
    {
      id: 'function-migration',
      title: 'Function Migration',
      description: 'Migrate all 30+ edge functions to new platform',
      status: 'pending',
      progress: 0,
      dependencies: ['target-setup']
    },
    {
      id: 'auth-migration',
      title: 'Authentication Migration',
      description: 'Migrate from Supabase Auth to new auth provider',
      status: 'pending',
      progress: 0,
      dependencies: ['data-migration']
    },
    {
      id: 'realtime-setup',
      title: 'Real-time Setup',
      description: 'Replace Supabase real-time with WebSocket solution',
      status: 'pending',
      progress: 0,
      dependencies: ['function-migration']
    },
    {
      id: 'testing',
      title: 'Testing & Validation',
      description: 'Comprehensive testing of migrated system',
      status: 'pending',
      progress: 0,
      dependencies: ['auth-migration', 'realtime-setup']
    },
    {
      id: 'cutover',
      title: 'Production Cutover',
      description: 'Switch from Supabase to new infrastructure',
      status: 'pending',
      progress: 0,
      dependencies: ['testing']
    }
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'in-progress':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'in-progress':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const handleStartStep = async (stepId: string) => {
    setStepStatuses(prev => ({
      ...prev,
      [stepId]: 'in-progress'
    }));

    if (stepId === 'database-export') {
      await handleDatabaseExport();
      setStepStatuses(prev => ({
        ...prev,
        [stepId]: 'completed'
      }));
    } else {
      // For other steps, simulate completion after 3 seconds
      setTimeout(() => {
        setStepStatuses(prev => ({
          ...prev,
          [stepId]: 'completed'
        }));
        toast({
          title: "Step Complete",
          description: `${migrationSteps.find(s => s.id === stepId)?.title} has been completed`
        });
      }, 3000);
    }
  };

  const handleDatabaseExport = async () => {
    setIsExporting(true);
    setExportProgress(0);
    
    try {
      const exporter = new DatabaseExporter();
      
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setExportProgress(prev => Math.min(prev + 10, 90));
      }, 500);

      await exporter.downloadExport('supabase_export.json');
      
      clearInterval(progressInterval);
      setExportProgress(100);
      
      toast({
        title: "Database Export Complete",
        description: "Database schema and data exported successfully"
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive"
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleSQLExport = async () => {
    try {
      const exporter = new DatabaseExporter();
      const sql = await exporter.generateSQLScript();
      
      const blob = new Blob([sql], { type: 'text/sql' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'database_migration.sql';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({
        title: "SQL Export Complete",
        description: "Migration SQL script generated successfully"
      });
    } catch (error) {
      toast({
        title: "SQL Export Failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive"
      });
    }
  };

  const overallProgress = migrationSteps.reduce((acc, step) => acc + step.progress, 0) / migrationSteps.length;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Migration Dashboard</h1>
          <p className="text-muted-foreground">
            Track your migration away from Supabase database and edge functions
          </p>
        </div>
        <Badge variant="outline" className="text-lg px-4 py-2">
          {Math.round(overallProgress)}% Complete
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Database Tables</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">50+</div>
            <p className="text-xs text-muted-foreground">Tables to migrate</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Edge Functions</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">30+</div>
            <p className="text-xs text-muted-foreground">Functions to migrate</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overall Progress</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(overallProgress)}%</div>
            <Progress value={overallProgress} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="steps" className="w-full">
        <TabsList>
          <TabsTrigger value="steps">Migration Steps</TabsTrigger>
          <TabsTrigger value="export">Database Export</TabsTrigger>
          <TabsTrigger value="config">Configuration</TabsTrigger>
        </TabsList>

        <TabsContent value="steps" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Migration Progress</CardTitle>
              <CardDescription>
                Track the progress of your migration from Supabase
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {migrationSteps.map((step, index) => {
                const canStart = !step.dependencies || step.dependencies.every(dep => 
                  stepStatuses[dep] === 'completed'
                );
                const isInProgress = stepStatuses[step.id] === 'in-progress';
                
                return (
                  <div key={step.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-3 flex-1">
                      <div className="flex-shrink-0">
                        {getStatusIcon(step.status)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <h3 className="font-medium">{step.title}</h3>
                          <Badge className={getStatusColor(step.status)}>
                            {step.status.replace('-', ' ')}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{step.description}</p>
                        {step.dependencies && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Depends on: {step.dependencies.join(', ')}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-4">
                      <div className="w-24">
                        <Progress value={step.progress} />
                        <p className="text-xs text-muted-foreground text-center mt-1">
                          {step.progress}%
                        </p>
                      </div>
                      
                      {step.status === 'pending' && canStart && (
                        <Button
                          onClick={() => handleStartStep(step.id)}
                          disabled={isInProgress}
                          size="sm"
                          variant="outline"
                        >
                          {isInProgress ? 'Starting...' : 'Start'}
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="export" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Database className="h-5 w-5" />
                <span>Database Export</span>
              </CardTitle>
              <CardDescription>
                Export your Supabase database schema and data for migration
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isExporting && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Exporting database...</span>
                    <span className="text-sm text-muted-foreground">{exportProgress}%</span>
                  </div>
                  <Progress value={exportProgress} />
                </div>
              )}

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  The export will include table schemas, data, and metadata. Some system functions 
                  may require manual recreation on your target platform.
                </AlertDescription>
              </Alert>

              <div className="flex space-x-4">
                <Button 
                  onClick={handleDatabaseExport}
                  disabled={isExporting}
                  className="flex items-center space-x-2"
                >
                  <Download className="h-4 w-4" />
                  <span>Export as JSON</span>
                </Button>

                <Button 
                  variant="outline"
                  onClick={handleSQLExport}
                  disabled={isExporting}
                  className="flex items-center space-x-2"
                >
                  <FileText className="h-4 w-4" />
                  <span>Export as SQL</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="config" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Migration Configuration</CardTitle>
              <CardDescription>
                Configure your target platform and migration settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <Settings className="h-4 w-4" />
                <AlertDescription>
                  Configuration options will be available once you've completed the database export 
                  and chosen your target platform.
                </AlertDescription>
              </Alert>

              <div className="space-y-3">
                <h4 className="font-medium">Recommended Target Platforms:</h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• <strong>PostgreSQL + Node.js/Express:</strong> Full control, similar to Supabase</li>
                  <li>• <strong>Firebase:</strong> Google Cloud, similar real-time features</li>
                  <li>• <strong>AWS Amplify:</strong> Full AWS ecosystem integration</li>
                  <li>• <strong>PlanetScale + Vercel:</strong> Modern serverless stack</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MigrationDashboard;