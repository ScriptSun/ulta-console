import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Edit,
  Copy,
  Download,
  RotateCcw,
  MoreVertical,
  Loader2
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { EmailTemplate } from '@/types/emailBrandingTypes';
import { format } from 'date-fns';

interface EmailTemplatesTableProps {
  templates: EmailTemplate[];
  onEdit: (template: EmailTemplate) => void;
  onDuplicate: (templateId: string) => Promise<string | undefined>;
  loading: boolean;
}

export function EmailTemplatesTable({ 
  templates, 
  onEdit, 
  onDuplicate, 
  loading 
}: EmailTemplatesTableProps) {
  const handleExportHtml = async (template: EmailTemplate) => {
    // This would normally call an API to render the MJML to HTML
    const html = `<!-- ${template.name} -->\n${template.mjml}`;
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${template.slug}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getCategoryBadge = (category: string) => {
    return category === 'transactional' 
      ? <Badge variant="default">Transactional</Badge>
      : <Badge variant="secondary">Marketing</Badge>;
  };

  const getStatusBadge = (status: string = 'active') => {
    return status === 'active' 
      ? <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">Active</Badge>
      : <Badge variant="secondary">Archived</Badge>;
  };

  if (templates.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No email templates found</p>
        <p className="text-sm text-muted-foreground mt-1">
          Default templates will be created automatically
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Version</TableHead>
            <TableHead>Last Updated</TableHead>
            <TableHead className="w-[100px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {templates.map((template) => (
            <TableRow key={template.id}>
              <TableCell>
                <div>
                  <p className="font-medium">{template.name}</p>
                  <p className="text-sm text-muted-foreground">{template.subject}</p>
                </div>
              </TableCell>
              <TableCell>
                {getCategoryBadge(template.category)}
              </TableCell>
              <TableCell>
                {getStatusBadge(template.status)}
              </TableCell>
              <TableCell>
                <Badge variant="outline">v{template.version}</Badge>
              </TableCell>
              <TableCell>
                <div>
                  <p className="text-sm">
                    {format(new Date(template.updatedAt), 'MMM d, yyyy')}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    by {template.updatedBy.name}
                  </p>
                </div>
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      {loading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <MoreVertical className="h-4 w-4" />
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onEdit(template)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onDuplicate(template.id)}>
                      <Copy className="h-4 w-4 mr-2" />
                      Duplicate
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleExportHtml(template)}>
                      <Download className="h-4 w-4 mr-2" />
                      Export HTML
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Restore Default
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}