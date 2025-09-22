import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { buildApiUrl, apiEndpoints, supabaseConfig } from '@/lib/supabaseConfig';

const WidgetTest = () => {
  const [testResults, setTestResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const siteKey = '4bc31bd39380a1350458145b6ef0321b9ef5c2637f2ccc5e8cb2fcf0842cdd91';
  const testDomain = 'https://devbox-alpha.ultahost.com';

  const testWidgetAPI = async () => {
    setLoading(true);
    setTestResults([]);

    const tests = [
      {
        name: 'Direct Supabase API Test',
        test: async () => {
          const response = await fetch(buildApiUrl(`${apiEndpoints.functions}/widget-api`), {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              action: 'get_config',
              site_key: siteKey,
              domain: testDomain
            })
          });
          
          const result = {
            status: response.status,
            statusText: response.statusText,
            ok: response.ok,
            data: null,
            error: null
          };

          try {
            result.data = await response.json();
          } catch (e) {
            result.error = await response.text();
          }

          return result;
        }
      },
      {
        name: 'CORS Preflight Test',
        test: async () => {
          const response = await fetch(buildApiUrl(`${apiEndpoints.functions}/widget-api`), {
            method: 'OPTIONS',
            headers: {
              'Access-Control-Request-Method': 'POST',
              'Access-Control-Request-Headers': 'content-type',
            }
          });
          
          return {
            status: response.status,
            headers: Object.fromEntries(response.headers.entries()),
            ok: response.ok
          };
        }
      },
      {
        name: 'Widget SDK Load Test',
        test: async () => {
          try {
            // Load the SDK script
            const script = document.createElement('script');
            script.src = `${supabaseConfig.url}/sdk/v1.js`;
            script.onload = () => console.log('SDK loaded successfully');
            script.onerror = (e) => console.error('SDK failed to load:', e);
            
            return {
              attempted: true,
              scriptSrc: script.src,
              note: 'Check browser console for load results'
            };
          } catch (e) {
            return { error: e.message };
          }
        }
      }
    ];

    for (const test of tests) {
      try {
        console.log(`Running test: ${test.name}`);
        const result = await test.test();
        setTestResults(prev => [...prev, { name: test.name, result, status: 'success' }]);
      } catch (error) {
        console.error(`Test failed: ${test.name}`, error);
        setTestResults(prev => [...prev, { name: test.name, error: error.message, status: 'error' }]);
      }
    }

    setLoading(false);
  };

  const embedCode = `<script src="${supabaseConfig.url}/sdk/v1.js"></script>
<script>
  UltaAIWidget.load('${siteKey}');
</script>`;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Widget API Test</h1>
          <p className="text-muted-foreground">Test the widget API and debug issues</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Test Configuration</CardTitle>
          <CardDescription>
            Testing widget with site key: <code className="bg-muted px-1 rounded">{siteKey}</code>
            <br />
            Target domain: <code className="bg-muted px-1 rounded">{testDomain}</code>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={testWidgetAPI} disabled={loading}>
            {loading ? 'Running Tests...' : 'Run API Tests'}
          </Button>
        </CardContent>
      </Card>

      {testResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Test Results</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {testResults.map((test, index) => (
              <div key={index} className="border rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-medium">{test.name}</h3>
                  <Badge variant={test.status === 'success' ? 'default' : 'destructive'}>
                    {test.status}
                  </Badge>
                </div>
                <pre className="bg-muted p-2 rounded text-sm overflow-auto">
                  {JSON.stringify(test.result || test.error, null, 2)}
                </pre>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Current Embed Code</CardTitle>
          <CardDescription>
            This is the embed code that should work on your domain
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea 
            value={embedCode}
            readOnly
            className="h-24 font-mono text-sm"
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default WidgetTest;