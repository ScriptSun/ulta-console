import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Crown, ExternalLink, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface UsageLimitCardProps {
  currentUsage: number;
  limitAmount: number;
  planName: string;
  onRefresh?: () => void;
}

export const UsageLimitCard: React.FC<UsageLimitCardProps> = ({
  currentUsage,
  limitAmount,
  planName,
  onRefresh
}) => {
  const [upgradeUrl, setUpgradeUrl] = useState<string>('/subscription-plans');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadUpgradeUrl();
  }, []);

  const loadUpgradeUrl = async () => {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('setting_value')
        .eq('setting_key', 'upgrade_url')
        .single();

      if (error && error.code !== 'PGRST116') { // Not found error
        console.error('Error loading upgrade URL:', error);
        return;
      }

      if (data?.setting_value) {
        setUpgradeUrl(String(data.setting_value));
      }
    } catch (error) {
      console.error('Error loading upgrade URL:', error);
    }
  };

  const handleUpgradeClick = () => {
    // Check if it's an external URL or internal route
    if (upgradeUrl.startsWith('http')) {
      window.open(upgradeUrl, '_blank', 'noopener,noreferrer');
    } else {
      window.location.href = upgradeUrl;
    }
  };

  const handleRefresh = async () => {
    setIsLoading(true);
    try {
      if (onRefresh) {
        onRefresh();
      }
      toast({
        title: "Refreshed",
        description: "Usage data has been updated",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to refresh usage data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const usagePercentage = Math.round((currentUsage / limitAmount) * 100);
  const isFreePlan = planName.toLowerCase().includes('free');

  return (
    <Card className="border-2 border-destructive/20 bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-950/20 dark:to-orange-950/20">
      <CardContent className="p-6 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-full bg-destructive/10">
            <AlertTriangle className="h-5 w-5 text-destructive" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">AI Usage Limit Reached</h3>
            <p className="text-sm text-muted-foreground">You've exceeded your monthly AI request quota</p>
          </div>
        </div>

        {/* Usage Stats */}
        <div className="bg-background/50 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Current Usage</span>
            <Badge variant={usagePercentage >= 100 ? 'destructive' : 'secondary'} className="text-xs">
              {currentUsage}/{limitAmount} requests
            </Badge>
          </div>
          
          <div className="w-full bg-muted rounded-full h-2">
            <div 
              className="h-2 rounded-full bg-gradient-to-r from-amber-500 to-red-500 transition-all duration-300"
              style={{ width: `${Math.min(usagePercentage, 100)}%` }}
            />
          </div>
          
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Plan: {planName}</span>
            <span>{usagePercentage}% used</span>
          </div>
        </div>

        {/* Message */}
        <div className="text-center space-y-2">
          <p className="text-sm text-foreground">
            {isFreePlan ? (
              <>Upgrade to a paid plan to get more AI requests and unlock premium features.</>
            ) : (
              <>You've reached your plan's limit. Upgrade to continue using AI features.</>
            )}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          <Button 
            onClick={handleUpgradeClick}
            className="flex-1 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white shadow-lg"
          >
            <Crown className="h-4 w-4 mr-2" />
            Upgrade Plan
            <ExternalLink className="h-4 w-4 ml-2" />
          </Button>
          
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {/* Additional Info */}
        <div className="text-xs text-muted-foreground text-center pt-2 border-t border-border/50">
          Need help? Contact support or check our documentation
        </div>
      </CardContent>
    </Card>
  );
};