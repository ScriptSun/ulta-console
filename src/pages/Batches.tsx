import React, { useState } from 'react';
import { PageHeader } from '@/components/layouts/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Plus, 
  Search, 
  Filter, 
  Play, 
  Pause, 
  Square,
  Calendar,
  Users,
  Activity,
  Clock
} from 'lucide-react';

interface Batch {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'paused';
  progress: number;
  totalTasks: number;
  completedTasks: number;
  createdAt: string;
  executionTime: string;
  assignedTo: string;
}

const mockBatches: Batch[] = [
  {
    id: '1',
    name: 'System Update Batch',
    description: 'Deploy system updates across all production servers',
    status: 'running',
    progress: 65,
    totalTasks: 120,
    completedTasks: 78,
    createdAt: '2024-01-15T10:30:00Z',
    executionTime: '45m 32s',
    assignedTo: 'Agent-001'
  },
  {
    id: '2',
    name: 'Data Migration',
    description: 'Migrate customer data to new database schema',
    status: 'completed',
    progress: 100,
    totalTasks: 85,
    completedTasks: 85,
    createdAt: '2024-01-14T14:20:00Z',
    executionTime: '2h 15m',
    assignedTo: 'Agent-003'
  },
  {
    id: '3',
    name: 'Security Audit',
    description: 'Run comprehensive security checks on all endpoints',
    status: 'pending',
    progress: 0,
    totalTasks: 200,
    completedTasks: 0,
    createdAt: '2024-01-15T16:00:00Z',
    executionTime: '-',
    assignedTo: 'Agent-002'
  }
];

export default function Batches() {
  const [batches] = useState<Batch[]>(mockBatches);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const filteredBatches = batches.filter(batch => {
    const matchesSearch = batch.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         batch.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || batch.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: Batch['status']) => {
    switch (status) {
      case 'running': return 'bg-primary text-primary-foreground';
      case 'completed': return 'bg-success text-success-foreground';
      case 'failed': return 'bg-destructive text-destructive-foreground';
      case 'paused': return 'bg-warning text-warning-foreground';
      case 'pending': return 'bg-muted text-muted-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusIcon = (status: Batch['status']) => {
    switch (status) {
      case 'running': return <Play className="h-3 w-3" />;
      case 'completed': return <Square className="h-3 w-3" />;
      case 'failed': return <Square className="h-3 w-3" />;
      case 'paused': return <Pause className="h-3 w-3" />;
      case 'pending': return <Clock className="h-3 w-3" />;
      default: return <Clock className="h-3 w-3" />;
    }
  };

  const statsCards = [
    {
      title: 'Total Batches',
      value: batches.length,
      icon: <Activity className="h-5 w-5" />,
      gradient: 'bg-gradient-primary'
    },
    {
      title: 'Running',
      value: batches.filter(b => b.status === 'running').length,
      icon: <Play className="h-5 w-5" />,
      gradient: 'bg-gradient-secondary'
    },
    {
      title: 'Completed',
      value: batches.filter(b => b.status === 'completed').length,
      icon: <Square className="h-5 w-5" />,
      gradient: 'bg-gradient-accent'
    },
    {
      title: 'Pending',
      value: batches.filter(b => b.status === 'pending').length,
      icon: <Clock className="h-5 w-5" />,
      gradient: 'bg-gradient-muted'
    }
  ];

  const pageActions = (
    <>
      <Button variant="outline" size="sm">
        <Filter className="h-4 w-4 mr-2" />
        Advanced Filters
      </Button>
      <Button>
        <Plus className="h-4 w-4 mr-2" />
        Create Batch
      </Button>
    </>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Batches"
        description="Create, monitor, and manage batch processing jobs across your infrastructure"
        actions={pageActions}
      />

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsCards.map((stat, index) => (
          <Card key={index} className={`${stat.gradient} border-0 text-white`}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium opacity-90">{stat.title}</p>
                  <p className="text-3xl font-bold">{stat.value}</p>
                </div>
                <div className="opacity-75">
                  {stat.icon}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search batches by name or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="running">Running</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="paused">Paused</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Batch List */}
      <div className="grid gap-4">
        {filteredBatches.map((batch) => (
          <Card key={batch.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-lg">{batch.name}</CardTitle>
                  <CardDescription>{batch.description}</CardDescription>
                </div>
                <Badge className={`${getStatusColor(batch.status)} flex items-center gap-1`}>
                  {getStatusIcon(batch.status)}
                  {batch.status.charAt(0).toUpperCase() + batch.status.slice(1)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Progress Bar */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="font-medium">{batch.progress}%</span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-2">
                    <div 
                      className="bg-primary h-2 rounded-full transition-all duration-300" 
                      style={{ width: `${batch.progress}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{batch.completedTasks} of {batch.totalTasks} tasks completed</span>
                    <span>Execution time: {batch.executionTime}</span>
                  </div>
                </div>

                {/* Metadata */}
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(batch.createdAt).toLocaleDateString()}
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {batch.assignedTo}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {batch.status === 'running' && (
                      <Button variant="outline" size="sm">
                        <Pause className="h-3 w-3 mr-1" />
                        Pause
                      </Button>
                    )}
                    {batch.status === 'paused' && (
                      <Button variant="outline" size="sm">
                        <Play className="h-3 w-3 mr-1" />
                        Resume
                      </Button>
                    )}
                    <Button variant="ghost" size="sm">
                      View Details
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredBatches.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-muted-foreground">No batches found matching your criteria.</p>
            <Button className="mt-4">
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Batch
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}