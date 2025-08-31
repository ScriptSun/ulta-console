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

      // Fetch all active subscriptions for MRR calculation
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

      // Calculate churn rate (cancellations in last 30 days / active subs 30 days ago)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const thirtyDaysAgoFormatted = formatDateForDB(thirtyDaysAgo);

      const { data: cancelledSubs, error: cancelledError } = await supabase
        .from('user_subscriptions')
        .select('*')
        .eq('status', 'cancelled')
        .gte('cancelled_at', thirtyDaysAgoFormatted);

      if (cancelledError) throw cancelledError;

      const { data: subsThirtyDaysAgo, error: oldSubsError } = await supabase
        .from('user_subscriptions')
        .select('*')
        .eq('status', 'active')
        .lte('started_at', thirtyDaysAgoFormatted);

      if (oldSubsError) throw oldSubsError;

      const churnRate = subsThirtyDaysAgo?.length ? 
        (cancelledSubs?.length || 0) / subsThirtyDaysAgo.length * 100 : 0;

      // Fetch MRR trend for last 6 months (independent of current filter)
      const mrrTrend = [];
      const churnTrend = [];
      for (let i = 5; i >= 0; i--) {
        const monthDate = new Date();
        monthDate.setMonth(monthDate.getMonth() - i);
        monthDate.setDate(1); // First day of month
        
        const nextMonthDate = new Date(monthDate);
        nextMonthDate.setMonth(nextMonthDate.getMonth() + 1);

        const monthDateFormatted = formatDateForDB(monthDate);
        const nextMonthDateFormatted = formatDateForDB(nextMonthDate);

        // Get MRR data for the month
        const { data: monthSubs, error: monthError } = await supabase
          .from('user_subscriptions')
          .select(`
            *,
            subscription_plans(price_monthly, price_cents)
          `)
          .eq('status', 'active')
          .lte('started_at', nextMonthDateFormatted)
          .or(`cancelled_at.is.null,cancelled_at.gte.${monthDateFormatted}`);

        if (monthError) throw monthError;

        const monthMrr = monthSubs?.reduce((sum, sub) => {
          const planPrice = sub.subscription_plans?.price_monthly || 0;
          return sum + planPrice;
        }, 0) || 0;

        // Get churn data for the month
        const { data: monthCancelledSubs, error: churnError } = await supabase
          .from('user_subscriptions')
          .select('*')
          .eq('status', 'cancelled')
          .gte('cancelled_at', monthDateFormatted)
          .lt('cancelled_at', nextMonthDateFormatted);

        if (churnError) throw churnError;

        const { data: monthActiveSubs, error: activeError } = await supabase
          .from('user_subscriptions')
          .select('*')
          .eq('status', 'active')
          .lte('started_at', monthDateFormatted);

        if (activeError) throw activeError;

        const monthChurnRate = monthActiveSubs?.length ? 
          (monthCancelledSubs?.length || 0) / monthActiveSubs.length * 100 : 0;

        mrrTrend.push({
          date: monthDateFormatted,
          mrr: monthMrr
        });

        churnTrend.push({
          date: monthDateFormatted,
          churn: monthChurnRate
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
        previousPeriodChurn: 0 // Simplified for now
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