import { useState, useEffect, useCallback, useMemo } from 'react';
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
import { FIELD_PRESETS } from './FieldPresets';

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
  const [isInitializing, setIsInitializing] = useState(true);
  const [lastInitialFieldsLength, setLastInitialFieldsLength] = useState(initialFields.length);

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
    console.log('InputFieldBuilder useEffect - initialFields:', initialFields.length, 'current fields:', fields.length, 'isInitializing:', isInitializing);
    
    // Only update if this is a significant change and we're not already initializing
    if (initialFields.length !== lastInitialFieldsLength && !isInitializing) {
      console.log('InputFieldBuilder: Significant change detected, entering initialization mode');
      setIsInitializing(true);
      setLastInitialFieldsLength(initialFields.length);
      setFields([...initialFields]);
      return;
    }
    
    // Create a deep comparison function for fields
    const fieldsEqual = (fields1: BuilderField[], fields2: BuilderField[]) => {
      if (fields1.length !== fields2.length) return false;
      
      return fields1.every((field1, index) => {
        const field2 = fields2[index];
        if (!field2) return false;
        
        return field1.key === field2.key &&
               field1.defaultValue === field2.defaultValue &&
               field1.preset === field2.preset &&
               field1.required === field2.required &&
               field1.label === field2.label &&
               field1.helpText === field2.helpText &&
               JSON.stringify(field1.options) === JSON.stringify(field2.options);
      });
    };
    
    // Only update if fields are actually different and we're not initializing
    if (!fieldsEqual(initialFields, fields) && !isInitializing) {
      console.log('InputFieldBuilder: Fields differ, updating');
      setFields([...initialFields]);
    } else if (isInitializing && fieldsEqual(initialFields, fields)) {
      console.log('InputFieldBuilder: Initialization complete');
      // Delay stopping initialization to prevent immediate re-trigger
      const timeout = setTimeout(() => setIsInitializing(false), 200);
      return () => clearTimeout(timeout);
    }
  }, [initialFields, isInitializing]); // Removed lastInitialFieldsLength from deps to prevent loops

  useEffect(() => {
    console.log('InputFieldBuilder main useEffect - fields changed:', fields.length, 'isInitializing:', isInitializing);
    
    // Don't trigger callbacks during initialization
    if (isInitializing) {
      console.log('InputFieldBuilder: Skipping callbacks during initialization');
      return;
    }
    
    // Debounce this effect to prevent rapid updates
    const timeoutId = setTimeout(() => {
      const validation = validateFields(fields);
      
      // Only update validation state if it changed
      const errorsChanged = JSON.stringify(validation.errors) !== JSON.stringify(validationErrors);
      const validityChanged = validation.isValid !== isValid;
      
      if (errorsChanged) {
        setValidationErrors(validation.errors);
      }
      if (validityChanged) {
        setIsValid(validation.isValid);
      }
      
      if (validation.isValid && fields.length > 0) {
        const { schema, defaults } = buildSchemaFromFields(fields);
        
        // Only update if schema/defaults actually changed
        const schemaChanged = JSON.stringify(schema) !== JSON.stringify(generatedSchema);
        const defaultsChanged = JSON.stringify(defaults) !== JSON.stringify(generatedDefaults);
        
        if (schemaChanged) {
          console.log('InputFieldBuilder: Updating schema');
          setGeneratedSchema(schema);
          onSchemaChange?.(schema);
        }
        if (defaultsChanged) {
          console.log('InputFieldBuilder: Updating defaults');
          setGeneratedDefaults(defaults);
          onDefaultsChange?.(defaults);
        }
      } else if (fields.length === 0 && (generatedSchema !== null || generatedDefaults !== null)) {
        // Only clear schema/defaults if we had them before
        console.log('InputFieldBuilder: Clearing schema/defaults');
        setGeneratedSchema(null);
        setGeneratedDefaults(null);
        onSchemaChange?.(null);
        onDefaultsChange?.(null);
      }

      // Only call validation callback if validation changed
      if (errorsChanged || validityChanged) {
        onValidationChange?.(validation.isValid, validation.errors);
      }
    }, 150); // Increased debounce to 150ms for more stability
    
    return () => clearTimeout(timeoutId);
  }, [fields, isInitializing]); // Simplified dependencies

  const handleFieldsChange = (newFields: BuilderField[]) => {
    if (canEdit) {
      console.log('InputFieldBuilder: User changed fields, exiting initialization mode');
      setFields(newFields);
      setIsInitializing(false); // User interaction, no longer initializing
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
      // Delay modal opening to prevent state conflicts
      setTimeout(() => setIsModalOpen(true), 50);
    }
  };

  const handleSaveField = (field: BuilderField) => {
    console.log('InputFieldBuilder: User saved field, exiting initialization mode');
    if (isCreatingNew) {
      setFields(prev => [...prev, field]);
    } else {
      setFields(prev => prev.map(f => f.id === field.id ? field : f));
    }
    setEditingField(null);
    setIsCreatingNew(false);
    setIsModalOpen(false);
    setIsInitializing(false); // User interaction, no longer initializing
  };

  const handleCancelEdit = () => {
    setEditingField(null);
    setIsCreatingNew(false);
    setIsModalOpen(false);
  };

  const handleFillDefaults = () => {
    // This will trigger the BatchInputsForm's fill defaults functionality
    // We'll need to pass this through props or use a ref
  };

  const handleCopyJson = async () => {
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

  const existingKeys = useMemo(() => fields.map(f => f.key), [fields]);

  const handleModalOpenChange = (open: boolean) => {
    console.log('Modal open change:', open);
    if (!open) {
      // Delay state reset to prevent rapid open/close cycles
      setTimeout(() => {
        setEditingField(null);
        setIsCreatingNew(false);
        setIsModalOpen(false);
      }, 100);
    } else {
      setIsModalOpen(true);
    }
  };

  // Memoized FieldModal component to prevent excessive re-renders
  const FieldModal = useMemo(() => {
    console.log('FieldModal render - isModalOpen:', isModalOpen, 'isCreatingNew:', isCreatingNew);
    
    if (!isModalOpen && !isCreatingNew && !editingField) {
      return null; // Don't render anything when modal is closed
    }
    
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
  }, [isModalOpen, isCreatingNew, editingField, existingKeys, isMobile]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
        </div>
        <div className="flex items-center gap-2">
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
          onCopyJson={copyJsonSummary}
          hasGeneratedSchema={!!generatedSchema}
        />
      </div>

      {/* Field Editor Modal */}
      {FieldModal}

      {/* Live Preview - Only show when there are form fields */}
      {generatedSchema && Object.keys(generatedSchema.properties || {}).length > 0 && (
        <Card>
          <CardHeader className="relative">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <CardTitle className="text-sm">Live Preview</CardTitle>
                <Badge variant={isValid ? "outline" : "destructive"} className={`flex items-center gap-1 ml-3 ${isValid ? 'bg-success text-foreground border-success hover:bg-success/80' : ''}`}>
                  {isValid ? <CheckCircle className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
                  {isValid ? 'Valid' : `${validationErrors.length} Error${validationErrors.length !== 1 ? 's' : ''}`}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleFillDefaults}
                  disabled={!canEdit}
                >
                  Fill Defaults
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyJson}
                >
                  <Copy className="h-3 w-3 mr-1" />
                  Copy JSON
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <BatchInputsForm
              schema={generatedSchema}
              defaults={generatedDefaults}
              readOnly={!canEdit}
              onFillDefaults={handleFillDefaults}
            />
          </CardContent>
        </Card>
      )}

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