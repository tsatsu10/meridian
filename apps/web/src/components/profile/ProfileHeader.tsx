import { motion } from 'framer-motion';
import { Camera, MapPin, Briefcase, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

/**
 * Profile header component showing user avatar, name, and key info
 */
interface ProfileHeaderProps {
  name: string;
  email: string;
  jobTitle?: string;
  company?: string;
  location?: string;
  profilePicture?: string;
  coverImage?: string;
  completenessScore?: number;
  onUploadPicture?: () => void;
}

export function ProfileHeader({
  name,
  email,
  jobTitle,
  company,
  location,
  profilePicture,
  coverImage,
  completenessScore = 0,
  onUploadPicture,
}: ProfileHeaderProps) {
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="relative">
      {/* Cover Image */}
      <div
        className="h-48 w-full rounded-t-xl bg-gradient-to-br from-blue-500 to-purple-600 relative overflow-hidden"
        style={
          coverImage
            ? { backgroundImage: `url(${coverImage})`, backgroundSize: 'cover' }
            : {}
        }
      >
        <motion.div
          className="absolute inset-0 bg-black/20"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        />
      </div>

      {/* Profile Info */}
      <div className="relative px-6 pb-6">
        {/* Avatar */}
        <div className="relative -mt-16 mb-4">
          <Avatar className="w-32 h-32 border-4 border-white dark:border-slate-900 shadow-xl">
            <AvatarImage src={profilePicture} alt={name} />
            <AvatarFallback className="text-2xl bg-gradient-to-br from-blue-500 to-purple-600 text-white">
              {getInitials(name)}
            </AvatarFallback>
          </Avatar>
          {onUploadPicture && (
            <Button
              size="sm"
              variant="secondary"
              className="absolute bottom-0 right-0 rounded-full w-10 h-10 p-0 shadow-lg"
              onClick={onUploadPicture}
              aria-label="Upload profile picture"
            >
              <Camera className="w-4 h-4" />
            </Button>
          )}
        </div>

        {/* Name and Title */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              {name}
            </h1>
            {completenessScore > 0 && (
              <Badge
                variant={completenessScore >= 80 ? 'default' : 'secondary'}
                className="ml-2"
              >
                {completenessScore}% Complete
              </Badge>
            )}
          </div>

          {/* Job Info */}
          {(jobTitle || company) && (
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
              <Briefcase className="w-4 h-4" />
              <span>
                {jobTitle}
                {jobTitle && company && ' at '}
                {company && <span className="font-medium">{company}</span>}
              </span>
            </div>
          )}

          {/* Location */}
          {location && (
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
              <MapPin className="w-4 h-4" />
              <span>{location}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ProfileHeader;

