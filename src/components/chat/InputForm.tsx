import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { AlertCircle, Send } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface InputFormProps {
  schema: any;
  defaults?: Record<string, any>;
  errors?: Record<string, string>;
  onSubmit: (inputs: Record<string, any>) => void;
  onCancel?: () => void;
  loading?: boolean;
}

export function InputForm({ 
  schema, 
  defaults = {}, 
  errors = {}, 
  onSubmit, 
  onCancel, 
  loading = false 
}: InputFormProps) {
  const [values, setValues] = useState<Record<string, any>>(defaults);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (schema?.required) {
      schema.required.forEach((fieldKey: string) => {
        const value = values[fieldKey];
        if (!value || (typeof value === 'string' && value.trim() === '')) {
          const fieldSchema = schema.properties[fieldKey];
          const label = fieldSchema?.title || fieldKey.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
          newErrors[fieldKey] = `${label} is required`;
        }
      });
    }
    
    setValidationErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit(values);
    }
  };

  const updateValue = (key: string, value: any) => {
    setValues(prev => ({ ...prev, [key]: value }));
  };

  const renderField = (key: string, fieldSchema: any) => {
    const value = values[key] || '';
    const error = errors[key] || validationErrors[key];
    const isRequired = schema.required?.includes(key);

    const fieldId = `input-${key}`;
    const label = fieldSchema.title || key.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());

    if (fieldSchema.type === 'boolean') {
      return (
        <div key={key} className="space-y-2">
          {error && (
            <p className="text-sm text-destructive flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              {error}
            </p>
          )}
          <div className="flex items-center space-x-2">
            <Switch
              id={fieldId}
              checked={!!value}
              onCheckedChange={(checked) => updateValue(key, checked)}
            />
            <Label htmlFor={fieldId} className={error ? 'text-destructive' : ''}>
              {label} {isRequired && <span className="text-destructive">*</span>}
            </Label>
          </div>
          {fieldSchema.description && (
            <p className="text-sm text-muted-foreground">{fieldSchema.description}</p>
          )}
        </div>
      );
    }

    if (fieldSchema.enum) {
      return (
        <div key={key} className="space-y-2">
          {error && (
            <p className="text-sm text-destructive flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              {error}
            </p>
          )}
          <Label htmlFor={fieldId} className={error ? 'text-destructive' : ''}>
            {label} {isRequired && <span className="text-destructive">*</span>}
          </Label>
          <Select value={value} onValueChange={(val) => updateValue(key, val)}>
            <SelectTrigger className={error ? 'border-destructive' : ''}>
              <SelectValue placeholder={`Select ${label.toLowerCase()}`} />
            </SelectTrigger>
            <SelectContent>
              {fieldSchema.enum.map((option: string) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {fieldSchema.description && (
            <p className="text-sm text-muted-foreground">{fieldSchema.description}</p>
          )}
        </div>
      );
    }

    const inputProps = {
      id: fieldId,
      value,
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => 
        updateValue(key, e.target.value),
      placeholder: fieldSchema.examples ? fieldSchema.examples[0] : `Enter ${label.toLowerCase()}`,
      className: error ? 'border-destructive' : '',
      disabled: loading
    };

    const inputType = fieldSchema.format === 'password' ? 'password' : 
                     fieldSchema.format === 'email' ? 'email' :
                     fieldSchema.format === 'uri' ? 'url' : 'text';

    return (
      <div key={key} className="space-y-2">
        {error && (
          <p className="text-sm text-destructive flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            {error}
          </p>
        )}
        <Label htmlFor={fieldId} className={error ? 'text-destructive' : ''}>
          {label} {isRequired && <span className="text-destructive">*</span>}
        </Label>
        {fieldSchema.format === 'textarea' || (fieldSchema.maxLength && fieldSchema.maxLength > 100) ? (
          <Textarea {...inputProps} rows={3} />
        ) : (
          <Input {...inputProps} type={inputType} />
        )}
        {fieldSchema.description && (
          <p className="text-sm text-muted-foreground">{fieldSchema.description}</p>
        )}
        {fieldSchema.examples && fieldSchema.examples.length > 1 && (
          <div className="flex flex-wrap gap-1">
            {fieldSchema.examples.slice(0, 3).map((example: string) => (
              <Button
                key={example}
                variant="outline"
                size="sm"
                type="button"
                onClick={() => updateValue(key, example)}
                className="h-6 px-2 text-xs"
                disabled={loading}
              >
                {example}
              </Button>
            ))}
          </div>
        )}
      </div>
    );
  };

  if (!schema || !schema.properties) {
    return null;
  }

  const hasErrors = Object.keys(errors).length > 0 || Object.keys(validationErrors).length > 0;

  return (
    <Card className="w-full">
      <CardHeader className="pb-4">
        <CardTitle className="text-base">Please provide the following information:</CardTitle>
      </CardHeader>
      <CardContent>
        {hasErrors && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Please correct the errors below and try again.
            </AlertDescription>
          </Alert>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          {Object.entries(schema.properties).map(([key, fieldSchema]) =>
            renderField(key, fieldSchema)
          )}
          <div className="flex justify-end gap-2 pt-4">
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
                Cancel
              </Button>
            )}
            <Button type="submit" disabled={loading || Object.keys(validationErrors).length > 0}>
              {loading ? (
                'Processing...'
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Submit
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}