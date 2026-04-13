import { motion, AnimatePresence } from 'framer-motion';
import { Briefcase, Calendar, MapPin, Edit, Trash2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyExperience } from '@/components/empty-state';
import { ExperienceItemSkeleton } from '@/components/ui/skeleton-loader';

/**
 * Experience list component with CRUD operations
 */
interface Experience {
  id: string;
  title: string;
  company: string;
  location?: string;
  description?: string;
  startDate: string;
  endDate?: string;
  isCurrent?: boolean;
  skills?: string[];
  companyLogo?: string;
}

interface ExperienceListProps {
  experiences: Experience[];
  isLoading?: boolean;
  onAdd?: () => void;
  onEdit?: (experience: Experience) => void;
  onDelete?: (id: string) => void;
}

export function ExperienceList({
  experiences,
  isLoading,
  onAdd,
  onEdit,
  onDelete,
}: ExperienceListProps) {
  const formatDate = (dateStr: string) => {
    const [year, month] = dateStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Briefcase className="w-5 h-5" />
            Work Experience
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[...Array(2)].map((_, i) => (
            <ExperienceItemSkeleton key={i} />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!experiences || experiences.length === 0) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Briefcase className="w-5 h-5" />
            Work Experience
          </CardTitle>
          {onAdd && (
            <Button onClick={onAdd} size="sm" variant="outline">
              <Plus className="w-4 h-4 mr-2" />
              Add
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <EmptyExperience onAdd={onAdd} />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Briefcase className="w-5 h-5" />
          Work Experience ({experiences.length})
        </CardTitle>
        {onAdd && (
          <Button onClick={onAdd} size="sm" variant="outline">
            <Plus className="w-4 h-4 mr-2" />
            Add
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <AnimatePresence mode="popLayout">
          {experiences.map((exp, index) => (
            <motion.div
              key={exp.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -100 }}
              transition={{ delay: index * 0.05 }}
              className="flex items-start gap-4 p-4 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-700 transition-colors"
            >
              {/* Company Logo */}
              {exp.companyLogo ? (
                <img
                  src={exp.companyLogo}
                  alt={exp.company}
                  className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                />
              ) : (
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                  <Briefcase className="w-6 h-6 text-white" />
                </div>
              )}

              {/* Experience Details */}
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-slate-900 dark:text-white">
                  {exp.title}
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {exp.company}
                </p>

                <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-slate-500 dark:text-slate-500">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {formatDate(exp.startDate)} -{' '}
                    {exp.isCurrent ? 'Present' : formatDate(exp.endDate!)}
                  </span>
                  {exp.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {exp.location}
                    </span>
                  )}
                </div>

                {exp.description && (
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 line-clamp-2">
                    {exp.description}
                  </p>
                )}

                {exp.skills && exp.skills.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {exp.skills.slice(0, 5).map((skill, idx) => (
                      <Badge key={idx} variant="secondary" className="text-xs">
                        {skill}
                      </Badge>
                    ))}
                    {exp.skills.length > 5 && (
                      <Badge variant="outline" className="text-xs">
                        +{exp.skills.length - 5} more
                      </Badge>
                    )}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2 flex-shrink-0">
                {onEdit && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEdit(exp)}
                    aria-label="Edit experience"
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                )}
                {onDelete && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDelete(exp.id)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    aria-label="Delete experience"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}

export default ExperienceList;

