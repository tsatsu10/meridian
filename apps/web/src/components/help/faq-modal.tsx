import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { useCreateFAQ } from "@/hooks/mutations/help/use-create-faq";
import { useUpdateFAQ } from "@/hooks/mutations/help/use-update-faq";

interface HelpFAQ {
  id: string;
  question: string;
  answer: string;
  category: string;
  order: number;
}

interface FAQModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  faq?: HelpFAQ | null;
}

export function FAQModal({ open, onOpenChange, faq }: FAQModalProps) {
  const isEditing = !!faq;
  const createMutation = useCreateFAQ();
  const updateMutation = useUpdateFAQ();

  const [formData, setFormData] = useState({
    question: "",
    answer: "",
    category: "getting-started",
    order: 0,
  });

  useEffect(() => {
    if (faq) {
      setFormData({
        question: faq.question,
        answer: faq.answer,
        category: faq.category,
        order: faq.order,
      });
    } else {
      // Reset form for new FAQ
      setFormData({
        question: "",
        answer: "",
        category: "getting-started",
        order: 0,
      });
    }
  }, [faq, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isEditing && faq) {
      await updateMutation.mutateAsync({
        id: faq.id,
        data: formData,
      });
    } else {
      await createMutation.mutateAsync(formData);
    }

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit FAQ" : "Create New FAQ"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Make changes to your FAQ. Click save when you're done."
              : "Fill in the details to create a new FAQ."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="question">Question *</Label>
            <Input
              id="question"
              value={formData.question}
              onChange={(e) => setFormData({ ...formData, question: e.target.value })}
              placeholder="Enter the question..."
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="answer">Answer *</Label>
            <Textarea
              id="answer"
              value={formData.answer}
              onChange={(e) => setFormData({ ...formData, answer: e.target.value })}
              placeholder="Enter the answer..."
              rows={6}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="getting-started">Getting Started</SelectItem>
                  <SelectItem value="features">Features</SelectItem>
                  <SelectItem value="integrations">Integrations</SelectItem>
                  <SelectItem value="troubleshooting">Troubleshooting</SelectItem>
                  <SelectItem value="best-practices">Best Practices</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="order">Display Order</Label>
              <Input
                id="order"
                type="number"
                value={formData.order}
                onChange={(e) =>
                  setFormData({ ...formData, order: parseInt(e.target.value) || 0 })
                }
                placeholder="0"
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {createMutation.isPending || updateMutation.isPending
                ? "Saving..."
                : isEditing
                ? "Save Changes"
                : "Create FAQ"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
