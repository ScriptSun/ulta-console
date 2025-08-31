import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { X, Plus, Save, Palette } from "lucide-react";
import { Widget, NewWidget } from "@/hooks/useWidgets";

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
      text_color: '#333333',
      logo_url: '',
      welcome_text: 'Hello! How can I help you today?'
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
          color_primary: widget.theme.color_primary || '#007bff',
          text_color: widget.theme.text_color || '#333333',
          logo_url: widget.theme.logo_url || '',
          welcome_text: widget.theme.welcome_text || 'Hello! How can I help you today?'
        }
      });
    } else {
      // Reset form for new widget
      setFormData({
        name: '',
        allowed_domains: [''],
        theme: {
          color_primary: '#007bff',
          text_color: '#333333',
          logo_url: '',
          welcome_text: 'Hello! How can I help you today?'
        }
      });
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
      <div className="mb-6">
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

          {/* Theme Settings */}
          <div className="space-y-4">
            <Label className="text-base font-semibold">Theme Customization</Label>
            
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
                <p className="text-xs text-muted-foreground">Used for headers, user messages, and buttons</p>
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
                <p className="text-xs text-muted-foreground">Main text color for assistant messages</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Chat Message Preview</Label>
              <div className="border rounded-lg p-4 bg-muted/30">
                <div className="space-y-3">
                  <div className="flex justify-start">
                    <div 
                      className="max-w-[80%] rounded-lg p-3 text-sm"
                      style={{ 
                        backgroundColor: '#f1f3f4',
                        color: formData.theme.text_color 
                      }}
                    >
                      {formData.theme.welcome_text}
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <div 
                      className="max-w-[80%] rounded-lg p-3 text-sm text-white"
                      style={{ backgroundColor: formData.theme.color_primary }}
                    >
                      I want to install WordPress
                    </div>
                  </div>
                  <div className="flex justify-start">
                    <div 
                      className="max-w-[80%] rounded-lg p-3 text-sm"
                      style={{ 
                        backgroundColor: '#f1f3f4',
                        color: formData.theme.text_color 
                      }}
                    >
                      I'd be happy to help you install WordPress! Let me guide you through the process.
                    </div>
                  </div>
                </div>
              </div>
            </div>

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
                placeholder="Hello! How can I help you today?"
                rows={3}
              />
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