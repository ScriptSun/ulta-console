import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, CheckCircle, Plus, Copy, FileText } from 'lucide-react';
import { BatchCodeEditor } from './BatchCodeEditor';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface BatchVariant {
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

interface BatchOSVariantsEditorProps {
  batchId: string;
  osTargets: string[];
  canEdit: boolean;
  canActivate: boolean;
  onSuccess?: () => void;
}

export function BatchOSVariantsEditor({ 
  batchId, 
  osTargets, 
  canEdit, 
  canActivate, 
  onSuccess 
}: BatchOSVariantsEditorProps) {
  const [variants, setVariants] = useState<BatchVariant[]>([]);
  const [selectedOs, setSelectedOs] = useState<string>(osTargets[0] || '');
  const [loading, setLoading] = useState(false);
  const [variantSources, setVariantSources] = useState<Record<string, string>>({});
  const [variantNotes, setVariantNotes] = useState<Record<string, string>>({});
  
  const { toast } = useToast();

  // Fetch variants when component mounts or batchId changes
  useEffect(() => {
    if (batchId && osTargets?.length > 0) {
      fetchVariants();
    }
  }, [batchId, osTargets?.length]);

  const fetchVariants = async () => {
    if (!batchId) return;
    
    setLoading(true);
    try {
      // Always use direct database query for better reliability
      const { data: directData, error: directError } = await supabase
        .from('script_batch_variants')
        .select(`
          id,
          batch_id,
          os,
          version,
          sha256,
          source,
          notes,
          active,
          min_os_version,
          created_at,
          created_by
        `)
        .eq('batch_id', batchId)
        .order('os')
        .order('version', { ascending: false });

      if (directError) {
        console.error('Database error:', directError);
        throw new Error(`Database error: ${directError.message}`);
      }

      // Set variants with empty array as fallback
      setVariants((directData || []) as BatchVariant[]);
      
      // Clear any previous error state
      console.log(`Loaded ${directData?.length || 0} variants for batch ${batchId}`);
      
    } catch (error) {
      console.error('Error fetching variants:', error);
      // Set empty array on error to prevent undefined state
      setVariants([]);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to load batch variants',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

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

  const handleCreateVariant = async (os: string, sourceFromOs?: string) => {
    if (!canEdit) return;
    
    setLoading(true);
    try {
      let source = variantSources[os] || '';
      
      // If duplicating from another OS, get the source
      if (sourceFromOs) {
        const sourceVariant = getVariantStatus(sourceFromOs).variant;
        source = sourceVariant?.source || '';
      }

      // Default source if empty
      if (!source) {
        source = `#!/bin/bash
# ${os.charAt(0).toUpperCase() + os.slice(1)} script for batch
echo "Running on ${os}"
`;
      }

      // Calculate SHA256 and size
      const encoder = new TextEncoder();
      const data = encoder.encode(source);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const sha256 = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      const size_bytes = data.length;

      // Use direct database insertion for reliability
      const { data: newVariant, error } = await supabase
        .from('script_batch_variants')
        .insert({
          batch_id: batchId,
          os,
          source,
          notes: variantNotes[os] || `Initial ${os} variant`,
          min_os_version: null,
          version: 1,
          active: false,
          sha256,
          size_bytes
        })
        .select()
        .single();

      if (error) {
        console.error('Database error:', error);
        throw new Error(`Failed to create variant: ${error.message}`);
      }

      toast({
        title: 'Variant Created',
        description: `${os.charAt(0).toUpperCase() + os.slice(1)} variant created successfully`,
      });

      // Refresh variants
      await fetchVariants();
      onSuccess?.();
    } catch (error) {
      console.error('Error creating variant:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create variant',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSourceChange = (source: string) => {
    setVariantSources(prev => ({ ...prev, [selectedOs]: source }));
  };

  const handleNotesChange = (notes: string) => {
    setVariantNotes(prev => ({ ...prev, [selectedOs]: notes }));
  };

  const handleCreateVersion = async (os: string) => {
    if (!canEdit) return;
    
    const source = variantSources[os];
    const notes = variantNotes[os];
    
    if (!source) {
      toast({
        title: 'Error',
        description: 'Please add source code before creating version',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      // Get next version number
      const { data: existingVersions } = await supabase
        .from('script_batch_variants')
        .select('version')
        .eq('batch_id', batchId)
        .eq('os', os)
        .order('version', { ascending: false })
        .limit(1);

      const nextVersion = (existingVersions?.[0]?.version || 0) + 1;

      // Calculate SHA256 and size
      const encoder = new TextEncoder();
      const data = encoder.encode(source);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const sha256 = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      const size_bytes = data.length;

      // Create new version using direct database insertion
      const { data: newVersion, error } = await supabase
        .from('script_batch_variants')
        .insert({
          batch_id: batchId,
          os,
          source,
          notes: notes || `Version ${nextVersion} for ${os}`,
          min_os_version: null,
          version: nextVersion,
          active: false,
          sha256,
          size_bytes
        })
        .select()
        .single();

      if (error) {
        console.error('Database error:', error);
        throw new Error(`Failed to create version: ${error.message}`);
      }

      toast({
        title: 'Version Created',
        description: `Version ${nextVersion} created for ${os}`,
      });

      // Clear local state
      setVariantSources(prev => ({ ...prev, [os]: '' }));
      setVariantNotes(prev => ({ ...prev, [os]: '' }));
      
      // Refresh variants
      await fetchVariants();
      onSuccess?.();
    } catch (error) {
      console.error('Error creating version:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create version',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Safe variable access with null checks
  const currentVariant = selectedOs ? getVariantStatus(selectedOs) : { status: 'missing', version: null, variant: null };
  const missingOSes = osTargets?.filter(os => getVariantStatus(os).status === 'missing') || [];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-3 w-3 text-green-500" />;
      case 'draft':
        return <AlertTriangle className="h-3 w-3 text-blue-500" />;
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
        return 'bg-muted/50 text-muted-foreground border-muted';
    }
  };

  // Handle loading and empty states
  if (loading && variants.length === 0) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-muted-foreground">
            Loading batch variants...
          </div>
        </CardContent>
      </Card>
    );
  }

  // Handle case where no OS targets are provided
  if (!osTargets?.length) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-muted-foreground">
            No OS targets configured for this batch
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with missing variants indicator */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium">OS Variants</h3>
          {missingOSes.length > 0 && (
            <Badge variant="outline" className="text-orange-600 border-orange-200">
              {missingOSes.length} missing
            </Badge>
          )}
        </div>
      </div>

      {/* OS Variant Tabs */}
      <Tabs value={selectedOs} onValueChange={setSelectedOs}>
        <TabsList className="w-full">
          {osTargets.map(os => {
            const status = getVariantStatus(os);
            return (
              <TabsTrigger key={os} value={os} className="relative flex-1">
                <div className="flex items-center gap-2">
                  {getStatusIcon(status.status)}
                  <span className="capitalize">{os}</span>
                  {status.version && (
                    <Badge variant="outline" className="text-xs">
                      v{status.version}
                    </Badge>
                  )}
                </div>
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
                    <p className="text-sm text-orange-700 mb-4">
                      This OS is targeted but has no script variant
                    </p>
                    {canEdit && (
                      <div className="flex justify-center gap-2">
                        <Button 
                          onClick={() => handleCreateVariant(os)}
                          size="sm"
                          disabled={loading}
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Create Variant
                        </Button>
                        {variants.length > 0 && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              const sourceOs = variants[0]?.os;
                              if (sourceOs) handleCreateVariant(os, sourceOs);
                            }}
                            disabled={loading}
                          >
                            <Copy className="h-3 w-3 mr-1" />
                            Copy from {variants[0]?.os}
                          </Button>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {/* Current Variant Info */}
                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm capitalize">
                          {os} v{status.version}
                        </CardTitle>
                        <Badge className={getStatusColor(status.status)}>
                          {status.status === 'active' ? 'Active' : 'Draft'}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="text-sm">
                        <span className="text-muted-foreground">SHA256:</span>
                        <p className="font-mono text-xs mt-1 p-2 bg-muted rounded break-all">
                          {status.variant?.sha256}
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Script Source Editor */}
                  <div className="space-y-6">
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
                    
                    {canEdit && (
                      <Card className="border-dashed bg-muted/20">
                        <CardContent className="p-6">
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                                <FileText className="h-4 w-4" />
                                Version Notes
                              </label>
                              <textarea
                                value={variantNotes[os] || ''}
                                onChange={(e) => handleNotesChange(e.target.value)}
                                placeholder="Describe changes in this version..."
                                className="w-full min-h-[80px] p-3 bg-background/50 border border-input rounded-md resize-y text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                                rows={3}
                              />
                            </div>
                            <div className="flex justify-end pt-2">
                              <Button
                                onClick={() => handleCreateVersion(os)}
                                disabled={!variantSources[os] || loading}
                                className="px-6"
                              >
                                Create New Version
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </div>
              )}
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}