import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CreditCard, Check, Zap, Crown, Star } from 'lucide-react'
import { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'

export default function Plans() {
  const [currentPlan, setCurrentPlan] = useState<any>(null)
  const [usage, setUsage] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  const availablePlans = [
    {
      name: 'Free',
      price: '$0',
      period: 'per month',
      description: 'Perfect for getting started with agents',
      features: [
        '25 AI requests per month',
        '25 server events per month',
        'Basic support',
        'Community access'
      ],
      monthly_ai_requests: 25,
      monthly_server_events: 25,
      popular: false,
      current: false
    },
    {
      name: 'Basic',
      price: '$10',
      period: 'per month',
      description: 'Ideal for small projects and teams',
      features: [
        '70 AI requests per month',
        '70 server events per month',
        'Email support',
        'Basic analytics'
      ],
      monthly_ai_requests: 70,
      monthly_server_events: 70,
      popular: false,
      current: false
    },
    {
      name: 'Pro',
      price: '$16',
      period: 'per month',
      description: 'Best for growing businesses',
      features: [
        '125 AI requests per month',
        '125 server events per month',
        'Priority support',
        'Advanced analytics',
        'Custom integrations'
      ],
      monthly_ai_requests: 125,
      monthly_server_events: 125,
      popular: true,
      current: false
    },
    {
      name: 'Premium',
      price: '$19',
      period: 'per month',
      description: 'For high-volume agent operations',
      features: [
        '200 AI requests per month',
        '200 server events per month',
        'Dedicated support',
        'Advanced analytics',
        'Custom integrations',
        'Priority processing'
      ],
      monthly_ai_requests: 200,
      monthly_server_events: 200,
      popular: false,
      current: false
    }
  ]

  useEffect(() => {
    fetchCurrentPlan()
    fetchUsage()
  }, [])

  const fetchCurrentPlan = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Get user's customer IDs
      const { data: userRoles } = await supabase
        .from('user_roles')
        .select('customer_id')
        .eq('user_id', user.id)
        .limit(1)

      if (!userRoles?.[0]) return

      const customerId = userRoles[0].customer_id

      // Get current subscription
      const { data: subscription } = await supabase
        .from('user_subscriptions')
        .select(`
          *,
          subscription_plans (*)
        `)
        .eq('user_id', user.id)
        .eq('customer_id', customerId)
        .eq('status', 'active')
        .single()

      if (subscription) {
        setCurrentPlan({
          name: subscription.subscription_plans.name,
          price: subscription.subscription_plans.name === 'Free' ? 'Free' : `$${(subscription.subscription_plans.price_cents / 100)}/month`,
          status: subscription.status,
          renewalDate: subscription.current_period_end,
          monthly_ai_requests: subscription.subscription_plans.monthly_ai_requests,
          monthly_server_events: subscription.subscription_plans.monthly_server_events
        })
      } else {
        // Default to free plan
        setCurrentPlan({
          name: 'Free',
          price: 'Free',
          status: 'active',
          renewalDate: null,
          monthly_ai_requests: 25,
          monthly_server_events: 25
        })
      }
    } catch (error) {
      console.error('Error fetching current plan:', error)
      toast({
        title: "Error",
        description: "Failed to load current plan",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchUsage = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: userRoles } = await supabase
        .from('user_roles')
        .select('customer_id')
        .eq('user_id', user.id)
        .limit(1)

      if (!userRoles?.[0]) return

      const customerId = userRoles[0].customer_id

      // Get current month usage
      const today = new Date().toISOString().split('T')[0]
      const { data: usageData } = await supabase
        .from('usage_tracking')
        .select('*')
        .eq('user_id', user.id)
        .eq('customer_id', customerId)
        .eq('usage_date', today)

      const aiUsage = usageData?.find(u => u.usage_type === 'ai_request')?.count || 0
      const serverUsage = usageData?.find(u => u.usage_type === 'server_event')?.count || 0

      setUsage({
        ai_requests: aiUsage,
        server_events: serverUsage
      })
    } catch (error) {
      console.error('Error fetching usage:', error)
    }
  }

  const billingHistory = [
    {
      date: '2024-01-15',
      plan: 'Pro',
      amount: '$49.00',
      status: 'paid',
      invoice: 'INV-2024-001'
    },
    {
      date: '2023-12-15',
      plan: 'Pro',
      amount: '$49.00',
      status: 'paid',
      invoice: 'INV-2023-012'
    },
    {
      date: '2023-11-15',
      plan: 'Starter',
      amount: '$19.00',
      status: 'paid',
      invoice: 'INV-2023-011'
    }
  ]

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Plans & Billing</h1>
          <p className="text-muted-foreground">
            Manage your subscription and billing information
          </p>
        </div>
        <Button variant="outline">
          <CreditCard className="h-4 w-4 mr-2" />
          Update Payment Method
        </Button>
      </div>

      {/* Current Plan */}
      {loading ? (
        <Card className="bg-gradient-primary border-primary shadow-glow">
          <CardContent className="text-white p-8 text-center">
            <Zap className="h-8 w-8 mx-auto mb-4 animate-pulse" />
            <p>Loading your plan...</p>
          </CardContent>
        </Card>
      ) : currentPlan ? (
        <Card className="bg-gradient-primary border-primary shadow-glow">
          <CardHeader className="text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Crown className="h-6 w-6" />
                <div>
                  <CardTitle className="text-xl">Current Plan: {currentPlan.name}</CardTitle>
                  <p className="text-white/80">{currentPlan.price}</p>
                </div>
              </div>
              <Badge className="bg-white/20 text-white border-white/30">
                {currentPlan.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="text-white space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-white/80">Plan limits:</p>
                <ul className="mt-2 space-y-1">
                  <li className="flex items-center gap-2 text-sm">
                    <Check className="h-3 w-3" />
                    {currentPlan.monthly_ai_requests} AI requests per month
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <Check className="h-3 w-3" />
                    {currentPlan.monthly_server_events} server events per month
                  </li>
                </ul>
              </div>
              <div className="space-y-2">
                {usage && (
                  <div>
                    <p className="text-sm text-white/80">Current usage:</p>
                    <p className="font-medium">AI Requests: {usage.ai_requests}/{currentPlan.monthly_ai_requests}</p>
                    <p className="font-medium">Server Events: {usage.server_events}/{currentPlan.monthly_server_events}</p>
                  </div>
                )}
                {currentPlan.renewalDate && (
                  <div>
                    <p className="text-sm text-white/80">Next billing date</p>
                    <p className="font-medium">{new Date(currentPlan.renewalDate).toLocaleDateString()}</p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* Available Plans */}
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-4">Available Plans</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {availablePlans.map((plan) => (
            <Card 
              key={plan.name} 
              className={`relative bg-gradient-card border-card-border shadow-card ${
                plan.popular ? 'ring-2 ring-primary' : ''
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-gradient-primary text-white shadow-glow">
                    <Star className="h-3 w-3 mr-1" />
                    Most Popular
                  </Badge>
                </div>
              )}
              <CardHeader className="text-center pb-4">
                <CardTitle className="text-xl">{plan.name}</CardTitle>
                <div className="mt-2">
                  <span className="text-3xl font-bold text-foreground">{plan.price}</span>
                  <span className="text-muted-foreground">/{plan.period.split(' ')[1]}</span>
                </div>
                <p className="text-sm text-muted-foreground mt-2">{plan.description}</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-success flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button 
                  className={`w-full ${
                    currentPlan?.name === plan.name
                      ? 'bg-muted text-muted-foreground cursor-not-allowed' 
                      : plan.popular 
                        ? 'bg-gradient-primary hover:bg-primary-dark shadow-glow' 
                        : ''
                  }`}
                  disabled={currentPlan?.name === plan.name}
                >
                  {currentPlan?.name === plan.name ? 'Current Plan' : `Contact for ${plan.name}`}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Billing History */}
      <Card className="bg-gradient-card border-card-border shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            Billing History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-5 gap-4 text-sm font-medium text-muted-foreground">
              <span>Date</span>
              <span>Plan</span>
              <span>Amount</span>
              <span>Status</span>
              <span>Invoice</span>
            </div>
            {billingHistory.map((entry, index) => (
              <div key={index} className="grid grid-cols-5 gap-4 text-sm py-3 border-b border-border last:border-b-0">
                <span className="text-foreground">{entry.date}</span>
                <span className="text-muted-foreground">{entry.plan}</span>
                <span className="text-muted-foreground">{entry.amount}</span>
                <Badge variant="outline" className="bg-success/10 text-success border-success/20 w-fit">
                  {entry.status}
                </Badge>
                <Button variant="link" size="sm" className="p-0 h-auto justify-start">
                  {entry.invoice}
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}