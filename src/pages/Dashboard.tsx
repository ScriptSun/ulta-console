import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Activity, Bot, CheckSquare, Shield, TrendingUp, Users } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'

export default function Dashboard() {
  const [totalUsers, setTotalUsers] = useState(0)

  useEffect(() => {
    const fetchTotalUsers = async () => {
      try {
        const { count, error } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
        
        if (error) throw error
        setTotalUsers(count || 0)
      } catch (error) {
        console.error('Error fetching total users:', error)
      }
    }

    fetchTotalUsers()
  }, [])

  const stats = [
    {
      title: 'Total Users',
      value: totalUsers.toString(),
      change: '+5%',
      icon: Users,
      color: 'text-blue-500'
    },
    {
      title: 'Active Agents',
      value: '24',
      change: '+12%',
      icon: Bot,
      color: 'text-primary'
    },
    {
      title: 'Running Tasks',
      value: '156',
      change: '+8%',
      icon: CheckSquare,
      color: 'text-success'
    },
    {
      title: 'Security Events',
      value: '7',
      change: '-2%',
      icon: Shield,
      color: 'text-destructive'
    }
  ]

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">
            Monitor your AI agents and system performance
          </p>
        </div>
        <Badge variant="outline" className="bg-success/10 text-success border-success/20">
          All Systems Operational
        </Badge>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <Card key={stat.title} className="bg-gradient-card border-card-border shadow-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{stat.value}</div>
              <p className="text-xs text-muted-foreground">
                <span className={stat.change.startsWith('+') ? 'text-success' : 'text-destructive'}>
                  {stat.change}
                </span>
                {' '}from last month
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-gradient-card border-card-border shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { action: 'Agent "DataProcessor" started', time: '2 minutes ago', status: 'success' },
                { action: 'API key "prod-key-001" rotated', time: '15 minutes ago', status: 'warning' },
                { action: 'Task batch completed successfully', time: '32 minutes ago', status: 'success' },
                { action: 'Security scan detected anomaly', time: '1 hour ago', status: 'error' },
              ].map((activity, index) => (
                <div key={index} className="flex items-center justify-between py-2 border-b border-border last:border-b-0">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${
                      activity.status === 'success' ? 'bg-success' :
                      activity.status === 'warning' ? 'bg-warning' : 'bg-destructive'
                    }`} />
                    <span className="text-sm text-foreground">{activity.action}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{activity.time}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card border-card-border shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              System Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { metric: 'CPU Usage', value: '45%', color: 'bg-success' },
                { metric: 'Memory Usage', value: '67%', color: 'bg-warning' },
                { metric: 'Disk Usage', value: '23%', color: 'bg-success' },
                { metric: 'Network I/O', value: '89%', color: 'bg-destructive' },
              ].map((metric, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-foreground">{metric.metric}</span>
                    <span className="text-muted-foreground">{metric.value}</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${metric.color}`}
                      style={{ width: metric.value }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}