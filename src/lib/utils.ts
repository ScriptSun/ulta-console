import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Enhanced clipboard utility with fallback
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    // Try modern clipboard API first
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    
    // Fallback for older browsers
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    const success = document.execCommand('copy');
    document.body.removeChild(textArea);
    return success;
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    return false;
  }
}

// Sanitize text for safe HTML rendering
export function sanitizeText(text: string): string {
  if (!text || typeof text !== 'string') return '';
  
  return text
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/"/g, '&quot;') // Escape quotes
    .replace(/'/g, '&#x27;') // Escape single quotes
    .replace(/&/g, '&amp;') // Escape ampersands
    .trim();
}

// Validate widget data
export function validateWidget(widget: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!widget) {
    errors.push('Widget is required');
    return { isValid: false, errors };
  }
  
  if (!widget.site_key || typeof widget.site_key !== 'string') {
    errors.push('Widget site_key is required and must be a string');
  }
  
  if (!widget.theme || typeof widget.theme !== 'object') {
    errors.push('Widget theme is required and must be an object');
  }
  
  return { isValid: errors.length === 0, errors };
}