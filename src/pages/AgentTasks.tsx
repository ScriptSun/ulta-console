import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, CheckCircle2, XCircle, AlertCircle, PlayCircle, Download, FileText, FileSpreadsheet, FileImage } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';

interface AgentTask {
  id: string;
  task_name: string;
  status: string;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  error_message: string | null;
  metadata: any;
}

interface Agent {
  id: string;
  hostname?: string;
  agent_type: string;
  status: string;
}

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'success':
      return CheckCircle2;
    case 'failed':
      return XCircle;
    case 'running':
      return PlayCircle;
    case 'pending':
      return Clock;
    case 'cancelled':
      return AlertCircle;
    default:
      return AlertCircle;
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'success':
      return 'bg-green-500/10 text-green-400 border-green-500/20';
    case 'failed':
      return 'bg-red-500/10 text-red-400 border-red-500/20';
    case 'running':
      return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
    case 'pending':
      return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
    case 'cancelled':
      return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
    default:
      return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
  }
};

export default function AgentTasks() {
  const { agentId } = useParams<{ agentId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [agent, setAgent] = useState<Agent | null>(null);
  const [tasks, setTasks] = useState<AgentTask[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!agentId) return;

    const fetchData = async () => {
      try {
        // Fetch agent details
        const { data: agentData, error: agentError } = await supabase
          .from('agents')
          .select('*')
          .eq('id', agentId)
          .single();

        if (agentError) {
          console.error('Error fetching agent:', agentError);
          toast({
            title: 'Error',
            description: 'Failed to fetch agent details',
            variant: 'destructive',
          });
          return;
        }

        setAgent(agentData);

        // Fetch agent tasks
        const { data: tasksData, error: tasksError } = await supabase
          .from('agent_tasks')
          .select('*')
          .eq('agent_id', agentId)
          .order('created_at', { ascending: false });

        if (tasksError) {
          console.error('Error fetching tasks:', tasksError);
          toast({
            title: 'Error',
            description: 'Failed to fetch agent tasks',
            variant: 'destructive',
          });
          return;
        }

        setTasks(tasksData || []);
      } catch (error) {
        console.error('Unexpected error:', error);
        toast({
          title: 'Error',
          description: 'An unexpected error occurred',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [agentId, toast]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-muted-foreground">Loading agent tasks...</div>
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <div className="text-muted-foreground">Agent not found</div>
        <Button onClick={() => navigate('/agents')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Agents
        </Button>
      </div>
    );
  }

  const formatDuration = (startTime: string | null, endTime: string | null) => {
    if (!startTime) return 'Not started';
    if (!endTime) return 'Running...';
    
    const start = new Date(startTime);
    const end = new Date(endTime);
    const durationMs = end.getTime() - start.getTime();
    const seconds = Math.floor(durationMs / 1000);
    
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ${seconds % 60}s`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${minutes % 60}m`;
  };

  const downloadAsText = () => {
    const content = `Agent Tasks Report
Agent: ${agent?.hostname || agent?.id} (${agent?.agent_type})
Generated: ${new Date().toLocaleString()}
Total Tasks: ${tasks.length}

${'='.repeat(80)}

${tasks.map(task => `
Task: ${task.task_name}
Status: ${task.status.toUpperCase()}
Created: ${new Date(task.created_at).toLocaleString()}
Started: ${task.started_at ? new Date(task.started_at).toLocaleString() : 'Not started'}
Completed: ${task.completed_at ? new Date(task.completed_at).toLocaleString() : 'Not completed'}
Duration: ${formatDuration(task.started_at, task.completed_at)}
${task.error_message ? `Error: ${task.error_message}` : ''}
${task.metadata ? `Metadata: ${JSON.stringify(task.metadata, null, 2)}` : ''}
${'-'.repeat(40)}
`).join('')}`;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `agent-tasks-${agent?.hostname || agentId}-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast({
      title: 'Download Complete',
      description: 'Tasks exported as text file',
    });
  };

  const downloadAsExcel = () => {
    const worksheetData = tasks.map(task => ({
      'Task Name': task.task_name,
      'Status': task.status.charAt(0).toUpperCase() + task.status.slice(1),
      'Created': new Date(task.created_at).toLocaleString(),
      'Started': task.started_at ? new Date(task.started_at).toLocaleString() : 'Not started',
      'Completed': task.completed_at ? new Date(task.completed_at).toLocaleString() : 'Not completed',
      'Duration': formatDuration(task.started_at, task.completed_at),
      'Error Message': task.error_message || '',
      'Metadata': task.metadata ? JSON.stringify(task.metadata) : ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Agent Tasks');
    
    // Auto-size columns
    const colWidths = Object.keys(worksheetData[0] || {}).map(key => ({
      wch: Math.max(key.length, 15)
    }));
    worksheet['!cols'] = colWidths;

    XLSX.writeFile(workbook, `agent-tasks-${agent?.hostname || agentId}-${new Date().toISOString().split('T')[0]}.xlsx`);
    
    toast({
      title: 'Download Complete',
      description: 'Tasks exported as Excel file',
    });
  };

  const downloadAsPDF = () => {
    const pdf = new jsPDF();
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 20;
    let yPosition = margin;

    // Header
    pdf.setFontSize(16);
    pdf.text('Agent Tasks Report', margin, yPosition);
    yPosition += 10;
    
    pdf.setFontSize(12);
    pdf.text(`Agent: ${agent?.hostname || agent?.id} (${agent?.agent_type})`, margin, yPosition);
    yPosition += 7;
    pdf.text(`Generated: ${new Date().toLocaleString()}`, margin, yPosition);
    yPosition += 7;
    pdf.text(`Total Tasks: ${tasks.length}`, margin, yPosition);
    yPosition += 15;

    // Tasks
    pdf.setFontSize(10);
    tasks.forEach((task, index) => {
      // Check if we need a new page
      if (yPosition > pageHeight - 50) {
        pdf.addPage();
        yPosition = margin;
      }

      pdf.setFontSize(12);
      pdf.text(`${index + 1}. ${task.task_name}`, margin, yPosition);
      yPosition += 7;
      
      pdf.setFontSize(10);
      pdf.text(`Status: ${task.status.toUpperCase()}`, margin + 5, yPosition);
      yPosition += 5;
      pdf.text(`Created: ${new Date(task.created_at).toLocaleString()}`, margin + 5, yPosition);
      yPosition += 5;
      
      if (task.started_at) {
        pdf.text(`Started: ${new Date(task.started_at).toLocaleString()}`, margin + 5, yPosition);
        yPosition += 5;
      }
      
      if (task.completed_at) {
        pdf.text(`Completed: ${new Date(task.completed_at).toLocaleString()}`, margin + 5, yPosition);
        yPosition += 5;
      }
      
      pdf.text(`Duration: ${formatDuration(task.started_at, task.completed_at)}`, margin + 5, yPosition);
      yPosition += 5;
      
      if (task.error_message) {
        pdf.text(`Error: ${task.error_message.substring(0, 80)}${task.error_message.length > 80 ? '...' : ''}`, margin + 5, yPosition);
        yPosition += 5;
      }
      
      yPosition += 5; // Extra space between tasks
    });

    pdf.save(`agent-tasks-${agent?.hostname || agentId}-${new Date().toISOString().split('T')[0]}.pdf`);
    
    toast({
      title: 'Download Complete',
      description: 'Tasks exported as PDF file',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/agents')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Agents
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Agent Tasks</h1>
            <p className="text-muted-foreground">
              Tasks for {agent.hostname || agent.id} ({agent.agent_type})
            </p>
          </div>
        </div>
        
        {/* Download Dropdown */}
        {tasks.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export Tasks
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={downloadAsText}>
                <FileText className="h-4 w-4 mr-2" />
                Download as TXT
              </DropdownMenuItem>
              <DropdownMenuItem onClick={downloadAsExcel}>
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Download as Excel
              </DropdownMenuItem>
              <DropdownMenuItem onClick={downloadAsPDF}>
                <FileImage className="h-4 w-4 mr-2" />
                Download as PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Tasks List */}
      <Card>
        <CardHeader>
          <CardTitle>All Tasks ({tasks.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {tasks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No tasks found for this agent
            </div>
          ) : (
            <ScrollArea className="h-[600px]">
              <div className="space-y-4">
                {tasks.map((task) => {
                  const StatusIcon = getStatusIcon(task.status);
                  return (
                    <div
                      key={task.id}
                      className="border rounded-lg p-4 space-y-3"
                    >
                      {/* Task Header */}
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <StatusIcon className="h-4 w-4" />
                            <span className="font-medium">{task.task_name}</span>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Created {formatDistanceToNow(new Date(task.created_at))} ago
                          </div>
                        </div>
                        <Badge className={getStatusColor(task.status)}>
                          {task.status.charAt(0).toUpperCase() + task.status.slice(1)}
                        </Badge>
                      </div>

                      {/* Task Details */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Duration:</span>
                          <div className="font-mono">
                            {formatDuration(task.started_at, task.completed_at)}
                          </div>
                        </div>
                        {task.started_at && (
                          <div>
                            <span className="text-muted-foreground">Started:</span>
                            <div className="font-mono">
                              {formatDistanceToNow(new Date(task.started_at))} ago
                            </div>
                          </div>
                        )}
                        {task.completed_at && (
                          <div>
                            <span className="text-muted-foreground">Completed:</span>
                            <div className="font-mono">
                              {formatDistanceToNow(new Date(task.completed_at))} ago
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Error Message */}
                      {task.error_message && (
                        <div className="bg-red-500/5 border border-red-500/20 rounded p-3">
                          <div className="text-sm font-medium text-red-400 mb-1">Error:</div>
                          <div className="text-sm text-red-300 font-mono">
                            {task.error_message}
                          </div>
                        </div>
                      )}

                      {/* Metadata */}
                      {task.metadata && Object.keys(task.metadata).length > 0 && (
                        <div className="bg-muted/30 rounded p-3">
                          <div className="text-sm font-medium mb-2">Metadata:</div>
                          <pre className="text-xs text-muted-foreground font-mono overflow-x-auto">
                            {JSON.stringify(task.metadata, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}