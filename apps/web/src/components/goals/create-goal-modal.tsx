/**
 * 🎯 Create Goal Modal Component
 * 
 * Multi-step wizard for creating goals/OKRs
 * Step 1: Objective details
 * Step 2: Key results
 * Step 3: Review and create
 */

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Target, TrendingUp, CheckCircle, Plus, Trash2, Calendar } from "lucide-react";
import { useCreateGoal, useAddKeyResult } from "@/hooks/mutations/goals";
import { cn } from "@/lib/cn";
import { format } from "date-fns";

interface CreateGoalModalProps {
  open: boolean;
  onClose: () => void;
  workspaceId: string;
}

interface GoalFormData {
  title: string;
  description: string;
  type: 'objective' | 'personal' | 'team' | 'strategic';
  timeframe: string;
  startDate: string;
  endDate: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  privacy: 'private' | 'team' | 'organization';
}

interface KeyResultData {
  title: string;
  targetValue: number;
  unit: '%' | 'count' | 'currency' | 'hours' | 'custom';
  dueDate: string;
}

const STEP_TITLES = ['Set Objective', 'Add Key Results', 'Review'];

export function CreateGoalModal({ open, onClose, workspaceId }: CreateGoalModalProps) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<GoalFormData>({
    title: '',
    description: '',
    type: 'objective',
    timeframe: 'Q1 2026',
    startDate: '',
    endDate: '',
    priority: 'medium',
    privacy: 'private',
  });
  
  const [keyResults, setKeyResults] = useState<KeyResultData[]>([
    { title: '', targetValue: 100, unit: '%', dueDate: '' },
  ]);
  
  const createGoalMutation = useCreateGoal();
  const addKeyResultMutation = useAddKeyResult();
  
  const handleClose = () => {
    setStep(1);
    setFormData({
      title: '',
      description: '',
      type: 'objective',
      timeframe: 'Q1 2026',
      startDate: '',
      endDate: '',
      priority: 'medium',
      privacy: 'private',
    });
    setKeyResults([{ title: '', targetValue: 100, unit: '%', dueDate: '' }]);
    onClose();
  };
  
  const handleNext = () => {
    if (step < 3) setStep(step + 1);
  };
  
  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };
  
  const addKeyResult = () => {
    setKeyResults([...keyResults, { title: '', targetValue: 100, unit: '%', dueDate: '' }]);
  };
  
  const removeKeyResult = (index: number) => {
    setKeyResults(keyResults.filter((_, i) => i !== index));
  };
  
  const updateKeyResult = (index: number, field: keyof KeyResultData, value: any) => {
    const updated = [...keyResults];
    updated[index] = { ...updated[index], [field]: value };
    setKeyResults(updated);
  };
  
  const handleSubmit = async () => {
    try {
      // Create goal
      const goalResponse = await createGoalMutation.mutateAsync(formData);
      const createdGoal = goalResponse.data;
      
      // Add key results
      const validKeyResults = keyResults.filter(kr => kr.title.trim().length > 0);
      for (const kr of validKeyResults) {
        await addKeyResultMutation.mutateAsync({
          goalId: createdGoal.id,
          ...kr,
        });
      }
      
      handleClose();
    } catch (error) {
      console.error('Failed to create goal:', error);
    }
  };
  
  const canProceedStep1 = formData.title.trim().length > 0 && formData.timeframe.trim().length > 0;
  const canProceedStep2 = keyResults.some(kr => kr.title.trim().length > 0);
  
  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Create New Goal
          </DialogTitle>
          <DialogDescription>
            {STEP_TITLES[step - 1]}
          </DialogDescription>
        </DialogHeader>
        
        {/* Step Indicator */}
        <div className="space-y-2 mb-6">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Step {step} of 3</span>
            <span>{Math.round((step / 3) * 100)}% Complete</span>
          </div>
          <Progress value={(step / 3) * 100} />
          <div className="flex items-center justify-between gap-2">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={cn(
                  "flex-1 text-center py-1 rounded text-xs font-medium",
                  s === step && "bg-primary text-primary-foreground",
                  s < step && "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
                  s > step && "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
                )}
              >
                {STEP_TITLES[s - 1]}
              </div>
            ))}
          </div>
        </div>
        
        {/* Step 1: Objective Details */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">Goal Title *</Label>
              <Input
                id="title"
                placeholder="e.g., Launch MVP, Improve Team Velocity"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                maxLength={100}
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                {formData.title.length}/100 characters
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                placeholder="What do you want to achieve?"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                maxLength={500}
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                {formData.description.length}/500 characters
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="type">Type *</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value: any) => setFormData({ ...formData, type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="objective">🎯 Objective (OKR)</SelectItem>
                    <SelectItem value="personal">👤 Personal Goal</SelectItem>
                    <SelectItem value="team">👥 Team Goal</SelectItem>
                    <SelectItem value="strategic">🏢 Strategic Goal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="timeframe">Timeframe *</Label>
                <Select
                  value={formData.timeframe}
                  onValueChange={(value) => setFormData({ ...formData, timeframe: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Q1 2026">Q1 2026</SelectItem>
                    <SelectItem value="Q2 2026">Q2 2026</SelectItem>
                    <SelectItem value="Q3 2026">Q3 2026</SelectItem>
                    <SelectItem value="Q4 2026">Q4 2026</SelectItem>
                    <SelectItem value="2026">2026 (Full Year)</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(value: any) => setFormData({ ...formData, priority: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="privacy">Privacy</Label>
                <Select
                  value={formData.privacy}
                  onValueChange={(value: any) => setFormData({ ...formData, privacy: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="private">🔒 Private (Only You)</SelectItem>
                    <SelectItem value="team">👥 Team</SelectItem>
                    <SelectItem value="organization">🏢 Organization</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )}
        
        {/* Step 2: Key Results */}
        {step === 2 && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Add 3-5 measurable key results that define success for this objective.
            </p>
            
            {keyResults.map((kr, index) => (
              <div key={index} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">
                    Key Result {index + 1}
                  </Label>
                  {keyResults.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeKeyResult(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                
                <Input
                  placeholder="e.g., Reach 1000 active users"
                  value={kr.title}
                  onChange={(e) => updateKeyResult(index, 'title', e.target.value)}
                  maxLength={100}
                />
                
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Target Value</Label>
                    <Input
                      type="number"
                      value={kr.targetValue}
                      onChange={(e) => updateKeyResult(index, 'targetValue', parseFloat(e.target.value) || 0)}
                      min={0}
                    />
                  </div>
                  
                  <div className="space-y-1">
                    <Label className="text-xs">Unit</Label>
                    <Select
                      value={kr.unit}
                      onValueChange={(value: any) => updateKeyResult(index, 'unit', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="%">Percentage (%)</SelectItem>
                        <SelectItem value="count">Count (#)</SelectItem>
                        <SelectItem value="currency">Currency ($)</SelectItem>
                        <SelectItem value="hours">Hours</SelectItem>
                        <SelectItem value="custom">Custom</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-1">
                    <Label className="text-xs">Due Date</Label>
                    <Input
                      type="date"
                      value={kr.dueDate}
                      onChange={(e) => updateKeyResult(index, 'dueDate', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            ))}
            
            {keyResults.length < 5 && (
              <Button
                variant="outline"
                className="w-full"
                onClick={addKeyResult}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Another Key Result
              </Button>
            )}
          </div>
        )}
        
        {/* Step 3: Review */}
        {step === 3 && (
          <div className="space-y-6">
            <div className="rounded-lg border bg-card p-4 space-y-3">
              <h3 className="font-semibold flex items-center gap-2">
                <Target className="h-4 w-4" />
                {formData.title}
              </h3>
              {formData.description && (
                <p className="text-sm text-muted-foreground">{formData.description}</p>
              )}
              <div className="flex flex-wrap gap-2">
                <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                  {formData.type}
                </span>
                <span className="inline-flex items-center rounded-md bg-purple-50 px-2 py-1 text-xs font-medium text-purple-700 ring-1 ring-inset ring-purple-700/10">
                  {formData.timeframe}
                </span>
                <span className="inline-flex items-center rounded-md bg-gray-50 px-2 py-1 text-xs font-medium text-gray-700 ring-1 ring-inset ring-gray-700/10">
                  {formData.priority} priority
                </span>
                <span className="inline-flex items-center rounded-md bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-700/10">
                  {formData.privacy}
                </span>
              </div>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-medium text-sm flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Key Results ({keyResults.filter(kr => kr.title.trim()).length})
              </h4>
              <div className="space-y-2">
                {keyResults.filter(kr => kr.title.trim()).map((kr, index) => (
                  <div key={index} className="flex items-start gap-2 text-sm border-l-2 border-primary pl-3 py-2">
                    <CheckCircle className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div className="flex-1">
                      <p className="font-medium">{kr.title}</p>
                      <p className="text-xs text-muted-foreground">
                        Target: {kr.targetValue} {kr.unit}
                        {kr.dueDate && ` · Due: ${format(new Date(kr.dueDate), 'MMM dd, yyyy')}`}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="rounded-lg bg-blue-50 dark:bg-blue-950 p-4">
              <p className="text-sm text-blue-900 dark:text-blue-100">
                💡 <strong>Tip:</strong> You can add more key results or edit this goal anytime from your dashboard.
              </p>
            </div>
          </div>
        )}
        
        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="flex items-center gap-2">
            {step > 1 && (
              <Button variant="outline" onClick={handleBack}>
                Back
              </Button>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={handleClose}>
              Cancel
            </Button>
            
            {step < 3 && (
              <Button 
                onClick={handleNext}
                disabled={step === 1 && !canProceedStep1}
              >
                Next
              </Button>
            )}
            
            {step === 3 && (
              <Button 
                onClick={handleSubmit}
                disabled={createGoalMutation.isPending || addKeyResultMutation.isPending}
                className="bg-primary"
              >
                {createGoalMutation.isPending || addKeyResultMutation.isPending ? (
                  <>Creating...</>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Create Goal
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

