import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Plus, Minus } from 'lucide-react';
import { FIELD_PRESETS, FieldPreset } from './FieldPresets';

export interface BuilderField {
  id: string;
  key: string;
  label: string;
  preset: string;
  required: boolean;
  defaultValue: any;
  helpText?: string;
  options?: string[];
  minValue?: number;
  maxValue?: number;
  minLength?: number;
  maxLength?: number;
  osFilter?: string[];
}

interface FieldEditorProps {
  field?: BuilderField;
  existingKeys: string[];
  onSave: (field: BuilderField) => void;
  onCancel: () => void;
}

export function FieldEditor({ field, existingKeys, onSave, onCancel }: FieldEditorProps) {
  const [formData, setFormData] = useState<BuilderField>({
    id: field?.id || '',
    key: field?.key || '',
    label: field?.label || '',
    preset: field?.preset || 'text',
    required: field?.required || false,
    defaultValue: field?.defaultValue || '',
    helpText: field?.helpText || '',
    options: field?.options || [],
    minValue: field?.minValue,
    maxValue: field?.maxValue,
    minLength: field?.minLength,
    maxLength: field?.maxLength,
    osFilter: field?.osFilter || []
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [keyLocked, setKeyLocked] = useState(false);

  const preset = FIELD_PRESETS[formData.preset];

  useEffect(() => {
    if (formData.preset && preset) {
      const isNewField = !field;
      const shouldSetDefaults = isNewField || (field && field.preset !== formData.preset);
      
      if (shouldSetDefaults) {
        // Generate unique key if needed
        let newKey = preset.key_default;
        if (existingKeys.includes(newKey) && newKey !== field?.key) {
          let counter = 2;
          while (existingKeys.includes(`${newKey}_${counter}`)) {
            counter++;
          }
          newKey = `${newKey}_${counter}`;
        }

        setFormData(prev => ({
          ...prev,
          label: prev.label || preset.label_default,
          key: newKey,
          defaultValue: preset.default_value,
          helpText: prev.helpText || preset.description || '',
          minValue: preset.minimum,
          maxValue: preset.maximum,
          minLength: preset.minLength,
          maxLength: preset.maxLength,
          options: preset.enum ? [...preset.enum] : []
        }));
      }

      // Set key lock based on runtime_editable
      setKeyLocked(!preset.runtime_editable || preset.key_default === 'file_path');
    }
  }, [formData.preset, field, existingKeys, preset]);

  const validateKey = (key: string) => {
    if (!key) return 'Key is required';
    if (!/^[a-z][a-z0-9_]*$/.test(key)) return 'Key must be lowercase, start with letter, and contain only letters, numbers, and underscores';
    if (existingKeys.includes(key) && key !== field?.key) return 'Key must be unique';
    return '';
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.label) newErrors.label = 'Label is required';
    
    const keyError = validateKey(formData.key);
    if (keyError) newErrors.key = keyError;

    if (formData.preset === 'select' && (!formData.options || formData.options.length === 0)) {
      newErrors.options = 'At least one option is required for select fields';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (validateForm()) {
      const savedField: BuilderField = {
        ...formData,
        id: formData.id || crypto.randomUUID(),
        key: formData.key.toLowerCase()
      };
      onSave(savedField);
    }
  };

  const handleAddOption = () => {
    setFormData(prev => ({
      ...prev,
      options: [...(prev.options || []), '']
    }));
  };

  const handleRemoveOption = (index: number) => {
    setFormData(prev => ({
      ...prev,
      options: prev.options?.filter((_, i) => i !== index) || []
    }));
  };

  const handleOptionChange = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      options: prev.options?.map((opt, i) => i === index ? value : opt) || []
    }));
  };

  const getDefaultValueInput = () => {
    switch (preset?.type) {
      case 'boolean':
        return (
          <Switch
            checked={!!formData.defaultValue}
            onCheckedChange={(checked) => setFormData(prev => ({ ...prev, defaultValue: checked }))}
          />
        );
      case 'integer':
        return (
          <Input
            type="number"
            value={formData.defaultValue || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, defaultValue: parseInt(e.target.value) || 0 }))}
            min={formData.minValue}
            max={formData.maxValue}
          />
        );
      default:
        if (formData.preset === 'select') {
          return (
            <Select
              value={formData.defaultValue || ''}
              onValueChange={(value) => setFormData(prev => ({ ...prev, defaultValue: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select default value" />
              </SelectTrigger>
              <SelectContent>
                {formData.options?.map((option, index) => (
                  <SelectItem key={index} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          );
        }
        return (
          <Input
            type={preset?.masked ? 'password' : 'text'}
            value={formData.defaultValue || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, defaultValue: e.target.value }))}
            minLength={formData.minLength}
            maxLength={formData.maxLength}
          />
        );
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">
          {field ? 'Edit Field' : 'New Field'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="label">Label *</Label>
          <Input
            id="label"
            value={formData.label}
            onChange={(e) => setFormData(prev => ({ ...prev, label: e.target.value }))}
            className={errors.label ? 'border-destructive' : ''}
          />
          {errors.label && <p className="text-xs text-destructive">{errors.label}</p>}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="key">Key *</Label>
            {keyLocked && (
              <Badge variant="secondary" className="text-xs">
                Key locked by preset
              </Badge>
            )}
          </div>
          <div className="space-y-2">
            <Input
              id="key"
              value={formData.key}
              onChange={(e) => !keyLocked && setFormData(prev => ({ ...prev, key: e.target.value.toLowerCase() }))}
              placeholder="lowercase_with_underscores"
              className={errors.key ? 'border-destructive' : ''}
              disabled={keyLocked}
            />
            {formData.key && (
              <Badge variant="outline" className="text-xs font-mono">
                ENV: {formData.key.toUpperCase()}
              </Badge>
            )}
            {keyLocked && (
              <p className="text-xs text-muted-foreground">Key locked by preset.</p>
            )}
            {errors.key && <p className="text-xs text-destructive">{errors.key}</p>}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="preset">Preset</Label>
          <Select
            value={formData.preset}
            onValueChange={(value) => setFormData(prev => ({ ...prev, preset: value }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(FIELD_PRESETS).map(([key, preset]) => (
                <SelectItem key={key} value={key}>
                  {preset.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center space-x-2">
          <Switch
            id="required"
            checked={formData.required}
            onCheckedChange={(checked) => setFormData(prev => ({ ...prev, required: checked }))}
          />
          <Label htmlFor="required">Required</Label>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Default Value</Label>
            {preset && !preset.runtime_editable && (
              <Badge variant="outline" className="text-xs">
                Locked value
              </Badge>
            )}
          </div>
          <div className={preset && !preset.runtime_editable ? 'opacity-60' : ''}>
            {getDefaultValueInput()}
          </div>
          {preset && !preset.runtime_editable && (
            <p className="text-xs text-muted-foreground">Value locked by preset configuration.</p>
          )}
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Switch
              id="runtimeOverride"
              checked={preset?.runtime_editable || false}
              disabled={true}
            />
            <Label htmlFor="runtimeOverride" className="text-sm">Allow override at runtime</Label>
          </div>
          {preset && !preset.runtime_editable && (
            <Badge variant="secondary" className="text-xs">
              Disabled by preset
            </Badge>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="helpText">Help Text</Label>
          <Textarea
            id="helpText"
            value={formData.helpText}
            onChange={(e) => setFormData(prev => ({ ...prev, helpText: e.target.value }))}
            rows={2}
          />
        </div>

        {/* Preset-specific options */}
        {(formData.preset === 'integer' || formData.preset === 'port') && (
          <>
            <Separator />
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="minValue">Min Value</Label>
                <Input
                  id="minValue"
                  type="number"
                  value={formData.minValue || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, minValue: parseInt(e.target.value) || undefined }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxValue">Max Value</Label>
                <Input
                  id="maxValue"
                  type="number"
                  value={formData.maxValue || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, maxValue: parseInt(e.target.value) || undefined }))}
                />
              </div>
            </div>
          </>
        )}

        {(formData.preset === 'text' || formData.preset === 'textarea' || formData.preset === 'password') && (
          <>
            <Separator />
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="minLength">Min Length</Label>
                <Input
                  id="minLength"
                  type="number"
                  value={formData.minLength || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, minLength: parseInt(e.target.value) || undefined }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxLength">Max Length</Label>
                <Input
                  id="maxLength"
                  type="number"
                  value={formData.maxLength || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, maxLength: parseInt(e.target.value) || undefined }))}
                />
              </div>
            </div>
          </>
        )}

        {formData.preset === 'select' && (
          <>
            <Separator />
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Options</Label>
                <Button type="button" variant="outline" size="sm" onClick={handleAddOption}>
                  <Plus className="h-3 w-3 mr-1" />
                  Add Option
                </Button>
              </div>
              {formData.options?.map((option, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input
                    value={option}
                    onChange={(e) => handleOptionChange(index, e.target.value)}
                    placeholder="Option value"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleRemoveOption(index)}
                  >
                    <Minus className="h-3 w-3" />
                  </Button>
                </div>
              ))}
              {errors.options && <p className="text-xs text-destructive">{errors.options}</p>}
            </div>
          </>
        )}

        <Separator />
        
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            {field ? 'Update Field' : 'Add Field'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}