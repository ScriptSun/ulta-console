import { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { 
  Code, 
  Play, 
  Copy, 
  Eye, 
  EyeOff, 
  CheckCircle, 
  AlertTriangle,
  Info,
  Settings,
  Save
} from 'lucide-react';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { useToast } from '@/hooks/use-toast';
import { InputFieldBuilder } from './InputFieldBuilder';
import { BuilderField } from './FieldEditor';
import { FIELD_PRESETS } from './FieldPresets';

interface BatchInputsTabProps {
  inputsSchema?: any;
  inputsDefaults?: any;
  canEdit: boolean;
  onSchemaChange?: (schema: any) => void;
  onDefaultsChange?: (defaults: any) => void;
  onValidationChange?: (isValid: boolean, errors: string[]) => void;
}

interface FormField {
  key: string;
  type: string;
  required: boolean;
  value: any;
  error?: string;
}

const DEFAULT_SCHEMA = {
  type: 'object',
  properties: {},
  required: [],
  additionalProperties: false
};

const EXAMPLE_SCHEMA = {
  type: 'object',
  properties: {
    domain: {
      type: 'string',
      pattern: '^[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$',
      description: 'Domain name for deployment'
    },
    port: {
      type: 'integer',
      minimum: 1,
      maximum: 65535,
      description: 'Port number'
    },
    environment: {
      type: 'string',
      enum: ['development', 'staging', 'production'],
      description: 'Deployment environment'
    },
    admin_email: {
      type: 'string',
      format: 'email',
      description: 'Administrator email address'
    },
    db_pass: {
      type: 'string',
      minLength: 8,
      description: 'Database password (will be masked)'
    },
    enable_ssl: {
      type: 'boolean',
      description: 'Enable SSL/TLS encryption'
    }
  },
  required: ['domain', 'admin_email'],
  additionalProperties: false
};

const EXAMPLE_DEFAULTS = {
  port: 443,
  environment: 'production',
  enable_ssl: true
};

// Convert JSON schema back to BuilderField objects
const convertSchemaToFields = (schema?: any, defaults?: any): BuilderField[] => {
  if (!schema?.properties || Object.keys(schema.properties).length === 0) {
    return [];
  }
  
  const fields = Object.entries(schema.properties).map(([originalKey, property]: [string, any]) => {
    // Convert key to lowercase to meet validation requirements
    const key = originalKey.toLowerCase();
    
    // Skip fields that don't meet the validation criteria even after conversion
    if (!/^[a-z][a-z0-9_]*$/.test(key)) {
      console.warn(`Skipping field with invalid key format: ${originalKey} -> ${key}`);
      return null;
    }
    
    // Find matching preset based on type and constraints
    let preset = 'text'; // default
    
    if (property.type === 'string') {
      if (property.enum) {
        preset = 'select';
      } else if (property.format === 'email') {
        preset = 'email';
      } else if (property.format === 'uri') {
        preset = 'url';
      } else if (property.pattern) {
        preset = 'text'; // Could be domain, but we'll default to text
      } else {
        preset = 'text';
      }
    } else if (property.type === 'integer' || property.type === 'number') {
      preset = 'number';
    } else if (property.type === 'boolean') {
      preset = 'boolean';
    }

    const field: BuilderField = {
      id: crypto.randomUUID(),
      key,
      label: originalKey.charAt(0).toUpperCase() + originalKey.slice(1).replace(/_/g, ' '),
      preset,
      required: schema.required?.includes(originalKey) || schema.required?.includes(key) || false,
      helpText: property.description,
      defaultValue: defaults?.[originalKey] || defaults?.[key]
    };

    // Add specific constraints
    if (property.minimum !== undefined) field.minValue = property.minimum;
    if (property.maximum !== undefined) field.maxValue = property.maximum;
    if (property.minLength !== undefined) field.minLength = property.minLength;
    if (property.maxLength !== undefined) field.maxLength = property.maxLength;
    if (property.enum) field.options = property.enum;

    return field;
  }).filter(Boolean) as BuilderField[]; // Remove null entries from invalid keys
  
  return fields;
};

export function BatchInputsTab({
  inputsSchema,
  inputsDefaults,
  canEdit,
  onSchemaChange,
  onDefaultsChange,
  onValidationChange
}: BatchInputsTabProps) {
  // State management
  const [hasInitialized, setHasInitialized] = useState(false);
  
  // State for JSON editor
  const [schemaText, setSchemaText] = useState('');
  const [defaultsText, setDefaultsText] = useState('');
  const [formValues, setFormValues] = useState<Record<string, any>>({});
  const [formFields, setFormFields] = useState<FormField[]>([]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isValid, setIsValid] = useState(true);
  const [maskedFields, setMaskedFields] = useState<Set<string>>(new Set());
  const [showJsonSummary, setShowJsonSummary] = useState(false);
  
  const { toast } = useToast();

  // Initialize AJV
  const ajv = new Ajv({ allErrors: true, strict: false });
  addFormats(ajv);

  // Memoize the converted fields to prevent unnecessary recalculations
  const convertedFields = useMemo(() => {
    const fields = convertSchemaToFields(inputsSchema, inputsDefaults);
    console.log('BatchInputsTab: Memoized convertedFields:', fields.length);
    return fields;
  }, [inputsSchema, inputsDefaults]);

  // Initialize texts when props are available
  useEffect(() => {
    if (inputsSchema && !hasInitialized) {
      setSchemaText(JSON.stringify(inputsSchema, null, 2));
      setHasInitialized(true);
    } else if (!inputsSchema && !hasInitialized) {
      setSchemaText(JSON.stringify(DEFAULT_SCHEMA, null, 2));
      setHasInitialized(true);
    }
    
    if (inputsDefaults) {
      setDefaultsText(JSON.stringify(inputsDefaults, null, 2));
    } else if (!inputsDefaults && hasInitialized) {
      setDefaultsText(JSON.stringify({}, null, 2));
    }
  }, [inputsSchema, inputsDefaults, hasInitialized]);

  const validateSchema = useCallback((schemaStr: string) => {
    try {
      const schema = JSON.parse(schemaStr);
      
      // Enforce additionalProperties: false
      if (schema.additionalProperties !== false) {
        schema.additionalProperties = false;
      }
      
      ajv.compile(schema);
      return { isValid: true, schema, errors: [] };
    } catch (error: any) {
      return { 
        isValid: false, 
        schema: null, 
        errors: [error.message || 'Invalid JSON schema'] 
      };
    }
  }, [ajv]);

  const validateDefaults = useCallback((defaultsStr: string, schema: any) => {
    try {
      const defaults = JSON.parse(defaultsStr);
      
      if (!schema) return { isValid: true, defaults, errors: [] };
      
      const validate = ajv.compile(schema);
      const isValid = validate(defaults);
      
      return {
        isValid,
        defaults,
        errors: isValid ? [] : validate.errors?.map(err => `${err.instancePath || 'root'}: ${err.message}`) || []
      };
    } catch (error: any) {
      return {
        isValid: false,
        defaults: null,
        errors: [error.message || 'Invalid JSON']
      };
    }
  }, [ajv]);

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

  const validateFormValues = useCallback((schema: any, values: Record<string, any>) => {
    if (!schema) return { isValid: true, errors: [] };

    const validate = ajv.compile(schema);
    const isValid = validate(values);
    
    const errors = isValid ? [] : validate.errors?.map(err => 
      `${err.instancePath?.replace('/', '') || err.propertyName || 'field'}: ${err.message}`
    ) || [];

    return { isValid, errors };
  }, [ajv]);

  // Handle visual builder changes (user-initiated)
  const handleBuilderSchemaChange = useCallback((schema: any) => {
    console.log('BatchInputsTab: Builder schema change');
    if (schema) {
      setSchemaText(JSON.stringify(schema, null, 2));
    }
    onSchemaChange?.(schema);
  }, [onSchemaChange]);

  const handleBuilderDefaultsChange = useCallback((defaults: any) => {
    console.log('BatchInputsTab: Builder defaults change');
    if (defaults) {
      setDefaultsText(JSON.stringify(defaults, null, 2));
    }
    onDefaultsChange?.(defaults);
  }, [onDefaultsChange]);

  const handleBuilderValidationChange = useCallback((isValid: boolean, errors: string[]) => {
    console.log('BatchInputsTab: Builder validation change');
    setValidationErrors(errors);
    setIsValid(isValid);
    onValidationChange?.(isValid, errors);
  }, [onValidationChange]);

  // Remove the problematic useEffect that was causing the loop
  // Now validation only happens for display purposes

  // Handle JSON editor changes (user-initiated)
  const handleSchemaTextChange = useCallback((value: string) => {
    if (!canEdit) return;
    
    console.log('BatchInputsTab: User changed schema text');
    setSchemaText(value);
    
    // Validate and notify parent
    const validation = validateSchema(value);
    if (validation.isValid) {
      onSchemaChange?.(validation.schema);
    } else {
      onSchemaChange?.(null);
    }
  }, [canEdit, onSchemaChange, validateSchema]);

  const handleDefaultsTextChange = useCallback((value: string) => {
    if (!canEdit) return;
    
    console.log('BatchInputsTab: User changed defaults text');
    setDefaultsText(value);
    
    // Validate and notify parent
    const schemaValidation = validateSchema(schemaText);
    const defaultsValidation = validateDefaults(value, schemaValidation.schema);
    if (defaultsValidation.isValid) {
      onDefaultsChange?.(defaultsValidation.defaults);
    } else {
      onDefaultsChange?.(null);
    }
  }, [canEdit, onDefaultsChange, schemaText, validateSchema, validateDefaults]);

  // Validate current state for display
  useEffect(() => {
    if (!hasInitialized) return;
    
    const schemaValidation = validateSchema(schemaText);
    const defaultsValidation = validateDefaults(defaultsText, schemaValidation.schema);
    
    let newValidationErrors: string[] = [];
    let newIsValid = true;
    
    if (schemaValidation.isValid) {
      const fields = generateFormFields(schemaValidation.schema, defaultsValidation.defaults);
      setFormFields(fields);
      
      const initialValues: Record<string, any> = {};
      fields.forEach(field => {
        initialValues[field.key] = field.value;
      });
      setFormValues(initialValues);
      
      const formValidation = validateFormValues(schemaValidation.schema, initialValues);
      newValidationErrors = [...defaultsValidation.errors, ...formValidation.errors];
      newIsValid = schemaValidation.isValid && defaultsValidation.isValid && formValidation.isValid;
    } else {
      newValidationErrors = schemaValidation.errors;
      newIsValid = false;
      setFormFields([]);
    }

    setValidationErrors(newValidationErrors);
    setIsValid(newIsValid);
  }, [schemaText, defaultsText, hasInitialized, validateSchema, validateDefaults, generateFormFields, validateFormValues]);

  const handleFormValueChange = (key: string, value: any) => {
    const newValues = { ...formValues, [key]: value };
    setFormValues(newValues);
    
    // Re-validate form
    const schema = validateSchema(schemaText).schema;
    if (schema) {
      const validation = validateFormValues(schema, newValues);
      
      // Update field-specific errors
      const newFields = formFields.map(field => {
        if (field.key === key) {
          const fieldError = validation.errors.find(err => err.startsWith(key + ':'));
          return { ...field, value, error: fieldError };
        }
        return field;
      });
      setFormFields(newFields);
    }
  };

  const handleTestWithSample = () => {
    const defaults = validateDefaults(defaultsText, validateSchema(schemaText).schema).defaults;
    if (defaults) {
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
    }
  };

  const handleLoadExample = () => {
    if (canEdit) {
      setSchemaText(JSON.stringify(EXAMPLE_SCHEMA, null, 2));
      setDefaultsText(JSON.stringify(EXAMPLE_DEFAULTS, null, 2));
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

  const copyJsonSummary = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(formValues, null, 2));
      toast({
        title: 'Copied',
        description: 'Validated inputs copied to clipboard',
      });
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const shouldMaskField = (key: string, type: string) => {
    return key.toLowerCase().includes('pass') || 
           key.toLowerCase().includes('secret') || 
           key.toLowerCase().includes('token') ||
           maskedFields.has(key);
  };

  const renderFormField = (field: FormField) => {
    const schema = validateSchema(schemaText).schema;
    const prop = schema?.properties?.[field.key] || {};
    const isMasked = shouldMaskField(field.key, field.type);

    return (
      <div key={field.key} className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor={field.key} className="flex items-center gap-2">
            {field.key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
            {field.required && <span className="text-destructive">*</span>}
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
          {(field.key.toLowerCase().includes('pass') || field.key.toLowerCase().includes('secret')) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => toggleFieldMask(field.key)}
              className="h-6 w-6 p-0"
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
            disabled={!canEdit}
          />
        ) : field.type === 'integer' || field.type === 'number' ? (
          <Input
            id={field.key}
            type="number"
            value={field.value || ''}
            onChange={(e) => handleFormValueChange(field.key, field.type === 'integer' ? parseInt(e.target.value) || 0 : parseFloat(e.target.value) || 0)}
            min={prop.minimum}
            max={prop.maximum}
            disabled={!canEdit}
            className={field.error ? 'border-destructive' : ''}
          />
        ) : prop.enum ? (
          <Select
            value={field.value || ''}
            onValueChange={(value) => handleFormValueChange(field.key, value)}
            disabled={!canEdit}
          >
            <SelectTrigger className={field.error ? 'border-destructive' : ''}>
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
            disabled={!canEdit}
            className={field.error ? 'border-destructive' : ''}
          />
        )}
        
        {field.error && (
          <p className="text-xs text-destructive">{field.error}</p>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="builder" className="space-y-6">
        <TabsList className="grid w-fit grid-cols-2">
          <TabsTrigger value="builder" className="flex items-center gap-2">
            <Settings className="h-3 w-3" />
            Builder
          </TabsTrigger>
          <TabsTrigger value="json" className="flex items-center gap-2">
            <Code className="h-3 w-3" />
            JSON
          </TabsTrigger>
        </TabsList>

        <TabsContent value="builder" className="space-y-0">
          <InputFieldBuilder
            initialFields={convertedFields}
            canEdit={canEdit}
            onSchemaChange={handleBuilderSchemaChange}
            onDefaultsChange={handleBuilderDefaultsChange}
            onValidationChange={handleBuilderValidationChange}
          />
        </TabsContent>

        <TabsContent value="json" className="space-y-6">
          {/* Validation Summary */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Badge variant={isValid ? "default" : "destructive"} className="flex items-center gap-1">
                {isValid ? <CheckCircle className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
                {isValid ? 'Valid' : `${validationErrors.length} Error${validationErrors.length !== 1 ? 's' : ''}`}
              </Badge>
              {canEdit && (
                <Button variant="outline" size="sm" onClick={handleLoadExample}>
                  Load Example
                </Button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleTestWithSample}
                disabled={!isValid}
              >
                <Play className="h-3 w-3 mr-1" />
                Test with Sample
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={copyJsonSummary}
                disabled={!isValid}
              >
                <Copy className="h-3 w-3 mr-1" />
                Copy JSON
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            {/* Schema Editor */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Code className="h-4 w-4" />
                  JSON Schema
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={schemaText}
                  onChange={(e) => handleSchemaTextChange(e.target.value)}
                  placeholder="Enter JSON schema..."
                  rows={12}
                  className="font-mono text-xs"
                  disabled={!canEdit}
                />
              </CardContent>
            </Card>

            {/* Defaults Editor */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Default Values</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={defaultsText}
                  onChange={(e) => handleDefaultsTextChange(e.target.value)}
                  placeholder="Enter default values..."
                  rows={12}
                  className="font-mono text-xs"
                  disabled={!canEdit}
                />
              </CardContent>
            </Card>
          </div>

          {/* Live Preview */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Live Preview</CardTitle>
            </CardHeader>
            <CardContent>
              {formFields.length > 0 ? (
                <div className="grid grid-cols-2 gap-4">
                  {formFields.map(renderFormField)}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Code className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No form fields to display</p>
                  <p className="text-sm">Add properties to your schema to see the form preview</p>
                </div>
              )}
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
        </TabsContent>
      </Tabs>
      
      {/* SAVE Button */}
      <div className="flex justify-end">
        <Button
          variant="default"
          size="default"
          disabled={!canEdit}
          className="flex items-center gap-2"
        >
          <Save className="h-4 w-4" />
          SAVE
        </Button>
      </div>
    </div>
  );
}