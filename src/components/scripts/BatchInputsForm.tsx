import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { 
  Eye, 
  EyeOff, 
  CheckCircle, 
  AlertTriangle,
  Info,
  Copy,
  Lock
} from 'lucide-react';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { useToast } from '@/hooks/use-toast';

interface BatchInputsFormProps {
  schema?: any;
  defaults?: any;
  onValuesChange?: (values: Record<string, any>, isValid: boolean) => void;
  readOnly?: boolean;
}

interface FormField {
  key: string;
  type: string;
  required: boolean;
  value: any;
  error?: string;
}

export function BatchInputsForm({
  schema,
  defaults,
  onValuesChange,
  readOnly = false
}: BatchInputsFormProps) {
  const [formValues, setFormValues] = useState<Record<string, any>>({});
  const [formFields, setFormFields] = useState<FormField[]>([]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isValid, setIsValid] = useState(true);
  const [maskedFields, setMaskedFields] = useState<Set<string>>(new Set());
  
  const { toast } = useToast();

  // Initialize AJV
  const ajv = new Ajv({ allErrors: true, strict: false });
  addFormats(ajv);

  const getDefaultValue = (prop: any) => {
    switch (prop.type) {
      case 'boolean':
        return false;
      case 'integer':
      case 'number':
        return prop.minimum || 0;
      case 'array':
        return [];
      case 'object':
        return {};
      default:
        return '';
    }
  };

  const generateFormFields = useCallback((schema: any, defaults: any = {}) => {
    if (!schema?.properties) return [];

    const fields: FormField[] = [];
    
    Object.keys(schema.properties).forEach(key => {
      const prop = schema.properties[key];
      // Skip if property definition is null or undefined
      if (!prop || typeof prop !== 'object') {
        console.warn(`Skipping invalid property definition for key: ${key}`);
        return;
      }
      
      fields.push({
        key,
        type: prop.type || 'string',
        required: schema.required?.includes(key) || false,
        value: defaults[key] !== undefined ? defaults[key] : getDefaultValue(prop),
        error: undefined
      });
    });

    return fields;
  }, []);

  const validateFormValues = useCallback((schema: any, values: Record<string, any>) => {
    if (!schema) return { isValid: true, errors: [] };

    const validate = ajv.compile(schema);
    const isValid = validate(values);
    
    const errors = isValid ? [] : validate.errors?.map(err => 
      `${err.instancePath?.replace('/', '') || err.propertyName || 'field'}: ${err.message}`
    ) || [];

    return { isValid, errors };
  }, [ajv]);

  useEffect(() => {
    if (schema) {
      const fields = generateFormFields(schema, defaults);
      setFormFields(fields);
      
      const initialValues: Record<string, any> = {};
      fields.forEach(field => {
        initialValues[field.key] = field.value;
      });
      setFormValues(initialValues);
      
      const validation = validateFormValues(schema, initialValues);
      setValidationErrors(validation.errors);
      setIsValid(validation.isValid);
      
      onValuesChange?.(initialValues, validation.isValid);
    }
  }, [schema, defaults, generateFormFields, validateFormValues, onValuesChange]);

  const handleFormValueChange = (key: string, value: any) => {
    const prop = schema?.properties?.[key] || {};
    
    // If field is locked, ignore the change and log security event
    if (prop._isLocked) {
      console.warn(`Attempt to override locked field: ${key}`);
      return;
    }
    
    if (readOnly) return;
    
    const newValues = { ...formValues, [key]: value };
    setFormValues(newValues);
    
    // Re-validate form
    if (schema) {
      const validation = validateFormValues(schema, newValues);
      setValidationErrors(validation.errors);
      setIsValid(validation.isValid);
      
      // Update field-specific errors
      const newFields = formFields.map(field => {
        if (field.key === key) {
          const fieldError = validation.errors.find(err => err.startsWith(key + ':'));
          return { ...field, value, error: fieldError };
        }
        return field;
      });
      setFormFields(newFields);
      
      onValuesChange?.(newValues, validation.isValid);
    }
  };

  const handleFillDefaults = () => {
    if (readOnly || !defaults) return;
    
    const newValues: Record<string, any> = {};
    formFields.forEach(field => {
      newValues[field.key] = defaults[field.key] !== undefined ? defaults[field.key] : field.value;
    });
    setFormValues(newValues);
    
    const newFields = formFields.map(field => ({
      ...field,
      value: newValues[field.key]
    }));
    setFormFields(newFields);
    
    if (schema) {
      const validation = validateFormValues(schema, newValues);
      setValidationErrors(validation.errors);
      setIsValid(validation.isValid);
      onValuesChange?.(newValues, validation.isValid);
    }
  };

  const copyJsonSummary = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(formValues, null, 2));
      toast({
        title: 'Copied',
        description: 'Form values copied to clipboard',
      });
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const toggleFieldMask = (key: string) => {
    const newMasked = new Set(maskedFields);
    if (newMasked.has(key)) {
      newMasked.delete(key);
    } else {
      newMasked.add(key);
    }
    setMaskedFields(newMasked);
  };

  const shouldMaskField = (key: string, type: string) => {
    return key.toLowerCase().includes('pass') || 
           key.toLowerCase().includes('secret') || 
           key.toLowerCase().includes('token') ||
           maskedFields.has(key);
  };

  const renderFormField = (field: FormField) => {
    const prop = schema?.properties?.[field.key] || {};
    const isMasked = shouldMaskField(field.key, field.type);
    const isLocked = prop._isLocked || false;

    return (
      <div key={field.key} className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor={field.key} className="flex items-center gap-2">
            {field.key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
            {field.required && <span className="text-destructive">*</span>}
            {isLocked && <Lock className="h-3 w-3 text-muted-foreground" />}
            {prop.description && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-3 w-3 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">{prop.description}</p>
                    {prop.pattern && (
                      <p className="text-xs mt-1 opacity-80">Pattern: {prop.pattern}</p>
                    )}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </Label>
          {(field.key.toLowerCase().includes('pass') || field.key.toLowerCase().includes('secret')) && !isLocked && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => toggleFieldMask(field.key)}
              className="h-6 w-6 p-0"
              disabled={readOnly}
            >
              {isMasked ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
            </Button>
          )}
        </div>
        
        {field.type === 'boolean' ? (
          <Switch
            id={field.key}
            checked={!!field.value}
            onCheckedChange={(checked) => handleFormValueChange(field.key, checked)}
            disabled={readOnly || isLocked}
          />
        ) : field.type === 'integer' || field.type === 'number' ? (
          <Input
            id={field.key}
            type="number"
            value={field.value || ''}
            onChange={(e) => handleFormValueChange(field.key, field.type === 'integer' ? parseInt(e.target.value) || 0 : parseFloat(e.target.value) || 0)}
            min={prop.minimum}
            max={prop.maximum}
            disabled={readOnly || isLocked}
            className={`${field.error ? 'border-destructive' : ''} ${isLocked ? 'opacity-60' : ''}`}
          />
        ) : prop.enum ? (
          <Select
            value={field.value || ''}
            onValueChange={(value) => handleFormValueChange(field.key, value)}
            disabled={readOnly || isLocked}
          >
            <SelectTrigger className={`${field.error ? 'border-destructive' : ''} ${isLocked ? 'opacity-60' : ''}`}>
              <SelectValue placeholder="Select an option" />
            </SelectTrigger>
            <SelectContent>
              {prop.enum.map((option: string) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Input
            id={field.key}
            type={isMasked ? 'password' : 'text'}
            value={field.value || ''}
            onChange={(e) => handleFormValueChange(field.key, e.target.value)}
            minLength={prop.minLength}
            maxLength={prop.maxLength}
            pattern={prop.pattern}
            disabled={readOnly || isLocked}
            className={`${field.error ? 'border-destructive' : ''} ${isLocked ? 'opacity-60' : ''}`}
          />
        )}
        
        {isLocked && (
          <p className="text-xs text-muted-foreground">Value locked by preset configuration.</p>
        )}
        
        {field.error && (
          <p className="text-xs text-destructive">{field.error}</p>
        )}
      </div>
    );
  };

  if (!schema || !schema.properties || Object.keys(schema.properties).length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground">
        <Info className="h-6 w-6 mx-auto mb-2 opacity-50" />
        <p>No inputs required for this batch</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Action buttons */}
      <div className="flex items-center justify-end">
        <div className="flex items-center gap-2">
          {!readOnly && defaults && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleFillDefaults}
            >
              Fill Defaults
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={copyJsonSummary}
          >
            <Copy className="h-3 w-3 mr-1" />
            Copy JSON
          </Button>
        </div>
      </div>

      {/* Form Fields */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Batch Inputs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {formFields.map(renderFormField)}
          </div>
        </CardContent>
      </Card>

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-sm text-destructive">Validation Errors</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1">
              {validationErrors.map((error, index) => (
                <li key={index} className="text-sm text-destructive flex items-start gap-2">
                  <AlertTriangle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                  {error}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}