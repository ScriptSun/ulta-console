import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface NotificationData {
  type: 'welcome' | 'security_alert' | 'system_update' | 'notification';
  to?: string;
  subject?: string;
  data?: any;
}

export function useEmailNotifications() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const sendNotification = async ({
    type,
    to,
    subject,
    data
  }: NotificationData) => {
    if (!user && !to) {
      toast({
        title: 'Error',
        description: 'User must be logged in or email must be provided.',
        variant: 'destructive',
      });
      return false;
    }

    setLoading(true);

    try {
      const { data: result, error } = await supabase.functions.invoke('sendgrid-email', {
        body: {
          type,
          to: to || user?.email,
          subject,
          data,
          user_id: user?.id
        }
      });

      if (error) throw error;

      if (result.success) {
        toast({
          title: 'Notification Sent',
          description: `${type.replace('_', ' ')} email sent successfully.`,
        });
        return true;
      } else {
        throw new Error(result.message || 'Failed to send notification');
      }
    } catch (error: any) {
      console.error('Email notification error:', error);
      toast({
        title: 'Notification Failed',
        description: error.message || 'Failed to send email notification.',
        variant: 'destructive',
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const sendWelcomeEmail = async (email?: string, userName?: string) => {
    return sendNotification({
      type: 'welcome',
      to: email,
      data: {
        name: userName || user?.email?.split('@')[0],
        dashboardLink: `${window.location.origin}/dashboard`
      }
    });
  };

  const sendSecurityAlert = async (alertType: string, details: string) => {
    return sendNotification({
      type: 'security_alert',
      data: {
        eventType: alertType,
        details,
        timestamp: new Date().toISOString(),
        securityLink: `${window.location.origin}/security`
      }
    });
  };

  const sendSystemUpdate = async (title: string, message: string, features?: string[]) => {
    return sendNotification({
      type: 'system_update',
      data: {
        title,
        message,
        features
      }
    });
  };

  const sendCustomNotification = async (subject: string, message: string, email?: string) => {
    return sendNotification({
      type: 'notification',
      to: email,
      subject,
      data: {
        message
      }
    });
  };

  return {
    sendNotification,
    sendWelcomeEmail,
    sendSecurityAlert,
    sendSystemUpdate,
    sendCustomNotification,
    loading
  };
}