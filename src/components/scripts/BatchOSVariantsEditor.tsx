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
    <div className="isolate space-y-12 relative">
      {/* Futuristic Background */}
      <div className="fixed inset-0 bg-gradient-to-br from-background via-background/95 to-muted/20 pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--primary)_0%,_transparent_50%)] opacity-[0.02] pointer-events-none" />
      
      {/* Ultra-Modern Header */}
      <div className="relative z-10">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/3 via-secondary/3 to-accent/3 rounded-[2rem] blur-3xl opacity-60" />
        <div className="relative bg-card/20 backdrop-blur-[40px] border border-white/10 rounded-[2rem] p-8 shadow-2xl shadow-primary/5">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-6">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-primary via-secondary to-accent rounded-2xl blur-lg opacity-30" />
                <div className="relative h-16 w-16 bg-gradient-to-br from-primary via-secondary to-accent rounded-2xl flex items-center justify-center shadow-xl">
                  <FileText className="h-8 w-8 text-white" />
                </div>
                <div className="absolute -top-1 -right-1 h-4 w-4 bg-green-400 rounded-full border-2 border-white animate-pulse" />
              </div>
              <div className="space-y-2">
                <h3 className="text-3xl font-bold font-space tracking-tight bg-gradient-to-r from-foreground via-foreground/90 to-foreground/70 bg-clip-text text-transparent">
                  OS Script Variants
                </h3>
                <p className="text-muted-foreground font-inter max-w-md leading-relaxed">
                  Deploy platform-optimized scripts with quantum-level precision across operating systems
                </p>
              </div>
            </div>
            {missingOSes.length > 0 && (
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-orange-500/20 to-amber-500/20 rounded-2xl blur-lg" />
                <div className="relative flex items-center gap-3 px-6 py-4 bg-gradient-to-r from-orange-500/10 to-amber-500/10 border border-orange-300/20 rounded-2xl backdrop-blur-sm">
                  <div className="h-6 w-6 bg-gradient-to-br from-orange-400 to-amber-400 rounded-lg flex items-center justify-center">
                    <AlertTriangle className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold font-space text-orange-300">
                      {missingOSes.length} variants missing
                    </div>
                    <div className="text-xs text-orange-400/70">
                      Action required
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Next-Gen OS Variant Tabs */}
      <Tabs value={selectedOs} onValueChange={setSelectedOs} className="w-full relative z-10">
        <div className="relative mb-12">
          <div className="absolute inset-0 bg-gradient-to-r from-card/30 via-card/20 to-card/30 rounded-[1.5rem] blur-2xl" />
          <div className="relative bg-card/10 backdrop-blur-[60px] border border-white/10 rounded-[1.5rem] p-3 shadow-2xl">
            <TabsList className="grid w-full grid-cols-auto gap-3 p-0 bg-transparent h-auto">
              {osTargets.map(os => {
                const status = getVariantStatus(os);
                return (
                  <TabsTrigger 
                    key={os} 
                    value={os} 
                    className="relative flex-1 px-8 py-6 rounded-[1rem] transition-all duration-500 hover:scale-[1.02] group data-[state=active]:bg-gradient-to-br data-[state=active]:from-primary data-[state=active]:via-secondary data-[state=active]:to-accent data-[state=active]:text-white data-[state=active]:shadow-2xl data-[state=active]:shadow-primary/25 bg-card/20 border border-white/5"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`relative p-3 rounded-xl transition-all duration-300 ${
                        status.status === 'active' ? 'bg-white/20' :
                        status.status === 'draft' ? 'bg-blue-500/20' : 'bg-orange-500/20'
                      }`}>
                        <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/10 to-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        {getStatusIcon(status.status)}
                      </div>
                      <div className="flex flex-col items-start gap-1">
                        <span className="font-bold font-space text-lg capitalize tracking-wide">{os}</span>
                        {status.version && (
                          <span className="text-xs font-jetbrains opacity-60 font-medium">v{status.version}</span>
                        )}
                      </div>
                    </div>
                    <div className="absolute inset-0 rounded-[1rem] bg-gradient-to-br from-white/5 to-white/2 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </div>
        </div>

        {osTargets.map(os => {
          const status = getVariantStatus(os);
          
          return (
            <TabsContent key={os} value={os} className="relative z-10 mt-0">
              {status.status === 'missing' ? (
                <div className="relative group mb-12">
                  <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 via-amber-500/10 to-red-500/10 rounded-[2rem] blur-3xl opacity-60 group-hover:opacity-80 transition-opacity duration-700" />
                  <div className="relative bg-card/10 backdrop-blur-[60px] border border-orange-300/20 rounded-[2rem] p-12 shadow-2xl overflow-hidden">
                    <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-orange-400 via-amber-400 to-red-400 opacity-60" />
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,_rgba(251,146,60,0.1)_0%,_transparent_50%)]" />
                    
                    <div className="relative text-center space-y-8">
                      <div className="relative mx-auto w-24 h-24">
                        <div className="absolute inset-0 bg-gradient-to-br from-orange-400 via-amber-400 to-red-400 rounded-3xl blur-xl opacity-40 animate-pulse" />
                        <div className="relative h-full w-full bg-gradient-to-br from-orange-400 via-amber-400 to-red-400 rounded-3xl flex items-center justify-center shadow-2xl shadow-orange-500/30">
                          <AlertTriangle className="h-12 w-12 text-white" />
                        </div>
                        <div className="absolute -top-2 -right-2 h-8 w-8 bg-red-500 rounded-full border-4 border-white flex items-center justify-center animate-bounce">
                          <span className="text-white text-xs font-bold">!</span>
                        </div>
                      </div>
                      
                      <div className="space-y-4">
                        <h4 className="text-3xl font-bold font-space bg-gradient-to-r from-orange-300 via-amber-300 to-red-300 bg-clip-text text-transparent">
                          Missing {os.charAt(0).toUpperCase() + os.slice(1)} Variant
                        </h4>
                        <p className="text-muted-foreground font-inter max-w-lg mx-auto leading-relaxed text-lg">
                          This operating system is targeted but lacks a script variant. Create one now to ensure seamless cross-platform deployment.
                        </p>
                      </div>
                      
                      {canEdit && (
                        <div className="flex justify-center gap-6 pt-6">
                          <Button 
                            onClick={() => handleCreateVariant(os)}
                            size="lg"
                            disabled={loading}
                            className="relative px-10 py-4 bg-gradient-to-r from-orange-500 via-amber-500 to-red-500 hover:from-orange-400 hover:via-amber-400 hover:to-red-400 text-white font-space font-semibold text-lg shadow-2xl shadow-orange-500/30 transition-all duration-500 hover:scale-105 rounded-2xl border-0"
                          >
                            <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-white/10 rounded-2xl opacity-0 hover:opacity-100 transition-opacity duration-300" />
                            <Plus className="h-5 w-5 mr-3" />
                            Create Variant
                          </Button>
                          {variants.length > 0 && (
                            <Button 
                              variant="outline" 
                              size="lg"
                              onClick={() => {
                                const sourceOs = variants[0]?.os;
                                if (sourceOs) handleCreateVariant(os, sourceOs);
                              }}
                              disabled={loading}
                              className="relative px-10 py-4 bg-card/20 backdrop-blur-sm border-2 border-orange-300/30 hover:border-orange-400/50 hover:bg-orange-500/10 text-orange-300 hover:text-orange-200 font-space font-semibold text-lg transition-all duration-500 hover:scale-105 rounded-2xl"
                            >
                              <Copy className="h-5 w-5 mr-3" />
                              Copy from {variants[0]?.os}
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-12 relative z-10">
                  {/* Ultra-Modern Current Variant Info */}
                  <div className="relative group">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-secondary/10 to-accent/10 rounded-[2rem] blur-3xl opacity-60 group-hover:opacity-80 transition-opacity duration-700" />
                    <div className="relative bg-card/10 backdrop-blur-[60px] border border-white/10 rounded-[2rem] p-8 shadow-2xl overflow-hidden">
                      <div className={`absolute top-0 left-0 right-0 h-2 ${
                        status.status === 'active' 
                          ? 'bg-gradient-to-r from-emerald-400 via-green-400 to-teal-400' 
                          : 'bg-gradient-to-r from-blue-400 via-cyan-400 to-indigo-400'
                      } opacity-60`} />
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,_rgba(59,130,246,0.05)_0%,_transparent_50%)]" />
                      
                      <div className="relative">
                        <div className="flex items-start justify-between mb-8">
                          <div className="flex items-center gap-6">
                            <div className="relative">
                              <div className={`absolute inset-0 rounded-3xl blur-xl opacity-40 ${
                                status.status === 'active' 
                                  ? 'bg-gradient-to-br from-emerald-500 to-green-500' 
                                  : 'bg-gradient-to-br from-blue-500 to-cyan-500'
                              }`} />
                              <div className={`relative h-20 w-20 rounded-3xl flex items-center justify-center shadow-2xl ${
                                status.status === 'active' 
                                  ? 'bg-gradient-to-br from-emerald-500 to-green-500 shadow-emerald-500/30' 
                                  : 'bg-gradient-to-br from-blue-500 to-cyan-500 shadow-blue-500/30'
                              }`}>
                                <span className="text-white font-bold text-2xl font-space uppercase">{os[0]}</span>
                              </div>
                              <div className={`absolute -top-2 -right-2 h-6 w-6 rounded-full border-4 border-white ${
                                status.status === 'active' ? 'bg-emerald-400 animate-pulse' : 'bg-blue-400'
                              }`} />
                            </div>
                            <div className="space-y-2">
                              <h3 className="text-3xl font-bold font-space capitalize tracking-wide bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                                {os} v{status.version}
                              </h3>
                              <p className="text-muted-foreground font-inter text-lg">
                                Advanced script configuration
                              </p>
                            </div>
                          </div>
                          <div className={`relative px-6 py-3 rounded-2xl font-bold font-space text-sm backdrop-blur-sm ${
                            status.status === 'active'
                              ? 'bg-gradient-to-r from-emerald-500/20 to-green-500/20 text-emerald-300 border border-emerald-300/30'
                              : 'bg-gradient-to-r from-blue-500/20 to-cyan-500/20 text-blue-300 border border-blue-300/30'
                          }`}>
                            <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-white/10 to-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                            {status.status === 'active' ? '⚡ ACTIVE' : '⚙️ DRAFT'}
                          </div>
                        </div>
                        
                        <div className="space-y-6">
                          <div className="relative">
                            <div className="flex items-center gap-3 mb-4">
                              <Hash className="h-5 w-5 text-muted-foreground" />
                              <span className="font-semibold font-space text-lg text-muted-foreground">Cryptographic Hash</span>
                            </div>
                            <div className="relative group/hash">
                              <div className="absolute inset-0 bg-gradient-to-r from-muted/30 to-muted/10 rounded-2xl blur-lg opacity-0 group-hover/hash:opacity-100 transition-opacity duration-300" />
                              <div className="relative bg-gradient-to-r from-muted/20 to-muted/5 backdrop-blur-sm p-6 rounded-2xl border border-white/10">
                                <code className="font-jetbrains text-sm break-all text-foreground/90 leading-relaxed tracking-wide">
                                  {status.variant?.sha256}
                                </code>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Revolutionary Script Source Editor */}
                  <div className="relative group mb-12">
                    <div className="absolute inset-0 bg-gradient-to-br from-accent/10 via-primary/10 to-secondary/10 rounded-[2rem] blur-3xl opacity-60 group-hover:opacity-80 transition-opacity duration-700" />
                    <div className="relative bg-card/10 backdrop-blur-[60px] border border-white/10 rounded-[2rem] p-8 shadow-2xl overflow-hidden">
                      <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-accent via-primary to-secondary opacity-60" />
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,_rgba(99,102,241,0.05)_0%,_transparent_50%)]" />
                      
                      <div className="relative">
                        <div className="flex items-center gap-4 mb-8">
                          <div className="relative">
                            <div className="absolute inset-0 bg-gradient-to-br from-accent via-primary to-secondary rounded-2xl blur-lg opacity-40" />
                            <div className="relative h-16 w-16 bg-gradient-to-br from-accent via-primary to-secondary rounded-2xl flex items-center justify-center shadow-xl">
                              <FileText className="h-8 w-8 text-white" />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <h3 className="text-2xl font-bold font-space bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                              Script Source Editor
                            </h3>
                            <p className="text-muted-foreground font-inter text-lg">
                              Quantum-powered code editing with real-time validation
                            </p>
                          </div>
                        </div>
                        
                        <div className="relative">
                          <div className="absolute inset-0 bg-gradient-to-br from-muted/20 to-muted/5 rounded-3xl blur-lg opacity-50" />
                          <div className="relative bg-background/30 backdrop-blur-sm rounded-3xl border border-white/10 p-2 shadow-inner">
                            <BatchCodeEditor
                              content={variantSources[os] || status.variant?.source || ''}
                              onChange={handleSourceChange}
                              readOnly={!canEdit}
                              className="w-full rounded-2xl overflow-hidden"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {canEdit && (
                    <div className="relative group">
                      <div className="absolute inset-0 bg-gradient-to-br from-secondary/10 via-accent/10 to-primary/10 rounded-[2rem] blur-3xl opacity-60 group-hover:opacity-80 transition-opacity duration-700" />
                      <div className="relative bg-card/10 backdrop-blur-[60px] border-2 border-dashed border-primary/30 rounded-[2rem] p-10 shadow-2xl overflow-hidden">
                        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-secondary via-accent to-primary opacity-60" />
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_100%,_rgba(168,85,247,0.05)_0%,_transparent_50%)]" />
                        
                        <div className="relative space-y-8">
                          <div className="flex items-center gap-4">
                            <div className="relative">
                              <div className="absolute inset-0 bg-gradient-to-br from-secondary via-accent to-primary rounded-2xl blur-lg opacity-40" />
                              <div className="relative h-16 w-16 bg-gradient-to-br from-secondary via-accent to-primary rounded-2xl flex items-center justify-center shadow-xl">
                                <FileText className="h-8 w-8 text-white" />
                              </div>
                              <div className="absolute -top-1 -right-1 h-6 w-6 bg-green-400 rounded-full border-2 border-white flex items-center justify-center">
                                <span className="text-white text-xs font-bold">+</span>
                              </div>
                            </div>
                            <div className="space-y-2">
                              <h4 className="text-2xl font-bold font-space bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                                Create New Version
                              </h4>
                              <p className="text-muted-foreground font-inter text-lg">
                                Archive your changes and deploy with confidence
                              </p>
                            </div>
                          </div>
                          
                          <div className="space-y-6">
                            <div>
                              <label className="block text-lg font-bold font-space text-foreground mb-4">
                                Version Documentation
                              </label>
                              <div className="relative">
                                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-secondary/5 rounded-3xl blur-lg opacity-0 hover:opacity-100 transition-opacity duration-500" />
                                <textarea
                                  value={variantNotes[os] || ''}
                                  onChange={(e) => handleNotesChange(e.target.value)}
                                  placeholder="Document your changes, improvements, and deployment notes..."
                                  className="relative w-full min-h-[120px] p-6 bg-background/20 backdrop-blur-sm border border-white/10 rounded-3xl resize-none text-base font-inter placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all duration-500 shadow-inner"
                                  rows={5}
                                />
                              </div>
                            </div>
                            
                            <div className="flex justify-end pt-6">
                              <Button
                                onClick={() => handleCreateVersion(os)}
                                disabled={!variantSources[os] || loading}
                                size="lg"
                                className="relative px-12 py-4 bg-gradient-to-r from-primary via-secondary to-accent hover:from-primary/90 hover:via-secondary/90 hover:to-accent/90 text-white font-space font-bold text-lg shadow-2xl shadow-primary/30 transition-all duration-500 hover:scale-105 rounded-2xl border-0"
                              >
                                <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-white/10 rounded-2xl opacity-0 hover:opacity-100 transition-opacity duration-300" />
                                <span className="relative z-10">Deploy New Version</span>
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
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