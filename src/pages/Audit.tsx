import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/ui/data-table';
import { ColumnDef } from '@tanstack/react-table';
import { 
  Download, 
  Filter,
  ArrowUpDown,
  User,
  Calendar,
  Activity,
  Search,
  RefreshCw
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api-wrapper';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { format } from 'date-fns';

interface AuditLog {
  id: string;
  customer_id: string;
  actor: string;
  action: string;
  target: string;
  meta: any;
  created_at: string;
}

const actionTypes = [
  'command_created',
  'command_updated', 
  'command_activated',
  'command_deactivated',
  'command_validation',
  'batch_created',
  'batch_updated',
  'batch_activated', 
  'batch_deactivated',
  'batch_validation',
  'script_uploaded',
  'script_updated'
];

export default function Audit() {
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [actorFilter, setActorFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState<Date>();
  const [dateTo, setDateTo] = useState<Date>();
  const { toast } = useToast();

  useEffect(() => {
    fetchAuditLogs();
  }, []);

  const fetchAuditLogs = async () => {
    setLoading(true);
    try {
      let query = api
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1000);

      if (dateFrom) {
        query = query.gte('created_at', dateFrom.toISOString());
      }
      
      if (dateTo) {
        query = query.lte('created_at', dateTo.toISOString());
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching audit logs:', error);
        toast({
          title: 'Error',
          description: 'Failed to fetch audit logs',
          variant: 'destructive',
        });
      } else {
        setAuditLogs(data || []);
      }
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch audit logs',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getActionBadgeVariant = (action: string) => {
    if (action.includes('created')) return 'default';
    if (action.includes('updated')) return 'secondary';
    if (action.includes('activated')) return 'default';
    if (action.includes('deactivated')) return 'destructive';
    if (action.includes('validation')) return 'outline';
    return 'outline';
  };

  const exportToCsv = () => {
    const csvContent = [
      ['Timestamp', 'Actor', 'Action', 'Target', 'Customer ID', 'Meta'].join(','),
      ...filteredLogs.map(log => [
        new Date(log.created_at).toISOString(),
        log.actor,
        log.action,
        log.target,
        log.customer_id,
        JSON.stringify(log.meta || {})
      ].map(field => `"${String(field).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: 'Export Complete',
      description: `Exported ${filteredLogs.length} audit log entries`,
    });
  };

  const columns: ColumnDef<AuditLog>[] = [
    {
      accessorKey: 'created_at',
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="h-auto p-0 hover:bg-transparent"
          >
            Timestamp
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => (
        <div className="text-sm">
          <div>{new Date(row.getValue('created_at')).toLocaleDateString()}</div>
          <div className="text-muted-foreground text-xs">
            {new Date(row.getValue('created_at')).toLocaleTimeString()}
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'actor',
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="h-auto p-0 hover:bg-transparent"
          >
            <User className="mr-2 h-4 w-4" />
            Actor
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{row.getValue('actor')}</span>
        </div>
      ),
    },
    {
      accessorKey: 'action',
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="h-auto p-0 hover:bg-transparent"
          >
            Action
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => {
        const action = row.getValue('action') as string;
        return (
          <Badge variant={getActionBadgeVariant(action)}>
            {action.replace(/_/g, ' ')}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'target',
      header: 'Target',
      cell: ({ row }) => (
        <code className="font-mono text-sm bg-muted px-2 py-1 rounded">
          {row.getValue('target')}
        </code>
      ),
    },
    {
      accessorKey: 'meta',
      header: 'Details',
      cell: ({ row }) => {
        const meta = row.getValue('meta') as any;
        if (!meta || Object.keys(meta).length === 0) {
          return <span className="text-muted-foreground text-sm">No details</span>;
        }

        // Show key details based on action type
        const action = row.original.action;
        if (action.includes('validation')) {
          return (
            <Badge variant={meta.result === 'success' ? 'default' : 'destructive'}>
              {meta.result || 'Unknown'}
            </Badge>
          );
        }

        if (action.includes('updated') && meta.changes) {
          const changeCount = Object.keys(meta.changes).length;
          return (
            <span className="text-sm text-muted-foreground">
              {changeCount} field{changeCount !== 1 ? 's' : ''} changed
            </span>
          );
        }

        return (
          <span className="text-sm text-muted-foreground">
            {Object.keys(meta).length} properties
          </span>
        );
      },
    },
  ];

  // Get unique actors for filter
  const uniqueActors = Array.from(new Set(auditLogs.map(log => log.actor)));

  // Filter data
  const filteredLogs = auditLogs.filter((log) => {
    const matchesSearch = 
      log.actor.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.target.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesAction = actionFilter === 'all' || log.action === actionFilter;
    const matchesActor = actorFilter === 'all' || log.actor === actorFilter;

    return matchesSearch && matchesAction && matchesActor;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Activity className="h-8 w-8 text-primary" />
            Audit Trail
          </h1>
          <p className="text-muted-foreground mt-2">
            Complete activity log and security audit trail
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchAuditLogs} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={exportToCsv} disabled={filteredLogs.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Events</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{auditLogs.length.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {filteredLogs.length} after filters
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unique Actors</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{uniqueActors.length}</div>
            <p className="text-xs text-muted-foreground">
              System and user actions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Events</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {auditLogs.filter(log => 
                new Date(log.created_at).toDateString() === new Date().toDateString()
              ).length}
            </div>
            <p className="text-xs text-muted-foreground">
              Last 24 hours
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Error Events</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {auditLogs.filter(log => 
                log.meta?.result === 'error' || log.action.includes('failed')
              ).length}
            </div>
            <p className="text-xs text-muted-foreground">
              Failed validations/actions
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
          <CardDescription>
            Filter audit logs by date range, action type, and actor
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <div className="space-y-2">
              <label className="text-sm font-medium">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search logs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Action Type</label>
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All actions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  {actionTypes.map((action) => (
                    <SelectItem key={action} value={action}>
                      {action.replace(/_/g, ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Actor</label>
              <Select value={actorFilter} onValueChange={setActorFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All actors" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actors</SelectItem>
                  {uniqueActors.map((actor) => (
                    <SelectItem key={actor} value={actor}>
                      {actor}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">From Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start">
                    <Calendar className="mr-2 h-4 w-4" />
                    {dateFrom ? format(dateFrom, 'PPP') : 'Pick a date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <CalendarComponent
                    mode="single"
                    selected={dateFrom}
                    onSelect={setDateFrom}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">To Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start">
                    <Calendar className="mr-2 h-4 w-4" />
                    {dateTo ? format(dateTo, 'PPP') : 'Pick a date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <CalendarComponent
                    mode="single"
                    selected={dateTo}
                    onSelect={setDateTo}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {(dateFrom || dateTo || actionFilter !== 'all' || actorFilter !== 'all' || searchQuery) && (
            <div className="flex items-center gap-2 mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setDateFrom(undefined);
                  setDateTo(undefined);
                  setActionFilter('all');
                  setActorFilter('all');
                  setSearchQuery('');
                }}
              >
                Clear Filters
              </Button>
              <Button variant="outline" size="sm" onClick={fetchAuditLogs}>
                Apply Filters
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <DataTable
        columns={columns}
        data={filteredLogs}
      />
    </div>
  );
}