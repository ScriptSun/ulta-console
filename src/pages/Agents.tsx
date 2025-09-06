import { PageHeader } from '@/components/layouts/PageHeader';
import { EnhancedAgentsTable } from '@/components/agents/EnhancedAgentsTable';
import { Button } from '@/components/ui/button';
import { Plus, Download, Settings } from 'lucide-react';

export default function Agents() {
  const actions = (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm">
        <Download className="h-4 w-4 mr-2" />
        Export
      </Button>
      <Button variant="outline" size="sm">
        <Settings className="h-4 w-4 mr-2" />
        Settings
      </Button>
      <Button>
        <Plus className="h-4 w-4 mr-2" />
        Add Agent
      </Button>
    </div>
  );

  const handleAgentClick = (agent: any) => {
    console.log('Agent clicked:', agent);
  };

  const handleAgentStart = (agent: any) => {
    console.log('Starting agent:', agent);
  };

  const handleAgentPause = (agent: any) => {
    console.log('Pausing agent:', agent);
  };

  const handleAgentStop = (agent: any) => {
    console.log('Stopping agent:', agent);
  };

  const handleAgentDelete = (agent: any) => {
    console.log('Deleting agent:', agent);
  };

  const handleViewLogs = (agent: any) => {
    console.log('Viewing logs for agent:', agent);
  };

  const handleViewDetails = (agent: any) => {
    console.log('Viewing details for agent:', agent);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Agents"
        description="Manage and monitor your AI agents"
        actions={actions}
      />
      
      <EnhancedAgentsTable
        onAgentClick={handleAgentClick}
        onAgentStart={handleAgentStart}
        onAgentPause={handleAgentPause}
        onAgentStop={handleAgentStop}
        onAgentDelete={handleAgentDelete}
        onViewLogs={handleViewLogs}
        onViewDetails={handleViewDetails}
      />
    </div>
  );
}