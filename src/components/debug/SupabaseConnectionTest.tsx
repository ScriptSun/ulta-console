import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

export function SupabaseConnectionTest() {
  const [testResults, setTestResults] = useState<any[]>([]);
  const [testing, setTesting] = useState(false);

  const runConnectionTests = async () => {
    setTesting(true);
    const results: any[] = [];

    // Test 1: Basic connectivity
    results.push({ test: 'Basic Connectivity', status: 'running', details: 'Testing...' });
    setTestResults([...results]);

    try {
      const { data, error } = await supabase
        .from('agents')
        .select('id')
        .limit(1);

      if (error) {
        results[0] = {
          test: 'Basic Connectivity',
          status: 'failed',
          details: `Error: ${error.message}`
        };
      } else {
        results[0] = {
          test: 'Basic Connectivity', 
          status: 'passed',
          details: `Success - found ${data?.length || 0} records`
        };
      }
    } catch (err: any) {
      results[0] = {
        test: 'Basic Connectivity',
        status: 'failed', 
        details: `Network Error: ${err.message}`
      };
    }

    // Test 2: Authentication check
    results.push({ test: 'Authentication', status: 'running', details: 'Testing...' });
    setTestResults([...results]);

    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error) {
        results[1] = {
          test: 'Authentication',
          status: 'failed',
          details: `Auth Error: ${error.message}`
        };
      } else if (user) {
        results[1] = {
          test: 'Authentication',
          status: 'passed',
          details: `Authenticated as: ${user.email}`
        };
      } else {
        results[1] = {
          test: 'Authentication', 
          status: 'failed',
          details: 'No authenticated user'
        };
      }
    } catch (err: any) {
      results[1] = {
        test: 'Authentication',
        status: 'failed',
        details: `Auth Network Error: ${err.message}`
      };
    }

    // Test 3: Direct fetch test
    results.push({ test: 'Direct API Test', status: 'running', details: 'Testing...' });
    setTestResults([...results]);

    try {
      const response = await fetch('https://lfsdqyvvboapsyeauchm.supabase.co/rest/v1/agents?select=id&limit=1', {
        headers: {
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxmc2RxeXZ2Ym9hcHN5ZWF1Y2htIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzMjA3ODYsImV4cCI6MjA3MTg5Njc4Nn0.8lE_UEjrIviFz6nygL7HocGho-aUG9YH1NCi6y_CrFk',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        results[2] = {
          test: 'Direct API Test',
          status: 'passed',
          details: `Direct fetch successful - Status: ${response.status}`
        };
      } else {
        results[2] = {
          test: 'Direct API Test',
          status: 'failed',
          details: `HTTP ${response.status}: ${response.statusText}`
        };
      }
    } catch (err: any) {
      results[2] = {
        test: 'Direct API Test',
        status: 'failed',
        details: `Fetch Error: ${err.message}`
      };
    }

    setTestResults(results);
    setTesting(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Supabase Connection Diagnostics</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={runConnectionTests} disabled={testing}>
          {testing ? 'Running Tests...' : 'Run Connection Tests'}
        </Button>
        
        {testResults.map((result, index) => (
          <Alert key={index} className={
            result.status === 'passed' ? 'border-green-500' : 
            result.status === 'failed' ? 'border-red-500' : 
            'border-yellow-500'
          }>
            <AlertDescription>
              <strong>{result.test}:</strong> 
              <span className={
                result.status === 'passed' ? 'text-green-600 ml-2' : 
                result.status === 'failed' ? 'text-red-600 ml-2' : 
                'text-yellow-600 ml-2'
              }>
                {result.status.toUpperCase()}
              </span>
              <div className="text-sm text-gray-600 mt-1">{result.details}</div>
            </AlertDescription>
          </Alert>
        ))}
      </CardContent>
    </Card>
  );
}