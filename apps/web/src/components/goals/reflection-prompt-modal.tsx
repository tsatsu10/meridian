/**
 * 💭 Reflection Prompt Modal
 * 
 * Weekly reflection prompt for goal progress
 * Helps users reflect on "What went well?" and "What to improve?"
 */

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Lightbulb, Heart, Frown, Meh, Smile, Sparkles, TrendingUp } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { cn } from "@/lib/cn";

interface ReflectionPromptModalProps {
  open: boolean;
  onClose: () => void;
  goalId: string;
  goalTitle: string;
}

const moodOptions = [
  { value: 'struggling', label: 'Struggling', icon: Frown, color: 'text-red-500' },
  { value: 'neutral', label: 'Okay', icon: Meh, color: 'text-yellow-500' },
  { value: 'positive', label: 'Good', icon: Smile, color: 'text-green-500' },
  { value: 'excellent', label: 'Excellent', icon: Sparkles, color: 'text-purple-500' },
];

export function ReflectionPromptModal({
  open,
  onClose,
  goalId,
  goalTitle,
}: ReflectionPromptModalProps) {
  const queryClient = useQueryClient();
  const [mood, setMood] = useState('positive');
  const [whatWentWell, setWhatWentWell] = useState('');
  const [whatToImprove, setWhatToImprove] = useState('');
  const [lessonsLearned, setLessonsLearned] = useState('');
  
  const createReflectionMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await api.post(`/api/goals/${goalId}/reflections`, data);
      return response.data;
    },
    onSuccess: () => {
      toast.success('Reflection saved successfully!');
      queryClient.invalidateQueries({ queryKey: ['goal-reflections', goalId] });
      onClose();
      resetForm();
    },
    onError: () => {
      toast.error('Failed to save reflection');
    },
  });
  
  const resetForm = () => {
    setMood('positive');
    setWhatWentWell('');
    setWhatToImprove('');
    setLessonsLearned('');
  };
  
  const handleSubmit = () => {
    if (!whatWentWell && !whatToImprove) {
      toast.error('Please share at least one reflection');
      return;
    }
    
    const content = [
      whatWentWell && `✅ What went well:\n${whatWentWell}`,
      whatToImprove && `🔄 What to improve:\n${whatToImprove}`,
      lessonsLearned && `💡 Lessons learned:\n${lessonsLearned}`,
    ].filter(Boolean).join('\n\n');
    
    createReflectionMutation.mutate({
      content,
      reflectionType: 'weekly',
      mood,
      whatWentWell: whatWentWell || null,
      whatToImprove: whatToImprove || null,
      lessonsLearned: lessonsLearned || null,
      isPrivate: true,
    });
  };
  
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-yellow-500" />
            Weekly Reflection
          </DialogTitle>
          <DialogDescription>
            Reflect on your progress toward "{goalTitle}"
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Mood Selection */}
          <div className="space-y-3">
            <Label>How are you feeling about this goal?</Label>
            <RadioGroup value={mood} onValueChange={setMood}>
              <div className="grid grid-cols-2 gap-3">
                {moodOptions.map((option) => {
                  const Icon = option.icon;
                  return (
                    <label
                      key={option.value}
                      className={cn(
                        "flex items-center space-x-3 p-3 rounded-lg border-2 cursor-pointer transition-all",
                        mood === option.value
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50"
                      )}
                    >
                      <RadioGroupItem value={option.value} id={option.value} />
                      <Icon className={cn("h-5 w-5", option.color)} />
                      <span className="text-sm font-medium">{option.label}</span>
                    </label>
                  );
                })}
              </div>
            </RadioGroup>
          </div>
          
          {/* What Went Well */}
          <div className="space-y-2">
            <Label htmlFor="went-well" className="flex items-center gap-2">
              <Heart className="h-4 w-4 text-green-500" />
              What went well this week?
            </Label>
            <Textarea
              id="went-well"
              placeholder="Share your wins, progress, and positive moments..."
              value={whatWentWell}
              onChange={(e) => setWhatWentWell(e.target.value)}
              rows={4}
              className="resize-none"
            />
          </div>
          
          {/* What to Improve */}
          <div className="space-y-2">
            <Label htmlFor="to-improve" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-blue-500" />
              What could be improved?
            </Label>
            <Textarea
              id="to-improve"
              placeholder="Identify challenges, blockers, or areas for growth..."
              value={whatToImprove}
              onChange={(e) => setWhatToImprove(e.target.value)}
              rows={4}
              className="resize-none"
            />
          </div>
          
          {/* Lessons Learned */}
          <div className="space-y-2">
            <Label htmlFor="lessons" className="flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-yellow-500" />
              Key lessons learned (optional)
            </Label>
            <Textarea
              id="lessons"
              placeholder="What insights or learnings can you take forward..."
              value={lessonsLearned}
              onChange={(e) => setLessonsLearned(e.target.value)}
              rows={3}
              className="resize-none"
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Skip
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={createReflectionMutation.isPending || (!whatWentWell && !whatToImprove)}
          >
            {createReflectionMutation.isPending ? 'Saving...' : 'Save Reflection'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

