import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAI } from '@/hooks/useAI';
import { Loader2, Brain, CheckCircle, AlertTriangle } from 'lucide-react';

export function AITestPanel() {
  const [prompt, setPrompt] = useState('Generate a creative story about a robot learning to paint.');
  const [response, setResponse] = useState<any>(null);
  const { callAI, loading, error } = useAI();
  const { toast } = useToast();

  const testAI = async () => {
    if (!prompt.trim()) return;

    try {
      const result = await callAI({
        system: 'You are a creative AI assistant. Generate responses in JSON format with a "story" field.',
        user: { prompt },
        schema: {
          type: 'object',
          properties: {
            story: { type: 'string' },
            mood: { type: 'string' },
            word_count: { type: 'number' }
          },
          required: ['story', 'mood', 'word_count'],
          additionalProperties: false
        }
      });

      setResponse(result);
      
      toast({
        title: 'AI Request Successful',
        description: `Response received from ${result.model} after ${result.failover_attempts} failover attempts`,
      });
    } catch (err) {
      toast({
        title: 'AI Request Failed',
        description: error || 'Unknown error occurred',
        variant: 'destructive',
      });
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5" />
          AI Failover Test Panel
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Test Prompt</label>
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Enter a test prompt for the AI..."
            rows={3}
          />
        </div>

        <Button onClick={testAI} disabled={loading || !prompt.trim()}>
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Testing AI Failover...
            </>
          ) : (
            <>
              <Brain className="mr-2 h-4 w-4" />
              Test AI Request
            </>
          )}
        </Button>

        {error && (
          <div className="p-4 border rounded-lg bg-destructive/10 border-destructive/20">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
              <div>
                <h4 className="font-medium text-destructive">AI Request Failed</h4>
                <p className="text-sm text-destructive/80 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {response && (
          <div className="p-4 border rounded-lg bg-muted/50">
            <div className="flex items-start gap-2 mb-3">
              <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-medium text-green-700">AI Response Received</h4>
                <div className="flex gap-2 mt-1">
                  <Badge variant="secondary">Model: {response.model}</Badge>
                  <Badge variant="outline">Attempts: {response.failover_attempts + 1}</Badge>
                  {response.usage && (
                    <Badge variant="outline">
                      Tokens: {response.usage.prompt_tokens + response.usage.completion_tokens}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            
            {response.content && (
              <div className="mt-3">
                <h5 className="font-medium mb-2">Generated Content:</h5>
                <div className="p-3 bg-background border rounded text-sm">
                  <pre className="whitespace-pre-wrap">
                    {JSON.stringify(response.content, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}