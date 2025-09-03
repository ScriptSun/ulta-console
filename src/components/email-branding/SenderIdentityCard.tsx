import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Mail,
  User,
  CheckCircle2,
  Clock,
  XCircle,
  Eye,
  RotateCcw,
  Save,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { EmailBrandingSpec } from '@/types/emailBrandingTypes';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface SenderIdentityCardProps {
  settings: EmailBrandingSpec | null;
  onSave: (settings: Partial<EmailBrandingSpec>) => Promise<void>;
  saving: boolean;
}

export function SenderIdentityCard({ settings, onSave, saving }: SenderIdentityCardProps) {
  const [senderName, setSenderName] = useState(settings?.senderName || '');
  const [senderEmail, setSenderEmail] = useState(settings?.senderEmail || '');
  const [showDnsRecords, setShowDnsRecords] = useState(false);
  const [checking, setChecking] = useState(false);
  const { toast } = useToast();

  React.useEffect(() => {
    if (settings) {
      setSenderName(settings.senderName);
      setSenderEmail(settings.senderEmail);
    }
  }, [settings]);

  const handleSave = async () => {
    await onSave({
      senderName,
      senderEmail
    });
  };

  const handleRecheck = async () => {
    if (!senderEmail) {
      toast({
        title: "Email required",
        description: "Please enter a sender email before checking DNS records",
        variant: "destructive",
      });
      return;
    }

    const domain = senderEmail.split('@')[1];
    if (!domain) {
      toast({
        title: "Invalid email",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      return;
    }

    setChecking(true);
    try {
      const { data, error } = await supabase.functions.invoke('check-email-dns', {
        body: {
          domain: domain,
          dkimSelector: settings?.dkim?.selector || 'default'
        }
      });

      if (error) {
        throw error;
      }

      // Update the settings with the new DNS check results
      await onSave({
        spf: {
          status: data.spf.status,
          record: data.spf.record
        },
        dkim: {
          status: data.dkim.status,
          selector: data.dkim.selector,
          host: data.dkim.host,
          record: data.dkim.record
        }
      });

      toast({
        title: "DNS records checked",
        description: `SPF: ${data.spf.status}, DKIM: ${data.dkim.status}`,
      });

    } catch (error: any) {
      console.error('DNS check failed:', error);
      toast({
        title: "DNS check failed",
        description: error.message || "Failed to check DNS records. Please try again.",
        variant: "destructive",
      });
    } finally {
      setChecking(false);
    }
  };

  const getStatusBadge = (status: "ok" | "pending" | "missing") => {
    switch (status) {
      case 'ok':
        return <Badge variant="default" className="bg-green-100 text-green-800 border-green-200"><CheckCircle2 className="h-3 w-3 mr-1" />Verified</Badge>;
      case 'pending':
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'missing':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Missing</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5 text-primary" />
          Sender Identity
        </CardTitle>
        <CardDescription>
          Configure the sender name and email address for your organization's emails
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Sender Settings */}
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="sender-name">Sender Name</Label>
            <Input
              id="sender-name"
              placeholder="e.g., Support Team"
              value={senderName}
              onChange={(e) => setSenderName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sender-email">Sender Email</Label>
            <Input
              id="sender-email"
              type="email"
              placeholder="e.g., support@yourcompany.com"
              value={senderEmail}
              onChange={(e) => setSenderEmail(e.target.value)}
            />
          </div>
        </div>

        <Separator />

        {/* DNS Status */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium">Email Authentication Status</h4>
          
          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <p className="text-sm font-medium">SPF Record</p>
                <p className="text-xs text-muted-foreground">Sender Policy Framework</p>
              </div>
              {getStatusBadge(settings?.spf.status || 'pending')}
            </div>
            
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <p className="text-sm font-medium">DKIM Record</p>
                <p className="text-xs text-muted-foreground">Domain Keys Identified Mail</p>
              </div>
              {getStatusBadge(settings?.dkim.status || 'pending')}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Changes
          </Button>
          
          <Dialog open={showDnsRecords} onOpenChange={setShowDnsRecords}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Eye className="h-4 w-4 mr-2" />
                Show DNS Records
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>DNS Records for Email Authentication</DialogTitle>
                <DialogDescription>
                  Add these DNS records to your domain to improve email deliverability
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-6">
                {/* SPF Record */}
                <div className="space-y-3">
                  <h4 className="font-medium flex items-center gap-2">
                    SPF Record
                    {getStatusBadge(settings?.spf.status || 'pending')}
                  </h4>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm font-mono break-all">
                      {settings?.spf.record || 'TXT @ "v=spf1 include:spf.yourprovider.com ~all"'}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {settings?.spf.record ? 'Current SPF record found in DNS' : 'Replace "yourprovider.com" with your email service provider\'s SPF record'}
                  </p>
                </div>

                {/* DKIM Record */}
                <div className="space-y-3">
                  <h4 className="font-medium flex items-center gap-2">
                    DKIM Record
                    {getStatusBadge(settings?.dkim.status || 'pending')}
                  </h4>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm font-mono break-all">
                      {settings?.dkim.record || 'TXT selector._domainkey "v=DKIM1; k=rsa; p=YOUR_PUBLIC_KEY"'}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {settings?.dkim.record ? 'Current DKIM record found in DNS' : 'Contact your email service provider for the specific DKIM record values'}
                  </p>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Button variant="outline" onClick={handleRecheck} disabled={checking || !senderEmail}>
            {checking ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RotateCcw className="h-4 w-4 mr-2" />
            )}
            Recheck Status
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}