import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { 
  CheckCircle, 
  AlertTriangle, 
  Code2,
  Play,
  Copy
} from 'lucide-react';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { FieldList } from './FieldList';
import { FieldEditor, BuilderField } from './FieldEditor';
import { BatchInputsForm } from './BatchInputsForm';
import { FIELD_PRESETS, EXAMPLE_WORDPRESS_FIELDS } from './FieldPresets';

interface InputFieldBuilderProps {
  initialFields?: BuilderField[];
  canEdit: boolean;
  onSchemaChange?: (schema: any) => void;
  onDefaultsChange?: (defaults: any) => void;
  onValidationChange?: (isValid: boolean, errors: string[]) => void;
}

export function InputFieldBuilder({
  initialFields = [],
  canEdit,
  onSchemaChange,
  onDefaultsChange,
  onValidationChange
}: InputFieldBuilderProps) {
  const [fields, setFields] = useState<BuilderField[]>(initialFields);
  const [editingField, setEditingField] = useState<BuilderField | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isValid, setIsValid] = useState(true);
  const [generatedSchema, setGeneratedSchema] = useState<any>(null);
  const [generatedDefaults, setGeneratedDefaults] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { toast } = useToast();
  const isMobile = useIsMobile();

  // Initialize AJV
  const ajv = new Ajv({ allErrors: true, strict: false });
  addFormats(ajv);

  const buildSchemaFromFields = useCallback((builderFields: BuilderField[]) => {
    if (builderFields.length === 0) {
      return {
        type: 'object',
        properties: {},
        required: [],
        additionalProperties: false
      };
    }

    const properties: any = {};
    const required: string[] = [];
    const defaults: any = {};

    builderFields.forEach(field => {
      const preset = FIELD_PRESETS[field.preset];
      if (!preset) return;

      const property: any = {
        type: preset.type,
        description: field.helpText || preset.description
      };

      // Add preset-specific properties
      if (preset.format) property.format = preset.format;
      if (preset.pattern) property.pattern = preset.pattern;
      if (field.minValue !== undefined || preset.minimum !== undefined) {
        property.minimum = field.minValue ?? preset.minimum;
      }
      if (field.maxValue !== undefined || preset.maximum !== undefined) {
        property.maximum = field.maxValue ?? preset.maximum;
      }
      if (field.minLength !== undefined || preset.minLength !== undefined) {
        property.minLength = field.minLength ?? preset.minLength;
      }
      if (field.maxLength !== undefined || preset.maxLength !== undefined) {
        property.maxLength = field.maxLength ?? preset.maxLength;
      }
      if (field.preset === 'select' && field.options && field.options.length > 0) {
        property.enum = field.options;
      }

      // Mark locked fields
      if (!preset.runtime_editable) {
        property._isLocked = true;
      }

      properties[field.key] = property;

      if (field.required) {
        required.push(field.key);
      }

      if (field.defaultValue !== undefined && field.defaultValue !== '') {
        defaults[field.key] = field.defaultValue;
      } else if (preset.default_value !== undefined && preset.default_value !== '') {
        defaults[field.key] = preset.default_value;
      }
    });

    const schema = {
      type: 'object',
      properties,
      required,
      additionalProperties: false
    };

    return { schema, defaults };
  }, []);

  const validateFields = useCallback((builderFields: BuilderField[]) => {
    const errors: string[] = [];
    const keys = new Set<string>();

    builderFields.forEach((field, index) => {
      if (!field.key) {
        errors.push(`Field ${index + 1}: Key is required`);
      } else if (!/^[a-z][a-z0-9_]*$/.test(field.key)) {
        errors.push(`Field "${field.key}": Key must be lowercase, start with letter, and contain only letters, numbers, and underscores`);
      } else if (keys.has(field.key)) {
        errors.push(`Field "${field.key}": Duplicate key`);
      } else {
        keys.add(field.key);
      }

      if (!field.label) {
        errors.push(`Field "${field.key || index + 1}": Label is required`);
      }

      if (field.preset === 'select' && (!field.options || field.options.length === 0)) {
        errors.push(`Field "${field.key}": Select fields must have at least one option`);
      }
    });

    // Don't set state inside the validation function - return the values instead
    return {
      errors,
      isValid: errors.length === 0
    };
  }, []);

  useEffect(() => {
    console.log('InputFieldBuilder useEffect - initialFields:', initialFields.length, 'current fields:', fields.length);
    
    // Prevent updates if fields are already set correctly
    if (initialFields.length === 0 && fields.length === 0) {
      console.log('Both empty, skipping update');
      return;
    }
    
    // Only update if there's a meaningful difference
    const shouldUpdate = initialFields.length !== fields.length || 
      initialFields.some((field, index) => {
        const currentField = fields[index];
        if (!currentField) return true;
        
        return field.key !== currentField.key || 
               field.defaultValue !== currentField.defaultValue ||
               field.preset !== currentField.preset ||
               field.required !== currentField.required;
      });
    
    if (shouldUpdate) {
      console.log('InputFieldBuilder: Updating fields from', fields.length, 'to', initialFields.length);
      setFields([...initialFields]); // Create new array reference
    } else {
      console.log('InputFieldBuilder: Fields are same, skipping update');
    }
  }, [initialFields]);

  useEffect(() => {
    console.log('InputFieldBuilder main useEffect - fields changed:', fields.length);
    
    // Debounce this effect to prevent rapid updates
    const timeoutId = setTimeout(() => {
      const validation = validateFields(fields);
      
      // Set validation state
      setValidationErrors(validation.errors);
      setIsValid(validation.isValid);
      
      if (validation.isValid && fields.length > 0) {
        const { schema, defaults } = buildSchemaFromFields(fields);
        setGeneratedSchema(schema);
        setGeneratedDefaults(defaults);
        onSchemaChange?.(schema);
        onDefaultsChange?.(defaults);
      } else {
        setGeneratedSchema(null);
        setGeneratedDefaults(null);
        onSchemaChange?.(null);
        onDefaultsChange?.(null);
      }

      onValidationChange?.(validation.isValid, validation.errors);
    }, 100); // 100ms debounce
    
    return () => clearTimeout(timeoutId);
  }, [fields, buildSchemaFromFields, validateFields, onSchemaChange, onDefaultsChange, onValidationChange]);

  const handleFieldsChange = (newFields: BuilderField[]) => {
    if (canEdit) {
      setFields(newFields);
    }
  };

  const handleEditField = (field: BuilderField) => {
    if (canEdit) {
      setEditingField(field);
      setIsCreatingNew(false);
      setIsModalOpen(true);
    }
  };

  const handleNewField = () => {
    console.log('handleNewField called, canEdit:', canEdit);
    if (canEdit) {
      console.log('Setting modal state for new field');
      setEditingField(null);
      setIsCreatingNew(true);
      setIsModalOpen(true);
    }
  };

  const handleSaveField = (field: BuilderField) => {
    if (isCreatingNew) {
      setFields(prev => [...prev, field]);
    } else {
      setFields(prev => prev.map(f => f.id === field.id ? field : f));
    }
    setEditingField(null);
    setIsCreatingNew(false);
    setIsModalOpen(false);
  };

  const handleCancelEdit = () => {
    setEditingField(null);
    setIsCreatingNew(false);
    setIsModalOpen(false);
  };

  const handleLoadExample = () => {
    if (canEdit) {
      const exampleFields: BuilderField[] = EXAMPLE_WORDPRESS_FIELDS.map(example => ({
        id: crypto.randomUUID(),
        key: example.key,
        label: example.label,
        preset: example.preset,
        required: example.required,
        defaultValue: example.defaultValue,
        helpText: example.helpText,
        options: example.options
      }));
      setFields(exampleFields);
    }
  };

  const handleTestWithSample = () => {
    // This will be handled by the parent component's form
  };

  const copyJsonSummary = async () => {
    if (generatedSchema && generatedDefaults) {
      try {
        const summary = {
          schema: generatedSchema,
          defaults: generatedDefaults
        };
        await navigator.clipboard.writeText(JSON.stringify(summary, null, 2));
        toast({
          title: 'Copied',
          description: 'Generated JSON copied to clipboard',
        });
      } catch (error) {
        console.error('Failed to copy:', error);
      }
    }
  };

  const existingKeys = fields.map(f => f.key);

  const handleModalOpenChange = (open: boolean) => {
    console.log('Modal open change:', open);
    if (!open) {
      // If modal is being closed, reset all states
      setEditingField(null);
      setIsCreatingNew(false);
      setIsModalOpen(false);
    }
  };

  const FieldModal = () => {
    console.log('FieldModal render - isModalOpen:', isModalOpen, 'isCreatingNew:', isCreatingNew);
    
    const content = (
      <FieldEditor
        field={editingField}
        existingKeys={existingKeys}
        onSave={handleSaveField}
        onCancel={handleCancelEdit}
      />
    );

    if (isMobile) {
      return (
        <Drawer open={isModalOpen} onOpenChange={handleModalOpenChange}>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>
                {isCreatingNew ? 'Add Field' : 'Edit Field'}
              </DrawerTitle>
              <DrawerDescription>
                {isCreatingNew ? 'Configure your new input field' : 'Modify the field configuration'}
              </DrawerDescription>
            </DrawerHeader>
            <div className="px-4 pb-4">
              {content}
            </div>
          </DrawerContent>
        </Drawer>
      );
    }

    return (
      <Dialog open={isModalOpen} onOpenChange={handleModalOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isCreatingNew ? 'Add Field' : 'Edit Field'}
            </DialogTitle>
            <DialogDescription>
              {isCreatingNew ? 'Configure your new input field' : 'Modify the field configuration'}
            </DialogDescription>
          </DialogHeader>
          {content}
        </DialogContent>
      </Dialog>
    );
  };

  return (
    <div className="space-y-6">
      {/* Validation Summary */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Badge variant={isValid ? "default" : "destructive"} className="flex items-center gap-1">
            {isValid ? <CheckCircle className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
            {isValid ? 'Valid' : `${validationErrors.length} Error${validationErrors.length !== 1 ? 's' : ''}`}
          </Badge>
          {canEdit && (
            <Button variant="outline" size="sm" onClick={handleLoadExample}>
              Load WordPress Example
            </Button>
          )}
        </div>
        <div className="flex items-center gap-2">
          {generatedSchema && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={copyJsonSummary}
                  >
                    <Code2 className="h-3 w-3 mr-1" />
                    Generated JSON
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Copy the generated schema and defaults</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </div>

      {/* Full Width Field List */}
      <div>
        <FieldList
          fields={fields}
          onFieldsChange={handleFieldsChange}
          onEditField={handleEditField}
          onNewField={handleNewField}
          isFullWidth={true}
        />
      </div>

      {/* Field Editor Modal */}
      <FieldModal />

      {/* Live Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Live Preview</CardTitle>
        </CardHeader>
        <CardContent>
          {generatedSchema && Object.keys(generatedSchema.properties || {}).length > 0 ? (
            <BatchInputsForm
              schema={generatedSchema}
              defaults={generatedDefaults}
              readOnly={!canEdit}
            />
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>No form fields to display</p>
              <p className="text-sm">Add fields to see the live preview</p>
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
    </div>
  );
}