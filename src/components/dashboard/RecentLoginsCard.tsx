import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, MapPin, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useRecentLogins } from '@/hooks/useDashboardData';
import { DateRange } from '@/hooks/useDateRangeFilter';
import { formatDistanceToNow } from 'date-fns';

interface LoginEvent {
  id: string;
  user_id: string;
  occurred_at: string;
  ip: string;
  geo_country?: string;
  geo_city?: string;
  status: string;
  profiles?: { full_name?: string };
}

interface RecentLoginsCardProps {
  dateRange: DateRange;
}

export function RecentLoginsCard({ dateRange }: RecentLoginsCardProps) {
  const { data, isLoading, error } = useRecentLogins(dateRange);

  const isUnusualLocation = (country: string, city: string) => {
    // Simple heuristic - flag locations that are not common
    const commonCountries = ['US', 'United States', 'CA', 'Canada', 'GB', 'United Kingdom'];
    return country && !commonCountries.includes(country);
  };

  if (error) {
    return (
      <Card className="bg-gradient-card border-card-border shadow-card">
        <CardHeader>
          <CardTitle className="text-destructive">Recent Logins - Error</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Failed to load login data</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-card border-card-border shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          Recent Logins
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <Skeleton className="h-6 w-16" />
              </div>
            ))}
          </div>
        ) : data && data.length > 0 ? (
          <div className="space-y-3">
            <div className="grid grid-cols-5 gap-2 text-xs font-medium text-muted-foreground pb-2 border-b border-border">
              <span>User</span>
              <span>Time</span>
              <span>IP</span>
              <span>Location</span>
              <span>Status</span>
            </div>
            {data.map((login: LoginEvent, index) => (
              <div key={index} className="grid grid-cols-5 gap-2 text-sm items-center py-2">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${
                    login.status === 'success' ? 'bg-success' : 'bg-destructive'
                  }`} />
                  <span className="text-foreground font-medium truncate">
                    {login.profiles?.full_name || 'Unknown User'}
                  </span>
                </div>
                
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span className="text-xs">
                    {formatDistanceToNow(new Date(login.occurred_at), { addSuffix: true })}
                  </span>
                </div>
                
                <div className="text-muted-foreground text-xs font-mono">
                  {login.ip || 'N/A'}
                </div>
                
                <div className="flex items-center gap-1">
                  {login.geo_country && (
                    <>
                      <MapPin className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        {login.geo_city ? `${login.geo_city}, ${login.geo_country}` : login.geo_country}
                      </span>
                      {isUnusualLocation(login.geo_country, login.geo_city) && (
                        <Badge variant="destructive" className="text-xs">Unusual</Badge>
                      )}
                    </>
                  )}
                </div>
                
                <div>
                  <Badge 
                    variant={login.status === 'success' ? 'default' : 'destructive'}
                    className="text-xs"
                  >
                    {login.status}
                  </Badge>
                  {login.status === 'failed' && (
                    <Badge variant="destructive" className="ml-1 text-xs">Failed</Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No login events in this range</p>
            <p className="text-xs text-muted-foreground mt-1">
              Login tracking may not be fully configured yet
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}