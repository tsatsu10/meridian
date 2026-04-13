import { useState } from 'react';
import { useSkills } from '@/hooks/use-skills';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Award, Plus, Trash2, ThumbsUp } from 'lucide-react';

const proficiencyLevels = [
  { value: 1, label: 'Beginner', color: 'bg-gray-500' },
  { value: 2, label: 'Intermediate', color: 'bg-blue-500' },
  { value: 3, label: 'Advanced', color: 'bg-green-500' },
  { value: 4, label: 'Expert', color: 'bg-purple-500' },
  { value: 5, label: 'Master', color: 'bg-yellow-500' },
];

export function SkillMatrixWidget() {
  const { user } = useAuth();
  const { skills, loading, addSkill, deleteSkill, endorseSkill } = useSkills(user?.email);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newSkillName, setNewSkillName] = useState('');
  const [newProficiency, setNewProficiency] = useState<number>(3);
  const [newExperience, setNewExperience] = useState<number | undefined>(undefined);
  const [submitting, setSubmitting] = useState(false);
  
  const handleAddSkill = async () => {
    if (!newSkillName.trim()) return;
    
    setSubmitting(true);
    try {
      await addSkill(newSkillName, newProficiency, newExperience);
      setNewSkillName('');
      setNewProficiency(3);
      setNewExperience(undefined);
      setShowAddModal(false);
    } catch (error) {
      // Error handled by hook
    } finally {
      setSubmitting(false);
    }
  };
  
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            My Skills
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }
  
  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            My Skills
          </CardTitle>
          <Button size="sm" onClick={() => setShowAddModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Skill
          </Button>
        </CardHeader>
        <CardContent>
          {skills.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Award className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="mb-2">No skills added yet</p>
              <p className="text-sm">Showcase your expertise!</p>
              <Button
                className="mt-4"
                onClick={() => setShowAddModal(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add First Skill
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {skills.map((skill) => {
                const proficiency = proficiencyLevels.find(p => p.value === skill.proficiencyLevel) || proficiencyLevels[2];
                return (
                  <div
                    key={skill.id}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium">{skill.skillName}</h4>
                        <Badge variant="secondary" className={`text-xs ${proficiency.color} text-white`}>
                          {proficiency.label}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        {skill.yearsOfExperience && (
                          <span>{skill.yearsOfExperience} years</span>
                        )}
                        {skill.endorsedBy && skill.endorsedBy.length > 0 && (
                          <div className="flex items-center gap-1">
                            <ThumbsUp className="h-3 w-3" />
                            <span>{skill.endorsedBy.length} endorsements</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteSkill(skill.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
      
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Skill</DialogTitle>
            <DialogDescription>
              Showcase your expertise and let others know what you can do
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="skillName">Skill Name</Label>
              <Input
                id="skillName"
                placeholder="e.g., React, Python, Project Management"
                value={newSkillName}
                onChange={(e) => setNewSkillName(e.target.value)}
                maxLength={100}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="proficiency">Proficiency Level</Label>
              <Select
                value={newProficiency.toString()}
                onValueChange={(v) => setNewProficiency(parseInt(v))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {proficiencyLevels.map((level) => (
                    <SelectItem key={level.value} value={level.value.toString()}>
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${level.color}`} />
                        <span>{level.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="experience">Years of Experience (optional)</Label>
              <Input
                id="experience"
                type="number"
                placeholder="0"
                value={newExperience || ''}
                onChange={(e) => setNewExperience(e.target.value ? parseInt(e.target.value) : undefined)}
                min={0}
                max={50}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowAddModal(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddSkill}
              disabled={!newSkillName.trim() || submitting}
            >
              {submitting ? 'Adding...' : 'Add Skill'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

