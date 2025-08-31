import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle2, AlertTriangle, Copy, ExternalLink, RotateCcw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ChecklistItem {
  id: string;
  title: string;
  description: string;
  critical: boolean;
  code?: string;
  url?: string;
}

interface ChecklistSection {
  title: string;
  items: ChecklistItem[];
}

const WidgetDeploymentChecklist = () => {
  const { toast } = useToast();
  const [completedItems, setCompletedItems] = useState<Set<string>>(new Set());

  const toggleItem = (itemId: string) => {
    const newCompleted = new Set(completedItems);
    if (newCompleted.has(itemId)) {
      newCompleted.delete(itemId);
    } else {
      newCompleted.add(itemId);
    }
    setCompletedItems(newCompleted);
  };

  const resetChecklist = () => {
    setCompletedItems(new Set());
    toast({
      title: "Checklist Reset",
      description: "All items have been unmarked.",
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "Code copied to clipboard",
    });
  };

  const checklist: ChecklistSection[] = [
    {
      title: "CDN & Asset Configuration",
      items: [
        {
          id: "cdn-setup",
          title: "Configure CDN for Widget SDK",
          description: "Set up CDN path with cache busting for the widget SDK",
          critical: true,
          code: "https://cdn.altaai.com/sdk/v1.js?v=20241201"
        },
        {
          id: "cdn-headers",
          title: "Configure CDN Cache Headers",
          description: "Set proper cache headers for the SDK file",
          critical: true,
          code: `Cache-Control: public, max-age=86400, s-maxage=31536000
ETag: "sdk-v1-hash-abc123"
Access-Control-Allow-Origin: *`
        },
        {
          id: "update-sdk-refs",
          title: "Update SDK References",
          description: "Update all documentation and examples to use CDN URL",
          critical: true,
          code: `<script src="https://cdn.altaai.com/sdk/v1.js?v=20241201"></script>
<script>
  AltaAIWidget.load('your-site-key', { /* options */ });
</script>`
        }
      ]
    },
    {
      title: "Domain Configuration",
      items: [
        {
          id: "widget-domain",
          title: "Set up Widget Subdomain",
          description: "Configure widget.altaai.com for widget hosting",
          critical: true,
          code: "widget.altaai.com → 185.158.133.1"
        },
        {
          id: "dns-records",
          title: "Configure DNS Records",
          description: "Set up A records for widget subdomain",
          critical: true,
          code: `A     widget.altaai.com    185.158.133.1
CNAME www.widget.altaai.com widget.altaai.com`
        },
        {
          id: "ssl-cert",
          title: "Verify SSL Certificate",
          description: "Ensure SSL certificate covers widget subdomain",
          critical: true,
          url: "https://widget.altaai.com"
        },
        {
          id: "update-endpoints",
          title: "Update API Endpoints",
          description: "Point widget API calls to widget subdomain",
          critical: true,
          code: `Widget API: https://widget.altaai.com/supabase/functions/v1/widget-api
Analytics: https://widget.altaai.com/supabase/functions/v1/widget-analytics
Frame URL: https://widget.altaai.com/widget/frame.html`
        }
      ]
    },
    {
      title: "Content Security Policy",
      items: [
        {
          id: "widget-csp",
          title: "Configure Widget Domain CSP",
          description: "Set minimal CSP headers for widget.altaai.com",
          critical: true,
          code: `Content-Security-Policy: 
  default-src 'self' https://widget.altaai.com;
  script-src 'self' 'unsafe-inline' https://cdn.altaai.com https://widget.altaai.com;
  style-src 'self' 'unsafe-inline' https://widget.altaai.com;
  font-src 'self' https://widget.altaai.com data:;
  img-src 'self' https: data:;
  connect-src 'self' https://widget.altaai.com https://lfsdqyvvboapsyeauchm.supabase.co;
  frame-ancestors *;
  frame-src 'self' https://widget.altaai.com;`
        },
        {
          id: "main-app-csp",
          title: "Update Main App CSP",
          description: "Allow widget domain in main app CSP if needed",
          critical: false,
          code: `frame-src 'self' https://widget.altaai.com;
connect-src 'self' https://widget.altaai.com https://lfsdqyvvboapsyeauchm.supabase.co;`
        },
        {
          id: "test-csp",
          title: "Test CSP Compliance",
          description: "Verify widget loads correctly with new CSP",
          critical: true,
          url: "/qa-checklist"
        }
      ]
    },
    {
      title: "Database Backup & Migration",
      items: [
        {
          id: "backup-widgets",
          title: "Backup Widget Configuration",
          description: "Create full backup of widgets table and related data",
          critical: true,
          code: `pg_dump -h db.lfsdqyvvboapsyeauchm.supabase.co \\
  -U postgres \\
  --table=widgets \\
  --table=widget_metrics \\
  --data-only \\
  --file=widget_backup_$(date +%Y%m%d_%H%M%S).sql`
        },
        {
          id: "test-migration",
          title: "Test Migration Script",
          description: "Run migration on staging environment first",
          critical: true,
          code: `-- Test widget secret hash migration
SELECT COUNT(*) FROM widgets WHERE secret_hash IS NULL;
-- Should be 0 after migration`
        },
        {
          id: "verify-data",
          title: "Verify Data Integrity",
          description: "Check all widgets have required fields after migration",
          critical: true,
          code: `SELECT 
  COUNT(*) as total_widgets,
  COUNT(secret_hash) as widgets_with_secret,
  COUNT(site_key) as widgets_with_site_key
FROM widgets;`
        },
        {
          id: "update-env-vars",
          title: "Update Environment Variables",
          description: "Set production widget domain in environment",
          critical: true,
          code: `WIDGET_DOMAIN=widget.altaai.com
CDN_BASE_URL=https://cdn.altaai.com`
        }
      ]
    },
    {
      title: "Rollback Procedures",
      items: [
        {
          id: "rollback-plan",
          title: "Prepare Rollback Plan",
          description: "Document steps to revert to previous version",
          critical: true,
          code: `1. Revert DNS changes (point widget domain back)
2. Restore previous widget table backup
3. Update SDK CDN to previous version
4. Revert CSP headers to previous state`
        },
        {
          id: "backup-current",
          title: "Backup Current State",
          description: "Create rollback point before deployment",
          critical: true,
          code: `# Database backup
pg_dump --clean --no-owner --no-privileges > rollback_$(date +%Y%m%d).sql

# Code backup
git tag deployment-$(date +%Y%m%d-%H%M%S)
git push origin --tags`
        },
        {
          id: "test-rollback",
          title: "Test Rollback Procedure",
          description: "Verify rollback works on staging environment",
          critical: true,
          url: "https://staging-widget.altaai.com"
        },
        {
          id: "monitor-rollback",
          title: "Monitor Post-Rollback",
          description: "Check analytics and error logs after rollback",
          critical: true,
          code: `# Check widget load events
SELECT COUNT(*) FROM widget_metrics 
WHERE metric_type = 'widget_load' 
AND created_at > NOW() - INTERVAL '1 hour';

# Check error rates
SELECT COUNT(*) FROM widget_metrics 
WHERE metric_type = 'widget_config_fetch_denied' 
AND created_at > NOW() - INTERVAL '1 hour';`
        }
      ]
    },
    {
      title: "Post-Deployment Verification",
      items: [
        {
          id: "smoke-test",
          title: "Run Smoke Tests",
          description: "Test basic widget functionality on production",
          critical: true,
          url: "/qa-checklist"
        },
        {
          id: "analytics-check",
          title: "Verify Analytics Flow",
          description: "Confirm analytics events are being captured",
          critical: true,
          code: `SELECT 
  event_type, 
  COUNT(*) as count 
FROM widget_metrics 
WHERE created_at > NOW() - INTERVAL '1 hour' 
GROUP BY event_type;`
        },
        {
          id: "performance-check",
          title: "Check Performance Metrics",
          description: "Verify CDN is serving SDK with proper cache headers",
          critical: false,
          url: "https://cdn.altaai.com/sdk/v1.js"
        },
        {
          id: "update-docs",
          title: "Update Documentation",
          description: "Update all references to use new domain and URLs",
          critical: false,
          code: "Update: Widget Guide, API docs, Integration examples"
        }
      ]
    }
  ];

  const totalItems = checklist.reduce((sum, section) => sum + section.items.length, 0);
  const completedCount = completedItems.size;
  const criticalItems = checklist.reduce((sum, section) => 
    sum + section.items.filter(item => item.critical).length, 0
  );
  const completedCritical = checklist.reduce((sum, section) => 
    sum + section.items.filter(item => item.critical && completedItems.has(item.id)).length, 0
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Widget Deployment Checklist</h1>
          <p className="text-muted-foreground">Production deployment checklist for AltaAI Widget system</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={resetChecklist} size="sm">
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset
          </Button>
        </div>
      </div>

      {/* Progress Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-foreground">{completedCount}/{totalItems}</div>
              <div className="text-sm text-muted-foreground">Total Items</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-destructive">{completedCritical}/{criticalItems}</div>
              <div className="text-sm text-muted-foreground">Critical Items</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-success">
                {Math.round((completedCount / totalItems) * 100)}%
              </div>
              <div className="text-sm text-muted-foreground">Complete</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Deployment Checklist Sections */}
      <div className="space-y-6">
        {checklist.map((section, sectionIndex) => (
          <Card key={sectionIndex}>
            <CardHeader>
              <CardTitle className="text-lg">{section.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {section.items.map((item) => (
                  <div 
                    key={item.id} 
                    className="flex items-start gap-3 p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                  >
                    <Checkbox
                      checked={completedItems.has(item.id)}
                      onCheckedChange={() => toggleItem(item.id)}
                      className="mt-1"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="text-sm font-medium text-foreground">{item.title}</h4>
                        {item.critical && (
                          <Badge variant="destructive" className="text-xs">
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            Critical
                          </Badge>
                        )}
                        {completedItems.has(item.id) && (
                          <Badge variant="default" className="text-xs bg-success">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Done
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">{item.description}</p>
                      
                      {item.code && (
                        <div className="bg-muted p-3 rounded-md">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs text-muted-foreground font-mono">Code/Command:</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(item.code!)}
                            >
                              <Copy className="w-3 h-3" />
                            </Button>
                          </div>
                          <pre className="text-xs text-foreground whitespace-pre-wrap font-mono">
                            {item.code}
                          </pre>
                        </div>
                      )}
                      
                      {item.url && (
                        <div className="mt-2">
                          <a
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center text-sm text-primary hover:underline"
                          >
                            {item.url.startsWith('http') ? 'Open URL' : 'Go to Page'}
                            <ExternalLink className="w-3 h-3 ml-1" />
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Final Deployment Notes */}
      <Card className="border-warning">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-warning" />
            Important Deployment Notes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <p><strong>⚠️ Critical Path:</strong> CDN setup, domain configuration, and database backup must be completed before deployment.</p>
            <p><strong>🔄 Rollback Window:</strong> Keep rollback capability ready for 48 hours post-deployment.</p>
            <p><strong>📊 Monitoring:</strong> Watch analytics dashboard for 24 hours to detect any issues.</p>
            <p><strong>🚨 Emergency Contact:</strong> Ensure on-call engineer has access to rollback procedures.</p>
            <p><strong>📱 Communication:</strong> Notify stakeholders 30 minutes before and after deployment completion.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default WidgetDeploymentChecklist;