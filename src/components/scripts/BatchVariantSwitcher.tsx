import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Plus, Copy, Monitor, AlertTriangle, CheckCircle } from 'lucide-react';
import { BatchCodeEditor } from './BatchCodeEditor';

export interface BatchVariant {
  id: string;
  batch_id: string;
  os: string;
  version: number;
  sha256: string;
  source: string;
  notes?: string;
  active: boolean;
  min_os_version?: string;
  created_at: string;
  created_by: string;
}

interface BatchVariantSwitcherProps {
  batchId: string;
  osTargets: string[];
  variants: BatchVariant[];
  onVariantChange: (os: string, source: string, notes?: string) => void;
  onCreateVersion: (os: string) => void;
  onActivateVersion: (os: string, version: number) => void;
  onAddVariant: (os: string, sourceFromOs?: string) => void;
  canEdit: boolean;
  canActivate: boolean;
}

export function BatchVariantSwitcher({
  batchId,
  osTargets,
  variants,
  onVariantChange,
  onCreateVersion,
  onActivateVersion,
  onAddVariant,
  canEdit,
  canActivate
}: BatchVariantSwitcherProps) {
  const [selectedOs, setSelectedOs] = useState<string>(osTargets[0] || '');
  const [variantSources, setVariantSources] = useState<Record<string, string>>({});
  const [variantNotes, setVariantNotes] = useState<Record<string, string>>({});

  // Get variant status for each OS
  const getVariantStatus = (os: string) => {
    const activeVariant = variants.find(v => v.os === os && v.active);
    const hasVariants = variants.some(v => v.os === os);
    
    if (activeVariant) {
      return { status: 'active', version: activeVariant.version, variant: activeVariant };
    } else if (hasVariants) {
      const latestVariant = variants
        .filter(v => v.os === os)
        .sort((a, b) => b.version - a.version)[0];
      return { status: 'draft', version: latestVariant.version, variant: latestVariant };
    }
    return { status: 'missing', version: null, variant: null };
  };

  const currentVariant = getVariantStatus(selectedOs);
  const missingOSes = osTargets.filter(os => getVariantStatus(os).status === 'missing');

  const handleSourceChange = (source: string) => {
    setVariantSources(prev => ({ ...prev, [selectedOs]: source }));
    onVariantChange(selectedOs, source, variantNotes[selectedOs]);
  };

  const handleNotesChange = (notes: string) => {
    setVariantNotes(prev => ({ ...prev, [selectedOs]: notes }));
    onVariantChange(selectedOs, variantSources[selectedOs] || currentVariant.variant?.source || '', notes);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-3 w-3 text-green-500" />;
      case 'draft':
        return <Monitor className="h-3 w-3 text-blue-500" />;
      case 'missing':
        return <AlertTriangle className="h-3 w-3 text-orange-500" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'draft':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'missing':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="space-y-4">
      {/* OS Targets Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium">OS Variants</h3>
          {missingOSes.length > 0 && (
            <Badge variant="outline" className="text-orange-600 border-orange-200">
              {missingOSes.length} missing
            </Badge>
          )}
        </div>
        {canEdit && missingOSes.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Plus className="h-3 w-3 mr-1" />
                Add OS Variant
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {missingOSes.map(os => (
                <DropdownMenuItem key={os} onClick={() => onAddVariant(os)}>
                  Add {os.charAt(0).toUpperCase() + os.slice(1)} variant
                </DropdownMenuItem>
              ))}
              {missingOSes.length > 0 && variants.length > 0 && (
                <>
                  <DropdownMenuItem disabled>
                    ──────────
                  </DropdownMenuItem>
                  {missingOSes.map(os => (
                    <DropdownMenu key={os}>
                      <DropdownMenuTrigger asChild>
                        <DropdownMenuItem>
                          <Copy className="h-3 w-3 mr-2" />
                          Duplicate for {os.charAt(0).toUpperCase() + os.slice(1)}
                        </DropdownMenuItem>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent side="right">
                        {Array.from(new Set(variants.map(v => v.os))).map(sourceOs => (
                          <DropdownMenuItem
                            key={sourceOs}
                            onClick={() => onAddVariant(os, sourceOs)}
                          >
                            From {sourceOs.charAt(0).toUpperCase() + sourceOs.slice(1)}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ))}
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* OS Tabs */}
      <Tabs value={selectedOs} onValueChange={setSelectedOs}>
        <TabsList className="w-full">
          {osTargets.map(os => {
            const status = getVariantStatus(os);
            return (
              <TabsTrigger key={os} value={os} className="relative">
                <div className="flex items-center gap-2">
                  {getStatusIcon(status.status)}
                  <span>{os.charAt(0).toUpperCase() + os.slice(1)}</span>
                  {status.version && (
                    <Badge variant="outline" className="text-xs">
                      v{status.version}
                    </Badge>
                  )}
                </div>
                <div className={`absolute -top-1 -right-1 h-2 w-2 rounded-full ${
                  status.status === 'active' ? 'bg-green-500' : 
                  status.status === 'draft' ? 'bg-blue-500' : 'bg-orange-500'
                }`} />
              </TabsTrigger>
            );
          })}
        </TabsList>

        {osTargets.map(os => {
          const status = getVariantStatus(os);
          
          return (
            <TabsContent key={os} value={os} className="space-y-4">
              {status.status === 'missing' ? (
                <Card>
                  <CardContent className="p-6 text-center">
                    <AlertTriangle className="h-8 w-8 text-orange-500 mx-auto mb-2" />
                    <h4 className="font-medium text-orange-900 mb-1">
                      No {os.charAt(0).toUpperCase() + os.slice(1)} variant
                    </h4>
                    <p className="text-sm text-orange-700 mb-3">
                      This OS is targeted but has no script variant
                    </p>
                    {canEdit && (
                      <div className="flex justify-center gap-2">
                        <Button 
                          onClick={() => onAddVariant(os)}
                          size="sm"
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Create Variant
                        </Button>
                        {variants.length > 0 && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="outline" size="sm">
                                <Copy className="h-3 w-3 mr-1" />
                                Duplicate From
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              {Array.from(new Set(variants.map(v => v.os))).map(sourceOs => (
                                <DropdownMenuItem
                                  key={sourceOs}
                                  onClick={() => onAddVariant(os, sourceOs)}
                                >
                                  {sourceOs.charAt(0).toUpperCase() + sourceOs.slice(1)}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {/* Variant Info */}
                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm">
                          {os.charAt(0).toUpperCase() + os.slice(1)} v{status.version}
                        </CardTitle>
                        <Badge className={getStatusColor(status.status)}>
                          {status.status === 'active' ? 'Active' : 'Draft'}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">SHA256:</span>
                          <p className="font-mono text-xs mt-1 p-2 bg-muted rounded">
                            {status.variant?.sha256}
                          </p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Min OS Version:</span>
                          <p className="mt-1">
                            {status.variant?.min_os_version || 'Any'}
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        {canEdit && (
                          <Button
                            onClick={() => onCreateVersion(os)}
                            size="sm"
                            disabled={!variantSources[os] && !currentVariant.variant}
                          >
                            Create Version
                          </Button>
                        )}
                        {canActivate && status.status === 'draft' && (
                          <Button
                            onClick={() => onActivateVersion(os, status.version!)}
                            variant="outline"
                            size="sm"
                          >
                            Activate v{status.version}
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Source Editor */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Script Source</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <BatchCodeEditor
                        content={variantSources[os] || status.variant?.source || ''}
                        onChange={handleSourceChange}
                        readOnly={!canEdit}
                      />
                    </CardContent>
                  </Card>

                  {/* Notes */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Version Notes</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <textarea
                        value={variantNotes[os] || status.variant?.notes || ''}
                        onChange={(e) => handleNotesChange(e.target.value)}
                        placeholder="Add notes about this version..."
                        className="w-full p-2 border rounded-md resize-none"
                        rows={3}
                        disabled={!canEdit}
                      />
                    </CardContent>
                  </Card>
                </div>
              )}
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}