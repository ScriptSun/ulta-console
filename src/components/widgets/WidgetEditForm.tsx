import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Plus, Save, Palette } from "lucide-react";
import { Widget, NewWidget, WidgetTheme } from "@/hooks/useWidgets";

interface WidgetEditFormProps {
  widget: Widget | null;
  onSave: (widgetId: string | null, data: NewWidget) => Promise<void>;
  onCancel: () => void;
  saving: boolean;
  onPreviewUpdate?: (formData: NewWidget) => void;
}

export function WidgetEditForm({ widget, onSave, onCancel, saving, onPreviewUpdate }: WidgetEditFormProps) {
  const [formData, setFormData] = useState<NewWidget>({
    name: '',
    allowed_domains: [''],
    theme: {
      color_primary: '#007bff',
      color_secondary: '#6c757d',
      color_background: '#ffffff',
      color_surface: '#f8f9fa',
      color_muted: '#e9ecef',
      text_color: '#333333',
      text_color_secondary: '#6c757d',
      border_color: '#dee2e6',
      
      font_family: 'system-ui, -apple-system, sans-serif',
      font_size: '14px',
      font_size_small: '12px',
      font_weight: '400',
      
      border_radius: '8px',
      spacing: '16px',
      
      user_bubble_bg: '#007bff',
      user_bubble_text: '#ffffff',
      assistant_bubble_bg: '#f8f9fa',
      assistant_bubble_text: '#333333',
      
      button_primary_bg: '#007bff',
      button_primary_text: '#ffffff',
      button_secondary_bg: '#6c757d',
      button_secondary_text: '#ffffff',
      input_border: '#dee2e6',
      input_focus_border: '#007bff',
      
      header_bg: '#f8f9fa',
      header_text: '#333333',
      logo_url: '',
      welcome_text: 'Hello! How can I help you manage your servers today?',
      
      online_indicator: '#28a745',
      offline_indicator: '#dc3545',
      typing_indicator: '#007bff',
      
      shadow_intensity: 'medium',
      animation_speed: '0.2s',
      compact_mode: false
    }
  });
  
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const updateFormData = (newData: Partial<NewWidget>) => {
    const updatedData = { ...formData, ...newData };
    setFormData(updatedData);
    // Trigger preview update if callback is provided
    if (onPreviewUpdate) {
      onPreviewUpdate(updatedData);
    }
  };

  useEffect(() => {
    if (widget) {
      setFormData({
        name: widget.name,
        allowed_domains: widget.allowed_domains.length > 0 ? widget.allowed_domains : [''],
        theme: {
          ...formData.theme, // Keep defaults
          ...widget.theme // Override with widget values
        }
      });
    } else {
      // Keep the default formData setup from state initialization
    }
    setErrors({});
  }, [widget]);

  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Widget name is required';
    }

    const validDomains = formData.allowed_domains.filter(domain => domain.trim());
    if (validDomains.length === 0) {
      newErrors.domains = 'At least one allowed domain is required';
    }

    // Validate domain formats
    validDomains.forEach((domain, index) => {
      const domainRegex = /^https?:\/\/[a-zA-Z0-9][a-zA-Z0-9\-._]*[a-zA-Z0-9]+(:\d+)?$/;
      if (!domainRegex.test(domain)) {
        newErrors[`domain_${index}`] = 'Invalid domain format. Use exact origins like https://example.com';
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    const validDomains = formData.allowed_domains.filter(domain => domain.trim());
    const submitData = {
      ...formData,
      allowed_domains: validDomains
    };

    await onSave(widget?.id || null, submitData);
  };

  const addDomain = () => {
    setFormData(prev => ({
      ...prev,
      allowed_domains: [...prev.allowed_domains, '']
    }));
  };

  const removeDomain = (index: number) => {
    setFormData(prev => ({
      ...prev,
      allowed_domains: prev.allowed_domains.filter((_, i) => i !== index)
    }));
  };

  const updateDomain = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      allowed_domains: prev.allowed_domains.map((domain, i) => i === index ? value : domain)
    }));
  };

  return (
    <div>
      <div className="mb-4">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Palette className="h-5 w-5" />
          {widget ? 'Edit Widget' : 'Create New Widget'}
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Configure widget settings, allowed domains, and theme customization
        </p>
      </div>
      
      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-6">
          {/* Widget Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Widget Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => updateFormData({ name: e.target.value })}
              placeholder="My Chat Widget"
              className={errors.name ? 'border-destructive' : ''}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name}</p>
            )}
          </div>

          {/* Allowed Domains */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Allowed Domains *</Label>
              <Button type="button" variant="outline" size="sm" onClick={addDomain}>
                <Plus className="h-4 w-4 mr-2" />
                Add Domain
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Exact origins where the widget can be embedded (e.g., https://example.com)
            </p>
            
            <div className="space-y-2">
              {formData.allowed_domains.map((domain, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input
                    value={domain}
                    onChange={(e) => updateDomain(index, e.target.value)}
                    placeholder="https://example.com"
                    className={errors[`domain_${index}`] ? 'border-destructive' : ''}
                  />
                  {formData.allowed_domains.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeDomain(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
            
            {errors.domains && (
              <p className="text-sm text-destructive">{errors.domains}</p>
            )}
            {Object.keys(errors).some(key => key.startsWith('domain_')) && (
              <div className="space-y-1">
                {Object.entries(errors)
                  .filter(([key]) => key.startsWith('domain_'))
                  .map(([key, error]) => (
                    <p key={key} className="text-sm text-destructive">{error}</p>
                  ))}
              </div>
            )}
          </div>

          <Separator />

          {/* Comprehensive Theme Settings */}
          <div className="space-y-6">
            <Label className="text-base font-semibold">Theme Customization</Label>
            
            {/* Core Colors */}
            <div className="space-y-4">
              <Label className="text-sm font-medium">Core Colors</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="colorPrimary">Primary Color</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="colorPrimary"
                      type="color"
                      value={formData.theme.color_primary}
                      onChange={(e) => updateFormData({
                        theme: { ...formData.theme, color_primary: e.target.value }
                      })}
                      className="w-16 h-10 p-1 border rounded"
                    />
                    <Input
                      value={formData.theme.color_primary}
                      onChange={(e) => updateFormData({
                        theme: { ...formData.theme, color_primary: e.target.value }
                      })}
                      placeholder="#007bff"
                      className="flex-1"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">Main brand color for buttons and user messages</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="colorSecondary">Secondary Color</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="colorSecondary"
                      type="color"
                      value={formData.theme.color_secondary}
                      onChange={(e) => updateFormData({
                        theme: { ...formData.theme, color_secondary: e.target.value }
                      })}
                      className="w-16 h-10 p-1 border rounded"
                    />
                    <Input
                      value={formData.theme.color_secondary}
                      onChange={(e) => updateFormData({
                        theme: { ...formData.theme, color_secondary: e.target.value }
                      })}
                      placeholder="#6c757d"
                      className="flex-1"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">Secondary elements and muted actions</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="colorBackground">Background Color</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="colorBackground"
                      type="color"
                      value={formData.theme.color_background}
                      onChange={(e) => updateFormData({
                        theme: { ...formData.theme, color_background: e.target.value }
                      })}
                      className="w-16 h-10 p-1 border rounded"
                    />
                    <Input
                      value={formData.theme.color_background}
                      onChange={(e) => updateFormData({
                        theme: { ...formData.theme, color_background: e.target.value }
                      })}
                      placeholder="#ffffff"
                      className="flex-1"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">Main background color</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="textColor">Text Color</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="textColor"
                      type="color"
                      value={formData.theme.text_color}
                      onChange={(e) => updateFormData({
                        theme: { ...formData.theme, text_color: e.target.value }
                      })}
                      className="w-16 h-10 p-1 border rounded"
                    />
                    <Input
                      value={formData.theme.text_color}
                      onChange={(e) => updateFormData({
                        theme: { ...formData.theme, text_color: e.target.value }
                      })}
                      placeholder="#333333"
                      className="flex-1"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">Primary text color</p>
                </div>
              </div>
            </div>

            {/* Typography - Simplified without Select for now */}
            <div className="space-y-4">
              <Label className="text-sm font-medium">Typography</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fontFamily">Font Family</Label>
                  <Input
                    id="fontFamily"
                    value={formData.theme.font_family}
                    onChange={(e) => updateFormData({
                      theme: { ...formData.theme, font_family: e.target.value }
                    })}
                    placeholder="system-ui, -apple-system, sans-serif"
                  />
                  <p className="text-xs text-muted-foreground">CSS font-family value</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fontSize">Font Size</Label>
                  <Input
                    id="fontSize"
                    value={formData.theme.font_size}
                    onChange={(e) => updateFormData({
                      theme: { ...formData.theme, font_size: e.target.value }
                    })}
                    placeholder="14px"
                  />
                  <p className="text-xs text-muted-foreground">Base font size (e.g., 14px, 1rem)</p>
                </div>
              </div>
            </div>

            {/* Chat Bubble Styling */}
            <div className="space-y-4">
              <Label className="text-sm font-medium">Chat Bubbles</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="userBubbleBg">User Message Background</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="userBubbleBg"
                      type="color"
                      value={formData.theme.user_bubble_bg}
                      onChange={(e) => updateFormData({
                        theme: { ...formData.theme, user_bubble_bg: e.target.value }
                      })}
                      className="w-16 h-10 p-1 border rounded"
                    />
                    <Input
                      value={formData.theme.user_bubble_bg}
                      onChange={(e) => updateFormData({
                        theme: { ...formData.theme, user_bubble_bg: e.target.value }
                      })}
                      placeholder="#007bff"
                      className="flex-1"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="userBubbleText">User Message Text</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="userBubbleText"
                      type="color"
                      value={formData.theme.user_bubble_text}
                      onChange={(e) => updateFormData({
                        theme: { ...formData.theme, user_bubble_text: e.target.value }
                      })}
                      className="w-16 h-10 p-1 border rounded"
                    />
                    <Input
                      value={formData.theme.user_bubble_text}
                      onChange={(e) => updateFormData({
                        theme: { ...formData.theme, user_bubble_text: e.target.value }
                      })}
                      placeholder="#ffffff"
                      className="flex-1"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="assistantBubbleBg">Assistant Message Background</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="assistantBubbleBg"
                      type="color"
                      value={formData.theme.assistant_bubble_bg}
                      onChange={(e) => updateFormData({
                        theme: { ...formData.theme, assistant_bubble_bg: e.target.value }
                      })}
                      className="w-16 h-10 p-1 border rounded"
                    />
                    <Input
                      value={formData.theme.assistant_bubble_bg}
                      onChange={(e) => updateFormData({
                        theme: { ...formData.theme, assistant_bubble_bg: e.target.value }
                      })}
                      placeholder="#f8f9fa"
                      className="flex-1"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="assistantBubbleText">Assistant Message Text</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="assistantBubbleText"
                      type="color"
                      value={formData.theme.assistant_bubble_text}
                      onChange={(e) => updateFormData({
                        theme: { ...formData.theme, assistant_bubble_text: e.target.value }
                      })}
                      className="w-16 h-10 p-1 border rounded"
                    />
                    <Input
                      value={formData.theme.assistant_bubble_text}
                      onChange={(e) => updateFormData({
                        theme: { ...formData.theme, assistant_bubble_text: e.target.value }
                      })}
                      placeholder="#333333"
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Header & UI Colors */}
            <div className="space-y-4">
              <Label className="text-sm font-medium">Header & Interface Colors</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="headerBg">Header Background</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="headerBg"
                      type="color"
                      value={formData.theme.header_bg}
                      onChange={(e) => updateFormData({
                        theme: { ...formData.theme, header_bg: e.target.value }
                      })}
                      className="w-16 h-10 p-1 border rounded"
                    />
                    <Input
                      value={formData.theme.header_bg}
                      onChange={(e) => updateFormData({
                        theme: { ...formData.theme, header_bg: e.target.value }
                      })}
                      placeholder="#f8f9fa"
                      className="flex-1"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">Chat widget header background color</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="headerText">Header Text</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="headerText"
                      type="color"
                      value={formData.theme.header_text}
                      onChange={(e) => updateFormData({
                        theme: { ...formData.theme, header_text: e.target.value }
                      })}
                      className="w-16 h-10 p-1 border rounded"
                    />
                    <Input
                      value={formData.theme.header_text}
                      onChange={(e) => updateFormData({
                        theme: { ...formData.theme, header_text: e.target.value }
                      })}
                      placeholder="#333333"
                      className="flex-1"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">Header text and icon color</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="borderColor">Border Color</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="borderColor"
                      type="color"
                      value={formData.theme.border_color}
                      onChange={(e) => updateFormData({
                        theme: { ...formData.theme, border_color: e.target.value }
                      })}
                      className="w-16 h-10 p-1 border rounded"
                    />
                    <Input
                      value={formData.theme.border_color}
                      onChange={(e) => updateFormData({
                        theme: { ...formData.theme, border_color: e.target.value }
                      })}
                      placeholder="#dee2e6"
                      className="flex-1"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">Widget borders and dividers</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="inputBorder">Input Border</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="inputBorder"
                      type="color"
                      value={formData.theme.input_border}
                      onChange={(e) => updateFormData({
                        theme: { ...formData.theme, input_border: e.target.value }
                      })}
                      className="w-16 h-10 p-1 border rounded"
                    />
                    <Input
                      value={formData.theme.input_border}
                      onChange={(e) => updateFormData({
                        theme: { ...formData.theme, input_border: e.target.value }
                      })}
                      placeholder="#dee2e6"
                      className="flex-1"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">Input field border color</p>
                </div>
              </div>
            </div>

            {/* Button Colors */}
            <div className="space-y-4">
              <Label className="text-sm font-medium">Button Colors</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="buttonPrimaryBg">Primary Button Background</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="buttonPrimaryBg"
                      type="color"
                      value={formData.theme.button_primary_bg}
                      onChange={(e) => updateFormData({
                        theme: { ...formData.theme, button_primary_bg: e.target.value }
                      })}
                      className="w-16 h-10 p-1 border rounded"
                    />
                    <Input
                      value={formData.theme.button_primary_bg}
                      onChange={(e) => updateFormData({
                        theme: { ...formData.theme, button_primary_bg: e.target.value }
                      })}
                      placeholder="#007bff"
                      className="flex-1"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="buttonPrimaryText">Primary Button Text</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="buttonPrimaryText"
                      type="color"
                      value={formData.theme.button_primary_text}
                      onChange={(e) => updateFormData({
                        theme: { ...formData.theme, button_primary_text: e.target.value }
                      })}
                      className="w-16 h-10 p-1 border rounded"
                    />
                    <Input
                      value={formData.theme.button_primary_text}
                      onChange={(e) => updateFormData({
                        theme: { ...formData.theme, button_primary_text: e.target.value }
                      })}
                      placeholder="#ffffff"
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Status Indicators */}
            <div className="space-y-4">
              <Label className="text-sm font-medium">Status Indicators</Label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="onlineIndicator">Online Status</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="onlineIndicator"
                      type="color"
                      value={formData.theme.online_indicator}
                      onChange={(e) => updateFormData({
                        theme: { ...formData.theme, online_indicator: e.target.value }
                      })}
                      className="w-16 h-10 p-1 border rounded"
                    />
                    <Input
                      value={formData.theme.online_indicator}
                      onChange={(e) => updateFormData({
                        theme: { ...formData.theme, online_indicator: e.target.value }
                      })}
                      placeholder="#28a745"
                      className="flex-1"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="offlineIndicator">Offline Status</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="offlineIndicator"
                      type="color"
                      value={formData.theme.offline_indicator}
                      onChange={(e) => updateFormData({
                        theme: { ...formData.theme, offline_indicator: e.target.value }
                      })}
                      className="w-16 h-10 p-1 border rounded"
                    />
                    <Input
                      value={formData.theme.offline_indicator}
                      onChange={(e) => updateFormData({
                        theme: { ...formData.theme, offline_indicator: e.target.value }
                      })}
                      placeholder="#dc3545"
                      className="flex-1"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="typingIndicator">Typing Indicator</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="typingIndicator"
                      type="color"
                      value={formData.theme.typing_indicator}
                      onChange={(e) => updateFormData({
                        theme: { ...formData.theme, typing_indicator: e.target.value }
                      })}
                      className="w-16 h-10 p-1 border rounded"
                    />
                    <Input
                      value={formData.theme.typing_indicator}
                      onChange={(e) => updateFormData({
                        theme: { ...formData.theme, typing_indicator: e.target.value }
                      })}
                      placeholder="#007bff"
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Layout & Styling - Simplified */}
            <div className="space-y-4">
              <Label className="text-sm font-medium">Layout & Styling</Label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="borderRadius">Border Radius</Label>
                  <Input
                    id="borderRadius"
                    value={formData.theme.border_radius}
                    onChange={(e) => updateFormData({
                      theme: { ...formData.theme, border_radius: e.target.value }
                    })}
                    placeholder="8px"
                  />
                  <p className="text-xs text-muted-foreground">e.g., 4px, 8px, 12px</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="shadowIntensity">Shadow Intensity</Label>
                  <Input
                    id="shadowIntensity"
                    value={formData.theme.shadow_intensity}
                    onChange={(e) => updateFormData({
                      theme: { ...formData.theme, shadow_intensity: e.target.value }
                    })}
                    placeholder="medium"
                  />
                  <p className="text-xs text-muted-foreground">none, light, medium, heavy</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="animationSpeed">Animation Speed</Label>
                  <Input
                    id="animationSpeed"
                    value={formData.theme.animation_speed}
                    onChange={(e) => updateFormData({
                      theme: { ...formData.theme, animation_speed: e.target.value }
                    })}
                    placeholder="0.2s"
                  />
                  <p className="text-xs text-muted-foreground">e.g., 0.1s, 0.2s, 0.3s</p>
                </div>
              </div>
            </div>


            {/* Widget Button */}
            <div className="space-y-4">
              <Label className="text-sm font-medium">Widget Button</Label>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="widgetButtonBg">Button Background</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="widgetButtonBg"
                        type="color"
                        value={formData.theme.widget_button_bg || "#6366f1"}
                        onChange={(e) => updateFormData({
                          theme: { ...formData.theme, widget_button_bg: e.target.value }
                        })}
                        className="w-16 h-10 p-1 border rounded"
                      />
                      <Input
                        value={formData.theme.widget_button_bg || "#6366f1"}
                        onChange={(e) => updateFormData({
                          theme: { ...formData.theme, widget_button_bg: e.target.value }
                        })}
                        placeholder="#6366f1"
                        className="flex-1"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="widgetButtonIconColor">Icon Color</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="widgetButtonIconColor"
                        type="color"
                        value={formData.theme.widget_button_icon_color || "#ffffff"}
                        onChange={(e) => updateFormData({
                          theme: { ...formData.theme, widget_button_icon_color: e.target.value }
                        })}
                        className="w-16 h-10 p-1 border rounded"
                      />
                      <Input
                        value={formData.theme.widget_button_icon_color || "#ffffff"}
                        onChange={(e) => updateFormData({
                          theme: { ...formData.theme, widget_button_icon_color: e.target.value }
                        })}
                        placeholder="#ffffff"
                        className="flex-1"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="widgetButtonSize">Button Size</Label>
                    <select
                      id="widgetButtonSize"
                      value={formData.theme.widget_button_size || "medium"}
                      onChange={(e) => updateFormData({
                        theme: { ...formData.theme, widget_button_size: e.target.value }
                      })}
                      className="w-full p-2 border rounded-md bg-background"
                    >
                      <option value="small">Small (48px)</option>
                      <option value="medium">Medium (56px)</option>
                      <option value="large">Large (64px)</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="widgetButtonPosition">Position</Label>
                    <select
                      id="widgetButtonPosition"
                      value={formData.theme.widget_button_position || "bottom-right"}
                      onChange={(e) => updateFormData({
                        theme: { ...formData.theme, widget_button_position: e.target.value }
                      })}
                      className="w-full p-2 border rounded-md bg-background"
                    >
                      <option value="bottom-right">Bottom Right</option>
                      <option value="bottom-left">Bottom Left</option>
                      <option value="top-right">Top Right</option>
                      <option value="top-left">Top Left</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="widgetInitialState">Initial State</Label>
                    <select
                      id="widgetInitialState"
                      value={formData.theme.widget_initial_state || "closed"}
                      onChange={(e) => updateFormData({
                        theme: { ...formData.theme, widget_initial_state: e.target.value }
                      })}
                      className="w-full p-2 border rounded-md bg-background"
                    >
                      <option value="closed">Closed</option>
                      <option value="open">Open</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="widgetOpenIcon">Open Icon</Label>
                    <select
                      id="widgetOpenIcon"
                      value={formData.theme.widget_button_open_icon || "message-circle"}
                      onChange={(e) => updateFormData({
                        theme: { ...formData.theme, widget_button_open_icon: e.target.value }
                      })}
                      className="w-full p-2 border rounded-md bg-background"
                    >
                      <option value="message-circle">Message Circle</option>
                      <option value="message-square">Message Square</option>
                      <option value="help-circle">Help Circle</option>
                      <option value="phone">Phone</option>
                      <option value="mail">Mail</option>
                      <option value="headphones">Headphones</option>
                      <option value="user">User</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="widgetCloseIcon">Close Icon</Label>
                    <select
                      id="widgetCloseIcon"
                      value={formData.theme.widget_button_close_icon || "x"}
                      onChange={(e) => updateFormData({
                        theme: { ...formData.theme, widget_button_close_icon: e.target.value }
                      })}
                      className="w-full p-2 border rounded-md bg-background"
                    >
                      <option value="x">X</option>
                      <option value="chevron-down">Chevron Down</option>
                      <option value="minus">Minus</option>
                      <option value="arrow-down">Arrow Down</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Branding */}
            <div className="space-y-4">
              <Label className="text-sm font-medium">Branding</Label>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="logoUrl">Logo URL (optional)</Label>
                  <Input
                    id="logoUrl"
                    value={formData.theme.logo_url}
                    onChange={(e) => updateFormData({
                      theme: { ...formData.theme, logo_url: e.target.value }
                    })}
                    placeholder="https://example.com/logo.png"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="welcomeText">Welcome Message</Label>
                  <Textarea
                    id="welcomeText"
                    value={formData.theme.welcome_text}
                    onChange={(e) => updateFormData({
                      theme: { ...formData.theme, welcome_text: e.target.value }
                    })}
                    placeholder="Hello! How can I help you manage your servers today?"
                    rows={3}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {widget ? 'Update Widget' : 'Create Widget'}
                </>
              )}
            </Button>
          </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}