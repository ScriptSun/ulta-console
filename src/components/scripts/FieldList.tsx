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
  Plus
} from 'lucide-react';
import { BuilderField } from './FieldEditor';
import { FIELD_PRESETS } from './FieldPresets';

interface FieldListProps {
  fields: BuilderField[];
  onFieldsChange: (fields: BuilderField[]) => void;
  onEditField: (field: BuilderField) => void;
  onNewField: () => void;
}

interface SortableFieldItemProps {
  field: BuilderField;
  onEdit: (field: BuilderField) => void;
  onDuplicate: (field: BuilderField) => void;
  onDelete: (fieldId: string) => void;
}

function SortableFieldItem({ field, onEdit, onDuplicate, onDelete }: SortableFieldItemProps) {
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

  return (
    <Card ref={setNodeRef} style={style} className="mb-2">
      <CardContent className="p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-1">
            <button
              className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
              {...attributes}
              {...listeners}
            >
              <GripVertical className="h-4 w-4" />
            </button>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-sm truncate">{field.label}</span>
                {field.required && (
                  <Badge variant="destructive" className="text-xs py-0 px-1">
                    Required
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="font-mono bg-muted px-1 rounded">{field.key}</span>
                <Badge variant="outline" className="text-xs">
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

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                <MoreHorizontal className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(field)}>
                <Edit2 className="h-3 w-3 mr-2" />
                Edit
              </DropdownMenuItem>
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
      </CardContent>
    </Card>
  );
}

export function FieldList({ fields, onFieldsChange, onEditField, onNewField }: FieldListProps) {
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
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Form Fields</h3>
        <Button variant="outline" size="sm" onClick={onNewField}>
          <Plus className="h-3 w-3 mr-1" />
          Add Field
        </Button>
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
              />
            ))}
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}