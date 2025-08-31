import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DateRange } from './useDateRangeFilter';

export interface RevenueMetrics {
  activeSubscriptions: number;
  mrr: number;
  arpu: number;
  churnRate: number;
  mrrTrend: Array<{
    date: string;
    mrr: number;
  }>;
  churnTrend: Array<{
    date: string;
    churn: number;
  }>;
  previousPeriodMrr: number;
  previousPeriodArpu: number;
  previousPeriodChurn: number;
  periodLabel: string; // Add period label for dynamic text
}

export function useRevenueData(dateRange: DateRange) {
  const [data, setData] = useState<RevenueMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchRevenueData();
  }, [dateRange]);

  const fetchRevenueData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Format dates properly for PostgreSQL
      const formatDateForDB = (date: Date | string): string => {
        const d = new Date(date);
        return d.toISOString().split('T')[0]; // YYYY-MM-DD format
      };

      const from = formatDateForDB(dateRange.start);
      const to = formatDateForDB(dateRange.end);
      
      // Calculate previous period dates for comparison
      const fromDate = new Date(dateRange.start);
      const toDate = new Date(dateRange.end);
      const periodLength = toDate.getTime() - fromDate.getTime();
      const previousFrom = formatDateForDB(new Date(fromDate.getTime() - periodLength));
      const previousTo = formatDateForDB(fromDate);

      // Fetch active subscriptions in current period
      const { data: activeSubsData, error: activeSubsError } = await supabase
        .from('user_subscriptions')
        .select(`
          *,
          subscription_plans(price_monthly, price_cents)
        `)
        .eq('status', 'active')
        .gte('started_at', from)
        .lte('started_at', to);

      if (activeSubsError) throw activeSubsError;

      // Fetch all active subscriptions for MRR calculation (current active ones)
      const { data: allActiveSubs, error: allActiveError } = await supabase
        .from('user_subscriptions')
        .select(`
          *,
          subscription_plans(price_monthly, price_cents)
        `)
        .eq('status', 'active');

      if (allActiveError) throw allActiveError;

      // Calculate current metrics
      const activeSubscriptions = activeSubsData?.length || 0;
      const mrr = allActiveSubs?.reduce((sum, sub) => {
        const planPrice = sub.subscription_plans?.price_monthly || 0;
        return sum + planPrice;
      }, 0) || 0;

      // Count unique users with active subscriptions for ARPU
      const activeUsers = new Set(allActiveSubs?.map(sub => sub.user_id) || []).size;
      const arpu = activeUsers > 0 ? mrr / activeUsers : 0;

      // Calculate churn rate for the selected period
      const periodStart = new Date(dateRange.start);
      const periodEnd = new Date(dateRange.end);

      const { data: cancelledSubs, error: cancelledError } = await supabase
        .from('user_subscriptions')
        .select('*')
        .eq('status', 'cancelled')
        .gte('cancelled_at', formatDateForDB(periodStart))
        .lte('cancelled_at', formatDateForDB(periodEnd));

      if (cancelledError) throw cancelledError;

      const { data: activeDuringPeriod, error: activeError } = await supabase
        .from('user_subscriptions')
        .select('*')
        .eq('status', 'active')
        .lte('started_at', formatDateForDB(periodStart));

      if (activeError) throw activeError;

      const churnRate = activeDuringPeriod?.length ? 
        (cancelledSubs?.length || 0) / activeDuringPeriod.length * 100 : 0;

      // Generate trend data for the selected period
      const selectedPeriodDays = Math.ceil((new Date(dateRange.end).getTime() - new Date(dateRange.start).getTime()) / (1000 * 60 * 60 * 24));
      const trendPeriods = Math.min(selectedPeriodDays, 30); // Max 30 data points for readability
      const intervalDays = Math.max(1, Math.floor(selectedPeriodDays / trendPeriods));
      
      const mrrTrend = [];
      const churnTrend = [];
      
      for (let i = trendPeriods - 1; i >= 0; i--) {
        const pointDate = new Date(dateRange.end);
        pointDate.setDate(pointDate.getDate() - (i * intervalDays));
        
        const nextPointDate = new Date(pointDate);
        nextPointDate.setDate(nextPointDate.getDate() + intervalDays);

        const pointDateFormatted = formatDateForDB(pointDate);
        const nextPointDateFormatted = formatDateForDB(nextPointDate);

        // Get MRR data for this point
        const { data: pointSubs, error: pointError } = await supabase
          .from('user_subscriptions')
          .select(`
            *,
            subscription_plans(price_monthly, price_cents)
          `)
          .eq('status', 'active')
          .lte('started_at', pointDateFormatted)
          .or(`cancelled_at.is.null,cancelled_at.gte.${pointDateFormatted}`);

        if (pointError) throw pointError;

        const pointMrr = pointSubs?.reduce((sum, sub) => {
          const planPrice = sub.subscription_plans?.price_monthly || 0;
          return sum + planPrice;
        }, 0) || 0;

        // Get churn data for this point (simplified for performance)
        const pointChurnRate = 0; // Simplified churn calculation for trend

        mrrTrend.push({
          date: pointDateFormatted,
          mrr: pointMrr
        });

        churnTrend.push({
          date: pointDateFormatted,
          churn: pointChurnRate
        });
      }

      // Calculate previous period metrics for trend indicators
      const { data: previousSubs, error: prevError } = await supabase
        .from('user_subscriptions')
        .select(`
          *,
          subscription_plans(price_monthly, price_cents)
        `)
        .eq('status', 'active')
        .gte('started_at', previousFrom)
        .lte('started_at', previousTo);

      if (prevError) throw prevError;

      const previousPeriodMrr = previousSubs?.reduce((sum, sub) => {
        const planPrice = sub.subscription_plans?.price_monthly || 0;
        return sum + planPrice;
      }, 0) || 0;

      const prevActiveUsers = new Set(previousSubs?.map(sub => sub.user_id) || []).size;
      const previousPeriodArpu = prevActiveUsers > 0 ? previousPeriodMrr / prevActiveUsers : 0;

      setData({
        activeSubscriptions,
        mrr,
        arpu,
        churnRate,
        mrrTrend,
        churnTrend,
        previousPeriodMrr,
        previousPeriodArpu,
        previousPeriodChurn: 0, // Simplified for now
        periodLabel: dateRange.label // Add the period label
      });

    } catch (error) {
      console.error('Error fetching revenue data:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch revenue data');
    } finally {
      setIsLoading(false);
    }
  };

  return { data, isLoading, error, refetch: fetchRevenueData };
}