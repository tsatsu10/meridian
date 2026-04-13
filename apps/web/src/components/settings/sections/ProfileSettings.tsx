// Profile settings section with avatar management and personal information
import React, { useState, useRef, useEffect } from 'react';
import { useSettings } from '../providers/SettingsProvider';
import type { UserProfile } from '@/types/profile';
import { getUserInitials } from '@/types/profile';
import { ProfileSettingsSkeleton, AvatarUploadSkeleton } from '@/components/profile/ProfileSkeleton';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Camera, Upload, X, Save, RotateCcw, Globe, MapPin } from 'lucide-react';
import { cn } from '@/lib/cn';
import { optimizeAvatarImage, formatFileSize } from '@/lib/image-optimization';

const timezones = [
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'Europe/London', label: 'GMT (London)' },
  { value: 'Europe/Paris', label: 'CET (Paris)' },
  { value: 'Europe/Berlin', label: 'CET (Berlin)' },
  { value: 'Asia/Tokyo', label: 'JST (Tokyo)' },
  { value: 'Asia/Shanghai', label: 'CST (Shanghai)' },
  { value: 'Asia/Kolkata', label: 'IST (Mumbai)' },
  { value: 'Australia/Sydney', label: 'AEST (Sydney)' },
];

const languages = [
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Español' },
  { value: 'fr', label: 'Français' },
  { value: 'de', label: 'Deutsch' },
  { value: 'zh', label: '中文' },
  { value: 'ja', label: '日本語' },
];

export const ProfileSettings: React.FC = () => {
  const { state, updateField, saveSettings, isDirty, hasErrors, resetSection } = useSettings();
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const profile = state.settings.profile;
  const loading = state.loading.profile;
  const error = state.errors.profile;

  // Avatar upload handling
  const handleAvatarUpload = async (file: File) => {
    if (!file) return;
    
    // Validate file size (5MB max before optimization)
    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB in bytes
    if (file.size > MAX_FILE_SIZE) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
      toast.error(`File too large (${sizeMB}MB). Maximum size is 5MB.`);
      return;
    }
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Invalid file type. Please upload an image (JPG, PNG, or GIF).');
      return;
    }
    
    setIsUploading(true);
    
    // Revoke previous preview URL to prevent memory leak
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    
    try {
      // Optimize image before upload
      const optimized = await optimizeAvatarImage(file);
      
      // Show compression stats
      const originalSize = formatFileSize(optimized.originalSize);
      const optimizedSize = formatFileSize(optimized.optimizedSize);
      const savings = optimized.compressionRatio.toFixed(0);
      
      console.log(`Image optimized: ${originalSize} → ${optimizedSize} (${savings}% reduction)`);
      
      // Set preview from optimized image
      setPreviewUrl(optimized.dataUrl);
      
      // Validate dimensions (already optimized to 400x400)
      await validateImageDimensions(optimized.file);
      
      // Upload optimized image to server
      const { uploadAvatar } = await import('@/lib/api/profile');
      const uploadedUrl = await uploadAvatar(optimized.file);
      
      updateField('profile', 'avatar', uploadedUrl);
      toast.success(
        `Profile picture uploaded! (${originalSize} → ${optimizedSize}, ${savings}% smaller)`,
        { duration: 4000 }
      );
    } catch (error) {
      console.error('Avatar upload failed:', error);
      
      // Revoke preview URL on error
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
      }
      
      // Show user-friendly error message
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Failed to upload profile picture. Please try again.';
      toast.error(errorMessage);
    } finally {
      setIsUploading(false);
    }
  };

  const validateImageDimensions = (file: File): Promise<void> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      
      img.onload = () => {
        URL.revokeObjectURL(url);
        
        // Recommended dimensions: 400x400
        const RECOMMENDED_SIZE = 400;
        if (img.width < RECOMMENDED_SIZE || img.height < RECOMMENDED_SIZE) {
          console.warn(`Image dimensions (${img.width}x${img.height}) are smaller than recommended (${RECOMMENDED_SIZE}x${RECOMMENDED_SIZE})`);
          // Allow smaller images but warn user
        }
        
        resolve();
      };
      
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load image'));
      };
      
      img.src = url;
    });
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      handleAvatarUpload(file);
    }
  };

  // Cleanup: Revoke preview URL on unmount
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleSave = async () => {
    await saveSettings('profile');
  };

  const handleReset = () => {
    // Show confirmation dialog if there are unsaved changes
    if (isDirty('profile')) {
      const confirmed = window.confirm(
        'Are you sure you want to reset all changes? This will restore your profile to the last saved state.'
      );
      if (!confirmed) return;
    }
    
    // Clear preview URL and revoke object URL to prevent memory leak
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    
    // Reset to last saved values via provider
    resetSection('profile');
    
    toast.info('Profile settings reset to last saved state');
  };

  const removeAvatar = () => {
    // Show confirmation dialog before removing
    const confirmed = window.confirm(
      'Are you sure you want to remove your profile picture? You can upload a new one anytime.'
    );
    
    if (!confirmed) return;
    
    // Clear preview URL and revoke object URL to prevent memory leak
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    
    updateField('profile', 'avatar', '');
    toast.success('Profile picture removed successfully');
  };

  // Show loading skeleton while data loads
  if (loading) {
    return <ProfileSettingsSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Profile Settings</h2>
        <p className="text-muted-foreground">
          Manage your personal information and preferences.
        </p>
      </div>

      {/* Avatar Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Profile Picture
          </CardTitle>
          <CardDescription>
            Upload a profile picture to help others recognize you.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isUploading ? (
            <AvatarUploadSkeleton />
          ) : (
            <div className="flex items-center gap-6">
              <div className="relative">
                <Avatar className="h-24 w-24">
                  <AvatarImage 
                    src={previewUrl || profile.avatar} 
                    alt="Profile picture" 
                  />
                  <AvatarFallback className="text-lg">
                    {profile.name ? getUserInitials(profile.name) : 'U'}
                  </AvatarFallback>
                </Avatar>
              </div>
            
            <div className="space-y-2">
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Picture
                </Button>
                
                {(profile.avatar || previewUrl) && (
                  <Button
                    variant="outline"
                    onClick={removeAvatar}
                    disabled={isUploading}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Remove
                  </Button>
                )}
              </div>
              
                <p className="text-sm text-muted-foreground">
                  JPG, PNG or GIF up to 5MB. Recommended size: 400x400px.
                </p>
              </div>
            </div>
          )}
          
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileSelect}
          />
        </CardContent>
      </Card>

      {/* Personal Information */}
      <Card>
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
          <CardDescription>
            Your personal details and contact information.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name *</Label>
              <Input
                id="name"
                value={profile.name}
                onChange={(e) => updateField('profile', 'name', e.target.value)}
                placeholder="Enter your full name"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email">Email Address *</Label>
              <Input
                id="email"
                type="email"
                value={profile.email}
                onChange={(e) => updateField('profile', 'email', e.target.value)}
                placeholder="Enter your email"
                required
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              value={profile.bio || ''}
              onChange={(e) => updateField('profile', 'bio', e.target.value)}
              placeholder="Tell us about yourself..."
              rows={3}
              maxLength={500}
            />
            <p className="text-sm text-muted-foreground text-right">
              {(profile.bio || '').length}/500 characters
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Professional Information */}
      <Card>
        <CardHeader>
          <CardTitle>Professional Information</CardTitle>
          <CardDescription>
            Work-related details for better collaboration.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="jobTitle">Job Title</Label>
              <Input
                id="jobTitle"
                value={profile.jobTitle || ''}
                onChange={(e) => updateField('profile', 'jobTitle', e.target.value)}
                placeholder="e.g. Software Engineer"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="department">Department</Label>
              <Input
                id="department"
                value={profile.department || ''}
                onChange={(e) => updateField('profile', 'department', e.target.value)}
                placeholder="e.g. Engineering"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="location" className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Location
            </Label>
            <Input
              id="location"
              value={profile.location || ''}
              onChange={(e) => updateField('profile', 'location', e.target.value)}
              placeholder="e.g. San Francisco, CA"
            />
          </div>
        </CardContent>
      </Card>

      {/* Localization */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Localization
          </CardTitle>
          <CardDescription>
            Configure your timezone and language preferences.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="timezone">Timezone</Label>
              <Select
                value={profile.timezone}
                onValueChange={(value) => updateField('profile', 'timezone', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select your timezone" />
                </SelectTrigger>
                <SelectContent>
                  {timezones.map((tz) => (
                    <SelectItem key={tz.value} value={tz.value}>
                      {tz.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="language">Language</Label>
              <Select
                value={profile.language}
                onValueChange={(value) => updateField('profile', 'language', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select your language" />
                </SelectTrigger>
                <SelectContent>
                  {languages.map((lang) => (
                    <SelectItem key={lang.value} value={lang.value}>
                      {lang.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex items-center justify-between pt-4">
        <div className="flex items-center gap-2">
          {isDirty('profile') && (
            <Badge variant="secondary" className="gap-1">
              <div className="h-2 w-2 bg-orange-500 rounded-full"></div>
              Unsaved changes
            </Badge>
          )}
          {error && (
            <Badge variant="destructive">
              Error: {error}
            </Badge>
          )}
        </div>
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleReset}
            disabled={loading || !isDirty('profile')}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset
          </Button>
          
          <Button
            onClick={handleSave}
            disabled={loading || !isDirty('profile') || hasErrors('profile')}
          >
            <Save className="h-4 w-4 mr-2" />
            {loading ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ProfileSettings;