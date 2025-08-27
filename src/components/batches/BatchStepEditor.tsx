import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { GripVertical, Plus, Trash2, Eye } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export interface BatchStep {
  id: string;
  stepIndex: number;
  commandId: string;
  commandName: string;
  paramsTemplate: string;
}

interface AllowlistCommand {
  id: string;
  commandName: string;
  scriptName: string;
  risk: 'low' | 'medium' | 'high';
}

const mockCommands: AllowlistCommand[] = [
  {
    id: '1',
    commandName: 'system-update',
    scriptName: 'System Update Script',
    risk: 'medium',
  },
  {
    id: '2',
    commandName: 'db-backup',
    scriptName: 'Database Backup',
    risk: 'high',
  },
  {
    id: '3',
    commandName: 'log-rotate',
    scriptName: 'Log Rotation',
    risk: 'low',
  },
];

interface SortableStepItemProps {
  step: BatchStep;
  onUpdate: (step: BatchStep) => void;
  onDelete: (stepId: string) => void;
  onPreview: (step: BatchStep) => void;
}

function SortableStepItem({ step, onUpdate, onDelete, onPreview }: SortableStepItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: step.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const command = mockCommands.find(cmd => cmd.id === step.commandId);

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <Card className="mb-3">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 cursor-grab"
                {...listeners}
              >
                <GripVertical className="h-4 w-4" />
              </Button>
              <div>
                <CardTitle className="text-sm">Step {step.stepIndex + 1}</CardTitle>
                {command && (
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-xs">
                      {command.commandName}
                    </Badge>
                    <Badge 
                      variant={
                        command.risk === 'high' ? 'destructive' :
                        command.risk === 'medium' ? 'outline' : 'secondary'
                      }
                      className="text-xs"
                    >
                      {command.risk}
                    </Badge>
                  </div>
                )}
              </div>
            </div>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onPreview(step)}
              >
                <Eye className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDelete(step.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label className="text-xs">Command</Label>
            <Select 
              value={step.commandId} 
              onValueChange={(value) => {
                const selectedCommand = mockCommands.find(cmd => cmd.id === value);
                onUpdate({
                  ...step,
                  commandId: value,
                  commandName: selectedCommand?.commandName || ''
                });
              }}
            >
              <SelectTrigger className="h-8">
                <SelectValue placeholder="Select command" />
              </SelectTrigger>
              <SelectContent>
                {mockCommands.map((command) => (
                  <SelectItem key={command.id} value={command.id}>
                    <div className="flex items-center gap-2">
                      <span>{command.commandName}</span>
                      <Badge variant="outline" className="text-xs">
                        {command.scriptName}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label className="text-xs">Parameters Template</Label>
            <Textarea
              value={step.paramsTemplate}
              onChange={(e) => onUpdate({ ...step, paramsTemplate: e.target.value })}
              placeholder='{"timeout": "{{inputs.timeout}}", "target": "{{inputs.server}}"}'
              className="font-mono text-xs h-20"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Use {`{{inputs.variableName}}`} for dynamic values
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

interface BatchStepEditorProps {
  steps: BatchStep[];
  onStepsChange: (steps: BatchStep[]) => void;
}

export function BatchStepEditor({ steps, onStepsChange }: BatchStepEditorProps) {
  const [previewStep, setPreviewStep] = useState<BatchStep | null>(null);
  const [sampleInputs, setSampleInputs] = useState('{\n  "timeout": 600,\n  "server": "prod-db-01"\n}');
  
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: any) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      const oldIndex = steps.findIndex(step => step.id === active.id);
      const newIndex = steps.findIndex(step => step.id === over.id);
      
      const newSteps = arrayMove(steps, oldIndex, newIndex).map((step, index) => ({
        ...step,
        stepIndex: index
      }));
      
      onStepsChange(newSteps);
    }
  };

  const addStep = () => {
    const newStep: BatchStep = {
      id: `step-${Date.now()}`,
      stepIndex: steps.length,
      commandId: '',
      commandName: '',
      paramsTemplate: '{}',
    };
    onStepsChange([...steps, newStep]);
  };

  const updateStep = (updatedStep: BatchStep) => {
    onStepsChange(steps.map(step => 
      step.id === updatedStep.id ? updatedStep : step
    ));
  };

  const deleteStep = (stepId: string) => {
    const newSteps = steps
      .filter(step => step.id !== stepId)
      .map((step, index) => ({ ...step, stepIndex: index }));
    onStepsChange(newSteps);
  };

  const previewParams = (step: BatchStep) => {
    setPreviewStep(step);
  };

  const expandTemplate = (template: string, inputs: any) => {
    try {
      let expanded = template;
      Object.entries(inputs).forEach(([key, value]) => {
        const placeholder = `{{inputs.${key}}}`;
        expanded = expanded.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), String(value));
      });
      return JSON.stringify(JSON.parse(expanded), null, 2);
    } catch (error) {
      return 'Invalid JSON template or inputs';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-base font-medium">Batch Steps</Label>
        <Button onClick={addStep} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add Step
        </Button>
      </div>

      {steps.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">No steps added yet</p>
          <Button onClick={addStep} variant="outline" className="mt-2">
            <Plus className="h-4 w-4 mr-2" />
            Add First Step
          </Button>
        </Card>
      ) : (
        <DndContext 
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={steps.map(step => step.id)} strategy={verticalListSortingStrategy}>
            {steps.map((step) => (
              <SortableStepItem
                key={step.id}
                step={step}
                onUpdate={updateStep}
                onDelete={deleteStep}
                onPreview={previewParams}
              />
            ))}
          </SortableContext>
        </DndContext>
      )}

      {/* Preview Dialog */}
      <Dialog open={!!previewStep} onOpenChange={() => setPreviewStep(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Preview Step Parameters</DialogTitle>
          </DialogHeader>
          
          {previewStep && (
            <div className="space-y-4">
              <div>
                <Label>Sample Inputs JSON</Label>
                <Textarea
                  value={sampleInputs}
                  onChange={(e) => setSampleInputs(e.target.value)}
                  className="font-mono text-sm"
                  rows={4}
                />
              </div>
              
              <div>
                <Label>Parameters Template</Label>
                <pre className="bg-muted p-3 rounded text-sm">
                  <code>{previewStep.paramsTemplate}</code>
                </pre>
              </div>
              
              <div>
                <Label>Expanded Parameters</Label>
                <pre className="bg-muted p-3 rounded text-sm">
                  <code>
                    {expandTemplate(previewStep.paramsTemplate, JSON.parse(sampleInputs || '{}'))}
                  </code>
                </pre>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}