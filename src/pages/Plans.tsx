import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CreditCard, Check, Zap, Crown, Star } from 'lucide-react'

export default function Plans() {
  const currentPlan = {
    name: 'Pro',
    price: '$49/month',
    status: 'active',
    renewalDate: '2024-02-15',
    features: ['10,000 API requests', '1,000 compute hours', '100GB storage', 'Priority support']
  }

  const availablePlans = [
    {
      name: 'Starter',
      price: '$19',
      period: 'per month',
      description: 'Perfect for small projects and experimentation',
      features: [
        '2,500 API requests',
        '100 compute hours',
        '25GB storage',
        'Community support',
        'Basic analytics'
      ],
      popular: false,
      current: false
    },
    {
      name: 'Pro',
      price: '$49',
      period: 'per month',
      description: 'Best for growing businesses and teams',
      features: [
        '10,000 API requests',
        '1,000 compute hours',
        '100GB storage',
        'Priority support',
        'Advanced analytics',
        'Custom integrations'
      ],
      popular: true,
      current: true
    },
    {
      name: 'Enterprise',
      price: '$199',
      period: 'per month',
      description: 'For large-scale production applications',
      features: [
        'Unlimited API requests',
        '10,000 compute hours',
        '1TB storage',
        'Dedicated support',
        'Advanced analytics',
        'Custom integrations',
        'SLA guarantee',
        'Custom models'
      ],
      popular: false,
      current: false
    }
  ]

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
              <p className="text-sm text-white/80">Features included:</p>
              <ul className="mt-2 space-y-1">
                {currentPlan.features.map((feature, index) => (
                  <li key={index} className="flex items-center gap-2 text-sm">
                    <Check className="h-3 w-3" />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
            <div className="space-y-2">
              <div>
                <p className="text-sm text-white/80">Next billing date</p>
                <p className="font-medium">{currentPlan.renewalDate}</p>
              </div>
              <Button variant="secondary" size="sm">
                Manage Subscription
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

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
                    plan.current 
                      ? 'bg-muted text-muted-foreground cursor-not-allowed' 
                      : plan.popular 
                        ? 'bg-gradient-primary hover:bg-primary-dark shadow-glow' 
                        : ''
                  }`}
                  disabled={plan.current}
                >
                  {plan.current ? 'Current Plan' : `Upgrade to ${plan.name}`}
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