import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { TestTube, Play, CheckCircle, XCircle, AlertTriangle, Clock } from 'lucide-react'
import { useState } from 'react'

export default function AssertionCheck() {
  const [testType, setTestType] = useState('api')
  const [isRunning, setIsRunning] = useState(false)

  const recentTests = [
    {
      id: 'test-001',
      name: 'API Endpoint Validation',
      type: 'API Test',
      status: 'passed',
      result: 'All endpoints responding correctly',
      timestamp: '2024-01-15 14:30:00',
      duration: '2.3s'
    },
    {
      id: 'test-002',
      name: 'Database Integrity Check',
      type: 'Database Test',
      status: 'failed',
      result: 'Foreign key constraint violation detected',
      timestamp: '2024-01-15 13:45:00',
      duration: '5.7s'
    },
    {
      id: 'test-003',
      name: 'Security Policy Validation',
      type: 'Security Test',
      status: 'warning',
      result: 'Some RLS policies need review',
      timestamp: '2024-01-15 12:15:00',
      duration: '8.1s'
    },
    {
      id: 'test-004',
      name: 'Performance Benchmark',
      type: 'Performance Test',
      status: 'running',
      result: 'Test in progress...',
      timestamp: '2024-01-15 14:35:00',
      duration: 'Running'
    }
  ]

  const testTemplates = [
    {
      name: 'API Health Check',
      description: 'Validate all API endpoints are responding',
      category: 'api'
    },
    {
      name: 'Database Consistency',
      description: 'Check data integrity and constraints',
      category: 'database'
    },
    {
      name: 'Security Validation',
      description: 'Verify security policies and access controls',
      category: 'security'
    },
    {
      name: 'Performance Test',
      description: 'Measure system performance and response times',
      category: 'performance'
    }
  ]

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'passed': return CheckCircle
      case 'failed': return XCircle
      case 'warning': return AlertTriangle
      case 'running': return Clock
      default: return Clock
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'passed': return 'bg-success/10 text-success border-success/20'
      case 'failed': return 'bg-destructive/10 text-destructive border-destructive/20'
      case 'warning': return 'bg-warning/10 text-warning border-warning/20'
      case 'running': return 'bg-primary/10 text-primary border-primary/20'
      default: return 'bg-muted/10 text-muted-foreground border-muted/20'
    }
  }

  const runAssertion = () => {
    setIsRunning(true)
    // Simulate test execution
    setTimeout(() => {
      setIsRunning(false)
    }, 3000)
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Assertion Check</h1>
          <p className="text-muted-foreground">
            Secure testing and validation tool for system assertions
          </p>
        </div>
        <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
          Secure Environment
        </Badge>
      </div>

      {/* Test Runner */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-gradient-card border-card-border shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TestTube className="h-5 w-5 text-primary" />
              Create Assertion Test
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="test-name">Test Name</Label>
              <Input
                id="test-name"
                placeholder="Enter test name"
                className="bg-muted border-input-border"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="test-type">Test Type</Label>
              <select 
                id="test-type"
                value={testType}
                onChange={(e) => setTestType(e.target.value)}
                className="w-full px-3 py-2 bg-muted border border-input-border rounded-lg text-foreground"
              >
                <option value="api">API Test</option>
                <option value="database">Database Test</option>
                <option value="security">Security Test</option>
                <option value="performance">Performance Test</option>
                <option value="custom">Custom Test</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="assertion-code">Assertion Code</Label>
              <Textarea
                id="assertion-code"
                placeholder="Enter your assertion code here..."
                rows={6}
                className="bg-muted border-input-border font-mono text-sm"
                defaultValue={`// Example API assertion
assert(response.status === 200, 'API should return 200 status');
assert(response.data.length > 0, 'Response should contain data');
assert(response.headers['content-type'].includes('json'), 'Content type should be JSON');`}
              />
            </div>

            <Button 
              onClick={runAssertion}
              disabled={isRunning}
              className="w-full bg-gradient-primary hover:bg-primary-dark shadow-glow"
            >
              {isRunning ? (
                <>
                  <Clock className="h-4 w-4 mr-2 animate-spin" />
                  Running Test...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Run Assertion
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card border-card-border shadow-card">
          <CardHeader>
            <CardTitle>Test Templates</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {testTemplates.map((template, index) => (
              <div 
                key={index}
                className="p-3 border border-border rounded-lg hover:bg-accent cursor-pointer transition-smooth"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-medium text-foreground">{template.name}</h4>
                    <p className="text-sm text-muted-foreground mt-1">{template.description}</p>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {template.category}
                  </Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Test Results */}
      <Card className="bg-gradient-card border-card-border shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-primary" />
            Recent Test Results
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentTests.map((test) => {
              const StatusIcon = getStatusIcon(test.status)
              return (
                <div 
                  key={test.id}
                  className="flex items-center justify-between p-4 border border-border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <StatusIcon className={`h-5 w-5 ${
                      test.status === 'passed' ? 'text-success' :
                      test.status === 'failed' ? 'text-destructive' :
                      test.status === 'warning' ? 'text-warning' : 'text-primary'
                    }`} />
                    <div>
                      <h4 className="font-medium text-foreground">{test.name}</h4>
                      <p className="text-sm text-muted-foreground">{test.type}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm text-foreground">{test.result}</p>
                      <p className="text-xs text-muted-foreground">{test.timestamp}</p>
                    </div>
                    <div className="text-right">
                      <Badge variant="outline" className={getStatusColor(test.status)}>
                        {test.status}
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-1">{test.duration}</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Security Notice */}
      <Card className="bg-gradient-card border-destructive/20 shadow-card">
        <CardContent className="p-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-1" />
            <div>
              <h3 className="font-medium text-foreground mb-2">Security Notice</h3>
              <p className="text-sm text-muted-foreground">
                This assertion check tool operates in a secure, sandboxed environment. 
                All test executions are logged and monitored. Do not include sensitive 
                production data in your test assertions. Use placeholder values for testing purposes.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}