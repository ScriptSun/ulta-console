import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Save, 
  Send, 
  Search, 
  Shield, 
  User, 
  Bot, 
  CreditCard, 
  Settings, 
  AlertTriangle, 
  Info, 
  AlertCircle,
  Plus,
  Trash2,
  GripVertical,
  TestTube
} from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

interface NotificationPolicy {
  id: string;
  customer_id: string;
  event_key: string;
  event_name: string;
  category: string;
  severity: 'info' | 'warning' | 'critical';
  channels: {
    email: boolean;
    telegram: boolean;
    slack: boolean;
    discord: boolean;
    sms: boolean;
    webhook: boolean;
    inapp: boolean;
  };
  escalation?: {
    enabled: boolean;
    threshold: { count: number; windowMinutes: number };
    channels: string[];
  };
  failover?: {
    enabled: boolean;
    order: string[];
  };
  environment: string;
  enabled: boolean;
}

interface ChannelAvailability {
  email: boolean;
  telegram: boolean;
  slack: boolean;
  discord: boolean;
  sms: boolean;
  webhook: boolean;
  inapp: boolean;
}

interface EventRoutingProps {
  channelAvailability: ChannelAvailability;
}

const CATEGORIES = [
  { key: 'security', label: 'Security', icon: Shield, color: 'bg-red-100 text-red-800' },
  { key: 'account', label: 'Account', icon: User, color: 'bg-blue-100 text-blue-800' },
  { key: 'agents', label: 'Agents', icon: Bot, color: 'bg-green-100 text-green-800' },
  { key: 'billing', label: 'Billing', icon: CreditCard, color: 'bg-purple-100 text-purple-800' },
  { key: 'system', label: 'System', icon: Settings, color: 'bg-gray-100 text-gray-800' },
];

const SEVERITIES = [
  { key: 'info', label: 'Info', icon: Info, color: 'bg-blue-100 text-blue-800' },
  { key: 'warning', label: 'Warning', icon: AlertTriangle, color: 'bg-yellow-100 text-yellow-800' },
  { key: 'critical', label: 'Critical', icon: AlertCircle, color: 'bg-red-100 text-red-800' },
];

const SYSTEM_CUSTOMER_ID = '00000000-0000-0000-0000-000000000001';

export default function EventRouting({ channelAvailability }: EventRoutingProps) {
  const { toast } = useToast();
  const [policies, setPolicies] = useState<NotificationPolicy[]>([]);
  const [filteredPolicies, setFilteredPolicies] = useState<NotificationPolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('');
  const [selectedPolicies, setSelectedPolicies] = useState<Set<string>>(new Set());
  const [hasChanges, setHasChanges] = useState(false);
  const [showTestDialog, setShowTestDialog] = useState(false);
  const [testEvent, setTestEvent] = useState('');
  const [testPayload, setTestPayload] = useState('{}');
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    loadPolicies();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [policies, searchQuery, selectedCategory, selectedSeverity]);

  const loadPolicies = async () => {
    try {
      const { data, error } = await supabase
        .from('notification_policies')
        .select('*')
        .eq('customer_id', SYSTEM_CUSTOMER_ID)
        .order('category', { ascending: true })
        .order('event_name', { ascending: true });

      if (error) throw error;

      setPolicies((data || []).map(policy => ({
        ...policy,
        severity: policy.severity as 'info' | 'warning' | 'critical',
        channels: policy.channels as NotificationPolicy['channels'],
        escalation: policy.escalation as NotificationPolicy['escalation'],
        failover: policy.failover as NotificationPolicy['failover']
      })));
    } catch (error) {
      console.error('Error loading notification policies:', error);
      toast({
        title: "Error loading policies",
        description: "Failed to load notification policies. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...policies];

    if (searchQuery) {
      filtered = filtered.filter(policy => 
        policy.event_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        policy.event_key.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (selectedCategory) {
      filtered = filtered.filter(policy => policy.category === selectedCategory);
    }

    if (selectedSeverity) {
      filtered = filtered.filter(policy => policy.severity === selectedSeverity);
    }

    setFilteredPolicies(filtered);
  };

  const updatePolicy = (policyId: string, updates: Partial<NotificationPolicy>) => {
    setPolicies(prev => prev.map(policy => 
      policy.id === policyId ? { ...policy, ...updates } : policy
    ));
    setHasChanges(true);
  };

  const updateChannels = (policyId: string, channelUpdates: Partial<NotificationPolicy['channels']>) => {
    const policy = policies.find(p => p.id === policyId);
    if (!policy) return;

    const updatedChannels = { ...policy.channels, ...channelUpdates };
    
    // Validate: At least one channel must be selected for critical events
    if (policy.severity === 'critical') {
      const hasActiveChannel = Object.values(updatedChannels).some(active => active);
      if (!hasActiveChannel) {
        toast({
          title: "Validation Error",
          description: "Critical events must have at least one channel selected.",
          variant: "destructive",
        });
        return;
      }
    }

    updatePolicy(policyId, { channels: updatedChannels });
  };

  const updateEscalation = (policyId: string, escalation: NotificationPolicy['escalation']) => {
    updatePolicy(policyId, { escalation });
  };

  const updateFailover = (policyId: string, failover: NotificationPolicy['failover']) => {
    updatePolicy(policyId, { failover });
  };

  const bulkUpdateChannels = (channel: keyof NotificationPolicy['channels'], enabled: boolean) => {
    if (selectedPolicies.size === 0) return;

    const updates = Array.from(selectedPolicies).map(policyId => {
      const policy = policies.find(p => p.id === policyId);
      if (!policy) return null;

      const updatedChannels = { ...policy.channels, [channel]: enabled };
      
      // Validate critical events
      if (policy.severity === 'critical' && !enabled) {
        const otherChannelsActive = Object.entries(updatedChannels)
          .filter(([key]) => key !== channel)
          .some(([, active]) => active);
        
        if (!otherChannelsActive) {
          return null; // Skip this update
        }
      }

      return { policyId, channels: updatedChannels };
    }).filter(Boolean);

    updates.forEach(update => {
      if (update) {
        updatePolicy(update.policyId, { channels: update.channels });
      }
    });
  };

  const bulkUpdateSeverity = (severity: NotificationPolicy['severity']) => {
    if (selectedPolicies.size === 0) return;

    selectedPolicies.forEach(policyId => {
      updatePolicy(policyId, { severity });
    });
  };

  const savePolicies = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Update all modified policies
      const updates = policies.map(policy => ({
        ...policy,
        updated_by: user.id,
        updated_at: new Date().toISOString()
      }));

      const { error } = await supabase
        .from('notification_policies')
        .upsert(updates);

      if (error) throw error;

      setHasChanges(false);
      toast({
        title: "Policies saved",
        description: "Notification routing policies have been updated successfully.",
      });
    } catch (error) {
      console.error('Error saving policies:', error);
      toast({
        title: "Error saving policies",
        description: "Failed to save notification policies. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const sendTestEvent = async () => {
    if (!testEvent.trim()) return;

    setTesting(true);
    try {
      let payload;
      try {
        payload = JSON.parse(testPayload);
      } catch {
        payload = {};
      }

      const { error } = await supabase.functions.invoke('test-notification-event', {
        body: {
          eventKey: testEvent,
          payload
        }
      });

      if (error) throw error;

      toast({
        title: "Test event sent",
        description: `Test event "${testEvent}" has been sent to configured channels.`,
      });
      setShowTestDialog(false);
      setTestEvent('');
      setTestPayload('{}');
    } catch (error) {
      console.error('Error sending test event:', error);
      toast({
        title: "Error sending test event",
        description: "Failed to send test event. Please try again.",
        variant: "destructive",
      });
    } finally {
      setTesting(false);
    }
  };

  const getSeverityBadge = (severity: string) => {
    const severityConfig = SEVERITIES.find(s => s.key === severity);
    if (!severityConfig) return null;

    const Icon = severityConfig.icon;
    return (
      <Badge className={`${severityConfig.color} border-0`}>
        <Icon className="h-3 w-3 mr-1" />
        {severityConfig.label}
      </Badge>
    );
  };

  const getCategoryBadge = (category: string) => {
    const categoryConfig = CATEGORIES.find(c => c.key === category);
    if (!categoryConfig) return null;

    const Icon = categoryConfig.icon;
    return (
      <Badge variant="outline" className={`${categoryConfig.color} border-0`}>
        <Icon className="h-3 w-3 mr-1" />
        {categoryConfig.label}
      </Badge>
    );
  };

  const getActiveChannelsText = (policy: NotificationPolicy) => {
    const activeChannels = Object.entries(policy.channels)
      .filter(([, enabled]) => enabled)
      .map(([channel]) => channel.charAt(0).toUpperCase() + channel.slice(1));
    
    return activeChannels.length > 0 ? `Routed to: ${activeChannels.join(', ')}` : 'No channels';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-sm text-muted-foreground">Loading event routing...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-lg font-semibold">Event Routing</h3>
          <p className="text-sm text-muted-foreground">Configure which events send to which channels with escalation and failover</p>
        </div>
        <div className="flex items-center gap-3">
          <Dialog open={showTestDialog} onOpenChange={setShowTestDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Send className="h-4 w-4 mr-2" />
                Send Test
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Send Test Event</DialogTitle>
                <DialogDescription>
                  Choose an event to test with the current routing configuration
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="test-event">Event Key</Label>
                  <Select value={testEvent} onValueChange={setTestEvent}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select event to test" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredPolicies.map(policy => (
                        <SelectItem key={policy.event_key} value={policy.event_key}>
                          {policy.event_name} ({policy.event_key})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="test-payload">Payload (JSON)</Label>
                  <Textarea
                    id="test-payload"
                    value={testPayload}
                    onChange={(e) => setTestPayload(e.target.value)}
                    placeholder='{"key": "value"}'
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowTestDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={sendTestEvent} disabled={testing || !testEvent}>
                  {testing ? 'Sending...' : 'Send Test Event'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Button onClick={savePolicies} disabled={saving || !hasChanges}>
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex-1 min-w-64">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search events..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant={selectedCategory ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory('')}
              >
                All Categories
              </Button>
              {CATEGORIES.map(category => {
                const Icon = category.icon;
                return (
                  <Button
                    key={category.key}
                    variant={selectedCategory === category.key ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedCategory(selectedCategory === category.key ? '' : category.key)}
                  >
                    <Icon className="h-4 w-4 mr-1" />
                    {category.label}
                  </Button>
                );
              })}
            </div>
            <div className="flex gap-2">
              {SEVERITIES.map(severity => {
                const Icon = severity.icon;
                return (
                  <Button
                    key={severity.key}
                    variant={selectedSeverity === severity.key ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedSeverity(selectedSeverity === severity.key ? '' : severity.key)}
                  >
                    <Icon className="h-4 w-4 mr-1" />
                    {severity.label}
                  </Button>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      {selectedPolicies.size > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium">
                  {selectedPolicies.size} event{selectedPolicies.size !== 1 ? 's' : ''} selected
                </span>
                <div className="flex gap-2">
                  <Select onValueChange={bulkUpdateSeverity}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Set severity for all" />
                    </SelectTrigger>
                    <SelectContent>
                      {SEVERITIES.map(severity => (
                        <SelectItem key={severity.key} value={severity.key}>
                          {severity.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex gap-1">
                    {Object.entries(channelAvailability).map(([channel, available]) => (
                      <div key={channel} className="flex gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={!available}
                          onClick={() => bulkUpdateChannels(channel as keyof NotificationPolicy['channels'], true)}
                        >
                          +{channel}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => bulkUpdateChannels(channel as keyof NotificationPolicy['channels'], false)}
                        >
                          -{channel}
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedPolicies(new Set())}
              >
                Clear Selection
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Event Matrix Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-4 w-8">
                    <Checkbox
                      checked={selectedPolicies.size === filteredPolicies.length && filteredPolicies.length > 0}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedPolicies(new Set(filteredPolicies.map(p => p.id)));
                        } else {
                          setSelectedPolicies(new Set());
                        }
                      }}
                    />
                  </th>
                  <th className="text-left p-4 min-w-64">Event</th>
                  <th className="text-left p-4 w-32">Severity</th>
                  <th className="text-center p-4 w-20">Email</th>
                  <th className="text-center p-4 w-20">Telegram</th>
                  <th className="text-center p-4 w-20">Slack</th>
                  <th className="text-center p-4 w-20">Discord</th>
                  <th className="text-center p-4 w-20">SMS</th>
                  <th className="text-center p-4 w-20">Webhook</th>
                  <th className="text-center p-4 w-20">In-App</th>
                  <th className="text-left p-4 w-48">Escalation</th>
                  <th className="text-left p-4 w-48">Failover</th>
                </tr>
              </thead>
              <tbody>
                {filteredPolicies.map(policy => (
                  <tr key={policy.id} className="border-b hover:bg-muted/25">
                    <td className="p-4">
                      <Checkbox
                        checked={selectedPolicies.has(policy.id)}
                        onCheckedChange={(checked) => {
                          const newSelected = new Set(selectedPolicies);
                          if (checked) {
                            newSelected.add(policy.id);
                          } else {
                            newSelected.delete(policy.id);
                          }
                          setSelectedPolicies(newSelected);
                        }}
                      />
                    </td>
                    <td className="p-4">
                      <div className="space-y-1">
                        <div className="font-medium">{policy.event_name}</div>
                        <div className="text-xs text-muted-foreground font-mono">{policy.event_key}</div>
                        <div className="flex gap-2">
                          {getCategoryBadge(policy.category)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {getActiveChannelsText(policy)}
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <Select
                        value={policy.severity}
                        onValueChange={(severity) => updatePolicy(policy.id, { severity: severity as NotificationPolicy['severity'] })}
                      >
                        <SelectTrigger className="w-28">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {SEVERITIES.map(severity => (
                            <SelectItem key={severity.key} value={severity.key}>
                              {severity.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    {Object.entries(channelAvailability).map(([channel, available]) => (
                      <td key={channel} className="p-4 text-center">
                        <Checkbox
                          checked={policy.channels[channel as keyof NotificationPolicy['channels']]}
                          disabled={!available}
                          onCheckedChange={(checked) => 
                            updateChannels(policy.id, { [channel]: checked })
                          }
                        />
                      </td>
                    ))}
                    <td className="p-4">
                      <div className="text-xs text-muted-foreground">
                        {policy.escalation?.enabled ? 
                          `${policy.escalation.threshold.count} in ${policy.escalation.threshold.windowMinutes}m → ${policy.escalation.channels.join(', ')}` : 
                          'None'
                        }
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="text-xs text-muted-foreground">
                        {policy.failover?.enabled ? 
                          policy.failover.order.join(' → ') : 
                          'None'
                        }
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Footer */}
      <div className="flex justify-between items-center pt-4 border-t">
        <div className="text-sm text-muted-foreground">
          {filteredPolicies.length} event{filteredPolicies.length !== 1 ? 's' : ''} 
          {searchQuery || selectedCategory || selectedSeverity ? ' (filtered)' : ''}
        </div>
        <div className="flex gap-2">
          {hasChanges && (
            <Button variant="outline" onClick={loadPolicies}>
              Revert Changes
            </Button>
          )}
          <Button onClick={savePolicies} disabled={saving || !hasChanges}>
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}