import { useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  GripVertical, 
  MoreHorizontal, 
  Edit2, 
  Copy, 
  Trash2,
  Plus,
  Pen,
  Check,
  X,
  Minus,
  Code2
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { BuilderField } from './FieldEditor';
import { FIELD_PRESETS } from './FieldPresets';

interface FieldListProps {
  fields: BuilderField[];
  onFieldsChange: (fields: BuilderField[]) => void;
  onEditField: (field: BuilderField) => void;
  onNewField: () => void;
  isFullWidth?: boolean;
  onCopyJson?: () => void;
  hasGeneratedSchema?: boolean;
}

interface SortableFieldItemProps {
  field: BuilderField;
  onEdit: (field: BuilderField) => void;
  onDuplicate: (field: BuilderField) => void;
  onDelete: (fieldId: string) => void;
  existingKeys: string[];
  isEditing: boolean;
  onStartEdit: () => void;
  onSaveEdit: (field: BuilderField) => void;
  onCancelEdit: () => void;
  isFullWidth?: boolean;
}

function SortableFieldItem({ 
  field, 
  onEdit, 
  onDuplicate, 
  onDelete, 
  existingKeys,
  isEditing,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  isFullWidth = false
}: SortableFieldItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: field.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const preset = FIELD_PRESETS[field.preset];
  const typeLabel = preset?.label || field.preset;

  const [editFormData, setEditFormData] = useState<BuilderField>(field);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateKey = (key: string) => {
    if (!key) return 'Key is required';
    if (!/^[a-z][a-z0-9_]*$/.test(key)) return 'Key must be lowercase, start with letter, and contain only letters, numbers, and underscores';
    if (existingKeys.includes(key) && key !== field?.key) return 'Key must be unique';
    return '';
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!editFormData.label) newErrors.label = 'Label is required';
    
    const keyError = validateKey(editFormData.key);
    if (keyError) newErrors.key = keyError;

    if (editFormData.preset === 'select' && (!editFormData.options || editFormData.options.length === 0)) {
      newErrors.options = 'At least one option is required for select fields';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (validateForm()) {
      onSaveEdit(editFormData);
    }
  };

  const handleAddOption = () => {
    setEditFormData(prev => ({
      ...prev,
      options: [...(prev.options || []), '']
    }));
  };

  const handleRemoveOption = (index: number) => {
    setEditFormData(prev => ({
      ...prev,
      options: prev.options?.filter((_, i) => i !== index) || []
    }));
  };

  const handleOptionChange = (index: number, value: string) => {
    setEditFormData(prev => ({
      ...prev,
      options: prev.options?.map((opt, i) => i === index ? value : opt) || []
    }));
  };

  const getDefaultValueInput = () => {
    const currentPreset = FIELD_PRESETS[editFormData.preset];
    switch (currentPreset?.type) {
      case 'boolean':
        return (
          <Switch
            checked={!!editFormData.defaultValue}
            onCheckedChange={(checked) => setEditFormData(prev => ({ ...prev, defaultValue: checked }))}
          />
        );
      case 'integer':
        return (
          <Input
            type="number"
            value={editFormData.defaultValue || ''}
            onChange={(e) => setEditFormData(prev => ({ ...prev, defaultValue: parseInt(e.target.value) || 0 }))}
            min={editFormData.minValue}
            max={editFormData.maxValue}
          />
        );
      default:
        if (editFormData.preset === 'select') {
          return (
            <Select
              value={editFormData.defaultValue || ''}
              onValueChange={(value) => setEditFormData(prev => ({ ...prev, defaultValue: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select default value" />
              </SelectTrigger>
              <SelectContent>
                {editFormData.options?.map((option, index) => (
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
            type={currentPreset?.masked ? 'password' : 'text'}
            value={editFormData.defaultValue || ''}
            onChange={(e) => setEditFormData(prev => ({ ...prev, defaultValue: e.target.value }))}
            minLength={editFormData.minLength}
            maxLength={editFormData.maxLength}
          />
        );
    }
  };

  if (isEditing) {
    return (
      <Card ref={setNodeRef} style={style} className="mb-2">
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-medium">Editing Field</h4>
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleSave}
              >
                <Check className="h-3 w-3 text-green-600" />
              </Button>
              <Button variant="ghost" size="sm" onClick={onCancelEdit}>
                <X className="h-3 w-3 text-red-600" />
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="label">Label *</Label>
            <Input
              id="label"
              value={editFormData.label}
              onChange={(e) => setEditFormData(prev => ({ ...prev, label: e.target.value }))}
              className={errors.label ? 'border-destructive' : ''}
            />
            {errors.label && <p className="text-xs text-destructive">{errors.label}</p>}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="key">Key *</Label>
              {preset && !preset.runtime_editable && (
                <Badge variant="secondary" className="text-xs">
                  Key locked by preset
                </Badge>
              )}
            </div>
            <div className="space-y-2">
              <Input
                id="key"
                value={editFormData.key}
                onChange={(e) => setEditFormData(prev => ({ ...prev, key: e.target.value.toLowerCase() }))}
                placeholder="lowercase_with_underscores"
                className={errors.key ? 'border-destructive' : ''}
                disabled={preset && !preset.runtime_editable}
              />
              {editFormData.key && (
                <Badge variant="outline" className="text-xs font-mono">
                  ENV: {editFormData.key.toUpperCase()}
                </Badge>
              )}
              {errors.key && <p className="text-xs text-destructive">{errors.key}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="preset">Preset</Label>
            <Select
              value={editFormData.preset}
              onValueChange={(value) => setEditFormData(prev => ({ ...prev, preset: value }))}
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
              checked={editFormData.required}
              onCheckedChange={(checked) => setEditFormData(prev => ({ ...prev, required: checked }))}
            />
            <Label htmlFor="required">Required</Label>
          </div>

          <div className="space-y-2">
            <Label>Default Value</Label>
            {getDefaultValueInput()}
          </div>

          <div className="space-y-2">
            <Label htmlFor="helpText">Help Text</Label>
            <Textarea
              id="helpText"
              value={editFormData.helpText}
              onChange={(e) => setEditFormData(prev => ({ ...prev, helpText: e.target.value }))}
              rows={2}
            />
          </div>

          {editFormData.preset === 'select' && (
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
                {editFormData.options?.map((option, index) => (
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
        </CardContent>
      </Card>
    );
  }

  return (
    <Card ref={setNodeRef} style={style} className={cn("mb-3", isFullWidth ? "w-full" : "mb-2")}>
      <CardContent className="p-3">
        <div className="flex items-center justify-between flex-wrap gap-2 md:flex-nowrap">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <button
              className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground flex-shrink-0"
              {...attributes}
              {...listeners}
            >
              <GripVertical className="h-4 w-4" />
            </button>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="font-medium text-sm truncate">{field.label}</span>
                 {field.required && (
                   <Badge variant="destructive" className="text-[11px] py-0.5 px-2 flex-shrink-0">
                     Required
                   </Badge>
                 )}
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                <span className="font-mono bg-muted px-1 rounded flex-shrink-0">{field.key}</span>
                <Badge variant="outline" className="text-xs flex-shrink-0">
                  {typeLabel}
                </Badge>
                {field.defaultValue !== undefined && field.defaultValue !== '' && (
                  <span className="truncate">
                    Default: {String(field.defaultValue)}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 flex-shrink-0">
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-6 w-6 p-0"
              onClick={onStartEdit}
            >
              <Pen className="h-3 w-3" />
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                  <MoreHorizontal className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onDuplicate(field)}>
                  <Copy className="h-3 w-3 mr-2" />
                  Duplicate
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => onDelete(field.id)}
                  className="text-destructive"
                >
                  <Trash2 className="h-3 w-3 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function FieldList({ 
  fields, 
  onFieldsChange, 
  onEditField, 
  onNewField, 
  isFullWidth = false,
  onCopyJson,
  hasGeneratedSchema = false
}: FieldListProps) {
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
  
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: any) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      const oldIndex = fields.findIndex(field => field.id === active.id);
      const newIndex = fields.findIndex(field => field.id === over.id);
      const newFields = arrayMove(fields, oldIndex, newIndex);
      onFieldsChange(newFields);
    }
  };

  const handleDuplicateField = (field: BuilderField) => {
    const duplicatedField: BuilderField = {
      ...field,
      id: crypto.randomUUID(),
      key: `${field.key}_copy`,
      label: `${field.label} Copy`
    };
    onFieldsChange([...fields, duplicatedField]);
  };

  const handleDeleteField = (fieldId: string) => {
    onFieldsChange(fields.filter(field => field.id !== fieldId));
    setEditingFieldId(null);
  };

  const handleStartEdit = (fieldId: string) => {
    setEditingFieldId(fieldId);
  };

  const handleSaveEdit = (updatedField: BuilderField) => {
    onFieldsChange(fields.map(f => f.id === updatedField.id ? updatedField : f));
    setEditingFieldId(null);
  };

  const handleCancelEdit = () => {
    setEditingFieldId(null);
  };

  const existingKeys = fields.map(f => f.key);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Form Fields</h3>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onNewField}>
            <Plus className="h-3 w-3 mr-1" />
            Add Field
          </Button>
          {hasGeneratedSchema && onCopyJson && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onCopyJson}
                  >
                    <Code2 className="h-3 w-3 mr-1" />
                    Copy as JSON
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

      {fields.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <p>No fields added yet</p>
          <p className="text-xs mt-1">Click "Add Field" to get started</p>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={fields.map(f => f.id)} strategy={verticalListSortingStrategy}>
            {fields.map((field) => (
              <SortableFieldItem
                key={field.id}
                field={field}
                onEdit={onEditField}
                onDuplicate={handleDuplicateField}
                onDelete={handleDeleteField}
                existingKeys={existingKeys}
                isEditing={editingFieldId === field.id}
                onStartEdit={() => handleStartEdit(field.id)}
                onSaveEdit={handleSaveEdit}
                onCancelEdit={handleCancelEdit}
                isFullWidth={isFullWidth}
              />
            ))}
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}