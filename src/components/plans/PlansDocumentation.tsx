import React, { useState } from 'react';
import { FileText, Copy, CheckCircle, Database, Users, Cpu, BarChart3, Settings, Code } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';

interface PlansDocumentationProps {
  children: React.ReactNode;
}

export function PlansDocumentation({ children }: PlansDocumentationProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied!",
        description: "Code copied to clipboard",
      });
    } catch (err) {
      toast({
        title: "Failed to copy",
        description: "Please copy manually",
        variant: "destructive"
      });
    }
  };

  const CodeBlock: React.FC<{ title: string; language: string; code: string }> = ({ title, language, code }) => (
    <div className="border rounded-lg bg-muted/50 p-4 mb-4">
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-semibold text-sm text-foreground">{title}</h4>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => copyToClipboard(code)}
          className="h-6 px-2"
        >
          <Copy className="h-3 w-3" />
        </Button>
      </div>
      <pre className="text-xs bg-background/50 p-3 rounded border overflow-x-auto">
        <code className={`language-${language}`}>{code}</code>
      </pre>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Subscription Plans System Documentation
          </DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="h-[80vh] pr-4">
          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList className="grid w-full grid-cols-8">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="database">Database</TabsTrigger>
              <TabsTrigger value="architecture">Architecture</TabsTrigger>
              <TabsTrigger value="usage-tracking">Usage Tracking</TabsTrigger>
              <TabsTrigger value="enforcement">Enforcement</TabsTrigger>
              <TabsTrigger value="integration">Integration</TabsTrigger>
              <TabsTrigger value="examples">Examples</TabsTrigger>
              <TabsTrigger value="api">API Reference</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <div className="prose prose-sm max-w-none">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  System Overview
                </h2>
                
                <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800 mb-6">
                  <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">What is the Subscription Plans System?</h3>
                  <p className="text-blue-800 dark:text-blue-200">
                    A comprehensive usage-based billing system that connects subscription plans to AI agents, tracks usage in real-time, 
                    and enforces limits to control costs and access. It provides granular control over AI request limits and server events per plan.
                  </p>
                </div>

                <h3 className="text-lg font-semibold mb-3">Key Components</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div className="border rounded-lg p-4">
                    <h4 className="font-semibold flex items-center gap-2 mb-2">
                      <Settings className="h-4 w-4" />
                      Subscription Plans
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      Define different tiers (Free, Pro, Enterprise) with specific limits for AI requests and server events.
                    </p>
                  </div>
                  
                  <div className="border rounded-lg p-4">
                    <h4 className="font-semibold flex items-center gap-2 mb-2">
                      <Cpu className="h-4 w-4" />
                      AI Agents
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      Connected to specific plans via plan_key, inheriting usage limits and billing rules.
                    </p>
                  </div>
                  
                  <div className="border rounded-lg p-4">
                    <h4 className="font-semibold flex items-center gap-2 mb-2">
                      <BarChart3 className="h-4 w-4" />
                      Usage Tracking
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      Real-time monitoring of AI requests and server events with automatic increment on each action.
                    </p>
                  </div>
                  
                  <div className="border rounded-lg p-4">
                    <h4 className="font-semibold flex items-center gap-2 mb-2">
                      <CheckCircle className="h-4 w-4" />
                      Limit Enforcement
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      Automatic blocking of requests when limits are reached with upgrade prompts.
                    </p>
                  </div>
                </div>

                <h3 className="text-lg font-semibold mb-3">Data Flow</h3>
                <div className="bg-muted/50 p-4 rounded-lg">
                  <ol className="list-decimal list-inside space-y-2 text-sm">
                    <li>User creates/configures subscription plans with specific limits</li>
                    <li>AI agents are assigned to plans via <code>plan_key</code></li>
                    <li>When AI requests are made, system checks current usage vs. plan limits</li>
                    <li>If under limit: request proceeds, usage is incremented</li>
                    <li>If over limit: request is blocked, upgrade message is shown</li>
                    <li>Usage statistics are tracked for billing and analytics</li>
                  </ol>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="database" className="space-y-6">
              <div className="prose prose-sm max-w-none">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Database Schema & Relationships
                </h2>

                <h3 className="text-lg font-semibold mb-3">Core Tables</h3>

                <CodeBlock
                  title="subscription_plans Table"
                  language="sql"
                  code={`-- Main subscription plans configuration
CREATE TABLE subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,                    -- Display name (e.g., "Pro Plan")
  key TEXT NOT NULL UNIQUE,              -- Internal key for referencing
  slug TEXT NOT NULL UNIQUE,             -- URL-friendly identifier
  description TEXT,                      -- Plan description
  price_monthly DECIMAL(10,2),           -- Monthly price in USD
  monthly_ai_requests INTEGER NOT NULL,  -- AI request limit per month
  monthly_server_events INTEGER NOT NULL, -- Server event limit per month
  enabled BOOLEAN DEFAULT true,          -- Whether plan is active
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);`}
                />

                <CodeBlock
                  title="agents Table (Plan Connection)"
                  language="sql"
                  code={`-- AI agents connected to subscription plans
CREATE TABLE agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL,             -- Tenant identifier
  user_id UUID NOT NULL,                 -- Owner user
  plan_key TEXT NOT NULL,                -- References subscription_plans.key
  agent_type TEXT DEFAULT 'general',     -- Agent type
  status TEXT DEFAULT 'active',          -- Agent status
  heartbeat JSONB DEFAULT '{}',          -- Health data
  last_heartbeat TIMESTAMP WITH TIME ZONE,
  -- ... other agent fields
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);`}
                />

                <CodeBlock
                  title="agent_usage Table (Usage Tracking)"
                  language="sql"
                  code={`-- Track daily usage per agent
CREATE TABLE agent_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id),
  usage_type TEXT NOT NULL,              -- 'ai_request' or 'server_event'
  usage_date DATE NOT NULL DEFAULT CURRENT_DATE,
  count INTEGER NOT NULL DEFAULT 0,      -- Usage count for the day
  model TEXT DEFAULT 'gpt-4o-mini',      -- AI model used (for ai_request)
  prompt_tokens INTEGER DEFAULT 0,       -- Input tokens (for ai_request)
  completion_tokens INTEGER DEFAULT 0,   -- Output tokens (for ai_request)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  UNIQUE(agent_id, usage_type, usage_date) -- One record per agent/type/day
);`}
                />

                <h3 className="text-lg font-semibold mb-3">Key Relationships</h3>
                <div className="bg-muted/50 p-4 rounded-lg mb-4">
                  <h4 className="font-semibold mb-2">Primary Connections:</h4>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    <li><code>agents.plan_key</code> → <code>subscription_plans.key</code></li>
                    <li><code>agent_usage.agent_id</code> → <code>agents.id</code></li>
                    <li><code>agents.customer_id</code> → Tenant/Organization identifier</li>
                    <li><code>agents.user_id</code> → auth.users.id (Owner)</li>
                  </ul>
                </div>

                <h3 className="text-lg font-semibold mb-3">Database Functions</h3>

                <CodeBlock
                  title="Usage Limit Checking Function"
                  language="sql"
                  code={`-- Check if agent can make requests within plan limits
CREATE OR REPLACE FUNCTION check_agent_usage_limit(
  _agent_id UUID, 
  _usage_type TEXT
)
RETURNS TABLE(
  allowed BOOLEAN,
  current_usage INTEGER,
  limit_amount INTEGER,
  plan_name TEXT
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $$
DECLARE
  _current_usage INTEGER := 0;
  _limit_amount INTEGER := 0;
  _plan_name TEXT := 'Unknown';
  _plan_key TEXT;
BEGIN
  -- Get agent's plan key
  SELECT plan_key INTO _plan_key FROM agents WHERE id = _agent_id;
  
  -- Get current usage for today
  SELECT COALESCE(count, 0) INTO _current_usage
  FROM agent_usage 
  WHERE agent_id = _agent_id 
    AND usage_type = _usage_type 
    AND usage_date = CURRENT_DATE;

  -- Get limits from subscription plan
  IF _usage_type = 'ai_request' THEN
    SELECT monthly_ai_requests, name INTO _limit_amount, _plan_name
    FROM subscription_plans WHERE key = _plan_key;
  ELSIF _usage_type = 'server_event' THEN
    SELECT monthly_server_events, name INTO _limit_amount, _plan_name
    FROM subscription_plans WHERE key = _plan_key;
  END IF;

  -- Return usage check result
  RETURN QUERY SELECT 
    (_current_usage < _limit_amount), 
    _current_usage, 
    _limit_amount, 
    _plan_name;
END;
$$;`}
                />

                <CodeBlock
                  title="Usage Increment Function"
                  language="sql"
                  code={`-- Increment usage counter for agent
CREATE OR REPLACE FUNCTION increment_agent_usage(
  _agent_id UUID,
  _usage_type TEXT,
  _increment INTEGER DEFAULT 1
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO agent_usage (agent_id, usage_type, usage_date, count)
  VALUES (_agent_id, _usage_type, CURRENT_DATE, _increment)
  ON CONFLICT (agent_id, usage_type, usage_date)
  DO UPDATE SET 
    count = agent_usage.count + _increment,
    updated_at = now();
END;
$$;`}
                />
              </div>
            </TabsContent>

            <TabsContent value="architecture" className="space-y-6">
              <div className="prose prose-sm max-w-none">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  System Architecture
                </h2>

                <div className="bg-amber-50 dark:bg-amber-950/20 p-4 rounded-lg border border-amber-200 dark:border-amber-800 mb-6">
                  <h3 className="font-semibold text-amber-900 dark:text-amber-100 mb-2">Architecture Overview</h3>
                  <p className="text-amber-800 dark:text-amber-200 text-sm">
                    The system uses a distributed architecture where Edge Functions handle usage validation, 
                    React frontend manages plan configuration, and Supabase provides real-time data persistence with RLS security.
                  </p>
                </div>

                <h3 className="text-lg font-semibold mb-3">Component Architecture</h3>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                  <div className="border rounded-lg p-4">
                    <h4 className="font-semibold mb-3">Frontend Layer</h4>
                    <ul className="text-sm space-y-2">
                      <li><strong>SubscriptionPlans Page:</strong> Plan CRUD operations</li>
                      <li><strong>PlansTable:</strong> Display and manage plans</li>
                      <li><strong>PlansEditorDrawer:</strong> Create/edit plan details</li>
                      <li><strong>useSubscriptionPlans Hook:</strong> State management</li>
                    </ul>
                  </div>
                  
                  <div className="border rounded-lg p-4">
                    <h4 className="font-semibold mb-3">Backend Layer</h4>
                    <ul className="text-sm space-y-2">
                      <li><strong>Supabase Edge Functions:</strong> Usage validation</li>
                      <li><strong>Database Functions:</strong> Atomic operations</li>
                      <li><strong>RLS Policies:</strong> Security enforcement</li>
                      <li><strong>Real-time Subscriptions:</strong> Live updates</li>
                    </ul>
                  </div>
                </div>

                <h3 className="text-lg font-semibold mb-3">Request Flow Architecture</h3>

                <CodeBlock
                  title="AI Request Processing Flow"
                  language="typescript"
                  code={`// 1. User makes AI request through chat interface
// 2. Frontend calls aiService.sendMessage()
// 3. aiService validates with Edge Function

// Frontend: src/lib/aiService.ts
export const sendMessage = async (message: string, agentId: string) => {
  try {
    // Call Edge Function with usage validation
    const response = await supabase.functions.invoke('ai-router', {
      body: { message, agentId, action: 'chat' }
    });
    
    if (!response.data?.success) {
      throw new Error(response.data?.error || 'Request failed');
    }
    
    return response.data;
  } catch (error) {
    console.error('AI Service Error:', error);
    throw error;
  }
};

// Edge Function: supabase/functions/ai-router/index.ts
serve(async (req) => {
  const { agentId, message, action } = await req.json();
  
  // 1. Check usage limits before processing
  const { data: usage } = await supabase.rpc('check_agent_usage_limit', {
    _agent_id: agentId,
    _usage_type: 'ai_request'
  });
  
  if (!usage[0]?.allowed) {
    return new Response(JSON.stringify({
      success: false,
      error: 'Usage limit exceeded',
      upgrade_required: true,
      current_usage: usage[0]?.current_usage,
      limit: usage[0]?.limit_amount,
      plan_name: usage[0]?.plan_name
    }), { headers: corsHeaders });
  }
  
  // 2. Process AI request
  const aiResponse = await processAIRequest(message);
  
  // 3. Increment usage counter
  await supabase.rpc('increment_agent_usage', {
    _agent_id: agentId,
    _usage_type: 'ai_request'
  });
  
  return new Response(JSON.stringify({
    success: true,
    data: aiResponse
  }), { headers: corsHeaders });
});`}
                />

                <h3 className="text-lg font-semibold mb-3">Security Architecture</h3>

                <CodeBlock
                  title="Row Level Security (RLS) Implementation"
                  language="sql"
                  code={`-- Subscription Plans RLS
CREATE POLICY "Users can view plans in their tenant" 
ON subscription_plans FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND customer_id = subscription_plans.customer_id
  )
);

CREATE POLICY "Admins can manage plans" 
ON subscription_plans FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'owner')
  )
);

-- Agent Usage RLS
CREATE POLICY "Users can view usage in their tenant" 
ON agent_usage FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM agents a
    JOIN user_roles ur ON ur.customer_id = a.customer_id
    WHERE a.id = agent_usage.agent_id 
    AND ur.user_id = auth.uid()
  )
);`}
                />
              </div>
            </TabsContent>

            <TabsContent value="usage-tracking" className="space-y-6">
              <div className="prose prose-sm max-w-none">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Usage Tracking System
                </h2>

                <div className="bg-green-50 dark:bg-green-950/20 p-4 rounded-lg border border-green-200 dark:border-green-800 mb-6">
                  <h3 className="font-semibold text-green-900 dark:text-green-100 mb-2">Real-time Usage Monitoring</h3>
                  <p className="text-green-800 dark:text-green-200 text-sm">
                    Every AI request and server event is tracked in real-time with atomic database operations, 
                    ensuring accurate usage counts and preventing race conditions.
                  </p>
                </div>

                <h3 className="text-lg font-semibold mb-3">Usage Tracking Implementation</h3>

                <CodeBlock
                  title="Frontend Usage Monitoring"
                  language="typescript"
                  code={`// src/hooks/useSubscriptionPlans.tsx
export const useSubscriptionPlans = () => {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [planUsageStats, setPlanUsageStats] = useState<PlanUsageStats[]>([]);
  
  // Fetch real-time usage statistics
  const fetchPlanUsageStats = async () => {
    try {
      const { data: usage, error } = await supabase
        .from('agent_usage')
        .select(\`
          agent_id,
          usage_type,
          count,
          agents!inner (
            plan_key,
            customer_id
          )
        \`)
        .gte('usage_date', startOfMonth(new Date()).toISOString())
        .lte('usage_date', endOfMonth(new Date()).toISOString());
        
      if (error) throw error;
      
      // Aggregate usage by plan
      const statsMap = new Map<string, PlanUsageStats>();
      usage?.forEach(record => {
        const planKey = record.agents.plan_key;
        const existing = statsMap.get(planKey) || {
          plan_key: planKey,
          agent_count: 0,
          total_usage: 0
        };
        
        existing.agent_count = Math.max(existing.agent_count, 1);
        existing.total_usage += record.count;
        statsMap.set(planKey, existing);
      });
      
      setPlanUsageStats(Array.from(statsMap.values()));
    } catch (error) {
      console.error('Error fetching usage stats:', error);
    }
  };
  
  return { plans, planUsageStats, fetchPlanUsageStats };
};`}
                />

                <CodeBlock
                  title="Edge Function Usage Tracking"
                  language="typescript"
                  code={`// supabase/functions/ai-router/index.ts
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

export const trackAIUsage = async (agentId: string, tokensUsed: number) => {
  try {
    // Atomic usage increment with token tracking
    const { error } = await supabase.rpc('increment_agent_usage', {
      _agent_id: agentId,
      _usage_type: 'ai_request',
      _increment: 1
    });
    
    if (error) {
      console.error('Usage tracking error:', error);
      throw error;
    }
    
    // Optional: Track detailed AI usage for cost analysis
    await supabase.rpc('log_ai_usage', {
      _tenant_id: getTenantId(agentId),
      _agent_id: agentId,
      _model: 'gpt-4o-mini',
      _prompt_tokens: tokensUsed,
      _completion_tokens: 0,
      _cost_usd: calculateCost(tokensUsed),
      _request_type: 'chat'
    });
    
  } catch (error) {
    console.error('Failed to track usage:', error);
    // Don't block the request if tracking fails
  }
};`}
                />

                <h3 className="text-lg font-semibold mb-3">Usage Analytics & Reporting</h3>

                <CodeBlock
                  title="Usage Analytics Queries"
                  language="sql"
                  code={`-- Daily usage report by plan
SELECT 
  sp.name as plan_name,
  sp.monthly_ai_requests as limit_requests,
  sp.monthly_server_events as limit_events,
  COUNT(DISTINCT a.id) as active_agents,
  SUM(CASE WHEN au.usage_type = 'ai_request' THEN au.count ELSE 0 END) as total_ai_requests,
  SUM(CASE WHEN au.usage_type = 'server_event' THEN au.count ELSE 0 END) as total_server_events,
  ROUND(
    (SUM(CASE WHEN au.usage_type = 'ai_request' THEN au.count ELSE 0 END) * 100.0 / 
     NULLIF(sp.monthly_ai_requests, 0)), 2
  ) as ai_usage_percentage
FROM subscription_plans sp
LEFT JOIN agents a ON a.plan_key = sp.key
LEFT JOIN agent_usage au ON au.agent_id = a.id 
  AND au.usage_date >= date_trunc('month', CURRENT_DATE)
WHERE sp.enabled = true
GROUP BY sp.id, sp.name, sp.monthly_ai_requests, sp.monthly_server_events
ORDER BY ai_usage_percentage DESC;

-- Top consuming agents
SELECT 
  a.id,
  sp.name as plan_name,
  SUM(au.count) as total_usage,
  au.usage_type,
  ROUND(
    (SUM(au.count) * 100.0 / sp.monthly_ai_requests), 2
  ) as plan_utilization_pct
FROM agents a
JOIN subscription_plans sp ON sp.key = a.plan_key
JOIN agent_usage au ON au.agent_id = a.id
WHERE au.usage_date >= date_trunc('month', CURRENT_DATE)
GROUP BY a.id, sp.name, sp.monthly_ai_requests, au.usage_type
ORDER BY total_usage DESC
LIMIT 10;`}
                />

                <h3 className="text-lg font-semibold mb-3">Real-time Usage Monitoring</h3>

                <div className="bg-muted/50 p-4 rounded-lg">
                  <h4 className="font-semibold mb-2">Monitoring Features:</h4>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    <li><strong>Live Updates:</strong> Real-time subscription to usage changes via Supabase Realtime</li>
                    <li><strong>Usage Alerts:</strong> Notifications when approaching plan limits (80%, 90%, 100%)</li>
                    <li><strong>Historical Tracking:</strong> Daily, monthly, yearly usage aggregation</li>
                    <li><strong>Cost Analysis:</strong> Track AI model costs and token usage for billing</li>
                    <li><strong>Performance Metrics:</strong> Request latency and success rates</li>
                  </ul>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="enforcement" className="space-y-6">
              <div className="prose prose-sm max-w-none">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <CheckCircle className="h-5 w-5" />
                  Limit Enforcement System
                </h2>

                <div className="bg-red-50 dark:bg-red-950/20 p-4 rounded-lg border border-red-200 dark:border-red-800 mb-6">
                  <h3 className="font-semibold text-red-900 dark:text-red-100 mb-2">Critical Protection</h3>
                  <p className="text-red-800 dark:text-red-200 text-sm">
                    The enforcement system prevents cost overruns by blocking requests that exceed plan limits, 
                    with graceful degradation and clear upgrade messaging to users.
                  </p>
                </div>

                <h3 className="text-lg font-semibold mb-3">Enforcement Implementation</h3>

                <CodeBlock
                  title="Frontend Limit Checking"
                  language="typescript"
                  code={`// src/lib/aiService.ts - Pre-request validation
export const sendMessage = async (
  message: string, 
  agentId: string
): Promise<AIResponse> => {
  try {
    const response = await supabase.functions.invoke('ai-router', {
      body: {
        message,
        agent_id: agentId,
        action: 'chat'
      }
    });

    // Handle usage limit errors
    if (!response.data?.success) {
      const error = response.data?.error;
      
      if (response.data?.upgrade_required) {
        throw new UsageLimitError({
          message: error,
          currentUsage: response.data.current_usage,
          limit: response.data.limit,
          planName: response.data.plan_name,
          upgradeRequired: true
        });
      }
      
      throw new Error(error || 'AI request failed');
    }

    return response.data;
  } catch (error) {
    if (error instanceof UsageLimitError) {
      // Let the UI handle upgrade prompts
      throw error;
    }
    console.error('AI Service Error:', error);
    throw new Error('Failed to send message');
  }
};

// Custom error class for usage limits
export class UsageLimitError extends Error {
  public currentUsage: number;
  public limit: number;
  public planName: string;
  public upgradeRequired: boolean;
  
  constructor(data: {
    message: string;
    currentUsage: number;
    limit: number;
    planName: string;
    upgradeRequired: boolean;
  }) {
    super(data.message);
    this.currentUsage = data.currentUsage;
    this.limit = data.limit;
    this.planName = data.planName;
    this.upgradeRequired = data.upgradeRequired;
    this.name = 'UsageLimitError';
  }
}`}
                />

                <CodeBlock
                  title="Edge Function Enforcement Logic"
                  language="typescript"
                  code={`// supabase/functions/ai-router/index.ts
serve(async (req) => {
  try {
    const { agent_id, message, action } = await req.json();
    
    // 1. Validate request parameters
    if (!agent_id || !message) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Missing required parameters'
      }), { 
        status: 400, 
        headers: corsHeaders 
      });
    }
    
    // 2. Check usage limits BEFORE processing
    const { data: limitCheck, error: limitError } = await supabase
      .rpc('check_agent_usage_limit', {
        _agent_id: agent_id,
        _usage_type: 'ai_request'
      });
      
    if (limitError) {
      console.error('Limit check error:', limitError);
      return new Response(JSON.stringify({
        success: false,
        error: 'Failed to check usage limits'
      }), { 
        status: 500, 
        headers: corsHeaders 
      });
    }
    
    const usage = limitCheck[0];
    
    // 3. Enforce limits - block if exceeded
    if (!usage?.allowed) {
      console.log('Usage limit exceeded:', {
        agent_id,
        current: usage?.current_usage,
        limit: usage?.limit_amount,
        plan: usage?.plan_name
      });
      
      return new Response(JSON.stringify({
        success: false,
        error: \`You've reached your plan limit of \${usage?.limit_amount} AI requests. Please upgrade to continue.\`,
        upgrade_required: true,
        current_usage: usage?.current_usage,
        limit: usage?.limit_amount,
        plan_name: usage?.plan_name
      }), { 
        status: 429, // Too Many Requests
        headers: corsHeaders 
      });
    }
    
    // 4. Process the AI request
    const aiResponse = await processAIRequest(message, agent_id);
    
    // 5. Increment usage counter after successful request
    const { error: usageError } = await supabase
      .rpc('increment_agent_usage', {
        _agent_id: agent_id,
        _usage_type: 'ai_request',
        _increment: 1
      });
      
    if (usageError) {
      console.error('Usage tracking failed:', usageError);
      // Don't block the response if tracking fails
    }
    
    return new Response(JSON.stringify({
      success: true,
      data: aiResponse,
      usage_info: {
        current: (usage?.current_usage || 0) + 1,
        limit: usage?.limit_amount,
        plan: usage?.plan_name
      }
    }), { 
      headers: corsHeaders 
    });
    
  } catch (error) {
    console.error('AI Router Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Internal server error'
    }), { 
      status: 500, 
      headers: corsHeaders 
    });
  }
});`}
                />

                <CodeBlock
                  title="UI Enforcement Handling"
                  language="typescript"
                  code={`// src/components/chat/ChatDemo.tsx - User-facing enforcement
const handleSendMessage = async (message: string) => {
  if (!selectedAgent?.id) {
    toast({
      title: "No Agent Selected",
      description: "Please select an AI agent to continue",
      variant: "destructive"
    });
    return;
  }

  setIsLoading(true);
  try {
    const response = await aiService.sendMessage(message, selectedAgent.id);
    
    // Handle successful response
    setMessages(prev => [
      ...prev,
      { role: 'user', content: message },
      { role: 'assistant', content: response.content }
    ]);
    
  } catch (error) {
    if (error instanceof aiService.UsageLimitError) {
      // Show upgrade prompt for usage limits
      toast({
        title: "Usage Limit Reached",
        description: \`You've used \${error.currentUsage}/\${error.limit} requests on your \${error.planName} plan. Please upgrade to continue.\`,
        variant: "destructive",
        action: (
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => router.push('/subscription-plans')}
          >
            Upgrade Plan
          </Button>
        )
      });
    } else {
      // Handle other errors
      toast({
        title: "Error",
        description: error.message || "Failed to send message",
        variant: "destructive"
      });
    }
  } finally {
    setIsLoading(false);
  }
};`}
                />

                <h3 className="text-lg font-semibold mb-3">Enforcement Policies</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="border rounded-lg p-4">
                    <h4 className="font-semibold mb-2 text-green-600">Soft Limits (Warnings)</h4>
                    <ul className="text-sm space-y-1">
                      <li>• 80% usage: Warning notification</li>
                      <li>• 90% usage: Upgrade suggestion</li>
                      <li>• 95% usage: Urgent upgrade prompt</li>
                    </ul>
                  </div>
                  
                  <div className="border rounded-lg p-4">
                    <h4 className="font-semibold mb-2 text-red-600">Hard Limits (Blocks)</h4>
                    <ul className="text-sm space-y-1">
                      <li>• 100% usage: Request blocking</li>
                      <li>• Clear upgrade messaging</li>
                      <li>• Graceful error handling</li>
                    </ul>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="integration" className="space-y-6">
              <div className="prose prose-sm max-w-none">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Supabase Integration Details
                </h2>

                <h3 className="text-lg font-semibold mb-3">Authentication & Security</h3>

                <CodeBlock
                  title="Supabase Client Configuration"
                  language="typescript"
                  code={`// src/integrations/supabase/client.ts
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';
import { supabaseConfig } from '@/lib/supabaseConfig';

const SUPABASE_URL = supabaseConfig.url;
const SUPABASE_PUBLISHABLE_KEY = supabaseConfig.anonKey;

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  global: {
    headers: {
      'x-client-info': 'supabase-js-web',
    },
    fetch: (url, options = {}) => {
      return fetch(url, {
        ...options,
        signal: AbortSignal.timeout(15000), // 15 second timeout
      }).catch(error => {
        console.error('Supabase fetch error:', error);
        throw new Error('Network connection failed. Please check your internet connection and try again.');
      });
    },
  },
});`}
                />

                <h3 className="text-lg font-semibold mb-3">Edge Functions Integration</h3>

                <CodeBlock
                  title="Edge Function Structure"
                  language="typescript"
                  code={`// supabase/functions/ai-router/index.ts
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

// CORS headers for cross-origin requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Create Supabase client with service role for full access
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Parse request body
    const { agent_id, message, action } = await req.json();

    // Your business logic here...

    return new Response(
      JSON.stringify({ success: true, data: result }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});`}
                />

                <h3 className="text-lg font-semibold mb-3">Real-time Subscriptions</h3>

                <CodeBlock
                  title="Real-time Usage Updates"
                  language="typescript"
                  code={`// Frontend real-time subscription setup
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useRealTimeUsage = (agentId: string) => {
  const [usage, setUsage] = useState<AgentUsage | null>(null);

  useEffect(() => {
    if (!agentId) return;

    // Subscribe to usage changes for this agent
    const channel = supabase
      .channel(\`usage-\${agentId}\`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'agent_usage',
          filter: \`agent_id=eq.\${agentId}\`
        },
        (payload) => {
          console.log('Usage update:', payload);
          
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            setUsage(payload.new as AgentUsage);
          }
        }
      )
      .subscribe();

    // Cleanup subscription
    return () => {
      supabase.removeChannel(channel);
    };
  }, [agentId]);

  return usage;
};

// Usage in component
const ChatDemo = () => {
  const currentUsage = useRealTimeUsage(selectedAgent?.id);
  
  return (
    <div>
      {currentUsage && (
        <div className="text-sm text-muted-foreground">
          Usage: {currentUsage.count} / {planLimit} requests today
        </div>
      )}
    </div>
  );
};`}
                />

                <h3 className="text-lg font-semibold mb-3">Error Handling & Logging</h3>

                <CodeBlock
                  title="Comprehensive Error Handling"
                  language="typescript"
                  code={`// Enhanced error handling with logging
export class SupabaseService {
  private supabase = supabase;
  
  async executeWithErrorHandling<T>(
    operation: () => Promise<{ data: T | null; error: any }>,
    context: string
  ): Promise<T> {
    try {
      const result = await operation();
      
      if (result.error) {
        // Log to Supabase for monitoring
        await this.logError({
          context,
          error: result.error,
          timestamp: new Date().toISOString(),
          user_id: (await this.supabase.auth.getUser()).data.user?.id
        });
        
        throw new Error(\`\${context}: \${result.error.message}\`);
      }
      
      if (!result.data) {
        throw new Error(\`\${context}: No data returned\`);
      }
      
      return result.data;
    } catch (error) {
      console.error(\`\${context} failed:\`, error);
      throw error;
    }
  }
  
  private async logError(errorData: any) {
    try {
      await this.supabase
        .from('error_logs')
        .insert(errorData);
    } catch (logError) {
      console.error('Failed to log error:', logError);
    }
  }
}

// Usage example
const service = new SupabaseService();

const usage = await service.executeWithErrorHandling(
  () => supabase.rpc('check_agent_usage_limit', { _agent_id: agentId }),
  'Usage limit check'
);`}
                />
              </div>
            </TabsContent>

            <TabsContent value="examples" className="space-y-6">
              <div className="prose prose-sm max-w-none">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <Code className="h-5 w-5" />
                  Implementation Examples
                </h2>

                <h3 className="text-lg font-semibold mb-3">Complete Plan Management Example</h3>

                <CodeBlock
                  title="Creating a New Subscription Plan"
                  language="typescript"
                  code={`// Frontend: Create a new subscription plan
import { supabase } from '@/integrations/supabase/client';

export interface CreatePlanRequest {
  name: string;
  key: string;
  slug: string;
  description: string;
  price_monthly: number;
  monthly_ai_requests: number;
  monthly_server_events: number;
  enabled: boolean;
}

export const createSubscriptionPlan = async (planData: CreatePlanRequest) => {
  try {
    // Validate required fields
    if (!planData.name || !planData.key || !planData.slug) {
      throw new Error('Missing required plan fields');
    }
    
    // Check for duplicate keys/slugs
    const { data: existing } = await supabase
      .from('subscription_plans')
      .select('id')
      .or(\`key.eq.\${planData.key},slug.eq.\${planData.slug}\`)
      .limit(1);
      
    if (existing && existing.length > 0) {
      throw new Error('Plan key or slug already exists');
    }
    
    // Create the plan
    const { data, error } = await supabase
      .from('subscription_plans')
      .insert({
        ...planData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
      
    if (error) throw error;
    
    console.log('Plan created successfully:', data);
    return data;
    
  } catch (error) {
    console.error('Failed to create plan:', error);
    throw error;
  }
};

// Example usage
const createBasicPlan = async () => {
  const newPlan = await createSubscriptionPlan({
    name: 'Basic Plan',
    key: 'basic',
    slug: 'basic-plan',
    description: 'Perfect for small teams getting started',
    price_monthly: 29.99,
    monthly_ai_requests: 1000,
    monthly_server_events: 5000,
    enabled: true
  });
  
  console.log('New plan ID:', newPlan.id);
};`}
                />

                <CodeBlock
                  title="Connecting Agent to Plan"
                  language="typescript"
                  code={`// Assign an agent to a specific subscription plan
export const assignAgentToPlan = async (agentId: string, planKey: string) => {
  try {
    // Verify plan exists and is enabled
    const { data: plan, error: planError } = await supabase
      .from('subscription_plans')
      .select('id, name, enabled')
      .eq('key', planKey)
      .single();
      
    if (planError || !plan) {
      throw new Error(\`Plan with key '\${planKey}' not found\`);
    }
    
    if (!plan.enabled) {
      throw new Error(\`Plan '\${plan.name}' is not currently enabled\`);
    }
    
    // Update agent with new plan
    const { error: updateError } = await supabase
      .from('agents')
      .update({
        plan_key: planKey,
        updated_at: new Date().toISOString(),
        updated_by: (await supabase.auth.getUser()).data.user?.id
      })
      .eq('id', agentId);
      
    if (updateError) throw updateError;
    
    console.log(\`Agent \${agentId} assigned to plan '\${plan.name}'\`);
    return true;
    
  } catch (error) {
    console.error('Failed to assign agent to plan:', error);
    throw error;
  }
};

// Example: Upgrade agent from free to pro plan
await assignAgentToPlan('agent-uuid-here', 'pro');`}
                />

                <h3 className="text-lg font-semibold mb-3">Usage Monitoring Example</h3>

                <CodeBlock
                  title="Real-time Usage Dashboard"
                  language="typescript"
                  code={`// Complete usage monitoring component
import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UsageDashboardProps {
  agentId: string;
}

interface UsageStats {
  current_usage: number;
  limit: number;
  plan_name: string;
  usage_percentage: number;
  days_remaining: number;
}

export const UsageDashboard: React.FC<UsageDashboardProps> = ({ agentId }) => {
  const [stats, setStats] = useState<UsageStats | null>(null);
  const [loading, setLoading] = useState(true);
  
  const fetchUsageStats = async () => {
    try {
      // Get current usage and limits
      const { data: usage, error } = await supabase
        .rpc('check_agent_usage_limit', {
          _agent_id: agentId,
          _usage_type: 'ai_request'
        });
        
      if (error) throw error;
      
      const usageData = usage[0];
      const daysInMonth = new Date().getDate();
      const daysRemaining = 30 - daysInMonth; // Approximate
      
      setStats({
        current_usage: usageData.current_usage,
        limit: usageData.limit_amount,
        plan_name: usageData.plan_name,
        usage_percentage: (usageData.current_usage / usageData.limit_amount) * 100,
        days_remaining: daysRemaining
      });
      
    } catch (error) {
      console.error('Failed to fetch usage stats:', error);
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchUsageStats();
    
    // Set up real-time subscription
    const channel = supabase
      .channel(\`usage-dashboard-\${agentId}\`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'agent_usage',
        filter: \`agent_id=eq.\${agentId}\`
      }, () => {
        fetchUsageStats(); // Refresh on changes
      })
      .subscribe();
      
    return () => supabase.removeChannel(channel);
  }, [agentId]);
  
  if (loading) return <div>Loading usage stats...</div>;
  if (!stats) return <div>No usage data available</div>;
  
  const getStatusColor = (percentage: number) => {
    if (percentage >= 90) return 'text-red-600';
    if (percentage >= 80) return 'text-yellow-600';
    return 'text-green-600';
  };
  
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold mb-4">Usage Statistics</h3>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gray-50 p-4 rounded">
          <div className="text-sm text-gray-600">Current Plan</div>
          <div className="text-xl font-bold">{stats.plan_name}</div>
        </div>
        
        <div className="bg-gray-50 p-4 rounded">
          <div className="text-sm text-gray-600">Usage This Month</div>
          <div className={\`text-xl font-bold \${getStatusColor(stats.usage_percentage)}\`}>
            {stats.current_usage} / {stats.limit}
          </div>
        </div>
        
        <div className="bg-gray-50 p-4 rounded">
          <div className="text-sm text-gray-600">Usage Percentage</div>
          <div className={\`text-xl font-bold \${getStatusColor(stats.usage_percentage)}\`}>
            {stats.usage_percentage.toFixed(1)}%
          </div>
        </div>
        
        <div className="bg-gray-50 p-4 rounded">
          <div className="text-sm text-gray-600">Days Remaining</div>
          <div className="text-xl font-bold">{stats.days_remaining}</div>
        </div>
      </div>
      
      {/* Usage Progress Bar */}
      <div className="mt-4">
        <div className="flex justify-between text-sm mb-1">
          <span>Monthly Usage</span>
          <span>{stats.usage_percentage.toFixed(1)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className={\`h-2 rounded-full \${
              stats.usage_percentage >= 90 ? 'bg-red-600' : 
              stats.usage_percentage >= 80 ? 'bg-yellow-600' : 'bg-green-600'
            }\`}
            style={{ width: \`\${Math.min(stats.usage_percentage, 100)}%\` }}
          />
        </div>
      </div>
      
      {/* Upgrade prompt if near limit */}
      {stats.usage_percentage >= 80 && (
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
          <p className="text-sm text-yellow-800">
            You're approaching your plan limit. Consider upgrading to avoid service interruption.
          </p>
        </div>
      )}
    </div>
  );
};`}
                />

                <h3 className="text-lg font-semibold mb-3">Testing & Debugging</h3>

                <CodeBlock
                  title="Usage System Testing"
                  language="typescript"
                  code={`// Testing utilities for subscription system
export const testUsageSystem = async (agentId: string) => {
  console.log('🧪 Testing subscription usage system...');
  
  try {
    // 1. Test limit checking
    console.log('1. Testing limit check...');
    const { data: limitCheck } = await supabase.rpc('check_agent_usage_limit', {
      _agent_id: agentId,
      _usage_type: 'ai_request'
    });
    console.log('✅ Limit check result:', limitCheck[0]);
    
    // 2. Test usage increment
    console.log('2. Testing usage increment...');
    const { error: incrementError } = await supabase.rpc('increment_agent_usage', {
      _agent_id: agentId,
      _usage_type: 'ai_request',
      _increment: 1
    });
    
    if (incrementError) {
      console.error('❌ Increment failed:', incrementError);
    } else {
      console.log('✅ Usage incremented successfully');
    }
    
    // 3. Test limit check after increment
    console.log('3. Testing limit check after increment...');
    const { data: newLimitCheck } = await supabase.rpc('check_agent_usage_limit', {
      _agent_id: agentId,
      _usage_type: 'ai_request'
    });
    console.log('✅ New usage:', newLimitCheck[0]);
    
    // 4. Test edge function integration
    console.log('4. Testing edge function...');
    const { data: aiResponse } = await supabase.functions.invoke('ai-router', {
      body: {
        agent_id: agentId,
        message: 'Test message',
        action: 'test'
      }
    });
    console.log('✅ Edge function response:', aiResponse);
    
    console.log('🎉 All tests completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
};

// Debug usage data
export const debugUsageData = async (agentId: string) => {
  console.log('🔍 Debugging usage data for agent:', agentId);
  
  // Get agent info
  const { data: agent } = await supabase
    .from('agents')
    .select('id, plan_key, customer_id')
    .eq('id', agentId)
    .single();
  console.log('Agent:', agent);
  
  // Get plan info
  const { data: plan } = await supabase
    .from('subscription_plans')
    .select('*')
    .eq('key', agent?.plan_key)
    .single();
  console.log('Plan:', plan);
  
  // Get usage history
  const { data: usage } = await supabase
    .from('agent_usage')
    .select('*')
    .eq('agent_id', agentId)
    .order('created_at', { ascending: false });
  console.log('Usage history:', usage);
};

// Manual usage reset (for testing)
export const resetUsageForTesting = async (agentId: string) => {
  const { error } = await supabase
    .from('agent_usage')
    .delete()
    .eq('agent_id', agentId);
    
  if (error) {
    console.error('Failed to reset usage:', error);
  } else {
    console.log('✅ Usage reset for testing');
  }
};`}
                />
              </div>
            </TabsContent>

            <TabsContent value="api" className="space-y-6">
              <div className="prose prose-sm max-w-none">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <Code className="h-5 w-5" />
                  API Reference
                </h2>

                <h3 className="text-lg font-semibold mb-3">Database Functions Reference</h3>

                <CodeBlock
                  title="check_agent_usage_limit()"
                  language="sql"
                  code={`-- Check if agent can make requests within plan limits
-- Parameters:
--   _agent_id: UUID of the agent
--   _usage_type: 'ai_request' or 'server_event'
-- Returns: TABLE with columns:
--   allowed: BOOLEAN - whether request is allowed
--   current_usage: INTEGER - current usage count
--   limit_amount: INTEGER - plan limit
--   plan_name: TEXT - name of the plan

SELECT * FROM check_agent_usage_limit(
  'agent-uuid-here'::UUID,
  'ai_request'::TEXT
);

-- Example result:
-- allowed | current_usage | limit_amount | plan_name
-- --------|---------------|--------------|----------
-- true    | 45           | 1000         | Pro Plan`}
                />

                <CodeBlock
                  title="increment_agent_usage()"
                  language="sql"
                  code={`-- Increment usage counter for an agent
-- Parameters:
--   _agent_id: UUID of the agent
--   _usage_type: 'ai_request' or 'server_event'  
--   _increment: INTEGER (default 1) - amount to increment

SELECT increment_agent_usage(
  'agent-uuid-here'::UUID,
  'ai_request'::TEXT,
  1  -- increment by 1
);

-- This function:
-- 1. Creates usage record if none exists for today
-- 2. Updates existing record by adding increment
-- 3. Updates the updated_at timestamp`}
                />

                <h3 className="text-lg font-semibold mb-3">Frontend API Reference</h3>

                <CodeBlock
                  title="useSubscriptionPlans Hook"
                  language="typescript"
                  code={`// Hook for managing subscription plans
interface UseSubscriptionPlansReturn {
  plans: SubscriptionPlan[];
  planUsageStats: PlanUsageStats[];
  loading: boolean;
  totalAgents: number;
  totalUsage: number;
  avgAiLimit: number;
  togglePlanStatus: (id: string) => Promise<void>;
  deletePlan: (id: string) => Promise<void>;
  refetch: () => Promise<void>;
}

export const useSubscriptionPlans = (): UseSubscriptionPlansReturn;

// Usage example:
const {
  plans,
  planUsageStats,
  loading,
  togglePlanStatus,
  deletePlan,
  refetch
} = useSubscriptionPlans();

// Toggle plan status
await togglePlanStatus(planId);

// Delete plan
await deletePlan(planId);

// Refresh data
await refetch();`}
                />

                <CodeBlock
                  title="aiService Module"
                  language="typescript"
                  code={`// AI service for handling chat requests with usage limits
interface AIResponse {
  content: string;
  success: boolean;
  usage_info?: {
    current: number;
    limit: number;
    plan: string;
  };
}

class UsageLimitError extends Error {
  currentUsage: number;
  limit: number;
  planName: string;
  upgradeRequired: boolean;
}

// Main function
export const sendMessage = async (
  message: string, 
  agentId: string
): Promise<AIResponse>;

// Usage:
try {
  const response = await aiService.sendMessage(message, agentId);
  console.log('AI Response:', response.content);
  console.log('Usage info:', response.usage_info);
} catch (error) {
  if (error instanceof aiService.UsageLimitError) {
    // Handle upgrade required
    showUpgradePrompt(error);
  } else {
    // Handle other errors
    console.error('AI request failed:', error);
  }
}`}
                />

                <h3 className="text-lg font-semibold mb-3">Edge Functions API</h3>

                <CodeBlock
                  title="ai-router Edge Function"
                  language="typescript"
                  code={`// POST /functions/v1/ai-router
// Headers:
//   Authorization: Bearer <supabase-anon-key>
//   Content-Type: application/json

// Request Body:
interface AIRouterRequest {
  agent_id: string;        // UUID of the agent
  message: string;         // User message
  action: string;         // Action type ('chat', 'test', etc.)
}

// Response (Success):
interface AIRouterResponse {
  success: true;
  data: {
    content: string;       // AI response
    tokens_used?: number;  // Optional token count
  };
  usage_info: {
    current: number;       // Current usage count
    limit: number;        // Plan limit
    plan: string;         // Plan name
  };
}

// Response (Usage Limit Exceeded):
interface AIRouterLimitResponse {
  success: false;
  error: string;           // Error message
  upgrade_required: true;  // Indicates upgrade needed
  current_usage: number;   // Current usage
  limit: number;          // Plan limit  
  plan_name: string;      // Plan name
}

// Example request:
fetch('/functions/v1/ai-router', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_SUPABASE_ANON_KEY',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    agent_id: 'agent-uuid-here',
    message: 'Hello, how are you?',
    action: 'chat'
  })
});`}
                />

                <h3 className="text-lg font-semibold mb-3">Database Schema Reference</h3>

                <CodeBlock
                  title="Complete Schema Overview"
                  language="sql"
                  code={`-- Core tables and their relationships

-- 1. SUBSCRIPTION PLANS (Configuration)
subscription_plans {
  id: UUID PRIMARY KEY
  name: TEXT NOT NULL                    -- "Pro Plan" 
  key: TEXT UNIQUE NOT NULL              -- "pro"
  slug: TEXT UNIQUE NOT NULL             -- "pro-plan"
  description: TEXT                      -- Plan description
  price_monthly: DECIMAL(10,2)           -- 29.99
  monthly_ai_requests: INTEGER NOT NULL  -- 1000
  monthly_server_events: INTEGER NOT NULL -- 5000
  enabled: BOOLEAN DEFAULT true          -- Active status
  created_at: TIMESTAMP
  updated_at: TIMESTAMP
}

-- 2. AGENTS (Connected to plans)
agents {
  id: UUID PRIMARY KEY
  customer_id: UUID NOT NULL             -- Tenant ID
  user_id: UUID NOT NULL                 -- Owner
  plan_key: TEXT NOT NULL                -- -> subscription_plans.key
  agent_type: TEXT DEFAULT 'general'
  status: TEXT DEFAULT 'active'
  created_at: TIMESTAMP
  updated_at: TIMESTAMP
}

-- 3. AGENT USAGE (Tracking)
agent_usage {
  id: UUID PRIMARY KEY  
  agent_id: UUID NOT NULL                -- -> agents.id
  usage_type: TEXT NOT NULL              -- 'ai_request', 'server_event'
  usage_date: DATE NOT NULL DEFAULT CURRENT_DATE
  count: INTEGER NOT NULL DEFAULT 0      -- Usage count
  model: TEXT DEFAULT 'gpt-4o-mini'      -- AI model (if ai_request)
  prompt_tokens: INTEGER DEFAULT 0       -- Input tokens
  completion_tokens: INTEGER DEFAULT 0   -- Output tokens
  created_at: TIMESTAMP
  updated_at: TIMESTAMP
  
  UNIQUE(agent_id, usage_type, usage_date) -- One record per day
}

-- Key Relationships:
-- agents.plan_key -> subscription_plans.key
-- agent_usage.agent_id -> agents.id`}
                />

                <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                  <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">📚 Additional Resources</h4>
                  <ul className="text-blue-800 dark:text-blue-200 text-sm space-y-1">
                    <li>• <strong>Supabase Dashboard:</strong> Monitor real-time usage and plan metrics</li>
                    <li>• <strong>Edge Function Logs:</strong> Debug usage limit enforcement</li>
                    <li>• <strong>Database Browser:</strong> Inspect usage data and plan configurations</li>
                    <li>• <strong>RLS Policies:</strong> Review security rules for data access</li>
                  </ul>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}