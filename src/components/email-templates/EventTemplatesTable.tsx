import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  MoreHorizontal,
  Edit,
  Copy,
  Archive,
  TestTube,
  Search,
  Filter,
  Plus,
  Zap
} from 'lucide-react';
import { EmailTemplate } from '@/types/eventTypes';
import { formatDistanceToNow } from 'date-fns';

interface EventTemplatesTableProps {
  templates: EmailTemplate[];
  onEdit: (template: EmailTemplate) => void;
  onDuplicate: (templateId: string) => void;
  onArchive: (templateId: string) => void;
  onTest: (template: EmailTemplate) => void;
  onSeedTemplates: () => void;
  loading?: boolean;
}

const CATEGORIES = [
  { key: 'security', label: 'Security', color: 'bg-red-100 text-red-800' },
  { key: 'account', label: 'Account', color: 'bg-blue-100 text-blue-800' },
  { key: 'agents', label: 'Agents', color: 'bg-green-100 text-green-800' },
  { key: 'billing', label: 'Billing', color: 'bg-purple-100 text-purple-800' },
  { key: 'system', label: 'System', color: 'bg-gray-100 text-gray-800' },
];

const STATUS_COLORS = {
  active: 'bg-green-100 text-green-800',
  draft: 'bg-yellow-100 text-yellow-800',
  archived: 'bg-gray-100 text-gray-800'
};

export default function EventTemplatesTable({
  templates,
  onEdit,
  onDuplicate,
  onArchive,
  onTest,
  onSeedTemplates,
  loading
}: EventTemplatesTableProps) {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedLocale, setSelectedLocale] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = !searchQuery || 
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.subject.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory;
    const matchesLocale = selectedLocale === 'all' || template.locale === selectedLocale;
    const matchesStatus = selectedStatus === 'all' || template.status === selectedStatus;
    
    return matchesSearch && matchesCategory && matchesLocale && matchesStatus;
  });

  const getUsedByBadges = (templateId: string) => {
    // This would be populated with actual usage data
    // For now, showing placeholder
    return [];
  };

  const getCategoryBadge = (category: string) => {
    const categoryConfig = CATEGORIES.find(c => c.key === category);
    if (!categoryConfig) return null;

    return (
      <Badge variant="outline" className={`${categoryConfig.color} border-0`}>
        {categoryConfig.label}
      </Badge>
    );
  };

  const getStatusBadge = (status: string) => {
    return (
      <Badge variant="outline" className={`${STATUS_COLORS[status as keyof typeof STATUS_COLORS]} border-0`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const handleUsedByClick = (eventKey: string) => {
    // Navigate to notification routing filtered by this event
    navigate(`/system-settings/notifications?filter=${eventKey}`);
  };

  const availableLocales = [...new Set(templates.map(t => t.locale))];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-sm text-muted-foreground">Loading templates...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-1 min-w-64">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {CATEGORIES.map(category => (
                <SelectItem key={category.key} value={category.key}>
                  {category.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedLocale} onValueChange={setSelectedLocale}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Locale" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Locales</SelectItem>
              {availableLocales.map(locale => (
                <SelectItem key={locale} value={locale}>
                  {locale.toUpperCase()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={onSeedTemplates}>
            <Zap className="h-4 w-4 mr-2" />
            Seed from Events
          </Button>
          <Button onClick={() => onEdit({} as EmailTemplate)}>
            <Plus className="h-4 w-4 mr-2" />
            New Template
          </Button>
        </div>
      </div>

      {/* Table */}
      {filteredTemplates.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground">
            {templates.length === 0 ? 'No email templates found.' : 'No templates match the current filters.'}
          </p>
          {templates.length === 0 && (
            <Button variant="outline" onClick={onSeedTemplates} className="mt-4">
              <Zap className="h-4 w-4 mr-2" />
              Create Default Templates
            </Button>
          )}
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Key</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Locale</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Used by</TableHead>
              <TableHead>Updated</TableHead>
              <TableHead className="w-[50px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTemplates.map((template) => (
              <TableRow key={template.id}>
                <TableCell>
                  <div>
                    <div className="font-medium">{template.name}</div>
                    <div className="text-sm text-muted-foreground">{template.subject}</div>
                  </div>
                </TableCell>
                <TableCell>
                  <code className="text-xs bg-muted px-2 py-1 rounded">
                    {template.key}
                  </code>
                </TableCell>
                <TableCell>
                  {getCategoryBadge(template.category)}
                </TableCell>
                <TableCell>
                  <Badge variant="outline">
                    {template.locale.toUpperCase()}
                  </Badge>
                </TableCell>
                <TableCell>
                  {getStatusBadge(template.status)}
                </TableCell>
                <TableCell>
                  <div className="flex gap-1 flex-wrap">
                    {getUsedByBadges(template.id).map((eventKey: string, index: number) => (
                      <Badge 
                        key={index}
                        variant="secondary" 
                        className="cursor-pointer hover:bg-muted-foreground/20"
                        onClick={() => handleUsedByClick(eventKey)}
                      >
                        {eventKey}
                      </Badge>
                    ))}
                    {getUsedByBadges(template.id).length === 0 && (
                      <span className="text-sm text-muted-foreground">Not used</span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-sm text-muted-foreground">
                    {(() => {
                      if (!template.updatedAt) return 'Never';
                      const date = new Date(template.updatedAt);
                      if (isNaN(date.getTime())) return 'Invalid date';
                      return formatDistanceToNow(date, { addSuffix: true });
                    })()}
                  </div>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => navigate(`/system-settings/brand/email/events/edit/${template.id}`)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onTest(template)}>
                        <TestTube className="h-4 w-4 mr-2" />
                        Send Test
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onDuplicate(template.id)}>
                        <Copy className="h-4 w-4 mr-2" />
                        Duplicate
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={() => onArchive(template.id)} 
                        className="text-destructive"
                      >
                        <Archive className="h-4 w-4 mr-2" />
                        Archive
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}