import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, CheckCircle, Plus, Copy, FileText, Hash } from 'lucide-react';
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
        return <CheckCircle className="h-4 w-4 text-success" />;
      case 'draft':
        return <AlertTriangle className="h-4 w-4 text-primary" />;
      case 'missing':
        return <AlertTriangle className="h-4 w-4 text-warning" />;
      default:
        return null;
    }
  };

  // Handle loading and empty states
  if (loading && variants.length === 0) {
    return (
      <Card className="bg-card border-border">
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
      <Card className="bg-card border-border">
        <CardContent className="py-8">
          <div className="text-center text-muted-foreground">
            No OS targets configured for this batch
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      {/* Modern Header Section */}
      <div className="bg-gradient-to-r from-card to-muted/30 border border-border rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-xl bg-primary flex items-center justify-center shadow-lg">
              <FileText className="h-7 w-7 text-primary-foreground" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-foreground">OS Script Variants</h2>
              <p className="text-muted-foreground text-lg">
                Manage platform-specific script implementations
              </p>
            </div>
          </div>
          {missingOSes.length > 0 && (
            <div className="flex items-center gap-2 px-4 py-2 bg-warning/10 border border-warning/20 rounded-lg">
              <AlertTriangle className="h-4 w-4 text-warning" />
              <span className="text-sm font-semibold text-warning">
                {missingOSes.length} variant{missingOSes.length > 1 ? 's' : ''} missing
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Enhanced OS Tabs Section */}
      <Tabs value={selectedOs} onValueChange={setSelectedOs} className="w-full">
        <div className="p-2 bg-muted/20 border border-border rounded-xl">
          <TabsList className="grid w-full bg-transparent gap-1" style={{ gridTemplateColumns: `repeat(${osTargets.length}, 1fr)` }}>
            {osTargets.map(os => {
              const status = getVariantStatus(os);
              return (
                <TabsTrigger 
                  key={os} 
                  value={os} 
                  className="data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-md data-[state=active]:border data-[state=active]:border-border text-muted-foreground hover:text-foreground transition-all duration-200 rounded-lg p-3"
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-md ${
                      status.status === 'active' ? 'bg-success/20' :
                      status.status === 'draft' ? 'bg-primary/20' : 'bg-warning/20'
                    }`}>
                      {getStatusIcon(status.status)}
                    </div>
                    <div className="text-left">
                      <div className="font-semibold capitalize">{os}</div>
                      {status.version && (
                        <div className="text-xs opacity-70">v{status.version}</div>
                      )}
                    </div>
                  </div>
                </TabsTrigger>
              );
            })}
          </TabsList>
        </div>

        {/* Tab Content */}
        {osTargets.map(os => {
          const status = getVariantStatus(os);
          
          return (
            <TabsContent key={os} value={os} className="space-y-8 mt-8">
              {status.status === 'missing' ? (
                /* Missing Variant State */
                <Card className="bg-gradient-to-br from-warning/5 to-warning/10 border-2 border-dashed border-warning/30">
                  <CardContent className="p-12 text-center">
                    <div className="max-w-md mx-auto space-y-6">
                      <div className="relative">
                        <div className="h-20 w-20 mx-auto rounded-2xl bg-warning/20 border border-warning/30 flex items-center justify-center">
                          <AlertTriangle className="h-10 w-10 text-warning" />
                        </div>
                      </div>
                      <div className="space-y-3">
                        <h3 className="text-2xl font-bold text-foreground">
                          Missing {os.charAt(0).toUpperCase() + os.slice(1)} Variant
                        </h3>
                        <p className="text-muted-foreground text-lg leading-relaxed">
                          This operating system is targeted but lacks a script variant. Create one now to ensure seamless cross-platform deployment.
                        </p>
                      </div>
                      {canEdit && (
                        <div className="flex justify-center gap-4 pt-4">
                          <Button 
                            onClick={() => handleCreateVariant(os)}
                            disabled={loading}
                            size="lg"
                            className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg px-8"
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Create Variant
                          </Button>
                          {variants.length > 0 && (
                            <Button 
                              variant="outline" 
                              onClick={() => {
                                const sourceOs = variants[0]?.os;
                                if (sourceOs) handleCreateVariant(os, sourceOs);
                              }}
                              disabled={loading}
                              size="lg"
                              className="border-border text-foreground hover:bg-accent px-8"
                            >
                              <Copy className="h-4 w-4 mr-2" />
                              Copy from {variants[0]?.os}
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-8">
                  {/* Enhanced Current Variant Info */}
                  <Card className="bg-gradient-to-br from-card to-muted/10 border border-border shadow-lg">
                    <CardHeader className="pb-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={`h-16 w-16 rounded-2xl flex items-center justify-center shadow-lg ${
                            status.status === 'active' 
                              ? 'bg-success text-success-foreground' 
                              : 'bg-primary text-primary-foreground'
                          }`}>
                            <span className="font-bold text-2xl capitalize">{os[0]}</span>
                          </div>
                          <div className="space-y-1">
                            <CardTitle className="text-2xl text-foreground capitalize">
                              {os} v{status.version}
                            </CardTitle>
                            <p className="text-muted-foreground text-lg">Script variant configuration</p>
                          </div>
                        </div>
                        <Badge 
                          variant={status.status === 'active' ? 'default' : 'secondary'}
                          className={`px-4 py-2 text-sm font-semibold ${status.status === 'active' 
                            ? 'bg-success text-success-foreground' 
                            : 'bg-secondary text-secondary-foreground'
                          }`}
                        >
                          {status.status === 'active' ? '✓ Active' : '◐ Draft'}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="p-4 bg-muted/30 rounded-lg border border-border">
                        <div className="flex items-center gap-2 mb-3">
                          <Hash className="h-5 w-5 text-muted-foreground" />
                          <span className="text-sm font-semibold text-foreground">SHA256 Hash</span>
                        </div>
                        <code className="font-mono text-xs break-all text-foreground block p-2 bg-background rounded border border-border">
                          {status.variant?.sha256}
                        </code>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Enhanced Script Source Editor */}
                  <Card className="bg-card border border-border shadow-lg">
                    <CardHeader className="border-b border-border bg-muted/20">
                      <CardTitle className="text-foreground flex items-center gap-3 text-xl">
                        <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                          <FileText className="h-4 w-4 text-primary-foreground" />
                        </div>
                        Script Source Editor
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="p-6">
                        <BatchCodeEditor
                          content={variantSources[os] || status.variant?.source || ''}
                          onChange={handleSourceChange}
                          readOnly={!canEdit}
                          className="border-0"
                        />
                      </div>
                    </CardContent>
                  </Card>
                  
                  {/* Enhanced Create New Version Section */}
                  {canEdit && (
                    <Card className="bg-gradient-to-br from-muted/20 to-muted/5 border-2 border-dashed border-primary/30 shadow-lg">
                      <CardHeader className="border-b border-dashed border-primary/20">
                        <div className="flex items-center gap-4">
                          <div className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center shadow-md">
                            <Plus className="h-6 w-6 text-primary-foreground" />
                          </div>
                          <div>
                            <CardTitle className="text-foreground text-xl">Create New Version</CardTitle>
                            <p className="text-muted-foreground">Document your changes and create a deployable version</p>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-6 p-6">
                        <div className="space-y-3">
                          <label className="block text-sm font-semibold text-foreground">
                            Version Documentation
                          </label>
                          <div className="relative">
                            <textarea
                              value={variantNotes[os] || ''}
                              onChange={(e) => handleNotesChange(e.target.value)}
                              placeholder="Document the changes, improvements, and deployment notes for this version..."
                              className="w-full min-h-[120px] p-4 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary resize-y shadow-inner"
                              rows={5}
                            />
                          </div>
                        </div>
                        <div className="flex justify-end pt-2">
                          <Button
                            onClick={() => handleCreateVersion(os)}
                            disabled={!variantSources[os] || loading}
                            size="lg"
                            className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg px-8"
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Deploy New Version
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}