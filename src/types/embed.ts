export interface EmbedOverrides {
  enabled: boolean;
  position: string;
  width: string;
  height: string;
  colorPrimary: string;
  textColor: string;
  welcomeText: string;
  logoUrl: string;
}

export interface EmbedAdvancedOptions {
  hideOnMobile: boolean;
  showBadge: boolean;
  enableEvents: boolean;
  userIdentification: boolean;
  programmaticControl: boolean;
  debugMode: boolean;
}

export interface EmbedSizeOptions {
  customSize: boolean;
  width: string;
  height: string;
  position: string;
}

export interface EmbedConfiguration {
  position?: string;
  width?: string;
  height?: string;
  colorPrimary?: string;
  textColor?: string;
  welcomeText?: string;
  logoUrl?: string;
  autoOpen?: boolean;
  hideOnMobile?: boolean;
  showBadge?: boolean;
  debug?: boolean;
  userId?: string;
  userEmail?: string;
  userName?: string;
  onReady?: () => void;
  onOpen?: () => void;
  onClose?: () => void;
  onMessage?: (message: any) => void;
}

export type EmbedCodeType = 'basic' | 'advanced' | 'autoload';

export interface CodeGenerationResult {
  success: boolean;
  code?: string;
  error?: string;
}