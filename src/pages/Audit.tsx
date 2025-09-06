import { PageHeader } from '@/components/layouts/PageHeader';
import { EnhancedAuditTable } from '@/components/audit/EnhancedAuditTable';
import { Button } from '@/components/ui/button';
import { Download, Filter, Calendar } from 'lucide-react';

export default function Audit() {
  const actions = (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm">
        <Calendar className="h-4 w-4 mr-2" />
        Date Range
      </Button>
      <Button variant="outline" size="sm">
        <Filter className="h-4 w-4 mr-2" />
        Filters
      </Button>
      <Button variant="outline" size="sm">
        <Download className="h-4 w-4 mr-2" />
        Export All
      </Button>
    </div>
  );

  const handleViewDetails = (log: any) => {
    console.log('Viewing log details:', log);
  };

  const handleExportLogs = (logs: any[]) => {
    console.log('Exporting logs:', logs);
    // Here you would implement CSV export logic
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit Logs"
        description="Monitor system activities and user actions"
        actions={actions}
      />
      
      <EnhancedAuditTable
        onViewDetails={handleViewDetails}
        onExportLogs={handleExportLogs}
      />
    </div>
  );
}