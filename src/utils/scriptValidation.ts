import { createHash } from 'crypto';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  sha256?: string;
  sizeBytes: number;
}

export interface ScriptContent {
  content: string;
}

const MAX_SIZE_BYTES = 256 * 1024; // 256 KB

const FORBIDDEN_PATTERNS = [
  /rm\s+-rf\s+\/(?:\s|$)/g,      // rm -rf /
  /mkfs/g,                        // mkfs commands
  /dd\s+.*\/dev\//g,             // dd with device paths
];

const WARNING_PATTERNS = [
  /\*(?!\s*\))/g,                // Unquoted asterisks (not in comments)
  /`[^`]*`/g,                    // Backticks
  /\$\([^)]*\)/g,                // Command substitution
];

export function validateScript(script: ScriptContent): ValidationResult {
  const { content } = script;
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Check if content is provided
  if (!content || content.trim().length === 0) {
    errors.push('Script content cannot be empty');
    return {
      isValid: false,
      errors,
      warnings,
      sizeBytes: 0
    };
  }

  // Size check
  const sizeBytes = new TextEncoder().encode(content).length;
  if (sizeBytes > MAX_SIZE_BYTES) {
    errors.push(`Script size (${Math.round(sizeBytes / 1024)} KB) exceeds maximum limit of ${Math.round(MAX_SIZE_BYTES / 1024)} KB`);
  }

  // Check shebang
  const lines = content.split('\n');
  const firstLine = lines[0]?.trim();
  if (!firstLine?.startsWith('#!/bin/bash') && !firstLine?.startsWith('#!/usr/bin/env bash')) {
    errors.push('First line must be #!/bin/bash or #!/usr/bin/env bash');
  }

  // Check forbidden patterns
  for (const pattern of FORBIDDEN_PATTERNS) {
    if (pattern.test(content)) {
      errors.push(`Forbidden command pattern detected: ${pattern.source}`);
    }
  }

  // Check warning patterns
  for (const pattern of WARNING_PATTERNS) {
    if (pattern.test(content)) {
      warnings.push(`Potentially unsafe pattern detected: ${pattern.source}`);
    }
  }

  // Check file extension (should be .sh content)
  if (!content.includes('#!/bin/bash') && !content.includes('#!/usr/bin/env bash')) {
    warnings.push('Script does not appear to be a bash script');
  }

  // Calculate SHA256
  let sha256: string | undefined;
  try {
    sha256 = createHash('sha256').update(content, 'utf8').digest('hex');
  } catch (error) {
    warnings.push('Could not calculate SHA256 hash');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    sha256,
    sizeBytes
  };
}

export function calculateSHA256(content: string): string {
  return createHash('sha256').update(content, 'utf8').digest('hex');
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export function getOSOptions() {
  return [
    { value: 'ubuntu', label: 'Ubuntu' },
    { value: 'debian', label: 'Debian' },
    { value: 'almalinux', label: 'AlmaLinux' },
    { value: 'windows', label: 'Windows' },
    { value: 'centos', label: 'CentOS' },
    { value: 'rhel', label: 'RHEL' }
  ];
}

export function getRiskOptions() {
  return [
    { value: 'low', label: 'Low', color: 'text-green-600 bg-green-50' },
    { value: 'medium', label: 'Medium', color: 'text-yellow-600 bg-yellow-50' },
    { value: 'high', label: 'High', color: 'text-red-600 bg-red-50' }
  ];
}