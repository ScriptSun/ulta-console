import { supabase } from '@/integrations/supabase/client';

export interface EmailNotificationOptions {
  type: 'password_reset' | 'welcome' | 'security_alert' | 'notification' | 'system_update';
  to: string;
  subject?: string;
  data?: any;
  user_id?: string;
}

export class EmailNotificationService {
  /**
   * Send an email notification via SendGrid
   */
  static async send(options: EmailNotificationOptions): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      const { data, error } = await supabase.functions.invoke('sendgrid-email', {
        body: options
      });

      if (error) {
        console.error('Email notification error:', error);
        return { success: false, error: error.message };
      }

      return { success: true, message: data?.message };
    } catch (error: any) {
      console.error('Email notification service error:', error);
      return { success: false, error: error.message || 'Failed to send email' };
    }
  }

  /**
   * Send a welcome email to new users
   */
  static async sendWelcome(email: string, name?: string, userId?: string) {
    return this.send({
      type: 'welcome',
      to: email,
      user_id: userId,
      data: {
        name: name || email.split('@')[0],
        dashboardLink: `${window.location.origin}/dashboard`
      }
    });
  }

  /**
   * Send a security alert email
   */
  static async sendSecurityAlert(email: string, eventType: string, details: string, userId?: string) {
    return this.send({
      type: 'security_alert',
      to: email,
      user_id: userId,
      data: {
        eventType,
        details,
        timestamp: new Date().toISOString(),
        securityLink: `${window.location.origin}/security`
      }
    });
  }

  /**
   * Send a system update notification
   */
  static async sendSystemUpdate(email: string, title: string, message: string, features?: string[], userId?: string) {
    return this.send({
      type: 'system_update',
      to: email,
      user_id: userId,
      data: {
        title,
        message,
        features
      }
    });
  }

  /**
   * Send a custom notification
   */
  static async sendCustomNotification(email: string, subject: string, message: string, userId?: string) {
    return this.send({
      type: 'notification',
      to: email,
      subject,
      user_id: userId,
      data: {
        message
      }
    });
  }

  /**
   * Send password reset email
   */
  static async sendPasswordReset(email: string, resetLink: string) {
    return this.send({
      type: 'password_reset',
      to: email,
      data: {
        resetLink
      }
    });
  }
}