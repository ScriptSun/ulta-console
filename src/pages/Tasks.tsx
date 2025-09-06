import { PageHeader } from '@/components/layouts/PageHeader';
import { EnhancedTasksTable } from '@/components/tasks/EnhancedTasksTable';
import { Button } from '@/components/ui/button';
import { Plus, CheckSquare } from 'lucide-react';

export default function Tasks() {
  const actions = (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm">
        Export Tasks
      </Button>
      <Button>
        <Plus className="h-4 w-4 mr-2" />
        Create Task
      </Button>
    </div>
  );

  const handleTaskClick = (task: any) => {
    console.log('Task clicked:', task);
  };

  const handleTaskPause = (task: any) => {
    console.log('Pausing task:', task);
  };

  const handleTaskResume = (task: any) => {
    console.log('Resuming task:', task);
  };

  const handleTaskStop = (task: any) => {
    console.log('Stopping task:', task);
  };

  const handleTaskRetry = (task: any) => {
    console.log('Retrying task:', task);
  };

  const handleViewDetails = (task: any) => {
    console.log('Viewing task details:', task);
  };

  const handleViewLogs = (task: any) => {
    console.log('Viewing task logs:', task);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tasks"
        description="Monitor and manage agent tasks and workflows"
        actions={actions}
      />
      
      <EnhancedTasksTable
        onTaskClick={handleTaskClick}
        onTaskPause={handleTaskPause}
        onTaskResume={handleTaskResume}
        onTaskStop={handleTaskStop}
        onTaskRetry={handleTaskRetry}
        onViewDetails={handleViewDetails}
        onViewLogs={handleViewLogs}
      />
    </div>
  );
}