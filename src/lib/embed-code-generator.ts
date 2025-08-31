import { Widget } from "@/hooks/useWidgets";
import { 
  EmbedOverrides, 
  EmbedAdvancedOptions, 
  EmbedSizeOptions, 
  EmbedConfiguration,
  CodeGenerationResult 
} from "@/types/embed";
import { getSDKUrl, CONFIG } from "./config";

export class EmbedCodeGenerator {
  private widget: Widget;
  
  constructor(widget: Widget) {
    this.widget = widget;
  }

  private validateWidget(): CodeGenerationResult {
    if (!this.widget) {
      return { success: false, error: "No widget provided" };
    }
    
    if (!this.widget.site_key) {
      return { success: false, error: "Widget missing site_key" };
    }
    
    return { success: true };
  }

  private sanitizeString(str: string): string {
    return str
      .replace(/[<>]/g, '') // Remove potential HTML tags
      .replace(/"/g, '\\"') // Escape quotes
      .trim();
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  private formatCodeWithSyntaxHighlighting(code: string): string {
    return code
      .replace(/(&lt;script[^&]*&gt;|&lt;\/script&gt;)/g, '<span style="color: #4FC3F7">$1</span>')
      .replace(/(src|data-ultaai-[a-z-]+)=/g, '<span style="color: #26C6DA">$1</span>=')
      .replace(/"([^"]+)"/g, '<span style="color: #FFD54F">"$1"</span>')
      .replace(/(UltaAIWidget|console|setTimeout)/g, '<span style="color: #FFEB3B">$1</span>')
      .replace(/(function|true|false|\d+)/g, '<span style="color: #4DD0E1">$1</span>')
      .replace(/(\/\/[^\n]*)/g, '<span style="color: #81C784">$1</span>');
  }

  generateBasicCode(): CodeGenerationResult {
    const validation = this.validateWidget();
    if (!validation.success) return validation;

    try {
      const sdkUrl = getSDKUrl();
      const siteKey = this.sanitizeString(this.widget.site_key);
      
      const code = `<script src="${sdkUrl}"></script>
<script>
  UltaAIWidget.load('${siteKey}');
</script>`;

      return { 
        success: true, 
        code: this.formatCodeWithSyntaxHighlighting(this.escapeHtml(code))
      };
    } catch (error) {
      return { 
        success: false, 
        error: `Failed to generate basic code: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  generateAdvancedCode(
    overrides: EmbedOverrides,
    advancedOptions: EmbedAdvancedOptions,
    sizeOptions: EmbedSizeOptions,
    displayMode: string
  ): CodeGenerationResult {
    const validation = this.validateWidget();
    if (!validation.success) return validation;

    try {
      const sdkUrl = getSDKUrl();
      const siteKey = this.sanitizeString(this.widget.site_key);
      const config: EmbedConfiguration = {};

      // Add overrides safely
      if (overrides.enabled && this.widget.theme) {
        if (overrides.position !== CONFIG.WIDGET_DEFAULTS.position) {
          config.position = this.sanitizeString(overrides.position);
        }
        if (overrides.width !== CONFIG.WIDGET_DEFAULTS.width) {
          config.width = this.sanitizeString(overrides.width);
        }
        if (overrides.height !== CONFIG.WIDGET_DEFAULTS.height) {
          config.height = this.sanitizeString(overrides.height);
        }
        if (overrides.colorPrimary !== this.widget.theme.color_primary) {
          config.colorPrimary = this.sanitizeString(overrides.colorPrimary);
        }
        if (overrides.textColor !== this.widget.theme.text_color) {
          config.textColor = this.sanitizeString(overrides.textColor);
        }
        if (overrides.welcomeText && overrides.welcomeText !== this.widget.theme.welcome_text) {
          config.welcomeText = this.sanitizeString(overrides.welcomeText);
        }
        if (overrides.logoUrl && overrides.logoUrl !== this.widget.theme.logo_url) {
          config.logoUrl = this.sanitizeString(overrides.logoUrl);
        }
      }

      // Add size options
      if (sizeOptions.customSize) {
        const width = parseInt(sizeOptions.width);
        const height = parseInt(sizeOptions.height);
        
        if (width >= CONFIG.SIZE_LIMITS.minWidth && width <= CONFIG.SIZE_LIMITS.maxWidth) {
          config.width = `${width}px`;
        }
        if (height >= CONFIG.SIZE_LIMITS.minHeight && height <= CONFIG.SIZE_LIMITS.maxHeight) {
          config.height = `${height}px`;
        }
        config.position = this.sanitizeString(sizeOptions.position);
      }

      // Add advanced options
      if (displayMode === 'open') config.autoOpen = true;
      if (advancedOptions.hideOnMobile) config.hideOnMobile = true;
      if (!advancedOptions.showBadge) config.showBadge = false;
      if (advancedOptions.debugMode) config.debug = true;

      let code = `<script src="${sdkUrl}"></script>
<script>
  // 🤖 UltaAI Widget Configuration
  UltaAIWidget.load('${siteKey}'`;

      const hasConfig = Object.keys(config).length > 0;
      const hasEvents = advancedOptions.enableEvents;
      const hasUserData = advancedOptions.userIdentification;

      if (hasConfig || hasEvents || hasUserData) {
        code += ', {\n';
        
        const configLines: string[] = [];
        
        // Add configuration options
        Object.entries(config).forEach(([key, value]) => {
          if (typeof value === 'string') {
            configLines.push(`    "${key}": "${value}"`);
          } else {
            configLines.push(`    "${key}": ${value}`);
          }
        });
        
        // Add user identification
        if (hasUserData) {
          configLines.push('    "userId": "user_12345"');
          configLines.push('    "userEmail": "user@example.com"');
          configLines.push('    "userName": "John Doe"');
        }
        
        // Add event handlers
        if (hasEvents) {
          configLines.push(`    "onReady": function() {
      console.log('🤖 UltaAI widget is ready');
    }`);
          configLines.push(`    "onOpen": function() {
      console.log('Widget opened');
    }`);
        }
        
        code += configLines.join(',\n') + '\n  }';
      }
      
      code += ');';

      if (advancedOptions.programmaticControl) {
        code += `
  
  // Programmatic control methods (available after widget loads)
  setTimeout(() => {
    // UltaAIWidget.open();  // Open widget
    // UltaAIWidget.close(); // Close widget  
    // UltaAIWidget.sendMessage('Hello from website!'); // Send message
  }, 1000);`;
      }

      code += '\n</script>';

      return { 
        success: true, 
        code: this.formatCodeWithSyntaxHighlighting(this.escapeHtml(code))
      };
    } catch (error) {
      return { 
        success: false, 
        error: `Failed to generate advanced code: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  generateAutoLoadCode(sizeOptions: EmbedSizeOptions): CodeGenerationResult {
    const validation = this.validateWidget();
    if (!validation.success) return validation;

    try {
      const sdkUrl = getSDKUrl();
      const siteKey = this.sanitizeString(this.widget.site_key);
      const dataAttrs = [`data-ultaai-site-key="${siteKey}"`];

      if (sizeOptions.customSize) {
        const width = parseInt(sizeOptions.width);
        const height = parseInt(sizeOptions.height);
        
        if (width >= CONFIG.SIZE_LIMITS.minWidth && width <= CONFIG.SIZE_LIMITS.maxWidth && width !== 400) {
          dataAttrs.push(`data-ultaai-width="${width}px"`);
        }
        if (height >= CONFIG.SIZE_LIMITS.minHeight && height <= CONFIG.SIZE_LIMITS.maxHeight && height !== 600) {
          dataAttrs.push(`data-ultaai-height="${height}px"`);
        }
        if (sizeOptions.position !== CONFIG.WIDGET_DEFAULTS.position) {
          dataAttrs.push(`data-ultaai-position="${this.sanitizeString(sizeOptions.position)}"`);
        }
      }

      const code = `<script src="${sdkUrl}"
  ${dataAttrs.join('\n  ')}
></script>`;

      return { 
        success: true, 
        code: this.formatCodeWithSyntaxHighlighting(this.escapeHtml(code))
      };
    } catch (error) {
      return { 
        success: false, 
        error: `Failed to generate auto-load code: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
}