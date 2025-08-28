import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { TaskStatusCard } from '@/components/chat/TaskStatusCard';
import { Separator } from '@/components/ui/separator';

interface RouterTestResult {
  intent: string;
  confidence: number;
  params: Record<string, string>;
  response: string;
  event_type?: string;
  run_id?: string;
  needs_inputs?: boolean;
  missing_param?: string;
}

const DEMO_RESPONSES: Record<string, RouterTestResult> = {
  'install wordpress': {
    intent: 'install_wordpress',
    confidence: 0.9,
    params: {},
    response: 'I can help you install WordPress! I need a domain name and admin email address.',
    needs_inputs: true,
    missing_param: 'domain'
  },
  'install wordpress on example.com': {
    intent: 'install_wordpress',
    confidence: 0.95,
    params: { domain: 'example.com' },
    response: 'Great! I have the domain. Now I need an admin email address for the WordPress installation.',
    needs_inputs: true,
    missing_param: 'admin_email'
  },
  'install wordpress on example.com admin@example.com': {
    intent: 'install_wordpress',
    confidence: 1.0,
    params: { domain: 'example.com', admin_email: 'admin@example.com' },
    response: 'Perfect! I\'m starting the WordPress installation on example.com with admin@example.com.',
    event_type: 'task_queued',
    run_id: 'demo-run-' + Math.random().toString(36).substr(2, 9)
  },
  'check cpu': {
    intent: 'check_cpu',
    confidence: 0.9,
    params: {},
    response: 'I\'ll check the CPU usage for you right away.',
    event_type: 'task_started',
    run_id: 'demo-run-' + Math.random().toString(36).substr(2, 9)
  },
  'check disk': {
    intent: 'check_disk',
    confidence: 0.9,
    params: {},
    response: 'Checking disk usage across all mounted filesystems.',
    event_type: 'task_started',
    run_id: 'demo-run-' + Math.random().toString(36).substr(2, 9)
  },
  'restart nginx': {
    intent: 'restart_service',
    confidence: 0.85,
    params: { service_name: 'nginx' },
    response: 'I\'ll restart the nginx service for you.',
    event_type: 'task_queued',
    run_id: 'demo-run-' + Math.random().toString(36).substr(2, 9)
  }
};

export default function RouterDemo() {
  const [input, setInput] = useState('');
  const [result, setResult] = useState<RouterTestResult | null>(null);
  const [events, setEvents] = useState<Array<{ type: string; timestamp: Date; data: any }>>([]);

  const processInput = () => {
    if (!input.trim()) return;

    const lowerInput = input.toLowerCase().trim();
    
    // Find best match
    let bestMatch = null;
    let maxScore = 0;

    for (const [key, response] of Object.entries(DEMO_RESPONSES)) {
      if (lowerInput.includes(key) || key.includes(lowerInput)) {
        const score = key.length / Math.max(key.length, lowerInput.length);
        if (score > maxScore) {
          maxScore = score;
          bestMatch = response;
        }
      }
    }

    // Default response for unmatched inputs
    const finalResult = bestMatch || {
      intent: 'general_inquiry',
      confidence: 0.3,
      params: {},
      response: 'I can help you with tasks like installing WordPress, checking system resources, or managing services. What would you like me to help you with?'
    };

    setResult(finalResult);

    // Simulate follow-up events
    if (finalResult.event_type && finalResult.run_id) {
      const newEvent = {
        type: finalResult.event_type,
        timestamp: new Date(),
        data: finalResult
      };
      setEvents(prev => [...prev, newEvent]);

      // Simulate completion after delay
      setTimeout(() => {
        const completionEvent = {
          type: Math.random() > 0.2 ? 'task_succeeded' : 'task_failed',
          timestamp: new Date(),
          data: {
            ...finalResult,
            duration: Math.floor(Math.random() * 30) + 5,
            error: Math.random() > 0.2 ? undefined : 'Demo simulation error'
          }
        };
        setEvents(prev => [...prev, completionEvent]);
      }, 2000 + Math.random() * 3000);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      processInput();
    }
  };

  const clearResults = () => {
    setResult(null);
    setEvents([]);
    setInput('');
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Chat Router Demo</h1>
        <p className="text-muted-foreground">
          Test the chat router with different intents and see how it processes commands and triggers tasks.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Input Section */}
        <Card>
          <CardHeader>
            <CardTitle>Test Input</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="input">User Message</Label>
              <Textarea
                id="input"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type a command like 'install wordpress' or 'check cpu'..."
                rows={3}
              />
            </div>
            
            <div className="flex gap-2">
              <Button onClick={processInput} disabled={!input.trim()}>
                Process
              </Button>
              <Button variant="outline" onClick={clearResults}>
                Clear
              </Button>
            </div>

            <div className="space-y-2">
              <Label>Quick Examples:</Label>
              <div className="flex flex-wrap gap-2">
                {Object.keys(DEMO_RESPONSES).slice(0, 4).map((example) => (
                  <Button
                    key={example}
                    variant="outline"
                    size="sm"
                    onClick={() => setInput(example)}
                  >
                    {example}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results Section */}
        <Card>
          <CardHeader>
            <CardTitle>Router Response</CardTitle>
          </CardHeader>
          <CardContent>
            {result ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <Label>Intent:</Label>
                    <Badge variant="outline" className="ml-2">
                      {result.intent}
                    </Badge>
                  </div>
                  <div>
                    <Label>Confidence:</Label>
                    <span className="ml-2 font-mono">
                      {(result.confidence * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>

                {Object.keys(result.params).length > 0 && (
                  <div>
                    <Label>Extracted Parameters:</Label>
                    <div className="mt-1 space-y-1">
                      {Object.entries(result.params).map(([key, value]) => (
                        <div key={key} className="flex items-center gap-2 text-sm">
                          <Badge variant="secondary">{key}</Badge>
                          <span className="font-mono">{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <Label>Response:</Label>
                  <p className="mt-1 text-sm bg-muted p-3 rounded">
                    {result.response}
                  </p>
                </div>

                {result.needs_inputs && (
                  <div>
                    <Badge variant="outline" className="bg-yellow-50 text-yellow-800">
                      Needs Input: {result.missing_param}
                    </Badge>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">
                Enter a message above to see how the router processes it.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Events Timeline */}
      {events.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Task Events</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {events.map((event, index) => (
                <div key={index}>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline">
                      {event.type.replace('_', ' ')}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {event.timestamp.toLocaleTimeString()}
                    </span>
                  </div>
                  
                  <TaskStatusCard
                    type={event.type as any}
                    intent={event.data.intent}
                    runId={event.data.run_id}
                    error={event.data.error}
                    duration={event.data.duration}
                    onViewTask={(runId) => console.log('View task:', runId)}
                  />
                  
                  {index < events.length - 1 && <Separator className="mt-4" />}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}