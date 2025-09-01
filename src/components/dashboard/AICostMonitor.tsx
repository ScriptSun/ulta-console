import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DollarSign, TrendingUp, Zap, BarChart } from 'lucide-react';
import { DateRange } from '@/hooks/useDateRangeFilter';

// AI model pricing configuration
const MODEL_PRICING = {
  // OpenAI Models
  'gpt-4o-mini': {
    prompt_cost_per_1k: 0.000150,
    completion_cost_per_1k: 0.000600,
    displayName: 'GPT-4o Mini'
  },
  'gpt-4o': {
    prompt_cost_per_1k: 0.005000,
    completion_cost_per_1k: 0.015000,
    displayName: 'GPT-4o'
  },
  'gpt-5-mini-2025-08-07': {
    prompt_cost_per_1k: 0.000200,
    completion_cost_per_1k: 0.000800,
    displayName: 'GPT-5 Mini'
  },
  'gpt-5-2025-08-07': {
    prompt_cost_per_1k: 0.010000,
    completion_cost_per_1k: 0.030000,
    displayName: 'GPT-5'
  },
  // Claude Models
  'claude-3-5-sonnet-20241022': {
    prompt_cost_per_1k: 0.003000,
    completion_cost_per_1k: 0.015000,
    displayName: 'Claude 3.5 Sonnet'
  },
  'claude-3-5-haiku-20241022': {
    prompt_cost_per_1k: 0.000250,
    completion_cost_per_1k: 0.001250,
    displayName: 'Claude 3.5 Haiku'
  },
  'claude-3-opus-20240229': {
    prompt_cost_per_1k: 0.015000,
    completion_cost_per_1k: 0.075000,
    displayName: 'Claude 3 Opus'
  },
  'claude-sonnet-4-20250514': {
    prompt_cost_per_1k: 0.005000,
    completion_cost_per_1k: 0.025000,
    displayName: 'Claude 4 Sonnet'
  },
  'claude-opus-4-20250514': {
    prompt_cost_per_1k: 0.020000,
    completion_cost_per_1k: 0.100000,
    displayName: 'Claude 4 Opus'
  },
  // Gemini Models
  'gemini-1.5-pro': {
    prompt_cost_per_1k: 0.003500,
    completion_cost_per_1k: 0.010500,
    displayName: 'Gemini 1.5 Pro'
  },
  'gemini-1.5-flash': {
    prompt_cost_per_1k: 0.000075,
    completion_cost_per_1k: 0.000300,
    displayName: 'Gemini 1.5 Flash'
  },
  'gemini-2.0-flash-exp': {
    prompt_cost_per_1k: 0.000075,
    completion_cost_per_1k: 0.000300,
    displayName: 'Gemini 2.0 Flash'
  }
} as const;

interface AICostData {
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalRequests: number;
  cost: number;
}

interface AICostMonitorProps {
  costData: AICostData[];
  dateRange: DateRange;
  isLoading?: boolean;
}

export function AICostMonitor({ costData, dateRange, isLoading }: AICostMonitorProps) {
  if (isLoading) {
    return (
      <Card className="bg-gradient-card border-card-border shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            AI Cost Monitor
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="p-3 rounded-lg bg-muted/30 animate-pulse">
                <div className="h-4 bg-muted rounded w-20 mb-2"></div>
                <div className="h-6 bg-muted rounded w-16"></div>
              </div>
            ))}
          </div>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 animate-pulse">
                <div className="space-y-2">
                  <div className="h-4 bg-muted rounded w-24"></div>
                  <div className="h-3 bg-muted rounded w-32"></div>
                </div>
                <div className="h-6 bg-muted rounded w-12"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calculate totals
  const totalCost = costData.reduce((sum, item) => sum + item.cost, 0);
  const totalTokens = costData.reduce((sum, item) => sum + item.promptTokens + item.completionTokens, 0);
  const totalRequests = costData.reduce((sum, item) => sum + item.totalRequests, 0);
  const avgCostPerRequest = totalRequests > 0 ? totalCost / totalRequests : 0;

  // Calculate cost breakdown
  const calculateCost = (model: string, promptTokens: number, completionTokens: number) => {
    const pricing = MODEL_PRICING[model as keyof typeof MODEL_PRICING];
    if (!pricing) return 0;
    
    return (
      (promptTokens / 1000) * pricing.prompt_cost_per_1k +
      (completionTokens / 1000) * pricing.completion_cost_per_1k
    );
  };

  // Show only specific models as requested
  const selectedModels = [
    'gpt-5-mini-2025-08-07',  // GPT-5 Mini
    'gpt-4o-mini',            // GPT-4o Mini
    'claude-sonnet-4-20250514', // Claude 4 Sonnet
    'gemini-2.0-flash-exp'    // Gemini 2.0 Flash
  ];
  
  const enrichedCostData = selectedModels.map(modelKey => {
    const existingData = costData.find(item => item.model === modelKey);
    const pricing = MODEL_PRICING[modelKey as keyof typeof MODEL_PRICING];
    
    if (existingData) {
      return {
        ...existingData,
        displayName: pricing?.displayName || existingData.model,
        cost: calculateCost(existingData.model, existingData.promptTokens, existingData.completionTokens)
      };
    } else {
      // Show models with zero usage
      return {
        model: modelKey,
        promptTokens: 0,
        completionTokens: 0,
        totalRequests: 0,
        cost: 0,
        displayName: pricing?.displayName || modelKey
      };
    }
  }).sort((a, b) => b.cost - a.cost || b.totalRequests - a.totalRequests);

  return (
    <Card className="bg-gradient-card border-card-border shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-primary" />
          AI Cost Monitor
          <Badge variant="outline" className="ml-auto">
            {dateRange.label}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-1">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {/* Total Cost */}
          <div className="p-3 rounded-lg bg-card border border-primary/30 relative overflow-hidden">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-2">
              <DollarSign className="h-3 w-3" />
              Total Cost
            </div>
            <div className="text-2xl font-bold text-card-foreground mb-1">
              ${totalCost.toFixed(4)}
            </div>
            <div className="text-xs text-muted-foreground">
              For {dateRange.label.toLowerCase()}
            </div>
            {/* Subtle gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent pointer-events-none"></div>
          </div>
          
          {/* Total Tokens */}
          <div className="p-3 rounded-lg bg-card border border-accent/30 relative overflow-hidden">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-2">
              <Zap className="h-3 w-3" />
              Total Tokens
            </div>
            <div className="text-2xl font-bold text-card-foreground mb-1">
              {totalTokens.toLocaleString()}
            </div>
            <div className="text-xs text-muted-foreground">
              Processed tokens
            </div>
            {/* Subtle gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-accent/10 via-transparent to-transparent pointer-events-none"></div>
          </div>
          
          {/* Requests */}
          <div className="p-3 rounded-lg bg-card border border-secondary/30 relative overflow-hidden">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-2">
              <BarChart className="h-3 w-3" />
              Requests
            </div>
            <div className="text-2xl font-bold text-card-foreground mb-1">
              {totalRequests.toLocaleString()}
            </div>
            <div className="text-xs text-muted-foreground">
              API calls made
            </div>
            {/* Subtle gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-secondary/10 via-transparent to-transparent pointer-events-none"></div>
          </div>
          
          {/* Avg/Request */}
          <div className="p-3 rounded-lg bg-card border border-primary/30 relative overflow-hidden">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-2">
              <TrendingUp className="h-3 w-3" />
              Avg/Request
            </div>
            <div className="text-2xl font-bold text-card-foreground mb-1">
              ${avgCostPerRequest.toFixed(4)}
            </div>
            <div className="text-xs text-muted-foreground">
              Cost efficiency
            </div>
            {/* Subtle gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent pointer-events-none"></div>
          </div>
        </div>

        {/* Model Breakdown */}
        {enrichedCostData.length > 0 ? (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground mb-3">Cost by Model</h4>
            <div className="max-h-[240px] overflow-y-auto space-y-3 pr-2 scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
              {enrichedCostData.map((item, index) => (
                <div
                  key={item.model}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary font-semibold text-xs">
                      {index + 1}
                    </div>
                    <div className="space-y-1">
                      <div className="font-medium text-foreground">
                        {item.displayName}
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>{item.totalRequests} requests</span>
                        <span>{item.promptTokens.toLocaleString()} prompt</span>
                        <span>{item.completionTokens.toLocaleString()} completion</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-semibold text-primary">
                      ${item.cost.toFixed(4)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {totalCost > 0 ? `${((item.cost / totalCost) * 100).toFixed(1)}%` : '0%'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-32">
            <p className="text-muted-foreground">No AI usage data available for the selected period</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}