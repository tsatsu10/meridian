import { motion, AnimatePresence } from 'framer-motion';
import { GraduationCap, Calendar, MapPin, Edit, Trash2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyEducation } from '@/components/empty-state';
import { ExperienceItemSkeleton } from '@/components/ui/skeleton-loader';

/**
 * Education list component with CRUD operations
 */
interface Education {
  id: string;
  degree: string;
  fieldOfStudy?: string;
  school: string;
  location?: string;
  description?: string;
  startDate: string;
  endDate?: string;
  isCurrent?: boolean;
  grade?: string;
  schoolLogo?: string;
}

interface EducationListProps {
  education: Education[];
  isLoading?: boolean;
  onAdd?: () => void;
  onEdit?: (education: Education) => void;
  onDelete?: (id: string) => void;
}

export function EducationList({
  education,
  isLoading,
  onAdd,
  onEdit,
  onDelete,
}: EducationListProps) {
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
            <GraduationCap className="w-5 h-5" />
            Education
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

  if (!education || education.length === 0) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="w-5 h-5" />
            Education
          </CardTitle>
          {onAdd && (
            <Button onClick={onAdd} size="sm" variant="outline">
              <Plus className="w-4 h-4 mr-2" />
              Add
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <EmptyEducation onAdd={onAdd} />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <GraduationCap className="w-5 h-5" />
          Education ({education.length})
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
          {education.map((edu, index) => (
            <motion.div
              key={edu.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -100 }}
              transition={{ delay: index * 0.05 }}
              className="flex items-start gap-4 p-4 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-700 transition-colors"
            >
              {/* School Logo */}
              {edu.schoolLogo ? (
                <img
                  src={edu.schoolLogo}
                  alt={edu.school}
                  className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                />
              ) : (
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center flex-shrink-0">
                  <GraduationCap className="w-6 h-6 text-white" />
                </div>
              )}

              {/* Education Details */}
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-slate-900 dark:text-white">
                  {edu.degree}
                  {edu.fieldOfStudy && ` in ${edu.fieldOfStudy}`}
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {edu.school}
                </p>

                <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-slate-500 dark:text-slate-500">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {formatDate(edu.startDate)} -{' '}
                    {edu.isCurrent ? 'Present' : formatDate(edu.endDate!)}
                  </span>
                  {edu.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {edu.location}
                    </span>
                  )}
                  {edu.grade && (
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      Grade: {edu.grade}
                    </span>
                  )}
                </div>

                {edu.description && (
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 line-clamp-2">
                    {edu.description}
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2 flex-shrink-0">
                {onEdit && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEdit(edu)}
                    aria-label="Edit education"
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                )}
                {onDelete && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDelete(edu.id)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    aria-label="Delete education"
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

export default EducationList;

