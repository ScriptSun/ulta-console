import { useState } from 'react';
import { 
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  GripVertical, 
  X, 
  Edit2,
  Check,
  AlertCircle 
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface FeatureItem {
  id: string;
  text: string;
}

interface FeaturesManagerProps {
  features: string[];
  onChange: (features: string[]) => void;
  error?: string;
}

interface SortableFeatureProps {
  feature: FeatureItem;
  onEdit: (id: string, text: string) => void;
  onDelete: (id: string) => void;
}

function SortableFeature({ feature, onEdit, onDelete }: SortableFeatureProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(feature.text);
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: feature.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handleSave = () => {
    if (editText.trim()) {
      onEdit(feature.id, editText.trim());
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setEditText(feature.text);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-2 p-3 bg-card border rounded-lg",
        isDragging && "opacity-50"
      )}
    >
      <div
        {...attributes}
        {...listeners}
        className="flex-shrink-0 text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing"
      >
        <GripVertical className="h-4 w-4" />
      </div>
      
      {isEditing ? (
        <div className="flex items-center gap-2 flex-1">
          <Input
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1"
            autoFocus
          />
          <Button
            size="sm"
            variant="outline"
            onClick={handleSave}
            disabled={!editText.trim()}
          >
            <Check className="h-3 w-3" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleCancel}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-2 flex-1">
          <span className="flex-1">{feature.text}</span>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setIsEditing(true)}
          >
            <Edit2 className="h-3 w-3" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onDelete(feature.id)}
            className="text-destructive hover:text-destructive"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}
    </div>
  );
}

export function FeaturesManager({ features, onChange, error }: FeaturesManagerProps) {
  const [newFeature, setNewFeature] = useState('');
  
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const featureItems: FeatureItem[] = features.map((feature, index) => ({
    id: `feature-${index}`,
    text: feature,
  }));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = featureItems.findIndex((item) => item.id === active.id);
      const newIndex = featureItems.findIndex((item) => item.id === over.id);
      
      const reorderedFeatures = arrayMove(features, oldIndex, newIndex);
      onChange(reorderedFeatures);
    }
  };

  const handleAddFeature = () => {
    if (newFeature.trim()) {
      onChange([...features, newFeature.trim()]);
      setNewFeature('');
    }
  };

  const handleEditFeature = (id: string, text: string) => {
    const index = featureItems.findIndex((item) => item.id === id);
    if (index !== -1) {
      const updatedFeatures = [...features];
      updatedFeatures[index] = text;
      onChange(updatedFeatures);
    }
  };

  const handleDeleteFeature = (id: string) => {
    const index = featureItems.findIndex((item) => item.id === id);
    if (index !== -1) {
      const updatedFeatures = features.filter((_, i) => i !== index);
      onChange(updatedFeatures);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddFeature();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-base font-medium">Features</Label>
        <Badge variant="outline" className="text-xs">
          {features.length} features
        </Badge>
      </div>

      {/* Add new feature */}
      <div className="flex items-center gap-2">
        <Input
          placeholder="Add a new feature..."
          value={newFeature}
          onChange={(e) => setNewFeature(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1"
        />
        <Button
          onClick={handleAddFeature}
          disabled={!newFeature.trim()}
          size="sm"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Features list */}
      {features.length > 0 && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={featureItems.map(item => item.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              {featureItems.map((feature) => (
                <SortableFeature
                  key={feature.id}
                  feature={feature}
                  onEdit={handleEditFeature}
                  onDelete={handleDeleteFeature}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {features.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <p>No features added yet</p>
          <p className="text-sm">Add features to highlight what this plan includes</p>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}
    </div>
  );
}