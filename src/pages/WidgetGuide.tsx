import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { 
  Code, 
  Globe, 
  Server, 
  Cookie, 
  Zap, 
  CheckCircle,
  Copy,
  ExternalLink
} from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export default function WidgetGuide() {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const { toast } = useToast();

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedCode(label);
      toast({
        title: "Copied!",
        description: `${label} copied to clipboard`,
      });
      setTimeout(() => setCopiedCode(null), 2000);
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Please copy the code manually",
        variant: "destructive",
      });
    }
  };

  const embedCode = `<script src="https://widget.ultaai.com/v1/widget.js" async></script>`;

  const serverTicketCode = `// Server-side implementation
app.post('/setup-widget', async (req, res) => {
  const { page_url, customer_context } = req.body;
  
  // Resolve agent_id based on your business logic
  const agent_id = resolveAgentForPage(page_url, customer_context);
  
  // Create widget ticket on your server
  const response = await fetch('https://api.ultaai.com/widget/tickets', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer YOUR_API_KEY'
    },
    body: JSON.stringify({ agent_id })
  });
  
  const { ticket_id } = await response.json();
  
  // Set HttpOnly cookie for security
  res.cookie('ultaai_ticket', ticket_id, {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  });
  
  res.json({ success: true });
});`;

  const bootstrapFlow = `// Widget auto-bootstrap flow (handled automatically)
// 1. widget.js loads and calls GET /widget/bootstrap
// 2. Server reads ultaai_ticket cookie
// 3. Server validates ticket and returns widget config
// 4. Widget renders with appropriate agent context`;

  return (
    <div className="container mx-auto py-8 space-y-8 max-w-4xl">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center gap-3 mb-4">
          <Globe className="h-10 w-10 text-primary" />
          <h1 className="text-4xl font-bold">Widget Embed Guide</h1>
        </div>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Integrate UltaAI chat widgets into any website with a single script tag. 
          Secure, server-side agent resolution with no exposed credentials.
        </p>
        <div className="flex justify-center gap-2">
          <Badge variant="secondary" className="text-sm">
            <Zap className="h-3 w-3 mr-1" />
            Auto-bootstrap
          </Badge>
          <Badge variant="secondary" className="text-sm">
            <Cookie className="h-3 w-3 mr-1" />
            HttpOnly cookies
          </Badge>
          <Badge variant="secondary" className="text-sm">
            <CheckCircle className="h-3 w-3 mr-1" />
            No exposed IDs
          </Badge>
        </div>
      </div>

      {/* Quick Start */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Code className="h-5 w-5 text-primary" />
            Quick Start
          </CardTitle>
          <CardDescription>
            Add this single script tag to any page where you want the chat widget to appear.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <pre className="bg-muted p-4 rounded-lg overflow-x-auto">
              <code className="text-sm font-mono">{embedCode}</code>
            </pre>
            <Button
              variant="outline"
              size="sm"
              className="absolute top-2 right-2"
              onClick={() => copyToClipboard(embedCode, "Embed code")}
            >
              {copiedCode === "Embed code" ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
              <div className="text-sm text-green-800">
                <strong>That's it!</strong> No configuration needed in the HTML. 
                The widget auto-configures based on server-side settings.
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Integration Steps */}
      <div className="grid gap-6">
        <h2 className="text-2xl font-bold">Integration Steps</h2>
        
        {/* Step 1 */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                  1
                </div>
                <Server className="h-5 w-5 text-primary" />
                Server Setup: Ticket Creation
              </CardTitle>
            </div>
            <CardDescription>
              Your server handles agent resolution and creates widget tickets securely.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-xs">
                <code>{serverTicketCode}</code>
              </pre>
              <Button
                variant="outline"
                size="sm"
                className="absolute top-2 right-2"
                onClick={() => copyToClipboard(serverTicketCode, "Server code")}
              >
                {copiedCode === "Server code" ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="text-sm font-medium text-blue-900">POST /widget/tickets</div>
                <div className="text-xs text-blue-700 mt-1">Creates secure ticket with resolved agent_id</div>
              </div>
              <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                <div className="text-sm font-medium text-purple-900">HttpOnly Cookie</div>
                <div className="text-xs text-purple-700 mt-1">Secure ultaai_ticket cookie set by server</div>
              </div>
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="text-sm font-medium text-green-900">No Exposed IDs</div>
                <div className="text-xs text-green-700 mt-1">Agent/tenant IDs never appear in HTML</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Step 2 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                2
              </div>
              <Zap className="h-5 w-5 text-primary" />
              Auto-Bootstrap Process
            </CardTitle>
            <CardDescription>
              The widget automatically configures itself using the secure ticket system.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
                <code>{bootstrapFlow}</code>
              </pre>
              <Button
                variant="outline"
                size="sm"
                className="absolute top-2 right-2"
                onClick={() => copyToClipboard(bootstrapFlow, "Bootstrap flow")}
              >
                {copiedCode === "Bootstrap flow" ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            <div className="mt-4 space-y-3">
              <div className="flex items-center gap-3 p-3 bg-background border rounded-lg">
                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-bold">
                  1
                </div>
                <div>
                  <div className="font-medium">Widget Loads</div>
                  <div className="text-sm text-muted-foreground">Script executes and calls GET /widget/bootstrap</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-background border rounded-lg">
                <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center text-sm font-bold">
                  2
                </div>
                <div>
                  <div className="font-medium">Cookie Validation</div>
                  <div className="text-sm text-muted-foreground">Server reads ultaai_ticket cookie and validates</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-background border rounded-lg">
                <div className="w-8 h-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-sm font-bold">
                  3
                </div>
                <div>
                  <div className="font-medium">Widget Renders</div>
                  <div className="text-sm text-muted-foreground">Widget appears with correct agent context</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Billing Integration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
              3
            </div>
            Billing Integration
          </CardTitle>
          <CardDescription>
            Connect widget usage to your billing system for accurate tracking and invoicing.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="font-medium">Integration Points</h4>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                  <div>
                    <div className="font-medium text-sm">Conversation Tracking</div>
                    <div className="text-xs text-muted-foreground">Each widget session creates billable conversation records</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                  <div>
                    <div className="font-medium text-sm">Usage Metrics</div>
                    <div className="text-xs text-muted-foreground">Message counts, session duration, and agent utilization</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                  <div>
                    <div className="font-medium text-sm">Customer Attribution</div>
                    <div className="text-xs text-muted-foreground">Usage tied to specific customer accounts and agents</div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <h4 className="font-medium">Billing Events</h4>
              <div className="space-y-2">
                <Badge variant="outline" className="w-full justify-start">
                  <div className="w-2 h-2 rounded-full bg-blue-500 mr-2"></div>
                  Widget Load
                </Badge>
                <Badge variant="outline" className="w-full justify-start">
                  <div className="w-2 h-2 rounded-full bg-green-500 mr-2"></div>
                  Conversation Start
                </Badge>
                <Badge variant="outline" className="w-full justify-start">
                  <div className="w-2 h-2 rounded-full bg-yellow-500 mr-2"></div>
                  Message Exchange
                </Badge>
                <Badge variant="outline" className="w-full justify-start">
                  <div className="w-2 h-2 rounded-full bg-purple-500 mr-2"></div>
                  Task Execution
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Security Features */}
      <Card>
        <CardHeader>
          <CardTitle>Security & Privacy</CardTitle>
          <CardDescription>Built-in security measures protect your customers and data.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium">HttpOnly Cookies</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium">No Credential Exposure</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium">Server-Side Resolution</span>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium">Encrypted Communication</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium">Content Redaction</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium">Audit Logging</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Call to Action */}
      <Card className="bg-primary text-primary-foreground">
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <h3 className="text-xl font-bold">Ready to Get Started?</h3>
            <p className="text-primary-foreground/80">
              Copy the embed code above and add it to your website. 
              The widget will auto-configure based on your server settings.
            </p>
            <div className="flex justify-center gap-3">
              <Button variant="secondary" size="sm">
                <ExternalLink className="h-4 w-4 mr-2" />
                API Documentation
              </Button>
              <Button variant="outline" size="sm" className="bg-transparent border-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/10">
                View Examples
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}